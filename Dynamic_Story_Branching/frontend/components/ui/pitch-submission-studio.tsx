"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface PitchFormData {
  title: string;
  genre: string;
  description: string;
}

export interface PitchStudioProps {
  userName?: string;
  userXp?: number;
  onSubmitPitch?: (data: PitchFormData) => Promise<void> | void;
  className?: string;
}

const GENRES = [
  { id: "horror", label: "Horror", icon: "🩸", color: "#ff4b4b", bg: "#ffe5e5" },
  { id: "fantasy", label: "Fantasy", icon: "🔮", color: "#ffd731", bg: "#fff9db" },
  { id: "sci-fi", label: "Sci-Fi", icon: "🚀", color: "#4da2ff", bg: "#e5f2ff" },
  { id: "mystery", label: "Mystery", icon: "🔍", color: "#a855f7", bg: "#f3e8ff" },
  { id: "cyberpunk", label: "Cyberpunk", icon: "⚡", color: "#00f0ff", bg: "#e0fcff" },
  { id: "adventure", label: "Adventure", icon: "⚔️", color: "#55db9c", bg: "#e6faf1" },
  { id: "romance", label: "Romance", icon: "💌", color: "#fb7185", bg: "#ffe4e6" },
  { id: "general", label: "General", icon: "📖", color: "#ffd731", bg: "#fff9db" },
];

const PREMISE_SPARKS = [
  {
    title: "The Memory Merchant",
    genre: "mystery",
    desc: "In Neo-Venice, you run an antique shop trading memories bottled in crystal vials. When an anonymous client leaves behind a vial holding the final thoughts of an assassinated diplomat, every syndicate in the flooded city begins hunting your doorway.",
  },
  {
    title: "The Hollow Elevator",
    genre: "horror",
    desc: "An express freight elevator inside a 120-story research monolith malfunctions during a midnight blizzard. Instead of stopping at ground level, the floor counter keeps ticking into negative digits—descending into a frozen abyss that shouldn't exist.",
  },
  {
    title: "Oxygen Debt",
    genre: "sci-fi",
    desc: "On a pressurized asteroid penal colony, every breath is taxed against your daily labor output. When a sabotage event cuts atmospheric supply in half, you and three inmates have sixty minutes to choose who gets the remaining rations.",
  },
];

