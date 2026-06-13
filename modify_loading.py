import re

with open("components/ui/PixelLoadingScreen.tsx", "r") as f:
    content = f.read()

# 1. Update Constants
content = re.sub(
    r"const CANVAS_SIZE = 400;\s*const BLOCK_SIZE = 8;\s*const BLOCKS_PER_FRAME = 10;",
    "const CANVAS_SIZE = 700;\nconst BLOCK_SIZE = 14;\nconst BLOCKS_PER_FRAME = 20;",
    content
)

content = re.sub(
    r"const ORBIT_RX = 180;\s*const ORBIT_RY = 60;\s*const PLANET_ICON_SIZE = 32;",
    "const ORBIT_RX = 315;\nconst ORBIT_RY = 105;\nconst PLANET_ICON_SIZE = 40;\nconst ORBIT_TILT = -Math.PI / 4;",
    content
)

# 2. Update States
content = re.sub(
    r"const \[phase, setPhase\] = useState<AnimationPhase>\(.*?\);",
    'const [phase, setPhase] = useState<AnimationPhase>("drawing");',
    content
)

content = re.sub(
    r"const \[orbitVisible, setOrbitVisible\] = useState\(mode === \"hero\"\);",
    'const [orbitVisible, setOrbitVisible] = useState(false);',
    content
)

# 3. Update Hero DrawLogic
old_hero_draw = """      // If we are in hero mode, we don't draw block-by-block. 
      // We instantly draw the full image and dispatch the header reveal event.
      if (mode === "hero") {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0);
        window.dispatchEvent(new Event("hero-reveal-header"));
        return;
      }"""

new_hero_draw = """      // If we are in hero mode, we don't draw block-by-block. 
      // We instantly draw the full image and trigger the pop transition!
      if (mode === "hero") {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0);
        setDrawProgress(100);
        setTimeout(() => {
          setPhase("popping");
          setPopActive(true);
        }, 100);
        return;
      }"""
content = content.replace(old_hero_draw, new_hero_draw)


# 4. Refs
content = re.sub(
    r"const orbitCanvasRef = useRef<HTMLCanvasElement>\(null\);",
    "const orbitCanvasBackRef = useRef<HTMLCanvasElement>(null);\n  const orbitCanvasFrontRef = useRef<HTMLCanvasElement>(null);",
    content
)

# 5. drawOrbitRing
old_draw_orbit = """    const orbitCanvas = orbitCanvasRef.current;
    if (!orbitCanvas) return;

    const ctx = orbitCanvas.getContext("2d");
    if (!ctx) return;

    let frame: number;

    const drawOrbitRing = () => {
      const w = orbitCanvas.width;
      const h = orbitCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Dashed ellipse orbit path
      ctx.beginPath();
      ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -(performance.now() / 50); // animate the dashes
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle glow ring
      ctx.beginPath();
      ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.08)";
      ctx.lineWidth = 8;
      ctx.stroke();

      frame = requestAnimationFrame(drawOrbitRing);
    };"""

new_draw_orbit = """    const backCanvas = orbitCanvasBackRef.current;
    const frontCanvas = orbitCanvasFrontRef.current;
    if (!backCanvas || !frontCanvas) return;

    let frame: number;

    const drawOrbitRing = () => {
      const w = backCanvas.width;
      const h = backCanvas.height;
      const cx = w / 2;
      const cy = h / 2;

      const bctx = backCanvas.getContext("2d");
      if (bctx) {
        bctx.clearRect(0, 0, w, h);
        bctx.beginPath();
        bctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, Math.PI, 2 * Math.PI);
        bctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
        bctx.lineWidth = 2;
        bctx.setLineDash([6, 8]);
        bctx.lineDashOffset = -(performance.now() / 50);
        bctx.stroke();
      }

      const fctx = frontCanvas.getContext("2d");
      if (fctx) {
        fctx.clearRect(0, 0, w, h);
        fctx.beginPath();
        fctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, 0, Math.PI);
        fctx.strokeStyle = "rgba(34, 197, 94, 0.5)";
        fctx.lineWidth = 2;
        fctx.setLineDash([6, 8]);
        fctx.lineDashOffset = -(performance.now() / 50);
        fctx.stroke();
      }

      frame = requestAnimationFrame(drawOrbitRing);
    };"""
