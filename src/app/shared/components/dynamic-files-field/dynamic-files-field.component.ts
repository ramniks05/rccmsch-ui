import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FileItem } from '../../../core/models/form-builder.types';

function parseValidationRules(rulesJson: string | null | undefined): Record<string, unknown> {
  if (!rulesJson?.trim()) return {};
  try {
    return JSON.parse(rulesJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Field-like shape for dynamic files (no dependency on admin module) */
export interface DynamicFilesFieldLike {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired?: boolean;
  validationRules?: string | null;
  helpText?: string | null;
}

@Component({
  selector: 'app-dynamic-files-field',
  templateUrl: './dynamic-files-field.component.html',
  styleUrls: ['./dynamic-files-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicFilesFieldComponent {
  @Input() field!: DynamicFilesFieldLike;
  @Input() value: FileItem[] = [];
  @Input() caseId!: number;
  @Input() viewMode = false;
  @Input() errors: Record<string, string> = {};
  /** Optional: when backend provides POST /api/cases/{caseId}/documents/upload, pass a callback that uploads and returns fileId, fileName, fileSize */
  @Input() uploadCallback?: (caseId: number, file: File) => Promise<FileItem | null>;
  @Output() valueChange = new EventEmitter<FileItem[]>();

  uploading = false;
  uploadError: string | null = null;

  get maxFiles(): number {
    const rules = parseValidationRules(this.field?.validationRules ?? '');
    return (rules['maxFiles'] as number) ?? 10;
  }

  get maxSizePerFile(): number {
    const rules = parseValidationRules(this.field?.validationRules ?? '');
    return (rules['maxSizePerFile'] as number) ?? 10 * 1024 * 1024; // 10MB
  }

  get allowedTypes(): string[] {
    const rules = parseValidationRules(this.field?.validationRules ?? '');
    const t = rules['allowedTypes'];
    return Array.isArray(t) ? (t as string[]) : ['pdf', 'jpg', 'jpeg', 'png'];
  }

  get canAdd(): boolean {
    return this.value.length < this.maxFiles;
  }

  get acceptAttr(): string {
    return this.allowedTypes.map((e) => `.${e}`).join(',');
  }

  getError(): string | null {
    return this.errors[this.field?.fieldName] ?? null;
  }

  async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || !this.canAdd) return;

    this.uploadError = null;
    if (this.uploadCallback) {
      this.uploading = true;
      try {
        const added: FileItem[] = [];
        for (const file of files) {
          if (added.length + this.value.length >= this.maxFiles) break;
          if (file.size > this.maxSizePerFile) {
            this.uploadError = `File ${file.name} exceeds ${this.maxSizePerFile / 1024 / 1024}MB limit`;
            continue;
          }
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (this.allowedTypes.length && ext && !this.allowedTypes.includes(ext)) {
            this.uploadError = `File type .${ext} not allowed`;
            continue;
          }
          const result = await this.uploadCallback(this.caseId, file);
          if (result) added.push(result);
        }
        if (added.length) this.valueChange.emit([...this.value, ...added]);
      } finally {
        this.uploading = false;
      }
    } else {
      // No upload callback: add placeholder entries (e.g. for testing or when backend not ready)
      const placeholders: FileItem[] = files.slice(0, this.maxFiles - this.value.length).map((file) => ({
        fileId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fileName: file.name,
        fileSize: file.size,
      }));
      this.valueChange.emit([...this.value, ...placeholders]);
    }
  }

  removeFile(index: number): void {
    const updated = [...this.value];
    updated.splice(index, 1);
    this.valueChange.emit(updated);
  }

  getDisplayValue(): string {
    if (!this.value?.length) return '—';
    return `${this.value.length} file(s)`;
  }
}
