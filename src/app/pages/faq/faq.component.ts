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

export interface FaqCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface FaqItem {
  id: number;
  categoryId: string;
  question: string;
  answer: string;
  tags?: string[];
}

export interface FaqStatItem {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent implements OnInit, AfterViewInit {
  @ViewChildren('animateOnScroll') animatedEls!: QueryList<ElementRef>;

  searchQuery = '';
  activeCategory = 'all';
  openItemId: number | null = null;

  readonly stats: FaqStatItem[] = [
    { value: '40+',  label: 'Questions Answered', icon: 'chat' },
    { value: '6',    label: 'Topic Categories',   icon: 'category' },
    { value: '24/7', label: 'Help Available',      icon: 'schedule' },
    { value: '98%',  label: 'Issues Resolved',     icon: 'check' },
  ];

  readonly categories: FaqCategory[] = [
    { id: 'all',          label: 'All Topics',      icon: 'apps',         color: '#1a5cb8' },
    { id: 'registration', label: 'Registration',    icon: 'how_to_reg',   color: '#e8560a' },
    { id: 'case-filing',  label: 'Case Filing',     icon: 'edit_document', color: '#0d8a4e' },
    { id: 'hearings',     label: 'Hearings',        icon: 'gavel',        color: '#7b2d8b' },
    { id: 'documents',    label: 'Documents',       icon: 'description',  color: '#c0392b' },
    { id: 'technical',    label: 'Technical',       icon: 'build',        color: '#d4870a' },
    { id: 'legal',        label: 'Legal & Orders',  icon: 'balance',      color: '#1a7a5e' },
  ];

