# VitalSync UI/UX Wireframe Specifications & Figma Build Guide

This specification establishes the blueprint for the 8 primary viewports of VitalSync, designed for desktop (1440px width, 12-column grid) with dedicated mobile responsive specifications for Patient Dashboard and Appointment Booking.

---

## Screen 1: Authentication & Role Selection (`screen1-auth.html`)

### 1.1 Layout Grid & Canvas
- **Viewport:** 1440px × 900px (Desktop split layout: 50% left branding hero, 50% right interactive form).
- **Left Panel (Hero & Trust):** Background `#0F172A` (Navy Slate) with deep teal gradient overlay. Contains VitalSync brand mark, tagline, 3 HIPAA compliance badges (AES-256 Encryption, WORM Immutable Audit, Role-Guarded Access), and synthetic data notice pill.
- **Right Panel (Auth Card):** Background `#FFFFFF`. Centered 440px form card with tabs for `Sign In` and `Register`.

### 1.2 Components & Hierarchy
1. **Header:** VitalSync logo + "Welcome back to your healthcare cockpit".
2. **Role Switcher (4-state segment):** Tabs for `Patient`, `Doctor`, `Staff`, `Admin` with distinct icons and active teal indicator.
3. **Form Fields:** Email input, Password input with visibility toggle, "Remember me" checkbox, "Forgot password?" link.
4. **Primary CTA:** Button "Sign In as [Selected Role]" (`#0D9488`).
5. **Divider:** "Or continue with enterprise single sign-on".
6. **Social CTA:** Google OAuth 2.0 button ("Continue with Google Health ID").
7. **Footer Notice:** "Synthetic Data Demonstration Platform • HIPAA Compliant Design".

### 1.3 State Specifications
- **Empty State:** Clean inputs with subtle floating labels.
- **Loading State:** Button shows spinning loader; inputs disabled (`opacity-60`).
- **Error State:** Red input borders with inline alert: `"Invalid credentials. 2 attempts remaining before 15m lockout."`
- **Offline State:** Top banner: `"Offline mode. Cloud authentication unavailable."`

---

## Screen 2: Patient Dashboard (`screen2-patient-dashboard.html`)

### 2.1 Layout Grid & Canvas
- **Desktop:** 1440px width. Left navigation sidebar (240px fixed), main content container (1200px, 12-column grid, 24px gutter).
- **Mobile Viewport (390px):** Single column stack, bottom navigation bar with 4 tabs (Home, Book, Prescriptions, AI Assistant).

### 2.2 Components & Hierarchy
1. **Top Header Bar:** Patient greeting ("Good morning, Rajesh Patel"), Medical Record Number (`MRN: VSYN-2026-00892`), notification bell (badge: 2), user avatar with quick profile dropdown.
2. **AI Health Snapshot Card (Span 8):** Indigo gradient header with sparkle icon. Highlights chronic conditions (Type 2 Diabetes, Hypertension), recent HbA1c result (7.2%), active medications count, and doctor's next review date.
3. **AI Assistant Entry ("Ask VitalSync" Card - Span 4):** Prompt input box: "Ask about your medications, past lab results, or next appointments..." with quick prompt chips.
4. **Upcoming Appointments Card (Span 7):** Appointment with Dr. Priya Sharma (Tomorrow, 10:30 AM), doctor avatar, department pill, "Checked In" status badge, "Add to Calendar" and "Reschedule" buttons.
5. **Recent Vitals Sparkline Grid (Span 5):** 4 tiles: Blood Pressure (138/88 mmHg), Heart Rate (76 bpm), SpO2 (98.5%), Weight (78.4 kg) with last recorded date.
6. **Active Prescriptions Table (Span 12):** List of current medications (Metformin 850mg, Lisinopril 10mg), dosage, refills remaining pill, "Request Refill" button, "Explain in Plain Language" AI button.

---

## Screen 3: Book Appointment (`screen3-book-appointment.html`)

### 3.1 Layout Grid & Canvas
- **Desktop:** 1440px width. 3-column booking workflow (Step 1: Specialty/Doctor Filter - 320px; Step 2: Calendar & Live Slots - 560px; Step 3: AI Slot Optimizer & Confirmation - 320px).
- **Mobile Viewport (390px):** Linear 4-step wizard with step indicator dots.

