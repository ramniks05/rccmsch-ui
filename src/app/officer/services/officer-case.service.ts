import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/** Form or document detail returned by action-forms / action-documents APIs (fetch from DB for display). */
export interface ActionFormDetail {
  id: number;
  name: string;
  moduleType: string;
}
export interface ActionDocumentDetail {
  id: number;
  name: string;
  moduleType: string;
}
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  timestamp?: string;
  data: T;
}

// Case DTO (matches backend case detail; role is from role master via assignedToRoleId)
export interface CaseDTO {
  id: number;
  caseNumber: string;
  caseTypeId: number;
  caseTypeName: string;
  caseTypeCode: string;
  caseNatureId: number;
  caseNatureName: string;
  caseNatureCode: string;
  courtId?: number;
  courtName?: string;
  courtCode?: string;
  applicantId: number;
  applicantName: string;
  applicantMobile: string;
  applicantEmail?: string;
  unitId?: number;
  unitName?: string;
  unitCode?: string;
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
  currentStateId?: number;
  assignedToOfficerId?: number;
  assignedToOfficerName?: string;
  /** Role code for display (from role master) */
  assignedToRole?: string;
  /** Role master id – use this for any role reference, not role code comparison */
  assignedToRoleId?: number;
  assignedToUnitId?: number;
  assignedToUnitName?: string;
  workflowInstanceId?: number;
  workflowCode?: string;
  /** Case form data with labels for display (from backend) */
  formDataWithLabels?: Array<{ fieldName: string; fieldLabel: string; fieldGroup?: string; groupLabel?: string; value: string | number | null; displayOrder?: number; groupDisplayOrder?: number }>;
  /** Role(s) with which the case is pending (from available transitions / permissions); for highlighted display */
  pendingWithRoleNames?: string[];
  /** Pre-formatted string for "Pending with X" display, e.g. "Dealing Assistant" or "Reader, Presiding Officer" */
  pendingWithRolesDisplay?: string;
  /** Next scheduled hearing date (YYYY-MM-DD) from case details API */
  nextHearingDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Workflow Transition DTO (role from transition permission – who can execute this transition)
export interface WorkflowTransitionDTO {
  id: number;
  transitionCode: string;
  transitionName: string;
  fromStateCode: string;
  toStateCode: string;
  requiresComment: boolean;
  description?: string;
  /** Role that can execute this transition (from workflow permission); for "Pending with [Role]" display */
  allowedRoleId?: number;
  allowedRoleName?: string;
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
    blockingReasons?: string[];
    /** Form IDs this transition allows / requires (used in API payloads) */
    allowedFormIds?: number[] | null;
    /** IDs of document templates this action is tied to (used in API payloads) */
    allowedDocumentIds?: number[] | null;
    /** Optional: form id → display name (from backend for readable condition labels) */
    allowedForms?: Array<{ id: number; name: string }> | null;
    /** Optional: document id → display name (from backend for readable condition labels) */
    allowedDocuments?: Array<{ id: number; name: string }> | null;
    /** Whether this action allows drafting the document */
    allowDocumentDraft?: boolean | null;
    /** Whether this action allows saving & signing the document */
    allowDocumentSaveAndSign?: boolean | null;
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
   * Supports response shape: data as CaseDTO or data: { caseInfo: CaseDTO, history?, documents? }
   */
  getCaseById(caseId: number): Observable<ApiResponse<CaseDTO>> {
    return this.http.get<ApiResponse<CaseDTO | { caseInfo: CaseDTO; history?: any[]; documents?: any[] }>>(
      `${this.apiUrl}/${caseId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map((response: any) => {
        if (!response?.success || !response?.data) return response;
        const data = response.data as any;
        let caseObj: any;
        if (data.caseInfo) {
          const caseInfo = data.caseInfo;
          caseObj = {
            ...caseInfo,
            pendingWithRoleNames: caseInfo.pendingWithRoleNames ?? caseInfo.pending_with_role_names ?? data.pendingWithRoleNames ?? data.pending_with_role_names,
            pendingWithRolesDisplay: caseInfo.pendingWithRolesDisplay ?? caseInfo.pending_with_roles_display ?? data.pendingWithRolesDisplay ?? data.pending_with_roles_display,
            nextHearingDate: caseInfo.nextHearingDate ?? caseInfo.next_hearing_date ?? data.nextHearingDate ?? data.next_hearing_date
          };
        } else {
          caseObj = {
            ...data,
            pendingWithRoleNames: data.pendingWithRoleNames ?? data.pending_with_role_names,
            pendingWithRolesDisplay: data.pendingWithRolesDisplay ?? data.pending_with_roles_display,
            nextHearingDate: data.nextHearingDate ?? data.next_hearing_date
          };
        }
        return { ...response, data: caseObj };
      }),
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
  // Use these for getting form schema and form schema + data (canonical endpoints).

  /**
   * Retrieve form schema only.
   * GET /api/cases/{caseId}/module-forms/{moduleType}
   * Response: ModuleFormSchemaDTO in data.
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
   * Get latest module form submission.
   * GET /api/cases/{caseId}/module-forms/{moduleType}/latest
   * Response: ApiResponse<ModuleFormSubmissionDTO> (latest submission or null).
   */
  getModuleFormLatest(caseId: number, moduleType: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/module-forms/${moduleType}/latest`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching latest module form for case ${caseId}, ${moduleType}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Retrieve form schema + existing data (use this for getting form and schema).
   * GET /api/cases/{caseId}/module-forms/{moduleType}/data
   * Response: ModuleFormWithDataDTO in data (schema, formData, hasExistingData).
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
   * Get module form schema + data by form ID (for action forms – fetches the correct form for formId 5 vs 7 etc).
   * GET /api/cases/{caseId}/module-forms/by-form/{formId}
   */
  getModuleFormWithDataByFormId(caseId: number, formId: number): Observable<ApiResponse<{
    schema: any;
    formData: any;
    hasExistingData: boolean;
  }>> {
    return this.http.get<ApiResponse<{
      schema: any;
      formData: any;
      hasExistingData: boolean;
    }>>(
      `${this.apiUrl}/${caseId}/module-forms/by-form/${formId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching module form by formId ${formId} for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Submit module form data
   * POST /api/cases/{caseId}/module-forms/{moduleType}/submit
   * For FIELD_REPORT module, formData should be an object (not stringified)
   * For other modules, formData can be stringified if needed
   */
  submitModuleForm(caseId: number, moduleType: string, formData: any, remarks?: string): Observable<ApiResponse<any>> {
    // Attendance is persisted in dedicated table via attendance endpoints.
    if (moduleType === 'ATTENDANCE') {
      let normalizedFormData: any = formData;
      if (typeof normalizedFormData === 'string') {
        try {
          normalizedFormData = JSON.parse(normalizedFormData);
        } catch {
          // Keep raw string if it's not JSON.
        }
      }

      let latestHearingSubmissionId: number | null = null;
      let cleanedFormData: any = normalizedFormData;

      if (normalizedFormData && typeof normalizedFormData === 'object' && !Array.isArray(normalizedFormData)) {
        const candidate =
          (normalizedFormData as any).latestHearingSubmissionId ??
          (normalizedFormData as any).hearingSubmissionId;
        if (candidate != null && !isNaN(Number(candidate))) {
          latestHearingSubmissionId = Number(candidate);
        }

        // Keep formData clean; send hearing submission id at top-level for backend DTO.
        const { latestHearingSubmissionId: _a, hearingSubmissionId: _b, ...rest } = normalizedFormData as any;
        cleanedFormData = rest;
      }

      const attendancePayload: any = {
        formData: typeof cleanedFormData === 'string' ? cleanedFormData : JSON.stringify(cleanedFormData),
        remarks
      };
      if (latestHearingSubmissionId != null) {
        attendancePayload.latestHearingSubmissionId = latestHearingSubmissionId;
      }

      return this.http.post<ApiResponse<any>>(
        `${this.apiUrl}/${caseId}/attendance/submit`,
        attendancePayload,
        { headers: this.getAuthHeaders() }
      ).pipe(
        catchError(error => {
          console.error(`Error submitting attendance for case ${caseId}:`, error);
          return throwError(() => error);
        })
      );
    }

    // For FIELD_REPORT, send formData as object; for others, stringify if it's not already a string
    const payload: any = {
      formData: moduleType === 'FIELD_REPORT' 
        ? (typeof formData === 'string' ? JSON.parse(formData) : formData)
        : (typeof formData === 'string' ? formData : JSON.stringify(formData)),
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
   * Submit module form by form ID (for action forms – submits to the correct form 5 vs 7 etc).
   * POST /api/cases/{caseId}/module-forms/{formId}/submit
   */
  submitModuleFormByFormId(caseId: number, formId: number, formData: any, remarks?: string): Observable<ApiResponse<any>> {
    const payload: any = {
      formData: typeof formData === 'string' ? formData : JSON.stringify(formData),
      remarks
    };
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/module-forms/${formId}/submit`,
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error submitting module form ${formId} for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Submit module form data with files (multipart/form-data)
   * POST /api/cases/{caseId}/module-forms/{moduleType}/submit
   * 
   * FormData structure:
   * - Regular fields: fieldName = value
   * - fileMetadata: JSON string with file metadata
   * - files: File objects (multiple)
   * - fileInfo_0, fileInfo_1, ...: JSON strings with file info (fieldName, fileId, displayName, originalFileName)
   * - remarks: Optional remarks
   */
  submitModuleFormWithFiles(caseId: number, moduleType: string, formData: FormData): Observable<ApiResponse<any>> {
    // Create headers without Content-Type (browser will set it automatically with boundary)
    const token = localStorage.getItem('adminToken');
    const headers: { [key: string]: string } = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Note: Do NOT set Content-Type header - browser will set it automatically with boundary

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/module-forms/${moduleType}/submit`,
      formData,
      { headers: new HttpHeaders(headers) }
    ).pipe(
      catchError(error => {
        console.error(`Error submitting module form with files for case ${caseId}:`, error);
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

  /**
   * Upload file for a case (multipart/form-data)
   * POST /api/cases/{caseId}/documents/upload
   * 
   * This endpoint uploads a file and returns file metadata including:
   * - fileId: Unique identifier for the uploaded file
   * - fileName: Original filename
   * - fileUrl: Server path where file is stored (relative or absolute)
   * - fileSize: File size in bytes
   * - fileType: MIME type of the file
   */
  uploadFile(caseId: number, file: File): Observable<ApiResponse<{
    fileId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Create headers without Content-Type (browser will set it automatically with boundary for multipart/form-data)
    const token = localStorage.getItem('adminToken');
    const headers: { [key: string]: string } = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Note: Do NOT set Content-Type header - browser will set it automatically with boundary
    // Setting it manually will break multipart/form-data
    
    return this.http.post<ApiResponse<{
      fileId: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      fileType: string;
    }>>(
      `${this.apiUrl}/${caseId}/documents/upload`,
      formData,
      { headers: new HttpHeaders(headers) }
    ).pipe(
      catchError(error => {
        console.error(`Error uploading file for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Form/document details are derived from transition checklist (allowedFormIds, allowedDocumentIds).
   * No separate action-forms or action-documents endpoint is called; use IDs with display names "Form {id}" / "Document {id}".
   */
  getActionFormDetails(_caseId: number, formIds: number[]): Observable<ApiResponse<ActionFormDetail[]>> {
    if (!formIds?.length) return of({ success: true, message: '', data: [] });
    const data: ActionFormDetail[] = formIds.map(id => ({ id, name: `Form ${id}`, moduleType: 'HEARING' }));
    return of({ success: true, message: '', data });
  }

  /**
   * Document details are derived from transition checklist (allowedDocumentIds).
   * No separate action-documents endpoint is called; use template ID with display name "Document {id}".
   */
  getActionDocumentDetails(_caseId: number, documentIds: number[]): Observable<ApiResponse<ActionDocumentDetail[]>> {
    if (!documentIds?.length) return of({ success: true, message: '', data: [] });
    const data: ActionDocumentDetail[] = documentIds.map(id => ({ id, name: `Document ${id}`, moduleType: '' }));
    return of({ success: true, message: '', data });
  }

  // ==================== Documents APIs (by template ID) ====================
  // RCCMS: All officer document endpoints use template ID (from GET /api/admin/workflow/permission-documents).
  // Get template: GET .../documents/{templateId}/template → DocumentTemplateDTO
  // Get latest:   GET .../documents/{templateId} or .../latest → CaseDocumentDTO
  // Create/update: POST .../documents/{templateId} (CreateCaseDocumentDTO), PUT .../documents/{templateId}/{documentId}

  /**
   * Get document template by ID.
   * GET /api/cases/{caseId}/documents/{templateId}/template
   * Response: ApiResponse<DocumentTemplateDTO>
   */
  getDocumentTemplate(caseId: number, templateId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${templateId}/template`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching document template for case ${caseId}, template ${templateId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get latest document for case + template (for edit/sign flow).
   * GET /api/cases/{caseId}/documents/{templateId}
   * Response: ApiResponse<CaseDocumentDTO>
   */
  getLatestDocument(caseId: number, templateId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${templateId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching latest document for case ${caseId}, template ${templateId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create or update document (save draft / save and sign).
   * POST /api/cases/{caseId}/documents/{templateId}
   * Body: CreateCaseDocumentDTO { contentHtml (required), contentData?, status?: DRAFT|FINAL|SIGNED, remarks? }
   * Response: ApiResponse<CaseDocumentDTO>
   */
  saveDocument(caseId: number, templateId: number, documentData: {
    contentHtml: string;
    contentData?: string;
    status?: 'DRAFT' | 'FINAL' | 'SIGNED';
    remarks?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${templateId}`,
      documentData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error saving document for case ${caseId}, template ${templateId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update existing document by ID.
   * PUT /api/cases/{caseId}/documents/{templateId}/{documentId}
   * Body: CreateCaseDocumentDTO (same as save)
   * Response: ApiResponse<CaseDocumentDTO>
   */
  updateDocument(caseId: number, templateId: number, documentId: number, documentData: {
    contentHtml?: string;
    contentData?: string;
    status?: 'DRAFT' | 'FINAL' | 'SIGNED';
    remarks?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/documents/${templateId}/${documentId}`,
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

  /**
   * Get parties for a case
   * GET /api/cases/{caseId}/parties
   */
  getParties(caseId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/parties`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching parties for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get latest attendance submission
   * GET /api/cases/{caseId}/attendance/latest
   */
  getLatestAttendance(caseId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${caseId}/attendance/latest`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error fetching latest attendance for case ${caseId}:`, error);
        return throwError(() => error);
      })
    );
  }
}
