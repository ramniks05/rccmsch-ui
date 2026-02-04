import { Component, OnInit } from '@angular/core';

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  type: 'event' | 'holiday';
  description?: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  currentDate: Date = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.currentDate.getFullYear();

  monthNames: string[] = [
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

  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarDays: any[] = [];
  events: CalendarEvent[] = [];
  selectedDate: Date | null = null;

  // Modal properties
  showModal: boolean = false;
  eventTitle: string = '';
  eventDescription: string = '';
  eventType: 'event' | 'holiday' = 'event';

  constructor() {}

  ngOnInit(): void {
    this.generateCalendar();
    this.loadSampleEvents();
  }

  generateCalendar(): void {
    this.calendarDays = [];

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const prevLastDay = new Date(this.currentYear, this.currentMonth, 0);

    const firstDayIndex = firstDay.getDay();
    const lastDayDate = lastDay.getDate();
    const prevLastDayDate = prevLastDay.getDate();
    const nextDays = 7 - lastDay.getDay() - 1;

    // Previous month days
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

    // Current month days
    for (let i = 1; i <= lastDayDate; i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      this.calendarDays.push({
        day: i,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        date: date,
      });
    }

    // Next month days
    for (let j = 1; j <= nextDays; j++) {
      this.calendarDays.push({
        day: j,
        isCurrentMonth: false,
        date: new Date(this.currentYear, this.currentMonth + 1, j),
      });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  previousMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateCalendar();
  }

  onDateClick(day: any): void {
    if (day.isCurrentMonth) {
      this.selectedDate = day.date;
      this.showModal = true;
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.eventTitle = '';
    this.eventDescription = '';
    this.eventType = 'event';
    this.selectedDate = null;
  }

  saveEvent(): void {
    if (this.selectedDate && this.eventTitle.trim()) {
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        date: new Date(this.selectedDate),
        title: this.eventTitle,
        type: this.eventType,
        description: this.eventDescription,
      };
      console.log(newEvent);

      this.events.push(newEvent);
      console.log(this.events);

      this.closeModal();
    }
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(
      (event) =>
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear(),
    );
  }

  hasEvents(date: Date): boolean {
    return this.getEventsForDate(date).length > 0;
  }

  getUpcomingEvents(): CalendarEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.events
      .filter((event) => event.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }

  deleteEvent(eventId: string): void {
    this.events = this.events.filter((event) => event.id !== eventId);
  }

  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  }

  loadSampleEvents(): void {
    // Add some sample events
    const today = new Date();

    this.events = [
      {
        id: '1',
        date: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 2,
        ),
        title: 'Team Meeting',
        type: 'event',
        description: 'Quarterly review meeting',
      },
      {
        id: '2',
        date: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 5,
        ),
        title: 'Christmas Holiday',
        type: 'holiday',
        description: 'Public Holiday',
      },
      {
        id: '3',
        date: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 10,
        ),
        title: 'Project Deadline',
        type: 'event',
        description: 'Submit final deliverables',
      },
    ];
  }
}
