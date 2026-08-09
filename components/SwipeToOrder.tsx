"use client";

import { useRef, useState } from "react";

type Props = {
  onSwipeComplete: () => void;
  label?: string;
  disabled?: boolean;
};

const THUMB_SIZE = 52; // px
const TRACK_PADDING = 4; // px
const COMPLETE_THRESHOLD = 0.82; // fraction of max travel required to count as a swipe

export default function SwipeToOrder({
  onSwipeComplete,
  label = "Swipe to order",
  disabled = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [locked, setLocked] = useState(false);
  const startXRef = useRef(0);
  const originXRef = useRef(0);

  function getMaxX() {
    const track = trackRef.current;
    if (!track) return 0;
    return track.clientWidth - THUMB_SIZE - TRACK_PADDING * 2;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (disabled || locked) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    startXRef.current = e.clientX;
    originXRef.current = dragX;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || disabled || locked) return;
    const maxX = getMaxX();
    const delta = e.clientX - startXRef.current;
    const next = Math.min(maxX, Math.max(0, originXRef.current + delta));
    setDragX(next);
  }

  function handlePointerUp() {
    if (!dragging || disabled || locked) return;
    setDragging(false);
    const maxX = getMaxX();
    if (maxX > 0 && dragX / maxX >= COMPLETE_THRESHOLD) {
      setDragX(maxX);
      setLocked(true);
      window.setTimeout(() => onSwipeComplete(), 180);
    } else {
      setDragX(0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled || locked) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const maxX = getMaxX();
      setDragX(maxX);
      setLocked(true);
      window.setTimeout(() => onSwipeComplete(), 180);
    }
  }

  const maxX = getMaxX();
  const progress = maxX > 0 ? dragX / maxX : 0;

  return (
    <div
      ref={trackRef}
      className={`relative h-16 flex-shrink-0 select-none overflow-hidden rounded-full bg-zinc-900 p-1 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-white transition-opacity"
        style={{ opacity: Math.max(0, 1 - progress * 1.6) }}
      >
        {label} &rarr;
      </div>

      <div
        className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-emerald-500"
        style={{ width: dragX + THUMB_SIZE }}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Swipe to order, or press Enter to order"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-emerald-600 shadow-md outline-none ${
          dragging ? "" : "transition-transform duration-200 ease-out"
        }`}
        style={{ transform: `translateX(${dragX}px)`, touchAction: "none" }}
      >
        {locked ? (
          <span aria-hidden>&#10003;</span>
        ) : (
          <span aria-hidden>&rarr;</span>
        )}
      </div>
    </div>
  );
}
