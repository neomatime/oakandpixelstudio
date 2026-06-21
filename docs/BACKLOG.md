# OPS Command Center — Product Backlog

Future enhancement tasks captured for later prioritisation.
None of these items are in the current development cycle.

---

## 1. Admin Profile Area

**Summary:** Add an admin profile image/icon to the top-right corner of the topbar.

**Intended behaviour:**
- Clicking the profile image opens a dropdown with: View Profile, Settings, Sign Out
- Replaces or sits alongside the current theme toggle in the topbar

**Design notes:** Should feel premium and subtle — consistent with the existing OPS aesthetic. Small avatar, minimal dropdown.

---

## 2. Admin Profile Page

**Summary:** Create an Admin Profile page, accessible from the profile dropdown.

**Fields:**
- Profile image
- Full name
- Role / title
- Email address
- Phone number
- Company name
- Bio / short profile description

**Notes:** Profile image changes should eventually reflect across the system (sidebar initials, activity feed, etc.). Not a main sidebar item.

---

## 3. Client Messaging / Email Module

**Summary:** A lightweight client communication layer built into OPS — not a full inbox.

**Capability:**
- Select a client
- Compose a message with subject line and body
- Send the message
- View sent messages
- View message history per client

**Notes:** Tied to client profiles. The goal is simple, tracked communication — not a replacement for a mail client.

---

## 4. Client Communication History

**Summary:** A communication history section inside each client profile.

**Each record shows:**
- Date sent
- Subject
- Message preview
- Status: `Draft` / `Sent` / `Failed`

**Notes:** Feeds from the messaging module above. Should appear as a collapsible or tabbed section within the existing client profile layout.

---

## 5. Notification Bell

**Summary:** A notification bell in the top-right navigation area, near the admin profile icon.

**Capability:**
- Shows unread notification count as a badge
- Clicking opens a notification dropdown or slide-out panel

**Notification types (future):**
- New application received
- Quote accepted
- Invoice overdue
- Retainer payment due
- Client document uploaded
- Project task due
- Message sent / failed

---

## 6. Notification Management

**Summary:** Basic controls for managing notifications inside the bell panel.

**Capability:**
- Mark a single notification as read
- Mark all as read
- Click a notification to navigate to the related record

**Notes:** Keep the experience calm. Avoid noise — only surface what needs attention.

---

## 7. System-Generated Notification Events

**Summary:** Define the internal events that trigger notifications (pairs with items 5 and 6).

**Events:**
- New client application submitted
- Message sent successfully / failed
- Quote status changed
- Invoice overdue
- Retainer payment due
- Project task approaching due date

---

## 8. Settings Page

**Summary:** A Settings page accessible via the profile dropdown only. Not a main sidebar item.

**Sections:**

### Profile Settings
- Admin name, profile image, email, phone, role/title

### Business Settings
- Studio name, studio email, studio phone, website URL, business address

### Document Settings
- Default quote validity period
- Default invoice payment terms
- Default retainer billing day
- Document numbering prefixes (e.g. `OPS-Q`, `OPS-INV`, `OPS-PROP`, `OPS-SOW`)

### Notification Settings
- Per-category toggles: Applications, Quotes, Invoices, Retainers, Projects, Messages, Documents

---

## Product Rule

OPS Command Center should remain focused, lightweight, and premium.
These tasks are documented for future prioritisation — not for the current cycle.
