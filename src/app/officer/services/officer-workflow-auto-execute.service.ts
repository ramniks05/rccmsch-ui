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
    preferredTransitionCode?: string | null,
  ): Observable<AutoExecuteResult> {
    return this.caseService.getAvailableTransitions(caseId).pipe(
      switchMap((res) => {
        const transitions =
          res.success && Array.isArray(res.data) ? res.data : [];
        const matches = this.pickExecutableModuleFormMatches(transitions, ctx);
        return this.executeFirstMatch(
          caseId,
          matches,
          comments,
          preferredTransitionCode,
        );
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
    preferredTransitionCode?: string | null,
  ): Observable<AutoExecuteResult> {
    const st = String(status || '').toUpperCase().trim();
    const stage = this.getDocumentStageFromStatus(st);
    if (!stage) {
      return of({
        executed: false,
        message: 'Skipped auto-execute for unsupported document status.',
      });
    }
    return this.caseService.getAvailableTransitions(caseId).pipe(
      switchMap((res) => {
        const transitions =
          res.success && Array.isArray(res.data) ? res.data : [];
        const matches = transitions.filter(
          (t) =>
            this.isExecutable(t) &&
            this.matchesDocumentTemplate(t, templateId, stage),
        );
        return this.executeFirstMatch(
          caseId,
          matches,
          comments || '',
          preferredTransitionCode,
        );
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
    const checklist = t.checklist;
    if (!checklist) return true;
    if (checklist.canExecute !== false) return true;

    const conditions = checklist.conditions ?? [];
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return false;
    }

    // Optional conditions (required === false) should not block action execution.
    const hasBlockingRequiredCondition = conditions.some((c) => {
      const passed = (c as { passed?: boolean }).passed === true;
      const required = (c as { required?: boolean }).required !== false;
      return required && !passed;
    });
    return !hasBlockingRequiredCondition;
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
      const mandatoryFromRules = this.getFormMandatoryFromChecklist(t, formId);
      if (mandatoryFromRules != null) {
        return mandatoryFromRules;
      }
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
    stage: 'DRAFT' | 'SAVE_AND_SIGN',
  ): boolean {
    const documentRule = this.getDocumentRuleFromChecklist(t, templateId);
    if (documentRule) {
      if (!documentRule.mandatory) {
        return false;
      }
      const stages = (documentRule.stages ?? []).map((s) =>
        String(s || '').toUpperCase().trim(),
      );
      if (stages.length > 0 && !stages.includes(stage)) {
        return false;
      }
      return true;
    }

    const ids = t.checklist?.allowedDocumentIds;
    if (!Array.isArray(ids) || !ids.includes(templateId)) {
      return false;
    }

    if (stage === 'DRAFT') {
      // Legacy behavior: do not auto-execute on draft without explicit document rules.
      return false;
    }

    const allowSign = t.checklist?.allowDocumentSaveAndSign;
    if (allowSign === false) {
      return false;
    }
    return true;
  }

  private getDocumentStageFromStatus(
    status: string,
  ): 'DRAFT' | 'SAVE_AND_SIGN' | null {
    if (status === 'DRAFT') return 'DRAFT';
    if (status === 'FINAL' || status === 'SIGNED') return 'SAVE_AND_SIGN';
    return null;
  }

  private getFormMandatoryFromChecklist(
    t: WorkflowTransitionDTO,
    formId: number,
  ): boolean | null {
    const forms =
      t.checklist?.forms ??
      ((t.checklist as { requiredForms?: Array<{ formId: number; mandatory: boolean }> | null } | undefined)
        ?.requiredForms ?? null);
    if (!Array.isArray(forms)) {
      return null;
    }
    const entry = forms.find(
      (f) => Number((f as { formId?: number })?.formId) === formId,
    );
    if (!entry) {
      return null;
    }
    return entry.mandatory === true;
  }

  private getDocumentRuleFromChecklist(
    t: WorkflowTransitionDTO,
    documentId: number,
  ):
    | { documentId: number; stages?: string[] | null; mandatory: boolean }
    | null {
    const documents =
      t.checklist?.documents ??
      ((t.checklist as {
        requiredDocuments?: Array<{
          documentId: number;
          stages?: string[] | null;
          mandatory: boolean;
        }> | null;
      } | undefined)?.requiredDocuments ?? null);
    if (!Array.isArray(documents)) {
      return null;
    }
    const entry = documents.find(
      (d) => Number((d as { documentId?: number })?.documentId) === documentId,
    );
    return entry ?? null;
  }

  private executeFirstMatch(
    caseId: number,
    matches: WorkflowTransitionDTO[],
    comments: string,
    preferredTransitionCode?: string | null,
  ): Observable<AutoExecuteResult> {
    if (matches.length === 0) {
      return of({
        executed: false,
        message: 'No executable transition matched this action.',
      });
    }

    const preferredCode = String(preferredTransitionCode || '').trim();
    if (preferredCode) {
      const preferred = matches.find(
        (m) => String(m.transitionCode || '').trim() === preferredCode,
      );
      if (preferred) {
        const isAmbiguous = matches.length > 1;
        return this.runTransition(caseId, preferred, comments, isAmbiguous);
      }
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
