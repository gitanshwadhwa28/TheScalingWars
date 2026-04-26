const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { RoomStore, serializeRoom } = require("./room-store");
const { applyAction } = require("../shared/game-core");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
const rooms = new RoomStore();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.resolve(__dirname, "..")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function emitRoomState(room) {
  if (!room) return;
  room.players.forEach((player) => {
    io.to(player.socketId).emit("room:state", serializeRoom(room, player.socketId));
  });
}

io.on("connection", (socket) => {
  socket.emit("session:ready", { socketId: socket.id });

  socket.on("room:create", ({ playerName }, ack = () => {}) => {
    const room = rooms.createRoom({ socketId: socket.id, playerName });
    socket.join(room.code);
    emitRoomState(room);
    ack({ ok: true, room: serializeRoom(room, socket.id) });
  });

  socket.on("room:join", ({ roomCode, playerName }, ack = () => {}) => {
    const normalized = String(roomCode || "").trim().toUpperCase();
    const result = rooms.joinRoom({ code: normalized, socketId: socket.id, playerName });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    socket.join(normalized);
    emitRoomState(result.room);
    ack({ ok: true, room: serializeRoom(result.room, socket.id) });
  });

  socket.on("room:toggle-ready", ({ roomCode }, ack = () => {}) => {
    const result = rooms.toggleReady({ code: roomCode, socketId: socket.id });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    emitRoomState(result.room);
    ack({ ok: true });
  });

  socket.on("game:start", ({ roomCode }, ack = () => {}) => {
    const result = rooms.startGame({ code: roomCode, socketId: socket.id });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    emitRoomState(result.room);
    ack({ ok: true });
  });

  socket.on("chat:send", ({ roomCode, text }, ack = () => {}) => {
    const result = rooms.addChatMessage({ code: roomCode, socketId: socket.id, text });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    emitRoomState(result.room);
    ack({ ok: true });
  });

  socket.on("voice:join", ({ roomCode, muted = false }, ack = () => {}) => {
    const room = rooms.getRoom(roomCode);
    if (!room) {
      ack({ ok: false, error: "Room not found." });
      return;
    }

    const existingParticipants = room.voiceParticipants
      .filter((participant) => participant.socketId !== socket.id)
      .map((participant) => ({
        playerId: participant.playerId,
        playerName: participant.playerName
      }));

    const result = rooms.joinVoice({ code: roomCode, socketId: socket.id, muted });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }

    socket.to(room.code).emit("voice:user-joined", {
      playerId: result.player.id,
      playerName: result.player.name
    });
    emitRoomState(result.room);
    ack({ ok: true, participants: existingParticipants });
  });

  socket.on("voice:leave", ({ roomCode }, ack = () => {}) => {
    const result = rooms.leaveVoice({ code: roomCode, socketId: socket.id });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }

    socket.to(result.room.code).emit("voice:user-left", { playerId: result.player.id });
    emitRoomState(result.room);
    ack({ ok: true });
  });

  socket.on("voice:mute", ({ roomCode, muted }, ack = () => {}) => {
    const result = rooms.setVoiceMuted({ code: roomCode, socketId: socket.id, muted });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }

    emitRoomState(result.room);
    ack({ ok: true });
  });

  socket.on("voice:offer", ({ roomCode, targetPlayerId, offer }, ack = () => {}) => {
    const room = rooms.getRoom(roomCode);
    if (!room) {
      ack({ ok: false, error: "Room not found." });
      return;
    }
    const source = room.players.find((player) => player.socketId === socket.id);
    const target = room.players.find((player) => player.id === targetPlayerId);
    const sourceInVoice = room.voiceParticipants.some((participant) => participant.playerId === source?.id);
    const targetInVoice = room.voiceParticipants.some((participant) => participant.playerId === target?.id);

    if (!source || !target || !sourceInVoice || !targetInVoice) {
      ack({ ok: false, error: "Voice participants are not available." });
      return;
    }

    io.to(target.socketId).emit("voice:offer", {
      fromPlayerId: source.id,
      fromPlayerName: source.name,
      offer
    });
    ack({ ok: true });
  });

  socket.on("voice:answer", ({ roomCode, targetPlayerId, answer }, ack = () => {}) => {
    const room = rooms.getRoom(roomCode);
    if (!room) {
      ack({ ok: false, error: "Room not found." });
      return;
    }
    const source = room.players.find((player) => player.socketId === socket.id);
    const target = room.players.find((player) => player.id === targetPlayerId);
    const sourceInVoice = room.voiceParticipants.some((participant) => participant.playerId === source?.id);
    const targetInVoice = room.voiceParticipants.some((participant) => participant.playerId === target?.id);

    if (!source || !target || !sourceInVoice || !targetInVoice) {
      ack({ ok: false, error: "Voice participants are not available." });
      return;
    }

    io.to(target.socketId).emit("voice:answer", {
      fromPlayerId: source.id,
      fromPlayerName: source.name,
      answer
    });
    ack({ ok: true });
  });

  socket.on("voice:ice-candidate", ({ roomCode, targetPlayerId, candidate }, ack = () => {}) => {
    const room = rooms.getRoom(roomCode);
    if (!room) {
      ack({ ok: false, error: "Room not found." });
      return;
    }
    const source = room.players.find((player) => player.socketId === socket.id);
    const target = room.players.find((player) => player.id === targetPlayerId);
    const sourceInVoice = room.voiceParticipants.some((participant) => participant.playerId === source?.id);
    const targetInVoice = room.voiceParticipants.some((participant) => participant.playerId === target?.id);

    if (!source || !target || !sourceInVoice || !targetInVoice) {
      ack({ ok: false, error: "Voice participants are not available." });
      return;
    }

    io.to(target.socketId).emit("voice:ice-candidate", {
      fromPlayerId: source.id,
      candidate
    });
    ack({ ok: true });
  });

  socket.on("trade:offer", ({ roomCode, offer }, ack = () => {}) => {
    const result = rooms.offerTrade({ code: roomCode, socketId: socket.id, offer });
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    emitRoomState(result.room);
    ack({ ok: true });
  });

  socket.on("trade:respond", ({ roomCode, accept }, ack = () => {}) => {
    const result = rooms.respondTrade({ code: roomCode, socketId: socket.id, accept });
    if (result.error && !result.room) {
      ack({ ok: false, error: result.error });
      return;
    }
    emitRoomState(result.room);
    ack({ ok: !result.error, error: result.error || null });
  });

  socket.on("game:action", ({ roomCode, action }, ack = () => {}) => {
    const room = rooms.getRoom(roomCode);
    if (!room) {
      ack({ ok: false, error: "Room not found." });
      return;
    }
    const player = room.players.find((entry) => entry.socketId === socket.id);
    if (!player) {
      ack({ ok: false, error: "You are not in this room." });
      return;
    }
    if (!room.gameState) {
      ack({ ok: false, error: "Game has not started." });
      return;
    }
    if (room.pendingTrade) {
      ack({ ok: false, error: "A trade offer is waiting for a response." });
      return;
    }

    const result = applyAction(room.gameState, player.id, action);
    if (!result.ok) {
      ack({ ok: false, error: result.error });
      return;
    }

    room.gameState = result.state;
    room.updatedAt = Date.now();
    emitRoomState(room);
    ack({ ok: true });
  });

  socket.on("disconnect", () => {
    const result = rooms.leaveBySocket(socket.id);
    if (result && result.room) {
      if (result.leaver) {
        io.to(result.room.code).emit("voice:user-left", { playerId: result.leaver.id });
      }
      emitRoomState(result.room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`The Scaling Wars server listening on http://localhost:${PORT}`);
});
