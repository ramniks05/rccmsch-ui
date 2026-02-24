import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import type {
  TransitionChecklist,
  TransitionWithChecklist
} from '../models/workflow-condition.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

/**
 * Workflow service for case-level workflow APIs (checklist, available transitions).
 * Used on case detail page for "Available Actions" / checklist display.
 */
@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly baseUrl = `${environment.apiUrl}/workflow`;
  private readonly casesBaseUrl = `${environment.apiUrl}/cases`;

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
    if (userId != null) {
      headers['X-User-Id'] = String(userId);
    }
    return new HttpHeaders(headers);
  }

  /**
   * Get available transitions for a case (with checklist summary).
   * GET /api/cases/{caseId}/transitions
   * Normalizes the response to extract canExecute from checklist if needed
   */
  getCaseTransitions(caseId: number): Observable<ApiResponse<TransitionWithChecklist[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.casesBaseUrl}/${caseId}/transitions`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          return response as ApiResponse<TransitionWithChecklist[]>;
        }
        
        // Normalize the response: extract canExecute and blockingConditions from checklist
        const normalizedData: TransitionWithChecklist[] = response.data.map((transition: any) => {
          const normalized: TransitionWithChecklist = {
            id: transition.id,
            transitionCode: transition.transitionCode,
            transitionName: transition.transitionName,
            fromStateCode: transition.fromStateCode,
            toStateCode: transition.toStateCode,
            requiresComment: transition.requiresComment || false,
            description: transition.description,
            // Extract canExecute from checklist if it exists, otherwise use top-level canExecute
            canExecute: transition.checklist?.canExecute !== undefined 
              ? transition.checklist.canExecute 
              : (transition.canExecute !== undefined ? transition.canExecute : true),
            // Extract blockingConditions from checklist
            blockingConditions: transition.checklist?.blockingReasons?.map((reason: string) => ({
              label: reason,
              passed: false
            })) || transition.checklist?.conditions?.filter((c: any) => !c.passed).map((c: any) => ({
              label: c.label || c.message || 'Condition not met',
              passed: false
            })) || transition.blockingConditions || []
          };
          return normalized;
        });
        
        return {
          ...response,
          data: normalizedData
        } as ApiResponse<TransitionWithChecklist[]>;
      })
    );
  }

  /**
   * Get full checklist for a specific transition on a case.
   * GET /api/workflow/checklist/{caseId}/{transitionCode}
   */
  getTransitionChecklist(
    caseId: number,
    transitionCode: string
  ): Observable<ApiResponse<TransitionChecklist>> {
    return this.http.get<ApiResponse<TransitionChecklist>>(
      `${this.baseUrl}/checklist/${caseId}/${encodeURIComponent(transitionCode)}`,
      { headers: this.getHeaders() }
    );
  }
}
