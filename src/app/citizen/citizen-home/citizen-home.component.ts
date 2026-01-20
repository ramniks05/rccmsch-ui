import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

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

  constructor(
    private authService: AuthService,
    private router: Router
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
    // Adjust based on your API response structure
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


