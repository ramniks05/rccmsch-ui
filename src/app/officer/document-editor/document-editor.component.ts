import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OfficerCaseService, CaseDTO } from '../services/officer-case.service';
import { ModuleType } from '../../admin/services/module-forms.service';

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
export class DocumentEditorComponent implements OnInit {
  @Input() caseId!: number;
  @Input() caseData!: CaseDTO;
  @Input() documentType: ModuleType = 'NOTICE';
  
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
  
  // Placeholders for replacement
  placeholderValues: Record<string, string> = {};

  constructor(
    private officerCaseService: OfficerCaseService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.caseId) {
      this.initializePlaceholders();
      this.loadTemplate();
      this.loadDocument();
    }
  }

  /**
   * Initialize placeholder values from case data
   */
  initializePlaceholders(): void {
    if (!this.caseData) return;

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
      '{{officerName}}': this.caseData.assignedToOfficerName || '',
      '{{courtName}}': 'Court Name', // Should come from court data
      '{{status}}': this.caseData.statusName || this.caseData.status || ''
    };
  }

  /**
   * Load template for the document type
   */
  loadTemplate(): void {
    this.loading = true;
    this.officerCaseService.getDocumentTemplate(this.caseId, this.documentType).subscribe({
      next: (response) => {
        this.template = response.data;
        if (this.template && !this.document) {
          // If no document exists, use template as starting point
          this.contentHtml = this.replacePlaceholders(this.template.templateHtml);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading template:', error);
        alert('Failed to load document template');
        this.loading = false;
      }
    });
  }

  /**
   * Load latest document (for edit/sign). Uses GET .../documents/{moduleType}/latest.
   * When status === 'SIGNED', editing is blocked unless template.allowEditAfterSign is true.
   */
  loadDocument(): void {
    this.loading = true;
    this.officerCaseService.getLatestDocument(this.caseId, this.documentType).subscribe({
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
      },
      error: (error) => {
        console.error('Error loading document:', error);
        this.loading = false;
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
    this.saveDocument('DRAFT');
  }

  /**
   * Save document as final
   */
  saveFinal(): void {
    if (!confirm('Mark this document as FINAL? It will be ready for review.')) {
      return;
    }
    this.saveDocument('FINAL');
  }

  /**
   * Save document as signed
   */
  signDocument(): void {
    if (!confirm('Sign this document? Once signed, it may not be editable.')) {
      return;
    }
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

    this.saving = true;
    const documentData: any = {
      templateId: this.template.id,
      contentHtml: this.contentHtml,
      contentData: JSON.stringify(this.contentData),
      status: status
    };

    if (this.document && this.document.id) {
      // Update existing document
      this.officerCaseService.updateDocument(
        this.caseId,
        this.documentType,
        this.document.id,
        documentData
      ).subscribe({
        next: (response) => {
          alert('Document updated successfully');
          this.document = response.data;
          this.documentStatus = status;
          this.editMode = false;
          this.saving = false;
        },
        error: (error) => {
          console.error('Error updating document:', error);
          alert('Failed to update document');
          this.saving = false;
        }
      });
    } else {
      // Create new document
      this.officerCaseService.saveDocument(
        this.caseId,
        this.documentType,
        documentData
      ).subscribe({
        next: (response) => {
          alert('Document saved successfully');
          this.document = response.data;
          this.documentStatus = status;
          this.editMode = false;
          this.saving = false;
        },
        error: (error) => {
          console.error('Error saving document:', error);
          alert('Failed to save document');
          this.saving = false;
        }
      });
    }
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
    const labels: Record<ModuleType, string> = {
      'HEARING': 'Hearing',
      'NOTICE': 'Notice',
      'ORDERSHEET': 'Order Sheet',
      'JUDGEMENT': 'Judgement'
    };
    return labels[this.documentType] || this.documentType;
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
    if (!this.document) return true;
    if (this.document.status === 'SIGNED' && this.template && !this.template.allowEditAfterSign) {
      return false;
    }
    return true;
  }
}
