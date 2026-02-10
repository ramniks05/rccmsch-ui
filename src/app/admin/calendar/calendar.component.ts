import { Component, OnInit } from '@angular/core';
import { AdminService } from '../admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface CalendarEvent {
  id?: number;
  date: Date;
  title: string;
  eventType: string;
  description?: string;
  financialYear?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarDays: any[] = [];
  events: CalendarEvent[] = [];

  // Modal
  showModal = false;
  isEditMode = false;
  selectedDate: Date | null = null;
  selectedEvent: CalendarEvent | null = null;

  eventTitle = '';
  eventDescription = '';
  eventType: any;

  eventTypeList: any[] = [];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.generateCalendar();
    this.getEventTypes();
    this.getEventHolidayList();
  }

  // ================= CALENDAR =================

  generateCalendar(): void {
    this.calendarDays = [];

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const prevLastDay = new Date(this.currentYear, this.currentMonth, 0);

    const firstDayIndex = firstDay.getDay();
    const lastDayDate = lastDay.getDate();
    const prevLastDayDate = prevLastDay.getDate();
    const nextDays = 7 - lastDay.getDay() - 1;

    for (let x = firstDayIndex; x > 0; x--) {
      this.calendarDays.push({
        day: prevLastDayDate - x + 1,
        isCurrentMonth: false,
        date: new Date(
          this.currentYear,
          this.currentMonth - 1,
          prevLastDayDate - x + 1,
        ),
      });
    }

    for (let i = 1; i <= lastDayDate; i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      this.calendarDays.push({
        day: i,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        date,
      });
    }

    for (let j = 1; j <= nextDays; j++) {
      this.calendarDays.push({
        day: j,
        isCurrentMonth: false,
        date: new Date(this.currentYear, this.currentMonth + 1, j),
      });
    }
  }

  isToday(date: Date): boolean {
    const t = new Date();
    return (
      date.getDate() === t.getDate() &&
      date.getMonth() === t.getMonth() &&
      date.getFullYear() === t.getFullYear()
    );
  }

  previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateCalendar();
  }

  // ================= DATE CLICK =================

  onDateClick(day: any) {
    if (!day.isCurrentMonth) return;

    this.selectedDate = day.date;
    const events = this.getEventsForDate(day.date);

    if (events.length) {
      this.isEditMode = true;
      this.selectedEvent = events[0];
      this.eventTitle = events[0].title;
      this.eventDescription = events[0].description || '';
      this.eventType = events[0].eventType;
    } else {
      this.isEditMode = false;
      this.selectedEvent = null;
      this.eventTitle = '';
      this.eventDescription = '';
      this.eventType = 'EVENT';
    }

    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.selectedEvent = null;
    this.selectedDate = null;
    this.eventTitle = '';
    this.eventDescription = '';
    this.eventType = 'EVENT';
  }

  // ================= SAVE =================

  saveEvent() {
    if (!this.selectedDate || !this.eventTitle.trim()) return;

    const payload = {
      title: this.eventTitle,
      eventType: this.eventType,
      date: this.formatDateForApi(this.selectedDate),
      description: this.eventDescription,
    };

    if (this.isEditMode && this.selectedEvent?.id) {
      // UPDATE
      this.adminService
        .updateEventHoliday(this.selectedEvent.id, payload)
        .subscribe({
          next: () => {
            Object.assign(this.selectedEvent!, {
              title: this.eventTitle,
              eventType: this.eventType,
              description: this.eventDescription,
              date: new Date(this.selectedDate!),
            });

            this.closeModal();
            this.snackBar.open(
              'Calendar event/holiday updated successfully',
              'Close',
              { duration: 3000 },
            );
            this.getEventHolidayList();
          },
          error: (err) => {
            console.error('Update event failed', err);
            this.snackBar.open(
              'Failed to update calendar event. Please try again.',
              'Close',
              { duration: 4000 },
            );
          },
        });
    } else {
      // CREATE
      this.adminService.createEventHoliday(payload).subscribe({
        next: (res: any) => {
          this.events.push({
            id: res?.data?.eventId,
            title: this.eventTitle,
            eventType: this.eventType,
            description: this.eventDescription,
            date: new Date(this.selectedDate!),
            isActive: true,
          });

          this.closeModal();
          this.snackBar.open(
            'Calendar event/holiday created successfully',
            'Close',
            { duration: 3000 },
          );
          this.getEventHolidayList();
        },
        error: (err) => {
          console.error('Create event failed', err);
          this.snackBar.open(
            'Failed to create calendar event. Please try again.',
            'Close',
            { duration: 4000 },
          );
        },
      });
    }
  }

  // ================= EVENTS =================

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(
      (e) =>
        e.date.getDate() === date.getDate() &&
        e.date.getMonth() === date.getMonth() &&
        e.date.getFullYear() === date.getFullYear(),
    );
  }

  hasEvents(date: Date): boolean {
    return this.getEventsForDate(date).length > 0;
  }

  getUpcomingEvents(): CalendarEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.events
      .filter((e) => e.isActive !== false && e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ================= DELETE (DEACTIVATE) =================

  deleteEvent(event: CalendarEvent): void {
    if (!event.id) return;

    const confirmDelete = confirm(
      `Are you sure you want to remove "${event.title}"?`,
    );

    if (!confirmDelete) return;

    this.adminService
      .deactivateEventHoliday(event.id, { isActive: false })
      .subscribe({
        next: () => {
          // mark inactive
          event.isActive = false;

          // remove from UI
          this.events = this.events.filter((e) => e.isActive !== false);

          this.snackBar.open(
            'Event/Holiday de-activated successfully',
            'Close',
            { duration: 3000 },
          );
        },
        error: (err) => {
          console.error('Deactivate failed', err);
          this.snackBar.open(
            'Failed to de-activate event. Please try again.',
            'Close',
            { duration: 4000 },
          );
        },
      });
  }

  // ================= API =================

  getEventTypes() {
    this.adminService.getEventTypes().subscribe({
      next: (res: any) => {
        this.eventTypeList = res.data || [];
      },
      error: (err) => {
        console.error('Failed to load event types', err);
        this.eventTypeList = [];
        this.snackBar.open('Failed to load event types', 'Close', {
          duration: 4000,
        });
      },
    });
  }

  getEventHolidayList() {
    this.adminService.getEventHolidayList().subscribe({
      next: (res: any) => {
        this.events = res.data
          .filter((e: any) => e.isActive !== false)
          .map((e: any) => ({
            id: e.eventId,
            title: e.title,
            eventType: e.eventType,
            description: e.description,
            date: this.parseApiDate(e.date),
            isActive: e.isActive,
          }));
      },
      error: (err) => {
        console.error('Failed to load calendar events', err);
        this.events = [];
        this.snackBar.open('Failed to load calendar events', 'Close', {
          duration: 4000,
        });
      },
    });
  }

  // ================= UTILS =================

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateForApi(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${date.getFullYear()}`;
  }

  parseApiDate(dateStr: string): Date {
    const [d, m, y] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
