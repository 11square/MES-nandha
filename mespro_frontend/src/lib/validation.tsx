/**
 * Centralized form validation utilities for MES Pro.
 *
 * Usage:
 *   const errors = validateFields(formData, {
 *     name:  { required: true, min: 2, max: 100 },
 *     email: { required: true, email: true },
 *     phone: { required: true, phone: true },
 *     qty:   { required: true, min: 1, max: 99999, numeric: true },
 *   });
 *
 *   if (Object.keys(errors).length) { setErrors(errors); return; }
 */

// ── rule specification ─────────────────────────────────────────────
export interface FieldRule {
  /** Field must have a non-empty (trimmed) value */
  required?: boolean;
  /** Label shown in error messages (defaults to the field key) */
  label?: string;
  /** Minimum length (string) or minimum value (number when `numeric` is true) */
  min?: number;
  /** Maximum length (string) or maximum value (number when `numeric` is true) */
  max?: number;
  /** Must be a valid email address */
  email?: boolean;
  /** Must be a 10-digit phone number */
  phone?: boolean;
  /** Must be a valid number (rejects e, +, - for positive-only numbers) */
  numeric?: boolean;
  /** Custom validator – return an error string or empty/undefined if valid */
  custom?: (value: string) => string | undefined;
}

export type ValidationRules = Record<string, FieldRule>;
export type ValidationErrors = Record<string, string>;

// ── helpers ────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;

/** Returns a human-friendly label for a field key */
function labelFor(key: string, rule: FieldRule): string {
  if (rule.label) return rule.label;
  // "vendor_name" → "Vendor Name"
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── main validator ─────────────────────────────────────────────────
/**
 * Validate a flat object of form values against the provided rules.
 * Returns an object mapping field keys → error messages (empty = valid).
 */
export function validateFields(
  data: Record<string, any>,
  rules: ValidationRules,
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [key, rule] of Object.entries(rules)) {
    const raw = data[key];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    const label = labelFor(key, rule);

    // Required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[key] = `${label} is required`;
      continue; // skip further checks – value is empty
    }

    // If value is empty and not required, skip remaining rules
    if (value === undefined || value === null || value === '') continue;

    const strValue = String(value);

    // Email
    if (rule.email && !EMAIL_RE.test(strValue)) {
      errors[key] = 'Enter a valid email address';
      continue;
    }

    // Phone (exactly 10 digits)
    if (rule.phone && !PHONE_RE.test(strValue.replace(/\s/g, ''))) {
      errors[key] = 'Phone number must be exactly 10 digits';
      continue;
    }

    // Numeric
    if (rule.numeric) {
      const num = Number(strValue);
      if (isNaN(num)) {
        errors[key] = `${label} must be a valid number`;
        continue;
      }
      if (rule.min !== undefined && num < rule.min) {
        errors[key] = `${label} must be at least ${rule.min}`;
        continue;
      }
      if (rule.max !== undefined && num > rule.max) {
        errors[key] = `${label} must be at most ${rule.max}`;
        continue;
      }
    } else {
      // String length checks
      if (rule.min !== undefined && strValue.length < rule.min) {
        errors[key] = `${label} must be at least ${rule.min} characters`;
        continue;
      }
      if (rule.max !== undefined && strValue.length > rule.max) {
        errors[key] = `${label} must be at most ${rule.max} characters`;
        continue;
      }
    }

    // Custom
    if (rule.custom) {
      const msg = rule.custom(strValue);
      if (msg) {
        errors[key] = msg;
      }
    }
  }

  return errors;
}

// ── single-field validator (for onChange live validation) ───────────
/**
 * Validate a single field value. Returns the error message or empty string.
 */
export function validateField(
  key: string,
  value: any,
  rule: FieldRule,
): string {
  const errs = validateFields({ [key]: value }, { [key]: rule });
  return errs[key] || '';
}

// ── block 'e', 'E', '+', '-' on number inputs ─────────────────────
/**
 * Attach to a number <input>'s onKeyDown to block scientific notation chars.
 */
export function blockInvalidNumberKeys(e: React.KeyboardEvent<HTMLInputElement>) {
  if (['e', 'E', '+', '-'].includes(e.key)) {
    e.preventDefault();
  }
}

// ── Inline error component ─────────────────────────────────────────
// Provide a tiny helper so every file doesn't need to write its own.
// Usage: {errors.name && <FieldError message={errors.name} />}
import React from 'react';
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 mt-1">{message}</p>
  );
}
