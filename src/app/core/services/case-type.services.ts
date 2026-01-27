import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CaseTypeService {

  private readonly baseUrl: string;
  private readonly caseNaturesUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
    this.caseNaturesUrl = `${this.baseUrl}/case-natures`;
  }

  /**
   * Get active case natures (legal matters: MUTATION_GIFT_SALE, PARTITION, etc.)
   * Used for land process types / case nature selection
   */
  getCaseNatures(): Observable<any> {
    return this.http.get<any>(`${this.caseNaturesUrl}/active`, {
      headers: { accept: '*/*' }
    });
  }

  /**
   * @deprecated Use getCaseNatures() instead. This method is kept for backward compatibility.
   */
  getCaseTypes(): Observable<any> {
    return this.getCaseNatures();
  }
}
