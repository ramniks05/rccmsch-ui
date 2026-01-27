import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class FormSchemaService {
  private readonly baseUrl: string;
  private readonly caseTypesUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
    this.caseTypesUrl = `${this.baseUrl}/admin/form-schemas/case-types`;
  }

  /**
   * Get Form Schema for a Case Type
   * GET /api/admin/form-schemas/case-types/{caseTypeId} — No authentication required (Public endpoint)
   * @param caseTypeId - The ID of the case type (filing type: NEW_FILE, APPEAL, etc.)
   */
  getFormSchema(caseTypeId: number): Observable<any> {
    return this.http.get<any>(`${this.caseTypesUrl}/${caseTypeId}`);
  }
}
