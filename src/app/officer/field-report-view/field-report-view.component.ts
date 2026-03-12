import { Component, OnInit, Input } from '@angular/core';
import { OfficerCaseService } from '../services/officer-case.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-field-report-view',
  templateUrl: './field-report-view.component.html',
  styleUrls: ['./field-report-view.component.scss']
})
export class FieldReportViewComponent implements OnInit {
  @Input() caseId!: number;
  
  formSchema: any = null;
  formData: any = {};
  loading = false;
  hasData = false;
  submittedAt: string | null = null;

  constructor(
    private caseService: OfficerCaseService
  ) {}

  ngOnInit(): void {
    if (this.caseId) {
      this.loadFieldReport();
    }
  }

  /**
   * Load field report data
   */
  loadFieldReport(): void {
    this.loading = true;
    this.hasData = false;
    
    this.caseService.getModuleFormWithData(this.caseId, 'FIELD_REPORT').subscribe({
      next: (response: any) => {
        this.loading = false;
        
        if (response.success && response.data) {
          this.formSchema = response.data.schema;
          
          if (response.data.hasExistingData && response.data.formData) {
            try {
              this.formData = typeof response.data.formData === 'string'
                ? JSON.parse(response.data.formData)
                : response.data.formData;
              
              // Check if formData has any actual values
              const hasValues = Object.keys(this.formData).some(key => {
                const value = this.formData[key];
                if (Array.isArray(value)) return value.length > 0;
                return value !== null && value !== undefined && value !== '';
              });
              
              this.hasData = hasValues && this.formSchema && this.formSchema.fields && this.formSchema.fields.length > 0;
              
              // Get submission date if available
              if (response.data.submittedAt) {
                this.submittedAt = response.data.submittedAt;
              }
            } catch (e) {
              console.error('Error parsing form data:', e);
              this.formData = {};
              this.hasData = false;
            }
          } else {
            // No existing data
            this.hasData = false;
          }
        } else {
          this.hasData = false;
        }
      },
      error: (error: any) => {
        this.loading = false;
        this.hasData = false;
        console.error('Error loading field report:', error);
        // Don't show error to user - just show "no data" message
      }
    });
  }

  /**
   * Get field value for display
   */
  getFieldValue(field: any): string {
    const value = this.formData[field.fieldName];
    
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    
    // Handle date fields
    if (field.fieldType === 'DATE' && value) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    // Handle arrays (for DYNAMIC_FILES)
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '-';
      }
      if (field.fieldType === 'DYNAMIC_FILES') {
        return `${value.length} file(s)`;
      }
      return value.join(', ');
    }
    
    return String(value);
  }

  /**
   * Get file list for DYNAMIC_FILES field
   */
  getFileList(field: any): any[] {
    const value = this.formData[field.fieldName];
    return Array.isArray(value) ? value : [];
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get full file URL (handles both relative and absolute URLs)
   */
  getFileUrl(file: any): string {
    // If fileUrl exists, use it
    if (file.fileUrl) {
      // If URL is already absolute (starts with http:// or https://), return as is
      if (file.fileUrl.startsWith('http://') || file.fileUrl.startsWith('https://')) {
        return file.fileUrl;
      }
      
      // If URL starts with /, it's a relative path - prepend API base URL
      if (file.fileUrl.startsWith('/')) {
        // Remove /api from apiUrl if present, then add the file path
        const baseUrl = environment.apiUrl.replace('/api', '');
        return `${baseUrl}${file.fileUrl}`;
      }
      
      // Otherwise, assume it's relative to API base
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}/${file.fileUrl}`;
    }
    
    // Fallback: construct URL from fileId or fileName if fileUrl is not available
    if (file.fileId || file.fileName) {
      const baseUrl = environment.apiUrl.replace('/api', '');
      const fileName = file.fileName || file.fileId;
      return `${baseUrl}/uploads/documents/${fileName}`;
    }
    
    return '';
  }

  /**
   * Open file in new tab
   */
  openFile(file: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const fileUrl = this.getFileUrl(file);
    if (fileUrl) {
      // Open in new tab
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
