import { useMemo, useState } from 'react';
import {
  Plus, Search, CalendarCheck, ChevronRight, MapPin, Wallet,
  Pencil, Trash2, Eye, Calendar, CheckSquare, Square, CheckCircle2,
  PackageCheck, RefreshCw, Filter
} from 'lucide-react';
import { useBookings } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { api } from '@/lib/api';
import { Card, Button, PageHeader, EmptyState, Skeleton, Badge, Select } from '@/components/ui';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { formatCurrency, formatDate, daysFromNow } from '@/lib/format';
import { toast } from '@/components/Toast';
import {
  BOOKING_STATUS_STYLE, PROJECT_STATUS_STYLE, nextAction, EVENT_TYPES,
} from '@/lib/constants';
import type { BookingWithCustomer, ProjectStatus } from '@/lib/types';

const CURRENCY = '₹';

function getEventEmoji(eventType?: string) {
  if (!eventType) return '📷';
  const type = eventType.toLowerCase();
  if (type.includes('wedding') || type.includes('reception') || type.includes('pre-wedding') || type.includes('engagement')) return '💒';
  if (type.includes('birthday') || type.includes('baby')) return '🎂';
  if (type.includes('maternity')) return '🤰';
  if (type.includes('corporate') || type.includes('event')) return '🎉';
  return '📷';
}

