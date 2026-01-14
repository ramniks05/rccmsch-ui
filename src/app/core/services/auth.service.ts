import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, switchMap, filter, take } from 'rxjs/operators';
import { ApiService } from './api.service';

/**
 * Auth Service
 * Handles authentication state and token management
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject: BehaviorSubject<any | null>;
  public currentUser$: Observable<any | null>;
  private refreshTokenInProgress: boolean = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {
    const userData = this.getUserData();
    this.currentUserSubject = new BehaviorSubject<any | null>(userData);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  /**
   * Get current user data
   */
  public get currentUserValue(): any | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Store authentication tokens and user data
   */
  setAuthData(token: string, refreshToken: string, userData: any): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    this.currentUserSubject.next(userData);
  }

  /**
   * Get JWT token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get user data
   */
  getUserData(): any | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationDate = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationDate;
    } catch (e) {
      return true;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/home']);
  }

  /**
   * Clear all auth data
   */
  clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    // If refresh is already in progress, return the existing observable
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.asObservable().pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap(token => of(token))
      );
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);

    return this.apiService.refreshToken(refreshToken).pipe(
      switchMap((response) => {
        // Handle new API response structure { success, message, data }
        const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
        const responseData = apiResponse.success ? apiResponse.data : response;
        
        const newToken = responseData?.token;
        const newRefreshToken = responseData?.refreshToken || refreshToken;
        const expiresIn = responseData?.expiresIn;

        if (newToken) {
          // Update stored token
          localStorage.setItem(this.TOKEN_KEY, newToken);
          
          // Update refresh token if a new one is provided
          if (newRefreshToken && newRefreshToken !== refreshToken) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, newRefreshToken);
          }
          
          // Update user data if provided
          if (responseData?.userId || responseData?.citizenType) {
            const currentUserData = this.getUserData() || {};
            const updatedUserData = {
              ...currentUserData,
              userId: responseData.userId || currentUserData.userId,
              citizenType: responseData.citizenType || currentUserData.citizenType,
              email: responseData.email || currentUserData.email,
              mobileNumber: responseData.mobileNumber || currentUserData.mobileNumber,
              expiresIn: expiresIn || currentUserData.expiresIn
            };
            localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUserData));
            this.currentUserSubject.next(updatedUserData);
          }

          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(newToken);
          return of(newToken);
        } else {
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(null);
          return throwError(() => new Error('Invalid response from refresh token API'));
        }
      }),
      catchError((error) => {
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(null);
        
        // If refresh token is invalid/expired, logout user
        if (error.status === 401 || error.status === 403) {
          this.logout();
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Get valid token, refreshing if necessary
   */
  getValidToken(): Observable<string> {
    const token = this.getToken();
    
    if (!token) {
      return throwError(() => new Error('No token available'));
    }

    // Check if token is expired or will expire in the next 5 minutes
    if (this.isTokenExpired(token) || this.willTokenExpireSoon(token, 5)) {
      return this.refreshAccessToken();
    }

    return of(token);
  }

  /**
   * Check if token will expire soon (within specified minutes)
   */
  private willTokenExpireSoon(token: string, minutes: number): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationDate = payload.exp * 1000; // Convert to milliseconds
      const expirationThreshold = Date.now() + (minutes * 60 * 1000); // Add minutes in milliseconds
      return expirationDate <= expirationThreshold;
    } catch (e) {
      return true;
    }
  }

  /**
   * Update access token (used by interceptor)
   */
  updateAccessToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
}

