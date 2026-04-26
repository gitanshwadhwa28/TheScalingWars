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
const DISRUPTION_EVENTS = [
  {
    title: "System Outage Cascade",
    year: "2024 pattern",
    tags: ["Outage", "Vendor Risk"],
    body: "A single vendor failure ripples across airports, hospitals, and enterprise systems. Boards suddenly care about resilience more than speed.",
    impact: "The standard disruption flow still applies."
  },
  {
    title: "Prompt Injection Breach",
    year: "2026 pattern",
    tags: ["Security", "Model Behavior"],
    body: "A high-profile AI assistant is manipulated into unsafe output after a prompt-injection exploit. Trust drops overnight.",
    impact: "Resolve the normal disruption sequence, then move the marker."
  },
  {
    title: "Botched AI Rollout",
    year: "2024 pattern",
    tags: ["Product Failure", "Consumer Trust"],
    body: "A major customer-facing AI launch keeps making absurd mistakes and gets pulled back. Executives slam the brakes on deployment.",
    impact: "Discard if needed, then block a hex and pressure a rival."
  },
  {
    title: "Layoff Wave",
    year: "2026 pattern",
    tags: ["Restructuring", "Capital Shift"],
    body: "A new round of layoffs sweeps through the sector as companies redirect cash toward AI infrastructure.",
    impact: "The disruption marker represents the strategic whiplash and local production freeze."
  },
  {
    title: "Memory Price Spike",
    year: "Hardware frenzy",
    tags: ["Supply Chain", "Infrastructure"],
    body: "The datacenter rush sends component prices soaring. Build plans stall as suppliers struggle to keep up with AI demand.",
    impact: "Use the standard disruption flow to model the bottleneck."
  },
  {
    title: "Panic Pivot",
    year: "Market reaction",
    tags: ["Strategy Shift", "Narrative Shock"],
    body: "A company abruptly abandons its old roadmap and declares itself all-in on AI. Rivals scramble to match the narrative.",
    impact: "Treat the disruption marker as the sudden pivot freezing one part of the market."
  }
];

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
      resource: tileType === "regulatory" ? null : tileType,
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

function createRoomCode(existingCodes = new Set()) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (existingCodes.has(code));
  return code;
}

function createPlayerState(player, index) {
  return {
    id: player.id,
    socketId: player.socketId,
    name: player.name,
    color: player.color || PLAYER_COLORS[index],
    resources: { compute: 0, data: 0, chips: 0, talent: 0, capital: 0 },
    hubsLeft: 5,
    campusesLeft: 4,
    linksLeft: 15,
    hubs: [],
    campuses: [],
    links: [],
    setupHubsPlaced: 0
  };
}

