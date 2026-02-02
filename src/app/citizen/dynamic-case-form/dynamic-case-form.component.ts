import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { CitizenCaseService, CaseSubmissionRequest } from '../services/citizen-case.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dynamic-case-form',
  templateUrl: './dynamic-case-form.component.html',
  styleUrls: ['./dynamic-case-form.component.scss'],
})
export class DynamicCaseFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  fields: any[] = [];
  caseTypeName = '';
  caseNatureId: number | null = null; // Legal matter (MUTATION_GIFT_SALE, PARTITION, etc.)
  caseNatureName: string = ''; // For display
  caseNatureCode: string = ''; // For reference
  caseTypeId: number | null = null; // Filing type (NEW_FILE, APPEAL, etc.)
  selectedCaseType: any = null; // Full case type object (for courtLevel, courtTypes, etc.)
  caseTypes: any[] = []; // Case types dropdown options
  courtLevel: string = ''; // Court level from selected case type
  courtTypes: string[] = []; // Court types from selected case type
  icon = 'description'; // default icon
  isSubmitting = false;
  loadingCaseTypes = false;
  loadingCourts = false;
  loadingSchema = false;
  today = new Date();
  private schemaSubscription: Subscription | null = null; // Track current schema subscription
  units: any[] = [];
  selectedUnitId: number | null = null;
  courts: any[] = []; // Courts dropdown options
  courtId: number | null = null;
  fieldGroups: any[] = []; // Master field groups for grouping fields
  preGroupedFields: Array<{ groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: any[] }> = []; // Pre-grouped fields from API
  groupedFields: Array<{ groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: any[] }> = []; // Cached grouped fields for template
  dataSourceOptions: Map<string, any[]> = new Map(); // Cache for dataSource options
  citizenUnitId: number | null = null; // From registration data

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CitizenCaseService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Initialize form so template (*ngIf="form") renders — Case Type dropdown and layout show immediately
    this.form = this.fb.group({});

    // Route parameter is caseNatureId (legal matter: MUTATION_GIFT_SALE, PARTITION, etc.)
    const routeParam = this.route.snapshot.paramMap.get('caseTypeId');
    this.caseNatureId = routeParam ? Number(routeParam) : null;

    // icon from route param
    const routeIcon = this.route.snapshot.paramMap.get('icon');
    if (routeIcon) {
      this.icon = routeIcon;
    }

    // Get citizen unitId from registration data
    this.getCitizenUnitId();

    if (this.caseNatureId && !isNaN(this.caseNatureId)) {
      console.log('Loading form for case nature ID:', this.caseNatureId);
      // Load case types (dropdown, not auto-select) - case nature name will come from case types response
      this.loadCaseTypes();
      this.loadUnits();
    } else {
      console.error('Invalid case nature ID from route:', routeParam);
      this.snackBar.open('Invalid case type selected', 'Close', { duration: 3000 });
    }
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.schemaSubscription) {
      console.log('Cleaning up schema subscription on component destroy');
      this.schemaSubscription.unsubscribe();
      this.schemaSubscription = null;
    }
  }

  /**
   * Get citizen unitId from registration data
   * Priority: circle > subdivision > district
   */
  getCitizenUnitId(): void {
    try {
      const userData = this.authService.getUserData();
      if (userData?.registrationData) {
        const registrationData = typeof userData.registrationData === 'string'
          ? JSON.parse(userData.registrationData)
          : userData.registrationData;

        this.citizenUnitId = registrationData.circle ||
                            registrationData.subdivision ||
                            registrationData.district ||
                            null;

        if (this.citizenUnitId) {
          console.log('Citizen unitId from registration:', this.citizenUnitId);
        }
      }
    } catch (error) {
      console.error('Error parsing registration data:', error);
    }
  }

  loadUnits(): void {
    // Load administrative units for selection
    this.caseService.getActiveUnits().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.units = Array.isArray(response.data) ? response.data : [];
          if (this.units.length === 0) {
            console.warn('No administrative units available');
          }
        } else {
          console.warn('Invalid response format for units:', response);
        }
      },
      error: (error: any) => {
        console.error('Error loading units:', error);
        let errorMessage = 'Failed to load administrative units';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Load form schema for the selected case type
   * GET /api/public/form-schemas/case-types/{caseTypeId} — Public endpoint (no auth required)
   * Returns fields + groups. Form schemas linked to Case Type. Validates case nature + case type.
   */
  loadSchema(caseTypeId: number): void {
    if (!caseTypeId) {
      console.error('Case type ID is required to load form schema');
      return;
    }

    if (!this.caseNatureId) {
      console.error('Case nature ID is required to validate form schema');
      return;
    }

    // Prevent multiple simultaneous calls
    if (this.loadingSchema) {
      console.warn('Schema is already loading, skipping duplicate call');
      return;
    }

    // Unsubscribe from previous call if exists
    if (this.schemaSubscription) {
      console.log('Unsubscribing from previous schema request');
      this.schemaSubscription.unsubscribe();
      this.schemaSubscription = null;
    }

    this.loadingSchema = true;
    console.log('Starting to load form schema for case type:', caseTypeId);
    console.log('Current loadingSchema state:', this.loadingSchema);

    // Safety timeout: Force stop loading after 15 seconds (before HTTP timeout)
    const safetyTimeout = setTimeout(() => {
      if (this.loadingSchema === true) {
        console.error('⚠️ SAFETY TIMEOUT: Form schema request exceeded 15 seconds - forcing stop');
        this.ngZone.run(() => {
          this.loadingSchema = false;
          if (this.schemaSubscription) {
            console.log('Unsubscribing due to safety timeout');
            this.schemaSubscription.unsubscribe();
            this.schemaSubscription = null;
          }
          this.cdr.detectChanges();
          this.snackBar.open('Request timed out. Please check your connection and try again.', 'Close', { duration: 5000 });
        });
      }
    }, 15000);

    this.schemaSubscription = this.caseService.getFormSchema(caseTypeId).pipe(
      finalize(() => {
        clearTimeout(safetyTimeout); // Clear safety timeout
        console.log('✅ Form schema observable finalized (success or error)');
        console.log('LoadingSchema BEFORE setting to false:', this.loadingSchema, 'type:', typeof this.loadingSchema);

        // Force set to false immediately (don't wait for setTimeout)
        this.loadingSchema = false;
        this.schemaSubscription = null;
        console.log('LoadingSchema set to false (immediate):', this.loadingSchema);

        // Then trigger change detection in next tick
        setTimeout(() => {
          this.ngZone.run(() => {
            // Ensure it's still false
            if (this.loadingSchema !== false) {
              console.warn('⚠️ loadingSchema was changed, resetting to false');
              this.loadingSchema = false;
            }
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            console.log('Change detection triggered (finalize setTimeout), loadingSchema:', this.loadingSchema, 'type:', typeof this.loadingSchema);
          });
        }, 0);
      })
    ).subscribe({
      next: (res) => {
        console.log('Form schema API response received (raw):', res);
        console.log('Response type:', typeof res);
        console.log('Response keys:', res ? Object.keys(res) : 'null');
        try {
          // API format: { success, message, data: { caseTypeId, caseTypeName, caseTypeCode, fields, groups, totalFields }, timestamp }
          let data: any = null;

          if (res && typeof res === 'object') {
            // Check if response has success and data properties
            if ((res as any).success && (res as any).data != null) {
              console.log('Response has success=true and data property');
              data = (res as any).data;
              console.log('Extracted data:', data);
            } else if ((res as any).data != null) {
              // Some APIs return { data: {...} } without success
              console.log('Response has data property (no success field)');
              data = (res as any).data;
              console.log('Extracted data:', data);
            } else {
              // Response might be the schema directly
              console.log('Response appears to be schema directly (no wrapper)');
              data = res;
            }
          } else {
            console.warn('Response is not an object:', res);
            data = res;
          }

          console.log('Final data to process:', data);

          if (!data || typeof data !== 'object') {
            console.error('Form schema: invalid or empty response');
            console.error('Data value:', data);
            console.error('Full response:', res);
            this.snackBar.open('Failed to load form schema: Invalid response format', 'Close', { duration: 5000 });
            return;
          }

          console.log('Data structure check:');
          console.log('- Has groups?', Array.isArray(data.groups), 'Length:', data.groups?.length);
          console.log('- Has fields?', Array.isArray(data.fields), 'Length:', data.fields?.length);
          console.log('- Has caseTypeId?', data.caseTypeId);
          console.log('- Has caseTypeName?', data.caseTypeName);

          if (data.caseTypeId != null && data.caseTypeId !== caseTypeId) {
            console.error('Form schema case type mismatch!', { expected: caseTypeId, received: data.caseTypeId });
            this.snackBar.open('Form schema does not match selected filing type. Please try again.', 'Close', { duration: 5000 });
            return;
          }

          if (data.caseTypeName || data.caseTypeCode) {
            this.caseTypeName = data.caseTypeName || data.caseTypeCode || 'Case Form';
          }

          const normalizeSchemaField = (f: any) =>
            ({ ...f, fieldType: this.normalizeFieldType(f.fieldType), isHidden: false });
          const byDisplayOrder = (a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0);

          if (data.groups && Array.isArray(data.groups) && data.groups.length > 0) {
            console.log('Processing groups structure:', data.groups.length, 'groups');
            this.preGroupedFields = data.groups
              .map((group: any, index: number) => {
                console.log(`Group ${index}:`, {
                  groupCode: group.groupCode,
                  groupLabel: group.groupLabel,
                  displayOrder: group.displayOrder,
                  fieldsCount: group.fields?.length || 0
                });

                const fields = (group.fields || [])
                  .filter((f: any) => {
                    const isActive = f.isActive !== false;
                    if (!isActive) {
                      console.log('Filtering out inactive field:', f.fieldName);
                    }
                    return isActive;
                  })
                  .map(normalizeSchemaField)
                  .sort(byDisplayOrder);

                return {
                  groupCode: group.groupCode || 'default',
                  groupLabel: group.groupLabel || group.groupCode || 'General',
                  groupDisplayOrder: group.displayOrder ?? 999,
                  fields
                };
              })
              .filter((g: { groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: any[] }) => {
                const hasFields = g.fields.length > 0;
                if (!hasFields) {
                  console.log('Filtering out empty group:', g.groupCode);
                }
                return hasFields;
              })
              .sort((a: any, b: any) => a.groupDisplayOrder - b.groupDisplayOrder);

            this.fields = this.preGroupedFields.flatMap(g => g.fields);
            this.groupedFields = [...this.preGroupedFields]; // Create new array reference for change detection
            console.log('Total fields from groups:', this.fields.length);
            console.log('Grouped fields set:', this.groupedFields.length, 'groups');
          } else if (data.fields && Array.isArray(data.fields) && data.fields.length > 0) {
            console.log('Processing flat fields structure:', data.fields.length, 'fields');
            this.preGroupedFields = [];
            this.fields = data.fields
              .filter((f: any) => {
                const isActive = f.isActive !== false;
                if (!isActive) {
                  console.log('Filtering out inactive field:', f.fieldName);
                }
                return isActive;
              })
              .map(normalizeSchemaField)
              .sort(byDisplayOrder);
            // Group flat fields for template
            this.groupedFields = this.getGroupedFieldsFromFlatFields();
            console.log('Total active fields:', this.fields.length);
          } else {
            console.warn('No groups or fields found in response');
            console.warn('Data structure:', JSON.stringify(data, null, 2));
            this.preGroupedFields = [];
            this.fields = [];
            this.groupedFields = [];
          }

          // Initialize conditional fields - hide only if dependency condition is not met
          this.fields.forEach(field => {
            if (field.dependsOnField) {
              // Initially hide dependent fields; they'll be shown when parent value matches condition
              field.isHidden = true;
            } else {
              // Ensure non-dependent fields are visible
              field.isHidden = false;
            }
          });

          console.log('Form schema loaded:', {
            totalFields: this.fields.length,
            groups: this.preGroupedFields.length,
            fieldsByType: this.fields.reduce((acc: any, f: any) => {
              acc[f.fieldType] = (acc[f.fieldType] || 0) + 1;
              return acc;
            }, {})
          });

          if (this.fields.length === 0) {
            const total = data.totalFields != null ? data.totalFields : '(not provided)';
            console.warn('Form schema: no active fields. totalFields:', total, 'groups:', data.groups?.length ?? 0, 'flat fields:', (data.fields || []).length);
            this.snackBar.open('No form fields configured for this filing type.', 'Close', { duration: 4000 });
            return; // Don't proceed if no fields
          }

          // Validate fields before building form
          this.validateFields();

          // Load dataSource options first (async), then build form
          this.loadDataSourceOptionsForFields();
          // Build form immediately (dataSource options will update dropdowns when loaded)
          this.buildForm();

          console.log('Form built with controls:', Object.keys(this.form.controls));
          console.log('Grouped fields ready for display:', this.groupedFields.length);

          // Stop loading immediately after form is built
          this.stopLoading();
        } catch (e) {
          console.error('Form schema processing error:', e);
          this.snackBar.open('Failed to process form schema', 'Close', { duration: 4000 });
        }
      },
      error: (err) => {
        console.error('Error loading form schema:', err);
        console.error('Error details:', {
          status: err?.status,
          statusText: err?.statusText,
          error: err?.error,
          message: err?.message,
          url: err?.url
        });

        // Ensure loading is stopped
        this.stopLoading();

        let errorMessage = 'Failed to load form schema';
        if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.status === 404) {
          errorMessage = 'Form schema not found for this filing type';
        } else if (err?.status === 0 || err?.statusText === 'Unknown Error') {
          errorMessage = 'Network error: Could not connect to server';
        } else if (err?.name === 'TimeoutError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        }

        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      },
    });
  }

  /**
   * Load dataSource options for fields that have dataSource configured
   */
  loadDataSourceOptionsForFields(): void {
    this.fields.forEach(field => {
      if (field.dataSource && !field.fieldOptions) {
        // Field has dataSource - load options from API
        this.loadFieldDataSource(field);
      }
    });
  }

  /**
   * Load options for a field with dataSource
   */
  loadFieldDataSource(field: any): void {
    if (!field.dataSource) return;

    const params: Record<string, string | number> = {};

    // Build params from dataSourceParams
    if (field.dataSourceParams) {
      Object.assign(params, field.dataSourceParams);
    }

    // Handle special cases
    if (field.dataSource === 'admin-units' && this.citizenUnitId && !params['parentId']) {
      // Could use citizen's unit hierarchy
    }

    this.caseService.getFormDataSource(field.dataSource, params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Convert API response to fieldOptions format
          const options = response.data.map((item: any) => {
            // Handle different data source formats
            if (field.dataSource === 'admin-units') {
              return {
                value: item.unitId || item.id,
                label: item.unitName || item.name
              };
            } else if (field.dataSource === 'courts') {
              return {
                value: item.id,
                label: item.courtName || item.name
              };
            } else if (field.dataSource === 'acts') {
              return {
                value: item.id,
                label: item.name || item.actName
              };
            } else {
              return {
                value: item.id,
                label: item.name || item.label
              };
            }
          });

          // Store in field for template access
          field.fieldOptions = JSON.stringify(options);

          // Cache for future use
          const cacheKey = `${field.dataSource}_${JSON.stringify(params)}`;
          this.dataSourceOptions.set(cacheKey, options);
          // Do NOT rebuild form — form controls already exist; we only updated fieldOptions for dropdown
        }
      },
      error: (error) => {
        console.error(`Error loading dataSource for field ${field.fieldName}:`, error);
      }
    });
  }

  /**
   * Handle conditional field dependencies
   * When a field value changes, show/hide dependent fields
   */
  onFieldValueChange(fieldName: string, value: any): void {
    // Find fields that depend on this field
    const dependentFields = this.fields.filter(f =>
      f.dependsOnField === fieldName
    );

    dependentFields.forEach(depField => {
      const shouldShow = this.checkDependencyCondition(
        depField.dependencyCondition,
        value
      );

      if (shouldShow) {
        // Show field and load its dataSource if needed
        depField.isHidden = false;
        if (depField.dataSource && !depField.fieldOptions) {
          // Update dataSourceParams with parent value
          const params: Record<string, string | number> = { ...(depField.dataSourceParams || {}) };
          if (depField.dataSource === 'admin-units' && depField.dataSourceParams?.level) {
            params['parentId'] = value;
          }
          depField.dataSourceParams = params;
          this.loadFieldDataSource(depField);
        }
      } else {
        // Hide field and clear its value
        depField.isHidden = true;
        if (this.form && this.form.get(depField.fieldName)) {
          this.form.get(depField.fieldName)?.setValue(null);
        }
      }
    });
  }

  /**
   * Check if dependency condition is met
   */
  checkDependencyCondition(condition: string | null, value: any): boolean {
    if (!condition) return true;

    // Example: "equals:1", "notEmpty", etc.
    if (condition.startsWith('equals:')) {
      const expectedValue = condition.split(':')[1];
      return String(value) === expectedValue;
    }

    if (condition === 'notEmpty') {
      return value !== null && value !== undefined && value !== '';
    }

    return true;
  }

  /**
   * Load case types for the selected case nature
   * Populate dropdown - do NOT auto-select
   * Also extracts case nature name from the first case type response (avoids separate API call)
   */
  loadCaseTypes(): void {
    if (!this.caseNatureId) return;

    this.loadingCaseTypes = true;
    this.caseService.getCaseTypesByCaseNature(this.caseNatureId).subscribe({
      next: (response) => {
        this.loadingCaseTypes = false;
        if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          this.caseTypes = response.data.filter((ct: any) => ct.isActive !== false);

          // Extract case nature info from the first case type (avoids separate API call)
          if (this.caseTypes.length > 0 && !this.caseNatureName) {
            const firstCaseType = this.caseTypes[0];
            this.caseNatureName = firstCaseType.caseNatureName ||
                                  firstCaseType.caseNatureCode ||
                                  'Case Nature';
            this.caseNatureCode = firstCaseType.caseNatureCode || '';
          }

          if (this.caseTypes.length === 0) {
            this.snackBar.open('No active filing types available for this case nature', 'Close', { duration: 3000 });
          }
        } else {
          console.warn('No case types found for case nature:', this.caseNatureId);
          this.caseTypes = [];
          this.snackBar.open('No filing types available for this case nature', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        this.loadingCaseTypes = false;
        console.error('Error loading case types:', error);
        let errorMessage = 'Failed to load filing types';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Handle case type selection change
   * Load form schema and field groups when case type is selected
   * Store case type details (courtLevel, courtTypes, etc.) for later use
   */
  onCaseTypeChange(caseTypeId: number | null): void {
    this.caseTypeId = caseTypeId;

    // Clear previous form and fields
    this.fields = [];
    this.preGroupedFields = [];
    this.groupedFields = [];
    this.form = this.fb.group({});
    this.courtId = null;
    this.courts = [];
    this.selectedCaseType = null;
    this.courtLevel = '';
    this.courtTypes = [];

    if (caseTypeId) {
      // Find and store the selected case type object
      this.selectedCaseType = this.caseTypes.find(ct => ct.id === caseTypeId);

      if (this.selectedCaseType) {
        this.caseTypeName = this.selectedCaseType.typeName ||
                           this.selectedCaseType.typeCode ||
                           'Case Form';

        // Extract court level and court types from selected case type
        this.courtLevel = this.selectedCaseType.courtLevel || '';
        this.courtTypes = this.selectedCaseType.courtTypes || [];

        // Validate that selected case type matches the case nature
        if (this.selectedCaseType.caseNatureId !== this.caseNatureId) {
          console.warn('Case type does not match case nature!', {
            selectedCaseTypeNatureId: this.selectedCaseType.caseNatureId,
            currentCaseNatureId: this.caseNatureId
          });
          this.snackBar.open('Selected filing type does not match the case nature. Please select again.', 'Close', { duration: 5000 });
          this.caseTypeId = null;
          this.selectedCaseType = null;
          return;
        }

        // Load form schema only (includes pre-grouped fields; no separate field-groups API)
        this.loadSchema(caseTypeId);

        // If unit is already selected, load courts
        if (this.selectedUnitId) {
          this.loadCourts();
        }
      }
    }
  }

  /**
   * Handle unit selection change
   * Load courts when both case type and unit are selected
   */
  onUnitChange(): void {
    this.courtId = null; // Clear court selection when unit changes
    if (this.caseTypeId && this.selectedUnitId) {
      this.loadCourts();
    } else {
      this.courts = [];
    }
  }

  /**
   * Load available courts based on case type and unit
   * Populate dropdown - do NOT auto-select
   */
  private loadCourts(): void {
    if (!this.caseTypeId || !this.selectedUnitId) {
      this.courts = [];
      return;
    }

    this.loadingCourts = true;
    this.caseService.getAvailableCourts(this.caseTypeId, this.selectedUnitId).subscribe({
      next: (response) => {
        this.loadingCourts = false;
        if (response.success && response.data && response.data.courts && Array.isArray(response.data.courts)) {
          this.courts = response.data.courts.filter((c: any) => c.isActive !== false);

          if (this.courts.length === 0) {
            this.snackBar.open('No courts available for selected case type and unit', 'Close', { duration: 3000 });
          }
        } else {
          this.courts = [];
          console.warn('No courts found for case type and unit');
        }
      },
      error: (error) => {
        this.loadingCourts = false;
        console.error('Error loading courts:', error);
        this.courts = [];
        let errorMessage = 'Failed to load available courts';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Normalize fieldType to uppercase so we match both API formats ("text"/"TEXT", "number"/"NUMBER", etc.)
   */
  /**
   * Normalize fieldType to uppercase to match template conditions
   * Maps: "dropdown" -> "SELECT", "datetime" -> "DATETIME", etc.
   * Supported types: TEXT, NUMBER, DATE, DATETIME, EMAIL, PHONE, TEXTAREA, SELECT, RADIO, CHECKBOX, FILE
   */
  normalizeFieldType(fieldType: string | undefined): string {
    if (!fieldType) return 'TEXT';
    const t = String(fieldType).toUpperCase().trim();
    // Map common variations
    if (t === 'DROPDOWN') return 'SELECT';
    if (t === 'DATETIME' || t === 'DATE_TIME') return 'DATETIME';
    // Return normalized type
    return t;
  }

  /**
   * Validate fields and log any issues
   */
  private validateFields(): void {
    const issues: string[] = [];

    this.fields.forEach(field => {
      // Check field type
      if (!field.fieldType) {
        issues.push(`Field ${field.fieldName}: Missing fieldType`);
      }

      // Check fieldOptions for SELECT/RADIO
      if ((field.fieldType === 'SELECT' || field.fieldType === 'RADIO') && !field.fieldOptions && !field.dataSource) {
        issues.push(`Field ${field.fieldName} (${field.fieldType}): Missing fieldOptions and dataSource`);
      }

      // Check validationRules format
      if (field.validationRules) {
        try {
          if (typeof field.validationRules === 'string') {
            if (field.validationRules.trim().startsWith('{')) {
              JSON.parse(field.validationRules); // Test JSON parse
            }
          }
        } catch (e) {
          issues.push(`Field ${field.fieldName}: Invalid validationRules JSON - ${(e as Error).message}`);
        }
      }

      // Check fieldOptions format for SELECT/RADIO
      if (field.fieldOptions && (field.fieldType === 'SELECT' || field.fieldType === 'RADIO')) {
        try {
          const parsed = typeof field.fieldOptions === 'string'
            ? JSON.parse(field.fieldOptions)
            : field.fieldOptions;
          if (!Array.isArray(parsed)) {
            issues.push(`Field ${field.fieldName}: fieldOptions is not an array`);
          } else if (parsed.length === 0) {
            issues.push(`Field ${field.fieldName}: fieldOptions array is empty`);
          } else {
            // Validate option structure
            parsed.forEach((opt: any, idx: number) => {
              if (!opt || typeof opt !== 'object') {
                issues.push(`Field ${field.fieldName}: Option ${idx} is not an object`);
              } else if (opt.value === undefined || opt.value === null) {
                issues.push(`Field ${field.fieldName}: Option ${idx} missing value`);
              } else if (!opt.label) {
                issues.push(`Field ${field.fieldName}: Option ${idx} missing label`);
              }
            });
          }
        } catch (e) {
          issues.push(`Field ${field.fieldName}: Invalid fieldOptions JSON - ${(e as Error).message}`);
        }
      }
    });

    if (issues.length > 0) {
      console.warn('⚠️ Field validation issues found:', issues);
      console.warn('Total issues:', issues.length, 'out of', this.fields.length, 'fields');
    } else {
      console.log('✅ All fields validated successfully');
    }
  }

  /**
   * Stop loading and trigger change detection
   * Centralized method to ensure loadingSchema is always set to false properly
   */
  private stopLoading(): void {
    this.loadingSchema = false;
    if (this.schemaSubscription) {
      this.schemaSubscription.unsubscribe();
      this.schemaSubscription = null;
    }
    // Trigger change detection in Angular zone
    this.ngZone.run(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
    console.log('Loading stopped, loadingSchema:', this.loadingSchema);
  }

  /**
   * Get unique ID for file input to ensure label for attribute matches
   */
  getFileInputId(field: any): string {
    const id = field.id || field.fieldName;
    return `file-input-${id}`;
  }

  /**
   * Get options for a field (handles both static fieldOptions and dynamic dataSource)
   */
  getFieldOptions(field: any): any[] {
    // If field has static options (fieldOptions JSON string)
    if (field.fieldOptions) {
      try {
        let parsed: any;
        if (typeof field.fieldOptions === 'string') {
          // Try parsing as JSON
          parsed = JSON.parse(field.fieldOptions);
        } else {
          // Already an object/array
          parsed = field.fieldOptions;
        }

        if (Array.isArray(parsed)) {
          // Validate options structure
          const validOptions = parsed.filter((opt: any) => {
            if (!opt || typeof opt !== 'object') {
              console.warn(`Invalid option in field ${field.fieldName}:`, opt);
              return false;
            }
            if (opt.value === undefined || opt.value === null) {
              console.warn(`Option missing value in field ${field.fieldName}:`, opt);
              return false;
            }
            return true;
          });
          return validOptions;
        } else {
          console.warn(`fieldOptions for ${field.fieldName} is not an array:`, parsed);
        }
      } catch (e) {
        console.error(`Error parsing fieldOptions JSON for field ${field.fieldName}:`, e);
        console.error('Raw fieldOptions:', field.fieldOptions);
      }
    }

    // If field has dataSource, check if options are already loaded
    if (field.dataSource && this.dataSourceOptions.has(field.dataSource)) {
      const options = this.dataSourceOptions.get(field.dataSource);
      if (Array.isArray(options)) {
        return options;
      }
    }

    // Return empty array if no options available
    return [];
  }

  /**
   * Check if a field should be shown (not hidden by conditional logic)
   */
  isFieldVisible(field: any): boolean {
    if (field.isHidden === true) return false;
    if (!field.dependsOnField) return true;

    const parentField = this.fields.find(f => f.fieldName === field.dependsOnField);
    if (!parentField || !this.form) return true;

    const parentValue = this.form.get(parentField.fieldName)?.value;
    return this.checkDependencyCondition(field.dependencyCondition, parentValue);
  }

  /**
   * Group flat fields by fieldGroup (used when API doesn't return pre-grouped fields)
   * Returns an array of groups, each containing fields sorted by displayOrder
   */
  private getGroupedFieldsFromFlatFields(): Array<{ groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: any[] }> {
    if (!this.fields || this.fields.length === 0) {
      return [];
    }

    const groupsMap = new Map<string, { groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: any[] }>();

    this.fields.forEach(field => {
      const groupCode = field.fieldGroup || 'default';

      // Find group metadata from master field groups
      const masterGroup = this.fieldGroups.find(g => g.groupCode === groupCode);
      const groupLabel = masterGroup?.groupLabel || field.groupLabel || groupCode || 'General';
      const groupDisplayOrder = masterGroup?.displayOrder || field.groupDisplayOrder || 999;

      if (!groupsMap.has(groupCode)) {
        groupsMap.set(groupCode, {
          groupCode,
          groupLabel,
          groupDisplayOrder,
          fields: []
        });
      }

      groupsMap.get(groupCode)!.fields.push(field);
    });

    // Convert map to array and sort by groupDisplayOrder, then sort fields within each group by displayOrder
    return Array.from(groupsMap.values())
      .map(group => ({
        ...group,
        fields: group.fields.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      }))
      .sort((a, b) => a.groupDisplayOrder - b.groupDisplayOrder);
  }

  /**
   * Get grouped fields (for backward compatibility - now uses cached property)
   * @deprecated Use groupedFields property directly in template
   */
  getGroupedFields(): Array<{ groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: any[] }> {
    return this.groupedFields;
  }

  buildForm(): void {
    const group: any = {};

    console.log('Building form with fields:', this.fields.length, 'visible fields:', this.fields.filter(f => !f.isHidden).length);

    this.fields.forEach((field) => {
      // Skip hidden fields (they'll be added when dependency condition is met)
      if (field.isHidden) {
        console.log('Skipping hidden field:', field.fieldName, 'dependsOn:', field.dependsOnField);
        return;
      }

      const validators = [];

      if (field.isRequired) {
        validators.push(Validators.required);
      }

      // Parse validation rules (can be JSON string or plain string like "min:0.01,max:1000")
      if (field.validationRules) {
        try {
          let rules: any = {};

          if (typeof field.validationRules === 'string') {
            // Try parsing as JSON first (if it starts with {)
            if (field.validationRules.trim().startsWith('{')) {
              rules = JSON.parse(field.validationRules);
            } else {
              // Parse as key:value format
              rules = this.parseValidationRules(field.validationRules);
            }
          } else if (typeof field.validationRules === 'object') {
            // Already an object
            rules = field.validationRules;
          }

          // Apply validators based on rules
          if (rules.minLength != null) {
            validators.push(Validators.minLength(Number(rules.minLength)));
          }
          if (rules.maxLength != null) {
            validators.push(Validators.maxLength(Number(rules.maxLength)));
          }
          if (rules.min != null && rules.min !== undefined) {
            validators.push(Validators.min(Number(rules.min)));
          }
          if (rules.max != null && rules.max !== undefined) {
            validators.push(Validators.max(Number(rules.max)));
          }
          if (rules.pattern) {
            validators.push(Validators.pattern(String(rules.pattern)));
          }
          if (rules.required === true && !field.isRequired) {
            // If validationRules says required but field.isRequired is false, add required validator
            validators.push(Validators.required);
          }
        } catch (e) {
          console.error(`Error parsing validationRules for field ${field.fieldName}:`, e);
          console.error('Raw validationRules:', field.validationRules);
        }
      }

      // Set initial value
      let initialValue = field.defaultValue ?? null;

      // Handle different field types (use normalized fieldType)
      const ft = (field.fieldType || '').toUpperCase();
      if (ft === 'NUMBER' && initialValue != null) {
        initialValue = parseFloat(String(initialValue));
        if (isNaN(initialValue)) initialValue = null;
      } else if (ft === 'CHECKBOX') {
        initialValue = initialValue === 'true' || initialValue === true || initialValue === '1' || initialValue === 1;
      } else if (ft === 'RADIO' || ft === 'SELECT') {
        // For radio/select, ensure value matches one of the options
        if (initialValue != null && field.fieldOptions) {
          try {
            const options = typeof field.fieldOptions === 'string'
              ? JSON.parse(field.fieldOptions)
              : field.fieldOptions;
            if (Array.isArray(options) && !options.some((opt: any) => opt.value === initialValue)) {
              initialValue = null; // Invalid option value
            }
          } catch (e) {
            // Invalid JSON, keep initialValue as is
          }
        }
      }

      group[field.fieldName] = [initialValue, validators];
    });

    this.form = this.fb.group(group);

    console.log('Form controls created:', Object.keys(group).length, 'controls:', Object.keys(group));

    // Subscribe to field value changes for conditional fields
    Object.keys(this.form.controls).forEach(fieldName => {
      const field = this.fields.find(f => f.fieldName === fieldName);
      if (field && field.dependsOnField) {
        // This field depends on another - listen to parent field changes
        const parentField = this.fields.find(f => f.fieldName === field.dependsOnField);
        if (parentField && this.form.get(parentField.fieldName)) {
          // Check initial value and show/hide dependent field
          const parentValue = this.form.get(parentField.fieldName)?.value;
          if (parentValue) {
            this.onFieldValueChange(parentField.fieldName, parentValue);
          }

          // Listen to future changes
          this.form.get(parentField.fieldName)?.valueChanges.subscribe(value => {
            this.onFieldValueChange(parentField.fieldName, value);
          });
        }
      }
    });
  }

  /**
   * Parse validation rules string like "min:0.01,max:1000"
   */
  parseValidationRules(rules: string): any {
    const result: any = {};
    if (!rules) return result;

    const parts = rules.split(',');
    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (key && value) {
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();

        if (trimmedKey === 'min' || trimmedKey === 'max') {
          result[trimmedKey] = parseFloat(trimmedValue);
        } else if (trimmedKey === 'minLength' || trimmedKey === 'maxLength') {
          result[trimmedKey] = parseInt(trimmedValue, 10);
        } else {
          result[trimmedKey] = trimmedValue;
        }
      }
    });

    return result;
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

    if (!this.selectedUnitId) {
      this.snackBar.open('Please select an administrative unit', 'Close', { duration: 3000 });
      return;
    }

    if (!this.caseNatureId) {
      this.snackBar.open('Invalid case nature', 'Close', { duration: 3000 });
      return;
    }

    if (!this.caseTypeId) {
      this.snackBar.open('Please select a filing type', 'Close', { duration: 3000 });
      return;
    }

    if (!this.courtId) {
      this.snackBar.open('Please select a court', 'Close', { duration: 3000 });
      return;
    }

    this.submitCase();
  }

  /**
   * Submit the case to the backend
   */
  private submitCase(): void {
    this.isSubmitting = true;

    // Prepare form data - convert dates and files to strings
    const formValues: any = {};
    Object.entries(this.form.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // Handle Date objects
        if (value instanceof Date) {
          formValues[key] = value.toISOString().split('T')[0];
        } else if (value instanceof File) {
          // For files, we'll store the file name for now
          // In production, you might want to upload files separately
          formValues[key] = value.name;
        } else {
          formValues[key] = value;
        }
      }
    });

    // Convert form data to JSON string
    const caseDataJson = JSON.stringify(formValues);

    // Get applicant ID from authenticated user
    const userData = this.authService.getUserData();
    const applicantId = userData?.userId || userData?.id;

    if (!applicantId) {
      this.isSubmitting = false;
      this.snackBar.open('User not authenticated. Please login again.', 'Close', { duration: 5000 });
      console.error('No applicantId found in user data:', userData);
      return;
    }

    // Use citizen's unitId from registration if available, otherwise use selected unit
    const unitIdToUse = this.citizenUnitId || this.selectedUnitId;

    // Prepare submission request (per documentation: POST /api/citizen/cases)
    const submissionRequest: CaseSubmissionRequest = {
      applicantId: applicantId,
      caseNatureId: this.caseNatureId!,
      caseTypeId: this.caseTypeId!,
      unitId: unitIdToUse!,
      courtId: this.courtId!,
      subject: formValues.subject || `${this.caseTypeName} Application`,
      description: formValues.description || '',
      priority: formValues.priority || 'MEDIUM',
      caseData: caseDataJson
    };

    // Submit case
    this.caseService.submitCase(submissionRequest).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.snackBar.open('Case submitted successfully!', 'Close', { duration: 5000 });
          // Redirect to my cases after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/citizen/my-cases']);
          }, 2000);
        } else {
          this.snackBar.open(response.message || 'Failed to submit case', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        let errorMessage = 'Failed to submit case';

        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.snackBar.open(errorMessage, 'Close', { duration: 6000 });
        console.error('Case submission error:', error);
      }
    });
  }
}
