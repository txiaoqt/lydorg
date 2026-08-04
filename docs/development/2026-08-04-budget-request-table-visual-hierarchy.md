# Budget Request Table Visual Hierarchy

## Overview

- **Date**: August 4, 2026
- **Feature / Component**: Desktop Budget Requests table (`src/user/UserPortal.tsx`)
- **Objective**: Refine the table's visual hierarchy without changing budget-request behavior, data, routing, or responsive layout.
- **Branch**: `feature/budget-request`

## UI Refinements

- Kept the rounded, bordered desktop table container and gave it a clean white surface.
- Set the table header to the subtle `#F8FAFC` background.
- Applied zebra striping to the body: white default rows with `#FAFBFD` on alternating rows.
- Used a light `#EFF6FF` hover tint that preserves all row dimensions and content positioning.
- Retained understated row dividers with a low-contrast slate border.

## Regression Scope

This update is limited to presentational Tailwind classes in the desktop Budget Requests table. Sorting, filtering, pagination, interactions, data flow, routing, typography, spacing, and responsive behavior are unchanged.

## Required Verification

Run before pushing:

1. `npm run build`
2. `npx tsc --noEmit`
3. `npm test`
