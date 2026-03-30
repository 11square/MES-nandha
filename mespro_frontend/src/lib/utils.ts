import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes (used by shadcn/ui components)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared utility functions

/**
 * Format a number as Indian Rupees currency
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Format a date string for display
 */
export const formatDate = (date: string | Date, locale: string = 'en-IN'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date string as short format (DD/MM/YYYY)
 */
export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN');
};

/**
 * Get CSS classes for status badges
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    // Lead statuses
    'New': 'bg-blue-100 text-blue-700',
    'Contacted': 'bg-amber-100 text-amber-700',
    'Qualified': 'bg-purple-100 text-purple-700',
    'Converted': 'bg-green-100 text-green-700',
    'Rejected': 'bg-red-100 text-red-700',
    // Order statuses
    'Pending': 'bg-yellow-100 text-yellow-700',
    'In Production': 'bg-blue-100 text-blue-700',
    'Bill': 'bg-purple-100 text-purple-700',
    'Cancelled': 'bg-red-100 text-red-700',
    'Completed': 'bg-green-100 text-green-700',
    // Payment statuses
    'Paid': 'bg-green-100 text-green-700',
    'Partial': 'bg-amber-100 text-amber-700',
    'Unpaid': 'bg-red-100 text-red-700',
    'Overdue': 'bg-red-100 text-red-700',
    // Stock statuses
    'In Stock': 'bg-green-100 text-green-700',
    'Low Stock': 'bg-yellow-100 text-yellow-700',
    'Critical': 'bg-red-100 text-red-700',
    'Out of Stock': 'bg-gray-100 text-gray-700',
    // Dispatch statuses
    'Delivered': 'bg-green-100 text-green-700',
    'In Transit': 'bg-blue-100 text-blue-700',
    'Dispatched': 'bg-blue-100 text-blue-700',
    // Staff statuses
    'Active': 'bg-emerald-100 text-emerald-700',
    'On Leave': 'bg-amber-100 text-amber-700',
    'Inactive': 'bg-gray-100 text-gray-700',
    // PO statuses
    'Approved': 'bg-green-100 text-green-700',
    'Ordered': 'bg-blue-100 text-blue-700',
    'Received': 'bg-emerald-100 text-emerald-700',
    'Pending Approval': 'bg-yellow-100 text-yellow-700',
    // Reconciliation
    'Matched': 'bg-green-100 text-green-700',
    'Partial Received': 'bg-amber-100 text-amber-700',
    'Pending GRN': 'bg-red-100 text-red-700',
    // General
    'Processing': 'bg-blue-100 text-blue-700',
    'Draft': 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

/**
 * Get CSS classes for conversion status badges
 */
export const getConversionStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'None': 'bg-gray-100 text-gray-600 border border-gray-300',
    'Converted': 'bg-green-100 text-green-700 border border-green-300',
    'Not Converted': 'bg-red-100 text-red-700 border border-red-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-600 border border-gray-300';
};

/**
 * Get CSS classes for priority badges
 */
export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'High': 'bg-red-100 text-red-700',
    'Medium': 'bg-amber-100 text-amber-700',
    'Low': 'bg-slate-100 text-slate-700',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
};

/**
 * Get payment status indicator icon/color
 */
export const getPaymentStatusStyle = (status: string): { bg: string; text: string; dot: string } => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'completed':
      return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
    case 'partial':
      return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'pending':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' };
    case 'overdue':
      return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
};

// ── B2B / B2C Customer Type Helpers ──────────────────────────
// Rule: GST number present → B2B, absent → B2C

/**
 * Check whether a GST value is present (non-null, non-empty).
 */
export function hasGst(gst: string | null | undefined): boolean {
  return typeof gst === 'string' && gst.trim().length > 0;
}

/**
 * Get the customer type label for a record based on its GST value.
 */
export function getCustomerType(gst: string | null | undefined): 'B2B' | 'B2C' {
  return hasGst(gst) ? 'B2B' : 'B2C';
}

/**
 * Returns true when the record is B2B (has a GST number).
 */
export function isB2B(gst: string | null | undefined): boolean {
  return hasGst(gst);
}

/**
 * Returns true when the record is B2C (no GST number).
 */
export function isB2C(gst: string | null | undefined): boolean {
  return !hasGst(gst);
}
