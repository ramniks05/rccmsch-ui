import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Admin Service
 * Handles all admin-related API calls
 */
@Injectable({
  providedIn: 'root',
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
      Authorization: `Bearer ${token}`,
    });
  }

  // ==================== Authentication ====================

  /**
   * Admin Login
   */
  adminLogin(username: string, password: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}/admin/auth/login`,
      { username, password },
      { headers },
    );
  }

  /**
   * Officer/DA Login
   */
  officerLogin(userid: string, password: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}/admin/auth/officer-login`,
      { userid, password },
      { headers },
    );
  }

  /**
   * Reset Password
   */
  resetPassword(
    userid: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}/admin/auth/reset-password`,
      { userid, newPassword, confirmPassword },
      { headers },
    );
  }

  /**
   * Verify Mobile with OTP
   */
  verifyMobile(userid: string, otp: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}/admin/auth/verify-mobile`,
      { userid, otp },
      { headers },
    );
  }

  // ==================== Officer Management ====================

  /**
   * Create Officer
   */
  createOfficer(officer: {
    fullName: string;
    mobileNo: string;
    email: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/officers`, officer, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get All Officers
   */
  getAllOfficers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/officers`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get Officer by ID
   */
  getOfficerById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/officers/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ==================== Posting Management ====================

  /**
   * Assign Officer to Post
   * Now uses courtId instead of unitId
   */
  assignOfficerToPost(posting: {
    courtId: number;
    roleCode: string;
    officerId: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/postings`, posting, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Transfer Officer
   * Now uses courtId instead of unitId
   */
  transferOfficer(posting: {
    courtId: number;
    roleCode: string;
    officerId: number;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/postings/transfer`, posting, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get Posting by UserID
   */
  getPostingByUserid(userid: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/postings/userid/${userid}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get Postings by Officer
   */
  getPostingsByOfficer(officerId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/admin/postings/officer/${officerId}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * Get Postings by Court
   */
  getPostingsByCourt(courtId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/postings/court/${courtId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get Active Postings by Unit
   * Returns active postings for a unit (through courts)
   */
  getActivePostingsByUnit(unitId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/admin/postings/unit/${unitId}/active`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * Get All Active Postings
   */
  getAllActivePostings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/postings/active`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ==================== Roles Management ====================

  /**
   * Get All Roles
   */
  getAllRoles(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/roles`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Close Posting
   */
  closePosting(postingId: number): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/admin/postings/${postingId}/close`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // ==================== Administrative Units Management ====================

  /**
   * POST /api/admin-units — Create Administrative Unit (Admin)
   * Note: Admin CRUD operations may not be documented, using standard pattern
   */
  createAdminUnit(unit: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin-units`, unit, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin-units — Get All Administrative Units (Admin)
   */
  getAllAdminUnits(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin-units/active — Get Active Administrative Units (Public)
   * Matches documentation: Administrative Units API
   */
  getActiveAdminUnits(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/active`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin-units/level/{level} — Get Administrative Units by Level (Admin)
   */
  getAdminUnitsByLevel(level: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/level/${level}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin-units/parent/{parentId} — Get Units by Parent (Public)
   * Matches documentation: Administrative Units API
   */
  getAdminUnitsByParent(parentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/parent/${parentId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin-units/root — Get Root Units (Public)
   * Matches documentation: Administrative Units API
   */
  getRootUnits(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/root`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get Administrative Unit by ID
   */
  getAdminUnitById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get Administrative Unit by Code
   */
  getAdminUnitByCode(code: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-units/code/${code}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Update Administrative Unit
   */
  updateAdminUnit(id: number, unit: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin-units/${id}`, unit, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Delete Administrative Unit
   */
  deleteAdminUnit(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin-units/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ==================== Case Types API (filing types: NEW_FILE, APPEAL, REVISION) ====================

  /**
   * POST /api/admin/case-types — Case Types API
   * Body: { caseNatureId, typeCode, typeName, courtLevel, courtTypes, fromLevel, isAppeal, appealOrder, description, workflowCode, isActive, displayOrder }
   */
  createCaseType(caseType: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/case-types`, caseType, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin/case-types — Case Types API
   */
  getAllCaseTypes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/case-types`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/public/case-types/case-nature/{caseNatureId} — Case Types API
   * Returns case types (filing types) for a given case nature.
   */
  getCaseTypesByCaseNature(caseNatureId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/public/case-types/case-nature/${caseNatureId}`,
    );
  }

  /**
   * Get Case Type by ID
   */
  getCaseTypeById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/case-types/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Update Case Type
   */
  updateCaseType(id: number, caseType: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/case-types/${id}`, caseType, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Delete Case Type
   */
  deleteCaseType(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/case-types/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ==================== Form Schema Management (by Case Type) ====================

  /**
   * GET /api/admin/form-schemas/case-types/{caseTypeId} — Get Form Schema for Case Type
   * No authentication required - Public endpoint
   */
  getFormSchema(caseTypeId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/admin/form-schemas/case-types/${caseTypeId}`,
    );
  }

  /**
   * POST /api/admin/form-schemas/validate — Validate Form Data
   * Body: { caseTypeId, formData }
   */
  validateFormData(caseTypeId: number, formData: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/admin/form-schemas/validate`,
      {
        caseTypeId,
        formData,
      },
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * POST /api/admin/form-schemas/case-types/{caseTypeId} — Save/Create Form Schema
   */
  saveFormSchema(caseTypeId: number, schema: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/admin/form-schemas/case-types/${caseTypeId}`,
      schema,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * PUT /api/admin/form-schemas/case-types/{caseTypeId} — Update Form Schema
   */
  updateFormSchema(caseTypeId: number, schema: any): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/admin/form-schemas/case-types/${caseTypeId}`,
      schema,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // ==================== Form Field Management ====================

  /**
   * GET /api/admin/form-schemas/case-types/{caseTypeId}/fields — Get All Fields (Including Inactive) for a Case Type
   */
  getAllFormFields(caseTypeId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/admin/form-schemas/case-types/${caseTypeId}/fields`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * Get Single Field by ID
   */
  getFormField(fieldId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/admin/form-schemas/fields/${fieldId}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * Create a single form field
   */
  createFormField(field: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/form-schemas/fields`, field, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Update a single form field
   */
  updateFormField(fieldId: number, field: any): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/admin/form-schemas/fields/${fieldId}`,
      field,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * Delete a single form field
   */
  deleteFormField(fieldId: number): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/admin/form-schemas/fields/${fieldId}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * PUT /api/admin/form-schemas/case-types/{caseTypeId}/fields/reorder — Reorder fields for a Case Type
   */
  reorderFields(
    caseTypeId: number,
    fieldOrders: Array<{ fieldId: number; displayOrder: number }>,
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/admin/form-schemas/case-types/${caseTypeId}/fields/reorder`,
      {
        fieldOrders,
      },
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // ==================== Field Group Management ====================

  /**
   * GET /api/admin/form-schemas/case-types/{caseTypeId}/field-groups — Get Active Field Groups for Case Type
   */
  getFieldGroups(caseTypeId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/admin/form-schemas/case-types/${caseTypeId}/field-groups`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * POST /api/admin/form-schemas/field-groups — Create Field Group
   * Body: { caseTypeId, groupCode, groupLabel, description, displayOrder, isActive }
   */
  createFieldGroup(group: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/admin/form-schemas/field-groups`,
      group,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * PUT /api/admin/form-schemas/field-groups/{id} — Update Field Group
   * Body: { caseTypeId, groupCode, groupLabel, description, displayOrder, isActive }
   */
  updateFieldGroup(id: number, group: any): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/admin/form-schemas/field-groups/${id}`,
      group,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * DELETE /api/admin/form-schemas/field-groups/{id} — Delete Field Group
   */
  deleteFieldGroup(id: number): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/admin/form-schemas/field-groups/${id}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // ==================== Acts Management ====================

  /**
   * GET /api/admin/acts — Get All Active Acts (Admin)
   * Matches documentation: Acts API
   */
  getAllActs(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/acts`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin/acts/{id} — Get Act by ID (Admin)
   */
  getActById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/acts/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * POST /api/admin/acts — Create Act (Admin)
   * Matches documentation: Acts API
   * Body: { actCode, actName, actYear, description, sections, isActive }
   */
  createAct(act: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/acts`, act, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * PUT /api/admin/acts/{id} — Update Act (Admin)
   */
  updateAct(id: number, act: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/acts/${id}`, act, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * DELETE /api/admin/acts/{id} — Delete Act (Admin)
   */
  deleteAct(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/acts/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ==================== Case Natures API (legal matters: MUTATION_GIFT_SALE, PARTITION) ====================

  /**
   * GET /api/case-natures/active — Case Natures API
   */
  getActiveCaseNatures(): Observable<any> {
    return this.http.get(`${this.baseUrl}/case-natures/active`);
  }

  /**
   * GET /api/admin/case-natures — Case Natures API (Public - read-only, no authentication required)
   */
  getAllCaseNatures(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/case-natures`);
  }

  /**
   * GET /api/admin/case-natures/{id} — Case Natures API
   */
  getCaseNatureById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/case-natures/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * POST /api/admin/case-natures — Case Natures API
   * Note: Documentation shows POST /api/case-natures, but summary indicates admin endpoints are under /api/admin/case-natures/*
   * Using /admin/case-natures for consistency with other admin endpoints (case-types, acts, courts)
   * Body: { name, code, description, actId, isActive }
   * Note: workflowCode has been moved to Case Type level
   */
  createCaseNature(caseNature: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/case-natures`, caseNature, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * PUT /api/admin/case-natures/{id} — Case Natures API
   */
  updateCaseNature(id: number, caseNature: any): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/admin/case-natures/${id}`,
      caseNature,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  /**
   * DELETE /api/admin/case-natures/{id} — Case Natures API
   */
  deleteCaseNature(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/case-natures/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ==================== Courts Management ====================

  /**
   * GET /api/admin/courts — Get All Courts (Admin)
   * Matches documentation: Courts API
   */
  getAllCourts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/courts`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin/courts/level/{level} — Get Courts by Level (Admin)
   * Matches documentation: Courts API
   */
  getCourtsByLevel(level: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/courts/level/${level}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/admin/courts/{id} — Get Court by ID (Admin)
   */
  getCourtById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/courts/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * POST /api/admin/courts — Create Court (Admin)
   * Matches documentation: Courts API
   * Body: { courtCode, courtName, courtLevel, courtType, unitId, designation, address, contactNumber, email, isActive }
   */
  createCourt(court: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/courts`, court, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * PUT /api/admin/courts/{id} — Update Court (Admin)
   */
  updateCourt(id: number, court: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/courts/${id}`, court, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * DELETE /api/admin/courts/{id} — Delete Court (Admin)
   */
  deleteCourt(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/courts/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/public/courts/available?caseTypeId={caseTypeId}&unitId={unitId} — Get Available Courts (Public)
   * Matches documentation: Courts API
   * Returns courts available for a specific case type and user's unit
   */
  getAvailableCourts(caseTypeId: number, unitId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/public/courts/available?caseTypeId=${caseTypeId}&unitId=${unitId}`,
    );
  }

  // ==================== Workflow Management ====================

  /**
   * GET /api/admin/workflow/definitions/active — Get Active Workflows
   * Returns list of active workflows for dropdown selection
   */
  getActiveWorkflows(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/workflow/definitions/active`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ==================== Case Management ====================

  /**
   * POST /api/cases — Create Case (Admin)
   * Matches documentation: Cases API
   * Body: { caseNatureId, caseTypeId, applicantId, unitId, courtId, originalOrderLevel, subject, description, priority, applicationDate, remarks, caseData }
   */
  createCase(caseData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cases`, caseData, {
      headers: this.getAuthHeaders(),
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

  getEventTypes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/calender/fetch/event-types`, {
      headers: this.getAuthHeaders(),
    });
  }

  createEventHoliday(payload: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/calender/create/calender-event`,
      payload,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  getEventHolidayList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/calender/fetch/calender-event-list`, {
      headers: this.getAuthHeaders(),
    });
  }

  updateEventHoliday(eventId: number | string, body: any) {
    return this.http.post(
      `${this.baseUrl}/calender/update/calender-event/${eventId}`,
      body,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  deactivateEventHoliday(
    eventId: number | string,
    body: { isActive: boolean },
  ) {
    return this.http.put(
      `${this.baseUrl}/calender/deactivate/calender-event/${eventId}`,
      body, {
        headers: this.getAuthHeaders(),
      }
    );
  }
}
