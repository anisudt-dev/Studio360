import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useNav } from '@/lib/nav';
import {
  Phone, Mail, MapPin, Plus, CalendarCheck, Wallet, Package,
  ArrowLeft, Edit, MessageCircle,
} from 'lucide-react';
import { Card, Button, Badge, Skeleton, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate, daysFromNow } from '@/lib/format';
import { PROJECT_STATUS_STYLE, paymentStatus, PAYMENT_STATUS_STYLE } from '@/lib/constants';
import type { Customer, BookingWithCustomer, Payment } from '@/lib/types';

const CURRENCY = '₹';

type Tab = 'overview' | 'bookings' | 'payments' | 'deliverables';

export function CustomerProfilePage({ id }: { id: string }) {
  const { navigate, openModal } = useNav();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, b, p] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).maybeSingle(),
        supabase.from('bookings').select('*, customer:customers(id,name,mobile)').eq('customer_id', id).order('event_date', { ascending: false }),
        supabase.from('payments').select('*, booking:bookings(id,title,event_type,total_amount,balance)').eq('booking.customer_id', id).order('payment_date', { ascending: false }),
      ]);
      setCustomer(c.data as Customer | null);
      setBookings((b.data as BookingWithCustomer[]) || []);
      setPayments((p.data as Payment[]) || []);
      setLoading(false);
    })();
  }, [id]);

  const outstanding = useMemo(() =>
    bookings.reduce((s, b) => s + Math.max(0, b.balance), 0), [bookings]);

  const upcoming = useMemo(() =>
    bookings.filter((b) => b.event_date && daysFromNow(b.event_date) >= 0 && b.status !== 'cancelled')
      .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1)), [bookings]);

  const previous = useMemo(() =>
    bookings.filter((b) => b.event_date && daysFromNow(b.event_date) < 0 && b.status !== 'cancelled'), [bookings]);

  const deliverables = useMemo(() =>
    bookings.filter((b) => b.status !== 'cancelled' && (b.project_status === 'editing' || b.project_status === 'delivered')), [bookings]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (!customer) return <EmptyState icon={<CalendarCheck size={26} />} title="Customer not found" />;

  const initials = customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('');

  function whatsappLink() {
    const num = (customer?.mobile || '').replace(/\D/g, '');
    if (!num) return null;
    const msg = encodeURIComponent(`Hi ${customer?.name},`);
    return `https://wa.me/${num.length === 10 ? '91' + num : num}?text=${msg}`;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate({ page: 'customers' })} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Customers
      </button>

      {/* Header — simple, spacious */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{customer.name}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
            {customer.mobile && <span className="text-base text-gray-500 flex items-center gap-1.5"><Phone size={15} /> {customer.mobile}</span>}
            {customer.email && <span className="text-base text-gray-500 flex items-center gap-1.5"><Mail size={15} /> {customer.email}</span>}
          </div>
          {customer.address && <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5"><MapPin size={14} /> {customer.address}</p>}
        </div>
      </div>

      {/* Outstanding balance — prominent */}
      {outstanding > 0 ? (
        <Card className="p-6 mb-6 border-amber-200 bg-amber-50/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(outstanding, CURRENCY)}</p>
            </div>
            <Button onClick={() => openModal('recordPayment', {})}>Record Payment</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 mb-6 border-emerald-200 bg-emerald-50/30">
          <p className="text-base font-semibold text-emerald-700">All payments settled</p>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Button onClick={() => openModal('addBooking', { presetCustomerId: id })}><Plus size={16} /> New Booking</Button>
        <Button variant="secondary" onClick={() => openModal('editCustomer', { id })}><Edit size={16} /> Edit</Button>
        {customer.mobile && <a href={`tel:${customer.mobile}`}><Button variant="secondary"><Phone size={16} /> Call</Button></a>}
        {whatsappLink() && <a href={whatsappLink()!} target="_blank" rel="noreferrer"><Button variant="secondary"><MessageCircle size={16} /> WhatsApp</Button></a>}
      </div>

      {/* Simple tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'bookings', label: 'Bookings' },
          { id: 'payments', label: 'Payments' },
          { id: 'deliverables', label: 'Deliverables' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-gray-400 py-4">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((b) => (
                  <Card key={b.id} onClick={() => navigate({ page: 'booking', id: b.id })} hover className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-gray-900">{b.event_type}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{formatDate(b.event_date)} {b.venue ? `· ${b.venue}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900">{formatCurrency(b.total_amount, CURRENCY)}</p>
                        {b.balance > 0 && <p className="text-xs text-red-600">{formatCurrency(b.balance, CURRENCY)} pending</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Previous</h3>
            {previous.length === 0 ? (
              <p className="text-gray-400 py-4">No previous events</p>
            ) : (
              <div className="space-y-2">
                {previous.map((b) => {
                  const style = PROJECT_STATUS_STYLE[b.project_status];
                  return (
                    <Card key={b.id} onClick={() => navigate({ page: 'booking', id: b.id })} hover className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-gray-900">{b.event_type}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{formatDate(b.event_date)}</p>
                        </div>
                        <Badge className={style.badge} dot={style.dot}>{style.label}</Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {customer.notes && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-2">
          {bookings.length === 0 ? (
            <Card><EmptyState icon={<CalendarCheck size={26} />} title="No bookings" action={<Button size="sm" onClick={() => openModal('addBooking', { presetCustomerId: id })}><Plus size={14} /> Create Booking</Button>} /></Card>
          ) : bookings.map((b) => {
            const style = PROJECT_STATUS_STYLE[b.project_status];
            return (
              <Card key={b.id} onClick={() => navigate({ page: 'booking', id: b.id })} hover className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900">{b.title || b.event_type}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDate(b.event_date)} {b.venue ? `· ${b.venue}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(b.total_amount, CURRENCY)}</p>
                      {b.balance > 0 && <p className="text-xs text-red-500">{formatCurrency(b.balance, CURRENCY)} due</p>}
                    </div>
                    <Badge className={style.badge} dot={style.dot}>{style.label}</Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'payments' && (
        <Card className="overflow-hidden">
          {payments.length === 0 ? (
            <EmptyState icon={<Wallet size={26} />} title="No payments recorded" />
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{formatCurrency(p.amount, CURRENCY)}</p>
                    <p className="text-sm text-gray-500">{formatDate(p.payment_date)} · {p.payment_mode}{p.reference ? ` · ${p.reference}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'deliverables' && (
        <div className="space-y-2">
          {deliverables.length === 0 ? (
            <Card><EmptyState icon={<Package size={26} />} title="No deliverables" description="Items in editing or ready for delivery will appear here" /></Card>
          ) : deliverables.map((b) => {
            const style = PROJECT_STATUS_STYLE[b.project_status];
            return (
              <Card key={b.id} onClick={() => navigate({ page: 'booking', id: b.id })} hover className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{b.event_type}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDate(b.event_date)}</p>
                  </div>
                  <Badge className={style.badge} dot={style.dot}>{style.label}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
