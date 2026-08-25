import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, MapPin, Clock, CalendarDays, Plus, Pencil, Wallet,
  AlertCircle, Sparkles, Calendar as CalendarIcon, ListFilter
} from 'lucide-react';
import { useBookings } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { Card, Button, PageHeader, Skeleton, Badge } from '@/components/ui';
import { formatDate, formatTime, monthLabel, todayISO, daysFromNow, formatCurrency } from '@/lib/format';
import { PROJECT_STATUS_STYLE } from '@/lib/constants';
import type { BookingWithCustomer } from '@/lib/types';

const CURRENCY = '₹';

function getEventStyle(eventType?: string) {
  if (!eventType) return { emoji: '📷', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
  const type = eventType.toLowerCase();
  if (type.includes('wedding') || type.includes('reception') || type.includes('pre-wedding') || type.includes('engagement')) {
    return { emoji: '💒', bg: 'bg-teal-50 text-teal-800 border-teal-200 font-semibold' };
  }
  if (type.includes('birthday') || type.includes('baby')) {
    return { emoji: '🎂', bg: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold' };
  }
  if (type.includes('maternity')) {
    return { emoji: '🤰', bg: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold' };
  }
  if (type.includes('corporate') || type.includes('event')) {
    return { emoji: '🎉', bg: 'bg-purple-50 text-purple-800 border-purple-200 font-semibold' };
  }
  return { emoji: '📷', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold' };
}

export function CalendarPage() {
  const { bookings, loading } = useBookings();
  const { navigate, openModal } = useNav();
  const [view, setView] = useState<'today' | 'week' | 'month' | 'list'>('month');
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayISO());

  const today = todayISO();

  const eventsByDate = useMemo(() => {
    const map: Record<string, BookingWithCustomer[]> = {};
    bookings.forEach((b) => {
      if (b.event_date && b.status !== 'cancelled') {
        if (!map[b.event_date]) map[b.event_date] = [];
        map[b.event_date].push(b);
      }
    });
    return map;
  }, [bookings]);

  const calendarDays = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [current]);

  const weekDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startWeekday = start.getDay();
    start.setDate(start.getDate() - startWeekday);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const todayEvents = useMemo(() => (eventsByDate[today] || []).sort((a, b) => (a.start_time || '99') < (b.start_time || '99') ? -1 : 1), [eventsByDate, today]);

  const allScheduledBookings = useMemo(() => {
    return bookings
      .filter((b) => b.event_date && b.status !== 'cancelled')
      .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1));
  }, [bookings]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  function prevMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1)); }
  function nextMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1)); }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-40" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-4">
      {/* Page Header with 4 View Switcher & Add Event Trigger */}
      <PageHeader
        title="Shoot Schedule Calendar"
        subtitle="Manage upcoming photoshoots and studio events"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['today', 'week', 'month', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                    view === v ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {v === 'today' ? 'Day' : v}
                </button>
              ))}
            </div>

            {/* Prominent Add Event Button */}
            <Button onClick={() => openModal('addBooking', { date: selectedDate || today })} title="Schedule a shoot for selected date">
              <Plus size={16} /> Add Event
            </Button>
          </div>
        }
      />

      {/* Today Alert Banner */}
      {todayEvents.length > 0 && (
        <div className="bg-teal-50 border border-teal-200/80 text-teal-900 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles size={16} className="text-teal-600 shrink-0" />
            <span>Today's Reminder: {todayEvents.length} shoot{todayEvents.length === 1 ? '' : 's'} scheduled ({todayEvents.map((b) => `${b.customer?.name || b.title} - ${b.event_type}`).join(', ')}).</span>
          </div>
        </div>
      )}

      {/* TODAY View */}
      {view === 'today' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{formatDate(today)}</p>
          {todayEvents.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarDays className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-sm font-bold text-gray-800">No events scheduled for today</p>
              <p className="text-xs text-gray-400 mt-1">Click below to add a shoot schedule</p>
              <div className="mt-4">
                <Button size="sm" onClick={() => openModal('addBooking', { date: today })}><Plus size={14} /> Schedule Shoot</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((b) => (
                <EventCard key={b.id} booking={b} onNavigate={() => navigate({ page: 'booking', id: b.id })} openModal={openModal} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* WEEK View */}
      {view === 'week' && (
        <div className="space-y-4">
          {weekDays.map((d) => {
            const iso = d.toISOString().slice(0, 10);
            const events = eventsByDate[iso] || [];
            const isToday = iso === today;
            const dn = daysFromNow(iso);
            const dayLabel = dn === 0 ? 'Today' : dn === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <div key={iso} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-teal-700 font-extrabold' : 'text-gray-500'}`}>{dayLabel}</span>
                  <button
                    onClick={() => openModal('addBooking', { date: iso })}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-0.5"
                  >
                    + Add Shoot
                  </button>
                </div>
                {events.length > 0 ? (
                  <div className="space-y-2">
                    {events.map((b) => (
                      <EventCard key={b.id} booking={b} onNavigate={() => navigate({ page: 'booking', id: b.id })} openModal={openModal} />
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    No shoots scheduled
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LIST View */}
      {view === 'list' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Scheduled Shoots ({allScheduledBookings.length})</p>
          {allScheduledBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarDays className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-sm font-bold text-gray-800">No scheduled shoots found</p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {allScheduledBookings.map((b) => (
                <EventCard key={b.id} booking={b} onNavigate={() => navigate({ page: 'booking', id: b.id })} openModal={openModal} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MONTH View */}
      {view === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Month Grid */}
          <Card className="lg:col-span-8 p-5 rounded-2xl border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">{monthLabel(current)}</h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={prevMonth} title="Previous Month"><ChevronLeft size={18} /></Button>
                <Button variant="ghost" size="sm" onClick={() => { setCurrent(new Date()); setSelectedDate(today); }}>Today</Button>
                <Button variant="ghost" size="icon" onClick={nextMonth} title="Next Month"><ChevronRight size={18} /></Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={i} className="aspect-square bg-gray-50/20 rounded-xl" />;
                const iso = date.toISOString().slice(0, 10);
                const events = eventsByDate[iso] || [];
                const isToday = iso === today;
                const isSelected = iso === selectedDate;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(iso)}
                    className={`aspect-square rounded-xl p-1.5 text-left transition-all border flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/80 shadow-2xs'
                        : isToday
                        ? 'border-teal-300 bg-teal-50/30'
                        : 'border-gray-200/60 bg-white hover:border-teal-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isToday ? 'text-teal-700' : 'text-gray-800'}`}>
                        {date.getDate()}
                      </span>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />}
                    </div>

                    {events.length > 0 && (
                      <div className="space-y-0.5 mt-1 overflow-hidden">
                        {events.slice(0, 2).map((b) => {
                          const estyle = getEventStyle(b.event_type);
                          return (
                            <div key={b.id} className={`text-[10px] truncate rounded px-1 py-0.5 border ${estyle.bg} flex items-center gap-0.5`}>
                              <span>{estyle.emoji}</span>
                              <span className="truncate">{b.customer?.name || b.event_type}</span>
                            </div>
                          );
                        })}
                        {events.length > 2 && <div className="text-[9px] font-bold text-gray-400">+{events.length - 2} more</div>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Right Day Detail & Reschedule Sidebar */}
          <Card className="lg:col-span-4 p-5 rounded-2xl border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {selectedDate ? formatDate(selectedDate) : 'Select a date'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedEvents.length} shoot{selectedEvents.length !== 1 ? 's' : ''} scheduled</p>
              </div>

              {/* Add event directly on date */}
              <button
                onClick={() => openModal('addBooking', { date: selectedDate || today })}
                className="px-2.5 py-1 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                title="Add event directly to this date"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CalendarDays className="mx-auto text-gray-300" size={32} />
                <p className="text-xs font-semibold text-gray-400">No events on this day</p>
                <button
                  onClick={() => openModal('addBooking', { date: selectedDate || today })}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800 underline"
                >
                  + Schedule a Shoot
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((b) => (
                  <EventCard
                    key={b.id}
                    booking={b}
                    onNavigate={() => navigate({ page: 'booking', id: b.id })}
                    openModal={openModal}
                    compact
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function EventCard({
  booking: b,
  onNavigate,
  openModal,
  compact
}: {
  booking: BookingWithCustomer;
  onNavigate: () => void;
  openModal: (type: string, props?: any) => void;
  compact?: boolean;
}) {
  const ps = PROJECT_STATUS_STYLE[b.project_status];
  const estyle = getEventStyle(b.event_type);

  return (
    <Card onClick={onNavigate} hover className={`p-3.5 border border-gray-200/80 hover:border-teal-300 transition-all rounded-2xl cursor-pointer group`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-base shrink-0 mt-0.5">{estyle.emoji}</span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
              {b.customer?.name || b.title}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">{b.event_type}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-400">
              {b.start_time && <span className="flex items-center gap-1 font-medium text-gray-600"><Clock size={11} /> {formatTime(b.start_time)}</span>}
              {b.venue && <span className="flex items-center gap-1"><MapPin size={11} /> {b.venue}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge className={ps.badge} dot={ps.dot}>{ps.label}</Badge>
          <span className="text-xs font-black text-gray-900">{formatCurrency(b.total_amount, CURRENCY)}</span>
        </div>
      </div>

      {/* Inline Quick Action Buttons */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs" onClick={(e) => e.stopPropagation()}>
        {b.balance > 0 ? (
          <span className="text-xs font-bold text-amber-600">{formatCurrency(b.balance, CURRENCY)} balance due</span>
        ) : (
          <span className="text-xs font-bold text-emerald-600">Paid in full</span>
        )}

        <div className="flex items-center gap-1.5">
          {b.balance > 0 && (
            <button
              onClick={() => openModal('recordPayment', { bookingId: b.id })}
              title="Collect Payment"
              className="px-2 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold hover:bg-teal-100 transition-colors flex items-center gap-1"
            >
              <Wallet size={12} /> Pay
            </button>
          )}
          <button
            onClick={onNavigate}
            title="Edit Shoot Schedule"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>
    </Card>
  );
}
