import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OfficerCaseService, CaseDTO, WorkflowTransitionDTO, WorkflowHistory } from '../services/officer-case.service';
import { WorkflowActionDialogComponent } from '../workflow-action-dialog/workflow-action-dialog.component';

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
    judgement: false
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: OfficerCaseService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
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

    this.caseService.getAvailableTransitions(this.caseId).subscribe({
      next: (response) => {
        this.loadingTransitions = false;
        if (response.success && response.data) {
          this.transitions = response.data;
          this.determineRequiredModules();
        }
      },
      error: (err) => {
        this.loadingTransitions = false;
        console.error('Error loading transitions:', err);
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
      judgement: false
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
            }
          }
        });
      }
    });

    console.log('Required modules:', this.requiredModules);
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
  handleActionClick(transition: WorkflowTransitionDTO): void {
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
}
