import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { AdminService } from '../../admin/admin.service';
import { OfficerCaseService } from '../services/officer-case.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface FieldOfficerPosting {
  id: number;
  courtId: number | null;
  courtName?: string | null;
  courtCode?: string | null;
  courtLevel?: string | null;
  courtType?: string | null;
  unitId: number;
  unitName: string;
  unitCode: string;
  unitLgdCode: string;
  roleCode: string;
  roleName: string | null;
  officerId: number;
  officerName: string;
  mobileNo: string;
  postingUserid: string;
  postingType: string;
  fromDate?: string;
  toDate?: string | null;
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
  officerIdControl: FormControl;

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
    // Validate required data
    if (!data || !data.caseId || !data.unitId) {
      console.error('FieldReportRequestDialog: Missing required data', data);
      // Close dialog if data is invalid - use setTimeout to avoid constructor issues
      setTimeout(() => {
        this.snackBar.open('Invalid data provided. Cannot open dialog.', 'Close', { duration: 3000 });
        this.dialogRef.close();
      }, 100);
    } else {
      console.log('FieldReportRequestDialog opened with data:', data);
    }
    
    // Create form control directly for officerId
    this.officerIdControl = this.fb.control(null);
    
    this.form = this.fb.group({
      officerId: this.officerIdControl,
      comments: ['']
    });
  }

  ngOnInit(): void {
    // Validate data before loading
    if (!this.data || !this.data.caseId || !this.data.unitId) {
      console.error('FieldReportRequestDialog: Cannot initialize - missing required data', this.data);
      this.snackBar.open('Missing required information. Please ensure case is assigned to a unit.', 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    // Subscribe to form control changes
    this.officerIdControl.valueChanges.subscribe(value => {
      console.log('Officer ID form control changed:', value);
      if (value) {
        const officer = this.fieldOfficers.find(o => o.officerId === value);
        if (officer) {
          this.selectedOfficerId = officer.officerId;
          this.selectedOfficer = officer;
          console.log('Officer updated from valueChanges:', officer.officerName);
        }
      } else {
        this.selectedOfficerId = null;
        this.selectedOfficer = null;
      }
    });
    
    this.loadFieldOfficers();
  }

  /**
   * Load all field officers below Tehsildar's unit
   * API automatically discovers officers based on unit hierarchy
   * No manual assignment needed - all officers in child units are returned
   */
  loadFieldOfficers(): void {
    console.log('Loading field officers for unitId:', this.data.unitId);
    this.loadingOfficers = true;
    
    // API automatically returns all field officers in units below this unitId
    // Based on administrative hierarchy (District -> Circle -> Patwari/Kanungo)
    this.adminService.getFieldOfficersByUnit(this.data.unitId).pipe(
      catchError(error => {
        console.error('Error loading field officers (catchError):', error);
        this.loadingOfficers = false; // Ensure loading is stopped on error
        this.snackBar.open(
          'Failed to load field officers. Please ensure you have a valid unit assignment.',
          'Close',
          { duration: 5000 }
        );
        return of({ success: false, data: [] });
      })
    ).subscribe({
      next: (response: any) => {
        console.log('Raw field officers response:', response);
        console.log('Response type:', typeof response);
        console.log('Is array?', Array.isArray(response));
        console.log('Has success?', response?.success);
        console.log('Has data?', response?.data);
        console.log('Data is array?', Array.isArray(response?.data));
        
        this.loadingOfficers = false;
        
        // Handle response structure: { success: true, data: [...] }
        let officersArray: any[] = [];
        
        if (response) {
          // Primary: Check for { success: true, data: [...] } structure
          if (response.success === true && response.data) {
            officersArray = Array.isArray(response.data) ? response.data : [];
            console.log('Extracted from response.data:', officersArray.length, 'officers');
          } 
          // Fallback: Check if response is directly an array
          else if (Array.isArray(response)) {
            officersArray = response;
            console.log('Response is direct array:', officersArray.length, 'officers');
          }
          // Fallback: Check if response has data property that is an array
          else if (response.data && Array.isArray(response.data)) {
            officersArray = response.data;
            console.log('Extracted from nested data:', officersArray.length, 'officers');
          }
          else {
            console.warn('Unexpected response structure:', response);
          }
        }
        
        console.log('Final officers array:', officersArray);
        
        if (officersArray && officersArray.length > 0) {
          this.fieldOfficers = officersArray;
          this.groupOfficersByRole();
          console.log('Field officers loaded successfully:', this.fieldOfficers.length, 'officers grouped into', this.roleGroups.length, 'roles');
        } else {
          this.fieldOfficers = [];
          console.warn('No field officers found in response');
          this.snackBar.open(
            'No field officers found in your administrative boundary. Please contact administrator.',
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: (error) => {
        this.loadingOfficers = false;
        this.fieldOfficers = [];
        console.error('Error loading field officers:', error);
        console.error('Error details:', error.error, error.status, error.message);
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
   * Get role name for display (fallback to roleCode if roleName is null or undefined)
   */
  getRoleDisplayName(roleCode: string, roleName: string | null | undefined): string {
    return roleName || roleCode || 'Officer';
  }

  /**
   * Select officer (called on card click)
   */
  selectOfficer(officer: FieldOfficerPosting): void {
    console.log('selectOfficer called with:', officer);
    this.selectedOfficerId = officer.officerId;
    this.selectedOfficer = officer;
    this.officerIdControl.setValue(officer.officerId);
    this.form.patchValue({ officerId: officer.officerId });
    console.log('Officer selected:', officer.officerName, 'ID:', officer.officerId);
    console.log('Form value updated:', this.form.value);
  }

  /**
   * Handle radio button change (backup)
   */
  onRadioChange(event: any): void {
    console.log('Radio change event:', event);
    const selectedId = event.value;
    console.log('Radio changed, selected ID:', selectedId, 'Type:', typeof selectedId);
    
    const officer = this.fieldOfficers.find(o => o.officerId === selectedId || o.officerId === Number(selectedId));
    if (officer) {
      this.selectOfficer(officer);
    }
  }

  /**
   * Submit field report request
   */
  submitRequest(): void {
    console.log('Submit request clicked');
    console.log('Selected officer ID:', this.selectedOfficerId);
    console.log('Selected officer:', this.selectedOfficer);
    console.log('Form value:', this.form.value);
    
    if (!this.selectedOfficerId || !this.selectedOfficer) {
      this.snackBar.open('Please select a field officer', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;
    const comments = this.form.get('comments')?.value || 'Field report requested';
    console.log('Submitting request with comments:', comments);

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
    console.log('Close dialog clicked');
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
