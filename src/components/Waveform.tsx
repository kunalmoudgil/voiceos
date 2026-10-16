"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  getAnalyser: () => AnalyserNode | null;
  active: boolean;
  className?: string;
}

export function Waveform({ getAnalyser, active, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    let dataArray: Uint8Array | null = null;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = getAnalyser();
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (!active || !analyser) {
        // Idle flat line.
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);

      const bars = Math.min(48, dataArray.length);
      const step = Math.floor(dataArray.length / bars);
      const gap = 3 * dpr;
      const barWidth = width / bars - gap;

      for (let i = 0; i < bars; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(3 * dpr, value * height * 0.9);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "#8b5bff");
        gradient.addColorStop(1, "#5b8cff");
        ctx.fillStyle = gradient;

        const radius = Math.min(barWidth / 2, 4 * dpr);
        roundedRect(ctx, x, y, barWidth, barHeight, radius);
        ctx.fill();
      }
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, getAnalyser]);

  return <canvas ref={canvasRef} className={className} />;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
