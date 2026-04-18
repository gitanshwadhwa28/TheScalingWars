const RESOURCE_INFO = {
  compute: { label: "Compute", color: "var(--compute)" },
  data: { label: "Data", color: "var(--data)" },
  chips: { label: "Chips", color: "var(--chips)" },
  talent: { label: "Talent", color: "var(--talent)" },
  capital: { label: "Capital", color: "var(--capital)" }
};

const TILE_DEFS = {
  compute: { label: "Compute Cluster", short: "Compute", color: "#ff8a3d", resource: "compute" },
  data: { label: "Data Lake", short: "Data", color: "#57a4ff", resource: "data" },
  chips: { label: "Chip Fab", short: "Chips", color: "#ba8cff", resource: "chips" },
  talent: { label: "Talent Hub", short: "Talent", color: "#4ce0b3", resource: "talent" },
  capital: { label: "Capital Market", short: "Capital", color: "#ffd166", resource: "capital" },
  regulatory: { label: "Regulatory Zone", short: "Regulatory", color: "#ff5d73", resource: null }
};

const TILE_BAG = [
  "compute", "compute", "compute", "compute",
  "data", "data", "data", "data",
  "talent", "talent", "talent", "talent",
  "chips", "chips", "chips",
  "capital", "capital", "capital",
  "regulatory"
];

const NUMBER_TOKENS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
const PLAYER_COLORS = ["#54c6ff", "#ff7a90", "#ffd166", "#8cff98"];
const PLAYER_DEFAULTS = ["OpenAI", "Google", "Microsoft", "Amazon"];
const DISRUPTION_EVENTS = [
  {
    title: "System Outage Cascade",
    year: "2024 pattern",
    tags: ["Outage", "Vendor Risk"],
    body: "A single vendor failure ripples across airports, hospitals, and enterprise systems. Boards suddenly care about resilience more than speed.",
    impact: "This event does not add extra rules. It explains the disruption: players still discard on 7, then move the disruption marker to block one hex."
  },
  {
    title: "Prompt Injection Breach",
    year: "2026 pattern",
    tags: ["Security", "Model Behavior"],
    body: "A high-profile AI assistant is manipulated into unsafe or hateful output after a prompt-injection exploit. Trust drops overnight.",
    impact: "This event does not add extra rules. Resolve the normal disruption sequence, then move the marker as the board-level trust shock."
  },
  {
    title: "Botched AI Rollout",
    year: "2024 pattern",
    tags: ["Product Failure", "Consumer Trust"],
    body: "A major customer-facing AI launch keeps making absurd mistakes and gets pulled back. Executives slam the brakes on deployment.",
    impact: "This event does not add extra rules. Resolve the normal disruption: discard if needed, then block a hex and pressure a rival."
  },
  {
    title: "Layoff Wave",
    year: "2026 pattern",
    tags: ["Restructuring", "Capital Shift"],
    body: "A new round of layoffs sweeps through the sector as companies redirect cash toward AI infrastructure. Morale dips while capex surges.",
    impact: "This event does not add extra rules. The disruption marker represents the strategic whiplash and local production freeze."
  },
  {
    title: "Memory Price Spike",
    year: "Hardware frenzy",
    tags: ["Supply Chain", "Infrastructure"],
    body: "The datacenter rush sends component prices soaring. Build plans stall as suppliers struggle to keep up with AI demand.",
    impact: "This event does not add extra rules. Use the standard disruption flow to model the bottleneck hitting one contested sector."
  },
  {
    title: "Panic Pivot",
    year: "Market reaction",
    tags: ["Strategy Shift", "Narrative Shock"],
    body: "A company abruptly abandons its old roadmap and declares itself all-in on AI. Rivals scramble to match the narrative before investors punish them.",
    impact: "This event does not add extra rules. Treat the disruption marker as the sudden pivot freezing one part of the market while players reposition."
  }
];

const svg = document.getElementById("board");
const phaseChip = document.getElementById("phaseChip");
const currentPlayerName = document.getElementById("currentPlayerName");
const currentTurnSummary = document.getElementById("currentTurnSummary");
const diceValue = document.getElementById("diceValue");
const modeValue = document.getElementById("modeValue");
const instructionBox = document.getElementById("instructionBox");
const playersList = document.getElementById("playersList");
const resourceCards = document.getElementById("resourceCards");
const gameLog = document.getElementById("gameLog");
const legend = document.getElementById("legend");
const playerCountSelect = document.getElementById("playerCount");
const setupPlayers = document.getElementById("setupPlayers");
const tradeFrom = document.getElementById("tradeFrom");
const tradeTo = document.getElementById("tradeTo");
const playerTradeTarget = document.getElementById("playerTradeTarget");
const playerTradeGiveResource = document.getElementById("playerTradeGiveResource");
const playerTradeGiveAmount = document.getElementById("playerTradeGiveAmount");
const playerTradeGetResource = document.getElementById("playerTradeGetResource");
const playerTradeGetAmount = document.getElementById("playerTradeGetAmount");
const playerTradeBtn = document.getElementById("playerTradeBtn");

