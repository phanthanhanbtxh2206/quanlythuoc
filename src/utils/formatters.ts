/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  const hasDecimals = Math.abs(amount % 1) > 0.0001;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: hasDecimals ? 4 : 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  const hasDecimals = Math.abs(value % 1) > 0.0001;
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: hasDecimals ? 4 : 0,
  }).format(value);
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateString;
  }
}

export function getTodayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysUntilExpiry(expiryDateStr: string): number {
  if (!expiryDateStr) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expiryDateStr: string): {
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
  label: string;
  days: number;
} {
  const days = getDaysUntilExpiry(expiryDateStr);
  if (days < 0) {
    return { status: 'EXPIRED', label: 'Đã hết hạn', days };
  } else if (days <= 30) {
    return { status: 'CRITICAL', label: `Cận hạn (${days} ngày)`, days };
  } else if (days <= 90) {
    return { status: 'WARNING', label: `Sắp hết hạn (${days} ngày)`, days };
  }
  return { status: 'GOOD', label: `Còn ${days} ngày`, days };
}
