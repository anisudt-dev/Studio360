import type { BookingStatus, ProjectStatus, PaymentMode } from './types';
import type { Booking } from './types';

export const EVENT_TYPES = [
  'Wedding',
  'Reception',
  'Engagement',
  'Pre-Wedding',
  'Birthday',
  'Baby Shoot',
  'Maternity',
  'Corporate',
  'Other',
] as const;

export const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];

export const BOOKING_STATUSES: BookingStatus[] = ['enquiry', 'quoted', 'confirmed', 'cancelled'];

export const PROJECT_STATUSES: ProjectStatus[] = [
  'confirmed',
  'shooting',
  'editing',
  'delivered',
];

export const PROJECT_FLOW: ProjectStatus[] = [
  'confirmed',
  'shooting',
  'editing',
  'delivered',
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'bookings', label: 'Bookings', icon: 'CalendarCheck' },
  { id: 'customers', label: 'Customers', icon: 'Users' },
  { id: 'calendar', label: 'Calendar', icon: 'CalendarDays' },
  { id: 'payments', label: 'Payments', icon: 'Wallet' },
  { id: 'reports', label: 'Reports', icon: 'BarChart3' },
] as const;

export const MOBILE_NAV = [
  { id: 'dashboard', label: 'Home', icon: 'Home' },
  { id: 'bookings', label: 'Bookings', icon: 'CalendarCheck' },
  { id: 'customers', label: 'Customers', icon: 'Users' },
  { id: 'payments', label: 'Payments', icon: 'Wallet' },
  { id: 'more', label: 'More', icon: 'Menu' },
] as const;

export const MORE_NAV = [
  { id: 'calendar', label: 'Calendar', icon: 'CalendarDays' },
  { id: 'deliverables', label: 'Deliverables', icon: 'Package' },
  { id: 'invoices', label: 'Invoices', icon: 'FileText' },
  { id: 'reports', label: 'Reports', icon: 'BarChart3' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
] as const;

interface StatusStyle {
  label: string;
  dot: string;
  badge: string;
}

export const BOOKING_STATUS_STYLE: Record<BookingStatus, StatusStyle> = {
  enquiry: { label: 'Enquiry', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' },
  quoted: { label: 'Quoted', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600' },
  confirmed: { label: 'Confirmed', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-400', badge: 'bg-red-50 text-red-600' },
};

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, StatusStyle> = {
  confirmed: { label: 'Confirmed', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700' },
  shooting: { label: 'Shooting', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  editing: { label: 'Editing', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700' },
  delivered: { label: 'Delivered', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
};

export function paymentStatus(
  balance: number,
  eventDate: string | null,
): 'paid' | 'partial' | 'due' | 'overdue' {
  if (balance <= 0) return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (eventDate) {
    const d = new Date(eventDate);
    d.setHours(0, 0, 0, 0);
    if (d < today) return 'overdue';
  }
  const week = new Date(today);
  week.setDate(week.getDate() + 7);
  if (eventDate) {
    const d = new Date(eventDate);
    d.setHours(0, 0, 0, 0);
    if (d <= week) return 'due';
  }
  return 'partial';
}

export const PAYMENT_STATUS_STYLE: Record<string, StatusStyle> = {
  paid: { label: 'Paid', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Partially Paid', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  due: { label: 'Due Soon', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
  overdue: { label: 'Overdue', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700' },
};

export function nextAction(booking: Pick<Booking, 'balance' | 'project_status' | 'event_date' | 'paid_amount'>): { label: string; type: 'payment' | 'work' } {
  if (booking.balance > 0 && booking.paid_amount === 0) {
    return { label: `Next payment · ${formatCurrencyShort(booking.balance)} advance`, type: 'payment' };
  }
  if (booking.balance > 0 && booking.project_status === 'delivered') {
    return { label: `Next payment · ${formatCurrencyShort(booking.balance)} balance`, type: 'payment' };
  }
  if (booking.balance > 0 && booking.event_date) {
    const d = new Date(booking.event_date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      return { label: `Next payment · ${formatCurrencyShort(booking.balance)} balance`, type: 'payment' };
    }
  }
  switch (booking.project_status) {
    case 'confirmed':
      return { label: 'Ready to shoot', type: 'work' };
    case 'shooting':
      return { label: 'Start editing', type: 'work' };
    case 'editing':
      return { label: 'Deliver to client', type: 'work' };
    case 'delivered':
      if (booking.balance > 0) return { label: `Next payment · ${formatCurrencyShort(booking.balance)} balance`, type: 'payment' };
      return { label: 'All complete ✨', type: 'work' };
    default:
      return { label: 'All done', type: 'work' };
  }
}

function formatCurrencyShort(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
