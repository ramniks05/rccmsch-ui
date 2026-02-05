import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface WhatsNew {
  id?: number;
  publishedDate: string;
  title: string;
  pdfUrl: string;
}

/** API response wrapper (adjust if backend changes) */
interface ApiResponse<T> {
  success?: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsNewService {
  private readonly apiUrl = environment.apiUrl;
  private readonly basePath = '/admin/system-settings';

  constructor(private http: HttpClient) {}

  // ----------- FETCH LIST -----------
  getAll(): Observable<ApiResponse<WhatsNew[]>> {
    return this.http.put<ApiResponse<WhatsNew[]>>(
      `${this.apiUrl}${this.basePath}/fetch/whats-new-list`,
      {} // backend expects PUT
    );
  }

  // ----------- CREATE -----------
  create(payload: WhatsNew): Observable<ApiResponse<WhatsNew>> {
    return this.http.post<ApiResponse<WhatsNew>>(
      `${this.apiUrl}${this.basePath}/create/whats-new`,
      payload
    );
  }

  // ----------- UPDATE -----------
  update(id: number, payload: WhatsNew): Observable<ApiResponse<WhatsNew>> {
    return this.http.put<ApiResponse<WhatsNew>>(
      `${this.apiUrl}${this.basePath}/update/whats-new/${id}`,
      payload
    );
  }

  // ----------- DELETE -----------
  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}${this.basePath}/delete/whats-new/${id}`
    );
  }
}
