# Admin Profile (Backlog 1–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the single OPS admin a topbar profile avatar + dropdown and an editable profile page, with data in Supabase Auth `user_metadata` and the avatar image in a new Storage bucket.

**Architecture:** OPS is a no-bundler static app — ordered global `<script>` tags sharing one scope, plus `admin.css` and `admin.html`. Add one module `js/profile.js` (loaded last) and small edits to `admin.html`, `admin.css`, `js/nav.js`. Profile fields read from the session `user` (passed to `showApp(user)`) and write via `sb.auth.updateUser({ data })`. The only DB-side change is a public `admin-avatars` Storage bucket.

**Tech Stack:** Vanilla JS (global classic scripts), Supabase JS v2 (auth + storage), plain CSS. Spec: `docs/superpowers/specs/2026-06-22-admin-profile-design.md`.

## Global Constraints

- **No bundler / global scripts:** new code lives in `js/profile.js`, added as the **last** `<script src>` in `admin.html`.
- **`'use strict'` in every module → NO duplicate top-level declarations** (a duplicate `function`/`const` at module scope is a fatal parse error).
- **No top-level cross-module calls:** a function from a later-loaded module isn't defined during an earlier module's top-level run. The profile bootstrap runs **inside `showApp(user)`** (fires post-`DOMContentLoaded`). Top-level `addEventListener` calls in `profile.js` are fine because `profile.js` is the last script (its target elements already exist) and the callbacks run later.
- **No test framework in this project.** Verification is `node --check <file>` (catches the parse/strict-mode class of bug) plus a manual live pass on the admin's localhost. Do **not** add a test harness — match the existing codebase and how today's fixes were verified.
- **Reuse primitives:** `esc`, `toast`, `switchPage`, `$`, `sb`; mirror `clientAvatar`/`clientInitials` and the `uploadClientLogo` Storage pattern; reuse CSS classes `.modal-field`, `.btn-add`, `.btn-ghost`, `.card`.
- **Copy/values:** role fallback `Administrator`; company default `Oak & Pixel Studio`; email is **read-only**; dropdown is **View Profile + Sign Out** (no Settings).
- **Aesthetic:** dark-first; sharp corners; CSS vars `--card`, `--border`, `--border-hi`, `--em-dim`, `--emerald-l`, `--gold`, `--mist`, `--off-white`, `--err`, fonts `--font-b`/`--font-m`. Provide `[data-theme="light"]` overrides for new surfaces.

---

## File Structure

- **Create** `migrations/015_admin_avatars_bucket.sql` — public bucket + `storage.objects` policies.
- **Create** `js/profile.js` — all profile state, helpers, renders, save, avatar upload; `'use strict'`.
- **Modify** `admin.html` — sidebar footer avatar; topbar-right (theme-toggle + profile); `#page-profile` section; `<script src="js/profile.js">` last.
- **Modify** `admin.css` — `.admin-avatar`, topbar/profile-menu, profile-page styles + light overrides.
- **Modify** `js/nav.js` — `loadAdminProfile(user)` in `showApp`; `PAGE_TITLES.profile`; `switchPage` hook.

---

### Task 1: `admin-avatars` Storage bucket migration

**Files:**
- Create: `migrations/015_admin_avatars_bucket.sql`

