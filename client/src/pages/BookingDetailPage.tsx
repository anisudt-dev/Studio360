import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useNav } from '@/lib/nav';
import {
  ArrowLeft, Phone, MessageCircle, Wallet,
  Edit, FileText, Calendar, MapPin, Clock, Package,
  ChevronRight, Trash2, ArrowRight, Printer,

} from 'lucide-react';
import { Card, Button, Badge, Skeleton, EmptyState, ProgressBar } from '@/components/ui';
import { toast } from '@/components/Toast';
import { BookingTimeline } from '@/components/BookingTimeline';
import { formatCurrency, formatDate, formatTime, relativeDay } from '@/lib/format';
import {
  BOOKING_STATUS_STYLE, PROJECT_STATUS_STYLE, paymentStatus, PAYMENT_STATUS_STYLE, PROJECT_FLOW,
  nextAction,
} from '@/lib/constants';
import { PaymentReceiptModal } from '@/components/PaymentReceiptModal';
import type { BookingWithCustomer, Payment, Invoice } from '@/lib/types';

const CURRENCY = '₹';

export function BookingDetailPage({ id }: { id: string }) {
  const { navigate, openModal } = useNav();
  const [booking, setBooking] = useState<BookingWithCustomer | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [selectedPaymentReceipt, setSelectedPaymentReceipt] = useState<Payment | null>(null);


  async function refresh() {
    setLoading(true);
    const [b, p, i] = await Promise.all([
      supabase.from('bookings').select('*, customer:customers(id,name,mobile,email,address,notes)').eq('id', id).maybeSingle(),
      supabase.from('payments').select('*').eq('booking_id', id).order('payment_date', { ascending: false }),
      supabase.from('invoices').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    ]);
    setBooking(b.data as BookingWithCustomer | null);
    setPayments((p.data as Payment[]) || []);
    setInvoices((i.data as Invoice[]) || []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [id]);

  const ps = useMemo(() => booking ? paymentStatus(booking.balance, booking.event_date) : 'paid', [booking]);
  const action = useMemo(() => booking ? nextAction(booking) : null, [booking]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (!booking) return <EmptyState icon={<Calendar size={26} />} title="Booking not found" />;

  const customer = booking.customer;
  const bs = BOOKING_STATUS_STYLE[booking.status];
  const projStyle = PROJECT_STATUS_STYLE[booking.project_status];
  const payStyle = PAYMENT_STATUS_STYLE[ps];
  const paidPct = booking.total_amount > 0 ? (booking.paid_amount / booking.total_amount) * 100 : 0;

  function whatsappLink() {
    const num = (customer?.mobile || '').replace(/\D/g, '');
    if (!num) return null;
    const msg = encodeURIComponent(`Hi ${customer?.name}, regarding your ${booking?.event_type} on ${formatDate(booking?.event_date)}.`);
    return `https://wa.me/${num.length === 10 ? '91' + num : num}?text=${msg}`;
  }

  async function changeProjectStatus(newStatus: string) {
    setShowStatusMenu(false);
    const { error } = await supabase.from('bookings').update({ project_status: newStatus }).eq('id', id);
    if (error) { toast('Could not update status', 'error'); return; }
    toast('Status updated', 'success');
    refresh();
  }

  async function deleteBooking() {
    if (!confirm('Delete this booking and all its payments and invoices? This cannot be undone.')) return;
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) { toast('Could not delete booking', 'error'); return; }
    toast('Booking deleted', 'success');
    navigate({ page: 'bookings' });
  }

  function handlePrintBooking() {
    const originalTitle = document.title;
    document.title = `Aishwarya Videos & Photos - Shoot Order - ${booking?.title || customer?.name || 'Booking'}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 no-print">
        <button onClick={() => navigate({ page: 'bookings' })} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to Bookings
        </button>
        <Button variant="secondary" size="sm" onClick={handlePrintBooking}>
          <Printer size={14} /> Print Shoot Voucher
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={bs.badge} dot={bs.dot}>{bs.label}</Badge>
          <Badge className={projStyle.badge} dot={projStyle.dot}>{projStyle.label}</Badge>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{booking.title || customer?.name}</h1>
        <p className="text-lg text-gray-500 mt-1">{booking.event_type} Photography & Videography</p>
      </div>


      {/* Next Action — prominent */}
      {action && (
        <Card className={`p-4 mb-6 ${action.type === 'payment' ? 'border-amber-200 bg-amber-50/40' : 'border-teal-100 bg-teal-50/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Next Action</p>
              <p className={`text-lg font-bold mt-0.5 ${action.type === 'payment' ? 'text-amber-700' : 'text-teal-700'}`}>
                {action.label}
              </p>
            </div>
            {action.type === 'payment' && (
              <Button size="sm" onClick={() => openModal('recordPayment', { bookingId: id })}>
                <Wallet size={14} /> Record Payment
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Money section — impossible to miss */}
      <Card className={`p-6 mb-6 ${booking.balance > 0 ? 'border-amber-200' : 'border-emerald-200'}`}>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Money</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Total</p>
            <p className="text-base sm:text-2xl font-extrabold text-gray-900 mt-1 truncate" title={formatCurrency(booking.total_amount, CURRENCY)}>
              {formatCurrency(booking.total_amount, CURRENCY)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Received</p>
            <p className="text-base sm:text-2xl font-extrabold text-emerald-600 mt-1 truncate" title={formatCurrency(booking.paid_amount, CURRENCY)}>
              {formatCurrency(booking.paid_amount, CURRENCY)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Balance</p>
            <p className={`text-base sm:text-2xl font-extrabold mt-1 truncate ${booking.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`} title={formatCurrency(booking.balance, CURRENCY)}>
              {formatCurrency(booking.balance, CURRENCY)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <ProgressBar value={paidPct} />
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-500">{Math.round(paidPct)}% collected</span>
            {booking.balance > 0 ? (
              <div className="flex items-center gap-3">
                {booking.event_date && (
                  <span className="text-sm text-gray-500">
                    {relativeDay(booking.event_date) === 'Today' || relativeDay(booking.event_date) === 'Tomorrow'
                      ? `Due ${relativeDay(booking.event_date)}`
                      : `Due ${formatDate(booking.event_date)}`
                    }
                  </span>
                )}
                <Badge className={payStyle.badge} dot={payStyle.dot}>{payStyle.label}</Badge>
              </div>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-700" dot="bg-emerald-500">Fully Paid</Badge>
            )}
          </div>
        </div>
        {booking.balance > 0 && (
          <Button className="w-full mt-4" onClick={() => openModal('recordPayment', { bookingId: id })}>
            <Wallet size={16} /> Record Payment
          </Button>
        )}
      </Card>

      {/* Booking details section */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Booking</h2>
        <div className="space-y-3">
          <DetailRow icon={Calendar} label="Event Date" value={formatDate(booking.event_date)} />
          {booking.start_time && <DetailRow icon={Clock} label="Time" value={`${formatTime(booking.start_time)}${booking.end_time ? ` – ${formatTime(booking.end_time)}` : ''}`} />}
          {booking.venue && <DetailRow icon={MapPin} label="Venue" value={booking.venue} />}
          {booking.package_name && <DetailRow icon={Package} label="Package" value={booking.package_name} />}
          {customer && (
            <div className="pt-3 border-t border-gray-50">
              <button onClick={() => navigate({ page: 'customer', id: customer.id })} className="w-full text-left flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                  {customer.mobile && <p className="text-xs text-gray-500">{customer.mobile}</p>}
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              <div className="flex gap-2 mt-2">
                {customer.mobile && <a href={`tel:${customer.mobile}`}><Button size="sm" variant="secondary"><Phone size={14} /> Call</Button></a>}
                {whatsappLink() && <a href={whatsappLink()!} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><MessageCircle size={14} /> WhatsApp</Button></a>}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Work section — status timeline */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Work</h2>
          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setShowStatusMenu((v) => !v)}>Update Status</Button>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50 animate-scale-in">
                  {PROJECT_FLOW.map((s) => {
                    const st = PROJECT_STATUS_STYLE[s];
                    return (
                      <button
                        key={s}
                        onClick={() => changeProjectStatus(s)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${booking.project_status === s ? 'text-teal-700 font-semibold' : 'text-gray-700'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        <BookingTimeline current={booking.project_status} />
      </Card>

      {/* Payment history */}
      {payments.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Payment History</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-base font-semibold text-gray-900">{formatCurrency(p.amount, CURRENCY)}</p>
                  <p className="text-sm text-gray-500">{formatDate(p.payment_date)} · {p.payment_mode}{p.reference ? ` · ${p.reference}` : ''}</p>
                </div>
                <button
                  onClick={() => setSelectedPaymentReceipt(p)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <FileText size={14} /> Receipt
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedPaymentReceipt && booking && (
        <PaymentReceiptModal
          payment={selectedPaymentReceipt}
          booking={booking}
          onClose={() => setSelectedPaymentReceipt(null)}
        />
      )}


      {/* Notes section */}
      {booking.notes && (
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.notes}</p>
        </Card>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Invoices</h2>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <button key={inv.id} onClick={() => navigate({ page: 'invoice', id: inv.id })} className="w-full text-left py-2.5 border-b border-gray-50 last:border-0 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500">{formatDate(inv.issue_date)}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(inv.total, CURRENCY)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="secondary" onClick={() => openModal('editBooking', { id })}><Edit size={16} /> Edit</Button>
        <Button variant="secondary" onClick={() => openModal('addInvoice', { bookingId: id })}><FileText size={16} /> Invoice</Button>
        <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={deleteBooking}><Trash2 size={16} /> Delete</Button>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-gray-400 shrink-0" />
      <span className="text-sm text-gray-500 w-20">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
