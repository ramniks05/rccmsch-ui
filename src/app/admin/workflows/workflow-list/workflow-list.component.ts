import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { WorkflowConfigService, WorkflowDefinition } from '../../services/workflow-config.service';
import { WorkflowDialogComponent } from '../workflow-dialog/workflow-dialog.component';

/**
 * Workflow List Component
 * Manages workflow definitions with CRUD operations
 */
@Component({
  selector: 'app-workflow-list',
  templateUrl: './workflow-list.component.html',
  styleUrls: ['./workflow-list.component.scss']
})
export class WorkflowListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['workflowCode', 'workflowName', 'description', 'isActive', 'version', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  private _paginator!: MatPaginator;
  private _sort!: MatSort;

  @ViewChild(MatPaginator)
  set paginator(p: MatPaginator) {
    if (p) {
      this._paginator = p;
      this.dataSource.paginator = p;
    }
  }

  @ViewChild(MatSort)
  set sort(s: MatSort) {
    if (s) {
      this._sort = s;
      this.dataSource.sort = s;
    }
  }
  isLoading = false;
  errorMessage = '';

  constructor(
    private workflowService: WorkflowConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load all workflows
   */
  loadWorkflows(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.workflowService.getAllWorkflows().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.dataSource.data = response.data || [];
        } else {
          this.errorMessage = response.message || 'Failed to load workflows';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.handleError(error);
      }
    });
  }

  /**
   * Open create dialog
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(WorkflowDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkflows();
      }
    });
  }

  /**
   * Open edit dialog
   */
  openEditDialog(workflow: WorkflowDefinition): void {
    const dialogRef = this.dialog.open(WorkflowDialogComponent, {
      width: '600px',
      data: { mode: 'edit', workflow: workflow }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkflows();
      }
    });
  }

  /**
   * Delete workflow
   */
  deleteWorkflow(workflow: WorkflowDefinition): void {
    if (!confirm(`Are you sure you want to delete workflow "${workflow.workflowName}"?`)) {
      return;
    }

    if (!workflow.id) {
      this.snackBar.open('Invalid workflow ID', 'Close', { duration: 3000 });
      return;
    }

    this.workflowService.deleteWorkflow(workflow.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Workflow deleted successfully', 'Close', { duration: 3000 });
          this.loadWorkflows();
        } else {
          this.snackBar.open(response.message || 'Failed to delete workflow', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        this.handleError(error);
      }
    });
  }

  /**
   * View workflow details (navigate to builder)
   */
  viewWorkflowDetails(workflow: WorkflowDefinition): void {
    if (workflow.id) {
      this.router.navigate(['/admin/workflows', workflow.id]);
    }
  }

  /**
   * Apply filter to table
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): void {
    const errorMessage = error?.error?.message || error?.message || 'An error occurred';
    this.errorMessage = errorMessage;
    this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
    console.error('Error:', error);
  }
}
