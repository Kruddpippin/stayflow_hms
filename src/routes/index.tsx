import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/guards/ProtectedRoute";
import { FacilityProvider } from "@/components/providers/FacilityProvider";
import { AppLayout } from "@/components/layouts/AppLayout";

// Public pages
import LandingPage from "@/features/auth/pages/LandingPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import SignupPage from "@/features/auth/pages/SignupPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import VerifyEmailPage from "@/features/auth/pages/VerifyEmailPage";
import AcceptInvitePage from "@/features/auth/pages/AcceptInvitePage";

// Gate pages
import OnboardingPage from "@/features/onboarding/pages/OnboardingPage";
import CreateFacilityPage from "@/features/onboarding/pages/CreateFacilityPage";

// Org-level pages
import PortfolioPage from "@/features/portfolio/pages/PortfolioPage";
import AccountPage from "@/features/account/pages/AccountPage";

// Tenant app pages
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import ReservationsPage from "@/features/reservations/pages/ReservationsPage";
import NewReservationPage from "@/features/reservations/pages/NewReservationPage";
import ReservationDetailPage from "@/features/reservations/pages/ReservationDetailPage";
import FrontDeskPage from "@/features/front-desk/pages/FrontDeskPage";
import RoomsPage from "@/features/rooms/pages/RoomsPage";
import RoomTypesPage from "@/features/rooms/pages/RoomTypesPage";
import GuestsPage from "@/features/guests/pages/GuestsPage";
import GuestProfilePage from "@/features/guests/pages/GuestProfilePage";
import HousekeepingPage from "@/features/housekeeping/pages/HousekeepingPage";
import MaintenancePage from "@/features/maintenance/pages/MaintenancePage";
import InvoicesPage from "@/features/billing/pages/InvoicesPage";
import InvoiceDetailPage from "@/features/billing/pages/InvoiceDetailPage";
import PaymentsPage from "@/features/billing/pages/PaymentsPage";
import ReportsPage from "@/features/reports/pages/ReportsPage";
import StaffPage from "@/features/staff/pages/StaffPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* ---- Public ---- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      {/* ---- Authenticated ---- */}
      <Route element={<ProtectedRoute />}>
        {/* Gate */}
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/onboarding/create-facility" element={<CreateFacilityPage />} />

        {/* Org-level */}
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/account" element={<AccountPage />} />

        {/* Tenant app */}
        <Route
          path="/app/:facilitySlug"
          element={
            <FacilityProvider>
              <AppLayout />
            </FacilityProvider>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="reservations/new" element={<NewReservationPage />} />
          <Route path="reservations/:id" element={<ReservationDetailPage />} />
          <Route path="reservations/:id/edit" element={<NewReservationPage />} />
          <Route path="front-desk" element={<FrontDeskPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="room-types" element={<RoomTypesPage />} />
          <Route path="guests" element={<GuestsPage />} />
          <Route path="guests/:guestId" element={<GuestProfilePage />} />
          <Route path="housekeeping" element={<HousekeepingPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
