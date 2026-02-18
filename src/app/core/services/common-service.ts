import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { HearingDay } from 'src/app/pages/hearing-calendar/hearing-calendar.component';
import { CauseList } from 'src/app/pages/cause-list/cause-list.component';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class CommonService {
  private readonly baseUrl: string;
  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  getCourts(): Observable<string[]> {
    return of([
      'DC Court – Imphal West',
      'SDM Court – Thoubal',
      'SDM Court – Bishnupur',
    ]);
  }

  getCalendar(
    month: number,
    year: number,
    courtId?: number,
  ): Observable<HearingDay[]> {
    let params = new HttpParams()
      .set('year', year)
      .set('month', month);

    if (courtId !== undefined && courtId !== null) {
      params = params.set('courtId', courtId);
    }

    return this.http.get<HearingDay[]>(
      `${this.baseUrl}/dashboard/hearings/calendar`,
      { params },
    );
  }
  /* ================= CAUSE LIST SERVICE METHODS ================= */

  private data: CauseList[] = [
    {
      id: 1,
      courtName: 'DC Court – Imphal West',
      address: 'Deputy Commissioner Office, Imphal West, Manipur',
      totalCases: 3,
      hearingDate: '06/02/2026',
    },
    {
      id: 2,
      courtName: 'SDM Court – Thoubal',
      address: 'Sub-Divisional Magistrate Office, Thoubal, Manipur',
      totalCases: 2,
      hearingDate: '06/02/2026',
    },
    {
      id: 3,
      courtName: 'SDM Court – Bishnupur',
      address: 'Sub-Divisional Magistrate Office, Bishnupur, Manipur',
      totalCases: 4,
      hearingDate: '06/02/2026',
    },
  ];

  getLatest(): Observable<CauseList[]> {
    return of(this.data.slice(0, 5));
  }

  getLatestCauseList(
    courtId?: any,
  ): Observable<CauseList[]> {
    let params = new HttpParams()
    if (courtId !== undefined && courtId !== null && courtId !== '') {
      params = params.set('courtId', courtId);
    }

    return this.http.get<CauseList[]>(
      `${this.baseUrl}/dashboard/cause-list`,
      { params },
    );
  }

  getByCourt(court: string): Observable<CauseList[]> {
    return of(this.data.filter((d) => d.courtName === court));
  }

  getCourtsCauseList(): Observable<string[]> {
    return of([...new Set(this.data.map((d) => d.courtName))]);
  }
}
