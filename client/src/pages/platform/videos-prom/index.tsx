import { useState, useEffect, useRef, useCallback } from "react";
import { PlatformLayout } from "../_components/PlatformLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Video,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";

import scene1Img from "@/assets/images/video-scene1-stress.jpg";
import scene2Img from "@/assets/images/video-scene2-dashboard.jpg";
import scene3TruckImg from "@/assets/images/video-scene3-truck.jpg";
import scene3OwnerImg from "@/assets/images/video-scene3-owner.jpg";

const SCENES = [
  {
    duration: 4000,
    label: "Escena 1 - Problema",
    narration: "¿Tu empresa de agua aún toma pedidos manualmente?",
  },
  {
    duration: 6000,
    label: "Escena 2 - Solución",
    narration:
      "Con Gowater punto com, digitaliza tus pedidos, organiza rutas y controla tus clientes en un solo lugar.",
  },
  {
    duration: 6000,
    label: "Escena 3 - Resultado",
    narration: "Más orden. Más control. Más ventas. Gowater punto com. Impulsa tu empresa hoy.",
  },
];

const TOTAL_DURATION = SCENES.reduce((acc, s) => acc + s.duration, 0);

function createBackgroundMusic(audioCtx: AudioContext): () => void {
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.08;
  gainNode.connect(audioCtx.destination);

  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
  let noteIndex = 0;
  let intervalId: ReturnType<typeof setInterval>;

  const playNote = () => {
    const osc = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = notes[noteIndex % notes.length];
    noteGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.8);
    osc.connect(noteGain);
    noteGain.connect(gainNode);
    osc.start();
    osc.stop(audioCtx.currentTime + 2);
    noteIndex++;

    const pad = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    pad.type = "triangle";
    pad.frequency.value = notes[noteIndex % notes.length] / 2;
    padGain.gain.value = 0.15;
    pad.connect(padGain);
    padGain.connect(gainNode);
    pad.start();
    pad.stop(audioCtx.currentTime + 2);
  };

  playNote();
  intervalId = setInterval(playNote, 2000);

  return () => {
    clearInterval(intervalId);
    gainNode.disconnect();
  };
}

