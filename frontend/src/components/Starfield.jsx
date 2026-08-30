import { useEffect, useMemo, useRef } from "react";
import { theme, seededRandom } from "../theme";
import { usePersonalization } from "../personalization/usePersonalization";
import { PALETTE_PRESETS, STAR_DENSITY_OPTIONS } from "../personalization/presets";

function layersForDensity(starDensity) {
  const { nearCount, farCount } = STAR_DENSITY_OPTIONS[starDensity] || STAR_DENSITY_OPTIONS.medium;
  return [
    { count: nearCount, sizeRange: [0.4, 1.1], speedRange: [0.4, 0.9] },
    { count: farCount, sizeRange: [1.0, 2.2], speedRange: [0.9, 1.6] },
  ];
}

function buildStars(layers) {
  const stars = [];
  let seed = 1;
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      seed += 1;
      const [minSize, maxSize] = layer.sizeRange;
      const [minSpeed, maxSpeed] = layer.speedRange;
      stars.push({
        x: seededRandom(seed * 7.13),
        y: seededRandom(seed * 3.71),
        size: minSize + seededRandom(seed * 5.29) * (maxSize - minSize),
        phase: seededRandom(seed * 9.83) * Math.PI * 2,
        speed: minSpeed + seededRandom(seed * 2.17) * (maxSpeed - minSpeed),
      });
    }
  }
  return stars;
}

export default function Starfield() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const { settings } = usePersonalization();

  const palette = PALETTE_PRESETS[settings.palette] || PALETTE_PRESETS.nebula;
  const layers = useMemo(() => layersForDensity(settings.starDensity), [settings.starDensity]);
  const stars = useMemo(() => buildStars(layers), [layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(t) {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = reduceMotion
          ? (theme.starOpacityMin + theme.starOpacityMax) / 2
          : theme.starOpacityMin +
            ((Math.sin(t * 0.001 * star.speed + star.phase) + 1) / 2) *
              (theme.starOpacityMax - theme.starOpacityMin);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = theme.starColor;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
    }
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [stars]);

  return (
    <div aria-hidden="true" style={styles.container} data-testid="starfield">
      <div
        style={{
          ...styles.nebula,
          background: `
            radial-gradient(ellipse 60% 40% at 15% 20%, ${palette.nebula[0]}33, transparent 60%),
            radial-gradient(ellipse 50% 50% at 85% 15%, ${palette.nebula[1]}26, transparent 60%),
            radial-gradient(ellipse 55% 45% at 75% 85%, ${palette.nebula[2]}22, transparent 60%),
            radial-gradient(ellipse 45% 35% at 20% 90%, ${palette.nebula[3]}22, transparent 60%)
          `,
        }}
      />
      <svg style={styles.orbits} viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="50" cy="50" rx="46" ry="18" fill="none" stroke={theme.orbitLine} strokeWidth="0.15" />
        <ellipse cx="50" cy="50" rx="34" ry="34" fill="none" stroke={theme.orbitLine} strokeWidth="0.15" />
        <ellipse cx="50" cy="50" rx="24" ry="40" fill="none" stroke={theme.orbitLine} strokeWidth="0.15" />
      </svg>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    overflow: "hidden",
    background: theme.canvasBg,
  },
  nebula: { position: "absolute", inset: 0, opacity: 0.35 },
  orbits: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%" },
};