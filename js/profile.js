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
  renderProfileMenu();
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
  // <span> (not <div>) so the element is valid in any context — the avatar
  // slots in admin.html are <span>, and .admin-avatar sets display:flex regardless.
  return `<span class="admin-avatar${size ? ' ' + size : ''}">${adminAvatarInner(p)}</span>`;
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
