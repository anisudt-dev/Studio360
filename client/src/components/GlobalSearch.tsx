import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNav } from '@/lib/nav';
import { formatCurrency, formatDate } from '@/lib/format';
import { Search, X, User, CalendarCheck, Receipt, Wallet } from 'lucide-react';
import type { Customer, Booking, Payment, Invoice } from '@/lib/types';

interface ResultRow {
  type: 'customer' | 'booking' | 'payment' | 'invoice';
  id: string;
  title: string;
  subtitle: string;
  right?: string;
  routePage: string;
}

export function GlobalSearch() {
  const { searchOpen, setSearchOpen, navigate } = useNav();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery(''); setResults([]); setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.trim();
    setLoading(true);
    (async () => {
      const [cust, book, pay, inv] = await Promise.all([
        supabase.from('customers').select('*').ilike('name', `%${q}%`).or(`mobile.ilike.%${q}%`).limit(5),
        supabase.from('bookings').select('*, customer:customers(id,name,mobile)').ilike('title', `%${q}%`).or(`event_type.ilike.%${q}%`).or(`venue.ilike.%${q}%`).limit(5),
        supabase.from('payments').select('*').ilike('reference', `%${q}%`).limit(5),
        supabase.from('invoices').select('*').ilike('invoice_number', `%${q}%`).limit(5),
      ]);
      const rows: ResultRow[] = [];
      (cust.data as Customer[] || []).forEach((c) => rows.push({
        type: 'customer', id: c.id, title: c.name, subtitle: c.mobile || c.email || 'Customer',
        routePage: 'customer',
      }));
      (book.data as (Booking & { customer?: Pick<Customer,'id'|'name'|'mobile'> })[] || []).forEach((b) => rows.push({
        type: 'booking', id: b.id, title: b.customer?.name || b.title || b.event_type,
        subtitle: `${b.event_type} · ${formatDate(b.event_date)}`,
        right: formatCurrency(b.total_amount), routePage: 'booking',
      }));
      (pay.data as Payment[] || []).forEach((p) => rows.push({
        type: 'payment', id: p.id, title: formatCurrency(p.amount),
        subtitle: `Payment · ${formatDate(p.payment_date)} · ${p.payment_mode}`,
        routePage: 'payment', right: p.reference || undefined,
      }));
      (inv.data as Invoice[] || []).forEach((i) => rows.push({
        type: 'invoice', id: i.id, title: i.invoice_number,
        subtitle: `Invoice · ${formatDate(i.issue_date)}`, right: formatCurrency(i.total),
        routePage: 'invoice',
      }));
      setResults(rows);
      setActiveIndex(0);
      setLoading(false);
    })();
  }, [query]);

  function selectResult(r: ResultRow) {
    setSearchOpen(false);
    navigate({ page: r.routePage, id: r.id });
  }

  const ICONS = { customer: User, booking: CalendarCheck, payment: Wallet, invoice: Receipt };
  const ICON_BG = {
    customer: 'bg-teal-50 text-teal-600', booking: 'bg-amber-50 text-amber-600',
    payment: 'bg-emerald-50 text-emerald-600', invoice: 'bg-blue-50 text-blue-600',
  };

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in" onClick={() => setSearchOpen(false)} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            className="flex-1 text-base outline-none placeholder:text-gray-400"
            placeholder="Search customers, bookings, payments, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && results[activeIndex]) selectResult(results[activeIndex]);
            }}
          />
          <button onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && <div className="px-4 py-8 text-center text-sm text-gray-400">Searching...</div>}
          {!loading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results for "{query}"</div>
          )}
          {!loading && results.map((r, i) => {
            const Icon = ICONS[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === activeIndex ? 'bg-gray-50' : ''} hover:bg-gray-50`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectResult(r)}
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ICON_BG[r.type]}`}>
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
                </div>
                {r.right && <span className="text-xs font-medium text-gray-400 shrink-0">{r.right}</span>}
              </button>
            );
          })}
          {!query && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Search by name, mobile, booking, invoice, or date
            </div>
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Press ↑↓ to navigate · Enter to open</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
