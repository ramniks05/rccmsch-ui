import { Component, OnInit } from '@angular/core';
import { HomeData, Service, WhatsNewItem } from 'src/assets/home-model';
import { HOME_DATA, WHATS_NEW_DATA } from '../../../assets/mock-home-data';
import { Router } from '@angular/router';
import {
  SystemSettings,
  SystemSettingsService,
} from 'src/app/core/services/system-settings.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss'],
})
export class IndexComponent implements OnInit {
  settings$: Observable<SystemSettings | null>;
  settings: SystemSettings | null = null;
  private subscription?: Subscription;
  data: HomeData = HOME_DATA;
  banners = this.data.banners ?? [];
  highlights = this.data.highlights ?? [];
  services: Service[] = this.data.services ?? [];
  menu = this.data.menu ?? [];
  marqueeText = this.data.marqueeText ?? '';
  animatedStatistics: number[] = [];
  activeBanner = 0;
  whatsNewList: WhatsNewItem[] = [];

  constructor(
    private router: Router,
    private settingsService: SystemSettingsService,
  ) {
    this.settings$ = this.settingsService.getSettings();
  }

  ngOnInit(): void {
    this.setThemeColor();
    this.animateStatistics();
    this.subscription = this.settings$.subscribe((settings) => {
      this.settings = settings;
      // Start banner rotation after settings are loaded
      if (settings?.banners) {
        this.startBannerRotation();
      }
    });
    this.whatsNewList = WHATS_NEW_DATA;
  }

  toggle(index: number): void {
    this.services = this.services.map((service, i) => ({
      ...service,
      open: i === index ? !service.open : false,
    }));
  }

  private startBannerRotation(): void {
    // Only start rotation if there are multiple banners
    if (!this.settings?.banners || this.settings.banners.length <= 1) {
      return;
    }

    setInterval(() => {
      this.activeBanner = (this.activeBanner + 1) % this.settings!.banners.length;
    }, 5000);
  }

  private setThemeColor(): void {
    document.documentElement.style.setProperty(
      '--primary-color',
      this.data.stateConfig?.primaryColor ?? '#007bff',
    );
  }

  private animateStatistics(): void {
    if (!this.data.statistics?.length) return;

    this.data.statistics.forEach((stat, index) => {
      let current = 0;
      const step = Math.ceil(stat.value / 60);

      const interval = setInterval(() => {
        current += step;
        if (current >= stat.value) {
          current = stat.value;
          clearInterval(interval);
        }
        this.animatedStatistics[index] = current;
      }, 20);
    });
  }

  goToLogin() {
    this.router.navigate(['home/login']);
  }

  goToRegistration() {
    this.router.navigate(['registration']);
  }

  /**
   * Check if banners are available
   */
  hasBanners(): boolean {
    return !!(this.settings && this.settings.banners && this.settings.banners.length > 0);
  }

  /**
   * Get fallback banner text
   */
  getFallbackBannerText(): string {
    if (this.settings && this.settings.stateName) {
      return `Government of ${this.settings.stateName}`;
    }
    return 'Digital Court Management Platform';
  }
}
