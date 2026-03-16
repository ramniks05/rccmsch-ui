import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { CitizenCaseService, Case } from '../services/citizen-case.service';

@Component({
  selector: 'app-my-cases',
  templateUrl: './my-cases.component.html',
  styleUrls: ['./my-cases.component.scss']
})
export class MyCasesComponent implements OnInit {
  displayedColumns: string[] = ['caseNumber', 'subject', 'status', 'actionRequired', 'priority', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Case>([]);
  
  cases: Case[] = [];
  isLoading = false;
  userData: any = null;

  constructor(
    private caseService: CitizenCaseService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.userData = this.authService.getUserData();
    if (this.userData?.userId) {
      this.loadCases();
    } else {
      this.snackBar.open('User data not found. Please login again.', 'Close', { duration: 5000 });
      this.router.navigate(['/home']);
    }
  }

  loadCases(): void {
    this.isLoading = true;
    this.caseService.getCitizenCases().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.cases = response.data || [];
          // Last in, first out: newest application on top
          this.cases.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.applicationDate || '').getTime();
            const dateB = new Date(b.createdAt || b.applicationDate || '').getTime();
            return dateB - dateA; // descending = newest first
          });
          this.dataSource.data = this.cases;
        } else {
          this.snackBar.open(response.message || 'Failed to load cases', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load cases';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'RETURNED_FOR_CORRECTION') {
      return 'badge-warning';
    } else if (status.includes('COMPLETED') || status.includes('APPROVED')) {
      return 'badge-success';
    } else if (status.includes('REJECTED') || status.includes('CANCELLED')) {
      return 'badge-danger';
    }
    return 'badge-info';
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  viewCaseDetails(caseItem: Case): void {
    this.router.navigate(['/citizen/cases', caseItem.id]);
  }

  editAndResubmit(caseItem: Case): void {
    if (caseItem.status === 'RETURNED_FOR_CORRECTION') {
      this.router.navigate(['/citizen/cases', caseItem.id, 'resubmit']);
    }
  }

  canResubmit(status: string): boolean {
    return status === 'RETURNED_FOR_CORRECTION';
  }

  /** True if this case needs citizen action (e.g. resubmit, acknowledge notice) */
  needsAction(caseItem: Case): boolean {
    const s = (caseItem.status || '').toUpperCase();
    const code = ((caseItem as any).currentStateCode || '').toUpperCase();
    return (
      s === 'RETURNED_FOR_CORRECTION' ||
      code === 'RETURNED_FOR_CORRECTION' ||
      s === 'NOTICE_ISSUED' ||
      code === 'NOTICE_ISSUED'
    );
  }

  /** Short label for the type of action required */
  getActionRequiredLabel(caseItem: Case): string {
    const s = (caseItem.status || '').toUpperCase();
    const code = ((caseItem as any).currentStateCode || '').toUpperCase();
    if (s === 'RETURNED_FOR_CORRECTION' || code === 'RETURNED_FOR_CORRECTION') return 'Correction required';
    if (s === 'NOTICE_ISSUED' || code === 'NOTICE_ISSUED') return 'Acknowledge notice';
    return 'Action required';
  }
}
