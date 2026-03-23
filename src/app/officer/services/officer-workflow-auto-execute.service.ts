import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  OfficerCaseService,
  WorkflowTransitionDTO,
} from './officer-case.service';

export interface ModuleFormMatchContext {
  /** From module form schema after load (preferred). */
  moduleType?: string | null;
  /** When submitting by form ID (e.g. action forms). */
  formId?: number | null;
}

export interface WorkflowActionMatchOptions extends ModuleFormMatchContext {
  /**
   * If no transition matches by moduleType/formId, and exactly one transition is executable,
   * use it (e.g. dedicated “request” step with a single available action).
   */
  allowUniqueExecutableFallback?: boolean;
}

export interface AutoExecuteResult {
  executed: boolean;
  transitionCode?: string;
  /** When transition requires a comment but none was provided */
  commentsRequired?: boolean;
  /** When multiple transitions matched and none was chosen */
  ambiguous?: boolean;
  message?: string;
}

/**
 * Resolves which workflow transition to run after a module form or document action,
 * using only transition DTO data from GET /cases/{id}/transitions (no hardcoded transition codes).
 */
@Injectable({ providedIn: 'root' })
export class OfficerWorkflowAutoExecuteService {
  constructor(private caseService: OfficerCaseService) {}

  /**
   * After a module form submit succeeds: refresh transitions, find executable transitions
   * that match the submitted form (module type and/or form id), execute the first match.
   */
  tryAfterModuleFormSubmit(
    caseId: number,
    ctx: ModuleFormMatchContext,
    comments: string,
  ): Observable<AutoExecuteResult> {
    return this.caseService.getAvailableTransitions(caseId).pipe(
      switchMap((res) => {
        const transitions =
          res.success && Array.isArray(res.data) ? res.data : [];
        const matches = this.pickExecutableModuleFormMatches(transitions, ctx);
        return this.executeFirstMatch(caseId, matches, comments);
      }),
      catchError(() =>
        of({
          executed: false,
          message: 'Failed to load transitions for auto-execute.',
        }),
      ),
    );
  }

  /**
   * For steps like “request field report” before other payloads exist: optionally match by
   * workflow module type on the transition; or if allowUniqueExecutableFallback and exactly
   * one executable transition exists, run that one.
   */
  tryExecuteWorkflowAction(
    caseId: number,
    options: WorkflowActionMatchOptions,
    comments: string,
  ): Observable<AutoExecuteResult> {
    return this.caseService.getAvailableTransitions(caseId).pipe(
      switchMap((res) => {
        const transitions =
          res.success && Array.isArray(res.data) ? res.data : [];
        const executable = transitions.filter((t) => this.isExecutable(t));

        let matches = this.pickExecutableModuleFormMatches(transitions, {
          moduleType: options.moduleType,
          formId: options.formId,
        });

        if (
          matches.length === 0 &&
          options.allowUniqueExecutableFallback &&
          executable.length === 1
        ) {
          matches = [executable[0]];
        }

        return this.executeFirstMatch(caseId, matches, comments);
      }),
      catchError(() =>
        of({
          executed: false,
          message: 'Failed to load transitions for auto-execute.',
        }),
      ),
    );
  }

  /**
   * After document save: only auto-execute when status is FINAL or SIGNED (not DRAFT).
   */
  tryAfterDocumentSave(
    caseId: number,
    templateId: number,
    status: string,
    comments?: string,
  ): Observable<AutoExecuteResult> {
    const st = String(status || '').toUpperCase().trim();
    if (st !== 'FINAL' && st !== 'SIGNED') {
      return of({ executed: false, message: 'Skipped auto-execute for draft.' });
    }
    return this.caseService.getAvailableTransitions(caseId).pipe(
      switchMap((res) => {
        const transitions =
          res.success && Array.isArray(res.data) ? res.data : [];
        const matches = transitions.filter(
          (t) => this.isExecutable(t) && this.matchesDocumentTemplate(t, templateId),
        );
        return this.executeFirstMatch(caseId, matches, comments || '');
      }),
      catchError(() =>
        of({
          executed: false,
          message: 'Failed to load transitions for auto-execute.',
        }),
      ),
    );
  }

