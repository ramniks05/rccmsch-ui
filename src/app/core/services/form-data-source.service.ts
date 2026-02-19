import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { DataSourceConfig, OptionItem, FormData } from '../models/form-builder.types';

/** Field-like shape with dataSource and dependsOnField */
export interface FieldWithDataSource {
  fieldName: string;
  dataSource?: string | null;
  dependsOnField?: string | null;
}

/**
 * Parses dataSource JSON string into DataSourceConfig.
 */
export function parseDataSource(json: string | null | undefined): DataSourceConfig | null {
  if (!json?.trim()) return null;
  try {
    return JSON.parse(json) as DataSourceConfig;
  } catch {
    return null;
  }
}

function toOptions(list: unknown[], valueKey = 'id', labelKey = 'name'): OptionItem[] {
  if (!Array.isArray(list)) return [];
  return list.map((item: unknown) => {
    const r = item as Record<string, unknown>;
    return {
      value: (r[valueKey] ?? r['id']) as string | number,
      label: String(r[labelKey] ?? r['name'] ?? r[labelKey] ?? ''),
    };
  });
}

/**
 * Service for fetching form field options from API (dataSource).
 * Used by hearing form and other module forms for SELECT/RADIO when field.dataSource is set.
 */
@Injectable({
  providedIn: 'root',
})
export class FormDataSourceService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }

  /**
   * Fetch options for a field from API based on dataSource (and formData for parent-dependent sources).
   */
  getOptionsForField(
    field: FieldWithDataSource,
    formData: FormData
  ): Observable<OptionItem[]> {
    const ds = parseDataSource(field.dataSource);
    if (!ds) return of([]);

    const valueKey = ds.valueKey ?? 'id';
    const labelKey = ds.labelKey ?? 'name';
    const parentValue = ds.parentField ? formData[ds.parentField] : undefined;

    // If this source depends on a parent and parent is empty, return empty
    if (ds.parentField != null && (parentValue === null || parentValue === undefined || parentValue === '')) {
      return of([]);
    }

    const parentParam = ds.parentField != null && parentValue != null && parentValue !== ''
      ? `&${ds.parentField}=${encodeURIComponent(String(parentValue))}`
      : '';

    let url: string;
    if (ds.type === 'ADMIN_UNITS') {
      const level = ds.level ?? 'CIRCLE';
      url = `${this.baseUrl}/public/form-data-sources/admin-units?level=${encodeURIComponent(level)}${parentValue != null && parentValue !== '' ? `&parentId=${encodeURIComponent(String(parentValue))}` : ''}`;
    } else if (ds.type === 'COURTS') {
      const level = ds.level ?? 'CIRCLE';
      url = `${this.baseUrl}/public/form-data-sources/courts?courtLevel=${encodeURIComponent(level)}${parentValue != null && parentValue !== '' ? `&unitId=${encodeURIComponent(String(parentValue))}` : ''}`;
    } else if (ds.type === 'ACTS') {
      url = `${this.baseUrl}/public/form-data-sources/acts`;
    } else if (ds.type === 'CASE_NATURES') {
      url = `${this.baseUrl}/public/form-data-sources/case-natures`;
    } else if (ds.type === 'CASE_TYPES') {
      if (parentValue == null || parentValue === '') return of([]);
      url = `${this.baseUrl}/public/form-data-sources/case-types?caseNatureId=${encodeURIComponent(String(parentValue))}`;
    } else if (ds.apiEndpoint) {
      const path = ds.apiEndpoint.startsWith('/') ? ds.apiEndpoint.slice(1) : ds.apiEndpoint;
      const sep = path.includes('?') ? '&' : '?';
      url = `${this.baseUrl}/${path}${parentParam ? sep + parentParam.slice(1) : ''}`;
    } else {
      return of([]);
    }

    return this.http.get<{ data?: unknown[] } | unknown[]>(url, { headers: this.getHeaders() }).pipe(
      map((res) => {
        const list = Array.isArray(res) ? res : (res && typeof res === 'object' && 'data' in res ? (res as { data?: unknown[] }).data : []);
        return toOptions(Array.isArray(list) ? list : [], valueKey, labelKey);
      }),
      catchError((err) => {
        console.error('FormDataSourceService.getOptionsForField failed', field.fieldName, err);
        return of([]);
      })
    );
  }
}
