import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../admin/admin.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { OfficerCaseService, OfficerActionRequiredItem } from '../services/officer-case.service';

/**
 * Officer Home Component
 * Dashboard for officers after login
 */
@Component({
  selector: 'app-officer-home',
  templateUrl: './officer-home.component.html',
  styleUrls: ['./officer-home.component.scss']
})
export class OfficerHomeComponent implements OnInit {
  officerData: any = null;
  userName: string = 'Officer';
  userid: string = '';
  roleName: string = '';
  roleCode: string = '';
  administrativeUnit: string = '';
  unitLevel: string = '';
  officerName: string = '';
  postingUserid: string = '';
  hierarchy: any = null;
  districtName: string = '';
  stateName: string = '';
  postingType: 'COURT_BASED' | 'UNIT_BASED' | null = null;
  courtName: string = '';
  courtCode: string = '';

  /** Actions required for dashboard */
  actionsRequiredCount = 0;
  actionsRequiredItems: OfficerActionRequiredItem[] = [];
  actionsRequiredLoading = false;
  actionsRequiredError: string | null = null;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private authService: AuthService,
    private officerCaseService: OfficerCaseService
  ) {}

  ngOnInit(): void {
    // OfficerGuard already handles authentication check
    const storedData = localStorage.getItem('adminUserData');
    if (storedData) {
      try {
        this.officerData = JSON.parse(storedData);
        this.loadOfficerDetails();
      } catch (e) {
        console.error('Error parsing officer user data:', e);
      }
    }
    this.loadActionsRequired();
  }

  loadActionsRequired(): void {
    this.actionsRequiredLoading = true;
    this.actionsRequiredError = null;
    this.officerCaseService.getOfficerActionsRequired(10).subscribe({
      next: (res) => {
        this.actionsRequiredLoading = false;
        if (res.success && res.data) {
          this.actionsRequiredCount = res.data.totalCount ?? 0;
          this.actionsRequiredItems = res.data.items ?? [];
        }
      },
      error: () => {
        this.actionsRequiredLoading = false;
        this.actionsRequiredError = 'Could not load actions';
        this.actionsRequiredCount = 0;
        this.actionsRequiredItems = [];
      }
    });
  }

  viewCase(caseId: number): void {
    this.router.navigate(['/officer/cases', caseId]);
  }

  /**
   * Load officer details from stored data (includes posting from login response)
   * Handles both court-based and unit-based postings
   */
  loadOfficerDetails(): void {
    if (!this.officerData) {
      return;
    }

    // Extract basic officer information
    if (this.officerData.userId) {
      this.userid = this.officerData.userId;
    }

    // Extract posting information from login response
    const posting = this.officerData.posting;
    if (posting) {
      // Determine posting type
      this.postingType = posting.postingType || 
                        (posting.courtId ? 'COURT_BASED' : 'UNIT_BASED') ||
                        (this.officerData.postingType || null);

      // Role information
      if (posting.roleName) {
        this.roleName = posting.roleName;
      }
      if (posting.roleCode) {
        this.roleCode = posting.roleCode;
      }

      // Court information (for court-based postings)
      if (this.postingType === 'COURT_BASED') {
        if (posting.courtName) {
          this.courtName = posting.courtName;
        }
        if (posting.courtCode) {
          this.courtCode = posting.courtCode;
        }
        // Administrative unit from court
        if (posting.unitName) {
          this.administrativeUnit = posting.unitName;
        }
      } else {
        // Unit information (for unit-based postings)
        if (posting.unitName) {
          this.administrativeUnit = posting.unitName;
        }
        if (posting.unitLevel) {
          this.unitLevel = posting.unitLevel;
        }
        if (posting.unitCode) {
          // Can store unit code if needed
        }
      }

      // Administrative unit level (common for both)
      if (posting.hierarchy?.unitLevel) {
        this.unitLevel = posting.hierarchy.unitLevel;
      } else if (posting.unitLevel && !this.unitLevel) {
        this.unitLevel = posting.unitLevel;
      }

      // Officer name
      if (posting.officerName) {
        this.officerName = posting.officerName;
        this.userName = posting.officerName;
      }

      // Posting UserID
      if (posting.postingUserid) {
        this.postingUserid = posting.postingUserid;
        // Use postingUserid if userId is not available
        if (!this.userid) {
          this.userid = posting.postingUserid;
        }
      }

      // Store hierarchy for future use
      if (posting.hierarchy) {
        this.hierarchy = posting.hierarchy;

        // Extract state name
        if (posting.hierarchy.state?.unitName) {
          this.stateName = posting.hierarchy.state.unitName;
        }

        // Extract district name
        if (posting.hierarchy.district?.unitName) {
          this.districtName = posting.hierarchy.district.unitName;
        }
      }
    }

    // Fallback to email if officer name not available
    if (!this.officerName && this.officerData.email) {
      this.userName = this.officerData.email.split('@')[0] || this.userName;
    }

    // Fallback: If no role name but have role code, format it
    if (!this.roleName && this.roleCode) {
      this.roleName = this.formatRoleCode(this.roleCode);
    }
  }

  /**
   * Format role code to readable name
   */
  private formatRoleCode(roleCode: string): string {
    return roleCode
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Logout officer
   */
  logout(): void {
    this.authService.sendData(null);
    this.adminService.logout();
    this.router.navigate(['/home']);
  }
}

