import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CaseDTO } from '../services/officer-case.service';
import { OfficerWorkflowAutoExecuteService } from '../services/officer-workflow-auto-execute.service';
import { ModuleFormSubmittedPayload } from '../module-form/module-form.component';
import { finalize } from 'rxjs/operators';

/** When opening by form ID (e.g. Form 5, Form 7), pass this so the correct form is fetched. */
export interface FormItemByFormId {
  formId: number;
  name: string;
}

export interface FormsActionDialogData {
  caseId: number;
  caseData: CaseDTO;
  /** Form types to show (used when opening from "Open Forms" tab) */
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
    @Inject(MAT_DIALOG_DATA) public data: FormsActionDialogData,
    private workflowAuto: OfficerWorkflowAutoExecuteService,
  ) {}

  get caseId(): number {
    return this.data.caseId;
  }

  /** When set, we open a single form by formId (correct form 5 vs 7). */
  get formItem(): FormItemByFormId | null {
    return this.data.formItem ?? null;
  }

  get formTypes(): string[] {
    return this.data.formTypes?.length ? this.data.formTypes : [];
  }

  getFormLabel(type: string): string {
    if (!type) return 'Form';
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  onFormSubmitted(payload: ModuleFormSubmittedPayload): void {
    this.workflowAuto
      .tryAfterModuleFormSubmit(
        this.data.caseId,
        {
          moduleType: payload.moduleType,
          formId: payload.formId,
        },
        payload.remarks || '',
      )
      .pipe(finalize(() => this.dialogRef.close(true)))
      .subscribe();
  }

  onClose(): void {
    this.dialogRef.close(false);
  }
}
