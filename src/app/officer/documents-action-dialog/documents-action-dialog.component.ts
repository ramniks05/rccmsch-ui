import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CaseDTO } from '../services/officer-case.service';

/** One document template to show in the dialog (by template ID per RCCMS API). */
export interface DocumentTemplateItem {
  templateId: number;
  name: string;
}

export interface DocumentsActionDialogData {
  caseId: number;
  caseData: CaseDTO;
  /** Document templates by template ID (from permission-documents / allowedDocumentIds). */
  documentTemplates: DocumentTemplateItem[];
}

@Component({
  selector: 'app-documents-action-dialog',
  templateUrl: './documents-action-dialog.component.html',
  styleUrls: ['./documents-action-dialog.component.scss']
})
export class DocumentsActionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DocumentsActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentsActionDialogData
  ) {}

  get caseId(): number {
    return this.data.caseId;
  }

  get caseData(): CaseDTO {
    return this.data.caseData;
  }

  get documentTemplates(): DocumentTemplateItem[] {
    return this.data.documentTemplates?.length ? this.data.documentTemplates : [];
  }

  onClose(): void {
    this.dialogRef.close(true);
  }
}