const handoffOverlay = document.getElementById("handoffOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayBody = document.getElementById("overlayBody");
const overlayTags = document.getElementById("overlayTags");
const overlayContinueBtn = document.getElementById("overlayContinueBtn");

const discardOverlay = document.getElementById("discardOverlay");
const discardTitle = document.getElementById("discardTitle");
const discardBody = document.getElementById("discardBody");
const discardGrid = document.getElementById("discardGrid");
const discardConfirmBtn = document.getElementById("discardConfirmBtn");
const eventOverlay = document.getElementById("eventOverlay");
const eventTitle = document.getElementById("eventTitle");
const eventBody = document.getElementById("eventBody");
const eventImpact = document.getElementById("eventImpact");
const eventTags = document.getElementById("eventTags");
const eventContinueBtn = document.getElementById("eventContinueBtn");

let state = createEmptyState();

function createEmptyState() {
  return {
    gameStarted: false,
    mode: null,
    players: [],
    currentPlayer: 0,
    board: null,
    phase: "setup",
    rolled: false,
    dice: null,
    setupQueue: [],
    setupIndex: 0,
    pendingSetupType: null,
    setupLastIntersection: null,
    discardQueue: [],
    discardPlayer: null,
    pendingDiscard: null,
    mustMoveDisruption: false,
    pendingSevenResolution: false,
    currentEvent: null,
    log: [],
    turn: 1,
    longestNetworkHolder: null,
    handoff: null,
    winner: null
  };
}

function initSelectors() {
  [3, 4].forEach((count) => {
    const opt = document.createElement("option");
    opt.value = count;
    opt.textContent = `${count} players`;
    playerCountSelect.appendChild(opt);
  });
  playerCountSelect.value = "4";
  playerCountSelect.addEventListener("change", renderSetupFields);

  Object.keys(RESOURCE_INFO).forEach((key) => {
    const fromOpt = document.createElement("option");
    fromOpt.value = key;
    fromOpt.textContent = RESOURCE_INFO[key].label;
    tradeFrom.appendChild(fromOpt);

    const toOpt = document.createElement("option");
    toOpt.value = key;
    toOpt.textContent = RESOURCE_INFO[key].label;
    tradeTo.appendChild(toOpt);

    const giveOpt = document.createElement("option");
    giveOpt.value = key;
    giveOpt.textContent = RESOURCE_INFO[key].label;
    playerTradeGiveResource.appendChild(giveOpt);

    const getOpt = document.createElement("option");
    getOpt.value = key;
    getOpt.textContent = RESOURCE_INFO[key].label;
    playerTradeGetResource.appendChild(getOpt);
  });
  tradeFrom.value = "compute";
  tradeTo.value = "data";
  playerTradeGiveResource.value = "compute";
  playerTradeGetResource.value = "data";

  renderSetupFields();
  renderLegend();
}

function renderSetupFields() {
  const count = Number(playerCountSelect.value);
  setupPlayers.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <div class="player-color" style="background:${PLAYER_COLORS[i]}"></div>
      <input type="text" id="playerName${i}" value="${PLAYER_DEFAULTS[i]}" maxlength="18" />
      <div class="small" style="text-align:right;">Player ${i + 1}</div>
    `;
    setupPlayers.appendChild(row);
  }
}

function renderLegend() {
  legend.innerHTML = "";
  ["compute", "data", "chips", "talent", "capital", "regulatory"].forEach((key) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-dot" style="background:${TILE_DEFS[key].color}"></span>${TILE_DEFS[key].short}`;
    legend.appendChild(item);
  });
}

function renderPlayerTradeTargets() {
  const previous = playerTradeTarget.value;
  playerTradeTarget.innerHTML = "";
  if (!state.gameStarted || state.phase !== "main") {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No game";
    playerTradeTarget.appendChild(opt);
    return;
  }

  state.players
    .filter((player) => player.id !== currentPlayer().id)
    .forEach((player) => {
      const opt = document.createElement("option");
      opt.value = String(player.id);
      opt.textContent = player.name;
      playerTradeTarget.appendChild(opt);
    });

  if (playerTradeTarget.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No opponents";
    playerTradeTarget.appendChild(opt);
  } else if ([...playerTradeTarget.options].some((opt) => opt.value === previous)) {
    playerTradeTarget.value = previous;
  }
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function keyForPoint(x, y) {
  return `${Math.round(x * 100) / 100}|${Math.round(y * 100) / 100}`;
}

function createBoard() {
  const size = 74;
  const coords = [];
  for (let q = -2; q <= 2; q += 1) {
    for (let r = -2; r <= 2; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= 2) {
        coords.push({ q, r });
      }
    }
  }

  const types = shuffle(TILE_BAG);
  const numbers = shuffle(NUMBER_TOKENS);
  const pointMap = new Map();
  const edgeMap = new Map();
  const tiles = [];
  let numberIndex = 0;

  coords.forEach((coord, index) => {
    const x = 490 + size * Math.sqrt(3) * (coord.q + coord.r / 2);
    const y = 412 + size * 1.5 * coord.r;
    const tileType = types[index];
    const points = [];

    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      const key = keyForPoint(px, py);
      if (!pointMap.has(key)) {
        pointMap.set(key, {
          id: pointMap.size,
          x: px,
          y: py,
          adjacentTiles: [],
          edges: [],
          structure: null
        });
      }
      const point = pointMap.get(key);
      point.adjacentTiles.push(index);
      points.push(point.id);
    }

    for (let i = 0; i < 6; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % 6];
      const edgeKey = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          id: edgeMap.size,
          a: Math.min(a, b),
          b: Math.max(a, b),
          owner: null
        });
      }
    }

    tiles.push({
      id: index,
      q: coord.q,
      r: coord.r,
      x,
      y,
      type: tileType,
      resource: TILE_DEFS[tileType].resource,
      number: tileType === "regulatory" ? null : numbers[numberIndex++],
      points
    });
  });

  const intersections = Array.from(pointMap.values());
  const edges = Array.from(edgeMap.values());

  edges.forEach((edge) => {
    intersections[edge.a].edges.push(edge.id);
    intersections[edge.b].edges.push(edge.id);
  });

  const regulatoryTile = tiles.find((tile) => tile.type === "regulatory");

  return {
    tiles,
    intersections,
    edges,
    disruptionTileId: regulatoryTile ? regulatoryTile.id : 0
  };
}

function sanitizePlayerName(name, index) {
  const trimmed = String(name || "").trim();
  return trimmed || `Player ${index + 1}`;
}

