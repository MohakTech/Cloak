import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  isAuthenticated: string;
  children: React.ReactNode;
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAuthenticated, children }) => {
  console.log(isAuthenticated)
  if (isAuthenticated === undefined || isAuthenticated == "loading") {
    return <div>Loading...</div>; // Prevents redirect while checking auth status
  }
  
  return isAuthenticated == "authenticated" ? <>{children}</> : <Navigate to="/" />;
};


export default ProtectedRoute; 