export function PitchSubmissionStudio({
  userName = "Reader",
  userXp = 100,
  onSubmitPitch,
  className = "",
}: PitchStudioProps) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("fantasy");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const wordCount = useMemo(() => {
    return description.trim() ? description.trim().split(/\s+/).length : 0;
  }, [description]);

  const wordsNeeded = Math.max(0, 30 - wordCount);
  const isWordCountMet = wordCount >= 30;

  const activeGenreObj = useMemo(() => {
    return GENRES.find((g) => g.id === genre) || GENRES[0];
  }, [genre]);

  const handleApplySpark = (spark: typeof PREMISE_SPARKS[0]) => {
    setTitle(spark.title);
    setGenre(spark.genre);
    setDescription(spark.desc);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim() || !description.trim()) {
      setErrorMsg("Please fill in both the story title and pitch concept.");
      return;
    }

    if (!isWordCountMet) {
      setErrorMsg(
        `Your pitch requires at least 30 words to give editors enough context! (Currently ${wordCount}/30 words).`
      );
      return;
    }

    try {
      setSubmitting(true);
      if (onSubmitPitch) {
        await onSubmitPitch({ title, genre, description });
      }
      setSuccessMsg("🎉 Story pitch submitted for editorial review! +20 XP awarded.");
      setTitle("");
      setDescription("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit pitch. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto py-6 px-4 ${className}`}>
      {/* Studio Header */}
      <div className="mb-8 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-[3px] border-black pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-black bg-[#e9ccff] font-extrabold text-[12px] uppercase tracking-wider text-black shadow-[2px_2px_0px_#000] mb-3">
            <span>⚡ STORY INCUBATOR</span>
            <span>•</span>
            <span>COMMUNITY CREATORS</span>
          </div>
          <h1 className="font-['Bowlby_One',cursive,sans-serif] text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-black leading-none">
            PITCH YOUR UNIVERSE
          </h1>
          <p className="font-semibold text-slate-600 text-base max-w-2xl mt-2 leading-relaxed">
            Draft an interactive branching tale. When approved by editors, your concept will be forged into a playable story in the library.
          </p>
        </div>

        <div className="inline-flex items-center gap-3 bg-[#ffd731] border-[3px] border-black rounded-2xl px-5 py-3.5 shadow-[4px_4px_0px_#000] self-start md:self-auto">
          <span className="text-2xl">⭐</span>
          <div>
            <div className="font-black text-sm uppercase text-black leading-tight">
              +20 XP BOUNTY
            </div>
            <div className="text-xs font-bold text-black/70">
              Guaranteed author credit
            </div>
          </div>
        </div>
      </div>

      {/* Premise Sparks Inspiration Strip */}
      <div className="mb-8 bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
          <span>💡</span>
          <span>Need Inspiration? Click a Premise Spark:</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {PREMISE_SPARKS.map((spark, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySpark(spark)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-black bg-[#f4f6fc] hover:bg-[#ffd731] font-bold text-xs text-black shadow-[2px_2px_0px_#000] transition-all hover:-translate-y-0.5 active:translate-y-0.5"
            >
              <span>{spark.title}</span>
              <span className="text-slate-400">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Deck */}
      <div className="w-full">
        {/* Authoring Deck */}
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white border-[3.5px] border-black rounded-[28px] p-6 sm:p-8 shadow-[8px_8px_0px_#000] flex flex-col gap-6"
        >
          {/* Alerts */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-50 border-2 border-red-500 rounded-xl p-3.5 text-sm font-bold text-red-700 flex items-center gap-2 shadow-[2px_2px_0px_#dc2626]"
              >
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3.5 text-sm font-bold text-emerald-800 flex items-center gap-2 shadow-[2px_2px_0px_#10b981]"
              >
                <span>✅</span>
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2 flex items-center justify-between">
              <span>Story Title *</span>
              <span className="text-[11px] font-bold text-slate-400">
                {title.length}/80 chars
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Last Oracle of Ashveil"
              maxLength={80}
              className="w-full px-4 py-3.5 rounded-xl border-[2.5px] border-black font-bold text-base text-black bg-white shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none transition-shadow"
            />
          </div>

          {/* Interactive Genre Selector Grid */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2.5">
              Select Genre *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {GENRES.map((g) => {
                const isSelected = genre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGenre(g.id)}
                    style={{
                      backgroundColor: isSelected ? g.bg : "#ffffff",
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-black font-black text-xs uppercase tracking-wide text-black transition-all ${
                      isSelected
                        ? "shadow-[3px_3px_0px_#000] scale-[1.03] ring-2 ring-black"
                        : "shadow-[1.5px_1.5px_0px_#000] hover:bg-slate-50 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <span>{g.icon}</span>
                    <span>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pitch Synopsis Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black uppercase tracking-wider text-black">
                Pitch Concept & Dilemma *
              </label>
              <div
                className={`text-xs font-black tracking-wide ${
                  isWordCountMet ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {isWordCountMet ? (
                  <span>✅ {wordCount} words (Ready!)</span>
                ) : (
                  <span>
                    {wordCount} / 30 words min (Need {wordsNeeded} more)
                  </span>
                )}
              </div>
            </div>

            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paint the picture — who is the protagonist, what world are they in, and what impossible branching dilemma do they face? (Minimum 30 words required)"
              className="w-full px-4 py-3.5 rounded-xl border-[2.5px] border-black font-medium text-sm text-black bg-white shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none transition-shadow resize-y leading-relaxed"
            />

            {/* Word Count Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 border border-black/40 overflow-hidden mt-2">
              <div
                style={{
                  width: `${Math.min(100, Math.round((wordCount / 30) * 100))}%`,
                  backgroundColor: isWordCountMet ? "#10b981" : "#f43f5e",
                }}
                className="h-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Editorial Approval Guidelines Checklist */}
          <div className="bg-[#fef9c3] border-[2.5px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] text-xs space-y-2 mt-2">
            <div className="font-black text-sm uppercase text-black flex items-center gap-1.5 mb-2">
              <span>🎯</span>
              <span>3 Keys to Editorial Approval:</span>
            </div>
            <div className="flex items-start gap-2 font-bold text-slate-800">
              <span>1.</span>
              <span><strong>A True Crossroads:</strong> Give the protagonist a genuine moral or survival dilemma with no easy answer.</span>
            </div>
            <div className="flex items-start gap-2 font-bold text-slate-800">
              <span>2.</span>
              <span><strong>Atmospheric Setting:</strong> Anchor your scene with vivid sights, sounds, or physical tension.</span>
            </div>
            <div className="flex items-start gap-2 font-bold text-slate-800">
              <span>3.</span>
              <span><strong>Branching Potential:</strong> Provide enough seed ideas for at least 2 distinct ending paths.</span>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="relative overflow-hidden w-full py-4 px-6 rounded-full border-[3px] border-black bg-[#ffd731] font-['Bowlby_One',cursive,sans-serif] text-base uppercase text-black shadow-[5px_5px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
          >
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? "TRANSMITTING PITCH..." : "🚀 TRANSMIT PITCH TO EDITORS →"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
  );
}
export default PitchSubmissionStudio;
