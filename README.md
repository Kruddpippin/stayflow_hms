# StayFlow — Hotel Management System

A modern, production-ready hotel management system built with **React + Vite + Tailwind CSS** and a **Supabase** (PostgreSQL) backend. It covers the full front-desk workflow — reservations, rooms, guests and billing — plus a guest-facing booking portal, with role-based access for **Admin**, **Staff** and **Guest** users.

## Features

**Staff / Admin dashboard**
- **Dashboard** — occupancy rate, arrivals/departures, revenue, room-status and booking charts.
- **Reservations** — list + month calendar views, create/edit bookings, one-click check-in / check-out (auto-updates room status), status filters and search.
- **Rooms** — room inventory grid with live status control, plus a room-types catalogue with rates, capacity and amenities.
- **Guests (CRM)** — guest profiles with contact details, VIP flag, notes and full stay history.
- **Billing** — folios per reservation with itemised charges, payments, balance tracking and folio settlement.

**Guest portal**
- Browse rooms & suites and book a stay in seconds.
- View upcoming and past bookings with live status.

**Engineering**
- Role-based protected routing (admin / staff / guest).
- Supabase Auth (email + password) with auto-provisioned profiles.
- Row Level Security on every table.
- TanStack Query data layer, code-split routes, lazy loading.
- Accessible components (focus states, ARIA, keyboard), responsive mobile-first layouts.

## Demo accounts

| Role  | Email                | Password     |
|-------|----------------------|--------------|
| Admin | admin@stayflow.com   | Password123! |
| Staff | staff@stayflow.com   | Password123! |
| Guest | guest@stayflow.com   | Password123! |

The login screen has quick-fill buttons for each role.

## Getting started

    # 1. Install dependencies
    npm install

    # 2. Configure environment
    cp .env.example .env
    #   VITE_SUPABASE_URL=...
    #   VITE_SUPABASE_ANON_KEY=...   (publishable/anon key — safe for the browser, protected by RLS)

    # 3. Run the dev server
    npm run dev

    # 4. Production build
    npm run build && npm run preview

## Environment variables

| Variable | Description |
|----------|-------------|
| VITE_SUPABASE_URL | Your Supabase project URL |
| VITE_SUPABASE_ANON_KEY | The publishable (anon) key — public by design; all access is gated by Row Level Security |

## Project structure

    src/
    |- components/
    |  |- ui/         Button, Card, Input, Modal, Badge, StatCard, Spinner, EmptyState
    |  |- layout/     Sidebar, Topbar, DashboardLayout, PortalLayout
    |  '- common/     ProtectedRoute
    |- context/        AuthContext (session + role)
    |- hooks/          useData (TanStack Query hooks)
    |- lib/            utils (formatting, status maps)
    |- pages/
    |  |- auth/        Login, Signup
    |  |- dashboard/   Dashboard
    |  |- reservations/ Reservations, CalendarView, ReservationForm
    |  |- rooms/       Rooms (+ room types)
    |  |- guests/      Guests CRM
    |  |- billing/     Billing (folios, charges, payments)
    |  '- portal/      PortalRooms, PortalBookings (guest portal)
    |- services/       supabase client, api functions
    |- App.jsx         routes
    '- main.jsx        app bootstrap

## Database schema

Tables (all with Row Level Security): profiles, room_types, rooms, guests, reservations, folios, charges, payments.

- A profile is created automatically on sign-up (default role guest).
- A folio is created automatically for every reservation.
- Staff/admin manage all operational data; guests can only read room availability, create their own bookings, and view their own reservations/folios.

## Deployment (Vercel)

1. Import this folder into Vercel.
2. Set env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
3. Framework preset: Vite. Build `npm run build`, output `dist`.
4. Deploy. `vercel.json` rewrites all routes to index.html for SPA routing.

## Performance notes

- Route-level code splitting via React.lazy + Suspense.
- Manual vendor/charts/supabase chunks in vite.config.js.
- Query caching and deduplication via TanStack Query.
- Lazy-loaded images, system font stack with preconnect, minimal dependency footprint.
