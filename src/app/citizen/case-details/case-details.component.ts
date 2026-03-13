import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CitizenCaseService,
  Case,
  CaseHistory,
  FormSchema,
  FormDataWithLabelsItem,
} from '../services/citizen-case.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** One row to show in Case Data section: label (from form schema) and value */
export interface CaseDataDisplayItem {
  label: string;
  value: string | number | null;
}

/** Group of form fields for display (e.g. "Applicant Details", "Area Details") */
export interface FormDataGroup {
  groupLabel: string;
  groupDisplayOrder: number;
  items: { fieldLabel: string; value: string | number | null }[];
}

@Component({
  selector: 'app-case-details',
  templateUrl: './case-details.component.html',
  styleUrls: ['./case-details.component.scss'],
})
export class CaseDetailsComponent implements OnInit {
  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;
  caseId!: number;
  case: Case | null = null;
  history: CaseHistory[] = [];
  documents: Array<{
    documentId: number;
    moduleType: string;
    moduleTypeLabel: string;
    status: string;
    hasContent: boolean;
    createdAt?: string;
    signedAt?: string;
  }> = [];

  isLoading = false;
  isLoadingHistory = false;
  returnComment = '';
  /** Case form data as label-value pairs (label from form schema); empty until schema + caseData loaded */
  caseDataDisplay: CaseDataDisplayItem[] = [];
  isLoadingCaseData = false;

  // Document related properties - now arrays to handle multiple documents
  notices: Array<{
    id: number;
    caseId: number;
    moduleType: string;
    templateId?: number;
    templateName?: string;
    contentHtml: string;
    contentData?: string;
    status: string;
    signedByOfficerId?: number;
    signedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  }> = [];

  ordersheets: Array<{
    id: number;
    caseId: number;
    moduleType: string;
    templateId?: number;
    templateName?: string;
    contentHtml: string;
    contentData?: string;
    status: string;
    signedByOfficerId?: number;
    signedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  }> = [];

  judgements: Array<{
    id: number;
    caseId: number;
    moduleType: string;
    templateId?: number;
    templateName?: string;
    contentHtml: string;
    contentData?: string;
    status: string;
    signedByOfficerId?: number;
    signedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  }> = [];

  isLoadingNotice = false;
  isLoadingOrdersheet = false;
  isLoadingJudgement = false;
  isAcceptingNotice = false;
  noticeNotAvailable = false;
  ordersheetNotAvailable = false;
  judgementNotAvailable = false;
  acknowledgeComments = 'Notice received and acknowledged';

