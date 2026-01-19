import { Component, OnInit, OnDestroy } from '@angular/core';
import { SystemSettingsService, SystemSettings } from '../../../core/services/system-settings.service';
import { Observable, Subscription } from 'rxjs';

/**
 * Header Component
 * Top navigation bar with dynamic logo, header, subheader, and state name from API
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  settings$: Observable<SystemSettings | null>;
  settings: SystemSettings | null = null;
  private subscription?: Subscription;

  constructor(private settingsService: SystemSettingsService) {
    this.settings$ = this.settingsService.getSettings();
  }

  ngOnInit(): void {
    this.subscription = this.settings$.subscribe(settings => {
      this.settings = settings;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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

