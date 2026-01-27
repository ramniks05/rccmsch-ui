import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ModuleType } from './module-forms.service';

/**
 * Document Template
 */
export interface DocumentTemplate {
  id?: number;
  caseNatureId: number;
  caseTypeId?: number; // Optional: for case type override
  caseNatureName?: string;
  caseTypeName?: string;
  moduleType: ModuleType;
  templateName: string;
  templateHtml: string;
  templateData?: string; // JSON string with metadata (placeholders, etc.)
  version?: number;
  allowEditAfterSign: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
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
 * Document Templates Service
 * Handles admin APIs for configuring document templates per case nature
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentTemplatesService {
  private apiUrl = `${environment.apiUrl}/admin/document-templates`;

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
   * List templates for a case nature and module type (with optional case type override)
   * GET /api/admin/document-templates/case-natures/{caseNatureId}/modules/{moduleType}?caseTypeId=&activeOnly=true
   */
  getTemplatesByCaseNatureAndModule(
    caseNatureId: number, 
    moduleType: ModuleType, 
    activeOnly: boolean = false,
    caseTypeId?: number
  ): Observable<ApiResponse<DocumentTemplate[]>> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }
    if (caseTypeId) {
      params = params.set('caseTypeId', caseTypeId.toString());
    }

    return this.http.get<ApiResponse<DocumentTemplate[]>>(
      `${this.apiUrl}/case-natures/${caseNatureId}/modules/${moduleType}`,
      { headers: this.getAuthHeaders(), params }
    );
  }

  /**
   * Get all templates (admin view)
   * GET /api/admin/document-templates
   */
  getAllTemplates(): Observable<ApiResponse<DocumentTemplate[]>> {
    return this.http.get<ApiResponse<DocumentTemplate[]>>(
      this.apiUrl,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get single template by ID
   * GET /api/admin/document-templates/{templateId}
   */
  getTemplateById(templateId: number): Observable<ApiResponse<DocumentTemplate>> {
    return this.http.get<ApiResponse<DocumentTemplate>>(
      `${this.apiUrl}/${templateId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create template
   * POST /api/admin/document-templates
   */
  createTemplate(template: DocumentTemplate): Observable<ApiResponse<DocumentTemplate>> {
    return this.http.post<ApiResponse<DocumentTemplate>>(
      this.apiUrl,
      template,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update template
   * PUT /api/admin/document-templates/{templateId}
   */
  updateTemplate(templateId: number, template: Partial<DocumentTemplate>): Observable<ApiResponse<DocumentTemplate>> {
    return this.http.put<ApiResponse<DocumentTemplate>>(
      `${this.apiUrl}/${templateId}`,
      template,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete template
   * DELETE /api/admin/document-templates/{templateId}
   */
  deleteTemplate(templateId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/${templateId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Duplicate template (create a new version)
   * POST /api/admin/document-templates/{templateId}/duplicate
   */
  duplicateTemplate(templateId: number): Observable<ApiResponse<DocumentTemplate>> {
    return this.http.post<ApiResponse<DocumentTemplate>>(
      `${this.apiUrl}/${templateId}/duplicate`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }
}
