import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WorkflowTransitionDTO } from '../services/officer-case.service';

export interface WorkflowActionDialogData {
  transition: WorkflowTransitionDTO;
  caseNumber?: string;
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

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<WorkflowActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowActionDialogData
  ) {
    this.transition = data.transition;
    this.caseNumber = data.caseNumber;

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
