import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { OfficerCaseService } from '../services/officer-case.service';
import { ModuleFormField, FieldType } from '../../admin/services/module-forms.service';
import { getVisibleFields, isFieldVisible, isFieldRequired } from '../../core/utils/conditional-logic';
import { validateFormData, ValidationErrors } from '../../core/utils/form-validation';
import { FormDataSourceService, parseDataSource } from '../../core/services/form-data-source.service';
import type { OptionItem } from '../../core/models/form-builder.types';

/** Emitted after successful submit — used to match workflow transitions dynamically. */
export interface ModuleFormSubmittedPayload {
  moduleType: string;
  formId?: number;
  remarks: string;
}

/**
 * Renders admin-configured module forms (any moduleType: HEARING, FIELD_REPORT, REQUEST_FIELD_REPORT, ATTENDANCE, …).
 * Loads schema from GET …/module-forms/… or …/by-form/{formId}.
 */
@Component({
  selector: 'app-module-form',
  templateUrl: './module-form.component.html',
  styleUrls: ['./module-form.component.scss'],
})
export class ModuleFormComponent implements OnInit {
  @Input() caseId!: number;
  /** When set, load and submit by form master id (correct form when multiple forms exist). */
  @Input() formId?: number;
  /** Module type code from workflow / admin (required when formId is not set). */
  @Input() moduleType?: string;
  /** Case unit id for FIELD_OFFICERS dataSource when the form has no unitId field. */
  @Input() caseUnitId?: number | null;
  @Output() formSubmitted = new EventEmitter<ModuleFormSubmittedPayload>();

  formSchema: ModuleFormField[] = [];
  formData: Record<string, unknown> = {};
  remarks: string = '';
  submittedData: any = null;
  validationErrors: ValidationErrors = {};

  loading = false;
  submitting = false;
  viewMode = false;
  /** Set from schema after load, or from [moduleType] input before load. */
  currentModuleType = '';

  fieldOptionsMap: Record<string, OptionItem[]> = {};
  optionsLoadingMap: Record<string, boolean> = {};
  latestHearingDateLabel: string | null = null;
  latestHearingDateRaw: string | null = null;
  latestHearingSubmissionId: number | null = null;

  private resolvedCaseUnitId: number | null = null;

  get visibleFields(): ModuleFormField[] {
    return getVisibleFields(this.formSchema, this.formData as Record<string, unknown>) as ModuleFormField[];
  }

  constructor(
    private officerCaseService: OfficerCaseService,
    private formDataSourceService: FormDataSourceService,
  ) {}

  ngOnInit(): void {
    if (this.moduleType) {
      this.currentModuleType = String(this.moduleType).toUpperCase();
    }
    if (this.caseId) {
      this.loadFormWithData();
    }
  }

  getModuleDisplayName(): string {
    return this.currentModuleType
      ? this.currentModuleType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Form';
  }

