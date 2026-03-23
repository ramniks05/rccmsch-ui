/**
 * Generic Form Builder types.
 * Supports REPEATABLE_SECTION, DYNAMIC_FILES, conditional logic, and validation.
 * @see FORM_BUILDER_ARCHITECTURE.md / FORM_BUILDER_FRONTEND_GUIDE.md
 */

export type FormBuilderFieldType =
  | 'TEXT' | 'TEXTAREA' | 'RICH_TEXT'
  | 'NUMBER' | 'DATE' | 'DATETIME'
  | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'RADIO'
  | 'FILE'
  | 'REPEATABLE_SECTION'
  | 'DYNAMIC_FILES';

/** Single condition for show/required logic */
export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains' | 'isEmpty' | 'isNotEmpty';
  value?: unknown;
  values?: unknown[];
}

/** showIf / requiredIf: single rule or AND/OR group */
export interface ConditionalLogic {
  showIf?: ConditionalRule | { all?: ConditionalRule[]; any?: ConditionalRule[] };
  requiredIf?: ConditionalRule | { all?: ConditionalRule[]; any?: ConditionalRule[] };
}

/** Config for API-driven dropdown options (field.dataSource JSON). */
export interface DataSourceConfig {
  type?: string;        // ADMIN_UNITS | COURTS | ACTS | CASE_NATURES | CASE_TYPES | FIELD_OFFICERS | PARTIES
  level?: string;       // STATE | DISTRICT | SUB_DIVISION | CIRCLE
  apiEndpoint?: string; // Custom GET endpoint, e.g. /api/public/form-data-sources/custom
  parentField?: string; // Form field name; when it changes, refetch (e.g. parentId, caseNatureId)
  valueKey?: string;    // Response key for value (default "id")
  labelKey?: string;    // Response key for label (default "name")
  includeTypes?: string[]; // For PARTIES type: filter by party types (e.g. ["PETITIONER", "RESPONDENT"])
}

export interface OptionItem {
  value: string | number;
  label: string;
}

/** Field definition for REPEATABLE_SECTION item (row) schema */
export interface ItemSchemaField {
  fieldName: string;
  fieldLabel: string;
  fieldType: FormBuilderFieldType;
  isRequired?: boolean;
  fieldOptions?: string | null;
  dataSource?: string | null; // JSON DataSourceConfig for API-driven options
  placeholder?: string | null;
  defaultValue?: string | number | boolean | null;
}

/** Generic form field definition (schema from API may have options or fieldOptions) */
export interface FormFieldDefinition {
  id?: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: FormBuilderFieldType;
  isRequired: boolean;
  validationRules?: string | null;
  displayOrder?: number;
  fieldOptions?: string | null;
  options?: string | null; // alias used by module forms API
  placeholder?: string | null;
  helpText?: string | null;
  dataSource?: string | null;     // JSON DataSourceConfig for API-driven SELECT/RADIO options
  dependsOnField?: string | null;
  dependencyCondition?: string | null;
  conditionalLogic?: string | null;
  requiredCondition?: string | null;
  itemSchema?: string | null;
  defaultValue?: string | null;
}

/** Uploaded file item for FILE / DYNAMIC_FILES */
export interface FileItem {
  fileId: string;
  fileName: string;
  fileSize: number;
  displayName?: string; // Optional display name that user can edit (file type)
  fileUrl?: string; // Optional: Server path where file is stored (from upload response)
  fileType?: string; // Optional: MIME type of the file (from upload response)
  file?: File; // Optional: File object (for multipart/form-data submission)
}

export type FormData = Record<string, unknown>;
