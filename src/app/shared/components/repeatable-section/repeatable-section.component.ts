import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  Optional,
} from '@angular/core';
import { ItemSchemaField } from '../../../core/models/form-builder.types';
import { OfficerCaseService } from '../../../officer/services/officer-case.service';
import { parseDataSource } from '../../../core/services/form-data-source.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

function normalizeOptionArray(input: any[]): { value: string; label: string }[] {
  return input.map((item: any) => ({
    value: String(item?.value ?? item?.id ?? item?.code ?? item?.label ?? ''),
    label: String(item?.label ?? item?.name ?? item?.value ?? ''),
  }));
}

function decodeOptionArray(raw: unknown): { value: string; label: string }[] {
  if (Array.isArray(raw)) return normalizeOptionArray(raw);
  if (raw == null) return [];

  let current: unknown = raw;
  for (let i = 0; i < 4; i++) {
    if (Array.isArray(current)) return normalizeOptionArray(current);
    if (typeof current !== 'string') break;
    const text = current.trim();
    if (!text) return [];
    try {
      current = JSON.parse(text);
      continue;
    } catch {
      // Some payloads arrive with escaped quotes/backslashes; try unescape pass.
      try {
        const unescaped = text
          .replace(/^"(.*)"$/, '$1')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        current = JSON.parse(unescaped);
        continue;
      } catch {
        break;
      }
    }
  }
  return [];
}

function normalizeItemSchemaField(field: any): ItemSchemaField {
  const normalized: ItemSchemaField = { ...field };
  const decoded = decodeOptionArray(normalized.fieldOptions);
  if (decoded.length > 0) {
    // Keep as array in memory for stable rendering/parsing.
    normalized.fieldOptions = decoded as any;
  }
  return normalized;
}

