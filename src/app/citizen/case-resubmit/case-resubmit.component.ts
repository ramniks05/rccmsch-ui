import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitizenCaseService, Case } from '../services/citizen-case.service';
import { ResubmitPrefill } from '../dynamic-case-form/dynamic-case-form.component';

@Component({
  selector: 'app-case-resubmit',
  templateUrl: './case-resubmit.component.html',
  styleUrls: ['./case-resubmit.component.scss']
})
export class CaseResubmitComponent implements OnInit {
  caseId!: number;
  case: Case | null = null;
  returnComment = '';
  isLoading = false;
  /** Built from case after load; passed to dynamic-case-form for same UI as new application */
  prefillData: ResubmitPrefill | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CitizenCaseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.caseId = +params['id'];
      if (this.caseId) this.loadCaseDetails();
    });
  }

  loadCaseDetails(): void {
    this.isLoading = true;
    this.prefillData = null;
    this.caseService.getCaseDetail(this.caseId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data?.caseInfo) {
          this.case = response.data.caseInfo;
          if (!this.isCaseReturnedForCorrection()) {
            this.snackBar.open('This case is not in correction status', 'Close', { duration: 5000 });
            this.router.navigate(['/citizen/cases', this.caseId]);
            return;
          }
          const history = response.data.history || [];
          const returned = history
            .filter((h: any) => (h.toStateCode || h.toState?.stateCode) === 'RETURNED_FOR_CORRECTION')
            .slice(-1)[0];
          if (returned?.comments) this.returnComment = returned.comments;

          let caseData: Record<string, any> = {};
          if (this.case.caseData) {
            try {
              caseData = typeof this.case.caseData === 'string'
                ? JSON.parse(this.case.caseData)
                : this.case.caseData;
            } catch (_) {}
          }

          this.prefillData = {
            caseTypeId: this.case.caseTypeId,
            caseNatureId: this.case.caseNatureId,
            caseNatureName: this.case.caseNatureName,
            caseTypeName: this.case.caseTypeName,
            caseData,
            unitId: this.case.unitId,
            courtId: this.case.courtId ?? 0,
            subject: this.case.subject
          };
        }
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error?.error?.message || error?.message || 'Failed to load case details';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }

  private isCaseReturnedForCorrection(): boolean {
    if (!this.case) return false;
    const s = (this.case.status || '').toUpperCase();
    const code = ((this.case as any).currentStateCode || '').toUpperCase();
    const name = ((this.case as any).currentStateName || (this.case as any).statusName || '').toLowerCase();
    return (
      s === 'RETURNED_FOR_CORRECTION' ||
      code === 'RETURNED_FOR_CORRECTION' ||
      (name.includes('returned') && name.includes('correction'))
    );
  }
}
