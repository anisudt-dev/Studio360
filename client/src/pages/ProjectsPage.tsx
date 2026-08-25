import { useState, useMemo } from 'react';
import { Plus, LayoutGrid, List, Users, Calendar as CalIcon, GripVertical } from 'lucide-react';
import { useBookings } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { Card, Button, PageHeader, EmptyState, Skeleton, Badge } from '@/components/ui';
import { toast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, daysFromNow } from '@/lib/format';
import { PROJECT_FLOW, PROJECT_STATUS_STYLE } from '@/lib/constants';
import type { ProjectStatus, BookingWithCustomer } from '@/lib/types';

const CURRENCY = '₹';

export function ProjectsPage() {
  const { bookings, loading, refresh } = useBookings();
  const { navigate, openModal } = useNav();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const columns = useMemo(() => {
    const cols: Record<string, BookingWithCustomer[]> = {};
    PROJECT_FLOW.forEach((s) => (cols[s] = []));
    bookings.forEach((b) => {
      if (b.status === 'cancelled') return;
      if (cols[b.project_status]) cols[b.project_status].push(b);
    });
    return cols;
  }, [bookings]);

  async function changeStatus(bookingId: string, newStatus: ProjectStatus) {
    const { error } = await supabase.from('bookings').update({ project_status: newStatus }).eq('id', bookingId);
    if (error) { toast('Could not move project', 'error'); return; }
    toast('Project moved', 'success');
    refresh();
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96" /></div>;
  }

  const activeCount = bookings.filter((b) => b.status !== 'cancelled' && b.project_status !== 'delivered').length;

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${activeCount} active projects`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-gray-200 p-0.5 bg-white">
              <button onClick={() => setView('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>
                <LayoutGrid size={15} /> Kanban
              </button>
              <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>
                <List size={15} /> List
              </button>
            </div>
            <Button onClick={() => openModal('addBooking', {})}><Plus size={16} /> Add</Button>
          </div>
        }
      />

      {activeCount === 0 ? (
        <Card><EmptyState icon={<LayoutGrid size={26} />} title="No active projects" description="Confirmed bookings appear here as projects" action={<Button onClick={() => openModal('addBooking', {})}><Plus size={16} /> Add Booking</Button>} /></Card>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PROJECT_FLOW.map((status) => {
            const style = PROJECT_STATUS_STYLE[status];
            const items = columns[status] || [];
            return (
              <div
                key={status}
                className={`w-72 shrink-0 rounded-2xl border bg-gray-50/50 transition-colors ${dropTarget === status ? 'drop-target' : 'border-gray-200'}`}
                onDragOver={(e) => { e.preventDefault(); setDropTarget(status); }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => { e.preventDefault(); setDropTarget(null); if (dragId) changeStatus(dragId, status); setDragId(null); }}
              >
                <div className="px-4 py-3 flex items-center justify-between sticky top-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    <span className="text-sm font-semibold text-gray-900">{style.label}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-white rounded-full px-2 py-0.5">{items.length}</span>
                </div>
                <div className="px-2 pb-2 space-y-2 min-h-[100px]">
                  {items.map((b) => {
                    const dn = daysFromNow(b.event_date);
                    return (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={() => setDragId(b.id)}
                        onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                        onClick={() => navigate({ page: 'booking', id: b.id })}
                        className={`group bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all ${dragId === b.id ? 'dragging' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{b.title || b.customer?.name}</p>
                          <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 shrink-0" />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{b.event_type}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <CalIcon size={11} /> {formatDate(b.event_date)}
                          </span>
                          {b.balance > 0 && <span className="text-xs font-semibold text-red-600">{formatCurrency(b.balance, CURRENCY)}</span>}
                        </div>
                        {b.team_size > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                            <Users size={11} /> Team {b.team_size}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {items.length === 0 && <div className="text-center py-6 text-xs text-gray-300">Drag cards here</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="font-medium py-3 px-4">Customer</th>
                <th className="font-medium py-3 px-4">Event</th>
                <th className="font-medium py-3 px-4">Date</th>
                <th className="font-medium py-3 px-4 text-right">Balance</th>
                <th className="font-medium py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.filter((b) => b.status !== 'cancelled').map((b) => {
                const style = PROJECT_STATUS_STYLE[b.project_status];
                return (
                  <tr key={b.id} onClick={() => navigate({ page: 'booking', id: b.id })} className="hover:bg-gray-50/50 cursor-pointer">
                    <td className="py-3 px-4 font-semibold text-gray-900">{b.customer?.name}</td>
                    <td className="py-3 px-4 text-gray-600">{b.event_type}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(b.event_date)}</td>
                    <td className="py-3 px-4 text-right">{b.balance > 0 ? <span className="font-semibold text-red-600">{formatCurrency(b.balance, CURRENCY)}</span> : <span className="text-gray-400">—</span>}</td>
                    <td className="py-3 px-4">
                      <Badge className={style.badge} dot={style.dot}>{style.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
