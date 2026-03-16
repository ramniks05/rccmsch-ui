import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import {
  ConditionsPayload,
  ModuleType,
  MODULE_TYPES,
  MODULE_FIELDS,
  WorkflowDataKeyBinding
} from '../../../core/models/workflow-condition.types';
import { WorkflowConfigService } from '../../services/workflow-config.service';

@Component({
  selector: 'app-workflow-condition-editor',
  templateUrl: './workflow-condition-editor.component.html',
  styleUrls: ['./workflow-condition-editor.component.scss']
})
export class WorkflowConditionEditorComponent implements OnInit, OnChanges {
  @Input() initialConditions: ConditionsPayload | string | null = null;
  @Output() conditionsChange = new EventEmitter<ConditionsPayload>();

  /** Single source: from GET /api/admin/workflow/data-keys */
  keysWithBinding: WorkflowDataKeyBinding[] = [];
  loadingKeys = true;
  keysLoadError: string | null = null;

  readonly moduleTypes = MODULE_TYPES;

  /** Selected workflow data keys (workflowDataFieldsRequired) */
  selectedDataKeys = new Set<string>();
  formFields: Array<{ moduleType: ModuleType; fieldName: string }> = [];

  constructor(private workflowConfigService: WorkflowConfigService) {}

  getFieldOptions(moduleType: ModuleType): { value: string; label: string }[] {
    return MODULE_FIELDS[moduleType] ?? [];
  }

  ngOnInit(): void {
    this.loadWorkflowDataKeys();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialConditions']) {
      this.applyInitial();
    }
  }

  private loadWorkflowDataKeys(): void {
    this.loadingKeys = true;
    this.keysLoadError = null;
    this.workflowConfigService.getWorkflowDataKeys().subscribe({
      next: (res) => {
        this.loadingKeys = false;
        if (res.success && res.data?.keysWithBinding?.length) {
          // Only FORM and DOCUMENT – exclude SPECIAL (e.g. Notice accepted by applicant); user selects from module forms/documents in permission only
          const binding = res.data.keysWithBinding || [];
          this.keysWithBinding = binding.filter(
            (b: WorkflowDataKeyBinding) => b.kind === 'FORM' || b.kind === 'DOCUMENT'
          );
          this.applyInitial();
        } else {
          this.keysWithBinding = [];
          this.keysLoadError = res.message || 'No workflow data keys returned';
          this.applyInitial();
        }
      },
      error: (err) => {
        this.loadingKeys = false;
        this.keysWithBinding = [];
        this.keysLoadError = err?.error?.message || 'Failed to load workflow data keys';
        this.applyInitial();
      }
    });
  }

  private applyInitial(): void {
    const payload = this.parsePayload(this.initialConditions);
    const all = payload?.workflowDataFieldsRequired ?? [];
    this.selectedDataKeys = new Set(all);
    this.formFields = payload?.moduleFormFieldsRequired?.length
      ? [...payload.moduleFormFieldsRequired]
      : [];
    this.emitChange();
  }

  private parsePayload(src: ConditionsPayload | string | null): ConditionsPayload | null {
    if (!src) return null;
    if (typeof src === 'object') return src;
    try {
      return JSON.parse(src) as ConditionsPayload;
    } catch {
      return null;
    }
  }

  isDataKeyChecked(key: string): boolean {
    return this.selectedDataKeys.has(key);
  }

  onDataKeyChange(key: string, checked: boolean): void {
    if (checked) {
      this.selectedDataKeys.add(key);
    } else {
      this.selectedDataKeys.delete(key);
    }
    this.emitChange();
  }

  getKindBadgeClass(kind: string): string {
    if (kind === 'FORM') return 'badge-form';
    if (kind === 'DOCUMENT') return 'badge-document';
    return 'badge-special';
  }

  addFormField(): void {
    this.formFields.push({ moduleType: 'HEARING', fieldName: 'hearingDate' });
    this.emitChange();
  }

  removeFormField(index: number): void {
    this.formFields.splice(index, 1);
    this.emitChange();
  }

  onFormFieldModuleChange(index: number, moduleType: ModuleType): void {
    const opts = this.getFieldOptions(moduleType);
    this.formFields[index] = {
      moduleType,
      fieldName: opts.length ? opts[0].value : ''
    };
    this.emitChange();
  }

  onFormFieldNameChange(index: number, fieldName: string): void {
    this.formFields[index] = { ...this.formFields[index], fieldName };
    this.emitChange();
  }

  private emitChange(): void {
    const validKeys = this.keysWithBinding.length
      ? this.keysWithBinding.map(b => b.key)
      : [];
    const workflowDataFieldsRequired = [...this.selectedDataKeys].filter(k =>
      validKeys.length ? validKeys.includes(k) : true
    );
    const moduleFormFieldsRequired = this.formFields
      .filter((f) => f.moduleType && f.fieldName)
      .map((f) => ({ moduleType: f.moduleType, fieldName: f.fieldName }));

    const payload: ConditionsPayload = {};
    if (workflowDataFieldsRequired.length) {
      payload.workflowDataFieldsRequired = workflowDataFieldsRequired;
    }
    if (moduleFormFieldsRequired.length) {
      payload.moduleFormFieldsRequired = moduleFormFieldsRequired;
    }
    this.conditionsChange.emit(payload);
  }
}
