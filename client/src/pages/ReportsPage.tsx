import { useMemo, useState } from 'react';
import {
  TrendingUp, CalendarCheck, Wallet, CheckCircle2, XCircle, BarChart3,
  Download, Printer, Filter, Mail, Sparkles, PieChart, FileText, ShieldAlert
} from 'lucide-react';
import { useBookings } from '@/lib/hooks';
import { Card, PageHeader, Skeleton, ProgressBar, Select, Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { EVENT_TYPES } from '@/lib/constants';
import { toast } from '@/components/Toast';
import { OutstandingReport } from '@/components/OutstandingReport';

const CURRENCY = '₹';

export function ReportsPage() {
  const { bookings, loading } = useBookings();
  const [activeTab, setActiveTab] = useState<'analytics' | 'outstanding'>('analytics');
  const [timeRange, setTimeRange] = useState<'6m' | 'year' | 'all'>('6m');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);


  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (typeFilter !== 'all' && b.event_type !== typeFilter) return false;
      return true;
    });
  }, [bookings, typeFilter]);

  const stats = useMemo(() => {
    const active = filteredBookings.filter((b) => b.status !== 'cancelled');
    const totalValue = active.reduce((s, b) => s + b.total_amount, 0);
    const collected = active.reduce((s, b) => s + b.paid_amount, 0);
    const pending = active.reduce((s, b) => s + Math.max(0, b.balance), 0);
    const completed = active.filter((b) => b.project_status === 'delivered').length;
    const cancelled = filteredBookings.filter((b) => b.status === 'cancelled').length;
    return { count: active.length, totalValue, collected, pending, completed, cancelled };
  }, [filteredBookings]);

  const monthly = useMemo(() => {
    const now = new Date();
    const countMonths = timeRange === '6m' ? 6 : timeRange === 'year' ? 12 : 12;
    const months: { label: string; value: number; collected: number }[] = [];

    for (let i = countMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const monthBookings = filteredBookings.filter((b) => {
        if (!b.event_date || b.status === 'cancelled') return false;
        const bd = new Date(b.event_date);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
      });

      months.push({
        label,
        value: monthBookings.reduce((s, b) => s + b.total_amount, 0),
        collected: monthBookings.reduce((s, b) => s + b.paid_amount, 0),
      });
    }
    return months;
  }, [filteredBookings, timeRange]);

  const maxMonth = Math.max(...monthly.map((m) => m.value), 1);

  const byType = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filteredBookings.filter((b) => b.status !== 'cancelled').forEach((b) => {
      if (!map[b.event_type]) map[b.event_type] = { count: 0, value: 0 };
      map[b.event_type].count++;
      map[b.event_type].value += b.total_amount;
    });
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value);
  }, [filteredBookings]);

  function exportCSV() {
    if (filteredBookings.length === 0) return;
    const headers = ['Booking ID', 'Customer Name', 'Event Type', 'Event Date', 'Total Value (₹)', 'Paid Amount (₹)', 'Balance (₹)', 'Project Status'];
    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${b.customer?.name || b.title || ''}"`,
      `"${b.event_type || ''}"`,
      `"${b.event_date || ''}"`,
      b.total_amount || 0,
      b.paid_amount || 0,
      b.balance || 0,
      `"${b.project_status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `studio_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Downloaded Studio Analytics CSV Report', 'success');
  }

  function handlePrint() {
    window.print();
  }

  function toggleAutoEmail() {
    setAutoEmailEnabled((prev) => {
      const next = !prev;
      toast(next ? 'Automated Monthly Report Email Enabled' : 'Automated Monthly Report Email Disabled', 'info');
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Export & Automation Controls */}
      <PageHeader
        title="Reports & Financial Analytics"
        subtitle="Comprehensive studio business performance, revenue trends, and metrics"
        actions={
          activeTab === 'analytics' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={toggleAutoEmail}
                title="Toggle Automated Monthly Digest Email"
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs ${
                  autoEmailEnabled ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Mail size={15} className={autoEmailEnabled ? 'text-teal-600' : 'text-gray-400'} />
                {autoEmailEnabled ? 'Auto Email: Active' : 'Enable Auto Email'}
              </button>

              <button
                onClick={handlePrint}
                title="Print or Save PDF Report"
                className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Printer size={15} className="text-gray-600" /> Print PDF
              </button>

              <Button onClick={exportCSV} title="Export Report as CSV Spreadsheet">
                <Download size={15} /> Export CSV
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Tab Switcher (Analytics vs Customer Outstanding Statement) */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 no-print">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'analytics'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={15} /> Financial Analytics & Trends
        </button>

        <button
          onClick={() => setActiveTab('outstanding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'outstanding'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ShieldAlert size={15} /> Customer Outstanding Statement
        </button>
      </div>


      {activeTab === 'outstanding' ? (
        <OutstandingReport />
      ) : (
        <>
          {/* 1. Interactive Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-gray-200/80 rounded-2xl p-3 shadow-2xs">

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-teal-600 shrink-0" />
          <span className="text-xs font-bold text-gray-700">Filters:</span>
          
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 text-xs font-semibold"
            title="Filter by Event Category"
          >
            <option value="all">All Event Categories</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={() => setTimeRange('6m')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              timeRange === '6m' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Last 6 Months
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              timeRange === 'year' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Business Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><CalendarCheck size={16} className="text-teal-600" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bookings</p></div>
          <p className="text-3xl font-black text-gray-900">{stats.count}</p>
        </Card>

        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-blue-600" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Booking Value</p></div>
          <p className="text-3xl font-black text-gray-900">{formatCurrency(stats.totalValue, CURRENCY)}</p>
        </Card>

        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-emerald-600" /><p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Collected</p></div>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(stats.collected, CURRENCY)}</p>
        </Card>

        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-rose-600" /><p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Pending</p></div>
          <p className="text-3xl font-black text-rose-600">{formatCurrency(stats.pending, CURRENCY)}</p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend Graph */}
        <Card className="p-5 rounded-2xl border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={16} className="text-teal-600" /> Revenue & Collection Trends
            </h3>
            <span className="text-xs font-bold text-gray-400">{timeRange === '6m' ? 'Last 6 Months' : 'Last 12 Months'}</span>
          </div>

          <div className="flex items-end justify-between gap-2 h-44 pt-4">
            {monthly.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex flex-col justify-end items-center gap-1" style={{ height: '130px' }}>
                  <div
                    className="w-full max-w-[36px] bg-gradient-to-t from-teal-700 to-emerald-500 rounded-t-lg transition-all group-hover:scale-105"
                    style={{ height: `${(m.value / maxMonth) * 100}%` }}
                    title={`Target: ${formatCurrency(m.value, CURRENCY)} | Collected: ${formatCurrency(m.collected, CURRENCY)}`}
                  />
                </div>
                <span className="text-[11px] font-bold text-gray-500">{m.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span>Period Revenue Total</span>
            <span className="font-bold text-gray-900">{formatCurrency(monthly.reduce((s, m) => s + m.value, 0), CURRENCY)}</span>
          </div>
        </Card>

        {/* Events by Type */}
        <Card className="p-5 rounded-2xl border-gray-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-teal-600" /> Revenue Distribution by Event Type
          </h3>
          {byType.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">No data for selected filters</p>
          ) : (
            <div className="space-y-3.5">
              {byType.slice(0, 6).map(([type, data]) => {
                const maxVal = byType[0][1].value;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-800">{type}</span>
                      <span className="text-xs font-semibold text-gray-500">{data.count} shoot{data.count === 1 ? '' : 's'} · {formatCurrency(data.value, CURRENCY)}</span>
                    </div>
                    <ProgressBar value={(data.value / maxVal) * 100} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* KPI Performance Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={16} className="text-emerald-600" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Shoots</p></div>
          <p className="text-2xl font-black text-gray-900">{stats.completed}</p>
        </Card>
        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><XCircle size={16} className="text-rose-600" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cancelled</p></div>
          <p className="text-2xl font-black text-gray-900">{stats.cancelled}</p>
        </Card>
        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-amber-600" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg. Deal Value</p></div>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.count > 0 ? stats.totalValue / stats.count : 0, CURRENCY)}</p>
        </Card>
        <Card className="p-5 border-gray-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-teal-600" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Collection Rate</p></div>
          <p className="text-2xl font-black text-gray-900">{stats.totalValue > 0 ? Math.round((stats.collected / stats.totalValue) * 100) : 0}%</p>
        </Card>
      </div>

      {/* 3. Detailed Financial Breakdown Table */}
      <Card className="overflow-hidden rounded-2xl border-gray-200/80 shadow-2xs">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText size={16} className="text-teal-600" /> Studio Financial Breakdown
          </h3>
          <span className="text-xs font-bold text-gray-400">{filteredBookings.length} Bookings Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 bg-gray-50/50 border-b border-gray-100 uppercase tracking-wider">
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Shoot Date</th>
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4 text-right">Collected</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4">Collection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{b.customer?.name || b.title}</td>
                  <td className="py-3.5 px-4 text-gray-600 font-medium">{b.event_type}</td>
                  <td className="py-3.5 px-4 text-gray-500 font-medium whitespace-nowrap">{formatDate(b.event_date)}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-gray-900 whitespace-nowrap">{formatCurrency(b.total_amount, CURRENCY)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(b.paid_amount, CURRENCY)}</td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {b.balance > 0 ? (
                      <span className="font-bold text-rose-600">{formatCurrency(b.balance, CURRENCY)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {b.balance <= 0 ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">Fully Paid</span>
                    ) : b.paid_amount > 0 ? (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">Partially Paid</span>
                    ) : (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">Unpaid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}
    </div>
  );
}

