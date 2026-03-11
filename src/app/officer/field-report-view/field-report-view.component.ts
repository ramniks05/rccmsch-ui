import { Component, OnInit, Input } from '@angular/core';
import { OfficerCaseService } from '../services/officer-case.service';

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
              this.hasData = true;
              
              // Get submission date if available
              if (response.data.submittedAt) {
                this.submittedAt = response.data.submittedAt;
              }
            } catch (e) {
              console.error('Error parsing form data:', e);
              this.formData = {};
            }
          }
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error loading field report:', error);
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
}
