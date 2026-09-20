import React, { useEffect, useRef, useId } from 'react';
import { Button } from './Button.js';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const rawId = useId();
  const titleId = `tita-dialog-title-${rawId.replace(/:/g, '')}`;
  const descId = `tita-dialog-desc-${rawId.replace(/:/g, '')}`;

  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element that was active before opening
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move initial focus to first focusable element
    const focusTimer = setTimeout(() => {
      if (dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;

      // Restore focus to the trigger element
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        const trigger = previousActiveElement.current;
        const target = trigger.getClientRects().length
          ? trigger
          : trigger.closest('details')?.querySelector('summary');
        if (target instanceof HTMLElement) target.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--tita-space-4)',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(2px)',
        overflowY: 'auto',
      }}
      className={`tita-dialog-backdrop ${className}`.trim()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="tita-dialog"
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: 'min(90vh, 850px)',
          overflowY: 'auto',
          backgroundColor: 'var(--tita-surface)',
          border: '1px solid var(--tita-border)',
          borderRadius: 'var(--tita-radius-lg)',
          padding: 'var(--tita-space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-4)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2
              id={titleId}
              style={{
                fontSize: 'var(--tita-text-xl)',
                fontWeight: 'var(--tita-weight-bold)',
                color: 'var(--tita-text)',
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                id={descId}
                style={{
                  fontSize: 'var(--tita-text-sm)',
                  color: 'var(--tita-text-muted)',
                  marginTop: 'var(--tita-space-1)',
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            style={{
              width: 'var(--tita-touch-min)',
              height: 'var(--tita-touch-min)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tita-text-muted)',
              fontSize: '20px',
              cursor: 'pointer',
              borderRadius: 'var(--tita-radius-sm)',
            }}
          >
            ✕
          </button>
        </div>

        <div>{children}</div>

        {footer ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--tita-space-2)' }}>
            {footer}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
