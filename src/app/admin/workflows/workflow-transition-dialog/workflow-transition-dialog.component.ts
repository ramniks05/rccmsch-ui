import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowState, WorkflowTransition } from '../../services/workflow-config.service';

@Component({
  selector: 'app-workflow-transition-dialog',
  templateUrl: './workflow-transition-dialog.component.html',
  styleUrls: ['./workflow-transition-dialog.component.scss']
})
export class WorkflowTransitionDialogComponent implements OnInit {
  transitionForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowConfigService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<WorkflowTransitionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      mode: 'create' | 'edit', 
      workflowId: number,
      states: WorkflowState[],
      transitions?: WorkflowTransition[],
      transition?: WorkflowTransition
    }
  ) {
    this.transitionForm = this.fb.group({
      transitionCode: ['', [
        Validators.required, 
        Validators.pattern(/^[A-Z_]+$/),
        this.duplicateCodeValidator()
      ]],
      transitionName: ['', Validators.required],
      fromStateId: [null, Validators.required],
      toStateId: [null, Validators.required],
      requiresComment: [null],
      isActive: [null],
      description: ['']
    });
  }

  /**
   * Custom validator to check for duplicate transition codes
   */
  duplicateCodeValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || this.data.mode === 'edit') {
        return null; // Skip validation for edit mode or empty value
      }

      const existingTransitions = this.data.transitions || [];
      const codeExists = existingTransitions.some(
        t => t.transitionCode?.toUpperCase() === control.value?.toUpperCase()
      );

      return codeExists ? { duplicateCode: true } : null;
    };
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.transition) {
      this.transitionForm.patchValue({
        transitionCode: this.data.transition.transitionCode,
        transitionName: this.data.transition.transitionName,
        fromStateId: this.data.transition.fromStateId,
        toStateId: this.data.transition.toStateId,
        requiresComment: this.data.transition.requiresComment ?? null,
        isActive: this.data.transition.isActive ?? null,
        description: this.data.transition.description || ''
      });
      this.transitionForm.get('transitionCode')?.disable();
    }
  }

  onSubmit(): void {
    if (this.transitionForm.invalid) {
      return;
    }

    const formValue = this.transitionForm.getRawValue();
    if (formValue.fromStateId === formValue.toStateId) {
      this.snackBar.open('From and To states cannot be the same', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    const transition: WorkflowTransition = {
      transitionCode: formValue.transitionCode,
      transitionName: formValue.transitionName,
      fromStateId: formValue.fromStateId,
      toStateId: formValue.toStateId,
      requiresComment: formValue.requiresComment ?? undefined,
      isActive: formValue.isActive ?? undefined,
      description: formValue.description
    };

    if (this.data.mode === 'create') {
      this.workflowService.createTransition(this.data.workflowId, transition).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Transition created successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to create transition', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          let errorMessage = error?.error?.message || error?.message || 'Failed to create transition';
          
          // Check for duplicate code error
          if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
            errorMessage = `Transition code "${formValue.transitionCode}" already exists in this workflow. Please use a different code.`;
            // Mark the field as having error
            this.transitionForm.get('transitionCode')?.setErrors({ duplicateCode: true });
          }
          
          this.snackBar.open(errorMessage, 'Close', { duration: 6000 });
        }
      });
    } else {
      if (!this.data.transition?.id) {
        this.snackBar.open('Invalid transition ID', 'Close', { duration: 3000 });
        this.isSubmitting = false;
        return;
      }

      this.workflowService.updateTransition(this.data.transition.id, transition).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Transition updated successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to update transition', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update transition';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Get existing transition codes as a comma-separated string for hint
   */
  getExistingCodes(): string {
    if (!this.data.transitions || this.data.transitions.length === 0) {
      return 'None';
    }
    return this.data.transitions.map(t => t.transitionCode).join(', ');
  }
}
