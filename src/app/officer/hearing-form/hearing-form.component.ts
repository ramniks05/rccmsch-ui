import { Component, OnInit, Input } from '@angular/core';
import { OfficerCaseService } from '../services/officer-case.service';
import { ModuleFormField, FieldType } from '../../admin/services/module-forms.service';

@Component({
  selector: 'app-hearing-form',
  templateUrl: './hearing-form.component.html',
  styleUrls: ['./hearing-form.component.scss']
})
export class HearingFormComponent implements OnInit {
  @Input() caseId!: number;
  
  // Form data
  formSchema: ModuleFormField[] = [];
  formData: any = {};
  remarks: string = '';
  submittedData: any = null;
  
  // UI state
  loading = false;
  submitting = false;
  viewMode = false;

  constructor(private officerCaseService: OfficerCaseService) {}

  ngOnInit(): void {
    if (this.caseId) {
      this.loadFormWithData();
    }
  }

  /**
   * Load form schema and existing data (combined API call)
   */
  loadFormWithData(): void {
    this.loading = true;
    this.officerCaseService.getModuleFormWithData(this.caseId, 'HEARING').subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success && response.data) {
          // Set schema fields
          if (response.data.schema?.fields) {
            this.formSchema = response.data.schema.fields;
          }

          // Set existing form data if available
          if (response.data.hasExistingData && response.data.formData) {
            this.formData = { ...response.data.formData };
            this.viewMode = true; // Show in view mode if data exists
            this.submittedData = { formData: response.data.formData }; // Mark as submitted
          } else {
            this.initializeFormData(); // Initialize with defaults
          }
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error loading hearing form:', error);
        alert(error.error?.message || 'Failed to load hearing form');
      }
    });
  }

  /**
   * Initialize form data with default values
   */
  initializeFormData(): void {
    this.formSchema.forEach(field => {
      if (field.defaultValue && !this.formData[field.fieldName]) {
        this.formData[field.fieldName] = field.defaultValue;
      }
    });
  }

  /**
   * Submit hearing form
   */
  submitForm(): void {
    // Validate required fields
    const missingFields = this.formSchema
      .filter(field => field.isRequired && !this.formData[field.fieldName])
      .map(field => field.fieldLabel);

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n${missingFields.join(', ')}`);
      return;
    }

    if (!confirm('Are you sure you want to submit this hearing form?')) {
      return;
    }

    this.submitting = true;
    this.officerCaseService.submitModuleForm(
      this.caseId, 
      'HEARING', 
      this.formData, 
      this.remarks
    ).subscribe({
      next: (response) => {
        alert('Hearing form submitted successfully');
        this.submittedData = response.data;
        this.viewMode = true;
        this.submitting = false;
      },
      error: (error) => {
        console.error('Error submitting form:', error);
        alert('Failed to submit hearing form');
        this.submitting = false;
      }
    });
  }

  /**
   * Enable edit mode
   */
  enableEdit(): void {
    this.viewMode = false;
  }

  /**
   * Cancel edit
   */
  cancelEdit(): void {
    if (this.submittedData) {
      this.loadFormWithData(); // Reload data
      this.viewMode = true;
    }
  }

  /**
   * Refresh form data
   */
  refresh(): void {
    this.loadFormWithData();
  }

  /**
   * Get field value for display
   */
  getFieldValue(field: ModuleFormField): any {
    const value = this.formData[field.fieldName];
    
    // Format based on field type
    switch (field.fieldType) {
      case 'DATE':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'DATETIME':
        return value ? new Date(value).toLocaleString() : '';
      case 'CHECKBOX':
        return value ? 'Yes' : 'No';
      case 'SELECT':
      case 'RADIO':
        if (field.options) {
          try {
            const options = JSON.parse(field.options);
            const option = options.find((opt: any) => opt.value === value);
            return option ? option.label : value;
          } catch {
            return value;
          }
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Get options for select/radio fields
   */
  getOptions(field: ModuleFormField): any[] {
    if (!field.options) return [];
    try {
      return JSON.parse(field.options);
    } catch {
      return [];
    }
  }

  /**
   * Check if field type needs options
   */
  isSelectType(fieldType: FieldType): boolean {
    return ['SELECT', 'MULTISELECT', 'RADIO'].includes(fieldType);
  }
}
