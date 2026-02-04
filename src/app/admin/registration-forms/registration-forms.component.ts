import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RegistrationFormAdminService, RegistrationFormField } from '../services/registration-form-admin.service';
import { RegistrationFormFieldDialogComponent } from './registration-form-field-dialog/registration-form-field-dialog.component';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Registration Forms Component
 * Manages registration form fields for Citizen and Lawyer
 */
@Component({
  selector: 'app-registration-forms',
  templateUrl: './registration-forms.component.html',
  styleUrls: ['./registration-forms.component.scss']
})
export class RegistrationFormsComponent implements OnInit, AfterViewInit {
  selectedTab = 0; // 0 = Citizen, 1 = Lawyer, 2 = Field Groups
  registrationType: 'CITIZEN' | 'LAWYER' = 'CITIZEN';
  selectedGroupType: 'CITIZEN' | 'LAWYER' = 'CITIZEN';

  displayedColumns: string[] = ['displayOrder', 'fieldLabel', 'fieldName', 'fieldType', 'isRequired', 'fieldGroup', 'isActive', 'actions'];
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

  constructor(
    private registrationFormService: RegistrationFormAdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadFields();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Handle tab change
   */
  onTabChange(index: number): void {
    this.selectedTab = index;
    if (index === 0) {
      this.registrationType = 'CITIZEN';
      this.selectedGroupType = 'CITIZEN';
      this.loadFields();
    } else if (index === 1) {
      this.registrationType = 'LAWYER';
      this.selectedGroupType = 'LAWYER';
      this.loadFields();
    } else if (index === 2) {
      // Field Groups tab - use current registration type
      this.selectedGroupType = this.registrationType;
    }
  }

  /**
   * Load registration form fields
   */
  loadFields(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.registrationFormService.getRegistrationFormFields(this.registrationType)
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
            const fields = apiResponse.data || [];
            // Sort by displayOrder
            this.dataSource.data = fields.sort((a: RegistrationFormField, b: RegistrationFormField) =>
              a.displayOrder - b.displayOrder
            );
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
    const dialogRef = this.dialog.open(RegistrationFormFieldDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        mode: 'create',
        registrationType: this.registrationType
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadFields();
      }
    });
  }

  /**
   * Open edit dialog
   */
  openEditDialog(field: RegistrationFormField): void {
    const dialogRef = this.dialog.open(RegistrationFormFieldDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        mode: 'edit',
        field: { ...field },
        registrationType: this.registrationType
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadFields();
      }
    });
  }

  /**
   * Delete field
   */
  deleteField(field: RegistrationFormField): void {
    if (!field.id) {
      this.snackBar.open('Invalid field', 'Close', { duration: 3000 });
      return;
    }

    if (confirm(`Are you sure you want to delete the field "${field.fieldLabel}"?`)) {
      this.isLoading = true;

      this.registrationFormService.deleteRegistrationFormField(field.id)
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
            const apiResponse = response?.success !== undefined ? response : { success: true, message: 'Field deleted successfully' };
            this.snackBar.open(apiResponse.message || 'Field deleted successfully', 'Close', { duration: 3000 });
            this.loadFields();
          },
          error: () => {
            this.isLoading = false;
          }
        });
    }
  }

  /**
   * Apply filter
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
    console.error('Error:', error);
    if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error.error?.error) {
      this.errorMessage = error.error.error;
    } else {
      this.errorMessage = 'An error occurred. Please try again.';
    }
    this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
  }

  /**
   * Get field type display name
   */
  getFieldTypeDisplay(type: string): string {
    const types: { [key: string]: string } = {
      'TEXT': 'Text',
      'EMAIL': 'Email',
      'PHONE': 'Phone',
      'DATE': 'Date',
      'DROPDOWN': 'Dropdown',
      'TEXTAREA': 'Textarea',
      'NUMBER': 'Number',
      'PASSWORD': 'Password'
    };
    return types[type] || type;
  }
}
