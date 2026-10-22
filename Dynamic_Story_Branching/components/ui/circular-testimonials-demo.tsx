import React from "react";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";

const readerTestimonials = [
  {
    quote:
      "The choices genuinely feel meaningful! Replaying stories to unlock every ending is super fun. Hands down the most engaging interactive fiction experience.",
    name: "Alex Rivera",
    designation: "Avid Reader",
    src:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
  },
  {
    quote:
      "The Neo-brutalist Slush theme UI is gorgeous! Smooth transitions, crisp decision paths, and the DAG graph visualization keeps me hooked for hours.",
    name: "Sophia Chen",
    designation: "Story Explorer",
    src:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop",
  },
  {
    quote:
      "The time-warp retreat feature saved my playthrough! I could test daring branching choices without losing all my campaign XP progress.",
    name: "Marcus Vance",
    designation: "RPG Enthusiast",
    src:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
  },
];

export const CircularTestimonialsDemo = () => (
  <section className="bg-white p-12 rounded-2xl flex items-center justify-center">
    <CircularTestimonials
      testimonials={readerTestimonials}
      autoplay={true}
      colors={{
        name: "#000000",
        designation: "#5c4ade",
        testimony: "#222222",
        arrowBackground: "#ffd731",
        arrowForeground: "#000000",
        arrowHoverBackground: "#5c4ade",
      }}
      fontSizes={{
        name: "28px",
        designation: "16px",
        quote: "18px",
      }}
    />
  </section>
);

export default CircularTestimonialsDemo;
