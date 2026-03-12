# Login Page — Visual Specification

A complete spec for recreating the SetSail Deal Strategist login page.

---

## Overall Layout

- **Full-screen centered layout**: `min-height: 100vh`, flexbox column, items centered both horizontally and vertically
- **Background color**: `#01230b` (very dark green)
- **Overflow**: hidden (clips the glow effect at viewport edges)
- **Position**: relative (establishes stacking context for the glow)

---

## Background Glow Effect

A soft, diffused radial glow sits behind the card, centered on the page.

| Property         | Value                                          |
| ---------------- | ---------------------------------------------- |
| Shape            | Circle (`border-radius: 9999px`)               |
| Size             | 600px × 600px                                  |
| Color            | `#158e1d` at **10% opacity** (`rgba(21,142,29,0.10)`) |
| Blur             | `filter: blur(120px)`                          |
| Position         | Absolute, centered — `top: 50%; left: 50%; transform: translate(-50%, -50%)` |
| Z-index          | Behind content (default stacking, no explicit z-index) |
| Pointer events   | `none` (non-interactive)                       |

This creates a subtle green ambient halo behind the login card.

---

## Logo

| Property         | Value                                          |
| ---------------- | ---------------------------------------------- |
| Source            | `/images/setsail-logo-dark.png` (1924 × 509px PNG) |
| Rendered size    | **200px wide × 50px tall**                     |
| Filter           | `brightness(0) invert(1)` — renders the logo as pure white |
| Margin bottom    | `2rem` (32px) — space between logo and card    |
| Z-index          | 10 (above the glow)                            |
| Loading          | Priority (eager load)                          |
| Placement        | Centered above the card, part of the flex column flow |

---

## Login Card

### Container
- **Width**: 100% with `max-width: 24rem` (384px), centered with `margin: 0 auto`
- **Horizontal padding on wrapper**: `1.5rem` (24px) — ensures mobile margin
- **Z-index**: 10

### Card Surface
| Property         | Value                                          |
| ---------------- | ---------------------------------------------- |
| Background       | `rgba(255, 255, 255, 0.07)` — white at 7% opacity (glassmorphism) |
| Backdrop filter   | `blur(4px)` — frosted glass effect            |
| Border           | `1px solid rgba(255, 255, 255, 0.1)` — white at 10% opacity |
| Border radius    | `1rem` (16px) — `rounded-2xl`                 |
| Padding          | `2rem` (32px) on all sides                    |
| Internal spacing | `1.5rem` (24px) vertical gap between children (`space-y-6`) |

### Heading Block (centered text)
- **Title**: "Deal Strategist"
  - Font size: `1.125rem` / `18px` (`text-lg`)
  - Font weight: **600** (semibold)
  - Color: `#ffffff` (white)
- **Subtitle**: "AI-powered deal analysis"
  - Font size: `0.875rem` / `14px` (`text-sm`)
  - Font weight: normal (400)
  - Color: `rgba(255, 255, 255, 0.5)` — white at 50% opacity
  - Margin top: `0.25rem` (4px)

---

## Error Message (conditional)

Shown when a query parameter `?error=<code>` is present.

| Property         | Value                                          |
| ---------------- | ---------------------------------------------- |
| Background       | `rgba(239, 68, 68, 0.1)` — red-500 at 10%     |
| Border           | `1px solid rgba(239, 68, 68, 0.2)` — red-500 at 20% |
| Border radius    | `0.5rem` (8px)                                 |
| Padding          | `1rem` horizontal, `0.75rem` vertical (16px × 12px) |
| Text alignment   | Center                                         |
| Text color       | `#f87171` (`red-400`)                          |
| Text size        | `0.875rem` / 14px                              |

### Error Messages by Code
| Code              | Message                                          |
| ----------------- | ------------------------------------------------ |
| `Configuration`   | "Server configuration error — check environment variables." |
| `AccessDenied`    | "Your email is not on the allowed list."         |
| `Verification`    | "Sign-in link expired. Try again."               |
| Default           | "Something went wrong. Please try again."        |

---

## Sign-In Button

| Property         | Value                                          |
| ---------------- | ---------------------------------------------- |
| Width            | 100% of card                                   |
| Layout           | Flexbox row, items centered, content centered   |
| Gap              | `0.75rem` (12px) between icon and text          |
| Padding          | `1rem` horizontal, `0.75rem` vertical (16px × 12px) |
| Border radius    | `9999px` (fully rounded / pill shape)           |
| Background       | `#ffffff` (white)                              |
| Text color       | `#374151` (`gray-700`)                         |
| Font weight      | 500 (medium)                                   |
| Hover background | `#f3f4f6` (`gray-100`)                         |
| Transition       | `transition-property: color, background-color` (150ms ease) |
| Cursor           | Pointer                                        |
| Label            | "Sign in with Google"                          |

### Google Icon (inline SVG)
- Size: `1.25rem × 1.25rem` (20px × 20px)
- ViewBox: `0 0 24 24`
- 4-color Google "G" logo:
  - Blue: `#4285F4`
  - Green: `#34A853`
  - Yellow: `#FBBC05`
  - Red: `#EA4335`

```svg
<svg width="20" height="20" viewBox="0 0 24 24">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
```

---

## Typography

- **Font family**: Inter, sans-serif (set globally via `--font-family-sans`)
- **Monospace font**: IBM Plex Mono, Arial, sans-serif (not used on this page)

---

## Visual Hierarchy (z-order, top to bottom)

1. **z-10**: Logo + Card (interactive content)
2. **z-auto**: Background glow (decorative, pointer-events: none)
3. **Base**: Dark green background (`#01230b`)

---

## Responsive Behavior

- The card is constrained to `max-width: 384px` but uses `width: 100%` with `padding: 0 24px` on the wrapper, so it gracefully shrinks on narrow viewports.
- Vertically centered via flexbox — no fixed positioning, so it scrolls naturally if the viewport is very short.
- No breakpoint-specific overrides; the design is inherently mobile-friendly.

---

## Functional Behavior

- **Auth provider**: Google OAuth via NextAuth.js (`signIn("google", { callbackUrl: "/" })`)
- **Session check**: If a session already exists, the user is redirected to `/` immediately
- **Error display**: Reads `?error=` from the URL query string and maps it to a user-friendly message
- **Wrapped in `<Suspense>`** at the page level (required for `useSearchParams()` in Next.js App Router)
