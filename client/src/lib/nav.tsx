import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface Route {
  page: string;
  id?: string;
  view?: string;
}

export interface ModalState {
  addCustomer: null | { onDone?: (id: string) => void };
  addBooking: null | { presetCustomerId?: string };
  recordPayment: null | { bookingId?: string };
  addInvoice: null | { bookingId?: string };
  editCustomer: null | { id: string };
  editBooking: null | { id: string };
}

interface NavContextValue {
  route: Route;
  navigate: (route: Route) => void;
  modals: ModalState;
  openModal: <K extends keyof ModalState>(key: K, value: NonNullable<ModalState[K]>) => void;
  closeModal: (key: keyof ModalState) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}

const EMPTY_MODALS: ModalState = {
  addCustomer: null,
  addBooking: null,
  recordPayment: null,
  addInvoice: null,
  editCustomer: null,
  editBooking: null,
};

export function NavProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ page: 'dashboard' });
  const [searchOpen, setSearchOpen] = useState(false);
  const [modals, setModals] = useState<ModalState>(EMPTY_MODALS);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  const openModal = useCallback(<K extends keyof ModalState>(key: K, value: NonNullable<ModalState[K]>) => {
    setModals((m) => ({ ...m, [key]: value }));
  }, []);
  const closeModal = useCallback((key: keyof ModalState) => {
    setModals((m) => ({ ...m, [key]: null }));
  }, []);

  return (
    <NavContext.Provider value={{ route, navigate, modals, openModal, closeModal, searchOpen, setSearchOpen }}>
      {children}
    </NavContext.Provider>
  );
}
