import { useState, useRef, useEffect } from "react";

interface WaveformVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
}

const WaveformVisualizer = ({ isPlaying, barCount = 32 }: WaveformVisualizerProps) => {
  return (
    <div className="flex items-center justify-center gap-[2px] h-12 px-4">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary transition-all duration-150"
          style={{
            height: isPlaying ? `${Math.random() * 28 + 4}px` : "4px",
            animationDelay: `${i * 0.05}s`,
            opacity: isPlaying ? 0.6 + Math.random() * 0.4 : 0.3,
            transition: "height 0.15s ease",
          }}
        />
      ))}
    </div>
  );
};

export default WaveformVisualizer;