export function BookingsPage() {
  const { bookings, loading, mutate } = useBookings();
  const { navigate, openModal } = useNav();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Bulk Actions Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        if (statusFilter !== 'all' && b.project_status !== statusFilter) return false;
        if (typeFilter !== 'all' && b.event_type !== typeFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            (b.customer?.name || '').toLowerCase().includes(q) ||
            (b.title || '').toLowerCase().includes(q) ||
            b.event_type.toLowerCase().includes(q) ||
            (b.venue || '').toLowerCase().includes(q) ||
            (b.customer?.mobile || '').includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const ad = a.event_date || '9999';
        const bd = b.event_date || '9999';
        return ad < bd ? -1 : 1;
      });
  }, [bookings, search, statusFilter, typeFilter]);

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((b) => b.id));
    }
  }

  function toggleSelectOne(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleBulkStatusChange(newStatus: ProjectStatus) {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedIds.map((id) => api.updateBooking(id, { project_status: newStatus })));
      toast(`Updated ${selectedIds.length} booking(s) to ${newStatus}`, 'success');
      setSelectedIds([]);
      mutate();
    } catch (err: any) {
      toast(err.message || 'Could not update bookings', 'error');
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected booking(s)?`)) return;

    setBulkProcessing(true);
    try {
      await Promise.all(selectedIds.map((id) => api.deleteBooking(id)));
      toast(`Deleted ${selectedIds.length} booking(s)`, 'success');
      setSelectedIds([]);
      mutate();
    } catch (err: any) {
      toast(err.message || 'Could not delete bookings', 'error');
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleDeleteOne(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      await api.deleteBooking(id);
      toast('Booking deleted', 'success');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Could not delete booking', 'error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions & Switch Calendar View */}
      <PageHeader
        title="Bookings & Events"
        subtitle={`Managing ${bookings.length} total studio bookings`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ page: 'calendar' })}
              title="Switch to Calendar Schedule View"
              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Calendar size={15} className="text-teal-600" /> Calendar View
            </button>
            <Button onClick={() => openModal('addBooking', {})} title="Create a new booking entry">
              <Plus size={16} /> New Booking
            </Button>
          </div>
        }
      />

      {/* 4. Bulk Action Bar (Appears when items are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-teal-900 text-white px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-slide-up">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-teal-700 text-teal-100 px-2 py-0.5 rounded-full">{selectedIds.length}</span>
            <span>Bookings Selected</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange('confirmed')}
              className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 font-semibold transition-colors flex items-center gap-1 border border-teal-700"
            >
              <CheckCircle2 size={13} /> Mark Confirmed
            </button>
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange('editing')}
              className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 font-semibold transition-colors flex items-center gap-1 border border-purple-700"
            >
              <RefreshCw size={13} /> Mark In Editing
            </button>
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange('delivered')}
              className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 font-semibold transition-colors flex items-center gap-1 border border-emerald-700"
            >
              <PackageCheck size={13} /> Mark Delivered
            </button>
            <button
              disabled={bulkProcessing}
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-800 hover:bg-rose-700 font-semibold transition-colors flex items-center gap-1 border border-rose-700 ml-auto sm:ml-2"
            >
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* 5. Accessible Search & Filtering Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 py-2 text-sm focus-ring focus:border-teal-500 shadow-2xs"
            placeholder="Search by customer name, mobile, event type, or venue..."
            title="Search booking records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-2 text-xs font-semibold"
            title="Filter by Event Category"
          >
            <option value="all">All Event Types</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 text-xs font-semibold"
            title="Filter by Workflow Status"
          >
            <option value="all">All Workflow Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="shooting">Shooting</option>
            <option value="editing">Editing</option>
            <option value="delivered">Delivered</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarCheck size={26} />}
            title={search || statusFilter !== 'all' || typeFilter !== 'all' ? 'No bookings match your filters' : 'No bookings recorded yet'}
            description={search || statusFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting or clearing your search filters' : 'Create your first studio booking entry'}
            action={!search && statusFilter === 'all' && typeFilter === 'all' && <Button onClick={() => openModal('addBooking', {})}><Plus size={16} /> New Booking</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block overflow-hidden rounded-2xl border-gray-200/80 shadow-2xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 bg-gray-50/50 border-b border-gray-100 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button onClick={toggleSelectAll} title="Select All Bookings">
                      {allSelected ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} className="text-gray-300" />}
                    </button>
                  </th>
                  <th className="py-3 px-4 font-bold">Customer & Venue</th>
                  <th className="py-3 px-4 font-bold">Event Type</th>
                  <th className="py-3 px-4 font-bold">Shoot Date</th>
                  <th className="py-3 px-4 font-bold text-right">Total Contract</th>
                  <th className="py-3 px-4 font-bold">Payment Status</th>
                  <th className="py-3 px-4 font-bold">Workflow Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => {
                  const ps = PROJECT_STATUS_STYLE[b.project_status];
                  const isSelected = selectedIds.includes(b.id);
                  const dn = daysFromNow(b.event_date);
                  const dayLabel = dn === 0 ? 'Today' : dn === 1 ? 'Tomorrow' : dn === -1 ? 'Yesterday' : formatDate(b.event_date);
                  const emoji = getEventEmoji(b.event_type);

                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate({ page: 'booking', id: b.id })}
                      className={`hover:bg-teal-50/30 cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => toggleSelectOne(b.id, e)}>
                        <button title="Select Booking">
                          {isSelected ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} className="text-gray-300 hover:text-gray-500" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{emoji}</span>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-teal-600">{b.title || b.customer?.name || '—'}</p>
                            {b.venue && <p className="text-xs text-gray-400 truncate max-w-[160px] flex items-center gap-0.5"><MapPin size={10} /> {b.venue}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-700">{b.event_type}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">{dayLabel}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-gray-900 whitespace-nowrap">
                        {formatCurrency(b.total_amount, CURRENCY)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PaymentStatusBadge totalAmount={b.total_amount} paidAmount={b.paid_amount} balance={b.balance} />
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge className={ps.badge} dot={ps.dot}>{ps.label}</Badge>
                      </td>

                      {/* 1. Explicit Action Buttons with Icons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {b.balance > 0 && (
                            <button
                              onClick={() => openModal('recordPayment', { bookingId: b.id })}
                              title="Collect Pending Payment"
                              className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                            >
                              <Wallet size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => navigate({ page: 'booking', id: b.id })}
                            title="View Booking Details & Edit"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteOne(b.id, e)}
                            title="Delete Booking Entry"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((b) => {
              const ps = PROJECT_STATUS_STYLE[b.project_status];
              const isSelected = selectedIds.includes(b.id);
              const dn = daysFromNow(b.event_date);
              const dayLabel = dn === 0 ? 'Today' : dn === 1 ? 'Tomorrow' : dn === -1 ? 'Yesterday' : formatDate(b.event_date);
              const emoji = getEventEmoji(b.event_type);

              return (
                <Card
                  key={b.id}
                  onClick={() => navigate({ page: 'booking', id: b.id })}
                  hover
                  className={`p-4 rounded-2xl border border-gray-200/80 ${isSelected ? 'border-teal-500 bg-teal-50/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button onClick={(e) => toggleSelectOne(b.id, e)} className="mt-0.5 shrink-0">
                        {isSelected ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} className="text-gray-300" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{emoji}</span>
                          <p className="text-base font-bold text-gray-900 truncate">{b.title || b.customer?.name}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{b.event_type} · {dayLabel}</p>
                        {b.venue && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {b.venue}</p>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="text-base font-extrabold text-gray-900">{formatCurrency(b.total_amount, CURRENCY)}</p>
                      <Badge className={ps.badge} dot={ps.dot}>{ps.label}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs">
                    <PaymentStatusBadge totalAmount={b.total_amount} paidAmount={b.paid_amount} balance={b.balance} />
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {b.balance > 0 && (
                        <button
                          onClick={() => openModal('recordPayment', { bookingId: b.id })}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold hover:bg-teal-100 flex items-center gap-1"
                        >
                          <Wallet size={12} /> Pay
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteOne(b.id, e)}
                        className="p-1 text-gray-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
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
