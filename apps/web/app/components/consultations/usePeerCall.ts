'use client';

// One-to-one WebRTC call over the room's Socket.io signaling.
// The doctor always places the call (sends the offer) and the patient answers,
// so both sides never call each other at the same time. Each (re)connection
// uses a fresh RTCPeerConnection.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsultationRoom, RtcSignal } from './useConsultationRoom';

export type CallState = 'waiting' | 'connecting' | 'connected' | 'reconnecting';

// ---------------------------------------------------------------------------
// Camera + microphone
// ---------------------------------------------------------------------------

export function useLocalMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const video = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot use a camera here. Please open the room in an up-to-date Chrome, Edge, Firefox or Safari over HTTPS.');
        setReady(true);
        return;
      }
      let s: MediaStream | null = null;
      try {
        s = await navigator.mediaDevices.getUserMedia({ audio, video });
      } catch (first) {
        try {
          // No camera (or it is in use): join with the microphone only
          s = await navigator.mediaDevices.getUserMedia({ audio });
          setVideoOn(false);
          setError('Your camera is not available, so you joined with audio only.');
        } catch {
          const denied = (first as Error)?.name === 'NotAllowedError';
          setError(
            denied
              ? 'Camera and microphone access is blocked. Allow access in your browser’s site settings, then reload the page.'
              : 'No camera or microphone was found. You can still see and hear the other person.',
          );
          setAudioOn(false);
          setVideoOn(false);
        }
      }
      if (cancelled) {
        s?.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = s;
      setStream(s);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleAudio = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioOn(track.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return {
    stream,
    ready,
    error,
    audioOn,
    videoOn,
    hasAudio: !!stream?.getAudioTracks().length,
    hasVideo: !!stream?.getVideoTracks().length,
    toggleAudio,
    toggleVideo,
    stop,
  };
}

// ---------------------------------------------------------------------------
// Peer connection
// ---------------------------------------------------------------------------

const RECONNECT_WAIT_MS = 4000;

export function usePeerCall({
  room,
  iceServers,
  localStream,
  mediaReady,
}: {
  room: ConsultationRoom;
  iceServers: RTCIceServer[];
  localStream: MediaStream | null;
  mediaReady: boolean;
}) {
  const isCaller = room.role === 'DOCTOR';
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);
  const wantsOffer = useRef(false);
  const owesReady = useRef(false);
  const queuedOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const offerTimer = useRef<number | null>(null);
  const dropTimer = useRef<number | null>(null);
  const streamRef = useRef(localStream);
  const readyRef = useRef(mediaReady);
  streamRef.current = localStream;
  readyRef.current = mediaReady;

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<CallState>('waiting');
  const [connectedAt, setConnectedAt] = useState<number | null>(null);

  const { signal, onSignal, status, otherOnline } = room;

  const closePeer = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    queuedCandidates.current = [];
  }, []);

  // makeOffer is defined below; the peer's state handler needs the latest one
  const offerRef = useRef<() => void>(() => undefined);

  const newPeer = useCallback(() => {
    closePeer();
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    const s = streamRef.current;
    if (s && s.getTracks().length) {
      s.getTracks().forEach((t) => pc.addTrack(t, s));
    }
    if (isCaller) {
      // Receive both even when this side has no camera/microphone
      if (!s?.getAudioTracks().length) pc.addTransceiver('audio', { direction: 'recvonly' });
      if (!s?.getVideoTracks().length) pc.addTransceiver('video', { direction: 'recvonly' });
    }
    const remote = new MediaStream();
    pc.ontrack = (e) => {
      const tracks = e.streams[0]?.getTracks() ?? [e.track];
      tracks.forEach((t) => !remote.getTracks().includes(t) && remote.addTrack(t));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) signal('candidate', e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      const st = pc.connectionState;
      if (dropTimer.current) {
        window.clearTimeout(dropTimer.current);
        dropTimer.current = null;
      }
      if (st === 'connected') {
        setState('connected');
        setConnectedAt((t) => t ?? Date.now());
      } else if (st === 'disconnected' || st === 'failed') {
        setState('reconnecting');
        // A short network blip often recovers by itself; otherwise the doctor calls again
        dropTimer.current = window.setTimeout(
          () => {
            if (pcRef.current === pc && pc.connectionState !== 'connected') {
              if (isCaller) offerRef.current();
              else signal('ready');
            }
          },
          st === 'failed' ? 500 : RECONNECT_WAIT_MS,
        );
      }
    };
    return pc;
  }, [closePeer, iceServers, isCaller, signal]);

  const makeOffer = useCallback(async () => {
    if (!readyRef.current) {
      wantsOffer.current = true;
      return;
    }
    wantsOffer.current = false;
    setState((s) => (s === 'connected' ? 'reconnecting' : 'connecting'));
    const pc = newPeer();
    try {
      const offer = await pc.createOffer();
      if (pcRef.current !== pc) return;
      await pc.setLocalDescription(offer);
      signal('offer', pc.localDescription?.toJSON());
    } catch {
      setState('reconnecting');
    }
  }, [newPeer, signal]);
  offerRef.current = () => {
    if (offerTimer.current) window.clearTimeout(offerTimer.current);
    offerTimer.current = window.setTimeout(() => makeOffer(), 250);
  };

  const answer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!readyRef.current) {
        queuedOffer.current = offer;
        return;
      }
      queuedOffer.current = null;
      setState((s) => (s === 'connected' ? 'reconnecting' : 'connecting'));
      const pc = newPeer();
      try {
        await pc.setRemoteDescription(offer);
        for (const c of queuedCandidates.current.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
        const ans = await pc.createAnswer();
        if (pcRef.current !== pc) return;
        await pc.setLocalDescription(ans);
        signal('answer', pc.localDescription?.toJSON());
      } catch {
        setState('reconnecting');
      }
    },
    [newPeer, signal],
  );

  // Signals from the other participant
  useEffect(
    () =>
      onSignal(async (s: RtcSignal) => {
        if (s.from === room.role) return;
        const pc = pcRef.current;
        switch (s.type) {
          case 'ready':
            if (isCaller) offerRef.current();
            else if (readyRef.current) signal('ready');
            else owesReady.current = true;
            break;
          case 'offer':
            if (!isCaller) await answer(s.payload as RTCSessionDescriptionInit);
            break;
          case 'answer':
            if (isCaller && pc && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(s.payload as RTCSessionDescriptionInit).catch(() => undefined);
              for (const c of queuedCandidates.current.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
            }
            break;
          case 'candidate': {
            const c = s.payload as RTCIceCandidateInit;
            if (pc?.remoteDescription) await pc.addIceCandidate(c).catch(() => undefined);
            else queuedCandidates.current.push(c);
            break;
          }
          case 'hangup':
            closePeer();
            setRemoteStream(null);
            setState('waiting');
            break;
        }
      }),
    [onSignal, room.role, isCaller, signal, answer, closePeer],
  );

  // Announce ourselves once connected and the camera/mic question is settled
  useEffect(() => {
    if (status !== 'connected' || !mediaReady) return;
    signal('ready');
    if (isCaller && wantsOffer.current) offerRef.current();
    if (!isCaller && queuedOffer.current) answer(queuedOffer.current);
    if (!isCaller && owesReady.current) owesReady.current = false;
  }, [status, mediaReady, signal, isCaller, answer]);

  // The other person left: drop their video and wait
  useEffect(() => {
    if (otherOnline) return;
    closePeer();
    setRemoteStream(null);
    setState('waiting');
  }, [otherOnline, closePeer]);

  const hangUp = useCallback(() => {
    signal('hangup');
    closePeer();
    setRemoteStream(null);
  }, [signal, closePeer]);

  useEffect(
    () => () => {
      if (offerTimer.current) window.clearTimeout(offerTimer.current);
      if (dropTimer.current) window.clearTimeout(dropTimer.current);
      closePeer();
    },
    [closePeer],
  );

  return { remoteStream, state, connectedAt, hangUp };
}
