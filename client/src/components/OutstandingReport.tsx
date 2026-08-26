import { useState, useMemo, useEffect } from 'react';
import {
  Printer, Download, Search, Filter, Camera, Phone, Mail, MapPin, AlertTriangle, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { useBookings } from '@/lib/hooks';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { Settings } from '@/lib/types';

const CURRENCY = '₹';

interface CustomerOutstandingGroup {
  customerId: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  totalBillAmount: number;
  totalPaidAmount: number;
  totalBalance: number;
  maxOverdueDays: number;
  bills: Array<{
    id: string;
    billNo: string;
    billDate: string;
    billAmount: number;
    paidAmount: number;
    balance: number;
    overdueDays: number;
    remarks: string;
  }>;
}

export function OutstandingReport() {
  const { bookings, loading } = useBookings();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'critical'>('all');
  const [asOnDate, setAsOnDate] = useState(todayISO());

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => null);
  }, []);

  // Compute Outstanding Data grouped by Customer
  const customerGroups = useMemo(() => {
    const map = new Map<string, CustomerOutstandingGroup>();
    const asOnTime = new Date(asOnDate).getTime();

    const activeWithBalance = bookings.filter((b) => b.status !== 'cancelled' && b.balance > 0);

    for (const b of activeWithBalance) {
      const cust = b.customer as any;
      const custId = cust?.id || b.customer_id || 'unknown';
      const custName = cust?.name || b.title || 'Unknown Customer';
      const custMobile = cust?.mobile || '—';
      const custEmail = cust?.email || '';
      const custAddress = cust?.address || '';


      // Calculate Overdue Days from Shoot Date / Event Date
      const eventTime = b.event_date ? new Date(b.event_date).getTime() : new Date(b.created_at).getTime();
      const diffDays = Math.max(0, Math.floor((asOnTime - eventTime) / (1000 * 60 * 60 * 24)));

      // Remarks string
      const remarksParts = [
        b.event_type ? `${b.event_type} Photography` : '',
        b.package_name ? `Pkg: ${b.package_name}` : '',
        b.notes || '',
      ].filter(Boolean);
      const remarks = remarksParts.join(' • ') || 'Photography Booking Balance';

      const billNo = `INV-${b.id.slice(0, 8).toUpperCase()}`;

      if (!map.has(custId)) {
        map.set(custId, {
          customerId: custId,
          name: custName,
          mobile: custMobile,
          email: custEmail,
          address: custAddress,
          totalBillAmount: 0,
          totalPaidAmount: 0,
          totalBalance: 0,
          maxOverdueDays: 0,
          bills: [],
        });
      }

      const group = map.get(custId)!;
      group.totalBillAmount += b.total_amount;
      group.totalPaidAmount += b.paid_amount;
      group.totalBalance += b.balance;
      group.maxOverdueDays = Math.max(group.maxOverdueDays, diffDays);

      group.bills.push({
        id: b.id,
        billNo,
        billDate: b.event_date || b.created_at.split('T')[0],
        billAmount: b.total_amount,
        paidAmount: b.paid_amount,
        balance: b.balance,
        overdueDays: diffDays,
        remarks,
      });
    }

    return Array.from(map.values());
  }, [bookings, asOnDate]);

  // Filtered Groups based on search and overdue filter
  const filteredGroups = useMemo(() => {
    return customerGroups.filter((g) => {
      const matchSearch =
        !search.trim() ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.mobile.includes(search) ||
        g.bills.some((b) => b.billNo.toLowerCase().includes(search.toLowerCase()) || b.remarks.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (filterType === 'overdue' && g.maxOverdueDays <= 0) return false;
      if (filterType === 'critical' && g.maxOverdueDays < 60) return false;

      return true;
    });
  }, [customerGroups, search, filterType]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const totalBalance = filteredGroups.reduce((s, g) => s + g.totalBalance, 0);
    const totalBillAmount = filteredGroups.reduce((s, g) => s + g.totalBillAmount, 0);
    const totalPaidAmount = filteredGroups.reduce((s, g) => s + g.totalPaidAmount, 0);
    const criticalBalance = filteredGroups
      .filter((g) => g.maxOverdueDays >= 60)
      .reduce((s, g) => s + g.totalBalance, 0);

    return {
      customerCount: filteredGroups.length,
      totalBillAmount,
      totalPaidAmount,
      totalBalance,
      criticalBalance,
    };
  }, [filteredGroups]);

  function handlePrint() {
    window.print();
  }

  function exportCSV() {
    if (filteredGroups.length === 0) return;
    const headers = ['Customer Name', 'Phone No', 'Bill No', 'Bill Date', 'Bill Amount (₹)', 'Advance/Paid (₹)', 'Balance (₹)', 'Overdue Days', 'Remarks'];
    const rows: string[][] = [];

    filteredGroups.forEach((g) => {
      g.bills.forEach((b) => {
        rows.push([
          `"${g.name}"`,
          `"${g.mobile}"`,
          `"${b.billNo}"`,
          `"${b.billDate}"`,
          b.billAmount.toString(),
          b.paidAmount.toString(),
          b.balance.toString(),
          b.overdueDays.toString(),
          `"${b.remarks}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_outstanding_statement_${asOnDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Exported Customer Outstanding Statement CSV', 'success');
  }

  const studioName = settings?.studio_name && settings.studio_name !== 'Studio ERP' ? settings.studio_name : 'Aishwarya Videos & Photos';
  const logoUrl = settings?.logo_url || '/logo.svg';
  const studioPhone = settings?.phone;
  const studioEmail = settings?.email;
  const studioAddress = settings?.address;

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Loading Customer Outstanding Records...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. Control & Filter Toolbar (Hidden during print) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600" />
              Customer Outstanding Statement
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Filter, monitor aging accounts, and export official statement reports</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Download size={14} className="text-gray-600" /> Export CSV
            </button>

            <Button onClick={handlePrint} size="sm" className="flex-1 sm:flex-initial">
              <Printer size={14} /> Print PDF Statement
            </Button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer name, phone, or bill #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>

          <Select value={filterType} onChange={(e: any) => setFilterType(e.target.value)} className="py-2 text-xs">
            <option value="all">All Outstanding Accounts</option>
            <option value="overdue">Overdue Only (&gt;0 Days)</option>
            <option value="critical">Critical Aging (&gt;60 Days Overdue)</option>
          </Select>

          <Input
            type="date"
            label=""
            value={asOnDate}
            onChange={(e) => setAsOnDate(e.target.value)}
            className="py-1.5 text-xs font-semibold"
          />
        </div>
      </div>

      {/* 2. Executive KPI Cards (Hidden during print) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <Card className="p-4 border-gray-200/80 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Outstanding</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(metrics.totalBalance, CURRENCY)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{metrics.customerCount} Accounts Pending</p>
        </Card>

        <Card className="p-4 border-gray-200/80 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Contract Value</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(metrics.totalBillAmount, CURRENCY)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Sum of Total Bills</p>
        </Card>

        <Card className="p-4 border-gray-200/80 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Received</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(metrics.totalPaidAmount, CURRENCY)}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Advance & Partial Receipts</p>
        </Card>

        <Card className="p-4 border-gray-200/80 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Critical (&gt;60 Days)</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(metrics.criticalBalance, CURRENCY)}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Requires High Priority Follow-up</p>
        </Card>
      </div>

      {/* 3. Printable Outstanding Statement Document */}
      <Card className="p-6 lg:p-10 print-area bg-white border border-gray-200/80 shadow-sm rounded-2xl">
        {/* Document Header */}
        <div className="border-b-2 border-gray-900 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt={studioName} className="h-16 max-w-[240px] object-contain shrink-0" />
              {(studioPhone || studioEmail || studioAddress) && (
                <div className="text-xs text-gray-500 border-l border-gray-200 pl-4 py-1 space-y-0.5">
                  {studioPhone && <p className="font-semibold text-gray-700">📱 {studioPhone}</p>}
                  {studioEmail && <p>{studioEmail}</p>}
                  {studioAddress && <p>{studioAddress}</p>}
                </div>
              )}
            </div>



            <div className="sm:text-right">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">OUTSTANDING STATEMENT</h2>
              <p className="text-sm font-bold text-teal-800 mt-0.5">
                For Customers As on <span className="underline decoration-teal-500 font-extrabold">{formatDate(asOnDate)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Statement Table */}
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-gray-700">No Outstanding Balances Found</p>
            <p className="text-xs text-gray-400 mt-1">All client accounts are fully settled for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-rose-900 text-white font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 border border-rose-900">Customer Name</th>
                  <th className="py-3 px-3 border border-rose-900 w-28">Phone No</th>
                  <th className="py-3 px-3 border border-rose-900 w-28">Bill No</th>
                  <th className="py-3 px-3 border border-rose-900 w-24">Bill Date</th>
                  <th className="py-3 px-3 border border-rose-900 text-right w-28">Bill Amount</th>
                  <th className="py-3 px-3 border border-rose-900 text-right w-28">Advance / Paid</th>
                  <th className="py-3 px-3 border border-rose-900 text-right w-28">Balance</th>
                  <th className="py-3 px-3 border border-rose-900 text-center w-24">Over Due Days</th>
                  <th className="py-3 px-3 border border-rose-900">Remarks / Shoot Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredGroups.map((group) => {
                  return group.bills.map((bill, index) => {
                    const isFirst = index === 0;

                    // Overdue Badge Styles
                    let overdueBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    if (bill.overdueDays >= 60) overdueBg = 'bg-rose-600 text-white font-extrabold shadow-2xs';
                    else if (bill.overdueDays >= 30) overdueBg = 'bg-amber-500 text-white font-bold';
                    else if (bill.overdueDays > 0) overdueBg = 'bg-amber-100 text-amber-900 font-semibold';

                    return (
                      <tr key={bill.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Customer Name Cell (Span across rows if multiple bills) */}
                        {isFirst ? (
                          <td
                            rowSpan={group.bills.length}
                            className="py-3 px-3 font-extrabold text-gray-900 align-top border border-gray-200 bg-gray-50/50"
                          >
                            <p className="text-sm font-bold text-gray-900">{group.name}</p>
                            {group.bills.length > 1 && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {group.bills.length} Bills Outstanding
                              </span>
                            )}
                          </td>
                        ) : null}

                        {/* Customer Phone Cell */}
                        {isFirst ? (
                          <td
                            rowSpan={group.bills.length}
                            className="py-3 px-3 font-mono font-bold text-gray-800 align-top border border-gray-200 bg-gray-50/50 whitespace-nowrap"
                          >
                            {group.mobile}
                          </td>
                        ) : null}

                        {/* Bill Details */}
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-gray-800 border border-gray-200">
                          {bill.billNo}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-medium border border-gray-200 whitespace-nowrap">
                          {formatDate(bill.billDate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 border border-gray-200 whitespace-nowrap">
                          {formatCurrency(bill.billAmount, CURRENCY)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 border border-gray-200 whitespace-nowrap">
                          {bill.paidAmount > 0 ? formatCurrency(bill.paidAmount, CURRENCY) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 border border-gray-200 whitespace-nowrap bg-rose-50/30">
                          {formatCurrency(bill.balance, CURRENCY)}
                        </td>
                        <td className="py-2.5 px-3 text-center border border-gray-200">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs tracking-tight ${overdueBg}`}>
                            {bill.overdueDays} Days
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 text-xs border border-gray-200 max-w-xs leading-snug">
                          {bill.remarks}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
              {/* Grand Total Row */}
              <tfoot>
                <tr className="bg-gray-100 font-black text-gray-900 text-xs border-t-2 border-gray-900">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider font-extrabold border border-gray-300">
                    Total Balance As On {formatDate(asOnDate)}:
                  </td>
                  <td className="py-3 px-3 text-right font-black text-gray-900 border border-gray-300 whitespace-nowrap">
                    {formatCurrency(metrics.totalBillAmount, CURRENCY)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-700 border border-gray-300 whitespace-nowrap">
                    {formatCurrency(metrics.totalPaidAmount, CURRENCY)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-rose-600 border border-gray-300 text-sm whitespace-nowrap bg-rose-100/50">
                    {formatCurrency(metrics.totalBalance, CURRENCY)}
                  </td>
                  <td colSpan={2} className="py-3 px-3 border border-gray-300 text-gray-500 font-normal italic">
                    {filteredGroups.length} Client Account{filteredGroups.length === 1 ? '' : 's'} Pending
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Printable Footer Sign-off */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center flex items-center justify-between text-xs text-gray-400">
          <p>Generated by {studioName} ERP</p>
          <p className="font-semibold text-gray-600">Confidential Financial Statement</p>
        </div>
      </Card>
    </div>
  );
}
