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

// --- KOMPONEN STIKER (OPTIMASI PRESISI) ---
const DraggableSticker = ({ stk, onDelete }: any) => {
  // Memberikan nilai awal di tengah agar tidak menumpuk di pojok kiri atas
  const [style, setStyle] = useState({ x: 100, y: 150, scale: 1, rotation: 0 });

  const bind = useGesture(
    {
      onDrag: ({ offset: [x, y] }) => setStyle((s) => ({ ...s, x, y })),
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
      eventOptions: { passive: false },
    },
  );

  return (
    <div
      {...bind()}
      ref={stk.nodeRef}
      className="absolute z-50 group touch-none select-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${style.x}px, ${style.y}px) rotate(${style.rotation}deg) scale(${style.scale})`,
        transformOrigin: "center center",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(stk.id);
        }}
        className="absolute -top-4 -right-4 p-2 bg-red-500 text-white rounded-full shadow-xl z-[60] active:scale-90"
      >
        <X size={16} />
      </button>
      <div className="emoji-target text-6xl p-4 cursor-grab active:cursor-grabbing">
        {stk.emoji}
      </div>
    </div>
  );
};

export default function FinalAestheticBooth() {
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [finalStrip, setFinalStrip] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [dynamicText, setDynamicText] = useState("Happy Moments");
  const [placedStickers, setPlacedStickers] = useState<any[]>([]);

  const handleCapture = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot();
    if (shot && photos.length < 3) {
      setPhotos((prev) => [...prev, shot]);
    }
  }, [photos]);

  const addSticker = (emoji: string) => {
    setPlacedStickers((prev) => [
      ...prev,
      { id: Date.now(), emoji, nodeRef: React.createRef() },
    ]);
  };

  const generateFinalImage = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolusi Tinggi (Kunci utama agar tidak gepeng saat disave)
    canvas.width = 800;
    canvas.height = 1900;
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const photoW = canvas.width - padding * 2;
    const photoH = (photoW * 3) / 4;

    // 1. Render Foto dengan Object-Fit Cover
    for (let i = 0; i < photos.length; i++) {
      const img = new Image();
      img.src = photos[i];
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.save();
          const yPos = padding + i * (photoH + 35);

          ctx.beginPath();
          ctx.rect(padding, yPos, photoW, photoH);
          ctx.clip();

          const imgRatio = img.width / img.height;
          const targetRatio = photoW / photoH;
          let dW, dH;

          if (imgRatio > targetRatio) {
            dH = photoH;
            dW = img.width * (photoH / img.height);
          } else {
            dW = photoW;
            dH = img.height * (photoW / img.width);
          }

          ctx.translate(padding + photoW / 2, yPos + photoH / 2);
          ctx.scale(-1, 1); // Flip horizontal agar hasil = preview
          ctx.drawImage(img, -dW / 2, -dH / 2, dW, dH);
          ctx.restore();
          resolve(null);
        };
      });
    }

    // 2. Render Stiker dengan Koordinat Relatif Presisi
    const container = containerRef.current;
    if (container) {
      const scaleX = canvas.width / container.clientWidth;
      const scaleY = canvas.height / container.clientHeight;

      placedStickers.forEach((stk) => {
        const el = stk.nodeRef.current;
        if (el) {
          const emojiEl = el.querySelector(".emoji-target");
          const parentRect = container.getBoundingClientRect();

          if (emojiEl) {
            const rect = emojiEl.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrix(style.transform);

            const rotation = Math.atan2(matrix.b, matrix.a);
            const stickerScale = Math.sqrt(
              matrix.a * matrix.a + matrix.b * matrix.b,
            );

            const centerX =
              (rect.left - parentRect.left + rect.width / 2) * scaleX;
            const centerY =
              (rect.top - parentRect.top + rect.height / 2) * scaleY;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            ctx.font = `${60 * stickerScale * scaleX}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(stk.emoji, 0, 0);
            ctx.restore();
          }
        }
      });
    }

    // 3. Render Teks
    ctx.fillStyle = currentTheme.text;
    ctx.font = "italic 44px serif";
    ctx.textAlign = "center";
    ctx.fillText(dynamicText, canvas.width / 2, canvas.height - 80);

    setFinalStrip(canvas.toDataURL("image/png"));
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center h-[100dvh] bg-zinc-100 p-4 overflow-hidden">
      <div className="mb-2 shrink-0 text-center">
        <h1 className="text-xl font-serif italic font-bold">Studio Strip</h1>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">
          {photos.length}/3 shots
        </p>
      </div>

      <div className="w-full flex-1 flex items-center justify-center min-h-0 relative">
        <div
          ref={containerRef}
          className="relative shadow-2xl border-[6px] border-white rounded-sm overflow-hidden"
          style={{
            aspectRatio: "8/19",
            height: "100%",
            backgroundColor: isEditing || finalStrip ? currentTheme.bg : "#fff",
          }}
        >
          {!isEditing && !finalStrip && (
            <div className="absolute inset-0 flex flex-col p-3 gap-2 justify-center bg-white">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-full aspect-[4/3] object-cover scale-x-[-1]"
                />
              ))}
              {photos.length < 3 && (
                <div className="w-full aspect-[4/3] bg-zinc-900 overflow-hidden relative">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/png"
                    className="w-full h-full object-cover scale-x-[-1]"
                    videoConstraints={{
                      facingMode: "user",
                      aspectRatio: 4 / 3,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {isEditing && (
            <div className="relative h-full w-full flex flex-col p-[6%] gap-[2%] overflow-hidden touch-none">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-full aspect-[4/3] object-cover pointer-events-none scale-x-[-1]"
                />
              ))}
              {placedStickers.map((stk) => (
                <DraggableSticker
                  key={stk.id}
                  stk={stk}
                  onDelete={(id: any) =>
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

          {finalStrip && (
            <img src={finalStrip} className="w-full h-full object-contain" />
          )}
        </div>
      </div>

      <div className="w-full max-w-[340px] mt-4 space-y-3 pb-4">
        {!finalStrip && (
          <div className="flex justify-center gap-4 bg-white p-3 rounded-2xl shadow-sm">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setCurrentTheme(t)}
                className={`w-6 h-6 rounded-full border-2 ${currentTheme.id === t.id ? "scale-125 border-zinc-800" : "border-transparent"}`}
                style={{ backgroundColor: t.bg }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!isEditing && !finalStrip ? (
            <div className="flex gap-2">
              <button
                onClick={() => setPhotos(photos.slice(0, -1))}
                className="p-4 bg-white rounded-full border border-zinc-200"
              >
                <RotateCcw size={22} />
              </button>
              <button
                onClick={handleCapture}
                disabled={photos.length >= 3}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex justify-center gap-2"
              >
                <Camera size={20} />{" "}
                {photos.length < 3 ? "Ambil Foto" : "Maksimal"}
              </button>
              {photos.length === 3 && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-4 bg-green-500 text-white rounded-full shadow-lg"
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
                className="w-full p-3 rounded-xl border bg-white"
                placeholder="Caption..."
              />
              <div className="flex overflow-x-auto gap-3 p-1">
                {STICKER_LIST.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSticker(s)}
                    className="text-3xl min-w-[55px] h-[55px] bg-white rounded-xl border flex items-center justify-center"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={generateFinalImage}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold"
              >
                Gabungkan & Simpan
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={finalStrip!}
                download="photostrip.png"
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center flex justify-center gap-2 shadow-lg"
              >
                <Download size={20} /> Download
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
                <PlusCircle size={14} className="inline mr-1" /> Mulai Baru
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
