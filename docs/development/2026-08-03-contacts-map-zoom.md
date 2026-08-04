# Contacts Page Interactive Map Zoom Enhancement

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Public Contacts Page Interactive Map (`Contacts.tsx`)
- **Primary Objective**: Enable user-controlled zoom functionality (native `+` / `-` controls, mouse wheel scroll zoom, and touch pinch zoom) on the embedded PCYDO office location map without altering layout, location coordinates, marker popup, or container dimensions.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/public-pages`

---

## Task & Reason for Enhancement

Visitors browsing the public Contacts page (`/contacts`) need to inspect the PCYDO office location at the 3/F Temporary Pasig City Hall in Brgy. Rosario, Pasig City.

Previously, `<MapContainer>` explicitly disabled zoom controls (`zoomControl={false}`) and scroll wheel zoom (`scrollWheelZoom={false}`). This restricted visitors to a fixed zoom level (16) without the ability to zoom out for broader city context or zoom in for detailed street views.

---

## Technical Implementation

In `src/pages/Contacts.tsx`, updated the `react-leaflet` `<MapContainer>` configuration:

```tsx
// src/pages/Contacts.tsx
<MapContainer
  center={COORDS}
  zoom={16}
  scrollWheelZoom={true}
  zoomControl={true}
  style={{ height: "100%", width: "100%" }}
>
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
  <Marker position={COORDS}>
    <Popup>
      <strong>PCYDO Office</strong>
      <br />
      {address}
    </Popup>
  </Marker>
</MapContainer>
```

### Key Changes
1. **`zoomControl={true}`**: Renders native Leaflet `+` and `-` zoom buttons on the map.
2. **`scrollWheelZoom={true}`**: Enables desktop scroll wheel zooming for intuitive navigation.
3. **Preserved Map State**: Retained exact coordinates (`[14.592421073182033, 121.08615468030744]`), OpenStreetMap tile layer, office address popup, rounded container styling, and responsive height (`h-[200px] sm:h-[282px]`).

---

## UX Improvements

- **Interactive Zooming**: Users can zoom in and out using mouse scroll, touch pinch gestures, or native Leaflet UI controls.
- **Preserved Design**: Container dimensions, border radius, shadow, and surrounding office contact info remain 100% consistent with design tokens.
- **Accessibility**: Native `+` / `-` buttons provide keyboard and screen-reader accessible map controls.

---

## Files Modified

| File Path | Component | Summary of Changes |
| :--- | :--- | :--- |
| `src/pages/Contacts.tsx` | `Contacts` | Updated `<MapContainer>` to enable `zoomControl` and `scrollWheelZoom`. |

---

## Verification & Testing Performed

- **TypeScript Type Check**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` executed cleanly in 52.41s with 0 errors.
- **Automated Test Suite**: `npm test` passed with `23/23 test files` and `92/92 unit tests`.
- **Git Branch Workflow**: Executed on `feature/public-pages`.
