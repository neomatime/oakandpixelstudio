# Admin Profile (Backlog items 1–2) — Design Spec

**Date:** 2026-06-22
**Status:** Approved (pending spec review)
**Scope:** Backlog item 1 (Admin Profile Area) + item 2 (Admin Profile Page). Items 3–8 are out of scope.

## Goal

Give the single OPS admin a real identity in the UI: a profile avatar + dropdown in the topbar, and an editable profile page (name, role, phone, company, bio, avatar). Profile data is stored in the Supabase Auth user's `user_metadata` — no new application table.

## Architecture

OPS is a no-bundler static app: ordered global `<script>` tags sharing one global scope, plus `admin.css` and `admin.html`. This feature adds one module, `js/profile.js`, loaded last, plus small edits to `admin.html`, `admin.css`, and `js/nav.js`. The only database-side change is creating a public Storage bucket for avatar images.

## Global Constraints

- **No bundler:** plain `<script src>` tags in load order; modules share global scope.
- **`'use strict'` in every module:** therefore **no duplicate top-level declarations** (a duplicate `function`/`const` at module scope is a fatal parse error — this caused a login outage on 2026-06-22).
- **Bootstrap/cross-module calls only after `DOMContentLoaded`:** a function defined in a later-loaded module is not a defined global during an earlier module's top-level execution. The profile bootstrap therefore runs **inside `showApp(user)`** (which fires on the auth-state change, well after `DOMContentLoaded`), never at module top level.
- **Match the OPS aesthetic:** premium, subtle, dark-first; reuse existing primitives — `esc`, `toast`, `showModal`/`closeModal`, the `clientAvatar`/`clientInitials` pattern, and the `uploadClientLogo` Storage pattern.
- Single admin only (`admin@oakandpixel.co.za`); no multi-user/RLS-per-user requirements.

---

## Data model

Profile fields live in Supabase Auth `user_metadata`, written with `sb.auth.updateUser({ data: {...} })` and read from the session `user` (the argument already passed to `showApp(user)`).

| Field | metadata key | Notes |
|---|---|---|
| Full name | `full_name` | |
| Role / title | `role` | display fallback: "Administrator" |
| Phone | `phone` | |
| Company | `company_name` | default value "Oak & Pixel Studio" when unset |
| Bio | `bio` | textarea |
| Avatar URL | `avatar_url` | public URL of the uploaded image (or null) |
| Email | — (auth `user.email`) | **read-only** in this iteration |

**Email is read-only.** It is the login email; changing it requires a Supabase re-confirmation flow, which is out of scope. The profile page displays it but does not edit it.

### Avatar image storage

- New **public** Storage bucket `admin-avatars`.
- Upload path: `${user.id}/${Date.now()}.${ext}` (mirrors `uploadClientLogo`).
- Flow: upload file → `getPublicUrl` → `updateUser({ data: { avatar_url } })`.
- Created via a migration that mirrors the existing `client-logos` bucket setup:
  - insert the bucket row with `public = true`;
  - policies on `storage.objects` scoped to `bucket_id = 'admin-avatars'`: public `SELECT`; `INSERT`/`UPDATE`/`DELETE` for the `authenticated` role.
- Graceful failure: if the bucket is missing, upload shows a toast ("Create the admin-avatars storage bucket first.") and does not crash — same pattern as `uploadClientLogo`.

### Shared module state

`js/profile.js` holds `let adminProfile = null;`. `loadAdminProfile(user)` sets it from `{ email: user.email, full_name, role, phone, company_name, bio, avatar_url }` (metadata merged over defaults), then triggers the renders below.

---

## Component A — Topbar profile avatar + dropdown

### Markup (admin.html)

The topbar-right currently holds only `#theme-toggle`. Wrap it:

```html
<div class="topbar-right">
  <button class="theme-toggle" id="theme-toggle" title="Toggle theme">…</button>
  <div class="profile-menu-wrap">
    <button class="profile-trigger" id="profile-trigger" type="button"
            aria-haspopup="true" aria-expanded="false" title="Account">
      <span class="admin-avatar sm" id="topbar-avatar"></span>
    </button>
    <div class="profile-menu" id="profile-menu" hidden></div>
  </div>
</div>
```

### Behaviour (profile.js)

