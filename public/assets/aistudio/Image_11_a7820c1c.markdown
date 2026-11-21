---
name: Divya Drusti Opticals
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444653'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#003d28'
  on-tertiary: '#ffffff'
  tertiary-container: '#00563a'
  on-tertiary-container: '#5bcf9e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies precision, clinical trust, and modern diagnostic clarity. Tailored for optometrists, clinical staff, and optical lab technicians, the interface prioritizes effortless visual parsing, zero-error prescription recording, and hygienic calm.

The visual direction combines Modern Clinical Precision with subtle Tonal Architecture:
- Pristine white backgrounds and surgical slate contrasts emulate optical examination environments.
- Deep sapphire and medical cyan inspire patient confidence and precision engineering.
- Vibrant emerald teal highlights promotional offers, including complimentary registration and patient perks, without eroding clinical credibility.
- Dense, highly structured diagnostic elements (refraction matrices, axis dials, lens power grids) balance airy operational canvases.

## Colors
The color architecture establishes an unequivocal clinical hierarchy, balancing diagnostic focus with positive action cues.

- **Primary (`#1E40AF` - Medical Sapphire):** Governs authoritative clinical actions, primary navigation bars, selected states, and final prescription signing.
- **Secondary (`#0284C7` - Diagnostic Cyan):** Applied to optical inspection sub-actions, pupil distance indicators, timeline filters, and secondary diagnostic toggles.
- **Tertiary (`#059669` - Clinical Emerald):** Dedicated to commercial incentives, "100% Free Registration" badges, successful frame dispatches, and healthy eye status readouts. Supported by `#10B981` for subtle badge surfaces.
- **Neutral Palette:**
  - `#0F172A` (Slate 900): Primary clinical readings, eye metric numbers, high-legibility headings.
  - `#334155` (Slate 700): Form labels, secondary clinical notes, table headers.
  - `#64748B` (Slate 500): Helper text, axis notations, neutral timestamps.
  - `#F1F5F9` (Slate 100): Subtle panel backings and inactive metric inputs.
  - `#F8FAFC` (Slate 50): Canvas background ensuring zero glare during prolonged clinical screen time.

## Typography
A dual-sans strategy paired with a dedicated monospaced font eliminates transcription errors in prescription readouts:
- **Headlines (Plus Jakarta Sans):** Introduces warmth, modern authority, and approachable confidence across patient files and dashboard summaries.
- **Body & Controls (Inter):** Highly legible, neutral sans-serif delivering unambiguous clarity for patient histories, optometrist instructions, and lens parameters.
- **Diagnostic Metrics (JetBrains Mono):** Reserved strictly for refraction values (OD/OS SPH, CYL, AXIS, ADD, PD, Prism). Monospaced sizing ensures vertical tabular alignment, distinct minus/plus differentiation (+/-), and rapid data entry without misinterpretation.

## Layout & Spacing
The layout adheres to an 8-point baseline system arranged on a responsive 12-column fluid grid on desktop and a single/dual-column flow on mobile viewports.

- **Breakpoints:**
  - Desktop (`≥ 1200px`): Full 12-column layout with 24px (`1.5rem`) gutters and a fixed 280px clinical navigation rail. Prescription tables span across full or half split cards.
  - Tablet (`768px - 1199px`): 8-column layout with 16px (`1rem`) gutters. Patient profiles and clinical entry forms transition into two balanced stacked panels.
  - Mobile (`< 768px`): 4-column layout with 16px (`1rem`) canvas margins. Tabular refraction grids switch to card-based OD (Right Eye) and OS (Left Eye) horizontal comparison segments.

- **Spacing Rules:**
  - Diagnostic fields inside OD/OS matrices utilize tight padding (`space-xs` to `space-sm`) to maximize density and display all critical values above the fold.
  - Section dividers and clinical workflow cards retain `space-lg` separation to avoid visual collision between prescription details and billing data.