  private isExecutable(t: WorkflowTransitionDTO): boolean {
    return t.checklist?.canExecute !== false;
  }

  private normModule(s?: string | null): string {
    return String(s || '')
      .trim()
      .toUpperCase();
  }

  private matchesModuleForm(
    t: WorkflowTransitionDTO,
    ctx: ModuleFormMatchContext,
  ): boolean {
    const mt = this.normModule(ctx.moduleType);
    const formId =
      ctx.formId != null && !Number.isNaN(Number(ctx.formId))
        ? Number(ctx.formId)
        : null;

    if (formId != null) {
      const ids = t.checklist?.allowedFormIds;
      if (Array.isArray(ids) && ids.includes(formId)) {
        return true;
      }
    }

    if (mt) {
      const fsMt = this.normModule(t.formSchema?.moduleType);
      if (fsMt && fsMt === mt) {
        return true;
      }
      const conditions = t.checklist?.conditions ?? [];
      for (const c of conditions) {
        const cAny = c as { moduleType?: string };
        if (this.normModule(cAny.moduleType) === mt) {
          return true;
        }
      }
    }

    return false;
  }

  private pickExecutableModuleFormMatches(
    transitions: WorkflowTransitionDTO[],
    ctx: ModuleFormMatchContext,
  ): WorkflowTransitionDTO[] {
    return transitions.filter(
      (t) => this.isExecutable(t) && this.matchesModuleForm(t, ctx),
    );
  }

  private matchesDocumentTemplate(
    t: WorkflowTransitionDTO,
    templateId: number,
  ): boolean {
    const ids = t.checklist?.allowedDocumentIds;
    return Array.isArray(ids) && ids.includes(templateId);
  }

  private executeFirstMatch(
    caseId: number,
    matches: WorkflowTransitionDTO[],
    comments: string,
  ): Observable<AutoExecuteResult> {
    if (matches.length === 0) {
      return of({
        executed: false,
        message: 'No executable transition matched this action.',
      });
    }

    if (matches.length > 1) {
      const sorted = [...matches].sort((a, b) => a.id - b.id);
      const chosen = sorted[0];
      return this.runTransition(caseId, chosen, comments, true);
    }

    return this.runTransition(caseId, matches[0], comments, false);
  }

  private runTransition(
    caseId: number,
    transition: WorkflowTransitionDTO,
    comments: string,
    ambiguous: boolean,
  ): Observable<AutoExecuteResult> {
    const trimmed = String(comments || '').trim();
    if (transition.requiresComment && !trimmed) {
      return of({
        executed: false,
        commentsRequired: true,
        transitionCode: transition.transitionCode,
        message:
          'This action requires a comment. Add remarks in the form or use the Actions tab.',
      });
    }

    return this.caseService
      .executeTransition(caseId, {
        caseId,
        transitionCode: transition.transitionCode,
        comments: trimmed || undefined,
      })
      .pipe(
        map((response) => {
          if (response.success) {
            return {
              executed: true,
              transitionCode: transition.transitionCode,
              ambiguous,
              message: ambiguous
                ? 'Multiple workflow actions matched; the first was executed. Configure workflow metadata if needed.'
                : undefined,
            };
          }
          return {
            executed: false,
            transitionCode: transition.transitionCode,
            message:
              (response as { message?: string }).message ||
              'Transition could not be completed.',
          };
        }),
        catchError((err) =>
          of({
            executed: false,
            transitionCode: transition.transitionCode,
            message:
              err?.error?.message ||
              err?.message ||
              'Failed to execute transition.',
          }),
        ),
      );
  }
}
