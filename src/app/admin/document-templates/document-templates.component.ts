import { Component, OnInit } from '@angular/core';
import { DocumentTemplatesService, DocumentTemplate } from '../services/document-templates.service';
import { ModuleType } from '../services/module-forms.service';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-document-templates',
  templateUrl: './document-templates.component.html',
  styleUrls: ['./document-templates.component.scss']
})
export class DocumentTemplatesComponent implements OnInit {
  // Data
  caseNatures: any[] = [];
  caseTypes: any[] = [];
  templates: DocumentTemplate[] = [];
  
  // Selection
  selectedCaseNatureId: number | null = null;
  selectedCaseTypeId: number | null = null; // Optional: for case type override
  selectedModuleType: ModuleType = 'NOTICE';
  
  // Module types for document templates (excluding HEARING)
  moduleTypes: ModuleType[] = ['NOTICE', 'ORDERSHEET', 'JUDGEMENT'];
  
  // UI state
  loading = false;
  showTemplateForm = false;
  editingTemplate: DocumentTemplate | null = null;
  activeOnly = false;
  
  // Template form
  templateForm: Partial<DocumentTemplate> = {
    templateName: '',
    templateHtml: '', // Initialize with empty string, not undefined
    templateData: '',
    version: 1,
    allowEditAfterSign: false,
    isActive: true
  };

  // HTML Editor placeholders
  availablePlaceholders = [
    '{{caseNumber}}',
    '{{applicantName}}',
    '{{caseNature}}',
    '{{caseType}}',
    '{{applicationDate}}',
    '{{courtName}}',
    '{{officerName}}',
    '{{currentDate}}',
    '{{subject}}',
    '{{description}}'
  ];

  constructor(
    private documentTemplatesService: DocumentTemplatesService,
    private adminService: AdminService
  ) {}

  /**
   * Get template Word text content as string (never undefined)
   * Content is stored as HTML for rich formatting support
   */
  get templateHtmlContent(): string {
    return this.templateForm.templateHtml || '';
  }

  /**
   * Set template Word text content
   * Content is stored as HTML for rich formatting support
   */
  set templateHtmlContent(value: string) {
    this.templateForm.templateHtml = value;
  }

  /**
   * Check if Word text content has meaningful text (not just whitespace or empty)
   * Extracts text from HTML if needed and validates actual content exists
   */
  private hasMeaningfulContent(content: string): boolean {
    if (!content) return false;
    
    // If content contains HTML tags, extract text content
    if (content.includes('<')) {
      const tmp = document.createElement('DIV');
      tmp.innerHTML = content;
      const textContent = tmp.textContent || tmp.innerText || '';
      return textContent.trim().length > 0;
    }
    
    // For plain text, just check if trimmed content has length
    return content.trim().length > 0;
  }

  ngOnInit(): void {
    this.loadCaseNatures();
  }

  /**
   * Load active case natures
   */
  loadCaseNatures(): void {
    this.loading = true;
    this.adminService.getAllCaseNatures().subscribe({
      next: (response: any) => {
        this.caseNatures = response.data || response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading case natures:', error);
        alert('Failed to load case natures');
        this.loading = false;
      }
    });
  }

  /**
   * On case nature selection change
   */
  onCaseNatureChange(): void {
    this.selectedCaseTypeId = null; // Reset case type when nature changes
    this.caseTypes = [];
    if (this.selectedCaseNatureId) {
      this.loadCaseTypes();
      this.loadTemplates();
    }
  }

  /**
   * Load case types for selected case nature
   */
  loadCaseTypes(): void {
    if (!this.selectedCaseNatureId) return;
    
    this.adminService.getCaseTypesByCaseNature(this.selectedCaseNatureId).subscribe({
      next: (response: any) => {
        this.caseTypes = response.data || response;
      },
      error: (error) => {
        console.error('Error loading case types:', error);
      }
    });
  }

  /**
   * On case type selection change
   */
  onCaseTypeChange(): void {
    if (this.selectedCaseNatureId) {
      this.loadTemplates();
    }
  }

  /**
   * On module type change
   */
  onModuleTypeChange(): void {
    if (this.selectedCaseNatureId) {
      this.loadTemplates();
    }
  }