- `renderProfileMenu()` fills `#topbar-avatar` (via `adminAvatar`) and `#profile-menu`:
  - header: avatar + `full_name` (fallback email) + `role` (fallback "Administrator") + email;
  - **View Profile** → `switchPage('profile')` then close menu;
  - divider;
  - **Sign Out** → `sb.auth.signOut()`.
- Toggle open/close on `#profile-trigger` click; keep `aria-expanded` in sync; toggle the `hidden` attribute (or an `.open` class).
- Close on outside click and on Escape.
- **Settings entry is intentionally omitted** until backlog item 8 is built.

---

## Component B — Profile page (`page-profile`)

A hidden page like `client-profile` — reachable only from the dropdown, **not** a sidebar nav item.

- Add `<section class="page" id="page-profile">` to `.page-content` in `admin.html`.
- `PAGE_TITLES.profile = 'My Profile'` (nav.js).
- `switchPage` gains: `if (name === 'profile') renderProfilePage();`.
- Layout (`renderProfilePage()` populates it):
  - a card with the **large avatar** plus **Change photo** (file input → `uploadAdminAvatar()`) and **Remove** (`removeAdminAvatar()`);
  - an **inline-editable** form: Full name, Role / title, Email (read-only), Phone, Company, Bio (textarea);
  - a **Save Changes** button → `saveAdminProfile()`.
- `saveAdminProfile()`: collect field values → `await sb.auth.updateUser({ data: {...} })`. On success: refresh `adminProfile` from the response, re-render menu + sidebar + page, `toast('Profile updated.')`. On error: `toast(...)`, leave the user's edits on screen.

### Avatar helpers (mirror clients.js)

```js
function adminInitials(p = adminProfile || {}) {
  const name = p.full_name || p.email || 'Admin';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}
function adminAvatar(p = adminProfile || {}, size = '') {
  const cls = `admin-avatar${size ? ' ' + size : ''}`;
  return `<div class="${cls}">${p.avatar_url
    ? `<img src="${esc(p.avatar_url)}" alt="">`
    : esc(adminInitials(p))}</div>`;
}
```

---

## Cross-app propagation (this iteration)

The sidebar footer `user-row` (`admin.html`) currently renders a static OPS logo, `#user-email-sm`, and a hardcoded "Administrator". `renderSidebarIdentity()` updates it to the real **avatar + name (fallback email) + role**.

Deferred (item 2 says "eventually" — YAGNI now): activity-feed avatars and any other initials surfaces.

---

## Files touched

- **New `js/profile.js`** — `adminProfile` state; `loadAdminProfile(user)`; `adminInitials`/`adminAvatar`; `renderProfileMenu`, `renderSidebarIdentity`, `renderProfilePage`; `saveAdminProfile`, `uploadAdminAvatar`, `removeAdminAvatar`; dropdown open/close + outside-click/Escape handlers. `'use strict'`; no duplicate decls; no top-level cross-module calls.
- **`admin.html`** — topbar-right wrapper with avatar trigger + menu; `page-profile` section; `<script src="js/profile.js">` as the **last** module script.
- **`admin.css`** — `.topbar-right`, `.profile-menu-wrap`, `.profile-trigger`, `.profile-menu`, `.admin-avatar` (+ `sm`/`lg`), profile-page card/form styles.
- **`js/nav.js`** — `PAGE_TITLES.profile`; in `showApp(user)` call `loadAdminProfile(user)`; `switchPage` hook for `profile`.
- **Migration** — `migrations/015_admin_avatars_bucket.sql`: create `admin-avatars` public bucket + `storage.objects` policies.

## Error handling

- Avatar upload failure (bucket missing / network) → toast, no crash.
- `updateUser` failure → toast; keep on-screen edits.
- Missing/empty metadata → fall back to email-derived name and initials; role → "Administrator"; company → "Oak & Pixel Studio".

## Verification

- `node --check js/profile.js` (and any edited module) — must pass.
- Live pass on the admin's localhost: sign in → topbar avatar shows initials → open dropdown (header + View Profile + Sign Out) → open profile page → edit fields + Save (persists across reload) → upload avatar (shows in topbar + sidebar + page) → Remove avatar → Sign Out. (Live test is the admin's; Claude cannot enter credentials.)

## Out of scope

- Editing the login email.
- Settings page (item 8), notifications (items 5–7), messaging (items 3–4).
- Activity-feed / global initials propagation beyond the sidebar.
- Multi-admin support, per-user RLS.
