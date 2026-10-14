import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import store from './store';
import router from './router';
import { clearAccessToken, refreshSession } from './services/api';
import { logout, setAuthInitialized, setCredentials } from './store/slices/authSlice';

const SessionBootstrap = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleRefresh = (event) => dispatch(setCredentials(event.detail));
    const handleExpired = () => dispatch(logout());
    window.addEventListener('impeccables:session-refreshed', handleRefresh);
    window.addEventListener('impeccables:session-expired', handleExpired);

    refreshSession()
      .then((session) => dispatch(setCredentials(session)))
      .catch(() => clearAccessToken())
      .finally(() => dispatch(setAuthInitialized()));

    return () => {
      window.removeEventListener('impeccables:session-refreshed', handleRefresh);
      window.removeEventListener('impeccables:session-expired', handleExpired);
    };
  }, [dispatch]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        theme="dark"
        closeButton
        duration={4000}
        toastOptions={{
          className: 'impeccables-toast',
          style: {
            background: 'rgba(12, 12, 15, 0.96)',
            border: '1px solid rgba(255, 42, 42, 0.32)',
            color: '#f5f5f5',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.48), 0 0 24px rgba(255, 42, 42, 0.12)',
            backdropFilter: 'blur(16px)',
          },
        }}
      />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <SessionBootstrap />
    </Provider>
  );
}

export default App;
