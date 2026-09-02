import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import MainLayout from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// USER PAGES
import Index from "./pages/Index";
import Login from "./pages/Login";
import Talents from "./pages/Talents";
import TalentDetail from "./pages/TalentDetail";
import Booking from "./pages/Booking";
import ChatList from "./pages/ChatList";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import FAQ from "./pages/FAQ";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// MITRA
import MitraLayout from "@/components/layout/MitraLayout";
import MitraLandingPage from "./pages/mitra/landing";
import MitraLoginPage from "./pages/mitra/login";
import MitraRegisterPage from "./pages/mitra/register";
import MitraDashboard from "./pages/mitra/dashboard";
import MitraChatPage from "./pages/mitra/chat/chat";
import MitraClaimProfilePage from "./pages/mitra/claim-profile";
import Pengaturan from "./pages/mitra/Pengaturan";
import MitraTalents from "./pages/mitra/MitraTalents";
import MitraTalentDetail from "./pages/mitra/MitraTalentDetail";
import MitraBooking from "./pages/mitra/MitraBooking";
import MitraTerms from './pages/mitra/terms';
import MitraAbout from './pages/mitra/about';
import MitraPrivacy from './pages/mitra/privacy';
import MitraHelp from './pages/mitra/help';
import MitraReport from './pages/mitra/report';
import MitraAsBookerChatPage from "./pages/mitra/MitraAsBookerChat";
import MitraBookingsPage from "./pages/mitra/bookings";
import MitraVerificationPage from "./pages/mitra/verification";

// ADMIN
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* USER ROUTES */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Login />} />
              <Route path="/talents" element={<Talents />} />
              <Route path="/talent/:id" element={<TalentDetail />} />
              
              {/* PROTECTED ROUTES */}
              <Route path="/booking/:id" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
              <Route path="/chat/:bookingId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />

              <Route path="/faq" element={<FAQ />} />
              <Route path="/syarat-ketentuan" element={<TermsConditions />} />
              <Route path="/kebijakan-privasi" element={<PrivacyPolicy />} />
            </Route>

            {/* MITRA ROUTES */}
            <Route path="/mitra" element={<MitraLayout />}>
              <Route index element={<MitraLandingPage />} />
              <Route path="pengaturan" element={<Pengaturan />} />
              <Route path="tentang" element={<MitraLandingPage />} />
              <Route path="aktivitas" element={<MitraLandingPage />} />
              <Route path="keuntungan" element={<MitraLandingPage />} />
              <Route path="cara-bergabung" element={<MitraLandingPage />} />
              <Route path="login" element={<MitraLoginPage />} />
              <Route path="register" element={<MitraRegisterPage />} />
              <Route path="dashboard" element={<MitraDashboard />} />
              <Route path="chat" element={<MitraChatPage />} />
              <Route path="chat/:bookingId" element={<MitraChatPage />} />
              <Route path="claim-profile" element={<MitraClaimProfilePage />} />
              <Route path="talents" element={<MitraTalents />} />
              <Route path="talents/:id" element={<MitraTalentDetail />} /> 
              <Route path="booking/:id" element={<MitraBooking />} />
              <Route path="terms" element={<MitraTerms />} />
              <Route path="about" element={<MitraAbout />} />
              <Route path="privacy" element={<MitraPrivacy />} />
              <Route path="help" element={<MitraHelp />} />
              <Route path="report" element={<MitraReport />} />
              <Route path="chat-as-booker/:bookingId" element={<MitraAsBookerChatPage />} />
              <Route path="bookings" element={<MitraBookingsPage />} />
              <Route path="verification" element={<MitraVerificationPage />} />
            </Route>

            {/* ADMIN ROUTES */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}