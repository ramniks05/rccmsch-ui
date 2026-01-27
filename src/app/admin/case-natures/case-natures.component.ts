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
 * Case Natures Component
 * Manages case natures (legal matters: MUTATION_GIFT_SALE, PARTITION, etc.) only.
 * Uses Case Natures API: /api/case-natures/active, /api/admin/case-natures
 */
@Component({
  selector: 'app-case-natures',
  templateUrl: './case-natures.component.html',
  styleUrls: ['./case-natures.component.scss']
})
export class CaseNaturesComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'code', 'name', 'actName', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  isLoading = false;
  errorMessage = '';
  acts: any[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadActs();
    this.loadCaseNatures();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load acts for dropdown — Acts API: GET /api/admin/acts
   */
  loadActs(): void {
    this.adminService.getAllActs()
      .pipe(
        catchError(err => {
          console.error('Error loading acts:', err);
          this.showError('Failed to load acts. Please refresh the page.');
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          const r = res?.success !== undefined ? res : { success: true, data: res };
          if (r.success) {
            this.acts = r.data || [];
            console.log('Acts loaded:', this.acts.length);
          }
        },
        error: () => {
          // Error already handled in catchError
        }
      });
  }

  /**
   * Load case natures via Case Natures API — GET /api/admin/case-natures
   */
  loadCaseNatures(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getAllCaseNatures()
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
    const ref = this.dialog.open(CaseNatureDialogComponent, {
      width: '600px',
      data: { mode: 'create', acts: this.acts }
    });
    ref.afterClosed().subscribe(ok => { if (ok) this.loadCaseNatures(); });
  }

  openEditDialog(row: any): void {
    const ref = this.dialog.open(CaseNatureDialogComponent, {
      width: '600px',
      data: { mode: 'edit', caseNature: row, acts: this.acts }
    });
    ref.afterClosed().subscribe(ok => { if (ok) this.loadCaseNatures(); });
  }

  deleteCaseNature(row: any): void {
    const name = row?.name || row?.code || 'this case nature';
    if (!confirm(`Delete "${name}"?`)) return;
    this.isLoading = true;
    this.adminService.deleteCaseNature(row.id)
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
            this.showSuccess('Case nature deleted');
            this.loadCaseNatures();
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
    this.errorMessage = err.error?.message || (err.status === 401 ? 'Unauthorized' : 'Failed to load case natures');
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'Close', { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Close', { duration: 5000, horizontalPosition: 'end', verticalPosition: 'top', panelClass: ['error-snackbar'] });
  }
}

/**
 * Dialog for Create/Edit Case Nature.
 * Case Natures API: POST/PUT /api/admin/case-natures
 * Body: { name, code, description, actId, isActive }
 * Note: workflowCode has been moved to Case Type (each case type can have its own workflow)
 */
@Component({
  selector: 'app-case-nature-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'Edit' }} Case Nature</h2>
    <mat-dialog-content>
      <form [formGroup]="f" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Code *</mat-label>
          <input matInput formControlName="code" placeholder="e.g. MUTATION_GIFT_SALE">
          <mat-error>Code is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name *</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Mutation (after Gift/Sale Deeds)">
          <mat-error>Name is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Act</mat-label>
          <mat-select formControlName="actId">
            <mat-option [value]="null">None</mat-option>
            <mat-option *ngFor="let a of acts" [value]="a.id">{{ a.actName }} ({{ a.actYear }})</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
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
    .form { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; min-width: 500px; }
    .full-width { width: 100%; }
    .form-row { display: flex; gap: 16px; }
    .half { flex: 1; }
    .btn-spin { display: inline-block; margin-right: 8px; }
  `]
})
export class CaseNatureDialogComponent {
  f: FormGroup;
  saving = false;
  acts: any[] = [];
  private actIdToSet: number | null = null;

  constructor(
    private fb: FormBuilder,
    private admin: AdminService,
    public ref: MatDialogRef<CaseNatureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snack: MatSnackBar
  ) {
    // Use provided acts or load them if not available
    this.acts = data.acts || [];
    
    // Initialize form
    this.f = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      actId: [null],
      description: [''],
      isActive: [true]
    });
    
    // If acts are not provided or empty, load them
    if (!this.acts || this.acts.length === 0) {
      this.loadActs();
    }
    
    // Set form values for edit mode
    if (data.mode === 'edit' && data.caseNature) {
      const n = data.caseNature;
      this.actIdToSet = n.actId ?? null;
      
      this.f.patchValue({
        code: n.code || '',
        name: n.name || '',
        actId: this.acts.length > 0 ? this.actIdToSet : null, // Set actId only if acts are loaded
        description: n.description || '',
        isActive: n.isActive !== false
      });
    }
  }

  /**
   * Load acts if not provided — Acts API: GET /api/admin/acts
   */
  private loadActs(): void {
    this.admin.getAllActs()
      .pipe(
        catchError(err => {
          console.error('Error loading acts in dialog:', err);
          this.snack.open('Failed to load acts', 'Close', { duration: 3000 });
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          const r = res?.success !== undefined ? res : { success: true, data: res };
          if (r.success) {
            this.acts = r.data || [];
            console.log('Acts loaded in dialog:', this.acts.length);
            // If we have an actId to set (from edit mode), set it now
            if (this.actIdToSet !== null && this.acts.length > 0) {
              this.f.patchValue({ actId: this.actIdToSet });
            }
          }
        }
      });
  }

  cancel(): void { this.ref.close(); }

  save(): void {
    if (this.f.invalid) return;
    this.saving = true;
    // Note: workflowCode removed - it's now managed at Case Type level
    const payload = { ...this.f.value, actId: this.f.value.actId || null };
    const req = this.data.mode === 'create'
      ? this.admin.createCaseNature(payload)
      : this.admin.updateCaseNature(this.data.caseNature.id, payload);
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
          this.snack.open(`Case nature ${this.data.mode === 'create' ? 'created' : 'updated'}`, 'Close', { duration: 3000 });
          this.ref.close(true);
        }
      },
      error: () => { this.saving = false; }
    });
  }
}
