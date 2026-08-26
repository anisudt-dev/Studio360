import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Users, CalendarCheck, Wallet,
  CalendarDays, FileText, BarChart3, Settings, Home, Menu as MenuIcon,
  Plus, Search, Camera, ChevronDown, User, Package, LogOut, Shield, Sparkles
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { useAuth } from '@/lib/auth';
import { useBookings } from '@/lib/hooks';
import { LoginPage } from '@/pages/LoginPage';
import { NAV_ITEMS, MOBILE_NAV, MORE_NAV } from '@/lib/constants';
import { ReleaseNotesModal, APP_VERSION } from '@/components/ReleaseNotesModal';

const ICONS: Record<string, any> = {
  LayoutDashboard, Users, CalendarCheck, Wallet,
  CalendarDays, FileText, BarChart3, Settings, Home, Menu: MenuIcon, Package,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { route, navigate, setSearchOpen, openModal } = useNav();
  const { bookings } = useBookings();
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);


  const activeBookingsCount = bookings.filter((b) => b.status !== 'cancelled').length;
  const pendingPaymentsCount = bookings.filter((b) => b.status !== 'cancelled' && b.balance > 0).length;

  const isActive = (page: string) => route.page === page || route.page === `${page}-detail`;

  function handleNav(page: string) {
    navigate({ page });
    setMoreOpen(false);
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading Studio ERP...</p>
      </div>
    );
  }

  // Unauthenticated -> Show Login Screen
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex bg-[#f7f8fa]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-gray-200 bg-white shrink-0 sticky top-0 h-screen no-print">
        <div className="px-4 py-4 flex items-center justify-center border-b border-gray-100 bg-white">
          <img src="/logo.svg" alt="Aishwarya Videos & Photos" className="h-12 max-w-full object-contain cursor-pointer" onClick={() => handleNav('dashboard')} />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon] || LayoutDashboard;
            const active = isActive(item.id);
            const count = item.id === 'bookings' ? activeBookingsCount : item.id === 'payments' ? pendingPaymentsCount : 0;

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                title={`Navigate to ${item.label}`}
                aria-label={item.label}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                  active
                    ? 'bg-teal-50 text-teal-700 shadow-sm font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={18} className={active ? 'text-teal-600' : 'text-gray-400'} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.id === 'bookings' && activeBookingsCount > 0 && (
                  <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    {activeBookingsCount}
                  </span>
                )}
                {item.id === 'payments' && pendingPaymentsCount > 0 && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingPaymentsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="rounded-xl bg-gray-50 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-teal-600 font-medium capitalize flex items-center gap-1">
                  <Shield size={10} /> {user.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              aria-label="Logout"
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 no-print">

          <div className="flex items-center gap-3 px-4 lg:px-6 h-16">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <img src="/logo.svg" alt="Aishwarya Videos & Photos" className="h-8 max-w-[160px] object-contain cursor-pointer" onClick={() => handleNav('dashboard')} />
            </div>


            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              title="Search bookings, customers, payments (⌘K)"
              aria-label="Search studio records"
              className="flex-1 max-w-md flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-400 hover:border-gray-300 hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Search bookings, customers, payments...</span>
              <span className="sm:hidden">Search studio...</span>
              <kbd className="hidden md:inline ml-auto text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-2xs">⌘K</kbd>
            </button>

            {/* What's New Version Badge */}
            <button
              onClick={() => setReleaseNotesOpen(true)}
              title="View Version Release Notes & Enhancement Log"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100 text-xs font-bold font-mono transition-colors shrink-0"
            >
              <Sparkles size={14} className="text-teal-600 animate-pulse" />
              <span>{APP_VERSION}</span>
            </button>

            {/* Quick add */}
            <div className="relative">

              <button
                onClick={() => setQuickAddOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 text-white px-3 py-2 text-sm font-semibold hover:bg-teal-800 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add</span>
                <ChevronDown size={14} className="hidden sm:inline" />
              </button>
              {quickAddOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQuickAddOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-in">
                    <p className="px-3.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Actions</p>
                    {[
                      { label: 'New Booking', icon: CalendarCheck, action: () => openModal('addBooking', {}) },
                      { label: 'New Customer', icon: User, action: () => openModal('addCustomer', {}) },
                      { label: 'Record Payment', icon: Wallet, action: () => openModal('recordPayment', {}) },
                      { label: 'Add Shoot', icon: Camera, action: () => openModal('addBooking', {}) },
                      { label: 'Add Delivery', icon: Package, action: () => navigate({ page: 'deliverables' }) },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => { item.action(); setQuickAddOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          <Icon size={15} className="text-teal-600" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Premium User Avatar Header Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full bg-gray-50 border border-gray-200/80 pl-1.5 pr-3 py-1 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold text-gray-900">{user.name || 'Studio Owner'}</span>
                  <span className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">{user.role || 'Admin'}</span>
                </div>
                <ChevronDown size={14} className="text-gray-400 transition-transform duration-200" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-scale-in">
                    {/* User Info Header */}
                    <div className="px-3 py-3 bg-gradient-to-br from-teal-50/60 to-emerald-50/30 rounded-xl mb-1.5 border border-teal-100/50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-500 font-mono">@{user.username}</p>
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800">
                          <Shield size={9} /> {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => { navigate({ page: 'settings' }); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <Settings size={15} className="text-teal-600" />
                        Studio Settings & Staff Accounts
                      </button>
                      
                      <div className="my-1 border-t border-gray-100" />

                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-8 pb-28 lg:pb-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white/95 backdrop-blur-md border-t border-gray-200 flex items-center justify-around px-1 sm:px-2 h-16 safe-area shadow-lg">

        {MOBILE_NAV.map((item) => {
          const Icon = ICONS[item.icon] || Home;
          const active = isActive(item.id);
          if (item.id === 'more') {
            return (
              <button
                key={item.id}
                onClick={() => setMoreOpen(true)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg ${active ? 'text-teal-600' : 'text-gray-500'}`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg ${active ? 'text-teal-600' : 'text-gray-500'}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile "more" sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full bg-white rounded-t-2xl p-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {MORE_NAV.map((item) => {
                const Icon = ICONS[item.icon] || LayoutDashboard;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4 hover:bg-gray-50"
                  >
                    <Icon size={22} className="text-teal-600" />
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ReleaseNotesModal
        open={releaseNotesOpen}
        onClose={() => setReleaseNotesOpen(false)}
      />
    </div>
  );
}

