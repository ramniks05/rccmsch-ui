import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  QueryList,
  ViewChildren,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface ContactStatItem {
  value: string;
  label: string;
  icon: string;
}

export interface ContactChannel {
  icon: string;
  title: string;
  detail: string;
  subDetail?: string;
  actionLabel: string;
  actionHref: string;
  color: string;
}

export interface OfficeInfo {
  name: string;
  address: string[];
  hours: string;
  phone: string;
  initials: string;
  accentColor: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  category: string;
  message: string;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent implements OnInit, AfterViewInit {
  @ViewChildren('animateOnScroll') animatedEls!: QueryList<ElementRef>;

  formStatus: FormStatus = 'idle';

  form: ContactFormData = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: '',
    message: '',
  };

  readonly stats: ContactStatItem[] = [
    { value: '< 24h',   label: 'Response Time',       icon: 'clock'   },
    { value: '9–5 PM',  label: 'Support Hours',        icon: 'support' },
    { value: '3',       label: 'Office Locations',     icon: 'pin'     },
    { value: '100%',    label: 'Queries Acknowledged', icon: 'check'   },
  ];

  readonly channels: ContactChannel[] = [
    {
      icon: 'phone',
      title: 'Helpdesk Phone',
      detail: '+91-172-2700-101',
      subDetail: 'Mon – Fri, 9:00 AM – 5:00 PM',
      actionLabel: 'Call Now',
      actionHref: 'tel:+911722700101',
      color: '#1a5cb8',
    },
    {
      icon: 'email',
      title: 'Email Support',
      detail: 'support.rccms@chandigarh.gov.in',
      subDetail: 'Reply within 1 working day',
      actionLabel: 'Send Email',
      actionHref: 'mailto:support.rccms@chandigarh.gov.in',
      color: '#e8560a',
    },
    {
      icon: 'location',
      title: 'Head Office',
      detail: 'District Courts Complex',
      subDetail: 'Sector 17, Chandigarh – 160017',
      actionLabel: 'Get Directions',
      actionHref: 'https://maps.google.com/?q=District+Courts+Chandigarh',
      color: '#0d8a4e',
    },
    {
      icon: 'chat',
      title: 'Online Grievance',
      detail: 'pgportal.gov.in',
      subDetail: 'Track complaint status anytime',
      actionLabel: 'File Grievance',
      actionHref: 'https://pgportal.gov.in',
      color: '#7b2d8b',
    },
  ];

  readonly offices: OfficeInfo[] = [
    {
      name: 'District Courts Complex',
      address: ['Sector 17-A', 'Chandigarh – 160 017', 'UT Chandigarh'],
      hours: 'Mon – Fri: 9:00 AM – 5:00 PM',
      phone: '+91-172-2700-101',
      initials: 'DC',
      accentColor: '#1a5cb8',
    },
    {
      name: 'Revenue Department Office',
      address: ['Mini Secretariat', 'Sector 9-D', 'Chandigarh – 160 009'],
      hours: 'Mon – Fri: 9:00 AM – 5:00 PM',
      phone: '+91-172-2749-100',
      initials: 'RD',
      accentColor: '#e8560a',
    },
    {
      name: 'NIC Help Centre',
      address: ['CGO Complex, Block No. 4', 'Sector 26', 'Chandigarh – 160 026'],
      hours: 'Mon – Fri: 9:30 AM – 6:00 PM',
      phone: '+91-172-2623-050',
      initials: 'NIC',
      accentColor: '#0d8a4e',
    },
  ];

  readonly categories: string[] = [
    'Case Filing Issue',
    'Account / Registration',
    'Document Upload Problem',
    'Hearing / Cause List',
    'Payment & Court Fees',
    'Technical / Portal Error',
    'Order / Certified Copy',
    'Other',
  ];

  // ── SVG icon map (no ngSwitch) ────────────────────────
  private readonly svgIcons: Record<string, string> = {
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    support: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    'map-pin': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    'office-phone': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    clock2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  };

  getSvgIcon(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.svgIcons[name] ?? '');
  }

  // ─────────────────────────────────────────────────────
  private observer!: IntersectionObserver;

  constructor(
    public cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    this.animatedEls.forEach((el) => this.observer.observe(el.nativeElement));
  }

  submitForm(): void {
    if (!this.isFormValid()) return;
    this.formStatus = 'submitting';
    this.cdr.markForCheck();


    setTimeout(() => {
      this.formStatus = 'success';
      console.log(this.formStatus);

      this.cdr.markForCheck();
    }, 1500);
  }

  resetForm(): void {
    this.form = { name: '', email: '', phone: '', subject: '', category: '', message: '' };
    this.formStatus = 'idle';
    this.cdr.markForCheck();
  }

  isFormValid(): boolean {
    return (
      !!this.form.name.trim() &&
      !!this.form.email.trim() &&
      !!this.form.category &&
      !!this.form.message.trim() &&
      this.isValidEmail(this.form.email)
    );
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
