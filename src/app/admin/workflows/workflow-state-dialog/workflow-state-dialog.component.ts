import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowState, WorkflowStatusHints, StateCodeWithLabel } from '../../services/workflow-config.service';

@Component({
  selector: 'app-workflow-state-dialog',
  templateUrl: './workflow-state-dialog.component.html',
  styleUrls: ['./workflow-state-dialog.component.scss']
})
export class WorkflowStateDialogComponent implements OnInit {
  stateForm: FormGroup;
  isSubmitting = false;
  statusHints: WorkflowStatusHints | null = null;
  loadingHints = true;
  /** Options for "Choose from list" dropdown; set when status hints load */
  reportingOptions: StateCodeWithLabel[] = [];

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowConfigService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<WorkflowStateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      mode: 'create' | 'edit', 
      workflowId: number,
      state?: WorkflowState,
      defaultOrder?: number
    }
  ) {
    this.stateForm = this.fb.group({
      stateCode: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
      stateName: ['', Validators.required],
      stateOrder: [null, [Validators.required, Validators.min(1)]],
      isInitialState: [null],
      isFinalState: [null],
      description: [''],
      /** Helper: choose from list to fill stateCode + stateName; not submitted */
      stateCodePicker: [null as string | null]
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.state) {
      this.stateForm.patchValue({
        stateCode: this.data.state.stateCode,
        stateName: this.data.state.stateName,
        stateOrder: this.data.state.stateOrder,
        isInitialState: this.data.state.isInitialState ?? null,
        isFinalState: this.data.state.isFinalState ?? null,
        description: this.data.state.description || ''
      });
      this.stateForm.get('stateCode')?.disable();
    } else if (this.data.defaultOrder !== null && this.data.defaultOrder !== undefined) {
      this.stateForm.patchValue({
        stateOrder: this.data.defaultOrder
      });
    }
    this.loadStatusHints();
  }

  /**
   * Load status hints so the user can choose meaningful state_code (e.g. for Dashboard "Hearing scheduled") and final state.
   */
  loadStatusHints(): void {
    this.loadingHints = true;
    this.workflowService.getWorkflowStatusHints().subscribe({
      next: (res) => {
        this.loadingHints = false;
        if (res.data) {
          this.statusHints = res.data;
          this.reportingOptions = this.getReportingOptionsList();
        }
      },
      error: () => {
        this.loadingHints = false;
      }
    });
  }

  /**
   * Build the full list for autocomplete: reportingStatesList, or from reportingStatesWithLabels, then stateCodesWithLabels, then hearingScheduledStateCodes.
   */
  getReportingOptionsList(): StateCodeWithLabel[] {
    const h = this.statusHints;
    if (!h) return [];
    if (h.reportingStatesList?.length) return h.reportingStatesList;
    const withLabelsMap = h.reportingStatesWithLabels;
    if (withLabelsMap && Object.keys(withLabelsMap).length) {
      return Object.entries(withLabelsMap).map(([stateCode, stateName]) => ({ stateCode, stateName }));
    }
    const withLabels = h.stateCodesWithLabels;
    if (withLabels?.length) return withLabels;
    const codes = h.hearingScheduledStateCodes ?? [];
    const labels = h.reportingStatesWithLabels ?? {};
    return codes.map(code => ({ stateCode: code, stateName: labels[code] ?? code }));
  }

  /**
   * When user selects from "Choose from list" dropdown, fill State Code and State Name, then reset the picker.
   */
  onStateCodeSelected(event: { value: string | null }): void {
    const code = event?.value;
    if (code == null || code === '') return;
    const item = this.reportingOptions.find(s => (s.stateCode || '').toUpperCase() === String(code).toUpperCase());
    this.stateForm.get('stateCode')?.setValue(code, { emitEvent: true });
    this.stateForm.get('stateName')?.setValue(item?.stateName ?? '', { emitEvent: true });
    this.stateForm.get('stateCodePicker')?.setValue(null, { emitEvent: false });
  }

  /** Whether this state code counts as "Hearing scheduled" on dashboard. */
  isCodeHearingScheduled(code: string): boolean {
    if (!code || !this.statusHints?.hearingScheduledStateCodes?.length) return false;
    return this.statusHints.hearingScheduledStateCodes.some(c => c.toUpperCase() === code.toUpperCase().trim());
  }

  /** Whether the current state code counts in Dashboard "Hearing scheduled". */
  isStateCodeInReportingList(): boolean {
    const code = this.stateForm.get('stateCode')?.value;
    return this.isCodeHearingScheduled(code ?? '');
  }

  /** Normalize typed value to uppercase on blur so it matches pattern (A-Z, _). */
  onStateCodeBlur(): void {
    const control = this.stateForm.get('stateCode');
    const v = control?.value;
    if (typeof v === 'string' && v.trim()) {
      control?.setValue(v.trim().toUpperCase(), { emitEvent: true });
    }
  }

  onSubmit(): void {
    if (this.stateForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.stateForm.getRawValue();
    const state: WorkflowState = {
      stateCode: formValue.stateCode,
      stateName: formValue.stateName,
      stateOrder: formValue.stateOrder,
      isInitialState: formValue.isInitialState ?? undefined,
      isFinalState: formValue.isFinalState ?? undefined,
      description: formValue.description
    };
    // stateCodePicker is not sent to API

    if (this.data.mode === 'create') {
      this.workflowService.createState(this.data.workflowId, state).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('State created successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to create state', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to create state';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    } else {
      if (!this.data.state?.id) {
        this.snackBar.open('Invalid state ID', 'Close', { duration: 3000 });
        this.isSubmitting = false;
        return;
      }

      this.workflowService.updateState(this.data.state.id, state).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('State updated successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to update state', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update state';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