## Elevation & Depth
The system employs clean tonal layering combined with low-contrast borders instead of heavy, dramatic drop shadows. This preserves a sterile, high-utility display suitable for brightly lit clinical rooms.

- **Surface Base (Level 0):** `#F8FAFC` (Canvas).
- **Surface Layer 1 (Level 1):** `#FFFFFF` cards and prescription modules framed by a 1px solid border in `#E2E8F0`.
- **Active & Elevated States (Level 2):** Floating diagnostics palettes, active dropdowns, and lens selection sheets utilize a soft clinical shadow: `0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Diagnostic Focus:** Active input fields receive no drop shadow; instead, they feature a 2px inner highlight in `#0284C7` (Diagnostic Cyan) with an outer ring in `#BAE6FD`.
- **Promotional / Patient Privilege Modules:** Free registration callouts use a faint `#ECFDF5` background accompanied by a `#A7F3D0` crisp border to signal high-value status without visual aggression.

## Shapes
A balanced roundedness (`roundedness: 2` - 8px / 0.5rem base) imparts modern, approachable clinical hygiene:
- Standard buttons, input frames, and table wrappers carry `0.5rem` (`rounded-md`).
- Workflow diagnosis cards, refraction comparison blocks, and patient summary panels utilize `1rem` (`rounded-lg`).
- Status indicators, eye quadrant tags (OD/OS), and "100% Free Registration" chips use full pill shapes (`9999px`) to distinguish meta-tags instantly from rectangular metric inputs.

## Components

### Buttons
- **Primary Clinical Action:** Solid sapphire `#1E40AF` background, crisp white Inter text, 8px radius, 10px 18px padding. Used for "Save Prescription", "Print Lens Work Order", and "Proceed to Billing".
- **Secondary Diagnostic:** Outlined 1px `#CBD5E1` with `#0F172A` text, hovering to `#F1F5F9`.
- **Patient Perk / Free Reg Action:** Solid emerald `#059669`, white text, used strictly for complimentary registrations and loyalty onboarding.

### Refraction Data Grid (OD / OS)
- **Container:** High-clarity tabular matrix dividing Right Eye (OD) and Left Eye (OS) into dedicated semantic rows.
- **Headers:** SPH, CYL, AXIS, ADD, PD, PRISM centered with `label-sm` slate text (`#64748B`).
- **Input Fields:** JetBrains Mono font (`metric-display`), centered alignment, mono-spaced signed numbers (`+2.25`, `-0.75`, `090°`). Background `#FFFFFF` with `#E2E8F0` border; auto-formats signs and decimals upon loss of focus.
- **Quadrant Identifiers:** OD tagged with a subtle Navy badge (`#EFF6FF` background, `#1E40AF` label); OS tagged with a subtle Teal badge (`#F0FDF4` background, `#059669` label).

### Chips & Badges
- **"100% Free Registration" Badge:** Pill-shaped, `#ECFDF5` surface, `#047857` text, leading emerald checkmark/spark icon, bold `label-sm`.
- **Status Badges:** "Exam Completed", "In Lab Fabrication", "Ready for Pickup" utilize paired light-tint backgrounds with dark text in neutral, cyan, and emerald.

### Input Fields & Selectors
- Height: 40px standard.
- Border: 1px `#CBD5E1`.
- Font: Inter 14px regular for patient text; JetBrains Mono 14px for numerical metrics.
- Focus: 2px ring `#0284C7` with zero layout shift.

### Clinical Workflow Cards
- White background (`#FFFFFF`) with 1px `#E2E8F0` outline and `1rem` radius.
- Card Header: Features a patient thumbnail or optical vision icon (e.g., stylized phoropter, retinal lens, or frame silhouette) in deep navy, followed by patient identification and appointment timestamp.
- Card Body: Clean division between diagnostic summaries (OD/OS preview), frame selection details, and real-time lab tracking.
- Mobile Behavior: Re-stacks refraction table columns into an intuitive tap-to-expand accordion per eye.