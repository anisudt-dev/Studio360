import { useState, useEffect } from 'react';
import { Printer, X, CheckCircle2, Calendar, MapPin, Clock, Package, MessageCircle, Wallet, Users } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { BookingWithCustomer, Settings } from '@/lib/types';

const CURRENCY = '₹';

interface BookingVoucherModalProps {
  booking: BookingWithCustomer;
  onClose: () => void;
}

export function BookingVoucherModal({ booking, onClose }: BookingVoucherModalProps) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => null);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const studioName = settings?.studio_name && settings.studio_name !== 'Studio ERP' ? settings.studio_name : 'Aishwarya Videos & Photos';
  const logoUrl = settings?.logo_url || '/logo.svg';
  const studioPhone = settings?.phone || '';
  const studioEmail = settings?.email || '';
  const studioAddress = settings?.address || '';

  const customer = booking.customer;
  const voucherNo = `SHOOT-${booking.id.slice(0, 8).toUpperCase()}`;
  const isFullyPaid = booking.balance <= 0;

  function handlePrint() {
    const originalTitle = document.title;
    document.title = `${studioName} - Shoot Order - ${booking.title || customer?.name || 'Booking'}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }

  function handleWhatsAppShare() {
    if (!customer?.mobile) {
      toast('Customer mobile number is missing', 'error');
      return;
    }
    const cleanNum = customer.mobile.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hello ${customer.name}, Shoot Order ${voucherNo} confirmed for ${booking.event_type} on ${formatDate(booking.event_date)}. Total Value: ${formatCurrency(booking.total_amount, CURRENCY)}. Venue: ${booking.venue || 'Studio'}. Thank you! - ${studioName}`
    );
    window.open(`https://wa.me/${cleanNum.length === 10 ? '91' + cleanNum : cleanNum}?text=${msg}`, '_blank');
  }

  return (
    <div
      className="print-modal fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-gray-900/70 backdrop-blur-xs overflow-hidden"
      onClick={onClose}
    >
      <div
        className="print-modal-content relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Sticky Action Header (Always visible, hidden during print) */}
        <div className="sticky top-0 z-30 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between no-print bg-white/95 backdrop-blur-md shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 leading-tight">Shoot Order Voucher</h3>
              <p className="text-[11px] font-mono text-gray-500">{voucherNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {customer?.mobile && (
              <button
                onClick={handleWhatsAppShare}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Send Shoot Voucher on WhatsApp"
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
            )}
            <Button size="sm" onClick={handlePrint} className="bg-gray-900 hover:bg-black text-white font-bold">
              <Printer size={14} /> Print Voucher
            </Button>
            <button
              onClick={onClose}
              title="Close Voucher (Esc)"
              className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 border border-gray-200/80 active:scale-95"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Printable Shoot Voucher Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print-area">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-gray-900">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={studioName} className="h-14 max-w-[200px] object-contain shrink-0" />
              {(studioPhone || studioEmail || studioAddress) && (
                <div className="text-xs text-gray-500 border-l border-gray-200 pl-3 py-0.5 space-y-0.5">
                  {studioPhone && <p className="font-semibold text-gray-700">📱 {studioPhone}</p>}
                  {studioEmail && <p>{studioEmail}</p>}
                  {studioAddress && <p>{studioAddress}</p>}
                </div>
              )}
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 bg-teal-900 text-white text-xs font-extrabold tracking-wider rounded-lg uppercase">
                SHOOT ORDER VOUCHER
              </span>
              <p className="text-xs font-bold text-gray-800 mt-2">Voucher #: <span className="font-mono text-gray-900">{voucherNo}</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Booking Status: <strong className="uppercase text-teal-800">{booking.status}</strong></p>
            </div>
          </div>

          {/* Booking Title Banner */}
          <div className="my-6 p-4 rounded-2xl bg-teal-50/60 border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Shoot Title & Event</p>
              <h2 className="text-xl font-black text-gray-900 mt-0.5">{booking.title || `${customer?.name} ${booking.event_type}`}</h2>
              <p className="text-xs text-gray-600 font-medium mt-0.5">{booking.event_type} Photography & Videography</p>
            </div>
            <div className="sm:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-700 text-white text-xs font-bold uppercase tracking-wider">
                {booking.project_status}
              </span>
            </div>
          </div>

          {/* Customer & Shoot Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-gray-50/80 border border-gray-100 text-xs">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Client Details</p>
              <p className="text-base font-bold text-gray-900">{customer?.name || '—'}</p>
              {customer?.mobile && <p className="text-gray-600 font-medium">📱 Phone: {customer.mobile}</p>}
              {customer?.email && <p className="text-gray-500">✉️ Email: {customer.email}</p>}
              {customer?.address && <p className="text-gray-500">📍 Address: {customer.address}</p>}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Event Logistics</p>
              <p className="text-sm font-bold text-gray-900">📅 Date: {formatDate(booking.event_date)}</p>
              {booking.start_time && (
                <p className="text-gray-700">⏰ Time: {formatTime(booking.start_time)}{booking.end_time ? ` – ${formatTime(booking.end_time)}` : ''}</p>
              )}
              {booking.venue && <p className="text-gray-700 font-medium">📍 Venue: {booking.venue}</p>}
              {booking.package_name && <p className="text-teal-800 font-semibold">📦 Package: {booking.package_name}</p>}
              {booking.team_size > 0 && <p className="text-gray-600">👥 Team Crew: {booking.team_size} members</p>}
            </div>
          </div>

          {/* Account Balance Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden my-6">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Financial Summary</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                <tr>
                  <td className="py-2.5 px-4 text-gray-800">Total Shoot Contract Value</td>
                  <td className="py-2.5 px-4 text-right font-bold text-gray-900">{formatCurrency(booking.total_amount, CURRENCY)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-emerald-700 font-semibold">Total Amount Received To Date</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-600">{formatCurrency(booking.paid_amount, CURRENCY)}</td>
                </tr>
                <tr className="bg-gray-50/60">
                  <td className="py-3 px-4 font-bold text-gray-900">Remaining Balance Due</td>
                  <td className={`py-3 px-4 text-right font-extrabold text-sm ${booking.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(booking.balance, CURRENCY)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="my-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-xs">
              <p className="font-bold text-amber-900 uppercase tracking-wider text-[10px] mb-1">Special Shoot Notes & Instructions</p>
              <p className="text-amber-950 whitespace-pre-line leading-relaxed">{booking.notes}</p>
            </div>
          )}

          {/* Sign-off Footer */}
          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-end justify-between gap-6">
            <div className="text-[11px] text-gray-400 space-y-1">
              <p className="font-semibold text-gray-600">Aishwarya Videos & Photos - Official Shoot Confirmation</p>
              <p>Generated for shoot logistics & event management.</p>
            </div>

            <div className="text-center sm:text-right">
              <div className="h-10 border-b border-gray-300 w-44 mb-1" />
              <p className="text-xs font-bold text-gray-800">Authorized Signature</p>
              <p className="text-[10px] text-teal-700 font-semibold">{studioName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
