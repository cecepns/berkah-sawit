export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
  },
  SETTINGS: {
    GET: '/api/settings',
    UPDATE: '/api/settings',
  },
  TRANSACTIONS: {
    LIST: '/api/transactions',
    DETAIL: (id) => `/api/transactions/${id}`,
    CREATE: '/api/transactions',
    UPDATE: (id) => `/api/transactions/${id}`,
    CANCEL: (id) => `/api/transactions/${id}/cancel`,
    NEXT_TICKET: '/api/transactions/next-ticket',
    SYNC: '/api/transactions/sync',
  },
  SUPPLIERS: {
    LIST: '/api/suppliers',
    DETAIL: (id) => `/api/suppliers/${id}`,
    TRANSACTIONS: (id) => `/api/suppliers/${id}/transactions`,
    CREATE: '/api/suppliers',
    UPDATE: (id) => `/api/suppliers/${id}`,
    DELETE: (id) => `/api/suppliers/${id}`,
  },
  REPORTS: {
    DASHBOARD: '/api/reports/dashboard',
    PERIOD: '/api/reports/period',
  },
  PRICES: {
    TODAY: '/api/prices/today',
    LIST: '/api/prices',
    UPDATE: '/api/prices',
  },
  SORTATIONS: {
    LIST: '/api/sortations',
    CREATE: '/api/sortations',
    UPDATE: (id) => `/api/sortations/${id}`,
  },
  DRIVERS: {
    LIST: '/api/drivers',
  },
  VEHICLES: {
    LIST: '/api/vehicles',
  },
  USERS: {
    LIST: '/api/users',
    CREATE: '/api/users',
    UPDATE: (id) => `/api/users/${id}`,
  },
  AUDIT_LOGS: {
    LIST: '/api/audit-logs',
  },
  HEALTH: '/api/health',
};
