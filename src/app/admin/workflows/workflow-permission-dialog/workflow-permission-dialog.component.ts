import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowPermission } from '../../services/workflow-config.service';

@Component({
  selector: 'app-workflow-permission-dialog',
  templateUrl: './workflow-permission-dialog.component.html',
  styleUrls: ['./workflow-permission-dialog.component.scss']
})
export class WorkflowPermissionDialogComponent implements OnInit {
  permissionForm: FormGroup;
  isSubmitting = false;

  unitLevels = ['STATE', 'DISTRICT', 'SUB_DIVISION', 'CIRCLE'];
  hierarchyRules = ['SAME_UNIT', 'PARENT_UNIT', 'ANY_UNIT', 'SUPERVISOR'];

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowConfigService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<WorkflowPermissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      mode: 'create' | 'edit', 
      transitionId: number,
      roleCodes: string[],
      permission?: WorkflowPermission
    }
  ) {
    this.permissionForm = this.fb.group({
      roleCode: ['', Validators.required],
      unitLevel: [null],
      canInitiate: [false],
      canApprove: [false],
      hierarchyRule: [''],
      conditions: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.permission) {
      this.permissionForm.patchValue({
        roleCode: this.data.permission.roleCode,
        unitLevel: this.data.permission.unitLevel || null,
        canInitiate: this.data.permission.canInitiate,
        canApprove: this.data.permission.canApprove,
        hierarchyRule: this.data.permission.hierarchyRule || '',
        conditions: this.data.permission.conditions || '',
        isActive: this.data.permission.isActive !== false
      });
    }
  }

  onSubmit(): void {
    if (this.permissionForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.permissionForm.value;
    const permission: WorkflowPermission = {
      roleCode: formValue.roleCode,
      unitLevel: formValue.unitLevel || null,
      canInitiate: formValue.canInitiate,
      canApprove: formValue.canApprove,
      hierarchyRule: formValue.hierarchyRule || undefined,
      conditions: formValue.conditions || undefined,
      isActive: formValue.isActive
    };

    if (this.data.mode === 'create') {
      this.workflowService.createPermission(this.data.transitionId, permission).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Permission created successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to create permission', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to create permission';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    } else {
      if (!this.data.permission?.id) {
        this.snackBar.open('Invalid permission ID', 'Close', { duration: 3000 });
        this.isSubmitting = false;
        return;
      }

      this.workflowService.updatePermission(this.data.permission.id, permission).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Permission updated successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to update permission', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update permission';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
