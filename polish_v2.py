import re

# --- 1. AnnouncementCarousel.tsx ---
with open("app/(v2)/_sections/AnnouncementCarousel.tsx", "r") as f:
    ac = f.read()

ac = ac.replace('import { Card } from "@/components/ui/8bit-card";', 'import { Card } from "@/components/ui/8bit-card";\nimport { motion } from "framer-motion";')

ac = ac.replace(
    '<h2 className="retro mb-12 text-center text-xl tracking-wider text-white">\n        ANNOUNCEMENTS\n      </h2>',
    '''<motion.h2 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="retro mb-12 text-center text-xl tracking-wider text-white"
      >
        ANNOUNCEMENTS
      </motion.h2>'''
)

ac = ac.replace(
    '<Card className="min-h-72 justify-between gap-6 py-10">',
    '<Card className="min-h-72 justify-between gap-6 py-10 border-white/10 hover:border-[#22c55e]/40 shadow-[0_0_15px_rgba(34,197,94,0.05)] transition-colors duration-500">'
)

with open("app/(v2)/_sections/AnnouncementCarousel.tsx", "w") as f:
    f.write(ac)


# --- 2. PixelLoadingScreen.tsx ---
with open("components/ui/PixelLoadingScreen.tsx", "r") as f:
    pl = f.read()

old_draw_ring = """      const bctx = backCanvas.getContext("2d");
      if (bctx) {
        bctx.clearRect(0, 0, w, h);
        bctx.beginPath();
        bctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, Math.PI, 2 * Math.PI);
        bctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
        bctx.lineWidth = 3;
        bctx.setLineDash([8, 12]);
        bctx.lineDashOffset = -(performance.now() / 50);
        bctx.stroke();
      }

      const fctx = frontCanvas.getContext("2d");
      if (fctx) {
        fctx.clearRect(0, 0, w, h);
        fctx.beginPath();
        fctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, 0, Math.PI);
        fctx.strokeStyle = "rgba(34, 197, 94, 0.5)";
        fctx.lineWidth = 3;
        fctx.setLineDash([8, 12]);
        fctx.lineDashOffset = -(performance.now() / 50);
        fctx.stroke();
      }"""

new_draw_ring = """      const drawSaturnRing = (ctx: CanvasRenderingContext2D, isBack: boolean) => {
        const startAngle = isBack ? Math.PI : 0;
        const endAngle = isBack ? 2 * Math.PI : Math.PI;
        
        // Inner thin ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX - 12, ORBIT_RY - 12 * (ORBIT_RY/ORBIT_RX), ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(34, 197, 94, ${isBack ? 0.15 : 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.stroke();

        // Main thick dashed ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(34, 197, 94, ${isBack ? 0.25 : 0.5})`;
        ctx.lineWidth = 6;
        ctx.setLineDash([12, 16]);
        ctx.lineDashOffset = -(performance.now() / 40);
        ctx.stroke();

        // Outer faint solid ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX + 10, ORBIT_RY + 10 * (ORBIT_RY/ORBIT_RX), ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(34, 197, 94, ${isBack ? 0.1 : 0.2})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();
      };

      const bctx = backCanvas.getContext("2d");
      if (bctx) {
        bctx.clearRect(0, 0, w, h);
        drawSaturnRing(bctx, true);
      }

      const fctx = frontCanvas.getContext("2d");
      if (fctx) {
        fctx.clearRect(0, 0, w, h);
        drawSaturnRing(fctx, false);
      }"""

pl = pl.replace(old_draw_ring, new_draw_ring)

# Update planet logos to have backgrounds
pl = pl.replace(
    'className="absolute flex items-center justify-center pointer-events-none"',
    'className="absolute flex items-center justify-center rounded-full pointer-events-none"'
)
pl = pl.replace(
    'style={{\n                  width: PLANET_ICON_SIZE,',
    'style={{\n                  backgroundColor: "#181717",\n                  width: PLANET_ICON_SIZE,'
)
# We replaced ALL of them with #181717. Let's fix Leetcode and LinkedIn specifically.
pl = pl.replace(
    'backgroundColor: "#181717",\n                  width: PLANET_ICON_SIZE,\n                  height: PLANET_ICON_SIZE,\n                  left: `calc(50% + ${(planetPositions.leetcode',
    'backgroundColor: "#FFA116",\n                  width: PLANET_ICON_SIZE,\n                  height: PLANET_ICON_SIZE,\n                  left: `calc(50% + ${(planetPositions.leetcode'
)
pl = pl.replace(
    'backgroundColor: "#181717",\n                  width: PLANET_ICON_SIZE,\n                  height: PLANET_ICON_SIZE,\n                  left: `calc(50% + ${(planetPositions.linkedin',
    'backgroundColor: "#0a66c2",\n                  width: PLANET_ICON_SIZE,\n                  height: PLANET_ICON_SIZE,\n                  left: `calc(50% + ${(planetPositions.linkedin'
)

# Scale down the SVGs so the background forms a nice circle padding
pl = pl.replace('<GitHubIcon size={PLANET_ICON_SIZE} />', '<GitHubIcon size={PLANET_ICON_SIZE * 0.6} />')
pl = pl.replace('<LeetCodeIcon size={PLANET_ICON_SIZE} />', '<LeetCodeIcon size={PLANET_ICON_SIZE * 0.55} />')
pl = pl.replace('<LinkedInIcon size={PLANET_ICON_SIZE} />', '<LinkedInIcon size={PLANET_ICON_SIZE * 0.55} />')

with open("components/ui/PixelLoadingScreen.tsx", "w") as f:
    f.write(pl)


# --- 3. V2Header.tsx ---
with open("app/(v2)/_sections/V2Header.tsx", "r") as f:
    vh = f.read()

vh = vh.replace('width={48}', 'width={64}')
vh = vh.replace('height={48}', 'height={64}')
vh = vh.replace('className="pixelated opacity-90 h-10 w-10 sm:h-12 sm:w-12"', 'className="pixelated opacity-90 h-14 w-14 sm:h-16 sm:w-16 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"')

with open("app/(v2)/_sections/V2Header.tsx", "w") as f:
    f.write(vh)


# --- 4. StatsSection.tsx ---
with open("app/(v2)/_sections/StatsSection.tsx", "r") as f:
    ss = f.read()

ss = ss.replace(
    '<div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">',
    '<div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3 relative z-10">'
)

ss = ss.replace(
    '<section className="w-full px-6 py-12">',
    '<section className="w-full px-6 py-16 relative">\n      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />\n'
)

ss = ss.replace(
    '<Card className="gap-6 py-8">',
    '<Card className="gap-6 py-8 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">'
)
ss = ss.replace(
    '<Card className="items-center justify-center gap-6 py-8">',
    '<Card className="items-center justify-center gap-6 py-8 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">'
)

with open("app/(v2)/_sections/StatsSection.tsx", "w") as f:
    f.write(ss)

print("Polishing script executed successfully.")
