import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss'],
})
export class MyProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isEditMode = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Normally this comes from API / auth service
    const userData = {
      firstName: 'Harsh',
      lastName: 'Singh',
      email: 'harshsingh@gmail.com',
      mobileNumber: '9538532764',
      dateOfBirth: '2026-01-19',
      gender: 'MALE',
      address: 'New Delhi, Delhi',
      district: 'New Delhi',
      pincode: '110005',
      aadharNumber: '987654321123',
    };

    this.profileForm = this.fb.group({
      firstName: [userData.firstName, [Validators.required]],
      lastName: [userData.lastName, [Validators.required]],
      email: [{ value: userData.email, disabled: true }],
      mobileNumber: [{ value: userData.mobileNumber, disabled: true }],
      dateOfBirth: [userData.dateOfBirth, Validators.required],
      gender: [userData.gender, Validators.required],
      address: [userData.address, Validators.required],
      district: [userData.district, Validators.required],
      pincode: [
        userData.pincode,
        [Validators.required, Validators.pattern(/^[0-9]{6}$/)],
      ],
      aadharNumber: [
        userData.aadharNumber,
        [Validators.required, Validators.pattern(/^[0-9]{12}$/)],
      ],
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

    const payload = this.profileForm.getRawValue(); // includes disabled fields
    console.log('Updating profile:', payload);

    // Call update profile API here

    this.isEditMode = false;
    this.profileForm.disable();
  }
}
