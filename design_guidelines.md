# SwasthyaTrack Design Guidelines

## Design Approach: Healthcare Dashboard System

**Selected Approach:** Design System - Material Design with Healthcare Data Focus

**Justification:** SwasthyaTrack is a utility-focused, information-dense healthcare application where clarity, efficiency, and data accessibility are critical. The application serves multiple user roles managing sensitive health data, requiring consistent patterns, clear hierarchies, and scalable component architecture.

**Key Design Principles:**
- Data clarity over visual flourish
- Scannable information hierarchy for quick decision-making
- Accessible forms that minimize medical data entry errors
- Clear role-based visual separation
- Mobile-responsive tables and charts for field work

---

## Typography System

**Font Stack:** Inter (primary), system-ui fallback
- Load via Google Fonts CDN: Inter weights 400, 500, 600, 700

**Hierarchy:**
- **Dashboard Headers:** text-3xl font-bold (student names, section titles)
- **Card Titles:** text-xl font-semibold (health card sections, metric labels)
- **Body Text:** text-base font-normal (form labels, table content, descriptions)
- **Data Values:** text-lg font-semibold (metrics, statistics, health readings)
- **Captions/Meta:** text-sm font-medium (timestamps, status badges, helper text)
- **Small Labels:** text-xs font-medium (table headers, chart legends)

**Reading Optimization:**
- Max-width for long-form content: max-w-4xl
- Form fields: max-w-md for single-column inputs
- Table containers: w-full with horizontal scroll on mobile

---

## Layout & Spacing System

**Tailwind Spacing Primitives:** Use units of 2, 4, 6, 8, 12, 16
- Tight spacing (between related items): gap-2, space-y-2
- Standard spacing (form fields, card content): gap-4, p-4, space-y-4
- Section spacing (dashboard sections): gap-6, py-6
- Large spacing (between major sections): gap-8, py-8, my-12
- Container padding: px-4 md:px-6 lg:px-8

**Grid Systems:**
- Dashboard metrics: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4
- Student cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Form layouts: Single column on mobile, 2-column (grid-cols-2) on desktop for related fields
- Chart displays: Full width on mobile, grid-cols-1 lg:grid-cols-2 for comparison views

**Container Strategy:**
- App wrapper: max-w-7xl mx-auto px-4
- Modal dialogs: max-w-2xl (forms), max-w-4xl (health card review)
- Tables: w-full with overflow-x-auto wrapper

---

## Component Library

### Navigation & Layout
**Top Navigation Bar:**
- Fixed header with shadow, h-16, flex items-center justify-between
- Logo/brand on left, user profile dropdown on right
- Role badge displayed next to user name
- Mobile: Hamburger menu, slide-in drawer navigation

**Sidebar Navigation (Desktop):**
- Left sidebar, w-64, fixed height with scroll
- Navigation items with icons (Heroicons), text-sm font-medium
- Active state with subtle left border indicator
- Collapsible on tablet/mobile to icon-only or hidden

### Dashboard Components
**Metric Cards:**
- Rounded containers with shadow-sm, p-6
- Icon at top (large, 48x48), metric value (text-3xl font-bold), label (text-sm), trend indicator if applicable
- Grid layout for multiple metrics

**Chart Containers:**
- White cards with shadow, rounded-lg, p-6
- Chart title (text-lg font-semibold) with filter dropdowns aligned right
- Chart.js canvas with responsive aspect ratio
- Legend positioned below chart on mobile, side on desktop

**Data Tables:**
- Striped rows for readability, hover state on rows
- Sticky header on scroll, text-xs font-semibold uppercase headers
- Action buttons (edit, view, approve) aligned right in row
- Pagination controls at bottom (showing "1-10 of 40 students")
- Mobile: Card-based layout instead of table (stack fields vertically)

### Forms & Input Components
**Health Card Form (Annual):**
- Multi-section accordion layout (Demographics, Anthropometrics, Vision, Deficiencies, Diseases, Referral)
- Each section expandable, with completion indicator
- Field groups with clear labels, required field markers (*)
- Input fields with border, rounded, p-2, focus ring
- Validation errors in small red text below field

