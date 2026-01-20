import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowDefinition } from '../../services/workflow-config.service';

@Component({
  selector: 'app-workflow-dialog',
  templateUrl: './workflow-dialog.component.html',
  styleUrls: ['./workflow-dialog.component.scss']
})
export class WorkflowDialogComponent implements OnInit {
  workflowForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowConfigService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<WorkflowDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit', workflow?: WorkflowDefinition }
  ) {
    this.workflowForm = this.fb.group({
      workflowCode: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
      workflowName: ['', Validators.required],
      description: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.workflow) {
      this.workflowForm.patchValue({
        workflowCode: this.data.workflow.workflowCode,
        workflowName: this.data.workflow.workflowName,
        description: this.data.workflow.description || '',
        isActive: this.data.workflow.isActive !== false
      });
      // Disable code editing in edit mode
      this.workflowForm.get('workflowCode')?.disable();
    }
  }

  onSubmit(): void {
    if (this.workflowForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.workflowForm.getRawValue();
    const workflow: WorkflowDefinition = {
      workflowCode: formValue.workflowCode,
      workflowName: formValue.workflowName,
      description: formValue.description,
      isActive: formValue.isActive
    };

    if (this.data.mode === 'create') {
      this.workflowService.createWorkflow(workflow).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Workflow created successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to create workflow', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to create workflow';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    } else {
      if (!this.data.workflow?.id) {
        this.snackBar.open('Invalid workflow ID', 'Close', { duration: 3000 });
        this.isSubmitting = false;
        return;
      }

      this.workflowService.updateWorkflow(this.data.workflow.id, workflow).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Workflow updated successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to update workflow', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update workflow';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
