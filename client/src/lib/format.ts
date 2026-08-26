export function formatCurrency(amount: number, symbol = '₹'): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('en-IN');
  return `${symbol}${formatted}`;
}

export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODateString(new Date());
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const parts = date.split('-');
  let d: Date;
  if (parts.length === 3) {
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(date: string | null | undefined): string {
  if (!date) return '—';
  const parts = date.split('-');
  let d: Date;
  if (parts.length === 3) {
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${period}`;
}

export function daysFromNow(date: string | null | undefined): number {
  if (!date) return Infinity;
  const d = new Date(date);
  if (isNaN(d.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function relativeDay(date: string | null | undefined): string {
  const n = daysFromNow(date);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0) return `${Math.abs(n)} days ago`;
  return `in ${n} days`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}



export function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
