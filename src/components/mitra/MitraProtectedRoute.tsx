import React from 'react';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface MitraProtectedRouteProps {
  children: ReactNode;
}

export default function MitraProtectedRoute({ children }: MitraProtectedRouteProps) {
  // KUNCI YANG DIPERIKSA HARUS SAMA PERSIS SAAT LOGIN
  const isMitraAuthenticated = sessionStorage.getItem('isMitraAuthenticated') === 'true';

  // JIKA BELUM LOGIN, ARAHKAN KE HALAMAN LOGIN
  if (!isMitraAuthenticated) {
    return <Navigate to="/mitra/login" replace />;
  }

  // JIKA SUDAH LOGIN, TAMPILKAN HALAMAN YANG DITUNJUK (DASHBOARD)
  return <>{children}</>;
}