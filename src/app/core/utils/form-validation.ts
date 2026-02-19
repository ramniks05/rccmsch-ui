/**
 * Form validation for generic form builder (including REPEATABLE_SECTION, DYNAMIC_FILES).
 * @see FORM_BUILDER_FRONTEND_GUIDE.md
 */

import {
  FormData,
  FormFieldDefinition,
  ItemSchemaField,
  FileItem,
} from '../models/form-builder.types';
import { isFieldRequired, getVisibleFields } from './conditional-logic';
import type { FieldWithConditionalLogic } from './conditional-logic';

export type ValidationErrors = Record<string, string>;

function parseValidationRules(rulesJson: string | null | undefined): Record<string, unknown> {
  if (!rulesJson?.trim()) return {};
  try {
    return JSON.parse(rulesJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseItemSchema(schemaJson: string | null | undefined): ItemSchemaField[] {
  if (!schemaJson?.trim()) return [];
  try {
    return JSON.parse(schemaJson) as ItemSchemaField[];
  } catch {
    return [];
  }
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function validateText(value: unknown, rules: Record<string, unknown>): string | null {
  const str = String(value ?? '');
  const minLength = rules['minLength'] as number | undefined;
  const maxLength = rules['maxLength'] as number | undefined;
  const pattern = rules['pattern'] as string | undefined;
  if (minLength != null && str.length < minLength) {
    return `Minimum ${minLength} characters`;
  }
  if (maxLength != null && str.length > maxLength) {
    return `Maximum ${maxLength} characters`;
  }
  if (pattern && !new RegExp(pattern).test(str)) {
    return 'Invalid format';
  }
  return null;
}

function validateNumber(value: unknown, rules: Record<string, unknown>): string | null {
  const num = Number(value);
  if (isNaN(num)) return 'Must be a number';
  const min = rules['min'] as number | undefined;
  const max = rules['max'] as number | undefined;
  if (min != null && num < min) return `Minimum value is ${min}`;
  if (max != null && num > max) return `Maximum value is ${max}`;
  return null;
}

function validateDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return 'Invalid date';
  return null;
}

/** Validate a single field (used for top-level and for item-schema sub-fields) */
function validateFieldInternal(
  field: FormFieldDefinition | (ItemSchemaField & { isRequired?: boolean }),
  value: unknown,
  formData?: FormData
): string | null {
  const required = formData != null ? isFieldRequired(field as FormFieldDefinition, formData) : (field.isRequired ?? false);
  if (isEmpty(value)) {
    if (required) return `${field.fieldLabel} is required`;
    return null;
  }

  const rules = parseValidationRules(
    (field as FormFieldDefinition).validationRules ?? ''
  );

  switch (field.fieldType) {
    case 'TEXT':
    case 'TEXTAREA':
    case 'RICH_TEXT':
      return validateText(value, rules);
    case 'NUMBER':
      return validateNumber(value, rules);
    case 'DATE':
    case 'DATETIME':
      return validateDate(value);
    case 'SELECT':
    case 'RADIO':
      return null;
    case 'MULTISELECT':
      return Array.isArray(value) ? null : 'Invalid selection';
    case 'REPEATABLE_SECTION': {
      const itemSchema = parseItemSchema((field as FormFieldDefinition).itemSchema ?? '');
      if (!Array.isArray(value)) return 'Invalid format';
      const minItems = (rules['minItems'] as number) ?? 0;
      const maxItems = (rules['maxItems'] as number) ?? 100;
      if (value.length < minItems) return `Minimum ${minItems} item(s) required`;
      if (value.length > maxItems) return `Maximum ${maxItems} item(s) allowed`;
      for (let i = 0; i < value.length; i++) {
        const item = value[i] as Record<string, unknown>;
        for (const subField of itemSchema) {
          const subValue = item[subField.fieldName];
          const err = validateFieldInternal(
            { ...subField, isRequired: subField.isRequired ?? false },
            subValue
          );
          if (err) return `Row ${i + 1}: ${err}`;
        }
      }
      return null;
    }
    case 'DYNAMIC_FILES': {
      if (!Array.isArray(value)) return 'Invalid format';
      const maxFiles = (rules['maxFiles'] as number) ?? 10;
      const maxSizePerFile = (rules['maxSizePerFile'] as number) ?? 10 * 1024 * 1024;
      if (value.length > maxFiles) return `Maximum ${maxFiles} files allowed`;
      for (const f of value as FileItem[]) {
        if (f?.fileSize > maxSizePerFile) return `File ${f?.fileName ?? '?'} exceeds size limit`;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Validate a single field (for use in forms).
 */
export function validateField(
  field: FormFieldDefinition | FieldWithConditionalLogic,
  value: unknown,
  formData?: FormData
): string | null {
  return validateFieldInternal(
    field as FormFieldDefinition,
    value,
    formData ?? {}
  );
}

/**
 * Validate entire form data against visible fields.
 */
export function validateFormData(
  fields: (FormFieldDefinition | FieldWithConditionalLogic)[],
  formData: FormData
): ValidationErrors {
  const errors: ValidationErrors = {};
  const visibleFields = getVisibleFields(fields, formData);

  for (const field of visibleFields) {
    const value = formData[field.fieldName];
    const err = validateField(field, value, formData);
    if (err) errors[field.fieldName] = err;
  }

  return errors;
}