function buildPlayersFromSetup() {
  const count = Number(playerCountSelect.value);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: sanitizePlayerName(document.getElementById(`playerName${index}`).value, index),
    color: PLAYER_COLORS[index],
    resources: { compute: 0, data: 0, chips: 0, talent: 0, capital: 0 },
    hubsLeft: 5,
    campusesLeft: 4,
    linksLeft: 15,
    hubs: [],
    campuses: [],
    links: [],
    setupHubsPlaced: 0
  }));
}

function startNewGame() {
  state = createEmptyState();
  state.players = buildPlayersFromSetup();
  state.board = createBoard();
  state.gameStarted = true;
  state.phase = "setup";
  state.currentPlayer = 0;
  state.setupQueue = [...state.players.map((p) => p.id), ...state.players.map((p) => p.id).reverse()];
  state.setupIndex = 0;
  state.pendingSetupType = "hub";
  state.turn = 1;
  pushLog("New game created. Opening placement has begun.");
  openHandoffForSetup();
  render();
}

function pushLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 22);
}

function currentPlayer() {
  return state.players[state.currentPlayer];
}

function getPlayer(id) {
  return state.players.find((p) => p.id === id);
}

function totalResources(player) {
  return Object.values(player.resources).reduce((sum, count) => sum + count, 0);
}

function structureAt(intersectionId) {
  return state.board.intersections[intersectionId].structure;
}

function hasNeighborStructure(intersectionId) {
  const point = state.board.intersections[intersectionId];
  return point.edges.some((edgeId) => {
    const edge = state.board.edges[edgeId];
    const otherId = edge.a === intersectionId ? edge.b : edge.a;
    return Boolean(structureAt(otherId));
  });
}

function edgeTouchesPlayer(edge, playerId) {
  const pointA = state.board.intersections[edge.a];
  const pointB = state.board.intersections[edge.b];
  const structureA = pointA.structure;
  const structureB = pointB.structure;
  if (structureA && structureA.owner === playerId) return true;
  if (structureB && structureB.owner === playerId) return true;
  return [pointA, pointB].some((point) => point.edges.some((edgeId) => state.board.edges[edgeId].owner === playerId));
}

function canBuildEdge(edgeId, playerId, setup = false) {
  const edge = state.board.edges[edgeId];
  if (edge.owner !== null) return false;
  if (setup) {
    return edge.a === state.setupLastIntersection || edge.b === state.setupLastIntersection;
  }
  return edgeTouchesPlayer(edge, playerId);
}

function canBuildHub(intersectionId, playerId, setup = false) {
  const point = state.board.intersections[intersectionId];
  if (point.structure) return false;
  if (hasNeighborStructure(intersectionId)) return false;
  if (setup) return true;
  return point.edges.some((edgeId) => state.board.edges[edgeId].owner === playerId);
}

function canUpgradeCampus(intersectionId, playerId) {
  const structure = structureAt(intersectionId);
  return structure && structure.owner === playerId && structure.type === "hub";
}

function payCost(player, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    if (player.resources[resource] < amount) return false;
  }
  for (const [resource, amount] of Object.entries(cost)) {
    player.resources[resource] -= amount;
  }
  return true;
}

function addResource(player, resource, amount = 1) {
  player.resources[resource] += amount;
}

function buildEdge(edgeId, playerId, free = false) {
  const player = getPlayer(playerId);
  if (!free) {
    if (player.linksLeft <= 0) return false;
    if (!payCost(player, { compute: 1, chips: 1 })) return false;
  }
  const edge = state.board.edges[edgeId];
  edge.owner = playerId;
  player.links.push(edgeId);
  player.linksLeft -= 1;
  updateLongestNetwork();
  return true;
}

function buildHub(intersectionId, playerId, free = false) {
  const player = getPlayer(playerId);
  if (player.hubsLeft <= 0) return false;
  if (!free && !payCost(player, { compute: 1, data: 1, talent: 1, capital: 1 })) return false;
  state.board.intersections[intersectionId].structure = { owner: playerId, type: "hub" };
  player.hubs.push(intersectionId);
  player.hubsLeft -= 1;
  return true;
}

function upgradeCampus(intersectionId, playerId) {
  const player = getPlayer(playerId);
  if (player.campusesLeft <= 0) return false;
  if (!payCost(player, { talent: 2, capital: 3 })) return false;
  const point = state.board.intersections[intersectionId];
  point.structure = { owner: playerId, type: "campus" };
  player.hubs = player.hubs.filter((id) => id !== intersectionId);
  player.campuses.push(intersectionId);
  player.campusesLeft -= 1;
  player.hubsLeft += 1;
  return true;
}

function grantSecondPlacementResources(playerId, intersectionId) {
  const player = getPlayer(playerId);
  const point = state.board.intersections[intersectionId];
  point.adjacentTiles.forEach((tileId) => {
    const tile = state.board.tiles[tileId];
    if (tile.resource && tile.id !== state.board.disruptionTileId) {
      addResource(player, tile.resource, 1);
    }
  });
}

function nextSetupStep() {
  if (state.pendingSetupType === "hub") {
    state.pendingSetupType = "link";
    return;
  }

  const player = getPlayer(state.setupQueue[state.setupIndex]);
  if (player.setupHubsPlaced === 2) {
    grantSecondPlacementResources(player.id, state.setupLastIntersection);
    pushLog(`${player.name} gained starting resources from the second AI hub.`);
  }

  state.setupIndex += 1;
  state.pendingSetupType = "hub";
  state.setupLastIntersection = null;

  if (state.setupIndex >= state.setupQueue.length) {
    state.phase = "main";
    state.currentPlayer = 0;
    state.mode = null;
    pushLog(`Setup complete. ${currentPlayer().name} begins turn 1.`);
    openHandoff(`${currentPlayer().name}'s turn`, "Roll the dice to start the live game.", [
      `Turn ${state.turn}`,
      "Main game"
    ]);
  } else {
    openHandoffForSetup();
  }
}

