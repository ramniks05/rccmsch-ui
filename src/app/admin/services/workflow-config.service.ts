import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkflowDefinition {
  id?: number;
  workflowCode: string;
  workflowName: string;
  description?: string;
  isActive?: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowState {
  id?: number;
  workflowId?: number;
  workflowCode?: string;
  stateCode: string;
  stateName: string;
  stateOrder: number;
  isInitialState: boolean;
  isFinalState: boolean;
  description?: string;
}

export interface WorkflowTransition {
  id?: number;
  workflowId?: number;
  fromStateId: number;
  toStateId: number;
  transitionCode: string;
  transitionName: string;
  requiresComment?: boolean;
  isActive?: boolean;
  description?: string;
}

export interface WorkflowPermission {
  id?: number;
  transitionId?: number;
  transitionCode?: string;
  roleCode: string;
  unitLevel?: 'STATE' | 'DISTRICT' | 'SUB_DIVISION' | 'CIRCLE' | null;
  canInitiate: boolean;
  canApprove: boolean;
  hierarchyRule?: string;
  conditions?: string;
  isActive?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowConfigService {
  private apiUrl = `${environment.apiUrl}/admin/workflow`;
  private token: string | null = null;

  constructor(private http: HttpClient) {
    this.token = localStorage.getItem('adminToken');
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    });
  }

  // ==================== Workflow Definition APIs ====================

  getAllWorkflows(): Observable<ApiResponse<WorkflowDefinition[]>> {
    return this.http.get<ApiResponse<WorkflowDefinition[]>>(
      `${this.apiUrl}/definitions`,
      { headers: this.getHeaders() }
    );
  }

  getActiveWorkflows(): Observable<ApiResponse<WorkflowDefinition[]>> {
    return this.http.get<ApiResponse<WorkflowDefinition[]>>(
      `${this.apiUrl}/definitions/active`,
      { headers: this.getHeaders() }
    );
  }

  getWorkflowById(id: number): Observable<ApiResponse<WorkflowDefinition>> {
    return this.http.get<ApiResponse<WorkflowDefinition>>(
      `${this.apiUrl}/definitions/id/${id}`,
      { headers: this.getHeaders() }
    );
  }

  getWorkflowByCode(code: string): Observable<ApiResponse<WorkflowDefinition>> {
    return this.http.get<ApiResponse<WorkflowDefinition>>(
      `${this.apiUrl}/definitions/${code}`,
      { headers: this.getHeaders() }
    );
  }

  createWorkflow(workflow: WorkflowDefinition): Observable<ApiResponse<WorkflowDefinition>> {
    return this.http.post<ApiResponse<WorkflowDefinition>>(
      `${this.apiUrl}/definitions`,
      workflow,
      { headers: this.getHeaders() }
    );
  }

  updateWorkflow(id: number, workflow: WorkflowDefinition): Observable<ApiResponse<WorkflowDefinition>> {
    return this.http.put<ApiResponse<WorkflowDefinition>>(
      `${this.apiUrl}/definitions/${id}`,
      workflow,
      { headers: this.getHeaders() }
    );
  }

  deleteWorkflow(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/definitions/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ==================== Workflow State APIs ====================

  getWorkflowStates(workflowId: number): Observable<ApiResponse<WorkflowState[]>> {
    return this.http.get<ApiResponse<WorkflowState[]>>(
      `${this.apiUrl}/${workflowId}/states`,
      { headers: this.getHeaders() }
    );
  }

  getStateById(id: number): Observable<ApiResponse<WorkflowState>> {
    return this.http.get<ApiResponse<WorkflowState>>(
      `${this.apiUrl}/states/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createState(workflowId: number, state: WorkflowState): Observable<ApiResponse<WorkflowState>> {
    return this.http.post<ApiResponse<WorkflowState>>(
      `${this.apiUrl}/${workflowId}/states`,
      state,
      { headers: this.getHeaders() }
    );
  }

  updateState(id: number, state: WorkflowState): Observable<ApiResponse<WorkflowState>> {
    return this.http.put<ApiResponse<WorkflowState>>(
      `${this.apiUrl}/states/${id}`,
      state,
      { headers: this.getHeaders() }
    );
  }

  deleteState(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/states/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ==================== Workflow Transition APIs ====================

  getWorkflowTransitions(workflowId: number): Observable<ApiResponse<WorkflowTransition[]>> {
    return this.http.get<ApiResponse<WorkflowTransition[]>>(
      `${this.apiUrl}/${workflowId}/transitions`,
      { headers: this.getHeaders() }
    );
  }

  getAllWorkflowTransitions(workflowId: number): Observable<ApiResponse<WorkflowTransition[]>> {
    return this.http.get<ApiResponse<WorkflowTransition[]>>(
      `${this.apiUrl}/${workflowId}/transitions/all`,
      { headers: this.getHeaders() }
    );
  }

  getTransitionById(id: number): Observable<ApiResponse<WorkflowTransition>> {
    return this.http.get<ApiResponse<WorkflowTransition>>(
      `${this.apiUrl}/transitions/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createTransition(workflowId: number, transition: WorkflowTransition): Observable<ApiResponse<WorkflowTransition>> {
    return this.http.post<ApiResponse<WorkflowTransition>>(
      `${this.apiUrl}/${workflowId}/transitions`,
      transition,
      { headers: this.getHeaders() }
    );
  }

  updateTransition(id: number, transition: WorkflowTransition): Observable<ApiResponse<WorkflowTransition>> {
    return this.http.put<ApiResponse<WorkflowTransition>>(
      `${this.apiUrl}/transitions/${id}`,
      transition,
      { headers: this.getHeaders() }
    );
  }

  deleteTransition(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/transitions/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ==================== Workflow Permission APIs ====================

  getTransitionPermissions(transitionId: number): Observable<ApiResponse<WorkflowPermission[]>> {
    return this.http.get<ApiResponse<WorkflowPermission[]>>(
      `${this.apiUrl}/transitions/${transitionId}/permissions`,
      { headers: this.getHeaders() }
    );
  }

  getPermissionById(id: number): Observable<ApiResponse<WorkflowPermission>> {
    return this.http.get<ApiResponse<WorkflowPermission>>(
      `${this.apiUrl}/permissions/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createPermission(transitionId: number, permission: WorkflowPermission): Observable<ApiResponse<WorkflowPermission>> {
    return this.http.post<ApiResponse<WorkflowPermission>>(
      `${this.apiUrl}/transitions/${transitionId}/permissions`,
      permission,
      { headers: this.getHeaders() }
    );
  }

  updatePermission(id: number, permission: WorkflowPermission): Observable<ApiResponse<WorkflowPermission>> {
    return this.http.put<ApiResponse<WorkflowPermission>>(
      `${this.apiUrl}/permissions/${id}`,
      permission,
      { headers: this.getHeaders() }
    );
  }

  deletePermission(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/permissions/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
