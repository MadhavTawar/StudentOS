# UI Guidelines — StudentOS

Design system tokens, spacing, components, and theming used across the StudentOS frontend.

## Tokens (index.css)

All colors come from CSS custom properties. Do not introduce hard-coded colors.

| Token | Meaning | Default |
|-------|---------|---------|
| `--bg-main` | Page background | soft off-white |
| `--bg-card` | Card background | white |
| `--bg-input` | Input / interior surface | var(--bg-card) |
| `--border-card` | Hairline border | var(--border-subtle) |
| `--accent-primary` | Primary accent | clear blue #2F6BFF |
| `--accent-primary-hover` | Hover state | darker accent |
| `--accent-wash` | Subtle accent fill | accent at low opacity |
| `--accent-border-soft` | Soft accent border | |
| `--accent-secondary` | AI-feature violet | |
| `--accent-danger` | Negative / destructive | red |
| `--accent-warning` | Warning / medium priority | amber |
| `--accent-success` | Positive / completed | green |
| `--text-main` | Primary text | near-black |
| `--text-muted` | Secondary text | gray |
| `--text-dim` | Muted / small text | lighter gray |
| `--text-on-accent` | White text on accent surface | #ffffff |
| `--shadow-modal` | Soft shadow | very soft |
| `--shadow-glow` | Brand glow | accent-based |
| `--radius-lg`, `--radius-md`, `--radius-sm`, `--radius-full` | Border radii | 16–20px / 12px / 8px / pill |
| `--focus-ring` | Keyboard focus outline | accent ring |
| `--transition-normal` | Standard transition | |
| `--content-max` | Max content width | |

## Theme

- Default theme is light. Dark mode via `[data-theme="dark"]` token overrides on `<html>`.
- Theme preference is stored in `localStorage` under `studentos-theme` and restored before first paint via an inline script in `index.html`.
- `Layout.tsx` applies `data-theme` from `api.getPreferences()` after auth loads.
- White text is only used on accent-coloured surfaces (primary buttons, avatar). Neutral surfaces use `--text-main` / `--text-muted`.

## Typography

- One sans font: DM Sans (UI). Serif only for logo if used.
- Page title: 28–32px. Card title: 16–18px. Body: 14px. Muted: 13px.
- WCAG AA contrast in both themes; check greeting banners specifically.

## Components

### Card
White card, 16–20px radius, hairline border, very soft shadow. Card header pattern: icon chip + title left; small icon buttons right.

### Buttons
Primary = accent background with white text. Outline = hairline border, text color. Icon buttons are square, hairline border, hover to accent wash.

### Badges / pills
Status pills: completed = green tint, pending = grey, High = red, Medium = amber, Low = blue.

### Table rows
Hairline border, radius, checkbox + title + status pill + priority pill + due date + chevron.

## Spacing

- Page gap: 24px. Internal component gaps follow a 4px/8px/12px/16px/24px scale.
- Card padding: 1rem / 1.25rem / 1.5rem depending on density.

## Theming notes

- Light theme is the default; dark is opt-in via preference.
- Do not add new `[style*=...]` repaint rules. Move inline `style={{}}` into CSS classes in `layout.css` or the page-specific CSS file.
- Delete matching `[style*=...]` rules in the same commit when moving a page's inline styles into classes.