function openHandoff(title, body, tags = []) {
  state.handoff = { title, body, tags };
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayTags.innerHTML = "";
  tags.forEach((tagText) => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = tagText;
    overlayTags.appendChild(tag);
  });
  handoffOverlay.classList.add("show");
}

function openHandoffForSetup() {
  const player = getPlayer(state.setupQueue[state.setupIndex]);
  openHandoff(
    `${player.name} setup`,
    state.pendingSetupType === "hub"
      ? "Place a free AI hub on any valid intersection."
      : "Place a free network link connected to that new AI hub.",
    [
      `Step ${state.setupIndex + 1} of ${state.setupQueue.length}`,
      state.pendingSetupType === "hub" ? "Place hub" : "Place link"
    ]
  );
}

function closeHandoff() {
  state.handoff = null;
  handoffOverlay.classList.remove("show");
}

function showDiscardOverlay(playerId, required) {
  state.discardPlayer = playerId;
  const player = getPlayer(playerId);
  state.pendingDiscard = {};
  Object.keys(RESOURCE_INFO).forEach((resource) => {
    state.pendingDiscard[resource] = 0;
  });

  discardTitle.textContent = `${player.name} must discard ${required}`;
  discardBody.textContent = `A 7 was rolled. Choose exactly ${required} resources to discard before the disruption moves.`;
  renderDiscardGrid();
  discardOverlay.classList.add("show");
}

function showEventOverlay(event) {
  eventTitle.textContent = event.title;
  eventBody.textContent = event.body;
  eventImpact.textContent = event.impact;
  eventTags.innerHTML = "";
  [event.year, ...event.tags].forEach((tagText) => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = tagText;
    eventTags.appendChild(tag);
  });
  eventOverlay.classList.add("show");
}

function renderDiscardGrid() {
  const player = getPlayer(state.discardPlayer);
  const required = Math.floor(totalResources(player) / 2);
  const selected = Object.values(state.pendingDiscard).reduce((sum, value) => sum + value, 0);
  discardGrid.innerHTML = "";

  Object.keys(RESOURCE_INFO).forEach((resource) => {
    const row = document.createElement("div");
    row.className = "discard-row";
    row.innerHTML = `
      <div>${RESOURCE_INFO[resource].label}</div>
      <div class="small">Have ${player.resources[resource]}</div>
      <button class="secondary" data-action="minus" data-resource="${resource}">-</button>
      <div>${state.pendingDiscard[resource]} / ${required}</div>
    `;
    const plus = document.createElement("button");
    plus.className = "secondary";
    plus.textContent = "+";
    plus.dataset.action = "plus";
    plus.dataset.resource = resource;
    row.appendChild(plus);
    discardGrid.appendChild(row);
  });

  discardConfirmBtn.disabled = selected !== required;
}

function handleDiscardAdjust(resource, delta) {
  const player = getPlayer(state.discardPlayer);
  const current = state.pendingDiscard[resource];
  const selected = Object.values(state.pendingDiscard).reduce((sum, value) => sum + value, 0);
  const required = Math.floor(totalResources(player) / 2);

  if (delta > 0) {
    if (player.resources[resource] - current <= 0 || selected >= required) return;
    state.pendingDiscard[resource] += 1;
  } else if (current > 0) {
    state.pendingDiscard[resource] -= 1;
  }
  renderDiscardGrid();
}

function confirmDiscard() {
  const player = getPlayer(state.discardPlayer);
  Object.entries(state.pendingDiscard).forEach(([resource, amount]) => {
    player.resources[resource] -= amount;
  });
  pushLog(`${player.name} discarded ${Object.values(state.pendingDiscard).reduce((sum, value) => sum + value, 0)} resources.`);
  discardOverlay.classList.remove("show");
  state.discardPlayer = null;
  state.pendingDiscard = null;
  processNextDiscard();
  render();
}

function processNextDiscard() {
  if (state.discardQueue.length > 0) {
    const nextId = state.discardQueue.shift();
    showDiscardOverlay(nextId, Math.floor(totalResources(getPlayer(nextId)) / 2));
    return;
  }
  state.mustMoveDisruption = true;
  state.mode = "moveDisruption";
  pushLog(`${currentPlayer().name} must move the disruption.`);
  openHandoff(`${currentPlayer().name} moves the disruption`, "Choose any hex to block and steal from an adjacent rival if possible.", ["Disruption phase"]);
}

function beginDisruptionResolution() {
  state.pendingSevenResolution = false;
  state.discardQueue = state.players.filter((player) => totalResources(player) > 7).map((player) => player.id);
  if (state.discardQueue.length > 0) {
    processNextDiscard();
  } else {
    state.mustMoveDisruption = true;
    state.mode = "moveDisruption";
    openHandoff(`${currentPlayer().name} moves the disruption`, "Choose a hex to block. If opponents are adjacent, one random resource will be stolen.", ["Disruption phase"]);
  }
}

function distributeResources(total) {
  const gains = new Map();
  state.board.tiles.forEach((tile) => {
    if (tile.number !== total || tile.id === state.board.disruptionTileId || !tile.resource) return;
    tile.points.forEach((intersectionId) => {
      const structure = structureAt(intersectionId);
      if (!structure) return;
      const amount = structure.type === "campus" ? 2 : 1;
      if (!gains.has(structure.owner)) gains.set(structure.owner, {});
      gains.get(structure.owner)[tile.resource] = (gains.get(structure.owner)[tile.resource] || 0) + amount;
    });
  });

  gains.forEach((resourceMap, playerId) => {
    const player = getPlayer(playerId);
    Object.entries(resourceMap).forEach(([resource, amount]) => addResource(player, resource, amount));
    const summary = Object.entries(resourceMap).map(([resource, amount]) => `${amount} ${RESOURCE_INFO[resource].label}`).join(", ");
    pushLog(`${player.name} gained ${summary}.`);
  });

  if (gains.size === 0) {
    pushLog(`Rolled ${total}. No resources were produced.`);
  }
}

