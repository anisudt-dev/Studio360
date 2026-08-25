import { useMemo } from 'react';
import { Package, ChevronRight } from 'lucide-react';
import { useBookings } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { Card, PageHeader, EmptyState, Skeleton, Badge, Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { PROJECT_STATUS_STYLE } from '@/lib/constants';

const CURRENCY = '₹';

export function DeliverablesPage() {
  const { bookings, loading } = useBookings();
  const { navigate, openModal } = useNav();

  const deliverables = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'cancelled' && (b.project_status === 'editing' || b.project_status === 'delivered'))
      .sort((a, b) => {
        const order = { editing: 0, delivered: 1 };
        return order[a.project_status as keyof typeof order] - order[b.project_status as keyof typeof order];
      });
  }, [bookings]);

  const editingCount = deliverables.filter((b) => b.project_status === 'editing').length;
  const deliveredCount = deliverables.filter((b) => b.project_status === 'delivered').length;

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-40" /><Skeleton className="h-64" /></div>;

  return (
    <div>
      <PageHeader
        title="Deliverables"
        subtitle={`${editingCount} in editing · ${deliveredCount} ready for delivery`}
        actions={<Button onClick={() => openModal('addBooking', {})}>New Booking</Button>}
      />

      {deliverables.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package size={26} />}
            title="No deliverables pending"
            description="Bookings in editing or ready for delivery will appear here"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {deliverables.map((b) => {
            const style = PROJECT_STATUS_STYLE[b.project_status];
            return (
              <Card key={b.id} onClick={() => navigate({ page: 'booking', id: b.id })} hover className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-gray-900 truncate">{b.title || b.customer?.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{b.event_type} · {formatDate(b.event_date)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {b.balance > 0 && (
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(b.balance, CURRENCY)}</span>
                    )}
                    <Badge className={style.badge} dot={style.dot}>{style.label}</Badge>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
