import { supabase } from '@/lib/supabase';
import { useNav } from '@/lib/nav';
import {
  ArrowLeft, Printer, Share2, FileText,
} from 'lucide-react';
import { Card, Button, Skeleton, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Invoice, Booking, Customer } from '@/lib/types';

interface InvoiceWithFullBooking extends Invoice {
  booking?: (Booking & { customer?: Customer }) | null;
}
import { useEffect, useState } from 'react';

const CURRENCY = '₹';

export function InvoiceDetailPage({ id }: { id: string }) {
  const { navigate } = useNav();
  const [invoice, setInvoice] = useState<InvoiceWithFullBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*, booking:bookings(*, customer:customers(id,name,mobile,email,address))')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => { setInvoice(data as InvoiceWithFullBooking | null); setLoading(false); });
  }, [id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-96" /></div>;
  if (!invoice) return <EmptyState icon={<FileText size={26} />} title="Invoice not found" />;

  const booking = invoice.booking;
  const customer = booking?.customer;

  function handlePrint() { window.print(); }

  function handleShare() {
    const text = `Invoice ${invoice!.invoice_number} for ${formatCurrency(invoice!.total, CURRENCY)}`;
    if (navigator.share) navigator.share({ title: invoice!.invoice_number, text });
    else { navigator.clipboard.writeText(text); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 no-print">
        <button onClick={() => navigate({ page: 'invoices' })} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Invoices
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleShare}><Share2 size={14} /> Share</Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}><Printer size={14} /> Print</Button>
        </div>
      </div>

      <Card className="p-6 lg:p-10 max-w-3xl mx-auto print-area">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white"><FileText size={18} /></div>
              <span className="text-lg font-bold text-gray-900">Studio ERP</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Photography & Videography</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">INVOICE</p>
            <p className="text-sm text-gray-500 mt-1">{invoice.invoice_number}</p>
          </div>
        </div>

        {/* Bill to + dates */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</p>
            <p className="text-sm font-bold text-gray-900">{customer?.name || '—'}</p>
            {customer?.mobile && <p className="text-sm text-gray-500">{customer.mobile}</p>}
            {customer?.email && <p className="text-sm text-gray-500">{customer.email}</p>}
            {customer?.address && <p className="text-sm text-gray-500">{customer.address}</p>}
          </div>
          <div className="text-right">
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase">Issue Date</p>
              <p className="text-sm text-gray-700">{formatDate(invoice.issue_date)}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Due Date</p>
                <p className="text-sm text-gray-700">{formatDate(invoice.due_date)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
              <th className="font-medium py-3">Description</th>
              <th className="font-medium py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="py-3 text-gray-700">
                {booking?.event_type} — {booking?.title || customer?.name}
                {booking?.event_date && <span className="block text-xs text-gray-400 mt-0.5">Event date: {formatDate(booking.event_date)}</span>}
                {booking?.venue && <span className="block text-xs text-gray-400">{booking.venue}</span>}
              </td>
              <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(invoice.subtotal, CURRENCY)}</td>
            </tr>
            {invoice.tax > 0 && (
              <tr>
                <td className="py-3 text-gray-500">Tax / Additional charges</td>
                <td className="py-3 text-right text-gray-700">{formatCurrency(invoice.tax, CURRENCY)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal, CURRENCY)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoice.tax, CURRENCY)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-base font-bold text-teal-700">{formatCurrency(invoice.total, CURRENCY)}</span>
            </div>
            {booking && booking.paid_amount > 0 && (
              <>
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="text-emerald-600">Paid</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(booking.paid_amount, CURRENCY)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={booking.balance > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}>Balance Due</span>
                  <span className={booking.balance > 0 ? 'text-red-600 font-bold' : 'text-gray-700'}>{formatCurrency(booking.balance, CURRENCY)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-6 mt-8 text-center">
          <p className="text-xs text-gray-400">Thank you for your business!</p>
        </div>
      </Card>
    </div>
  );
}