function rollDice() {
  if (!state.gameStarted || state.phase !== "main" || state.rolled || state.winner) return;
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const total = d1 + d2;
  state.dice = { d1, d2, total };
  state.rolled = true;

  if (total === 7) {
    const event = DISRUPTION_EVENTS[Math.floor(Math.random() * DISRUPTION_EVENTS.length)];
    state.currentEvent = event;
    state.pendingSevenResolution = true;
    pushLog(`${currentPlayer().name} rolled a 7. Disruption triggered: ${event.title}.`);
    showEventOverlay(event);
  } else {
    distributeResources(total);
  }
  render();
}

function eligibleVictimsForTile(tileId, activePlayerId) {
  const victims = new Set();
  state.board.tiles[tileId].points.forEach((intersectionId) => {
    const structure = structureAt(intersectionId);
    if (structure && structure.owner !== activePlayerId && totalResources(getPlayer(structure.owner)) > 0) {
      victims.add(structure.owner);
    }
  });
  return Array.from(victims);
}

function moveDisruption(tileId) {
  state.board.disruptionTileId = tileId;
  const victims = eligibleVictimsForTile(tileId, currentPlayer().id);
  if (victims.length > 0) {
    const victimId = victims[Math.floor(Math.random() * victims.length)];
    const victim = getPlayer(victimId);
    const pool = Object.entries(victim.resources).flatMap(([resource, count]) => Array.from({ length: count }, () => resource));
    if (pool.length > 0) {
      const stolen = pool[Math.floor(Math.random() * pool.length)];
      victim.resources[stolen] -= 1;
      currentPlayer().resources[stolen] += 1;
      pushLog(`${currentPlayer().name} moved the disruption and stole 1 ${RESOURCE_INFO[stolen].label} from ${victim.name}.`);
    }
  } else {
    pushLog(`${currentPlayer().name} moved the disruption, but no rival had resources to steal.`);
  }
  state.mustMoveDisruption = false;
  state.mode = null;
}

function setMode(nextMode) {
  if (!state.gameStarted || state.phase !== "main" || state.winner) return;
  if (!state.rolled && nextMode) return;
  if (state.mustMoveDisruption && nextMode !== "moveDisruption") return;
  state.mode = state.mode === nextMode ? null : nextMode;
  render();
}

function endTurn() {
  if (!state.gameStarted || state.phase !== "main" || state.winner) return;
  if (!state.rolled || state.mustMoveDisruption) return;
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  if (state.currentPlayer === 0) state.turn += 1;
  state.rolled = false;
  state.dice = null;
  state.mode = null;
  pushLog(`${currentPlayer().name} begins turn ${state.turn}.`);
  openHandoff(`${currentPlayer().name}'s turn`, "Roll dice, trade, and expand your AI empire.", [`Turn ${state.turn}`]);
  render();
}

function performTrade() {
  if (!state.gameStarted || state.phase !== "main" || !state.rolled || state.mustMoveDisruption || state.winner) return;
  const player = currentPlayer();
  const from = tradeFrom.value;
  const to = tradeTo.value;
  if (from === to) return;
  if (player.resources[from] < 4) {
    pushLog(`${player.name} tried to trade without enough ${RESOURCE_INFO[from].label}.`);
    render();
    return;
  }
  player.resources[from] -= 4;
  player.resources[to] += 1;
  pushLog(`${player.name} traded 4 ${RESOURCE_INFO[from].label} for 1 ${RESOURCE_INFO[to].label}.`);
  render();
}

function performPlayerTrade() {
  if (!state.gameStarted || state.phase !== "main" || !state.rolled || state.mustMoveDisruption || state.winner) return;
  const active = currentPlayer();
  const targetId = Number(playerTradeTarget.value);
  const target = getPlayer(targetId);
  const giveResource = playerTradeGiveResource.value;
  const getResource = playerTradeGetResource.value;
  const giveAmount = Math.max(1, Number(playerTradeGiveAmount.value) || 1);
  const getAmount = Math.max(1, Number(playerTradeGetAmount.value) || 1);

  if (!target || target.id === active.id) {
    pushLog(`${active.name} needs to choose another player to trade with.`);
    render();
    return;
  }

  if (active.resources[giveResource] < giveAmount) {
    pushLog(`${active.name} tried to trade ${giveAmount} ${RESOURCE_INFO[giveResource].label} but does not have enough.`);
    render();
    return;
  }

  if (target.resources[getResource] < getAmount) {
    pushLog(`${active.name} offered a trade to ${target.name}, but ${target.name} does not have enough ${RESOURCE_INFO[getResource].label}.`);
    render();
    return;
  }

  active.resources[giveResource] -= giveAmount;
  target.resources[giveResource] += giveAmount;
  target.resources[getResource] -= getAmount;
  active.resources[getResource] += getAmount;

  pushLog(`${active.name} traded ${giveAmount} ${RESOURCE_INFO[giveResource].label} to ${target.name} for ${getAmount} ${RESOURCE_INFO[getResource].label}.`);
  render();
}

function pointsForPlayer(player) {
  let score = player.hubs.length + player.campuses.length * 2;
  if (state.longestNetworkHolder === player.id) score += 2;
  return score;
}

