import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

/**
 * Officer Guard
 * Protects officer routes that require authentication
 * Officers use the same token storage as admin (adminToken)
 */
@Injectable({
  providedIn: 'root'
})
export class OfficerGuard implements CanActivate {
  constructor(
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if officer token exists (stored as adminToken)
    const adminToken = localStorage.getItem('adminToken');
    const isAuthenticated = !!adminToken && adminToken.trim() !== '';
    
    if (isAuthenticated) {
      return true;
    }

    // Redirect to login if not authenticated
    this.router.navigate(['/home'], {
      queryParams: { returnUrl: state.url, userType: 'OFFICER' }
    });
    return false;
  }
}

