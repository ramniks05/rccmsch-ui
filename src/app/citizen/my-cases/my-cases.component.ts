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
  displayedColumns: string[] = ['caseNumber', 'subject', 'status', 'priority', 'createdAt', 'actions'];
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
    // Use new API endpoint - no need to pass userId as it's extracted from token/header
    this.caseService.getCitizenCases().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.cases = response.data || [];
          // Sort by application date (newest first)
          this.cases.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.applicationDate || 0).getTime();
            const dateB = new Date(b.createdAt || b.applicationDate || 0).getTime();
            return dateB - dateA;
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
}
