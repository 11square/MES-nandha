/**
 * Reusable Confirm & Prompt dialogs.
 *
 * Usage (Confirm):
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete Item"
 *     description="Are you sure you want to delete this item? This action cannot be undone."
 *     confirmLabel="Delete"
 *     cancelLabel="Cancel"
 *     variant="danger"          // "danger" | "default"
 *     onConfirm={() => { ... }}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 *
 * Usage (Prompt):
 *   <PromptDialog
 *     open={showPrompt}
 *     title="Enter Reason"
 *     description="Please provide a reason for rejection."
 *     placeholder="Type here..."
 *     confirmLabel="Submit"
 *     onConfirm={(value) => { ... }}
 *     onCancel={() => setShowPrompt(false)}
 *   />
 */

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';

// ── Confirm Dialog ─────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = 'Confirm',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Prompt Dialog ──────────────────────────────────────────────────
interface PromptDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title = 'Input Required',
  description,
  placeholder = '',
  confirmLabel = 'Submit',
  cancelLabel = 'Cancel',
  required = true,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (required && !trimmed) {
      setError('This field is required');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <div className="py-2">
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder={placeholder}
            className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