### 3.2 Components & Hierarchy
1. **Search & Filter Panel:** Specialty dropdown (Internal Medicine, Cardiology, Pediatrics), date range picker, visit type toggle (In-Person / Telehealth).
2. **Doctor Availability Cards:** Doctor avatar, qualifications, consultation fee (`₹800`), live status dot (Green: Available), rating, next slot timestamp.
3. **Calendar & Slot Picker Grid:** Interactive month calendar + morning/afternoon slot pill grid. Slots color-coded: Green (Available), Amber (Held by another user - 10m countdown), Slate (Booked).
4. **AI Smart Scheduling Recommendation Box:** "Recommended: Tuesday 10:30 AM based on your past visit patterns and Dr. Sharma's lowest average wait time (8 min)."
5. **Atomic Hold Timer Modal / Drawer:** 10:00 countdown timer, chief complaint textarea, insurance synthetic selector, "Confirm Booking" CTA.

---

## Screen 4: Doctor Dashboard (`screen4-doctor-dashboard.html`)

### 4.1 Layout Grid & Canvas
- **Desktop:** 1440px width. Left navigation sidebar (240px), Main clinical command center (1200px).

### 4.2 Components & Hierarchy
1. **Doctor Cockpit Header:** Dr. Priya Sharma (MD, Internal Medicine), live availability toggle switch: `Available` | `In Consultation` | `On Break` | `Off Duty`.
2. **Today's Clinical Agenda (Timeline - Span 7):** Chronological hourly schedule with appointment status badges (`Checked-In`, `In-Progress`, `Upcoming`).
3. **Live Waiting Room Queue (Span 5):** Patient name, MRN, arrival time, wait duration timer (highlighted amber if > 15m), recorded triage vitals, and "Call In" CTA button.
4. **Patient Snapshot AI Card:** Floating preview of the next patient in queue (Rajesh Patel: chronic T2D, allergy to Penicillin, last HbA1c 7.2%).
5. **Critical Clinical Alerts Card:** Lab abnormal value alerts and prescription refill requests requiring clinician signature.

---

## Screen 5: Patient Record & Medical Timeline (`screen5-patient-record-timeline.html`)

### 5.1 Layout Grid & Canvas
- **Desktop:** 1440px width. Sticky Patient Banner (Full width), Tabbed Navigation Toolbar, 2-column detail view (Left 8 cols: Chronological Timeline Feed; Right 4 cols: Persistent Clinical Snapshot & Allergies).

### 5.2 Components & Hierarchy
1. **Sticky Patient Header:** Patient photo, Rajesh Patel, 42y Male, MRN `VSYN-2026-00892`, Blood Group `B+`, Primary Care Doctor `Dr. Priya Sharma`.
2. **High-Risk Allergy & Alert Banner:** Prominent Rose-50 banner: `⚠️ SEVERE ALLERGY: Penicillin (Anaphylaxis risk) • G6PD Normal`.
3. **Navigation Tabs:** `Timeline (All)` | `Encounter Notes (SOAP)` | `Vitals Chart` | `Lab Reports` | `Prescriptions` | `Uploaded Scans`.
4. **Chronological Timeline Feed:** Interactive timeline cards with category badges (Stethoscope, Test Tube, Pill), expandable SOAP notes, lab values with abnormal indicator chips, and "Ask AI about this event" button.
5. **Quick Action Floating Dock:** "New Encounter Note", "Record Vitals", "Issue Prescription", "Export Summary PDF".

---

## Screen 6: Encounter & Prescription Workspace (`screen6-encounter-prescription.html`)

### 6.1 Layout Grid & Canvas
- **Desktop:** 1440px width. Split clinical editor layout (Left 6 cols: SOAP Clinical Note Editor; Right 6 cols: Medication Builder & Safety Checker).

### 6.2 Components & Hierarchy
1. **Workspace Header:** Encounter `ENC-20261025-018` • Patient: Rajesh Patel • Consultation in progress (Timer: 18:42).
2. **AI SOAP Copilot Panel:** Unstructured scratchpad input box + button `✨ Generate SOAP Draft with VitalSync AI`.
3. **Structured SOAP Sections:**
   - **Subjective:** Editable rich textarea with AI suggestions highlighted in subtle indigo.
   - **Objective:** Embedded today's vitals table (BP 138/88, HR 76, SpO2 98.5%) + physical exam notes.
   - **Assessment:** Differential diagnosis autocomplete linked to ICD-10 database (`E11.9`).
   - **Plan:** Orders, lifestyle notes, follow-up timeline.
