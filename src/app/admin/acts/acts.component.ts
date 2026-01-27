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
 * Acts Component
 * Manages acts with CRUD operations
 */
@Component({
  selector: 'app-acts',
  templateUrl: './acts.component.html',
  styleUrls: ['./acts.component.scss']
})
export class ActsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'actCode', 'actName', 'actYear', 'isActive', 'actions'];
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
    this.loadActs();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load all acts
   */
  loadActs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminService.getAllActs()
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
    const dialogRef = this.dialog.open(ActDialogComponent, {
      width: '700px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadActs();
      }
    });
  }

  /**
   * Open edit dialog
   */
  openEditDialog(act: any): void {
    const dialogRef = this.dialog.open(ActDialogComponent, {
      width: '700px',
      data: { mode: 'edit', act: act }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadActs();
      }
    });
  }

  /**
   * Delete act
   */
  deleteAct(act: any): void {
    if (confirm(`Are you sure you want to delete "${act.actName}"?`)) {
      this.isLoading = true;
      this.adminService.deleteAct(act.id)
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.showError(error.error?.message || 'Failed to delete act');
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success) {
              this.showSuccess('Act deleted successfully');
              this.loadActs();
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
      this.errorMessage = 'Failed to load acts. Please try again.';
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
 * Dialog Component for Create/Edit Act
 */
@Component({
  selector: 'app-act-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'Edit' }} Act</h2>
    <mat-dialog-content>
      <form [formGroup]="actForm" class="act-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Act Code *</mat-label>
          <input matInput formControlName="actCode" placeholder="e.g., MLR_LR_ACT_1960">
          <mat-error *ngIf="actForm.get('actCode')?.hasError('required')">Act Code is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Act Name *</mat-label>
          <input matInput formControlName="actName" placeholder="Enter act name">
          <mat-error *ngIf="actForm.get('actName')?.hasError('required')">Act Name is required</mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Act Year *</mat-label>
            <input matInput type="number" formControlName="actYear" placeholder="e.g., 1960" min="1900" max="2100">
            <mat-error *ngIf="actForm.get('actYear')?.hasError('required')">Act Year is required</mat-error>
            <mat-error *ngIf="actForm.get('actYear')?.hasError('min') || actForm.get('actYear')?.hasError('max')">
              Year must be between 1900 and 2100
            </mat-error>
          </mat-form-field>

        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Enter description"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Sections (JSON)</mat-label>
          <textarea matInput formControlName="sections" rows="4" placeholder='{"93":"Appeals","95":"Revision"}'></textarea>
          <mat-hint>Enter sections as JSON object (optional)</mat-hint>
        </mat-form-field>

        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="actForm.invalid || isLoading">
        <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
        <span *ngIf="!isLoading">{{ data.mode === 'create' ? 'Create' : 'Update' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .act-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 0;
      min-width: 600px;
    }
    .full-width {
      width: 100%;
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .half-width {
      flex: 1;
    }
    .button-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class ActDialogComponent {
  actForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ActDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.actForm = this.fb.group({
      actCode: ['', [Validators.required]],
      actName: ['', [Validators.required]],
      actYear: ['', [Validators.required, Validators.min(1900), Validators.max(2100)]],
      description: [''],
      sections: [''],
      isActive: [true]
    });

    if (data.mode === 'edit' && data.act) {
      this.actForm.patchValue({
        actCode: data.act.actCode,
        actName: data.act.actName,
        actYear: data.act.actYear,
        description: data.act.description || '',
        sections: typeof data.act.sections === 'string' ? data.act.sections : JSON.stringify(data.act.sections || {}, null, 2),
        isActive: data.act.isActive !== false
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.actForm.valid) {
      this.isLoading = true;
      const formValue = this.actForm.value;
      
      // Validate and parse sections JSON if provided
      let sections = formValue.sections;
      if (sections && sections.trim()) {
        try {
          sections = JSON.parse(sections);
        } catch (e) {
          this.snackBar.open('Invalid JSON format for sections', 'Close', { duration: 3000 });
          this.isLoading = false;
          return;
        }
      } else {
        sections = null;
      }

      const actData = {
        ...formValue,
        sections: sections
      };

      const request = this.data.mode === 'create'
        ? this.adminService.createAct(actData)
        : this.adminService.updateAct(this.data.act.id, actData);

      request
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.snackBar.open(error.error?.message || 'Operation failed', 'Close', { duration: 3000 });
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success) {
              this.snackBar.open(`Act ${this.data.mode === 'create' ? 'created' : 'updated'} successfully`, 'Close', { duration: 3000 });
              this.dialogRef.close(true);
            }
          },
          error: () => {
            this.isLoading = false;
          }
        });
    }
  }
}
