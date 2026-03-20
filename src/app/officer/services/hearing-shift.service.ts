import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  timestamp?: string;
  data: T;
}

export interface HearingShiftCase {
  caseId: number;
  caseNumber: string;
  courtId: number;
  courtName: string;
  currentHearingDate: string;
  currentHearingNo: number;
}

export interface HearingShiftPreviewRequest {
  fromDate: string;
  toDate: string;
  courtId?: number;
  shiftAll: boolean;
  caseIds: number[];
}

export interface HearingShiftPreviewData {
  fromDate: string;
  toDate: string;
  shiftAll: boolean;
  totalEligibleCases: number;
  totalSelectedCases: number;
  cases: HearingShiftCase[];
}

export interface HearingShiftExecuteRequest extends HearingShiftPreviewRequest {
  reason: string;
  remarks?: string;
}

export interface HearingShiftExecuteData {
  batchId: string;
  fromDate: string;
  toDate: string;
  shiftedCount: number;
  shiftedCaseIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class HearingShiftService {
  private readonly apiUrl = `${environment.apiUrl}/hearing-shift`;

  constructor(private readonly http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  getCasesByDate(date: string, courtId?: number): Observable<ApiResponse<HearingShiftCase[]>> {
    let params = new HttpParams().set('date', date);
    if (courtId != null) {
      params = params.set('courtId', courtId);
    }

    return this.http.get<ApiResponse<HearingShiftCase[]>>(`${this.apiUrl}/cases`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      catchError(error => {
        console.error('Error fetching hearing shift cases:', error);
        return throwError(() => error);
      })
    );
  }

  previewShift(payload: HearingShiftPreviewRequest): Observable<ApiResponse<HearingShiftPreviewData>> {
    return this.http.post<ApiResponse<HearingShiftPreviewData>>(
      `${this.apiUrl}/preview`,
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error generating hearing shift preview:', error);
        return throwError(() => error);
      })
    );
  }

  executeShift(payload: HearingShiftExecuteRequest): Observable<ApiResponse<HearingShiftExecuteData>> {
    return this.http.post<ApiResponse<HearingShiftExecuteData>>(
      `${this.apiUrl}/execute`,
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error executing hearing shift:', error);
        return throwError(() => error);
      })
    );
  }
}
