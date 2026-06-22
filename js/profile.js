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
