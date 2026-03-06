import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil, finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AdvancedSettingsService } from 'src/app/core/services/advanced-settings.service';


export interface DocumentAvailable {
  id?: number;
  title: string;
  filePath: string;
  createdAt?: Date;
}

type LoadState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, MatIconModule, DatePipe],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent implements OnInit, OnDestroy {
  /** Override the API endpoint from the parent if needed */
  @Input() apiUrl = '/api/admin/system-settings/document/fetch/document-list';

  /** Link used by the "Browse All Documents" footer button */
  @Input() browseAllLink = '/documents';

  /** Card title shown in the header */
  @Input() cardTitle = 'Legal Documents';

  // ── State ─────────────────────────────────────────
  loadState: LoadState = 'loading';
  documents: DocumentAvailable[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private advancedSettingsService: AdvancedSettingsService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────

  ngOnInit(): void {
    this.fetchDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── API call ──────────────────────────────────────

  fetchDocuments(): void {
    this.loadState = 'loading';
    this.cdr.markForCheck();
    this.advancedSettingsService.getAllDocumentsAvailable()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cdr.markForCheck()),
      )
      .subscribe({
        next: (data) => {
          this.documents = data.data || [];
          this.loadState = 'success';
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadState = 'error';
          this.cdr.markForCheck();
        },
      });
  }

  // ── Helpers ───────────────────────────────────────

  getFileUrl(filePath: string): string {
    return filePath?.startsWith('http') ? filePath : `/api/files/${filePath}`;
  }

  getFileType(filePath: string): string {
    return (filePath?.split('.').pop() ?? 'FILE').toUpperCase();
  }

  isPdf(filePath: string): boolean {
    return filePath?.toLowerCase().endsWith('.pdf');
  }

  /** Returns the correct mat-icon name for the file type */
  getDocMatIcon(filePath: string): string {
    const ext = (filePath?.split('.').pop() ?? '').toLowerCase();
    if (ext === 'pdf') return 'picture_as_pdf';
    return 'description';
  }

  /** CSS class applied to the badge pill — drives its colour */
  getTypeBadgeClass(filePath: string): string {
    const ext = (filePath?.split('.').pop() ?? '').toLowerCase();
    const map: Record<string, string> = {
      pdf:  'badge--pdf',
      doc:  'badge--doc',  docx: 'badge--doc',
      jpg:  'badge--img',  jpeg: 'badge--img', png: 'badge--img',
      xls:  'badge--xls',  xlsx: 'badge--xls',
    };
    return map[ext] ?? 'badge--default';
  }

  /** CSS class applied to the icon wrapper — drives its colour */
  getIconWrapperClass(filePath: string): string {
    const ext = (filePath?.split('.').pop() ?? '').toLowerCase();
    return ext === 'pdf' ? 'icon-wrap--pdf' : 'icon-wrap--doc';
  }

  /** Sanitised SVG for the download arrow — avoids XSS warning */
  get downloadIconSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.2"
            stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>`,
    );
  }

  trackById(_: number, doc: DocumentAvailable): any {
    return doc.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
