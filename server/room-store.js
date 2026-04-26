const { PLAYER_COLORS, createGameState, createRoomCode, applyAction } = require("../shared/game-core");

class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  createRoom({ socketId, playerName }) {
    const code = createRoomCode(new Set(this.rooms.keys()));
    const player = this.createPlayer(socketId, playerName, 0);
    const room = {
      code,
      hostId: player.id,
      players: [player],
      chat: [
        this.systemMessage(`${player.name} created room ${code}.`)
      ],
      voiceParticipants: [],
      pendingTrade: null,
      gameState: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom({ code, socketId, playerName }) {
    const room = this.rooms.get(code);
    if (!room) {
      return { error: "Room not found." };
    }
    if (room.players.length >= 4) {
      return { error: "Room is full." };
    }
    if (room.players.some((player) => player.socketId === socketId)) {
      return { room };
    }
    const player = this.createPlayer(socketId, playerName, room.players.length);
    room.players.push(player);
    room.chat.push(this.systemMessage(`${player.name} joined the room.`));
    room.updatedAt = Date.now();
    return { room, player };
  }

  leaveBySocket(socketId) {
    for (const room of this.rooms.values()) {
      const index = room.players.findIndex((player) => player.socketId === socketId);
      if (index === -1) continue;

      const [leaver] = room.players.splice(index, 1);
      room.chat.push(this.systemMessage(`${leaver.name} left the room.`));

      if (room.hostId === leaver.id && room.players.length > 0) {
        room.hostId = room.players[0].id;
        room.chat.push(this.systemMessage(`${room.players[0].name} is now the host.`));
      }

      if (room.pendingTrade && (room.pendingTrade.proposerId === leaver.id || room.pendingTrade.targetPlayerId === leaver.id)) {
        room.pendingTrade = null;
        room.chat.push(this.systemMessage("Pending trade canceled because a player left the room."));
      }

      room.voiceParticipants = room.voiceParticipants.filter((participant) => participant.playerId !== leaver.id);

      if (room.players.length === 0) {
        this.rooms.delete(room.code);
      } else {
        room.updatedAt = Date.now();
      }

      return { room, leaver };
    }
    return null;
  }

  getRoom(code) {
    return this.rooms.get(code) || null;
  }

  findRoomBySocket(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.socketId === socketId)) {
        return room;
      }
    }
    return null;
  }

  addChatMessage({ code, socketId, text }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (!player) return { error: "Player is not in this room." };
    const trimmed = String(text || "").trim();
    if (!trimmed) return { error: "Message cannot be empty." };
    room.chat.push({
      id: this.makeId(),
      kind: "player",
      playerId: player.id,
      playerName: player.name,
      text: trimmed.slice(0, 500),
      createdAt: Date.now()
    });
    room.chat = room.chat.slice(-100);
    room.updatedAt = Date.now();
    return { room };
  }

  toggleReady({ code, socketId }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (!player) return { error: "Player is not in this room." };
    player.ready = !player.ready;
    room.chat.push(this.systemMessage(`${player.name} is ${player.ready ? "ready" : "not ready"}.`));
    room.updatedAt = Date.now();
    return { room };
  }

  startGame({ code, socketId }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (!player) return { error: "Player is not in this room." };
    if (player.id !== room.hostId) return { error: "Only the host can start the game." };
    if (room.players.length < 3 || room.players.length > 4) {
      return { error: "The game can only start with 3 or 4 players." };
    }

    room.gameState = createGameState(room.players);
    room.pendingTrade = null;
    room.chat.push(this.systemMessage("Game started. Online room state is now authoritative on the server."));
    room.updatedAt = Date.now();
    return { room };
  }

  offerTrade({ code, socketId, offer }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    if (!room.gameState) return { error: "Game has not started." };
    if (room.pendingTrade) return { error: "A trade offer is already waiting for a response." };

    const proposerMeta = room.players.find((entry) => entry.socketId === socketId);
    if (!proposerMeta) return { error: "Player is not in this room." };

    const state = room.gameState;
    const proposer = state.players.find((player) => player.id === proposerMeta.id);
    const targetMeta = room.players.find((entry) => entry.id === offer.targetPlayerId);
    const target = targetMeta ? state.players.find((player) => player.id === targetMeta.id) : null;
    const active = state.players[state.currentPlayer];

    if (!active || active.id !== proposerMeta.id) return { error: "You can only offer trades on your own turn." };
    if (state.phase !== "main" || !state.rolled || state.mustMoveDisruption || state.pendingSevenResolution || state.discardPlayer || state.winner) {
      return { error: "You cannot offer a trade right now." };
    }
    if (!target || target.id === proposer.id) return { error: "Choose another player to trade with." };

    const giveAmount = Math.max(1, Number(offer.giveAmount || 1));
    const getAmount = Math.max(1, Number(offer.getAmount || 1));
    if (!proposer.resources[offer.giveResource] || proposer.resources[offer.giveResource] < giveAmount) {
      return { error: "You do not have enough resources for that offer." };
    }
    if (!target.resources[offer.getResource] || target.resources[offer.getResource] < getAmount) {
      return { error: `${targetMeta.name} does not have enough of that resource.` };
    }

    room.pendingTrade = {
      id: this.makeId(),
      proposerId: proposer.id,
      proposerName: proposerMeta.name,
      targetPlayerId: target.id,
      targetPlayerName: targetMeta.name,
      giveResource: offer.giveResource,
      giveAmount,
      getResource: offer.getResource,
      getAmount,
      createdAt: Date.now()
    };
    room.chat.push(this.systemMessage(`${proposerMeta.name} offered a trade to ${targetMeta.name}.`));
    room.updatedAt = Date.now();
    return { room };
  }

  respondTrade({ code, socketId, accept }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    if (!room.pendingTrade) return { error: "There is no pending trade offer." };

    const responderMeta = room.players.find((entry) => entry.socketId === socketId);
    if (!responderMeta) return { error: "Player is not in this room." };
    if (responderMeta.id !== room.pendingTrade.targetPlayerId) {
      return { error: "Only the targeted player can respond to this trade." };
    }

    const pending = room.pendingTrade;

    if (!accept) {
      room.pendingTrade = null;
      room.chat.push(this.systemMessage(`${responderMeta.name} declined the trade offer from ${pending.proposerName}.`));
      room.updatedAt = Date.now();
      return { room };
    }

    const result = applyAction(room.gameState, pending.proposerId, {
      type: "PLAYER_TRADE",
      targetPlayerId: pending.targetPlayerId,
      giveResource: pending.giveResource,
      giveAmount: pending.giveAmount,
      getResource: pending.getResource,
      getAmount: pending.getAmount
    });

    if (!result.ok) {
      room.pendingTrade = null;
      room.chat.push(this.systemMessage(`Trade could not be completed: ${result.error}`));
      room.updatedAt = Date.now();
      return { room, error: result.error };
    }

    room.gameState = result.state;
    room.pendingTrade = null;
    room.chat.push(this.systemMessage(`${responderMeta.name} accepted the trade offer from ${pending.proposerName}.`));
    room.updatedAt = Date.now();
    return { room };
  }

  joinVoice({ code, socketId, muted = false }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (!player) return { error: "Player is not in this room." };

    const existing = room.voiceParticipants.find((participant) => participant.playerId === player.id);
    if (existing) {
      existing.muted = Boolean(muted);
      existing.socketId = socketId;
    } else {
      room.voiceParticipants.push({
        playerId: player.id,
        playerName: player.name,
        socketId,
        muted: Boolean(muted),
        joinedAt: Date.now()
      });
    }

    room.updatedAt = Date.now();
    return { room, player };
  }

  leaveVoice({ code, socketId }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (!player) return { error: "Player is not in this room." };

    const before = room.voiceParticipants.length;
    room.voiceParticipants = room.voiceParticipants.filter((participant) => participant.playerId !== player.id);
    if (room.voiceParticipants.length !== before) {
      room.updatedAt = Date.now();
    }
    return { room, player };
  }

  setVoiceMuted({ code, socketId, muted }) {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found." };
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (!player) return { error: "Player is not in this room." };
    const participant = room.voiceParticipants.find((entry) => entry.playerId === player.id);
    if (!participant) return { error: "You are not in the room voice channel." };

    participant.muted = Boolean(muted);
    room.updatedAt = Date.now();
    return { room, player };
  }

  createPlayer(socketId, playerName, index) {
    return {
      id: this.makeId(),
      socketId,
      name: String(playerName || "").trim() || `Player ${index + 1}`,
      color: PLAYER_COLORS[index],
      ready: false
    };
  }

  systemMessage(text) {
    return {
      id: this.makeId(),
      kind: "system",
      text,
      createdAt: Date.now()
    };
  }

  makeId() {
    return Math.random().toString(36).slice(2, 10);
  }
}

function serializeRoom(room, socketId) {
  if (!room) return null;
  const self = room.players.find((player) => player.socketId === socketId) || null;
  return {
    code: room.code,
    hostId: room.hostId,
    selfId: self ? self.id : null,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      ready: Boolean(player.ready),
      isHost: player.id === room.hostId,
      isSelf: self ? player.id === self.id : false
    })),
    chat: room.chat.slice(-50),
    voiceParticipants: room.voiceParticipants.map((participant) => ({
      playerId: participant.playerId,
      playerName: participant.playerName,
      muted: Boolean(participant.muted),
      isSelf: self ? participant.playerId === self.id : false
    })),
    pendingTrade: room.pendingTrade,
    gameState: room.gameState,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
}

module.exports = {
  RoomStore,
  serializeRoom
};