function speakNarration(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const spanishVoice = voices.find(
    (v) => v.lang.startsWith("es") && v.name.toLowerCase().includes("google")
  ) || voices.find((v) => v.lang.startsWith("es"));
  if (spanishVoice) utterance.voice = spanishVoice;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function VideosProm() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopMusicRef = useRef<(() => void) | null>(null);
  const lastNarratedSceneRef = useRef<number>(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const imageUrls: { [key: string]: string } = {
      scene1: scene1Img,
      scene2: scene2Img,
      scene3truck: scene3TruckImg,
      scene3owner: scene3OwnerImg,
    };
    let loaded = 0;
    const total = Object.keys(imageUrls).length;
    Object.entries(imageUrls).forEach(([key, url]) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imagesRef.current[key] = img;
        loaded++;
        if (loaded >= total) setImagesLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= total) setImagesLoaded(true);
      };
      img.src = url;
    });

    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }

    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = useCallback(() => {
    if (stopMusicRef.current) {
      stopMusicRef.current();
      stopMusicRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const startAudio = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      stopMusicRef.current = createBackgroundMusic(ctx);
    } catch (e) {}
  }, [isMuted]);

  const getCurrentScene = useCallback(() => {
    let accumulated = 0;
    for (let i = 0; i < SCENES.length; i++) {
      if (currentTime < accumulated + SCENES[i].duration) {
        return { index: i, progress: (currentTime - accumulated) / SCENES[i].duration };
      }
      accumulated += SCENES[i].duration;
    }
    return { index: SCENES.length - 1, progress: 1 };
  }, [currentTime]);

  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, sceneIdx: number, progress: number) => {
      ctx.clearRect(0, 0, width, height);

      if (sceneIdx === 0) {
        const img = imagesRef.current.scene1;
        if (img) {
          ctx.globalAlpha = 0.4;
          const scale = Math.max(width / img.width, height / img.height);
          const iw = img.width * scale;
          const ih = img.height * scale;
          ctx.drawImage(img, (width - iw) / 2, (height - ih) / 2, iw, ih);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, width, height);

        const textOpacity = Math.min(1, Math.max(0, (progress - 0.15) * 3));
        ctx.globalAlpha = textOpacity;
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(width * 0.04)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const line1 = '"¿Tu empresa de agua aún toma pedidos';
        const line2 = 'manualmente?"';
        ctx.fillText(line1, width / 2, height / 2 - width * 0.03);

        ctx.fillStyle = "#ef4444";
        ctx.fillText(line2, width / 2, height / 2 + width * 0.03);

        ctx.globalAlpha = Math.min(1, Math.max(0, (progress - 0.6) * 3));
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `${Math.round(width * 0.018)}px -apple-system, sans-serif`;
        ctx.fillText("Desorden  •  Errores  •  Pérdida de tiempo", width / 2, height / 2 + width * 0.08);
        ctx.globalAlpha = 1;
      }

      if (sceneIdx === 1) {
        const img = imagesRef.current.scene2;
        if (img) {
          ctx.globalAlpha = 0.3;
          const scale = Math.max(width / img.width, height / img.height);
          const iw = img.width * scale;
          const ih = img.height * scale;
          ctx.drawImage(img, (width - iw) / 2, (height - ih) / 2, iw, ih);
          ctx.globalAlpha = 1;
        }
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "rgba(37,99,235,0.85)");
        grad.addColorStop(1, "rgba(55,48,163,0.85)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const titleOpacity = Math.min(1, progress * 4);
        ctx.globalAlpha = titleOpacity;
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(width * 0.05)}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("Gowater.com", width / 2, height * 0.18);

        ctx.font = `${Math.round(width * 0.022)}px -apple-system, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        const descLine1 = "Digitaliza tus pedidos, organiza rutas";
        const descLine2 = "y controla tus clientes en un solo lugar.";
        ctx.fillText(descLine1, width / 2, height * 0.28);
        ctx.fillText(descLine2, width / 2, height * 0.33);

        const mockOpacity = Math.min(1, Math.max(0, (progress - 0.15) * 4));
        ctx.globalAlpha = mockOpacity;

        const mockW = width * 0.55;
        const mockH = height * 0.28;
        const mockX = (width - mockW) / 2;
        const mockY = height * 0.38;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        const r = 16;
        ctx.moveTo(mockX + r, mockY);
        ctx.lineTo(mockX + mockW - r, mockY);
        ctx.quadraticCurveTo(mockX + mockW, mockY, mockX + mockW, mockY + r);
        ctx.lineTo(mockX + mockW, mockY + mockH - r);
        ctx.quadraticCurveTo(mockX + mockW, mockY + mockH, mockX + mockW - r, mockY + mockH);
        ctx.lineTo(mockX + r, mockY + mockH);
        ctx.quadraticCurveTo(mockX, mockY + mockH, mockX, mockY + mockH - r);
        ctx.lineTo(mockX, mockY + r);
        ctx.quadraticCurveTo(mockX, mockY, mockX + r, mockY);
        ctx.fill();

        const stats = [
          { label: "Pedidos hoy", value: "47", color: "#93c5fd" },
          { label: "Entregas", value: "38", color: "#6ee7b7" },
          { label: "Clientes", value: "156", color: "#c4b5fd" },
        ];
        const statW = mockW / 3 - 10;
        stats.forEach((stat, i) => {
          const sx = mockX + 15 + i * (statW + 10);
          const sy = mockY + 20;
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(sx, sy, statW, mockH - 40);
          ctx.fillStyle = stat.color;
          ctx.font = `bold ${Math.round(width * 0.035)}px -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(stat.value, sx + statW / 2, sy + (mockH - 40) / 2 - 5);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = `${Math.round(width * 0.014)}px -apple-system, sans-serif`;
          ctx.fillText(stat.label, sx + statW / 2, sy + (mockH - 40) / 2 + 20);
        });

        const features = ["📲 Pedidos online", "🚚 Optimización de rutas", "📊 Control total"];
        const featureW = width * 0.25;
        const featureGap = 20;
        const totalFeatureW = featureW * 3 + featureGap * 2;
        const startX = (width - totalFeatureW) / 2;
        const featureY = height * 0.75;

        features.forEach((text, i) => {
          const fOpacity = Math.min(1, Math.max(0, (progress - 0.2 - i * 0.15) * 4));
          ctx.globalAlpha = fOpacity;
          const fx = startX + i * (featureW + featureGap);
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.beginPath();
          ctx.moveTo(fx + 12, featureY);
          ctx.lineTo(fx + featureW - 12, featureY);
          ctx.quadraticCurveTo(fx + featureW, featureY, fx + featureW, featureY + 12);
          ctx.lineTo(fx + featureW, featureY + 50 - 12);
          ctx.quadraticCurveTo(fx + featureW, featureY + 50, fx + featureW - 12, featureY + 50);
          ctx.lineTo(fx + 12, featureY + 50);
          ctx.quadraticCurveTo(fx, featureY + 50, fx, featureY + 50 - 12);
          ctx.lineTo(fx, featureY + 12);
          ctx.quadraticCurveTo(fx, featureY, fx + 12, featureY);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(width * 0.018)}px -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(text, fx + featureW / 2, featureY + 30);
        });
        ctx.globalAlpha = 1;
      }

      if (sceneIdx === 2) {
        const truckImg = imagesRef.current.scene3truck;
        const ownerImg = imagesRef.current.scene3owner;

        if (truckImg) {
          ctx.globalAlpha = 0.25 * Math.min(1, progress * 3);
          const scale = Math.max(width / truckImg.width, height / truckImg.height);
          ctx.drawImage(
            truckImg,
            (width - truckImg.width * scale) / 2,
            (height - truckImg.height * scale) / 2,
            truckImg.width * scale,
            truckImg.height * scale
          );
          ctx.globalAlpha = 1;
        }

        const grad2 = ctx.createLinearGradient(0, 0, width, height);
        grad2.addColorStop(0, "rgba(255,255,255,0.8)");
        grad2.addColorStop(0.5, "rgba(239,246,255,0.8)");
        grad2.addColorStop(1, "rgba(238,242,255,0.8)");
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, width, height);

        if (ownerImg && progress > 0.1) {
          ctx.globalAlpha = Math.min(0.4, Math.max(0, (progress - 0.1) * 1.5));
          const ow = width * 0.25;
          const oh = (ow / ownerImg.width) * ownerImg.height;
          ctx.drawImage(ownerImg, width * 0.72, height * 0.15, ow, Math.min(oh, height * 0.5));
          ctx.globalAlpha = 1;
        }

        const phrases = [
          { text: "Más orden.", color: "#2563eb", delay: 0 },
          { text: "Más control.", color: "#4f46e5", delay: 0.15 },
          { text: "Más ventas.", color: "#059669", delay: 0.3 },
        ];

        const phraseY = height * 0.3;
        phrases.forEach((phrase, i) => {
          const pOpacity = Math.min(1, Math.max(0, (progress - phrase.delay) * 4));
          ctx.globalAlpha = pOpacity;
          ctx.fillStyle = phrase.color;
          ctx.font = `800 ${Math.round(width * 0.05)}px -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(phrase.text, width * 0.4, phraseY + i * width * 0.065);
        });

        const brandOpacity = Math.min(1, Math.max(0, (progress - 0.5) * 3));
        ctx.globalAlpha = brandOpacity;

        ctx.fillStyle = "#2563eb";
        ctx.font = `900 ${Math.round(width * 0.07)}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("💧 Gowater.com", width / 2, height * 0.7);

        ctx.fillStyle = "#374151";
        ctx.font = `bold ${Math.round(width * 0.03)}px -apple-system, sans-serif`;
        ctx.fillText("Impulsa tu empresa hoy.", width / 2, height * 0.8);
        ctx.globalAlpha = 1;
      }
    },
    []
  );

  const drawSubtitleOnCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, text: string, cWidth: number, cHeight: number) => {
      ctx.save();
      const fontSize = Math.round(cWidth * 0.022);
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      const padding = 16;
      const boxH = fontSize + padding * 2;
      const boxY = cHeight - boxH - 30;

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      const boxW = Math.min(cWidth * 0.85, ctx.measureText(text).width + padding * 4);
      const boxX = (cWidth - boxW) / 2;
      ctx.beginPath();
      ctx.moveTo(boxX + 10, boxY);
      ctx.lineTo(boxX + boxW - 10, boxY);
      ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + 10);
      ctx.lineTo(boxX + boxW, boxY + boxH - 10);
      ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - 10, boxY + boxH);
      ctx.lineTo(boxX + 10, boxY + boxH);
      ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - 10);
      ctx.lineTo(boxX, boxY + 10);
      ctx.quadraticCurveTo(boxX, boxY, boxX + 10, boxY);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, cWidth / 2, boxY + boxH - padding);
      ctx.restore();
    },
    []
  );

  useEffect(() => {
    if (!isPlaying || !canvasRef.current || !imagesLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { index, progress } = getCurrentScene();
    drawScene(ctx, canvas.width, canvas.height, index, progress);
    drawSubtitleOnCanvas(ctx, SCENES[index].narration, canvas.width, canvas.height);

    if (index !== lastNarratedSceneRef.current && !isMuted) {
      lastNarratedSceneRef.current = index;
      speakNarration(SCENES[index].narration);
    }
  }, [currentTime, isPlaying, imagesLoaded, isMuted, getCurrentScene, drawScene, drawSubtitleOnCanvas]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimestampRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= TOTAL_DURATION) {
          setIsPlaying(false);
          stopAllAudio();
          return TOTAL_DURATION;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, stopAllAudio]);

  const handlePlayPause = () => {
    if (currentTime >= TOTAL_DURATION) {
      setCurrentTime(0);
      lastTimestampRef.current = null;
      lastNarratedSceneRef.current = -1;
    }
    if (!isPlaying) {
      startAudio();
      setIsPlaying(true);
    } else {
      stopAllAudio();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    stopAllAudio();
    setIsPlaying(false);
    lastTimestampRef.current = null;
    lastNarratedSceneRef.current = -1;
    setCurrentTime(0);
    requestAnimationFrame(() => {
      startAudio();
      setIsPlaying(true);
    });
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      stopAllAudio();
    } else if (isPlaying) {
      startAudio();
    }
    setIsMuted(!isMuted);
  };

  const handleRecordAndDownload = async () => {
    if (!canvasRef.current || isRecording) return;
    setIsRecording(true);
    setRecordingProgress(0);

    stopAllAudio();
    setCurrentTime(0);
    lastTimestampRef.current = null;
    lastNarratedSceneRef.current = -1;
    setIsPlaying(false);

    await new Promise((r) => setTimeout(r, 200));

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsRecording(false);
      return;
    }

    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.08;
    gainNode.connect(dest);

    const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
    let noteIdx = 0;
    const playRecNote = () => {
      const osc = audioCtx.createOscillator();
      const ng = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[noteIdx % notes.length];
      ng.gain.setValueAtTime(0.3, audioCtx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.8);
      osc.connect(ng);
      ng.connect(gainNode);
      osc.start();
      osc.stop(audioCtx.currentTime + 2);

      const pad = audioCtx.createOscillator();
      const pg = audioCtx.createGain();
      pad.type = "triangle";
      pad.frequency.value = notes[noteIdx % notes.length] / 2;
      pg.gain.value = 0.15;
      pad.connect(pg);
      pg.connect(gainNode);
      pad.start();
      pad.stop(audioCtx.currentTime + 2);
      noteIdx++;
    };
    playRecNote();
    const musicInterval = setInterval(playRecNote, 2000);

    const canvasStream = canvas.captureStream(30);
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      clearInterval(musicInterval);
      audioCtx.close().catch(() => {});
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gowater-video-promocional.webm";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setRecordingProgress(100);
    };

    recorder.start(100);

    let recTime = 0;
    const FPS = 30;
    const frameInterval = 1000 / FPS;
    let lastRecNarratedScene = -1;

    const drawSubtitle = (text: string, cWidth: number, cHeight: number) => {
      ctx.save();
      const fontSize = Math.round(cWidth * 0.022);
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      const padding = 16;
      const boxH = fontSize + padding * 2;
      const boxY = cHeight - boxH - 30;

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      const boxW = Math.min(cWidth * 0.85, ctx.measureText(text).width + padding * 4);
      const boxX = (cWidth - boxW) / 2;
      ctx.beginPath();
      ctx.moveTo(boxX + 10, boxY);
      ctx.lineTo(boxX + boxW - 10, boxY);
      ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + 10);
      ctx.lineTo(boxX + boxW, boxY + boxH - 10);
      ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - 10, boxY + boxH);
      ctx.lineTo(boxX + 10, boxY + boxH);
      ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - 10);
      ctx.lineTo(boxX, boxY + 10);
      ctx.quadraticCurveTo(boxX, boxY, boxX + 10, boxY);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, cWidth / 2, boxY + boxH - padding);
      ctx.restore();
    };

    const renderFrame = () => {
      if (recTime >= TOTAL_DURATION) {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        recorder.stop();
        return;
      }

      let accumulated = 0;
      let sceneIdx = 0;
      let sceneProgress = 0;
      for (let i = 0; i < SCENES.length; i++) {
        if (recTime < accumulated + SCENES[i].duration) {
          sceneIdx = i;
          sceneProgress = (recTime - accumulated) / SCENES[i].duration;
          break;
        }
        accumulated += SCENES[i].duration;
        if (i === SCENES.length - 1) {
          sceneIdx = i;
          sceneProgress = 1;
        }
      }

      drawScene(ctx, canvas.width, canvas.height, sceneIdx, sceneProgress);

      const narrationText = SCENES[sceneIdx].narration;
      if (narrationText) {
        drawSubtitle(narrationText, canvas.width, canvas.height);
      }

      if (sceneIdx !== lastRecNarratedScene) {
        lastRecNarratedScene = sceneIdx;
        speakNarration(SCENES[sceneIdx].narration);
      }

      setRecordingProgress(Math.round((recTime / TOTAL_DURATION) * 100));

      recTime += frameInterval;
      setTimeout(renderFrame, frameInterval);
    };

    renderFrame();
  };

  useEffect(() => {
    if (!canvasRef.current || isPlaying) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || !imagesLoaded) return;

    const { index, progress } = getCurrentScene();
    drawScene(ctx, canvas.width, canvas.height, index, progress);
    drawSubtitleOnCanvas(ctx, SCENES[index].narration, canvas.width, canvas.height);
  }, [imagesLoaded, getCurrentScene, drawScene, drawSubtitleOnCanvas, isPlaying]);

  const overallProgress = (currentTime / TOTAL_DURATION) * 100;
  const { index: currentSceneIndex } = getCurrentScene();

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-6 h-6 text-blue-600" />
              Videos Promocionales
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Video promocional de Gowater.com - 16 segundos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRecordAndDownload}
              disabled={isRecording || !imagesLoaded}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2"
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Grabando {recordingProgress}%
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Descargar Video
                </>
              )}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl shadow-lg">
          <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full h-full"
            />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePlayPause}
                disabled={!imagesLoaded || isRecording}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 mr-1" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                {isPlaying ? "Pausar" : "Reproducir"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleRestart} disabled={isRecording}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reiniciar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleToggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="font-mono">
                {Math.floor(currentTime / 1000)
                  .toString()
                  .padStart(2, "0")}
                s / {Math.floor(TOTAL_DURATION / 1000)}s
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline font-medium">
                {currentTime >= TOTAL_DURATION
                  ? "Finalizado"
                  : SCENES[currentSceneIndex]?.label}
              </span>
            </div>

            <div className="flex gap-1.5 ml-auto">
              {SCENES.map((scene, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === currentSceneIndex && currentTime < TOTAL_DURATION
                      ? "bg-blue-600 scale-110"
                      : i < currentSceneIndex || currentTime >= TOTAL_DURATION
                      ? "bg-blue-300"
                      : "bg-gray-300"
                  }`}
                  title={scene.label}
                />
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SCENES.map((scene, i) => (
            <Card key={i} className="p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                    i === 0 ? "bg-red-500" : i === 1 ? "bg-blue-600" : "bg-emerald-500"
                  }`}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-sm">{scene.label}</p>
                  <p className="text-xs text-gray-400">{scene.duration / 1000} segundos</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                <span className="font-medium text-gray-800">Narración:</span> "{scene.narration}"
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {i === 0 &&
                  "Imagen de fondo: persona estresada con papeles y celular. Overlay oscuro con texto animado."}
                {i === 1 &&
                  "Imagen de fondo: dashboard en pantalla. Overlay azul con mockup de estadísticas y features."}
                {i === 2 &&
                  "Imágenes: camión de entregas + dueño con celular. Texto final grande con branding Gowater."}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </PlatformLayout>
  );
}
