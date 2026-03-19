Equipment Tree Viewer - Modular Rev 1

What changed:
- Buildings are defined in data/buildings.json
- Right-panel metadata is defined in data/equipment.json
- Each building uses its own SVG file in the svg/ folder
- The site code is separated into index.html, assets/style.css, and assets/app.js

Important:
Open this site through a small local web server.
Do not double-click index.html directly, because browsers often block loading local JSON/SVG files.

Windows quick start:
1. Open this folder in File Explorer.
2. Double-click start_server.bat
3. Open http://localhost:8000 in your browser.

How to add a new building:
1. Export a new SVG from draw.io into the svg/ folder.
2. Add a new row to data/buildings.json:
   {
     "id": "building_4",
     "name": "Building 4",
     "svg": "svg/Building_4.drawio.svg"
   }
3. Refresh the page.

How to add or update item details:
1. Click an item in the viewer.
2. Copy the data key shown in the right panel.
3. Add or edit that key in data/equipment.json.

Notes:
- If two items in the same building have the exact same visible label, they will share the same metadata key.
- To make them unique, rename them in draw.io before exporting SVG.
