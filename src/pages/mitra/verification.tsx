// src/pages/mitra/verification.tsx
import MitraProtectedRoute from '@/components/mitra/MitraProtectedRoute';
import MitraVerification from '@/components/mitra/MitraVerification';

export default function MitraVerificationPage() {
  return (
    <MitraProtectedRoute>
      <MitraVerification />
    </MitraProtectedRoute>
  );
}