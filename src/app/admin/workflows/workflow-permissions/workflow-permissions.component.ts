import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowTransition, WorkflowState, WorkflowPermission } from '../../services/workflow-config.service';
import { WorkflowPermissionDialogComponent } from '../workflow-permission-dialog/workflow-permission-dialog.component';

@Component({
  selector: 'app-workflow-permissions',
  templateUrl: './workflow-permissions.component.html',
  styleUrls: ['./workflow-permissions.component.scss']
})
export class WorkflowPermissionsComponent implements OnInit, OnChanges {
  @Input() transition!: WorkflowTransition;
  @Input() states: WorkflowState[] = [];
  @Output() permissionsUpdated = new EventEmitter<void>();

  displayedColumns: string[] = ['roleCode', 'unitLevel', 'canInitiate', 'canApprove', 'hierarchyRule', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<WorkflowPermission>([]);
  
  permissions: WorkflowPermission[] = [];
  isLoading = false;

  roleCodes = [
    'CITIZEN',
    'DEALING_ASSISTANT',
    'CIRCLE_MANDOL',
    'CIRCLE_OFFICER',
    'SUB_DIVISION_OFFICER',
    'DISTRICT_OFFICER',
    'STATE_ADMIN',
    'SUPER_ADMIN'
  ];

  constructor(
    private workflowService: WorkflowConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.transition?.id) {
      this.loadPermissions();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transition'] && this.transition?.id) {
      this.loadPermissions();
    }
  }

  loadPermissions(): void {
    if (!this.transition?.id) {
      return;
    }

    this.isLoading = true;
    this.workflowService.getTransitionPermissions(this.transition.id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.permissions = response.data;
          this.dataSource.data = this.permissions;
        } else {
          this.snackBar.open(response.message || 'Failed to load permissions', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load permissions';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(WorkflowPermissionDialogComponent, {
      width: '700px',
      data: { 
        mode: 'create',
        transitionId: this.transition.id,
        roleCodes: this.roleCodes
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPermissions();
        this.permissionsUpdated.emit();
      }
    });
  }

  openEditDialog(permission: WorkflowPermission): void {
    const dialogRef = this.dialog.open(WorkflowPermissionDialogComponent, {
      width: '700px',
      data: { 
        mode: 'edit',
        transitionId: this.transition.id,
        roleCodes: this.roleCodes,
        permission: permission
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPermissions();
        this.permissionsUpdated.emit();
      }
    });
  }

  deletePermission(permission: WorkflowPermission): void {
    if (!confirm(`Delete permission for role "${permission.roleCode}"?`)) {
      return;
    }

    if (!permission.id) {
      this.snackBar.open('Invalid permission ID', 'Close', { duration: 3000 });
      return;
    }

    this.workflowService.deletePermission(permission.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Permission deleted successfully', 'Close', { duration: 3000 });
          this.loadPermissions();
          this.permissionsUpdated.emit();
        } else {
          this.snackBar.open(response.message || 'Failed to delete permission', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to delete permission';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }
}