  loadFormWithData(): void {
    this.loading = true;
    const requestedModuleType = (this.moduleType || this.currentModuleType || '').toUpperCase();
    const load$ =
      this.formId != null
        ? this.officerCaseService.getModuleFormWithDataByFormId(this.caseId, this.formId)
        : !requestedModuleType
          ? null
          : this.officerCaseService.getModuleFormWithData(this.caseId, requestedModuleType);

    if (!load$) {
      this.loading = false;
      alert('Module type is required when form id is not set.');
      return;
    }

    load$.subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success && response.data) {
          if (response.data.schema?.fields) {
            this.formSchema = response.data.schema.fields;
            if (response.data.schema?.moduleType) {
              this.currentModuleType = String(response.data.schema.moduleType);
            }
          }

          if (response.data.hasExistingData && response.data.formData) {
            this.formData = { ...response.data.formData };
            this.viewMode = true;
            this.submittedData = { formData: response.data.formData };
          } else {
            this.initializeFormData();
          }
          this.resolvedCaseUnitId =
            this.caseUnitId != null && !Number.isNaN(Number(this.caseUnitId))
              ? Number(this.caseUnitId)
              : null;
          if (
            this.resolvedCaseUnitId != null &&
            (this.formData['unitId'] === undefined ||
              this.formData['unitId'] === null ||
              this.formData['unitId'] === '')
          ) {
            this.formData['unitId'] = this.resolvedCaseUnitId;
          }

          const needsFieldOfficerDs = this.formSchema.some((f) => {
            const ds = parseDataSource(f.dataSource);
            return ds?.type === 'FIELD_OFFICERS';
          });

          const afterUnit = (): void => {
            this.loadDataSourceOptions();
            this.loadAttendanceHeaderContextIfNeeded();
          };

          if (needsFieldOfficerDs && this.resolvedCaseUnitId == null) {
            this.officerCaseService.getCaseById(this.caseId).subscribe({
              next: (res) => {
                if (res.success && res.data?.unitId != null) {
                  this.resolvedCaseUnitId = res.data.unitId;
                  if (
                    this.formData['unitId'] === undefined ||
                    this.formData['unitId'] === null ||
                    this.formData['unitId'] === ''
                  ) {
                    this.formData['unitId'] = res.data.unitId;
                  }
                }
                afterUnit();
              },
              error: () => afterUnit(),
            });
          } else {
            afterUnit();
          }
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error(`Error loading ${this.currentModuleType || 'module'} form:`, error);
        alert(error.error?.message || `Failed to load ${this.getModuleDisplayName()} form`);
      },
    });
  }

  private loadAttendanceHeaderContextIfNeeded(): void {
    if (this.currentModuleType !== 'ATTENDANCE') {
      this.latestHearingDateLabel = null;
      this.latestHearingDateRaw = null;
      this.latestHearingSubmissionId = null;
      return;
    }
    this.officerCaseService.getParties(this.caseId).subscribe({
      next: (res: any) => {
        const raw = res?.data?.latestHearingDate;
        const submissionId = res?.data?.latestHearingSubmissionId;
        if (submissionId != null && !isNaN(Number(submissionId))) {
          this.latestHearingSubmissionId = Number(submissionId);
        }
        if (!raw) {
          this.latestHearingDateLabel = null;
          this.latestHearingDateRaw = null;
          return;
        }
        this.latestHearingDateRaw = String(raw);
        const d = new Date(raw);
        this.latestHearingDateLabel = isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
      },
      error: () => {
        this.latestHearingDateLabel = null;
        this.latestHearingDateRaw = null;
        this.latestHearingSubmissionId = null;
      },
    });
  }

  initializeFormData(): void {
    this.formSchema.forEach((field) => {
      if (this.formData[field.fieldName] !== undefined) return;
      if (field.defaultValue) {
        this.formData[field.fieldName] = field.defaultValue;
      } else if (
        field.fieldType === 'REPEATABLE_SECTION' ||
        field.fieldType === 'DYNAMIC_FILES' ||
        field.fieldType === 'MULTISELECT'
      ) {
        this.formData[field.fieldName] = [];
      }
    });
  }

  submitForm(): void {
    this.validationErrors = validateFormData(this.formSchema, this.formData as Record<string, unknown>);
    if (Object.keys(this.validationErrors).length > 0) {
      const msg = Object.entries(this.validationErrors)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      alert(`Please fix the following:\n${msg}`);
      return;
    }

    if (!confirm(`Are you sure you want to submit this ${this.getModuleDisplayName()} form?`)) {
      return;
    }

    this.submitting = true;
    const isAttendance = this.currentModuleType === 'ATTENDANCE';
    const sanitizedFormData = this.stripInternalKeys(this.formData);
    const submitFormData = isAttendance
      ? {
          ...sanitizedFormData,
          hearingSubmissionId:
            this.latestHearingSubmissionId ?? (sanitizedFormData as any).hearingSubmissionId ?? null,
          hearingDate: this.latestHearingDateRaw ?? (sanitizedFormData as any).hearingDate ?? null,
        }
      : sanitizedFormData;

    const moduleForSubmit = this.currentModuleType;
    if (!moduleForSubmit && this.formId == null) {
      this.submitting = false;
      alert('Cannot submit: module type is unknown.');
      return;
    }

    const submit$ =
      this.formId != null
        ? isAttendance
          ? this.officerCaseService.submitModuleForm(this.caseId, 'ATTENDANCE', submitFormData, this.remarks)
          : this.officerCaseService.submitModuleFormByFormId(this.caseId, this.formId, submitFormData, this.remarks)
        : this.officerCaseService.submitModuleForm(
            this.caseId,
            moduleForSubmit,
            submitFormData,
            this.remarks,
          );
    submit$.subscribe({
      next: (response) => {
        alert(`${this.getModuleDisplayName()} form submitted successfully`);
        this.submittedData = response.data;
        this.viewMode = true;
        this.submitting = false;
        this.validationErrors = {};
        this.formSubmitted.emit({
          moduleType: moduleForSubmit,
          formId: this.formId,
          remarks: this.remarks || '',
        });
      },
      error: (error) => {
        console.error('Error submitting form:', error);
        alert(`Failed to submit ${this.getModuleDisplayName()} form`);
        this.submitting = false;
      },
    });
  }

  enableEdit(): void {
    this.viewMode = false;
  }

  cancelEdit(): void {
    if (this.submittedData) {
      this.loadFormWithData();
      this.viewMode = true;
    }
  }

  refresh(): void {
    this.loadFormWithData();
  }

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
      case 'MULTISELECT': {
        if (!Array.isArray(value) || value.length === 0) return '-';
        const options = this.getOptions(field);
        return value
          .map((v) => {
            const option = options.find((o) => o.value === v || String(o.value) === String(v));
            return option ? option.label : String(v);
          })
          .join(', ');
      }
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

  /** Mat-select multiple binds to an array; normalize from API / partial data. */
  getMultiSelectValue(field: ModuleFormField): unknown[] {
    const v = this.formData[field.fieldName];
    if (Array.isArray(v)) return v;
    if (v === null || v === undefined || v === '') return [];
    return [v];
  }

  onMultiSelectChange(field: ModuleFormField, value: unknown[] | null): void {
    this.formData[field.fieldName] = Array.isArray(value) ? value : [];
    this.onFieldChange(field.fieldName, this.formData[field.fieldName]);
  }

  /** Match option values when API uses number vs string. */
  multiSelectCompare(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return String(a) === String(b);
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

  getRepeatableValue(fieldName: string): Record<string, unknown>[] {
    const v = this.formData[fieldName];
    return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
  }

  getDynamicFilesValue(fieldName: string): { fileId: string; fileName: string; fileSize: number }[] {
    const v = this.formData[fieldName];
    return Array.isArray(v) ? (v as { fileId: string; fileName: string; fileSize: number }[]) : [];
  }

  getRichTextContent(fieldName: string): string {
    const v = this.formData[fieldName];
    return v != null && typeof v === 'string' ? v : '';
  }

  onDynamicFilesChange(fieldName: string, value: { fileId: string; fileName: string; fileSize: number }[]): void {
    this.formData[fieldName] = value;
  }

  onFieldChange(fieldName: string, value: unknown): void {
    this.formData[fieldName] = value;
    this.refreshDataSourceOptionsForDependents(fieldName);
  }

  private getFormDataForDataSources(): Record<string, unknown> {
    const base = this.formData as Record<string, unknown>;
    const u = base['unitId'];
    if (this.resolvedCaseUnitId != null && (u === null || u === undefined || u === '')) {
      return { ...base, unitId: this.resolvedCaseUnitId };
    }
    return base;
  }

  loadDataSourceOptions(): void {
    this.formSchema.forEach((field) => {
      if (!parseDataSource(field.dataSource)) return;
      this.optionsLoadingMap[field.fieldName] = true;
      this.formDataSourceService
        .getOptionsForField(field, this.getFormDataForDataSources())
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

  refreshDataSourceOptionsForDependents(changedFieldName: string): void {
    this.formSchema.forEach((field) => {
      if (field.dependsOnField !== changedFieldName || !parseDataSource(field.dataSource)) return;
      this.optionsLoadingMap[field.fieldName] = true;
      this.formData[field.fieldName] = undefined;
      this.formDataSourceService
        .getOptionsForField(field, this.getFormDataForDataSources())
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

  isSelectType(fieldType: FieldType): boolean {
    return ['SELECT', 'MULTISELECT', 'RADIO'].includes(fieldType);
  }

  private stripInternalKeys(value: unknown): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.stripInternalKeys(item));
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        if (k.startsWith('__')) return;
        out[k] = this.stripInternalKeys(v);
      });
      return out;
    }
    return value;
  }
}
