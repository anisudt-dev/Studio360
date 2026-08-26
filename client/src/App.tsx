import { AuthProvider } from '@/lib/auth';
import { NavProvider, useNav } from '@/lib/nav';
import { AppShell } from '@/components/AppShell';
import { ToastContainer } from '@/components/Toast';
import { GlobalSearch } from '@/components/GlobalSearch';
import { AddCustomerModal } from '@/components/modals/AddCustomerModal';
import { AddBookingModal } from '@/components/modals/AddBookingModal';
import { RecordPaymentModal } from '@/components/modals/RecordPaymentModal';
import { AddInvoiceModal } from '@/components/modals/AddInvoiceModal';
import { EditCustomerModal } from '@/components/modals/EditCustomerModal';
import { EditBookingModal } from '@/components/modals/EditBookingModal';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerProfilePage } from '@/pages/CustomerProfilePage';
import { BookingsPage } from '@/pages/BookingsPage';
import { BookingDetailPage } from '@/pages/BookingDetailPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { DeliverablesPage } from '@/pages/DeliverablesPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { InvoiceDetailPage } from '@/pages/InvoiceDetailPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

function Router() {
  const { route } = useNav();

  switch (route.page) {
    case 'dashboard': return <DashboardPage />;
    case 'customers': return <CustomersPage />;
    case 'customer': return route.id ? <CustomerProfilePage id={route.id} /> : <CustomersPage />;
    case 'bookings': return <BookingsPage />;
    case 'booking': return route.id ? <BookingDetailPage id={route.id} /> : <BookingsPage />;
    case 'projects': return <ProjectsPage />;
    case 'deliverables': return <DeliverablesPage />;
    case 'payments': return <PaymentsPage />;
    case 'calendar': return <CalendarPage />;
    case 'invoices': return <InvoicesPage />;
    case 'invoice': return route.id ? <InvoiceDetailPage id={route.id} /> : <InvoicesPage />;
    case 'reports': return <ReportsPage />;
    case 'settings': return <SettingsPage />;
    default: return <DashboardPage />;
  }
}

function Modals() {
  return (
    <>
      <AddCustomerModal />
      <AddBookingModal />
      <RecordPaymentModal />
      <AddInvoiceModal />
      <EditCustomerModal />
      <EditBookingModal />
    </>
  );
}

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  return (
    <AuthProvider>
      <NavProvider>
        <AppShell>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </AppShell>
        <GlobalSearch />
        <Modals />
        <ToastContainer />
      </NavProvider>
    </AuthProvider>
  );
}

