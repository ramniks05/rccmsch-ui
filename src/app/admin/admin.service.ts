import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Admin Service
 * Handles all admin-related API calls
 */
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  /**
   * Get authentication headers with admin token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ==================== Authentication ====================

  /**
   * Admin Login
   */
  adminLogin(username: string, password: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.baseUrl}/admin/auth/login`, { username, password }, { headers });
  }

  /**
   * Officer/DA Login
   */
  officerLogin(userid: string, password: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.baseUrl}/admin/auth/officer-login`, { userid, password }, { headers });
  }

  /**
   * Reset Password
   */
  resetPassword(userid: string, newPassword: string, confirmPassword: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.baseUrl}/admin/auth/reset-password`, 
      { userid, newPassword, confirmPassword }, 
      { headers });
  }

  /**
   * Verify Mobile with OTP
   */
  verifyMobile(userid: string, otp: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.baseUrl}/admin/auth/verify-mobile`, 
      { userid, otp }, 
      { headers });
  }

  // ==================== Officer Management ====================

  /**
   * Create Officer
   */
  createOfficer(officer: { fullName: string; mobileNo: string; email: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/officers`, officer, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get All Officers
   */
  getAllOfficers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/officers`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Officer by ID
   */
  getOfficerById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/officers/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ==================== Posting Management ====================

  /**
   * Assign Officer to Post
   */
  assignOfficerToPost(posting: { unitId: number; roleCode: string; officerId: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/postings`, posting, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Transfer Officer
   */
  transferOfficer(posting: { unitId: number; roleCode: string; officerId: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/postings/transfer`, posting, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Posting by UserID
   */
  getPostingByUserid(userid: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/postings/userid/${userid}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Postings by Officer
   */
  getPostingsByOfficer(officerId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/postings/officer/${officerId}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Postings by Unit
   */
  getPostingsByUnit(unitId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/postings/unit/${unitId}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get All Active Postings
   */
  getAllActivePostings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/postings/active`, {
      headers: this.getAuthHeaders()
    });
  }

  // ==================== Roles Management ====================

  /**
   * Get All Roles
   */
  getAllRoles(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/roles`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Close Posting
   */
  closePosting(postingId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/postings/${postingId}/close`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // ==================== Administrative Units Management ====================

  /**
   * Create Administrative Unit
   */
  createAdminUnit(unit: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin-units`, unit, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get All Administrative Units
   */
  getAllAdminUnits(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Active Administrative Units
   */
  getActiveAdminUnits(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/active`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Administrative Units by Level
   */
  getAdminUnitsByLevel(level: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/level/${level}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Administrative Units by Parent
   */
  getAdminUnitsByParent(parentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/parent/${parentId}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Root Units
   */
  getRootUnits(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/root`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Administrative Unit by ID
   */
  getAdminUnitById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Administrative Unit by Code
   */
  getAdminUnitByCode(code: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/code/${code}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Update Administrative Unit
   */
  updateAdminUnit(id: number, unit: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin-units/${id}`, unit, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Delete Administrative Unit
   */
  deleteAdminUnit(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin-units/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ==================== Case Types Management ====================

  /**
   * Create Case Type
   */
  createCaseType(caseType: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/case-types`, caseType, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get All Case Types
   */
  getAllCaseTypes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/case-types`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Active Case Types
   */
  getActiveCaseTypes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/case-types/active`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Case Type by ID
   */
  getCaseTypeById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/case-types/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get Case Type by Code
   */
  getCaseTypeByCode(code: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/case-types/code/${code}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Update Case Type
   */
  updateCaseType(id: number, caseType: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/case-types/${id}`, caseType, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Delete Case Type
   */
  deleteCaseType(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/case-types/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Hard Delete Case Type
   */
  hardDeleteCaseType(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/case-types/${id}/hard`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Check if admin is authenticated
   */
  isAdminAuthenticated(): boolean {
    return !!localStorage.getItem('adminToken');
  }

  /**
   * Get admin token
   */
  getAdminToken(): string | null {
    return localStorage.getItem('adminToken');
  }

  /**
   * Logout admin
   */
  logout(): void {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUserData');
  }
}

