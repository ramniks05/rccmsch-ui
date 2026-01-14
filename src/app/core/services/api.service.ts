import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * API Service
 * Centralized service for making HTTP requests to the backend API
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  /**
   * Get request
   * @param endpoint API endpoint (relative to baseUrl)
   * @param params Query parameters
   * @param headers Optional headers
   */
  get<T>(endpoint: string, params?: any, headers?: HttpHeaders): Observable<T> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      params: httpParams,
      headers: headers
    });
  }

  /**
   * Post request
   * @param endpoint API endpoint (relative to baseUrl)
   * @param body Request body
   * @param headers Optional headers
   */
  post<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body, { headers });
  }

  /**
   * Put request
   * @param endpoint API endpoint (relative to baseUrl)
   * @param body Request body
   * @param headers Optional headers
   */
  put<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body, { headers });
  }

  /**
   * Delete request
   * @param endpoint API endpoint (relative to baseUrl)
   * @param headers Optional headers
   */
  delete<T>(endpoint: string, headers?: HttpHeaders): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, { headers });
  }

  /**
   * Register a new citizen
   * @param registrationData User registration data
   */
  registerCitizen(registrationData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.post('auth/citizen/register', registrationData, headers);
  }

  /**
   * Send OTP to mobile number for Citizen Login
   * @param mobileNumber Mobile number (10 digits)
   * @param citizenType Citizen type (CITIZEN or OPERATOR)
   */
  sendOTP(mobileNumber: string, citizenType: string = 'CITIZEN'): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      mobileNumber: mobileNumber,
      citizenType: citizenType
    };
    return this.post('auth/citizen/send-otp', body, headers);
  }

  /**
   * Verify OTP and Login (OTP-based Login)
   * @param mobileNumber Mobile number (10 digits)
   * @param otp 6-digit OTP code
   * @param captcha CAPTCHA value
   * @param captchaId CAPTCHA ID (UUID)
   * @param citizenType Citizen type (CITIZEN or OPERATOR)
   */
  verifyOTP(mobileNumber: string, otp: string, captcha: string, captchaId: string, citizenType: string = 'CITIZEN'): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      mobileNumber: mobileNumber,
      otp: otp,
      captcha: captcha,
      captchaId: captchaId,
      citizenType: citizenType
    };
    return this.post('auth/citizen/otp-login', body, headers);
  }

  /**
   * Password Login
   * @param username Mobile number or email
   * @param password Password
   * @param captcha CAPTCHA value
   * @param captchaId CAPTCHA ID (UUID)
   * @param citizenType Citizen type (CITIZEN or OPERATOR)
   */
  passwordLogin(username: string, password: string, captcha: string, captchaId: string, citizenType: string = 'CITIZEN'): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      username: username,
      password: password,
      captcha: captcha,
      captchaId: captchaId,
      citizenType: citizenType
    };
    return this.post('auth/citizen/login', body, headers);
  }

  /**
   * Verify Registration OTP
   * @param mobileNumber Mobile number (10 digits)
   * @param otp 6-digit OTP code
   */
  verifyRegistrationOTP(mobileNumber: string, otp: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      mobileNumber: mobileNumber,
      otp: otp
    };
    return this.post('auth/citizen/registration/verify-otp', body, headers);
  }

  /**
   * Generate CAPTCHA
   */
  generateCaptcha(): Observable<any> {
    return this.get('auth/captcha/generate');
  }

  /**
   * Validate CAPTCHA (for testing/pre-validation)
   * @param captchaId CAPTCHA ID (UUID)
   * @param captchaText CAPTCHA text entered by user
   */
  validateCaptcha(captchaId: string, captchaText: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      captchaId: captchaId,
      captchaText: captchaText
    };
    return this.post('auth/captcha/validate', body, headers);
  }

  /**
   * Refresh JWT token using refresh token
   * @param refreshToken Refresh token
   */
  refreshToken(refreshToken: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      refreshToken: refreshToken
    };
    return this.post('auth/refresh-token', body, headers);
  }

  /**
   * Send OTP for registration verification (resend OTP during registration)
   * @param mobileNumber Mobile number to send OTP to
   * @param citizenType Citizen type (CITIZEN or OPERATOR), defaults to CITIZEN
   */
  sendRegistrationOTP(mobileNumber: string, citizenType: string = 'CITIZEN'): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      mobileNumber: mobileNumber,
      citizenType: citizenType
    };
    return this.post('auth/citizen/registration/send-otp', body, headers);
  }
}

