import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowState } from '../../services/workflow-config.service';
import { WorkflowStateDialogComponent } from '../workflow-state-dialog/workflow-state-dialog.component';

@Component({
  selector: 'app-workflow-states',
  templateUrl: './workflow-states.component.html',
  styleUrls: ['./workflow-states.component.scss']
})
export class WorkflowStatesComponent implements OnInit, OnChanges {
  @Input() workflowId!: number;
  @Input() states: WorkflowState[] = [];
  @Output() statesUpdated = new EventEmitter<void>();

  displayedColumns: string[] = ['stateOrder', 'stateCode', 'stateName', 'isInitialState', 'isFinalState', 'actions'];
  dataSource = new MatTableDataSource<WorkflowState>([]);

  constructor(
    private workflowService: WorkflowConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.dataSource.data = this.states;
  }

  ngOnChanges(): void {
    this.dataSource.data = this.states || [];
  }

  openCreateDialog(): void {
    const maxOrder = this.states.length > 0
      ? Math.max(...this.states.map(s => s.stateOrder || 0), 0)
      : null;
    const dialogRef = this.dialog.open(WorkflowStateDialogComponent, {
      width: '600px',
      data: { 
        mode: 'create',
        workflowId: this.workflowId,
        defaultOrder: maxOrder !== null ? maxOrder + 1 : null
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.statesUpdated.emit();
      }
    });
  }

  openEditDialog(state: WorkflowState): void {
    const dialogRef = this.dialog.open(WorkflowStateDialogComponent, {
      width: '600px',
      data: { 
        mode: 'edit',
        workflowId: this.workflowId,
        state: state
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.statesUpdated.emit();
      }
    });
  }

  deleteState(state: WorkflowState): void {
    if (!confirm(`Delete state "${state.stateName}"?`)) {
      return;
    }

    if (!state.id) {
      this.snackBar.open('Invalid state ID', 'Close', { duration: 3000 });
      return;
    }

    this.workflowService.deleteState(state.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('State deleted successfully', 'Close', { duration: 3000 });
          this.statesUpdated.emit();
        } else {
          this.snackBar.open(response.message || 'Failed to delete state', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to delete state';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }
}
