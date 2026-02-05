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
    this.startBannerRotation();
    this.animateStatistics();
    this.subscription = this.settings$.subscribe((settings) => {
      this.settings = settings;
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
    if (!this.banners.length) return;

    setInterval(() => {
      this.activeBanner = (this.activeBanner + 1) % this.banners.length;
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
}
