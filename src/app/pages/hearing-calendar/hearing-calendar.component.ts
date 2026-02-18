import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService } from 'src/app/admin/admin.service';
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

  courts: any[] = [];
  selectedCourt:any;

  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  weeks: number[][] = [];
  hearings: HearingDay[] = [];

  readonly weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  constructor(
    private service: CommonService,
    private adminService: AdminService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCourts();
    this.buildCalendar();
    this.loadHearings();
  }

  loadCourts(): void {
    this.adminService.getAllCourts().subscribe({
      next: (res) => {
        this.courts = res.data ?? [];
      },
      error: (err) => {
        console.error('Error fetching courts list:', err);
        this.snack.open('Failed to load courts list', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  onCourtChange(): void {
    if (this.selectedCourt === '') {
      this.selectedCourt = null;
    }
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
      .getCalendar(this.currentMonth + 1, this.currentYear, this.selectedCourt)
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

  /**
   * Check if a given day is today
   */
  isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      this.currentMonth === today.getMonth() &&
      this.currentYear === today.getFullYear()
    );
  }
}
