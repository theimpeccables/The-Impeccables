import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isInitialized, roles, role } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-gray-400" role="status">Checking your session…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.some((allowedRole) => roles.includes(allowedRole) || role === allowedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