function parseItemSchema(schemaJson: string | ItemSchemaField[] | null | undefined): ItemSchemaField[] {
  if (!schemaJson) return [];
  if (Array.isArray(schemaJson)) return schemaJson.map((f) => normalizeItemSchemaField(f));
  if (typeof schemaJson !== 'string') return [];
  if (!schemaJson.trim()) return [];
  try {
    const parsed = JSON.parse(schemaJson);
    return Array.isArray(parsed) ? parsed.map((f) => normalizeItemSchemaField(f)) : [];
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

function getOptions(field: { fieldOptions?: any; options?: any }): { value: string; label: string }[] {
  const raw = field.fieldOptions ?? field.options;
  return decodeOptionArray(raw);
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
  dataSource?: string | null; // JSON string for dataSource config (e.g. PARTIES)
}

const DEFAULT_PARTIES_ITEM_SCHEMA: ItemSchemaField[] = [
  {
    fieldName: 'partyName',
    fieldLabel: 'Party Name',
    fieldType: 'TEXT',
    isRequired: true,
  },
  {
    fieldName: 'isPresent',
    fieldLabel: 'Present',
    fieldType: 'CHECKBOX',
    isRequired: false,
  },
];

@Component({
  selector: 'app-repeatable-section',
  templateUrl: './repeatable-section.component.html',
  styleUrls: ['./repeatable-section.component.scss'],
})
export class RepeatableSectionComponent implements OnInit, OnChanges {
  @Input() field!: RepeatableSectionFieldLike;
  @Input() value: Record<string, unknown>[] = [];
  @Input() formData: Record<string, unknown> = {};
  @Input() viewMode = false;
  @Input() errors: Record<string, string> = {};
  @Input() caseId?: number; // Required for PARTIES dataSource
  @Output() valueChange = new EventEmitter<Record<string, unknown>[]>();

  private partiesLoaded = false; // Track if parties have been loaded to avoid duplicate loads
  private parsedItemSchema: ItemSchemaField[] = [];
  private parsedDataSource: { type?: string; includeTypes?: string[] } | null = null;
  private nextRowKey = 1;
  private subFieldOptionsMap: Record<string, { value: string; label: string }[]> = {};

  constructor(@Optional() private officerCaseService?: OfficerCaseService) {}

  ngOnInit(): void {
    this.recomputeParsedConfig();
    // Load parties if dataSource is PARTIES and value is empty
    if (this.shouldLoadParties() && this.value.length === 0 && !this.partiesLoaded) {
      this.loadPartiesFromDataSource();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field']) {
      this.recomputeParsedConfig();
    }
    if (changes['caseId']) {
      this.partiesLoaded = false;
    }
    // Reload parties if field or caseId changes
    if ((changes['field'] || changes['caseId']) && this.shouldLoadParties() && this.value.length === 0 && !this.partiesLoaded) {
      this.loadPartiesFromDataSource();
    }
  }

  get itemSchema(): ItemSchemaField[] {
    if (this.parsedItemSchema.length > 0) return this.parsedItemSchema;
    if (this.isPartiesDataSource()) return DEFAULT_PARTIES_ITEM_SCHEMA;
    return [];
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
    const newRow: Record<string, unknown> = {
      __fromParties: false,
      __rowKey: this.nextRowKey++,
    };
    this.itemSchema.forEach((f) => {
      const declaredDefault = this.getSubFieldDefaultValue(f);
      if (declaredDefault !== undefined && declaredDefault !== null && declaredDefault !== '') {
        newRow[f.fieldName] = declaredDefault;
      } else if (this.isPartiesDataSource() && f.fieldName.toLowerCase().includes('type')) {
        // For manually added party rows, default party type to OTHERS.
        newRow[f.fieldName] = 'OTHERS';
      } else {
        newRow[f.fieldName] = f.fieldType === 'CHECKBOX' ? false : '';
      }
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
    const currentRow = (updated[index] ?? {}) as Record<string, unknown>;
    const nextRow = { ...currentRow, [subFieldName]: subValue } as Record<string, unknown>;
    updated[index] = nextRow;
    this.valueChange.emit(updated);
  }

  getRowValue(index: number, subFieldName: string): unknown {
    const row = this.value[index];
    return row ? row[subFieldName] : undefined;
  }

  getOptionsFor(subField: ItemSchemaField): { value: string; label: string }[] {
    return this.subFieldOptionsMap[subField.fieldName] ?? [];
  }

  isSubFieldDisabled(index: number, subField: ItemSchemaField): boolean {
    // Intentionally keep all fields enabled; no row-level blocking.
    return false;
  }

  trackByRow = (_index: number, row: Record<string, unknown>): unknown => {
    return row?.['__rowKey'] ?? _index;
  };

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

  /**
   * Check if this field should load parties from dataSource
   */
  private shouldLoadParties(): boolean {
    if (!this.caseId || !this.officerCaseService) {
      return false;
    }
    return this.isPartiesDataSource();
  }

  private isPartiesDataSource(): boolean {
    return this.parsedDataSource?.type === 'PARTIES';
  }

  /**
   * Load parties from API and populate repeatable section rows
   */
  private loadPartiesFromDataSource(): void {
    if (!this.caseId || !this.officerCaseService) return;
    if (!this.isPartiesDataSource()) return;
    if (Array.isArray(this.value) && this.value.length > 0) return; // never overwrite user-entered rows

    this.partiesLoaded = true;

    this.officerCaseService.getParties(this.caseId).pipe(
      catchError((error) => {
        console.error('Error loading parties for repeatable section:', error);
        this.partiesLoaded = false; // Allow retry on error
        return of({ success: false, data: [] });
      })
    ).subscribe({
      next: (response) => {
        // User may have started editing while API call was in flight.
        // Never overwrite existing/manual rows once value is non-empty.
        if (Array.isArray(this.value) && this.value.length > 0) {
          return;
        }
        if (response.success && response.data) {
          // Backend may return either an array or an object with a `parties` array
          let parties: any[] = [];
          if (Array.isArray(response.data)) {
            parties = response.data;
          } else if (Array.isArray((response.data as any).parties)) {
            parties = (response.data as any).parties;
          }

          if (!parties.length) {
            return;
          }

          // Filter by includeTypes if specified
          const includeTypes = Array.isArray(this.parsedDataSource?.includeTypes) ? this.parsedDataSource?.includeTypes : null;
          if (includeTypes && includeTypes.length > 0) {
            parties = parties.filter((party: any) => {
              const partyType = party.partyType || party.type || party.partyTypeCode;
              return includeTypes.includes(partyType);
            });
          }

          // Map parties to rows based on itemSchema
          const rows = this.mapPartiesToRows(parties);
          if (rows.length > 0) {
            this.valueChange.emit(rows);
          }
        }
      }
    });
  }

  /**
   * Map parties array to repeatable section rows based on itemSchema
   */
  private mapPartiesToRows(parties: any[]): Record<string, unknown>[] {
    if (!Array.isArray(parties) || parties.length === 0) return [];

    return parties.map((party) => {
      const row: Record<string, unknown> = {};
      row['__fromParties'] = true;
      row['__rowKey'] = this.nextRowKey++;
      
      // Map each field in itemSchema to party data
      this.itemSchema.forEach((schemaField) => {
        // Try to find matching property in party object
        // Common mappings:
        // - partyName, name -> name field
        // - partyType, type, partyTypeCode -> type field
        // - partyLabel, label -> label field
        // - id -> id field
        let value: unknown = '';

        if (schemaField.fieldName.toLowerCase().includes('name')) {
          value = party.partyName || party.name || '';
        } else if (schemaField.fieldName.toLowerCase().includes('type')) {
          value = party.partyType || party.type || party.partyTypeCode || '';
        } else if (schemaField.fieldName.toLowerCase().includes('label')) {
          value = party.partyLabel || party.label || '';
        } else if (schemaField.fieldName.toLowerCase().includes('id')) {
          value = party.id || party.partyId || '';
        } else {
          // Try direct property access
          value = party[schemaField.fieldName] || party[this.camelToSnake(schemaField.fieldName)] || '';
        }

        // Handle default values based on field type
        if (value === '' || value === null || value === undefined) {
          const declaredDefault = this.getSubFieldDefaultValue(schemaField);
          if (declaredDefault !== undefined && declaredDefault !== null && declaredDefault !== '') {
            value = declaredDefault;
          } else if (this.isPartiesDataSource() && schemaField.fieldName.toLowerCase().includes('type')) {
            value = 'OTHERS';
          } else if (schemaField.fieldType === 'CHECKBOX') {
            value = false;
          } else if (schemaField.fieldType === 'NUMBER') {
            value = '';
          }
        }

        row[schemaField.fieldName] = value;
      });

      return row;
    });
  }

  /**
   * Convert camelCase to snake_case (helper for property matching)
   */
  private camelToSnake(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  private getSubFieldDefaultValue(field: ItemSchemaField): unknown {
    const raw = field.defaultValue;
    if (raw === undefined || raw === null) return raw;
    if (typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (trimmed === '') return '';
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') return num;
    return raw;
  }

  private recomputeParsedConfig(): void {
    this.parsedItemSchema = parseItemSchema(this.field?.itemSchema ?? '');
    this.parsedDataSource = parseDataSource(this.field?.dataSource ?? '') as { type?: string; includeTypes?: string[] } | null;
    this.subFieldOptionsMap = {};
    const schema = this.parsedItemSchema.length > 0
      ? this.parsedItemSchema
      : (this.isPartiesDataSource() ? DEFAULT_PARTIES_ITEM_SCHEMA : []);
    schema.forEach((sf) => {
      const parsed = getOptions(sf);
      this.subFieldOptionsMap[sf.fieldName] = parsed;
    });
    this.nextRowKey = 1;
    if (Array.isArray(this.value)) {
      this.value.forEach((row) => {
        const r = row as Record<string, unknown>;
        const key = Number(r?.['__rowKey']);
        if (!isNaN(key) && key >= this.nextRowKey) {
          this.nextRowKey = key + 1;
        }
      });
    }
  }
}
