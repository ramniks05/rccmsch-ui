import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CaseDTO } from '../services/officer-case.service';

/** When opening by form ID (e.g. Form 5, Form 7), pass this so the correct form is fetched. */
export interface FormItemByFormId {
  formId: number;
  name: string;
}

export interface FormsActionDialogData {
  caseId: number;
  caseData: CaseDTO;
  /** Form types to show: 'HEARING', 'FIELD_REPORT' (used when opening from "Open Forms" tab) */
  formTypes?: string[];
  /** When opening a specific form by ID (e.g. click "Form 5"), pass this so the correct form is loaded. */
  formItem?: FormItemByFormId;
}

@Component({
  selector: 'app-forms-action-dialog',
  templateUrl: './forms-action-dialog.component.html',
  styleUrls: ['./forms-action-dialog.component.scss']
})
export class FormsActionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<FormsActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FormsActionDialogData
  ) {}

  get caseId(): number {
    return this.data.caseId;
  }

  /** When set, we open a single form by formId (correct form 5 vs 7). */
  get formItem(): FormItemByFormId | null {
    return this.data.formItem ?? null;
  }

  get formTypes(): string[] {
    return this.data.formTypes?.length ? this.data.formTypes : ['HEARING'];
  }

  getFormLabel(type: string): string {
    const labels: Record<string, string> = {
      HEARING: 'Hearing',
      FIELD_REPORT: 'Field Report'
    };
    return labels[type] || type;
  }

  onFormSubmitted(): void {
    this.dialogRef.close(true);
  }

  onClose(): void {
    this.dialogRef.close(false);
  }
}
