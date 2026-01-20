import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  SystemSettingsService,
  SystemSettings,
} from '../../../core/services/system-settings.service';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from 'src/app/admin/admin.service';

/**
 * Header Component
 * Top navigation bar with dynamic logo, header, subheader, and state name from API
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  settings$: Observable<SystemSettings | null>;
  settings: SystemSettings | null = null;
  private subscription?: Subscription;
  userData: any = null;
  newCode$ = this.authService.user$;

  constructor(
    private settingsService: SystemSettingsService,
    private authService: AuthService,
    private location: Location,
    private router: Router,
    private adminService: AdminService,
  ) {
    this.settings$ = this.settingsService.getSettings();
  }

  ngOnInit(): void {
    this.subscription = this.settings$.subscribe((settings) => {
      this.settings = settings;
    });
    this.authService.user$.subscribe((user) => {
      this.userData = user;
    });
  }

  goBack() {
    this.location.back();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  goToProfile() {
    this.router.navigate(["/citizen/my-profile"])
  }

  logout() {
    this.authService.sendData(null);
    this.authService.logout();
    this.adminService.logout();
    this.router.navigate(['/home']);
  }

  /**
   * Handle image loading error by hiding the image
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }
}