function createGameState(players) {
  const gamePlayers = players.map((player, index) => createPlayerState(player, index));
  return {
    gameStarted: true,
    phase: "setup",
    players: gamePlayers,
    currentPlayer: 0,
    board: createBoard(),
    rolled: false,
    dice: null,
    setupQueue: [...gamePlayers.map((p) => p.id), ...gamePlayers.map((p) => p.id).reverse()],
    setupIndex: 0,
    pendingSetupType: "hub",
    setupLastIntersection: null,
    discardQueue: [],
    discardPlayer: null,
    pendingDiscard: null,
    mustMoveDisruption: false,
    pendingSevenResolution: false,
    currentEvent: null,
    log: ["Multiplayer game created. Opening placement has begun."],
    turn: 1,
    longestNetworkHolder: null,
    winner: null
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function pushLog(state, message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 40);
}

function getPlayer(state, id) {
  return state.players.find((player) => player.id === id);
}

function currentPlayer(state) {
  return state.players[state.currentPlayer];
}

function pointsForPlayer(state, player) {
  let score = player.hubs.length + player.campuses.length * 2;
  if (state.longestNetworkHolder === player.id) score += 2;
  return score;
}

function checkWinner(state) {
  const winner = state.players.find((player) => pointsForPlayer(state, player) >= 10);
  if (winner) {
    state.winner = winner.id;
    pushLog(state, `${winner.name} reached 10 victory points and won the AI race.`);
  }
}

function totalResources(player) {
  return Object.values(player.resources).reduce((sum, count) => sum + count, 0);
}

function structureAt(state, intersectionId) {
  return state.board.intersections[intersectionId].structure;
}

function hasNeighborStructure(state, intersectionId) {
  const point = state.board.intersections[intersectionId];
  return point.edges.some((edgeId) => {
    const edge = state.board.edges[edgeId];
    const otherId = edge.a === intersectionId ? edge.b : edge.a;
    return Boolean(structureAt(state, otherId));
  });
}

function edgeTouchesPlayer(state, edge, playerId) {
  const pointA = state.board.intersections[edge.a];
  const pointB = state.board.intersections[edge.b];
  const structureA = pointA.structure;
  const structureB = pointB.structure;
  if (structureA && structureA.owner === playerId) return true;
  if (structureB && structureB.owner === playerId) return true;
  return [pointA, pointB].some((point) => point.edges.some((edgeId) => state.board.edges[edgeId].owner === playerId));
}

function canBuildEdge(state, edgeId, playerId, setup = false) {
  const edge = state.board.edges[edgeId];
  if (!edge || edge.owner !== null) return false;
  if (setup) {
    return edge.a === state.setupLastIntersection || edge.b === state.setupLastIntersection;
  }
  return edgeTouchesPlayer(state, edge, playerId);
}

function canBuildHub(state, intersectionId, playerId, setup = false) {
  const point = state.board.intersections[intersectionId];
  if (!point || point.structure) return false;
  if (hasNeighborStructure(state, intersectionId)) return false;
  if (setup) return true;
  return point.edges.some((edgeId) => state.board.edges[edgeId].owner === playerId);
}

function canUpgradeCampus(state, intersectionId, playerId) {
  const structure = structureAt(state, intersectionId);
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

function buildEdge(state, edgeId, playerId, free = false) {
  const player = getPlayer(state, playerId);
  if (!player) return false;
  if (!free) {
    if (player.linksLeft <= 0) return false;
    if (!payCost(player, { compute: 1, chips: 1 })) return false;
  }
  const edge = state.board.edges[edgeId];
  edge.owner = playerId;
  player.links.push(edgeId);
  player.linksLeft -= 1;
  updateLongestNetwork(state);
  return true;
}

function buildHub(state, intersectionId, playerId, free = false) {
  const player = getPlayer(state, playerId);
  if (!player || player.hubsLeft <= 0) return false;
  if (!free && !payCost(player, { compute: 1, data: 1, talent: 1, capital: 1 })) return false;
  state.board.intersections[intersectionId].structure = { owner: playerId, type: "hub" };
  player.hubs.push(intersectionId);
  player.hubsLeft -= 1;
  return true;
}

function upgradeCampus(state, intersectionId, playerId) {
  const player = getPlayer(state, playerId);
  if (!player || player.campusesLeft <= 0) return false;
  if (!payCost(player, { talent: 2, capital: 3 })) return false;
  state.board.intersections[intersectionId].structure = { owner: playerId, type: "campus" };
  player.hubs = player.hubs.filter((id) => id !== intersectionId);
  player.campuses.push(intersectionId);
  player.campusesLeft -= 1;
  player.hubsLeft += 1;
  return true;
}

function grantSecondPlacementResources(state, playerId, intersectionId) {
  const player = getPlayer(state, playerId);
  const point = state.board.intersections[intersectionId];
  point.adjacentTiles.forEach((tileId) => {
    const tile = state.board.tiles[tileId];
    if (tile.resource && tile.id !== state.board.disruptionTileId) {
      addResource(player, tile.resource, 1);
    }
  });
}

function nextSetupStep(state) {
  if (state.pendingSetupType === "hub") {
    state.pendingSetupType = "link";
    return;
  }

  const player = getPlayer(state, state.setupQueue[state.setupIndex]);
  if (player.setupHubsPlaced === 2) {
    grantSecondPlacementResources(state, player.id, state.setupLastIntersection);
    pushLog(state, `${player.name} gained starting resources from the second AI hub.`);
  }

  state.setupIndex += 1;
  state.pendingSetupType = "hub";
  state.setupLastIntersection = null;

  if (state.setupIndex >= state.setupQueue.length) {
    state.phase = "main";
    state.currentPlayer = 0;
    pushLog(state, `${currentPlayer(state).name} begins turn 1.`);
  }
}

function longestPathForPlayer(state, playerId) {
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

function updateLongestNetwork(state) {
  let best = { holder: null, length: 0 };
  state.players.forEach((player) => {
    const length = longestPathForPlayer(state, player.id);
    if (length >= 5 && length > best.length) {
      best = { holder: player.id, length };
    }
  });
  state.longestNetworkHolder = best.holder;
}

function distributeResources(state, total) {
  const gains = new Map();
  state.board.tiles.forEach((tile) => {
    if (tile.number !== total || tile.id === state.board.disruptionTileId || !tile.resource) return;
    tile.points.forEach((intersectionId) => {
      const structure = structureAt(state, intersectionId);
      if (!structure) return;
      const amount = structure.type === "campus" ? 2 : 1;
      if (!gains.has(structure.owner)) gains.set(structure.owner, {});
      gains.get(structure.owner)[tile.resource] = (gains.get(structure.owner)[tile.resource] || 0) + amount;
    });
  });

  gains.forEach((resourceMap, playerId) => {
    const player = getPlayer(state, playerId);
    Object.entries(resourceMap).forEach(([resource, amount]) => addResource(player, resource, amount));
    const summary = Object.entries(resourceMap).map(([resource, amount]) => `${amount} ${resource}`).join(", ");
    pushLog(state, `${player.name} gained ${summary}.`);
  });

  if (gains.size === 0) pushLog(state, `Rolled ${total}. No resources were produced.`);
}

function beginDisruptionResolution(state) {
  state.pendingSevenResolution = false;
  state.discardQueue = state.players.filter((player) => totalResources(player) > 7).map((player) => player.id);
  if (state.discardQueue.length > 0) {
    state.discardPlayer = state.discardQueue.shift();
  } else {
    state.mustMoveDisruption = true;
  }
}

function resolveDiscardIfDone(state) {
  if (state.discardQueue.length > 0) {
    state.discardPlayer = state.discardQueue.shift();
  } else {
    state.discardPlayer = null;
    state.mustMoveDisruption = true;
  }
}

function eligibleVictimsForTile(state, tileId, activePlayerId) {
  const victims = new Set();
  state.board.tiles[tileId].points.forEach((intersectionId) => {
    const structure = structureAt(state, intersectionId);
    if (structure && structure.owner !== activePlayerId && totalResources(getPlayer(state, structure.owner)) > 0) {
      victims.add(structure.owner);
    }
  });
  return Array.from(victims);
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function moveDisruption(state, tileId) {
  state.board.disruptionTileId = tileId;
  const victims = eligibleVictimsForTile(state, tileId, currentPlayer(state).id);
  if (victims.length > 0) {
    const victimId = randomChoice(victims);
    const victim = getPlayer(state, victimId);
    const pool = Object.entries(victim.resources).flatMap(([resource, count]) => Array.from({ length: count }, () => resource));
    if (pool.length > 0) {
      const stolen = randomChoice(pool);
      victim.resources[stolen] -= 1;
      currentPlayer(state).resources[stolen] += 1;
      pushLog(state, `${currentPlayer(state).name} moved the disruption and stole 1 ${stolen} from ${victim.name}.`);
    }
  } else {
    pushLog(state, `${currentPlayer(state).name} moved the disruption, but no rival had resources to steal.`);
  }
  state.mustMoveDisruption = false;
}

function applyAction(state, actorId, action) {
  const next = cloneState(state);
  const actor = getPlayer(next, actorId);
  if (!actor) {
    return { ok: false, error: "Player not found." };
  }

  try {
    switch (action.type) {
      case "PLACE_SETUP_HUB": {
        if (next.phase !== "setup" || next.pendingSetupType !== "hub") throw new Error("It is not time to place a hub.");
        if (next.setupQueue[next.setupIndex] !== actorId) throw new Error("It is not your setup turn.");
        if (!canBuildHub(next, action.intersectionId, actorId, true)) throw new Error("Invalid hub placement.");
        buildHub(next, action.intersectionId, actorId, true);
        actor.setupHubsPlaced += 1;
        next.setupLastIntersection = action.intersectionId;
        pushLog(next, `${actor.name} placed a free AI hub.`);
        nextSetupStep(next);
        return finalize(next);
      }

      case "PLACE_SETUP_LINK": {
        if (next.phase !== "setup" || next.pendingSetupType !== "link") throw new Error("It is not time to place a link.");
        if (next.setupQueue[next.setupIndex] !== actorId) throw new Error("It is not your setup turn.");
        if (!canBuildEdge(next, action.edgeId, actorId, true)) throw new Error("Invalid link placement.");
        buildEdge(next, action.edgeId, actorId, true);
        pushLog(next, `${actor.name} placed a free network link.`);
        nextSetupStep(next);
        return finalize(next);
      }

      case "ROLL_DICE": {
        if (next.phase !== "main") throw new Error("The game is not in the main phase.");
        if (currentPlayer(next).id !== actorId) throw new Error("It is not your turn.");
        if (next.rolled) throw new Error("Dice have already been rolled.");
        const d1 = action.d1 || (1 + Math.floor(Math.random() * 6));
        const d2 = action.d2 || (1 + Math.floor(Math.random() * 6));
        const total = d1 + d2;
        next.dice = { d1, d2, total };
        next.rolled = true;
        if (total === 7) {
          next.currentEvent = randomChoice(DISRUPTION_EVENTS);
          next.pendingSevenResolution = true;
          pushLog(next, `${actor.name} rolled a 7. Disruption triggered: ${next.currentEvent.title}.`);
        } else {
          distributeResources(next, total);
        }
        return finalize(next);
      }

      case "ACKNOWLEDGE_EVENT": {
        if (currentPlayer(next).id !== actorId) throw new Error("It is not your turn.");
        if (!next.pendingSevenResolution) throw new Error("There is no pending event.");
        beginDisruptionResolution(next);
        return finalize(next);
      }

      case "DISCARD_RESOURCES": {
        if (next.discardPlayer !== actorId) throw new Error("You are not the active discard player.");
        const player = actor;
        const required = Math.floor(totalResources(player) / 2);
        const selections = action.resources || {};
        const selected = Object.values(selections).reduce((sum, value) => sum + value, 0);
        if (selected !== required) throw new Error("Discard amount is incorrect.");
        Object.entries(selections).forEach(([resource, amount]) => {
          if ((player.resources[resource] || 0) < amount) throw new Error("Discard selection exceeds available resources.");
        });
        Object.entries(selections).forEach(([resource, amount]) => {
          player.resources[resource] -= amount;
        });
        pushLog(next, `${player.name} discarded ${required} resources.`);
        resolveDiscardIfDone(next);
        return finalize(next);
      }

      case "MOVE_DISRUPTION": {
        if (currentPlayer(next).id !== actorId) throw new Error("It is not your turn.");
        if (!next.mustMoveDisruption) throw new Error("The disruption is not waiting to be moved.");
        moveDisruption(next, action.tileId);
        return finalize(next);
      }

      case "BUILD_LINK": {
        if (currentPlayer(next).id !== actorId || !next.rolled || next.mustMoveDisruption) throw new Error("You cannot build right now.");
        if (!canBuildEdge(next, action.edgeId, actorId, false)) throw new Error("Invalid link build.");
        if (!buildEdge(next, action.edgeId, actorId, false)) throw new Error("Insufficient resources for link.");
        pushLog(next, `${actor.name} built a network link.`);
        checkWinner(next);
        return finalize(next);
      }

      case "BUILD_HUB": {
        if (currentPlayer(next).id !== actorId || !next.rolled || next.mustMoveDisruption) throw new Error("You cannot build right now.");
        if (!canBuildHub(next, action.intersectionId, actorId, false)) throw new Error("Invalid hub build.");
        if (!buildHub(next, action.intersectionId, actorId, false)) throw new Error("Insufficient resources for hub.");
        pushLog(next, `${actor.name} built an AI hub.`);
        checkWinner(next);
        return finalize(next);
      }

      case "BUILD_CAMPUS": {
        if (currentPlayer(next).id !== actorId || !next.rolled || next.mustMoveDisruption) throw new Error("You cannot build right now.");
        if (!canUpgradeCampus(next, action.intersectionId, actorId)) throw new Error("Invalid campus upgrade.");
        if (!upgradeCampus(next, action.intersectionId, actorId)) throw new Error("Insufficient resources for campus.");
        pushLog(next, `${actor.name} upgraded an AI hub into a mega campus.`);
        checkWinner(next);
        return finalize(next);
      }

      case "BANK_TRADE": {
        if (currentPlayer(next).id !== actorId || !next.rolled || next.mustMoveDisruption) throw new Error("You cannot trade right now.");
        const { from, to } = action;
        if (!from || !to || from === to) throw new Error("Invalid bank trade.");
        if (actor.resources[from] < 4) throw new Error("Not enough resources for bank trade.");
        actor.resources[from] -= 4;
        actor.resources[to] += 1;
        pushLog(next, `${actor.name} traded 4 ${from} for 1 ${to}.`);
        return finalize(next);
      }

      case "PLAYER_TRADE": {
        if (currentPlayer(next).id !== actorId || !next.rolled || next.mustMoveDisruption) throw new Error("You cannot trade right now.");
        const target = getPlayer(next, action.targetPlayerId);
        if (!target || target.id === actorId) throw new Error("Invalid trade target.");
        const giveAmount = Math.max(1, Number(action.giveAmount || 1));
        const getAmount = Math.max(1, Number(action.getAmount || 1));
        if (actor.resources[action.giveResource] < giveAmount) throw new Error("Not enough resources to offer.");
        if (target.resources[action.getResource] < getAmount) throw new Error("Target does not have enough resources.");
        actor.resources[action.giveResource] -= giveAmount;
        target.resources[action.giveResource] += giveAmount;
        target.resources[action.getResource] -= getAmount;
        actor.resources[action.getResource] += getAmount;
        pushLog(next, `${actor.name} traded ${giveAmount} ${action.giveResource} to ${target.name} for ${getAmount} ${action.getResource}.`);
        return finalize(next);
      }

      case "END_TURN": {
        if (currentPlayer(next).id !== actorId) throw new Error("It is not your turn.");
        if (!next.rolled || next.mustMoveDisruption || next.pendingSevenResolution || next.discardPlayer) throw new Error("Turn cannot end yet.");
        next.currentPlayer = (next.currentPlayer + 1) % next.players.length;
        if (next.currentPlayer === 0) next.turn += 1;
        next.rolled = false;
        next.dice = null;
        pushLog(next, `${currentPlayer(next).name} begins turn ${next.turn}.`);
        return finalize(next);
      }

      default:
        throw new Error("Unknown action.");
    }
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function finalize(state) {
  return { ok: true, state };
}

module.exports = {
  PLAYER_COLORS,
  TILE_BAG,
  NUMBER_TOKENS,
  DISRUPTION_EVENTS,
  createBoard,
  createRoomCode,
  createGameState,
  applyAction,
  pointsForPlayer
};
