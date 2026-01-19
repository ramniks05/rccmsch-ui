import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SystemSettingsService, SystemSettings } from '../../core/services/system-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * System Settings Component
 * Admin page to manage header and footer settings
 */
@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  currentSettings: SystemSettings | null = null;

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
   * Initialize the form with all fields
   */
  initializeForm(): void {
    this.settingsForm = this.fb.group({
      logoUrl: [''],
      logoHeader: ['', Validators.required],
      logoSubheader: ['', Validators.required],
      stateName: [''],
      footerText: [''],
      footerCopyright: [''],
      footerAddress: [''],
      footerEmail: ['', Validators.email],
      footerPhone: [''],
      footerWebsite: ['']
    });
  }

  /**
   * Load current settings from service
   */
  loadCurrentSettings(): void {
    this.loading = true;
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.currentSettings = settings;
        if (settings) {
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
            footerWebsite: settings.footerWebsite || ''
          });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.loading = false;
        this.snackBar.open('Failed to load settings', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      this.snackBar.open('Please login as admin to save settings', 'Close', { duration: 5000 });
      return;
    }

    this.saving = true;
    const formValue = this.settingsForm.value;
    const settings: SystemSettings = {
      id: this.currentSettings?.id,
      logoUrl: formValue.logoUrl || null,
      logoHeader: formValue.logoHeader || null,
      logoSubheader: formValue.logoSubheader || null,
      stateName: formValue.stateName || null,
      footerText: formValue.footerText || null,
      footerCopyright: formValue.footerCopyright || null,
      footerAddress: formValue.footerAddress || null,
      footerEmail: formValue.footerEmail || null,
      footerPhone: formValue.footerPhone || null,
      footerWebsite: formValue.footerWebsite || null
    };

    this.settingsService.updateSettings(settings).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Settings saved successfully!', 'Close', { duration: 3000 });
          this.currentSettings = response.data;
          // Refresh settings across the app
          this.settingsService.refreshSettings();
        } else {
          this.snackBar.open('Failed to save settings', 'Close', { duration: 3000 });
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        let errorMessage = 'Error saving settings. Please try again.';
        
        if (error.status === 403) {
          errorMessage = 'Access denied. Please ensure you are logged in as admin.';
        } else if (error.status === 401) {
          errorMessage = 'Session expired. Please login again.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.saving = false;
      }
    });
  }

  /**
   * Reset form to current settings
   */
  resetForm(): void {
    if (this.currentSettings) {
      this.settingsForm.patchValue({
        logoUrl: this.currentSettings.logoUrl || '',
        logoHeader: this.currentSettings.logoHeader || '',
        logoSubheader: this.currentSettings.logoSubheader || '',
        stateName: this.currentSettings.stateName || '',
        footerText: this.currentSettings.footerText || '',
        footerCopyright: this.currentSettings.footerCopyright || '',
        footerAddress: this.currentSettings.footerAddress || '',
        footerEmail: this.currentSettings.footerEmail || '',
        footerPhone: this.currentSettings.footerPhone || '',
        footerWebsite: this.currentSettings.footerWebsite || ''
      });
    }
  }
}

