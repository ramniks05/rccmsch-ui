import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { HearingDay } from 'src/app/pages/hearing-calendar/hearing-calendar.component';
import { CauseList } from 'src/app/pages/cause-list/cause-list.component';

@Injectable({ providedIn: 'root' })
export class CommonService {
  /* ================= HEARING CALENDAR SERVICE METHODS ================= */

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
    court: string,
  ): Observable<HearingDay[]> {
    return of([
      { date: 3, isHearing: true, tooltip: this.tooltip(court, 4) },
      { date: 6, isHearing: true, tooltip: this.tooltip(court, 2) },
      { date: 10, isHearing: true, tooltip: this.tooltip(court, 3) },
      { date: 14, isHearing: true, tooltip: this.tooltip(court, 5) },
      { date: 18, isHearing: true, tooltip: this.tooltip(court, 1) },
      { date: 22, isHearing: true, tooltip: this.tooltip(court, 2) },
      { date: 26, isHearing: true, tooltip: this.tooltip(court, 4) },
    ]);
  }

  private tooltip(court: string, cases: number): string {
    return `
${court}, Manipur
Total Cases - ${cases}

Field Report (${cases})
`.trim();
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

  getByCourt(court: string): Observable<CauseList[]> {
    return of(this.data.filter((d) => d.courtName === court));
  }

  getCourtsCauseList(): Observable<string[]> {
    return of([...new Set(this.data.map((d) => d.courtName))]);
  }
}
