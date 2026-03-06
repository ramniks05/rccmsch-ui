import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RegistrationFormSchemaService, RegistrationFormField, DataSourceConfig, AdminUnit } from '../../../core/services/registration-form-schema.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dynamic-registration-form',
  templateUrl: './dynamic-registration-form.component.html',
  styleUrls: ['./dynamic-registration-form.component.scss']
})
export class DynamicRegistrationFormComponent implements OnInit, OnDestroy {
  @Input() registrationType: 'CITIZEN' | 'LAWYER' = 'CITIZEN';
  @Input() onSubmitForm!: (formData: any) => void;
  @Input() isLoading: boolean = false;

  registrationForm!: FormGroup;
  fields: RegistrationFormField[] = [];
  fieldGroups: Map<string, string> = new Map(); // Map of groupCode -> groupLabel
  groupedFields: { [key: string]: RegistrationFormField[] } = {}; // Cached grouped fields
  loading = false;
  error: string | null = null;

  // Unit hierarchy for cascading dropdowns
  states: AdminUnit[] = [];
  districts: AdminUnit[] = [];
  subDivisions: AdminUnit[] = [];
  circles: AdminUnit[] = [];

  // Cached dropdown options to avoid recalculating on every change detection
  private dropdownOptionsCache: Map<string, any[]> = new Map();