**Monthly Checkup Form:**
- Compact single-page form, grid layout for related fields (height/weight side-by-side)
- Auto-calculated BMI displays immediately as text field (read-only, highlighted)
- Checkbox groups for symptoms, radio buttons for treatment type
- Conditional fields (if "Referred" selected, show "Referred To" text input)

**Image Upload with Geolocation:**
- Drag-drop zone with dashed border, p-8, centered text
- Preview thumbnail once uploaded
- Map component (Leaflet or Mapbox GL) with draggable marker for manual geotag
- Display extracted EXIF data as read-only text below image
- Override toggle switch to manually set location

### Status & Feedback
**Status Badges:**
- Rounded-full px-3 py-1 text-xs font-semibold
- "Pending" / "Approved" / "Rejected" states with distinct visual treatment (not color)
- Border variations or icon prefixes for differentiation

**Approval Panel (Headmaster):**
- Student health card displayed in read-only modal
- Large "Approve" and "Reject" buttons at bottom
- If rejecting, show text area for rejection reason (required)
- Confirmation toast after action

**Notifications/Alerts:**
- Toast notifications (top-right), slide-in animation
- Alert banners for page-level messages (e.g., "5 pending health cards require review")
- Icon + message + dismiss button

### Reports & Export
**PDF Preview:**
- Iframe or embedded PDF viewer within modal
- Download button and Print button in header
- Loading state with skeleton placeholder

**Export Controls:**
- Button with icon (download icon from Heroicons)
- Dropdown for format selection (CSV, PDF) if multiple formats
- Positioned top-right of table/chart containers

---

## Role-Based Visual Cues

**Role Indicators:**
- Role badge in navigation header (subtle, small)
- Dashboard title includes role context: "PO Dashboard - District Overview"
- Restricted actions show tooltip on hover: "Only Headmasters can approve health cards"

**Dashboard Differentiation:**
- PO: Focus on school comparison charts, wide data tables
- Headmaster: Approval queue prominent at top, summary metrics below
- Class Teacher: Student roster with quick-add button, monthly entry forms
- Medical Team: Calendar-based entry interface with student selector

---

## Mobile Responsiveness

**Breakpoint Strategy:**
- Mobile-first: base styles for sm screens
- md: 768px (tablets, 2-column layouts emerge)
- lg: 1024px (desktop, full sidebar, 3-4 column grids)

**Mobile Optimizations:**
- Tables convert to stacked cards with key info
- Charts maintain readability, legends below instead of side
- Forms single-column, larger touch targets (min h-12 for buttons)
- Navigation collapses to bottom tab bar or hamburger drawer
- Sticky CTAs for forms (e.g., Submit button always visible)

---

## Animation Guidelines

**Minimal Motion:**
- Page transitions: None (instant navigation)
- Modals: Simple fade-in (duration-200)
- Dropdowns: Subtle slide-down (duration-150)
- Chart rendering: Chart.js default animations (keep them, they're subtle and informative)
- Loading states: Spinner or skeleton screens, no elaborate animations

**Interactive Feedback:**
- Button clicks: Quick scale transform (scale-95 active state)
- Form focus: Smooth ring appearance (transition-all duration-150)
- Hover states: Subtle background changes only

---

## Accessibility & Usability

**Form Design:**
- Label always visible above input (never placeholder-only)
- Error messages appear below field with icon
- Required fields marked with asterisk in label
- Sufficient spacing between inputs (space-y-4) to prevent mis-taps

**Data Density Management:**
- Use progressive disclosure (accordions, tabs) for health card sections
- Limit table rows per page to 10-15 for scannability
- Provide filtering controls at top of data-heavy pages

**Touch Targets:**
- Minimum height h-10 for all interactive elements on mobile
- Buttons: px-4 py-2 minimum, larger for primary actions (px-6 py-3)

---

## Images

**Logo/Branding:**
- Application logo in top-left of navigation (healthcare icon + "SwasthyaTrack" text)
- Favicon with medical cross or health symbol

**User Avatars:**
- Default avatar placeholders for users (initials in circle)
- Teacher/student photos if uploaded, circular crop

**Meal Images:**
- Thumbnail grid in meal logs, click to expand
- Location pin icon overlay on thumbnail indicating geotag present

**No Hero Image:** This is a dashboard application, not a landing page - login page uses centered form with logo above, no hero imagery needed.