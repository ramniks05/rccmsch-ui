import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ItemSchemaField } from '../../../core/models/form-builder.types';

function parseItemSchema(schemaJson: string | null | undefined): ItemSchemaField[] {
  if (!schemaJson?.trim()) return [];
  try {
    return JSON.parse(schemaJson) as ItemSchemaField[];
  } catch {
    return [];
  }
}

function parseValidationRules(rulesJson: string | null | undefined): Record<string, number> {
  if (!rulesJson?.trim()) return {};
  try {
    return JSON.parse(rulesJson) as Record<string, number>;
  } catch {
    return {};
  }
}

function getOptions(field: { fieldOptions?: string | null; options?: string | null }): { value: string; label: string }[] {
  const raw = field.fieldOptions ?? field.options;
  if (!raw?.trim()) return [];
  try {
    return JSON.parse(raw) as { value: string; label: string }[];
  } catch {
    return [];
  }
}

/** Field-like shape for repeatable section (avoids depending on admin module) */
export interface RepeatableSectionFieldLike {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired?: boolean;
  itemSchema?: string | null;
  validationRules?: string | null;
  options?: string | null;
  fieldOptions?: string | null;
  placeholder?: string | null;
  helpText?: string | null;
}

@Component({
  selector: 'app-repeatable-section',
  templateUrl: './repeatable-section.component.html',
  styleUrls: ['./repeatable-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepeatableSectionComponent {
  @Input() field!: RepeatableSectionFieldLike;
  @Input() value: Record<string, unknown>[] = [];
  @Input() formData: Record<string, unknown> = {};
  @Input() viewMode = false;
  @Input() errors: Record<string, string> = {};
  @Output() valueChange = new EventEmitter<Record<string, unknown>[]>();

  get itemSchema(): ItemSchemaField[] {
    return parseItemSchema(this.field?.itemSchema ?? '');
  }

  get maxItems(): number {
    const rules = parseValidationRules(this.field?.validationRules ?? '');
    return (rules['maxItems'] as number) ?? 50;
  }

  get canAdd(): boolean {
    return this.value.length < this.maxItems;
  }

  addRow(): void {
    if (!this.canAdd) return;
    const newRow: Record<string, unknown> = {};
    this.itemSchema.forEach((f) => {
      newRow[f.fieldName] = f.fieldType === 'CHECKBOX' ? false : '';
    });
    this.valueChange.emit([...this.value, newRow]);
  }

  removeRow(index: number): void {
    const updated = [...this.value];
    updated.splice(index, 1);
    this.valueChange.emit(updated);
  }

  updateRow(index: number, subFieldName: string, subValue: unknown): void {
    const updated = [...this.value];
    updated[index] = { ...updated[index], [subFieldName]: subValue };
    this.valueChange.emit(updated);
  }

  getRowValue(index: number, subFieldName: string): unknown {
    const row = this.value[index];
    return row ? row[subFieldName] : undefined;
  }

  getOptionsFor(subField: ItemSchemaField): { value: string; label: string }[] {
    return getOptions(subField);
  }

  getError(): string | null {
    return this.errors[this.field?.fieldName] ?? null;
  }

  /** Parse number for NUMBER sub-field (template cannot use global Number). */
  parseNumber(val: unknown): number | '' {
    if (val === '' || val == null) return '';
    const n = Number(val);
    return isNaN(n) ? '' : n;
  }

  /** Display value for view mode (e.g. summary of rows) */
  getDisplayValue(): string {
    if (!this.value?.length) return '—';
    return `${this.value.length} item(s)`;
  }
}
