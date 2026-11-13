# UI/UX Design Brief — FileWatch

## 1. Visual Identity & Brand Concept

**Application Name**: FileWatch  
**Tagline**: "Monitor. Detect. Verify."  
**Theme**: Dark Cybersecurity Terminal / Operations Center

### Color Palette

| Token | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `background` | `#070B14` | Deep navy background minimizing ocular fatigue during prolonged SOC shifts. |
| `card` | `#0D1527` | Elevated card surfaces with subtle borders (`#1E293B`). |
| `primary` | `#0284C7` | Professional enterprise blue for primary actions and active links. |
| `cyan-glow` | `#06B6D4` | Accent highlight for cryptographic indicators, active badges, and live telemetry. |
| `purple-accent`| `#8B5CF6` | Secondary accent for HMAC signatures, baselines, and cryptographic seals. |
| `critical` | `#EF4444` | High-contrast crimson for executable tampering, malicious drops, and alerts. |
| `high` | `#F97316` | Amber-orange for configuration modifications and critical file deletions. |
| `medium` | `#F59E0B` | Warm yellow for generic text/code changes. |
| `low / success`| `#10B981` | Emerald green for verified integrity, clean baselines, and successful audits. |

---

## 2. Typography & Spatial Rhythm

- **Primary Font**: Modern clean sans-serif (`Inter`, system UI font stack).
- **Monospace Font**: `JetBrains Mono`, `Fira Code`, or `ui-monospace` for SHA-256 hashes, HMAC signatures, directory paths, and terminal output.
- **Hierarchy**:
  * Headings: `font-bold tracking-tight text-white`
  * Subtext: `text-xs text-slate-400 font-normal`
  * Metadata Badges: `text-[10px] font-mono font-bold uppercase tracking-wider`

---

## 3. Accessibility & Usability (WCAG 2.2 AA)

- All text meets a minimum contrast ratio of 4.5:1 against card and background surfaces.
- Interactive controls feature visible focus rings and hover transitions (`transition-colors`).
- Alerts and severity badges utilize both color and descriptive text labels (not color alone) to accommodate color-blind operators.
- No decorative fake buttons or placeholder functionality: all controls execute real API actions.

