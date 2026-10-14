import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');
const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let refreshFlight = null;

export const setAccessToken = (token) => { accessToken = token || null; };
export const clearAccessToken = () => { accessToken = null; };

export const refreshSession = () => {
  if (!refreshFlight) {
    refreshFlight = api.post('/auth/refresh-token')
      .then(({ data }) => {
        const session = data.data;
        setAccessToken(session.accessToken);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('impeccables:session-refreshed', { detail: session }));
        }
        return session;
      })
      .finally(() => { refreshFlight = null; });
  }
  return refreshFlight;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');
    if (status !== 401 || !originalRequest || originalRequest._retried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;
    try {
      const session = await refreshSession();
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('impeccables:session-expired'));
      return Promise.reject(refreshError);
    }
  },
);

export const apiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const apiError = error?.response?.data?.error;
  const message = apiError?.message || error?.response?.data?.message || fallback;
  const details = Array.isArray(apiError?.details) ? apiError.details : [];
  if (!details.length) return message;

  const readableDetails = details
    .map(({ field, message: detail }) => field && detail ? `${field}: ${detail}` : detail)
    .filter(Boolean);
  return readableDetails.length ? `${message} ${readableDetails.join('; ')}` : message;
};

export default api;
