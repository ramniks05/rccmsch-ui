import { Component, OnInit } from '@angular/core';
import { HomeData, Service, WhatsNewItem } from 'src/assets/home-model';
import { HOME_DATA, WHATS_NEW_DATA } from '../../../assets/mock-home-data';
import { Router } from '@angular/router';
import {
  SystemSettings,
  SystemSettingsService,
} from 'src/app/core/services/system-settings.service';
import { Observable, Subscription } from 'rxjs';
import { AdvancedSettingsService } from 'src/app/core/services/advanced-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

interface StatCard {
  title: string;
  value: string;
  icon: string;
  trend: {
    value: string;
    direction: 'positive' | 'negative' | 'neutral';
  };
  detail: string;
  colorClass:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info';
}

interface MiniStat {
  label: string;
  value: string;
  color: string;
}

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
  whatsNewList: any[] = [];
  documentsList: any[] = [];

  // Main statistics cards
  statsCards: StatCard[] = [
    {
      title: 'Total Users',
      value: '26.14 M',
      icon: 'fa-users',
      trend: { value: '12.5% increase', direction: 'positive' },
      detail: 'Last updated: Today',
      colorClass: 'primary',
    },
    {
      title: 'Courts On Boarded',
      value: '3,073',
      icon: 'fa-building',
      trend: { value: '243 this month', direction: 'positive' },
      detail: '98% coverage',
      colorClass: 'secondary',
    },
    {
      title: 'Total Cases',
      value: '27.39 M',
      icon: 'fa-gavel',
      trend: { value: '8.3% growth', direction: 'positive' },
      detail: 'All time cases',
      colorClass: 'info',
    },
    {
      title: 'Pending Cases',
      value: '1.25 M',
      icon: 'fa-hourglass-half',
      trend: { value: '5.2% decrease', direction: 'negative' },
      detail: 'Requires attention',
      colorClass: 'warning',
    },
    {
      title: 'Decided Cases',
      value: '0.21 M',
      icon: 'fa-check-circle',
      trend: { value: '18.7% increase', direction: 'positive' },
      detail: 'This quarter',
      colorClass: 'success',
    },
    {
      title: 'Cause List',
      value: '0.06 M',
      icon: 'fa-list-alt',
      trend: { value: 'Stable', direction: 'neutral' },
      detail: 'Scheduled hearings',
      colorClass: 'danger',
    },
  ];

  // Left sidebar mini stats
  healthMetrics: MiniStat[] = [
    { label: 'Active Courts', value: '3,073', color: 'var(--primary)' },
    { label: 'Cases Resolved', value: '210K', color: 'var(--success)' },
    {
      label: 'Avg. Resolution Time',
      value: '45 Days',
      color: 'var(--warning)',
    },
  ];

  keyMetrics: MiniStat[] = [
    { label: 'Success Rate', value: '94.3%', color: 'var(--info)' },
    { label: 'User Satisfaction', value: '4.7/5', color: 'var(--secondary)' },
    { label: 'Critical Cases', value: '1,234', color: 'var(--danger)' },
  ];

  // Progress ring values
  progressPercentage: number = 75;
  progressStrokeDasharray: number = 440;
  progressStrokeDashoffset: number = 440;

  constructor(
    private router: Router,
    private settingsService: SystemSettingsService,
    private service: AdvancedSettingsService,
    private snack: MatSnackBar,
  ) {
    this.settings$ = this.settingsService.getSettings();
  }

  ngOnInit(): void {
    this.setThemeColor();
    this.animateStatistics();
    this.animateProgressRing();
    this.subscription = this.settings$.subscribe((settings) => {
      this.settings = settings;
      // Start banner rotation after settings are loaded
      if (settings?.banners) {
        this.startBannerRotation();
      }
    });
    this.getWhatsNewData();
    this.getDocumentsAvailableList();
  }

  getWhatsNewData(): void {
    // this.whatsNewList = WHATS_NEW_DATA;
    this.service.getAllWhatsNew().subscribe({
      next: (res) => {
        this.whatsNewList = res.data ?? [];
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.snack.open('Failed to load announcements', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  getDocumentsAvailableList(): void {
    this.service.getAllDocumentsAvailable().subscribe({
      next: (res) => {
        this.documentsList = res?.data ?? [];
      },
      error: () => {
        this.snack.open('Failed to load documents', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  getFileUrl(path: string): string {
    if (!path) return '#';

    // If already full URL
    if (path.startsWith('http')) {
      return path;
    }

    return `${environment.apiUrl}${path}`;
  }

  isPdf(path: string): boolean {
    return path?.toLowerCase().endsWith('.pdf');
  }

  getFileType(path: string): string {
    if (!path) return '';
    const ext = path.split('.').pop();
    return ext?.toUpperCase() || '';
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
      this.activeBanner =
        (this.activeBanner + 1) % this.settings!.banners.length;
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
    return !!(
      this.settings &&
      this.settings.banners &&
      this.settings.banners.length > 0
    );
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

  animateProgressRing(): void {
    setTimeout(() => {
      const circumference = 2 * Math.PI * 70;
      const offset =
        circumference - (this.progressPercentage / 100) * circumference;
      this.progressStrokeDashoffset = offset;
    }, 500);
  }

  getTrendIcon(direction: string): string {
    switch (direction) {
      case 'positive':
        return 'fa-arrow-up';
      case 'negative':
        return 'fa-arrow-down';
      default:
        return 'fa-minus';
    }
  }

  viewDetails(cardTitle: string): void {
    console.log(`Viewing details for: ${cardTitle}`);
    // Implement your navigation or modal logic here
    // Example: this.router.navigate(['/details', cardTitle]);
  }

  navigateToUpdates(): void {
    console.log('Navigate to all updates');
    // Implement navigation logic
    // Example: this.router.navigate(['/updates']);
  }

  navigateToCauseLists(): void {
    console.log('Navigate to cause lists');
    // Implement navigation logic
  }

  navigateToHearings(): void {
    console.log('Navigate to hearings');
    // Implement navigation logic
  }
}
