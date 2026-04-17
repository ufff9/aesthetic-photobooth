"use client";

import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { useGesture } from "@use-gesture/react";
import {
  Camera,
  Download,
  CheckCircle2,
  RotateCcw,
  PlusCircle,
  X,
} from "lucide-react";

// --- KONFIGURASI TEMA & STIKER ---
const THEMES = [
  { id: "white", name: "White", bg: "#FFFFFF", text: "#333333" },
  { id: "dark", name: "Dark", bg: "#18181b", text: "#FFFFFF" },
  { id: "pink", name: "Pastel", bg: "#fce7f3", text: "#db2777" },
  { id: "blue", name: "Sky", bg: "#e0f2fe", text: "#0369a1" },
];

const STICKER_LIST = [
  "❤️",
  "✨",
  "🎀",
  "🌸",
  "🧸",
  "☁️",
  "🌈",
  "🐱",
  "📸",
  "🎨",
];

// --- KOMPONEN STIKER (MENDUKUNG PINCH & ROTATE) ---
const DraggableSticker = ({ stk, onDelete }: any) => {
  const [style, setStyle] = useState({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  });

  const bind = useGesture(
    {
      onDrag: ({ offset: [x, y] }) => {
        setStyle((s) => ({ ...s, x, y }));
      },
      onPinch: ({ offset: [d, a] }) => {
        setStyle((s) => ({
          ...s,
          scale: Math.max(0.5, Math.min(d, 3)),
          rotation: a,
        }));
      },
    },
    {
      drag: { from: () => [style.x, style.y] },
      pinch: { from: () => [style.scale, style.rotation] },
    },
  );

  return (
    <div
      {...bind()}
      ref={stk.nodeRef}
      className="absolute z-50 group touch-none select-none"
      style={{
        left: "35%",
        top: "25%",
        transform: `translate(${style.x}px, ${style.y}px) rotate(${style.rotation}deg) scale(${style.scale})`,
        transformOrigin: "center center",
      }}
    >
      <button
        onClick={() => onDelete(stk.id)}
        className="absolute -top-6 -right-6 p-2 bg-red-500 text-white rounded-full shadow-lg z-[60] active:scale-90"
      >
        <X size={14} />
      </button>
      <div className="emoji-target text-6xl p-2 cursor-grab active:cursor-grabbing">
        {stk.emoji}
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA ---
export default function FinalAestheticBooth() {
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [finalStrip, setFinalStrip] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [dynamicText, setDynamicText] = useState("Happy Moments");
  const [placedStickers, setPlacedStickers] = useState<any[]>([]);

  // Menangkap Foto (Tanpa Terbalik)
  const handleCapture = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot();
    if (shot && photos.length < 3) {
      setPhotos((prev) => [...prev, shot]);
    }
  }, [photos]);

  const addSticker = (emoji: string) => {
    setPlacedStickers((prev) => [
      ...prev,
      {
        id: Date.now(),
        emoji,
        nodeRef: React.createRef(),
      },
    ]);
  };

  // Render ke Gambar Final
  const generateFinalImage = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1900;

    // Background sesuai tema
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const photoW = canvas.width - padding * 2;
    const photoH = (photoW * 3) / 4;

    // Menggambar Foto
    for (let i = 0; i < photos.length; i++) {
      const img = new Image();
      img.src = photos[i];
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(
            img,
            padding,
            padding + i * (photoH + 35),
            photoW,
            photoH,
          );
          resolve(null);
        };
      });
    }

    // Menggambar Stiker dengan presisi posisi & rotasi
    const container = containerRef.current;
    if (container) {
      const scaleCanvas = canvas.width / container.offsetWidth;
      placedStickers.forEach((stk) => {
        const el = stk.nodeRef.current;
        if (el) {
          const rect = el
            .querySelector(".emoji-target")
            .getBoundingClientRect();
          const parentRect = container.getBoundingClientRect();

          const computedStyle = window.getComputedStyle(el);
          const matrix = new DOMMatrix(computedStyle.transform);
          const rotation = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
          const scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);

          const canvasX =
            (rect.left - parentRect.left + rect.width / 2) * scaleCanvas;
          const canvasY =
            (rect.top - parentRect.top + rect.height / 2) * scaleCanvas;

          ctx.save();
          ctx.translate(canvasX, canvasY);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.font = `${60 * scale * scaleCanvas}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(stk.emoji, 0, 0);
          ctx.restore();
        }
      });
    }

    // Caption bawah
    ctx.fillStyle = currentTheme.text;
    ctx.font = "italic 44px serif";
    ctx.textAlign = "center";
    ctx.fillText(dynamicText, canvas.width / 2, canvas.height - 80);

    setFinalStrip(canvas.toDataURL("image/png"));
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center h-screen bg-zinc-50 p-4 text-zinc-800 overflow-hidden">
      <div className="mb-2 shrink-0 text-center">
        <h1 className="text-xl font-serif italic font-bold">Studio Strip</h1>
        <p className="text-[10px] text-zinc-400 tracking-widest uppercase">
          {photos.length}/3 shots
        </p>
      </div>

      <div className="w-full flex-1 flex items-center justify-center min-h-0 relative">
        <div
          ref={containerRef}
          className="relative shadow-2xl border-[6px] border-white rounded-sm bg-white overflow-hidden"
          style={{
            aspectRatio: "8/19",
            height: "100%",
            backgroundColor: isEditing || finalStrip ? currentTheme.bg : "#fff",
          }}
        >
          {/* Layar Kamera & Review Foto */}
          {!isEditing && !finalStrip && (
            <div className="absolute inset-0 flex flex-col p-3 gap-2 justify-center">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-full aspect-[4/3] object-cover rounded-sm"
                  alt="shot"
                />
              ))}
              {photos.length < 3 && (
                <div className="w-full aspect-[4/3] bg-zinc-900 overflow-hidden rounded-sm relative">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/png"
                    mirrored={true}
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: "user" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Layar Edit Stiker */}
          {isEditing && (
            <div className="relative h-full w-full flex flex-col p-[6%] gap-[2%] overflow-hidden">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-full aspect-[4/3] object-cover rounded-sm pointer-events-none"
                  alt="edit"
                />
              ))}
              {placedStickers.map((stk) => (
                <DraggableSticker
                  key={stk.id}
                  stk={stk}
                  onDelete={(id: number) =>
                    setPlacedStickers((p) => p.filter((s) => s.id !== id))
                  }
                />
              ))}
              <p
                style={{ color: currentTheme.text }}
                className="mt-auto mb-4 text-center font-serif italic text-sm"
              >
                {dynamicText}
              </p>
            </div>
          )}

          {/* Tampilan Akhir */}
          {finalStrip && (
            <img
              src={finalStrip}
              className="w-full h-full object-contain"
              alt="final"
            />
          )}
        </div>
      </div>

      {/* Kontrol Navigasi */}
      <div className="w-full max-w-[340px] mt-4 space-y-3 shrink-0 pb-4">
        {!finalStrip && (
          <div className="flex justify-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-zinc-100">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setCurrentTheme(t)}
                className={`w-6 h-6 rounded-full border-2 ${
                  currentTheme.id === t.id
                    ? "scale-125 border-zinc-800"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: t.bg }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!isEditing && !finalStrip ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPhotos(photos.slice(0, -1))}
                className="p-4 bg-white rounded-full border border-zinc-200 active:bg-zinc-100"
              >
                <RotateCcw size={22} />
              </button>
              <button
                onClick={handleCapture}
                disabled={photos.length >= 3}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex justify-center gap-2 active:scale-95 transition-transform"
              >
                <Camera size={20} /> {photos.length < 3 ? "Jepret" : "Selesai"}
              </button>
              {photos.length === 3 && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-4 bg-green-500 text-white rounded-full animate-bounce"
                >
                  <CheckCircle2 size={22} />
                </button>
              )}
            </div>
          ) : isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={dynamicText}
                onChange={(e) => setDynamicText(e.target.value)}
                className="w-full p-3 rounded-xl border text-sm outline-none focus:border-zinc-800"
                placeholder="Tambah caption..."
              />
              <div className="flex overflow-x-auto gap-2 p-1 no-scrollbar">
                {STICKER_LIST.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSticker(s)}
                    className="text-2xl min-w-[50px] h-[50px] bg-white rounded-xl border shadow-sm active:scale-90"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={generateFinalImage}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold"
              >
                Simpan & Download
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={finalStrip!}
                download="photostrip.png"
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center flex justify-center gap-2"
              >
                <Download size={20} /> Simpan ke Perangkat
              </a>
              <button
                onClick={() => {
                  setPhotos([]);
                  setIsEditing(false);
                  setFinalStrip(null);
                  setPlacedStickers([]);
                }}
                className="w-full py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold"
              >
                <PlusCircle size={14} className="inline mr-1" /> Mulai Sesi Baru
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
