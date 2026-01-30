import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService } from '../../services/workflow-config.service';
import type { WorkflowTransition } from '../../services/workflow-config.service';
import { WORKFLOW_FLAGS } from '../../../core/models/workflow-condition.types';

export interface ViewTransitionConditionsData {
  transition: WorkflowTransition;
  fromStateName?: string;
  toStateName?: string;
}

interface PermissionCondition {
  permissionId: number;
  roleCode: string;
  unitLevel?: string;
  hierarchyRule?: string;
  canInitiate: boolean;
  isActive: boolean;
  conditions?: {
    workflowDataFieldsRequired?: string[];
    moduleFormFieldsRequired?: Array<{
      moduleType: string;
      fieldName: string;
    }>;
  };
}

@Component({
  selector: 'app-view-transition-conditions-dialog',
  templateUrl: './view-transition-conditions-dialog.component.html',
  styleUrls: ['./view-transition-conditions-dialog.component.scss']
})
export class ViewTransitionConditionsDialogComponent implements OnInit {
  transitionData: any = null;
  permissions: PermissionCondition[] = [];
  isLoading = true;

  constructor(
    private workflowService: WorkflowConfigService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ViewTransitionConditionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewTransitionConditionsData
  ) {}

  ngOnInit(): void {
    const id = this.data.transition?.id;
    if (!id) {
      this.isLoading = false;
      return;
    }
    this.workflowService.getTransitionConditions(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.transitionData = res.data;
          this.permissions = res.data.permissions || [];
        } else {
          this.snackBar.open(res.message ?? 'Failed to load conditions', 'Close', { duration: 5000 });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message ?? err?.message ?? 'Failed to load conditions';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  hasConditions(permission: PermissionCondition): boolean {
    return !!(
      permission.conditions?.workflowDataFieldsRequired?.length ||
      permission.conditions?.moduleFormFieldsRequired?.length
    );
  }

  getWorkflowFlagLabel(flag: string): string {
    const allFlags = [...WORKFLOW_FLAGS.formSubmitted, ...WORKFLOW_FLAGS.documentReady];
    const found = allFlags.find(f => f.value === flag);
    return found ? found.label : flag;
  }

  getModuleFieldLabel(moduleType: string, fieldName: string): string {
    return `${moduleType} → ${fieldName}`;
  }

  /**
   * Get only permissions that have conditions configured
   */
  getPermissionsWithConditions(): PermissionCondition[] {
    return this.permissions.filter(p => this.hasConditions(p));
  }

  /**
   * Get total count of all conditions across all permissions
   */
  getTotalConditionsCount(): number {
    let total = 0;
    this.permissions.forEach(p => {
      if (p.conditions) {
        total += (p.conditions.workflowDataFieldsRequired?.length || 0);
        total += (p.conditions.moduleFormFieldsRequired?.length || 0);
      }
    });
    return total;
  }
}
