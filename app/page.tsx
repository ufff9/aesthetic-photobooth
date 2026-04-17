"use client";

import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { useGesture } from "@use-gesture/react";
import {
  Camera,
  Download,
  Trash2,
  CheckCircle2,
  RotateCcw,
  PlusCircle,
  X,
} from "lucide-react";

// --- KONFIGURASI ---
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

// --- KOMPONEN STIKER (MOBILE TOUCH GESTURE) ---
const DraggableSticker = ({ stk, onDelete }: any) => {
  const [style, setStyle] = useState({
    x: 0,
    y: 0,
    scale: stk.scale,
    rotation: stk.rotation,
  });

  // Handler untuk mendeteksi geser, cubit (zoom), dan putar jari
  const bind = useGesture(
    {
      onDrag: ({ offset: [x, y] }) => {
        setStyle((s) => ({ ...s, x, y }));
      },
      onPinch: ({ offset: [d, a] }) => {
        // d = distance (untuk scale), a = angle (untuk rotasi)
        setStyle((s) => ({
          ...s,
          scale: Math.max(0.5, Math.min(d, 4)), // limit scale 0.5x - 4x
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
      className="absolute z-50 group cursor-grab active:cursor-grabbing touch-none select-none"
      style={{
        left: "50%",
        top: "30%",
        transform: `translate(${style.x}px, ${style.y}px) rotate(${style.rotation}deg) scale(${style.scale})`,
        transformOrigin: "center center",
      }}
    >
      {/* Tombol Hapus Kecil saat aktif */}
      <button
        onClick={() => onDelete(stk.id)}
        className="absolute -top-4 -right-4 p-1 bg-red-500 text-white rounded-full opacity-0 group-active:opacity-100 transition-opacity"
      >
        <X size={12} />
      </button>

      <div className="emoji-target text-5xl select-none p-2 active:scale-110 transition-transform">
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

  // Capture tanpa terbalik
  const handleCapture = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot();
    if (shot && photos.length < 3) {
      setPhotos((prev) => [...prev, shot]);
    }
  }, [photos]);

  const undoLastPhoto = () => setPhotos((prev) => prev.slice(0, -1));

  const addSticker = (emoji: string) => {
    setPlacedStickers((prev) => [
      ...prev,
      {
        id: Date.now(),
        emoji,
        nodeRef: React.createRef(),
        // Simpan state awal gesture
        scale: 1,
        rotation: 0,
      },
    ]);
  };

  const generateFinalImage = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Perbandingan 8:19 (800x1900) untuk meminimalkan sisa bawah
    canvas.width = 800;
    canvas.height = 1900;

    // Background sesuai tema
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const photoW = canvas.width - padding * 2;
    // Menggunakan aspek ratio 4:3 asli untuk mencegah gepeng
    const photoH = (photoW * 3) / 4;

    // Menggambar Foto
    for (let i = 0; i < photos.length; i++) {
      const img = new Image();
      img.src = photos[i];
      await new Promise((resolve) => {
        img.onload = () => {
          // Jarak antar foto disesuaikan agar pas
          ctx.drawImage(
            img,
            padding,
            padding + i * (photoH + 30),
            photoW,
            photoH,
          );
          resolve(null);
        };
      });
    }

    // Menggambar Stiker dengan koordinat akurat
    const container = containerRef.current;
    if (container) {
      const scaleCanvas = canvas.width / container.offsetWidth;
      placedStickers.forEach((stk) => {
        const el = stk.nodeRef.current;
        if (el) {
          const rect = el
            .querySelector(".emoji-target")
            ?.getBoundingClientRect();
          const parentRect = container.getBoundingClientRect();

          if (rect) {
            // Kalkulasi rotasi dan scale asli dari CSS Transform
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
        }
      });
    }

    // Teks Bawah
    ctx.fillStyle = currentTheme.text;
    ctx.font = "italic 44px serif";
    ctx.textAlign = "center";
    ctx.fillText(dynamicText, canvas.width / 2, canvas.height - 80);

    setFinalStrip(canvas.toDataURL("image/png"));
    setIsEditing(false);
  };

  const resetAll = () => {
    setPhotos([]);
    setIsEditing(false);
    setFinalStrip(null);
    setPlacedStickers([]);
  };

  return (
    <div className="flex flex-col items-center h-screen bg-zinc-50 p-4 text-zinc-800 overflow-hidden font-sans">
      {/* Header compact */}
      <div className="mb-2 shrink-0 text-center">
        <h1 className="text-xl font-serif italic font-bold">Studio Strip</h1>
        {!finalStrip && (
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">
            {photos.length}/3 shots
          </p>
        )}
      </div>

      {/* Main Content Area (Responsive) */}
      <div className="w-full max-w-[340px] flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
        {/* Frame Container */}
        <div
          ref={containerRef}
          className="relative overflow-hidden shadow-2xl border-[6px] border-white rounded-sm mx-auto bg-white transition-all duration-300"
          style={{
            aspectRatio: "8/19",
            backgroundColor: isEditing || finalStrip ? currentTheme.bg : "#fff",
            maxHeight: "100%",
          }}
        >
          {/* Layer: Camera/Preview */}
          {!isEditing && !finalStrip && (
            <div className="absolute inset-0 flex flex-col p-3 gap-1.5 justify-center">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-full aspect-[4/3] object-cover rounded-sm shadow-sm"
                  alt="captured"
                />
              ))}
              {photos.length < 3 && (
                <div className="w-full aspect-[4/3] overflow-hidden bg-zinc-100 border border-dashed border-zinc-200 rounded-sm">
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

          {/* Layer: Editing */}
          {isEditing && (
            <div className="relative h-full w-full flex flex-col p-[6%] gap-[2%] overflow-visible">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-full aspect-[4/3] object-cover rounded-sm"
                  alt="edit"
                />
              ))}

              {placedStickers.map((stk) => (
                <DraggableSticker
                  key={stk.id}
                  stk={stk}
                  onDelete={(id: number) =>
                    setPlacedStickers((prev) => prev.filter((s) => s.id !== id))
                  }
                />
              ))}

              <p
                style={{ color: currentTheme.text }}
                className="mt-auto mb-4 text-center font-serif italic text-xs leading-snug"
              >
                {dynamicText}
              </p>
            </div>
          )}

          {/* Layer: Final Result */}
          {finalStrip && (
            <img
              src={finalStrip}
              className="w-full h-full object-contain"
              alt="final result"
            />
          )}
        </div>

        {/* Control Panel (Compact & menempel di bawah) */}
        <div className="mt-4 space-y-3 shrink-0 pb-2">
          {!finalStrip && (
            <div className="flex justify-center gap-3 bg-white p-2.5 rounded-2xl shadow-sm border border-zinc-100">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTheme(t)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${currentTheme.id === t.id ? "border-zinc-800 scale-125 shadow-md" : "border-transparent"}`}
                  style={{ backgroundColor: t.bg }}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!isEditing && !finalStrip ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={undoLastPhoto}
                  disabled={photos.length === 0}
                  className="p-3 bg-white text-zinc-400 rounded-full border border-zinc-200 disabled:opacity-20 active:bg-zinc-50"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={handleCapture}
                  disabled={photos.length >= 3}
                  className="flex-1 py-3.5 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
                >
                  <Camera size={18} /> {photos.length < 3 ? "Jepret" : "Siap"}
                </button>
                {photos.length === 3 && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-3 bg-green-500 text-white rounded-full"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                )}
              </div>
            ) : isEditing ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={dynamicText}
                  onChange={(e) => setDynamicText(e.target.value)}
                  className="w-full p-2.5 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:ring-1 ring-zinc-500"
                  placeholder="Ketik caption..."
                />
                <div className="flex flex-wrap justify-center gap-1.5 p-2 bg-white rounded-lg border border-zinc-100 max-h-20 overflow-y-auto no-scrollbar">
                  {STICKER_LIST.map((s) => (
                    <button
                      key={s}
                      onClick={() => addSticker(s)}
                      className="text-2xl p-1 active:bg-zinc-100 rounded-md"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={generateFinalImage}
                  className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-bold text-sm"
                >
                  Gabungkan Foto
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <a
                  href={finalStrip!}
                  download="my-photostrip.png"
                  className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-bold text-center flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  <Download size={16} /> Download PNG
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={resetAll}
                    className="flex-1 py-2.5 bg-white text-zinc-500 rounded-lg font-bold border border-zinc-200 flex items-center justify-center gap-1.5 text-xs"
                  >
                    <PlusCircle size={14} /> Baru
                  </button>
                  <button
                    onClick={resetAll}
                    className="flex-1 py-2.5 bg-red-50 text-red-400 rounded-lg font-bold flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
