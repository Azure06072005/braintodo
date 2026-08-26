import { useEffect, useRef } from "react";
import { theme, seededRandom } from "../theme";

// Two depth layers (near/far) give real parallax-of-scale without any
// actual parallax math - closer stars are bigger, brighter, and twinkle
// faster, the way looking at an actual night sky reads as "depth" even
// though it's all rendered on one flat canvas.
const LAYERS = [
  { count: 90, sizeRange: [0.4, 1.1], speedRange: [0.4, 0.9] },
  { count: 50, sizeRange: [1.0, 2.2], speedRange: [0.9, 1.6] },
];

function buildStars() {
  const stars = [];
  let seed = 1;
  for (const layer of LAYERS) {
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

/**
 * Ambient universe-theme background: a twinkling starfield canvas plus a
 * couple of soft nebula glows and faint orbit rings, layered with CSS
 * behind whatever the page renders on top. Foundation piece for FE022 -
 * FE023 (personalization), FE024 (marketing pages), and FE025 (3D graph)
 * all build their look on these same tokens/component rather than each
 * inventing their own background treatment.
 *
 * Deliberately restrained per the "spend your boldness in one place"
 * principle: this is the one ambient/atmosphere element, everything drawn
 * on top of it (panels, forms, graph canvas) stays as quiet and disciplined
 * as it already is - the starfield doesn't compete with foreground content.
 *
 * Respects prefers-reduced-motion: stars render at a fixed mid-brightness
 * instead of twinkling when the user has that preference set.
 */
export default function Starfield() {
  const canvasRef = useRef(null);
  const starsRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    // jsdom's canvas 2D context is unavailable without the native `canvas`
    // package - render nothing rather than throwing, so this component is
    // still mountable/testable without pulling in that heavy dependency.
    if (!ctx) return undefined;

    if (!starsRef.current) {
      starsRef.current = buildStars();
    }
    const stars = starsRef.current;

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
  }, []);

  return (
    <div aria-hidden="true" style={styles.container} data-testid="starfield">
      <div style={styles.nebula} />
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
  nebula: {
    position: "absolute",
    inset: 0,
    opacity: 0.35,
    background: `
      radial-gradient(ellipse 60% 40% at 15% 20%, ${theme.nebula[0]}33, transparent 60%),
      radial-gradient(ellipse 50% 50% at 85% 15%, ${theme.nebula[1]}26, transparent 60%),
      radial-gradient(ellipse 55% 45% at 75% 85%, ${theme.nebula[2]}22, transparent 60%),
      radial-gradient(ellipse 45% 35% at 20% 90%, ${theme.nebula[3]}22, transparent 60%)
    `,
  },
  orbits: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  canvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
};