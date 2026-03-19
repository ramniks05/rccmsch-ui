import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Module Types
 */
export type ModuleType = 'HEARING' | 'NOTICE' | 'ORDERSHEET' | 'JUDGEMENT' | 'FIELD_REPORT' | 'ASK_FIELD_REPORT';

/**
 * Field Types (includes REPEATABLE_SECTION and DYNAMIC_FILES for attendance/party lists and multi-file uploads)
 */
export type FieldType =
  | 'TEXT' | 'TEXTAREA' | 'RICH_TEXT' | 'NUMBER' | 'DATE' | 'DATETIME'
  | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'RADIO' | 'FILE'
  | 'REPEATABLE_SECTION'
  | 'DYNAMIC_FILES';

/**
 * Module Form Field
 */
export interface ModuleFormField {
  id?: number;
  caseNatureId: number;
  caseTypeId?: number; // Optional: for case type override
  moduleType: ModuleType;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
  defaultValue?: string;
  placeholder?: string;
  helpText?: string;
  validationRules?: string; // JSON string
  options?: string; // JSON string for select/radio options
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** For REPEATABLE_SECTION: JSON array of field definitions per row */
  itemSchema?: string | null;
  /** Show field only when condition matches (JSON: { showIf: {...} }) */
  conditionalLogic?: string | null;
  /** Field required when condition matches (JSON) */
  requiredCondition?: string | null;
  /** API-driven options for SELECT/RADIO (JSON: DataSourceConfig) */
  dataSource?: string | null;
  /** Parent field for cascading; when it changes, options are refetched */
  dependsOnField?: string | null;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

/**
 * Module Forms Service
 * Handles admin APIs for configuring module form fields per case nature
 */
@Injectable({
  providedIn: 'root'
})
export class ModuleFormsService {
  private apiUrl = `${environment.apiUrl}/admin/module-forms`;

  constructor(private http: HttpClient) {}

  /**
   * Get authentication headers with admin token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * List fields for a case nature and module type (with optional case type override)
   * GET /api/admin/module-forms/case-natures/{caseNatureId}/modules/{moduleType}/fields?caseTypeId=
   */
  getFieldsByCaseNatureAndModule(caseNatureId: number, moduleType: ModuleType, caseTypeId?: number): Observable<ApiResponse<ModuleFormField[]>> {
    // Return dummy data for ASK_FIELD_REPORT
    if (moduleType === 'ASK_FIELD_REPORT') {
      const dummyData: ApiResponse<ModuleFormField[]> = {
        success: true,
        message: 'Module form fields retrieved',
        data: [
          {
            id: 5,
            caseNatureId: caseNatureId,
            caseNatureCode: 'MUTATION_CASE',
            caseNatureName: 'Mutation Case',
            caseTypeId: caseTypeId || undefined,
            caseTypeCode: null,
            caseTypeName: null,
            moduleType: 'ASK_FIELD_REPORT',
            fieldName: 'hearingDate',
            fieldLabel: 'Hearing Date',
            fieldType: 'DATE',
            isRequired: true,
            validationRules: '',
            displayOrder: 1,
            isActive: true,
            defaultValue: '',
            placeholder: 'Select Hearing Date',
            helpText: '',
            dataSource: '',
            dependsOnField: '',
            conditionalLogic: '',
            createdAt: '2026-03-15T12:31:26.363343',
            updatedAt: '2026-03-15T12:31:26.363343'
          } as ModuleFormField,
          {
            id: 6,
            caseNatureId: caseNatureId,
            caseNatureCode: 'MUTATION_CASE',
            caseNatureName: 'Mutation Case',
            caseTypeId: caseTypeId || undefined,
            caseTypeCode: null,
            caseTypeName: null,
            moduleType: 'ASK_FIELD_REPORT',
            fieldName: 'remarks',
            fieldLabel: 'Remarks',
            fieldType: 'TEXT',
            isRequired: false,
            validationRules: '',
            displayOrder: 2,
            isActive: true,
            defaultValue: '',
            placeholder: 'Enter Remark',
            helpText: '',
            dataSource: '',
            dependsOnField: '',
            conditionalLogic: '',
            createdAt: '2026-03-15T12:32:08.336209',
            updatedAt: '2026-03-15T12:32:08.336209'
          } as ModuleFormField,
          {
            id: 7,
            caseNatureId: caseNatureId,
            caseNatureCode: 'MUTATION_CASE',
            caseNatureName: 'Mutation Case',
            caseTypeId: caseTypeId || undefined,
            caseTypeCode: null,
            caseTypeName: null,
            moduleType: 'ASK_FIELD_REPORT',
            fieldName: 'fieldOfficer',
            fieldLabel: 'Field Officer',
            fieldType: 'SELECT',
            isRequired: true,
            validationRules: '',
            displayOrder: 3,
            isActive: true,
            defaultValue: '',
            placeholder: 'Select Field Officer',
            helpText: 'Select the field officer to assign',
            dataSource: '',
            dependsOnField: '',
            conditionalLogic: '',
            createdAt: '2026-03-15T12:33:00.000000',
            updatedAt: '2026-03-15T12:33:00.000000'
          } as ModuleFormField
        ],
        timestamp: new Date().toISOString()
      };
      return of(dummyData);
    }

    let url = `${this.apiUrl}/case-natures/${caseNatureId}/modules/${moduleType}/fields`;
    if (caseTypeId) {
      url += `?caseTypeId=${caseTypeId}`;
    }
    return this.http.get<ApiResponse<ModuleFormField[]>>(
      url,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get single field by ID
   * GET /api/admin/module-forms/fields/{fieldId}
   */
  getFieldById(fieldId: number): Observable<ApiResponse<ModuleFormField>> {
    return this.http.get<ApiResponse<ModuleFormField>>(
      `${this.apiUrl}/fields/${fieldId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create field
   * POST /api/admin/module-forms/fields
   */
  createField(field: ModuleFormField): Observable<ApiResponse<ModuleFormField>> {
    return this.http.post<ApiResponse<ModuleFormField>>(
      `${this.apiUrl}/fields`,
      field,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update field
   * PUT /api/admin/module-forms/fields/{fieldId}
   */
  updateField(fieldId: number, field: Partial<ModuleFormField>): Observable<ApiResponse<ModuleFormField>> {
    return this.http.put<ApiResponse<ModuleFormField>>(
      `${this.apiUrl}/fields/${fieldId}`,
      field,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete field
   * DELETE /api/admin/module-forms/fields/{fieldId}
   */
  deleteField(fieldId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/fields/${fieldId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Reorder fields
   * PUT /api/admin/module-forms/case-natures/{caseNatureId}/modules/{moduleType}/fields/reorder
   */
  reorderFields(caseNatureId: number, moduleType: ModuleType, fieldOrders: Array<{fieldId: number, displayOrder: number}>): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/case-natures/${caseNatureId}/modules/${moduleType}/fields/reorder`,
      { fieldOrders },
      { headers: this.getAuthHeaders() }
    );
  }
}
