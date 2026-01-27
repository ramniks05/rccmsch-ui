import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../admin/admin.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-officer-reset-password',
  templateUrl: './officer-reset-password.component.html',
  styleUrls: ['./officer-reset-password.component.scss']
})
export class OfficerResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  userid: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {
    this.resetForm = this.fb.group({
      userid: ['', [Validators.required, Validators.pattern('^[A-Z_]+@[A-Z0-9_]+$')]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(100),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Get userid from query params (set from login error)
    this.route.queryParams.subscribe(params => {
      if (params['userid']) {
        this.userid = params['userid'];
        this.resetForm.patchValue({ userid: this.userid });
      }
    });
  }

  /**
   * Password strength validator
   */
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return { passwordStrength: true };
    }

    return null;
  }

  /**
   * Password match validator for form group
   */
  private passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;

    if (password && confirm && password !== confirm) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  /**
   * Submit handler
   */
  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.markFormGroupTouched(this.resetForm);
      return;
    }

    const userid = this.resetForm.get('userid')?.value;
    const newPassword = this.resetForm.get('newPassword')?.value;
    const confirmPassword = this.resetForm.get('confirmPassword')?.value;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminService.resetPassword(userid, newPassword, confirmPassword)
      .pipe(
        catchError(error => {
          this.isLoading = false;
          this.handleResetError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.handleResetSuccess(response, userid);
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private handleResetSuccess(response: any, userid: string): void {
    const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
    if (apiResponse.success) {
      this.successMessage = apiResponse.message || 'Password reset successfully. Redirecting to login...';
      // Redirect back to login with pre-filled userid on Operator tab
      setTimeout(() => {
        this.router.navigate(['/home'], {
          queryParams: { userid, userType: 'OFFICER' }
        });
      }, 2000);
    } else {
      this.errorMessage = 'Password reset failed. Please try again.';
    }
  }

  private handleResetError(error: any): void {
    console.error('Officer reset password error:', error);

    if (error.error) {
      if (error.error.errors && Array.isArray(error.error.errors) && error.error.errors.length > 0) {
        this.errorMessage = error.error.errors[0].message || 'Validation failed';
      } else if (error.error.message) {
        this.errorMessage = error.error.message;
      } else {
        this.errorMessage = 'Failed to reset password. Please try again.';
      }
    } else {
      this.errorMessage = 'An error occurred. Please try again.';
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
}


