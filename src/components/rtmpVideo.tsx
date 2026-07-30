    import React, { useEffect, useRef, useState } from 'react';

    interface VideoPlayerProps {
    streamUrl: string; // e.g. "http://192.168.1.1:8889/live/iPhone/whep"
    isRtmpActive: boolean;
    connStatus: (rtmpStatus:string) => void;
    }

    export const WebRTCVideoPlayer: React.FC<VideoPlayerProps> = ({
    streamUrl,
    isRtmpActive,
    connStatus,
    }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    const [status, setStatus] = useState<string>('idle');

    useEffect(() =>{
        connStatus(status);
    },[status])

    useEffect(() => {
        let isSubscribed = true;

        if (!isRtmpActive || !streamUrl) return;

        const connectWebRTC = async () => {
        try {
            setStatus('connecting');

            // Clean up previous PeerConnection
            if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
            }

            // On a local network, you don't even need STUN servers for MediaMTX!
            const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            peerConnectionRef.current = pc;

            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            pc.ontrack = (event) => {
            if (!isSubscribed) return;
            if (videoRef.current && event.streams && event.streams[0]) {
                // Assign stream to video element
                if (videoRef.current.srcObject !== event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                }

                // Play video safely ignoring aborted playback errors during re-renders
                videoRef.current.play().then(() => {
                if (isSubscribed) setStatus('playing');
                }).catch((err) => {
                if (err.name !== 'AbortError') {
                    console.warn('Autoplay error:', err);
                }
                });
            }
            };

            // Create SDP Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (!isSubscribed) return;

            // 🚀 FAST PATH: Send offer IMMEDIATELY without waiting for ICE gathering!
            const res = await fetch(streamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: offer.sdp, // Send offer.sdp directly
            });

            if (!res.ok) throw new Error(`MediaMTX responded with status ${res.status}`);

            const answerSdp = await res.text();

            if (!isSubscribed) return;

            await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: answerSdp })
            );
        } catch (err: any) {
            if (isSubscribed) {
            console.error('WebRTC Error:', err);
            setStatus('error');
            }
        }
        };

        connectWebRTC();

        return () => {
        isSubscribed = false;
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        };
    }, [streamUrl, isRtmpActive]);

    return (
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
        />

        {status === 'connecting' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-bold">
            Connecting Stream...
            </div>
        )}
        {status === 'error' && (
            <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center text-red-200 text-sm font-bold">
            Stream Connection Failed
            </div>
        )}
        </div>
    );
    };