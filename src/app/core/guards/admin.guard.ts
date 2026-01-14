import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AdminService } from '../../admin/admin.service';

/**
 * Admin Guard
 * Protects admin routes that require authentication
 */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if admin token exists
    const adminToken = localStorage.getItem('adminToken');
    const isAuthenticated = !!adminToken && adminToken.trim() !== '';
    
    if (isAuthenticated) {
      return true;
    }

    // Redirect to admin login if not authenticated
    this.router.navigate(['/admin/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}
