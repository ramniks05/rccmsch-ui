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
 * Postings Component
 * Manages officer postings and assignments with CRUD operations
 */
@Component({
  selector: 'app-postings',
  templateUrl: './postings.component.html',
  styleUrls: ['./postings.component.scss']
})
export class PostingsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['postingUserid', 'officerName', 'roleName', 'postingType', 'courtName', 'unitName', 'mobileNo', 'fromDate', 'toDate', 'isCurrent', 'actions'];
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
  officers: any[] = [];
  courts: any[] = [];
  roles: any[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPostings();
    this.loadOfficers();
    this.loadCourts();
    this.loadRoles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load all active postings
   */
  loadPostings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getAllActivePostings()
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
   * Load officers for dropdown
   */
  loadOfficers(): void {
    this.adminService.getAllOfficers().subscribe({
      next: (response) => {
        const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
        if (apiResponse.success) {
          this.officers = apiResponse.data || [];
        }
      }
    });
  }

  /**
   * Load courts for dropdown
   */
  loadCourts(): void {
    this.adminService.getAllCourts().subscribe({
      next: (response) => {
        const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
        if (apiResponse.success) {
          this.courts = apiResponse.data || [];
        }
      }
    });
  }

  /**
   * Load roles for dropdown
   */
  loadRoles(): void {
    this.adminService.getAllRoles()
      .pipe(
        catchError(error => {
          console.error('Failed to load roles:', error);
          // Fallback to default roles if API fails
          this.roles = [
            { roleCode: 'ADMIN', roleName: 'Administrator' },
            { roleCode: 'OFFICER', roleName: 'Officer' },
            { roleCode: 'CLERK', roleName: 'Clerk' }
          ];
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success && apiResponse.data) {
            // Map API response to component format
            this.roles = apiResponse.data.map((role: any) => ({
              roleCode: role.roleCode,
              roleName: role.roleName,
              unitLevel: role.unitLevel,
              description: role.description
            }));
          }
        },
        error: () => {
          // Error already handled in catchError with fallback
        }
      });
  }

  /**
   * Open create dialog
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PostingDialogComponent, {
      width: '700px',
      data: {
        mode: 'create',
        officers: this.officers,
        courts: this.courts,
        roles: this.roles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPostings();
      }
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
      this.errorMessage = 'Failed to load postings. Please try again.';
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
 * Dialog Component for Create Posting (Unified - Court-Based and Unit-Based)
 */
@Component({
  selector: 'app-posting-dialog',
  template: `
    <h2 mat-dialog-title>Assign Officer to Post</h2>
    <mat-dialog-content>
      <form [formGroup]="postingForm" class="posting-form">
        <!-- Posting Type Selection -->
        <div class="posting-type-section">
          <label class="section-label">Posting Type *</label>
          <mat-radio-group formControlName="postingType" class="radio-group">
            <mat-radio-button value="COURT" class="radio-button">
              <mat-icon>account_balance</mat-icon>
              <span>Court-Based</span>
            </mat-radio-button>
            <mat-radio-button value="UNIT" class="radio-button">
              <mat-icon>location_city</mat-icon>
              <span>Unit-Based</span>
            </mat-radio-button>
          </mat-radio-group>
          <mat-error *ngIf="postingForm.get('postingType')?.hasError('required') && postingForm.get('postingType')?.touched">
            Posting type is required
          </mat-error>
        </div>

        <!-- Officer Selection -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Officer *</mat-label>
          <mat-select formControlName="officerId">
            <mat-option *ngFor="let officer of data.officers" [value]="officer.id">
              {{ officer.fullName }} ({{ officer.mobileNo }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="postingForm.get('officerId')?.hasError('required')">Officer is required</mat-error>
        </mat-form-field>

        <!-- Court Selection (for Court-Based Posting) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="postingForm.get('postingType')?.value === 'COURT'">
          <mat-label>Court *</mat-label>
          <mat-select formControlName="courtId">
            <mat-option [value]="null">-- Select Court --</mat-option>
            <mat-option *ngFor="let court of data.courts" [value]="court.id">
              {{ court.courtName }} ({{ court.courtType }}) - {{ court.unitName || 'N/A' }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="postingForm.get('courtId')?.hasError('required')">Court is required</mat-error>
        </mat-form-field>

        <!-- Unit Selection (for Unit-Based Posting) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="postingForm.get('postingType')?.value === 'UNIT'">
          <mat-label>Administrative Unit *</mat-label>
          <mat-select formControlName="unitId">
            <mat-option [value]="null">-- Select Unit --</mat-option>
            <mat-option *ngFor="let unit of units" [value]="unit.unitId">
              {{ unit.unitName }} ({{ unit.unitLevel }}) - LGD: {{ unit.lgdCode }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="postingForm.get('unitId')?.hasError('required')">Administrative unit is required</mat-error>
        </mat-form-field>

        <!-- Role Selection -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role *</mat-label>
          <mat-select formControlName="roleCode">
            <mat-option [value]="null">-- Select Role --</mat-option>
            <mat-option *ngFor="let role of availableRoles" [value]="role.roleCode">
              <mat-icon class="role-option-icon">{{ getRoleIcon(role.roleCode) }}</mat-icon>
              {{ role.roleName }} ({{ role.roleCode }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="postingForm.get('roleCode')?.hasError('required')">Role is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="postingForm.invalid || isLoading">
        <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
        <span *ngIf="!isLoading">Assign</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .posting-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 0;
      min-width: 600px;
    }
    .full-width {
      width: 100%;
    }
    .button-spinner {
      display: inline-block;
      margin-right: 8px;
    }
    .role-option-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 8px;
      vertical-align: middle;
      color: #667eea;
    }
    .posting-type-section {
      margin-bottom: 8px;
    }
    .section-label {
      display: block;
      margin-bottom: 12px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }
    .radio-group {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .radio-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .radio-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    mat-hint {
      font-size: 0.85rem;
      color: #666;
    }
  `]
})
export class PostingDialogComponent {
  postingForm: FormGroup;
  isLoading = false;
  availableRoles: any[] = [];
  units: any[] = [];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<PostingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.postingForm = this.fb.group({
      postingType: ['COURT', Validators.required],
      officerId: ['', Validators.required],
      courtId: [null],
      unitId: [null],
      roleCode: ['', Validators.required]
    });

