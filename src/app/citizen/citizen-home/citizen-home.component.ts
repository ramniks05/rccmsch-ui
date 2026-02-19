import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CitizenCaseService, CitizenActionRequiredItem, CitizenActionsRequiredData } from '../services/citizen-case.service';

/**
 * Citizen Home Component
 * Welcome page for citizens after login
 */
@Component({
  selector: 'app-citizen-home',
  templateUrl: './citizen-home.component.html',
  styleUrls: ['./citizen-home.component.scss']
})
export class CitizenHomeComponent implements OnInit {
  userData: any = null;
  userName: string = '';

  /** Actions required for dashboard */
  actionsRequiredCount = 0;
  actionsRequiredItems: CitizenActionRequiredItem[] = [];
  actionsRequiredLoading = false;
  actionsRequiredError: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private citizenCaseService: CitizenCaseService
  ) {}

  ngOnInit(): void {
    // Get user data from auth service
    this.userData = this.authService.getUserData();

    // Check if user is authenticated
    if (!this.authService.isAuthenticated() || !this.userData) {
      // Redirect to login if not authenticated
      this.router.navigate(['/home']);
      return;
    }

    // Extract user name from user data
    if (this.userData.firstName) {
      this.userName = this.userData.firstName;
      if (this.userData.lastName) {
        this.userName += ' ' + this.userData.lastName;
      }
    } else if (this.userData.name) {
      this.userName = this.userData.name;
    } else if (this.userData.mobileNumber) {
      this.userName = 'User ' + this.userData.mobileNumber.slice(-4);
    } else {
      this.userName = 'Citizen';
    }

    this.loadActionsRequired();
  }

  loadActionsRequired(): void {
    this.actionsRequiredLoading = true;
    this.actionsRequiredError = null;
    this.citizenCaseService.getActionsRequired(10).subscribe({
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
    this.router.navigate(['/citizen/cases', caseId]);
  }

  services() {
    this.router.navigate(["/citizen/services"])
  }

  myProfile() {
    this.router.navigate(["/citizen/my-profile"])
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.sendData(null);
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}


