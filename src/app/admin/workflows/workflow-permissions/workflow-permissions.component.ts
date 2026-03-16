import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowTransition, WorkflowState, WorkflowPermission } from '../../services/workflow-config.service';
import { WorkflowPermissionDialogComponent } from '../workflow-permission-dialog/workflow-permission-dialog.component';
import { AdminService } from '../../admin.service';

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
  /** Roles loaded from /api/admin/officer/roles (role master) */
  roles: { roleId: number; roleCode: string; roleName?: string; unitLevel?: string; description?: string }[] = [];
  loadingRoles = false;

  constructor(
    private workflowService: WorkflowConfigService,
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    if (this.transition?.id) {
      this.loadPermissions();
    }
  }

  /**
   * Load all roles from API (role master)
   */
  loadRoles(): void {
    this.loadingRoles = true;
    this.adminService.getAllRoles().subscribe({
      next: (response) => {
        this.loadingRoles = false;
        const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
        if (apiResponse.success && apiResponse.data) {
          // Map roles from API (keep roleId + roleCode)
          this.roles = apiResponse.data
            .map((role: any) => ({
              roleId: role.roleId ?? role.id,
              roleCode: role.roleCode || role.code,
              roleName: role.roleName,
              unitLevel: role.unitLevel,
              description: role.description
            }))
            .filter((r: any) => r.roleId != null && r.roleCode);
        } else {
          // Fallback to default roles if API fails
          this.roles = [
            { roleId: 0, roleCode: 'CITIZEN', roleName: 'Citizen' },
            { roleId: 0, roleCode: 'DEALING_ASSISTANT', roleName: 'Dealing Assistant' },
            { roleId: 0, roleCode: 'CIRCLE_MANDOL', roleName: 'Circle Mandol' },
            { roleId: 0, roleCode: 'CIRCLE_OFFICER', roleName: 'Circle Officer' },
            { roleId: 0, roleCode: 'SUB_DIVISION_OFFICER', roleName: 'Sub Division Officer' },
            { roleId: 0, roleCode: 'DISTRICT_OFFICER', roleName: 'District Officer' },
            { roleId: 0, roleCode: 'STATE_ADMIN', roleName: 'State Admin' },
            { roleId: 0, roleCode: 'SUPER_ADMIN', roleName: 'Super Admin' },
            { roleId: 0, roleCode: 'ADJACENT', roleName: 'Adjacent Officer' }
          ];
        }
      },
      error: (error) => {
        this.loadingRoles = false;
        console.error('Failed to load roles:', error);
        // Fallback to default roles including ADJACENT
        this.roles = [
          { roleId: 0, roleCode: 'CITIZEN', roleName: 'Citizen' },
          { roleId: 0, roleCode: 'DEALING_ASSISTANT', roleName: 'Dealing Assistant' },
          { roleId: 0, roleCode: 'CIRCLE_MANDOL', roleName: 'Circle Mandol' },
          { roleId: 0, roleCode: 'CIRCLE_OFFICER', roleName: 'Circle Officer' },
          { roleId: 0, roleCode: 'SUB_DIVISION_OFFICER', roleName: 'Sub Division Officer' },
          { roleId: 0, roleCode: 'DISTRICT_OFFICER', roleName: 'District Officer' },
          { roleId: 0, roleCode: 'STATE_ADMIN', roleName: 'State Admin' },
          { roleId: 0, roleCode: 'SUPER_ADMIN', roleName: 'Super Admin' },
          { roleId: 0, roleCode: 'ADJACENT', roleName: 'Adjacent Officer' }
        ];
      }
    });
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
        roles: this.roles
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
        roles: this.roles,
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
