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
  /** Cache for normalized static fieldOptions (value/label) to avoid re-parsing on every change detection */
  private fieldOptionsCache = new Map<string, { value: string; label: string }[]>();
  /** Debounce timer per field to avoid duplicate external API calls when multiple parents trigger reload */
  private loadDataSourceDebounce = new Map<string, ReturnType<typeof setTimeout>>();
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
    this.loadDataSourceDebounce.forEach(t => clearTimeout(t));
    this.loadDataSourceDebounce.clear();
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

          this.fieldOptionsCache.clear();
          this.dataSourceOptions.clear();

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
            if (this.getParentFieldNames(field).length > 0) {
              // Initially hide dependent fields; they'll be shown when parent value(s) match
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
   * Whether field.dataSource is external API config (JSON with type "API").
   */
  private isExternalApiDataSource(dataSource: any): boolean {
    if (dataSource == null || typeof dataSource !== 'string') return false;
    const s = dataSource.trim();
    if (!s.startsWith('{')) return false;
    try {
      const parsed = JSON.parse(s);
      return parsed && String(parsed.type).toUpperCase() === 'API';
    } catch {
      return false;
    }
  }

  /**
   * Build runtime params for external API. Key comes from dataSourceParams.parentValueQueryParam
   * (e.g. "Nvcode" for CHD Revenue GetMustkhas_Rccms). For two-level dependency (e.g. GetOwnerDetailsByMustKhas
   * with MUST + NVCODE), use dataSourceParams.parentDependencies instead.
   * Backend must forward these as query params.
   */
  private getExternalApiRuntimeParams(field: any): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (!this.form) return params;

    // Multi-param dependency (e.g. MUST + NVCODE for GetOwnerDetailsByMustKhas)
    let parentDependencies: Array<{ field: string; paramName: string }> | null = null;
    if (field.dataSourceParams) {
      try {
        const p = typeof field.dataSourceParams === 'string'
          ? JSON.parse(field.dataSourceParams) : field.dataSourceParams;
        if (p && Array.isArray(p.parentDependencies) && p.parentDependencies.length > 0) {
          parentDependencies = p.parentDependencies;
        }
      } catch (_) {}
    }

    if (parentDependencies) {
      for (const dep of parentDependencies) {
        const parentValue = this.form.get(dep.field)?.value;
        if (parentValue == null || parentValue === '') return {}; // require all parents
        params[dep.paramName] = parentValue;
      }
      return params;
    }

    // Single parent (dependsOnField + parentValueQueryParam)
    if (!field.dependsOnField) return params;
    const parentValue = this.form.get(field.dependsOnField)?.value;
    if (parentValue == null || parentValue === '') return params;
    let paramName = 'Nvcode'; // CHD Revenue APIs expect Nvcode; override via dataSourceParams.parentValueQueryParam
    if (field.dataSourceParams) {
      try {
        const p = typeof field.dataSourceParams === 'string'
          ? JSON.parse(field.dataSourceParams) : field.dataSourceParams;
        if (p && typeof p.parentValueQueryParam === 'string' && p.parentValueQueryParam.trim()) {
          paramName = p.parentValueQueryParam.trim();
        }
      } catch (_) {}
    }
    params[paramName] = parentValue;
    return params;
  }

  /** Parent field names that affect this field (for reload/visibility). */
  private getParentFieldNames(field: any): string[] {
    let parentDependencies: Array<{ field: string; paramName: string }> | null = null;
    if (field.dataSourceParams) {
      try {
        const p = typeof field.dataSourceParams === 'string'
          ? JSON.parse(field.dataSourceParams) : field.dataSourceParams;
        if (p && Array.isArray(p.parentDependencies) && p.parentDependencies.length > 0) {
          parentDependencies = p.parentDependencies;
        }
      } catch (_) {}
    }
    if (parentDependencies) return parentDependencies.map(d => d.field);
    if (field.dependsOnField) return [field.dependsOnField];
    return [];
  }

  /**
   * Load options for a field with dataSource (internal GET or external API POST).
   */
  loadFieldDataSource(field: any): void {
    if (!field.dataSource) return;

    // External API: POST to /external-api with body
    if (this.isExternalApiDataSource(field.dataSource)) {
      const parentNames = this.getParentFieldNames(field);
      const runtimeParams = this.getExternalApiRuntimeParams(field);
      // Don't call API when we have parent deps but any value is missing
      if (parentNames.length > 0 && Object.keys(runtimeParams).length === 0) {
        field.fieldOptions = null;
        this.cdr.markForCheck();
        return;
      }
      // Debounce so two parent valueChanges in quick succession trigger only one API call
      const key = field.fieldName;
      const existing = this.loadDataSourceDebounce.get(key);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.loadDataSourceDebounce.delete(key);
        const params = this.getExternalApiRuntimeParams(field);
        if (parentNames.length > 0 && Object.keys(params).length === 0) {
          field.fieldOptions = null;
          this.cdr.markForCheck();
          return;
        }
        this.caseService.getExternalApiDataSource(field.dataSource, params).subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data)) {
            const options = response.data.map((item: any) => ({
              value: item.value != null ? item.value : item.id,
              label: item.label != null ? item.label : item.name || String(item.value)
            }));
            field.fieldOptions = JSON.stringify(options);
            const cacheKey = `${field.dataSource}_${JSON.stringify(params)}`;
            this.dataSourceOptions.set(cacheKey, options);
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error(`Error loading external API dataSource for field ${field.fieldName}:`, error);
          this.cdr.markForCheck();
        }
      });
      }, 150);
      this.loadDataSourceDebounce.set(key, timer);
      return;
    }

    // Internal data source: GET /form-data-sources/{dataSource}
    const params: Record<string, string | number> = {};
    if (field.dataSourceParams) {
      try {
        const p = typeof field.dataSourceParams === 'string'
          ? JSON.parse(field.dataSourceParams) : field.dataSourceParams;
        if (p && typeof p === 'object') Object.assign(params, p);
      } catch (_) {
        Object.assign(params, field.dataSourceParams);
      }
    }
    if (field.dataSource === 'admin-units' && this.citizenUnitId && !params['parentId']) {
      // Could use citizen's unit hierarchy
    }

    this.caseService.getFormDataSource(field.dataSource, params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const options = response.data.map((item: any) => {
            if (field.dataSource === 'admin-units') {
              return { value: item.unitId || item.id, label: item.unitName || item.name };
            }
            if (field.dataSource === 'courts') {
              return { value: item.id, label: item.courtName || item.name };
            }
            if (field.dataSource === 'acts') {
              return { value: item.id, label: item.name || item.actName };
            }
            return { value: item.id, label: item.name || item.label };
          });
          field.fieldOptions = JSON.stringify(options);
          const cacheKey = `${field.dataSource}_${JSON.stringify(params)}`;
          this.dataSourceOptions.set(cacheKey, options);
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        console.error(`Error loading dataSource for field ${field.fieldName}:`, error);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle conditional field dependencies
   * When a field value changes, show/hide dependent fields
   */
  onFieldValueChange(fieldName: string, value: any): void {
    // If this field has onChangeApi config (dropdown -> call API and fill textboxes), run it first
    const changedField = this.fields.find(f => f.fieldName === fieldName);
    if (changedField && this.getOnChangeApiConfig(changedField)) {
      if (value != null && value !== '') {
        this.loadOnChangeApiAndPatchFields(changedField, value);
      } else {
        // Clear mapped fields when dropdown is cleared
        const mapping = this.getOnChangeResponseMapping(changedField);
        if (this.form && Object.keys(mapping).length > 0) {
          Object.values(mapping).forEach(formFieldName => {
            const control = this.form.get(formFieldName);
            if (control) control.setValue(null, { emitEvent: false });
          });
          this.cdr.markForCheck();
        }
      }
    }

    // Find fields that depend on this field (single parent or any parent in parentDependencies)
    const dependentFields = this.fields.filter(f => {
      if (f.dependsOnField === fieldName) return true;
      const parentNames = this.getParentFieldNames(f);
      return parentNames.includes(fieldName);
    });

    dependentFields.forEach(depField => {
      const parentNames = this.getParentFieldNames(depField);
      const firstParent = parentNames[0];
      const shouldShow = firstParent
        ? this.checkDependencyCondition(
            depField.dependencyCondition,
            this.form?.get(firstParent)?.value ?? value
          )
        : true;

      if (shouldShow) {
        depField.isHidden = false;
        if (depField.dataSource) {
          // Reload options when parent value changes (so dependent dropdown gets new list)
          depField.fieldOptions = null;
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
   * Get onChange API config from field (dropdown: on selection change call API and fill other fields).
   * Supports additionalParams to send other form field values (e.g. NVCODE from village dropdown).
   */
  private getOnChangeApiConfig(field: any): {
    dataSource: string;
    selectedValueParamName: string;
    additionalParams?: Array<{ field: string; paramName: string }>;
  } | null {
    const raw = field.onChangeApi || field.valueChangeApi;
    if (!raw) return null;
    try {
      const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!config || config.type !== 'API' || !config.apiConfigKey || !config.dataEndpoint) return null;
      const paramName = (config.selectedValueParamName || config.paramName || 'id').trim();
      const dataSource = typeof raw === 'string' ? raw : JSON.stringify(config);
      const additionalParams = Array.isArray(config.additionalParams) ? config.additionalParams : undefined;
      return { dataSource, selectedValueParamName: paramName, additionalParams };
    } catch {
      return null;
    }
  }

  /**
   * Parse response-to-field mapping from field.onChangeResponseMapping (JSON string or object).
   * Keys = response property names (or dot path), values = form field names to patch.
   */
  private getOnChangeResponseMapping(field: any): Record<string, string> {
    const raw = field.onChangeResponseMapping || field.responseFieldMapping;
    if (!raw) return {};
    try {
      const map = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return map && typeof map === 'object' ? map : {};
    } catch {
      return {};
    }
  }

  /**
   * Get a nested value from an object by dot path (e.g. "owner.address.line1").
   */
  private getValueByPath(obj: any, path: string): any {
    if (obj == null || !path) return undefined;
    const parts = path.trim().split('.');
    let current = obj;
    for (const p of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[p];
    }
    return current;
  }

  /**
   * When a dropdown selection changes and the field has onChangeApi config, call the external API
   * with the selected value and patch mapped form fields from the response.
   */
  loadOnChangeApiAndPatchFields(field: any, selectedValue: any): void {
    const config = this.getOnChangeApiConfig(field);
    const mapping = this.getOnChangeResponseMapping(field);
    if (!config || !this.form || Object.keys(mapping).length === 0) return;

    const runtimeParams: Record<string, string | number> = {
      [config.selectedValueParamName]: selectedValue
    };
    // Add params from other form fields (e.g. NVCODE from village for GetOwnerDetailsByMustKhas)
    if (config.additionalParams && config.additionalParams.length > 0) {
      for (const ap of config.additionalParams) {
        const val = this.form.get(ap.field)?.value;
        if (val != null && val !== '') runtimeParams[ap.paramName] = val;
      }
    }
    // If API needs both MUST and NVCODE, skip call when a required param is missing
    if (config.additionalParams?.length && Object.keys(runtimeParams).length < 1 + config.additionalParams.length) {
      Object.keys(mapping).forEach(formFieldName => {
        const control = this.form.get(formFieldName);
        if (control) control.setValue(null, { emitEvent: false });
      });
      this.cdr.markForCheck();
      return;
    }

    this.caseService.getExternalApiDataSource(config.dataSource, runtimeParams).subscribe({
      next: (response) => {
        if (!response.success || response.data == null) return;
        // Backend may return data as array (e.g. [item]) or single object
        let data: any = response.data;
        if (Array.isArray(data) && data.length > 0) data = data[0];
        else if (Array.isArray(data)) return;

        Object.entries(mapping).forEach(([responseKey, formFieldName]) => {
          const control = this.form.get(formFieldName);
          if (!control) return;
          const value = this.getValueByPath(data, responseKey);
          if (value !== undefined && value !== null) {
            control.setValue(value, { emitEvent: false });
          }
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(`OnChange API for field ${field.fieldName}:`, err);
        this.cdr.markForCheck();
      }
    });
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
    this.fieldOptionsCache.clear();
    this.dataSourceOptions.clear();

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
            // Validate option structure (accept value/label, nvcode/villagename, id/name, code/name)
            parsed.forEach((opt: any, idx: number) => {
              if (!opt || typeof opt !== 'object') {
                issues.push(`Field ${field.fieldName}: Option ${idx} is not an object`);
              } else {
                const hasValue = opt.value !== undefined && opt.value !== null
                  || opt.nvcode !== undefined && opt.nvcode !== null
                  || opt.id !== undefined && opt.id !== null
                  || opt.code !== undefined && opt.code !== null;
                const hasLabel = opt.label != null || opt.villagename != null || opt.name != null;
                if (!hasValue) {
                  issues.push(`Field ${field.fieldName}: Option ${idx} missing value`);
                } else if (!hasLabel) {
                  issues.push(`Field ${field.fieldName}: Option ${idx} missing label`);
                }
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
   * Normalize option object to { value, label } format.
   * API may send value/label, nvcode/villagename, id/name, code/name, etc.
   */
  private normalizeOption(opt: any): { value: string; label: string } | null {
    if (!opt || typeof opt !== 'object') return null;
    let value: string | undefined;
    let label: string | undefined;
    if (opt.value !== undefined && opt.value !== null) {
      value = String(opt.value);
      label = opt.label != null ? String(opt.label) : value;
    } else if (opt.nvcode !== undefined && opt.nvcode !== null) {
      value = String(opt.nvcode);
      label = opt.villagename != null ? String(opt.villagename) : value;
    } else if (opt.id !== undefined && opt.id !== null) {
      value = String(opt.id);
      label = opt.name != null ? String(opt.name) : value;
    } else if (opt.code !== undefined && opt.code !== null) {
      value = String(opt.code);
      label = opt.name != null ? String(opt.name) : value;
    } else {
      return null;
    }
    return { value, label };
  }

  /**
   * Get options for a field (handles both static fieldOptions and dynamic dataSource).
   * Caches normalized static options to avoid re-parsing on every change detection (stops dropdown "roaming").
   */
  getFieldOptions(field: any): { value: string; label: string }[] {
    if (!field) return [];

    // If field has static options (fieldOptions JSON string), parse and cache
    if (field.fieldOptions != null && field.fieldOptions !== '') {
      const cacheKey = `static_${field.id ?? field.fieldName}`;
      const cached = this.fieldOptionsCache.get(cacheKey);
      if (cached) return cached;

      try {
        let parsed: any;
        const raw = field.fieldOptions;
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          parsed = trimmed ? JSON.parse(trimmed) : [];
        } else if (Array.isArray(raw)) {
          parsed = raw;
        } else {
          parsed = [];
        }

        if (Array.isArray(parsed)) {
          const normalized: { value: string; label: string }[] = [];
          for (const opt of parsed) {
            const n = this.normalizeOption(opt);
            if (n) normalized.push(n);
          }
          this.fieldOptionsCache.set(cacheKey, normalized);
          return normalized;
        }
      } catch (e) {
        console.error(`Error parsing fieldOptions JSON for field ${field.fieldName}:`, e);
        console.error('Raw fieldOptions (first 200 chars):', String(field.fieldOptions).slice(0, 200));
      }
    }

    // If field has dataSource, check if options are already loaded
    if (field.dataSource) {
      const runtimeParams = this.isExternalApiDataSource(field.dataSource)
        ? this.getExternalApiRuntimeParams(field)
        : (field.dataSourceParams || {});
      const cacheKey = `${field.dataSource}_${JSON.stringify(runtimeParams)}`;
      if (this.dataSourceOptions.has(cacheKey)) {
        const options = this.dataSourceOptions.get(cacheKey);
        if (Array.isArray(options)) return options;
      }
    }

    return [];
  }

  /**
   * Check if a field should be shown (not hidden by conditional logic)
   */
  isFieldVisible(field: any): boolean {
    if (field.isHidden === true) return false;
    const parentNames = this.getParentFieldNames(field);
    if (parentNames.length === 0) return true;

    if (!this.form) return true;
    // For multi-parent (e.g. parentDependencies), all parents must have a value
    for (const p of parentNames) {
      const parentValue = this.form.get(p)?.value;
      if (parentValue == null || parentValue === '') return false;
    }
    const parentField = this.fields.find(f => f.fieldName === parentNames[0]);
    if (!parentField) return true;
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
      // Add a control for every field so dependent fields have a control when they become visible
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
        // For radio/select, ensure value matches one of the options (supports value/label or nvcode/villagename etc.)
        if (initialValue != null && field.fieldOptions) {
          try {
            const options = typeof field.fieldOptions === 'string'
              ? JSON.parse(field.fieldOptions)
              : field.fieldOptions;
            if (Array.isArray(options)) {
              const matches = (opt: any) => {
                const v = opt?.value ?? opt?.nvcode ?? opt?.id ?? opt?.code;
                return v != null && String(v) === String(initialValue);
              };
              if (!options.some(matches)) initialValue = null; // Invalid option value
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
    const seenParentSubs = new Set<string>(); // avoid duplicate subscriptions per control
    this.fields.forEach(f => {
      const parentNames = this.getParentFieldNames(f);
      parentNames.forEach(parentFieldName => {
        const subKey = parentFieldName;
        if (seenParentSubs.has(subKey)) return;
        seenParentSubs.add(subKey);
        const parentControl = this.form.get(parentFieldName);
        if (!parentControl) return;
        parentControl.valueChanges.subscribe(value => {
          this.onFieldValueChange(parentFieldName, value);
        });
      });
    });
    // Initial load for dependent fields: run once per field when all parents have values (avoids double API call)
    this.fields.forEach(f => {
      const parentNames = this.getParentFieldNames(f);
      if (parentNames.length === 0) return;
      const allPresent = parentNames.every(
        p => this.form.get(p)?.value != null && this.form.get(p)?.value !== ''
      );
      if (allPresent && f.dataSource) {
        this.loadFieldDataSource(f);
      } else {
        // Show/hide based on first parent so visibility is correct
        const firstParent = parentNames[0];
        const parentValue = this.form.get(firstParent)?.value;
        if (parentValue != null && parentValue !== '') {
          this.onFieldValueChange(firstParent, parentValue);
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
