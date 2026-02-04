import { Component, OnInit } from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate,
  stagger,
  query,
} from '@angular/animations';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { DASHBOARD_DATA } from '../../../assets/mock-dashboard-data';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    // Fade in animation
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '500ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),

    // Card pop animation
    trigger('cardPop', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate(
          '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'scale(1)' }),
        ),
      ]),
    ]),

    // Stagger animation for multiple items
    trigger('staggerIn', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(30px)' }),
            stagger(100, [
              animate(
                '500ms ease-out',
                style({ opacity: 1, transform: 'translateY(0)' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),

    // Slide in animation
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateX(0)' }),
        ),
      ]),
    ]),
  ],
})
export class DashboardComponent implements OnInit {
  // User role
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN' = 'ADMIN';
  currentDate = new Date();

  // Data from mock
  districts = DASHBOARD_DATA.districts;
  officers = DASHBOARD_DATA.officers;
  courts = DASHBOARD_DATA.courts;

  // Search and filter
  searchTerm = '';
  displayedColumns = ['officer', 'pending', 'status', 'actions'];

  // Chart period
  trendPeriod = '6m';

  // KPI Metrics with computed values
  kpiMetrics = [
    {
      label: 'Total Cases',
      value: 12854,
      icon: 'folder_open',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      trend: 5.2,
      progress: 85,
    },
    {
      label: 'Disposed',
      value: 9342,
      icon: 'check_circle',
      color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      trend: 8.4,
      progress: 73,
    },
    {
      label: 'Pending',
      value: 3512,
      icon: 'hourglass_empty',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      trend: -3.1,
      progress: 27,
    },
    {
      label: 'Active Courts',
      value: 62,
      icon: 'account_balance',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      trend: 2.0,
      progress: 95,
    },
  ];

  // Computed properties (Object-Oriented approach)
  get disposalRate(): number {
    const total = this.kpiMetrics[0].value;
    const disposed = this.kpiMetrics[1].value;
    return Math.round((disposed / total) * 100);
  }

  get avgResolutionDays(): number {
    return 45; // This would be computed from real data
  }

  get agingPercentage(): number {
    const total = DASHBOARD_DATA.aging.data.reduce((a, b) => a + b, 0);
    const underSixMonths =
      DASHBOARD_DATA.aging.data[0] + DASHBOARD_DATA.aging.data[1];
    return Math.round((underSixMonths / total) * 100);
  }

  get filteredOfficers() {
    return this.officers.filter((officer) =>
      officer.name.toLowerCase().includes(this.searchTerm.toLowerCase()),
    );
  }

  // ===== DISTRICT BAR CHART =====
  districtChart: ChartConfiguration<'bar'>['data'] = {
    labels: this.districts.map((d) => d.name),
    datasets: [
      {
        label: 'Cases',
        data: this.districts.map((d) => d.cases),
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(102, 126, 234, 1)',
      },
    ],
  };

  // ===== COURT PERFORMANCE CHART =====
  courtChart: ChartConfiguration<'bar'>['data'] = {
    labels: this.courts.map((c) => c.court),
    datasets: [
      {
        label: 'Cases Disposed',
        data: this.courts.map((c) => c.disposed),
        backgroundColor: 'rgba(17, 153, 142, 0.8)',
        borderColor: 'rgba(17, 153, 142, 1)',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(17, 153, 142, 1)',
      },
    ],
  };

  // ===== CASE AGING DONUT CHART =====
  agingChart: ChartConfiguration<'doughnut'>['data'] = {
    labels: DASHBOARD_DATA.aging.labels,
    datasets: [
      {
        data: DASHBOARD_DATA.aging.data,
        backgroundColor: [
          'rgba(17, 153, 142, 0.8)',
          'rgba(79, 172, 254, 0.8)',
          'rgba(240, 147, 251, 0.8)',
          'rgba(245, 87, 108, 0.8)',
        ],
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 15,
      },
    ],
  };

  // ===== MONTHLY TREND LINE CHART =====
  trendChart: ChartConfiguration<'line'>['data'] = {
    labels: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    datasets: [
      {
        label: 'New Cases',
        data: [420, 380, 450, 490, 520, 480, 510, 470, 490, 530, 510, 540],
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
      },
      {
        label: 'Disposed Cases',
        data: [380, 410, 420, 460, 490, 510, 480, 500, 510, 520, 540, 560],
        borderColor: 'rgba(17, 153, 142, 1)',
        backgroundColor: 'rgba(17, 153, 142, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgba(17, 153, 142, 1)',
      },
    ],
  };

  // ===== CHART OPTIONS (FIXED FOR CHART.JS 4.x) =====
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 11 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
        },
      },
    },
  };

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  ngOnInit(): void {
    // Initialize component
    this.animateNumbers();
  }

  // Method to update trend chart based on selected period
  updateTrendChart(): void {
    // This would fetch different data based on the period
    console.log('Updating trend chart for period:', this.trendPeriod);
  }

  // Animate numbers on load (nice touch!)
  private animateNumbers(): void {
    // This would use a library like CountUp.js or custom animation
    // to animate the KPI numbers from 0 to their target values
  }
}