function checkWinner() {
  const winner = state.players.find((player) => pointsForPlayer(player) >= 10);
  if (winner) {
    state.winner = winner.id;
    pushLog(`${winner.name} reached 10 victory points and won the AI race.`);
    openHandoff(`${winner.name} wins`, "The pass-and-play prototype is complete. Start a new game to run it back.", [`${pointsForPlayer(winner)} VP`]);
  }
}

function updateLongestNetwork() {
  let best = { holder: null, length: 0 };
  state.players.forEach((player) => {
    const length = longestPathForPlayer(player.id);
    if (length >= 5 && length > best.length) {
      best = { holder: player.id, length };
    }
  });
  state.longestNetworkHolder = best.holder;
}

function longestPathForPlayer(playerId) {
  const edges = state.board.edges.filter((edge) => edge.owner === playerId);
  if (edges.length === 0) return 0;
  const adjacency = new Map();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.a)) adjacency.set(edge.a, []);
    if (!adjacency.has(edge.b)) adjacency.set(edge.b, []);
    adjacency.get(edge.a).push(edge);
    adjacency.get(edge.b).push(edge);
  });

  let longest = 0;
  function dfs(node, used) {
    longest = Math.max(longest, used.size);
    const options = adjacency.get(node) || [];
    options.forEach((edge) => {
      if (used.has(edge.id)) return;
      used.add(edge.id);
      const nextNode = edge.a === node ? edge.b : edge.a;
      dfs(nextNode, used);
      used.delete(edge.id);
    });
  }

  adjacency.forEach((_edges, node) => dfs(node, new Set()));
  return longest;
}

function handleIntersectionClick(intersectionId) {
  if (!state.gameStarted || state.winner) return;
  const playerId = state.phase === "setup" ? state.setupQueue[state.setupIndex] : currentPlayer().id;
  const player = getPlayer(playerId);

  if (state.phase === "setup") {
    if (state.pendingSetupType !== "hub" || !canBuildHub(intersectionId, playerId, true)) return;
    if (!buildHub(intersectionId, playerId, true)) return;
    player.setupHubsPlaced += 1;
    state.setupLastIntersection = intersectionId;
    pushLog(`${player.name} placed a free AI hub.`);
    nextSetupStep();
    render();
    return;
  }

  if (state.mode === "buildHub") {
    if (!canBuildHub(intersectionId, playerId)) return;
    if (!buildHub(intersectionId, playerId)) {
      pushLog(`${player.name} does not have the resources to build an AI hub.`);
      render();
      return;
    }
    pushLog(`${player.name} built an AI hub.`);
    state.mode = null;
    checkWinner();
    render();
    return;
  }

  if (state.mode === "buildCampus") {
    if (!canUpgradeCampus(intersectionId, playerId)) return;
    if (!upgradeCampus(intersectionId, playerId)) {
      pushLog(`${player.name} does not have the resources to upgrade to a mega campus.`);
      render();
      return;
    }
    pushLog(`${player.name} upgraded an AI hub into a mega campus.`);
    state.mode = null;
    checkWinner();
    render();
  }
}

function handleEdgeClick(edgeId) {
  if (!state.gameStarted || state.winner) return;
  const playerId = state.phase === "setup" ? state.setupQueue[state.setupIndex] : currentPlayer().id;
  const player = getPlayer(playerId);

  if (state.phase === "setup") {
    if (state.pendingSetupType !== "link" || !canBuildEdge(edgeId, playerId, true)) return;
    if (!buildEdge(edgeId, playerId, true)) return;
    pushLog(`${player.name} placed a free network link.`);
    nextSetupStep();
    render();
    return;
  }

  if (state.mode === "buildLink") {
    if (!canBuildEdge(edgeId, playerId, false)) return;
    if (!buildEdge(edgeId, playerId, false)) {
      pushLog(`${player.name} does not have the resources to build a network link.`);
      render();
      return;
    }
    pushLog(`${player.name} built a network link.`);
    state.mode = null;
    checkWinner();
    render();
  }
}

function handleTileClick(tileId) {
  if (!state.gameStarted || state.winner) return;
  if (state.mode === "moveDisruption" && state.mustMoveDisruption) {
    moveDisruption(tileId);
    closeHandoff();
    render();
  }
}

