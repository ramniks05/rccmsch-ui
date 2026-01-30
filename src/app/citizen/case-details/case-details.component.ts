import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitizenCaseService, Case, CaseHistory } from '../services/citizen-case.service';

@Component({
  selector: 'app-case-details',
  templateUrl: './case-details.component.html',
  styleUrls: ['./case-details.component.scss']
})
export class CaseDetailsComponent implements OnInit {
  caseId!: number;
  case: Case | null = null;
  history: CaseHistory[] = [];
  isLoading = false;
  isLoadingHistory = false;
  returnComment = '';
  
  // Notice related properties
  notice: any = null;
  isLoadingNotice = false;
  isAcceptingNotice = false;
  noticeNotAvailable = false;
  acknowledgeComments = 'Notice received and acknowledged';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CitizenCaseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.caseId = +params['id'];
      if (this.caseId) {
        this.loadCaseDetails();
        this.loadCaseHistory();
        this.loadNotice();
      }
    });
  }

  loadCaseDetails(): void {
    this.isLoading = true;
    this.caseService.getCaseById(this.caseId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.case = response.data;
        } else {
          this.snackBar.open(response.message || 'Failed to load case details', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load case details';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  loadCaseHistory(): void {
    this.isLoadingHistory = true;
    this.caseService.getCaseHistory(this.caseId).subscribe({
      next: (response) => {
        this.isLoadingHistory = false;
        if (response.success) {
          this.history = response.data || [];
          // Find return for correction comment
          const returned = this.history
            .filter(h => h.toState?.stateCode === 'RETURNED_FOR_CORRECTION')
            .slice(-1)[0];
          if (returned?.comments) {
            this.returnComment = returned.comments;
          }
        }
      },
      error: (error) => {
        this.isLoadingHistory = false;
        console.error('Error loading case history:', error);
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

  canResubmit(): boolean {
    return this.case?.status === 'RETURNED_FOR_CORRECTION';
  }

  navigateToResubmit(): void {
    if (this.caseId) {
      this.router.navigate(['/citizen/cases', this.caseId, 'resubmit']);
    }
  }

  parseCaseData(caseData?: string): any {
    if (!caseData) return null;
    try {
      return JSON.parse(caseData);
    } catch (e) {
      return null;
    }
  }

  /**
   * Load notice sent to applicant
   */
  loadNotice(): void {
    this.isLoadingNotice = true;
    this.noticeNotAvailable = false;
    
    this.caseService.getNoticeForApplicant(this.caseId, 'NOTICE').subscribe({
      next: (response) => {
        this.isLoadingNotice = false;
        if (response.success && response.data) {
          this.notice = response.data;
        }
      },
      error: (error: any) => {
        this.isLoadingNotice = false;
        // 404 is expected if notice hasn't been sent yet
        if (error.status === 404 || error.notFound) {
          this.noticeNotAvailable = true;
        } else {
          console.error('Error loading notice:', error);
        }
      }
    });
  }

  /**
   * Accept/Acknowledge notice receipt
   */
  acknowledgeNotice(): void {
    if (!confirm('Acknowledge that you have received and reviewed this notice?')) {
      return;
    }

    this.isAcceptingNotice = true;
    
    this.caseService.acceptNotice(this.caseId, 'NOTICE', this.acknowledgeComments).subscribe({
      next: (response) => {
        this.isAcceptingNotice = false;
        if (response.success) {
          this.snackBar.open('Notice acknowledged successfully. This has been recorded in case history.', 'Close', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          // Reload history to show the acknowledgment
          this.loadCaseHistory();
          // Reload notice to update status
          this.loadNotice();
        } else {
          this.snackBar.open(response.message || 'Failed to acknowledge notice', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isAcceptingNotice = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to acknowledge notice';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Check if notice can be acknowledged (not yet acknowledged)
   */
  canAcknowledgeNotice(): boolean {
    // Check if there's already an acknowledgment in history
    const hasAcknowledgment = this.history.some(h => 
      h.performedByRole === 'CITIZEN' && 
      h.comments && 
      (h.comments.toLowerCase().includes('acknowledged') || 
       h.comments.toLowerCase().includes('received'))
    );
    return !hasAcknowledgment;
  }
}
