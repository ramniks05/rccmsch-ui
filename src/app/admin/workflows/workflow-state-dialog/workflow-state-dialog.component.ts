import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowState } from '../../services/workflow-config.service';

@Component({
  selector: 'app-workflow-state-dialog',
  templateUrl: './workflow-state-dialog.component.html',
  styleUrls: ['./workflow-state-dialog.component.scss']
})
export class WorkflowStateDialogComponent implements OnInit {
  stateForm: FormGroup;
  isSubmitting = false;

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
      stateOrder: [1, [Validators.required, Validators.min(1)]],
      isInitialState: [false],
      isFinalState: [false],
      description: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.state) {
      this.stateForm.patchValue({
        stateCode: this.data.state.stateCode,
        stateName: this.data.state.stateName,
        stateOrder: this.data.state.stateOrder,
        isInitialState: this.data.state.isInitialState,
        isFinalState: this.data.state.isFinalState,
        description: this.data.state.description || ''
      });
      this.stateForm.get('stateCode')?.disable();
    } else if (this.data.defaultOrder) {
      this.stateForm.patchValue({
        stateOrder: this.data.defaultOrder
      });
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
      isInitialState: formValue.isInitialState,
      isFinalState: formValue.isFinalState,
      description: formValue.description
    };

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
