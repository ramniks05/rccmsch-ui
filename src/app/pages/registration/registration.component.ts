import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Registration Component
 * Handles citizen registration with basic details
 */
@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss']
})
export class RegistrationComponent {
  registrationForm: FormGroup;
  otpVerificationForm: FormGroup;
  submitted = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showOtpVerification = false;
  registrationMobileNumber = '';
  registrationUserId: number | null = null;
  isVerifyingOtp = false;
  otpErrorMessage = '';
  otpSuccessMessage = '';
  otpCode: string | null = null; // Store OTP for development display

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    this.registrationForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]+$/)]],
      lastName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      dateOfBirth: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      district: ['', [Validators.required]],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      aadharNumber: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });

    // OTP Verification Form (after registration)
    this.otpVerificationForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Clear server errors when user starts typing
    this.setupFieldErrorClearing();
  }

  /**
   * Setup field error clearing when user starts typing
   */
  private setupFieldErrorClearing(): void {
    // Clear email server error
    this.registrationForm.get('email')?.valueChanges.subscribe(() => {
      const emailControl = this.registrationForm.get('email');
      if (emailControl?.hasError('serverError')) {
        const errors = { ...emailControl.errors };
        delete errors['serverError'];
        emailControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    });

    // Clear mobile number server error
    this.registrationForm.get('mobileNumber')?.valueChanges.subscribe(() => {
      const mobileControl = this.registrationForm.get('mobileNumber');
      if (mobileControl?.hasError('serverError')) {
        const errors = { ...mobileControl.errors };
        delete errors['serverError'];
        mobileControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    });

    // Clear Aadhar number server error
    this.registrationForm.get('aadharNumber')?.valueChanges.subscribe(() => {
      const aadharControl = this.registrationForm.get('aadharNumber');
      if (aadharControl?.hasError('serverError')) {
        const errors = { ...aadharControl.errors };
        delete errors['serverError'];
        aadharControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    });
  }

  /**
   * Custom validator to check if passwords match
   */
  passwordMatchValidator(formGroup: FormGroup): { [key: string]: boolean } | null {
    const password = formGroup.get('password');
    const confirmPassword = formGroup.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword?.hasError('passwordMismatch')) {
        confirmPassword.setErrors(null);
      }
      return null;
    }
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    if (this.registrationForm.valid) {
      const formValue = this.registrationForm.value;
      
      // Map form data to API request format
      const registrationData = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        mobileNumber: formValue.mobileNumber,
        dateOfBirth: this.formatDateForAPI(formValue.dateOfBirth),
        gender: formValue.gender.toUpperCase(),
        address: formValue.address,
        district: formValue.district,
        pincode: formValue.pincode,
        aadharNumber: formValue.aadharNumber,
        password: formValue.password,
        confirmPassword: formValue.confirmPassword
      };

      this.isLoading = true;
      
      this.apiService.registerCitizen(registrationData)
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.handleRegistrationError(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            this.handleRegistrationSuccess(response);
          },
          error: (error) => {
            // Error already handled in catchError
            this.isLoading = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.registrationForm);
    }
  }

  /**
   * Format date to YYYY-MM-DD for API
   */
  private formatDateForAPI(date: Date | string): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Handle successful registration
   */
  private handleRegistrationSuccess(response: any): void {
    // Handle new API response structure { success, message, data }
    const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
    const responseData = apiResponse.success ? apiResponse.data : response;
    
    const citizenId = responseData?.citizenId || responseData?.userId;
    const mobileNumber = this.registrationForm.get('mobileNumber')?.value;
    const otpCode = responseData?.otpCode;
    
    // Store OTP code for development display
    this.otpCode = otpCode || null;
    
    // Log OTP code for testing (as per API documentation)
    if (otpCode) {
      console.log('OTP Code (for testing):', otpCode);
    }
    
    this.registrationUserId = citizenId;
    this.registrationMobileNumber = mobileNumber;
    this.showOtpVerification = true;
    this.successMessage = apiResponse.message || 'Registration successful! OTP has been sent to your mobile number. Please enter the OTP below to activate your account.';
    
    // Scroll to OTP verification section
    setTimeout(() => {
      const otpSection = document.querySelector('.otp-verification-section');
      if (otpSection) {
        otpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  }

  /**
   * Handle registration errors
   */
  private handleRegistrationError(error: any): void {
    console.error('Registration error:', error);
    
    // Clear previous error messages
    this.errorMessage = '';
    
    // Handle 409 Conflict - Duplicate resource
    if (error.status === 409) {
      const errorMessage = error.error?.message || error.error?.error || '';
      let specificMessage = 'Email, mobile number, or Aadhar number already exists. Please use different credentials.';
      
      // Try to identify which field is duplicated
      const messageLower = errorMessage.toLowerCase();
      if (messageLower.includes('email')) {
        specificMessage = 'This email address is already registered. Please use a different email.';
        const emailControl = this.registrationForm.get('email');
        if (emailControl) {
          emailControl.setErrors({ serverError: 'Email already exists' });
          emailControl.markAsTouched();
        }
      } else if (messageLower.includes('mobile')) {
        specificMessage = 'This mobile number is already registered. Please use a different mobile number.';
        const mobileControl = this.registrationForm.get('mobileNumber');
        if (mobileControl) {
          mobileControl.setErrors({ serverError: 'Mobile number already exists' });
          mobileControl.markAsTouched();
        }
      } else if (messageLower.includes('aadhar')) {
        specificMessage = 'This Aadhar number is already registered. Please use a different Aadhar number.';
        const aadharControl = this.registrationForm.get('aadharNumber');
        if (aadharControl) {
          aadharControl.setErrors({ serverError: 'Aadhar number already exists' });
          aadharControl.markAsTouched();
        }
      }
      
      this.errorMessage = errorMessage || specificMessage;
      return;
    }
    
    // Handle connection errors
    if (error.status === 0) {
      this.errorMessage = 'Unable to connect to server. Please check your connection.';
      return;
    }
    
    // Handle validation errors (400 Bad Request)
    if (error.status === 400 && error.error) {
      if (error.error.errors && Array.isArray(error.error.errors)) {
        // Handle validation errors array
        const validationErrors = error.error.errors;
        this.errorMessage = 'Validation failed: ' + validationErrors.map((e: any) => e.message || `${e.field}: ${e.defaultMessage}`).join(', ');
        
        // Set form field errors
        validationErrors.forEach((err: any) => {
          const control = this.registrationForm.get(err.field);
          if (control) {
            control.setErrors({ serverError: err.message || err.defaultMessage });
            control.markAsTouched();
          }
        });
      } else if (error.error.message) {
        this.errorMessage = error.error.message;
      } else if (error.error.error) {
        this.errorMessage = error.error.error;
      } else {
        this.errorMessage = 'Invalid data. Please check all fields and try again.';
      }
      return;
    }
    
    // Handle other errors
    if (error.error) {
      if (error.error.message) {
        this.errorMessage = error.error.message;
      } else if (error.error.error) {
        this.errorMessage = error.error.error;
      } else {
        this.errorMessage = 'Registration failed. Please try again.';
      }
    } else {
      this.errorMessage = 'An error occurred during registration. Please try again later.';
    }
  }


  /**
   * Verify Registration OTP
   */
  onVerifyOtp(): void {
    if (this.otpVerificationForm.valid && this.registrationMobileNumber) {
      const otp = this.otpVerificationForm.get('otp')?.value;
      
      this.isVerifyingOtp = true;
      this.otpErrorMessage = '';
      this.otpSuccessMessage = '';

      this.apiService.verifyRegistrationOTP(this.registrationMobileNumber, otp)
        .pipe(
          catchError(error => {
            this.isVerifyingOtp = false;
            this.handleOtpVerificationError(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isVerifyingOtp = false;
            this.handleOtpVerificationSuccess(response);
          },
          error: (error) => {
            // Error already handled in catchError
            this.isVerifyingOtp = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.otpVerificationForm);
    }
  }

  /**
   * Handle successful OTP verification
   */
  private handleOtpVerificationSuccess(response: any): void {
    console.log('OTP verification successful:', response);
    
    // Handle new API response structure { success, message, data }
    const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
    const message = apiResponse.message || 'Mobile number verified successfully! Your account has been activated. Redirecting to login...';
    
    this.otpSuccessMessage = message;
    
    // Redirect to login page after 2 seconds
    setTimeout(() => {
      this.router.navigate(['/home'], {
        queryParams: {
          verified: true,
          message: 'Account activated successfully. Please login with your credentials.'
        }
      });
    }, 2000);
  }

  /**
   * Handle OTP verification errors
   */
  private handleOtpVerificationError(error: any): void {
    console.error('OTP verification error:', error);
    
    if (error.error) {
      if (error.error.message) {
        this.otpErrorMessage = error.error.message;
      } else if (error.error.error) {
        this.otpErrorMessage = error.error.error;
      } else {
        this.otpErrorMessage = 'OTP verification failed. Please try again.';
      }
    } else if (error.status === 0) {
      this.otpErrorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.status === 400) {
      this.otpErrorMessage = 'Invalid or expired OTP. Please check and try again.';
      // Clear OTP field
      this.otpVerificationForm.patchValue({ otp: '' });
    } else if (error.status === 404) {
      this.otpErrorMessage = 'OTP not found or already used. Please request a new OTP.';
    } else {
      this.otpErrorMessage = 'An error occurred during OTP verification. Please try again later.';
    }
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      this.otpErrorMessage = '';
    }, 5000);
  }

  /**
   * Resend OTP
   */
  resendOtp(): void {
    if (this.registrationMobileNumber) {
      // Call send registration OTP API
      this.apiService.sendRegistrationOTP(this.registrationMobileNumber, 'CITIZEN')
        .pipe(
          catchError(error => {
            this.handleOtpVerificationError(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            // Handle new API response structure { success, message, data }
            const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
            const otpCode = apiResponse.data?.otpCode;
            
            // Store OTP code for development display
            this.otpCode = otpCode || null;
            
            if (otpCode) {
              console.log('OTP Code (for testing):', otpCode);
            }
            
            this.otpSuccessMessage = apiResponse.message || 'OTP has been resent to your mobile number.';
            this.otpVerificationForm.patchValue({ otp: '' });
            setTimeout(() => {
              this.otpSuccessMessage = '';
            }, 3000);
          },
          error: (error) => {
            // Error already handled in catchError
          }
        });
    }
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.otpErrorMessage = '';
    this.otpSuccessMessage = '';
    this.showOtpVerification = false;
    this.registrationMobileNumber = '';
    this.registrationUserId = null;
    this.otpCode = null;
    this.registrationForm.reset();
    this.otpVerificationForm.reset();
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get error message for form field
   */
  getErrorMessage(controlName: string): string {
    const control = this.registrationForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('pattern')) {
      return this.getPatternErrorMessage(controlName);
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} must be at least ${requiredLength} characters`;
    }
    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  /**
   * Get user-friendly field label
   */
  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      mobileNumber: 'Mobile Number',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      address: 'Address',
      district: 'District',
      pincode: 'PIN Code',
      aadharNumber: 'Aadhar Number',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };
    return labels[controlName] || controlName;
  }

  /**
   * Get pattern-specific error message
   */
  private getPatternErrorMessage(controlName: string): string {
    const messages: { [key: string]: string } = {
      firstName: 'First name should contain only letters',
      lastName: 'Last name should contain only letters',
      mobile: 'Please enter a valid 10-digit mobile number',
      pincode: 'PIN code must be 6 digits',
      aadharNumber: 'Aadhar number must be 12 digits',
      password: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    };
    return messages[controlName] || 'Invalid format';
  }
}

