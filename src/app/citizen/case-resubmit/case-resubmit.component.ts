import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitizenCaseService, Case, ResubmitRequest } from '../services/citizen-case.service';
import { FormSchemaService } from '../../core/services/form-schema.service';
import { FormDataSourceService, parseDataSource } from '../../core/services/form-data-source.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
    private formDataSourceService: FormDataSourceService,
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
            .filter(h => (h.toStateCode || h.toState?.stateCode) === 'RETURNED_FOR_CORRECTION')
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
        
        // Load dataSource options first, then patch form values
        this.loadDataSourceOptionsAndPopulateForm();
      },
      error: (err) => {
        console.error('Error loading form schema', err);
        this.snackBar.open('Failed to load form schema', 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Load dataSource options for fields and then populate form with case data
   * Handles cascading dependencies by loading parent fields first
   */
  loadDataSourceOptionsAndPopulateForm(): void {
    // Ensure form is built first
    if (!this.form) {
      console.warn('Form not built yet, cannot load dataSource options');
      return;
    }

    // Parse case data first
    let caseData: any = {};
    if (this.case?.caseData) {
      try {
        caseData = typeof this.case.caseData === 'string' 
          ? JSON.parse(this.case.caseData) 
          : this.case.caseData;
      } catch (e) {
        console.error('Error parsing case data:', e);
        caseData = {};
      }
    }

    // Identify fields with dataSource (excluding those with static fieldOptions)
    const dataSourceFields = this.fields.filter(f => 
      f.dataSource && 
      (f.fieldType === 'SELECT' || f.fieldType === 'RADIO') &&
      !f.fieldOptions // Only load if no static options
    );

    if (dataSourceFields.length === 0) {
      // No dataSource fields, just patch form directly
      this.patchFormWithCaseData(caseData);
      return;
    }

    // Separate fields into independent and dependent
    const independentFields = dataSourceFields.filter(f => {
      const ds = parseDataSource(f.dataSource);
      return !ds?.parentField && !f.dependsOnField;
    });

    const dependentFields = dataSourceFields.filter(f => {
      const ds = parseDataSource(f.dataSource);
      return ds?.parentField || f.dependsOnField;
    });

    // Load independent fields first
    const independentLoaders = independentFields.map(field => {
      if (!field || !field.fieldName || !field.dataSource) {
        return of({ field: field?.fieldName || '', options: [] });
      }

      return this.formDataSourceService.getOptionsForField(
        { fieldName: field.fieldName, dataSource: field.dataSource, dependsOnField: field.dependsOnField },
        caseData as any
      ).pipe(
        catchError(error => {
          console.error(`Error loading options for field ${field.fieldName}:`, error);
          return of([]);
        }),
        map((options: any[]) => ({ field: field.fieldName, options: options || [] }))
      );
    });

    // Load independent options first
    if (independentLoaders.length === 0) {
      // No independent fields, proceed to dependent fields
      this.loadDependentFieldsAndPatch(caseData, dependentFields);
      return;
    }

    forkJoin(independentLoaders).subscribe({
      next: (independentResults: Array<{ field: string; options: any[] }>) => {
        // Store independent field options
        independentResults.forEach(result => {
          if (result && result.field) {
            const field = this.fields.find(f => f.fieldName === result.field);
            if (field) {
              field.fieldOptions = JSON.stringify(result.options.map((opt: any) => ({
                value: opt.value,
                label: opt.label
              })));
            }
          }
        });

        // Now load dependent fields
        this.loadDependentFieldsAndPatch(caseData, dependentFields);
      },
      error: (error) => {
        console.error('Error loading independent dataSource options:', error);
        // Still try to patch form even if some options failed
        this.patchFormWithCaseData(caseData);
      }
    });
  }

  /**
   * Load dependent fields and patch form
   */
  private loadDependentFieldsAndPatch(caseData: any, dependentFields: any[]): void {
    if (dependentFields.length === 0) {
      // No dependent fields, just patch form
      this.patchFormWithCaseData(caseData);
      return;
    }

    // Load dependent fields (they can use parent values from caseData)
    const dependentLoaders = dependentFields.map(field => {
      if (!field || !field.fieldName || !field.dataSource) {
        return of({ field: field?.fieldName || '', options: [] });
      }

      const ds = parseDataSource(field.dataSource);
      const parentField = ds?.parentField || field.dependsOnField;
      
      // Check if parent value exists in caseData
      if (parentField && !caseData[parentField]) {
        // Parent value not available, skip this field
        return of({ field: field.fieldName, options: [] });
      }

      return this.formDataSourceService.getOptionsForField(
        { fieldName: field.fieldName, dataSource: field.dataSource, dependsOnField: field.dependsOnField },
        caseData as any
      ).pipe(
        catchError(error => {
          console.error(`Error loading options for field ${field.fieldName}:`, error);
          return of([]);
        }),
        map((options: any[]) => ({ field: field.fieldName, options: options || [] }))
      );
    });

    // Load dependent options
    forkJoin(dependentLoaders).subscribe({
      next: (dependentResults: Array<{ field: string; options: any[] }>) => {
        // Store dependent field options
        dependentResults.forEach(result => {
          if (result && result.field) {
            const field = this.fields.find(f => f.fieldName === result.field);
            if (field) {
              field.fieldOptions = JSON.stringify(result.options.map((opt: any) => ({
                value: opt.value,
                label: opt.label
              })));
            }
          }
        });

        // Now patch form with case data (all options are loaded)
        this.patchFormWithCaseData(caseData);
      },
      error: (error) => {
        console.error('Error loading dependent dataSource options:', error);
        // Still try to patch form even if some options failed
        this.patchFormWithCaseData(caseData);
      }
    });
  }

  /**
   * Patch form with case data
   * Normalizes values to match dropdown option formats
   */
  private patchFormWithCaseData(caseData: any): void {
    if (!caseData || Object.keys(caseData).length === 0) {
      return;
    }

    // Ensure form is initialized
    if (!this.form) {
      console.warn('Form not initialized yet, cannot patch data');
      return;
    }

    // Convert date strings to Date objects for date fields
    const patchedData: any = { ...caseData };
    
    this.fields.forEach(field => {
      if (!field || !field.fieldName) {
        return;
      }

      const fieldValue = patchedData[field.fieldName];
      
      if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
        return;
      }

      // Handle DATE fields
      if (field.fieldType === 'DATE') {
        try {
          const dateValue = new Date(fieldValue);
          if (!isNaN(dateValue.getTime())) {
            patchedData[field.fieldName] = dateValue;
          }
        } catch (e) {
          console.warn(`Invalid date value for ${field.fieldName}:`, fieldValue);
        }
        return;
      }

      // Handle SELECT/RADIO fields - normalize value to match option format
      if ((field.fieldType === 'SELECT' || field.fieldType === 'RADIO')) {
        try {
          // Only normalize if fieldOptions exist (either static or loaded)
          if (field.fieldOptions) {
            const options = this.getFieldOptions(field);
            if (options && options.length > 0) {
              // Try to find matching option by value (handle type coercion)
              const matchingOption = options.find(opt => {
                if (!opt) return false;
                // Try exact match first
                if (opt.value === fieldValue) return true;
                // Try string comparison
                if (String(opt.value) === String(fieldValue)) return true;
                // Try number comparison
                if (Number(opt.value) === Number(fieldValue) && !isNaN(Number(opt.value))) return true;
                return false;
              });

              if (matchingOption) {
                // Use the exact option value format (preserves type)
                patchedData[field.fieldName] = matchingOption.value;
              } else {
                // Value not found in options, try to coerce to match first option's type
                const firstOption = options[0];
                if (firstOption) {
                  if (typeof firstOption.value === 'number') {
                    patchedData[field.fieldName] = Number(fieldValue);
                  } else {
                    patchedData[field.fieldName] = String(fieldValue);
                  }
                }
              }
            }
          }
          // If no fieldOptions yet (dataSource still loading), keep original value
        } catch (e) {
          console.warn(`Error normalizing value for ${field.fieldName}:`, e);
        }
      }
    });

    // Use setTimeout to ensure Angular change detection picks up the patch
    setTimeout(() => {
      if (this.form) {
        try {
          this.form.patchValue(patchedData, { emitEvent: false });
        } catch (e) {
          console.error('Error patching form values:', e);
        }
      }
    }, 0);
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

  /**
   * Get options for a SELECT/RADIO field
   * Handles both static fieldOptions and dynamic dataSource options
   */
  getFieldOptions(field: any): Array<{ value: any; label: string }> {
    if (!field) return [];

    try {
      // If fieldOptions exists (static or dynamically loaded), use it
      if (field.fieldOptions) {
        const parsed = typeof field.fieldOptions === 'string' 
          ? JSON.parse(field.fieldOptions) 
          : field.fieldOptions;
        
        if (Array.isArray(parsed)) {
          return parsed
            .filter(opt => opt !== null && opt !== undefined)
            .map(opt => {
              // Handle both object format {value, label} and simple values
              if (typeof opt === 'object' && opt !== null) {
                return {
                  value: opt.value !== undefined && opt.value !== null ? opt.value : opt,
                  label: opt.label !== undefined && opt.label !== null ? String(opt.label) : String(opt.value !== undefined ? opt.value : opt)
                };
              } else {
                return {
                  value: opt,
                  label: String(opt)
                };
              }
            });
        }
      }

      // If dataSource exists but options not loaded yet, return empty
      // This prevents errors while options are being loaded
      if (field.dataSource) {
        return [];
      }

      return [];
    } catch (e) {
      console.warn('Error parsing fieldOptions for', field.fieldName, e);
      return [];
    }
  }
}
