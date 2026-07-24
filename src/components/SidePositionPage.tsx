import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { RiderResult, ControlState } from '../types';
import { SelectOption } from './lists';

interface SidePositionPageProps {
  riders: RiderResult[];
  sessionName?: string;
  raceTitle?: string;
  groupName?: string;
  showBanner?: boolean;
  control: ControlState;
  raceLaps?: number;
  laps?: number;
  lapsToGo?: number;
  flag?: number;
  raceSeconds?: number;
  stream?: string;
  useWebcam?: boolean;
  inputDevice?: string;
  videoStatus?: string;
  errorMessage?: string;
  selectedRiderId?: string | null;
  setSelectedRiderId?: (id: string | null) => void;
  setIsSetupOpen?: (open: boolean) => void;
  playBeep?: (type: string) => void;
  socket?: WebSocket | null;
}

// Helper to format race clock stopwatch
function formatRaceTimer(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

// Helper to truncate/fit long driver names
function fitName(name: string, maxLength: number) {
  if (!name) return '-';
  const parts = name.split(' ');
  if (name.length <= maxLength) return name;

  if (parts.length === 2) {
    const short = `${parts[0]} ${parts[1].slice(0, 4)}`;
    if (short.length <= maxLength) return short;

    const short2 = `${parts[0]} ${parts[1][0]}`;
    if (short2.length <= maxLength) return short2;

    return `${parts[0][0]} ${parts[1].slice(0, 3)}`;
  }

  return `${parts[0]} ${parts.slice(1).map((x) => x[0]).join(' ')}`;
}

export const SidePositionPage: React.FC<SidePositionPageProps> = ({
  riders,
  sessionName = 'Motorsports timing board',
  raceTitle = 'GRAND PRIX',
  groupName = 'LIVE BROADCAST',
  showBanner = true,
  control,
  raceLaps = 0,
  laps = 0,
  lapsToGo = 0,
  flag = 0,
  raceSeconds = 0,
  stream = 'http://localhost:8889/live/iPhone/',
  useWebcam = true,
  inputDevice = '',
  videoStatus: parentVideoStatus,
  errorMessage: parentErrorMessage,
  selectedRiderId,
  setSelectedRiderId,
  setIsSetupOpen,
  playBeep,
  socket,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [localVideoStatus, setLocalVideoStatus] = useState<string>('disconnected');
  const [localErrorMessage, setLocalErrorMessage] = useState<string>('');

  const activeVideoStatus = parentVideoStatus || localVideoStatus;
  const activeErrorMessage = parentErrorMessage || localErrorMessage;

  // 1. Enumerate video devices and notify WebSocket server (so /control page gets device options)
  useEffect(() => {
    let isMounted = true;

    const enumerateAndReportDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices: SelectOption[] = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => ({
            value: device.deviceId,
            label: device.label || `Camera (${device.deviceId.slice(0, 6)}...)`,
          }));

        if (isMounted && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              action: 'inputDevices',
              devices: videoInputDevices,
            })
          );
        }
      } catch (err) {
        console.error('Failed to enumerate video devices in SidePosition:', err);
      }
    };

    enumerateAndReportDevices();

    navigator.mediaDevices.addEventListener('devicechange', enumerateAndReportDevices);
    return () => {
      isMounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', enumerateAndReportDevices);
    };
  }, [socket]);

  // 2. Video Stream setup (Physical Webcam vs RTMP / WebRTC Stream)
  useEffect(() => {
    if (!control.video) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    let isSubscribed = true;

    // Helper to send status over socket
    const sendStatus = (status: string, msg: string = '') => {
      setLocalVideoStatus(status);
      setLocalErrorMessage(msg);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            action: 'videoStatus',
            videoStatus: status,
            errorMessage: msg,
          })
        );
      }
    };

    if (control.rtmp || !useWebcam) {
      // RTMP / WebRTC stream connection logic
      sendStatus('connecting', 'Connecting to RTMP / WebRTC stream...');

      const connectWebRTC = async () => {
        try {
          // Clean up old PC
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }

          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
          peerConnectionRef.current = pc;

          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('audio', { direction: 'recvonly' });

          pc.ontrack = (event) => {
            if (videoRef.current && event.streams && event.streams[0]) {
              videoRef.current.srcObject = event.streams[0];
              sendStatus('connected');
            }
          };

          pc.onconnectionstatechange = () => {
            if (!isSubscribed) return;
            if (pc.connectionState === 'connected') {
              sendStatus('connected');
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              sendStatus('error', `Connection state: ${pc.connectionState}`);
            }
          };

          // Try SDP exchange via WHEP if URL starts with http
          if (stream.startsWith('http')) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const res = await fetch(stream, {
              method: 'POST',
              headers: { 'Content-Type': 'application/sdp' },
              body: offer.sdp,
            });

            if (!res.ok) {
              throw new Error(`WHEP endpoint returned ${res.status}`);
            }

            const answerSdp = await res.text();
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: answerSdp })
            );
          }
        } catch (err: any) {
          if (isSubscribed) {
            console.warn('WebRTC stream connection error (falling back to video element URL):', err);
            // Fallback: set video src directly if stream is an HTTP video feed
            if (videoRef.current) {
              videoRef.current.src = stream;
              videoRef.current.play().catch(() => {});
              sendStatus('connected');
            } else {
              sendStatus('error', err.message || 'Stream connection failed');
            }
          }
        }
      };

      connectWebRTC();
    } else {
      // Physical Webcam mode
      sendStatus('connecting', 'Acquiring camera feed...');

      const constraints: MediaStreamConstraints = {
        video: inputDevice ? { deviceId: { exact: inputDevice } } : true,
        audio: false,
      };

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((mediaStream) => {
          if (isSubscribed && videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            sendStatus('connected');
          }
        })
        .catch((err) => {
          if (isSubscribed) {
            console.error('Camera access error:', err);
            sendStatus('error', err.message || 'Camera access denied');
          }
        });
    }

    return () => {
      isSubscribed = false;
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [control.video, control.rtmp, useWebcam, inputDevice, stream, socket]);

  return (
    <div
      className="mt-2 w-full min-h-screen text-zinc-100 font-sans flex flex-col relative overflow-x-hidden"
      id="sideposition-container"
    >
      {/* Header Bar */}
      <div className="ml-2 flex flex-row w-fit h-[73px]">
        <div className="p-3 bg-blue-800 flex flex-row">
          <div className="w-[100px] logoYcr"></div>

          <div className="flex flex-col w-fit gap-2">
            <div className="flex items-center gap-2">
              <span className="text-md font-bold text-zinc-300 uppercase tracking-widest leading-none">
                {sessionName || 'Motorsports timing board'}
              </span>
            </div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase text-zinc-100 leading-tight">
              {raceTitle} <span className="text-zinc-300 font-normal">/ {groupName || 'No active session'}</span>
            </h1>
          </div>
        </div>

        {showBanner && (
          <div className="w-fit flex gap-2 h-full bg-blue-950/95 p-4">
            <div className="mt-auto w-fit flex gap-2 h-min">
              {control.laps && !control.ltg && (
                <div className="text-3xl font-bold italic text-zinc-200 font-sans leading-none">
                  {laps} <span className="text-lg text-zinc-300 font-normal">LAPS</span>
                </div>
              )}

              {control.laps && control.ltg && flag !== 3 && (
                <div className="h-min">
                  <div className="text-3xl font-bold text-zinc-200 font-sans leading-none">
                    <span className="text-2xl text-zinc-300 font-normal mr-3">LAP</span>
                    {laps}
                    <span className="text-3xl text-zinc-600"> / </span>
                    {flag === 3 ? ' Finished' : raceLaps ? raceLaps : lapsToGo ? `${lapsToGo}` : ''}{' '}
                    {flag !== 3 && !raceLaps && lapsToGo && (
                      <span className="text-3xl text-zinc-500 font-normal">Laps to go</span>
                    )}
                  </div>
                </div>
              )}

              {(!control.laps && control.ltg || flag === 3) && (
                <div className="h-min">
                  <div className="text-3xl font-bold italic text-zinc-200 font-sans leading-none">
                    {flag === 3 ? 'Finished' : lapsToGo}{' '}
                    {flag !== 3 && <span className="text-lg text-zinc-500 font-normal">Laps to go</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Race Clock Timer */}
      <div className="flex flex-col bg-zinc-900 w-fit p-3 ml-2 gap-2">
        <div className="text-3xl font-mono text-white flex items-center gap-1">
          {formatRaceTimer(raceSeconds)}
        </div>
      </div>

      {/* Main Positioning Display */}
      <main className="flex-1 max-w-7xl w-full mx-0 p-1 flex flex-col relative z-10 animate-fade-in" id="main-content">
        {/* Video Overlay Stream Viewport */}
        {control.video && (
          <div className="ml-1 w-[400px] bg-slate-950 rounded-t-lg overflow-hidden border border-slate-800 shadow-2xl font-sans mb-2">
            <div className="relative aspect-video w-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {activeVideoStatus !== 'connected' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center">
                  {activeVideoStatus === 'connecting' && (
                    <p className="text-xs font-mono text-slate-400 animate-pulse">CONNECTING STREAM...</p>
                  )}
                  {activeVideoStatus === 'error' && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-red-400">SIGNAL LOST</p>
                      <p className="text-[10px] font-mono text-slate-500 max-w-[300px] truncate">
                        {activeErrorMessage || 'Camera / Stream unavailable'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Section */}
        <section className="w-full flex flex-col gap-4" id="leaderboard-section">
          <div className="divide-y divide-zinc-950 w-full min-h-[550px] relative" id="riders-reordering-list">
            <AnimatePresence initial={false}>
              {riders.length === 0 ? (
                <div className="text-zinc-100 flex flex-col gap-4 animate-fade-in animate-pulse">-</div>
              ) : (
                riders.map((rider, index) => {
                  const showUI = { gap: false, gapTime: 0, diff: false };
                  if (typeof rider.df === 'number') {
                    if (rider.df >= 4 && rider.df < 5) {
                      showUI.diff = true;
                    }
                  }
                  const isLeader = index === 0;

                  // Highlight flashes on position swap
                  const isRecentlyChanged = rider.changeTime && Date.now() - rider.changeTime < 1300;
                  const flashClass = isRecentlyChanged
                    ? rider.changeDirection === 'up'
                      ? 'border-l-emerald-500'
                      : rider.changeDirection === 'down'
                      ? 'border-l-red-500'
                      : ''
                    : '';

                  return (
                    <motion.div
                      layoutId={`rider-row-${rider.id}`}
                      key={rider.id}
                      className={`${
                        showUI.diff ? 'mt-8 ' : ''
                      }my-1 w-full flex items-center flex-row border-transparent pointer border-l-4 ${flashClass}`}
                      id={`rider-row-${rider.id}`}
                      onClick={() => {
                        if (setSelectedRiderId) {
                          setSelectedRiderId(rider.id === selectedRiderId ? null : rider.id);
                        }
                        if (setIsSetupOpen) {
                          setIsSetupOpen(true);
                        }
                        if (playBeep) {
                          playBeep('tick');
                        }
                      }}
                    >
                      <div className="flex items-center grid-cols-8 w-[400px] h-full grid border-zinc-700 bg-zinc-950/90">
                        {/* POSITION & ARROW */}
                        <div className="col-span-1 flex items-center justify-center">
                          <div>
                            {rider.changeDirection === 'up' && (
                              <ChevronUp className="w-4 h-4 text-emerald-500" />
                            )}
                            {rider.changeDirection === 'down' && (
                              <ChevronDown className="w-4 h-4 text-red-500" />
                            )}
                            {(!rider.changeDirection ||
                              (rider.changeDirection !== 'up' && rider.changeDirection !== 'down')) && (
                              <span
                                className="text-zinc-400 text-xl font-bold font-mono"
                                id={`rider-pos-${rider.id}`}
                              >
                                {rider.pos || index + 1}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RIDER NAME / TEAM */}
                        <div className="col-span-5 pl-4 flex items-center h-full bg-gradient-to-r from-blue-950/70 to-black/0">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg font-black uppercase tracking-tight leading-none text-white">
                                {fitName(rider.nam, 8)}
                              </span>
                              {rider.changeDirection === 'steady' && rider.if === true && (
                                <span className="text-zinc-400 text-2xl font-bold">🏁</span>
                              )}
                            </div>
                            {rider.cb && (
                              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1.5 leading-none truncate font-sans">
                                {rider.cb}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* VEHICLE NO */}
                        <div className="col-span-2 my-1 rounded-l-lg bg-gradient-to-r from-blue-700 to-blue-800 text-center py-1">
                          <span className="text-xl italic font-black tracking-tighter text-white select-none font-sans">
                            {rider.no}
                          </span>
                        </div>
                      </div>

                      {/* TIMING & GAP / DIFF COLUMNS */}
                      <div className="flex flex-row">
                        {(rider.df || rider.gp) && (
                          <div
                            className={`${
                              control.time ? '' : 'hidden'
                            } w-[110px] text-right flex flex-col justify-center bg-zinc-950/90 border border-zinc-800 px-2 py-0.5 gap-1`}
                          >
                            <div className="font-mono text-xl font-semibold text-zinc-100 tracking-tight leading-none">
                              {isLeader
                                ? control.gap
                                  ? 'INTERVAL'
                                  : 'GAP'
                                : control.gap
                                ? rider.gp
                                : control.diff
                                ? rider.df
                                : rider.df
                                ? rider.dfCl
                                : '-'}
                            </div>
                          </div>
                        )}

                        {rider.btTm && (
                          <div
                            className={`${
                              control.best ? '' : 'hidden'
                            } text-left flex flex-row text-lg font-black leading-none uppercase tracking-wider items-center justify-end gap-1 border-zinc-800 rounded px-2 bg-zinc-950/90 border border-zinc-800 text-zinc-200`}
                          >
                            <span className="font-bold text-amber-400">BEST:</span> {rider.btTm}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SidePositionPage;
