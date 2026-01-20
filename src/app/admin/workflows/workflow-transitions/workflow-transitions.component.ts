import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowConfigService, WorkflowState, WorkflowTransition } from '../../services/workflow-config.service';
import { WorkflowTransitionDialogComponent } from '../workflow-transition-dialog/workflow-transition-dialog.component';

@Component({
  selector: 'app-workflow-transitions',
  templateUrl: './workflow-transitions.component.html',
  styleUrls: ['./workflow-transitions.component.scss']
})
export class WorkflowTransitionsComponent implements OnInit, OnChanges {
  @Input() workflowId!: number;
  @Input() states: WorkflowState[] = [];
  @Input() transitions: WorkflowTransition[] = [];
  @Output() transitionsUpdated = new EventEmitter<void>();
  @Output() transitionSelected = new EventEmitter<WorkflowTransition>();

  displayedColumns: string[] = ['transitionCode', 'transitionName', 'fromState', 'toState', 'requiresComment', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<WorkflowTransition>([]);

  constructor(
    private workflowService: WorkflowConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.dataSource.data = this.transitions;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transitions']) {
      this.dataSource.data = this.transitions || [];
    }
  }

  getStateName(stateId: number): string {
    const state = this.states.find(s => s.id === stateId);
    return state ? state.stateName : 'Unknown';
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(WorkflowTransitionDialogComponent, {
      width: '700px',
      data: { 
        mode: 'create',
        workflowId: this.workflowId,
        states: this.states,
        transitions: this.transitions // Pass existing transitions for validation
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.transitionsUpdated.emit();
      }
    });
  }

  openEditDialog(transition: WorkflowTransition): void {
    const dialogRef = this.dialog.open(WorkflowTransitionDialogComponent, {
      width: '700px',
      data: { 
        mode: 'edit',
        workflowId: this.workflowId,
        states: this.states,
        transition: transition
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.transitionsUpdated.emit();
      }
    });
  }

  deleteTransition(transition: WorkflowTransition): void {
    if (!confirm(`Delete transition "${transition.transitionName}"?`)) {
      return;
    }

    if (!transition.id) {
      this.snackBar.open('Invalid transition ID', 'Close', { duration: 3000 });
      return;
    }

    this.workflowService.deleteTransition(transition.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Transition deleted successfully', 'Close', { duration: 3000 });
          this.transitionsUpdated.emit();
        } else {
          this.snackBar.open(response.message || 'Failed to delete transition', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to delete transition';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  selectTransition(transition: WorkflowTransition): void {
    this.transitionSelected.emit(transition);
  }
}
