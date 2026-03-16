import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OfficerCaseService, CaseDTO, WorkflowTransitionDTO, WorkflowHistory, ActionFormDetail, ActionDocumentDetail } from '../services/officer-case.service';
import { forkJoin, of } from 'rxjs';
import { WorkflowActionDialogComponent } from '../workflow-action-dialog/workflow-action-dialog.component';
import { DocumentsActionDialogComponent } from '../documents-action-dialog/documents-action-dialog.component';
import { FormsActionDialogComponent } from '../forms-action-dialog/forms-action-dialog.component';
import { FieldReportRequestDialogComponent } from '../field-report-request-dialog/field-report-request-dialog.component';
import { FieldReportFormComponent } from '../field-report-form/field-report-form.component';
import { AttendanceFormComponent } from '../attendance-form/attendance-form.component';

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
  
  // Track which module types are required
  requiredModules = {
    hearing: false,
    notice: false,
    ordersheet: false,
    judgement: false,
    fieldReport: false
  };
  
  // Track if field report has been submitted
  hasFieldReportSubmitted = false;

  // Field report functionality
  showRequestFieldReportButton = false;
  showSubmitFieldReportButton = false;

  // Attendance functionality
  showMarkAttendanceButton = false;

  /** Pending-with value from case details API; set when case loads so it always shows when present */
  pendingWithDisplay = '';

  /** Bound to mat-tab-group selectedIndex so we can switch tabs (e.g. "Go to Documents"). */
  selectedTabIndex = 0;

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
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.route.params.subscribe(params => {
      this.caseId = +params['id'];
      if (this.caseId) {
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
          // Update attendance button visibility based on case state
          this.updateAttendanceButtonVisibility();
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
          this.determineRequiredModules();
          this.loadActionFormAndDocumentDetails();
          
          // Check if REQUEST_FIELD_REPORT transition is available (for Tehsildar)
          this.showRequestFieldReportButton = this.transitions.some(
            t => t.transitionCode === 'REQUEST_FIELD_REPORT' && 
                 (t.checklist?.canExecute !== false)
          );
          
          // Check if SUBMIT_FIELD_REPORT transition is available (for Field Officers)
          const submitFieldReportTransition = this.transitions.find(
            t => t.transitionCode === 'SUBMIT_FIELD_REPORT'
          );
          
          console.log('=== SUBMIT_FIELD_REPORT Transition Debug ===');
          console.log('- Case ID:', this.caseId);
          console.log('- Case State:', this.caseData?.currentStateCode, this.caseData?.currentStateName);
          console.log('- Total transitions available:', this.transitions.length);
          console.log('- All transition codes:', this.transitions.map(t => ({
            code: t.transitionCode,
            name: t.transitionName,
            fromState: t.fromStateCode,
            toState: t.toStateCode,
            canExecute: t.checklist?.canExecute,
            checklist: t.checklist
          })));
          console.log('- SUBMIT_FIELD_REPORT transition found:', submitFieldReportTransition);
          
          if (submitFieldReportTransition) {
            console.log('- Transition details:', {
              code: submitFieldReportTransition.transitionCode,
              name: submitFieldReportTransition.transitionName,
              fromState: submitFieldReportTransition.fromStateCode,
              toState: submitFieldReportTransition.toStateCode,
              canExecute: submitFieldReportTransition.checklist?.canExecute,
              conditions: submitFieldReportTransition.checklist?.conditions,
              fullChecklist: submitFieldReportTransition.checklist
            });
          } else {
            console.warn('- SUBMIT_FIELD_REPORT transition NOT FOUND in available transitions!');
            console.warn('- This means either:');
            console.warn('  1. Transition permissions are not set for current user role');
            console.warn('  2. Case is not in the correct state (should be "Field Report Requested")');
            console.warn('  3. Hierarchy rule mismatch (case not assigned to this officer)');
            console.warn('  4. Transition conditions are not met');
          }
          
          this.showSubmitFieldReportButton = submitFieldReportTransition !== undefined && 
            (submitFieldReportTransition.checklist?.canExecute !== false);
          
          console.log('- showSubmitFieldReportButton:', this.showSubmitFieldReportButton);
          console.log('=== End Debug ===');
          
          // Update attendance button visibility
          this.updateAttendanceButtonVisibility();
          
          // If no transitions available, show appropriate message
          if (this.transitions.length === 0) {
            // No error, just no actions available - this is handled in the template
            this.transitionError = null;
          }
        } else {
          // Response indicates no actions available
          this.transitions = [];
          this.showRequestFieldReportButton = false;
          this.showSubmitFieldReportButton = false;
          // Update attendance button visibility
          this.updateAttendanceButtonVisibility();
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
          this.transitionError = null; // No error, just no actions available
        } else {
          // Real error occurred
          const errorMsg = err?.error?.message || err?.message || 'Failed to load available actions';
          this.transitionError = errorMsg;
          this.transitions = [];
          this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
        }
      }
    });
  }

  /**
   * Determine which module types are required based on available transitions
   */
  determineRequiredModules(): void {
    // Reset all to false
    this.requiredModules = {
      hearing: false,
      notice: false,
      ordersheet: false,
      judgement: false,
      fieldReport: false
    };

    // Check each transition
    this.transitions.forEach((transition: WorkflowTransitionDTO) => {
      // Check if there's a formSchema (form available for this transition)
      if (transition.formSchema) {
        const moduleType = transition.formSchema.moduleType.toUpperCase();
        
        if (moduleType === 'HEARING') {
          this.requiredModules.hearing = true;
        } else if (moduleType === 'NOTICE') {
          this.requiredModules.notice = true;
        } else if (moduleType === 'ORDERSHEET') {
          this.requiredModules.ordersheet = true;
        } else if (moduleType === 'JUDGEMENT') {
          this.requiredModules.judgement = true;
        } else if (moduleType === 'FIELD_REPORT') {
          this.requiredModules.fieldReport = true;
        }
      }

      // Also check checklist conditions for module requirements
      if (transition.checklist?.conditions) {
        transition.checklist.conditions.forEach(condition => {
          if (condition.type === 'FORM_FIELD' && condition.moduleType) {
            const moduleType = condition.moduleType.toUpperCase();
            
            if (moduleType === 'HEARING') {
              this.requiredModules.hearing = true;
            } else if (moduleType === 'NOTICE') {
              this.requiredModules.notice = true;
            } else if (moduleType === 'ORDERSHEET') {
              this.requiredModules.ordersheet = true;
            } else if (moduleType === 'JUDGEMENT') {
              this.requiredModules.judgement = true;
            } else if (moduleType === 'FIELD_REPORT') {
              this.requiredModules.fieldReport = true;
            }
          }
        });
      }

      // If a transition is a NOTICE-related document action with allowedDocumentIds,
      // ensure the Notice tab is available so officer can draft the notice in its own tab.
      if (
        transition.transitionCode &&
        transition.transitionCode.toUpperCase().includes('NOTICE') &&
        transition.checklist?.allowedDocumentIds &&
        transition.checklist.allowedDocumentIds.length > 0
      ) {
        this.requiredModules.notice = true;
      }
    });

    // Check if field report has been submitted (case is in "Field Report Submitted" state or later)
    this.checkFieldReportSubmission();

    console.log('Required modules:', this.requiredModules);
  }

  /**
   * Check if field report has been submitted
   */
  checkFieldReportSubmission(): void {
    if (!this.caseData) return;
    
    // Check if case is in "Field Report Submitted" state or later
    const currentState = this.caseData.currentStateCode || this.caseData.currentStateName || '';
    const stateLower = currentState.toLowerCase();
    
    // Show field report view if case is in "Field Report Submitted" state or later
    if (stateLower.includes('field report submitted') || 
        stateLower.includes('field_report_submitted') ||
        this.transitions.some(t => t.transitionCode === 'REVIEW_FIELD_REPORT')) {
      this.hasFieldReportSubmitted = true;
      this.requiredModules.fieldReport = true;
    }
    
    // Also check by loading field report data
    this.caseService.getModuleFormWithData(this.caseId, 'FIELD_REPORT').subscribe({
      next: (response: any) => {
        if (response.success && response.data && response.data.hasExistingData) {
          this.hasFieldReportSubmitted = true;
          this.requiredModules.fieldReport = true;
        }
      },
      error: () => {
        // Field report not submitted yet or not configured
      }
    });
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

  /**
   * Index of the first document tab (Notice / Order Sheet / Judgement) in the tab group.
   * Tabs order: Case Info (0), Hearing?, Notice?, Order Sheet?, Judgement?, Field Report?, Actions, History.
   */
  getFirstDocumentTabIndex(): number {
    let i = 1; // after Case Info (0)
    if (this.requiredModules.hearing) i++;
    return i; // next is first document tab (Notice) or Order Sheet or Judgement
  }

  /**
   * Index of the first form tab (Hearing or Field Report) in the tab group.
   */
  getFirstFormTabIndex(): number {
    if (this.requiredModules.hearing) return 1;
    let i = 1;
    if (this.requiredModules.notice) i++;
    if (this.requiredModules.ordersheet) i++;
    if (this.requiredModules.judgement) i++;
    return i; // Field Report tab
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
      this.cdr.detectChanges();
    });
  }

  /**
   * Build document id → display name from transition conditions (DOCUMENT_CONDITION with moduleType).
   * Pairs allowedDocumentIds with condition module types by order when counts match.
   */
  private deriveDocumentNamesFromConditions(): void {
    this.transitions.forEach(t => {
      const c = t.checklist;
      if (!c) return;
      const docIds = (c.allowedDocumentIds ?? []).slice().sort((a, b) => a - b);
      const docModuleTypes = (c.conditions ?? [])
        .filter(cond => cond.type === 'DOCUMENT_CONDITION' && cond.moduleType)
        .map(cond => cond.moduleType!);
      if (docIds.length === 0 || docModuleTypes.length === 0) return;
      const len = Math.min(docIds.length, docModuleTypes.length);
      for (let i = 0; i < len; i++) {
        const id = docIds[i];
        const existing = this.documentDetailsMap[id];
        const name = this.humanizeModuleType(docModuleTypes[i]);
        if (!existing || existing.name === `Document ${id}`) {
          this.documentDetailsMap[id] = { id, name, moduleType: docModuleTypes[i] };
        }
      }
    });
  }

  /**
   * Build form id → display name from transition conditions (FORM_CONDITION with moduleType).
   * Pairs allowedFormIds with condition module types by order when counts match; else keeps existing map.
   */
  private deriveFormNamesFromConditions(): void {
    this.transitions.forEach(t => {
      const c = t.checklist;
      if (!c) return;
      const formIds = (c.allowedFormIds ?? []).slice().sort((a, b) => a - b);
      const formModuleTypes = (c.conditions ?? [])
        .filter(cond => cond.type === 'FORM_CONDITION' && cond.moduleType)
        .map(cond => cond.moduleType!);
      if (formIds.length === 0 || formModuleTypes.length === 0) return;
      // When counts match, assign first form id to first module type, etc.
      const len = Math.min(formIds.length, formModuleTypes.length);
      for (let i = 0; i < len; i++) {
        const id = formIds[i];
        const existing = this.formDetailsMap[id];
        const name = this.humanizeModuleType(formModuleTypes[i]);
        if (!existing || existing.name === `Form ${id}`) {
          this.formDetailsMap[id] = { id, name, moduleType: formModuleTypes[i] };
        }
      }
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
    return d?.name ?? `Document ${documentId}`;
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

  /** Open a specific form by ID: pass formId so the correct form (5 vs 7) is fetched and shown. */
  openFormById(formId: number, _transition: WorkflowTransitionDTO): void {
    if (!this.caseData) return;
    const name = this.getFormName(formId);
    const formItem = { formId, name };
    this.dialog.open(FormsActionDialogComponent, {
      width: '740px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { caseId: this.caseId, caseData: this.caseData, formItem },
      disableClose: false
    }).afterClosed().subscribe((submitted) => {
      if (submitted) {
        this.loadAvailableTransitions();
        this.loadCaseDetails();
      }
    });
  }

  /** Open a specific document by template ID: call API on click to get name, then show document editor in dialog (APIs use template ID). */
  openDocumentById(documentId: number, _transition: WorkflowTransitionDTO): void {
    if (!this.caseData) return;
    this.caseService.getActionDocumentDetails(this.caseId, [documentId]).subscribe({
      next: (res) => {
        const detail = res.data?.[0];
        const name = detail?.name ?? this.getDocumentName(documentId);
        const documentTemplates = [{ templateId: documentId, name }];
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
      },
      error: () => {
        this.snackBar.open('Could not load document. Please try again.', 'Close', { duration: 4000 });
      }
    });
  }

  /** Open Documents in a modal so officer can edit and Save as Draft / Save & Sign (by template ID). */
  goToDocumentsTab(): void {
    if (!this.caseData) return;
    const documentTemplates: { templateId: number; name: string }[] = [];
    // Prefer template IDs by module type if we have them; otherwise use all allowedDocumentIds from transitions
    const types: ('NOTICE' | 'ORDERSHEET' | 'JUDGEMENT')[] = [];
    if (this.requiredModules.notice) types.push('NOTICE');
    if (this.requiredModules.ordersheet) types.push('ORDERSHEET');
    if (this.requiredModules.judgement) types.push('JUDGEMENT');
    for (const mt of types) {
      const tid = this.getTemplateIdForModuleType(mt);
      if (tid != null) documentTemplates.push({ templateId: tid, name: this.getDocumentName(tid) });
    }
    if (documentTemplates.length === 0) {
      const templateIds = this.getTemplateIds();
      templateIds.forEach(tid => documentTemplates.push({ templateId: tid, name: this.getDocumentName(tid) }));
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
    const formTypes: string[] = [];
    if (this.requiredModules.hearing) formTypes.push('HEARING');
    if (this.requiredModules.fieldReport || this.hasFieldReportSubmitted || this.showSubmitFieldReportButton) formTypes.push('FIELD_REPORT');
    if (formTypes.length === 0) formTypes.push('HEARING');
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
   * Handle hearing form submission - reload transitions and case details
   */
  onHearingFormSubmitted(): void {
    console.log('Hearing form submitted, reloading transitions and case details...');
    // Reload case details to get updated state
    this.loadCaseDetails();
    // Reload transitions to update action availability based on hearing date assignment
    this.loadAvailableTransitions();
    // Reload history to show the hearing form submission
    this.loadWorkflowHistory();
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

  /**
   * Open field report request dialog (for Tehsildar)
   */
  openRequestFieldReportDialog(): void {
    if (!this.caseData) {
      this.snackBar.open('Case data not available', 'Close', { duration: 3000 });
      return;
    }

    const unitId = this.caseData.assignedToUnitId || (this.caseData as any).unitId;
    
    if (!unitId) {
      this.snackBar.open('Unit ID is required to request field report. Please ensure the case is assigned to a unit.', 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      console.error('Unit ID is missing. Case data:', this.caseData);
      return;
    }

    try {
      const dialogRef = this.dialog.open(FieldReportRequestDialogComponent, {
        width: '700px',
        maxWidth: '90vw',
        data: {
          caseId: this.caseId,
          unitId: unitId,
          courtId: (this.caseData as any).courtId
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === 'success') {
          // Refresh case details and transitions
          this.loadCaseDetails();
          this.loadAvailableTransitions();
          this.loadWorkflowHistory();
        }
      });
    } catch (error) {
      console.error('Error opening field report request dialog:', error);
      this.snackBar.open('Failed to open field report request dialog. Please try again.', 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Open field report form dialog (for Field Officers)
   */
  openFieldReportForm(): void {
    const dialogRef = this.dialog.open(FieldReportFormComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: {
        caseId: this.caseId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        // Refresh case details and transitions
        this.loadCaseDetails();
        this.loadAvailableTransitions();
        this.loadWorkflowHistory();
      }
    });
  }

  /**
   * Update attendance button visibility based on case state and transitions
   */
  updateAttendanceButtonVisibility(): void {
    // Show button if case is in PROCEEDINGS_IN_PROGRESS state
    // Or if any transition requires ATTENDANCE_SUBMITTED condition
    this.showMarkAttendanceButton = 
      this.caseData?.currentStateCode === 'PROCEEDINGS_IN_PROGRESS' ||
      this.transitions.some(t => {
        const conditions = t.checklist?.conditions || [];
        return conditions.some((c: any) => 
          c.conditionCode === 'ATTENDANCE_SUBMITTED' || 
          c.label?.toLowerCase().includes('attendance') ||
          c.moduleType === 'ATTENDANCE'
        );
      });
  }

  /**
   * Open attendance marking dialog
   */
  openAttendanceForm(): void {
    const dialogRef = this.dialog.open(AttendanceFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        caseId: this.caseId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        // Refresh case details and transitions (attendance may enable new transitions)
        this.loadCaseDetails();
        this.loadAvailableTransitions();
        this.loadWorkflowHistory();
      }
    });
  }
}
