import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AdminService } from '../../admin/admin.service';

/**
 * Login Component
 * Handles login for both Citizens and Operators
 * Supports both OTP and Username/Password authentication
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  selectedTab = 0; // 0 = Citizen, 1 = Officer, 2 = Lawyer
  loginMethod = 'mobile'; // 'mobile' or 'password'

  mobileLoginForm: FormGroup;
  passwordLoginForm: FormGroup;

  captchaText = '';
  passwordCaptchaText = '';
  captchaId = ''; // Store CAPTCHA ID for verification
  passwordCaptchaId = '';
  showOtpFieldForMobile = true;
  showCaptchaField = true;
  otpSent = false;
  isSendingOtp = false;
  isLoggingIn = false;
  isPasswordLoggingIn = false;
  otpErrorMessage = '';
  otpSuccessMessage = '';
  loginErrorMessage = '';
  loginSuccessMessage = '';
  passwordLoginErrorMessage = '';
  passwordLoginSuccessMessage = '';
  otpCode: string | null = null; // Store OTP for development display
  private lastOfficerUserId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private adminService: AdminService,
  ) {
    // Mobile Login Form with OTP and CAPTCHA
    this.mobileLoginForm = this.fb.group({
      mobile: ['9538532764', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      otp: [''],
      captcha: ['', [Validators.required]],
    });

    // Password Login Form (Citizen: Mobile/Email & Password, Operator: UserID & Password)
    this.passwordLoginForm = this.fb.group({
      username: ['', [Validators.required, this.mobileOrEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      captcha: ['', [Validators.required]],
    });

    // Set initial CAPTCHA validator for password login based on selected tab (Citizen/Operator)
    this.updatePasswordCaptchaValidator();

    // Generate initial CAPTCHAs using API
    this.refreshCaptcha();
    this.refreshPasswordCaptcha();
  }

  /**
   * Switch between Citizen, Officer, and Lawyer tabs
   */
  onTabChange(index: number): void {
    this.selectedTab = index;
    // Citizens and Lawyers can use both login methods; Officers use only password (UserID & Password)
    this.loginMethod = (this.selectedTab === 0 || this.selectedTab === 2) ? 'mobile' : 'password';
    this.otpSent = false;
    this.otpErrorMessage = '';
    this.otpSuccessMessage = '';
    this.otpCode = null;
    this.resetForms();

    // Update password CAPTCHA validator when switching between user types
    this.updatePasswordCaptchaValidator();
  }

  /**
   * Switch between Mobile and Password login methods
   */
  onLoginMethodChange(method: string): void {
    this.loginMethod = method;
    if (method === 'mobile') {
      this.showOtpFieldForMobile = true;
      this.showCaptchaField = true;
      this.otpSent = false;
      this.otpCode = null;
      this.mobileLoginForm.patchValue({ otp: '', captcha: '' });
      this.mobileLoginForm.get('otp')?.clearValidators();
      this.mobileLoginForm.get('otp')?.updateValueAndValidity();
      this.refreshCaptcha();
    } else if (method === 'password') {
      this.passwordLoginForm.patchValue({ captcha: '' });
      // Only refresh CAPTCHA for citizen password login
      if (this.selectedTab === 0) {
        this.refreshPasswordCaptcha();
      }
      // Update CAPTCHA validators based on user type
      this.updatePasswordCaptchaValidator();
    }
  }

  /**
   * Update CAPTCHA validator for password login form based on selected tab
   * - Citizen: CAPTCHA required
   * - Operator (Officer): CAPTCHA not required
   */
  private updatePasswordCaptchaValidator(): void {
    const captchaControl = this.passwordLoginForm.get('captcha');
    if (!captchaControl) {
      return;
    }

    if (this.selectedTab === 0) {
      // Citizen - require CAPTCHA
      captchaControl.setValidators([Validators.required]);
    } else {
      // Operator - no CAPTCHA required
      captchaControl.clearValidators();
      captchaControl.setValue('');
    }
    captchaControl.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Custom validator for mobile number or email
   */
  mobileOrEmailValidator = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    const value = control.value.trim();

    // Officer UserID pattern: ROLE_CODE@COURT_CODE (e.g., SDC@DC_COURT_IMPHAL_EAST)
    const officerUserIdPattern = /^[A-Z_]+@[A-Z0-9_]+$/;
    if (officerUserIdPattern.test(value)) {
      return null;
    }

    // Check if it's a valid 10-digit mobile number
    const mobilePattern = /^[6-9]\d{9}$/;
    if (mobilePattern.test(value)) {
      return null;
    }

    // Check if it's a valid email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(value)) {
      return null;
    }

    // If neither mobile nor email, return error
    return { invalid: true };
  };

  /**
   * Generate and refresh CAPTCHA for mobile login using API
   */
  refreshCaptcha(): void {
    this.apiService
      .generateCaptcha()
      .pipe(
        catchError((error) => {
          console.error('Failed to generate CAPTCHA:', error);
          // Fallback to client-side generation if API fails
          this.generateCaptchaFallback(true);
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
          const captchaData = apiResponse.success ? apiResponse.data : response;

          if (captchaData?.captchaId && captchaData?.captchaText) {
            this.captchaId = captchaData.captchaId;
            this.captchaText = captchaData.captchaText;
            // Clear captcha input when refreshed
            if (this.showCaptchaField) {
              this.mobileLoginForm.patchValue({ captcha: this.captchaText });
            }
          } else {
            // Fallback if response format is unexpected
            this.generateCaptchaFallback(true);
          }
        },
        error: (error) => {
          // Error already handled in catchError with fallback
        },
      });
  }

  /**
   * Generate and refresh CAPTCHA for password login using API
   */
  refreshPasswordCaptcha(): void {
    this.apiService
      .generateCaptcha()
      .pipe(
        catchError((error) => {
          console.error('Failed to generate CAPTCHA:', error);
          // Fallback to client-side generation if API fails
          this.generateCaptchaFallback(false);
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
          const captchaData = apiResponse.success ? apiResponse.data : response;

          if (captchaData?.captchaId && captchaData?.captchaText) {
            this.passwordCaptchaId = captchaData.captchaId;
            this.passwordCaptchaText = captchaData.captchaText;
            // Clear captcha input when refreshed
            this.passwordLoginForm.patchValue({ captcha: '' });
          } else {
            // Fallback if response format is unexpected
            this.generateCaptchaFallback(false);
          }
        },
        error: (error) => {
          // Error already handled in catchError with fallback
        },
      });
  }

  /**
   * Fallback method to generate CAPTCHA client-side if API fails
   */
  private generateCaptchaFallback(isMobile: boolean): void {
    // Generate a random 6-character CAPTCHA
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Generate UUID for CAPTCHA ID
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );

    if (isMobile) {
      this.captchaText = result;
      this.captchaId = uuid;
      if (this.showCaptchaField) {
        this.mobileLoginForm.patchValue({ captcha: '' });
      }
    } else {
      this.passwordCaptchaText = result;
      this.passwordCaptchaId = uuid;
      this.passwordLoginForm.patchValue({ captcha: '' });
    }
  }

  /**
   * Send OTP button click handler
   */
  onSendOtp(): void {
    if (this.mobileLoginForm.get('mobile')?.valid) {
      const mobileNumber = this.mobileLoginForm.get('mobile')?.value;

      this.isSendingOtp = true;
      this.otpErrorMessage = '';
      this.otpSuccessMessage = '';

      // Use appropriate API based on user type
      let otpObservable;
      if (this.selectedTab === 2) {
        // Lawyer
        otpObservable = this.apiService.sendLawyerOTP(mobileNumber);
      } else {
        // Citizen or Officer
        const citizenType = this.selectedTab === 0 ? 'CITIZEN' : 'OPERATOR';
        otpObservable = this.apiService.sendOTP(mobileNumber, citizenType);
      }

      otpObservable
        .pipe(
          catchError((error) => {
            this.isSendingOtp = false;
            this.handleOtpError(error);
            return throwError(() => error);
          }),
        )
        .subscribe({
          next: (response) => {
            this.isSendingOtp = false;
            this.handleOtpSuccess(response, mobileNumber);
          },
          error: (error) => {
            // Error already handled in catchError
            this.isSendingOtp = false;
          },
        });
    } else {
      this.mobileLoginForm.get('mobile')?.markAsTouched();
    }
  }

  /**
   * Handle successful OTP sending
   */
  private handleOtpSuccess(response: any, mobileNumber: string): void {
    console.log('OTP sent successfully:', response);

    // Handle new API response structure { success, message, data }
    const apiResponse = response?.success
      ? response
      : { success: true, data: response };

    if (apiResponse.success) {
      this.otpSent = true;
      const otpCode = apiResponse.data?.otpCode;
      const message =
        apiResponse.message ||
        `OTP has been sent to your mobile number: ${mobileNumber}`;

      // Store OTP code for development display
      this.otpCode = otpCode || null;

      // Show OTP code in console for testing (as per API documentation)
      if (otpCode) {
        console.log('OTP Code (for testing):', otpCode);
      }

      this.otpSuccessMessage = message;

      // Enable OTP field validation
      this.mobileLoginForm
        .get('otp')
        ?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
      this.mobileLoginForm.get('otp')?.updateValueAndValidity();

      // Clear OTP and CAPTCHA fields
      this.mobileLoginForm.patchValue({ otp: otpCode, captcha: '' });
      this.refreshCaptcha();

      // Clear success message after 5 seconds
      setTimeout(() => {
        this.otpSuccessMessage = '';
      }, 5000);
    }
  }

  /**
   * Handle OTP sending errors
   */
  private handleOtpError(error: any): void {
    console.error('Send OTP error:', error);

    if (error.error) {
      if (error.error.message) {
        this.otpErrorMessage = error.error.message;
      } else if (error.error.error) {
        this.otpErrorMessage = error.error.error;
      } else {
        this.otpErrorMessage = 'Failed to send OTP. Please try again.';
      }
    } else if (error.status === 0) {
      this.otpErrorMessage =
        'Unable to connect to server. Please check your connection.';
    } else if (error.status === 404) {
      this.otpErrorMessage =
        'Mobile number not registered. Please register first.';
    } else if (error.status === 429) {
      this.otpErrorMessage =
        'Too many OTP requests. Please wait before requesting again.';
    } else if (error.status === 400) {
      this.otpErrorMessage = 'Invalid mobile number or user type.';
    } else {
      this.otpErrorMessage = 'Failed to send OTP. Please try again later.';
    }

    // Clear error message after 5 seconds
    setTimeout(() => {
      this.otpErrorMessage = '';
    }, 5000);
  }

  /**
   * Handle Mobile Login with OTP and CAPTCHA
   */
  onMobileLogin(): void {
    if (this.mobileLoginForm.valid) {
      // Basic validation
      const captchaValue = this.mobileLoginForm
        .get('captcha')
        ?.value?.toUpperCase();
      if (!captchaValue || captchaValue.length !== this.captchaText.length) {
        this.mobileLoginForm.get('captcha')?.setErrors({ invalid: true });
        this.loginErrorMessage = 'Please enter the CAPTCHA value.';
        setTimeout(() => {
          this.loginErrorMessage = '';
        }, 3000);
        return;
      }

      if (!this.otpSent) {
        this.loginErrorMessage = 'Please send OTP first.';
        setTimeout(() => {
          this.loginErrorMessage = '';
        }, 3000);
        return;
      }

      if (!this.captchaId) {
        this.loginErrorMessage = 'CAPTCHA not loaded. Please refresh the page.';
        this.refreshCaptcha();
        setTimeout(() => {
          this.loginErrorMessage = '';
        }, 3000);
        return;
      }

      const mobileNumber = this.mobileLoginForm.get('mobile')?.value;
      const otp = this.mobileLoginForm.get('otp')?.value;
      const captcha = this.mobileLoginForm.get('captcha')?.value?.toUpperCase();
      // Determine user type: 0 = Citizen, 1 = Officer, 2 = Lawyer
      const userType = this.selectedTab === 0 ? 'CITIZEN' : (this.selectedTab === 2 ? 'LAWYER' : 'OPERATOR');

      this.isLoggingIn = true;
      this.loginErrorMessage = '';
      this.loginSuccessMessage = '';

      // Validate CAPTCHA first (optional pre-validation)
      this.validateCaptchaAndLogin(
        mobileNumber,
        otp || '',
        captcha,
        this.captchaId,
        userType,
        true,
      );
    } else {
      this.markFormGroupTouched(this.mobileLoginForm);
    }
  }

  /**
   * Validate CAPTCHA and proceed with login
   */
  private validateCaptchaAndLogin(
    identifier: string, // mobileNumber for mobile login, username for password login
    credential: string, // otp for mobile login, password for password login
    captcha: string,
    captchaId: string,
    citizenType: string,
    isMobileLogin: boolean,
  ): void {
    // Optional: Pre-validate CAPTCHA before login
    // Note: CAPTCHA is also validated on server during login, but this provides early feedback
    this.apiService
      .validateCaptcha(captchaId, captcha)
      .pipe(
        catchError((error) => {
          // If validation API fails, proceed with login anyway (server will validate)
          console.warn(
            'CAPTCHA validation API failed, proceeding with login:',
            error,
          );
          this.proceedWithLogin(
            identifier,
            credential,
            captcha,
            captchaId,
            citizenType,
            isMobileLogin,
          );
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
          const isValid =
            apiResponse.data?.valid !== false && apiResponse.valid !== false;

          if (
            isValid === false ||
            apiResponse.data?.valid === false ||
            apiResponse.valid === false
          ) {
            if (isMobileLogin) {
              this.isLoggingIn = false;
              this.loginErrorMessage = 'Invalid CAPTCHA. Please try again.';
              this.mobileLoginForm.get('captcha')?.setErrors({ invalid: true });
              this.refreshCaptcha();
              setTimeout(() => {
                this.loginErrorMessage = '';
              }, 3000);
            } else {
              this.isPasswordLoggingIn = false;
              this.passwordLoginErrorMessage =
                'Invalid CAPTCHA. Please try again.';
              this.passwordLoginForm
                .get('captcha')
                ?.setErrors({ invalid: true });
              this.refreshPasswordCaptcha();
              setTimeout(() => {
                this.passwordLoginErrorMessage = '';
              }, 3000);
            }
          } else {
            // CAPTCHA is valid, proceed with login
            this.proceedWithLogin(
              identifier,
              credential,
              captcha,
              captchaId,
              citizenType,
              isMobileLogin,
            );
          }
        },
        error: (error) => {
          // Proceed with login even if validation API fails (server will validate)
          this.proceedWithLogin(
            identifier,
            credential,
            captcha,
            captchaId,
            citizenType,
            isMobileLogin,
          );
        },
      });
  }

  /**
   * Proceed with actual login after CAPTCHA validation
   */
  private proceedWithLogin(
    identifier: string, // mobileNumber for mobile login, username for password login
    credential: string, // otp for mobile login, password for password login
    captcha: string,
    captchaId: string,
    userType: string,
    isMobileLogin: boolean,
  ): void {
    if (isMobileLogin) {
      // Mobile login with OTP
      let loginObservable;
      if (userType === 'LAWYER') {
        loginObservable = this.apiService.lawyerOTPLogin(identifier, credential, captcha, captchaId);
      } else {
        loginObservable = this.apiService.verifyOTP(identifier, credential, captcha, captchaId, userType);
      }

      loginObservable
        .pipe(
          catchError((error) => {
            this.isLoggingIn = false;
            this.handleLoginError(error);
            return throwError(() => error);
          }),
        )
        .subscribe({
          next: (response) => {
            this.isLoggingIn = false;
            this.handleLoginSuccess(response);
          },
          error: (error) => {
            // Error already handled in catchError
            this.isLoggingIn = false;
          },
        });
    } else {
      // Password login
      let loginObservable;
      if (userType === 'LAWYER') {
        loginObservable = this.apiService.lawyerPasswordLogin(identifier, credential, captcha, captchaId);
      } else {
        loginObservable = this.apiService.passwordLogin(identifier, credential, captcha, captchaId, userType);
      }

      loginObservable
        .pipe(
          catchError((error) => {
            this.isPasswordLoggingIn = false;
            this.handlePasswordLoginError(error);
            return throwError(() => error);
          }),
        )
        .subscribe({
          next: (response) => {
            this.isPasswordLoggingIn = false;
            this.handlePasswordLoginSuccess(response);
          },
          error: (error) => {
            // Error already handled in catchError
            this.isPasswordLoggingIn = false;
          },
        });
    }
  }

  /**
   * Handle successful login
   */
  private handleLoginSuccess(response: any): void {
    console.log('Login successful:', response);

    // Handle new API response structure { success, message, data }
    const apiResponse =
      response?.success !== undefined
        ? response
        : { success: true, data: response };
    const responseData = apiResponse.success ? apiResponse.data : response;

    // Extract token and user data from response
    const token = responseData?.token;
    const refreshToken = responseData?.refreshToken;
    const citizenType = responseData?.citizenType || 'CITIZEN';
    const userData = {
      userId: responseData?.userId,
      userType: citizenType, // Keep userType for backward compatibility
      citizenType: citizenType,
      email: responseData?.email,
      mobileNumber: responseData?.mobileNumber,
      firstName: responseData?.firstName,
      lastName: responseData?.lastName,
      name: responseData?.name,
      expiresIn: responseData?.expiresIn,
    };

    if (token) {
      // Store authentication data
      this.authService.setAuthData(token, refreshToken || '', userData);
      this.authService.sendData(userData);
      this.loginSuccessMessage =
        apiResponse.message || 'Login successful! Redirecting...';

      // Redirect based on user type
      setTimeout(() => {
        if (citizenType === 'CITIZEN' || this.selectedTab === 0) {
          this.router.navigate(['/citizen/home']);
        } else if (citizenType === 'LAWYER' || this.selectedTab === 2) {
          this.router.navigate(['/lawyer/home']);
        } else {
          // For operators, redirect to operator dashboard
          this.router.navigate(['/officer/home']);
        }
      }, 1500);
    } else {
      this.loginErrorMessage =
        'Invalid response from server. Please try again.';
      setTimeout(() => {
        this.loginErrorMessage = '';
      }, 5000);
    }
  }

  /**
   * Handle login errors
   */
  private handleLoginError(error: any): void {
    console.error('Login error:', error);

    if (error.error) {
      if (error.error.message) {
        this.loginErrorMessage = error.error.message;
      } else if (error.error.error) {
        this.loginErrorMessage = error.error.error;
      } else {
        this.loginErrorMessage =
          'Login failed. Please check your credentials and try again.';
      }
    } else if (error.status === 0) {
      this.loginErrorMessage =
        'Unable to connect to server. Please check your connection.';
    } else if (error.status === 401) {
      this.loginErrorMessage = 'Invalid OTP or CAPTCHA. Please try again.';
      // Clear OTP field and refresh CAPTCHA
      this.mobileLoginForm.patchValue({ otp: '', captcha: '' });
      this.refreshCaptcha();
    } else if (error.status === 400) {
      this.loginErrorMessage =
        'Invalid data. Please check all fields and try again.';
    } else if (error.status === 404) {
      this.loginErrorMessage = 'User not found. Please register first.';
    } else {
      this.loginErrorMessage =
        'An error occurred during login. Please try again later.';
    }

    // Clear error message after 5 seconds
    setTimeout(() => {
      this.loginErrorMessage = '';
    }, 5000);
  }

  /**
   * Handle Password Login
   */
  onPasswordLogin(): void {
    if (this.passwordLoginForm.valid) {
      const username = this.passwordLoginForm.get('username')?.value;
      const password = this.passwordLoginForm.get('password')?.value;

      // Citizen or Lawyer password login (Mobile/Email & Password with CAPTCHA)
      if (this.selectedTab === 0 || this.selectedTab === 2) {
        // Basic CAPTCHA validation
        const captchaValue = this.passwordLoginForm
          .get('captcha')
          ?.value?.toUpperCase();
        if (
          !captchaValue ||
          captchaValue.length !== this.passwordCaptchaText.length
        ) {
          this.passwordLoginForm.get('captcha')?.setErrors({ invalid: true });
          this.passwordLoginErrorMessage = 'Please enter the CAPTCHA value.';
          setTimeout(() => {
            this.passwordLoginErrorMessage = '';
          }, 3000);
          return;
        }

        if (!this.passwordCaptchaId) {
          this.passwordLoginErrorMessage =
            'CAPTCHA not loaded. Please refresh the page.';
          this.refreshPasswordCaptcha();
          setTimeout(() => {
            this.passwordLoginErrorMessage = '';
          }, 3000);
          return;
        }

        const captcha = this.passwordLoginForm
          .get('captcha')
          ?.value?.toUpperCase();
        const userType = this.selectedTab === 0 ? 'CITIZEN' : 'LAWYER';

        this.isPasswordLoggingIn = true;
        this.passwordLoginErrorMessage = '';
        this.passwordLoginSuccessMessage = '';

        // Validate CAPTCHA first (optional pre-validation) then proceed with login
        this.validateCaptchaAndLogin(
          username,
          password,
          captcha,
          this.passwordCaptchaId,
          userType,
          false,
        );
      } else {
        // Operator (Officer) login: UserID & Password via officer-login API (no CAPTCHA required)
        this.isPasswordLoggingIn = true;
        this.passwordLoginErrorMessage = '';
        this.passwordLoginSuccessMessage = '';

        // Store last officer UserID for redirect to reset password if needed
        this.lastOfficerUserId = username;

        this.adminService
          .officerLogin(username, password)
          .pipe(
            catchError((error) => {
              this.isPasswordLoggingIn = false;
              this.handleOfficerLoginError(error);
              return throwError(() => error);
            }),
          )
          .subscribe({
            next: (response) => {
              this.isPasswordLoggingIn = false;
              this.handleOfficerLoginSuccess(response);
            },
            error: () => {
              // Error already handled in catchError
              this.isPasswordLoggingIn = false;
            },
          });
      }
    } else {
      this.markFormGroupTouched(this.passwordLoginForm);
    }
  }

  /**
   * Handle successful password login
   */
  private handlePasswordLoginSuccess(response: any): void {
    console.log('Password login successful:', response);

    // Handle new API response structure { success, message, data }
    const apiResponse =
      response?.success !== undefined
        ? response
        : { success: true, data: response };
    const responseData = apiResponse.success ? apiResponse.data : response;

    // Extract token and user data from response (same as mobile login)
    const token = responseData?.token;
    const refreshToken = responseData?.refreshToken;
    const citizenType = responseData?.citizenType || 'CITIZEN';
    const userData = {
      userId: responseData?.userId,
      userType: citizenType, // Keep userType for backward compatibility
      citizenType: citizenType,
      email: responseData?.email,
      mobileNumber: responseData?.mobileNumber,
      firstName: responseData?.firstName,
      lastName: responseData?.lastName,
      name: responseData?.name,
      expiresIn: responseData?.expiresIn,
    };

    if (token) {
      // Store authentication data
      this.authService.setAuthData(token, refreshToken || '', userData);
      this.authService.sendData(userData);
      this.passwordLoginSuccessMessage =
        apiResponse.message || 'Login successful! Redirecting...';

      // Redirect based on user type
      setTimeout(() => {
        if (citizenType === 'CITIZEN' || this.selectedTab === 0) {
          this.router.navigate(['/citizen/home']);
        } else if (citizenType === 'LAWYER' || this.selectedTab === 2) {
          this.router.navigate(['/lawyer/home']);
        } else {
          // For operators, redirect to operator dashboard
          this.router.navigate(['/officer/home']);
        }
      }, 1500);
    } else {
      this.passwordLoginErrorMessage =
        'Invalid response from server. Please try again.';
      setTimeout(() => {
        this.passwordLoginErrorMessage = '';
      }, 5000);
    }
  }

  /**
   * Handle successful officer (operator) login
   */
  private handleOfficerLoginSuccess(response: any): void {
    console.log('Officer login successful:', response);

    // Handle API response structure { success, message, data }
    const apiResponse =
      response?.success !== undefined
        ? response
        : { success: true, data: response };
    const responseData = apiResponse.success ? apiResponse.data : response;

    const token = responseData?.token;
    const refreshToken = responseData?.refreshToken;

    if (token) {
      // Store officer (admin-side) authentication data
      localStorage.setItem('adminToken', token);
      if (refreshToken) {
        localStorage.setItem('adminRefreshToken', refreshToken);
      }

      // Store complete officer data including posting information
      const adminData = {
        userId: responseData?.userId,
        email: responseData?.email,
        mobileNumber: responseData?.mobileNumber,
        posting: responseData?.posting || null,
      };
      localStorage.setItem('adminUserData', JSON.stringify(adminData));
      this.authService.sendData(adminData);

      this.passwordLoginSuccessMessage =
        apiResponse.message || 'Login successful! Redirecting...';

      // Redirect to officer dashboard
      setTimeout(() => {
        this.router.navigate(['/officer/home']);
      }, 1500);
    } else {
      this.passwordLoginErrorMessage =
        'Invalid response from server. Please try again.';
      setTimeout(() => {
        this.passwordLoginErrorMessage = '';
      }, 5000);
    }
  }

  /**
   * Handle officer (operator) login errors
   */
  private handleOfficerLoginError(error: any): void {
    console.error('Officer login error:', error);

    if (error.error) {
      if (error.error.message) {
        // If password reset is required, redirect to officer reset password page
        if (error.error.message.includes('Password reset required')) {
          const userid =
            this.lastOfficerUserId ||
            this.passwordLoginForm.get('username')?.value;
          if (userid) {
            this.router.navigate(['/officer/reset-password'], {
              queryParams: { userid },
            });
          }
          this.passwordLoginErrorMessage =
            'Password reset required. Redirecting to reset password page...';
        } else {
          this.passwordLoginErrorMessage = error.error.message;
        }
      } else if (error.error.error) {
        this.passwordLoginErrorMessage = error.error.error;
      } else {
        this.passwordLoginErrorMessage =
          'Login failed. Please check your UserID and password.';
      }
    } else if (error.status === 0) {
      this.passwordLoginErrorMessage =
        'Unable to connect to server. Please check your connection.';
    } else if (error.status === 401) {
      this.passwordLoginErrorMessage =
        error.error?.message || 'Invalid UserID or password. Please try again.';
    } else {
      this.passwordLoginErrorMessage =
        'An error occurred during login. Please try again later.';
    }

    // Clear error message after 5 seconds
    setTimeout(() => {
      this.passwordLoginErrorMessage = '';
    }, 5000);
  }

  /**
   * Handle password login errors
   */
  private handlePasswordLoginError(error: any): void {
    console.error('Password login error:', error);

    if (error.error) {
      if (error.error.message) {
        this.passwordLoginErrorMessage = error.error.message;
      } else if (error.error.error) {
        this.passwordLoginErrorMessage = error.error.error;
      } else {
        this.passwordLoginErrorMessage =
          'Login failed. Please check your credentials and try again.';
      }
    } else if (error.status === 0) {
      this.passwordLoginErrorMessage =
        'Unable to connect to server. Please check your connection.';
    } else if (error.status === 401) {
      this.passwordLoginErrorMessage =
        'Invalid username, password, or CAPTCHA. Please try again.';
      // Clear password and CAPTCHA fields, refresh CAPTCHA
      this.passwordLoginForm.patchValue({ password: '', captcha: '' });
      this.refreshPasswordCaptcha();
    } else if (error.status === 400) {
      this.passwordLoginErrorMessage =
        'Invalid data. Please check all fields and try again.';
    } else if (error.status === 403) {
      this.passwordLoginErrorMessage =
        'Account not active or not verified. Please contact support.';
    } else if (error.status === 404) {
      this.passwordLoginErrorMessage = 'User not found. Please register first.';
    } else {
      this.passwordLoginErrorMessage =
        'An error occurred during login. Please try again later.';
    }

    // Clear error message after 5 seconds
    setTimeout(() => {
      this.passwordLoginErrorMessage = '';
    }, 5000);
  }

  /**
   * Reset all forms
   */
  private resetForms(): void {
    this.mobileLoginForm.reset();
    this.passwordLoginForm.reset();
    this.showOtpFieldForMobile = true;
    this.showCaptchaField = true;
    this.otpSent = false;
    this.isSendingOtp = false;
    this.isLoggingIn = false;
    this.isPasswordLoggingIn = false;
    this.otpErrorMessage = '';
    this.otpSuccessMessage = '';
    this.loginErrorMessage = '';
    this.loginSuccessMessage = '';
    this.passwordLoginErrorMessage = '';
    this.passwordLoginSuccessMessage = '';
    this.mobileLoginForm.get('otp')?.clearValidators();
    this.mobileLoginForm.get('otp')?.updateValueAndValidity();
    this.refreshCaptcha();
    this.refreshPasswordCaptcha();
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
}
