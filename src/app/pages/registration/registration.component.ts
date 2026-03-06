import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { DynamicRegistrationFormComponent } from './dynamic-registration-form/dynamic-registration-form.component';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Registration Component
 * Handles citizen registration with basic details
 */
@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
})
export class RegistrationComponent {
  @ViewChild(DynamicRegistrationFormComponent)
  dynamicForm!: DynamicRegistrationFormComponent;

  registrationForm: FormGroup | null = null;
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
    private router: Router,
  ) {
    // OTP Verification Form (after registration)
    this.otpVerificationForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  /**
   * Handle form submission from dynamic form component
   */
  handleFormSubmit(formData: any): void {
    this.onSubmit(formData);
  }

  /**
   * Handle form submission
   */
  onSubmit(formData?: any): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Get form data from dynamic form if not provided
    if (!formData && this.dynamicForm?.registrationForm) {
      if (!this.dynamicForm.registrationForm.valid) {
        // Mark all fields as touched to show errors
        Object.keys(this.dynamicForm.registrationForm.controls).forEach(
          (key) => {
            this.dynamicForm.registrationForm.get(key)?.markAsTouched();
          },
        );
        return;
      }
      formData = this.dynamicForm.registrationForm.value;
    }

    if (!formData) {
      return;
    }

    // Format form data for API (handle date fields, etc.)
    const registrationData: any = { ...formData };

    // Format date fields
    if (registrationData.dateOfBirth) {
      registrationData.dateOfBirth = this.formatDateForAPI(
        registrationData.dateOfBirth,
      );
    }

    // Format gender if present
    if (registrationData.gender) {
      registrationData.gender = registrationData.gender.toUpperCase();
    }

    this.isLoading = true;

    // Use citizen registration API
    this.apiService
      .registerCitizen(registrationData)
      .pipe(
        catchError((error) => {
          this.isLoading = false;
          this.handleRegistrationError(error);
          return throwError(() => error);
        }),
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.handleRegistrationSuccess(response);
        },
        error: (error) => {
          // Error already handled in catchError
          this.isLoading = false;
        },
      });
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
    const apiResponse =
      response?.success !== undefined
        ? response
        : { success: true, data: response };
    const responseData = apiResponse.success ? apiResponse.data : response;

    const citizenId = responseData?.citizenId || responseData?.userId;
    const mobileNumber =
      this.dynamicForm?.registrationForm?.get('mobileNumber')?.value || '';
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
    this.successMessage =
      apiResponse.message ||
      'Registration successful! OTP has been sent to your mobile number. Please enter the OTP below to activate your account.';

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
      let specificMessage =
        'Email, mobile number, or Aadhar number already exists. Please use different credentials.';

      // Try to identify which field is duplicated
      const messageLower = errorMessage.toLowerCase();
      if (messageLower.includes('email')) {
        specificMessage =
          'This email address is already registered. Please use a different email.';
        const emailControl = this.dynamicForm?.registrationForm?.get('email');
        if (emailControl) {
          emailControl.setErrors({ serverError: 'Email already exists' });
          emailControl.markAsTouched();
        }
      } else if (messageLower.includes('mobile')) {
        specificMessage =
          'This mobile number is already registered. Please use a different mobile number.';
        const mobileControl =
          this.dynamicForm?.registrationForm?.get('mobileNumber');
        if (mobileControl) {
          mobileControl.setErrors({
            serverError: 'Mobile number already exists',
          });
          mobileControl.markAsTouched();
        }
      } else if (messageLower.includes('aadhar')) {
        specificMessage =
          'This Aadhar number is already registered. Please use a different Aadhar number.';
        const aadharControl =
          this.dynamicForm?.registrationForm?.get('aadharNumber');
        if (aadharControl) {
          aadharControl.setErrors({
            serverError: 'Aadhar number already exists',
          });
          aadharControl.markAsTouched();
        }
      }

      this.errorMessage = errorMessage || specificMessage;
      return;
    }

    // Handle connection errors
    if (error.status === 0) {
      this.errorMessage =
        'Unable to connect to server. Please check your connection.';
      return;
    }

    // Handle validation errors (400 Bad Request)
    if (error.status === 400 && error.error) {
      if (error.error.errors && Array.isArray(error.error.errors)) {
        // Handle validation errors array
        const validationErrors = error.error.errors;
        this.errorMessage =
          'Validation failed: ' +
          validationErrors
            .map((e: any) => e.message || `${e.field}: ${e.defaultMessage}`)
            .join(', ');

        // Set form field errors
        validationErrors.forEach((err: any) => {
          const control = this.dynamicForm?.registrationForm?.get(err.field);
          if (control) {
            control.setErrors({
              serverError: err.message || err.defaultMessage,
            });
            control.markAsTouched();
          }
        });
      } else if (error.error.message) {
        this.errorMessage = error.error.message;
      } else if (error.error.error) {
        this.errorMessage = error.error.error;
      } else {
        this.errorMessage =
          'Invalid data. Please check all fields and try again.';
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
      this.errorMessage =
        'An error occurred during registration. Please try again later.';
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

      // Use citizen OTP verification API
      this.apiService
        .verifyRegistrationOTP(this.registrationMobileNumber, otp)
        .pipe(
          catchError((error) => {
            this.isVerifyingOtp = false;
            this.handleOtpVerificationError(error);
            return throwError(() => error);
          }),
        )
        .subscribe({
          next: (response) => {
            this.isVerifyingOtp = false;
            this.handleOtpVerificationSuccess(response);
          },
          error: (error) => {
            // Error already handled in catchError
            this.isVerifyingOtp = false;
          },
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
    const apiResponse =
      response?.success !== undefined
        ? response
        : { success: true, data: response };
    const message =
      apiResponse.message ||
      'Mobile number verified successfully! Your account has been activated. Redirecting to login...';

    this.otpSuccessMessage = message;

    // Redirect to login page after 2 seconds
    setTimeout(() => {
      this.router.navigate(['/home'], {
        queryParams: {
          verified: true,
          message:
            'Account activated successfully. Please login with your credentials.',
        },
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
      this.otpErrorMessage =
        'Unable to connect to server. Please check your connection.';
    } else if (error.status === 400) {
      this.otpErrorMessage =
        'Invalid or expired OTP. Please check and try again.';
      // Clear OTP field
      this.otpVerificationForm.patchValue({ otp: '' });
    } else if (error.status === 404) {
      this.otpErrorMessage =
        'OTP not found or already used. Please request a new OTP.';
    } else {
      this.otpErrorMessage =
        'An error occurred during OTP verification. Please try again later.';
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
      // Use citizen resend OTP API
      this.apiService
        .sendRegistrationOTP(this.registrationMobileNumber, 'CITIZEN')
        .pipe(
          catchError((error) => {
            this.handleOtpVerificationError(error);
            return throwError(() => error);
          }),
        )
        .subscribe({
          next: (response) => {
            // Handle new API response structure { success, message, data }
            const apiResponse =
              response?.success !== undefined
                ? response
                : { success: true, data: response };
            const otpCode = apiResponse.data?.otpCode;

            // Store OTP code for development display
            this.otpCode = otpCode || null;

            if (otpCode) {
              console.log('OTP Code (for testing):', otpCode);
            }

            this.otpSuccessMessage =
              apiResponse.message ||
              'OTP has been resent to your mobile number.';
            this.otpVerificationForm.patchValue({ otp: '' });
            setTimeout(() => {
              this.otpSuccessMessage = '';
            }, 3000);
          },
          error: (error) => {
            // Error already handled in catchError
          },
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
    if (this.dynamicForm?.registrationForm) {
      this.dynamicForm.registrationForm.reset();

      Object.keys(this.dynamicForm.registrationForm.controls).forEach((key) => {
        this.dynamicForm.registrationForm.get(key)?.setErrors(null);
      });
    }
    this.otpVerificationForm.reset();
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get error message for form field
   * Note: This method is kept for backward compatibility but may not be used with dynamic forms
   */
  getErrorMessage(controlName: string): string {
    const control = this.dynamicForm?.registrationForm?.get(controlName);

    if (!control) return '';

    if (control.hasError('required')) {
      return `${this.getFieldLabel(controlName)} is required`;
    }
    if (control.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control.hasError('pattern')) {
      return this.getPatternErrorMessage(controlName);
    }
    if (control.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} must be at least ${requiredLength} characters`;
    }
    if (control.hasError('passwordMismatch')) {
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
      confirmPassword: 'Confirm Password',
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
      password:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    };
    return messages[controlName] || 'Invalid format';
  }
}
