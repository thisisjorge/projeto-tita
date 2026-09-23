import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function AnchoredMenu({
  label,
  trigger = '⋯',
  className = '',
  children,
  listbox = false,
  disabled = false,
}: {
  label: string;
  trigger?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  listbox?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = (restore = false) => {
    setOpen(false);
    if (restore) anchor.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open || !panel.current || !anchor.current) return;
    const position = () => {
      const node = panel.current;
      const button = anchor.current;
      if (!node || !button) return;
      const viewport = window.visualViewport;
      const width = viewport?.width ?? innerWidth;
      const height = viewport?.height ?? innerHeight;
      const x = viewport?.offsetLeft ?? 0;
      const y = viewport?.offsetTop ?? 0;
      const edge = 12;
      node.style.maxWidth = `${width - edge * 2}px`;
      node.style.maxHeight = `${height - edge * 2}px`;
      const a = button.getBoundingClientRect();
      const b = node.getBoundingClientRect();
      node.style.left = `${Math.max(x + edge, Math.min(a.right - b.width, x + width - b.width - edge))}px`;
      const below = a.bottom + 4;
      const top = below + b.height <= y + height - edge ? below : a.top - b.height - 4;
      node.style.top = `${Math.max(y + edge, Math.min(top, y + height - b.height - edge))}px`;
    };
    position();
    const selected = panel.current.querySelector<HTMLElement>('[aria-selected="true"]');
    (selected ?? panel.current.querySelector<HTMLElement>('button:not(:disabled)'))?.focus();
    const outside = (event: Event) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !anchor.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        anchor.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open]);
  return (
    <details className={`tita-anchored-menu ${className}`} open={open}>
      <summary
        ref={anchor}
        aria-label={label}
        aria-haspopup={listbox ? 'listbox' : 'dialog'}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-disabled={disabled || undefined}
        onClick={(event) => {
          event.preventDefault();
          if (!disabled) setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            if (!disabled) setOpen(true);
          }
        }}
      >
        {trigger}
      </summary>
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panel}
            id={id}
            hidden={!open}
            className="tita-anchored-menu__panel"
            role={open ? (listbox ? 'listbox' : 'dialog') : undefined}
            aria-label={label}
            onClick={(event) => {
              if (
                event.currentTarget.contains(event.target as Node) &&
                (event.target as HTMLElement).closest('button')
              )
                close(true);
            }}
            onKeyDown={(event) => {
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
              );
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
              if (direction || event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                items[
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : (index + direction + items.length) % items.length
                ]?.focus();
              }
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </details>
  );
}
