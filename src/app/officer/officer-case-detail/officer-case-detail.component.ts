import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OfficerCaseService, CaseDTO, WorkflowTransitionDTO, WorkflowHistory } from '../services/officer-case.service';
import { WorkflowActionDialogComponent } from '../workflow-action-dialog/workflow-action-dialog.component';
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

  // Current officer role (for Reader/Tehsildar specific behaviour)
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: OfficerCaseService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
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
   * Convenience check for Reader role
   */
  private isReader(): boolean {
    return this.userRoleCode?.toUpperCase() === 'READER';
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
          this.parseCaseData();
          // Update attendance button visibility based on case state
          this.updateAttendanceButtonVisibility();
        } else {
          this.error = response.message || 'Failed to load case details';
        }
      },
      error: (err) => {
        this.loading = false;
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
   * Handle action button click
   */
  /**
   * Check if transition can be executed (not blocked by conditions)
   */
  isTransitionExecutable(transition: WorkflowTransitionDTO): boolean {
    // For Reader role, always enable actions (ignore checklist blocking)
    if (this.isReader()) {
      return true;
    }

    // For other roles, respect checklist canExecute flag
    if (transition.checklist?.canExecute === false) {
      return false;
    }

    // Default to true if no checklist or canExecute is not explicitly false
    return true;
  }

  /**
   * Get blocking reasons for a transition
   */
  getBlockingReasons(transition: WorkflowTransitionDTO): string {
    if (this.isTransitionExecutable(transition)) {
      return '';
    }
    
    // Get blocking reasons from checklist
    const reasons: string[] = [];
    
    if (transition.checklist?.blockingReasons && transition.checklist.blockingReasons.length > 0) {
      reasons.push(...transition.checklist.blockingReasons);
    }
    
    // Also check conditions that failed
    if (transition.checklist?.conditions) {
      const failedConditions = transition.checklist.conditions
        .filter(c => !c.passed && c.required)
        .map(c => c.label || c.message);
      reasons.push(...failedConditions);
    }
    
    return reasons.length > 0 
      ? reasons.join('. ') 
      : 'This action cannot be performed. Required conditions are not met.';
  }

  /**
   * Check if there are any blocked transitions
   */
  hasBlockedTransitions(): boolean {
    return this.transitions.some(t => !this.isTransitionExecutable(t));
  }

  /**
   * Get list of blocked transitions
   */
  getBlockedTransitions(): WorkflowTransitionDTO[] {
    return this.transitions.filter(t => !this.isTransitionExecutable(t) && this.getBlockingReasons(t));
  }

  handleActionClick(transition: WorkflowTransitionDTO): void {
    // Prevent execution if blocked
    if (!this.isTransitionExecutable(transition)) {
      const reasons = this.getBlockingReasons(transition);
      this.snackBar.open(
        reasons || 'This action cannot be performed. Required conditions are not met.',
        'Close',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }
    const dialogRef = this.dialog.open(WorkflowActionDialogComponent, {
      width: '500px',
      data: {
        transition: transition,
        caseNumber: this.caseData?.caseNumber
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
