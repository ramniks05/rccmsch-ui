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
  isLoading = false;
  isLoadingHistory = false;
  returnComment = '';
  /** Case form data as label-value pairs (label from form schema); empty until schema + caseData loaded */
  caseDataDisplay: CaseDataDisplayItem[] = [];
  isLoadingCaseData = false;
  
  // Notice related properties
  notice: any = null;
  isLoadingNotice = false;
  isAcceptingNotice = false;
  noticeNotAvailable = false;
  acknowledgeComments = 'Notice received and acknowledged';

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
        this.loadCaseDetails();
        this.loadCaseHistory();
        this.loadNotice();
      }
    });
  }

  loadCaseDetails(): void {
    this.isLoading = true;
    this.caseDataDisplay = [];
    this.caseService.getCaseById(this.caseId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.case = response.data;
          if (this.case?.formDataWithLabels?.length) {
            this.caseDataDisplay = [];
          } else if (this.case?.caseData && this.case?.caseTypeId) {
            this.loadFormSchemaAndBuildCaseData();
          }
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

  loadCaseHistory(): void {
    this.isLoadingHistory = true;
    this.caseService.getCaseHistory(this.caseId).subscribe({
      next: (response) => {
        this.isLoadingHistory = false;
        if (response.success) {
          this.history = response.data || [];
          // Find return for correction comment
          const returned = this.history
            .filter(h => (h.toStateCode || h.toState?.stateCode) === 'RETURNED_FOR_CORRECTION')
            .slice(-1)[0];
          if (returned?.comments) {
            this.returnComment = returned.comments;
          }
        }
      },
      error: (error) => {
        this.isLoadingHistory = false;
        console.error('Error loading case history:', error);
      }
    });
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
   * Load notice sent to applicant
   */
  loadNotice(): void {
    this.isLoadingNotice = true;
    this.noticeNotAvailable = false;
    
    this.caseService.getNoticeForApplicant(this.caseId, 'NOTICE').subscribe({
      next: (response) => {
        this.isLoadingNotice = false;
        if (response.success && response.data) {
          this.notice = response.data;
        }
      },
      error: (error: any) => {
        this.isLoadingNotice = false;
        // 404 is expected if notice hasn't been sent yet
        if (error.status === 404 || error.notFound) {
          this.noticeNotAvailable = true;
        } else {
          console.error('Error loading notice:', error);
        }
      }
    });
  }

  /**
   * Accept/Acknowledge notice receipt
   */
  acknowledgeNotice(): void {
    if (!confirm('Acknowledge that you have received and reviewed this notice?')) {
      return;
    }

    this.isAcceptingNotice = true;
    
    this.caseService.acceptNotice(this.caseId, 'NOTICE', this.acknowledgeComments).subscribe({
      next: (response) => {
        this.isAcceptingNotice = false;
        if (response.success) {
          this.snackBar.open('Notice acknowledged successfully. This has been recorded in case history.', 'Close', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          // Reload history to show the acknowledgment
          this.loadCaseHistory();
          // Reload notice to update status
          this.loadNotice();
        } else {
          this.snackBar.open(response.message || 'Failed to acknowledge notice', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isAcceptingNotice = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to acknowledge notice';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Check if notice can be acknowledged (not yet acknowledged)
   */
  canAcknowledgeNotice(): boolean {
    // Check if there's already an acknowledgment in history
    const hasAcknowledgment = this.history.some(h => 
      h.performedByRole === 'CITIZEN' && 
      h.comments && 
      (h.comments.toLowerCase().includes('acknowledged') || 
       h.comments.toLowerCase().includes('received'))
    );
    return !hasAcknowledgment;
  }
}
