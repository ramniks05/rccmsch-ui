import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { WorkflowService } from '../../core/services/workflow.service';
import { CitizenCaseService } from '../services/citizen-case.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import type { TransitionWithChecklist } from '../../core/models/workflow-condition.types';

@Component({
  selector: 'app-available-actions',
  templateUrl: './available-actions.component.html',
  styleUrls: ['./available-actions.component.scss']
})
export class AvailableActionsComponent implements OnInit, OnChanges {
  @Input() caseId!: number;

  transitions: TransitionWithChecklist[] = [];
  isLoading = false;
  loadError: string | null = null;
  executingTransition: string | null = null;

  constructor(
    private workflowService: WorkflowService,
    private caseService: CitizenCaseService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.caseId) {
      this.loadTransitions();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['caseId'] && this.caseId) {
      this.loadTransitions();
    }
  }

  loadTransitions(): void {
    if (!this.caseId) {
      return;
    }
    this.isLoading = true;
    this.loadError = null;
    this.workflowService.getCaseTransitions(this.caseId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          // Response is already normalized by WorkflowService
          this.transitions = res.data;
          // If no transitions, that's okay - no error, just no actions available
          if (this.transitions.length === 0) {
            this.loadError = null;
          }
        } else {
          // Check if it's a "no actions" scenario vs actual error
          const msg = res.message ?? '';
          if (msg.toLowerCase().includes('no action') || msg.toLowerCase().includes('no transition')) {
            this.transitions = [];
            this.loadError = null; // No error, just no actions
          } else {
            this.transitions = [];
            this.loadError = msg || 'Failed to load actions';
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        
        // Check if it's a case where no actions are available (not a real error)
        if (err?.status === 404 || 
            err?.error?.message?.toLowerCase().includes('no action') || 
            err?.error?.message?.toLowerCase().includes('no transition')) {
          this.transitions = [];
          this.loadError = null; // No error, just no actions available
        } else {
          // Real error occurred - show appropriate message
          let errorMsg = 'Failed to load available actions';
          
          if (err?.status === 400) {
            errorMsg = 'Invalid request. Please try again.';
          } else if (err?.status === 403) {
            errorMsg = 'You do not have permission to view actions for this case.';
          } else if (err?.status === 404) {
            errorMsg = 'Case not found.';
          } else if (err?.status === 0 || err?.statusText === 'Unknown Error') {
            errorMsg = 'Network error: Could not connect to server. Please check your connection.';
          } else if (err?.status >= 500) {
            errorMsg = 'Server error occurred. Please try again later.';
          } else if (err?.error?.message) {
            errorMsg = err.error.message;
          } else if (err?.message) {
            errorMsg = err.message;
          }
          
          this.transitions = [];
          this.loadError = errorMsg;
        }
      }
    });
  }

  blockingReasons(t: TransitionWithChecklist): string[] {
    if (!t.blockingConditions) {
      return [];
    }
    return t.blockingConditions.filter((c) => !c.passed).map((c) => c.label);
  }

  tooltipText(t: TransitionWithChecklist): string {
    if (!t.blockingConditions?.length) {
      return t.transitionName;
    }
    const total = t.blockingConditions.length;
    const met = t.blockingConditions.filter((c) => c.passed).length;
    const lines = t.blockingConditions.map(
      (c) => `${c.passed ? '✓' : '✗'} ${c.label}`
    );
    return [t.transitionName, '', `${met} of ${total} conditions met`, '', ...lines].join('\n');
  }

  /**
   * Execute a workflow transition
   */
  executeTransition(transition: TransitionWithChecklist): void {
    if (!transition.canExecute || this.executingTransition) {
      return;
    }

    // For INITIATE_CASE, this is typically done during case submission
    // But if it's available as a transition, we can execute it
    if (transition.transitionCode === 'INITIATE_CASE') {
      // Show confirmation dialog
      const comments = transition.requiresComment 
        ? prompt('Please provide comments (required):')
        : '';
      
      if (transition.requiresComment && !comments) {
        this.snackBar.open('Comments are required for this action', 'Close', { duration: 3000 });
        return;
      }

      this.executingTransition = transition.transitionCode;
      this.caseService.executeTransition(this.caseId, {
        transitionCode: transition.transitionCode,
        comments: comments || undefined
      }).subscribe({
        next: (response) => {
          this.executingTransition = null;
          if (response.success) {
            this.snackBar.open(
              response.message || 'Action executed successfully',
              'Close',
              { duration: 3000, panelClass: ['success-snackbar'] }
            );
            // Reload transitions to reflect the new state
            this.loadTransitions();
          } else {
            this.snackBar.open(
              response.message || 'Failed to execute action',
              'Close',
              { duration: 5000 }
            );
          }
        },
        error: (error) => {
          this.executingTransition = null;
          const errorMessage = error?.error?.message || error?.message || 'Failed to execute action';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    } else {
      // For other transitions, show a simple confirmation
      const confirmed = confirm(`Execute "${transition.transitionName}"?`);
      if (!confirmed) {
        return;
      }

      const comments = transition.requiresComment 
        ? prompt('Please provide comments (required):')
        : '';
      
      if (transition.requiresComment && !comments) {
        this.snackBar.open('Comments are required for this action', 'Close', { duration: 3000 });
        return;
      }

      this.executingTransition = transition.transitionCode;
      this.caseService.executeTransition(this.caseId, {
        transitionCode: transition.transitionCode,
        comments: comments || undefined
      }).subscribe({
        next: (response) => {
          this.executingTransition = null;
          if (response.success) {
            this.snackBar.open(
              response.message || 'Action executed successfully',
              'Close',
              { duration: 3000, panelClass: ['success-snackbar'] }
            );
            // Reload transitions to reflect the new state
            this.loadTransitions();
          } else {
            this.snackBar.open(
              response.message || 'Failed to execute action',
              'Close',
              { duration: 5000 }
            );
          }
        },
        error: (error) => {
          this.executingTransition = null;
          const errorMessage = error?.error?.message || error?.message || 'Failed to execute action';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }
}
