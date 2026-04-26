const socket = io();

const RESOURCE_INFO = {
  compute: { label: "Compute", color: "#ff8a3d" },
  data: { label: "Data", color: "#57a4ff" },
  chips: { label: "Chips", color: "#ba8cff" },
  talent: { label: "Talent", color: "#4ce0b3" },
  capital: { label: "Capital", color: "#ffd166" }
};

const TILE_DEFS = {
  compute: { short: "Compute", color: "#ff8a3d" },
  data: { short: "Data", color: "#57a4ff" },
  chips: { short: "Chips", color: "#ba8cff" },
  talent: { short: "Talent", color: "#4ce0b3" },
  capital: { short: "Capital", color: "#ffd166" },
  regulatory: { short: "Regulatory", color: "#ff5d73" }
};

const createName = document.getElementById("createName");
const joinName = document.getElementById("joinName");
const joinCode = document.getElementById("joinCode");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const readyBtn = document.getElementById("readyBtn");
const startGameBtn = document.getElementById("startGameBtn");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatInput = document.getElementById("chatInput");
const roomCodeEl = document.getElementById("roomCode");
const playersList = document.getElementById("playersList");
const gameStateCard = document.getElementById("gameStateCard");
const chatLog = document.getElementById("chatLog");
const connectionStatus = document.getElementById("connectionStatus");
const onlineBoard = document.getElementById("onlineBoard");
const voiceStatus = document.getElementById("voiceStatus");
const voiceParticipants = document.getElementById("voiceParticipants");
const joinVoiceBtn = document.getElementById("joinVoiceBtn");
const leaveVoiceBtn = document.getElementById("leaveVoiceBtn");
const muteVoiceBtn = document.getElementById("muteVoiceBtn");
const rollDiceBtn = document.getElementById("rollDiceBtn");
const buildLinkBtn = document.getElementById("buildLinkBtn");
const buildHubBtn = document.getElementById("buildHubBtn");
const buildCampusBtn = document.getElementById("buildCampusBtn");
const cancelActionBtn = document.getElementById("cancelActionBtn");
const ackEventBtn = document.getElementById("ackEventBtn");
const discardBtn = document.getElementById("discardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const resourceSummary = document.getElementById("resourceSummary");
const bankTradeFrom = document.getElementById("bankTradeFrom");
const bankTradeTo = document.getElementById("bankTradeTo");
const bankTradeBtn = document.getElementById("bankTradeBtn");
const playerTradeTarget = document.getElementById("playerTradeTarget");
const playerTradeGiveResource = document.getElementById("playerTradeGiveResource");
const playerTradeGiveAmount = document.getElementById("playerTradeGiveAmount");
const playerTradeGetResource = document.getElementById("playerTradeGetResource");
const playerTradeGetAmount = document.getElementById("playerTradeGetAmount");
const playerTradeBtn = document.getElementById("playerTradeBtn");
const tradeOverlay = document.getElementById("tradeOverlay");
const tradeOfferBody = document.getElementById("tradeOfferBody");
const acceptTradeBtn = document.getElementById("acceptTradeBtn");
const declineTradeBtn = document.getElementById("declineTradeBtn");

let roomState = null;
let socketId = null;
let selectedMode = null;
let voiceUiState = {
  joined: false,
  muted: false,
  activeRoomCode: null
};

const voiceController = window.createVoiceController({
  socket,
  request,
  getRoomState: () => roomState,
  onStatusChange: (state) => {
    voiceUiState = state;
    renderVoicePanel();
  },
  onError: (error) => {
    alert(error.message || "Voice chat hit an error.");
  }
});

function setStatus(text) {
  connectionStatus.textContent = text;
}

function request(event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });
}

function gameState() {
  return roomState ? roomState.gameState : null;
}

function selfPlayer() {
  if (!roomState || !gameState()) return null;
  return gameState().players.find((player) => player.id === roomState.selfId) || null;
}

function currentPlayer() {
  const state = gameState();
  return state ? state.players[state.currentPlayer] : null;
}

function isMyTurn() {
  const current = currentPlayer();
  return Boolean(current && roomState && current.id === roomState.selfId);
}

