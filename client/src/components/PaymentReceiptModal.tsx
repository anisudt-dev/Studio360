import { useState, useEffect } from 'react';
import { Printer, X, Share2, CheckCircle2, Wallet, MessageCircle, Mail } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { Payment, BookingWithCustomer, Settings } from '@/lib/types';

const CURRENCY = '₹';

interface PaymentReceiptModalProps {
  payment: Payment;
  booking: BookingWithCustomer;
  onClose: () => void;
}

export function PaymentReceiptModal({ payment, booking, onClose }: PaymentReceiptModalProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

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
  const isFullyPaid = booking.balance <= 0;
  const receiptNo = `REC-${payment.id.slice(0, 8).toUpperCase()}`;

  function handlePrint() {
    window.print();
  }

  function handleWhatsAppShare() {
    if (!customer?.mobile) {
      toast('Customer mobile number is missing', 'error');
      return;
    }
    const cleanNum = customer.mobile.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hello ${customer.name}, Payment Receipt ${receiptNo} generated for ${formatCurrency(payment.amount, CURRENCY)}. Received via ${payment.payment_mode}. Total Balance Remaining: ${formatCurrency(booking.balance, CURRENCY)}. Thank you! - ${studioName}`
    );
    window.open(`https://wa.me/${cleanNum.length === 10 ? '91' + cleanNum : cleanNum}?text=${msg}`, '_blank');
  }

  async function handleEmailReceipt() {
    const defaultEmail = (customer as any)?.email || '';
    const email = prompt('Enter customer email address to send receipt:', defaultEmail);
    if (!email) return;

    setSendingEmail(true);
    try {
      const res = await api.sendReceiptEmail(payment.id, email);
      toast(res.message || 'Payment receipt email sent successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to send payment receipt email', 'error');
    } finally {
      setSendingEmail(false);
    }
  }  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-gray-900/70 backdrop-blur-xs overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sticky Action Header (Always visible at top, hidden during print) */}
        <div className="sticky top-0 z-30 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between no-print bg-white/95 backdrop-blur-md shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 leading-tight">Payment Receipt</h3>
              <p className="text-[11px] font-mono text-gray-500">{receiptNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEmailReceipt}
              disabled={sendingEmail}
              className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Email receipt to customer"
            >
              <Mail size={14} /> Email
            </button>
            {customer?.mobile && (
              <button
                onClick={handleWhatsAppShare}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Send receipt on WhatsApp"
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
            )}
            <Button size="sm" onClick={handlePrint} className="bg-gray-900 hover:bg-black text-white font-bold">
              <Printer size={14} /> Print
            </Button>
            <button
              onClick={onClose}
              title="Close Receipt (Esc)"
              className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 border border-gray-200/80 active:scale-95"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Container (Scrollable body) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print-area">
          {/* 1. Receipt Top Header */}

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
              <span className="inline-block px-3 py-1 bg-gray-900 text-white text-xs font-extrabold tracking-wider rounded-lg uppercase">
                PAYMENT RECEIPT
              </span>
              <p className="text-xs font-bold text-gray-800 mt-2">Receipt #: <span className="font-mono text-gray-900">{receiptNo}</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Date: {formatDate(payment.payment_date)}</p>
            </div>
          </div>

          {/* 2. Customer & Event Details */}
          <div className="grid grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 text-xs">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Received From</p>
              <p className="text-base font-bold text-gray-900">{customer?.name || booking.title}</p>
              {customer?.mobile && <p className="text-gray-600 mt-0.5 font-medium">📱 {customer.mobile}</p>}
              {(customer as any)?.address && <p className="text-gray-500 mt-0.5">{(customer as any).address}</p>}

            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Shoot / Event Details</p>
              <p className="text-sm font-bold text-gray-900">{booking.event_type} Photography</p>
              {booking.event_date && <p className="text-gray-600 mt-0.5">Event Date: {formatDate(booking.event_date)}</p>}
              <p className="text-gray-500 mt-0.5">Payment Mode: <strong className="text-gray-800 uppercase">{payment.payment_mode}</strong></p>
              {payment.reference && <p className="text-gray-500 font-mono">Ref #: {payment.reference}</p>}
            </div>
          </div>

          {/* 3. Highlighted Amount Received Callout */}
          <div className="my-6 p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Amount Received</p>
              <p className="text-3xl font-black text-emerald-700 mt-0.5">
                {formatCurrency(payment.amount, CURRENCY)}
              </p>
            </div>

            <div className="text-right">
              {isFullyPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs">
                  <CheckCircle2 size={14} /> FULLY PAID
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-xs">
                  PARTIAL ADVANCE
                </span>
              )}
            </div>
          </div>

          {/* 4. Financial Account Balance Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden my-6">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                <tr>
                  <td className="py-2.5 px-4 text-gray-800">Total Shoot Contract Value</td>
                  <td className="py-2.5 px-4 text-right font-bold text-gray-900">{formatCurrency(booking.total_amount, CURRENCY)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-gray-800">Total Received To Date (including this payment)</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-600">{formatCurrency(booking.paid_amount, CURRENCY)}</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="py-3 px-4 font-bold text-gray-900">Remaining Balance Due</td>
                  <td className={`py-3 px-4 text-right font-extrabold text-sm ${booking.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(booking.balance, CURRENCY)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Footer Signatures & Terms */}
          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-end justify-between gap-6">
            <div className="text-[11px] text-gray-400 space-y-1">
              <p className="font-semibold text-gray-600">Thank you for your business!</p>
              <p>Computer generated payment receipt voucher.</p>
            </div>

            <div className="text-center sm:text-right">
              <div className="h-10 border-b border-gray-300 w-44 mb-1" />
              <p className="text-xs font-bold text-gray-800">Authorized Signatory</p>
              <p className="text-[10px] text-teal-700 font-semibold">{studioName}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
