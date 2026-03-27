import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  OfficerCaseService,
  CaseDTO,
  OfficerActionType,
} from '../services/officer-case.service';

@Component({
  selector: 'app-officer-my-cases',
  templateUrl: './officer-my-cases.component.html',
  styleUrls: ['./officer-my-cases.component.scss'],
})
export class OfficerMyCasesComponent implements OnInit {
  displayedColumns: string[] = [
    'caseNumber',
    'applicantName',
    'subject',
    'currentStateName',
    'priority',
    'applicationDate',
    'actions',
  ];

  dataSource = new MatTableDataSource<CaseDTO>([]);
  /** Keep original unfiltered cases for filtering */
  private originalData: CaseDTO[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = false;
  error: string | null = null;
  filterStatus: string | null = null;
  filterSubject: string | null = null;
  searchTerm: string = '';
  /** Action types for filter dropdown (from API) */
  actionTypes: OfficerActionType[] = [];
  selectedActionCode: string | null = null;
  /** Unique statuses extracted from loaded cases */
  availableStatuses: { code: string; name: string }[] = [];
  /** Unique subjects extracted from loaded cases */
  availableSubjects: string[] = [];

  // Priority order for sorting
  priorityOrder: { [key: string]: number } = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  constructor(
    private caseService: OfficerCaseService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadActionTypes();
    this.loadCases();
  }

  loadActionTypes(): void {
    this.caseService.getMyCasesActionTypes().subscribe({
      next: (res) => {
        console.log('Action types response:', res);
        if (res.success && res.data && res.data.length > 0) {
          this.actionTypes = res.data;
          console.log('Loaded action types:', this.actionTypes);
        } else {
          console.warn('No action types returned from API', res.data);
          this.actionTypes = [];
        }
      },
      error: (err) => {
        console.error('Error loading action types:', err);
        this.actionTypes = [];
        this.snackBar.open('Failed to load action types', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Custom sorting accessor
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'priority':
          return this.priorityOrder[item.priority] || 0;

        case 'applicationDate':
          return new Date(item.applicationDate).getTime();

        case 'caseNumber':
          return item.caseNumber?.toLowerCase();

        case 'applicantName':
          return item.applicantName?.toLowerCase();

        case 'subject':
          return item.subject?.toLowerCase();

        case 'currentStateName':
          return (
            item.currentStateName ||
            item.statusName ||
            item.status
          )?.toLowerCase();

        default:
          return (item as any)[property];
      }
    };
  }

  /**
   * Load cases assigned to current officer
   */
  loadCases(): void {
    this.loading = true;
    this.error = null;

    this.caseService
      .getMyCases(this.selectedActionCode ?? undefined)
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            // Sort by application date (newest first)
            const sortedCases = [...response.data].sort(
              (a, b) =>
                new Date(b.applicationDate).getTime() -
                new Date(a.applicationDate).getTime(),
            );
            // Store original unfiltered data
            this.originalData = sortedCases;
            this.applyFilters();
            setTimeout(() => {
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
            });
            // Extract unique statuses from loaded cases
            this.extractAvailableStatuses(sortedCases);
            // Extract unique subjects from loaded cases
            this.extractAvailableSubjects(sortedCases);
          } else {
            this.error = response.message || 'Failed to load cases';
            this.dataSource.data = [];
            this.originalData = [];
            this.availableStatuses = [];
            this.availableSubjects = [];
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load cases';
          this.dataSource.data = [];
          this.originalData = [];
          this.availableStatuses = [];
          this.availableSubjects = [];
          this.snackBar.open(this.error ?? 'Failed to load cases', 'Close', {
            duration: 5000,
          });
        },
      });
  }

  /**
   * Extract unique statuses from loaded cases
   */
  private extractAvailableStatuses(cases: CaseDTO[]): void {
    const statusMap = new Map<string, string>();

    cases.forEach((caseItem) => {
      // Prefer currentStateCode/currentStateName if available
      const code = caseItem.currentStateCode || caseItem.status;
      const name =
        caseItem.currentStateName || caseItem.statusName || caseItem.status;
      if (code && !statusMap.has(code)) {
        statusMap.set(code, name);
      }
    });

    // Convert map to array and sort by name
    this.availableStatuses = Array.from(statusMap, ([code, name]) => ({
      code,
      name,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Extract unique subjects from loaded cases
   */
  private extractAvailableSubjects(cases: CaseDTO[]): void {
    const subjectSet = new Set<string>();

    cases.forEach((caseItem) => {
      if (caseItem.subject && caseItem.subject.trim()) {
        subjectSet.add(caseItem.subject);
      }
    });

    // Convert set to sorted array
    this.availableSubjects = Array.from(subjectSet).sort();
  }

  /**
   * View case details
   */
  viewCase(caseId: number): void {
    this.router.navigate(['/officer/cases', caseId]);
  }

  /**
   * Filter by action (transition). Reloads from server.
   */
  filterByAction(code: string | null): void {
    this.selectedActionCode = code;
    this.loadCases();
  }

  /**
   * Apply status filter
   */
  filterByStatus(status: string | null): void {
    this.filterStatus = status;
    this.applyFilters();
  }

  /**
   * Apply subject filter
   */
  filterBySubject(subject: string | null): void {
    this.filterSubject = subject;
    this.applyFilters();
  }

  /**
   * Apply search filter on keystroke
   */
  applySearch(): void {
    this.applyFilters();
  }

  /**
   * Apply all filters
   */
  private applyFilters(): void {
    let filteredData = [...this.originalData];

    // Status Filter
    if (this.filterStatus) {
      const statusLower = this.filterStatus.toLowerCase();

      filteredData = filteredData.filter(
        (c) =>
          (c.currentStateCode &&
            c.currentStateCode.toLowerCase() === statusLower) ||
          (c.status && c.status.toLowerCase() === statusLower),
      );
    }

    // Subject Filter
    if (this.filterSubject) {
      filteredData = filteredData.filter(
        (c) => c.subject === this.filterSubject,
      );
    }

    // GLOBAL SEARCH (ALL COLUMNS)
    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase();

      filteredData = filteredData.filter((row) => {
        return Object.values(row).some((value) => {
          if (value === null || value === undefined) return false;

          return value.toString().toLowerCase().includes(term);
        });
      });
    }

    // Assign filtered data
    this.dataSource.data = filteredData;

    // Reconnect paginator & sort
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Reset to first page
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterStatus = null;
    this.filterSubject = null;
    this.searchTerm = '';
    this.selectedActionCode = null;
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
    } else if (
      statusLower.includes('returned') ||
      statusLower.includes('correction')
    ) {
      return 'status-returned';
    } else if (
      statusLower.includes('pending') ||
      statusLower.includes('submitted')
    ) {
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
