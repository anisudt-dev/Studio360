import { useMemo, useState } from 'react';
import {
  Plus, Wallet, Search, TrendingUp, AlertCircle, Download, MessageCircle,
  Eye, CheckCircle2, DollarSign, Filter
} from 'lucide-react';
import { usePayments, useBookings } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { Card, Button, PageHeader, EmptyState, Skeleton, Badge, Select } from '@/components/ui';
import { formatCurrency, formatDate, daysFromNow } from '@/lib/format';
import { paymentStatus, PAYMENT_STATUS_STYLE } from '@/lib/constants';
import { toast } from '@/components/Toast';

const CURRENCY = '₹';

export function PaymentsPage() {
  const { payments, loading: payLoading } = usePayments();
  const { bookings, loading: bookLoading } = useBookings();
  const { navigate, openModal } = useNav();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const summary = useMemo(() => {
    const totalContractValue = bookings.reduce((s, b) => s + (b.status !== 'cancelled' ? b.total_amount || 0 : 0), 0);
    const totalCollected = bookings.reduce((s, b) => s + (b.status !== 'cancelled' ? b.paid_amount || 0 : 0), 0);
    const totalReceivable = bookings.reduce((s, b) => s + (b.status !== 'cancelled' ? Math.max(0, b.balance) : 0), 0);

    const dueThisWeek = bookings.reduce((s, b) => {
      if (b.status === 'cancelled' || b.balance <= 0 || !b.event_date) return s;
      const dn = daysFromNow(b.event_date);
      return dn >= 0 && dn <= 7 ? s + b.balance : s;
    }, 0);

    const overdue = bookings.reduce((s, b) => {
      if (b.status === 'cancelled' || b.balance <= 0 || !b.event_date) return s;
      return daysFromNow(b.event_date) < 0 ? s + b.balance : s;
    }, 0);

    const collectionPercent = totalContractValue > 0
      ? Math.round((totalCollected / totalContractValue) * 100)
      : 100;

    return { totalContractValue, totalCollected, totalReceivable, dueThisWeek, overdue, collectionPercent };
  }, [bookings]);

  const paymentBookings = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'cancelled')
      .map((b) => {
        const ps = paymentStatus(b.balance, b.event_date);
        return { ...b, payStatus: ps };
      })
      .sort((a, b) => {
        const order = { overdue: 0, due: 1, partial: 2, paid: 3 };
        return order[a.payStatus as keyof typeof order] - order[b.payStatus as keyof typeof order];
      });
  }, [bookings]);

  const filtered = useMemo(() => {
    return paymentBookings.filter((b) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue' && b.payStatus !== 'overdue') return false;
        if (statusFilter === 'due' && b.payStatus !== 'due') return false;
        if (statusFilter === 'partial' && b.payStatus !== 'partial') return false;
        if (statusFilter === 'paid' && b.payStatus !== 'paid') return false;
      }

      if (search) {
        const q = search.toLowerCase();
        return (
          (b.customer?.name || '').toLowerCase().includes(q) ||
          (b.customer?.mobile || '').includes(q) ||
          b.event_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [paymentBookings, search, statusFilter]);

  function exportCSV() {
    if (paymentBookings.length === 0) return;
    const headers = ['Customer Name', 'Mobile', 'Event Type', 'Total Contract (₹)', 'Paid Amount (₹)', 'Balance Due (₹)', 'Due Date', 'Payment Status'];
    const rows = paymentBookings.map((b) => [
      `"${b.customer?.name || b.title || ''}"`,
      `"${b.customer?.mobile || ''}"`,
      `"${b.event_type || ''}"`,
      b.total_amount || 0,
      b.paid_amount || 0,
      b.balance || 0,
      `"${b.event_date || ''}"`,
      `"${b.payStatus || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `studio_payments_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Downloaded Payment Receivables CSV Report', 'success');
  }

  function sendWhatsAppReminder(booking: any, e: React.MouseEvent) {
    e.stopPropagation();
    if (!booking.customer?.mobile) {
      toast('No mobile number available for this customer', 'error');
      return;
    }
    const cleanNum = booking.customer.mobile.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hello ${booking.customer.name}, friendly payment reminder regarding your ${booking.event_type} booking. Balance due: ${formatCurrency(booking.balance, CURRENCY)}. Thank you!`
    );
    window.open(`https://wa.me/${cleanNum}?text=${text}`, '_blank');
  }

  const loading = payLoading || bookLoading;

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-40" /><div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments & Receivables"
        subtitle="Track client payments, outstanding balances, and collection targets"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              title="Download CSV Financial Report"
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download size={15} className="text-teal-600" /> Export CSV
            </button>
            <Button onClick={() => openModal('recordPayment', {})} title="Record customer payment">
              <Plus size={16} /> Record Payment
            </Button>
          </div>
        }
      />

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Wallet size={18} /></div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Receivable</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{formatCurrency(summary.totalReceivable, CURRENCY)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><TrendingUp size={18} /></div>
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Due This Week</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{formatCurrency(summary.dueThisWeek, CURRENCY)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><AlertCircle size={18} /></div>
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Overdue Balance</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">{formatCurrency(summary.overdue, CURRENCY)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Visual Revenue Collection Progress Bar */}
      <Card className="p-4 sm:p-5 rounded-2xl border-gray-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-gray-700 uppercase tracking-wider">Revenue Collection Target</span>
          <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">{summary.collectionPercent}% Collected</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-teal-600 to-emerald-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(summary.collectionPercent, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>Collected: <strong className="text-gray-900 font-bold">{formatCurrency(summary.totalCollected, CURRENCY)}</strong></span>
          <span>Target Contract: <strong className="text-gray-900 font-bold">{formatCurrency(summary.totalContractValue, CURRENCY)}</strong></span>
        </div>
      </Card>

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 py-2.5 text-sm focus-ring focus:border-teal-500 shadow-2xs"
            placeholder="Search by customer name, mobile, or event..."
            title="Search payment records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 text-xs font-semibold"
          title="Filter by Payment Status"
        >
          <option value="all">All Payment Statuses</option>
          <option value="overdue">Overdue Balances</option>
          <option value="due">Due Soon</option>
          <option value="partial">Partially Paid</option>
          <option value="paid">Paid in Full</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={26} />}
            title={search || statusFilter !== 'all' ? 'No payment records match filters' : 'No payment receivables'}
            description={search || statusFilter !== 'all' ? 'Try adjusting your search query or status filter' : 'Bookings with receivables will appear here'}
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block overflow-hidden rounded-2xl border-gray-200/80 shadow-2xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 bg-gray-50/50 border-b border-gray-100 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Customer Name</th>
                  <th className="py-3 px-4 font-bold">Event Type</th>
                  <th className="py-3 px-4 font-bold text-right">Contract Total</th>
                  <th className="py-3 px-4 font-bold text-right">Paid Amount</th>
                  <th className="py-3 px-4 font-bold text-right">Balance Due</th>
                  <th className="py-3 px-4 font-bold">Shoot Date</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => {
                  const style = PAYMENT_STATUS_STYLE[b.payStatus];
                  const isOverdue = b.payStatus === 'overdue';

                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate({ page: 'booking', id: b.id })}
                      className="hover:bg-teal-50/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-gray-900">{b.customer?.name || b.title}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">{b.event_type}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-gray-900 whitespace-nowrap">{formatCurrency(b.total_amount, CURRENCY)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(b.paid_amount, CURRENCY)}</td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {b.balance > 0 ? (
                          <span className={`font-black ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>{formatCurrency(b.balance, CURRENCY)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium whitespace-nowrap">{formatDate(b.event_date)}</td>
                      <td className="py-3.5 px-4"><Badge className={style.badge} dot={style.dot}>{style.label}</Badge></td>

                      {/* Row Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {b.balance > 0 && (
                            <>
                              <button
                                onClick={(e) => sendWhatsAppReminder(b, e)}
                                title="Send WhatsApp Payment Reminder"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <MessageCircle size={14} />
                              </button>
                              <Button
                                size="sm"
                                onClick={() => openModal('recordPayment', { bookingId: b.id })}
                                className="bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white font-semibold shadow-2xs"
                              >
                                <Wallet size={13} /> Collect
                              </Button>
                            </>
                          )}
                          <button
                            onClick={() => navigate({ page: 'booking', id: b.id })}
                            title="View Booking & Payments"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((b) => {
              const style = PAYMENT_STATUS_STYLE[b.payStatus];
              return (
                <Card key={b.id} onClick={() => navigate({ page: 'booking', id: b.id })} hover className="p-4 rounded-2xl border border-gray-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900">{b.customer?.name || b.title}</p>
                    <Badge className={style.badge} dot={style.dot}>{style.label}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{b.event_type} · {formatDate(b.event_date)}</p>
                  <div className="flex items-center justify-between text-sm pt-2.5 border-t border-gray-100">
                    <div className="flex gap-3 text-xs">
                      <span className="text-gray-400">Total <span className="font-bold text-gray-900">{formatCurrency(b.total_amount, CURRENCY)}</span></span>
                      {b.balance > 0 && <span className="text-rose-600 font-bold">Due {formatCurrency(b.balance, CURRENCY)}</span>}
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {b.balance > 0 && (
                        <>
                          <button
                            onClick={(e) => sendWhatsAppReminder(b, e)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700"
                            title="WhatsApp Reminder"
                          >
                            <MessageCircle size={14} />
                          </button>
                          <Button size="sm" onClick={() => openModal('recordPayment', { bookingId: b.id })}>Pay</Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
