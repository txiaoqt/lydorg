# Pasig budget map data sources

## Barangay polygon geometry

- Source: [Philippine Administrative Boundaries, Barangay layer](https://services7.arcgis.com/poQdgvLD6DHnbpsT/ArcGIS/rest/services/Philippine_Administrative_Boundaries/FeatureServer/3)
- Retrieved: 2026-09-30
- Query: Pasig city rows, GeoJSON, WGS84 coordinates.
- Coverage check: 31 polygon parts with 30 unique names, matching every entry in `CANONICAL_PASIG_BARANGAYS`. Kalawaan has two separate polygon parts; both are retained and share one budget aggregate.
- The source layer states that its nationwide barangay boundaries are not official. Use this map for budget visualization only; Pasig City GIS remains the authority for boundary decisions.
