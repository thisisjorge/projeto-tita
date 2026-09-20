import React, { useEffect, useRef, useId } from 'react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const rawId = useId();
  const titleId = `tita-sheet-title-${rawId.replace(/:/g, '')}`;

  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element that was active before opening
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move initial focus to first focusable element
    const focusTimer = setTimeout(() => {
      if (sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          sheetRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = Array.from(
          sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
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
            !sheetRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !sheetRef.current.contains(document.activeElement)
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
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
      }}
      className={`tita-bottom-sheet-backdrop ${className}`.trim()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="tita-bottom-sheet"
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          backgroundColor: 'var(--tita-surface)',
          borderTopLeftRadius: 'var(--tita-radius-xl)',
          borderTopRightRadius: 'var(--tita-radius-xl)',
          border: '1px solid var(--tita-border)',
          borderBottom: 'none',
          padding: 'var(--tita-space-4)',
          paddingBottom: 'calc(var(--tita-space-6) + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-4)',
          overflowY: 'auto',
          animation: 'slideUp 0.2s ease-out',
          outline: 'none',
        }}
      >
        {/* Drag Handle Indicator */}
        <div
          className="tita-bottom-sheet__handle"
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--tita-border)',
            borderRadius: 'var(--tita-radius-full)',
            margin: '0 auto',
          }}
          aria-hidden="true"
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            id={titleId}
            style={{
              fontSize: 'var(--tita-text-lg)',
              fontWeight: 'var(--tita-weight-bold)',
              color: 'var(--tita-text)',
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            style={{
              width: 'var(--tita-touch-min)',
              height: 'var(--tita-touch-min)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tita-text-muted)',
              fontSize: '18px',
              cursor: 'pointer',
              borderRadius: 'var(--tita-radius-sm)',
            }}
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
