import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timeout, TimeoutError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

export interface CaseType {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

/** Form field as returned by form-schema API (data.fields[] or data.groups[].fields[]) */
export interface FormField {
  id: number;
  caseTypeId?: number;
  caseTypeName?: string;
  caseTypeCode?: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  validationRules?: string;
  displayOrder: number;
  isActive?: boolean;
  defaultValue?: string;
  fieldOptions?: string;
  placeholder?: string;
  helpText?: string;
  fieldGroup?: string;
  groupLabel?: string;
  groupDisplayOrder?: number;
  dataSource?: string;
  dependsOnField?: string;
  dependencyCondition?: string;
  conditionalLogic?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Group as returned by form-schema API (data.groups[]) */
export interface FormFieldGroup {
  groupId?: number;
  groupCode: string;
  groupLabel: string;
  description?: string;
  displayOrder: number;
  fields: FormField[];
  fieldCount?: number;
}

/** Form schema payload (API response data) – matches GET form-schemas/case-types/{id} */
export interface FormSchema {
  caseTypeId: number;
  caseTypeName: string;
  caseTypeCode: string;
  totalFields?: number;
  fields?: FormField[];
  groups?: FormFieldGroup[];
}

/** Wrapped API response: { success, message, data, timestamp } */
export interface FormSchemaApiResponse {
  success: boolean;
  message: string;
  data: FormSchema;
  timestamp?: string;
}

export interface CaseSubmissionRequest {
  applicantId: number; // ID of the citizen/applicant submitting the case
  caseNatureId: number; // Legal matter (MUTATION_GIFT_SALE, PARTITION, etc.)
  caseTypeId: number; // Filing type (NEW_FILE, APPEAL, REVISION, etc.)
  unitId: number;
  courtId?: number; // Court where case is filed
  originalOrderLevel?: string; // For appeals - level of original order
  subject: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  applicationDate?: string;
  remarks?: string;
  caseData: string; // JSON string
}

export interface Case {
  id: number;
  caseNumber: string;
  caseNatureId: number;
  caseNatureName?: string;
  caseNatureCode?: string;
  caseTypeId: number;
  caseTypeName?: string;
  caseTypeCode?: string;
  courtId?: number;
  courtName?: string;
  courtCode?: string;
  applicantId: number;
  unitId: number;
  status: string;
  subject: string;
  description?: string;
  priority?: string;
  caseData?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaseHistory {
  id: number;
  caseId: number;
  fromStateId?: number;
  toStateId?: number;
  fromState?: { stateCode: string; stateName: string };
  toState?: { stateCode: string; stateName: string };
  performedByRole?: string;
  comments?: string;
  performedAt: string;
}

export interface ResubmitRequest {
  caseData: string; // JSON string
  remarks?: string;
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
export class CitizenCaseService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const userData = this.authService.getUserData();
    const userId = userData?.userId;

    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (userId) {
      headers['X-User-Id'] = userId.toString();
    }

    return new HttpHeaders(headers);
  }

  // ==================== Case Natures API (legal matters: MUTATION_GIFT_SALE, PARTITION) ====================

  /**
   * GET /api/public/case-natures — Case Natures API (per documentation)
   * Returns active case natures (legal matters).
   * Authentication: Not required (public endpoint)
   */
  getActiveCaseNatures(): Observable<ApiResponse<CaseType[]>> {
    return this.http.get<ApiResponse<CaseType[]>>(
      `${this.apiUrl}/public/case-natures`
    );
  }

  // ==================== Case Types API (filing types: NEW_FILE, APPEAL, REVISION) ====================

  /**
   * GET /api/public/case-types?caseNatureId={caseNatureId} — Case Types API (per documentation)
   * Returns case types (filing types) for a given case nature.
   * Authentication: Not required (public endpoint)
   */
  getCaseTypesByCaseNature(caseNatureId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/public/case-types?caseNatureId=${caseNatureId}`
    );
  }

  // ==================== Courts API ====================

  /**
   * GET /api/public/courts/available?caseTypeId=&unitId= — Courts API
   */
  getAvailableCourts(caseTypeId: number, unitId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/public/courts/available?caseTypeId=${caseTypeId}&unitId=${unitId}`
    );
  }

  // ==================== Form Schema API (by case type) ====================

