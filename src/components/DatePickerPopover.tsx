'use client';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/src/style.css';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

/** Format YYYY-MM-DD to Date (noon UTC to avoid TZ issues). */
function parseValue(value: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(value + 'T12:00:00.000Z');
  return isNaN(d.getTime()) ? undefined : d;
}

/** Format Date to YYYY-MM-DD. */
function formatValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DatePickerPopoverProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Trigger: either a render prop (open, onClick) or default button. */
  children?: (props: { open: boolean; onClick: () => void }) => React.ReactNode;
  /** Optional clear handler; if provided, show clear when value is set. */
  onClear?: () => void;
  /** Use full-width input style trigger instead of button. */
  inputStyle?: boolean;
  /** Id for the trigger (accessibility). */
  id?: string;
  /** Compact styling. */
  compact?: boolean;
}

export default function DatePickerPopover({
  value,
  onChange,
  placeholder = 'Choose date',
  children,
  onClear,
  inputStyle,
  id,
  compact,
}: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseValue(value);

  useLayoutEffect(() => {
    if (!open || !containerRef.current || typeof document === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 8;
    const calendarWidth = 280;
    const calendarHeight = 320;
    let left = rect.left;
    const top = rect.bottom + padding;
    if (left + calendarWidth > window.innerWidth - padding) {
      left = window.innerWidth - calendarWidth - padding;
    }
    if (left < padding) left = padding;
    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatValue(date));
      setOpen(false);
    }
  };

  const displayLabel = value ? (() => {
    try {
      return new Date(value + 'T12:00:00.000Z').toLocaleDateString(undefined, {
        weekday: undefined,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  })() : placeholder;

  const triggerClassName = inputStyle
    ? 'flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 text-left'
    : compact
      ? 'cursor-pointer flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0'
      : 'cursor-pointer flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {children ? (
        children({
          open,
          onClick: () => setOpen((o) => !o),
        })
      ) : (
        <>
          <button
            type="button"
            id={id}
            onClick={() => setOpen((o) => !o)}
            className={triggerClassName}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={value ? `Due date: ${displayLabel}` : placeholder}
          >
            <Calendar className={compact ? 'h-3.5 w-3.5 shrink-0 text-muted-foreground' : 'h-4 w-4 shrink-0 text-muted-foreground'} aria-hidden="true" />
            <span className={!value ? 'text-muted-foreground' : undefined}>{displayLabel}</span>
          </button>
          {onClear && value && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onClear();
              }}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear date"
            >
              <span className="text-sm leading-none">×</span>
            </button>
          )}
        </>
      )}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[100] rounded-xl border border-border bg-popover p-3 shadow-lg calendar-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Calendar"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              defaultMonth={selectedDate ?? new Date()}
              classNames={{
                root: 'rdp-custom',
                month: 'space-y-3',
                month_caption: 'flex justify-between items-center px-1',
                caption_label: 'text-sm font-medium text-foreground',
                nav: 'flex items-center gap-1',
                button_previous: 'inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground',
                button_next: 'inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground',
                weekdays: 'flex',
                weekday: 'text-muted-foreground text-xs font-medium w-9 text-center',
                week: 'flex',
                day: 'w-9 h-9 p-0',
                day_button:
                  'h-9 w-9 rounded-md text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
                selected:
                  'bg-primary [&>button]:!bg-primary [&>button]:!text-white [&>button]:!border-0 [&>button]:font-semibold [&>button]:hover:!bg-primary [&>button]:hover:!text-white',
                today: 'font-semibold text-primary',
                outside: 'text-muted-foreground/50',
                disabled: 'opacity-40 cursor-not-allowed',
                hidden: 'invisible',
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
