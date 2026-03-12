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
  
  // Store File objects temporarily (keyed by fieldName and fileId)
  private fileObjects: Map<string, Map<string, File>> = new Map();

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
      } else if (field.fieldType === 'DATE') {
        // Auto-fill date fields with current date if no existing value
        if (this.formData[field.fieldName]) {
          value = this.formData[field.fieldName];
        } else if (field.defaultValue) {
          value = field.defaultValue;
        } else {
          // Auto-fill with current date
          const today = new Date();
          value = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
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
          fileId: file.fileId, // Unique file identifier from upload endpoint
          fileName: file.displayName || file.fileName, // User-entered file type (displayName) or original filename
          fileUrl: file.fileUrl || `/uploads/documents/${file.fileName}`, // Server path where file is stored
          fileSize: file.fileSize, // File size in bytes
          fileType: file.fileType || this.getFileTypeFromFileName(file.fileName) // MIME type
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
   * 
   * VALIDATION LOGIC:
   * 1. Check all form fields for standard validation (required, min/max length, etc.)
   * 2. For DYNAMIC_FILES fields: File type (displayName) is ALWAYS mandatory if files are uploaded
   *    - Even if the field itself is not marked as required in schema
   *    - If user uploads files, they MUST provide file type for each file
   * 3. Block submission if any validation fails
   */
  submitFieldReport(): void {
    // Step 1: Validate standard form fields
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.snackBar.open('Please fill all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    // Step 2: Validate DYNAMIC_FILES fields - File type is MANDATORY for all uploaded files
    // This validation is HARDCODED and cannot be configured - it's always required
    let hasFileValidationError = false;
    const filesWithoutTypes: string[] = []; // Track which fields have missing file types
    
    this.dynamicFields.forEach((field: any) => {
      if (field.fieldType === 'DYNAMIC_FILES') {
        const files = this.form.get(field.fieldName)?.value || [];
        
        // If files are uploaded, file type is MANDATORY (regardless of field.isRequired)
        if (files.length > 0) {
          const missingTypes = files.filter((f: any) => !f.displayName || !f.displayName.trim());
          
          if (missingTypes.length > 0) {
            hasFileValidationError = true;
            filesWithoutTypes.push(field.fieldLabel || field.fieldName);
            
            // Mark field as invalid
            this.form.get(field.fieldName)?.setErrors({ 
              fileTypeRequired: true,
              required: true 
            });
            this.form.get(field.fieldName)?.markAsTouched();
          }
        }
      }
    });

    // Step 3: Block submission if file type validation fails
    if (hasFileValidationError) {
      this.markFormGroupTouched(this.form);
      const fieldNames = filesWithoutTypes.join(', ');
      const errorMsg = `File type is required for all uploaded files. Please provide file type in: ${fieldNames}`;
      this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
      return;
    }

    // Step 4: All validations passed - proceed with submission

    this.submitting = true;
    const rawFormData = this.form.value;
    
    // Check if there are files to upload
    // Files should have File objects attached (not just metadata with fileUrl)
    const hasFiles = this.dynamicFields.some((field: any) => {
      if (field.fieldType === 'DYNAMIC_FILES') {
        const files = rawFormData[field.fieldName] || [];
        if (files.length === 0) return false;
        
        // Check if any file has a File object attached (not already uploaded)
        return files.some((f: any) => {
          // If fileUrl exists, it means file was already uploaded - skip it
          if (f.fileUrl && !f.fileUrl.startsWith('temp-')) {
            return false;
          }
          // Check if file property exists and is a File instance
          if (f.file && f.file instanceof File) {
            return true;
          }
          // Check if we have it stored in fileObjects map
          if (f.fileId && this.getFileObject(field.fieldName, f.fileId)) {
            return true;
          }
          return false;
        });
      }
      return false;
    });
    
    console.log('hasFiles check:', hasFiles);
    console.log('rawFormData keys:', Object.keys(rawFormData));
    this.dynamicFields.forEach((field: any) => {
      if (field.fieldType === 'DYNAMIC_FILES') {
        const files = rawFormData[field.fieldName] || [];
        console.log(`Field ${field.fieldName} files:`, files.map((f: any) => ({
          fileId: f.fileId,
          fileName: f.fileName,
          hasFile: !!f.file,
          fileUrl: f.fileUrl
        })));
      }
    });

    if (hasFiles) {
      // Send files with metadata as multipart/form-data
      this.submitWithFiles(rawFormData, 'Field report submitted');
    } else {
      // No files - send as JSON
      const transformedFormData = this.transformFormData(rawFormData);
      this.submitWithoutFiles(transformedFormData, 'Field report submitted');
    }
  }

  /**
   * Submit form with files (multipart/form-data)
   */
  private submitWithFiles(rawFormData: any, remarks: string): void {
    const formData = new FormData();
    
    // Add regular form fields (non-file fields)
    const fileFields: string[] = [];
    Object.keys(rawFormData).forEach(key => {
      const field = this.dynamicFields.find(f => f.fieldName === key);
      if (field?.fieldType === 'DYNAMIC_FILES') {
        fileFields.push(key);
      } else {
        // Add regular fields as JSON string or individual fields
        const value = rawFormData[key];
        if (value instanceof Date) {
          formData.append(key, value.toISOString().split('T')[0]);
        } else {
          formData.append(key, value !== null && value !== undefined ? String(value) : '');
        }
      }
    });

    // Add file metadata as JSON
    const fileMetadata: any = {};
    fileFields.forEach(fieldName => {
      const files = rawFormData[fieldName] || [];
      fileMetadata[fieldName] = files.map((fileItem: any) => ({
        fileId: fileItem.fileId,
        fileName: fileItem.displayName || fileItem.fileName, // User-entered file type
        fileSize: fileItem.fileSize,
        fileType: fileItem.fileType || this.getFileTypeFromFileName(fileItem.fileName)
      }));
    });
    
    // Add file metadata as JSON string
    formData.append('fileMetadata', JSON.stringify(fileMetadata));
    
    // Add remarks
    if (remarks) {
      formData.append('remarks', remarks);
    }

    // Add actual files
    let fileIndex = 0;
    fileFields.forEach(fieldName => {
      const files = rawFormData[fieldName] || [];
      files.forEach((fileItem: any) => {
        // Skip files that are already uploaded (have fileUrl)
        if (fileItem.fileUrl && !fileItem.fileUrl.startsWith('temp-')) {
          console.log(`Skipping already uploaded file: ${fileItem.fileUrl}`);
          return;
        }
        
        // Get File object - check multiple sources
        let file: File | null = null;
        
        // First, check if file is directly attached
        if (fileItem.file && fileItem.file instanceof File) {
          file = fileItem.file;
        }
        // Second, check if stored in fileObjects map
        else if (fileItem.fileId) {
          file = this.getFileObject(fieldName, fileItem.fileId);
        }
        
        // Only add files that are actual File objects
        if (file instanceof File) {
          console.log(`Adding file ${fileIndex}:`, file.name, 'for field:', fieldName);
          // Append file with metadata
          formData.append(`files`, file, file.name);
          formData.append(`fileInfo_${fileIndex}`, JSON.stringify({
            fieldName: fieldName,
            fileId: fileItem.fileId,
            displayName: fileItem.displayName || fileItem.fileName,
            originalFileName: file.name || fileItem.fileName
          }));
          fileIndex++;
        } else {
          console.warn(`File object not found for fileId: ${fileItem.fileId}, field: ${fieldName}`);
        }
      });
    });
    
    console.log(`Total files to upload: ${fileIndex}`);
    
    if (fileIndex === 0) {
      console.error('No files found to upload! Falling back to JSON submission.');
      // Fall back to JSON submission if no files found
      const transformedFormData = this.transformFormData(rawFormData);
      this.submitWithoutFiles(transformedFormData, remarks);
      return;
    }

    // Submit with multipart/form-data
    this.caseService.submitModuleFormWithFiles(
      this.caseId,
      'FIELD_REPORT',
      formData
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
   * Submit form without files (JSON)
   */
  private submitWithoutFiles(transformedFormData: any, remarks: string): void {
    this.caseService.submitModuleForm(
      this.caseId,
      'FIELD_REPORT',
      transformedFormData,
      remarks
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
   * Store File objects when files are added
   */
  onDynamicFilesChange(fieldName: string, value: any[]): void {
    // Store File objects if present in the value
    const valueWithFiles = value.map((fileItem: any) => {
      // If file object exists, store it
      if (fileItem.file && fileItem.file instanceof File) {
        this.storeFileObject(fieldName, fileItem.fileId, fileItem.file);
        console.log(`Stored file object for ${fieldName}:`, fileItem.fileId, fileItem.file.name);
        return fileItem; // Keep file object in value
      }
      // If fileId exists but no file object, try to get from storage
      else if (fileItem.fileId && !fileItem.fileUrl) {
        const storedFile = this.getFileObject(fieldName, fileItem.fileId);
        if (storedFile) {
          console.log(`Attached stored file object for ${fieldName}:`, fileItem.fileId);
          return { ...fileItem, file: storedFile };
        }
      }
      return fileItem;
    });
    
    this.form.get(fieldName)?.setValue(valueWithFiles);
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

  /**
   * Store file temporarily (not uploaded yet)
   * Files will be sent with form submission as multipart/form-data
   * 
   * @param caseId - Case ID
   * @param file - File object to store
   * @returns Promise with file metadata (fileId, fileName, fileSize)
   */
  async uploadFile(caseId: number, file: File): Promise<{ 
    fileId: string; 
    fileName: string; 
    fileSize: number;
    fileUrl?: string;
    fileType?: string;
    file?: File; // Store File object for later submission
  } | null> {
    // Generate temporary fileId
    const fileId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    return {
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || this.getFileTypeFromFileName(file.name),
      file: file // Include File object for later submission
    };
  }

  /**
   * Store File object for a specific field
   */
  private storeFileObject(fieldName: string, fileId: string, file: File): void {
    if (!this.fileObjects.has(fieldName)) {
      this.fileObjects.set(fieldName, new Map());
    }
    this.fileObjects.get(fieldName)!.set(fileId, file);
  }

  /**
   * Get File object for a specific field and fileId
   */
  private getFileObject(fieldName: string, fileId: string): File | null {
    const fieldFiles = this.fileObjects.get(fieldName);
    return fieldFiles?.get(fileId) || null;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