**Interfaces:**
- Produces: public Storage bucket `admin-avatars` (consumed by Task 5's `uploadAdminAvatar`).

- [ ] **Step 1: Write the migration**

`migrations/015_admin_avatars_bucket.sql`:
```sql
-- Public bucket for the admin profile avatar image (backlog items 1-2).
insert into storage.buckets (id, name, public)
values ('admin-avatars', 'admin-avatars', true)
on conflict (id) do nothing;

create policy "admin-avatars public read"
  on storage.objects for select
  using (bucket_id = 'admin-avatars');

create policy "admin-avatars authenticated insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'admin-avatars');

create policy "admin-avatars authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'admin-avatars');

create policy "admin-avatars authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'admin-avatars');
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP `apply_migration` (project `wdbsmcxzhmdkfjoftulm`, name `admin_avatars_bucket`, the SQL above). If a policy already exists from a prior run, drop it first or treat "already exists" as success.

- [ ] **Step 3: Verify the bucket exists**

Run via Supabase MCP `execute_sql` (project `wdbsmcxzhmdkfjoftulm`):
```sql
select id, public from storage.buckets where id = 'admin-avatars';
```
Expected: one row, `public = true`.

- [ ] **Step 4: Commit**

```bash
git add migrations/015_admin_avatars_bucket.sql
git commit -m "feat(profile): add admin-avatars storage bucket migration"
```

---

### Task 2: Profile module foundation + sidebar identity

Creates `js/profile.js` with state, avatar helpers, and `loadAdminProfile`; wires it into `showApp`; updates the sidebar footer to show the real avatar + name + role. After this task, signing in shows the admin's name/role/initials in the sidebar.

**Files:**
- Create: `js/profile.js`
- Modify: `admin.html` (sidebar footer `user-row`; add script tag)
- Modify: `admin.css` (add `.admin-avatar`)
- Modify: `js/nav.js` (`showApp` calls `loadAdminProfile(user)`)

**Interfaces:**
- Consumes: globals `esc`, `$`, `sb` (core.js); `showApp(user)` (nav.js).
- Produces: `let adminProfile`; `loadAdminProfile(user)`; `adminInitials(p)`; `adminAvatarInner(p)`; `adminAvatar(p, size)`; `adminProfileName(p)`; `adminProfileRole(p)`; `renderSidebarIdentity()`; const `ADMIN_PROFILE_DEFAULTS`.

- [ ] **Step 1: Create `js/profile.js` with state + helpers + sidebar render**

`js/profile.js`:
```javascript
'use strict';

/* Admin profile — backlog items 1-2.
   Profile fields live in Supabase Auth user_metadata; the avatar image lives in
   the admin-avatars Storage bucket. This module is the LAST script loaded.
   loadAdminProfile() is called from showApp(user) (post-DOMContentLoaded),
   never at module top level. */

let adminProfile = null;
const ADMIN_PROFILE_DEFAULTS = { role: 'Administrator', company_name: 'Oak & Pixel Studio' };

function loadAdminProfile(user) {
  const meta = user?.user_metadata || {};
  adminProfile = {
    email:        user?.email || '',
    full_name:    meta.full_name || '',
    role:         meta.role || '',
    phone:        meta.phone || '',
    company_name: meta.company_name || '',
    bio:          meta.bio || '',
    avatar_url:   meta.avatar_url || ''
  };
  renderSidebarIdentity();
}

function adminProfileName(p = adminProfile || {}) {
  return p.full_name || p.email || 'Admin';
}
function adminProfileRole(p = adminProfile || {}) {
  return p.role || ADMIN_PROFILE_DEFAULTS.role;
}

function adminInitials(p = adminProfile || {}) {
  const name = adminProfileName(p);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function adminAvatarInner(p = adminProfile || {}) {
  return p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="">` : esc(adminInitials(p));
}
function adminAvatar(p = adminProfile || {}, size = '') {
  return `<div class="admin-avatar${size ? ' ' + size : ''}">${adminAvatarInner(p)}</div>`;
}

function renderSidebarIdentity() {
  if (!adminProfile) return;
  const slot = $('sidebar-avatar');
  if (slot) slot.innerHTML = adminAvatarInner();
  const nameEl = $('user-email-sm');
  if (nameEl) nameEl.textContent = adminProfileName();
  const roleEl = $('user-role-sm');
  if (roleEl) roleEl.textContent = adminProfileRole();
}
```

- [ ] **Step 2: Update the sidebar footer markup in `admin.html`**

Replace the `user-row` block (currently the static `<img class="user-avatar-logo">` + email + hardcoded "Administrator"):
```html
      <div class="user-row">
        <img src="images/oak-pixel-mark-hires-transparent.png" class="user-avatar-logo" alt="OPS">
        <div style="overflow:hidden">
          <div class="user-email-sm" id="user-email-sm">—</div>
          <div class="user-role-sm">Administrator</div>
        </div>
      </div>
```
with:
```html
      <div class="user-row">
        <span class="admin-avatar sm" id="sidebar-avatar"></span>
        <div style="overflow:hidden">
          <div class="user-email-sm" id="user-email-sm">—</div>
          <div class="user-role-sm" id="user-role-sm">Administrator</div>
        </div>
      </div>
```

- [ ] **Step 3: Add the profile script tag in `admin.html`**

Immediately after the `<script src="js/reports.js"></script>` line, add:
```html
<script src="js/profile.js"></script>
```

- [ ] **Step 4: Add `.admin-avatar` styles in `admin.css`**

Add near the `.client-avatar` rule:
```css
.admin-avatar{width:38px;height:38px;border:1px solid var(--border-hi);background:var(--em-dim);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;font-family:var(--font-m);font-size:.72rem;letter-spacing:.08em;color:var(--emerald-l);text-transform:uppercase;}
.admin-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.admin-avatar.sm{width:30px;height:30px;font-size:.6rem;}
.admin-avatar.lg{width:84px;height:84px;font-size:1.25rem;}
```

- [ ] **Step 5: Call `loadAdminProfile` from `showApp` in `js/nav.js`**

In `showApp(user)`, replace this line:
```javascript
  $('user-email-sm').textContent = user?.email || '';
```
with:
```javascript
  loadAdminProfile(user);
```

- [ ] **Step 6: Verify (syntax)**

Run from the project root:
```bash
node --check js/profile.js && node --check js/nav.js && echo OK
```
Expected: `OK` (no parse errors).

- [ ] **Step 7: Verify (manual, admin's localhost)**

Reload localhost, sign in. Expected: sidebar footer shows a 2-letter initials avatar, the admin's name (or email if no name set yet), and "Administrator". No console errors on load or after login.

- [ ] **Step 8: Commit**

```bash
git add js/profile.js admin.html admin.css js/nav.js
git commit -m "feat(profile): profile module + sidebar identity from auth metadata"
```

---

### Task 3: Topbar profile avatar + dropdown

Adds the topbar avatar trigger and the dropdown (header + View Profile + Sign Out), and makes `loadAdminProfile` also render the menu.

**Files:**
- Modify: `js/profile.js` (add `renderProfileMenu`, `toggleProfileMenu`, wiring; call `renderProfileMenu()` from `loadAdminProfile`)
- Modify: `admin.html` (topbar-right wrapper)
- Modify: `admin.css` (topbar-right + profile-menu styles + light overrides)

**Interfaces:**
- Consumes: `adminProfile`, `adminAvatar`, `adminAvatarInner`, `adminProfileName`, `adminProfileRole` (Task 2); `switchPage` (nav.js); `sb` (core.js).
- Produces: `renderProfileMenu()`; `toggleProfileMenu(force)`.

- [ ] **Step 1: Replace the topbar theme-toggle with a topbar-right cluster in `admin.html`**

Replace:
```html
      <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
        <svg id="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"></svg>
      </button>
```
with:
```html
      <div class="topbar-right">
        <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
          <svg id="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"></svg>
        </button>
        <div class="profile-menu-wrap">
          <button class="profile-trigger" id="profile-trigger" type="button" aria-haspopup="true" aria-expanded="false" title="Account">
            <span class="admin-avatar sm" id="topbar-avatar"></span>
          </button>
          <div class="profile-menu" id="profile-menu" hidden></div>
        </div>
      </div>
```

- [ ] **Step 2: Add `renderProfileMenu` + `toggleProfileMenu` + wiring to `js/profile.js`**

Append to `js/profile.js`:
```javascript
function renderProfileMenu() {
  const av = $('topbar-avatar');
  if (av) av.innerHTML = adminAvatarInner();
  const menu = $('profile-menu');
  if (!menu || !adminProfile) return;
  menu.innerHTML = `
    <div class="profile-menu-head">
      ${adminAvatar(adminProfile, 'sm')}
      <div class="profile-menu-id">
        <div class="profile-menu-name">${esc(adminProfileName())}</div>
        <div class="profile-menu-role">${esc(adminProfileRole())}</div>
        <div class="profile-menu-email">${esc(adminProfile.email)}</div>
      </div>
    </div>
    <button class="profile-menu-item" type="button" data-action="view-profile">View Profile</button>
    <div class="profile-menu-sep"></div>
    <button class="profile-menu-item danger" type="button" data-action="sign-out">Sign Out</button>`;
}

function toggleProfileMenu(force) {
  const menu = $('profile-menu');
  const trigger = $('profile-trigger');
  if (!menu || !trigger) return;
  const open = force === undefined ? menu.hasAttribute('hidden') : force;
  if (open) { menu.removeAttribute('hidden'); trigger.setAttribute('aria-expanded', 'true'); }
  else { menu.setAttribute('hidden', ''); trigger.setAttribute('aria-expanded', 'false'); }
}

$('profile-trigger')?.addEventListener('click', e => { e.stopPropagation(); toggleProfileMenu(); });
$('profile-menu')?.addEventListener('click', e => {
  const btn = e.target.closest('.profile-menu-item');
  if (!btn) return;
  toggleProfileMenu(false);
  if (btn.dataset.action === 'view-profile') switchPage('profile');
  else if (btn.dataset.action === 'sign-out') sb.auth.signOut();
});
document.addEventListener('click', e => { if (!e.target.closest('.profile-menu-wrap')) toggleProfileMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleProfileMenu(false); });
```

- [ ] **Step 3: Make `loadAdminProfile` also render the menu**

In `loadAdminProfile()` (Task 2), add `renderProfileMenu();` right after `renderSidebarIdentity();`:
```javascript
  renderSidebarIdentity();
  renderProfileMenu();
}
```

- [ ] **Step 4: Add topbar/profile-menu styles to `admin.css`**

```css
.topbar-right{display:flex;align-items:center;gap:.7rem;}
.profile-menu-wrap{position:relative;}
.profile-trigger{width:34px;height:34px;padding:0;background:none;border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;overflow:hidden;transition:border-color .2s;}
.profile-trigger:hover{border-color:var(--gold);}
.profile-trigger .admin-avatar{width:100%;height:100%;border:none;background:var(--em-dim);}
.profile-menu{position:absolute;right:0;top:calc(100% + .5rem);min-width:230px;background:var(--card);border:1px solid var(--border-hi);box-shadow:0 12px 32px rgba(0,0,0,.4);z-index:60;padding:.4rem;}
.profile-menu[hidden]{display:none;}
.profile-menu-head{display:flex;gap:.6rem;align-items:center;padding:.6rem .6rem .7rem;border-bottom:1px solid var(--border);margin-bottom:.35rem;}
.profile-menu-id{min-width:0;}
.profile-menu-name{font-size:.85rem;color:var(--off-white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.profile-menu-role{font-family:var(--font-m);font-size:.55rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-top:.12rem;}
.profile-menu-email{font-family:var(--font-m);font-size:.6rem;color:var(--mist);margin-top:.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.profile-menu-item{display:block;width:100%;text-align:left;background:none;border:none;color:rgba(245,244,241,.75);font-family:var(--font-b);font-size:.82rem;padding:.55rem .6rem;transition:background .15s;}
.profile-menu-item:hover{background:rgba(245,244,241,.05);}
.profile-menu-item.danger{color:var(--err);}
.profile-menu-sep{height:1px;background:var(--border);margin:.35rem 0;}
[data-theme="light"] .profile-trigger{border-color:rgba(26,26,24,.12);}
[data-theme="light"] .profile-menu{background:#fff;border-color:rgba(26,26,24,.1);box-shadow:0 12px 32px rgba(0,0,0,.12);}
[data-theme="light"] .profile-menu-name{color:#1a1a18;}
[data-theme="light"] .profile-menu-item{color:rgba(26,26,24,.75);}
[data-theme="light"] .profile-menu-item:hover{background:rgba(26,26,24,.05);}
```

- [ ] **Step 5: Verify (syntax)**

```bash
node --check js/profile.js && echo OK
```
Expected: `OK`.

- [ ] **Step 6: Verify (manual)**

Sign in. Topbar (right of the theme toggle) shows the avatar. Click it → dropdown opens with header (avatar/name/role/email), "View Profile", and "Sign Out". Click outside or press Escape → closes. "Sign Out" returns to the login screen.

- [ ] **Step 7: Commit**

```bash
git add js/profile.js admin.html admin.css
git commit -m "feat(profile): topbar avatar + account dropdown"
```

---

### Task 4: Profile page (view, edit, save)

Adds the hidden `#page-profile` page reached from "View Profile", with an inline-editable form that saves to `user_metadata`.

**Files:**
- Modify: `admin.html` (`#page-profile` section)
- Modify: `admin.css` (profile-page styles)
- Modify: `js/nav.js` (`PAGE_TITLES.profile`; `switchPage` hook)
- Modify: `js/profile.js` (`renderProfilePage`, `saveAdminProfile`, save wiring)

**Interfaces:**
- Consumes: `adminProfile`, `adminAvatarInner`, `ADMIN_PROFILE_DEFAULTS`, `loadAdminProfile` (Tasks 2–3); `switchPage`, `PAGE_TITLES` (nav.js); `sb`, `toast` (core.js).
- Produces: `renderProfilePage()`; `saveAdminProfile()`.

- [ ] **Step 1: Add the `#page-profile` section in `admin.html`**

Add this section immediately after the `#page-reports` section's closing `</section>` (same nesting level as the other `.page` sections):
```html
      <!-- ══ PROFILE PAGE ══ -->
      <section class="page" id="page-profile">
        <div class="card profile-card">
          <div class="profile-head">
            <span class="admin-avatar lg" id="profile-avatar"></span>
            <div class="profile-photo-actions">
              <label class="btn-ghost" for="profile-avatar-file">Change Photo</label>
              <input id="profile-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
              <button class="btn-ghost" type="button" id="profile-avatar-remove">Remove</button>
            </div>
          </div>
          <div class="profile-form">
            <div class="modal-field"><label>Full Name</label><input id="pf-full-name" type="text"></div>
            <div class="modal-field"><label>Role / Title</label><input id="pf-role" type="text" placeholder="Administrator"></div>
            <div class="modal-field"><label>Email (login)</label><input id="pf-email" type="email" readonly></div>
            <div class="modal-field"><label>Phone</label><input id="pf-phone" type="tel"></div>
            <div class="modal-field"><label>Company</label><input id="pf-company" type="text"></div>
            <div class="modal-field full"><label>Bio</label><textarea id="pf-bio"></textarea></div>
          </div>
          <div class="profile-foot">
            <button class="btn-add" type="button" id="profile-save">Save Changes</button>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Register the page in `js/nav.js`**

In the `PAGE_TITLES` object, add a `profile` entry (e.g. after `reports:'Reports'`):
```javascript
reports:'Reports', profile:'My Profile' };
```
In `switchPage(name)`, alongside the other `if (name === ...)` render hooks, add:
```javascript
  if (name === 'profile') renderProfilePage();
```

- [ ] **Step 3: Add `renderProfilePage` + `saveAdminProfile` + wiring to `js/profile.js`**

Append to `js/profile.js`:
```javascript
function renderProfilePage() {
  if (!adminProfile) return;
  const av = $('profile-avatar');
  if (av) av.innerHTML = adminAvatarInner();
  const set = (id, v) => { const el = $(id); if (el) el.value = v; };
  set('pf-full-name', adminProfile.full_name);
  set('pf-role', adminProfile.role);
  set('pf-email', adminProfile.email);
  set('pf-phone', adminProfile.phone);
  set('pf-company', adminProfile.company_name || ADMIN_PROFILE_DEFAULTS.company_name);
  set('pf-bio', adminProfile.bio);
}

async function saveAdminProfile() {
  const btn = $('profile-save');
  const val = id => ($(id)?.value || '').trim();
  const data = {
    full_name:    val('pf-full-name'),
    role:         val('pf-role'),
    phone:        val('pf-phone'),
    company_name: val('pf-company'),
    bio:          val('pf-bio')
  };
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const { data: res, error } = await sb.auth.updateUser({ data });
  if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  if (error) { toast('Could not save profile. Try again.'); return; }
  loadAdminProfile(res.user);
  renderProfilePage();
  toast('Profile updated.');
}

$('profile-save')?.addEventListener('click', saveAdminProfile);
```

- [ ] **Step 4: Add profile-page styles to `admin.css`**

```css
.profile-card{max-width:680px;padding:1.75rem 2rem 2rem;}
.profile-head{display:flex;align-items:center;gap:1.25rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);margin-bottom:1.5rem;}
.profile-photo-actions{display:flex;gap:.5rem;align-items:center;}
.profile-photo-actions .btn-ghost{cursor:pointer;}
.profile-form{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.profile-foot{margin-top:1.5rem;display:flex;justify-content:flex-end;}
@media(max-width:600px){.profile-form{grid-template-columns:1fr;}}
```

- [ ] **Step 5: Verify (syntax)**

```bash
node --check js/profile.js && node --check js/nav.js && echo OK
```
Expected: `OK`.

- [ ] **Step 6: Verify (manual)**

Sign in → open dropdown → **View Profile** opens the profile page (title "My Profile"). Fields are pre-filled (email read-only, company defaults to "Oak & Pixel Studio"). Edit Full Name + Role, click **Save Changes** → toast "Profile updated.", and the topbar + sidebar update immediately. Reload the page and sign in again → the saved values persist.

- [ ] **Step 7: Commit**

```bash
git add admin.html admin.css js/nav.js js/profile.js
git commit -m "feat(profile): editable profile page saving to auth metadata"
```

---

### Task 5: Avatar upload + remove

Wires the profile page's Change Photo / Remove controls to Supabase Storage.

**Files:**
- Modify: `js/profile.js` (`uploadAdminAvatar`, `removeAdminAvatar`, wiring)

**Interfaces:**
- Consumes: `admin-avatars` bucket (Task 1); `adminProfile`, `loadAdminProfile`, `renderProfilePage` (Tasks 2–4); `sb`, `toast` (core.js).
- Produces: `uploadAdminAvatar()`; `removeAdminAvatar()`.

- [ ] **Step 1: Add upload/remove handlers to `js/profile.js`**

Append to `js/profile.js`:
```javascript
async function uploadAdminAvatar(file) {
  if (!file) return;
  const { data: sess } = await sb.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) { toast('Sign in again to update your photo.'); return; }
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from('admin-avatars').upload(path, file, { upsert: true });
  if (upErr) { toast('Photo upload failed. Create the admin-avatars storage bucket first.'); return; }
  const { data: pub } = sb.storage.from('admin-avatars').getPublicUrl(path);
  const { data: res, error } = await sb.auth.updateUser({ data: { avatar_url: pub.publicUrl } });
  if (error) { toast('Photo uploaded, but profile update failed.'); return; }
  loadAdminProfile(res.user);
  renderProfilePage();
  toast('Profile photo updated.');
}

async function removeAdminAvatar() {
  const { data: res, error } = await sb.auth.updateUser({ data: { avatar_url: null } });
  if (error) { toast('Could not remove photo.'); return; }
  loadAdminProfile(res.user);
  renderProfilePage();
  toast('Profile photo removed.');
}

$('profile-avatar-file')?.addEventListener('change', e => {
  const file = e.target.files?.[0];
  uploadAdminAvatar(file);
  e.target.value = '';
});
$('profile-avatar-remove')?.addEventListener('click', removeAdminAvatar);
```

- [ ] **Step 2: Verify (syntax)**

```bash
node --check js/profile.js && echo OK
```
Expected: `OK`.

- [ ] **Step 3: Verify (manual)**

On the profile page, **Change Photo** → pick an image → it appears in the large avatar, the topbar avatar, and the sidebar avatar; persists across reload. **Remove** → reverts to initials everywhere. If the bucket were missing, a toast appears and nothing crashes.

- [ ] **Step 4: Commit**

```bash
git add js/profile.js
git commit -m "feat(profile): avatar upload + remove via admin-avatars bucket"
```

---

## Notes for the implementer

- After all tasks, do a full `node --check js/*.js` to confirm no module regressed, then push (`git push origin main`) so Vercel redeploys — but the admin can also test immediately on localhost since it serves these files directly.
- Keep `js/profile.js` additions in one file; never duplicate a top-level `function`/`const` name (strict mode = fatal parse error).