content = content.replace(old_draw_orbit, new_draw_orbit)

# 6. Planet Math
old_planet_math = """        const x = Math.cos(angle) * ORBIT_RX;
        const y = Math.sin(angle) * ORBIT_RY;
        const z = Math.sin(angle);
        const scale = 0.7 + 0.3 * ((z + 1) / 2);
        return { x, y, scale, z };"""

new_planet_math = """        const unX = ORBIT_RX * Math.cos(angle);
        const unY = ORBIT_RY * Math.sin(angle);
        const x = unX * Math.cos(ORBIT_TILT) - unY * Math.sin(ORBIT_TILT);
        const y = unX * Math.sin(ORBIT_TILT) + unY * Math.cos(ORBIT_TILT);
        const z = Math.sin(angle);
        const scale = 0.7 + 0.3 * ((z + 1) / 2);
        return { x, y, scale, z };"""
content = content.replace(old_planet_math, new_planet_math)

# 7. JSX Rewrite
old_jsx_start = "const orbitContainerSize = (ORBIT_RX + PLANET_ICON_SIZE) * 2 + 20;"
if old_jsx_start in content:
    content = content.replace(old_jsx_start, "")

jsx_start_idx = content.find("      <div className=\"relative z-10 flex w-full max-w-[400px] flex-col items-center\">")
jsx_end_idx = content.find("{/* ── 8-Bit Loading Bar + Status Text ── */}")

new_jsx = """      <div className="relative z-10 flex w-full max-w-[700px] flex-col items-center">
        {/* ── 3D Container ── */}
        <div className="relative w-full aspect-square flex items-center justify-center">
          
          {/* Back Orbit Ring (z-0) */}
          {showOrbit && (
            <canvas
              ref={orbitCanvasBackRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-0 w-full h-full pointer-events-none"
              style={{
                opacity: orbitVisible ? 1 : 0,
                transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
              }}
            />
          )}

          {/* Logo (z-10) */}
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{
              transform: `scale(${logoScale})`,
              transition:
                phase === "popping" || phase === "orbiting"
                  ? `transform ${POP_DURATION_MS}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`
                  : "none",
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block w-full h-full max-w-[700px] max-h-[700px]"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {/* Front Orbit Ring (z-20) */}
          {showOrbit && (
            <canvas
              ref={orbitCanvasFrontRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-20 w-full h-full pointer-events-none"
              style={{
                opacity: orbitVisible ? 1 : 0,
                transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
              }}
            />
          )}

          {/* Planets (Siblings with dynamic z-index to cross the logo) */}
          {showOrbit && (
            <>
              {/* GitHub */}
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.github.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.github.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.github.scale})`,
                  zIndex: planetPositions.github.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.github.z + 1) / 2)) : 0,
                  transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <GitHubIcon size={PLANET_ICON_SIZE} />
              </div>

              {/* LeetCode */}
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.leetcode.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.leetcode.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.leetcode.scale})`,
                  zIndex: planetPositions.leetcode.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.leetcode.z + 1) / 2)) : 0,
                  transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <LeetCodeIcon size={PLANET_ICON_SIZE} />
              </div>

              {/* LinkedIn */}
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.linkedin.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.linkedin.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.linkedin.scale})`,
                  zIndex: planetPositions.linkedin.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.linkedin.z + 1) / 2)) : 0,
                  transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <LinkedInIcon size={PLANET_ICON_SIZE} />
              </div>
            </>
          )}
        </div>

        """

content = content[:jsx_start_idx] + new_jsx + content[jsx_end_idx:]

with open("components/ui/PixelLoadingScreen.tsx", "w") as f:
    f.write(content)

print("Modification complete.")
