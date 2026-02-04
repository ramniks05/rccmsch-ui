import { Component, OnInit, AfterViewInit, ViewChild, Inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../admin.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Case Types Component
 * Manages case types (filing types: NEW_FILE, APPEAL, REVISION, etc.) only.
 * Uses Case Types API: /api/admin/case-types, /api/public/case-types/case-nature/{id}
 * Uses Case Natures API only for dropdown: /api/case-natures/active
 */
@Component({
  selector: 'app-case-types',
  templateUrl: './case-types.component.html',
  styleUrls: ['./case-types.component.scss']
})
export class CaseTypesComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'typeCode', 'typeName', 'caseNatureName', 'courtLevel', 'isAppeal', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  private _paginator!: MatPaginator;
  private _sort!: MatSort;

  @ViewChild(MatPaginator)
  set paginator(p: MatPaginator) {
    if (p) {
      this._paginator = p;
      this.dataSource.paginator = p;
    }
  }

  @ViewChild(MatSort)
  set sort(s: MatSort) {
    if (s) {
      this._sort = s;
      this.dataSource.sort = s;
    }
  }
  isLoading = false;
  errorMessage = '';
  /** Case natures for dropdown when creating/editing a case type — Case Natures API */
  caseNatures: any[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCaseNaturesForDropdown();
    this.loadCaseTypes();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load case natures for dropdown — Case Natures API: GET /api/case-natures/active
   */
  loadCaseNaturesForDropdown(): void {
    this.adminService.getActiveCaseNatures()
      .pipe(
        catchError(err => {
          console.error('Error loading case natures:', err);
          this.showError('Failed to load case natures. Please refresh the page.');
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          const r = res?.success !== undefined ? res : { success: true, data: res };
          if (r.success) {
            this.caseNatures = r.data || [];
            console.log('Case natures loaded:', this.caseNatures.length);
          }
        },
        error: () => {
          // Error already handled in catchError
        }
      });
  }

  /**
   * Load case types — Case Types API: GET /api/admin/case-types
   */
  loadCaseTypes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getAllCaseTypes()
      .pipe(
        catchError(err => {
          this.isLoading = false;
          this.handleError(err);
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          const r = res?.success !== undefined ? res : { success: true, data: res };
          if (r.success) this.dataSource.data = r.data || [];
        },
        error: () => { this.isLoading = false; }
      });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(CaseTypeDialogComponent, {
      width: '700px',
      data: { mode: 'create', caseNatures: this.caseNatures }
    });
    ref.afterClosed().subscribe(ok => { if (ok) this.loadCaseTypes(); });
  }

  openEditDialog(row: any): void {
    const ref = this.dialog.open(CaseTypeDialogComponent, {
      width: '700px',
      data: { mode: 'edit', caseType: row, caseNatures: this.caseNatures }
    });
    ref.afterClosed().subscribe(ok => { if (ok) this.loadCaseTypes(); });
  }

  deleteCaseType(row: any): void {
    const name = row?.typeName || row?.typeCode || 'this case type';
    if (!confirm(`Delete "${name}"?`)) return;
    this.isLoading = true;
    this.adminService.deleteCaseType(row.id)
      .pipe(
        catchError(err => {
          this.isLoading = false;
          this.showError(err.error?.message || 'Delete failed');
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          const r = res?.success !== undefined ? res : { success: true };
          if (r.success) {
            this.showSuccess('Case type deleted');
            this.loadCaseTypes();
          }
        },
        error: () => { this.isLoading = false; }
      });
  }

  applyFilter(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.dataSource.filter = v.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  private handleError(err: any): void {
    this.errorMessage = err.error?.message || (err.status === 401 ? 'Unauthorized' : 'Failed to load case types');
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'Close', { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Close', { duration: 5000, horizontalPosition: 'end', verticalPosition: 'top', panelClass: ['error-snackbar'] });
  }
}

/**
 * Dialog for Create/Edit Case Type.
 * Case Types API: POST/PUT /api/admin/case-types
 * Body: { caseNatureId, typeCode, typeName, courtLevel, courtTypes, fromLevel, isAppeal, appealOrder, description, isActive, displayOrder }
 */
@Component({
  selector: 'app-case-type-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'Edit' }} Case Type</h2>
    <mat-dialog-content>
      <form [formGroup]="f" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Case Nature (Legal Matter) *</mat-label>
          <mat-select formControlName="caseNatureId">
            <mat-option *ngFor="let cn of caseNatures" [value]="cn.id">{{ cn.name }} ({{ cn.code }})</mat-option>
          </mat-select>
          <mat-error>Case nature is required</mat-error>
        </mat-form-field>
        <div class="form-row">
          <mat-form-field appearance="outline" class="half">
            <mat-label>Type Code *</mat-label>
            <input matInput formControlName="typeCode" placeholder="e.g. NEW_FILE">
            <mat-error>Required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half">
            <mat-label>Type Name *</mat-label>
            <input matInput formControlName="typeName" placeholder="e.g. New File">
            <mat-error>Required</mat-error>
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" class="half">
            <mat-label>Court Level *</mat-label>
            <mat-select formControlName="courtLevel">
              <mat-option value="CIRCLE">Circle</mat-option>
              <mat-option value="SUB_DIVISION">Sub-Division</mat-option>
              <mat-option value="DISTRICT">District</mat-option>
              <mat-option value="STATE">State</mat-option>
            </mat-select>
            <mat-error>Required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half">
            <mat-label>From Level (appeals)</mat-label>
            <mat-select formControlName="fromLevel">
              <mat-option [value]="null">None</mat-option>
              <mat-option value="CIRCLE">Circle</mat-option>
              <mat-option value="SUB_DIVISION">Sub-Division</mat-option>
              <mat-option value="DISTRICT">District</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Court Types *</mat-label>
          <mat-select formControlName="courtTypes" multiple>
            <mat-option value="SDC_COURT">SDC Court</mat-option>
            <mat-option value="SDO_COURT">SDO Court</mat-option>
            <mat-option value="DC_COURT">DC Court</mat-option>
            <mat-option value="REVENUE_COURT">Revenue Court</mat-option>
            <mat-option value="REVENUE_TRIBUNAL">Revenue Tribunal</mat-option>
            <mat-option value="STATE_TRIBUNAL">State Tribunal</mat-option>
          </mat-select>
          <mat-error>At least one required</mat-error>
        </mat-form-field>
        <div class="form-row">
          <mat-checkbox formControlName="isAppeal">Is Appeal</mat-checkbox>
          <mat-form-field *ngIf="f.get('isAppeal')?.value" appearance="outline" class="half">
            <mat-label>Appeal Order</mat-label>
            <input matInput type="number" formControlName="appealOrder" min="0">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>Display Order</mat-label>
          <input matInput type="number" formControlName="displayOrder" min="0">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Workflow Code (Optional)</mat-label>
          <mat-select formControlName="workflowCode">
            <mat-option [value]="null">None (No Workflow)</mat-option>
            <mat-option *ngFor="let wf of workflows" [value]="wf.workflowCode">{{ wf.workflowName || wf.workflowCode }}</mat-option>
          </mat-select>
          <mat-hint>Select a workflow to associate with this case type</mat-hint>
        </mat-form-field>
        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="f.invalid || saving">
        <mat-spinner *ngIf="saving" diameter="20" class="btn-spin"></mat-spinner>
        <span *ngIf="!saving">{{ data.mode === 'create' ? 'Create' : 'Update' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; min-width: 600px; }
    .full-width { width: 100%; }
    .form-row { display: flex; gap: 16px; align-items: center; }
    .half { flex: 1; }
    .btn-spin { display: inline-block; margin-right: 8px; }
  `]
})
export class CaseTypeDialogComponent {
  f: FormGroup;
  saving = false;
  caseNatures: any[] = [];
  workflows: any[] = [];
  private caseNatureIdToSet: number | null = null;

  constructor(
    private fb: FormBuilder,
    private admin: AdminService,
    public ref: MatDialogRef<CaseTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snack: MatSnackBar
  ) {
    // Use provided case natures or load them if not available
    this.caseNatures = data.caseNatures || [];

    // Initialize form
    this.f = this.fb.group({
      caseNatureId: [null, Validators.required],
      typeCode: ['', Validators.required],
      typeName: ['', Validators.required],
      courtLevel: ['', Validators.required],
      courtTypes: [[], Validators.required],
      fromLevel: [null],
      isAppeal: [false],
      appealOrder: [0],
      description: [''],
      displayOrder: [1],
      workflowCode: [null], // Optional workflow code
      isActive: [true]
    });

    // Load workflows for dropdown
    this.loadWorkflows();

    // If case natures are not provided or empty, load them
    if (!this.caseNatures || this.caseNatures.length === 0) {
      this.loadCaseNatures();
    }

    // Set form values for edit mode
    if (data.mode === 'edit' && data.caseType) {
      const t = data.caseType;
      this.caseNatureIdToSet = t.caseNatureId ?? t.caseNature?.id ?? null;

      this.f.patchValue({
        caseNatureId: this.caseNatures.length > 0 ? this.caseNatureIdToSet : null, // Set caseNatureId only if case natures are loaded
        typeCode: t.typeCode || '',
        typeName: t.typeName || '',
        courtLevel: t.courtLevel || '',
        courtTypes: t.courtTypes || [],
        fromLevel: t.fromLevel ?? null,
        isAppeal: t.isAppeal ?? false,
        appealOrder: t.appealOrder ?? 0,
        description: t.description || '',
        displayOrder: t.displayOrder ?? 1,
        workflowCode: t.workflowCode || null, // Set workflow code if available
        isActive: t.isActive !== false
      });
    }
  }

  /**
   * Load active workflows for dropdown — Workflow API: GET /api/admin/workflow/definitions/active
   */
  private loadWorkflows(): void {
    this.admin.getActiveWorkflows()
      .pipe(
        catchError(err => {
          console.error('Error loading workflows:', err);
          // Don't show error to user, just log it - workflow is optional
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          const r = res?.success !== undefined ? res : { success: true, data: res };
          if (r.success) {
            this.workflows = r.data || [];
            console.log('Workflows loaded:', this.workflows.length);
          }
        }
      });
  }

  /**
   * Load case natures if not provided — Case Natures API: GET /api/case-natures/active
   */
  private loadCaseNatures(): void {
    this.admin.getActiveCaseNatures()
      .pipe(
        catchError(err => {
          console.error('Error loading case natures in dialog:', err);
          this.snack.open('Failed to load case natures', 'Close', { duration: 3000 });
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          const r = res?.success !== undefined ? res : { success: true, data: res };
          if (r.success) {
            this.caseNatures = r.data || [];
            console.log('Case natures loaded in dialog:', this.caseNatures.length);
            // If we have a caseNatureId to set (from edit mode), set it now
            if (this.caseNatureIdToSet !== null && this.caseNatures.length > 0) {
              this.f.patchValue({ caseNatureId: this.caseNatureIdToSet });
            }
          }
        }
      });
  }

  cancel(): void { this.ref.close(); }

  save(): void {
    if (this.f.invalid) return;
    this.saving = true;
    const payload = {
      ...this.f.value,
      fromLevel: this.f.value.fromLevel || null,
      workflowCode: this.f.value.workflowCode || null // Include workflow code (optional)
    };
    const req = this.data.mode === 'create'
      ? this.admin.createCaseType(payload)
      : this.admin.updateCaseType(this.data.caseType.id, payload);
    req.pipe(
      catchError(err => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Save failed', 'Close', { duration: 3000 });
        return throwError(() => err);
      })
    ).subscribe({
      next: (res) => {
        this.saving = false;
        const r = res?.success !== undefined ? res : { success: true };
        if (r.success) {
          this.snack.open(`Case type ${this.data.mode === 'create' ? 'created' : 'updated'}`, 'Close', { duration: 3000 });
          this.ref.close(true);
        }
      },
      error: () => { this.saving = false; }
    });
  }
}
