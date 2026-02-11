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
  MessageSquare,
  FileText,
  Truck,
  BarChart3,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  Droplet
} from "lucide-react";

const SCENES = [
  { duration: 4000, label: "Escena 1 - Problema" },
  { duration: 6000, label: "Escena 2 - Solución" },
  { duration: 6000, label: "Escena 3 - Resultado" },
];

const TOTAL_DURATION = SCENES.reduce((acc, s) => acc + s.duration, 0);

function Scene1({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-gray-400"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              fontSize: `${20 + (i % 3) * 10}px`,
              transform: `rotate(${i * 15}deg)`,
            }}
          >
            📄
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        <div className="flex items-center gap-6">
          <div 
            className="relative"
            style={{
              animation: "shake 0.5s ease-in-out infinite",
              opacity: Math.min(1, progress * 3),
              transform: `scale(${0.8 + Math.min(0.2, progress * 0.6)})`,
            }}
          >
            <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-red-200">
              <MessageSquare className="w-12 h-12 text-green-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">12</span>
            </div>
          </div>

          <div 
            className="text-4xl font-bold text-gray-300"
            style={{ opacity: Math.min(1, progress * 4) }}
          >
            +
          </div>

          <div
            style={{
              opacity: Math.min(1, progress * 2),
              transform: `translateY(${Math.max(0, (1 - progress * 2)) * 30}px)`,
            }}
          >
            <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-orange-200 relative">
              <FileText className="w-12 h-12 text-orange-500" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px]">!</span>
              </div>
            </div>
          </div>

          <div 
            className="text-4xl font-bold text-gray-300"
            style={{ opacity: Math.min(1, progress * 4) }}
          >
            +
          </div>

          <div
            style={{
              opacity: Math.min(1, progress * 2.5),
              transform: `rotate(${Math.sin(progress * 10) * 5}deg)`,
            }}
          >
            <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-yellow-200">
              <span className="text-4xl">😰</span>
            </div>
          </div>
        </div>

        <div
          className="text-center max-w-2xl"
          style={{
            opacity: Math.min(1, Math.max(0, (progress - 0.2) * 2.5)),
            transform: `translateY(${Math.max(0, (1 - Math.max(0, (progress - 0.2)) * 3)) * 20}px)`,
          }}
        >
          <p className="text-2xl md:text-3xl font-bold text-gray-800 leading-relaxed">
            "¿Tu empresa de agua aún toma pedidos{" "}
            <span className="text-red-500">manualmente</span>?"
          </p>
        </div>

        <div
          className="flex items-center gap-2 mt-2"
          style={{
            opacity: Math.min(1, Math.max(0, (progress - 0.5) * 3)),
          }}
        >
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-sm text-gray-500 font-medium">Desorden • Errores • Pérdida de tiempo</span>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px) rotate(-1deg); }
          75% { transform: translateX(3px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}

function Scene2({ progress }: { progress: number }) {
  const features = [
    { icon: Smartphone, text: "📲 Pedidos online", color: "from-blue-500 to-blue-600", delay: 0.15 },
    { icon: Truck, text: "🚚 Optimización de rutas", color: "from-emerald-500 to-emerald-600", delay: 0.35 },
    { icon: BarChart3, text: "📊 Control total", color: "from-purple-500 to-purple-600", delay: 0.55 },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
      <div className="absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${100 + i * 80}px`,
              height: `${100 + i * 80}px`,
              left: `${50 + Math.cos(i) * 30}%`,
              top: `${50 + Math.sin(i) * 30}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-4xl w-full">
        <div
          className="text-center"
          style={{
            opacity: Math.min(1, progress * 4),
            transform: `translateY(${Math.max(0, (1 - progress * 3)) * 30}px)`,
          }}
        >
          <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-2xl">
            Con <span className="font-extrabold text-white text-3xl md:text-4xl">Gowater.com</span> digitaliza tus pedidos, organiza rutas y controla tus clientes{" "}
            <span className="text-yellow-300 font-bold">en un solo lugar.</span>
          </p>
        </div>

        <div
          className="w-full max-w-2xl bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-2xl"
          style={{
            opacity: Math.min(1, Math.max(0, (progress - 0.1) * 3)),
            transform: `scale(${0.9 + Math.min(0.1, Math.max(0, (progress - 0.1)) * 0.3)})`,
          }}
        >
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white/10 rounded-lg px-3 py-1 text-sm text-white/60">
              gowater.com/dashboard
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pedidos hoy", value: "47", color: "text-blue-300" },
              { label: "Entregas", value: "38", color: "text-emerald-300" },
              { label: "Clientes", value: "156", color: "text-purple-300" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
                  style={{ width: `${40 + i * 15}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center"
              style={{
                opacity: Math.min(1, Math.max(0, (progress - feature.delay) * 4)),
                transform: `translateY(${Math.max(0, (1 - Math.max(0, (progress - feature.delay)) * 4)) * 30}px)`,
              }}
            >
              <div className="text-lg font-bold text-white">{feature.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Scene3({ progress }: { progress: number }) {
  const phrases = [
    { text: "Más orden.", delay: 0, color: "text-blue-600" },
    { text: "Más control.", delay: 0.15, color: "text-indigo-600" },
    { text: "Más ventas.", delay: 0.3, color: "text-emerald-600" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-white via-blue-50 to-indigo-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${10 + (i % 4) * 25}%`,
              top: `${20 + Math.floor(i / 4) * 60}%`,
              opacity: 0.05,
              fontSize: "80px",
            }}
          >
            💧
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        <div className="flex items-center gap-6 mb-4">
          {[Truck, Smartphone, CheckCircle2].map((Icon, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg"
              style={{
                opacity: Math.min(1, Math.max(0, (progress - i * 0.1) * 5)),
                transform: `scale(${0.5 + Math.min(0.5, Math.max(0, (progress - i * 0.1)) * 2)})`,
              }}
            >
              <Icon className="w-8 h-8 text-white" />
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {phrases.map((phrase, i) => (
            <div
              key={i}
              className="text-center"
              style={{
                opacity: Math.min(1, Math.max(0, (progress - phrase.delay) * 4)),
                transform: `translateY(${Math.max(0, (1 - Math.max(0, (progress - phrase.delay)) * 4)) * 20}px)`,
              }}
            >
              <span className={`text-3xl md:text-4xl font-extrabold ${phrase.color}`}>
                {phrase.text}
              </span>
            </div>
          ))}
        </div>

        <div
          className="mt-8 text-center"
          style={{
            opacity: Math.min(1, Math.max(0, (progress - 0.5) * 3)),
            transform: `scale(${0.8 + Math.min(0.2, Math.max(0, (progress - 0.5)) * 0.6)})`,
          }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Droplet className="w-10 h-10 text-blue-600" />
            <span className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              Gowater.com
            </span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-700 mt-4">
            Impulsa tu empresa hoy.
          </p>
        </div>

        <div
          className="flex items-center gap-2 mt-4"
          style={{
            opacity: Math.min(1, Math.max(0, (progress - 0.7) * 4)),
          }}
        >
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-medium text-gray-500">
            Plataforma líder en gestión de empresas de agua
          </span>
        </div>
      </div>
    </div>
  );
}

export default function VideosProm() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

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
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (currentTime >= TOTAL_DURATION) {
      setCurrentTime(0);
      lastTimestampRef.current = null;
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    lastTimestampRef.current = null;
    setIsPlaying(true);
  };

  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gowater.com - Video Promocional</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden;width:100vw;height:100vh}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 0.8s ease}
.scene.active{opacity:1}
.scene1{background:linear-gradient(135deg,#f3f4f6,#e5e7eb)}
.scene2{background:linear-gradient(135deg,#2563eb,#3730a3)}
.scene3{background:linear-gradient(135deg,#ffffff,#eff6ff,#eef2ff)}
.icon-box{width:96px;height:96px;background:white;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;font-size:48px;border:2px solid #fee2e2}
.voice-text{font-size:clamp(1.5rem,4vw,2rem);font-weight:700;color:#1f2937;text-align:center;max-width:600px;line-height:1.4;animation:fadeUp 0.8s ease forwards}
.manual{color:#ef4444}
.dashboard-mock{background:rgba(255,255,255,0.1);backdrop-filter:blur(8px);border-radius:16px;border:1px solid rgba(255,255,255,0.2);padding:24px;max-width:500px;width:90%;margin:20px auto}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat{background:rgba(255,255,255,0.1);border-radius:12px;padding:12px;text-align:center}
.stat-value{font-size:1.8rem;font-weight:700;color:#93c5fd}
.stat-label{font-size:0.75rem;color:rgba(255,255,255,0.6);margin-top:4px}
.feature-row{display:flex;gap:16px;margin-top:20px;flex-wrap:wrap;justify-content:center}
.feature-card{background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);border-radius:12px;padding:16px;border:1px solid rgba(255,255,255,0.2);text-align:center;font-size:1.1rem;font-weight:700;color:white;flex:1;min-width:150px;animation:fadeUp 0.6s ease forwards}
.scene2-title{font-size:clamp(1.2rem,3vw,1.5rem);color:rgba(255,255,255,0.9);text-align:center;max-width:600px;line-height:1.5}
.scene2-title strong{color:white;font-size:clamp(1.8rem,5vw,2.5rem);display:block;margin-bottom:8px}
.highlight{color:#fde047;font-weight:700}
.phrases{display:flex;gap:24px;flex-wrap:wrap;justify-content:center}
.phrase{font-size:clamp(1.8rem,5vw,2.5rem);font-weight:800}
.phrase.blue{color:#2563eb}
.phrase.indigo{color:#4f46e5}
.phrase.green{color:#059669}
.brand{text-align:center;margin-top:32px}
.brand-name{font-size:clamp(2.5rem,7vw,4rem);font-weight:900;background:linear-gradient(90deg,#2563eb,#4338ca);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.brand-sub{font-size:clamp(1.2rem,3vw,1.5rem);font-weight:700;color:#374151;margin-top:12px}
.icons-row{display:flex;gap:16px;margin-bottom:16px}
.icon-circle{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:24px;color:white;box-shadow:0 8px 20px rgba(59,130,246,0.3)}
.controls{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:100}
.ctrl-btn{padding:10px 20px;border-radius:12px;border:none;font-size:14px;font-weight:600;cursor:pointer;background:#2563eb;color:white}
.ctrl-btn:hover{background:#1d4ed8}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.progress-bar{position:fixed;top:0;left:0;height:4px;background:#2563eb;z-index:100;transition:width 0.1s linear}
</style>
</head>
<body>
<div class="progress-bar" id="progressBar"></div>
<div class="scene scene1" id="scene1">
<div style="display:flex;align-items:center;gap:24px;margin-bottom:32px">
<div class="icon-box">💬</div>
<span style="font-size:2rem;color:#d1d5db;font-weight:700">+</span>
<div class="icon-box" style="border-color:#fed7aa">📄</div>
<span style="font-size:2rem;color:#d1d5db;font-weight:700">+</span>
<div class="icon-box" style="border-color:#fef08a">😰</div>
</div>
<p class="voice-text">"¿Tu empresa de agua aún toma pedidos <span class="manual">manualmente</span>?"</p>
</div>
<div class="scene scene2" id="scene2">
<p class="scene2-title"><strong>Gowater.com</strong>Digitaliza tus pedidos, organiza rutas y controla tus clientes <span class="highlight">en un solo lugar.</span></p>
<div class="dashboard-mock">
<div class="stat-grid">
<div class="stat"><div class="stat-value">47</div><div class="stat-label">Pedidos hoy</div></div>
<div class="stat"><div class="stat-value">38</div><div class="stat-label">Entregas</div></div>
<div class="stat"><div class="stat-value">156</div><div class="stat-label">Clientes</div></div>
</div>
</div>
<div class="feature-row">
<div class="feature-card">📲 Pedidos online</div>
<div class="feature-card" style="animation-delay:0.2s">🚚 Optimización de rutas</div>
<div class="feature-card" style="animation-delay:0.4s">📊 Control total</div>
</div>
</div>
<div class="scene scene3" id="scene3">
<div class="icons-row">
<div class="icon-circle">🚚</div>
<div class="icon-circle">📱</div>
<div class="icon-circle">✅</div>
</div>
<div class="phrases">
<span class="phrase blue">Más orden.</span>
<span class="phrase indigo">Más control.</span>
<span class="phrase green">Más ventas.</span>
</div>
<div class="brand">
<div style="display:flex;align-items:center;justify-content:center;gap:12px"><span style="font-size:2.5rem">💧</span><span class="brand-name">Gowater.com</span></div>
<p class="brand-sub">Impulsa tu empresa hoy.</p>
</div>
</div>
<div class="controls">
<button class="ctrl-btn" id="playBtn" onclick="startVideo()">▶ Reproducir</button>
<button class="ctrl-btn" onclick="location.reload()">↺ Reiniciar</button>
</div>
<script>
const scenes=[{el:document.getElementById('scene1'),duration:4000},{el:document.getElementById('scene2'),duration:6000},{el:document.getElementById('scene3'),duration:6000}];
const totalDuration=scenes.reduce((a,s)=>a+s.duration,0);
const progressBar=document.getElementById('progressBar');
let currentScene=0;let startTime=0;let running=false;
function showScene(i){scenes.forEach((s,idx)=>{s.el.classList.toggle('active',idx===i)})}
function animate(ts){if(!running)return;if(!startTime)startTime=ts;const elapsed=ts-startTime;progressBar.style.width=(elapsed/totalDuration*100)+'%';let acc=0;for(let i=0;i<scenes.length;i++){if(elapsed<acc+scenes[i].duration){showScene(i);break}acc+=scenes[i].duration;if(i===scenes.length-1)showScene(i)}if(elapsed<totalDuration)requestAnimationFrame(animate);else{progressBar.style.width='100%';running=false;document.getElementById('playBtn').textContent='▶ Reproducir'}}
function startVideo(){startTime=0;running=true;document.getElementById('playBtn').textContent='⏸ Pausar';requestAnimationFrame(animate)}
showScene(0);scenes[0].el.classList.add('active');
</script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gowater-video-promocional.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { index: currentSceneIndex, progress: sceneProgress } = getCurrentScene();
  const overallProgress = (currentTime / TOTAL_DURATION) * 100;

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
              Presentación animada de Gowater.com - 16 segundos
            </p>
          </div>
          <Button
            onClick={handleDownloadHTML}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar HTML
          </Button>
        </div>

        <Card className="overflow-hidden rounded-2xl shadow-lg">
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <div className="absolute inset-0">
              {currentSceneIndex === 0 && <Scene1 progress={sceneProgress} />}
              {currentSceneIndex === 1 && <Scene2 progress={sceneProgress} />}
              {currentSceneIndex === 2 && <Scene3 progress={sceneProgress} />}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
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
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 mr-1" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                {isPlaying ? "Pausar" : currentTime >= TOTAL_DURATION ? "Reproducir" : "Reproducir"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reiniciar
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
                {SCENES[currentSceneIndex]?.label || "Finalizado"}
              </span>
            </div>

            <div className="flex gap-1.5 ml-auto">
              {SCENES.map((scene, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === currentSceneIndex
                      ? "bg-blue-600 scale-110"
                      : i < currentSceneIndex
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
                    i === 0
                      ? "bg-red-500"
                      : i === 1
                      ? "bg-blue-600"
                      : "bg-emerald-500"
                  }`}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-sm">{scene.label}</p>
                  <p className="text-xs text-gray-400">{scene.duration / 1000} segundos</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {i === 0 &&
                  'Dueño revisando pedidos por WhatsApp y papeles desordenados. Voz: "¿Tu empresa de agua aún toma pedidos manualmente?"'}
                {i === 1 &&
                  'Dashboard Gowater.com con pedidos, rutas y clientes. Voz: "Con Gowater.com digitaliza tus pedidos..."'}
                {i === 2 &&
                  'Eficiencia y estadísticas. Voz: "Más orden. Más control. Más ventas." Texto final: Gowater.com - Impulsa tu empresa hoy.'}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </PlatformLayout>
  );
}
