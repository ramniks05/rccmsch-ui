import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/core/services/common-service';

export interface HearingDay {
  date: number;
  isHearing: boolean;
  tooltip?: string;
}

@Component({
  selector: 'app-hearing-calendar',
  templateUrl: './hearing-calendar.component.html',
  styleUrls: ['./hearing-calendar.component.scss']
})
export class HearingCalendarComponent implements OnInit {

  courts: string[] = [];
  selectedCourt = 'Tehsildar-Hamirpur';

  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  weeks: number[][] = [];
  hearings: HearingDay[] = [];

  readonly weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  constructor(private service: CommonService) {}

  ngOnInit(): void {
    this.loadCourts();
    this.buildCalendar();
    this.loadHearings();
  }

  loadCourts(): void {
    this.service.getCourts().subscribe(res => this.courts = res);
  }

  onCourtChange(): void {
    this.loadHearings();
  }

  prevMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.buildCalendar();
    this.loadHearings();
  }

  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.buildCalendar();
    this.loadHearings();
  }

  buildCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

    const startDay = (firstDay.getDay() + 6) % 7; // Mon start
    const totalDays = lastDay.getDate();

    const days: number[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(0);
    }

    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }

    this.weeks = [];
    while (days.length) {
      this.weeks.push(days.splice(0, 7));
    }
  }

  loadHearings(): void {
    this.service
      .getCalendar(this.currentMonth, this.currentYear, this.selectedCourt)
      .subscribe(res => this.hearings = res);
  }

  getHearing(day: number): HearingDay | undefined {
    return this.hearings.find(h => h.date === day);
  }

  get monthLabel(): string {
    return new Date(this.currentYear, this.currentMonth)
      .toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  get prevMonthLabel(): string {
    return new Date(this.currentYear, this.currentMonth - 1)
      .toLocaleString('default', { month: 'short' });
  }

  get nextMonthLabel(): string {
    return new Date(this.currentYear, this.currentMonth + 1)
      .toLocaleString('default', { month: 'short' });
  }
}
