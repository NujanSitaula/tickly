# Accessibility & Structured Data Audit Report

**Project:** Tickly (TodoApp)  
**Scope:** WCAG 2.1 AA, semantic HTML, schema.org JSON-LD, keyboard/screen reader  
**Date:** Applied fixes in codebase

---

## 1. Issues Found and Fixes Applied

### 1.1 Skip to main content (WCAG 2.4.1 Bypass Blocks)
- **Issue:** No skip link for keyboard users to bypass repeated navigation.
- **Fix:** Added a skip link at the start of `body` in root layout; visually hidden with `.skip-link` until focused, then visible with focus ring. Main content areas use `id="main-content"` and `tabIndex={-1}` for programmatic focus.

### 1.2 Semantic landmarks
- **Issue:** Auth and dashboard used generic `div` wrappers; no `<main>` or `<aside>`.
- **Fix:** Auth layout: left column wrapped in `<main id="main-content">`, right column in `<aside aria-label="...">`. Dashboard layout: `<main id="main-content">` already present, confirmed. Sidebar uses `<nav>` for navigation and project list.

### 1.3 Links with `href="#"`
- **Issue:** Login and register had "Forgot password", "Terms of Service", "Privacy Policy" as `Link href="#"`, which fails accessibility and semantics.
- **Fix:** All point to `/help` with proper focus styles (`focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded`). Forgot password link has `aria-label="Forgot password - see help"`.

### 1.4 Buttons missing `type` or ARIA
- **Issue:** User menu and footer Help button in Sidebar had no `type="button"`; user menu had no `aria-expanded`/`aria-haspopup`.
- **Fix:** Added `type="button"`, `aria-expanded={showUserMenu}`, `aria-haspopup="menu"`, `aria-label="User menu"` to user menu button. Footer Help button given `type="button"` and `aria-label={tSidebar('helpResources')}`.

### 1.5 Modals not exposed as dialogs
- **Issue:** AddTaskModal, AddProjectModal, TaskDetailModal were plain `div`s; no `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`.
- **Fix:** Each modal container now has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (and TaskDetailModal `aria-describedby`). Headings use IDs (`add-task-title`, `add-project-title`, `task-detail-title`). Overlays have `aria-hidden="true"`. ESC to close was already present; retained.

### 1.6 Modal close buttons
- **Issue:** Close buttons had `aria-label="Close"` and some lacked `type="button"`.
- **Fix:** All modal close buttons use `type="button"` and `aria-label="Close dialog"`, with visible focus ring.

### 1.7 Form inputs without associated labels
- **Issue:** AddTaskModal task name and description had no `<label>`; AddProjectModal name input had label but no `htmlFor`/`id`.
- **Fix:** AddTaskModal: added `<label htmlFor="add-task-name" className="sr-only">Task name</label>` and `id="add-task-name"`; same for description with `id="add-task-description"`. AddProjectModal: `htmlFor="add-project-name"` and `id="add-project-name"`; Priority select has `id="add-project-priority"` and label `htmlFor="add-project-priority"`. Color button has `aria-labelledby="add-project-color-label"` and `aria-expanded`/`aria-haspopup`.

### 1.8 Clickable divs (keyboard / semantics)
- **Issue:** TaskItem and TaskCard used `<div onClick={...}>` for opening task details; not keyboard focusable or announced as interactive.
- **Fix:** TaskItem: content area changed to `<button type="button">` with `aria-label={`Open task: ${task.title}`}` and focus ring. TaskCard: wrapper changed to `<div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>` with same aria-label and focus ring; inner checkbox remains `<button type="button">`.

### 1.9 ViewSwitcher toggle group
- **Issue:** No `aria-pressed` or group label for the list/kanban/calendar buttons.
- **Fix:** Container has `role="group"` and `aria-label="View mode"`. Each button has `aria-pressed={view === 'list'}` (etc.). Icons have `aria-hidden="true"`.

### 1.10 Focus visibility (WCAG 2.4.7)
- **Issue:** Several buttons used `focus:outline-none` without a clear alternative visible focus indicator.
- **Fix:** Global `:focus-visible` in `globals.css`: `outline: 2px solid var(--ring); outline-offset: 2px`. Buttons that had only `focus:outline-none` now also have `focus:ring-2 focus:ring-ring focus:ring-offset-2` (or equivalent) so focus remains visible. Skip link uses explicit focus styles to become visible when focused.

### 1.11 Decorative / redundant images and icons
- **Issue:** Decorative SVGs and icons could be announced by screen readers.
- **Fix:** Where appropriate, added `aria-hidden="true"` to icons (Calendar, MessageSquare, List, LayoutGrid in ViewSwitcher; Briefcase in TaskDetailModal; etc.). Logo SVG in auth left without aria-hidden where it is part of a link (link text provides context).

### 1.12 Add Project modal: ESC and keyboard
- **Issue:** AddProjectModal had no ESC handler.
- **Fix:** Added `handleKeyDown` that calls `onClose()` on `Escape` and attached to overlay and dialog.

### 1.13 Task detail modal: complete button and description
- **Issue:** Toggle-complete button and dialog needed clearer semantics.
- **Fix:** Dialog has `aria-labelledby="task-detail-title"` and `aria-describedby="task-detail-content"`. Title is an `h2` with `id="task-detail-title"` and class `sr-only` (task title). Toggle-complete button has `aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}` and focus ring.

