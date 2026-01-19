import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SystemSettings {
  id?: number;
  logoUrl: string | null;
  logoHeader: string | null;
  logoSubheader: string | null;
  stateName: string | null;
  footerText: string | null;
  footerCopyright: string | null;
  footerAddress: string | null;
  footerEmail: string | null;
  footerPhone: string | null;
  footerWebsite: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

/**
 * System Settings Service
 * Fetches and manages system settings (logo, header, footer) from the backend API
 */
@Injectable({
  providedIn: 'root'
})
export class SystemSettingsService {
  private apiUrl = `${environment.apiUrl}/admin/system-settings`;
  private settingsSubject = new BehaviorSubject<SystemSettings | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSettings();
  }

  /**
   * Load system settings from API
   * Also checks localStorage cache first to reduce API calls
   */
  loadSettings(): void {
    // Check cache first
    const cached = localStorage.getItem('systemSettings');
    const cacheTime = localStorage.getItem('systemSettingsTime');
    const oneHour = 60 * 60 * 1000;

    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < oneHour) {
      try {
        const settings = JSON.parse(cached);
        this.settingsSubject.next(settings);
      } catch (e) {
        console.error('Failed to parse cached settings', e);
      }
    }

    // Fetch from API
    this.http.get<ApiResponse<SystemSettings>>(this.apiUrl).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.settingsSubject.next(response.data);
          // Cache for 1 hour
          localStorage.setItem('systemSettings', JSON.stringify(response.data));
          localStorage.setItem('systemSettingsTime', Date.now().toString());
        }
      }),
      catchError((error) => {
        console.error('Failed to load system settings:', error);
        // If API fails and no cache, emit null so components can show default values
        if (!cached) {
          this.settingsSubject.next(null);
        }
        return [];
      })
    ).subscribe();
  }

  /**
   * Get current settings as Observable
   */
  getSettings(): Observable<SystemSettings | null> {
    return this.settings$;
  }

  /**
   * Refresh settings from API (bypass cache)
   */
  refreshSettings(): void {
    localStorage.removeItem('systemSettings');
    localStorage.removeItem('systemSettingsTime');
    this.loadSettings();
  }

  /**
   * Update system settings
   * @param settings System settings to update
   */
  updateSettings(settings: SystemSettings): Observable<ApiResponse<SystemSettings>> {
    return this.http.put<ApiResponse<SystemSettings>>(this.apiUrl, settings).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.settingsSubject.next(response.data);
          // Update cache
          localStorage.setItem('systemSettings', JSON.stringify(response.data));
          localStorage.setItem('systemSettingsTime', Date.now().toString());
        }
      })
    );
  }
}

