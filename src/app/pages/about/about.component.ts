import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  QueryList,
  ViewChildren,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';

export interface StatItem {
  value: string;
  label: string;
  icon: string;
}

export interface MissionPillar {
  icon: string;
  title: string;
  description: string;
  color: string;
}

export interface LeaderCard {
  name: string;
  designation: string;
  initials: string;
  accentColor: string;
}

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements OnInit, AfterViewInit {
  @ViewChildren('animateOnScroll') animatedEls!: QueryList<ElementRef>;

  readonly stats: StatItem[] = [
    { value: '1,200+', label: 'Cases Registered', icon: 'folder' },
    { value: '38', label: 'Revenue Courts', icon: 'building' },
    { value: '95%', label: 'Digital Adoption', icon: 'chart' },
    { value: '2019', label: 'Year Established', icon: 'calendar' },
  ];

  readonly pillars: MissionPillar[] = [
    {
      icon: 'transparency',
      title: 'Transparency',
      description:
        'Every case filing, hearing date, and order is publicly accessible in real time, eliminating opacity from revenue dispute resolution.',
      color: '#1a5cb8',
    },
    {
      icon: 'speed',
      title: 'Efficiency',
      description:
        'Automated workflows, digital notices, and e-filing reduce case lifecycle from months to weeks across all revenue courts of Chandigarh.',
      color: '#e8560a',
    },
    {
      icon: 'access',
      title: 'Accessibility',
      description:
        'Citizens can track their cases, download orders, and receive hearing alerts without visiting the court — available 24 × 7.',
      color: '#0d8a4e',
    },
    {
      icon: 'accountability',
      title: 'Accountability',
      description:
        'Built-in audit trails and performance dashboards ensure every judicial action is timestamped, attributable, and reviewable.',
      color: '#7b2d8b',
    },
  ];

  readonly leaders: LeaderCard[] = [
    {
      name: 'Sh. Anindita Mitra, IAS',
      designation: 'Administrator, UT Chandigarh',
      initials: 'AM',
      accentColor: '#1a5cb8',
    },
    {
      name: 'Sh. Vinay Pratap Singh, IAS',
      designation: 'Adviser to the Administrator',
      initials: 'VP',
      accentColor: '#e8560a',
    },
    {
      name: 'District & Sessions Judge',
      designation: 'Chandigarh District Court',
      initials: 'DJ',
      accentColor: '#0d8a4e',
    },
  ];

  readonly timeline: TimelineEvent[] = [
    {
      year: '2019',
      title: 'Project Inception',
      description:
        'UT Administration, Chandigarh mandated digitisation of all revenue court proceedings under the Digital India initiative.',
    },
    {
      year: '2021',
      title: 'Pilot Launch',
      description:
        'RCCMS went live in two revenue courts with e-filing, cause-list generation and real-time order publishing.',
    },
    {
      year: '2022',
      title: 'Full Rollout',
      description:
        'All 38 revenue courts of Chandigarh migrated to RCCMS. Legacy case data digitised and indexed.',
    },
    {
      year: '2024',
      title: 'Mobile & API Layer',
      description:
        'Citizen-facing mobile app and open REST APIs enabled third-party integration with law-firm portals.',
    },
    {
      year: '2026',
      title: 'Generic Software Launch',
      description:
        'RCCMS Generic Software made available for adoption by other Union Territories and State governments.',
    },
  ];

  private observer!: IntersectionObserver;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    this.animatedEls.forEach((el) => {
      this.observer.observe(el.nativeElement);
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  scrollToVision() {
    document.getElementById('vision')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  goToLogin() {
    this.router.navigate(['home/login']);
  }

  goToRegistration() {
    this.router.navigate(['registration']);
  }

}
