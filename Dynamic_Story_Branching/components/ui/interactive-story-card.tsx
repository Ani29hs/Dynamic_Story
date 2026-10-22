"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export interface StoryCardProps {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  description?: string;
  imageURL?: string;
  sceneCount?: number;
  rating?: number | string;
  ratingCount?: number;
  totalEndings?: number;
  unlockedEndings?: number;
  onExplore?: (id: string) => void;
  onPlay?: (id: string) => void;
  className?: string;
}

const GENRE_CONFIG: Record<
  string,
  { icon: string; color: string; glow: string; badgeBg: string }
> = {
  horror: {
    icon: "🩸",
    color: "#ff4b4b",
    glow: "rgba(255, 75, 75, 0.35)",
    badgeBg: "#ffe5e5",
  },
  fantasy: {
    icon: "🔮",
    color: "#ffd731",
    glow: "rgba(255, 215, 49, 0.35)",
    badgeBg: "#fff9db",
  },
  cyberpunk: {
    icon: "⚡",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.35)",
    badgeBg: "#e0fcff",
  },
  "sci-fi": {
    icon: "🚀",
    color: "#4da2ff",
    glow: "rgba(77, 162, 255, 0.35)",
    badgeBg: "#e5f2ff",
  },
  mystery: {
    icon: "🔍",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.35)",
    badgeBg: "#f3e8ff",
  },
  adventure: {
    icon: "🧭",
    color: "#55db9c",
    glow: "rgba(85, 219, 156, 0.35)",
    badgeBg: "#e6faf1",
  },
  romance: {
    icon: "💖",
    color: "#fb7185",
    glow: "rgba(251, 113, 133, 0.35)",
    badgeBg: "#ffe4e6",
  },
  general: {
    icon: "📖",
    color: "#ffd731",
    glow: "rgba(255, 215, 49, 0.35)",
    badgeBg: "#fff9db",
  },
};

export function InteractiveStoryCard({
  id,
  title,
  author = "Aniket Sharma",
  genre = "Horror",
  description = "A thrilling interactive branching tale where every choice carves a new destiny.",
  imageURL = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  sceneCount = 8,
  rating = "4.0",
  ratingCount = 1,
  totalEndings = 4,
  unlockedEndings = 1,
  onExplore,
  onPlay,
  className = "",
}: StoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for 3D physics
  const springConfig = { damping: 20, stiffness: 220, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), springConfig);

  const genreKey = (genre || "general").toLowerCase();
  const config = GENRE_CONFIG[genreKey] || GENRE_CONFIG.general;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setMousePos({ x: mouseX, y: mouseY });
      x.set(mouseX / rect.width - 0.5);
      y.set(mouseY / rect.height - 0.5);
    },
    [x, y]
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const endingsPercent = Math.min(
    100,
    Math.round((unlockedEndings / Math.max(totalEndings, 1)) * 100)
  );

  return (
    <div
      style={{ perspective: 1200 }}
      className={`group relative select-none ${className}`}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative flex flex-col w-full rounded-[24px] border-[3px] border-black bg-white shadow-[6px_6px_0px_#000000] transition-shadow duration-200 hover:shadow-[10px_10px_0px_#000000] overflow-hidden"
      >
        {/* Background stays clean white without pointer color wash */}

        {/* Media Section with Parallax Depth */}
        <div className="relative w-full h-60 overflow-hidden border-b-[3px] border-black bg-black">
          <img
            src={imageURL}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-1"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

          {/* Top Floating HUD Badges */}
          <div
            style={{ transform: "translateZ(30px)" }}
            className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20"
          >
            <span
              style={{ backgroundColor: config.badgeBg }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black font-extrabold text-[11px] uppercase tracking-wider text-black shadow-[2px_2px_0px_#000000]"
            >
              <span>{config.icon}</span>
              <span>{genre}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-black bg-[#ffd731] font-extrabold text-[11px] text-black shadow-[2px_2px_0px_#000000]">
              ⭐ {rating}
              {ratingCount > 0 && (
                <span className="opacity-75 font-semibold text-[9.5px]">
                  ({ratingCount})
                </span>
              )}
            </span>
          </div>

          {/* Bottom Floating Scene Count */}
          <div
            style={{ transform: "translateZ(25px)" }}
            className="absolute bottom-3 right-3 z-20 pointer-events-none"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-white/95 backdrop-blur font-black text-[10.5px] uppercase tracking-wider text-black shadow-[2px_2px_0px_#000000]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              {sceneCount} Scenes
            </span>
          </div>
        </div>

        {/* Card Body with 3D Depth Layer */}
        <div
          style={{ transform: "translateZ(20px)" }}
          className="relative flex flex-col flex-1 p-5 z-20"
        >
          {/* Status & Endings Meta Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                LIVE INTERACTIVE
              </span>
            </div>

            {/* Endings progress pill */}
            <div
              onClick={() => onExplore?.(id)}
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border-2 border-black bg-slate-50 text-[10.5px] font-black text-black shadow-[2px_2px_0px_#000000] cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <span>
                🏆 {unlockedEndings}/{totalEndings}
              </span>
              <div className="w-12 h-1.5 rounded-full bg-slate-200 border border-black/50 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${endingsPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="font-['Bowlby_One',cursive,sans-serif] text-[22px] leading-tight text-black uppercase tracking-tight line-clamp-1 group-hover:text-[#5c4ade] transition-colors">
            {title}
          </h2>

          {/* Author */}
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#5c4ade] mt-1 mb-2.5 flex items-center gap-1">
            <span>✍️</span>
            <span>
              BY <strong>{author}</strong>
            </span>
          </div>

          {/* Synopsis */}
          <p className="text-[13px] font-medium text-slate-700 leading-relaxed line-clamp-2 mb-4">
            {description}
          </p>

          {/* Action Buttons Grid */}
          <div className="mt-auto grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onExplore?.(id)}
              className="w-full py-2.5 px-3 rounded-full border-[2.5px] border-black bg-white font-extrabold text-[12px] uppercase text-black shadow-[2px_2px_0px_#000000] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000]"
            >
              📖 DETAILS
            </button>

            <button
              type="button"
              onClick={() => onPlay?.(id)}
              className="relative overflow-hidden w-full py-2.5 px-3 rounded-full border-[2.5px] border-black bg-[#ffd731] font-black text-[12px] uppercase text-black shadow-[3px_3px_0px_#000000] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#000000] hover:bg-[#ffe066] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000]"
            >
              {/* Shimmer Light Streak */}
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
              <span className="relative z-10 flex items-center justify-center gap-1">
                ⚡ PLAY STORY
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
export default InteractiveStoryCard;
