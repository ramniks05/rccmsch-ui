import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OfficerCaseService } from '../services/officer-case.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Party {
  partyId: string;
  partyName: string;
  partyType: 'PETITIONER' | 'RESPONDENT';
  partyLabel: string;
}

export interface PartyAttendance {
  partyId: string;
  partyName: string;
  partyType: 'PETITIONER' | 'RESPONDENT';
  isPresent: boolean;
  isProxy: boolean;
  proxyName: string | null;
  remarks: string | null;
}

export interface AttendanceData {
  attendanceDate: string;
  parties: PartyAttendance[];
  remarks: string | null;
}

@Component({
  selector: 'app-attendance-form',
  templateUrl: './attendance-form.component.html',
  styleUrls: ['./attendance-form.component.scss']
})
export class AttendanceFormComponent implements OnInit {
  caseId: number;
  parties: Party[] = [];
  loading = false;
  submitting = false;
  existingAttendance: any = null;
  hasExistingData = false;
  today = new Date();
  
  attendanceForm: FormGroup;
  partiesFormArray: FormArray;

  constructor(
    private dialogRef: MatDialogRef<AttendanceFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { caseId: number },
    private caseService: OfficerCaseService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.caseId = data.caseId;
    this.attendanceForm = this.fb.group({
      attendanceDate: [new Date(), Validators.required],
      parties: this.fb.array([]),
      remarks: ['']
    });
    this.partiesFormArray = this.attendanceForm.get('parties') as FormArray;
  }

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Load parties and existing attendance data
   */
  loadData(): void {
    this.loading = true;

    // Load parties and existing attendance in parallel
    forkJoin({
      parties: this.caseService.getParties(this.caseId).pipe(
        catchError(error => {
          console.error('Error loading parties:', error);
          return of({ success: false, data: null });
        })
      ),
      attendance: this.caseService.getLatestAttendance(this.caseId).pipe(
        catchError(error => {
          // 404 is expected if no attendance exists yet
          if (error.status === 404) {
            return of({ success: false, data: null });
          }
          console.error('Error loading attendance:', error);
          return of({ success: false, data: null });
        })
      )
    }).subscribe({
      next: (results) => {
        this.loading = false;

        // Load parties
        if (results.parties.success && results.parties.data?.parties) {
          this.parties = results.parties.data.parties;
          this.buildPartiesFormArray();
        } else {
          this.snackBar.open(
            'No parties found for this case. Using applicant as petitioner.',
            'Close',
            { duration: 3000 }
          );
          // Fallback: create default party from case data
          this.parties = [{
            partyId: 'petitioner',
            partyName: 'Petitioner',
            partyType: 'PETITIONER',
            partyLabel: 'Petitioner'
          }];
          this.buildPartiesFormArray();
        }

        // Load existing attendance if available
        if (results.attendance.success && results.attendance.data) {
          this.existingAttendance = results.attendance.data;
          this.hasExistingData = true;
          this.populateFormFromExistingData();
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load data. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Build form array for parties
   */
  buildPartiesFormArray(): void {
    this.partiesFormArray.clear();
    this.parties.forEach(party => {
      const partyGroup = this.fb.group({
        partyId: [party.partyId],
        partyName: [party.partyName],
        partyType: [party.partyType],
        isPresent: [false],
        isProxy: [false],
        proxyName: [''],
        remarks: ['']
      });

      // Conditional validation: proxyName required if isProxy is true
      partyGroup.get('isProxy')?.valueChanges.subscribe(isProxy => {
        const proxyNameControl = partyGroup.get('proxyName');
        if (isProxy) {
          proxyNameControl?.setValidators([Validators.required]);
        } else {
          proxyNameControl?.clearValidators();
          proxyNameControl?.setValue('');
        }
        proxyNameControl?.updateValueAndValidity();
      });

      // Show proxy fields only when present is checked
      partyGroup.get('isPresent')?.valueChanges.subscribe(isPresent => {
        if (!isPresent) {
          partyGroup.get('isProxy')?.setValue(false);
          partyGroup.get('proxyName')?.setValue('');
        }
      });

      this.partiesFormArray.push(partyGroup);
    });
  }

  /**
   * Populate form with existing attendance data
   */
  populateFormFromExistingData(): void {
    if (!this.existingAttendance?.formData) {
      return;
    }

    try {
      const formData = typeof this.existingAttendance.formData === 'string'
        ? JSON.parse(this.existingAttendance.formData)
        : this.existingAttendance.formData;

      // Set attendance date
      if (formData.attendanceDate) {
        this.attendanceForm.patchValue({
          attendanceDate: new Date(formData.attendanceDate)
        });
      }

      // Set general remarks
      if (formData.remarks) {
        this.attendanceForm.patchValue({
          remarks: formData.remarks
        });
      }

      // Populate party data
      if (formData.parties && Array.isArray(formData.parties)) {
        this.partiesFormArray.controls.forEach((control, index) => {
          const partyData = formData.parties.find((p: PartyAttendance) => 
            p.partyId === control.get('partyId')?.value
          );
          
          if (partyData) {
            control.patchValue({
              isPresent: partyData.isPresent || false,
              isProxy: partyData.isProxy || false,
              proxyName: partyData.proxyName || '',
              remarks: partyData.remarks || ''
            });
          }
        });
      }
    } catch (e) {
      console.error('Error parsing existing attendance data:', e);
    }
  }

  /**
   * Get party form group at index
   */
  getPartyFormGroup(index: number): FormGroup {
    return this.partiesFormArray.at(index) as FormGroup;
  }

  /**
   * Check if proxy section should be shown for a party
   */
  showProxySection(index: number): boolean {
    const partyGroup = this.getPartyFormGroup(index);
    return partyGroup.get('isPresent')?.value === true;
  }

  /**
   * Check if proxy name field should be shown
   */
  showProxyNameField(index: number): boolean {
    const partyGroup = this.getPartyFormGroup(index);
    return partyGroup.get('isProxy')?.value === true;
  }

  /**
   * Check if field has error
   */
  hasFieldError(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get field error message
   */
  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field || !field.errors) {
      return '';
    }
    
    if (field.errors['required']) {
      return 'This field is required';
    }
    
    return 'Invalid value';
  }

  /**
   * Submit attendance form
   */
  submitAttendance(): void {
    // Mark all fields as touched for validation
    this.markFormGroupTouched(this.attendanceForm);

    if (this.attendanceForm.invalid) {
      this.snackBar.open('Please fill all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    // Validate proxy names if proxy is checked
    let hasProxyError = false;
    this.partiesFormArray.controls.forEach((control, index) => {
      const partyGroup = control as FormGroup;
      if (partyGroup.get('isProxy')?.value && !partyGroup.get('proxyName')?.value) {
        partyGroup.get('proxyName')?.markAsTouched();
        hasProxyError = true;
      }
    });

    if (hasProxyError) {
      this.snackBar.open('Please enter proxy name for parties marked as proxy', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;

    // Prepare attendance data
    const formValue = this.attendanceForm.value;
    const attendanceData: AttendanceData = {
      attendanceDate: this.formatDate(formValue.attendanceDate),
      parties: formValue.parties.map((p: any) => ({
        partyId: p.partyId,
        partyName: p.partyName,
        partyType: p.partyType,
        isPresent: p.isPresent || false,
        isProxy: p.isProxy || false,
        proxyName: p.isProxy ? (p.proxyName || null) : null,
        remarks: p.remarks || null
      })),
      remarks: formValue.remarks || null
    };

    // Submit attendance
    this.caseService.submitModuleForm(
      this.caseId,
      'ATTENDANCE',
      attendanceData,
      formValue.remarks || undefined
    ).pipe(
      catchError(error => {
        this.submitting = false;
        this.snackBar.open(
          error.error?.message || 'Failed to save attendance. Please try again.',
          'Close',
          { duration: 5000 }
        );
        throw error;
      })
    ).subscribe({
      next: (response: any) => {
        this.submitting = false;
        if (response.success) {
          this.snackBar.open('Attendance marked successfully', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close('success');
        } else {
          this.snackBar.open(
            response.message || 'Failed to save attendance',
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
   * Format date to YYYY-MM-DD format
   */
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Mark all form fields as touched for validation display
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
