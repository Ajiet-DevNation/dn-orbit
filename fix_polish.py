import re

# --- PixelLoadingScreen.tsx Modifications ---
with open("components/ui/PixelLoadingScreen.tsx", "r") as f:
    pl = f.read()

# 1. Scale up sizes
pl = re.sub(r'const BLOCK_SIZE = 14;', 'const BLOCK_SIZE = 18;', pl)
pl = re.sub(r'const CANVAS_SIZE = 700;', 'const CANVAS_SIZE = 900;', pl)
pl = re.sub(r'const ORBIT_RX = 315;', 'const ORBIT_RX = 410;', pl)
pl = re.sub(r'const ORBIT_RY = 105;', 'const ORBIT_RY = 135;', pl)

# 2. Fix SVG colors
pl = pl.replace('className="text-[#FFA116] drop-shadow-[0_0_6px_rgba(255,161,22,0.6)]"', 'className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"')
pl = pl.replace('className="text-[#0A66C2] drop-shadow-[0_0_6px_rgba(10,102,194,0.6)]"', 'className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"')

# 3. Add overflow-hidden to the planet containers so they are strictly circles
pl = pl.replace('className="absolute flex items-center justify-center rounded-full pointer-events-none"', 'className="absolute flex items-center justify-center rounded-full overflow-hidden border-2 border-transparent pointer-events-none"')

# 4. Lower the canvas container to center it better
pl = pl.replace(
    '<div className="relative aspect-square w-full max-w-[60vh]">',
    '<div className="relative aspect-square w-full max-w-[60vh] mt-16">'
)

# 5. Redesign orbit ring to be a glowing energy band instead of dashed tracks
old_draw_ring = """      const drawSaturnRing = (ctx: CanvasRenderingContext2D, isBack: boolean) => {
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
      };"""

new_draw_ring = """      const drawSaturnRing = (ctx: CanvasRenderingContext2D, isBack: boolean) => {
        const startAngle = isBack ? Math.PI : 0;
        const endAngle = isBack ? 2 * Math.PI : Math.PI;
        
        ctx.save();
        // Glow effect
        ctx.shadowColor = "rgba(34, 197, 94, 0.8)";
        ctx.shadowBlur = 15;

        // Main thick energy ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(34, 197, 94, ${isBack ? 0.2 : 0.4})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([]); // Solid ring, not dashed
        ctx.stroke();

        // Inner core of the energy ring (brighter)
        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(255, 255, 255, ${isBack ? 0.1 : 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      };"""

pl = pl.replace(old_draw_ring, new_draw_ring)

with open("components/ui/PixelLoadingScreen.tsx", "w") as f:
    f.write(pl)


# --- ProfileModal.tsx Modifications ---
with open("app/(v2)/_sections/ProfileModal.tsx", "r") as f:
    pm = f.read()

# Import signOut
pm = pm.replace(
    'import type { ReactNode } from "react";',
    'import type { ReactNode } from "react";\nimport { signOut } from "next-auth/react";'
)

# Add logout button
logout_btn = """              <Button
                className="mt-2 w-full text-[10px]"
                onClick={() => setConfirmOpen(true)}
              >
                SAVE CHANGES
              </Button>
            </div>
          </div>
          
          {/* Logout Button */}
          <div className="mt-12 flex justify-start">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="retro text-[10px] text-red-500 hover:text-red-400 hover:underline transition-colors"
            >
              [ LOG OUT ]
            </button>
          </div>
        </div>"""

pm = pm.replace(
    '''              <Button
                className="mt-2 w-full text-[10px]"
                onClick={() => setConfirmOpen(true)}
              >
                SAVE CHANGES
              </Button>
            </div>
          </div>
        </div>''',
    logout_btn
)

with open("app/(v2)/_sections/ProfileModal.tsx", "w") as f:
    f.write(pm)

print("Fix script applied.")
