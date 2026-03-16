import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WorkflowTransitionDTO } from '../services/officer-case.service';

export interface WorkflowActionDialogData {
  transition: WorkflowTransitionDTO;
  caseNumber?: string;
  /** Form ID → display label for readable display (IDs still used in API payloads). */
  formLabels?: Record<number, string>;
  /** Document ID → display label for readable display (IDs still used in API payloads). */
  documentLabels?: Record<number, string>;
  /** Blocking reasons with names instead of raw IDs/codes (from parent formatter). */
  formattedBlockingReasons?: string[];
}

@Component({
  selector: 'app-workflow-action-dialog',
  templateUrl: './workflow-action-dialog.component.html',
  styleUrls: ['./workflow-action-dialog.component.scss']
})
export class WorkflowActionDialogComponent implements OnInit {
  actionForm: FormGroup;
  transition: WorkflowTransitionDTO;
  caseNumber?: string;
  formLabels: Record<number, string> = {};
  documentLabels: Record<number, string> = {};

  /** Blocking reasons with names instead of IDs (when passed from parent). */
  formattedBlockingReasons: string[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<WorkflowActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowActionDialogData
  ) {
    this.transition = data.transition;
    this.caseNumber = data.caseNumber;
    this.formLabels = data.formLabels ?? {};
    this.documentLabels = data.documentLabels ?? {};
    this.formattedBlockingReasons = data.formattedBlockingReasons ?? [];

    // Build form with comments field
    this.actionForm = this.fb.group({
      comments: [
        '',
        this.transition.requiresComment ? Validators.required : null
      ]
    });
  }

  ngOnInit(): void {
    // If comments are required, mark the field
    if (this.transition.requiresComment) {
      this.actionForm.get('comments')?.setValidators([Validators.required]);
      this.actionForm.get('comments')?.updateValueAndValidity();
    }
  }

  /** Whether this transition can be executed (checklist.canExecute !== false). */
  canExecute(): boolean {
    return this.transition.checklist?.canExecute !== false;
  }

  /** Blocking reasons when canExecute is false (prefer formatted with names, else raw). */
  getBlockingReasons(): string[] {
    if (this.formattedBlockingReasons.length > 0) return this.formattedBlockingReasons;
    const reasons = this.transition.checklist?.blockingReasons;
    return Array.isArray(reasons) ? reasons : [];
  }

  /** Form IDs for this action. */
  getFormIds(): number[] {
    const ids = this.transition.checklist?.allowedFormIds;
    return Array.isArray(ids) ? ids : [];
  }

  /** Document IDs for this action. */
  getDocumentIds(): number[] {
    const ids = this.transition.checklist?.allowedDocumentIds;
    return Array.isArray(ids) ? ids : [];
  }

  /** Document actions (Draft, Save & Sign) for this action. */
  getDocumentActions(): string {
    const c = this.transition.checklist;
    if (!c) return '';
    const parts: string[] = [];
    if (c.allowDocumentDraft === true) parts.push('Draft');
    if (c.allowDocumentSaveAndSign === true) parts.push('Save & Sign');
    return parts.join(', ');
  }

  /** Display label for form (readable name/moduleType instead of ID). */
  getFormLabel(formId: number): string {
    return this.formLabels[formId] ?? `Form ${formId}`;
  }

  /** Display label for document (readable name/moduleType instead of ID). */
  getDocumentLabel(documentId: number): string {
    return this.documentLabels[documentId] ?? `Document ${documentId}`;
  }

  /** Form labels for this action (for template join). */
  getFormLabelsList(): string[] {
    return this.getFormIds().map(id => this.getFormLabel(id));
  }

  /** Document labels for this action (for template join). */
  getDocumentLabelsList(): string[] {
    return this.getDocumentIds().map(id => this.getDocumentLabel(id));
  }

  hasFormsOrDocuments(): boolean {
    return this.getFormIds().length > 0 || this.getDocumentIds().length > 0;
  }

  /**
   * Cancel action
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Execute action
   */
  onSubmit(): void {
    if (this.actionForm.valid) {
      this.dialogRef.close({
        execute: true,
        comments: this.actionForm.value.comments || ''
      });
    }
  }

  /**
   * Get action button color based on transition code
   */
  getActionColor(): string {
    const codeLower = this.transition.transitionCode.toLowerCase();
    if (codeLower.includes('approve')) {
      return 'primary';
    } else if (codeLower.includes('reject')) {
      return 'warn';
    } else if (codeLower.includes('return')) {
      return 'accent';
    }
    return 'primary';
  }
}
