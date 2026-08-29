# Multi-Event Day Multi-Calendar - Project Plan

## Overview
This project implements a calendar application that fetches and displays events from multiple Google Calendars in a single day view.

## Completed Tasks

### Task 1: Project Scaffolding ✅
- Created Nuxt 3 project structure
- Configured Tailwind CSS
- Set up TypeScript types for calendars and events
- Created basic app.vue with navigation

### Task 2: useCalendarConfig Composable ✅
- Implemented calendar configuration management
- localStorage persistence with key "calendar_config"
- Methods: addCalendar, removeCalendar, updateDisplayName, saveConfig
- Reactive state management with Vue 3 Composition API

### Task 3: useGoogleAuth Composable ✅
- Implemented Google OAuth2 authentication
- Loads Google Identity Services script dynamically
- Handles sign in/sign out flows
- Decodes JWT tokens to extract user information
- Provides authentication state and user data

### Task 4: useCalendarEvents Composable ✅
- Implemented event fetching from multiple calendars
- Parallel API calls with Promise.allSettled for reliability
- Filters events for selected date with 60-minute buffer
- Sorts events by start time
- Provides loading, error, and success states
- Utility functions for date/time formatting

### Task 5: Settings Page ✅
- Created `/settings` route (pages/settings/index.vue)
- Integrated useCalendarConfig composable
- Added form to input Google Calendar IDs with validation
- Allow updating display names with inline editing
- Show configured calendars with rename and remove options
- Display authentication status using useGoogleAuth composable
- Installed and configured Nuxt UI for pre-built components
- Created default layout with navigation header

### Task 6: Dashboard Page ✅
- Created `/dashboard` route (pages/dashboard.vue)
- Uses useCalendarEvents composable
- Displays events for selected date
- Header with today's date (Italian locale) and link to settings ⚙️
- Login with Google if not authenticated; auto-fetch events on auth
- Shows loading state and per-calendar error handling
- Empty state when no calendars configured

### Task 7: CalendarTable Component ✅
- Created `components/CalendarTable.vue` (plus `CalendarCell.vue` and `EventChip.vue`)
- Hourly slots from 08:00 to 20:00 (13 rows, 60-minute slots)
- One column per configured calendar
- Event cells shown when slot falls in `[start, end)` interval
- Empty cells shown as `—`
- Per-calendar error indicator ("⚠ Errore accesso") shown in column headers when a calendar returns 403/404, without blocking the others
- Horizontal scroll on narrow screens

## Pending Tasks

### Task 8: Date Navigation Controls
- Implement date picker or arrow navigation
- Update selected date in useCalendarEvents
- Show current date indicator
- Validate date range (no past dates or future dates beyond 1 year)

### Task 9: Environment Setup
- Create .env.example file
- Document required environment variables:
  - NUXT_PUBLIC_GOOGLE_CLIENT_ID
- Add instructions for obtaining Google API credentials

### Task 10: Testing
- Add unit tests for composables
- Add integration tests for pages
- Test OAuth2 flow
- Test event fetching and filtering
- Test edge cases (no events, multiple events, all-day events)

### Task 11: Documentation
- Update README.md with setup instructions
- Create API documentation
- Add contribution guidelines
- Document localStorage schema

### Task 12: Deployment
- Configure deployment to Vercel/Netlify
- Set up environment variables for production
- Test production build
- Add CI/CD pipeline

## Technical Stack
- **Framework**: Nuxt 3 (Vue 3)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Google OAuth2
- **API**: Google Calendar API v3
- **Storage**: localStorage (client-side)
- **State Management**: Vue 3 Composition API (composables)

## Project Structure
```
multi-event-day-multi-calendar/
├── assets/
│   └── css/
│       └── tailwind.css
├── composables/
│   ├── useCalendarConfig.ts
│   ├── useCalendarEvents.ts
│   └── useGoogleAuth.ts
├── layouts/
│   └── default.vue
├── pages/
│   ├── index.vue (pending)
│   ├── settings/
│   │   └── index.vue
│   └── dashboard.vue
├── components/
│   ├── CalendarTable.vue
│   ├── CalendarCell.vue
│   └── EventChip.vue
├── types/
│   └── calendar.ts
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── .env (private, not committed)
├── .env.example (pending)
└── PLAN.md
```

## API Endpoints
- Google Calendar API: `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`
- Required scopes: `https://www.googleapis.com/auth/calendar.readonly`

## Known Issues & Considerations
- SSR disabled to avoid OAuth2 issues
- Client-side only configuration storage
- No backend authentication layer
- Requires Google Cloud Console setup for API credentials

## Next Steps
1. Add date navigation controls (Task 8)
2. Set up environment files (Task 9)
3. Add comprehensive testing (Task 10)
4. Update documentation (Task 11)
5. Deploy to production (Task 12)