  // Track which notice is being acknowledged (for multiple notices)
  acknowledgingNoticeId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CitizenCaseService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.caseId = +params['id'];
      if (this.caseId) {
        this.loadCaseDetail();
      }
    });
  }

  /**
   * Load complete case detail using new API endpoint
   */
  loadCaseDetail(): void {
    this.isLoading = true;
    this.caseService.getCaseDetail(this.caseId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          // Set case info
          this.case = response.data.caseInfo;
          console.log(this.case);

          // Set history
          this.history = response.data.history || [];

          // Set documents list
          this.documents = response.data.documents || [];

          // Find return for correction comment
          const returned = this.history
            .filter(
              (h) =>
                (h.toStateCode || h.toState?.stateCode) ===
                'RETURNED_FOR_CORRECTION',
            )
            .slice(-1)[0];
          if (returned?.comments) {
            this.returnComment = returned.comments;
          }

          // Load form data if needed
          if (this.case?.formDataWithLabels?.length) {
            this.caseDataDisplay = [];
          } else if (this.case?.caseData && this.case?.caseTypeId) {
            this.loadFormSchemaAndBuildCaseData();
          }

          // Load documents that are available
          this.loadAvailableDocuments();
        } else {
          this.snackBar.open(
            response.message || 'Failed to load case details',
            'Close',
            { duration: 5000 },
          );
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage =
          error?.error?.message ||
          error?.message ||
          'Failed to load case details';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      },
    });
  }

  /**
   * Load documents that are available based on documents list
   * Now loads all documents of each type (handles multiple notices/ordersheets)
   */
  loadAvailableDocuments(): void {
    // Load all Notices if available
    if (this.documents.some((d) => d.moduleType === 'NOTICE' && d.hasContent)) {
      this.loadAllNotices();
    }

    // Load all Ordersheets if available
    if (
      this.documents.some((d) => d.moduleType === 'ORDERSHEET' && d.hasContent)
    ) {
      this.loadAllOrdersheets();
    }

    // Load all Judgements if available
    if (
      this.documents.some((d) => d.moduleType === 'JUDGEMENT' && d.hasContent)
    ) {
      this.loadAllJudgements();
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  loadCaseDetails(): void {
    this.loadCaseDetail();
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  loadCaseHistory(): void {
    // History is now loaded with case detail
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'RETURNED_FOR_CORRECTION') {
      return 'badge-warning';
    } else if (status.includes('COMPLETED') || status.includes('APPROVED')) {
      return 'badge-success';
    } else if (status.includes('REJECTED') || status.includes('CANCELLED')) {
      return 'badge-danger';
    }
    return 'badge-info';
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  canResubmit(): boolean {
    return this.case?.status === 'RETURNED_FOR_CORRECTION';
  }

  navigateToResubmit(): void {
    if (this.caseId) {
      this.router.navigate(['/citizen/cases', this.caseId, 'resubmit']);
    }
  }

  /**
   * Group case.formDataWithLabels by groupLabel for organized display. Sorted by groupDisplayOrder, then by displayOrder.
   */
  get formDataGrouped(): FormDataGroup[] {
    const raw = this.case?.formDataWithLabels;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    const byGroup = new Map<string, FormDataWithLabelsItem[]>();
    for (const item of raw) {
      const key = item.fieldGroup || 'default';
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(item);
    }
    for (const arr of byGroup.values()) {
      arr.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }
    const groupLabelOrder = new Map<string, number>();
    raw.forEach((item) => {
      const k = item.fieldGroup || 'default';
      if (!groupLabelOrder.has(k))
        groupLabelOrder.set(k, item.groupDisplayOrder ?? 999);
    });
    const groups: FormDataGroup[] = [];
    byGroup.forEach((items, fieldGroup) => {
      const first = items[0];
      groups.push({
        groupLabel: first?.groupLabel || fieldGroup,
        groupDisplayOrder: first?.groupDisplayOrder ?? 999,
        items: items.map((i) => ({ fieldLabel: i.fieldLabel, value: i.value })),
      });
    });
    groups.sort((a, b) => a.groupDisplayOrder - b.groupDisplayOrder);
    return groups;
  }

  parseCaseData(caseData?: string): Record<string, unknown> | null {
    if (!caseData) return null;
    try {
      return JSON.parse(caseData) as Record<string, unknown>;
    } catch (e) {
      return null;
    }
  }

  /**
   * Load form schema for the case type and build caseDataDisplay (label-value pairs using field labels).
   */
  loadFormSchemaAndBuildCaseData(): void {
    if (!this.case?.caseTypeId || !this.case?.caseData) return;
    const caseData = this.parseCaseData(this.case.caseData);
    if (!caseData || typeof caseData !== 'object') return;
    console.log(this.case);

    this.isLoadingCaseData = true;
    this.caseService.getFormSchema(this.case.caseTypeId).subscribe({
      next: (response) => {
        this.isLoadingCaseData = false;
        if (response.success && response.data) {
          this.caseDataDisplay = this.buildCaseDataDisplay(
            caseData,
            response.data,
          );
        } else {
          this.caseDataDisplay =
            this.buildCaseDataDisplayWithoutSchema(caseData);
        }
      },
      error: () => {
        this.isLoadingCaseData = false;
        this.caseDataDisplay = this.buildCaseDataDisplayWithoutSchema(caseData);
      },
    });
  }

  /**
   * Build label-value list from caseData using form schema field labels. Order follows schema fields.
   */
  private buildCaseDataDisplay(
    caseData: Record<string, unknown>,
    schema: FormSchema,
  ): CaseDataDisplayItem[] {
    const nameToLabel = new Map<string, string>();
    const fieldOrder: string[] = [];
    if (schema.fields && schema.fields.length > 0) {
      schema.fields.forEach((f) => {
        nameToLabel.set(f.fieldName, f.fieldLabel || f.fieldName);
        fieldOrder.push(f.fieldName);
      });
    }
    if (schema.groups && schema.groups.length > 0) {
      schema.groups.forEach((g) => {
        (g.fields || []).forEach(
          (f: { fieldName: string; fieldLabel?: string }) => {
            if (!nameToLabel.has(f.fieldName)) {
              nameToLabel.set(f.fieldName, f.fieldLabel || f.fieldName);
              fieldOrder.push(f.fieldName);
            }
          },
        );
      });
    }

    const result: CaseDataDisplayItem[] = [];
    const seen = new Set<string>();
    for (const key of fieldOrder) {
      if (seen.has(key)) continue;
      seen.add(key);
      if (key in caseData) {
        result.push({
          label: nameToLabel.get(key) || this.formatFieldNameAsLabel(key),
          value: caseData[key] as string | number | null,
        });
      }
    }
    for (const key of Object.keys(caseData)) {
      if (seen.has(key)) continue;
      result.push({
        label: this.formatFieldNameAsLabel(key),
        value: caseData[key] as string | number | null,
      });
    }
    return result;
  }

  private buildCaseDataDisplayWithoutSchema(
    caseData: Record<string, unknown>,
  ): CaseDataDisplayItem[] {
    return Object.entries(caseData).map(([key, value]) => ({
      label: this.formatFieldNameAsLabel(key),
      value: value as string | number | null,
    }));
  }

  private formatFieldNameAsLabel(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Load all notice documents
   */
  loadAllNotices(): void {
    this.isLoadingNotice = true;
    this.noticeNotAvailable = false;

    this.caseService.getAllDocumentsByType(this.caseId, 'NOTICE').subscribe({
      next: (response) => {
        this.isLoadingNotice = false;
        if (response.success && response.data) {
          this.notices = response.data || [];
          // Sort by creation date (newest first)
          this.notices.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          if (this.notices.length === 0) {
            this.noticeNotAvailable = true;
          }
        } else {
          this.noticeNotAvailable = true;
        }
      },
      error: (error: any) => {
        this.isLoadingNotice = false;
        // 404 is expected if notice hasn't been sent yet
        if (error.status === 404 || error.notFound) {
          this.noticeNotAvailable = true;
        } else {
          console.error('Error loading notices:', error);
        }
      },
    });
  }

  /**
   * Load all ordersheet documents
   */
  loadAllOrdersheets(): void {
    this.isLoadingOrdersheet = true;
    this.ordersheetNotAvailable = false;

    this.caseService
      .getAllDocumentsByType(this.caseId, 'ORDERSHEET')
      .subscribe({
        next: (response) => {
          this.isLoadingOrdersheet = false;
          if (response.success && response.data) {
            this.ordersheets = response.data || [];
            // Sort by creation date (newest first)
            this.ordersheets.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA;
            });
            if (this.ordersheets.length === 0) {
              this.ordersheetNotAvailable = true;
            }
          } else {
            this.ordersheetNotAvailable = true;
          }
        },
        error: (error: any) => {
          this.isLoadingOrdersheet = false;
          if (error.status === 404 || error.notFound) {
            this.ordersheetNotAvailable = true;
          } else {
            console.error('Error loading ordersheets:', error);
          }
        },
      });
  }

  /**
   * Load all judgement documents
   */
  loadAllJudgements(): void {
    this.isLoadingJudgement = true;
    this.judgementNotAvailable = false;

    this.caseService.getAllDocumentsByType(this.caseId, 'JUDGEMENT').subscribe({
      next: (response) => {
        this.isLoadingJudgement = false;
        if (response.success && response.data) {
          this.judgements = response.data || [];
          // Sort by creation date (newest first)
          this.judgements.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          if (this.judgements.length === 0) {
            this.judgementNotAvailable = true;
          }
        } else {
          this.judgementNotAvailable = true;
        }
      },
      error: (error: any) => {
        this.isLoadingJudgement = false;
        if (error.status === 404 || error.notFound) {
          this.judgementNotAvailable = true;
        } else {
          console.error('Error loading judgements:', error);
        }
      },
    });
  }

  /**
   * Legacy methods - kept for backward compatibility
   */
  loadNotice(): void {
    this.loadAllNotices();
  }

  loadOrdersheet(): void {
    this.loadAllOrdersheets();
  }

  loadJudgement(): void {
    this.loadAllJudgements();
  }

  downloadDocument(document: any, documentType: string): void {
    if (!document || !document.contentHtml) {
      this.snackBar.open('Document content not available', 'Close', {
        duration: 3000,
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const createdDate = document.createdAt
        ? new Date(document.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : '';
      const signedDate = document.signedAt
        ? new Date(document.signedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : '';
      const generatedDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const statusClass = ['signed', 'final', 'draft'].includes(
        (document.status || '').toLowerCase(),
      )
        ? (document.status || '').toLowerCase()
        : 'default';

      printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${documentType} — ${this.case?.caseNumber || 'Case Document'}</title>
        <style>

          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          html { background: #dde1ea; }

          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 13px;
            color: #1a1a1a;
            background: #dde1ea;
            min-height: 100vh;
            padding: 28px 16px 56px;
          }

          .print-toolbar {
            max-width: 880px;
            margin: 0 auto 14px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 9px 22px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: opacity 0.15s;
          }
          .btn:hover { opacity: 0.85; }
          .btn-print { background: #0f2850; color: #fff; }
          .btn-close  { background: #c8cdd8; color: #333; }

          .paper {
            max-width: 880px;
            margin: 0 auto;
            background: #fff;
            box-shadow: 0 6px 40px rgba(0,0,0,0.22), 0 1px 6px rgba(0,0,0,0.10);
            border-radius: 3px;
            overflow: hidden;
          }

          /* ── Letterhead ── */
          .letterhead {
            background: #0f2850;
            background-image:
              radial-gradient(circle at 90% -10%, rgba(196,160,80,0.12) 0%, transparent 55%),
              radial-gradient(circle at -5% 110%, rgba(255,255,255,0.05) 0%, transparent 50%);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .letterhead-inner {
            padding: 26px 40px 20px;
            display: flex;
            align-items: center;
            gap: 22px;
          }

          .emblem {
            width: 68px; height: 68px;
            border-radius: 50%;
            border: 2px solid rgba(196,160,80,0.55);
            background: rgba(255,255,255,0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 26px;
          }

          .letterhead-text .gov-name {
            font-family: Arial, sans-serif;
            font-size: 17px; font-weight: 700;
            color: #fff;
            letter-spacing: 1.4px;
            text-transform: uppercase;
            line-height: 1.25; margin-bottom: 4px;
          }
          .letterhead-text .dept-name {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: rgba(196,160,80,0.92);
            letter-spacing: 0.4px; margin-bottom: 2px;
          }
          .letterhead-text .doc-sub {
            font-family: Arial, sans-serif;
            font-size: 10.5px;
            color: rgba(255,255,255,0.42);
          }

          .gold-bar {
            height: 4px;
            background: linear-gradient(90deg, #b8943a 0%, #e8c96a 50%, #b8943a 100%);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* ── Title Band ── */
          .title-band {
            background: #f4f6fb;
            border-bottom: 1px solid #dde3ef;
            padding: 16px 40px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .title-band .doc-title {
            font-family: Arial, sans-serif;
            font-size: 20px; font-weight: 700;
            color: #0f2850;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .title-band .doc-subtitle {
            font-family: Arial, sans-serif;
            font-size: 11.5px; color: #666; margin-top: 3px;
          }

          .status-chip {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 5px 15px; border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 11px; font-weight: 700;
            letter-spacing: 0.8px; text-transform: uppercase;
            white-space: nowrap; flex-shrink: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .status-chip.signed  { background: #e6f4ea; color: #1e6b2e; border: 1px solid #a8d5b0; }
          .status-chip.final   { background: #e3f0fd; color: #1455a4; border: 1px solid #9dc4f0; }
          .status-chip.draft   { background: #fff4e0; color: #8a5700; border: 1px solid #f5c96a; }
          .status-chip.default { background: #f0f0f0; color: #444;    border: 1px solid #ccc; }
          .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
          .signed  .status-dot { background: #2e8b47; }
          .final   .status-dot { background: #1a6ec4; }
          .draft   .status-dot { background: #e09400; }
          .default .status-dot { background: #999; }

          /* ── Meta Row ── */
          .meta-row {
            background: #fff;
            padding: 10px 40px;
            border-bottom: 1px solid #e8edf6;
            display: flex; flex-wrap: wrap; gap: 0;
          }
          .meta-item {
            display: flex; align-items: center; gap: 7px;
            padding: 3px 20px 3px 0; margin-right: 20px;
            border-right: 1px solid #dde3ef;
          }
          .meta-item:last-child { border-right: none; }
          .meta-label {
            font-family: Arial, sans-serif;
            font-size: 9.5px; color: #999;
            text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
          }
          .meta-value {
            font-family: Arial, sans-serif;
            font-size: 12px; color: #111; font-weight: 700;
          }

          /* ── Document Body ── */
          .doc-body {
            padding: 36px 48px 44px;
            background: #fff;
          }

          .doc-body * {
            font-family: 'Times New Roman', Times, serif !important;
            line-height: 1.85 !important;
            color: #1a1a1a;
          }

          .doc-body p, .doc-body div {
            margin-bottom: 6px;
            text-align: left;
          }

          .doc-body h1, .doc-body h2, .doc-body h3,
          .doc-body h4, .doc-body h5, .doc-body h6 {
            font-family: Arial, sans-serif !important;
            font-weight: 700 !important;
            color: #0f2850 !important;
            margin: 18px 0 8px !important;
            line-height: 1.3 !important;
          }
          .doc-body h1 { font-size: 16px !important; }
          .doc-body h2 { font-size: 14px !important; }
          .doc-body h3 { font-size: 13px !important; }

          .doc-body strong, .doc-body b {
            font-weight: 700 !important; color: #111 !important;
          }

          /* ── Ordersheet specific styling ── */
          .doc-body .ordersheet-title {
            font-family: Arial, sans-serif !important;
            font-size: 18px !important;
            font-weight: 700 !important;
            color: #0f2850 !important;
            text-align: center !important;
            letter-spacing: 2px !important;
            margin-bottom: 20px !important;
            padding-bottom: 10px !important;
            border-bottom: 2px solid #0f2850 !important;
          }

          .doc-body .ordersheet-field {
            display: flex !important;
            gap: 8px !important;
            margin-bottom: 8px !important;
            padding: 6px 0 !important;
            border-bottom: 1px solid #f0f0f0 !important;
          }

          .doc-body .ordersheet-field-label {
            font-weight: 700 !important;
            color: #0f2850 !important;
            min-width: 160px !important;
          }

          /* Tables */
          .doc-body table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 16px 0 !important;
            font-size: 12px !important;
          }
          .doc-body table th {
            background: #0f2850 !important;
            color: #fff !important;
            font-family: Arial, sans-serif !important;
            font-weight: 700 !important;
            padding: 8px 12px !important;
            text-align: left !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .doc-body table td {
            padding: 7px 12px !important;
            border: 1px solid #dde3ef !important;
          }
          .doc-body table tr:nth-child(even) td {
            background: #f7f9fd !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .doc-body hr {
            border: none !important;
            border-top: 1px solid #dde3ef !important;
            margin: 20px 0 !important;
          }

          /* ── Two-column party layout (injected by JS) ── */
          .party-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            gap: 24px !important;
            margin-bottom: 16px !important;
          }
          .party-left  { flex: 1; min-width: 0; }
          .party-right { flex: 1; min-width: 0; text-align: right; }
          .party-right * { text-align: right !important; }

          /* ── Signature ── */
          .signature-section {
            margin-top: 52px; padding-top: 20px;
            border-top: 1px solid #dde3ef;
            display: flex; justify-content: flex-end;
          }
          .signature-block { text-align: center; min-width: 200px; }
          .signature-line { height: 1px; background: #555; margin-bottom: 7px; }
          .signature-label {
            font-family: Arial, sans-serif !important;
            font-size: 11px; color: #555;
            text-transform: uppercase; letter-spacing: 0.5px;
          }
          .signature-date {
            font-family: Arial, sans-serif !important;
            font-size: 11px; color: #999; margin-top: 3px;
          }

          /* ── Footer ── */
          .doc-footer {
            background: #0f2850;
            padding: 11px 40px;
            display: flex; align-items: center;
            justify-content: space-between; gap: 16px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .footer-note {
            font-family: Arial, sans-serif;
            font-size: 9.5px; color: rgba(196,160,80,0.85); font-style: italic;
          }
          .footer-case {
            font-family: Arial, sans-serif;
            font-size: 9.5px; color: rgba(255,255,255,0.45); white-space: nowrap;
          }

          /* ── Print ── */
          @media print {
            html, body {
              background: #fff !important; padding: 0 !important; margin: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .paper { max-width: 100% !important; box-shadow: none !important; border-radius: 0 !important; }
            .letterhead { background: #0f2850 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .gold-bar { background: linear-gradient(90deg, #b8943a 0%, #e8c96a 50%, #b8943a 100%) !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .title-band { background: #f4f6fb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .doc-footer { background: #0f2850 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .doc-body table th { background: #0f2850 !important; color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .doc-body table tr:nth-child(even) td { background: #f7f9fd !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }

        </style>
      </head>
      <body>

        <div class="print-toolbar no-print">
          <button class="btn btn-close" onclick="window.close()">✕ Close</button>
          <button class="btn btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
        </div>

        <div class="paper">

          <div class="letterhead">
            <div class="letterhead-inner">
              <div class="emblem">⚖</div>
              <div class="letterhead-text">
                <div class="gov-name">Government of Chandigarh</div>
                <div class="dept-name">Department of Legal Affairs</div>
                <div class="doc-sub">Official Legal Document — Confidential</div>
              </div>
            </div>
            <div class="gold-bar"></div>
          </div>

          <div class="title-band">
            <div>
              <div class="doc-title">${documentType}</div>
              <div class="doc-subtitle">
                Case No: ${this.case?.caseNumber || '—'}
                ${this.case?.subject ? '&nbsp;|&nbsp;' + this.case.subject : ''}
              </div>
            </div>
            <div class="status-chip ${statusClass}">
              <span class="status-dot"></span>
              ${document.status || 'N/A'}
            </div>
          </div>

          <div class="meta-row">
            ${createdDate ? `<div class="meta-item"><span class="meta-label">Created</span><span class="meta-value">${createdDate}</span></div>` : ''}
            ${signedDate ? `<div class="meta-item"><span class="meta-label">Signed</span><span class="meta-value">${signedDate}</span></div>` : ''}
            <div class="meta-item"><span class="meta-label">Generated</span><span class="meta-value">${generatedDate}</span></div>
            ${this.case?.priority ? `<div class="meta-item"><span class="meta-label">Priority</span><span class="meta-value">${this.case.priority}</span></div>` : ''}
          </div>

          <div class="doc-body" id="docBody">
            ${document.contentHtml}
            ${
              signedDate
                ? `
            <div class="signature-section">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Authorised Signatory</div>
                <div class="signature-date">Signed on: ${signedDate}</div>
              </div>
            </div>`
                : ''
            }
          </div>

          <div class="doc-footer">
            <span class="footer-note">This is a system-generated document. No manual signature required unless stated.</span>
            <span class="footer-case">${this.case?.caseNumber || ''}</span>
          </div>

        </div>

        <script>
  document.addEventListener('DOMContentLoaded', function () {
    var body = document.getElementById('docBody');
    if (!body) return;

    var docType = '${documentType}'.toUpperCase();

    // ── ORDERSHEET ────────────────────────────────────────────────────────
    if (docType.includes('ORDER')) {
      var allNodes = Array.from(body.querySelectorAll('p, div'));
      allNodes.forEach(function (el) {
        var text = (el.innerText || el.textContent || '').trim();
        if (!text) return;

        if (text.toUpperCase() === 'ORDERSHEET' || text.toUpperCase() === 'ORDER SHEET') {
          el.style.fontFamily = 'Arial, sans-serif';
          el.style.fontSize = '18px';
          el.style.fontWeight = '700';
          el.style.color = '#0f2850';
          el.style.textAlign = 'center';
          el.style.letterSpacing = '2px';
          el.style.paddingBottom = '10px';
          el.style.borderBottom = '2px solid #0f2850';
          el.style.marginBottom = '20px';
          return;
        }

        if (text.includes(':')) {
          var colonIdx = text.indexOf(':');
          var label = text.substring(0, colonIdx).trim();
          var value = text.substring(colonIdx + 1).trim();
          if (label && label.split(' ').length <= 5) {
            el.innerHTML =
              '<span style="font-weight:700;color:#0f2850;font-family:Arial,sans-serif;min-width:160px;display:inline-block;">'
              + label + ':</span>'
              + '<span style="color:#1a1a1a;">' + value + '</span>';
            el.style.display = 'flex';
            el.style.gap = '8px';
            el.style.padding = '6px 0';
            el.style.borderBottom = '1px solid #f0f0f0';
          }
        }

        if (text.startsWith('[') || text.length > 60) {
          el.style.marginTop = '20px';
          el.style.padding = '16px';
          el.style.background = '#f7f9fd';
          el.style.borderLeft = '3px solid #0f2850';
          el.style.borderRadius = '0 4px 4px 0';
          el.style.lineHeight = '1.8';
        }
      });
      return;
    }

    // ── NOTICE: collect only TRUE LEAF nodes (no element children) ────────
    function getLeafElements(root) {
      var leaves = [];
      var all = Array.from(root.querySelectorAll('*'));
      all.forEach(function(el) {
        // A true leaf: no child ELEMENTS (may have text nodes)
        var hasElementChildren = Array.from(el.children).some(function(c) {
          return c.nodeType === 1;
        });
        if (!hasElementChildren) {
          var text = (el.innerText || el.textContent || '').trim();
          if (text.length > 0) {
            leaves.push(el);
          }
        }
      });
      return leaves;
    }

    var leaves = getLeafElements(body);

    var matterIdx = -1;
    var utIdx     = -1;
    var endIdx    = -1;

    var endKeywords = ['subject:', 'case nature', 'whereas', 'notice / summons', 'notice/summons', 'summons'];

    leaves.forEach(function(el, idx) {
      var text  = (el.innerText || el.textContent || '').trim();
      var lower = text.toLowerCase();
      var upper = text.toUpperCase();

      if (utIdx === -1 && upper.includes('UT CHANDIGARH')) {
        utIdx = idx;
      }
      if (matterIdx === -1 && lower.includes('in the matter of')) {
        matterIdx = idx;
      }
      if (matterIdx > -1 && endIdx === -1 && idx > matterIdx) {
        if (endKeywords.some(function(k){ return lower.startsWith(k); })) {
          endIdx = idx;
        }
      }
    });

    if (matterIdx === -1) return;
    if (endIdx === -1) endIdx = matterIdx + 8;

    var leftLeaves  = utIdx > -1 ? leaves.slice(utIdx, matterIdx) : [];
    var rightLeaves = leaves.slice(matterIdx, endIdx);

    if (rightLeaves.length === 0) return;

    // Find the docBody-level ancestor of the first relevant node
    var firstNode = leftLeaves.length > 0 ? leftLeaves[0] : rightLeaves[0];
    var anchor = firstNode;
    while (anchor.parentElement && anchor.parentElement.id !== 'docBody') {
      anchor = anchor.parentElement;
    }

    // Build columns using only the leaf text content (not outerHTML to avoid duplication)
    var leftHtml = leftLeaves.map(function(el) {
      var text = (el.innerText || el.textContent || '').trim();
      var tag  = el.tagName.toLowerCase();
      // Preserve bold/strong if original element was bold
      var isBold = el.style.fontWeight === 'bold' || el.tagName === 'STRONG' || el.tagName === 'B'
        || window.getComputedStyle(el).fontWeight >= 600;
      return '<div style="margin-bottom:5px;line-height:1.7;' + (isBold ? 'font-weight:700;' : '') + '">' + text + '</div>';
    }).join('');

    var rightHtml = rightLeaves.map(function(el) {
      var text = (el.innerText || el.textContent || '').trim();
      var isBold = el.style.fontWeight === 'bold' || el.tagName === 'STRONG' || el.tagName === 'B'
        || window.getComputedStyle(el).fontWeight >= 600;
      return '<div style="text-align:right;margin-bottom:5px;line-height:1.7;' + (isBold ? 'font-weight:700;' : '') + '">' + text + '</div>';
    }).join('');

    // Create flex row
    var row = document.createElement('div');
    row.className = 'party-row';
    row.innerHTML =
      '<div class="party-left">'  + leftHtml  + '</div>' +
      '<div class="party-right">' + rightHtml + '</div>';

    // Insert before the anchor (docBody-level element)
    if (anchor && anchor.parentElement) {
      anchor.parentElement.insertBefore(row, anchor);
    }

    // Hide the original docBody-level ancestors of all affected leaves
    var hidden = new Set();
    leftLeaves.concat(rightLeaves).forEach(function(el) {
      var hide = el;
      while (hide.parentElement && hide.parentElement.id !== 'docBody') {
        hide = hide.parentElement;
      }
      if (!hidden.has(hide)) {
        hidden.add(hide);
        hide.style.display = 'none';
      }
    });
  });
</script>

      </body>
      </html>
    `);

      printWindow.document.close();
      setTimeout(() => printWindow.focus(), 300);
    }
  }

  /**
   * Accept/Acknowledge notice receipt
   * @param noticeId Optional - if provided, acknowledges specific notice
   */
  acknowledgeNotice(noticeId?: number): void {
    if (
      !confirm('Acknowledge that you have received and reviewed this notice?')
    ) {
      return;
    }

    this.isAcceptingNotice = true;
    this.acknowledgingNoticeId = noticeId || null;

    this.caseService
      .acceptNotice(this.caseId, 'NOTICE', this.acknowledgeComments)
      .subscribe({
        next: (response) => {
          this.isAcceptingNotice = false;
          this.acknowledgingNoticeId = null;
          if (response.success) {
            this.snackBar.open(
              'Notice acknowledged successfully. This has been recorded in case history.',
              'Close',
              {
                duration: 5000,
                panelClass: ['success-snackbar'],
              },
            );
            // Reload history to show the acknowledgment
            this.loadCaseDetail();
          } else {
            this.snackBar.open(
              response.message || 'Failed to acknowledge notice',
              'Close',
              { duration: 5000 },
            );
          }
        },
        error: (error) => {
          this.isAcceptingNotice = false;
          this.acknowledgingNoticeId = null;
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to acknowledge notice';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        },
      });
  }

  /**
   * Check if notice can be acknowledged (not yet acknowledged)
   * @param noticeId Optional - check for specific notice
   */
  canAcknowledgeNotice(noticeId?: number): boolean {
    // Check if there's already an acknowledgment in history for this notice
    // For now, check if any notice has been acknowledged
    const hasAcknowledgment = this.history.some(
      (h) =>
        h.performedByRole === 'CITIZEN' &&
        h.comments &&
        (h.comments.toLowerCase().includes('acknowledged') ||
          h.comments.toLowerCase().includes('received')),
    );
    return !hasAcknowledgment;
  }

  /**
   * Get document display title with date
   */
  getDocumentTitle(document: any, index: number): string {
    const date = document.createdAt
      ? new Date(document.createdAt).toLocaleDateString()
      : '';
    const count =
      document.moduleType === 'NOTICE'
        ? this.notices.length
        : document.moduleType === 'ORDERSHEET'
          ? this.ordersheets.length
          : this.judgements.length;

    if (count > 1) {
      return `${document.moduleType} #${count - index} ${date ? `(${date})` : ''}`;
    }
    return document.moduleType;
  }

  generatePdf() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const safe = (val: any): string => {
      if (val == null) return '—';
      // Normalize unicode/encoded characters to ASCII-safe string
      return String(val).replace(/[^\x00-\x7F]/g, (c) => {
        try {
          return c.normalize('NFC');
        } catch {
          return '?';
        }
      });
    };

    const addPageIfNeeded = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 18) {
        doc.addPage();
        y = margin;
        drawPageHeader();
      }
    };

    // ── Page Header (repeated on every page) ─────────────────────────────────

    const drawPageHeader = () => {
      // Dark navy top bar
      doc.setFillColor(15, 40, 80);
      doc.rect(0, 0, pageWidth, 22, 'F');

      // Gold accent line
      doc.setFillColor(196, 160, 80);
      doc.rect(0, 22, pageWidth, 1.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('GOVERNMENT OF CHANDIGARH', pageWidth / 2, 9, {
        align: 'center',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(196, 160, 80);
      doc.text(
        'Department of LRISD   •   Official Case Document',
        pageWidth / 2,
        16,
        { align: 'center' },
      );

      doc.setTextColor(0, 0, 0);
      y = 30;
    };

    // ── Title Block (first page only) ────────────────────────────────────────

    const drawTitleBlock = () => {
      // Light steel background for title area
      doc.setFillColor(240, 244, 250);
      doc.rect(margin, y, contentWidth, 18, 'F');

      doc.setDrawColor(15, 40, 80);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, 18, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 40, 80);
      doc.text('CASE DETAIL REPORT', pageWidth / 2, y + 8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const now = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      doc.text(`Generated on: ${now}`, pageWidth / 2, y + 14, {
        align: 'center',
      });
      doc.setTextColor(0, 0, 0);
      y += 22;
    };

    // ── Section Header ────────────────────────────────────────────────────────

    const addSectionTitle = (title: string) => {
      addPageIfNeeded(16);

      // Navy left accent bar
      doc.setFillColor(15, 40, 80);
      doc.rect(margin, y, 3, 8, 'F');

      // Steel blue section background
      doc.setFillColor(228, 235, 245);
      doc.rect(margin + 3, y, contentWidth - 3, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 40, 80);
      doc.text(title.toUpperCase(), margin + 8, y + 5.5);
      doc.setTextColor(0, 0, 0);
      y += 12;
    };

    // ── Key-Value Row (single full-width row, robust) ─────────────────────────

    const addRow = (
      label: string,
      value: string | number | null | undefined,
      isAlternate: boolean,
    ) => {
      const displayValue = safe(value);
      const labelColWidth = 55;
      const valueColWidth = contentWidth - labelColWidth;

      // Pre-calculate wrapped value height
      doc.setFontSize(8.5);
      const valueLines = doc.splitTextToSize(displayValue, valueColWidth - 4);
      const rowHeight = Math.max(8, valueLines.length * 5 + 4);

      addPageIfNeeded(rowHeight);

      // Alternating row background
      if (isAlternate) {
        doc.setFillColor(247, 250, 255);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      // Row border
      doc.setDrawColor(210, 218, 230);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, contentWidth, rowHeight, 'S');

      // Vertical divider between label and value
      doc.line(
        margin + labelColWidth,
        y,
        margin + labelColWidth,
        y + rowHeight,
      );

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(60, 80, 110);
      doc.text(label, margin + 3, y + rowHeight / 2 + 1.5);

      // Value
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(valueLines, margin + labelColWidth + 3, y + 5);

      y += rowHeight;
    };

    // ── Footer ────────────────────────────────────────────────────────────────

    const addFooters = () => {
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Footer bar
        doc.setFillColor(15, 40, 80);
        doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

        doc.setFontSize(7);
        doc.setTextColor(196, 160, 80);
        doc.setFont('helvetica', 'italic');
        doc.text(
          'This is a system-generated document. No signature is required.',
          margin,
          pageHeight - 4,
        );
        doc.setFont('helvetica', 'bold');
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 4,
          { align: 'right' },
        );
      }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // BUILD PDF
    // ═════════════════════════════════════════════════════════════════════════

    drawPageHeader();
    drawTitleBlock();

    // ── 1. Case Information ───────────────────────────────────────────────────
    addSectionTitle('Case Information');

    const caseFields: [string, string][] = [
      ['Case Number', safe(this.case?.caseNumber)],
      ['Subject', safe(this.case?.subject)],
      ['Status', safe(this.getStatusLabel(this.case?.status || ''))],
      ['Priority', safe(this.case?.priority)],
      ['Description', safe(this.case?.description)],
      [
        'Created Date',
        this.case?.createdAt
          ? new Date(this.case.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
          : '—',
      ],
    ];

    caseFields.forEach(([label, value], idx) =>
      addRow(label, value, idx % 2 === 0),
    );
    y += 6;

    // ── 2. Application / Form Data ────────────────────────────────────────────
    if (this.formDataGrouped.length > 0) {
      for (const group of this.formDataGrouped) {
        addSectionTitle(safe(group.groupLabel) || 'Application Data');
        group.items.forEach((item: any, idx: number) =>
          addRow(safe(item.fieldLabel), item.value, idx % 2 === 0),
        );
        y += 6;
      }
    } else if (this.caseDataDisplay.length > 0) {
      addSectionTitle('Application Data');
      this.caseDataDisplay.forEach((item: any, idx: number) =>
        addRow(safe(item.label), item.value, idx % 2 === 0),
      );
      y += 6;
    }

    // ── 3. Documents Summary ──────────────────────────────────────────────────
    const allDocs = [
      ...this.notices.map((d) => ({ ...d, type: 'Notice' })),
      ...this.ordersheets.map((d) => ({ ...d, type: 'Ordersheet' })),
      ...this.judgements.map((d) => ({ ...d, type: 'Judgement' })),
    ];

    if (allDocs.length > 0) {
      addPageIfNeeded(20);
      addSectionTitle('Case Documents');

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Type', 'Status', 'Created', 'Signed']],
        body: allDocs.map((d, idx) => [
          safe(idx + 1),
          safe(d.type),
          safe(d.status),
          d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : '—',
          d.signedAt
            ? new Date(d.signedAt).toLocaleDateString('en-IN')
            : 'Not signed',
        ]),
        headStyles: {
          fillColor: [15, 40, 80],
          textColor: [196, 160, 80],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [247, 250, 255] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 28 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
        },
        theme: 'grid',
        tableLineColor: [210, 218, 230],
        tableLineWidth: 0.2,
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── 4. Case History ───────────────────────────────────────────────────────
    if (this.history.length > 0) {
      addPageIfNeeded(20);
      addSectionTitle('Case History');

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [
          [
            '#',
            'State',
            'Transition',
            'From State',
            'Performed By',
            'Date',
            'Comments',
          ],
        ],
        body: this.history.map((item: any, idx: number) => [
          safe(idx + 1),
          safe(item.toStateName || item.toState?.stateName),
          safe(item.transitionName),
          safe(item.fromStateName),
          safe(item.performedByRole),
          item.performedAt
            ? new Date(item.performedAt).toLocaleDateString('en-IN')
            : '—',
          safe(item.comments),
        ]),
        headStyles: {
          fillColor: [15, 40, 80],
          textColor: [196, 160, 80],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
        },
        bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [247, 250, 255] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 28 },
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
          6: { cellWidth: 28 },
        },
        theme: 'grid',
        tableLineColor: [210, 218, 230],
        tableLineWidth: 0.2,
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Finalize ──────────────────────────────────────────────────────────────
    addFooters();
    doc.save(`Case-${safe(this.case?.caseNumber)}.pdf`);
  }
}