  selectedStateId: number | null = null;
  selectedDistrictId: number | null = null;
  selectedSubDivisionId: number | null = null;
  selectedCircleId: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private schemaService: RegistrationFormSchemaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSchema();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load registration form schema
   */
  loadSchema(): void {
    this.loading = true;
    this.error = null;

    this.schemaService.getRegistrationFormSchema(this.registrationType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };

          if (apiResponse.success && apiResponse.data) {
            this.fields = (apiResponse.data.fields || [])
              .filter((f: RegistrationFormField) => f.isActive)
              .sort((a: RegistrationFormField, b: RegistrationFormField) => a.displayOrder - b.displayOrder);

            // Extract field groups if available in response
            if (apiResponse.data.fieldGroups) {
              apiResponse.data.fieldGroups.forEach((group: any) => {
                if (group.groupCode && group.groupLabel) {
                  this.fieldGroups.set(group.groupCode, group.groupLabel);
                }
              });
            }

            // Cache grouped fields
            this.groupedFields = this.computeGroupedFields();

            this.buildForm();
            this.loadUnitHierarchy();
          } else {
            this.error = 'Failed to load registration form schema. Please check your connection and try again.';
          }
        },
        error: (err) => {
          this.loading = false;
          if (err.name === 'TimeoutError' || err.error?.name === 'TimeoutError') {
            this.error = 'Request timed out. Please check your connection and try again.';
          } else if (err.status === 0) {
            this.error = 'Unable to connect to server. Please check your connection.';
          } else if (err.status === 404) {
            this.error = 'Registration form not found. Please contact support.';
          } else {
            this.error = 'Error loading registration form. Please try again later.';
          }
          console.error('Error loading registration form schema:', err);
        }
      });
  }

  /**
   * Compute grouped fields (internal method)
   */
  private computeGroupedFields(): { [key: string]: RegistrationFormField[] } {
    const grouped: { [key: string]: RegistrationFormField[] } = {};

    this.fields.forEach(field => {
      const group = field.fieldGroup || 'default';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(field);
    });

    return grouped;
  }

  /**
   * Build reactive form based on schema
   */
  buildForm(): void {
    const formControls: { [key: string]: AbstractControl } = {};

    this.fields.forEach(field => {
      if (field.isActive) {
        // Get initial value
        let initialValue: any = field.defaultValue || '';

        // Handle different field types
        if (field.fieldType === 'DROPDOWN') {
          initialValue = field.defaultValue || null;
        } else if (field.fieldType === 'NUMBER') {
          initialValue = field.defaultValue ? Number(field.defaultValue) : null;
        }

        // Build validators
        const validators = this.buildValidators(field);

        // Create form control
        formControls[field.fieldName] = this.fb.control(initialValue, validators);
      }
    });

    // Create form group
    this.registrationForm = this.fb.group(formControls);

    // Setup unit hierarchy change listeners
    this.setupUnitHierarchyListeners();
  }

  /**
   * Build validators based on field definition
   */
  buildValidators(field: RegistrationFormField): any[] {
    const validators: any[] = [];

    // Required validator
    if (field.isRequired) {
      validators.push(Validators.required);
    }

    // Parse and apply validation rules
    const rules = this.schemaService.parseValidationRules(field.validationRules);

    if (rules.minLength) {
      validators.push(Validators.minLength(rules.minLength));
    }

    if (rules.maxLength) {
      validators.push(Validators.maxLength(rules.maxLength));
    }

    if (rules.pattern) {
      validators.push(Validators.pattern(rules.pattern));
    }

    // Field type specific validators
    if (field.fieldType === 'EMAIL') {
      validators.push(Validators.email);
    }

    if (field.fieldType === 'PHONE') {
      validators.push(Validators.pattern(/^[6-9]\d{9}$/));
    }

    return validators;
  }

  /**
   * Load unit hierarchy (State → District → Sub Division → Circle)
   * Only loads if there are fields that need unit data
   */
  loadUnitHierarchy(): void {
    // Check if any field uses ADMIN_UNITS data source
    const hasUnitField = this.fields.some(field => {
      if (!field.isActive) return false;
      const dataSource = this.schemaService.parseDataSource(field.dataSource);
      return dataSource?.type === 'ADMIN_UNITS';
    });

    if (!hasUnitField) {
      return;
    }

    // Find what levels are needed
    const stateField = this.fields.find(f => {
      if (!f.isActive) return false;
      const ds = this.schemaService.parseDataSource(f.dataSource);
      return ds?.type === 'ADMIN_UNITS' && ds.level === 'STATE';
    });

    const districtField = this.fields.find(f => {
      if (!f.isActive) return false;
      const ds = this.schemaService.parseDataSource(f.dataSource);
      return ds?.type === 'ADMIN_UNITS' && ds.level === 'DISTRICT';
    });

    // If DISTRICT field exists but NO STATE field, load districts directly for default state
    if (districtField && !stateField) {
      // Load districts for a default state
      // Note: Replace this with your actual default state ID (e.g., Manipur state ID)
      // You can also make this configurable via environment or get it from API
      const defaultStateId = 1; // TODO: Replace with actual default state ID or make configurable
      this.selectedStateId = defaultStateId;
      // Load districts immediately
      this.loadChildUnits(defaultStateId, 'DISTRICT');
    }
    // If both STATE and DISTRICT fields exist, load states first
    else if (stateField && districtField) {
      this.loadRootUnits();
    }
    // If STATE field exists, load states first (normal cascading flow)
    else if (stateField) {
      this.loadRootUnits();
    }
    // If only DISTRICT field exists with STATE field (shouldn't happen, but handle it)
    else if (districtField) {
      // This case means district field exists but we need state first
      // Load states so user can select, which will trigger district load
      this.loadRootUnits();
    }
  }

  /**
   * Load root units (State level)
   */
  loadRootUnits(): void {
    this.schemaService.getRootUnits()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success && apiResponse.data) {
            this.states = Array.isArray(apiResponse.data) ? apiResponse.data : [];
            this.clearDropdownCache(); // Clear cache when states update
            setTimeout(() => {
              this.cdr.markForCheck();
            }, 0);
          }
        },
        error: (err) => {
          console.error('Error loading root units:', err);
        }
      });
  }

  /**
   * Load child units by parent ID
   */
  loadChildUnits(parentId: number, level: 'DISTRICT' | 'SUB_DIVISION' | 'CIRCLE'): void {
    this.schemaService.getChildUnitsByParent(parentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle different response structures
          let units: any[] = [];

          if (response?.success !== undefined) {
            // Response has success field (standard API response)
            const apiResponse = response;
            if (apiResponse.success && apiResponse.data) {
              units = Array.isArray(apiResponse.data) ? apiResponse.data : [];
            }
          } else if (Array.isArray(response)) {
            // Response is directly an array
            units = response;
          } else if (response?.data) {
            // Response has data field but no success field
            units = Array.isArray(response.data) ? response.data : [];
          }

          if (level === 'DISTRICT') {
            this.districts = [...units]; // Create new array reference to trigger change detection
            this.subDivisions = [];
            this.circles = [];
            this.selectedDistrictId = null;
            this.selectedSubDivisionId = null;
            this.selectedCircleId = null;
            this.clearDropdownCache(); // Clear cache when districts update
            // Use setTimeout to avoid change detection issues
            setTimeout(() => {
              this.cdr.markForCheck();
            }, 0);
          } else if (level === 'SUB_DIVISION') {
            this.subDivisions = [...units];
            this.circles = [];
            this.selectedSubDivisionId = null;
            this.selectedCircleId = null;
            this.clearDropdownCache();
            setTimeout(() => {
              this.cdr.markForCheck();
            }, 0);
          } else if (level === 'CIRCLE') {
            this.circles = [...units];
            this.selectedCircleId = null;
            this.clearDropdownCache();
            setTimeout(() => {
              this.cdr.markForCheck();
            }, 0);
          }

          // Only log if there's an issue (empty response)
          if (units.length === 0 && level === 'DISTRICT') {
            console.warn(`No ${level} units found. Response:`, response);
          }
        },
        error: (err) => {
          console.error(`Error loading ${level} units:`, err);
          // Clear the dropdown on error
          if (level === 'DISTRICT') {
            this.districts = [];
            this.clearDropdownCache();
          } else if (level === 'SUB_DIVISION') {
            this.subDivisions = [];
            this.clearDropdownCache();
          } else if (level === 'CIRCLE') {
            this.circles = [];
            this.clearDropdownCache();
          }
        }
      });
  }

  /**
   * Setup listeners for unit hierarchy changes
   */
  setupUnitHierarchyListeners(): void {
    // Find all unit fields first
    const stateField = this.fields.find(f => {
      const ds = this.schemaService.parseDataSource(f.dataSource);
      return ds?.type === 'ADMIN_UNITS' && ds.level === 'STATE';
    });

    const districtField = this.fields.find(f => {
      const ds = this.schemaService.parseDataSource(f.dataSource);
      return ds?.type === 'ADMIN_UNITS' && ds.level === 'DISTRICT';
    });

    const subDivisionField = this.fields.find(f => {
      const ds = this.schemaService.parseDataSource(f.dataSource);
      return ds?.type === 'ADMIN_UNITS' && ds.level === 'SUB_DIVISION';
    });

    const circleField = this.fields.find(f => {
      const ds = this.schemaService.parseDataSource(f.dataSource);
      return ds?.type === 'ADMIN_UNITS' && ds.level === 'CIRCLE';
    });

    // Setup STATE field listener - triggers district load
    if (stateField) {
      this.registrationForm.get(stateField.fieldName)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(stateId => {
          if (stateId) {
            this.selectedStateId = stateId;
            // Load districts if district field exists
            if (districtField) {
              this.loadChildUnits(stateId, 'DISTRICT');
            }
            // Reset dependent fields
            if (districtField) {
              this.registrationForm.get(districtField.fieldName)?.setValue(null, { emitEvent: false });
            }
            if (subDivisionField) {
              this.registrationForm.get(subDivisionField.fieldName)?.setValue(null, { emitEvent: false });
            }
            if (circleField) {
              this.registrationForm.get(circleField.fieldName)?.setValue(null, { emitEvent: false });
            }
          } else {
            // State cleared, reset all dependent fields
            if (districtField) {
              this.districts = [];
              this.registrationForm.get(districtField.fieldName)?.setValue(null, { emitEvent: false });
            }
            if (subDivisionField) {
              this.subDivisions = [];
              this.registrationForm.get(subDivisionField.fieldName)?.setValue(null, { emitEvent: false });
            }
            if (circleField) {
              this.circles = [];
              this.registrationForm.get(circleField.fieldName)?.setValue(null, { emitEvent: false });
            }
          }
        });
    } else if (districtField) {
      // If there's a district field but no state field, districts should already be loaded
      // in loadUnitHierarchy() for the default state
    }

    // Setup DISTRICT field listener - triggers sub-division load
    if (districtField) {
      this.registrationForm.get(districtField.fieldName)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(districtId => {
          if (districtId) {
            this.selectedDistrictId = districtId;
            // Load sub-divisions if sub-division field exists
            if (subDivisionField) {
              this.loadChildUnits(districtId, 'SUB_DIVISION');
            }
            // Reset dependent fields
            if (subDivisionField) {
              this.registrationForm.get(subDivisionField.fieldName)?.setValue(null, { emitEvent: false });
            }
            if (circleField) {
              this.registrationForm.get(circleField.fieldName)?.setValue(null, { emitEvent: false });
            }
          }
        });
    }

    // Setup SUB_DIVISION field listener - triggers circle load
    if (subDivisionField) {
      this.registrationForm.get(subDivisionField.fieldName)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(subDivisionId => {
          if (subDivisionId) {
            this.selectedSubDivisionId = subDivisionId;
            // Load circles if circle field exists
            if (circleField) {
              this.loadChildUnits(subDivisionId, 'CIRCLE');
            }
            // Reset dependent field
            if (circleField) {
              this.registrationForm.get(circleField.fieldName)?.setValue(null, { emitEvent: false });
            }
          }
        });
    }

    // If there's a DISTRICT field but no STATE field, load districts directly from root
    if (districtField && !stateField) {
      console.log('District field found without state field, loading districts from root');
      this.loadRootUnits(); // This will load states, but we need to adapt it for districts
      // Actually, if there's no state, we might need a different API endpoint
      // For now, let's check if we can load districts directly
    }
  }

  /**
   * Get options for dropdown field (cached for performance)
   */
  getDropdownOptions(field: RegistrationFormField): any[] {
    const cacheKey = `${field.fieldName}_${field.dataSource || 'static'}`;

    // Check cache first
    if (this.dropdownOptionsCache.has(cacheKey)) {
      return this.dropdownOptionsCache.get(cacheKey)!;
    }

    const dataSource = this.schemaService.parseDataSource(field.dataSource);
    let options: any[] = [];

    if (dataSource?.type === 'ADMIN_UNITS') {
      if (dataSource.level === 'STATE') {
        options = this.states.map(u => ({ value: u.unitId, label: u.unitName }));
      } else if (dataSource.level === 'DISTRICT') {
        options = this.districts.map(u => ({ value: u.unitId, label: u.unitName }));
      } else if (dataSource.level === 'SUB_DIVISION') {
        options = this.subDivisions.map(u => ({ value: u.unitId, label: u.unitName }));
      } else if (dataSource.level === 'CIRCLE') {
        options = this.circles.map(u => ({ value: u.unitId, label: u.unitName }));
      }
    } else {
      // Static options from fieldOptions
      options = this.schemaService.parseFieldOptions(field.fieldOptions);
    }

    // Cache the options
    this.dropdownOptionsCache.set(cacheKey, options);
    return options;
  }

  /**
   * Clear dropdown options cache (call when units are updated)
   */
  private clearDropdownCache(): void {
    this.dropdownOptionsCache.clear();
  }

  /**
   * Get sorted fields by display order
   */
  getSortedFields(): RegistrationFormField[] {
    return this.fields.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Get fields grouped by fieldGroup
   * Returns cached grouped fields for performance
   */
  getFieldsByGroup(): { [key: string]: RegistrationFormField[] } {
    // Return cached version if available
    if (Object.keys(this.groupedFields).length > 0) {
      return this.groupedFields;
    }

    // Otherwise compute and cache
    this.groupedFields = this.computeGroupedFields();
    return this.groupedFields;
  }

  /**
   * Get group label for a group code
   */
  getGroupLabel(groupCode: string): string {
    if (groupCode === 'default') {
      return 'Other Information';
    }
    return this.fieldGroups.get(groupCode) || groupCode;
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.registrationForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const control = this.registrationForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'This field is required';
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (control.errors['minlength']) {
      return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.errors['pattern']) {
      return 'Invalid format';
    }

    return 'Invalid value';
  }

  /**
   * Handle form submission (called from form ngSubmit)
   */
  onSubmit(): void {
    this.submitForm();
  }

  /**
   * Submit form (can be called from parent component)
   */
  submitForm(): void {
    if (this.registrationForm && this.registrationForm.valid && this.onSubmitForm) {
      const formData = this.registrationForm.value;
      this.onSubmitForm(formData);
    } else if (this.registrationForm) {
      // Mark all fields as touched to show errors
      Object.keys(this.registrationForm.controls).forEach(key => {
        this.registrationForm.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Reset form
   */
  resetForm(): void {
    if (this.registrationForm) {
      this.registrationForm.reset();
    }
    this.states = [];
    this.districts = [];
    this.subDivisions = [];
    this.circles = [];
    this.selectedStateId = null;
    this.selectedDistrictId = null;
    this.selectedSubDivisionId = null;
    this.selectedCircleId = null;
    this.groupedFields = {};
    this.clearDropdownCache();
    this.loadUnitHierarchy();
  }
}
