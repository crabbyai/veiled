// ─── Call negotiation ───────────────────────────────────────────────
// The offer/answer/ICE choreography of a call, with nothing platform-
// specific in it: the WebRTC constructors are handed in.
//
// It lives apart from calls.js so it can be exercised against a real
// WebRTC implementation. react-native-webrtc only runs on a device, so
// the app's own copy of this cannot be tested here; a browser's WebRTC
// is the same protocol, and driving this file with it proves the
// sequence actually carries media rather than merely type-checking.
//
// See backend/test/webrtc-media.test.js, which runs two real peers
// through the real signalling server using exactly this code.

export function createPeerFlow({
  RTCPeerConnection, RTCSessionDescription, RTCIceCandidate,
  stream, iceServers, onRemoteStream, onState, send,
}) {
  const pc = new RTCPeerConnection({ iceServers: iceServers || [] });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.addEventListener('track', (e) => {
    if (e.streams && e.streams[0] && onRemoteStream) onRemoteStream(e.streams[0]);
  });
  pc.addEventListener('icecandidate', (e) => {
    if (e.candidate) send('call:ice', { candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
  });
  pc.addEventListener('connectionstatechange', () => {
    if (onState) onState(pc.connectionState);
  });

  // Candidates can arrive before the remote description is set. WebRTC
  // is supposed to queue them, but implementations differ, so they are
  // held here until there is something to add them to.
  let remoteReady = false;
  const pending = [];
  const drain = async () => {
    while (pending.length) {
      const c = pending.shift();
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* a bad candidate must not kill the call */ }
    }
  };

  return {
    pc,
    // The caller offers.
    async offer() {
      const desc = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(desc);
      send('call:offer', { sdp: { type: desc.type, sdp: desc.sdp } });
    },
    // The callee answers what it was offered.
    async answerTo(sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      remoteReady = true;
      await drain();
      const desc = await pc.createAnswer();
      await pc.setLocalDescription(desc);
      send('call:answer', { sdp: { type: desc.type, sdp: desc.sdp } });
    },
    async acceptAnswer(sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      remoteReady = true;
      await drain();
    },
    async addCandidate(candidate) {
      if (!candidate) return;
      if (!remoteReady) { pending.push(candidate); return; }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* as above */ }
    },
    close() {
      try { pc.getSenders().forEach((s) => s.track && s.track.stop()); } catch {}
      try { pc.close(); } catch {}
    },
  };
}

export default createPeerFlow;
