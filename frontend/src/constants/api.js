export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  POSTS: {
    BASE: '/api/posts',
    SUBMIT: '/api/posts/submit',
    PUBLISH: '/api/posts/publish',
    REVIEW: '/api/posts/review',
  },
  USERS: {
    BASE: '/api/users',
  },
  DOMAINS: {
    BASE: '/api/domains',
  },
  EVENTS: {
    BASE: '/api/events',
  },
};

export const API_CONFIG = {
  TIMEOUT: 30000,
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
};
