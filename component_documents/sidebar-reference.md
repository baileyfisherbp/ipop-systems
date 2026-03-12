# Sidebar Navigation — Design Reference

## Overview

A collapsible left-hand sidebar navigation built with React, Next.js App Router, and Tailwind CSS. The sidebar uses a deep blue background (`#091c81`) with white/translucent text and persists its collapsed state via `localStorage`.

---

## File Locations

| Component             | Path                                          |
| --------------------- | --------------------------------------------- |
| Sidebar component     | `src/components/sidebar.tsx`                  |
| Collapse state hook   | `src/hooks/use-sidebar-collapsed.ts`          |
| Presence avatars      | `src/components/presence-avatars.tsx`          |
| App layout            | `src/app/(app)/layout.tsx`                    |
| Global CSS (colors)   | `src/app/globals.css`                         |
| Sign-out server action| `src/lib/actions.ts`                          |
| Logo (white, no wordmark) | `public/ipop_white_nowordmark.svg`        |
| Logo (black, no wordmark) | `public/ipop_black_nowordmark.svg`        |

---

## Logo

- **File:** `public/ipop_white_nowordmark.svg` (white variant used in sidebar)
- **Alt variant:** `public/ipop_black_nowordmark.svg` (for light backgrounds)
- **Format:** SVG, ~9.1 KB
- **Rendered with:** Next.js `<Image>` component
- **Sizing:** 56×56 px expanded, 36×36 px collapsed
- **Links to:** `/dashboard`
- **Container:** Fixed-height row (`h-14`), wrapped in a `<Link>`

---

## Menu Items

Navigation is defined as a static array of objects rendered inside a `<nav>` element:

```ts
const navItems = [
  { label: "Dashboard",       href: "/dashboard",        icon: LayoutDashboard },
  { label: "Candidates",      href: "/candidates",       icon: UserPlus },
  { label: "Calendar",        href: "/calendar",         icon: Calendar },
  { label: "Team",            href: "/team",             icon: Users },
  { label: "Email Templates", href: "/email-templates",  icon: Mail },
  { label: "Onboarding Docs", href: "/onboarding-docs",  icon: FileText },
  { label: "Org Chart",       href: "/org-chart",        icon: Network },
  { label: "Feedback",        href: "/feedback",         icon: MessageSquarePlus },
  { label: "Settings",        href: "/settings",         icon: Settings },
];
```

- Each item is a Next.js `<Link>` with an icon (always visible) and a label (hidden when collapsed).
- **Active route detection:** `usePathname()` — the current path is compared to each `href`.
- **Active style:** `bg-white/15 text-white`
- **Inactive style:** `text-sidebar-foreground hover:bg-white/[0.07] hover:text-white`
- **Admin filtering:** A `userRole` prop gates certain items to admin-only visibility.

---

## Icons

All icons come from **lucide-react**, sized at `h-4 w-4 shrink-0` (16 px):

| Icon                 | Used for         |
| -------------------- | ---------------- |
| `LayoutDashboard`    | Dashboard        |
| `UserPlus`           | Candidates       |
| `Calendar`           | Calendar         |
| `Users`              | Team             |
| `Mail`               | Email Templates  |
| `FileText`           | Onboarding Docs  |
| `Network`            | Org Chart        |
| `MessageSquarePlus`  | Feedback         |
| `Settings`           | Settings         |
| `Search`             | Search button    |
| `LogOut`             | Sign Out         |
| `PanelLeftClose`     | Collapse trigger |
| `PanelLeftOpen`      | Expand trigger   |

---

## Collapse / Expand Feature

### State hook — `useSidebarCollapsed()`

```ts
// src/hooks/use-sidebar-collapsed.ts
// Returns { collapsed: boolean, toggle: () => void }
// Persists to localStorage under the key "sidebar-collapsed"
```

- Default state: **expanded** (`collapsed = false`).
- On mount, reads `localStorage` to restore the previous state.
- On toggle, updates state and writes to `localStorage` immediately.

### Visual changes when collapsed

| Property         | Expanded          | Collapsed         |
| ---------------- | ----------------- | ----------------- |
| Sidebar width    | `w-64` (256 px)   | `w-16` (64 px)    |
| Logo size        | 56×56 px          | 36×36 px          |
| Nav padding      | `px-3`            | `px-2`            |
| Button layout    | `gap-3 px-3 py-2` | `justify-center p-2` |
| Labels           | Visible           | Hidden            |
| Presence avatars | Visible           | Hidden            |

- **Transition:** `transition-all duration-200` for a smooth 200 ms animation.
- **Collapse button** is at the very bottom of the sidebar. Shows `PanelLeftClose` icon + "Collapse" text when expanded; shows `PanelLeftOpen` icon only when collapsed.

---

## Sign Out Button

- **Location:** Bottom section, above the collapse button.
- **Implementation:** A `<form>` with `action={signOutAction}` (Next.js server action).
- **Server action** (`src/lib/actions.ts`): calls `signOut({ redirectTo: "/login" })` via NextAuth.
- **Icon:** `LogOut` from lucide-react.
- Label hidden when collapsed.

---

## Color System

Sidebar colors are defined as CSS custom properties in `src/app/globals.css`:

| Variable                       | Light mode                  | Dark mode     |
| ------------------------------ | --------------------------- | ------------- |
| `--sidebar`                    | `#091c81`                   | `#141412`     |
| `--sidebar-foreground`         | `rgba(255, 255, 255, 0.65)` | same          |
| `--sidebar-accent`             | `rgba(255, 255, 255, 0.1)`  | same          |
| `--sidebar-accent-foreground`  | `#ffffff`                   | same          |
| `--sidebar-border`             | `rgba(255, 255, 255, 0.08)` | same          |
| `--sidebar-ring`               | `#D0FF71` (lime green)      | same          |

Applied via Tailwind as `bg-sidebar`, `text-sidebar-foreground`, etc.

---

## Layout Architecture

```
Root Layout (src/app/layout.tsx)
└── ThemeProvider (next-themes, class-based, default "light")
    └── App Layout (src/app/(app)/layout.tsx)
        ├── Sidebar (flex: none, left side)
        └── Main content (flex: 1, overflow-y-auto, p-6)
```

- Outer container: `flex h-screen overflow-hidden`
- Auth check via `auth()` before rendering.
- Sidebar receives the authenticated user's role as a prop.

---

## Additional Features

### Search Button
- Sits below the logo, above the nav items.
- Styled: `border border-white/[0.08] bg-white/[0.05]`
- Opens the **CommandPalette** (`src/components/command-palette.tsx`) via `Cmd+K` / `Cmd+F`.

### Presence Avatars
- Component: `src/components/presence-avatars.tsx`
- Displays up to 6 overlapping avatars of online team members in the sidebar header.
- Includes status dots (green = online, yellow = away) and a pulse animation for recently active users.
- Hidden when sidebar is collapsed.
