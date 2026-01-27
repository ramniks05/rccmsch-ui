import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';

/**
 * Admin Login Component
 * Handles admin authentication
 */
@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private router: Router,
    private authService: AuthService
  ) {
    // Check if already logged in
    if (this.adminService.isAdminAuthenticated()) {
      this.router.navigate(['/admin/home']);
    }

    this.loginForm = this.fb.group({
      username: ['admin', [Validators.required]],
      password: ['admin@123', [Validators.required]]
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { username, password } = this.loginForm.value;

      this.adminService.adminLogin(username, password)
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.handleLoginError(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            this.handleLoginSuccess(response);
          },
          error: (error) => {
            // Error already handled in catchError
            this.isLoading = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  /**
   * Handle successful login
   */
  private handleLoginSuccess(response: any): void {
    console.log('Admin login successful:', response);

    // Handle API response structure { success, message, data }
    const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
    const responseData = apiResponse.success ? apiResponse.data : response;

    const token = responseData?.token;
    const refreshToken = responseData?.refreshToken;

    if (token) {
      // Store admin authentication data
      localStorage.setItem('adminToken', token);

      if (refreshToken) {
        localStorage.setItem('adminRefreshToken', refreshToken);
      }

      // Store admin user data
      const adminData = {
        userId: responseData?.userId,
        email: responseData?.email || 'admin@gmail.com',
        mobileNumber: responseData?.mobileNumber
      };
      this.authService.sendData(adminData);
      localStorage.setItem('adminUserData', JSON.stringify(adminData));
      this.successMessage = apiResponse.message || 'Login successful! Redirecting...';

      // Redirect to admin dashboard
      setTimeout(() => {
        this.router.navigate(['/admin/home']);
      }, 1500);
    } else {
      this.errorMessage = 'Invalid response from server. Please try again.';
    }
  }

  /**
   * Handle login errors
   */
  private handleLoginError(error: any): void {
    console.error('Admin login error:', error);

    if (error.error) {
      if (error.error.message) {
        this.errorMessage = error.error.message;
      } else if (error.error.error) {
        this.errorMessage = error.error.error;
      } else {
        this.errorMessage = 'Login failed. Please check your credentials and try again.';
      }
    } else if (error.status === 0) {
      this.errorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.status === 401) {
      this.errorMessage = 'Invalid username or password. Please try again.';
    } else {
      this.errorMessage = 'An error occurred during login. Please try again later.';
    }

    // Clear error message after 5 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
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
   * Navigate back to home
   */
  goToHome(): void {
    this.router.navigate(['/home']);
  }
}