function renderBoard() {
  svg.innerHTML = "";

  state.board?.tiles.forEach((tile) => {
    const def = TILE_DEFS[tile.type];
    const points = tile.points.map((pointId) => {
      const point = state.board.intersections[pointId];
      return `${point.x},${point.y}`;
    }).join(" ");

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.style.cursor = state.mode === "moveDisruption" ? "pointer" : "default";

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", points);
    poly.setAttribute("fill", def.color);
    poly.setAttribute("fill-opacity", tile.id === state.board.disruptionTileId ? "0.56" : "0.25");
    poly.setAttribute("stroke", tile.id === state.board.disruptionTileId ? "#ffd2d9" : "rgba(255,255,255,0.16)");
    poly.setAttribute("stroke-width", tile.id === state.board.disruptionTileId ? "4" : "2");
    poly.addEventListener("click", () => handleTileClick(tile.id));
    group.appendChild(poly);

    const name = document.createElementNS("http://www.w3.org/2000/svg", "text");
    name.setAttribute("x", tile.x);
    name.setAttribute("y", tile.y - 12);
    name.setAttribute("fill", "#f7fbff");
    name.setAttribute("font-size", "15");
    name.setAttribute("text-anchor", "middle");
    name.setAttribute("font-weight", "700");
    name.textContent = def.short;
    group.appendChild(name);

    if (tile.number) {
      const token = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      token.setAttribute("cx", tile.x);
      token.setAttribute("cy", tile.y + 20);
      token.setAttribute("r", "22");
      token.setAttribute("fill", "rgba(5, 12, 21, 0.92)");
      token.setAttribute("stroke", "rgba(255,255,255,0.18)");
      token.setAttribute("stroke-width", "2");
      group.appendChild(token);

      const num = document.createElementNS("http://www.w3.org/2000/svg", "text");
      num.setAttribute("x", tile.x);
      num.setAttribute("y", tile.y + 27);
      num.setAttribute("fill", tile.number === 6 || tile.number === 8 ? "#ffb0be" : "#f7fbff");
      num.setAttribute("font-size", "22");
      num.setAttribute("text-anchor", "middle");
      num.setAttribute("font-weight", "800");
      num.textContent = tile.number;
      group.appendChild(num);
    } else {
      const bad = document.createElementNS("http://www.w3.org/2000/svg", "text");
      bad.setAttribute("x", tile.x);
      bad.setAttribute("y", tile.y + 27);
      bad.setAttribute("fill", "#ffd1d7");
      bad.setAttribute("font-size", "18");
      bad.setAttribute("text-anchor", "middle");
      bad.setAttribute("font-weight", "700");
      bad.textContent = "Disruption";
      group.appendChild(bad);
    }

    svg.appendChild(group);
  });

  state.board?.edges.forEach((edge) => {
    const a = state.board.intersections[edge.a];
    const b = state.board.intersections[edge.b];
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("stroke", edge.owner !== null ? getPlayer(edge.owner).color : "rgba(255,255,255,0.14)");
    line.setAttribute("stroke-width", edge.owner !== null ? "8" : "5");
    line.setAttribute("stroke-linecap", "round");
    line.style.cursor = "pointer";
    line.addEventListener("click", () => handleEdgeClick(edge.id));
    svg.appendChild(line);
  });

  state.board?.intersections.forEach((point) => {
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hit.setAttribute("cx", point.x);
    hit.setAttribute("cy", point.y);
    hit.setAttribute("r", point.structure ? 11 : 8);
    hit.setAttribute("fill", point.structure ? getPlayer(point.structure.owner).color : "rgba(255,255,255,0.18)");
    hit.setAttribute("stroke", point.structure ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.12)");
    hit.setAttribute("stroke-width", point.structure ? "2" : "1.5");
    hit.style.cursor = "pointer";
    hit.addEventListener("click", () => handleIntersectionClick(point.id));
    svg.appendChild(hit);

    if (point.structure && point.structure.type === "campus") {
      const crown = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      crown.setAttribute("x", point.x - 8);
      crown.setAttribute("y", point.y - 8);
      crown.setAttribute("width", "16");
      crown.setAttribute("height", "16");
      crown.setAttribute("fill", "rgba(5,12,21,0.82)");
      crown.setAttribute("rx", "4");
      svg.appendChild(crown);
    }
  });
}

function renderPlayers() {
  playersList.innerHTML = "";
  if (!state.gameStarted) return;
  state.players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = `player-card ${index === state.currentPlayer && state.phase === "main" ? "current" : ""}`;
    const totalCards = totalResources(player);
    const longest = state.longestNetworkHolder === player.id ? "Longest Network" : "";
    card.innerHTML = `
      <div class="player-head">
        <div class="player-name"><span class="swatch" style="background:${player.color}"></span>${player.name}</div>
        <div>${pointsForPlayer(player)} VP</div>
      </div>
      <div class="tiny-stats">
        <span class="tiny-pill">${player.links.length} links</span>
        <span class="tiny-pill">${player.hubs.length} hubs</span>
        <span class="tiny-pill">${player.campuses.length} campuses</span>
        <span class="tiny-pill">${totalCards} cards</span>
        ${longest ? `<span class="tiny-pill">${longest}</span>` : ""}
      </div>
    `;
    playersList.appendChild(card);
  });
}

function renderResources() {
  resourceCards.innerHTML = "";
  if (!state.gameStarted) return;
  const player = state.phase === "main" ? currentPlayer() : getPlayer(state.setupQueue[state.setupIndex] || 0);
  Object.keys(RESOURCE_INFO).forEach((resource) => {
    const card = document.createElement("div");
    card.className = "resource-card";
    card.innerHTML = `
      <div class="head">
        <span>${RESOURCE_INFO[resource].label}</span>
        <span class="swatch" style="background:${RESOURCE_INFO[resource].color}"></span>
      </div>
      <div class="count">${player.resources[resource]}</div>
    `;
    resourceCards.appendChild(card);
  });
}

function renderLog() {
  gameLog.innerHTML = "";
  state.log.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.textContent = entry;
    gameLog.appendChild(div);
  });
}

