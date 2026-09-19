'use client';

import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { adminUserService, type UserSearchHit } from '@/services';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (userId: string, user?: UserSearchHit | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyHint?: string;
  className?: string;
};

function labelOf(user: UserSearchHit) {
  return user.fullName?.trim() || user.email;
}

export function UserSearchPicker({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  emptyHint,
  className,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserSearchHit | null>(null);

  useEffect(() => {
    if (!value) setSelected(null);
  }, [value]);

  const search = useQuery({
    queryKey: ['admin', 'users', 'search', query],
    queryFn: () => adminUserService.search(query),
    enabled: query.trim().length >= 2 && !selected,
  });

  function pick(user: UserSearchHit) {
    setSelected(user);
    setQuery('');
    setOpen(false);
    onChange(user.id, user);
  }

  function clear() {
    setSelected(null);
    setQuery('');
    onChange('', null);
  }

  return (
    <div className={cn('relative min-w-0 flex-1 space-y-2', className)}>
      <Label htmlFor={inputId}>{label}</Label>
      {selected ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{labelOf(selected)}</p>
            {selected.fullName ? (
              <p className="truncate text-xs text-muted-foreground">
                {selected.email}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            onClick={clear}
            aria-label="Clear"
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
      ) : (
        <>
          <Input
            id={inputId}
            value={query}
            disabled={disabled}
            required={required && !value}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Allow click on result before closing.
              window.setTimeout(() => setOpen(false), 120);
            }}
          />
          {open && query.trim().length >= 2 ? (
            <ul
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card shadow-md"
              role="listbox"
            >
              {search.isLoading ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">…</li>
              ) : (search.data ?? []).length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyHint || '—'}
                </li>
              ) : (
                (search.data ?? []).map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(user)}
                    >
                      <span className="font-medium">{labelOf(user)}</span>
                      {user.fullName ? (
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </>
      )}
      <input type="hidden" value={value} required={required} readOnly />
    </div>
  );
}
