import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OfficerCaseService, CaseDTO, WorkflowTransitionDTO, WorkflowHistory, ActionFormDetail, ActionDocumentDetail } from '../services/officer-case.service';
import { OfficerWorkflowAutoExecuteService } from '../services/officer-workflow-auto-execute.service';
import { ModuleFormSubmittedPayload } from '../module-form/module-form.component';
import { forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { WorkflowActionDialogComponent } from '../workflow-action-dialog/workflow-action-dialog.component';
import { DocumentsActionDialogComponent } from '../documents-action-dialog/documents-action-dialog.component';
import { FormsActionDialogComponent } from '../forms-action-dialog/forms-action-dialog.component';

@Component({
  selector: 'app-officer-case-detail',
  templateUrl: './officer-case-detail.component.html',
  styleUrls: ['./officer-case-detail.component.scss']
})
export class OfficerCaseDetailComponent implements OnInit {
  caseId!: number;
  caseData: CaseDTO | null = null;
  transitions: WorkflowTransitionDTO[] = [];
  history: WorkflowHistory[] = [];

  // Current officer role (display only; which transitions show is from backend)
  userRoleCode: string = '';
  userRoleName: string = '';

  loading = false;
  loadingTransitions = false;
  loadingHistory = false;
  error: string | null = null;
  /** Workflow/condition failure message – shown on screen until dismissed */
  transitionError: string | null = null;
  executing = false;

  parsedCaseData: Record<string, any> = {};
  
  /**
   * Module form types to show as tabs (from transitions + form detail API). Admin-configured; not a fixed HEARING/FIELD_REPORT list.
   */
  private readonly moduleFormTypesSet = new Set<string>();
  /**
   * Document template IDs to show as tabs (from transition checklist allowedDocumentIds).
   */
  private readonly documentTemplateIdsSet = new Set<number>();
  
  /** Pending-with value from case details API; set when case loads so it always shows when present */
  pendingWithDisplay = '';

  /** Index into the vertical sidebar list (Case Info → module forms → documents → History). Workflow execute is only at the top. */
  selectedTabIndex = 0;

  /**
   * In the Actions tab, which transition is selected (checkbox). Only that action’s forms / conditions
   * and Execute control are shown below.
   */
  selectedActionTransitionId: number | null = null;
  /**
   * When true, after transitions/form metadata load, select the Order Sheet document tab if present.
   * Cleared when the user picks another sidebar item; set again after module form submit so workflow refresh focuses the sheet.
   */
  private autoSelectOrderSheetPending = true;

  /** Form ID → name and moduleType (fetched from API for display and opening). */
  formDetailsMap: Record<number, ActionFormDetail> = {};
  /** Document ID → name and moduleType (fetched from API for display and opening). */
  documentDetailsMap: Record<number, ActionDocumentDetail> = {};

  /** Fallback display names for document template IDs when backend does not send allowedDocuments or DOCUMENT_CONDITION.moduleType. Extend as needed (e.g. 5: 'Order Sheet'). */
  private static DOCUMENT_DISPLAY_NAMES_FALLBACK: Record<number, string> = {
    5: 'Order Sheet',
    // Add more: 6: 'Notice', 7: 'Judgement', etc.
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: OfficerCaseService,
    private workflowAuto: OfficerWorkflowAutoExecuteService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.route.params.subscribe(params => {
      this.caseId = +params['id'];
      if (this.caseId) {
        this.autoSelectOrderSheetPending = true;
        this.selectedTabIndex = 0;
        this.selectedActionTransitionId = null;
        this.loadCaseDetails();
        this.loadAvailableTransitions();
        this.loadWorkflowHistory();
      }
    });
  }

  /**
   * Load current officer role from localStorage (same structure used in document editor)
   */
  loadUserRole(): void {
    try {
      const storedData = localStorage.getItem('adminUserData');
      if (storedData) {
        const officerData = JSON.parse(storedData);
        const posting = officerData?.posting || {};
        this.userRoleCode = posting.roleCode || '';
        this.userRoleName = posting.roleName || '';
      }
    } catch (e) {
      console.error('Error loading user role in officer case detail:', e);
    }
  }

  /**
   * Load case details
   */
  loadCaseDetails(): void {
    this.loading = true;
    this.error = null;

    this.caseService.getCaseById(this.caseId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.caseData = response.data;
          this.pendingWithDisplay = this.getPendingWithDisplay();
          this.parseCaseData();
        } else {
          this.pendingWithDisplay = '';
          this.error = response.message || 'Failed to load case details';
        }
      },
      error: (err) => {
        this.loading = false;
        this.pendingWithDisplay = '';
        this.error = err.error?.message || 'Failed to load case details';
        this.snackBar.open(this.error ?? 'Failed to load case details', 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Parse case data JSON string
   */
  parseCaseData(): void {
    if (this.caseData?.caseData) {
      try {
        this.parsedCaseData = JSON.parse(this.caseData.caseData);
      } catch (e) {
        console.error('Failed to parse case data:', e);
        this.parsedCaseData = {};
      }
    }
  }

  hasParsedCaseData(): boolean {
    return Object.keys(this.parsedCaseData).length > 0;
  }

  /**
   * Load available workflow transitions
   */
  loadAvailableTransitions(): void {
    this.loadingTransitions = true;
    this.transitionError = null;

    this.caseService.getAvailableTransitions(this.caseId).subscribe({
      next: (response) => {
        this.loadingTransitions = false;
        if (response.success && response.data) {
          this.transitions = response.data;
          this.syncSelectedActionAfterTransitionsLoad();
          this.populateSidebarForSelectedAction();
          this.loadActionFormAndDocumentDetails();
          
          // If no transitions available, show appropriate message
          if (this.transitions.length === 0) {
            // No error, just no actions available - this is handled in the template
            this.transitionError = null;
          }
        } else {
          // Response indicates no actions available
          this.transitions = [];
          this.selectedActionTransitionId = null;
          this.transitionError = null; // No error, just no actions
        }
      },
      error: (err) => {
        this.loadingTransitions = false;
        console.error('Error loading transitions:', err);
        
        // Check if it's a case where no actions are available (not a real error)
        if (err?.status === 404 || err?.error?.message?.toLowerCase().includes('no action') || 
            err?.error?.message?.toLowerCase().includes('no transition')) {
          this.transitions = [];
          this.selectedActionTransitionId = null;
          this.transitionError = null; // No error, just no actions available
        } else {
          // Real error occurred
          const errorMsg = err?.error?.message || err?.message || 'Failed to load available actions';
          this.transitionError = errorMsg;
          this.transitions = [];
          this.selectedActionTransitionId = null;
          this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
        }
      }
    });
  }

  /**
   * Sidebar module forms + document tabs come only from the **currently selected** workflow action
   * (allowedFormIds → module types, allowedDocumentIds → templates). Nothing is shown until an action is chosen.
   */
  private populateSidebarForSelectedAction(): void {
    this.moduleFormTypesSet.clear();
    this.documentTemplateIdsSet.clear();
    const t = this.selectedActionTransition;
    if (!t?.checklist) {
      return;
    }
    const c = t.checklist;
    (c.allowedDocumentIds ?? []).forEach((id: number) => {
      this.documentTemplateIdsSet.add(id);
    });
    (c.conditions ?? []).forEach((cond: any) => {
      if (cond?.type !== 'FORM_CONDITION') {
        return;
      }
      const moduleType: string | undefined = cond.moduleType;
      if (moduleType && typeof moduleType === 'string') {
        const mt = moduleType.toUpperCase().trim();
        if (/^[A-Z][A-Z0-9_]*$/.test(mt)) {
          this.moduleFormTypesSet.add(mt);
        }
      }
    });
    (c.allowedFormIds ?? []).forEach((id: number) => {
      const f = this.formDetailsMap[id];
      if (f?.moduleType && typeof f.moduleType === 'string') {
        const mt = f.moduleType.toUpperCase().trim();
        if (/^[A-Z][A-Z0-9_]*$/.test(mt)) {
          this.moduleFormTypesSet.add(mt);
        }
      }
    });
    this.clampSelectedTabIndex();
  }

  private clampSelectedTabIndex(): void {
    const n = this.sidebarNavItems.length;
    if (n === 0) {
      return;
    }
    const lastIndex = this.sidebarNavItems[n - 1].index;
    if (this.selectedTabIndex > lastIndex) {
      this.selectedTabIndex = lastIndex;
    }
  }

  /** Module types only for forms actually linked to this case’s actions (allowedFormIds + API), not every workflow form. */
  get moduleFormTypesForTabs(): string[] {
    return Array.from(this.moduleFormTypesSet).sort();
  }

  /** Sorted document template IDs for document tabs. */
  get documentTemplateIdsForTabs(): number[] {
    return Array.from(this.documentTemplateIdsSet).sort((a, b) => a - b);
  }

  /** Sidebar: Case Info + module forms + documents for the **selected action only** + History (workflow actions live at the top). */
  get sidebarNavItems(): { index: number; label: string; icon: string; emphasize?: boolean }[] {
    const items: { index: number; label: string; icon: string; emphasize?: boolean }[] = [];
    let idx = 0;
    items.push({ index: idx++, label: 'Overview', icon: 'folder_open' });
    for (const mt of this.moduleFormTypesForTabs) {
      items.push({
        index: idx++,
        label: this.humanizeModuleType(mt),
        icon: 'dynamic_form',
      });
    }
    for (const tid of this.documentTemplateIdsForTabs) {
      items.push({
        index: idx++,
        label: this.getDocumentName(tid),
        icon: 'description',
        emphasize: this.isOrderSheetTemplateId(tid),
      });
    }
    items.push({ index: idx++, label: 'History', icon: 'history' });
    return items;
  }

  /** First tab index for module forms (always 1). */
  get moduleFormsTabStartIndex(): number {
    return 1;
  }

  /** First tab index for document templates. */
  get documentsTabStartIndex(): number {
    return 1 + this.moduleFormTypesForTabs.length;
  }

  get historyTabIndex(): number {
    return 1 + this.moduleFormTypesForTabs.length + this.documentTemplateIdsForTabs.length;
  }

  selectSidebarTab(index: number): void {
    this.selectedTabIndex = index;
    this.autoSelectOrderSheetPending = false;
  }

  /** Currently selected workflow action (sidebar forms/docs + top execute panel apply to this only). */
  get selectedActionTransition(): WorkflowTransitionDTO | null {
    if (this.selectedActionTransitionId == null) {
      return null;
    }
    return this.transitions.find(t => t.id === this.selectedActionTransitionId) ?? null;
  }

  private syncSelectedActionAfterTransitionsLoad(): void {
    if (!this.transitions.length) {
      this.selectedActionTransitionId = null;
      return;
    }
    const still = this.transitions.find(t => t.id === this.selectedActionTransitionId);
    if (!still) {
      this.selectedActionTransitionId = null;
    }
  }

  onActionCheckboxChange(transition: WorkflowTransitionDTO, checked: boolean): void {
    if (checked) {
      this.selectedActionTransitionId = transition.id;
      this.afterSelectedActionChanged();
    } else if (this.selectedActionTransitionId === transition.id) {
      this.selectedActionTransitionId = null;
      this.autoSelectOrderSheetPending = false;
      this.populateSidebarForSelectedAction();
      this.selectedTabIndex = 0;
      this.cdr.markForCheck();
    }
  }

  selectActionTransitionRow(transition: WorkflowTransitionDTO): void {
    if (this.selectedActionTransitionId === transition.id) {
      return;
    }
    this.selectedActionTransitionId = transition.id;
    this.afterSelectedActionChanged();
  }

  /** Rebuild sidebar (forms/documents) for the new action; optionally open Order Sheet tab. */
  private afterSelectedActionChanged(): void {
    this.populateSidebarForSelectedAction();
    this.autoSelectOrderSheetPending = true;
    const hadOrderSheet = this.getOrderSheetTemplateId() != null;
    this.focusOrderSheetTabIfPending();
    if (!hadOrderSheet) {
      this.selectedTabIndex = 0;
    }
    this.cdr.markForCheck();
  }

  /**
   * Order Sheet: match by display name, module type, or known template id (see DOCUMENT_DISPLAY_NAMES_FALLBACK).
   */
  isOrderSheetTemplateId(templateId: number): boolean {
    const name = (this.getDocumentName(templateId) || '').toLowerCase();
    const mt = String(this.documentDetailsMap[templateId]?.moduleType || '').toUpperCase();
    if (name.includes('order sheet') || name.includes('ordersheet')) {
      return true;
    }
    if (mt.includes('ORDERSHEET') || mt.includes('ORDER_SHEET')) {
      return true;
    }
    if (OfficerCaseDetailComponent.DOCUMENT_DISPLAY_NAMES_FALLBACK[templateId] === 'Order Sheet') {
      return true;
    }
    return false;
  }

  private getOrderSheetTemplateId(): number | null {
    for (const tid of this.documentTemplateIdsForTabs) {
      if (this.isOrderSheetTemplateId(tid)) {
        return tid;
      }
    }
    return null;
  }

  /**
   * After metadata loads, optionally move focus to the Order Sheet tab (see autoSelectOrderSheetPending).
   */
  private focusOrderSheetTabIfPending(): void {
    if (!this.autoSelectOrderSheetPending || !this.caseData) {
      return;
    }
    const tid = this.getOrderSheetTemplateId();
    if (tid == null) {
      this.autoSelectOrderSheetPending = false;
      return;
    }
    const pos = this.documentTemplateIdsForTabs.indexOf(tid);
    if (pos < 0) {
      return;
    }
    this.selectedTabIndex = this.documentsTabStartIndex + pos;
    this.autoSelectOrderSheetPending = false;
    this.cdr.markForCheck();
  }

  /**
   * Load workflow history
   */
  loadWorkflowHistory(): void {
    this.loadingHistory = true;

    this.caseService.getWorkflowHistory(this.caseId).subscribe({
      next: (response) => {
        this.loadingHistory = false;
        if (response.success && response.data) {
          // Sort by performedAt (newest first)
          this.history = response.data.sort((a, b) =>
            new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
          );
        }
      },
      error: (err) => {
        this.loadingHistory = false;
        console.error('Error loading workflow history:', err);
      }
    });
  }

  /**
   * Whether this transition can be executed (checklist.canExecute !== false).
   */
  canExecuteTransition(transition: WorkflowTransitionDTO): boolean {
    return transition.checklist?.canExecute !== false;
  }

  /**
   * Blocking reasons for this transition (when canExecute is false).
   */
  getBlockingReasons(transition: WorkflowTransitionDTO): string[] {
    const reasons = transition.checklist?.blockingReasons;
    return Array.isArray(reasons) ? reasons : [];
  }

  /**
   * Form IDs allowed/required for this transition (for display per action).
   */
  getTransitionFormIds(transition: WorkflowTransitionDTO): number[] {
    const ids = transition.checklist?.allowedFormIds;
    return Array.isArray(ids) ? ids : [];
  }

  /**
   * Document IDs allowed/required for this transition (for display per action).
   */
  getTransitionDocumentIds(transition: WorkflowTransitionDTO): number[] {
    const ids = transition.checklist?.allowedDocumentIds;
    return Array.isArray(ids) ? ids : [];
  }

  /**
   * Human-readable document actions for this transition (e.g. "Draft", "Save & Sign").
   */
  getTransitionDocumentActions(transition: WorkflowTransitionDTO): string {
    const c = transition.checklist;
    if (!c) return '';
    const parts: string[] = [];
    if (c.allowDocumentDraft === true) parts.push('Draft');
    if (c.allowDocumentSaveAndSign === true) parts.push('Save & Sign');
    return parts.join(', ');
  }

  /**
   * Whether this transition has any forms or documents to show.
   */
  hasFormsOrDocuments(transition: WorkflowTransitionDTO): boolean {
    return this.getTransitionFormIds(transition).length > 0 ||
           this.getTransitionDocumentIds(transition).length > 0;
  }

  /** Comma-separated form display names for the workflow strip (opening is via sidebar only). */
  getTransitionFormNamesLine(transition: WorkflowTransitionDTO): string {
    return this.getTransitionFormIds(transition)
      .map(id => this.getFormName(id))
      .join(', ');
  }

  /** Comma-separated document display names for the workflow strip (opening is via sidebar only). */
  getTransitionDocumentNamesLine(transition: WorkflowTransitionDTO): string {
    return this.getTransitionDocumentIds(transition)
      .map(id => this.getDocumentName(id))
      .join(', ');
  }

  /** Load form and document details: prefer names from transition (allowedForms/allowedDocuments), else from conditions (moduleType), else stub. */
  private loadActionFormAndDocumentDetails(): void {
    const formIds = new Set<number>();
    const documentIds = new Set<number>();
    this.transitions.forEach(t => {
      (t.checklist?.allowedFormIds ?? []).forEach((id: number) => formIds.add(id));
      (t.checklist?.allowedDocumentIds ?? []).forEach((id: number) => documentIds.add(id));
    });
    // 1) Prefer names from transition checklist if backend sent allowedForms/allowedDocuments
    this.transitions.forEach(t => {
      (t.checklist?.allowedForms ?? []).forEach((f: { id: number; name: string }) => {
        this.formDetailsMap[f.id] = { id: f.id, name: f.name, moduleType: f.name };
      });
      (t.checklist?.allowedDocuments ?? []).forEach((d: { id: number; name: string }) => {
        this.documentDetailsMap[d.id] = { id: d.id, name: d.name, moduleType: d.name };
      });
    });
    // 2) Derive form/document names from conditions (FORM_CONDITION / DOCUMENT_CONDITION with moduleType) when we don't have a name yet
    this.deriveFormNamesFromConditions();
    this.deriveDocumentNamesFromConditions();
    // 3) Stub for any remaining (so we have an entry for getFormName/getDocumentName)
    const fIds = Array.from(formIds).filter(id => !this.formDetailsMap[id]);
    const dIds = Array.from(documentIds).filter(id => !this.documentDetailsMap[id]);
    if (fIds.length === 0 && dIds.length === 0) {
      this.populateSidebarForSelectedAction();
      this.focusOrderSheetTabIfPending();
      this.cdr.detectChanges();
      return;
    }
    forkJoin({
      forms: fIds.length ? this.caseService.getActionFormDetails(this.caseId, fIds) : of({ success: true, message: '', data: [] as ActionFormDetail[] }),
      documents: dIds.length ? this.caseService.getActionDocumentDetails(this.caseId, dIds) : of({ success: true, message: '', data: [] as ActionDocumentDetail[] })
    }).subscribe(({ forms, documents }) => {
      (forms.data ?? []).forEach(f => {
        // Keep stub only if we didn't derive a better name from conditions
        if (!this.formDetailsMap[f.id] || this.formDetailsMap[f.id].name === `Form ${f.id}`) {
          this.formDetailsMap[f.id] = f;
        }
      });
      (documents.data ?? []).forEach(d => {
        if (!this.documentDetailsMap[d.id] || this.documentDetailsMap[d.id].name === `Document ${d.id}`) {
          this.documentDetailsMap[d.id] = d;
        }
      });
      // Re-derive so any form/document that got stub now gets name from conditions if we can
      this.deriveFormNamesFromConditions();
      this.deriveDocumentNamesFromConditions();
      this.populateSidebarForSelectedAction();
      this.focusOrderSheetTabIfPending();
      this.cdr.detectChanges();
    });
  }

  private deriveDocumentNamesFromConditions(): void {
    this.transitions.forEach(t => {
      const c = t.checklist;
      if (!c) return;
      (c.conditions ?? []).forEach((cond: any) => {
        if (cond?.type !== 'DOCUMENT_CONDITION') return;
        const ids: number[] = Array.isArray(cond.documentTemplateIds) ? cond.documentTemplateIds : [];
        if (!ids.length) return;
        // Prefer name inside square brackets in label, e.g. [ORDERSHEET TEMPLATE]; fall back to moduleType.
        let displayName = 'Document';
        const labelMatch = typeof cond.label === 'string' ? cond.label.match(/\[([^\]]+)\]/) : null;
        if (labelMatch && labelMatch[1]) {
          displayName = this.humanizeModuleType(labelMatch[1]);
        } else if (cond.moduleType) {
          displayName = this.humanizeModuleType(cond.moduleType);
        }
        ids.forEach((id: number) => {
          const existing = this.documentDetailsMap[id];
          if (!existing || existing.name === `Document ${id}`) {
            this.documentDetailsMap[id] = { id, name: displayName, moduleType: cond.moduleType ?? displayName };
          }
        });
      });
    });
  }

  private deriveFormNamesFromConditions(): void {
    this.transitions.forEach(t => {
      const c = t.checklist;
      if (!c) return;
      (c.conditions ?? []).forEach((cond: any) => {
        if (cond?.type !== 'FORM_CONDITION') return;
        const id: number | null = typeof cond.formId === 'number' ? cond.formId : null;
        if (id == null) return;
        const existing = this.formDetailsMap[id];
        const moduleType: string | undefined = cond.moduleType;
        const name = moduleType ? this.humanizeModuleType(moduleType) : (existing?.name ?? `Form ${id}`);
        if (!existing || existing.name === `Form ${id}`) {
          this.formDetailsMap[id] = { id, name, moduleType: moduleType ?? name };
        }
      });
    });
  }

  getFormName(formId: number): string {
    const d = this.formDetailsMap[formId];
    return (d?.name && d.name.trim()) ? d.name : `Form ${formId}`;
  }

  getDocumentName(documentId: number): string {
    const d = this.documentDetailsMap[documentId];
    const fromMap = d?.name?.trim();
    if (fromMap && fromMap !== `Document ${documentId}`) return fromMap;
    const fallback = OfficerCaseDetailComponent.DOCUMENT_DISPLAY_NAMES_FALLBACK[documentId];
    if (fallback) return fallback;
    // As a last resort, show generic "Document" without internal ID – IDs are still used in API payloads.
    return 'Document';
  }

  /** Human-readable module type for display (e.g. HEARING → Hearing, FIELD_REPORT → Field Report). */
  humanizeModuleType(code: string): string {
    if (!code || typeof code !== 'string') return code;
    return code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Format condition/blocking label: show names instead of IDs/codes.
   * Replaces "Document(s) [5]" with document name, "Form [HEARING]" with "Hearing", "Form [5]" with form name.
   * API payloads continue to use IDs; this is display only.
   */
  formatConditionLabel(label: string, transition: WorkflowTransitionDTO): string {
    if (!label || typeof label !== 'string') return label;
    let out = label;
    const docIds = transition.checklist?.allowedDocumentIds ?? [];
    const formIds = transition.checklist?.allowedFormIds ?? [];
    // Document(s) [5] → Document(s) {name}
    out = out.replace(/Document\(s\)\s*\[(\d+)\]/g, (_, idStr) => {
      const id = parseInt(idStr, 10);
      return `Document(s) ${this.getDocumentName(id)}`;
    });
    // Form [HEARING] / Form [FIELD_REPORT] → Form {humanized}
    out = out.replace(/Form\s*\[([A-Z_]+)\]/g, (_, code) => `Form ${this.humanizeModuleType(code)}`);
    // Form [5] (form id) → Form {name}
    formIds.forEach(id => {
      const name = this.getFormName(id);
      out = out.replace(new RegExp(`Form\\s*\\[${id}\\]`, 'g'), `Form ${name}`);
    });
    return out;
  }

  /** Blocking reasons with formatted labels (names instead of raw IDs/codes). */
  getFormattedBlockingReasons(transition: WorkflowTransitionDTO): string[] {
    const raw = transition.checklist?.blockingReasons;
    if (!Array.isArray(raw)) return [];
    return raw.map(r => this.formatConditionLabel(r, transition));
  }

  /** Single condition label formatted for display (name instead of id/code). */
  getFormattedConditionLabel(transition: WorkflowTransitionDTO, condition: { label: string }): string {
    return this.formatConditionLabel(condition.label, transition);
  }

  getFormModuleType(formId: number): string | null {
    return this.formDetailsMap[formId]?.moduleType ?? null;
  }

  getDocumentModuleType(documentId: number): string | null {
    return this.documentDetailsMap[documentId]?.moduleType ?? null;
  }

  /** First template ID in documentDetailsMap for the given module type (for officer document APIs by template ID). */
  getTemplateIdForModuleType(moduleType: string): number | null {
    for (const d of Object.values(this.documentDetailsMap)) {
      if (d.moduleType === moduleType) return d.id;
    }
    return null;
  }

  /** All unique document template IDs from transitions (allowedDocumentIds). Use when no module-type mapping is available. */
  getTemplateIds(): number[] {
    const ids = new Set<number>();
    this.transitions.forEach(t => (t.checklist?.allowedDocumentIds ?? []).forEach((id: number) => ids.add(id)));
    return Array.from(ids);
  }

  /** Open Documents in a modal so officer can edit and Save as Draft / Save & Sign (by template ID). */
  goToDocumentsTab(): void {
    if (!this.caseData) return;
    const documentTemplates: { templateId: number; name: string }[] = [];
    this.documentTemplateIdsForTabs.forEach(tid =>
      documentTemplates.push({ templateId: tid, name: this.getDocumentName(tid) }),
    );
    if (documentTemplates.length === 0) {
      this.getTemplateIds().forEach(tid =>
        documentTemplates.push({ templateId: tid, name: this.getDocumentName(tid) }),
      );
    }
    if (documentTemplates.length === 0) {
      this.snackBar.open('No document templates available for this case.', 'Close', { duration: 4000 });
      return;
    }
    this.dialog.open(DocumentsActionDialogComponent, {
      width: '920px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { caseId: this.caseId, caseData: this.caseData, documentTemplates },
      disableClose: false
    }).afterClosed().subscribe(() => {
      this.loadAvailableTransitions();
      this.loadCaseDetails();
    });
  }

  /** Open Forms in a modal so officer can complete and submit. */
  goToFormsTab(): void {
    if (!this.caseData) return;
    const formTypes = [...this.moduleFormTypesForTabs];
    if (formTypes.length === 0) {
      this.snackBar.open('No module forms are linked to this case workflow yet.', 'Close', { duration: 5000 });
      return;
    }
    this.dialog.open(FormsActionDialogComponent, {
      width: '740px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { caseId: this.caseId, caseData: this.caseData, formTypes },
      disableClose: false
    }).afterClosed().subscribe((submitted) => {
      if (submitted) {
        this.loadAvailableTransitions();
        this.loadCaseDetails();
      }
    });
  }

  /**
   * Handle action button click
   */
  handleActionClick(transition: WorkflowTransitionDTO): void {
    const formLabels: Record<number, string> = {};
    this.getTransitionFormIds(transition).forEach(id => { formLabels[id] = this.getFormName(id); });
    const documentLabels: Record<number, string> = {};
    this.getTransitionDocumentIds(transition).forEach(id => { documentLabels[id] = this.getDocumentName(id); });
    const dialogRef = this.dialog.open(WorkflowActionDialogComponent, {
      width: '500px',
      data: {
        transition,
        caseNumber: this.caseData?.caseNumber,
        formLabels,
        documentLabels,
        formattedBlockingReasons: this.getFormattedBlockingReasons(transition)
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.execute) {
        this.executeTransition(transition.transitionCode, result.comments || '');
      }
    });
  }

  /**
   * After hearing/attendance (or other module form) submit: try workflow auto-execute from
   * transition metadata, then refresh case/transitions/history.
   */
  onModuleFormSubmitted(payload: ModuleFormSubmittedPayload): void {
    this.autoSelectOrderSheetPending = true;
    this.workflowAuto
      .tryAfterModuleFormSubmit(
        this.caseId,
        {
          moduleType: payload.moduleType,
          formId: payload.formId,
        },
        payload.remarks || '',
      )
      .pipe(
        finalize(() => {
          this.loadCaseDetails();
          this.loadAvailableTransitions();
          this.loadWorkflowHistory();
        }),
      )
      .subscribe((result) => {
        if (result.commentsRequired) {
          this.snackBar.open(
            result.message ||
              'Form saved. Add remarks or complete the action from the Actions tab.',
            'Close',
            { duration: 6000 },
          );
          return;
        }
        if (result.executed) {
          if (result.ambiguous && result.message) {
            this.snackBar.open(result.message, 'Close', { duration: 6000 });
          } else {
            this.snackBar.open('Action completed successfully!', 'Close', {
              duration: 5000,
            });
          }
        } else if (result.message) {
          this.snackBar.open(result.message, 'Close', { duration: 5000 });
        }
      });
  }

  /**
   * Execute workflow transition
   */
  executeTransition(transitionCode: string, comments: string): void {
    this.transitionError = null;
    this.executing = true;

    this.caseService.executeTransition(this.caseId, {
      caseId: this.caseId,
      transitionCode,
      comments: comments || undefined
    }).subscribe({
      next: (response) => {
        this.executing = false;
        if (response.success) {
          this.transitionError = null;
          this.snackBar.open('Action completed successfully!', 'Close', { duration: 5000 });
          this.loadCaseDetails();
          this.loadAvailableTransitions();
          this.loadWorkflowHistory();
        } else {
          const reason = this.getTransitionFailureReason(response);
          this.transitionError = reason;
          this.snackBar.open(reason, 'Close', { duration: 8000 });
        }
      },
      error: (err) => {
        this.executing = false;
        const reason = this.getTransitionFailureReasonFromError(err);
        this.transitionError = reason;
        this.snackBar.open(reason, 'Close', { duration: 8000 });
      }
    });
  }

  /**
   * Get user-visible reason from failed transition response (condition failure, etc.)
   */
  private getTransitionFailureReason(response: { message?: string; reason?: string; data?: any }): string {
    const msg = response.reason
      || response.message
      || (response.data && (response.data.reason || response.data.message));
    return msg && String(msg).trim() ? String(msg).trim() : 'Workflow condition not met. This action cannot be performed.';
  }

  /**
   * Get user-visible reason from HTTP error (e.g. 400 with body.reason)
   */
  private getTransitionFailureReasonFromError(err: any): string {
    const body = err?.error;
    if (body && typeof body === 'object') {
      const msg = body.reason || body.message || (body.data && (body.data.reason || body.data.message));
      if (msg && String(msg).trim()) {
        return String(msg).trim();
      }
    }
    
    // Handle specific error cases
    if (err?.status === 400) {
      return 'Invalid request. Please check the action requirements and try again.';
    } else if (err?.status === 403) {
      return 'You do not have permission to perform this action.';
    } else if (err?.status === 404) {
      return 'Action not found or no longer available.';
    } else if (err?.status === 0 || err?.statusText === 'Unknown Error') {
      return 'Network error: Could not connect to server. Please check your connection.';
    } else if (err?.status >= 500) {
      return 'Server error occurred. Please try again later.';
    }
    
    // Return specific error message if available, otherwise a helpful generic message
    return err?.error?.message || err?.message || 'Failed to execute action. Please try again.';
  }

  clearTransitionError(): void {
    this.transitionError = null;
  }

  /**
   * Pending-with display from case details (camelCase or snake_case from API).
   */
  getPendingWithDisplay(): string {
    if (!this.caseData) return '';
    const d = this.caseData as any;
    const display = d.pendingWithRolesDisplay ?? d.pending_with_roles_display;
    if (display != null && String(display).trim()) return String(display).trim();
    const names = d.pendingWithRoleNames ?? d.pending_with_role_names;
    if (Array.isArray(names) && names.length) return names.map((n: string) => String(n)).join(', ');
    return '';
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('completed')) {
      return 'status-approved';
    } else if (statusLower.includes('rejected')) {
      return 'status-rejected';
    } else if (statusLower.includes('returned') || statusLower.includes('correction')) {
      return 'status-returned';
    } else if (statusLower.includes('pending') || statusLower.includes('submitted')) {
      return 'status-pending';
    }
    return 'status-default';
  }

  /**
   * Get priority badge class
   */
  getPriorityClass(priority: string): string {
    const priorityLower = priority.toLowerCase();
    return `priority-${priorityLower}`;
  }

  /**
   * Get action button class
   */
  getActionClass(transitionCode: string): string {
    const codeLower = transitionCode.toLowerCase();
    if (codeLower.includes('approve')) {
      return 'action-approve';
    } else if (codeLower.includes('reject')) {
      return 'action-reject';
    } else if (codeLower.includes('return')) {
      return 'action-return';
    }
    return 'action-default';
  }

  /**
   * Go back to cases list
   */
  goBack(): void {
    this.router.navigate(['/officer/cases']);
  }

  /**
   * Refresh all data
   */
  refresh(): void {
    this.loadCaseDetails();
    this.loadAvailableTransitions();
    this.loadWorkflowHistory();
  }

}
