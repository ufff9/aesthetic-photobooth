"use client";

import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import Draggable from "react-draggable";
import {
  Camera,
  Download,
  Trash2,
  CheckCircle2,
  RotateCcw,
  PlusCircle,
  X,
  Plus,
  Minus,
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

export default function FinalAestheticBooth() {
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [finalStrip, setFinalStrip] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [dynamicText, setDynamicText] = useState("Happy Moments");
  const [placedStickers, setPlacedStickers] = useState<
    {
      id: number;
      emoji: string;
      nodeRef: any;
      rotation: number;
      scale: number;
    }[]
  >([]);

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
        rotation: 0,
        scale: 1,
      },
    ]);
  };

  const updateSticker = (
    id: number,
    type: "rotate" | "grow" | "shrink" | "delete",
  ) => {
    if (type === "delete") {
      setPlacedStickers((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    setPlacedStickers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          if (type === "rotate") return { ...s, rotation: s.rotation + 45 };
          if (type === "grow")
            return { ...s, scale: Math.min(s.scale + 0.2, 3) };
          if (type === "shrink")
            return { ...s, scale: Math.max(s.scale - 0.2, 0.5) };
        }
        return s;
      }),
    );
  };

  const generateFinalImage = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 1900;
    if (!ctx) return;

    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const photoW = canvas.width - padding * 2;
    const photoH = (photoW * 3) / 4;

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
            const canvasX =
              (rect.left - parentRect.left + rect.width / 2) * scaleCanvas;
            const canvasY =
              (rect.top - parentRect.top + rect.height / 2) * scaleCanvas;
            ctx.save();
            ctx.translate(canvasX, canvasY);
            ctx.rotate((stk.rotation * Math.PI) / 180);
            ctx.font = `${60 * stk.scale * scaleCanvas}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(stk.emoji, 0, 0);
            ctx.restore();
          }
        }
      });
    }

    ctx.fillStyle = currentTheme.text;
    ctx.font = "italic 44px serif";
    ctx.textAlign = "center";
    ctx.fillText(dynamicText, canvas.width / 2, canvas.height - 80);

    setFinalStrip(canvas.toDataURL("image/png"));
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center h-screen bg-zinc-50 p-4 text-zinc-800 overflow-hidden">
      <div className="mb-2 text-center shrink-0">
        <h1 className="text-xl font-serif italic font-bold">Photobooth</h1>
      </div>

      <div className="w-full flex-1 flex items-center justify-center min-h-0 relative">
        <div
          ref={containerRef}
          className="relative shadow-2xl border-[6px] border-white rounded-sm bg-white overflow-hidden transition-all duration-500"
          style={{
            aspectRatio: "8/19",
            height: "100%",
            backgroundColor: isEditing || finalStrip ? currentTheme.bg : "#fff",
          }}
        >
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
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              )}
            </div>
          )}

          {isEditing && (
            <div className="relative h-full w-full flex flex-col p-[6%] gap-[2%] overflow-visible">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-full aspect-[4/3] object-cover rounded-sm pointer-events-none"
                  alt="edit"
                />
              ))}

              {placedStickers.map((stk) => (
                <Draggable key={stk.id} nodeRef={stk.nodeRef}>
                  <div
                    ref={stk.nodeRef}
                    className="absolute z-50 group cursor-move touch-none"
                  >
                    {/* Toolbar Kecil untuk Stiker */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-white/90 backdrop-blur shadow-md rounded-full p-1 opacity-0 group-active:opacity-100 transition-opacity">
                      <button
                        onClick={() => updateSticker(stk.id, "shrink")}
                        className="p-1 bg-zinc-100 rounded-full"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        onClick={() => updateSticker(stk.id, "grow")}
                        className="p-1 bg-zinc-100 rounded-full"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => updateSticker(stk.id, "rotate")}
                        className="p-1 bg-zinc-100 rounded-full"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => updateSticker(stk.id, "delete")}
                        className="p-1 bg-red-100 text-red-500 rounded-full"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div
                      className="emoji-target text-4xl select-none p-2 transition-transform active:scale-110"
                      style={{
                        transform: `rotate(${stk.rotation}deg) scale(${stk.scale})`,
                      }}
                    >
                      {stk.emoji}
                    </div>
                  </div>
                </Draggable>
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
            <img
              src={finalStrip}
              className="w-full h-full object-contain"
              alt="final"
            />
          )}
        </div>
      </div>

      <div className="w-full max-w-[340px] mt-4 space-y-3 shrink-0 pb-4">
        {!finalStrip && (
          <div className="flex justify-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-zinc-100">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setCurrentTheme(t)}
                className={`w-6 h-6 rounded-full border-2 ${currentTheme.id === t.id ? "scale-125 border-zinc-800 shadow-md" : "border-transparent"}`}
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
                {photos.length < 3 ? "Jepret" : "Siap Edit"}
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
                className="w-full p-3 rounded-xl border text-sm"
                placeholder="Caption..."
              />
              <div className="flex overflow-x-auto gap-2 p-1 no-scrollbar">
                {STICKER_LIST.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSticker(s)}
                    className="text-2xl min-w-[45px] h-[45px] bg-white rounded-lg border shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={generateFinalImage}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold"
              >
                Simpan Hasil
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={finalStrip!}
                download="photostrip.png"
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center flex justify-center gap-2 shadow-lg"
              >
                <Download size={20} /> Simpan ke HP
              </a>
              <button
                onClick={() => {
                  setPhotos([]);
                  setIsEditing(false);
                  setFinalStrip(null);
                  setPlacedStickers([]);
                }}
                className="w-full py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold flex justify-center gap-1 items-center"
              >
                <PlusCircle size={14} /> Foto Lagi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
