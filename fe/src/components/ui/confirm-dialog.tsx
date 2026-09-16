'use client';

import { useState, type ReactNode } from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  onConfirm: () => unknown | Promise<unknown>;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      const succeeded = await onConfirm();
      if (succeeded !== false) setOpen(false);
    } catch {
      // The caller owns error feedback; keep the dialog open for retry.
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
    >
      <AlertDialogPrimitive.Trigger asChild>
        {trigger}
      </AlertDialogPrimitive.Trigger>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <div className="flex gap-4 p-5 sm:p-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/15">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <AlertDialogPrimitive.Title className="text-base font-semibold tracking-tight">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 p-4 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => void confirm()}
            >
              {pending ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : null}
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
