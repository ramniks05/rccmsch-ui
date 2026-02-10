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
  WORKFLOW_FLAGS,
  MODULE_TYPES,
  MODULE_FIELDS
} from '../../../core/models/workflow-condition.types';

@Component({
  selector: 'app-workflow-condition-editor',
  templateUrl: './workflow-condition-editor.component.html',
  styleUrls: ['./workflow-condition-editor.component.scss']
})
export class WorkflowConditionEditorComponent implements OnInit, OnChanges {
  @Input() initialConditions: ConditionsPayload | string | null = null;
  @Output() conditionsChange = new EventEmitter<ConditionsPayload>();

  readonly formFlags = WORKFLOW_FLAGS.formSubmitted;
  readonly docFlags = WORKFLOW_FLAGS.documentReady;
  readonly docSignedFlags = WORKFLOW_FLAGS.documentSigned;
  readonly moduleTypes = MODULE_TYPES;

  selectedFormFlags: Set<string> = new Set();
  selectedDocFlags: Set<string> = new Set();
  selectedDocSignedFlags: Set<string> = new Set();
  formFields: Array<{ moduleType: ModuleType; fieldName: string }> = [];

  getFieldOptions(moduleType: ModuleType): { value: string; label: string }[] {
    return MODULE_FIELDS[moduleType] ?? [];
  }

  ngOnInit(): void {
    this.applyInitial();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialConditions']) {
      this.applyInitial();
    }
  }

  private readonly formFlagValues = ['HEARING_SUBMITTED', 'NOTICE_SUBMITTED', 'ORDERSHEET_SUBMITTED', 'JUDGEMENT_SUBMITTED'];
  private readonly docFlagValues = ['NOTICE_READY', 'ORDERSHEET_READY', 'JUDGEMENT_READY'];
  private readonly docSignedFlagValues = ['NOTICE_SIGNED', 'ORDERSHEET_SIGNED', 'JUDGEMENT_SIGNED'];

  private applyInitial(): void {
    const payload = this.parsePayload(this.initialConditions);
    const all = payload?.workflowDataFieldsRequired ?? [];
    this.selectedFormFlags = new Set(all.filter((f: string) => this.formFlagValues.includes(f)));
    this.selectedDocFlags = new Set(all.filter((f: string) => this.docFlagValues.includes(f)));
    this.selectedDocSignedFlags = new Set(all.filter((f: string) => this.docSignedFlagValues.includes(f)));
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

  isFormFlagChecked(value: string): boolean {
    return this.selectedFormFlags.has(value);
  }

  isDocFlagChecked(value: string): boolean {
    return this.selectedDocFlags.has(value);
  }

  onFormFlagChange(value: string, checked: boolean): void {
    if (checked) {
      this.selectedFormFlags.add(value);
    } else {
      this.selectedFormFlags.delete(value);
    }
    this.emitChange();
  }

  onDocFlagChange(value: string, checked: boolean): void {
    if (checked) {
      this.selectedDocFlags.add(value);
    } else {
      this.selectedDocFlags.delete(value);
    }
    this.emitChange();
  }

  isDocSignedFlagChecked(value: string): boolean {
    return this.selectedDocSignedFlags.has(value);
  }

  onDocSignedFlagChange(value: string, checked: boolean): void {
    if (checked) {
      this.selectedDocSignedFlags.add(value);
    } else {
      this.selectedDocSignedFlags.delete(value);
    }
    this.emitChange();
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
    const workflowDataFieldsRequired = [
      ...this.selectedFormFlags,
      ...this.selectedDocFlags,
      ...this.selectedDocSignedFlags
    ];
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
