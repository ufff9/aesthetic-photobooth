"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
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

// --- KOMPONEN STIKER (FIX TOUCH DEVICES) ---
const DraggableSticker = ({ stk, onDelete }: any) => {
  const [style, setStyle] = useState({ x: 50, y: 50, scale: 1, rotation: 0 });

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
      drag: { from: () => [style.x, style.y], preventDefault: true },
      pinch: {
        from: () => [style.scale, style.rotation],
        preventDefault: true,
      },
    },
  );

  return (
    <div
      {...bind()}
      ref={stk.nodeRef}
      className="absolute z-50 touch-none select-none p-4"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${style.x}px, ${style.y}px, 0) rotate(${style.rotation}deg) scale(${style.scale})`,
        cursor: "grab",
      }}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()} // Fix tombol delete di layar sentuh
        onClick={() => onDelete(stk.id)}
        className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full shadow-xl active:scale-90"
      >
        <X size={14} />
      </button>
      <div className="emoji-target text-6xl pointer-events-none">
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

  // Mengambil screenshot dengan kualitas tinggi
  const handleCapture = useCallback(() => {
    const video = webcamRef.current?.video;
    if (video) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Balik horizontal (mirror) saat mengambil data
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        setPhotos((prev) => [...prev, canvas.toDataURL("image/png", 1.0)]);
      }
    }
  }, [webcamRef]);

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

    // HIGH DPI SETTINGS (Agar tidak buram)
    const scaleFactor = 2;
    canvas.width = 1200 * scaleFactor; // Resolusi ditingkatkan
    canvas.height = 2800 * scaleFactor;

    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 60 * scaleFactor;
    const photoW = canvas.width - padding * 2;
    const photoH = (photoW * 3) / 4;

    for (let i = 0; i < photos.length; i++) {
      const img = new Image();
      img.src = photos[i];
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.save();
          const yPos = padding + i * (photoH + 50 * scaleFactor);

          // CLIP AREA
          ctx.beginPath();
          ctx.rect(padding, yPos, photoW, photoH);
          ctx.clip();

          // FIX ZOOM: Hitung aspek rasio asli gambar vs target
          const imgRatio = img.width / img.height;
          const targetRatio = photoW / photoH;
          let drawW, drawH, offsetX, offsetY;

          if (imgRatio > targetRatio) {
            drawH = photoH;
            drawW = img.width * (photoH / img.height);
            offsetX = padding + (photoW - drawW) / 2;
            offsetY = yPos;
          } else {
            drawW = photoW;
            drawH = img.height * (photoW / img.width);
            offsetX = padding;
            offsetY = yPos + (photoH - drawH) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          ctx.restore();
          resolve(null);
        };
      });
    }

    // RENDER STICKERS DENGAN SKALA YANG BENAR
    const container = containerRef.current;
    if (container) {
      const rectBase = container.getBoundingClientRect();
      const scaleCanvas = canvas.width / rectBase.width;

      placedStickers.forEach((stk) => {
        const el = stk.nodeRef.current;
        if (el) {
          const style = window.getComputedStyle(el);
          const matrix = new DOMMatrix(style.transform);
          const stickerRect = el.getBoundingClientRect();

          const x =
            (stickerRect.left - rectBase.left + stickerRect.width / 2) *
            scaleCanvas;
          const y =
            (stickerRect.top - rectBase.top + stickerRect.height / 2) *
            scaleCanvas;

          const rotation = Math.atan2(matrix.b, matrix.a);
          const scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.font = `${70 * scale * scaleCanvas}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(stk.emoji, 0, 0);
          ctx.restore();
        }
      });
    }

    // RENDER TEXT
    ctx.fillStyle = currentTheme.text;
    ctx.font = `italic ${60 * scaleFactor}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      dynamicText,
      canvas.width / 2,
      canvas.height - 120 * scaleFactor,
    );

    setFinalStrip(canvas.toDataURL("image/png", 1.0));
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center h-[100dvh] bg-zinc-100 p-4 overflow-hidden safe-area-bottom">
      <div className="mb-2 shrink-0">
        <h1 className="text-xl font-serif italic font-bold text-center">
          Studio Strip
        </h1>
        <p className="text-[10px] uppercase text-center tracking-tighter text-zinc-400">
          HD Quality • No Distortion
        </p>
      </div>

      <div className="w-full flex-1 flex items-center justify-center min-h-0 relative">
        <div
          ref={containerRef}
          className="relative shadow-2xl border-[6px] border-white rounded-sm overflow-hidden bg-white"
          style={{ aspectRatio: "8/19", height: "100%" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor:
                isEditing || finalStrip ? currentTheme.bg : "#fff",
            }}
          >
            {!isEditing && !finalStrip && (
              <div className="flex flex-col p-3 gap-2 h-full justify-center">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    className="w-full aspect-[4/3] object-cover rounded-sm shadow-inner"
                  />
                ))}
                {photos.length < 3 && (
                  <div className="w-full aspect-[4/3] bg-black rounded-sm overflow-hidden relative">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/png"
                      videoConstraints={{
                        facingMode: "user",
                        aspectRatio: 4 / 3,
                      }}
                      className="w-full h-full object-cover mirror"
                      style={{ transform: "scaleX(-1)" }}
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
                    className="w-full aspect-[4/3] object-cover rounded-sm pointer-events-none"
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
                  className="mt-auto mb-6 text-center font-serif italic text-sm"
                >
                  {dynamicText}
                </p>
              </div>
            )}

            {finalStrip && (
              <img
                src={finalStrip}
                className="w-full h-full object-contain"
                alt="Final Result"
              />
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[340px] mt-4 space-y-3 pb-6">
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
                className="p-4 bg-white rounded-full border border-zinc-200 active:bg-zinc-50"
              >
                <RotateCcw size={22} />
              </button>
              <button
                onClick={handleCapture}
                disabled={photos.length >= 3}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex justify-center gap-2 active:scale-95 shadow-lg"
              >
                <Camera size={20} />{" "}
                {photos.length < 3 ? "Ambil Foto" : "Siap Edit"}
              </button>
              {photos.length === 3 && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-4 bg-green-500 text-white rounded-full shadow-lg animate-pulse"
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
                className="w-full p-3 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="Tulis caption..."
              />
              <div className="flex overflow-x-auto gap-3 p-1 no-scrollbar">
                {STICKER_LIST.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSticker(s)}
                    className="text-3xl min-w-[60px] h-[60px] bg-white rounded-xl border flex items-center justify-center active:scale-90"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={generateFinalImage}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-xl"
              >
                Cetak Photostrip HD
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={finalStrip!}
                download="photostrip_hd.png"
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center flex justify-center gap-2 shadow-lg"
              >
                <Download size={20} /> Simpan ke Galeri
              </a>
              <button
                onClick={() => {
                  setPhotos([]);
                  setIsEditing(false);
                  setFinalStrip(null);
                  setPlacedStickers([]);
                }}
                className="w-full py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-500"
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
