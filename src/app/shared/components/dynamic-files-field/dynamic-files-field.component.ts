import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
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
export class DynamicFilesFieldComponent implements OnChanges {
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
  
  // Local state to track input values without causing re-renders
  private localInputValues: Map<number, string> = new Map();

  ngOnChanges(changes: SimpleChanges): void {
    // Sync local state when value changes from parent
    if (changes['value'] && this.value) {
      this.value.forEach((file, index) => {
        if (file.displayName && !this.localInputValues.has(index)) {
          this.localInputValues.set(index, file.displayName);
        }
      });
    }
  }

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
    if (this.errors[this.field?.fieldName]) {
      return this.errors[this.field?.fieldName];
    }
    // Check if field is required and files are present but file types are missing
    if (this.field?.isRequired && this.value.length > 0 && !this.allFilesHaveNames()) {
      return 'File type is required for all uploaded files';
    }
    return null;
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
          if (result) {
            // Don't pre-fill displayName - user must enter file type
            result.displayName = result.displayName || '';
            // Always include File object for multipart/form-data submission
            added.push({ ...result, file: result.file || file });
          }
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
        displayName: '', // Don't pre-fill - user must enter file type
      }));
      this.valueChange.emit([...this.value, ...placeholders]);
    }
  }

  /**
   * Get local input value (for typing without re-renders)
   */
  getLocalInputValue(index: number): string {
    if (this.localInputValues.has(index)) {
      return this.localInputValues.get(index)!;
    }
    // Fallback to actual value
    if (index >= 0 && index < this.value.length) {
      return this.value[index].displayName || '';
    }
    return '';
  }

  /**
   * Update local input value (doesn't emit - prevents re-renders)
   */
  updateLocalInputValue(index: number, value: string): void {
    this.localInputValues.set(index, value);
  }

  /**
   * Update file display name/file type (emits change)
   */
  updateFileName(index: number, displayName: string, emitChange: boolean = true): void {
    if (index < 0 || index >= this.value.length) return;
    
    const currentFile = this.value[index];
    const trimmedValue = displayName.trim();
    
    // Update local state
    this.localInputValues.set(index, displayName);
    
    // Only emit if value actually changed and emitChange is true
    if (emitChange && currentFile.displayName !== trimmedValue) {
      const updated = [...this.value];
      updated[index] = { ...currentFile, displayName: trimmedValue };
      this.valueChange.emit(updated);
    }
  }

  /**
   * Get display name for a file (file type - empty if not set)
   */
  getDisplayName(file: FileItem, index?: number): string {
    // If we have local state, use it (for current typing)
    if (index !== undefined && this.localInputValues.has(index)) {
      return this.localInputValues.get(index)!;
    }
    return file.displayName || '';
  }

  /**
   * Check if file has valid display name/file type (required validation)
   */
  hasValidFileName(file: FileItem, index?: number): boolean {
    // Check local state first (for real-time validation while typing)
    if (index !== undefined && this.localInputValues.has(index)) {
      const localValue = this.localInputValues.get(index)!;
      return !!(localValue && localValue.trim().length > 0);
    }
    return !!(file.displayName && file.displayName.trim().length > 0);
  }

  /**
   * Check if all files have valid file types (for form validation)
   */
  allFilesHaveNames(): boolean {
    return this.value.length === 0 || this.value.every(f => this.hasValidFileName(f));
  }

  removeFile(index: number): void {
    // Remove from local state
    this.localInputValues.delete(index);
    
    // Shift local state indices for items after the removed one
    const newLocalValues = new Map<number, string>();
    this.localInputValues.forEach((value, idx) => {
      if (idx < index) {
        newLocalValues.set(idx, value);
      } else if (idx > index) {
        newLocalValues.set(idx - 1, value);
      }
    });
    this.localInputValues = newLocalValues;
    
    const updated = [...this.value];
    updated.splice(index, 1);
    this.valueChange.emit(updated);
  }

  getDisplayValue(): string {
    if (!this.value?.length) return '—';
    return `${this.value.length} file(s)`;
  }

  /**
   * Track by function for ngFor to prevent unnecessary re-renders
   */
  trackByFileId(index: number, file: FileItem): string {
    return file.fileId;
  }
}