    // Load administrative units
    this.loadUnits();

    // Load all roles (no filtering as per documentation)
    this.availableRoles = this.data.roles || [];

    // Watch posting type changes to update validation
    this.postingForm.get('postingType')?.valueChanges.subscribe(type => {
      if (type === 'COURT') {
        // Court-based: require courtId, clear unitId
        this.postingForm.get('courtId')?.setValidators([Validators.required]);
        this.postingForm.get('unitId')?.clearValidators();
        this.postingForm.get('unitId')?.setValue(null);
      } else {
        // Unit-based: require unitId, clear courtId
        this.postingForm.get('unitId')?.setValidators([Validators.required]);
        this.postingForm.get('courtId')?.clearValidators();
        this.postingForm.get('courtId')?.setValue(null);
      }
      this.postingForm.get('courtId')?.updateValueAndValidity();
      this.postingForm.get('unitId')?.updateValueAndValidity();
    });
  }

  /**
   * Load administrative units
   */
  loadUnits(): void {
    this.adminService.getActiveAdminUnits().subscribe({
      next: (response) => {
        const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
        if (apiResponse.success) {
          this.units = apiResponse.data || [];
        }
      },
      error: (error) => {
        console.error('Failed to load units:', error);
        this.units = [];
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Get icon for role
   */
  getRoleIcon(roleCode: string): string {
    const roleIcons: any = {
      'DEALING_ASSISTANT': 'support_agent',
      'PATWARI': 'person',
      'KANUNGO': 'person',
      'TEHSILDAR': 'badge',
      'READER': 'description'
    };
    return roleIcons[roleCode] || 'badge';
  }

  onSave(): void {
    if (this.postingForm.valid) {
      this.isLoading = true;
      const formValue = this.postingForm.value;
      
      // Prepare payload based on posting type
      const payload: any = {
        officerId: formValue.officerId,
        roleCode: formValue.roleCode,
        courtId: formValue.postingType === 'COURT' ? formValue.courtId : null,
        unitId: formValue.postingType === 'UNIT' ? formValue.unitId : null
      };

      this.adminService.assignOfficerToPost(payload)
        .pipe(catchError(error => {
          this.isLoading = false;
          this.snackBar.open(error.error?.message || 'Failed to assign officer', 'Close', { duration: 3000 });
          return throwError(() => error);
        }))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success) {
              const postingUserid = apiResponse.data?.postingUserid || 'N/A';
              this.snackBar.open(
                `Officer assigned successfully! UserID: ${postingUserid}`, 
                'Close', 
                { duration: 5000 }
              );
              this.dialogRef.close(true);
            }
          },
          error: () => this.isLoading = false
        });
    }
  }
}
