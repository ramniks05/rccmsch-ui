import { Component, OnInit, Input } from '@angular/core';
import { OfficerCaseService } from '../services/officer-case.service';
import { ModuleFormField, FieldType } from '../../admin/services/module-forms.service';
import { getVisibleFields, isFieldVisible, isFieldRequired } from '../../core/utils/conditional-logic';
import { validateFormData, ValidationErrors } from '../../core/utils/form-validation';
import { FormDataSourceService, parseDataSource } from '../../core/services/form-data-source.service';
import type { OptionItem } from '../../core/models/form-builder.types';

@Component({
  selector: 'app-hearing-form',
  templateUrl: './hearing-form.component.html',
  styleUrls: ['./hearing-form.component.scss']
})
export class HearingFormComponent implements OnInit {
  @Input() caseId!: number;
  
  // Form data
  formSchema: ModuleFormField[] = [];
  formData: Record<string, unknown> = {};
  remarks: string = '';
  submittedData: any = null;
  validationErrors: ValidationErrors = {};

  // UI state
  loading = false;
  submitting = false;
  viewMode = false;

  /** API-driven options cache (fieldName -> OptionItem[]) */
  fieldOptionsMap: Record<string, OptionItem[]> = {};
  /** Loading state per field for dataSource */
  optionsLoadingMap: Record<string, boolean> = {};

  /** Visible fields based on conditional logic (for template) */
  get visibleFields(): ModuleFormField[] {
    return getVisibleFields(this.formSchema, this.formData as Record<string, unknown>) as ModuleFormField[];
  }

  constructor(
    private officerCaseService: OfficerCaseService,
    private formDataSourceService: FormDataSourceService
  ) {}

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
          this.loadDataSourceOptions();
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
      if (this.formData[field.fieldName] !== undefined) return;
      if (field.defaultValue) {
        this.formData[field.fieldName] = field.defaultValue;
      } else if (field.fieldType === 'REPEATABLE_SECTION' || field.fieldType === 'DYNAMIC_FILES') {
        this.formData[field.fieldName] = [];
      }
    });
  }

  /**
   * Submit hearing form
   */
  submitForm(): void {
    this.validationErrors = validateFormData(
      this.formSchema,
      this.formData as Record<string, unknown>
    );
    if (Object.keys(this.validationErrors).length > 0) {
      const msg = Object.entries(this.validationErrors)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      alert(`Please fix the following:\n${msg}`);
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
        this.validationErrors = {};
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
    if (field.fieldType === 'REPEATABLE_SECTION' || field.fieldType === 'DYNAMIC_FILES') {
      return Array.isArray(value) ? `${value.length} item(s)` : value;
    }
    switch (field.fieldType) {
      case 'DATE':
        return value ? new Date(value as string).toLocaleDateString() : '';
      case 'DATETIME':
        return value ? new Date(value as string).toLocaleString() : '';
      case 'CHECKBOX':
        return value ? 'Yes' : 'No';
      case 'SELECT':
      case 'RADIO': {
        const options = this.getOptions(field);
        const option = options.find((o) => o.value === value || String(o.value) === String(value));
        return option ? option.label : value;
      }
      default:
        return value;
    }
  }

  isFieldVisible(field: ModuleFormField): boolean {
    return isFieldVisible(field, this.formData as Record<string, unknown>);
  }

  isFieldRequired(field: ModuleFormField): boolean {
    return isFieldRequired(field, this.formData as Record<string, unknown>);
  }

  onRepeatableChange(fieldName: string, value: Record<string, unknown>[]): void {
    this.formData[fieldName] = value;
  }

  /** Typed getter for repeatable section value (avoids template type errors). */
  getRepeatableValue(fieldName: string): Record<string, unknown>[] {
    const v = this.formData[fieldName];
    return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
  }

  /** Typed getter for dynamic files value (avoids template type errors). */
  getDynamicFilesValue(fieldName: string): { fileId: string; fileName: string; fileSize: number }[] {
    const v = this.formData[fieldName];
    return Array.isArray(v) ? (v as { fileId: string; fileName: string; fileSize: number }[]) : [];
  }

  /** Get rich text content as string for binding (template cannot use type casts). */
  getRichTextContent(fieldName: string): string {
    const v = this.formData[fieldName];
    return v != null && typeof v === 'string' ? v : '';
  }

  onDynamicFilesChange(fieldName: string, value: { fileId: string; fileName: string; fileSize: number }[]): void {
    this.formData[fieldName] = value;
  }

  /**
   * When a field value changes, update formData and refetch options for any field that depends on it.
   */
  onFieldChange(fieldName: string, value: unknown): void {
    this.formData[fieldName] = value;
    this.refreshDataSourceOptionsForDependents(fieldName);
  }

  /**
   * Load options from API for all fields that have dataSource.
   */
  loadDataSourceOptions(): void {
    this.formSchema.forEach((field) => {
      if (!parseDataSource(field.dataSource)) return;
      this.optionsLoadingMap[field.fieldName] = true;
      this.formDataSourceService
        .getOptionsForField(field, this.formData as Record<string, unknown>)
        .subscribe({
          next: (list) => {
            this.fieldOptionsMap[field.fieldName] = list;
            this.optionsLoadingMap[field.fieldName] = false;
          },
          error: () => {
            this.optionsLoadingMap[field.fieldName] = false;
          },
        });
    });
  }

  /**
   * Refetch options for fields whose dependsOnField is the given field name.
   */
  refreshDataSourceOptionsForDependents(changedFieldName: string): void {
    this.formSchema.forEach((field) => {
      if (field.dependsOnField !== changedFieldName || !parseDataSource(field.dataSource)) return;
      this.optionsLoadingMap[field.fieldName] = true;
      this.formData[field.fieldName] = undefined; // clear dependent value
      this.formDataSourceService
        .getOptionsForField(field, this.formData as Record<string, unknown>)
        .subscribe({
          next: (list) => {
            this.fieldOptionsMap[field.fieldName] = list;
            this.optionsLoadingMap[field.fieldName] = false;
          },
          error: () => {
            this.optionsLoadingMap[field.fieldName] = false;
          },
        });
    });
  }

  /**
   * Get options for select/radio: from API (dataSource) or static fieldOptions.
   */
  getOptions(field: ModuleFormField): OptionItem[] {
    if (parseDataSource(field.dataSource)) {
      return this.fieldOptionsMap[field.fieldName] ?? [];
    }
    if (!field.options) return [];
    try {
      const arr = JSON.parse(field.options) as { value?: string | number; label?: string }[];
      return Array.isArray(arr)
        ? arr.map((o) => ({ value: o.value ?? o.label ?? '', label: String(o.label ?? o.value ?? '') }))
        : [];
    } catch {
      return [];
    }
  }

  isOptionsLoading(field: ModuleFormField): boolean {
    return !!this.optionsLoadingMap[field.fieldName];
  }

  /**
   * Check if field type needs options
   */
  isSelectType(fieldType: FieldType): boolean {
    return ['SELECT', 'MULTISELECT', 'RADIO'].includes(fieldType);
  }
}
