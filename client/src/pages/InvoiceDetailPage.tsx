import { supabase } from '@/lib/supabase';
import { useNav } from '@/lib/nav';
import { api } from '@/lib/api';
import {
  ArrowLeft, Printer, Share2, Camera, Phone, Mail, MapPin, CheckCircle2
} from 'lucide-react';
import { Card, Button, Skeleton, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from '@/components/Toast';
import type { Invoice, Booking, Customer, Settings } from '@/lib/types';
import { useEffect, useState } from 'react';


interface InvoiceWithFullBooking extends Invoice {
  booking?: (Booking & { customer?: Customer }) | null;
}

const CURRENCY = '₹';

export function InvoiceDetailPage({ id }: { id: string }) {
  const { navigate } = useNav();
  const [invoice, setInvoice] = useState<InvoiceWithFullBooking | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getInvoice(id).catch(() =>
        supabase
          .from('invoices')
          .select('*, booking:bookings(*, customer:customers(id,name,mobile,email,address))')
          .eq('id', id)
          .maybeSingle()
          .then((res) => res.data)
          .catch(() => null)
      ),
      api.getSettings().catch(() => null),
    ])
      .then(([invoiceData, settingsData]) => {
        if (invoiceData) {
          setInvoice(invoiceData as InvoiceWithFullBooking);
        } else {
          setError('Invoice record could not be loaded or was not found.');
        }
        setSettings(settingsData);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load invoice details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="space-y-4 max-w-3xl mx-auto"><Skeleton className="h-40" /><Skeleton className="h-96" /></div>;
  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <EmptyState icon={<Camera size={26} />} title="Invoice Not Found" description={error || "The requested invoice could not be located in your studio database."} />

        <Button variant="secondary" onClick={() => navigate({ page: 'invoices' })}>
          <ArrowLeft size={16} /> Return to Invoices Directory
        </Button>
      </div>
    );
  }

  const booking = invoice.booking;
  const customer = booking?.customer;


  // Calculate payments
  const totalAmount = invoice.total || booking?.total_amount || 0;
  const paidAmount = booking?.paid_amount || 0;
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  const isFullyPaid = balanceDue <= 0 && totalAmount > 0;
  const isPartiallyPaid = paidAmount > 0 && balanceDue > 0;

  const [sendingEmail, setSendingEmail] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const text = `Invoice ${invoice!.invoice_number} for ${formatCurrency(invoice!.total, CURRENCY)}`;
    if (navigator.share) navigator.share({ title: invoice!.invoice_number, text });
    else { navigator.clipboard.writeText(text); }
  }

  async function handleSendEmail() {
    if (!invoice) return;
    const defaultEmail = customer?.email || '';
    const email = prompt('Enter customer email address:', defaultEmail);
    if (!email) return;

    setSendingEmail(true);
    try {
      const res = await api.sendInvoiceEmail(invoice.id, email);
      toast(res.message || 'Invoice email sent successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to send invoice email', 'error');
    } finally {
      setSendingEmail(false);
    }
  }

  const studioName = settings?.studio_name && settings.studio_name !== 'Studio ERP' ? settings.studio_name : 'Aishwarya Videos & Photos';
  const logoUrl = settings?.logo_url || '/logo.svg';
  const studioPhone = settings?.phone;
  const studioEmail = settings?.email;
  const studioAddress = settings?.address;
  const studioGstin = settings?.gstin;

  return (
    <div>
      {/* Top action toolbar (hidden when printing) */}
      <div className="flex items-center justify-between mb-4 no-print max-w-3xl mx-auto">
        <button onClick={() => navigate({ page: 'invoices' })} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to Invoices
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleSendEmail} loading={sendingEmail}>
            <Mail size={14} /> Email Invoice
          </Button>
          <Button variant="secondary" size="sm" onClick={handleShare}><Share2 size={14} /> Share</Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}><Printer size={14} /> Print Invoice</Button>
        </div>
      </div>


      {/* Printable Invoice Document */}
      <Card className="p-8 lg:p-12 max-w-3xl mx-auto print-area bg-white border border-gray-200/80 shadow-sm rounded-2xl">
        {/* 1. Header: Business Info + Invoice Meta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <img src={logoUrl} alt={studioName} className="h-14 max-w-[220px] object-contain shrink-0" />
            </div>



            {/* Business Contact Line */}
            <div className="mt-2 text-xs text-gray-500 space-y-0.5 pl-0.5">
              {studioPhone && (
                <p className="flex items-center gap-1.5">
                  <Phone size={12} className="text-gray-400" /> {studioPhone}
                  {studioEmail && <span className="text-gray-300">|</span>}
                  {studioEmail && <span>{studioEmail}</span>}
                </p>
              )}
              {studioAddress && (
                <p className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-gray-400" /> {studioAddress}
                </p>
              )}
              {studioGstin && (
                <p className="text-gray-400 font-mono text-[11px] pt-0.5">GSTIN: {studioGstin}</p>
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <h2 className="text-2xl font-black tracking-tight text-gray-900">INVOICE</h2>
            <p className="text-sm font-mono font-semibold text-gray-600 mt-0.5">{invoice.invoice_number}</p>
            
            <div className="mt-3 space-y-1 text-xs">
              <p className="text-gray-600">
                <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider mr-2">ISSUE DATE:</span>
                <span className="font-semibold text-gray-900">{formatDate(invoice.issue_date)}</span>
              </p>
              {invoice.due_date && (
                <p className="text-gray-600">
                  <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider mr-2">DUE DATE:</span>
                  <span className="font-semibold text-gray-900">{formatDate(invoice.due_date)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 2. Customer & Event Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-100">
          {/* Bill To */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">BILL TO</p>
            <p className="text-base font-bold text-gray-900">{customer?.name || '—'}</p>
            {customer?.mobile && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                <span>📱</span> {customer.mobile}
              </p>
            )}
            {customer?.email && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Mail size={12} className="text-gray-400" /> {customer.email}
              </p>
            )}
            {customer?.address && (
              <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                {customer.address}
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="sm:text-right">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">EVENT DETAILS</p>
            <p className="text-base font-bold text-gray-900">{booking?.event_type || 'Photography Event'}</p>
            {booking?.event_date && (
              <p className="text-sm font-medium text-teal-800 mt-0.5">
                {formatDate(booking.event_date)}
              </p>
            )}
            {booking?.venue && (
              <p className="text-xs text-gray-500 mt-1">
                📍 {booking.venue}
              </p>
            )}
          </div>
        </div>

        {/* 3. Structured Line Items Table */}
        <div className="my-6">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-1 font-semibold">Description</th>
                <th className="py-3 px-3 font-semibold text-center w-36">Event Date</th>
                <th className="py-3 px-1 font-semibold text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-4 px-1 align-top">
                  <p className="font-semibold text-gray-900">
                    {booking?.event_type ? `${booking.event_type} Photography & Videography` : 'Photography Services'}
                  </p>
                  {booking?.title && (
                    <p className="text-xs text-gray-500 mt-0.5">{booking.title}</p>
                  )}
                  {booking?.package_name && (
                    <p className="text-xs text-teal-700 font-medium mt-0.5">Package: {booking.package_name}</p>
                  )}
                </td>
                <td className="py-4 px-3 align-top text-center text-gray-600 text-xs font-medium">
                  {booking?.event_date ? formatDate(booking.event_date) : '—'}
                </td>
                <td className="py-4 px-1 align-top text-right font-bold text-gray-900">
                  {formatCurrency(invoice.subtotal, CURRENCY)}
                </td>
              </tr>

              {invoice.tax > 0 && (
                <tr>
                  <td className="py-3 px-1 text-gray-600 text-xs">Tax / Additional Services</td>
                  <td className="py-3 px-3 text-center text-gray-400 text-xs">—</td>
                  <td className="py-3 px-1 text-right text-gray-700 font-semibold">{formatCurrency(invoice.tax, CURRENCY)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Totals Breakdown & Prominent Payment Status Stamp */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pt-4 border-t border-gray-200">
          {/* Status Badge / Stamp */}
          <div className="pt-2">
            {isFullyPaid ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-extrabold text-sm tracking-wide shadow-xs">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>PAID ✓</span>
              </div>
            ) : isPartiallyPaid ? (
              <div className="inline-flex flex-col items-start px-4 py-2.5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-900 shadow-xs">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">PARTIALLY PAID</span>
                <span className="text-sm font-extrabold text-amber-900 mt-0.5">
                  Balance Due: {formatCurrency(balanceDue, CURRENCY)}
                </span>
              </div>
            ) : (
              <div className="inline-flex flex-col items-start px-4 py-2.5 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 shadow-xs">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">UNPAID</span>
                <span className="text-sm font-extrabold text-rose-900 mt-0.5">
                  Balance Due: {formatCurrency(balanceDue, CURRENCY)}
                </span>
              </div>
            )}
          </div>

          {/* Breakdown Box */}
          <div className="w-full sm:w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">{formatCurrency(invoice.subtotal, CURRENCY)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="font-semibold text-gray-900">{formatCurrency(invoice.tax, CURRENCY)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-base text-gray-900">
              <span>Total</span>
              <span className="text-teal-700 font-extrabold">{formatCurrency(totalAmount, CURRENCY)}</span>
            </div>

            {/* Paid & Balance Rows */}
            <div className="flex justify-between text-xs text-emerald-700 pt-1.5 border-t border-dashed border-gray-200">
              <span className="font-medium">Paid</span>
              <span className="font-bold">{formatCurrency(paidAmount, CURRENCY)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={balanceDue > 0 ? 'font-bold text-rose-600' : 'text-gray-500 font-medium'}>Balance Due</span>
              <span className={balanceDue > 0 ? 'font-extrabold text-rose-600' : 'text-gray-700 font-bold'}>
                {formatCurrency(balanceDue, CURRENCY)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Notes & Payment Methods */}
        {invoice.notes && (
          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">NOTES / TERMS</p>
            <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
          </div>
        )}

        {/* 6. Footer Sign-off */}
        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs font-semibold text-gray-500">Thank you for your business!</p>
        </div>
      </Card>
    </div>
  );
}
