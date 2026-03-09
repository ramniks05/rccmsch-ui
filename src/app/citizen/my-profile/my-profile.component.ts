import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdvancedSettingsService } from 'src/app/core/services/advanced-settings.service';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss'],
})
export class MyProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private advancedSettingsComponent: AdvancedSettingsService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Normally this comes from API / auth service
    const savedUserData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const userData: any = {
      firstName: '',
      lastName: '',
      email: savedUserData.email || "",
      mobileNumber: savedUserData.mobileNumber || "",
      occupation: '',
      gender: '',
      address: '',
      district: '',
      pincode: '',
      education: '',
    };

    this.profileForm = this.fb.group({
      firstName: [userData?.firstName || '', Validators.required],
      lastName: [userData?.lastName || '', Validators.required],
      email: [{ value: userData?.email || '', disabled: true }],
      mobileNumber: [{ value: userData?.mobileNumber || '', disabled: true }],
      occupation: [userData?.occupation || '', Validators.required],
      gender: [userData?.gender || '', Validators.required],
      address: [userData?.address || '', Validators.required],
      district: [userData?.district || '', Validators.required],
      pincode: [
        userData?.pincode || '',
        [Validators.required, Validators.pattern(/^[0-9]{6}$/)],
      ],
      education: [userData?.education || '', Validators.required],
    });

    this.profileForm.disable(); // view mode initially
  }

  enableEdit(): void {
    this.isEditMode = true;
    this.profileForm.enable();
    this.profileForm.get('email')?.disable();
    this.profileForm.get('mobileNumber')?.disable();
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.profileForm.disable();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const payload = this.profileForm.getRawValue();
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const userDataItem = JSON.parse(userData);
        this.advancedSettingsComponent
          .updateCitizenProfile(userDataItem.userId, payload)
          .subscribe(
            (response: any) => {
              console.log('Profile updated successfully:', response);
              this.isEditMode = false;
              this.profileForm.disable();
              this.snack.open('Profile updated successfully', 'Close', { duration: 3000 });
            },
            (error: any) => {
              console.error('Error updating profile:', error);
            },
          );
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }
}
