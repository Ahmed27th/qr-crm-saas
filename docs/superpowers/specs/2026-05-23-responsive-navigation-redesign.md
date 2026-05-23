# Responsive Navigation Redesign

## Goal
Improve dashboard navigation for phone and tablet dimensions — efficient, good structure, no tooltip dependency.

## Changes

### Phone (≤640px)
- Bottom tab bar shows only 5 primary allowed items + "More" button
- Primary items: Overview, Orders, Menu, Reviews, QR (locked items skip)
- "More" opens bottom sheet with all nav items grouped (Opérations, Équipe, Contenu) + Settings/Logout at footer
- Header height reduced to 56px, search bar hidden
- Burger menu retained as fallback

### Tablet (641-1024px)
- Sidebar widened to 160px with compact labels always visible
- Smaller brand, tighter spacing, group labels visible
- No tooltip hover dependency — works on touch

### Desktop (>1024px)
- Unchanged

## Files
- `src/pages/Dashboard.tsx` — add `moreSheetOpen` state, `PRIMARY_NAV_IDS`, `nav-item--primary` class, mobile-more-btn, bottom sheet markup
- `src/pages/Dashboard.css` — restructure tablet breakpoint, hide non-primary items on phone, add bottom sheet styles
