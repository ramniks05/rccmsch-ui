/**
 * Conditional logic evaluation for form builder (show/hide, required-if).
 * @see FORM_BUILDER_FRONTEND_GUIDE.md
 */

import {
  ConditionalLogic,
  ConditionalRule,
  FormData,
  FormFieldDefinition,
} from '../models/form-builder.types';

/** Field-like shape used by module forms (options, conditionalLogic string) */
export interface FieldWithConditionalLogic {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired?: boolean;
  conditionalLogic?: string | null;
  requiredCondition?: string | null;
  [key: string]: unknown;
}

function parseJson<T>(json: string | null | undefined): T | null {
  if (json == null || String(json).trim() === '') return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function parseConditionalLogic(logicJson: string | null | undefined): ConditionalLogic | null {
  return parseJson<ConditionalLogic>(logicJson ?? '');
}

function evaluateRule(rule: ConditionalRule, formData: FormData): boolean {
  const fieldValue = formData[rule.field];

  switch (rule.operator) {
    case 'equals':
      return fieldValue == rule.value;
    case 'notEquals':
      return fieldValue != rule.value;
    case 'in':
      return Array.isArray(rule.values) && rule.values.includes(fieldValue);
    case 'notIn':
      return Array.isArray(rule.values) && !rule.values.includes(fieldValue);
    case 'contains':
      return String(fieldValue ?? '').includes(String(rule.value ?? ''));
    case 'isEmpty':
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case 'isNotEmpty':
      return !(
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return false;
  }
}

function evaluateCondition(
  condition: ConditionalRule | { all?: ConditionalRule[]; any?: ConditionalRule[] },
  formData: FormData
): boolean {
  if (condition && 'field' in condition && (condition as ConditionalRule).field) {
    return evaluateRule(condition as ConditionalRule, formData);
  }
  const obj = condition as { all?: ConditionalRule[]; any?: ConditionalRule[] };
  if (obj.all?.length) {
    return obj.all.every((r) => evaluateRule(r, formData));
  }
  if (obj.any?.length) {
    return obj.any.some((r) => evaluateRule(r, formData));
  }
  return true;
}

/**
 * Check if field should be visible based on conditionalLogic.showIf.
 */
export function isFieldVisible(
  field: FormFieldDefinition | FieldWithConditionalLogic,
  formData: FormData
): boolean {
  const logic = parseConditionalLogic(
    (field as FormFieldDefinition).conditionalLogic ??
    (field as FieldWithConditionalLogic).conditionalLogic
  );
  if (!logic?.showIf) return true;
  return evaluateCondition(logic.showIf, formData);
}

/**
 * Check if field is required (always required or conditionally required via requiredIf/requiredCondition).
 */
export function isFieldRequired(
  field: FormFieldDefinition | FieldWithConditionalLogic,
  formData: FormData
): boolean {
  if (field.isRequired) return true;
  const logic = parseConditionalLogic(
    (field as FormFieldDefinition).conditionalLogic ??
    (field as FieldWithConditionalLogic).conditionalLogic
  );
  const requiredCond = parseConditionalLogic(
    (field as FormFieldDefinition).requiredCondition ??
    (field as FieldWithConditionalLogic).requiredCondition as string
  );
  const cond = logic?.requiredIf ?? requiredCond?.requiredIf ?? requiredCond?.showIf;
  if (!cond) return false;
  return evaluateCondition(cond, formData);
}

/**
 * Return only fields that are visible given current formData.
 */
export function getVisibleFields(
  fields: (FormFieldDefinition | FieldWithConditionalLogic)[],
  formData: FormData
): (FormFieldDefinition | FieldWithConditionalLogic)[] {
  return fields.filter((f) => isFieldVisible(f, formData));
}
