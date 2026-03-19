const state = {
  buildings: [],
  equipment: {},
  activeBuildingId: null,
  activeBuilding: null,
  activeSvg: null,
  panZoom: null,
  selectedNode: null,
};

const els = {
  buildingList: document.getElementById('buildingList'),
  viewerTitle: document.getElementById('viewerTitle'),
  viewerSubtitle: document.getElementById('viewerSubtitle'),
  mapViewport: document.getElementById('mapViewport'),
  detailsContent: document.getElementById('detailsContent'),
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const [buildings, equipment] = await Promise.all([
    fetchJson('data/buildings.json'),
    fetchJson('data/equipment.json'),
  ]);

  state.buildings = buildings;
  state.equipment = equipment;
  renderBuildingButtons();

  if (state.buildings.length) {
    await loadBuilding(state.buildings[0].id);
  } else {
    els.viewerTitle.textContent = 'No buildings configured';
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return await response.json();
}

function renderBuildingButtons() {
  els.buildingList.innerHTML = '';
  for (const building of state.buildings) {
    const button = document.createElement('button');
    button.className = 'building-button';
    button.textContent = building.name;
    button.dataset.buildingId = building.id;
    button.addEventListener('click', () => loadBuilding(building.id));
    els.buildingList.appendChild(button);
  }
  syncActiveBuildingButton();
}

function syncActiveBuildingButton() {
  for (const button of els.buildingList.querySelectorAll('.building-button')) {
    button.classList.toggle('active', button.dataset.buildingId === state.activeBuildingId);
  }
}

async function loadBuilding(buildingId) {
  const building = state.buildings.find(b => b.id === buildingId);
  if (!building) return;

  state.activeBuildingId = building.id;
  state.activeBuilding = building;
  state.selectedNode = null;
  syncActiveBuildingButton();

  const response = await fetch(building.svg);
  if (!response.ok) throw new Error(`Failed to load ${building.svg}`);
  const svgText = await response.text();

  els.mapViewport.innerHTML = svgText;
  const svg = els.mapViewport.querySelector('svg');
  if (!svg) {
    els.viewerTitle.textContent = building.name;
    els.viewerSubtitle.textContent = 'SVG did not contain a root <svg> element.';
    return;
  }

  state.activeSvg = svg;
  prepareSvg(svg);
  makeInteractive(svg);
  state.panZoom = enablePanZoom(svg, els.mapViewport);
  refit();
  showBuildingDetails(building);

  els.viewerTitle.textContent = building.name;
  els.viewerSubtitle.textContent = building.svg;
}

function prepareSvg(svg) {
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.background = 'transparent';
  const bg = svg.querySelector('rect[width="100%"][height="100%"]');
  if (bg) bg.classList.add('svg-root-bg');
}

function makeInteractive(svg) {
  const groups = Array.from(svg.querySelectorAll('g[data-cell-id]'));
  for (const group of groups) {
    if (!isClickableNode(group)) continue;
    const label = getNodeLabel(group);
    if (!label) continue;

    group.classList.add('equipment-node');
    group.dataset.label = label;
    group.tabIndex = -1;

    group.addEventListener('click', event => {
      event.stopPropagation();
      selectNode(group);
    });
  }

  svg.addEventListener('click', () => clearSelection());
}

function isClickableNode(group) {
  const hasRectLike = !!group.querySelector('rect, ellipse, polygon');
  const hasTextLike = !!getNodeLabel(group);
  return hasRectLike && hasTextLike;
}

function getNodeLabel(group) {
  const foreignDiv = group.querySelector('foreignObject div div div');
  if (foreignDiv && foreignDiv.textContent.trim()) return foreignDiv.textContent.trim();
  const textNode = group.querySelector('text');
  if (textNode && textNode.textContent.trim()) return textNode.textContent.trim();
  return '';
}

function selectNode(group) {
  if (state.selectedNode) {
    state.selectedNode.classList.remove('selected');
  }
  state.selectedNode = group;
  group.classList.add('selected');
  showNodeDetails(group.dataset.label || getNodeLabel(group));
}

function clearSelection() {
  if (state.selectedNode) state.selectedNode.classList.remove('selected');
  state.selectedNode = null;
  showBuildingDetails(state.activeBuilding);
}

function metadataKey(buildingId, label) {
  return `${buildingId}::${label}`;
}

function showBuildingDetails(building) {
  if (!building) return;
  els.detailsContent.innerHTML = `
    <dl class="detail-grid">
      <dt>Name</dt><dd>${escapeHtml(building.name)}</dd>
      <dt>Type</dt><dd>Building</dd>
      <dt>SVG</dt><dd>${escapeHtml(building.svg)}</dd>
      <dt>Notes</dt><dd>Use <code>data/buildings.json</code> to add more buildings.</dd>
    </dl>
    <div class="code-note">Tip: add a building by dropping a new SVG into <code>svg/</code> and adding one row to <code>data/buildings.json</code>.</div>
  `;
}

function showNodeDetails(label) {
  const key = metadataKey(state.activeBuildingId, label);
  const meta = state.equipment[key] || {
    type: inferType(label),
    status: 'Unknown',
    description: 'No custom metadata yet. Add this key to data/equipment.json.',
  };

  els.detailsContent.innerHTML = `
    <dl class="detail-grid">
      <dt>Name</dt><dd>${escapeHtml(label)}</dd>
      <dt>Type</dt><dd>${escapeHtml(meta.type || '')}</dd>
      <dt>Status</dt><dd>${escapeHtml(meta.status || '')}</dd>
      <dt>Description</dt><dd>${escapeHtml(meta.description || '')}</dd>
      <dt>Data key</dt><dd><code>${escapeHtml(key)}</code></dd>
    </dl>
    <div class="code-note">Update this item by editing <code>data/equipment.json</code> with the exact key shown above.</div>
  `;
}

function inferType(label) {
  const lower = label.toLowerCase();
  if (lower.includes('building')) return 'Building';
  if (lower.includes('pallet')) return 'Pallet';
  if (lower.includes('tool') || /^t\d+$/.test(lower)) return 'Tooling';
  if (lower.includes('part')) return 'Parts';
  return 'Equipment';
}

function enablePanZoom(svg, viewport) {
  let vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width
    ? { x: svg.viewBox.baseVal.x, y: svg.viewBox.baseVal.y, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height }
    : deriveViewBox(svg);

  applyViewBox(svg, vb);

  const panZoom = {
    viewBox: vb,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  };

  viewport.onwheel = event => {
    event.preventDefault();
    const scale = event.deltaY > 0 ? 1.1 : 0.9;
    const rect = viewport.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    const newWidth = panZoom.viewBox.width * scale;
    const newHeight = panZoom.viewBox.height * scale;
    panZoom.viewBox.x += (panZoom.viewBox.width - newWidth) * px;
    panZoom.viewBox.y += (panZoom.viewBox.height - newHeight) * py;
    panZoom.viewBox.width = newWidth;
    panZoom.viewBox.height = newHeight;
    applyViewBox(svg, panZoom.viewBox);
  };

  viewport.onpointerdown = event => {
    if (event.target.closest('.equipment-node')) return;
    panZoom.isDragging = true;
    panZoom.lastX = event.clientX;
    panZoom.lastY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
  };

  viewport.onpointermove = event => {
    if (!panZoom.isDragging) return;
    const rect = viewport.getBoundingClientRect();
    const dx = (event.clientX - panZoom.lastX) * (panZoom.viewBox.width / rect.width);
    const dy = (event.clientY - panZoom.lastY) * (panZoom.viewBox.height / rect.height);
    panZoom.viewBox.x -= dx;
    panZoom.viewBox.y -= dy;
    panZoom.lastX = event.clientX;
    panZoom.lastY = event.clientY;
    applyViewBox(svg, panZoom.viewBox);
  };

  const endDrag = event => {
    panZoom.isDragging = false;
    try { viewport.releasePointerCapture(event.pointerId); } catch (_) {}
  };
  viewport.onpointerup = endDrag;
  viewport.onpointercancel = endDrag;
  viewport.onpointerleave = endDrag;

  return panZoom;
}

function deriveViewBox(svg) {
  const vbAttr = svg.getAttribute('viewBox');
  if (vbAttr) {
    const [x, y, width, height] = vbAttr.split(/\s+/).map(Number);
    return { x, y, width, height };
  }
  const width = Number.parseFloat(svg.getAttribute('width')) || 1000;
  const height = Number.parseFloat(svg.getAttribute('height')) || 800;
  return { x: 0, y: 0, width, height };
}

function applyViewBox(svg, vb) {
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
}

function refit() {
  if (!state.activeSvg || !state.panZoom) return;
  const vb = deriveViewBox(state.activeSvg);
  state.panZoom.viewBox = { ...vb };
  applyViewBox(state.activeSvg, state.panZoom.viewBox);
}

document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'f') {
    refit();
  }
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
