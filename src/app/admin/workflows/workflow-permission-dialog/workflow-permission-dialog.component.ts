import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { WorkflowConfigService, WorkflowPermission, PermissionFormOption, PermissionDocumentOption } from '../../services/workflow-config.service';

@Component({
  selector: 'app-workflow-permission-dialog',
  templateUrl: './workflow-permission-dialog.component.html',
  styleUrls: ['./workflow-permission-dialog.component.scss']
})
export class WorkflowPermissionDialogComponent implements OnInit {
  permissionForm: FormGroup;
  isSubmitting = false;

  unitLevels = ['STATE', 'DISTRICT', 'SUB_DIVISION', 'CIRCLE'];
  hierarchyRules = ['SAME_UNIT', 'PARENT_UNIT', 'ANY_UNIT', 'SUPERVISOR'];

  /** Admin-created forms – only these available to check */
  permissionForms: PermissionFormOption[] = [];
  /** Admin-created documents – only these available to check */
  permissionDocuments: PermissionDocumentOption[] = [];
  loadingFormsAndDocs = false;
  /** Selected form IDs */
  selectedFormIds: number[] = [];
  /** Selected document IDs */
  selectedDocumentIds: number[] = [];
  /** Per-document selected stages: documentId -> stage codes */
  selectedDocumentStages: Record<number, string[]> = {};

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowConfigService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<WorkflowPermissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      mode: 'create' | 'edit', 
      transitionId: number,
      /** Roles from role master (/api/admin/officer/roles) */
      roles: { roleId: number; roleCode: string; roleName?: string }[],
      permission?: WorkflowPermission
    }
  ) {
    this.permissionForm = this.fb.group({
      roleId: [null, Validators.required],
      unitLevel: [null],
      canInitiate: [false],
      canApprove: [false],
      hierarchyRule: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadFormsAndDocuments();
    if (this.data.mode === 'edit' && this.data.permission) {
      let roleId = this.data.permission.roleId ?? null;
      if (!roleId && this.data.permission.roleCode && Array.isArray(this.data.roles)) {
        const match = this.data.roles.find(
          r => r.roleCode === this.data.permission!.roleCode,
        );
        roleId = match?.roleId ?? null;
      }
      this.permissionForm.patchValue({
        roleId,
        unitLevel: this.data.permission.unitLevel || null,
        canInitiate: this.data.permission.canInitiate ?? false,
        canApprove: this.data.permission.canApprove ?? false,
        hierarchyRule: this.data.permission.hierarchyRule || '',
        isActive: this.data.permission.isActive !== false
      });
      this.selectedFormIds = this.data.permission.allowedFormIds ?? [];
      this.selectedDocumentIds = this.data.permission.allowedDocumentIds ?? [];
      const stages = this.data.permission.allowedDocumentStages ?? [];
      this.selectedDocumentStages = {};
      stages.forEach((s: { documentId: number; stages: string[] }) => {
        this.selectedDocumentStages[s.documentId] = s.stages ?? [];
      });
      if (Object.keys(this.selectedDocumentStages).length === 0 && this.selectedDocumentIds.length > 0) {
        const legacyDraft = this.data.permission.allowDocumentDraft ?? false;
        const legacySign = this.data.permission.allowDocumentSaveAndSign ?? false;
        this.selectedDocumentIds.forEach(docId => {
          const arr: string[] = [];
          if (legacyDraft) arr.push('DRAFT');
          if (legacySign) arr.push('SAVE_AND_SIGN');
          this.selectedDocumentStages[docId] = arr;
        });
      }
    }
  }

  /** Get stage options for a document (value + label from API) */
  getDocumentStageOptions(doc: PermissionDocumentOption): { value: string; label: string }[] {
    const stages = doc.stages ?? [];
    const labels = doc.stageLabels ?? [];
    return stages.map((value, i) => ({ value, label: labels[i] ?? value }));
  }

  toggleDocumentStage(documentId: number, stageValue: string): void {
    const arr = this.selectedDocumentStages[documentId] ?? [];
    const idx = arr.indexOf(stageValue);
    if (idx === -1) arr.push(stageValue);
    else arr.splice(idx, 1);
    this.selectedDocumentStages[documentId] = [...arr];
  }

  isDocumentStageSelected(documentId: number, stageValue: string): boolean {
    return (this.selectedDocumentStages[documentId] ?? []).includes(stageValue);
  }

  loadFormsAndDocuments(): void {
    this.loadingFormsAndDocs = true;
    forkJoin({
      forms: this.workflowService.getPermissionForms(),
      documents: this.workflowService.getPermissionDocuments()
    }).subscribe({
      next: ({ forms, documents }) => {
        this.loadingFormsAndDocs = false;
        if (forms.success && forms.data) this.permissionForms = forms.data;
        if (documents.success && documents.data) this.permissionDocuments = documents.data;
      },
      error: () => {
        this.loadingFormsAndDocs = false;
      }
    });
  }

  toggleForm(id: number): void {
    const idx = this.selectedFormIds.indexOf(id);
    if (idx === -1) this.selectedFormIds.push(id);
    else this.selectedFormIds.splice(idx, 1);
  }

  isFormSelected(id: number): boolean {
    return this.selectedFormIds.includes(id);
  }

  toggleDocument(id: number): void {
    const idx = this.selectedDocumentIds.indexOf(id);
    if (idx === -1) {
      this.selectedDocumentIds.push(id);
    } else {
      this.selectedDocumentIds.splice(idx, 1);
      delete this.selectedDocumentStages[id];
    }
  }

  isDocumentSelected(id: number): boolean {
    return this.selectedDocumentIds.includes(id);
  }

  onSubmit(): void {
    if (this.permissionForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.permissionForm.value;
    // Transition conditions (workflow data required) come from Forms/Documents selection only; no data-keys API in this dialog
    const selectedRole = this.data.roles.find(r => r.roleId === formValue.roleId);
    const permission: WorkflowPermission = {
      roleId: formValue.roleId,
      roleCode: selectedRole?.roleCode || '',
      unitLevel: formValue.unitLevel || null,
      canInitiate: formValue.canInitiate,
      canApprove: formValue.canApprove,
      hierarchyRule: formValue.hierarchyRule || undefined,
      conditions: undefined,
      isActive: formValue.isActive,
      allowedFormIds: this.selectedFormIds.length ? [...this.selectedFormIds] : undefined,
      allowedDocumentIds: this.selectedDocumentIds.length ? [...this.selectedDocumentIds] : undefined,
      allowedDocumentStages: this.selectedDocumentIds.length
        ? this.selectedDocumentIds.map(docId => ({
            documentId: docId,
            stages: this.selectedDocumentStages[docId] ?? []
          }))
        : undefined,
      allowDocumentDraft: this.selectedDocumentIds.some(docId => (this.selectedDocumentStages[docId] ?? []).includes('DRAFT')) || undefined,
      allowDocumentSaveAndSign: this.selectedDocumentIds.some(docId => (this.selectedDocumentStages[docId] ?? []).includes('SAVE_AND_SIGN')) || undefined
    };

    if (this.data.mode === 'create') {
      this.workflowService.createPermission(this.data.transitionId, permission).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Permission created successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to create permission', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to create permission';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    } else {
      if (!this.data.permission?.id) {
        this.snackBar.open('Invalid permission ID', 'Close', { duration: 3000 });
        this.isSubmitting = false;
        return;
      }

      this.workflowService.updatePermission(this.data.permission.id, permission).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.snackBar.open('Permission updated successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Failed to update permission', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update permission';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
