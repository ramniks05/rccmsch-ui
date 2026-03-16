import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { WorkflowCondition, WorkflowDataKeysResponse } from '../../core/models/workflow-condition.types';

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
  /** Reference to role master (officer role) */
  roleId?: number;
  roleCode: string;
  unitLevel?: 'STATE' | 'DISTRICT' | 'SUB_DIVISION' | 'CIRCLE' | null;
  canInitiate: boolean;
  canApprove: boolean;
  hierarchyRule?: string;
  conditions?: string;
  isActive?: boolean;
  /** Form IDs (admin-created forms) this permission allows */
  allowedFormIds?: number[];
  /** Document IDs (admin-created document templates) this permission allows */
  allowedDocumentIds?: number[];
  /** Allow draft for documents (legacy; prefer allowedDocumentStages) */
  allowDocumentDraft?: boolean;
  /** Allow save & sign for documents (legacy; prefer allowedDocumentStages) */
  allowDocumentSaveAndSign?: boolean;
  /** Per-document stages this permission allows (from API stages/stageLabels) */
  allowedDocumentStages?: { documentId: number; stages: string[] }[];
}

/** One document stage for display (value from API, label for UI) */
export interface DocumentStageOption {
  value: string;
  label: string;
}

/** Option for permission form dropdown/checkboxes – from admin-created forms */
export interface PermissionFormOption {
  id: number;
  name: string;
  code?: string;
}

/** Option for permission document – from admin-created document templates; stages per document */
export interface PermissionDocumentOption {
  id: number;
  name: string;
  moduleType?: string;
  /** Stage codes e.g. ["DRAFT", "SAVE_AND_SIGN"] */
  stages?: string[];
  /** Display labels e.g. ["Draft", "Save & Sign"] */
  stageLabels?: string[];
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

  /**
   * GET /api/admin/workflow/permission-forms
   * Returns admin-created forms for the Forms section (id, name, code).
   */
  getPermissionForms(): Observable<ApiResponse<PermissionFormOption[]>> {
    return this.http.get<ApiResponse<PermissionFormOption[]>>(
      `${this.apiUrl}/permission-forms`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(() => of({ success: false, message: 'Failed to load forms', data: [] }))
    );
  }

  /**
   * GET /api/admin/workflow/permission-documents
   * Returns admin-created document templates for the Documents section (id, name, moduleType).
   */
  getPermissionDocuments(): Observable<ApiResponse<PermissionDocumentOption[]>> {
    return this.http.get<ApiResponse<PermissionDocumentOption[]>>(
      `${this.apiUrl}/permission-documents`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(() => of({ success: false, message: 'Failed to load documents', data: [] }))
    );
  }

  // ==================== Transition Conditions (Admin) ====================

  /**
   * Get configured conditions for a transition (admin configuration UI).
   * GET /api/admin/workflow/transitions/{transitionId}/conditions
   */
  getTransitionConditions(transitionId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/transitions/${transitionId}/conditions`,
      { headers: this.getHeaders() }
    );
  }

  // ==================== Workflow Data Keys (Single Source of Truth) ====================

  private dataKeysCache: WorkflowDataKeysResponse | null = null;

  /**
   * GET /api/admin/workflow/data-keys
   * Returns valid workflow data keys for workflowDataFieldsRequired.
   * Use keysWithBinding to bind each key to form (module-forms) or document (documents).
   */
  getWorkflowDataKeys(): Observable<ApiResponse<WorkflowDataKeysResponse>> {
    return this.http.get<ApiResponse<WorkflowDataKeysResponse>>(
      `${this.apiUrl}/data-keys`,
      { headers: this.getHeaders() }
    ).pipe(
      map(res => {
        if (res.success && res.data) {
          this.dataKeysCache = res.data;
        }
        return res;
      }),
      catchError(() => of({ success: false, message: 'Failed to load workflow data keys', data: null! }))
    );
  }

  /**
   * Cached data keys (set after getWorkflowDataKeys() succeeds). Use for labels and binding.
   */
  getCachedWorkflowDataKeys(): WorkflowDataKeysResponse | null {
    return this.dataKeysCache;
  }

  /**
   * Resolve a workflow data key to label (from cache or API). For use in view/checklist.
   */
  getWorkflowDataKeyLabel(key: string): string {
    if (this.dataKeysCache?.keysWithLabels?.[key]) {
      return this.dataKeysCache.keysWithLabels[key];
    }
    const binding = this.dataKeysCache?.keysWithBinding?.find(b => b.key === key);
    return binding?.label ?? key;
  }

  /**
   * Get action info for a condition key: form (module-forms) or document (documents) and moduleType.
   */
  getActionForConditionKey(conditionKey: string, caseId: number): { type: 'form' | 'document' | 'special'; label: string; moduleType?: string } {
    const binding = this.dataKeysCache?.keysWithBinding?.find(b => b.key === conditionKey);
    if (!binding) {
      return { type: 'special', label: this.getWorkflowDataKeyLabel(conditionKey) };
    }
    if (binding.kind === 'FORM') {
      return { type: 'form', label: binding.label, moduleType: binding.moduleType };
    }
    if (binding.kind === 'DOCUMENT') {
      return { type: 'document', label: binding.label, moduleType: binding.moduleType };
    }
    return { type: 'special', label: binding.label };
  }

  // ==================== Workflow Status Hints (Meaningful State Codes) ====================

  /**
   * GET /api/admin/workflow/status-hints
   * Returns full reporting state list, DB state codes, hearing-scheduled codes, and hints.
   * Use on Add/Edit workflow state so user can choose from list or type a new code.
   */
  getWorkflowStatusHints(): Observable<ApiResponse<WorkflowStatusHints>> {
    return this.http.get<ApiResponse<WorkflowStatusHints>>(
      `${this.apiUrl}/status-hints`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(() =>
        of({
          success: false,
          message: 'Failed to load status hints',
          data: {
            stateCodesForChoice: [],
            stateCodesWithLabels: [],
            reportingStatesWithLabels: {},
            reportingStatesList: [],
            hearingScheduledStateCodes: [],
            hints: {
              stateCode: 'Choose a state code from the list (for reporting) or type a new code. Use uppercase and underscores.',
              hearingScheduled: 'Use one of the configured state_code values so cases count in Dashboard "Hearing scheduled". Add new codes to app.dashboard.hearing-scheduled-statuses in application.yml.',
              finalState: 'Set is_final_state = true on states that mean case closed/disposed. Those cases count as Disposed in officer stats and dashboard.'
            }
          }
        })
      )
    );
  }
}

/** One state code + label for dropdown/list */
export interface StateCodeWithLabel {
  stateCode: string;
  stateName: string;
}

/** Response from GET /api/admin/workflow/status-hints */
export interface WorkflowStatusHints {
  /** State codes already in use in workflows (from DB) – for "reuse existing" */
  stateCodesForChoice?: string[];
  /** Same as above with display labels */
  stateCodesWithLabels?: StateCodeWithLabel[];
  /** All possible reporting/dashboard state codes with labels – main dropdown source */
  reportingStatesWithLabels?: Record<string, string>;
  /** Same as list of { stateCode, stateName } for UI */
  reportingStatesList?: StateCodeWithLabel[];
  /** Codes that count as "Hearing scheduled" on dashboard (from config) */
  hearingScheduledStateCodes?: string[];
  /** Short texts for state code field and final-state checkbox */
  hints?: {
    stateCode?: string;
    hearingScheduled?: string;
    finalState?: string;
  };
}
