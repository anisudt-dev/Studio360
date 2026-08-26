import { useMemo, useState } from 'react';
import {
  Camera, Wallet, Package, ArrowRight, MapPin, Sparkles, Clock, CalendarDays,
  ChevronRight, AlertCircle, SlidersHorizontal, Eye, EyeOff, TrendingUp, Activity,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useBookings } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { Card, Badge, Skeleton, Button } from '@/components/ui';
import {
  formatCurrency, formatDate, formatTime, greeting, daysFromNow, todayISO,
} from '@/lib/format';
import {
  PROJECT_STATUS_STYLE, paymentStatus, nextAction,
} from '@/lib/constants';

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

interface CustomViewConfig {
  showShoots: boolean;
  showPayments: boolean;
  showEditing: boolean;
}

export function DashboardPage() {
  const { bookings, loading } = useBookings();
  const { navigate, openModal } = useNav();
  const [view, setView] = useState<'today' | 'upcoming'>('today');
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Collapsible Section States
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // User Customizable Preferences (Persisted in localStorage)
  const [config, setConfig] = useState<CustomViewConfig>(() => {
    try {
      const saved = localStorage.getItem('studio_dashboard_config');
      return saved ? JSON.parse(saved) : { showShoots: true, showPayments: true, showEditing: true };
    } catch {
      return { showShoots: true, showPayments: true, showEditing: true };
    }
  });

  const updateConfig = (key: keyof CustomViewConfig) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('studio_dashboard_config', JSON.stringify(next));
      return next;
    });
  };

  const today = todayISO();

  // 1. Today's Shoots
  const todaysShoots = useMemo(() =>
    bookings.filter((b) => b.event_date === today && b.status !== 'cancelled')
      .sort((a, b) => (a.start_time || '99') < (b.start_time || '99') ? -1 : 1),
    [bookings, today]);

  // 2. Payments Due
  const pendingPayments = useMemo(() =>
    bookings.filter((b) => {
      if (b.status === 'cancelled' || b.balance <= 0) return false;
      const ps = paymentStatus(b.balance, b.event_date);
      return ps === 'overdue' || ps === 'due' || b.event_date === today;
    }),
    [bookings, today]);

  // Exclude bookings already shown in Today's Shoots to avoid duplicate cards on dashboard!
  const pendingPaymentsOther = useMemo(() =>
    pendingPayments.filter((b) => !todaysShoots.some((ts) => ts.id === b.id)),
    [pendingPayments, todaysShoots]);

  // Overdue payments list
  const overduePayments = useMemo(() =>
    pendingPayments.filter((b) => paymentStatus(b.balance, b.event_date) === 'overdue'),
    [pendingPayments]);

  // Today's due portion
  const todaysDueTotal = useMemo(() =>
    pendingPayments
      .filter((b) => b.event_date === today)
      .reduce((sum, b) => sum + b.balance, 0),
    [pendingPayments, today]);

  // 3. In Editing
  const editingJobs = useMemo(() =>
    bookings.filter((b) => b.status !== 'cancelled' && b.project_status === 'editing'),
    [bookings]);

  // 4. Delivery Due
  const deliveryDue = useMemo(() =>
    bookings.filter((b) => b.status !== 'cancelled' && b.project_status === 'editing')
      .filter((b) => {
        if (!b.event_date) return false;
        return daysFromNow(b.event_date) <= 3;
      })
      .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1)),
    [bookings]);

  // Total outstanding balance
  const outstandingTotal = useMemo(() =>
    bookings.reduce((s, b) => s + (b.balance > 0 && b.status !== 'cancelled' ? b.balance : 0), 0),
    [bookings]);

  // Total collected revenue
  const totalCollected = useMemo(() =>
    bookings.reduce((sum, b) => sum + (b.status !== 'cancelled' ? b.paid_amount || 0 : 0), 0),
    [bookings]);

  const totalContractValue = useMemo(() =>
    bookings.reduce((sum, b) => sum + (b.status !== 'cancelled' ? b.total_amount || 0 : 0), 0),
    [bookings]);

  const collectionPercent = totalContractValue > 0
    ? Math.round((totalCollected / totalContractValue) * 100)
    : 100;

  // Upcoming shoots count
  const upcomingCount = useMemo(() =>
    bookings.filter((b) => b.event_date && b.status !== 'cancelled' && daysFromNow(b.event_date) >= 1 && daysFromNow(b.event_date) <= 7).length,
    [bookings]);

  const tomorrowShoots = useMemo(() =>
    bookings.filter((b) => b.event_date && b.status !== 'cancelled' && daysFromNow(b.event_date) === 1),
    [bookings]);

  const upcomingWeek = useMemo(() =>
    bookings
      .filter((b) => b.event_date && b.status !== 'cancelled' && daysFromNow(b.event_date) > 1 && daysFromNow(b.event_date) <= 7)
      .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1)),
    [bookings]);

  if (loading) {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-8">
      {/* Overdue Payment Urgent Alert Banner */}
      {overduePayments.length > 0 && (
        <div className="bg-rose-50 border border-rose-200/80 text-rose-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle size={18} className="text-rose-600 shrink-0 animate-bounce" />
            <p className="text-xs font-semibold truncate">
              <span className="font-bold">Overdue Payment Alert:</span> {overduePayments.length} booking{overduePayments.length === 1 ? '' : 's'} requires payment collection ({formatCurrency(overduePayments.reduce((s, b) => s + b.balance, 0), CURRENCY)}).
            </p>
          </div>
          <button
            onClick={() => navigate({ page: 'payments' })}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline shrink-0"
          >
            Review Payments &rarr;
          </button>
        </div>
      )}

      {/* Spacious Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            {greeting()}
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">{dateStr}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Here is your photography studio overview for today.</p>
        </div>

        {/* Segmented Today / Upcoming View Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setView('today')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                view === 'today' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Today <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${view === 'today' ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-600'}`}>{todaysShoots.length}</span>
            </button>
            <button
              onClick={() => setView('upcoming')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                view === 'upcoming' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Upcoming <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${view === 'upcoming' ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-600'}`}>{upcomingCount}</span>
            </button>
          </div>

          {/* Customize View Toggle */}
          <div className="relative">
            <button
              onClick={() => setCustomizeOpen((v) => !v)}
              title="Customize visible sections"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 bg-white border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal size={15} />
            </button>

            {customizeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCustomizeOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 space-y-1">
                  <p className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visible Sections</p>
                  
                  <button
                    onClick={() => updateConfig('showShoots')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-gray-50"
                  >
                    <span>Today's Shoots</span>
                    {config.showShoots ? <Eye size={14} className="text-teal-600" /> : <EyeOff size={14} className="text-gray-400" />}
                  </button>

                  <button
                    onClick={() => updateConfig('showPayments')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-gray-50"
                  >
                    <span>Outstanding Payments</span>
                    {config.showPayments ? <Eye size={14} className="text-teal-600" /> : <EyeOff size={14} className="text-gray-400" />}
                  </button>

                  <button
                    onClick={() => updateConfig('showEditing')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-gray-50"
                  >
                    <span>In Editing Jobs</span>
                    {config.showEditing ? <Eye size={14} className="text-teal-600" /> : <EyeOff size={14} className="text-gray-400" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4 Clean Color-Coded Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Card 1: Today's Shoots (Emerald Color Code Accent) */}
        <Card onClick={() => navigate({ page: 'calendar' })} hover className="p-5 flex flex-col justify-between group rounded-2xl border-gray-200/80 border-l-4 border-l-teal-600 hover:border-teal-300 transition-all shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-gray-900 leading-none">{todaysShoots.length}</p>
              <span className="text-[11px] font-semibold text-teal-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Calendar <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-xs font-bold text-gray-700 mt-2.5 flex items-center gap-1">
              <Camera size={13} className="text-teal-600" /> Today's Shoots
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate font-medium">{todaysShoots.length > 0 ? Array.from(new Set(todaysShoots.map((b) => b.event_type))).join(', ') : 'No shoots scheduled'}</p>
        </Card>

        {/* Card 2: Payments Due (Amber Color Code Accent) */}
        <Card onClick={() => navigate({ page: 'payments' })} hover className="p-5 flex flex-col justify-between bg-gradient-to-br from-amber-50/70 via-white to-white border-amber-200 border-l-4 border-l-amber-500 shadow-2xs group rounded-2xl transition-all">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-950 leading-none tracking-tight truncate">{formatCurrency(outstandingTotal, CURRENCY)}</p>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                Action Req
              </span>
            </div>
            <p className="text-xs font-bold text-amber-950 mt-2.5 flex items-center gap-1">
              <Wallet size={13} className="text-amber-600" /> Outstanding Payments
            </p>
          </div>
          <p className="text-xs text-amber-700 font-medium mt-2 truncate">{pendingPayments.length} booking{pendingPayments.length === 1 ? '' : 's'} pending balance</p>
        </Card>


        {/* Card 3: In Editing (Purple Color Code Accent) */}
        <Card onClick={() => navigate({ page: 'deliverables' })} hover className="p-5 flex flex-col justify-between group rounded-2xl border-gray-200/80 border-l-4 border-l-purple-500 hover:border-purple-300 transition-all shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-gray-900 leading-none">{editingJobs.length}</p>
              <span className="text-[11px] font-semibold text-gray-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                Work status <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-xs font-bold text-gray-700 mt-2.5 flex items-center gap-1">
              <Sparkles size={13} className="text-purple-600" /> In Editing
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate font-medium">{editingJobs.length > 0 ? `${editingJobs.length} active editing jobs` : 'All caught up'}</p>
        </Card>

        {/* Card 4: Delivery Due (Emerald Color Code Accent) */}
        <Card onClick={() => navigate({ page: 'deliverables' })} hover className="p-5 flex flex-col justify-between group rounded-2xl border-gray-200/80 border-l-4 border-l-emerald-500 hover:border-emerald-300 transition-all shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-gray-900 leading-none">{deliveryDue.length}</p>
              <span className="text-[11px] font-semibold text-gray-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                Deliveries <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-xs font-bold text-gray-700 mt-2.5 flex items-center gap-1">
              <Package size={13} className="text-emerald-600" /> Delivery Due
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate font-medium">{deliveryDue.length > 0 ? `Next: ${formatDate(deliveryDue[0].event_date)}` : 'Nothing due today'}</p>
        </Card>
      </div>

      {/* Spacious 2-Column Dashboard Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
        {/* Left Column (8 cols on XL) */}
        <div className="xl:col-span-8 space-y-6">
          {/* TODAY VIEW */}
          {view === 'today' && (
            <div className="space-y-6">
              {/* Section 1: Today's Shoots (Collapsible) */}
              {config.showShoots && (
                <Section
                  title="Today's Shoots"
                  count={todaysShoots.length}
                  collapsed={collapsed['shoots']}
                  onToggle={() => toggleSection('shoots')}
                >
                  {todaysShoots.length === 0 ? (
                    <Card className="p-8 text-center bg-gray-50/40 border-dashed border-gray-200 rounded-2xl">
                      <p className="text-sm font-bold text-gray-800">No shoots scheduled today 🎉</p>
                      <p className="text-xs text-gray-400 mt-1">You're all clear for today. Time to catch up on editing or relax.</p>
                      <div className="mt-4 flex justify-center">
                        <button onClick={() => navigate({ page: 'calendar' })} className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                          View full schedule <ArrowRight size={12} />
                        </button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {todaysShoots.map((b) => {
                        const ps = PROJECT_STATUS_STYLE[b.project_status];
                        const action = nextAction(b);
                        const emoji = getEventEmoji(b.event_type);
                        const isPaid = b.balance <= 0;

                        return (
                          <Card
                            key={b.id}
                            onClick={() => navigate({ page: 'booking', id: b.id })}
                            hover
                            className={`p-4 sm:p-5 group cursor-pointer border border-gray-200/80 ${
                              isPaid ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'
                            } hover:border-teal-300 transition-all rounded-2xl shadow-2xs`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                                  {emoji}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                                    {b.customer?.name || b.title}
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-700">{b.event_type}</span>
                                    <span>·</span>
                                    {b.start_time && (
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Clock size={12} /> {formatTime(b.start_time)}
                                      </span>
                                    )}
                                    {b.venue && (
                                      <>
                                        <span>·</span>
                                        <span className="text-gray-500 flex items-center gap-1">
                                          <MapPin size={12} /> {b.venue}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                                <div className="text-left sm:text-right">
                                  <Badge className={ps.badge} dot={ps.dot}>{ps.label}</Badge>
                                  {b.balance > 0 ? (
                                    <p className="text-xs font-bold text-amber-600 mt-1">{formatCurrency(b.balance, CURRENCY)} due</p>
                                  ) : (
                                    <p className="text-xs font-bold text-emerald-600 mt-1">Paid in full</p>
                                  )}
                                </div>

                                {b.balance > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); openModal('recordPayment', { bookingId: b.id }); }}
                                    className="bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white font-semibold shadow-xs"
                                  >
                                    <Wallet size={13} /> Collect {formatCurrency(b.balance, CURRENCY)}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </Section>
              )}

              {/* Section 2: Other Pending Payments (Collapsible) */}
              {config.showPayments && pendingPaymentsOther.length > 0 && (
                <Section
                  title="Other Pending Payments"
                  count={pendingPaymentsOther.length}
                  collapsed={collapsed['payments']}
                  onToggle={() => toggleSection('payments')}
                >
                  <div className="space-y-3">
                    {pendingPaymentsOther.slice(0, 5).map((b) => {
                      const ps = paymentStatus(b.balance, b.event_date);
                      const isOverdue = ps === 'overdue';
                      const emoji = getEventEmoji(b.event_type);

                      return (
                        <Card
                          key={b.id}
                          onClick={() => navigate({ page: 'booking', id: b.id })}
                          hover
                          className={`p-4 flex items-center justify-between gap-4 cursor-pointer group rounded-2xl border border-gray-200/80 ${
                            isOverdue ? 'border-l-4 border-l-rose-500 bg-rose-50/20' : 'border-l-4 border-l-amber-500'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-base shrink-0">
                              {emoji}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                                {b.customer?.name || b.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {b.event_type} · {formatDate(b.event_date)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className={`text-sm font-extrabold ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                                {formatCurrency(b.balance, CURRENCY)} due
                              </p>
                              <p className={`text-[10px] font-semibold uppercase tracking-wider ${isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                                {isOverdue ? 'Overdue' : 'Advance Due'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); openModal('recordPayment', { bookingId: b.id }); }}
                              className="bg-teal-700 hover:bg-teal-800 transition-all shadow-xs"
                            >
                              <Wallet size={13} /> Collect
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Section 3: In Editing (Collapsible) */}
              {config.showEditing && (
                <Section
                  title="In Editing"
                  count={editingJobs.length}
                  collapsed={collapsed['editing']}
                  onToggle={() => toggleSection('editing')}
                >
                  {editingJobs.length === 0 ? (
                    <Card className="p-8 text-center bg-gray-50/40 border-dashed border-gray-200 rounded-2xl">
                      <p className="text-sm font-bold text-gray-800">All caught up 🎉</p>
                      <p className="text-xs text-gray-400 mt-1">No photos are waiting for editing right now.</p>
                      <div className="mt-3">
                        <button
                          onClick={() => navigate({ page: 'deliverables' })}
                          className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 inline-flex"
                        >
                          View completed deliverables &rarr;
                        </button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {editingJobs.slice(0, 5).map((b) => {
                        const emoji = getEventEmoji(b.event_type);
                        const action = nextAction(b);

                        return (
                          <Card
                            key={b.id}
                            onClick={() => navigate({ page: 'booking', id: b.id })}
                            hover
                            className="p-4 flex items-center justify-between gap-4 cursor-pointer group rounded-2xl border border-gray-200/80 border-l-4 border-l-purple-500"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-base shrink-0">
                                {emoji}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                                  {b.customer?.name || b.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {b.event_type} · Shot {formatDate(b.event_date)}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full shrink-0">
                              {action.label}
                            </span>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </Section>
              )}
            </div>
          )}

          {/* UPCOMING VIEW */}
          {view === 'upcoming' && (
            <div className="space-y-6">
              {tomorrowShoots.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-teal-600" /> Tomorrow
                  </h2>
                  <div className="space-y-3">
                    {tomorrowShoots.map((b) => {
                      const emoji = getEventEmoji(b.event_type);
                      return (
                        <Card
                          key={b.id}
                          onClick={() => navigate({ page: 'booking', id: b.id })}
                          hover
                          className="p-4 flex items-center justify-between gap-3 cursor-pointer group rounded-2xl border border-gray-200/80 border-l-4 border-l-teal-500"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-base shrink-0">
                              {emoji}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                                {b.customer?.name || b.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {b.event_type} {b.start_time ? `· ${formatTime(b.start_time)}` : ''}
                                {b.venue ? ` · 📍 ${b.venue}` : ''}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-teal-50 text-teal-700 border-teal-200">Tomorrow</Badge>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" /> Later This Week
                  </h2>
                  <button onClick={() => navigate({ page: 'bookings' })} className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                    All bookings <ArrowRight size={12} />
                  </button>
                </div>

                {upcomingWeek.length === 0 && tomorrowShoots.length === 0 ? (
                  <Card className="p-10 text-center space-y-2 bg-gray-50/40 border-dashed border-gray-200 rounded-2xl">
                    <p className="text-sm font-bold text-gray-800">No upcoming shoots this week</p>
                    <p className="text-xs text-gray-400">All quiet on the calendar for the next 7 days.</p>
                    <div className="pt-3">
                      <Button size="sm" onClick={() => openModal('addBooking', {})}>Create New Booking</Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {upcomingWeek.map((b) => {
                      const ps = PROJECT_STATUS_STYLE[b.project_status];
                      const emoji = getEventEmoji(b.event_type);

                      return (
                        <Card
                          key={b.id}
                          onClick={() => navigate({ page: 'booking', id: b.id })}
                          hover
                          className="p-4 cursor-pointer group rounded-2xl border border-gray-200/80 border-l-4 border-l-gray-300"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-base shrink-0">
                                {emoji}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                                  {b.customer?.name || b.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatDate(b.event_date)} · {b.event_type}
                                  {b.venue ? ` · 📍 ${b.venue}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <span className="text-xs font-bold text-gray-900">{formatCurrency(b.total_amount, CURRENCY)}</span>
                                {b.balance > 0 ? (
                                  <p className="text-[11px] font-semibold text-amber-600">{formatCurrency(b.balance, CURRENCY)} due</p>
                                ) : (
                                  <p className="text-[11px] font-semibold text-emerald-600">Paid</p>
                                )}
                              </div>
                              <Badge className={ps.badge} dot={ps.dot}>{ps.label}</Badge>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clean Right Column (4 cols on XL) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Revenue Collection Target Progress Card */}
          <Card className="p-5 space-y-4 rounded-2xl border-gray-200/80 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={15} className="text-teal-600" /> Revenue Target
              </h3>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                {collectionPercent}% Collected
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Collected: <strong className="text-gray-900 font-bold">{formatCurrency(totalCollected, CURRENCY)}</strong></span>
                <span className="text-gray-500 font-medium">Target: <strong className="text-gray-900 font-bold">{formatCurrency(totalContractValue, CURRENCY)}</strong></span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-600 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(collectionPercent, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-center text-xs">
              <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium">Active Bookings</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{bookings.filter((b) => b.status !== 'cancelled').length}</p>
              </div>
              <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-100">
                <p className="text-[10px] text-amber-600 font-medium">Pending Balances</p>
                <p className="text-base font-bold text-amber-700 mt-0.5">{formatCurrency(outstandingTotal, CURRENCY)}</p>
              </div>
            </div>
          </Card>

          {/* Clean Studio Recent Activity List */}
          <Card className="p-5 space-y-3.5 rounded-2xl border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={15} className="text-teal-600" /> Studio Activity
              </h3>
              <span className="text-[10px] font-bold text-gray-400">Live feed</span>
            </div>

            <div className="space-y-3 text-xs">
              {bookings.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  onClick={() => navigate({ page: 'booking', id: b.id })}
                  className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500 mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">{b.customer?.name || b.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{b.event_type} · {formatDate(b.event_date)}</p>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md capitalize shrink-0 border border-teal-100">
                    {b.project_status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        className="flex items-center justify-between cursor-pointer select-none mb-3 group"
      >
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 group-hover:text-gray-900 transition-colors">
          {title} {count !== undefined && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">{count}</span>}
        </h2>
        {onToggle && (
          <button className="text-gray-400 group-hover:text-gray-700 p-0.5 rounded-md hover:bg-gray-100 transition-colors">
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        )}
      </div>
      {!collapsed && children}
    </div>
  );
}
