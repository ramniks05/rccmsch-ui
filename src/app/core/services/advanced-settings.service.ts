import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

/* =======================
   COMMON API RESPONSE
======================= */

export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}

/* =======================
   DOCUMENTS AVAILABLE
======================= */

export interface DocumentAvailable {
  id?: number;
  title: string;
  url: string;
  createdAt?: Date;
  publishedOn?: string;
}

/* =======================
   WHATS NEW
======================= */

export interface WhatsNew {
  id?: number;
  publishedDate: string;
  title: string;
  pdfUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdvancedSettingsService {
  private readonly apiUrl = environment.apiUrl;

  private readonly documentsPath =
    '/admin/system-settings/document/fetch/document-list';
  private readonly whatsNewPath = '/admin/system-settings';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /* =======================
     AUTH HEADERS
  ======================= */

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getFormDataHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /* =====================================================
     DOCUMENTS AVAILABLE APIs
  ===================================================== */

  getAllDocumentsAvailable(): Observable<ApiResponse<DocumentAvailable[]>> {
    return this.http.get<ApiResponse<DocumentAvailable[]>>(
      `${this.apiUrl}${this.documentsPath}`,
      { headers: this.getFormDataHeaders() },
    );
  }

  getDocumentsAvailableById(
    id: number,
  ): Observable<ApiResponse<DocumentAvailable>> {
    return this.http.get<ApiResponse<DocumentAvailable>>(
      `${this.apiUrl}${this.documentsPath}/${id}`,
      { headers: this.getFormDataHeaders() },
    );
  }

  createDocumentsAvailable(
    document: FormData,
  ): Observable<ApiResponse<DocumentAvailable>> {
    return this.http.post<ApiResponse<DocumentAvailable>>(
      `${this.apiUrl}/admin/system-settings/document/upload/document-available`,
      document,
      {
        headers: this.getFormDataHeaders(),
      },
    );
  }

  updateDocumentsAvailable(
    id: number,
    document: FormData,
  ): Observable<ApiResponse<DocumentAvailable>> {
    return this.http.put<ApiResponse<DocumentAvailable>>(
      `${this.apiUrl}'/admin/system-settings/document/upload/document-available'/${id}`,
      document,
      { headers: this.getFormDataHeaders() },
    );
  }

  deleteDocumentsAvailable(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}${this.documentsPath}/${id}`,
      { headers: this.getFormDataHeaders() },
    );
  }

  uploadDocumentsAvailableFile(
    formData: FormData,
  ): Observable<ApiResponse<{ url: string }>> {
    return this.http.post<ApiResponse<{ url: string }>>(
      `${this.apiUrl}/admin/system-settings/document/upload/document-available`,
      formData,
      { headers: this.getFormDataHeaders() },
    );
  }

  /* =====================================================
     WHATS NEW APIs
  ===================================================== */

  getAllWhatsNew(): Observable<ApiResponse<WhatsNew[]>> {
    return this.http.get<ApiResponse<WhatsNew[]>>(
      `${this.apiUrl}${this.whatsNewPath}/fetch/whats-new-list`,
      { headers: this.getAuthHeaders() },
    );
  }

  createWhatsNew(payload: WhatsNew): Observable<ApiResponse<WhatsNew>> {
    return this.http.post<ApiResponse<WhatsNew>>(
      `${this.apiUrl}${this.whatsNewPath}/create/whats-new`,
      payload,
      { headers: this.getAuthHeaders() },
    );
  }

  updateWhatsNew(
    id: number,
    payload: WhatsNew,
  ): Observable<ApiResponse<WhatsNew>> {
    return this.http.put<ApiResponse<WhatsNew>>(
      `${this.apiUrl}${this.whatsNewPath}/update/whats-new/${id}`,
      payload,
      { headers: this.getAuthHeaders() },
    );
  }

  deleteWhatsNew(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}${this.whatsNewPath}/delete/whats-new/${id}`,
      { headers: this.getAuthHeaders() },
    );
  }
}