  /**
   * Toggle active only filter
   */
  toggleActiveOnly(): void {
    if (this.selectedCaseNatureId) {
      this.loadTemplates();
    }
  }

  /**
   * Load templates for selected case nature and module type (with optional case type override)
   */
  loadTemplates(): void {
    if (!this.selectedCaseNatureId) return;
    
    this.loading = true;
    this.documentTemplatesService.getTemplatesByCaseNatureAndModule(
      this.selectedCaseNatureId, 
      this.selectedModuleType,
      this.activeOnly,
      this.selectedCaseTypeId || undefined
    ).subscribe({
      next: (response) => {
        this.templates = response.data || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        alert('Failed to load templates');
        this.loading = false;
      }
    });
  }

  /**
   * Show add template form
   */
  addTemplate(): void {
    this.editingTemplate = null;
    this.templateForm = {
      templateName: '',
      templateHtml: this.getDefaultTemplate(),
      templateData: JSON.stringify({ placeholders: this.availablePlaceholders }, null, 2),
      version: 1,
      allowEditAfterSign: false,
      isActive: true
    };
    this.showTemplateForm = true;
  }

  /**
   * Get default HTML template
   */
  getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${this.selectedModuleType} Document</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { margin: 20px 0; }
        .footer { margin-top: 50px; text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <h2>${this.selectedModuleType}</h2>
        <p>Case Number: {{caseNumber}}</p>
    </div>
    
    <div class="content">
        <p>Date: {{currentDate}}</p>
        <p>Applicant Name: {{applicantName}}</p>
        <p>Case Nature: {{caseNature}}</p>
        <p>Subject: {{subject}}</p>
        
        <p>{{description}}</p>
    </div>
    
    <div class="footer">
        <p>{{officerName}}</p>
        <p>{{courtName}}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Edit existing template
   */
  editTemplate(template: DocumentTemplate): void {
    this.editingTemplate = template;
    this.templateForm = { ...template };
    this.showTemplateForm = true;
  }

  /**
   * View template (read-only)
   */
  viewTemplate(template: DocumentTemplate): void {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(template.templateHtml);
      newWindow.document.close();
    }
  }

  /**
   * Save template (create or update)
   */
  saveTemplate(): void {
    if (!this.selectedCaseNatureId) {
      alert('Please select a case nature');
      return;
    }

    // Validate template name
    if (!this.templateForm.templateName || !this.templateForm.templateName.trim()) {
      alert('Template name is required');
      return;
    }

    // Validate template content - check for meaningful Word text content
    const content = this.templateForm.templateHtml || '';
    if (!this.hasMeaningfulContent(content)) {
      alert('Template name and Word text content are required. Please enter some content in the template.');
      return;
    }

    const templateData: DocumentTemplate = {
      ...this.templateForm,
      caseNatureId: this.selectedCaseNatureId,
      caseTypeId: this.selectedCaseTypeId || undefined, // Include case type override if selected
      moduleType: this.selectedModuleType
    } as DocumentTemplate;

    this.loading = true;

    if (this.editingTemplate && this.editingTemplate.id) {
      // Update existing template
      this.documentTemplatesService.updateTemplate(this.editingTemplate.id, templateData).subscribe({
        next: () => {
          alert('Template updated successfully');
          this.showTemplateForm = false;
          this.loadTemplates();
        },
        error: (error) => {
          console.error('Error updating template:', error);
          alert('Failed to update template');
          this.loading = false;
        }
      });
    } else {
      // Create new template
      this.documentTemplatesService.createTemplate(templateData).subscribe({
        next: () => {
          alert('Template created successfully');
          this.showTemplateForm = false;
          this.loadTemplates();
        },
        error: (error) => {
          console.error('Error creating template:', error);
          alert('Failed to create template');
          this.loading = false;
        }
      });
    }
  }

  /**
   * Delete template
   */
  deleteTemplate(template: DocumentTemplate): void {
    if (!template.id) return;
    
    if (!confirm(`Are you sure you want to delete template "${template.templateName}"?`)) {
      return;
    }

    this.loading = true;
    this.documentTemplatesService.deleteTemplate(template.id).subscribe({
      next: () => {
        alert('Template deleted successfully');
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        alert('Failed to delete template');
        this.loading = false;
      }
    });
  }

