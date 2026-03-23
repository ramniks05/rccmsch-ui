import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OfficerCaseService, CaseDTO } from '../services/officer-case.service';
import { OfficerWorkflowAutoExecuteService } from '../services/officer-workflow-auto-execute.service';

interface DocumentData {
  id?: number;
  templateId: number;
  templateName?: string;
  contentHtml: string;
  contentData?: string;
  status: 'DRAFT' | 'FINAL' | 'SIGNED';
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

@Component({
  selector: 'app-document-editor',
  templateUrl: './document-editor.component.html',
  styleUrls: ['./document-editor.component.scss']
})
export class DocumentEditorComponent implements OnInit, OnChanges {
  @Input() caseId!: number;
  @Input() caseData!: CaseDTO;
  /** Preferred transition code selected on the case detail action strip. */
  @Input() preferredTransitionCode: string | null = null;
  /** Template ID (from permission-documents / allowedDocumentIds). Required for officer document APIs. */
  @Input() templateId!: number;
  /** Optional: module type for display only when template doesn't provide it (e.g. NOTICE, ORDERSHEET, JUDGEMENT). */
  @Input() documentType: string = 'NOTICE';
  /** When true (e.g. Order Sheet), start in edit mode so the officer can work the template immediately. */
  @Input() openInEditMode = false;
  
  // Template & Document data
  template: any = null;
  document: DocumentData | null = null;
  contentHtml: string = '';
  contentData: any = {};
  documentStatus: 'DRAFT' | 'FINAL' | 'SIGNED' = 'DRAFT';
  
  // UI state
  loading = false;
  saving = false;
  editMode = false;
  previewMode = false;
  /** Template + document requests run in parallel; both must finish before optional auto edit mode. */
  private templateLoadSettled = false;
  private documentLoadSettled = false;
  // Workflow-based action permissions for this document template
  allowDraftFromWorkflow = false;
  allowSaveAndSignFromWorkflow = false;
  
  // Placeholders for replacement
  placeholderValues: Record<string, string> = {};
  
  // User role for access control
  userRoleCode: string = '';
  userRoleName: string = '';

  constructor(
    private officerCaseService: OfficerCaseService,
    private sanitizer: DomSanitizer,
    private workflowAuto: OfficerWorkflowAutoExecuteService,
    private snackBar: MatSnackBar,
  ) {
    this.loadUserRole();
  }
  
  /**
   * Load user role from localStorage
   */
  loadUserRole(): void {
    try {
      const storedData = localStorage.getItem('adminUserData');
      if (storedData) {
        const officerData = JSON.parse(storedData);
        const posting = officerData?.posting || {};
        this.userRoleCode = posting.roleCode || '';
        this.userRoleName = posting.roleName || '';
      }
    } catch (e) {
      console.error('Error loading user role:', e);
    }
  }
  