function renderStatus() {
  if (!state.gameStarted) {
    phaseChip.textContent = "Setup";
    currentPlayerName.textContent = "No game running";
    currentTurnSummary.textContent = "Start a new game to generate the board and opening placements.";
    diceValue.textContent = "-";
    modeValue.textContent = "Waiting";
    instructionBox.textContent = "Opening placements follow snake order. Each player places 2 free AI hubs and 2 free network links.";
    return;
  }

  if (state.phase === "setup") {
    const player = getPlayer(state.setupQueue[state.setupIndex]);
    phaseChip.textContent = "Opening Placement";
    currentPlayerName.textContent = player.name;
    currentTurnSummary.textContent = state.pendingSetupType === "hub"
      ? "Place a free AI hub anywhere legal."
      : "Place a free network link touching that new hub.";
    diceValue.textContent = "-";
    modeValue.textContent = state.pendingSetupType === "hub" ? "Place Hub" : "Place Link";
    instructionBox.textContent = "No adjacent hubs are allowed, just like Catan. After each second placement, that player gains starting resources from adjacent producing hexes.";
    return;
  }

  const player = currentPlayer();
  phaseChip.textContent = state.winner !== null ? "Game Over" : `Turn ${state.turn}`;
  currentPlayerName.textContent = player.name;
  currentTurnSummary.textContent = state.mustMoveDisruption
    ? "Move the disruption onto a hex to block production and steal from an adjacent rival."
    : state.pendingSevenResolution
      ? "A disruption event was drawn. Resolve it, then continue the standard 7-roll sequence."
    : state.rolled
      ? "Build, trade, upgrade, or end your turn."
      : "Roll the dice to trigger production or disruption.";
  diceValue.textContent = state.dice ? `${state.dice.d1} + ${state.dice.d2} = ${state.dice.total}` : "-";
  modeValue.textContent = state.mode ? state.mode.replace(/([A-Z])/g, " $1") : (state.rolled ? "Main Actions" : "Awaiting Roll");

  if (state.winner !== null) {
    instructionBox.textContent = `${player.name} can still inspect the board, but the game is over. Start a new game to reset.`;
  } else if (state.mustMoveDisruption) {
    instructionBox.textContent = "Click any hex to move the disruption. That hex stops producing until the next disruption move.";
  } else if (state.pendingSevenResolution) {
    instructionBox.textContent = "Read the disruption event card, then continue to discards and disruption movement.";
  } else if (!state.rolled) {
    instructionBox.textContent = "Roll first. After that, you can build links, build hubs, upgrade to campuses, make 4:1 bank trades, or exchange resources with another player.";
  } else if (state.mode === "buildLink") {
    instructionBox.textContent = "Click an eligible board edge connected to your network to build a network link.";
  } else if (state.mode === "buildHub") {
    instructionBox.textContent = "Click an eligible intersection connected to your network. Hubs cannot be adjacent to other hubs or campuses.";
  } else if (state.mode === "buildCampus") {
    instructionBox.textContent = "Click one of your existing AI hubs to upgrade it to a mega campus.";
  } else {
    instructionBox.textContent = "Your move is open. Build out your engine, pressure the board, and trade smart before ending your turn.";
  }
}

function renderControls() {
  const canAct = state.gameStarted && state.phase === "main" && state.rolled && !state.winner && !state.mustMoveDisruption;
  document.getElementById("rollBtn").disabled = !state.gameStarted || state.phase !== "main" || state.rolled || state.winner;
  document.getElementById("endTurnBtn").disabled = !state.gameStarted || state.phase !== "main" || !state.rolled || state.mustMoveDisruption || state.winner;
  document.getElementById("buildLinkBtn").disabled = !canAct;
  document.getElementById("buildHubBtn").disabled = !canAct;
  document.getElementById("buildCampusBtn").disabled = !canAct;
  document.getElementById("cancelModeBtn").disabled = !(state.gameStarted && state.phase === "main" && state.mode);
  document.getElementById("tradeBtn").disabled = !canAct;
  playerTradeBtn.disabled = !canAct || playerTradeTarget.options.length === 0 || playerTradeTarget.value === "";
}

function render() {
  renderPlayerTradeTargets();
  renderBoard();
  renderPlayers();
  renderResources();
  renderLog();
  renderStatus();
  renderControls();
  renderCurrentEvent();
}

function renderCurrentEvent() {
  let panel = document.getElementById("currentEventPanel");
  if (!panel) {
    const host = document.querySelector(".stack:last-child");
    const wrapper = document.createElement("div");
    wrapper.className = "panel";
    wrapper.id = "currentEventPanel";
    wrapper.innerHTML = `
      <div class="panel-inner">
        <div class="section-label">Last Disruption Event</div>
        <div id="currentEventCard" class="event-card">
          <div class="event-eyebrow">No event yet</div>
          <div class="event-title">Stable market</div>
          <div class="event-body">Roll a 7 to reveal the first disruption event card.</div>
          <div class="event-impact">The regular disruption flow is still the main mechanical effect.</div>
        </div>
      </div>
    `;
    host.insertBefore(wrapper, host.lastElementChild);
    panel = wrapper;
  }

  const card = document.getElementById("currentEventCard");
  if (!state.currentEvent) {
    card.innerHTML = `
      <div class="event-eyebrow">No event yet</div>
      <div class="event-title">Stable market</div>
      <div class="event-body">Roll a 7 to reveal the first disruption event card.</div>
      <div class="event-impact">The regular disruption flow is still the main mechanical effect.</div>
    `;
    return;
  }

  card.innerHTML = `
    <div class="event-eyebrow">Disruption Event · ${state.currentEvent.year}</div>
    <div class="event-title">${state.currentEvent.title}</div>
    <div class="event-body">${state.currentEvent.body}</div>
    <div class="event-impact">${state.currentEvent.impact}</div>
  `;
}

document.getElementById("newGameBtn").addEventListener("click", startNewGame);
document.getElementById("resetNamesBtn").addEventListener("click", () => {
  renderSetupFields();
});
document.getElementById("rollBtn").addEventListener("click", rollDice);
document.getElementById("endTurnBtn").addEventListener("click", endTurn);
document.getElementById("buildLinkBtn").addEventListener("click", () => setMode("buildLink"));
document.getElementById("buildHubBtn").addEventListener("click", () => setMode("buildHub"));
document.getElementById("buildCampusBtn").addEventListener("click", () => setMode("buildCampus"));
document.getElementById("cancelModeBtn").addEventListener("click", () => {
  state.mode = null;
  render();
});
document.getElementById("tradeBtn").addEventListener("click", performTrade);
playerTradeBtn.addEventListener("click", performPlayerTrade);
overlayContinueBtn.addEventListener("click", closeHandoff);

discardGrid.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  handleDiscardAdjust(btn.dataset.resource, btn.dataset.action === "plus" ? 1 : -1);
});
discardConfirmBtn.addEventListener("click", confirmDiscard);
eventContinueBtn.addEventListener("click", () => {
  eventOverlay.classList.remove("show");
  beginDisruptionResolution();
  render();
});

initSelectors();
render();
