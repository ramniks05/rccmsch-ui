import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkflowConfigService, WorkflowDefinition, WorkflowState, WorkflowTransition } from '../../services/workflow-config.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-workflow-builder',
  templateUrl: './workflow-builder.component.html',
  styleUrls: ['./workflow-builder.component.scss']
})
export class WorkflowBuilderComponent implements OnInit {
  workflowId!: number;
  workflow: WorkflowDefinition | null = null;
  states: WorkflowState[] = [];
  transitions: WorkflowTransition[] = [];
  
  activeTab: 'states' | 'transitions' | 'permissions' = 'states';
  selectedTransition: WorkflowTransition | null = null;
  
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.workflowId = +params['id'];
      if (this.workflowId) {
        this.loadWorkflow();
        this.loadStates();
        this.loadTransitions();
      }
    });
  }

  loadWorkflow(): void {
    this.isLoading = true;
    this.workflowService.getWorkflowById(this.workflowId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.workflow = response.data;
        } else {
          this.snackBar.open(response.message || 'Failed to load workflow', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load workflow';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  loadStates(): void {
    this.workflowService.getWorkflowStates(this.workflowId).subscribe({
      next: (response) => {
        if (response.success) {
          this.states = response.data.sort((a, b) => (a.stateOrder || 0) - (b.stateOrder || 0));
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load states';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  loadTransitions(): void {
    this.workflowService.getAllWorkflowTransitions(this.workflowId).subscribe({
      next: (response) => {
        if (response.success) {
          this.transitions = response.data;
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load transitions';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  onStatesUpdated(): void {
    this.loadStates();
  }

  onTransitionsUpdated(): void {
    this.loadTransitions();
  }

  selectTransition(transition: WorkflowTransition): void {
    this.selectedTransition = transition;
    this.activeTab = 'permissions';
  }

  getStateName(stateId: number): string {
    const state = this.states.find(s => s.id === stateId);
    return state ? state.stateName : 'Unknown';
  }

  getStateCode(stateId: number): string {
    const state = this.states.find(s => s.id === stateId);
    return state ? state.stateCode : 'UNKNOWN';
  }
}