  ngOnInit(): void {
    this.resetLoadFlags();
    if (this.caseId && this.templateId != null) {
      this.loadUserRole(); // Ensure role is loaded
      this.initializePlaceholders();
      this.loadTemplate();
      this.loadDocument();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const tidCh = changes['templateId'];
    const cidCh = changes['caseId'];
    if (!tidCh && !cidCh) {
      return;
    }
    const tidFirst = !tidCh || tidCh.firstChange;
    const cidFirst = !cidCh || cidCh.firstChange;
    if (tidFirst && cidFirst) {
      return;
    }
    this.resetLoadFlags();
    if (this.caseId && this.templateId != null) {
      this.initializePlaceholders();
      this.loadTemplate();
      this.loadDocument();
    }
  }

  private resetLoadFlags(): void {
    this.templateLoadSettled = false;
    this.documentLoadSettled = false;
  }

  private tryApplyOpenInEditMode(): void {
    if (!this.openInEditMode || !this.template || !this.templateLoadSettled || !this.documentLoadSettled) {
      return;
    }
    if (!this.canEdit()) {
      return;
    }
    setTimeout(() => {
      if (this.openInEditMode && this.canEdit()) {
        this.enableEdit();
      }
    }, 0);
  }

  /**
   * Initialize placeholder values from case data and current officer
   */
  initializePlaceholders(): void {
    if (!this.caseData) return;

    // Get current officer data from localStorage
    let officerData: any = null;
    try {
      const storedData = localStorage.getItem('adminUserData');
      if (storedData) {
        officerData = JSON.parse(storedData);
      }
    } catch (e) {
      console.error('Error parsing officer data:', e);
    }

    // Extract officer information
    const posting = officerData?.posting || {};
    const designation = posting.roleName || posting.designation || this.caseData.assignedToRole || '';
    const officerName = posting.officerName || this.caseData.assignedToOfficerName || '';
    
    // Extract court name - priority: caseData > posting > default
    let courtName = 'Court Name'; // Default fallback
    if ((this.caseData as any).courtName) {
      courtName = (this.caseData as any).courtName;
    } else if (posting.courtName) {
      courtName = posting.courtName;
    } else if (this.caseData.assignedToUnitName) {
      courtName = this.caseData.assignedToUnitName;
    }

    // Digital Signature ID - can be userId, officerId, or custom field
    const digitalSignatureId = officerData?.userId?.toString() || 
                               posting.officerId?.toString() || 
                               this.caseData.assignedToOfficerId?.toString() || 
                               '';

    // Parse caseData JSON to extract form fields (including respondent name)
    let parsedCaseData: Record<string, any> = {};
    let respondentName = '';
    
    if (this.caseData.caseData) {
      try {
        parsedCaseData = JSON.parse(this.caseData.caseData);
        
        // Try multiple possible field names for respondent
        // Common variations: respondentName, respondent, respondent_name, etc.
        respondentName = parsedCaseData['respondentName'] || 
                        parsedCaseData['respondent'] || 
                        parsedCaseData['respondent_name'] ||
                        parsedCaseData['Respondent Name'] ||
                        parsedCaseData['Respondent'] ||
                        '';
      } catch (e) {
        console.error('Error parsing caseData:', e);
      }
    }

    this.placeholderValues = {
      '{{caseNumber}}': this.caseData.caseNumber || '',
      '{{applicantName}}': this.caseData.applicantName || '',
      '{{applicantMobile}}': this.caseData.applicantMobile || '',
      '{{applicantEmail}}': this.caseData.applicantEmail || '',
      '{{caseNature}}': this.caseData.caseNatureName || '',
      '{{caseType}}': this.caseData.caseTypeName || '',
      '{{subject}}': this.caseData.subject || '',
      '{{description}}': this.caseData.description || '',
      '{{applicationDate}}': this.caseData.applicationDate ? new Date(this.caseData.applicationDate).toLocaleDateString() : '',
      '{{currentDate}}': new Date().toLocaleDateString(),
      '{{currentDateTime}}': new Date().toLocaleString(),
      '{{officerName}}': officerName,
      '{{courtName}}': courtName,
      '{{designation}}': designation,
      '{{digitalSignatureId}}': digitalSignatureId,
      '{{respondentName}}': respondentName,
      '{{status}}': this.caseData.statusName || this.caseData.status || ''
    };
  }

  /**
   * Load template by template ID (GET /api/cases/{caseId}/documents/{templateId}/template).
   */
  loadTemplate(): void {
    if (this.templateId == null) return;
    this.loading = true;
    this.officerCaseService.getDocumentTemplate(this.caseId, this.templateId).subscribe({
      next: (response) => {
        this.template = response.data;
        if (this.template && !this.document) {
          // If no document exists, use template as starting point
          this.contentHtml = this.replacePlaceholders(this.template.templateHtml);
        }
        this.loading = false;
        this.templateLoadSettled = true;
        // Once we know the template (and its ID), load workflow permissions for this document
        if (this.template && this.template.id) {
          this.loadWorkflowDocumentPermissions();
        }
        this.tryApplyOpenInEditMode();
      },
      error: (error) => {
        console.error('Error loading template:', error);
        alert('Failed to load document template');
        this.loading = false;
        this.templateLoadSettled = true;
        this.tryApplyOpenInEditMode();
      }
    });
  }

  /**
   * Load workflow-based permissions (Draft / Save & Sign) for this document template
   * by inspecting available transitions checklist.allowedDocumentIds and flags.
   */
  private loadWorkflowDocumentPermissions(): void {
    // Default to no actions until workflow explicitly allows them
    this.allowDraftFromWorkflow = false;
    this.allowSaveAndSignFromWorkflow = false;

    const templateId: number | undefined = this.template?.id;
    if (!templateId || !this.caseId) {
      return;
    }

    this.officerCaseService.getAvailableTransitions(this.caseId).subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          return;
        }
        response.data.forEach((t: any) => {
          const checklist = t.checklist;
          if (!checklist || !Array.isArray(checklist.allowedDocumentIds)) {
            return;
          }
          if (!checklist.allowedDocumentIds.includes(templateId)) {
            return;
          }
          if (checklist.allowDocumentDraft === true) {
            this.allowDraftFromWorkflow = true;
          }
          if (checklist.allowDocumentSaveAndSign === true) {
            this.allowSaveAndSignFromWorkflow = true;
          }
        });
      },
      error: () => {
        // On error, keep defaults (no extra actions); backend controls availability
      }
    });
  }

  /**
   * Load latest document (for edit/sign). GET /api/cases/{caseId}/documents/{templateId}/latest.
   * When status === 'SIGNED', editing is blocked unless template.allowEditAfterSign is true.
   */
  loadDocument(): void {
    if (this.templateId == null) return;
    this.loading = true;
    this.officerCaseService.getLatestDocument(this.caseId, this.templateId).subscribe({
      next: (response) => {
        if (response.data) {
          const doc = response.data;
          this.document = doc;
          this.contentHtml = doc.contentHtml ?? '';
          this.documentStatus = doc.status ?? 'DRAFT';

          if (doc.contentData) {
            try {
              this.contentData = typeof doc.contentData === 'string' ? JSON.parse(doc.contentData) : doc.contentData;
            } catch {
              this.contentData = {};
            }
          }

          if (doc.status === 'SIGNED' && this.template && !this.template.allowEditAfterSign) {
            this.editMode = false;
          }
        }
        this.loading = false;
        this.documentLoadSettled = true;
        this.tryApplyOpenInEditMode();
      },
      error: (error) => {
        console.error('Error loading document:', error);
        this.loading = false;
        this.documentLoadSettled = true;
        this.tryApplyOpenInEditMode();
      }
    });
  }

  /**
   * Replace placeholders in template
   */
  replacePlaceholders(html: string): string {
    let result = html;
    Object.entries(this.placeholderValues).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      result = result.replace(regex, value);
    });
    return result;
  }

  /**
   * Enable edit mode
   */
  enableEdit(): void {
    if (this.document?.status === 'SIGNED' && this.template && !this.template.allowEditAfterSign) {
      alert('This document is signed and cannot be edited.');
      return;
    }
    this.editMode = true;
    this.previewMode = false;
  }

  /**
   * Toggle preview mode
   */
  togglePreview(): void {
    this.previewMode = !this.previewMode;
  }

  /**
   * Get sanitized HTML for preview
   */
  getSanitizedHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.contentHtml);
  }

  /**
   * Save document as draft
   */
  saveDraft(): void {
    console.log('Saving document as DRAFT');
    this.saveDocument('DRAFT');
  }

  /**
   * Save document as final
   */
  saveFinal(): void {
    if (!confirm('Mark this document as FINAL? It will be ready for review.')) {
      return;
    }
    console.log('Saving document as FINAL');
    this.saveDocument('FINAL');
  }

  /**
   * Save document as signed
   */
  signDocument(): void {
    if (!confirm('Sign this document? Once signed, it may not be editable.')) {
      return;
    }
    console.log('Saving document as SIGNED');
    this.saveDocument('SIGNED');
  }

  /**
   * Save document with given status
   */
  saveDocument(status: 'DRAFT' | 'FINAL' | 'SIGNED'): void {
    if (!this.template || !this.contentHtml) {
      alert('Please load a template first');
      return;
    }

    // Validate status value
    if (!['DRAFT', 'FINAL', 'SIGNED'].includes(status)) {
      console.error('Invalid status:', status);
      alert('Invalid document status');
      return;
    }

    this.saving = true;
    
    // Ensure status is exactly as expected (uppercase, no whitespace)
    const normalizedStatus = status.trim().toUpperCase() as 'DRAFT' | 'FINAL' | 'SIGNED';
    
    const templateId = this.templateId ?? this.template?.id;
    if (templateId == null) {
      alert('Template ID is required to save document.');
      this.saving = false;
      return;
    }
    const documentPayload = {
      contentHtml: this.contentHtml,
      contentData: JSON.stringify(this.contentData),
      status: normalizedStatus,
      remarks: undefined as string | undefined
    };

    if (this.document && this.document.id) {
      // Update existing document: PUT /api/cases/{caseId}/documents/{templateId}/{documentId}
      this.officerCaseService.updateDocument(
        this.caseId,
        templateId,
        this.document.id,
        documentPayload
      ).subscribe({
        next: (response) => {
          console.log('=== Document Update Response ===');
          console.log('Full response:', response);
          console.log('Response data:', response.data);
          const returnedStatus = response.data?.status || status;
          console.log('Requested status:', status);
          console.log('Returned status from backend:', returnedStatus);
          
          if (returnedStatus !== status) {
            console.warn('⚠️ WARNING: Status mismatch!');
            console.warn('Requested:', status, 'but backend returned:', returnedStatus);
            alert(`⚠️ Status mismatch: Requested "${status}" but backend returned "${returnedStatus}". Please check backend logic.`);
          } else {
            console.log('✅ Status matches correctly');
          }
          
          alert(`Document updated successfully. Status: ${returnedStatus}`);
          this.document = response.data;
          this.documentStatus = returnedStatus as 'DRAFT' | 'FINAL' | 'SIGNED';
          this.editMode = false;
          this.saving = false;
          this.triggerAutoWorkflowAfterDocumentSave(
            templateId,
            String(returnedStatus),
          );
        },
        error: (error) => {
          console.error('Document update error:', error);
          console.error('Request payload:', documentPayload);
          alert('Failed to update document. Check console for details.');
          this.saving = false;
        }
      });
    } else {
      // Create new document: POST /api/cases/{caseId}/documents/{templateId}
      this.officerCaseService.saveDocument(
        this.caseId,
        templateId,
        documentPayload
      ).subscribe({
        next: (response) => {
          const returnedStatus = response.data?.status || status;
          if (returnedStatus !== status) {
            console.warn('Status mismatch: requested', status, 'backend returned', returnedStatus);
          }
          alert(`Document saved successfully. Status: ${returnedStatus}`);
          this.document = response.data;
          this.documentStatus = returnedStatus as 'DRAFT' | 'FINAL' | 'SIGNED';
          this.editMode = false;
          this.saving = false;
          this.triggerAutoWorkflowAfterDocumentSave(
            templateId,
            String(returnedStatus),
          );
        },
        error: (error) => {
          console.error('Document save error:', error);
          console.error('Request payload:', documentPayload);
          alert('Failed to save document. Check console for details.');
          this.saving = false;
        }
      });
    }
  }

  /**
   * After FINAL/SIGNED save, run any matching executable transition from GET /transitions
   * (allowedDocumentIds includes this templateId). Skips DRAFT.
   */
  private triggerAutoWorkflowAfterDocumentSave(
    templateId: number,
    returnedStatus: string,
  ): void {
    this.workflowAuto
      .tryAfterDocumentSave(
        this.caseId,
        templateId,
        returnedStatus,
        undefined,
        this.preferredTransitionCode,
      )
      .subscribe((result) => {
        if (result.executed) {
          if (result.ambiguous && result.message) {
            this.snackBar.open(result.message, 'Close', { duration: 6000 });
          } else {
            this.snackBar.open(
              'Workflow step completed for this document.',
              'Close',
              { duration: 5000 },
            );
          }
        } else if (result.commentsRequired && result.message) {
          this.snackBar.open(result.message, 'Close', { duration: 6000 });
        }
      });
  }

  /**
   * Cancel edit
   */
  cancelEdit(): void {
    if (this.document) {
      this.contentHtml = this.document.contentHtml;
    } else if (this.template) {
      this.contentHtml = this.replacePlaceholders(this.template.templateHtml);
    }
    this.editMode = false;
  }

  /**
   * Print document
   */
  printDocument(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(this.contentHtml);
      printWindow.document.close();
      printWindow.print();
    }
  }

  /**
   * Export to PDF (placeholder - would need actual PDF library)
   */
  exportToPDF(): void {
    alert('PDF export functionality would be implemented here using a library like jsPDF or html2pdf.js');
    // Implementation would use html2pdf.js or similar
  }

  /**
   * Get document type label
   */
  getDocumentTypeLabel(): string {
    const t = this.documentType;
    if (!t) return 'Document';
    return String(t).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(): string {
    const classes: Record<string, string> = {
      'DRAFT': 'bg-secondary',
      'FINAL': 'bg-info',
      'SIGNED': 'bg-success'
    };
    return classes[this.documentStatus] || 'bg-secondary';
  }

  /**
   * Check if document can be edited
   */
  canEdit(): boolean {
    // If there is no document yet, always allow creating/editing
    if (!this.document) {
      return true;
    }

    // Never allow editing when signed and template is locked after sign
    if (
      this.document.status === 'SIGNED' &&
      this.template &&
      !this.template.allowEditAfterSign
    ) {
      return false;
    }

    // Edit allowed; backend will reject save/sign if user lacks permission (role_id–based)
    return true;
  }
}
