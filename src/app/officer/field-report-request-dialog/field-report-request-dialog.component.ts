import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AdminService } from '../../admin/admin.service';
import { OfficerCaseService } from '../services/officer-case.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface FieldOfficerPosting {
  id: number;
  courtId: number | null;
  unitId: number;
  unitName: string;
  unitCode: string;
  unitLgdCode: string;
  roleCode: string;
  roleName: string;
  officerId: number;
  officerName: string;
  mobileNo: string;
  postingUserid: string;
  postingType: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-field-report-request-dialog',
  templateUrl: './field-report-request-dialog.component.html',
  styleUrls: ['./field-report-request-dialog.component.scss']
})
export class FieldReportRequestDialogComponent implements OnInit {
  fieldOfficers: FieldOfficerPosting[] = [];
  loadingOfficers = false;
  selectedOfficerId: number | null = null;
  selectedOfficer: FieldOfficerPosting | null = null;
  comments: string = '';
  submitting = false;
  
  // Group officers by role for better display
  officersByRole: Map<string, FieldOfficerPosting[]> = new Map();
  
  form: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<FieldReportRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      caseId: number;
      unitId: number;
      courtId?: number;
    },
    private adminService: AdminService,
    private caseService: OfficerCaseService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      officerId: [null],
      comments: ['']
    });
  }

  ngOnInit(): void {
    this.loadFieldOfficers();
  }

  /**
   * Load all field officers below Tehsildar's unit
   * API automatically discovers officers based on unit hierarchy
   * No manual assignment needed - all officers in child units are returned
   */
  loadFieldOfficers(): void {
    this.loadingOfficers = true;
    
    // API automatically returns all field officers in units below this unitId
    // Based on administrative hierarchy (District -> Circle -> Patwari/Kanungo)
    this.adminService.getFieldOfficersByUnit(this.data.unitId).pipe(
      catchError(error => {
        console.error('Error loading field officers:', error);
        this.snackBar.open(
          'Failed to load field officers. Please ensure you have a valid unit assignment.',
          'Close',
          { duration: 5000 }
        );
        return of({ success: false, data: [] });
      })
    ).subscribe({
      next: (response: any) => {
        this.loadingOfficers = false;
        if (response.success && response.data) {
          this.fieldOfficers = response.data;
          this.groupOfficersByRole();
          
          if (this.fieldOfficers.length === 0) {
            this.snackBar.open(
              'No field officers found in your administrative boundary. Please contact administrator.',
              'Close',
              { duration: 5000 }
            );
          }
        } else {
          this.fieldOfficers = [];
        }
      },
      error: () => {
        this.loadingOfficers = false;
        this.fieldOfficers = [];
      }
    });
  }

  /**
   * Group officers by role for organized display
   */
  groupOfficersByRole(): void {
    this.officersByRole.clear();
    this.fieldOfficers.forEach(officer => {
      const role = officer.roleCode;
      if (!this.officersByRole.has(role)) {
        this.officersByRole.set(role, []);
      }
      this.officersByRole.get(role)!.push(officer);
    });
  }

  /**
   * Handle officer selection
   */
  onOfficerSelect(officer: FieldOfficerPosting): void {
    this.selectedOfficerId = officer.officerId;
    this.selectedOfficer = officer;
    this.form.patchValue({ officerId: officer.officerId });
  }

  /**
   * Submit field report request
   */
  submitRequest(): void {
    if (!this.selectedOfficerId || !this.selectedOfficer) {
      this.snackBar.open('Please select a field officer', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;
    const comments = this.form.get('comments')?.value || 'Field report requested';

    // Step 1: Execute REQUEST_FIELD_REPORT transition
    this.caseService.executeTransition(this.data.caseId, {
      caseId: this.data.caseId,
      transitionCode: 'REQUEST_FIELD_REPORT',
      comments: comments
    }).pipe(
      catchError(error => {
        this.submitting = false;
        this.snackBar.open(
          error.error?.message || 'Failed to execute transition. Please try again.',
          'Close',
          { duration: 5000 }
        );
        throw error;
      })
    ).subscribe({
      next: (transitionResponse) => {
        if (transitionResponse.success) {
          // Step 2: Assign case to selected officer
          this.assignCaseToOfficer();
        } else {
          this.submitting = false;
          this.snackBar.open(
            transitionResponse.message || 'Failed to execute transition',
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: () => {
        // Error already handled in catchError
      }
    });
  }

  /**
   * Assign case to field officer
   */
  private assignCaseToOfficer(): void {
    if (!this.selectedOfficerId || !this.selectedOfficer) {
      return;
    }

    this.adminService.assignCaseToOfficer(this.data.caseId, {
      officerId: this.selectedOfficerId,
      roleCode: this.selectedOfficer.roleCode
    }).pipe(
      catchError(error => {
        this.submitting = false;
        this.snackBar.open(
          error.error?.message || 'Failed to assign case to officer. Please try again.',
          'Close',
          { duration: 5000 }
        );
        throw error;
      })
    ).subscribe({
      next: (response: any) => {
        this.submitting = false;
        if (response.success) {
          this.snackBar.open('Field report requested successfully', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close('success');
        } else {
          this.snackBar.open(
            response.message || 'Failed to assign case to officer',
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: () => {
        // Error already handled in catchError
      }
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  /**
   * Get role groups as array for template iteration
   */
  get roleGroups(): Array<{ key: string; value: FieldOfficerPosting[] }> {
    return Array.from(this.officersByRole.entries()).map(([key, value]) => ({
      key,
      value
    }));
  }

  /**
   * Get icon for role
   */
  getRoleIcon(roleCode: string): string {
    const roleIcons: { [key: string]: string } = {
      'PATWARI': 'person',
      'KANUNGO': 'badge',
      'TEHSILDAR': 'admin_panel_settings'
    };
    return roleIcons[roleCode] || 'person';
  }
}
