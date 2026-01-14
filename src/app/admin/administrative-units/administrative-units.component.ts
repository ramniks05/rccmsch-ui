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
 * Administrative Units Component
 * Manages administrative units (State, District, Sub-Division, Circle) with CRUD operations
 */
@Component({
  selector: 'app-administrative-units',
  templateUrl: './administrative-units.component.html',
  styleUrls: ['./administrative-units.component.scss']
})
export class AdministrativeUnitsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['unitId', 'unitCode', 'unitName', 'unitLevel', 'lgdCode', 'parentUnitName', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  isLoading = false;
  errorMessage = '';
  unitLevels = ['STATE', 'DISTRICT', 'SUB_DIVISION', 'CIRCLE'];
  parentUnits: any[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUnits();
    this.loadParentUnits();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load all administrative units
   */
  loadUnits(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminService.getAllAdminUnits()
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
   * Load parent units for dropdown
   */
  loadParentUnits(): void {
    this.adminService.getAllAdminUnits().subscribe({
      next: (response) => {
        const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
        if (apiResponse.success) {
          this.parentUnits = apiResponse.data || [];
        }
      }
    });
  }

  /**
   * Open create dialog
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AdminUnitDialogComponent, {
      width: '600px',
      data: { mode: 'create', parentUnits: this.parentUnits }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUnits();
        this.loadParentUnits();
      }
    });
  }

  /**
   * Open edit dialog
   */
  openEditDialog(unit: any): void {
    const dialogRef = this.dialog.open(AdminUnitDialogComponent, {
      width: '600px',
      data: { mode: 'edit', unit: unit, parentUnits: this.parentUnits }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUnits();
        this.loadParentUnits();
      }
    });
  }

  /**
   * Delete administrative unit
   */
  deleteUnit(unit: any): void {
    if (confirm(`Are you sure you want to delete "${unit.unitName}"?`)) {
      this.isLoading = true;
      this.adminService.deleteAdminUnit(unit.unitId)
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.showError(error.error?.message || 'Failed to delete administrative unit');
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success) {
              this.showSuccess('Administrative unit deleted successfully');
              this.loadUnits();
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
   * Get icon for unit level
   */
  getLevelIcon(level: string): string {
    const iconMap: any = {
      'STATE': 'public',
      'DISTRICT': 'map',
      'SUB_DIVISION': 'location_on',
      'CIRCLE': 'place'
    };
    return iconMap[level] || 'location_city';
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
      this.errorMessage = 'Failed to load administrative units. Please try again.';
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
 * Dialog Component for Create/Edit Administrative Unit
 */
@Component({
  selector: 'app-admin-unit-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'Edit' }} Administrative Unit</h2>
    <mat-dialog-content>
      <form [formGroup]="unitForm" class="unit-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Unit Code *</mat-label>
          <input matInput formControlName="unitCode" placeholder="Enter unit code">
          <mat-error *ngIf="unitForm.get('unitCode')?.hasError('required')">Unit code is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Unit Name *</mat-label>
          <input matInput formControlName="unitName" placeholder="Enter unit name">
          <mat-error *ngIf="unitForm.get('unitName')?.hasError('required')">Unit name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Unit Level *</mat-label>
          <mat-select formControlName="unitLevel">
            <mat-option value="STATE">State</mat-option>
            <mat-option value="DISTRICT">District</mat-option>
            <mat-option value="SUB_DIVISION">Sub-Division</mat-option>
            <mat-option value="CIRCLE">Circle</mat-option>
          </mat-select>
          <mat-error *ngIf="unitForm.get('unitLevel')?.hasError('required')">Unit level is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>LGD Code *</mat-label>
          <input matInput type="number" formControlName="lgdCode" placeholder="Enter LGD code">
          <mat-error *ngIf="unitForm.get('lgdCode')?.hasError('required')">LGD code is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="unitForm.get('unitLevel')?.value !== 'STATE'">
          <mat-label>Parent Unit</mat-label>
          <mat-select formControlName="parentUnitId">
            <mat-option [value]="null">None</mat-option>
            <mat-option *ngFor="let parent of filteredParentUnits" [value]="parent.unitId">
              {{ parent.unitName }} ({{ parent.unitLevel }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="unitForm.invalid || isLoading">
        <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
        <span *ngIf="!isLoading">{{ data.mode === 'create' ? 'Create' : 'Update' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .unit-form {
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
export class AdminUnitDialogComponent {
  unitForm: FormGroup;
  isLoading = false;
  filteredParentUnits: any[] = [];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<AdminUnitDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.unitForm = this.fb.group({
      unitCode: ['', Validators.required],
      unitName: ['', Validators.required],
      unitLevel: ['', Validators.required],
      lgdCode: ['', Validators.required],
      parentUnitId: [null],
      isActive: [true]
    });

    if (data.mode === 'edit' && data.unit) {
      this.unitForm.patchValue(data.unit);
    }

    // Filter parent units based on selected level
    this.unitForm.get('unitLevel')?.valueChanges.subscribe(level => {
      this.filterParentUnits(level);
    });

    if (data.unit?.unitLevel) {
      this.filterParentUnits(data.unit.unitLevel);
    } else {
      this.filteredParentUnits = data.parentUnits || [];
    }
  }

  filterParentUnits(level: string): void {
    const levelHierarchy: any = {
      'STATE': [],
      'DISTRICT': ['STATE'],
      'SUB_DIVISION': ['STATE', 'DISTRICT'],
      'CIRCLE': ['STATE', 'DISTRICT', 'SUB_DIVISION']
    };

    const allowedLevels = levelHierarchy[level] || [];
    this.filteredParentUnits = (this.data.parentUnits || []).filter((unit: any) => 
      allowedLevels.includes(unit.unitLevel)
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.unitForm.valid) {
      this.isLoading = true;
      const formValue = this.unitForm.value;

      if (this.data.mode === 'create') {
        this.adminService.createAdminUnit(formValue)
          .pipe(catchError(error => {
            this.isLoading = false;
            this.snackBar.open(error.error?.message || 'Failed to create unit', 'Close', { duration: 3000 });
            return throwError(() => error);
          }))
          .subscribe({
            next: (response) => {
              this.isLoading = false;
              const apiResponse = response?.success !== undefined ? response : { success: true };
              if (apiResponse.success) {
                this.snackBar.open('Administrative unit created successfully', 'Close', { duration: 3000 });
                this.dialogRef.close(true);
              }
            },
            error: () => this.isLoading = false
          });
      } else {
        this.adminService.updateAdminUnit(this.data.unit.unitId, formValue)
          .pipe(catchError(error => {
            this.isLoading = false;
            this.snackBar.open(error.error?.message || 'Failed to update unit', 'Close', { duration: 3000 });
            return throwError(() => error);
          }))
          .subscribe({
            next: (response) => {
              this.isLoading = false;
              const apiResponse = response?.success !== undefined ? response : { success: true };
              if (apiResponse.success) {
                this.snackBar.open('Administrative unit updated successfully', 'Close', { duration: 3000 });
                this.dialogRef.close(true);
              }
            },
            error: () => this.isLoading = false
          });
      }
    }
  }
}
