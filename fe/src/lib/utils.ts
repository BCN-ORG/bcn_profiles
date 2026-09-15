import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function initials(name?: string) {
  return (name || 'BCN')
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatDate(value?: string, locale = 'vi') {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
}