  /**
   * GET form schema for case type. Tries public first, then admin.
   * Returns fields + groups (pre-grouped). Form schemas linked to Case Type.
   */
  getFormSchema(caseTypeId: number): Observable<ApiResponse<FormSchema>> {
    const publicUrl = `${this.apiUrl}/public/form-schemas/case-types/${caseTypeId}`;
    const adminUrl = `${this.apiUrl}/admin/form-schemas/case-types/${caseTypeId}`;
    
    console.log('Fetching form schema from:', publicUrl);
    console.log('API URL base:', this.apiUrl);
    
    // Try public endpoint first with timeout
    return this.http.get<ApiResponse<FormSchema>>(publicUrl).pipe(
      timeout(10000), // 10 second timeout (reduced)
      catchError((error) => {
        // Log the error type
        if (error instanceof TimeoutError) {
          console.error('Public endpoint TIMED OUT after 10 seconds');
        } else {
          console.warn('Public endpoint failed with status:', error?.status, 'Error:', error?.message || error);
        }
        
        // If public endpoint fails (404, timeout, etc.), try admin endpoint
        console.log('Trying admin endpoint:', adminUrl);
        return this.http.get<ApiResponse<FormSchema>>(adminUrl).pipe(
          timeout(10000),
          catchError((adminError) => {
            // Both endpoints failed - throw error
            if (adminError instanceof TimeoutError) {
              console.error('Admin endpoint also TIMED OUT after 10 seconds');
            } else {
              console.error('Admin endpoint failed with status:', adminError?.status);
            }
            console.error('Both form schema endpoints failed');
            return throwError(() => adminError || error);
          })
        );
      })
    );
  }

  // ==================== Form Data Sources API (for dynamic dropdowns) ====================

  /**
   * GET /api/public/form-data-sources/{dataSource}?{params} — Form Data Sources API
   * Get dropdown options for form fields with data sources
   * Authentication: Not required (public endpoint)
   * 
   * @param dataSource One of: admin-units, courts, acts, case-natures, case-types
   * @param params Query parameters (varies by data source)
   *   - For admin-units: level (DISTRICT, SUB_DIVISION, CIRCLE), parentId (optional)
   *   - For courts: courtLevel, unitId (optional)
   *   - For case-types: caseNatureId (optional)
   */
  getFormDataSource(dataSource: string, params?: Record<string, string | number>): Observable<ApiResponse<any[]>> {
    let url = `${this.apiUrl}/public/form-data-sources/${dataSource}`;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.http.get<ApiResponse<any[]>>(url);
  }

  // ==================== Form Validation API ====================

  /**
   * POST /api/admin/form-schemas/validate — Validate Form Data
   * Validate form data before submission (optional)
   * Authentication: Not required (public endpoint)
   */
  validateFormData(caseTypeId: number, formData: Record<string, any>): Observable<ApiResponse<{ isValid: boolean; errors: Record<string, string> }>> {
    return this.http.post<ApiResponse<{ isValid: boolean; errors: Record<string, string> }>>(
      `${this.apiUrl}/admin/form-schemas/validate`,
      { caseTypeId, formData }
    );
  }

  // ==================== Case APIs ====================

  /**
   * POST /api/citizen/cases — Submit a new case (per documentation)
   * Matches documentation: Citizen Cases API
   * Body: { caseTypeId, caseNatureId, courtId, unitId, subject, caseData, description }
   * Authentication: Required (JWT token - Citizen role)
   */
  submitCase(request: CaseSubmissionRequest): Observable<ApiResponse<Case>> {
    return this.http.post<ApiResponse<Case>>(
      `${this.apiUrl}/citizen/cases`,
      request,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get all cases for a citizen (applicant)
   */
  getCitizenCases(applicantId: number): Observable<ApiResponse<Case[]>> {
    return this.http.get<ApiResponse<Case[]>>(
      `${this.apiUrl}/cases/applicant/${applicantId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get case by ID
   */
  getCaseById(caseId: number): Observable<ApiResponse<Case>> {
    return this.http.get<ApiResponse<Case>>(
      `${this.apiUrl}/cases/${caseId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get workflow history for a case
   */
  getCaseHistory(caseId: number): Observable<ApiResponse<CaseHistory[]>> {
    return this.http.get<ApiResponse<CaseHistory[]>>(
      `${this.apiUrl}/cases/${caseId}/history`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Resubmit case after correction
   */
  resubmitCase(caseId: number, request: ResubmitRequest): Observable<ApiResponse<Case>> {
    return this.http.put<ApiResponse<Case>>(
      `${this.apiUrl}/citizen/cases/${caseId}/resubmit`,
      request,
      { headers: this.getHeaders() }
    );
  }

  // ==================== Administrative Units API (public) ====================

  /**
   * GET /api/admin-units/active — Administrative Units API
   */
  getActiveUnits(): Observable<ApiResponse<any[]>> {
    // Using public endpoint - no auth headers needed
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/admin-units/active`
    );
  }

  /**
   * @deprecated Use getActiveCaseNatures() instead. This method is kept for backward compatibility.
   */
  getActiveCaseTypes(): Observable<ApiResponse<CaseType[]>> {
    return this.getActiveCaseNatures();
  }
}
