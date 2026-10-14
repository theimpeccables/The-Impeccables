import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import domainReducer from './slices/domainSlice';
import postReducer from './slices/postSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    domain: domainReducer,
    posts: postReducer,
    ui: uiReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
