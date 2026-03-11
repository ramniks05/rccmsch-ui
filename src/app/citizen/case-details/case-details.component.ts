import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitizenCaseService, Case, CaseHistory, FormSchema, FormDataWithLabelsItem } from '../services/citizen-case.service';

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
  styleUrls: ['./case-details.component.scss']
})
export class CaseDetailsComponent implements OnInit {
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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
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
          
          // Set history
          this.history = response.data.history || [];
          
          // Set documents list
          this.documents = response.data.documents || [];
          
          // Find return for correction comment
          const returned = this.history
            .filter(h => (h.toStateCode || h.toState?.stateCode) === 'RETURNED_FOR_CORRECTION')
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
          this.snackBar.open(response.message || 'Failed to load case details', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load case details';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Load documents that are available based on documents list
   * Now loads all documents of each type (handles multiple notices/ordersheets)
   */
  loadAvailableDocuments(): void {
    // Load all Notices if available
    if (this.documents.some(d => d.moduleType === 'NOTICE' && d.hasContent)) {
      this.loadAllNotices();
    }
    
    // Load all Ordersheets if available
    if (this.documents.some(d => d.moduleType === 'ORDERSHEET' && d.hasContent)) {
      this.loadAllOrdersheets();
    }
    
    // Load all Judgements if available
    if (this.documents.some(d => d.moduleType === 'JUDGEMENT' && d.hasContent)) {
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
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    raw.forEach(item => {
      const k = item.fieldGroup || 'default';
      if (!groupLabelOrder.has(k)) groupLabelOrder.set(k, item.groupDisplayOrder ?? 999);
    });
    const groups: FormDataGroup[] = [];
    byGroup.forEach((items, fieldGroup) => {
      const first = items[0];
      groups.push({
        groupLabel: first?.groupLabel || fieldGroup,
        groupDisplayOrder: first?.groupDisplayOrder ?? 999,
        items: items.map(i => ({ fieldLabel: i.fieldLabel, value: i.value }))
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

    this.isLoadingCaseData = true;
    this.caseService.getFormSchema(this.case.caseTypeId).subscribe({
      next: (response) => {
        this.isLoadingCaseData = false;
        if (response.success && response.data) {
          this.caseDataDisplay = this.buildCaseDataDisplay(caseData, response.data);
        } else {
          this.caseDataDisplay = this.buildCaseDataDisplayWithoutSchema(caseData);
        }
      },
      error: () => {
        this.isLoadingCaseData = false;
        this.caseDataDisplay = this.buildCaseDataDisplayWithoutSchema(caseData);
      }
    });
  }

  /**
   * Build label-value list from caseData using form schema field labels. Order follows schema fields.
   */
  private buildCaseDataDisplay(caseData: Record<string, unknown>, schema: FormSchema): CaseDataDisplayItem[] {
    const nameToLabel = new Map<string, string>();
    const fieldOrder: string[] = [];
    if (schema.fields && schema.fields.length > 0) {
      schema.fields.forEach(f => {
        nameToLabel.set(f.fieldName, f.fieldLabel || f.fieldName);
        fieldOrder.push(f.fieldName);
      });
    }
    if (schema.groups && schema.groups.length > 0) {
      schema.groups.forEach(g => {
        (g.fields || []).forEach((f: { fieldName: string; fieldLabel?: string }) => {
          if (!nameToLabel.has(f.fieldName)) {
            nameToLabel.set(f.fieldName, f.fieldLabel || f.fieldName);
            fieldOrder.push(f.fieldName);
          }
        });
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
          value: caseData[key] as string | number | null
        });
      }
    }
    for (const key of Object.keys(caseData)) {
      if (seen.has(key)) continue;
      result.push({
        label: this.formatFieldNameAsLabel(key),
        value: caseData[key] as string | number | null
      });
    }
    return result;
  }

  private buildCaseDataDisplayWithoutSchema(caseData: Record<string, unknown>): CaseDataDisplayItem[] {
    return Object.entries(caseData).map(([key, value]) => ({
      label: this.formatFieldNameAsLabel(key),
      value: value as string | number | null
    }));
  }

  private formatFieldNameAsLabel(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
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
      }
    });
  }

  /**
   * Load all ordersheet documents
   */
  loadAllOrdersheets(): void {
    this.isLoadingOrdersheet = true;
    this.ordersheetNotAvailable = false;
    
    this.caseService.getAllDocumentsByType(this.caseId, 'ORDERSHEET').subscribe({
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
      }
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
      }
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

  /**
   * Download/Print document
   */
  downloadDocument(document: any, documentType: string): void {
    if (!document || !document.contentHtml) {
      this.snackBar.open('Document content not available', 'Close', { duration: 3000 });
      return;
    }

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${documentType} - ${this.case?.caseNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${document.contentHtml}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  /**
   * Accept/Acknowledge notice receipt
   * @param noticeId Optional - if provided, acknowledges specific notice
   */
  acknowledgeNotice(noticeId?: number): void {
    if (!confirm('Acknowledge that you have received and reviewed this notice?')) {
      return;
    }

    this.isAcceptingNotice = true;
    this.acknowledgingNoticeId = noticeId || null;
    
    this.caseService.acceptNotice(this.caseId, 'NOTICE', this.acknowledgeComments).subscribe({
      next: (response) => {
        this.isAcceptingNotice = false;
        this.acknowledgingNoticeId = null;
        if (response.success) {
          this.snackBar.open('Notice acknowledged successfully. This has been recorded in case history.', 'Close', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          // Reload history to show the acknowledgment
          this.loadCaseDetail();
        } else {
          this.snackBar.open(response.message || 'Failed to acknowledge notice', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isAcceptingNotice = false;
        this.acknowledgingNoticeId = null;
        const errorMessage = error?.error?.message || error?.message || 'Failed to acknowledge notice';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Check if notice can be acknowledged (not yet acknowledged)
   * @param noticeId Optional - check for specific notice
   */
  canAcknowledgeNotice(noticeId?: number): boolean {
    // Check if there's already an acknowledgment in history for this notice
    // For now, check if any notice has been acknowledged
    const hasAcknowledgment = this.history.some(h => 
      h.performedByRole === 'CITIZEN' && 
      h.comments && 
      (h.comments.toLowerCase().includes('acknowledged') || 
       h.comments.toLowerCase().includes('received'))
    );
    return !hasAcknowledgment;
  }

  /**
   * Get document display title with date
   */
  getDocumentTitle(document: any, index: number): string {
    const date = document.createdAt ? new Date(document.createdAt).toLocaleDateString() : '';
    const count = document.moduleType === 'NOTICE' ? this.notices.length :
                  document.moduleType === 'ORDERSHEET' ? this.ordersheets.length :
                  this.judgements.length;
    
    if (count > 1) {
      return `${document.moduleType} #${count - index} ${date ? `(${date})` : ''}`;
    }
    return document.moduleType;
  }
}