  /**
   * Duplicate template
   */
  duplicateTemplate(template: DocumentTemplate): void {
    if (!template.id) return;

    if (!confirm(`Create a duplicate of template "${template.templateName}"?`)) {
      return;
    }

    this.loading = true;
    this.documentTemplatesService.duplicateTemplate(template.id).subscribe({
      next: () => {
        alert('Template duplicated successfully');
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error duplicating template:', error);
        alert('Failed to duplicate template');
        this.loading = false;
      }
    });
  }

  /**
   * Cancel template form
   */
  cancelTemplateForm(): void {
    this.showTemplateForm = false;
    this.editingTemplate = null;
  }

  /**
   * Insert placeholder into HTML editor
   */
  insertPlaceholder(placeholder: string): void {
    const textarea = document.getElementById('templateHtml') as HTMLTextAreaElement;
    if (textarea) {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = this.templateForm.templateHtml || '';
      
      this.templateForm.templateHtml = 
        currentValue.substring(0, startPos) + 
        placeholder + 
        currentValue.substring(endPos);
      
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + placeholder.length, startPos + placeholder.length);
      }, 0);
    }
  }

  /**
   * Insert placeholder into Rich Text Editor
   */
  insertPlaceholderIntoEditor(placeholder: string): void {
    // Simply append the placeholder to the current content
    const currentContent = this.templateForm.templateHtml || '';
    this.templateForm.templateHtml = currentContent + ' ' + placeholder + ' ';
  }

  /**
   * Get module type label
   */
  getModuleTypeLabel(moduleType: ModuleType): string {
    const labels: Record<ModuleType, string> = {
      'HEARING': 'Hearing',
      'NOTICE': 'Notice',
      'ORDERSHEET': 'Order Sheet',
      'JUDGEMENT': 'Judgement'
    };
    return labels[moduleType] || moduleType;
  }

  /**
   * Export template as Word document
   * Uses a simple HTML to Word conversion approach
   */
  exportAsWord(template: DocumentTemplate): void {
    try {
      const blob = this.htmlToWordBlob(template.templateHtml);
      const fileName = `${template.templateName.replace(/\s+/g, '_')}_Template.docx`;
      this.downloadBlob(blob, fileName);
    } catch (error) {
      console.error('Error exporting to Word:', error);
      alert('Failed to export template as Word document. Exporting as HTML instead.');
      this.exportAsHtml(template);
    }
  }

  /**
   * Preview template as Word
   */
  previewAsWord(): void {
    if (!this.templateForm.templateHtml) {
      alert('Please enter template content first');
      return;
    }

    try {
      const blob = this.htmlToWordBlob(this.templateForm.templateHtml);
      const fileName = `Preview_${this.selectedModuleType}_${Date.now()}.docx`;
      this.downloadBlob(blob, fileName);
    } catch (error) {
      console.error('Error previewing as Word:', error);
      alert('Failed to generate Word preview');
    }
  }

  /**
   * Convert Word text (stored as HTML) to Word-compatible blob
   * This creates a .docx file from Word text content
   */
  private htmlToWordBlob(html: string): Blob {
    // Wrap HTML in proper Word XML structure
    const wordXml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Document</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 8.5in 11in;
            margin: 1in;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
          }
          h1, h2, h3, h4, h5, h6 {
            font-weight: bold;
            margin-top: 12pt;
            margin-bottom: 6pt;
          }
          p {
            margin: 0;
            margin-bottom: 6pt;
          }
          table {
            border-collapse: collapse;
          }
          table, th, td {
            border: 1px solid black;
            padding: 5px;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    // Create blob with proper MIME type for Word
    return new Blob(['\ufeff', wordXml], {
      type: 'application/msword'
    });
  }

  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /**
   * Fallback: Export as HTML file
   */
  private exportAsHtml(template: DocumentTemplate): void {
    const blob = new Blob([template.templateHtml], { type: 'text/html' });
    const fileName = `${template.templateName.replace(/\s+/g, '_')}_Template.html`;
    this.downloadBlob(blob, fileName);
  }
}
