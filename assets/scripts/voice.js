(function () {
  const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];

  function createVoiceController({ socket, request, getRoomState, onStatusChange, onError }) {
    const peers = new Map();
    let localStream = null;
    let joined = false;
    let muted = false;
    let activeRoomCode = null;
    const audioDock = document.getElementById("voiceAudioDock");

    function notifyStatus() {
      if (typeof onStatusChange === "function") {
        onStatusChange(getState());
      }
    }

    function getState() {
      return {
        joined,
        muted,
        activeRoomCode
      };
    }

    function getSelfPlayerId() {
      const room = getRoomState ? getRoomState() : null;
      return room ? room.selfId : null;
    }

    function closePeer(playerId) {
      const peer = peers.get(playerId);
      if (!peer) return;
      if (peer.audioEl) {
        peer.audioEl.srcObject = null;
        peer.audioEl.remove();
      }
      peer.pc.onicecandidate = null;
      peer.pc.ontrack = null;
      peer.pc.close();
      peers.delete(playerId);
      notifyStatus();
    }

    function closeAllPeers() {
      [...peers.keys()].forEach(closePeer);
    }

    function stopLocalStream() {
      if (!localStream) return;
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }

    async function ensureLocalStream() {
      if (localStream) return localStream;
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      return localStream;
    }

    function buildPeer(playerId) {
      let peer = peers.get(playerId);
      if (peer) return peer;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioDock.appendChild(audioEl);

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate || !joined || !activeRoomCode) return;
        request("voice:ice-candidate", {
          roomCode: activeRoomCode,
          targetPlayerId: playerId,
          candidate
        }).catch(() => {});
      };

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      peer = { pc, audioEl, pendingCandidates: [] };
      peers.set(playerId, peer);
      notifyStatus();
      return peer;
    }

    async function addLocalTracks(pc) {
      const stream = await ensureLocalStream();
      stream.getTracks().forEach((track) => {
        const hasTrack = pc.getSenders().some((sender) => sender.track && sender.track.id === track.id);
        if (!hasTrack) {
          pc.addTrack(track, stream);
        }
      });
    }

    async function createOfferFor(player) {
      if (!joined || !activeRoomCode || !player || player.playerId === getSelfPlayerId()) return;
      const peer = buildPeer(player.playerId);
      await addLocalTracks(peer.pc);
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      const result = await request("voice:offer", {
        roomCode: activeRoomCode,
        targetPlayerId: player.playerId,
        offer
      });
      if (!result.ok) {
        throw new Error(result.error || `Unable to connect voice to ${player.playerName}.`);
      }
    }

    async function join() {
      const room = getRoomState ? getRoomState() : null;
      if (!room) throw new Error("Join a room before starting voice chat.");
      if (joined && activeRoomCode === room.code) return;

      await ensureLocalStream();
      const result = await request("voice:join", { roomCode: room.code, muted });
      if (!result.ok) {
        stopLocalStream();
        throw new Error(result.error || "Unable to join room voice.");
      }

      joined = true;
      activeRoomCode = room.code;
      notifyStatus();

      for (const participant of result.participants || []) {
        await createOfferFor(participant);
      }
    }

    async function leave({ silent = false } = {}) {
      const roomCode = activeRoomCode;
      closeAllPeers();
      stopLocalStream();
      joined = false;
      activeRoomCode = null;
      notifyStatus();

      if (!silent && roomCode) {
        await request("voice:leave", { roomCode }).catch(() => {});
      }
    }

    async function toggleMute() {
      if (!joined || !localStream) return;
      muted = !muted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      notifyStatus();

      if (activeRoomCode) {
        const result = await request("voice:mute", { roomCode: activeRoomCode, muted });
        if (!result.ok) {
          throw new Error(result.error || "Unable to update voice mute state.");
        }
      }
    }

    async function handleOffer({ fromPlayerId, offer }) {
      if (!joined) return;
      const peer = buildPeer(fromPlayerId);
      await addLocalTracks(peer.pc);
      if (peer.pc.signalingState === "have-local-offer") {
        await peer.pc.setLocalDescription({ type: "rollback" });
      }
      await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
      while (peer.pendingCandidates.length) {
        const candidate = peer.pendingCandidates.shift();
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      await request("voice:answer", {
        roomCode: activeRoomCode,
        targetPlayerId: fromPlayerId,
        answer
      });
    }

    async function handleAnswer({ fromPlayerId, answer }) {
      const peer = peers.get(fromPlayerId);
      if (!peer) return;
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      while (peer.pendingCandidates.length) {
        const candidate = peer.pendingCandidates.shift();
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }

    async function handleIceCandidate({ fromPlayerId, candidate }) {
      const peer = peers.get(fromPlayerId) || buildPeer(fromPlayerId);
      if (!candidate) return;
      if (!peer.pc.remoteDescription) {
        peer.pendingCandidates.push(candidate);
        return;
      }
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    function handleRemoteLeave({ playerId }) {
      closePeer(playerId);
    }

    function syncRoom(room) {
      if (!joined) {
        notifyStatus();
        return;
      }

      if (!room || room.code !== activeRoomCode) {
        leave({ silent: true }).catch(() => {});
        return;
      }

      const voiceIds = new Set((room.voiceParticipants || []).map((participant) => participant.playerId));
      [...peers.keys()].forEach((playerId) => {
        if (!voiceIds.has(playerId)) {
          closePeer(playerId);
        }
      });
      notifyStatus();
    }

    socket.on("voice:user-left", handleRemoteLeave);
    socket.on("voice:offer", (payload) => {
      handleOffer(payload).catch((error) => {
        if (typeof onError === "function") onError(error);
      });
    });
    socket.on("voice:answer", (payload) => {
      handleAnswer(payload).catch((error) => {
        if (typeof onError === "function") onError(error);
      });
    });
    socket.on("voice:ice-candidate", (payload) => {
      handleIceCandidate(payload).catch(() => {});
    });

    window.addEventListener("beforeunload", () => {
      leave({ silent: true }).catch(() => {});
    });

    return {
      getState,
      join,
      leave,
      toggleMute,
      syncRoom
    };
  }

  window.createVoiceController = createVoiceController;
})();