function canAct() {
  const state = gameState();
  return Boolean(state && isMyTurn() && state.phase === "main" && state.rolled && !state.mustMoveDisruption && !state.pendingSevenResolution && !state.discardPlayer && !state.winner && !roomState?.pendingTrade);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function populateTradeSelects() {
  [bankTradeFrom, bankTradeTo, playerTradeGiveResource, playerTradeGetResource].forEach((select) => {
    if (select.options.length) return;
    Object.entries(RESOURCE_INFO).forEach(([key, value]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = value.label;
      select.appendChild(opt);
    });
  });
  bankTradeFrom.value = "compute";
  bankTradeTo.value = "data";
  playerTradeGiveResource.value = "compute";
  playerTradeGetResource.value = "data";
}

function renderRoom() {
  populateTradeSelects();
  roomCodeEl.textContent = roomState ? roomState.code : "No room joined";
  readyBtn.disabled = !roomState;
  const started = Boolean(roomState && roomState.gameState);
  document.body.classList.toggle("game-started", started);
  startGameBtn.style.display = started ? "none" : "inline-flex";
  startGameBtn.disabled = !roomState || started || roomState.selfId !== roomState.hostId || roomState.players.length < 3 || roomState.players.length > 4;

  playersList.innerHTML = "";
  if (!roomState) {
    playersList.innerHTML = `<div class="game-state-card"><div class="body">No room joined yet.</div></div>`;
  } else {
    roomState.players.forEach((player) => {
      const el = document.createElement("div");
      el.className = "player-card";
      el.innerHTML = `
        <div class="player-meta">
          <span class="swatch" style="background:${player.color}"></span>
          <strong>${player.name}</strong>
        </div>
        <div class="player-tags">
          ${player.isHost ? '<span class="tag">Host</span>' : ""}
          ${player.ready ? '<span class="tag">Ready</span>' : ""}
          ${player.isSelf ? '<span class="tag">You</span>' : ""}
        </div>
      `;
      playersList.appendChild(el);
    });
  }

  renderGameStateCard();
  renderChat();
  renderResources();
  renderTradeTargets();
  renderControls();
  renderBoard();
  renderTradeOverlay();
  renderVoicePanel();
}

function renderGameStateCard() {
  const state = gameState();
  if (!roomState || !state) {
    gameStateCard.innerHTML = `
      <div class="title">Lobby waiting</div>
      <div class="body">Create or join a room to begin. When the host starts the game, the server initializes the shared board and turn state.</div>
    `;
    return;
  }

  const active = currentPlayer();
  const me = selfPlayer();
  const isSetup = state.phase === "setup";
  const setupPlayer = isSetup ? state.players.find((player) => player.id === state.setupQueue[state.setupIndex]) : null;
  const diceText = state.dice ? `${state.dice.d1} + ${state.dice.d2} = ${state.dice.total}` : "Not rolled yet";
  const modeText = isSetup
    ? `Opening placement · ${state.pendingSetupType === "hub" ? "Place hub" : "Place link"}`
    : state.mustMoveDisruption
      ? "Move disruption"
      : state.pendingSevenResolution
        ? "Resolve disruption event"
        : state.discardPlayer
          ? "Discard resources"
          : state.rolled
            ? "Main actions"
            : "Awaiting roll";

  let body = `
    <strong>Phase:</strong> ${state.phase}<br>
    <strong>Turn:</strong> ${state.turn}<br>
    <strong>Active player:</strong> ${active ? active.name : "Unknown"}<br>
    <strong>Mode:</strong> ${modeText}<br>
    <strong>Dice:</strong> ${diceText}<br>
  `;

  if (isSetup && setupPlayer) {
    body += `<br><strong>Setup player:</strong> ${setupPlayer.name}`;
    body += `<br><strong>Setup action:</strong> ${state.pendingSetupType === "hub" ? "Place a free AI hub" : "Place a free network link"}`;
  } else if (roomState.pendingTrade) {
    if (roomState.pendingTrade.targetPlayerId === roomState.selfId) {
      body += `<br><strong>Trade offer:</strong> Waiting on your response`;
    } else if (roomState.pendingTrade.proposerId === roomState.selfId) {
      body += `<br><strong>Trade offer:</strong> Waiting on ${roomState.pendingTrade.targetPlayerName}`;
    } else {
      body += `<br><strong>Trade offer:</strong> ${roomState.pendingTrade.proposerName} → ${roomState.pendingTrade.targetPlayerName}`;
    }
  } else if (state.pendingSevenResolution && state.currentEvent) {
    body += `<br><strong>Disruption Event:</strong> ${state.currentEvent.title}`;
  } else if (state.discardPlayer === roomState.selfId) {
    body += `<br><strong>Waiting on:</strong> Your discard selection`;
  } else if (state.discardPlayer) {
    const discardPlayer = state.players.find((player) => player.id === state.discardPlayer);
    body += `<br><strong>Waiting on:</strong> ${discardPlayer ? discardPlayer.name : "Player"} to discard`;
  } else if (state.mustMoveDisruption) {
    body += `<br><strong>Waiting on:</strong> Disruption move`;
  } else if (me) {
    body += `<br><strong>Your VP:</strong> ${pointsForPlayer(state, me)}`;
  }

  if (state.currentEvent && !state.pendingSevenResolution) {
    body += `<br><strong>Last event:</strong> ${state.currentEvent.title}`;
  }

  gameStateCard.innerHTML = `
    <div class="title">${state.winner ? "Game Over" : "Live room state"}</div>
    <div class="body">${body}</div>
  `;
}

function pointsForPlayer(state, player) {
  let score = player.hubs.length + player.campuses.length * 2;
  if (state.longestNetworkHolder === player.id) score += 2;
  return score;
}

function renderChat() {
  chatLog.innerHTML = "";
  const messages = roomState ? roomState.chat : [];
  messages.forEach((message) => {
    const el = document.createElement("div");
    el.className = `chat-message ${message.kind === "system" ? "system" : ""}`;
    const label = message.kind === "system" ? "System" : message.playerName;
    const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    el.innerHTML = `
      <div class="chat-meta">${label} · ${time}</div>
      <div class="chat-text">${escapeHtml(message.text)}</div>
    `;
    chatLog.appendChild(el);
  });
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderResources() {
  resourceSummary.innerHTML = "";
  const me = selfPlayer();
  Object.entries(RESOURCE_INFO).forEach(([resource, info]) => {
    const count = me ? me.resources[resource] : 0;
    const card = document.createElement("div");
    card.className = "resource-pill";
    card.innerHTML = `
      <div class="name">${info.label}</div>
      <div class="count" style="color:${info.color};">${count}</div>
    `;
    resourceSummary.appendChild(card);
  });
}

function renderTradeTargets() {
  const previous = playerTradeTarget.value;
  playerTradeTarget.innerHTML = "";
  if (!roomState || !gameState()) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No room";
    playerTradeTarget.appendChild(opt);
    return;
  }
  roomState.players.filter((player) => !player.isSelf).forEach((player) => {
    const opt = document.createElement("option");
    opt.value = player.id;
    opt.textContent = player.name;
    playerTradeTarget.appendChild(opt);
  });
  if ([...playerTradeTarget.options].some((opt) => opt.value === previous)) {
    playerTradeTarget.value = previous;
  }
}

function renderControls() {
  const state = gameState();
  rollDiceBtn.disabled = !state || !isMyTurn() || state.phase !== "main" || state.rolled || Boolean(state.winner);
  buildLinkBtn.disabled = !canAct();
  buildHubBtn.disabled = !canAct();
  buildCampusBtn.disabled = !canAct();
  cancelActionBtn.disabled = !selectedMode;
  ackEventBtn.disabled = !state || !isMyTurn() || !state.pendingSevenResolution;
  discardBtn.disabled = !state || state.discardPlayer !== roomState?.selfId;
  endTurnBtn.disabled = !state || !isMyTurn() || !state.rolled || state.mustMoveDisruption || state.pendingSevenResolution || Boolean(state.discardPlayer) || Boolean(state.winner);
  bankTradeBtn.disabled = !canAct();
  playerTradeBtn.disabled = !canAct() || !playerTradeTarget.value;

  [buildLinkBtn, buildHubBtn, buildCampusBtn].forEach((button) => button.classList.remove("active-mode"));
  if (selectedMode === "BUILD_LINK") buildLinkBtn.classList.add("active-mode");
  if (selectedMode === "BUILD_HUB") buildHubBtn.classList.add("active-mode");
  if (selectedMode === "BUILD_CAMPUS") buildCampusBtn.classList.add("active-mode");
}

function renderTradeOverlay() {
  const pending = roomState?.pendingTrade;
  if (!pending || pending.targetPlayerId !== roomState?.selfId) {
    tradeOverlay.classList.remove("show");
    return;
  }

  tradeOfferBody.innerHTML = `
    <strong>${pending.proposerName}</strong> is offering you
    <strong>${pending.giveAmount} ${pending.giveResource}</strong>
    in exchange for
    <strong>${pending.getAmount} ${pending.getResource}</strong>.
  `;
  tradeOverlay.classList.add("show");
}

function renderVoicePanel() {
  const inRoom = Boolean(roomState);
  const activeRoomCode = roomState ? roomState.code : null;
  const joinedHere = voiceUiState.joined && voiceUiState.activeRoomCode === activeRoomCode;

  voiceStatus.textContent = joinedHere
    ? `Voice live${voiceUiState.muted ? " · muted" : ""}`
    : "Voice offline";
  voiceStatus.classList.toggle("live", joinedHere);

  joinVoiceBtn.disabled = !inRoom || joinedHere;
  leaveVoiceBtn.disabled = !joinedHere;
  muteVoiceBtn.disabled = !joinedHere;
  muteVoiceBtn.textContent = voiceUiState.muted ? "Unmute" : "Mute";

  const participants = roomState?.voiceParticipants || [];
  voiceParticipants.innerHTML = "";
  if (!participants.length) {
    voiceParticipants.innerHTML = `<div class="voice-empty">Nobody is connected to room voice yet.</div>`;
    return;
  }

  participants.forEach((participant) => {
    const item = document.createElement("div");
    item.className = "voice-user";
    item.innerHTML = `
      <div class="voice-user-meta">
        <span class="voice-dot"></span>
        <div>
          <div class="voice-user-name">${participant.playerName}${participant.isSelf ? " (You)" : ""}</div>
          <div class="voice-user-state">${participant.muted ? "Muted" : "Live audio"}</div>
        </div>
      </div>
      <span class="tag">${participant.muted ? "Muted" : "On mic"}</span>
    `;
    voiceParticipants.appendChild(item);
  });
}

function renderBoard() {
  const state = gameState();
  onlineBoard.innerHTML = "";
  if (!state) return;

  state.board.tiles.forEach((tile) => {
    const def = TILE_DEFS[tile.type];
    const points = tile.points.map((pointId) => {
      const point = state.board.intersections[pointId];
      return `${point.x},${point.y}`;
    }).join(" ");

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", points);
    poly.setAttribute("fill", def.color);
    poly.setAttribute("fill-opacity", tile.id === state.board.disruptionTileId ? "0.56" : "0.25");
    poly.setAttribute("stroke", tile.id === state.board.disruptionTileId ? "#ffd2d9" : "rgba(255,255,255,0.16)");
    poly.setAttribute("stroke-width", tile.id === state.board.disruptionTileId ? "4" : "2");
    if (state.mustMoveDisruption && isMyTurn()) {
      poly.style.cursor = "pointer";
      poly.addEventListener("click", () => sendGameAction({ type: "MOVE_DISRUPTION", tileId: tile.id }));
    }
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

    const token = document.createElementNS("http://www.w3.org/2000/svg", "text");
    token.setAttribute("x", tile.x);
    token.setAttribute("y", tile.y + 27);
    token.setAttribute("fill", tile.number === 6 || tile.number === 8 ? "#ffb0be" : "#f7fbff");
    token.setAttribute("font-size", tile.number ? "22" : "18");
    token.setAttribute("text-anchor", "middle");
    token.setAttribute("font-weight", "800");
    token.textContent = tile.number || "Disruption";
    group.appendChild(token);
    onlineBoard.appendChild(group);
  });

  state.board.edges.forEach((edge) => {
    const a = state.board.intersections[edge.a];
    const b = state.board.intersections[edge.b];
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    const owner = state.players.find((player) => player.id === edge.owner);
    line.setAttribute("stroke", owner ? owner.color : "rgba(255,255,255,0.14)");
    line.setAttribute("stroke-width", owner ? "8" : "5");
    line.setAttribute("stroke-linecap", "round");
    if ((state.phase === "setup" && state.setupQueue[state.setupIndex] === roomState.selfId && state.pendingSetupType === "link") || selectedMode === "BUILD_LINK") {
      line.style.cursor = "pointer";
      line.addEventListener("click", () => {
        if (state.phase === "setup") {
          sendGameAction({ type: "PLACE_SETUP_LINK", edgeId: edge.id });
        } else if (selectedMode === "BUILD_LINK") {
          sendGameAction({ type: "BUILD_LINK", edgeId: edge.id });
        }
      });
    }
    onlineBoard.appendChild(line);
  });

  state.board.intersections.forEach((point) => {
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hit.setAttribute("cx", point.x);
    hit.setAttribute("cy", point.y);
    hit.setAttribute("r", point.structure ? 11 : 8);
    const owner = point.structure ? state.players.find((player) => player.id === point.structure.owner) : null;
    hit.setAttribute("fill", owner ? owner.color : "rgba(255,255,255,0.18)");
    hit.setAttribute("stroke", point.structure ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.12)");
    hit.setAttribute("stroke-width", point.structure ? "2" : "1.5");
    if ((state.phase === "setup" && state.setupQueue[state.setupIndex] === roomState.selfId && state.pendingSetupType === "hub") || selectedMode === "BUILD_HUB" || selectedMode === "BUILD_CAMPUS") {
      hit.style.cursor = "pointer";
      hit.addEventListener("click", () => {
        if (state.phase === "setup") {
          sendGameAction({ type: "PLACE_SETUP_HUB", intersectionId: point.id });
        } else if (selectedMode === "BUILD_HUB") {
          sendGameAction({ type: "BUILD_HUB", intersectionId: point.id });
        } else if (selectedMode === "BUILD_CAMPUS") {
          sendGameAction({ type: "BUILD_CAMPUS", intersectionId: point.id });
        }
      });
    }
    onlineBoard.appendChild(hit);
  });
}

async function sendGameAction(action) {
  if (!roomState) return;
  const result = await request("game:action", { roomCode: roomState.code, action });
  if (!result.ok) {
    alert(result.error || "Action failed.");
    return;
  }
  if (!["BUILD_LINK", "BUILD_HUB", "BUILD_CAMPUS"].includes(action.type)) return;
  selectedMode = null;
  renderControls();
}

async function createRoom() {
  const playerName = createName.value.trim() || "Host";
  const result = await request("room:create", { playerName });
  if (!result.ok) return alert(result.error || "Unable to create room.");
  roomState = result.room;
  renderRoom();
}

async function joinRoom() {
  const playerName = joinName.value.trim() || "Player";
  const roomCode = joinCode.value.trim().toUpperCase();
  const result = await request("room:join", { playerName, roomCode });
  if (!result.ok) return alert(result.error || "Unable to join room.");
  roomState = result.room;
  renderRoom();
}

async function toggleReady() {
  if (!roomState) return;
  const result = await request("room:toggle-ready", { roomCode: roomState.code });
  if (!result.ok) alert(result.error || "Unable to toggle ready.");
}

async function startGame() {
  if (!roomState) return;
  const result = await request("game:start", { roomCode: roomState.code });
  if (!result.ok) alert(result.error || "Unable to start the game.");
}

async function sendChat() {
  if (!roomState) return;
  const text = chatInput.value.trim();
  if (!text) return;
  const result = await request("chat:send", { roomCode: roomState.code, text });
  if (!result.ok) return alert(result.error || "Unable to send message.");
  chatInput.value = "";
}

async function submitDiscard() {
  const me = selfPlayer();
  if (!me) return;
  const required = Math.floor(Object.values(me.resources).reduce((sum, count) => sum + count, 0) / 2);
  const raw = prompt(
    `Discard exactly ${required} resources as JSON.\nExample: {"compute":1,"data":1}`,
    "{}"
  );
  if (raw === null) return;
  let resources;
  try {
    resources = JSON.parse(raw);
  } catch {
    alert("Discard must be valid JSON.");
    return;
  }
  const result = await request("game:action", { roomCode: roomState.code, action: { type: "DISCARD_RESOURCES", resources } });
  if (!result.ok) alert(result.error || "Discard failed.");
}

async function doBankTrade() {
  await sendGameAction({ type: "BANK_TRADE", from: bankTradeFrom.value, to: bankTradeTo.value });
}

async function doPlayerTrade() {
  if (!roomState) return;
  const result = await request("trade:offer", {
    roomCode: roomState.code,
    offer: {
      targetPlayerId: playerTradeTarget.value,
      giveResource: playerTradeGiveResource.value,
      giveAmount: Number(playerTradeGiveAmount.value || 1),
      getResource: playerTradeGetResource.value,
      getAmount: Number(playerTradeGetAmount.value || 1)
    }
  });
  if (!result.ok) {
    alert(result.error || "Trade offer failed.");
  }
}

async function respondToTrade(accept) {
  if (!roomState) return;
  const result = await request("trade:respond", { roomCode: roomState.code, accept });
  if (!result.ok && result.error) {
    alert(result.error);
  }
}

socket.on("connect", () => setStatus("Connected"));
socket.on("disconnect", () => {
  setStatus("Disconnected");
  voiceController.leave({ silent: true }).catch(() => {});
});
socket.on("session:ready", ({ socketId: id }) => {
  socketId = id;
  setStatus(`Connected · ${socketId.slice(0, 6)}`);
});
socket.on("room:state", (nextRoomState) => {
  roomState = nextRoomState;
  voiceController.syncRoom(roomState);
  renderRoom();
});

createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", joinRoom);
readyBtn.addEventListener("click", toggleReady);
startGameBtn.addEventListener("click", startGame);
sendChatBtn.addEventListener("click", sendChat);
rollDiceBtn.addEventListener("click", () => sendGameAction({ type: "ROLL_DICE" }));
buildLinkBtn.addEventListener("click", () => { selectedMode = "BUILD_LINK"; renderControls(); renderBoard(); });
buildHubBtn.addEventListener("click", () => { selectedMode = "BUILD_HUB"; renderControls(); renderBoard(); });
buildCampusBtn.addEventListener("click", () => { selectedMode = "BUILD_CAMPUS"; renderControls(); renderBoard(); });
cancelActionBtn.addEventListener("click", () => { selectedMode = null; renderControls(); renderBoard(); });
ackEventBtn.addEventListener("click", () => sendGameAction({ type: "ACKNOWLEDGE_EVENT" }));
discardBtn.addEventListener("click", submitDiscard);
endTurnBtn.addEventListener("click", () => sendGameAction({ type: "END_TURN" }));
bankTradeBtn.addEventListener("click", doBankTrade);
playerTradeBtn.addEventListener("click", doPlayerTrade);
acceptTradeBtn.addEventListener("click", () => respondToTrade(true));
declineTradeBtn.addEventListener("click", () => respondToTrade(false));
joinVoiceBtn.addEventListener("click", async () => {
  try {
    await voiceController.join();
  } catch (error) {
    alert(error.message || "Unable to join voice.");
  }
});
leaveVoiceBtn.addEventListener("click", async () => {
  try {
    await voiceController.leave();
  } catch (error) {
    alert(error.message || "Unable to leave voice.");
  }
});
muteVoiceBtn.addEventListener("click", async () => {
  try {
    await voiceController.toggleMute();
  } catch (error) {
    alert(error.message || "Unable to toggle mute.");
  }
});
chatInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") sendChat();
});

renderRoom();
