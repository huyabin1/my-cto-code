# Helper Utilities

Auxiliary helpers for Three.js features should be implemented here.

## CAD overlay lifecycle

The `CADOverlayBuilder` is responsible for translating normalized DXF polyline data
into renderable Three.js primitives. The expected lifecycle for overlay data is:

1. DXF content is parsed elsewhere into normalized polylines grouped by layer.
2. The Vuex `cad` module stores those polylines (`overlayPolylines`) together
   with layer visibility, colors, and the current overlay opacity.
3. `ThreeScene` invokes `CADOverlayBuilder.build` once per dataset to create the
   `THREE.Group` named `CADOverlay` and keeps a reference to that group.
4. Subsequent UI updates (opacity, layer visibility, unit changes) call the
   builder's helper methods to mutate the existing materials or group state
   without rebuilding geometry.
5. When a new DXF import occurs, the old group is disposed and a fresh build is
   triggered using the cached normalized polylines.

This design ensures that future features can extend the overlay (e.g. snapping,
measurement, highlighting) while avoiding unnecessary re-parsing or geometry
allocation work.
