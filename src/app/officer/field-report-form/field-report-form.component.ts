import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OfficerCaseService } from '../services/officer-case.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface FieldReportFormData {
  [key: string]: any;
}

@Component({
  selector: 'app-field-report-form',
  templateUrl: './field-report-form.component.html',
  styleUrls: ['./field-report-form.component.scss']
})
export class FieldReportFormComponent implements OnInit {
  caseId: number;
  formSchema: any = null;
  formData: FieldReportFormData = {};
  hasExistingData = false;
  loading = false;
  submitting = false;
  form: FormGroup = this.fb.group({});
  dynamicFields: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<FieldReportFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { caseId: number },
    private caseService: OfficerCaseService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.caseId = data.caseId;
  }

  ngOnInit(): void {
    this.loadFieldReportForm();
  }

  /**
   * Load field report form schema and existing data
   */
  loadFieldReportForm(): void {
    this.loading = true;
    
    this.caseService.getModuleFormWithData(this.caseId, 'FIELD_REPORT').pipe(
      catchError(error => {
        this.loading = false;
        console.error('Error loading field report form:', error);
        
        if (error.status === 404) {
          this.snackBar.open(
            'Field report form not configured. Please contact administrator.',
            'Close',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            'Failed to load field report form. Please try again.',
            'Close',
            { duration: 5000 }
          );
        }
        
        return of({ success: false, data: null });
      })
    ).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        if (response.success && response.data) {
          this.formSchema = response.data.schema;
          this.hasExistingData = response.data.hasExistingData;
          
          // Parse existing form data if available
          if (response.data.formData) {
            try {
              this.formData = typeof response.data.formData === 'string'
                ? JSON.parse(response.data.formData)
                : response.data.formData;
            } catch (e) {
              console.error('Error parsing form data:', e);
              this.formData = {};
            }
          }
          
          // Build dynamic form based on schema
          this.buildDynamicForm();
        } else {
          this.snackBar.open(
            'Field report form schema not found. Please contact administrator.',
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Build dynamic form from schema
   */
  buildDynamicForm(): void {
    if (!this.formSchema || !this.formSchema.fields) {
      return;
    }

    const formControls: { [key: string]: any } = {};
    this.dynamicFields = this.formSchema.fields
      .filter((f: any) => f.isActive !== false)
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

    this.dynamicFields.forEach((field: any) => {
      let value: any;
      
      // Handle DYNAMIC_FILES fields - they should be arrays
      if (field.fieldType === 'DYNAMIC_FILES') {
        value = this.formData[field.fieldName] || [];
        if (!Array.isArray(value)) {
          value = [];
        }
      } else {
        value = this.formData[field.fieldName] || field.defaultValue || '';
      }
      
      const validators = [];
      
      if (field.isRequired) {
        validators.push(Validators.required);
      }
      
      // Add custom validation rules if provided
      if (field.validationRules) {
        try {
          const rules = JSON.parse(field.validationRules);
          if (rules.minLength) {
            validators.push(Validators.minLength(rules.minLength));
          }
          if (rules.maxLength) {
            validators.push(Validators.maxLength(rules.maxLength));
          }
          if (rules.pattern) {
            validators.push(Validators.pattern(rules.pattern));
          }
        } catch (e) {
          console.warn('Invalid validation rules:', e);
        }
      }
      
      formControls[field.fieldName] = [value, validators];
    });

    this.form = this.fb.group(formControls);
  }

  /**
   * Get field options for SELECT/RADIO fields
   */
  getFieldOptions(field: any): any[] {
    if (!field.options) {
      return [];
    }
    
    try {
      return JSON.parse(field.options);
    } catch (e) {
      console.warn('Invalid options JSON:', e);
      return [];
    }
  }

  /**
   * Get max length from validation rules
   */
  getMaxLength(field: any): number | null {
    if (!field.validationRules) {
      return null;
    }
    try {
      const rules = JSON.parse(field.validationRules);
      return rules.maxLength || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Transform form data to match expected payload format
   */
  private transformFormData(formValue: any): any {
    const transformed: any = {};
    
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      
      // Handle DYNAMIC_FILES fields - transform file structure
      if (Array.isArray(value) && value.length > 0 && value[0]?.fileId) {
        transformed[key] = value.map((file: any) => ({
          fileName: file.fileName,
          fileUrl: file.fileUrl || `/uploads/documents/${file.fileName}`, // Default if not provided
          fileSize: file.fileSize,
          fileType: file.fileType || this.getFileTypeFromFileName(file.fileName) // Infer from extension
        }));
      } else {
        // Handle date fields - convert Date objects to ISO string
        if (value instanceof Date) {
          transformed[key] = value.toISOString().split('T')[0];
        } else {
          transformed[key] = value;
        }
      }
    });
    
    return transformed;
  }

  /**
   * Get MIME type from file name extension
   */
  private getFileTypeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Submit field report
   */
  submitFieldReport(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.snackBar.open('Please fill all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;
    const rawFormData = this.form.value;
    
    // Transform form data to match expected payload format
    const transformedFormData = this.transformFormData(rawFormData);

    // Step 1: Submit module form data
    this.caseService.submitModuleForm(
      this.caseId,
      'FIELD_REPORT',
      transformedFormData,
      'Field report submitted'
    ).pipe(
      catchError(error => {
        this.submitting = false;
        this.snackBar.open(
          error.error?.message || 'Failed to save field report. Please try again.',
          'Close',
          { duration: 5000 }
        );
        throw error;
      })
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Step 2: Execute SUBMIT_FIELD_REPORT transition
          this.executeSubmitTransition();
        } else {
          this.submitting = false;
          this.snackBar.open(
            response.message || 'Failed to save field report',
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: () => {
        // Error already handled in catchError
      }
    });
  }

  /**
   * Execute SUBMIT_FIELD_REPORT transition
   */
  private executeSubmitTransition(): void {
    this.caseService.executeTransition(this.caseId, {
      caseId: this.caseId,
      transitionCode: 'SUBMIT_FIELD_REPORT',
      comments: 'Field report submitted'
    }).pipe(
      catchError(error => {
        this.submitting = false;
        this.snackBar.open(
          error.error?.message || 'Failed to submit field report. Form data saved but transition failed.',
          'Close',
          { duration: 5000 }
        );
        throw error;
      })
    ).subscribe({
      next: (response: any) => {
        this.submitting = false;
        if (response.success) {
          this.snackBar.open('Field report submitted successfully', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close('success');
        } else {
          this.snackBar.open(
            response.message || 'Failed to submit field report',
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: () => {
        // Error already handled in catchError
      }
    });
  }

  /**
   * Mark all form fields as touched for validation display
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors) {
      return '';
    }
    
    if (field.errors['required']) {
      return 'This field is required';
    }
    if (field.errors['minlength']) {
      return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    }
    if (field.errors['maxlength']) {
      return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
    }
    if (field.errors['pattern']) {
      return 'Invalid format';
    }
    
    return 'Invalid value';
  }

  /**
   * Get dynamic files value for a field
   */
  getDynamicFilesValue(fieldName: string): { fileId: string; fileName: string; fileSize: number }[] {
    const value = this.form.get(fieldName)?.value;
    return Array.isArray(value) ? value : [];
  }

  /**
   * Handle dynamic files change
   */
  onDynamicFilesChange(fieldName: string, value: { fileId: string; fileName: string; fileSize: number }[]): void {
    this.form.get(fieldName)?.setValue(value);
    this.form.get(fieldName)?.markAsTouched();
  }

  /**
   * Get field errors for display
   */
  getFieldErrors(fieldName: string): Record<string, string> {
    const errors: Record<string, string> = {};
    if (this.hasFieldError(fieldName)) {
      errors[fieldName] = this.getFieldError(fieldName);
    }
    return errors;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
