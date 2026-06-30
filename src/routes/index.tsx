import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/guards/ProtectedRoute";
import { AdminGuard } from "@/components/guards/AdminGuard";
import { FacilityProvider } from "@/components/providers/FacilityProvider";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Loader2 } from "lucide-react";

// Inline fallback — keeps the spinner in the routes file
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Public pages (kept static — they're the entry points)
import LandingPage from "@/features/auth/pages/LandingPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import SignupPage from "@/features/auth/pages/SignupPage";

// Auth pages — lightweight, lazy-loaded
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));
const AcceptInvitePage = lazy(() => import("@/features/auth/pages/AcceptInvitePage"));
const AuthCallbackPage = lazy(() => import("@/features/auth/pages/AuthCallbackPage"));

// Gate pages
const OnboardingPage = lazy(() => import("@/features/onboarding/pages/OnboardingPage"));
const CreateFacilityPage = lazy(() => import("@/features/onboarding/pages/CreateFacilityPage"));

// Org-level pages
const PortfolioPage = lazy(() => import("@/features/portfolio/pages/PortfolioPage"));
const AccountPage = lazy(() => import("@/features/account/pages/AccountPage"));

// Tenant app pages
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const ReservationsPage = lazy(() => import("@/features/reservations/pages/ReservationsPage"));
const NewReservationPage = lazy(() => import("@/features/reservations/pages/NewReservationPage"));
const ReservationDetailPage = lazy(() => import("@/features/reservations/pages/ReservationDetailPage"));
const FrontDeskPage = lazy(() => import("@/features/front-desk/pages/FrontDeskPage"));
const RoomsPage = lazy(() => import("@/features/rooms/pages/RoomsPage"));
const RoomTypesPage = lazy(() => import("@/features/rooms/pages/RoomTypesPage"));
const GuestsPage = lazy(() => import("@/features/guests/pages/GuestsPage"));
const GuestProfilePage = lazy(() => import("@/features/guests/pages/GuestProfilePage"));
const HousekeepingPage = lazy(() => import("@/features/housekeeping/pages/HousekeepingPage"));
const MaintenancePage = lazy(() => import("@/features/maintenance/pages/MaintenancePage"));
const InvoicesPage = lazy(() => import("@/features/billing/pages/InvoicesPage"));
const InvoiceDetailPage = lazy(() => import("@/features/billing/pages/InvoiceDetailPage"));
const PaymentsPage = lazy(() => import("@/features/billing/pages/PaymentsPage"));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage"));
const StaffPage = lazy(() => import("@/features/staff/pages/StaffPage"));
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/pages/NotificationsPage"));
const ChannelsPage = lazy(() => import("@/features/channels/pages/ChannelsPage"));
const MobileApp = lazy(() => import("@/features/mobile/pages/MobileApp"));
const AuditLogPage = lazy(() => import("@/features/audit/pages/AuditLogPage"));
const MessagesPage = lazy(() => import("@/features/messages/pages/MessagesPage"));
const TemplatesPage = lazy(() => import("@/features/messages/pages/TemplatesPage"));
const AutomationsPage = lazy(() => import("@/features/messages/pages/AutomationsPage"));
const BookingPage = lazy(() => import("@/features/booking/pages/BookingPage"));
const PricingPage = lazy(() => import("@/features/billing/pages/PricingPage"));
const BillingPage = lazy(() => import("@/features/billing/pages/BillingPage"));
const BookingLookupPage = lazy(() => import("@/features/booking/pages/BookingLookupPage"));
const BookingDetailPage = lazy(() => import("@/features/booking/pages/BookingDetailPage"));

// Admin pages
const AdminLoginPage = lazy(() => import("@/features/admin/pages/AdminLoginPage"));
const AdminLayout = lazy(() => import("@/features/admin/AdminLayout"));
const AdminDashboardPage = lazy(() => import("@/features/admin/pages/AdminDashboardPage"));
const AdminFacilitiesPage = lazy(() => import("@/features/admin/pages/AdminFacilitiesPage"));
const AdminUsersPage = lazy(() => import("@/features/admin/pages/AdminUsersPage"));
const AdminSubscriptionsPage = lazy(() => import("@/features/admin/pages/AdminSubscriptionsPage"));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ---- Public ---- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/book/:facilitySlug" element={<BookingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/booking" element={<BookingLookupPage />} />
        <Route path="/booking/:reference" element={<BookingDetailPage />} />
        <Route path="/m/:facilitySlug/*" element={<MobileApp />} />

        {/* ---- Authenticated ---- */}
        <Route element={<ProtectedRoute />}>
          {/* Gate */}
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/create-facility" element={<CreateFacilityPage />} />

          {/* Org-level */}
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/billing" element={<BillingPage />} />

          {/* Platform admin */}
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="facilities" element={<AdminFacilitiesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
            </Route>
          </Route>

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
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/templates" element={<TemplatesPage />} />
            <Route path="messages/automations" element={<AutomationsPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