### 1.14 Date and dropdown buttons (AddTaskModal)
- **Issue:** Date button and priority/project dropdowns had no aria or focus ring.
- **Fix:** Date button: `aria-label={dueDate ? \`Due date: ${...}\` : 'Choose due date'}` and focus ring. Priority button: `aria-expanded`, `aria-haspopup="listbox"`, `aria-label={Priority: ${priorityLabels[priority]}}`. Project button: `aria-labelledby="add-task-project-label"`, `aria-expanded`, `aria-haspopup="listbox"`, plus sr-only label "Project".

### 1.15 Screen-reader only utility
- **Issue:** No shared utility for visually hidden text (e.g. labels).
- **Fix:** Added `.sr-only` in `globals.css` (position, clip, overflow, etc.) and used for labels where only visible label is the placeholder or adjacent text.

---

## 2. Structured Data (schema.org JSON-LD)

- **Issue:** No structured data for search or assistants.
- **Fix:** Root layout includes a single JSON-LD script in `body` with:
  - **Organization:** `@type`, `@id`, `name`, `url` for Tickly.
  - **WebSite:** `@type`, `@id`, `url`, `name`, `description`, `publisher` (reference to Organization).
- No Product/Offer added (app is a task/productivity tool, not a product catalog). BreadcrumbList can be added per page later using dynamic data (e.g. Today, Project name).

---

## 3. Before → After Summary

| Area | Before | After |
|------|--------|--------|
| Skip link | None | Skip link to `#main-content`, visible on focus |
| Auth layout | All `div` | `<main id="main-content">`, `<aside aria-label="...">` |
| Login/Register links | `href="#"` | `href="/help"` + focus ring + aria-label where needed |
| Modals | Plain divs | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, ESC |
| AddTaskModal inputs | No labels | Labels (visible or sr-only) + ids |
| AddProjectModal | No ESC; label not linked | ESC; `htmlFor`/`id`; Color/Priority/Emoji/Layout semantics |
| TaskItem content | `<div onClick>` | `<button type="button">` with aria-label and focus |
| TaskCard | `<div onClick>` | `<div role="button" tabIndex={0} onKeyDown>` + focus; inner checkbox stays button |
| ViewSwitcher | No pressed state | `aria-pressed`, group `aria-label`, icon `aria-hidden` |
| Sidebar user menu | No type/aria | `type="button"`, `aria-expanded`, `aria-haspopup`, `aria-label` |
| Sidebar Help (collapsed) | No type/label | `type="button"`, `aria-label` |
| Focus visibility | Various outline-none | Global `:focus-visible` + consistent focus ring on controls |
| Structured data | None | Organization + WebSite JSON-LD in root layout |

---

## 4. Compliance Level (WCAG 2.1 AA Readiness)

- **Perceivable:** Labels and sr-only text added for inputs; decorative icons marked `aria-hidden`; focus visible. **Improved.**
- **Operable:** Skip link; keyboard access for task rows (button or role="button" + Enter/Space); modals close with ESC; buttons have type and focus ring. **Improved.**
- **Understandable:** Dialogs have titles and semantics; form fields have names; links have meaningful targets. **Improved.**
- **Robust:** Semantic HTML (main, nav, aside); ARIA where needed (dialog, expanded, pressed); no reliance on div/span alone for critical actions. **Improved.**

**Remaining gaps (manual or design decisions):**
- **Focus trap in modals:** Focus is not formally trapped inside the dialog (e.g. Tab from last element does not wrap to first). Adding a full focus-trap utility would require identifying all focusable elements and handling Tab/Shift+Tab. **Recommendation:** Implement a small `useFocusTrap` hook or use a library (e.g. focus-trap-react) for strict WCAG modal behavior.
- **Color contrast:** Not automatically verified; theme variables (e.g. `--muted-foreground`, `--primary`) should be checked against background for 4.5:1 (text) and 3:1 (large text/UI). **Recommendation:** Run contrast checker (e.g. axe DevTools, WAVE) on key screens.
- **BreadcrumbList:** Not added; can be added on dashboard/project pages with dynamic breadcrumbs (e.g. Home > Today, Home > Project name) for better SEO and assistive tech.
- **Live regions:** No `aria-live` added for dynamic updates (e.g. "Task added"). If the app announces such events to screen readers, add `aria-live="polite"` (or `assertive`) on a region that updates when tasks are added/removed.

---

## 5. Manual Design Decisions

1. **Forgot password / Terms / Privacy:** Pointed to `/help` as a single destination until dedicated pages exist. If you add `/forgot-password`, `/terms`, `/privacy`, update the links and ensure those pages exist and are accessible.
2. **TaskCard outer control:** Used `div` with `role="button"` and `tabIndex={0}` instead of wrapping in `<button>` to avoid nested interactive content (inner checkbox is a real button). This follows ARIA authoring practices for composite widgets.
3. **JSON-LD URL:** Used `https://tickly.one`; if the app is deployed elsewhere, update the `@id` and `url` in the JSON-LD script in root layout.
4. **Focus trap:** Not implemented; recommended for full AA compliance for modals (see above).

All listed fixes have been applied in the codebase; no design or copy was changed beyond what was necessary for accessibility and structured data.
