import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Form Field Definition Interface
 */
export interface FormFieldDefinition {
  id: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  validationRules?: string;
  displayOrder: number;
  isActive: boolean;
  defaultValue?: string;
  fieldOptions?: string;
  placeholder?: string;
  helpText?: string;
  fieldGroup?: string;
}

/**
 * Form Schema Interface
 */
export interface FormSchema {
  caseTypeId: number;
  caseTypeName: string;
  caseTypeCode: string;
  totalFields: number;
  fields: FormFieldDefinition[];
}

/**
 * Form Builder Component
 * Dynamically renders forms based on case type schema
 */
@Component({
  selector: 'app-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss']
})
export class FormBuilderComponent implements OnInit {
  formSchema: FormSchema | null = null;
  caseForm: FormGroup = this.fb.group({});
  loading = false;
  submitting = false;
  error: string | null = null;
  caseTypeId: number | null = null;
  caseTypeName: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Get case type ID from route
    this.route.params.subscribe(params => {
      this.caseTypeId = +params['caseTypeId'];
      if (this.caseTypeId) {
        this.loadFormSchema(this.caseTypeId);
      }
    });
  }

  /**
   * Load form schema from backend
   * Form schemas are now linked to Case Type (not Case Nature)
   * GET /api/admin/form-schemas/case-types/{caseTypeId} — Public endpoint (no auth required)
   */
  loadFormSchema(caseTypeId: number): void {
    this.loading = true;
    this.error = null;

    this.adminService.getFormSchema(caseTypeId)
      .pipe(
        catchError(error => {
          this.loading = false;
          this.handleError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success && apiResponse.data) {
            this.formSchema = apiResponse.data;
            if (this.formSchema) {
              this.caseTypeName = this.formSchema.caseTypeName || this.formSchema.caseTypeCode || 'Case Form';
              this.buildForm(this.formSchema);
            }
          } else {
            this.error = 'Failed to load form schema. Please try again.';
          }
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  /**
   * Build reactive form based on schema
   */
  buildForm(schema: FormSchema): void {
    const formControls: { [key: string]: FormControl } = {};

    schema.fields.forEach(field => {
      if (field.isActive) {
        // Get initial value
        let initialValue: any = field.defaultValue || '';
        
        // Handle checkbox default value
        if (field.fieldType === 'CHECKBOX') {
          initialValue = field.defaultValue === 'true';
        }

        // Create validators array
        const validators = this.buildValidators(field);

        // Create form control
        formControls[field.fieldName] = new FormControl(initialValue, validators);
      }
    });

    // Create form group
    this.caseForm = this.fb.group(formControls);
  }

  /**
   * Build validators based on field definition
   */
  buildValidators(field: FormFieldDefinition): any[] {
    const validators: any[] = [];

    // Required validator
    if (field.isRequired) {
      validators.push(Validators.required);
    }

    // Parse validation rules
    if (field.validationRules) {
      try {
        const rules = JSON.parse(field.validationRules);

        switch (field.fieldType) {
          case 'TEXT':
          case 'TEXTAREA':
            if (rules.minLength) {
              validators.push(Validators.minLength(rules.minLength));
            }
            if (rules.maxLength) {
              validators.push(Validators.maxLength(rules.maxLength));
            }
            if (rules.pattern) {
              validators.push(Validators.pattern(rules.pattern));
            }
            break;

          case 'NUMBER':
            if (rules.min !== undefined) {
              validators.push(Validators.min(rules.min));
            }
            if (rules.max !== undefined) {
              validators.push(Validators.max(rules.max));
            }
            break;

          case 'EMAIL':
            validators.push(Validators.email);
            break;

          case 'PHONE':
            validators.push(Validators.pattern(/^[6-9]\d{9}$/));
            break;
        }
      } catch (e) {
        console.error('Error parsing validation rules:', e);
      }
    }

    return validators;
  }

  /**
   * Get field options for SELECT/RADIO
   */
  getFieldOptions(field: FormFieldDefinition): any[] {
    if (!field.fieldOptions) {
      return [];
    }
    try {
      return JSON.parse(field.fieldOptions);
    } catch (e) {
      console.error('Error parsing field options:', e);
      return [];
    }
  }

  /**
   * Handle file upload
   */
  onFileChange(event: any, fieldName: string): void {
    const file = event.target.files[0];
    if (file) {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        this.caseForm.patchValue({
          [fieldName]: reader.result // base64 string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Get sorted fields (by displayOrder)
   */
  getSortedFields(): FormFieldDefinition[] {
    if (!this.formSchema) {
      return [];
    }
    return [...this.formSchema.fields]
      .filter(field => field.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.caseForm.valid) {
      this.submitting = true;
      this.error = null;

      // Get form values
      const formData = this.caseForm.value;

      // Convert to JSON string for caseData
      const caseDataJson = JSON.stringify(formData);

      // Get current user ID from localStorage (for admin)
      const adminUserData = localStorage.getItem('adminUserData');
      let applicantId = 1; // Default fallback
      if (adminUserData) {
        try {
          const userData = JSON.parse(adminUserData);
          applicantId = userData.id || applicantId;
        } catch (e) {
          console.error('Error parsing admin user data:', e);
        }
      }

      // Prepare case creation DTO
      const createCaseDTO = {
        caseTypeId: this.caseTypeId!,
        applicantId: applicantId,
        unitId: 1, // TODO: Get from user selection or admin profile
        subject: formData.subject || `${this.formSchema?.caseTypeName} Application`,
        description: formData.description || '',
        caseData: caseDataJson,
        priority: formData.priority || 'MEDIUM',
        applicationDate: new Date().toISOString().split('T')[0]
      };

      // Submit case
      this.adminService.createCase(createCaseDTO)
        .pipe(
          catchError(error => {
            this.submitting = false;
            this.handleError(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.submitting = false;
            const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
            if (apiResponse.success) {
              this.snackBar.open('Case created successfully', 'Close', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
              // Navigate back to case types or cases list
              this.router.navigate(['/admin/case-types']);
            }
          },
          error: () => {
            this.submitting = false;
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.caseForm.controls).forEach(key => {
        this.caseForm.get(key)?.markAsTouched();
      });
      this.snackBar.open('Please fill all required fields correctly', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): void {
    if (error.error?.message) {
      this.error = error.error.message;
    } else if (error.status === 401) {
      this.error = 'Unauthorized. Please login again.';
    } else if (error.status === 404) {
      this.error = 'Form schema not found. Please check the case type.';
    } else {
      this.error = error.message || 'An error occurred. Please try again.';
    }
    const errorMessage = this.error || 'An error occurred. Please try again.';
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.caseForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const control = this.caseForm.get(fieldName);
    if (control && control.errors) {
      if (control.errors['required']) {
        return 'This field is required';
      }
      if (control.errors['minlength']) {
        return `Minimum length is ${control.errors['minlength'].requiredLength}`;
      }
      if (control.errors['maxlength']) {
        return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
      }
      if (control.errors['pattern']) {
        return 'Invalid format';
      }
      if (control.errors['min']) {
        return `Minimum value is ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `Maximum value is ${control.errors['max'].max}`;
      }
      if (control.errors['email']) {
        return 'Invalid email format';
      }
    }
    return '';
  }

  /**
   * Cancel and go back
   */
  onCancel(): void {
    this.router.navigate(['/admin/case-types']);
  }
}

