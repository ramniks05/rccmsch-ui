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
 * Officers Component
 * Manages government employees/officers with CRUD operations
 */
@Component({
  selector: 'app-officers',
  templateUrl: './officers.component.html',
  styleUrls: ['./officers.component.scss']
})
export class OfficersComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'fullName', 'mobileNo', 'email', 'isActive', 'isMobileVerified', 'isPasswordResetRequired', 'actions'];
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
    this.loadOfficers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load all officers
   */
  loadOfficers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminService.getAllOfficers()
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
    const dialogRef = this.dialog.open(OfficerDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadOfficers();
      }
    });
  }

  /**
   * View officer details
   */
  viewOfficer(officer: any): void {
    this.dialog.open(OfficerDialogComponent, {
      width: '600px',
      data: { mode: 'view', officer: officer }
    });
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
      this.errorMessage = 'Failed to load officers. Please try again.';
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
}

/**
 * Dialog Component for Create/View Officer
 */
@Component({
  selector: 'app-officer-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'View' }} Officer</h2>
    <mat-dialog-content>
      <form [formGroup]="officerForm" class="officer-form" *ngIf="data.mode === 'create'">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full Name *</mat-label>
          <input matInput formControlName="fullName" placeholder="Enter full name">
          <mat-error *ngIf="officerForm.get('fullName')?.hasError('required')">Full name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Mobile Number *</mat-label>
          <input matInput formControlName="mobileNo" placeholder="Enter mobile number" maxlength="10">
          <mat-error *ngIf="officerForm.get('mobileNo')?.hasError('required')">Mobile number is required</mat-error>
          <mat-error *ngIf="officerForm.get('mobileNo')?.hasError('pattern')">Invalid mobile number</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email *</mat-label>
          <input matInput type="email" formControlName="email" placeholder="Enter email">
          <mat-error *ngIf="officerForm.get('email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="officerForm.get('email')?.hasError('email')">Invalid email format</mat-error>
        </mat-form-field>
      </form>

      <div *ngIf="data.mode === 'view' && data.officer" class="view-mode">
        <div class="info-row">
          <strong>ID:</strong> <span>{{ data.officer.id }}</span>
        </div>
        <div class="info-row">
          <strong>Full Name:</strong> <span>{{ data.officer.fullName }}</span>
        </div>
        <div class="info-row">
          <strong>Mobile:</strong> <span>{{ data.officer.mobileNo }}</span>
        </div>
        <div class="info-row">
          <strong>Email:</strong> <span>{{ data.officer.email || 'N/A' }}</span>
        </div>
        <div class="info-row">
          <strong>Active:</strong> <span [class.active]="data.officer.isActive" [class.inactive]="!data.officer.isActive">
            {{ data.officer.isActive ? 'Yes' : 'No' }}
          </span>
        </div>
        <div class="info-row">
          <strong>Mobile Verified:</strong> <span>{{ data.officer.isMobileVerified ? 'Yes' : 'No' }}</span>
        </div>
        <div class="info-row">
          <strong>Password Reset Required:</strong> <span>{{ data.officer.isPasswordResetRequired ? 'Yes' : 'No' }}</span>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Close</button>
      <button *ngIf="data.mode === 'create'" mat-raised-button color="primary" (click)="onSave()" [disabled]="officerForm.invalid || isLoading">
        <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
        <span *ngIf="!isLoading">Create</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .officer-form, .view-mode {
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
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .active { color: #28a745; font-weight: 600; }
    .inactive { color: #dc3545; font-weight: 600; }
  `]
})
export class OfficerDialogComponent {
  officerForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<OfficerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.officerForm = this.fb.group({
      fullName: ['', Validators.required],
      mobileNo: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.officerForm.valid) {
      this.isLoading = true;
      this.adminService.createOfficer(this.officerForm.value)
        .pipe(catchError(error => {
          this.isLoading = false;
          this.snackBar.open(error.error?.message || 'Failed to create officer', 'Close', { duration: 3000 });
          return throwError(() => error);
        }))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success) {
              this.snackBar.open('Officer created successfully', 'Close', { duration: 3000 });
              this.dialogRef.close(true);
            }
          },
          error: () => this.isLoading = false
        });
    }
  }
}
