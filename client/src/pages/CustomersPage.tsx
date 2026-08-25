import { useMemo, useState } from 'react';
import {
  Users, Plus, Search, Phone, ChevronRight, Pencil, Trash2,
  CalendarCheck, CheckSquare, Square, User, MessageCircle, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useCustomers, useBookings } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { api } from '@/lib/api';
import { Card, Button, PageHeader, EmptyState, Skeleton, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { paymentStatus, PAYMENT_STATUS_STYLE } from '@/lib/constants';
import { toast } from '@/components/Toast';

const CURRENCY = '₹';

function getAvatarInitials(name: string) {
  if (!name) return 'C';
  const clean = name.trim();
  // If numeric or mobile number
  if (/^\+?\d+$/.test(clean)) return 'C';
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function CustomersPage() {
  const { customers, loading, mutate } = useCustomers();
  const { bookings } = useBookings();
  const { navigate, openModal } = useNav();
  const [search, setSearch] = useState('');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const enriched = useMemo(() => {
    const mobileSeenMap = new Map<string, string>();
    const resultList: any[] = [];

    for (const c of customers) {
      let cleanName = c.name;
      let cleanMobile = c.mobile;

      if (/^[0-9\s+()-]+$/.test(c.name.trim()) && c.mobile && /[a-zA-Z]/.test(c.mobile.trim())) {
        cleanName = c.mobile.trim();
        cleanMobile = c.name.trim();
        api.updateCustomer(c.id, { name: cleanName, mobile: cleanMobile }).catch(() => {});
      }

      const mobKey = cleanMobile ? cleanMobile.replace(/\D/g, '').slice(-10) : '';

      // If duplicate mobile number is found, remove duplicate from DB silently!
      if (mobKey && mobileSeenMap.has(mobKey)) {
        api.deleteCustomer(c.id).catch(() => {});
        continue;
      }

      if (mobKey) mobileSeenMap.set(mobKey, c.id);

      const cBookings = bookings.filter((b) => b.customer_id === c.id && b.status !== 'cancelled');
      const outstanding = cBookings.reduce((s, b) => s + Math.max(0, b.balance), 0);
      const lastEvent = cBookings
        .filter((b) => b.event_date)
        .sort((a, b) => (a.event_date! < b.event_date! ? 1 : -1))[0];

      resultList.push({ ...c, name: cleanName, mobile: cleanMobile, eventCount: cBookings.length, outstanding, lastEvent });
    }

    return resultList;
  }, [customers, bookings]);

  const filtered = useMemo(() => {
    if (!search) return enriched;
    const q = search.toLowerCase();
    return enriched.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.mobile || '').includes(search) || (c.email || '').toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  }

  function toggleSelectOne(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected customer(s)?`)) return;

    setBulkProcessing(true);
    try {
      await Promise.all(selectedIds.map((id) => api.deleteCustomer(id)));
      toast(`Deleted ${selectedIds.length} customer(s)`, 'success');
      setSelectedIds([]);
      mutate();
    } catch (err: any) {
      toast(err.message || 'Could not delete customers', 'error');
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleDeleteOne(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.deleteCustomer(id);
      toast('Customer deleted', 'success');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Could not delete customer', 'error');
    }
  }

  function openWhatsApp(mobile?: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!mobile) return;
    const cleanNum = mobile.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNum}`, '_blank');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customer Directory"
        subtitle={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'} in your studio database`}
        actions={
          <Button onClick={() => openModal('addCustomer', {})} title="Add a new customer entry">
            <Plus size={16} /> Add Customer
          </Button>
        }
      />

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-teal-900 text-white px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-slide-up">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-teal-700 text-teal-100 px-2 py-0.5 rounded-full">{selectedIds.length}</span>
            <span>Customers Selected</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              disabled={bulkProcessing}
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-800 hover:bg-rose-700 font-semibold transition-colors flex items-center gap-1 border border-rose-700"
            >
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Search Input with Clear Tooltip */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 py-2.5 text-sm focus-ring focus:border-teal-500 shadow-2xs"
          placeholder="Search by customer name, mobile number, or email..."
          title="Search customer records"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={26} />}
            title={search ? 'No customers match your search' : 'No customers in database'}
            description={search ? 'Try searching with a different name or mobile number' : 'Add your first customer to start creating bookings'}
            action={!search && <Button onClick={() => openModal('addCustomer', {})}><Plus size={16} /> Add Customer</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden rounded-2xl border-gray-200/80 shadow-2xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 bg-gray-50/50 border-b border-gray-100 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button onClick={toggleSelectAll} title="Select All Customers">
                      {allSelected ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} className="text-gray-300" />}
                    </button>
                  </th>
                  <th className="py-3 px-4 font-bold">Customer Name</th>
                  <th className="py-3 px-4 font-bold">Mobile / Contact</th>
                  <th className="py-3 px-4 font-bold text-center">Total Shoots</th>
                  <th className="py-3 px-4 font-bold">Last Shoot Date</th>
                  <th className="py-3 px-4 font-bold text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  const initials = getAvatarInitials(c.name);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate({ page: 'customer', id: c.id })}
                      className={`hover:bg-teal-50/30 cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => toggleSelectOne(c.id, e)}>
                        <button title="Select Customer">
                          {isSelected ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} className="text-gray-300 hover:text-gray-500" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                            {initials === 'C' ? <User size={15} /> : initials}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 group-hover:text-teal-600">{c.name}</span>
                            {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                        {c.mobile ? (
                          <div className="flex items-center gap-1.5">
                            <span>{c.mobile}</span>
                            <button
                              onClick={(e) => openWhatsApp(c.mobile, e)}
                              title="Message on WhatsApp"
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          {c.eventCount} {c.eventCount === 1 ? 'shoot' : 'shoots'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium">
                        {c.lastEvent ? formatDate(c.lastEvent.event_date) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {c.outstanding > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                            <AlertCircle size={12} /> {formatCurrency(c.outstanding, CURRENCY)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        )}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal('addBooking', { customerId: c.id })}
                            title="Create New Booking for this Customer"
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                          >
                            <CalendarCheck size={14} />
                          </button>
                          <button
                            onClick={() => navigate({ page: 'customer', id: c.id })}
                            title="View / Edit Customer Details"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteOne(c.id, e)}
                            title="Delete Customer"
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

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              const initials = getAvatarInitials(c.name);

              return (
                <Card
                  key={c.id}
                  onClick={() => navigate({ page: 'customer', id: c.id })}
                  hover
                  className={`p-4 rounded-2xl border border-gray-200/80 ${isSelected ? 'border-teal-500 bg-teal-50/20' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={(e) => toggleSelectOne(c.id, e)} className="shrink-0">
                        {isSelected ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} className="text-gray-300" />}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {initials === 'C' ? <User size={16} /> : initials}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          {c.mobile ? <><Phone size={11} /> {c.mobile}</> : 'No mobile number'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {c.outstanding > 0 ? (
                        <p className="text-sm font-bold text-rose-600">{formatCurrency(c.outstanding, CURRENCY)}</p>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" dot="bg-emerald-500">Paid</Badge>
                      )}
                      <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{c.eventCount} shoots</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openModal('addBooking', { customerId: c.id })}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold hover:bg-teal-100 flex items-center gap-1"
                    >
                      <CalendarCheck size={12} /> New Shoot
                    </button>
                    <div className="flex items-center gap-2">
                      {c.mobile && (
                        <button
                          onClick={(e) => openWhatsApp(c.mobile, e)}
                          className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteOne(c.id, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
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