4. **Prescription Builder:** Drug search input (Metformin, Lisinopril), dosage dropdown, frequency picker, course duration.
5. **Drug-Allergy & Drug-Drug Warning Bar:** Real-time safety validation chip (`No Penicillin cross-reactivity • Renal monitoring advised`).
6. **Footer Sign-off Bar:** "Save Draft", "AI Review Verification Checked", Primary Button: `Digitally Sign & Issue Prescription`.

---

## Screen 7: Staff Availability Board (`screen7-staff-availability-board.html`)

### 7.1 Layout Grid & Canvas
- **Desktop:** 1440px width. Real-time hospital operational cockpit for front desk receptionists and triage nurses.

### 7.2 Components & Hierarchy
1. **Live Hospital Status Bar:** Total Doctors On Duty (18), Current Clinic Waiting Load (12 patients), Avg Clinic Wait Time (14 min).
2. **Doctor Availability Matrix (Grid):** Rows of clinicians grouped by department. Columns for hourly slots with real-time status badges: Green (Available), Teal (In Consult), Amber (Held), Blue (Booked).
3. **Rapid Check-In & Vitals Queue (Table):** Arrived patients, check-in button, one-click "Record Vitals" modal trigger, and room allocation dropdown.
4. **AI No-Show Risk Predictor Column:** Color-coded risk meter: Low (8%), Medium (28%), High (64% - Amber alert with reason: "2 consecutive missed rainy appointments, 25km commute").

---

## Screen 8: Admin & Compliance Console (`screen8-admin-console.html`)

### 8.1 Layout Grid & Canvas
- **Desktop:** 1440px width. 3-tab enterprise management console (Tab 1: System Analytics; Tab 2: User & Role RBAC Management; Tab 3: WORM Audit Log Viewer).

### 8.2 Components & Hierarchy
1. **Hospital Analytics KPI Tiles:** Patient volume (142 today), No-show rate (6.8%), Bed/consult room utilization (88.5%), AI token spend & latency summary.
2. **RBAC & User Provisioning Table:** User list, role tags (`DOCTOR`, `STAFF`, `ADMIN`), department assignment, MFA status, "Suspend / Edit Permissions" actions.
3. **Immutable WORM Audit Log Viewer:** Searchable audit trail table: Timestamp, Actor, Role, Action (`SOAP_SIGNED`, `RECORD_EXPORTED`, `BREAK_GLASS`), Resource, Client IP, and Cryptographic Hash integrity indicator (Green padlock: Chain Verified).

---

## 9. Figma Build Guide (For Intern / Designer)

When translating these specs into your Figma design file:

### 9.1 Recommended Frame Setup
- **Master Desktop Frame:** `1440px × 1024px` (Auto-layout: Vertical, Hug contents).
- **Mobile Frame:** `390px × 844px` (iPhone 14/15 standard).
- **Grid Style:** 12 columns, 80px column width, 24px gutter, 80px margin.

### 9.2 Component Naming Conventions
Follow the forward-slash token pattern in Figma:
- `Button / Primary / Default`, `Button / Primary / Hover`, `Button / Primary / Loading`
- `Badge / Appointment / Requested`, `Badge / Appointment / Confirmed`, `Badge / Appointment / CheckedIn`
- `Badge / Prescription / Draft`, `Badge / Prescription / Active`, `Badge / Prescription / Dispensed`
- `Card / VitalsTile`, `Card / AI-Insight`, `Card / TimelineNode`

### 9.3 Auto-Layout Rules
- All cards: Padding `20px` (or `24px`), Gap `16px`, Corner Radius `12px`, Stroke `1px` inside (`#E2E8F0`).
- Status pills: Padding `Horizontal 10px, Vertical 4px`, Corner Radius `999px`.
- Form inputs: Height `44px`, Padding `Horizontal 14px`, Corner Radius `8px`.
