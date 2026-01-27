import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitizenCaseService, Case, ResubmitRequest } from '../services/citizen-case.service';
import { FormSchemaService } from '../../core/services/form-schema.service';

@Component({
  selector: 'app-case-resubmit',
  templateUrl: './case-resubmit.component.html',
  styleUrls: ['./case-resubmit.component.scss']
})
export class CaseResubmitComponent implements OnInit {
  caseId!: number;
  case: Case | null = null;
  form!: FormGroup;
  fields: any[] = [];
  caseTypeName = '';
  returnComment = '';
  isSubmitting = false;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private caseService: CitizenCaseService,
    private schemaService: FormSchemaService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.caseId = +params['id'];
      if (this.caseId) {
        this.loadCaseDetails();
      }
    });
  }

  loadCaseDetails(): void {
    this.isLoading = true;
    this.caseService.getCaseById(this.caseId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.case = response.data;
          
          // Check if case is in correct status
          if (this.case.status !== 'RETURNED_FOR_CORRECTION') {
            this.snackBar.open('This case is not in correction status', 'Close', { duration: 5000 });
            this.router.navigate(['/citizen/cases', this.caseId]);
            return;
          }

          // Load return comment from history
          this.loadReturnComment();
          
          // Load form schema
          if (this.case.caseTypeId) {
            this.loadSchema(this.case.caseTypeId);
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load case details';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  loadReturnComment(): void {
    this.caseService.getCaseHistory(this.caseId).subscribe({
      next: (response) => {
        if (response.success) {
          const history = response.data || [];
          const returned = history
            .filter(h => h.toState?.stateCode === 'RETURNED_FOR_CORRECTION')
            .slice(-1)[0];
          if (returned?.comments) {
            this.returnComment = returned.comments;
          }
        }
      },
      error: (error) => {
        console.error('Error loading return comment:', error);
      }
    });
  }

  loadSchema(caseTypeId: number): void {
    // Form schemas are now linked to Case Type (not Case Nature)
    this.schemaService.getFormSchema(caseTypeId).subscribe({
      next: (res) => {
        const data = res.data;
        this.caseTypeName = data.caseTypeName || data.caseTypeCode || 'Case Form';
        this.fields = data.fields
          .filter((f: any) => f.isActive)
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

        this.buildForm();
        
        // Pre-fill form with existing case data
        if (this.case?.caseData) {
          try {
            const caseData = JSON.parse(this.case.caseData);
            this.form.patchValue(caseData);
          } catch (e) {
            console.error('Error parsing case data:', e);
          }
        }
      },
      error: (err) => {
        console.error('Error loading form schema', err);
        this.snackBar.open('Failed to load form schema', 'Close', { duration: 5000 });
      }
    });
  }

  buildForm(): void {
    const group: any = {};

    this.fields.forEach((field) => {
      const validators = [];
      if (field.isRequired) {
        validators.push(Validators.required);
      }
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
          console.warn('Invalid validationRules JSON', field.validationRules);
        }
      }
      group[field.fieldName] = [null, validators];
    });

    // Add remarks field
    group['remarks'] = [''];

    this.form = this.fb.group(group);
  }

  onFileChange(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.form.get(fieldName)?.setValue(input.files[0]);
    }
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;

    // Prepare form data
    const formValues: any = {};
    Object.entries(this.form.value).forEach(([key, value]) => {
      if (key !== 'remarks' && value !== null && value !== undefined) {
        if (value instanceof Date) {
          formValues[key] = value.toISOString().split('T')[0];
        } else if (value instanceof File) {
          formValues[key] = value.name;
        } else {
          formValues[key] = value;
        }
      }
    });

    const caseDataJson = JSON.stringify(formValues);
    const remarks = this.form.get('remarks')?.value || '';

    const resubmitRequest: ResubmitRequest = {
      caseData: caseDataJson,
      remarks: remarks
    };

    this.caseService.resubmitCase(this.caseId, resubmitRequest).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.snackBar.open('Case resubmitted successfully!', 'Close', { duration: 5000 });
          setTimeout(() => {
            this.router.navigate(['/citizen/cases', this.caseId]);
          }, 2000);
        } else {
          this.snackBar.open(response.message || 'Failed to resubmit case', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        let errorMessage = 'Failed to resubmit case';
        
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.snackBar.open(errorMessage, 'Close', { duration: 6000 });
        console.error('Case resubmission error:', error);
      }
    });
  }

  /**
   * Get unique ID for file input to ensure label for attribute matches
   */
  getFileInputId(field: any): string {
    const id = field.id || field.fieldName;
    return `file-input-resubmit-${id}`;
  }
}
