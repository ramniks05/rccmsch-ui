import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService } from '../../admin/admin.service';
import {
  HearingShiftCase,
  HearingShiftExecuteData,
  HearingShiftExecuteRequest,
  HearingShiftPreviewData,
  HearingShiftPreviewRequest,
  HearingShiftService
} from '../services/hearing-shift.service';

interface CourtOption {
  id: number;
  courtName: string;
}

@Component({
  selector: 'app-hearing-shift',
  templateUrl: './hearing-shift.component.html',
  styleUrls: ['./hearing-shift.component.scss']
})
export class HearingShiftComponent implements OnInit {
  fromDate = '';
  toDate = '';
  selectedCourtId: number | null = null;
  shiftAll = false;
  reason = '';
  remarks = '';

  courts: CourtOption[] = [];
  cases: HearingShiftCase[] = [];
  selectedCaseIds = new Set<number>();

  previewData: HearingShiftPreviewData | null = null;
  executeData: HearingShiftExecuteData | null = null;

  loadingCourts = false;
  loadingCases = false;
  previewLoading = false;
  executeLoading = false;

  constructor(
    private readonly hearingShiftService: HearingShiftService,
    private readonly adminService: AdminService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCourts();
    this.prefillOfficerCourt();
  }

  get selectedCount(): number {
    return this.selectedCaseIds.size;
  }

  get canPreview(): boolean {
    if (!this.fromDate || !this.toDate || this.fromDate === this.toDate) {
      return false;
    }

    if (!this.shiftAll && this.selectedCaseIds.size === 0) {
      return false;
    }

    return true;
  }

  get canExecute(): boolean {
    return this.canPreview && !!this.previewData && this.reason.trim().length > 0;
  }

  loadCourts(): void {
    this.loadingCourts = true;
    this.adminService.getAllCourts().subscribe({
      next: (res) => {
        this.loadingCourts = false;
        this.courts = (res?.data ?? []) as CourtOption[];
      },
      error: () => {
        this.loadingCourts = false;
        this.courts = [];
        this.snackBar.open('Failed to load courts', 'Close', { duration: 3000 });
      }
    });
  }

  prefillOfficerCourt(): void {
    const raw = localStorage.getItem('adminUserData');
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { posting?: { courtId?: number } };
      if (parsed?.posting?.courtId != null) {
        this.selectedCourtId = parsed.posting.courtId;
      }
    } catch {
      // Ignore malformed local storage payload.
    }
  }

  loadCases(): void {
    if (!this.fromDate) {
      this.snackBar.open('From date is required to fetch cases', 'Close', { duration: 3000 });
      return;
    }

    this.loadingCases = true;
    this.previewData = null;
    this.executeData = null;
    this.selectedCaseIds.clear();

    this.hearingShiftService.getCasesByDate(this.fromDate, this.selectedCourtId ?? undefined).subscribe({
      next: (response) => {
        this.loadingCases = false;
        if (response.success) {
          this.cases = response.data ?? [];
          this.snackBar.open(response.message || 'Cases fetched', 'Close', { duration: 2000 });
          return;
        }

        this.cases = [];
        this.snackBar.open(response.message || 'Failed to fetch cases', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.loadingCases = false;
        this.cases = [];
        const message = err?.error?.message || 'Failed to fetch cases';
        this.snackBar.open(message, 'Close', { duration: 4000 });
      }
    });
  }

  toggleShiftAll(value: boolean): void {
    this.shiftAll = value;
    if (this.shiftAll) {
      this.selectedCaseIds.clear();
    }
    this.previewData = null;
    this.executeData = null;
  }

  toggleCaseSelection(caseId: number, selected: boolean): void {
    if (selected) {
      this.selectedCaseIds.add(caseId);
    } else {
      this.selectedCaseIds.delete(caseId);
    }
    this.previewData = null;
    this.executeData = null;
  }

  buildPreviewPayload(): HearingShiftPreviewRequest {
    return {
      fromDate: this.fromDate,
      toDate: this.toDate,
      courtId: this.selectedCourtId ?? undefined,
      shiftAll: this.shiftAll,
      caseIds: this.shiftAll ? [] : Array.from(this.selectedCaseIds)
    };
  }

  previewShift(): void {
    if (!this.fromDate || !this.toDate) {
      this.snackBar.open('From date and To date are required', 'Close', { duration: 3000 });
      return;
    }
    if (this.fromDate === this.toDate) {
      this.snackBar.open('To date must be different from From date', 'Close', { duration: 3000 });
      return;
    }
    if (!this.shiftAll && this.selectedCaseIds.size === 0) {
      this.snackBar.open('Select at least one case or enable shift all', 'Close', { duration: 3000 });
      return;
    }

    this.previewLoading = true;
    this.executeData = null;

    this.hearingShiftService.previewShift(this.buildPreviewPayload()).subscribe({
      next: (response) => {
        this.previewLoading = false;
        if (response.success && response.data) {
          this.previewData = response.data;
          this.snackBar.open(response.message || 'Shift preview generated', 'Close', { duration: 2500 });
          return;
        }
        this.previewData = null;
        this.snackBar.open(response.message || 'Failed to generate preview', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.previewLoading = false;
        this.previewData = null;
        const message = err?.error?.message || 'Failed to generate preview';
        this.snackBar.open(message, 'Close', { duration: 4000 });
      }
    });
  }

  executeShift(): void {
    if (!this.canExecute) {
      return;
    }

    const ok = window.confirm('Proceed with hearing shift execution? This updates hearing records in bulk.');
    if (!ok) {
      return;
    }

    const payload: HearingShiftExecuteRequest = {
      ...this.buildPreviewPayload(),
      reason: this.reason.trim(),
      remarks: this.remarks.trim() || undefined
    };

    this.executeLoading = true;
    this.hearingShiftService.executeShift(payload).subscribe({
      next: (response) => {
        this.executeLoading = false;
        if (response.success && response.data) {
          this.executeData = response.data;
          this.snackBar.open(response.message || 'Hearing shift executed', 'Close', { duration: 3000 });
          return;
        }
        this.executeData = null;
        this.snackBar.open(response.message || 'Failed to execute shift', 'Close', { duration: 3500 });
      },
      error: (err) => {
        this.executeLoading = false;
        this.executeData = null;
        const message = err?.error?.message || 'Failed to execute shift';
        this.snackBar.open(message, 'Close', { duration: 4500 });
      }
    });
  }

  isSelected(caseId: number): boolean {
    return this.selectedCaseIds.has(caseId);
  }
}
