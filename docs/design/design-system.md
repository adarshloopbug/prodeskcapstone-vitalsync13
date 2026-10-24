# VitalSync Clinical Design System Specification

**Design Philosophy:** Calm, authoritative, medical-grade clarity. Minimizes cognitive friction for clinicians under time pressure while instilling reassurance and accessibility for anxious patients.

---

## 1. Color Palette & Semantic Tokens

VitalSync adopts a dual teal-slate theme engineered to meet **WCAG 2.1 AA** contrast ratios (minimum 4.5:1 for body text, 3:1 for large display elements).

### 1.1 Brand Primary (Clinical Teal & Deep Ocean)
- **Primary 500 (Teal Base):** `#0D9488` (Light mode primary buttons, active tabs, verified badges)
- **Primary 600 (Teal Hover):** `#0F766E`
- **Primary 700 (Deep Teal):** `#115E59`
- **Primary 50 (Teal Tint):** `#F0FDFA` (Light mode subtle backgrounds, selected rows)
- **Secondary 600 (Ocean Blue):** `#0284C7` (Navigation highlights, link color)
- **Secondary 50 (Ocean Tint):** `#F0F9FF`

### 1.2 Neutral & Surface Tokens

| Token Name | Light Mode Value | Dark Mode Value | Usage Application |
| :--- | :--- | :--- | :--- |
| `surface-canvas` | `#F8FAFC` (Slate 50) | `#0B0F17` (Deep Midnight) | Global page background |
| `surface-card` | `#FFFFFF` (White) | `#131B2A` (Navy Slate) | Content containers, dashboard cards |
| `surface-subtle` | `#F1F5F9` (Slate 100) | `#1E293B` (Slate 800) | Table headers, secondary toolbars |
| `border-subtle` | `#E2E8F0` (Slate 200) | `#334155` (Slate 700) | Card dividers, input borders |
| `text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Primary headlines, data points |
| `text-secondary` | `#475569` (Slate 600) | `#94A3B8` (Slate 400) | Supporting labels, timestamps |
| `text-muted` | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | Placeholders, inactive icons |

### 1.3 Clinical Status & Semantic Severity Tokens

| Status / Severity | Background Token | Text / Border Token | Clinical Meaning / Examples |
| :--- | :--- | :--- | :--- |
| **Normal / Available** | `#ECFDF5` (Emerald 50) | `#059669` (Emerald 600) | Doctor Available, Vitals in range, Slot open |
| **Warning / Moderate** | `#FFFBEB` (Amber 50) | `#D97706` (Amber 600) | Slot Held (10m), Mild drug interaction, Pre-hypertension |
| **Danger / Critical** | `#FEF2F2` (Rose 50) | `#DC2626` (Rose 600) | Severe allergy conflict, No-show risk high, Emergency triage |
| **Info / Scheduled** | `#EFF6FF` (Blue 50) | `#2563EB` (Blue 600) | Appointment Confirmed, Scheduled lab test |
| **Neutral / Completed**| `#F1F5F9` (Slate 100) | `#475569` (Slate 600) | Prescription Expired, Completed encounter |

### 1.4 AI Signature Visual Language
To preserve clinical vigilance and eliminate ambiguity regarding AI authorship:
- **AI Accent Gradient:** Linear gradient `linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)` (Indigo to Cyan).
- **AI Background Wash:** `#EEF2FF` (Indigo 50) in light mode, `#1E1B4B` (Indigo 950) in dark mode.
- **AI Sparkle Icon:** Sparkles symbol (`✨`) paired with color `#6366F1`.
- **Mandatory Review Chip:** A rounded pill component with an indigo border, sparkle icon, and uppercase text: `AI-GENERATED • REVIEW REQUIRED`.

---

## 2. Typography Scale (Inter Font Family)

VitalSync uses **Inter** (Google Fonts) for optimal readability across dense clinical matrices, vitals grids, and small-print dosages.

```
Font Family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

| Type Scale Token | Font Size | Line Height | Font Weight | Standard Use Case |
| :--- | :---: | :---: | :---: | :--- |
| `display-lg` | 32px (2.0rem) | 40px | 700 (Bold) | Dashboard welcome, hero numbers |
| `heading-md` | 24px (1.5rem) | 32px | 600 (Semi-bold) | Section headers, card group titles |
| `heading-sm` | 18px (1.125rem) | 26px | 600 (Semi-bold) | Patient name in header, modal titles |
| `body-md` | 14px (0.875rem) | 20px | 400 (Regular) | SOAP note text, prescriptions, table cells |
| `body-md-medium` | 14px (0.875rem) | 20px | 500 (Medium) | Navigation links, active tab labels |
| `caption-sm` | 12px (0.75rem) | 16px | 400 (Regular) | Timestamps, dosage instructions, disclaimers |
| `badge-xs` | 11px (0.6875rem)| 14px | 600 (Semi-bold) | Status badges, category pills, ICD-10 tags |

---

## 3. Spacing, Radius & Elevation Tokens

### 3.1 Spacing Grid (8pt Baseline)
- `space-1`: 4px (tight micro-margins)
- `space-2`: 8px (icon-to-text spacing, compact table padding)
- `space-3`: 12px (badge padding, card header gap)
- `space-4`: 16px (standard input padding, card internal gutter)
- `space-6`: 24px (dashboard grid gap, section spacing)
- `space-8`: 32px (major viewport margin)

### 3.2 Border Radius
- `radius-sm`: 6px (Badges, tags, dropdown menus)
- `radius-md`: 8px (Form inputs, standard buttons)
- `radius-lg`: 12px (Dashboard cards, modals, timeline containers)
- `radius-full`: 9999px (Pills, user avatars, status dots)

### 3.3 Elevation & Shadows
- `shadow-subtle`: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)` (Cards at rest)
- `shadow-hover`: `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)` (Interactive cards on hover)
- `shadow-modal`: `0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)` (Modals, popovers)

---

## 4. Reusable Component Inventory

### 4.1 Buttons
- **Primary:** Teal 500 fill, white bold text, 8px radius, subtle hover scale (`translateY(-1px)`).
- **Secondary:** White fill, slate-200 border, slate-700 text.
- **Destructive:** Rose 50 fill, Rose 600 text, Rose 200 border (for cancellations and deletions).
- **AI Assist Action:** Gradient border or indigo tint with sparkle icon: `✨ Draft with AI`.

### 4.2 Status Badges & Pills
- Compact, pill-shaped tags (`radius-full`, px-2.5, py-0.5) featuring a 6px status indicator circle.
- Variants: `Available` (Emerald), `Held` (Amber), `Booked` (Blue), `In Consultation` (Teal), `Critical` (Rose).

### 4.3 Vitals Tiles
- Compact metric card with numerical readout, measurement unit, recorded timestamp, and mini trend sparkline (e.g. `138/88 mmHg`, `SpO2 98%`, `HR 76 bpm`).

### 4.4 Timeline Feed Items
- Chronological spine with circular category icon nodes (stethoscope for encounters, test-tube for labs, pill for prescriptions).

### 4.5 Medical Banner (Allergies & Alerts)
- Persistent banner docked at top of patient chart with vivid amber/rose stripes, listing life-threatening allergies with an exclamation icon.