  readonly allFaqs: FaqItem[] = [
    // ── Registration ──────────────────────────────
    {
      id: 1,
      categoryId: 'registration',
      question: 'Who can register on RCCMS?',
      answer:
        'Any citizen, advocate, or authorized representative involved in a revenue court matter in UT Chandigarh can register on RCCMS. Registration is free of charge and requires a valid mobile number and email address for OTP-based verification.',
      tags: ['citizen', 'advocate', 'account'],
    },
    {
      id: 2,
      categoryId: 'registration',
      question: 'What documents are needed to create an account?',
      answer:
        'You need a valid government-issued photo ID (Aadhaar, PAN, Voter ID, or Passport), a working mobile number for OTP verification, and an active email address. Advocates additionally need their Bar Council enrollment number.',
      tags: ['documents', 'ID', 'aadhaar'],
    },
    {
      id: 3,
      categoryId: 'registration',
      question: 'Can I register on behalf of someone else?',
      answer:
        'Yes. An authorized representative — such as a power-of-attorney holder or an enrolled advocate — may register and act on behalf of a party. A scanned copy of the authorization document must be uploaded during registration.',
      tags: ['representative', 'POA', 'advocate'],
    },
    {
      id: 4,
      categoryId: 'registration',
      question: 'I did not receive my OTP. What should I do?',
      answer:
        'First, verify the mobile number entered is correct. Wait at least 2 minutes before requesting a resend. If the issue persists, check that your number is not on the DND registry, or use the email OTP option as an alternative. For further help contact the helpdesk.',
      tags: ['OTP', 'login', 'mobile'],
    },

    // ── Case Filing ───────────────────────────────
    {
      id: 5,
      categoryId: 'case-filing',
      question: 'How do I file a new case on RCCMS?',
      answer:
        'Log in to your RCCMS account and navigate to "File a Case" from the dashboard. Select the appropriate court, case type, and fill in the petitioner and respondent details. Upload the required documents in PDF format, pay the applicable court fee online, and submit. You will receive a unique Case Reference Number (CRN) immediately.',
      tags: ['new case', 'e-filing', 'CRN'],
    },
    {
      id: 6,
      categoryId: 'case-filing',
      question: 'What types of cases can be filed through RCCMS?',
      answer:
        'RCCMS supports filing of all revenue court matters including mutation applications, partition suits, tenancy disputes, agricultural land records corrections, appeals against revenue orders, and miscellaneous revenue petitions.',
      tags: ['case types', 'mutation', 'tenancy'],
    },
    {
      id: 7,
      categoryId: 'case-filing',
      question: 'What is the maximum file size for document uploads?',
      answer:
        'Each individual document must not exceed 5 MB and must be in PDF format. The total upload size per case filing is capped at 25 MB. Scanned documents should be at 150–200 DPI for optimal size and readability.',
      tags: ['upload', 'PDF', 'file size'],
    },
    {
      id: 8,
      categoryId: 'case-filing',
      question: 'Can I track my case after filing?',
      answer:
        'Yes. After filing, use the Case Status section on the dashboard or the public case search (no login required) with your CRN to see the current status, next hearing date, orders passed, and all associated documents.',
      tags: ['track', 'CRN', 'status'],
    },
    {
      id: 9,
      categoryId: 'case-filing',
      question: 'Is there a court fee for e-filing?',
      answer:
        'Court fees are applicable as per the existing Revenue Court fee schedule. RCCMS supports online payment via net banking, UPI, debit/credit cards, and government payment gateways. A digital receipt is generated instantly.',
      tags: ['court fee', 'payment', 'UPI'],
    },

    // ── Hearings ──────────────────────────────────
    {
      id: 10,
      categoryId: 'hearings',
      question: 'How will I be notified of my next hearing date?',
      answer:
        'RCCMS automatically sends SMS and email alerts 3 days before each scheduled hearing. You can also view all upcoming hearing dates in the "My Cases" section of your dashboard. Cause lists are also published publicly on the portal by 5:00 PM on the working day prior to the hearing.',
      tags: ['hearing', 'notification', 'SMS'],
    },
    {
      id: 11,
      categoryId: 'hearings',
      question: 'What if I want to request an adjournment?',
      answer:
        'Adjournment requests must be filed at least 24 hours before the scheduled hearing through the "Request Adjournment" option in your case detail view. The court will review the request and update the status. Automatic adjournments are not granted — all requests are subject to judicial discretion.',
      tags: ['adjournment', 'postpone', 'request'],
    },
    {
      id: 12,
      categoryId: 'hearings',
      question: 'Can I attend hearings virtually?',
      answer:
        'Video conferencing for hearings is available for parties who are unable to physically appear, subject to prior application and approval by the presiding officer. The application must be filed at least 48 hours before the hearing through the portal.',
      tags: ['virtual', 'video', 'VC hearing'],
    },
    {
      id: 13,
      categoryId: 'hearings',
      question: 'Where can I find the daily cause list?',
      answer:
        'The daily cause list for all revenue courts is published on the RCCMS homepage under the "Cause Lists" section by 5:00 PM every working day. No login is required to view the cause list. You can filter by court, date, or case number.',
      tags: ['cause list', 'schedule', 'public'],
    },

    // ── Documents ─────────────────────────────────
    {
      id: 14,
      categoryId: 'documents',
      question: 'How can I download a certified copy of a court order?',
      answer:
        'Certified copies of orders can be applied for through the "Documents" section of your case. Select the order, choose "Apply for Certified Copy", pay the prescribed fee, and the certified copy will be available for download within 2–3 working days after verification.',
      tags: ['certified copy', 'order', 'download'],
    },
    {
      id: 15,
      categoryId: 'documents',
      question: 'Can I view documents uploaded by the other party?',
      answer:
        'Yes. All documents uploaded by any party to a case are accessible to all parties involved in that case once the case has been admitted. Documents marked confidential by the court are visible only to the respective party and the court.',
      tags: ['documents', 'access', 'party'],
    },
    {
      id: 16,
      categoryId: 'documents',
      question: 'How long are case documents stored on RCCMS?',
      answer:
        'All case documents and records are retained on RCCMS for a minimum of 30 years after final disposal of the case, in accordance with the Revenue Records Retention Policy. Archived cases remain searchable but downloads require a formal application.',
      tags: ['storage', 'retention', 'archive'],
    },

    // ── Technical ─────────────────────────────────
    {
      id: 17,
      categoryId: 'technical',
      question: 'Which browsers are supported?',
      answer:
        'RCCMS is optimized for Google Chrome (v90+), Mozilla Firefox (v88+), Microsoft Edge (v90+), and Safari (v14+). Internet Explorer is not supported. For the best experience, keep your browser updated to the latest version.',
      tags: ['browser', 'Chrome', 'compatibility'],
    },
    {
      id: 18,
      categoryId: 'technical',
      question: 'I am getting a "Session Expired" error. What do I do?',
      answer:
        'Sessions automatically expire after 30 minutes of inactivity as a security measure. Simply log in again to resume. If you are in the middle of filling a form, use the "Save Draft" option periodically to avoid losing your data.',
      tags: ['session', 'error', 'login'],
    },
    {
      id: 19,
      categoryId: 'technical',
      question: 'Is RCCMS accessible on mobile devices?',
      answer:
        'Yes. RCCMS is fully responsive and works on all modern smartphones and tablets. A dedicated mobile application is also available on the Google Play Store and Apple App Store for iOS and Android users.',
      tags: ['mobile', 'app', 'responsive'],
    },
    {
      id: 20,
      categoryId: 'technical',
      question: 'How do I reset my password?',
      answer:
        'Click "Forgot Password" on the login page. Enter your registered email or mobile number, verify via OTP, and set a new password. Passwords must be at least 8 characters and include a mix of letters, numbers, and a special character.',
      tags: ['password', 'reset', 'security'],
    },

    // ── Legal & Orders ────────────────────────────
    {
      id: 21,
      categoryId: 'legal',
      question: 'How do I file an appeal against a revenue court order?',
      answer:
        'Appeals against revenue court orders must be filed within the statutory limitation period (typically 30 or 90 days depending on the order type). Use the "File Appeal" option in your closed case view, select the order being challenged, attach the grounds of appeal and supporting documents, and pay the applicable fee.',
      tags: ['appeal', 'order', 'limitation'],
    },
    {
      id: 22,
      categoryId: 'legal',
      question: 'Where can I find orders passed in my case?',
      answer:
        'All orders are published in the case detail view under the "Orders" tab immediately after being passed. Email and SMS notifications are also sent to all parties. Orders are digitally signed by the presiding officer and are legally valid.',
      tags: ['orders', 'digital signature', 'notification'],
    },
    {
      id: 23,
      categoryId: 'legal',
      question: 'Are digitally signed orders legally valid?',
      answer:
        'Yes. All orders issued through RCCMS carry a Class-3 Digital Signature Certificate of the presiding officer, making them legally valid under the Information Technology Act, 2000 and the Indian Evidence Act.',
      tags: ['digital signature', 'legal validity', 'IT Act'],
    },
  ];

  private observer!: IntersectionObserver;

  constructor(public cdr: ChangeDetectorRef) {}

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

  get filteredFaqs(): FaqItem[] {
    return this.allFaqs.filter((faq) => {
      const matchesCategory =
        this.activeCategory === 'all' || faq.categoryId === this.activeCategory;
      const q = this.searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        (faq.tags ?? []).some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }

  get activeCategoryColor(): string {
    return (
      this.categories.find((c) => c.id === this.activeCategory)?.color ??
      '#1a5cb8'
    );
  }

  setCategory(id: string): void {
    this.activeCategory = id;
    this.openItemId = null;
    this.cdr.markForCheck();
  }

  toggleItem(id: number): void {
    this.openItemId = this.openItemId === id ? null : id;
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.cdr.markForCheck();
  }

  getCategoryLabel(id: string): string {
    return this.categories.find((c) => c.id === id)?.label ?? id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackById(_: number, item: FaqItem): number {
    return item.id;
  }
}
