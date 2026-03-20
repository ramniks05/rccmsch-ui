/**
 * Workflow condition types for admin configuration and checklist display.
 * Single source of truth: valid keys come from GET /api/admin/workflow/data-keys.
 */

export type WorkflowConditionType =
  | 'WORKFLOW_FLAG'
  | 'FORM_FIELD'
  | 'CASE_DATA_FIELD'
  | 'CASE_FILTER';

export type ModuleType = 'HEARING' | 'NOTICE' | 'ORDERSHEET' | 'JUDGEMENT' | 'ATTENDANCE' | 'SUBMIT_FIELD_REPORT';

/** One item from GET /api/admin/workflow/data-keys data.keysWithBinding */
export interface WorkflowDataKeyBinding {
  key: string;
  label: string;
  moduleType: string;
  kind: 'FORM' | 'DOCUMENT' | 'SPECIAL';
}

/** Response shape from GET /api/admin/workflow/data-keys */
export interface WorkflowDataKeysResponse {
  keys: string[];
  keysWithLabels: Record<string, string>;
  keysWithBinding: WorkflowDataKeyBinding[];
}

/** Admin API: single condition config for a transition (from GET conditions). */
export interface WorkflowCondition {
  id?: number;
  permissionId: number;
  roleCode: string;
  conditionType: WorkflowConditionType;
  flagName?: string;
  moduleType?: ModuleType;
  fieldName?: string;
  displayLabel: string;
  isActive: boolean;
}

/** Checklist API: single condition status for a transition. */
export interface ConditionChecklistItem {
  label: string;
  type: string;
  flagName?: string;
  fieldName?: string;
  moduleType?: string;
  required: boolean;
  passed: boolean;
  message: string;
}

/** Checklist API: full checklist for a transition. */
export interface TransitionChecklist {
  transitionCode: string;
  transitionName: string;
  canExecute: boolean;
  conditions: ConditionChecklistItem[];
  blockingReasons: string[];
  /** IDs of document templates that this transition is about (e.g. draft/sign notice) */
  allowedDocumentIds?: number[] | null;
  /** Whether this transition allows drafting the document */
  allowDocumentDraft?: boolean | null;
  /** Whether this transition allows saving & signing the document */
  allowDocumentSaveAndSign?: boolean | null;
}

/** Case transitions API: transition with checklist summary. */
export interface BlockingConditionSummary {
  label: string;
  passed: boolean;
}

export interface TransitionWithChecklist {
  id: number;
  transitionCode: string;
  transitionName: string;
  fromStateCode: string;
  toStateCode: string;
  requiresComment: boolean;
  description?: string;
  canExecute: boolean;
  blockingConditions?: BlockingConditionSummary[];
  /** IDs of document templates this action is tied to (from checklist) */
  allowedDocumentIds?: number[] | null;
  /** Whether this action is specifically for drafting the document */
  allowDocumentDraft?: boolean | null;
  /** Whether this action is specifically for saving & signing the document */
  allowDocumentSaveAndSign?: boolean | null;
}

/** Structured conditions payload for permission create/update. */
export interface ConditionsPayload {
  workflowDataFieldsRequired?: string[];
  moduleFormFieldsRequired?: Array<{ moduleType: ModuleType; fieldName: string }>;
  caseDataFieldsRequired?: string[];
  caseDataFieldEquals?: Record<string, string>;
  caseTypeCodesAllowed?: string[];
  casePriorityIn?: string[];
}

/**
 * Fallback labels when data-keys API is not available (e.g. view-only).
 * Prefer keysWithLabels from GET /api/admin/workflow/data-keys.
 */
export const WORKFLOW_FLAGS = {
  formSubmitted: [
    { value: 'HEARING_SUBMITTED', label: 'Hearing form submitted' },
    { value: 'NOTICE_SUBMITTED', label: 'Notice form submitted' },
    { value: 'ORDERSHEET_SUBMITTED', label: 'Ordersheet form submitted' },
    { value: 'JUDGEMENT_SUBMITTED', label: 'Judgement form submitted' },
    { value: 'ATTENDANCE_SUBMITTED', label: 'Attendance form submitted' },
    { value: 'FIELD_REPORT_SUBMITTED', label: 'Field report form submitted' }
  ] as const,
  documentReady: [
    { value: 'NOTICE_READY', label: 'Notice document ready' },
    { value: 'ORDERSHEET_READY', label: 'Ordersheet document ready' },
    { value: 'JUDGEMENT_READY', label: 'Judgement document ready' }
  ] as const,
  documentSigned: [
    { value: 'NOTICE_DRAFT_CREATED', label: 'Draft notice created' },
    { value: 'NOTICE_SIGNED', label: 'Notice document signed' },
    { value: 'ORDERSHEET_DRAFT_CREATED', label: 'Draft ordersheet created' },
    { value: 'ORDERSHEET_SIGNED', label: 'Ordersheet document signed' },
    { value: 'JUDGEMENT_DRAFT_CREATED', label: 'Draft judgement created' },
    { value: 'JUDGEMENT_SIGNED', label: 'Judgement document signed' }
  ] as const,
  /** Not shown in workflow data required – user selects from module forms/documents in permission only */
  special: [] as const
};

/** Module types for form field conditions. */
export const MODULE_TYPES: { value: ModuleType; label: string }[] = [
  { value: 'HEARING', label: 'Hearing' },
  { value: 'NOTICE', label: 'Notice' },
  { value: 'ORDERSHEET', label: 'Ordersheet' },
  { value: 'JUDGEMENT', label: 'Judgement' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'SUBMIT_FIELD_REPORT', label: 'Field Report' }
];

/** Common form fields per module (fallback when schema API not available). */
export const MODULE_FIELDS: Record<ModuleType, { value: string; label: string }[]> = {
  HEARING: [
    { value: 'hearingDate', label: 'Hearing date' },
    { value: 'hearingTime', label: 'Hearing time' },
    { value: 'venue', label: 'Venue' },
    { value: 'attendance', label: 'Attendance (repeatable)' },
    { value: 'remarks', label: 'Remarks' }
  ],
  NOTICE: [
    { value: 'noticeNumber', label: 'Notice number' },
    { value: 'noticeDate', label: 'Notice date' },
    { value: 'recipient', label: 'Recipient' },
    { value: 'remarks', label: 'Remarks' }
  ],
  ORDERSHEET: [
    { value: 'ordersheetNumber', label: 'Ordersheet number' },
    { value: 'orderDate', label: 'Order date' },
    { value: 'remarks', label: 'Remarks' }
  ],
  JUDGEMENT: [
    { value: 'judgementNumber', label: 'Judgement number' },
    { value: 'judgementDate', label: 'Judgement date' },
    { value: 'remarks', label: 'Remarks' }
  ],
  ATTENDANCE: [
    { value: 'present', label: 'Present' },
    { value: 'remarks', label: 'Remarks' }
  ],
  SUBMIT_FIELD_REPORT: [
    { value: 'reportDate', label: 'Report date' },
    { value: 'remarks', label: 'Remarks' }
  ]
};
