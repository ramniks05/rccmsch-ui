import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  timestamp?: string;
  data: T;
}

// Case DTO
export interface CaseDTO {
  id: number;
  caseNumber: string;
  caseTypeId: number;
  caseTypeName: string;
  caseTypeCode: string;
  caseNatureId: number;
  caseNatureName: string;
  caseNatureCode: string;
  applicantId: number;
  applicantName: string;
  applicantMobile: string;
  applicantEmail?: string;
  subject: string;
  description?: string;
  status: string;
  statusName?: string;
  priority: string;
  applicationDate: string;
  resolvedDate?: string;
  remarks?: string;
  caseData?: string; // JSON string
  currentStateCode: string;
  currentStateName: string;
  assignedToOfficerId?: number;
  assignedToOfficerName?: string;
  assignedToRole?: string;
  assignedToUnitId?: number;
  assignedToUnitName?: string;
  workflowInstanceId?: number;
  workflowCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Workflow Transition DTO
export interface WorkflowTransitionDTO {
  id: number;
  transitionCode: string;
  transitionName: string;
  fromStateCode: string;
  toStateCode: string;
  requiresComment: boolean;
  description?: string;
  checklist?: {
    transitionCode: string;
    transitionName: string;
    canExecute: boolean;
    conditions: Array<{
      type: string;
      moduleType?: string;
      label: string;
      required: boolean;
      passed: boolean;
      message: string;
    }>;
  };
  formSchema?: {
    caseNatureId: number;
    caseNatureCode: string;
    moduleType: string;
    fields: any[];
    totalFields: number;
  };
}

// Execute Transition DTO
export interface ExecuteTransitionDTO {
  caseId?: number;
  transitionCode: string;
  comments?: string;
}

// Workflow History
export interface WorkflowHistory {
  id: number;
  caseId: number;
  transitionCode: string;
  transitionName: string;
  fromStateCode: string;
  toStateCode: string;
  performedByOfficerId: number;
  performedByOfficerName: string;
  performedByRole: string;
  performedAt: string;
  comments?: string;
}

/** Dashboard: single action-required item for officer */
export interface OfficerActionRequiredItem {
  caseId: number;
  caseNumber: string;
  subject: string;
  currentStateCode: string;
  currentStateName: string;
  availableTransitions: { code: string; label: string }[];
}

export interface OfficerActionsRequiredData {
  totalCount: number;
  items: OfficerActionRequiredItem[];
}

export interface OfficerActionType {
  code: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfficerCaseService {
  private apiUrl = `${environment.apiUrl}/cases`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken'); // Officers use adminToken
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  /**
   * Get cases assigned to current officer
   * GET /api/cases/my-cases
   * @param transitionCode Optional – filter to cases where this transition is available
   */
  getMyCases(transitionCode?: string): Observable<ApiResponse<CaseDTO[]>> {
    let url = `${this.apiUrl}/my-cases`;
    if (transitionCode) {
      url += `?transitionCode=${encodeURIComponent(transitionCode)}`;
    }
    return this.http.get<ApiResponse<CaseDTO[]>>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching my cases:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /api/cases/my-cases/action-types
   * List of action types (transition code + label) present in officer's caseload (for filter dropdown).
   */
  getMyCasesActionTypes(): Observable<ApiResponse<OfficerActionType[]>> {
    return this.http.get<ApiResponse<OfficerActionType[]>>(
      `${this.apiUrl}/my-cases/action-types`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error fetching action types:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * GET /api/cases/dashboard/actions-required
   * Dashboard: cases requiring officer action (have at least one available transition).
   */
  getOfficerActionsRequired(limit?: number): Observable<ApiResponse<OfficerActionsRequiredData>> {
    let url = `${this.apiUrl}/dashboard/actions-required`;
    if (limit != null && limit > 0) {
      url += `?limit=${limit}`;
    }
    return this.http.get<ApiResponse<OfficerActionsRequiredData>>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching officer actions required:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get case details by ID
   * GET /api/cases/{caseId}
   */
  getCaseById(caseId: number): Observable<ApiResponse<CaseDTO>> {
    return this.http.get<ApiResponse<CaseDTO>>(
      `${this.apiUrl}/${caseId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get available workflow transitions for a case
   * GET /api/cases/{caseId}/transitions
   */
  getAvailableTransitions(caseId: number): Observable<ApiResponse<WorkflowTransitionDTO[]>> {
    return this.http.get<ApiResponse<WorkflowTransitionDTO[]>>(
      `${this.apiUrl}/${caseId}/transitions`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching transitions for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Execute a workflow transition
   * POST /api/cases/{caseId}/transitions/execute
   */
  executeTransition(caseId: number, request: ExecuteTransitionDTO): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/transitions/execute`,
      request,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error executing transition for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get workflow history for a case
   * GET /api/cases/{caseId}/history
   */
  getWorkflowHistory(caseId: number): Observable<ApiResponse<WorkflowHistory[]>> {
    return this.http.get<ApiResponse<WorkflowHistory[]>>(
      `${this.apiUrl}/${caseId}/history`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching workflow history for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  // ==================== Module Forms APIs ====================

  /**
   * Get form schema for a case and module type
   * GET /api/cases/{caseId}/module-forms/{moduleType}
   */
  getModuleFormSchema(caseId: number, moduleType: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/module-forms/${moduleType}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching module form schema for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get module form schema and existing data (combined)
   * GET /api/cases/{caseId}/module-forms/{moduleType}/data
   */
  getModuleFormWithData(caseId: number, moduleType: string): Observable<ApiResponse<{
    schema: any;
    formData: any;
    hasExistingData: boolean;
  }>> {
    return this.http.get<ApiResponse<{
      schema: any;
      formData: any;
      hasExistingData: boolean;
    }>>(
      `${this.apiUrl}/${caseId}/module-forms/${moduleType}/data`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching module form data for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Submit module form data
   * POST /api/cases/{caseId}/module-forms/{moduleType}/submit
   */
  submitModuleForm(caseId: number, moduleType: string, formData: any, remarks?: string): Observable<ApiResponse<any>> {
    const payload = {
      formData: typeof formData === 'string' ? formData : JSON.stringify(formData),
      remarks
    };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/module-forms/${moduleType}/submit`,
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error submitting module form for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get submitted module form data
   * GET /api/cases/{caseId}/module-forms/{moduleType}/data
   */
  getSubmittedModuleFormData(caseId: number, moduleType: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/module-forms/${moduleType}/data`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching submitted module form data for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  // ==================== Documents APIs ====================

  /**
   * Get active template for a case and document type
   * GET /api/cases/{caseId}/documents/{moduleType}/template
   */
  getDocumentTemplate(caseId: number, moduleType: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${moduleType}/template`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching document template for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create or update document (use for sign by sending status: 'SIGNED').
   * POST /api/cases/{caseId}/documents/{moduleType}
   * Body: CreateCaseDocumentDTO { templateId?, contentHtml (required), contentData?, status: 'DRAFT'|'FINAL'|'SIGNED', remarks? }
   */
  saveDocument(caseId: number, moduleType: string, documentData: {
    templateId?: number;
    contentHtml: string;
    contentData?: string;
    status: 'DRAFT' | 'FINAL' | 'SIGNED';
    remarks?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${moduleType}`,
      documentData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error saving document for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get saved document (list or single by module type)
   * GET /api/cases/{caseId}/documents/{moduleType}
   */
  getSavedDocument(caseId: number, moduleType: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${moduleType}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching saved document for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get latest document for a module type (for edit/sign flow).
   * GET /api/cases/{caseId}/documents/{moduleType}/latest
   * Response: CaseDocumentDTO (id, caseId, moduleType, contentHtml, contentData, status, signedByOfficerId?, signedAt?, ...)
   */
  getLatestDocument(caseId: number, moduleType: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${moduleType}/latest`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching latest document for case ${caseId}, ${moduleType}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update specific document (use for sign by sending status: 'SIGNED').
   * PUT /api/cases/{caseId}/documents/{moduleType}/{documentId}
   * Body: { contentHtml?, contentData?, status?: 'DRAFT'|'FINAL'|'SIGNED', remarks? }
   */
  updateDocument(caseId: number, moduleType: string, documentId: number, documentData: {
    contentHtml?: string;
    contentData?: string;
    status?: 'DRAFT' | 'FINAL' | 'SIGNED';
    remarks?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${moduleType}/${documentId}`,
      documentData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error updating document for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all documents for a case
   * GET /api/cases/{caseId}/documents
   */
  getAllDocuments(caseId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/${caseId}/documents`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching all documents for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }
}
