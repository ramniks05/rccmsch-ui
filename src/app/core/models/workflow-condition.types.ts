/**
 * Workflow condition types for admin configuration and checklist display.
 * See docs WORKFLOW_DOCUMENTATION.md / Workflow Condition Configuration Guide.
 */

export type WorkflowConditionType =
  | 'WORKFLOW_FLAG'
  | 'FORM_FIELD'
  | 'CASE_DATA_FIELD'
  | 'CASE_FILTER';

export type ModuleType = 'HEARING' | 'NOTICE' | 'ORDERSHEET' | 'JUDGEMENT';

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

/** Predefined workflow flags (form submitted / document ready / document signed). */
export const WORKFLOW_FLAGS = {
  formSubmitted: [
    { value: 'HEARING_SUBMITTED', label: 'Require Hearing form submitted' },
    { value: 'NOTICE_SUBMITTED', label: 'Require Notice form submitted' },
    { value: 'ORDERSHEET_SUBMITTED', label: 'Require Ordersheet form submitted' },
    { value: 'JUDGEMENT_SUBMITTED', label: 'Require Judgement form submitted' }
  ] as const,
  documentReady: [
    { value: 'NOTICE_READY', label: 'Require Notice document ready' },
    { value: 'ORDERSHEET_READY', label: 'Require Ordersheet document ready' },
    { value: 'JUDGEMENT_READY', label: 'Require Judgement document ready' }
  ] as const,
  /** Digital signature required only when finalizing (not for drafting). Add to the transition that finalizes. */
  documentSigned: [
    { value: 'NOTICE_SIGNED', label: 'Require Notice signed before finalize (not for draft)' },
    { value: 'ORDERSHEET_SIGNED', label: 'Require Ordersheet signed before finalize (not for draft)' },
    { value: 'JUDGEMENT_SIGNED', label: 'Require Judgement signed before finalize (not for draft)' }
  ] as const
};

/** Module types for form field conditions. */
export const MODULE_TYPES: { value: ModuleType; label: string }[] = [
  { value: 'HEARING', label: 'Hearing' },
  { value: 'NOTICE', label: 'Notice' },
  { value: 'ORDERSHEET', label: 'Ordersheet' },
  { value: 'JUDGEMENT', label: 'Judgement' }
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
  ]
};
