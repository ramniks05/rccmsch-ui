import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Module Types
 */
export type ModuleType = 'HEARING' | 'NOTICE' | 'ORDERSHEET' | 'JUDGEMENT';

/**
 * Field Types
 */
export type FieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'DATETIME' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'RADIO' | 'FILE';

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
