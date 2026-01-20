import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { AuthService } from 'src/app/core/services/auth.service';

/**
 * Admin Home Component
 * Dashboard for admin after login
 */
@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.scss']
})
export class AdminHomeComponent implements OnInit {
  adminData: any = null;
  userName: string = 'Admin';

  constructor(
    private adminService: AdminService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // AdminGuard already handles authentication check
    // Just load admin data here
    const storedData = localStorage.getItem('adminUserData');
    if (storedData) {
      try {
        this.adminData = JSON.parse(storedData);
        if (this.adminData.userId) {
          this.userName = `Admin (ID: ${this.adminData.userId})`;
        }
      } catch (e) {
        console.error('Error parsing admin user data:', e);
      }
    }
  }

  /**
   * Logout admin
   */
  logout(): void {
    this.authService.sendData(null);
    this.adminService.logout();
    this.router.navigate(['/home']);
  }
}

