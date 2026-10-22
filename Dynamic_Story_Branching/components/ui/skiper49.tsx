"use client";

import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import React from "react";
import {
  Autoplay,
  EffectCoverflow,
  Navigation,
  Pagination,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css";
import "swiper/css/effect-cards";

import { cn } from "@/lib/utils";

export interface StepCardItem {
  id: string;
  stepNumber: string;
  badge: string;
  badgeColor?: string;
  title: string;
  description: string;
  subtag: string;
  icon: string;
}

const defaultStepCards: StepCardItem[] = [
  {
    id: "01",
    stepNumber: "01",
    badge: "STEP 01",
    badgeColor: "#55db9c",
    title: "Choose a Story",
    description: "Browse through rich genres ranging from medieval fantasy to cyberpunk thrillers.",
    subtag: "Story Library →",
    icon: "📖",
  },
  {
    id: "02",
    stepNumber: "02",
    badge: "STEP 02",
    badgeColor: "#ffd731",
    title: "Make Decisions",
    description: "At key node scenes, pick your action. Every choice branches into new paths.",
    subtag: "Dynamic Branching →",
    icon: "⚡",
  },
  {
    id: "03",
    stepNumber: "03",
    badge: "STEP 03",
    badgeColor: "#e9ccff",
    title: "Unlock Endings & XP",
    description: "Reach distinct endings, earn XP points, and trace your traversal path on the final graph!",
    subtag: "XP & Traversal →",
    icon: "🏆",
  },
];

interface Skiper49Props {
  backgroundColor?: string;
  cards?: StepCardItem[];
}

const Skiper49 = ({
  backgroundColor = "var(--color-lavender, #e9ccff)",
  cards = defaultStepCards,
}: Skiper49Props) => {
  // Multiply for seamless infinite 3D loop in Swiper
  const displayCards = cards.length === 3 ? [...cards, ...cards] : cards;

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden py-10"
      style={{ backgroundColor }}
    >
      <Carousel_003 cards={displayCards} showPagination loop />
    </div>
  );
};

export { Skiper49 };

const Carousel_003 = ({
  cards,
  className,
  showPagination = true,
  showNavigation = true,
  loop = true,
  autoplay = false,
  spaceBetween = 0,
}: {
  cards: StepCardItem[];
  className?: string;
  showPagination?: boolean;
  showNavigation?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  spaceBetween?: number;
}) => {
  const css = `
  .Carousal_003 {
    width: 100%;
    height: 440px;
    padding-top: 25px !important;
    padding-bottom: 60px !important;
  }
  
  .Carousal_003 .swiper-slide {
    width: 340px;
    height: 350px;
    border-radius: 28px;
    overflow: visible;
    transition: transform 0.3s ease;
  }

  .step-coverflow-card {
    width: 100%;
    height: 100%;
    background: #ffffff;
    border: 3.5px solid #000000;
    border-radius: 28px;
    padding: 32px 28px;
    box-shadow: 8px 8px 0px #000000;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: left;
    box-sizing: border-box;
    cursor: grab;
  }

  .step-coverflow-card .step-num {
    font-size: 52px;
    font-weight: 900;
    color: #ffd731;
    -webkit-text-stroke: 2.5px #000;
    line-height: 1;
    margin: 0;
  }

  .step-coverflow-card h3 {
    font-size: 24px;
    font-weight: 800;
    text-transform: uppercase;
    color: #000;
    margin: 10px 0;
    letter-spacing: -0.01em;
  }

  .step-coverflow-card p {
    font-size: 15px;
    font-weight: 600;
    color: #333333;
    line-height: 1.55;
  }

  .swiper-pagination-bullet {
    background-color: #000 !important;
    opacity: 0.3;
    width: 10px;
    height: 10px;
  }

  .swiper-pagination-bullet-active {
    opacity: 1 !important;
    background-color: #000 !important;
    transform: scale(1.3);
  }
`;

  return (
    <motion.div
      initial={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.2,
      }}
      className={cn("relative w-full max-w-5xl px-5", className)}
    >
      <style>{css}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Swiper
          spaceBetween={spaceBetween}
          autoplay={
            autoplay
              ? {
                  delay: 2200,
                  disableOnInteraction: true,
                }
              : false
          }
          effect="coverflow"
          grabCursor={true}
          slidesPerView="auto"
          centeredSlides={true}
          loop={loop}
          coverflowEffect={{
            rotate: 40,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          pagination={
            showPagination
              ? {
                  clickable: true,
                }
              : false
          }
          navigation={
            showNavigation
              ? {
                  nextEl: ".swiper-button-next",
                  prevEl: ".swiper-button-prev",
                }
              : false
          }
          className="Carousal_003"
          modules={[EffectCoverflow, Autoplay, Pagination, Navigation]}
        >
          {cards.map((card, index) => (
            <SwiperSlide key={index}>
              <div className="step-coverflow-card">
                <div className="flex items-center justify-between">
                  <div className="step-num">{card.stepNumber}</div>
                  <span
                    className="rounded-full border-2 border-black px-3 py-1 text-xs font-black shadow-[2px_2px_0px_#000]"
                    style={{ backgroundColor: card.badgeColor || "#55db9c" }}
                  >
                    {card.badge}
                  </span>
                </div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
                <div className="flex items-center justify-between border-t-2 border-dashed border-black/20 pt-4">
                  <span className="text-xs font-black uppercase text-[#5c4ade]">
                    {card.subtag}
                  </span>
                  <span className="text-2xl">{card.icon}</span>
                </div>
              </div>
            </SwiperSlide>
          ))}
          {showNavigation && (
            <div>
              <div className="swiper-button-next after:hidden !w-12 !h-12 !bg-white !border-3 !border-black !rounded-full !shadow-[4px_4px_0px_#000] flex items-center justify-center">
                <ChevronRightIcon className="h-6 w-6 text-black" />
              </div>
              <div className="swiper-button-prev after:hidden !w-12 !h-12 !bg-white !border-3 !border-black !rounded-full !shadow-[4px_4px_0px_#000] flex items-center justify-center">
                <ChevronLeftIcon className="h-6 w-6 text-black" />
              </div>
            </div>
          )}
        </Swiper>
      </motion.div>
    </motion.div>
  );
};

export { Carousel_003 };
export default Skiper49;
