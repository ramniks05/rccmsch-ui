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
 * Manages case types with CRUD operations
 */
@Component({
  selector: 'app-case-types',
  templateUrl: './case-types.component.html',
  styleUrls: ['./case-types.component.scss']
})
export class CaseTypesComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'code', 'name', 'description', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  isLoading = false;
  errorMessage = '';

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCaseTypes();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load all case types
   */
  loadCaseTypes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminService.getAllCaseTypes()
      .pipe(
        catchError(error => {
          this.isLoading = false;
          this.handleError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success) {
            this.dataSource.data = apiResponse.data || [];
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  /**
   * Open create dialog
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CaseTypeDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCaseTypes();
      }
    });
  }

  /**
   * Open edit dialog
   */
  openEditDialog(caseType: any): void {
    const dialogRef = this.dialog.open(CaseTypeDialogComponent, {
      width: '600px',
      data: { mode: 'edit', caseType: caseType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCaseTypes();
      }
    });
  }

  /**
   * Delete case type
   */
  deleteCaseType(caseType: any): void {
    if (confirm(`Are you sure you want to delete "${caseType.name}"?`)) {
      this.isLoading = true;
      this.adminService.deleteCaseType(caseType.id)
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.showError(error.error?.message || 'Failed to delete case type');
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success) {
              this.showSuccess('Case type deleted successfully');
              this.loadCaseTypes();
            }
          },
          error: () => {
            this.isLoading = false;
          }
        });
    }
  }

  /**
   * Apply filter to table
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): void {
    if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error.status === 401) {
      this.errorMessage = 'Unauthorized. Please login again.';
    } else {
      this.errorMessage = 'Failed to load case types. Please try again.';
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}

/**
 * Dialog Component for Create/Edit Case Type
 */
@Component({
  selector: 'app-case-type-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'Edit' }} Case Type</h2>
    <mat-dialog-content>
      <form [formGroup]="caseTypeForm" class="case-type-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Code *</mat-label>
          <input matInput formControlName="code" placeholder="Enter case type code">
          <mat-error *ngIf="caseTypeForm.get('code')?.hasError('required')">Code is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name *</mat-label>
          <input matInput formControlName="name" placeholder="Enter case type name">
          <mat-error *ngIf="caseTypeForm.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Enter description"></textarea>
        </mat-form-field>

        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="caseTypeForm.invalid || isLoading">
        <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
        <span *ngIf="!isLoading">{{ data.mode === 'create' ? 'Create' : 'Update' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .case-type-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 0;
      min-width: 500px;
    }
    .full-width {
      width: 100%;
    }
    .button-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class CaseTypeDialogComponent {
  caseTypeForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<CaseTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.caseTypeForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      isActive: [true]
    });

    if (data.mode === 'edit' && data.caseType) {
      this.caseTypeForm.patchValue(data.caseType);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.caseTypeForm.valid) {
      this.isLoading = true;
      const formValue = this.caseTypeForm.value;

      if (this.data.mode === 'create') {
        this.adminService.createCaseType(formValue)
          .pipe(catchError(error => {
            this.isLoading = false;
            this.snackBar.open(error.error?.message || 'Failed to create case type', 'Close', { duration: 3000 });
            return throwError(() => error);
          }))
          .subscribe({
            next: (response) => {
              this.isLoading = false;
              const apiResponse = response?.success !== undefined ? response : { success: true };
              if (apiResponse.success) {
                this.snackBar.open('Case type created successfully', 'Close', { duration: 3000 });
                this.dialogRef.close(true);
              }
            },
            error: () => this.isLoading = false
          });
      } else {
        this.adminService.updateCaseType(this.data.caseType.id, formValue)
          .pipe(catchError(error => {
            this.isLoading = false;
            this.snackBar.open(error.error?.message || 'Failed to update case type', 'Close', { duration: 3000 });
            return throwError(() => error);
          }))
          .subscribe({
            next: (response) => {
              this.isLoading = false;
              const apiResponse = response?.success !== undefined ? response : { success: true };
              if (apiResponse.success) {
                this.snackBar.open('Case type updated successfully', 'Close', { duration: 3000 });
                this.dialogRef.close(true);
              }
            },
            error: () => this.isLoading = false
          });
      }
    }
  }
}
