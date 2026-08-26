const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000/api' : 'https://photography-erp-api.onrender.com/api');


export async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errData.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Settings
  getSettings: () => apiFetch('/settings'),
  updateSettings: (id: string, data: any) => apiFetch(`/settings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createSettings: (data: any) => apiFetch('/settings', { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  getCustomers: () => apiFetch('/customers'),
  getCustomer: (id: string) => apiFetch(`/customers/${id}`),
  createCustomer: (data: any) => apiFetch('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => apiFetch(`/customers/${id}`, { method: 'DELETE' }),

  // Bookings
  getBookings: () => apiFetch('/bookings'),
  getBooking: (id: string) => apiFetch(`/bookings/${id}`),
  createBooking: (data: any) => apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateBooking: (id: string, data: any) => apiFetch(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBooking: (id: string) => apiFetch(`/bookings/${id}`, { method: 'DELETE' }),

  // Payments
  getPayments: () => apiFetch('/payments'),
  createPayment: (data: any) => apiFetch('/payments', { method: 'POST', body: JSON.stringify(data) }),
  deletePayment: (id: string) => apiFetch(`/payments/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: () => apiFetch('/invoices'),
  getInvoice: (id: string) => apiFetch(`/invoices/${id}`),
  createInvoice: (data: any) => apiFetch('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) => apiFetch(`/invoices/${id}`, { method: 'DELETE' }),

  // Global Search
  search: (query: string) => apiFetch(`/search?q=${encodeURIComponent(query)}`),

  // Auth & Users
  getUsers: () => apiFetch('/auth/users'),
  createUser: (data: any) => apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data: any) => apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
};
