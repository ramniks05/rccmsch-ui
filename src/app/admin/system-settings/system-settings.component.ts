import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  SystemSettingsService,
  SystemSettings,
} from '../../core/services/system-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss'],
})
export class SystemSettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  currentSettings: SystemSettings | null = null;

  // Panel expansion states
  panelStates = {
    header: true,
    website: false,
    footer: false
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private settingsService: SystemSettingsService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentSettings();
  }

  /**
   * Initialize the form
   */
  initializeForm(): void {
    this.settingsForm = this.fb.group({
      logoUrl: [''],
      logoHeader: ['', Validators.required],
      logoSubheader: ['', Validators.required],
      stateName: [''],

      secondaryLogoUrl: [''],
      secondaryLogoHeader: [''],
      secondaryLogoSubheader: [''],

      tertiaryLogoUrl: [''],
      tertiaryLogoHeader: [''],
      tertiaryLogoSubheader: [''],

      marqueeText: [''],

      footerText: [''],
      footerCopyright: [''],
      footerAddress: [''],
      footerEmail: ['', Validators.email],
      footerPhone: [''],
      footerWebsite: [''],

      banners: this.fb.array([])
    });
  }

  // ---------- BANNERS ----------
  get banners(): FormArray {
    return this.settingsForm.get('banners') as FormArray;
  }

  private createBannerGroup(data?: any): FormGroup {
    return this.fb.group({
      url: [data?.url || '', Validators.required],
      header: [data?.header || '', Validators.required],
      subHeader: [data?.subHeader || '']
    });
  }

  addBanner(): void {
    this.banners.push(this.createBannerGroup());
    // Auto-expand website panel when adding banner
    this.panelStates.website = true;
  }

  removeBanner(index: number): void {
    if (this.banners.length > 0) {
      this.banners.removeAt(index);
      this.snackBar.open('Banner removed', 'Close', { duration: 2000 });
    }
  }

  /**
   * Load current settings
   */
  loadCurrentSettings(): void {
    this.loading = true;

    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.currentSettings = settings;

        if (settings) {
          // --------- PATCH NORMAL FIELDS ----------
          this.settingsForm.patchValue({
            logoUrl: settings.logoUrl || '',
            logoHeader: settings.logoHeader || '',
            logoSubheader: settings.logoSubheader || '',
            stateName: settings.stateName || '',
            footerText: settings.footerText || '',
            footerCopyright: settings.footerCopyright || '',
            footerAddress: settings.footerAddress || '',
            footerEmail: settings.footerEmail || '',
            footerPhone: settings.footerPhone || '',
            footerWebsite: settings.footerWebsite || '',
            secondaryLogoUrl: settings.secondaryLogoUrl || '',
            secondaryLogoHeader: settings.secondaryLogoHeader || '',
            secondaryLogoSubheader: settings.secondaryLogoSubheader || '',
            tertiaryLogoUrl: settings.tertiaryLogoUrl || '',
            tertiaryLogoHeader: settings.tertiaryLogoHeader || '',
            tertiaryLogoSubheader: settings.tertiaryLogoSubheader || '',
            marqueeText: settings.marqueeText || '',
          });

          // --------- PATCH BANNERS ----------
          this.banners.clear();

          if (Array.isArray(settings.banners) && settings.banners.length) {
            settings.banners.forEach(banner => {
              this.banners.push(this.createBannerGroup(banner));
            });
          }
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.loading = false;
        this.snackBar.open('Failed to load settings', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      },
    });
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched(this.settingsForm);
      this.snackBar.open('Please fill in all required fields correctly', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });

      // Expand panel with errors
      this.expandPanelWithErrors();
      return;
    }

    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      this.snackBar.open('Please login as admin to save settings', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.saving = true;

    const formValue = this.settingsForm.value;

    const settings: SystemSettings = {
      id: this.currentSettings?.id,
      ...formValue,
      banners: formValue.banners
    };

    this.settingsService.updateSettings(settings).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Settings saved successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.currentSettings = response.data;
          this.settingsService.refreshSettings();
        } else {
          this.snackBar.open('Failed to save settings', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.snackBar.open('Error saving settings', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.saving = false;
      },
    });
  }

  /**
   * Reset form
   */
  resetForm(): void {
    if (!this.currentSettings) {
      this.snackBar.open('No settings to reset', 'Close', { duration: 2000 });
      return;
    }

    this.settingsForm.reset();
    this.banners.clear();
    this.loadCurrentSettings();

    this.snackBar.open('Form reset to saved values', 'Close', { duration: 2000 });
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Expand the panel that contains validation errors
   */
  private expandPanelWithErrors(): void {
    const headerControls = ['logoHeader', 'logoSubheader'];
    const footerControls = ['footerEmail'];

    // Check header errors
    if (headerControls.some(control => this.settingsForm.get(control)?.invalid)) {
      this.panelStates.header = true;
      return;
    }

    // Check banner errors
    if (this.banners.invalid) {
      this.panelStates.website = true;
      return;
    }

    // Check footer errors
    if (footerControls.some(control => this.settingsForm.get(control)?.invalid)) {
      this.panelStates.footer = true;
      return;
    }
  }

  goToAdvancedSettings() {
    this.router.navigate(["/admin/advanced-system-settings"])
  }
}
