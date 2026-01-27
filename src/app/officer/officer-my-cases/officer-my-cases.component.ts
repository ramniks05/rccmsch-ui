import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OfficerCaseService, CaseDTO } from '../services/officer-case.service';

@Component({
  selector: 'app-officer-my-cases',
  templateUrl: './officer-my-cases.component.html',
  styleUrls: ['./officer-my-cases.component.scss']
})
export class OfficerMyCasesComponent implements OnInit {
  displayedColumns: string[] = [
    'caseNumber',
    'applicantName',
    'subject',
    'currentStateName',
    'priority',
    'applicationDate',
    'actions'
  ];

  dataSource = new MatTableDataSource<CaseDTO>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = false;
  error: string | null = null;
  filterStatus: string | null = null;
  searchTerm: string = '';

  // Priority order for sorting
  priorityOrder: { [key: string]: number } = {
    'URGENT': 4,
    'HIGH': 3,
    'MEDIUM': 2,
    'LOW': 1
  };

  constructor(
    private caseService: OfficerCaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCases();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Custom sort for priority
    this.dataSource.sortingDataAccessor = (item, property) => {
      if (property === 'priority') {
        return this.priorityOrder[item.priority] || 0;
      }
      return (item as any)[property];
    };
  }

  /**
   * Load cases assigned to current officer
   */
  loadCases(): void {
    this.loading = true;
    this.error = null;

    this.caseService.getMyCases().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          // Sort by application date (newest first)
          const sortedCases = [...response.data].sort((a, b) => 
            new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
          );
          this.dataSource.data = sortedCases;
        } else {
          this.error = response.message || 'Failed to load cases';
          this.dataSource.data = [];
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to load cases';
        this.dataSource.data = [];
        this.snackBar.open(this.error ?? 'Failed to load cases', 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * View case details
   */
  viewCase(caseId: number): void {
    this.router.navigate(['/officer/cases', caseId]);
  }

  /**
   * Apply status filter
   */
  filterByStatus(status: string | null): void {
    this.filterStatus = status;
    this.applyFilters();
  }

  /**
   * Apply search filter
   */
  applySearch(): void {
    this.applyFilters();
  }

  /**
   * Apply all filters
   */
  private applyFilters(): void {
    let filteredData = this.dataSource.data;

    // Status filter
    if (this.filterStatus) {
      filteredData = filteredData.filter(c => 
        c.status === this.filterStatus || c.currentStateCode === this.filterStatus
      );
    }

    // Search filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      filteredData = filteredData.filter(c =>
        c.caseNumber.toLowerCase().includes(search) ||
        c.applicantName.toLowerCase().includes(search) ||
        (c.subject && c.subject.toLowerCase().includes(search))
      );
    }

    // Create new data source with filtered data
    this.dataSource = new MatTableDataSource(filteredData);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterStatus = null;
    this.searchTerm = '';
    this.loadCases();
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('completed')) {
      return 'status-approved';
    } else if (statusLower.includes('rejected')) {
      return 'status-rejected';
    } else if (statusLower.includes('returned') || statusLower.includes('correction')) {
      return 'status-returned';
    } else if (statusLower.includes('pending') || statusLower.includes('submitted')) {
      return 'status-pending';
    }
    return 'status-default';
  }

  /**
   * Get priority badge class
   */
  getPriorityClass(priority: string): string {
    const priorityLower = priority.toLowerCase();
    return `priority-${priorityLower}`;
  }

  /**
   * Refresh cases list
   */
  refresh(): void {
    this.loadCases();
  }
}
