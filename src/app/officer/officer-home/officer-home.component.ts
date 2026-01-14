import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../admin/admin.service';

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

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // OfficerGuard already handles authentication check
    // Load officer data from localStorage (includes posting information from login response)
    const storedData = localStorage.getItem('adminUserData');
    if (storedData) {
      try {
        this.officerData = JSON.parse(storedData);
        this.loadOfficerDetails();
      } catch (e) {
        console.error('Error parsing officer user data:', e);
      }
    }
  }

  /**
   * Load officer details from stored data (includes posting from login response)
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
      // Role information
      if (posting.roleName) {
        this.roleName = posting.roleName;
      }
      if (posting.roleCode) {
        this.roleCode = posting.roleCode;
      }

      // Administrative unit information
      if (posting.unitName) {
        this.administrativeUnit = posting.unitName;
      }
      if (posting.hierarchy?.unitLevel) {
        this.unitLevel = posting.hierarchy.unitLevel;
      } else if (posting.unitLevel) {
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
    this.adminService.logout();
    this.router.navigate(['/home']);
  }
}

