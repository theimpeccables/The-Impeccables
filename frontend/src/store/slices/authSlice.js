import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  role: 'public',
  roles: [],
  permissions: [],
  assignedDomain: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.role = user.role || 'member';
      state.roles = user.roles || [state.role];
      state.permissions = user.permissions || [];
      state.assignedDomain = user.assignedDomain || null;
      state.error = null;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.role = 'public';
      state.roles = [];
      state.permissions = [];
      state.assignedDomain = null;
      state.error = null;
      state.loading = false;
    },
    setAuthInitialized: (state) => {
      state.isInitialized = true;
      state.loading = false;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
      state.error = null;
    },
  },
});

export const { setCredentials, logout, setAuthInitialized, setError, setLoading } = authSlice.actions;
export default authSlice.reducer;
