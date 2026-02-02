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
 * Courts Component
 * Manages courts with CRUD operations
 */
@Component({
  selector: 'app-courts',
  templateUrl: './courts.component.html',
  styleUrls: ['./courts.component.scss']
})
export class CourtsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'courtCode', 'courtName', 'courtLevel', 'courtType', 'unitName', 'isActive', 'actions'];
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
  adminUnits: any[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAdminUnits();
    this.loadCourts();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load administrative units for dropdown
   */
  loadAdminUnits(): void {
    this.adminService.getActiveAdminUnits()
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success) {
            this.adminUnits = apiResponse.data || [];
          }
        }
      });
  }

  /**
   * Load all courts
   */
  loadCourts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getAllCourts()
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
    const dialogRef = this.dialog.open(CourtDialogComponent, {
      width: '700px',
      data: { mode: 'create', adminUnits: this.adminUnits }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCourts();
      }
    });
  }

  /**
   * Open edit dialog
   */
  openEditDialog(court: any): void {
    const dialogRef = this.dialog.open(CourtDialogComponent, {
      width: '700px',
      data: { mode: 'edit', court: court, adminUnits: this.adminUnits }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCourts();
      }
    });
  }

  /**
   * Delete court
   */
  deleteCourt(court: any): void {
    if (confirm(`Are you sure you want to delete "${court.courtName}"?`)) {
      this.isLoading = true;
      this.adminService.deleteCourt(court.id)
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.showError(error.error?.message || 'Failed to delete court');
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success) {
              this.showSuccess('Court deleted successfully');
              this.loadCourts();
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
      this.errorMessage = 'Failed to load courts. Please try again.';
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
 * Dialog Component for Create/Edit Court
 */
@Component({
  selector: 'app-court-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'Edit' }} Court</h2>
    <mat-dialog-content>
      <form [formGroup]="courtForm" class="court-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Court Code *</mat-label>
          <input matInput formControlName="courtCode" placeholder="e.g., DIST_IMPWEST_DC">
          <mat-error *ngIf="courtForm.get('courtCode')?.hasError('required')">Court Code is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Court Name *</mat-label>
          <input matInput formControlName="courtName" placeholder="Enter court name">
          <mat-error *ngIf="courtForm.get('courtName')?.hasError('required')">Court Name is required</mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Court Level *</mat-label>
            <mat-select formControlName="courtLevel">
              <mat-option value="CIRCLE">Circle</mat-option>
              <mat-option value="SUB_DIVISION">Sub-Division</mat-option>
              <mat-option value="DISTRICT">District</mat-option>
              <mat-option value="STATE">State</mat-option>
            </mat-select>
            <mat-error *ngIf="courtForm.get('courtLevel')?.hasError('required')">Court Level is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Court Type *</mat-label>
            <mat-select formControlName="courtType">
              <mat-option value="SDC_COURT">SDC Court</mat-option>
              <mat-option value="SDO_COURT">SDO Court</mat-option>
              <mat-option value="DC_COURT">DC Court</mat-option>
              <mat-option value="REVENUE_COURT">Revenue Court</mat-option>
              <mat-option value="REVENUE_TRIBUNAL">Revenue Tribunal</mat-option>
              <mat-option value="STATE_TRIBUNAL">State Tribunal</mat-option>
            </mat-select>
            <mat-error *ngIf="courtForm.get('courtType')?.hasError('required')">Court Type is required</mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Administrative Unit *</mat-label>
          <mat-select formControlName="unitId">
            <mat-option *ngFor="let unit of data.adminUnits" [value]="unit.unitId">
              {{ unit.unitName }} ({{ unit.unitCode }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="courtForm.get('unitId')?.hasError('required')">Administrative Unit is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Designation</mat-label>
          <input matInput formControlName="designation" placeholder="e.g., Deputy Commissioner">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Address</mat-label>
          <textarea matInput formControlName="address" rows="2" placeholder="Enter address"></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Contact Number</mat-label>
            <input matInput formControlName="contactNumber" placeholder="e.g., 0385-1234567">
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" placeholder="e.g., dc.impwest@manipur.gov.in">
          </mat-form-field>
        </div>


        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="courtForm.invalid || isLoading">
        <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
        <span *ngIf="!isLoading">{{ data.mode === 'create' ? 'Create' : 'Update' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .court-form {
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
export class CourtDialogComponent {
  courtForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<CourtDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.courtForm = this.fb.group({
      courtCode: ['', [Validators.required]],
      courtName: ['', [Validators.required]],
      courtLevel: ['', [Validators.required]],
      courtType: ['', [Validators.required]],
      unitId: ['', [Validators.required]],
      designation: [''],
      address: [''],
      contactNumber: [''],
      email: ['', [Validators.email]],
      isActive: [true]
    });

    if (data.mode === 'edit' && data.court) {
      this.courtForm.patchValue({
        courtCode: data.court.courtCode,
        courtName: data.court.courtName,
        courtLevel: data.court.courtLevel,
        courtType: data.court.courtType,
        unitId: data.court.unitId,
        designation: data.court.designation || '',
        address: data.court.address || '',
        contactNumber: data.court.contactNumber || '',
        email: data.court.email || '',
        isActive: data.court.isActive !== false
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.courtForm.valid) {
      this.isLoading = true;
      const formValue = this.courtForm.value;

      const courtData = {
        ...formValue
      };

      const request = this.data.mode === 'create'
        ? this.adminService.createCourt(courtData)
        : this.adminService.updateCourt(this.data.court.id, courtData);

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
              this.snackBar.open(`Court ${this.data.mode === 'create' ? 'created' : 'updated'} successfully`, 'Close', { duration: 3000 });
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
