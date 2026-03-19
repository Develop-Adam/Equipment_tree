Equipment Tree Viewer - Rev 1.1 (ID-based mapping)

What changed:
- Equipment metadata is now keyed by SVG element ID instead of visible text.
- This makes the app stable even if you rename labels in draw.io.
- Right panel shows both the visible label and the SVG ID for the clicked node.

How to run:
1. Double-click start_server.bat
2. Open http://localhost:8000 in your browser

How to add a building:
1. Export a new SVG into the svg folder.
2. Add one row to data/buildings.json.
3. Refresh the page.

How to add equipment metadata:
1. Click a node in the app.
2. Copy the shown Data key or SVG ID.
3. Add/update that key in data/equipment.json.

Key format:
  building_id::svg_element_id
Example:
  building_2::qB1-vgkHPpZSQpjzEzUW-9

Important note:
- You can safely change visible text labels in draw.io now.
- If draw.io regenerates new element IDs during a major redraw, update the corresponding entries in data/equipment.json.
