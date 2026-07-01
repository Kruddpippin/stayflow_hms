/**
 * Animated hotel dashboard visualization for the landing page hero.
 * Pure CSS keyframe animations — no video file needed, no buffering,
 * seamlessly looping. Matches the Remotion composition design exactly.
 */

const ROOMS = [
  "occupied","available","occupied","occupied","dirty",
  "available","occupied","available","clean","occupied",
  "occupied","available","dirty","occupied","available",
  "available","occupied","out_of_order","clean","available",
];

const DOT: Record<string, string> = {
  available:     "#34d399",
  occupied:      "#60a5fa",
  dirty:         "#fbbf24",
  clean:         "#a7f3d0",
  out_of_order:  "#f87171",
};

const glass = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.11)",
  borderRadius: 18,
  boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1)",
} as const;

export default function HeroDashboardAnimation() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 600,
        fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif",
        background: "transparent",
      }}
    >
      <style>{`
        @keyframes floatA {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(-5px); }
          50%      { transform: translateY(5px); }
        }
        @keyframes floatC {
          0%,100% { transform: translateY(-3px) translateX(0px); }
          50%      { transform: translateY(5px) translateX(-4px); }
        }
        @keyframes floatD {
          0%,100% { transform: translateY(0px) translateX(0px); }
          50%      { transform: translateY(-6px) translateX(3px); }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeSlideLeft {
          from { opacity:0; transform:translateX(20px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes countUp78 {
          from { stroke-dasharray: 0 175.9; }
          to   { stroke-dasharray: 137.2 175.9; }
        }
        @keyframes orb1 {
          0%,100% { transform: translate(-50%,-50%) translate(0px,0px); }
          50%      { transform: translate(-50%,-50%) translate(12px,-8px); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(-50%,-50%) translate(0px,0px); }
          50%      { transform: translate(-50%,-50%) translate(-8px,10px); }
        }
        @keyframes dotPop {
          0%   { opacity:0; transform:scale(0.3); }
          60%  { transform:scale(1.15); }
          100% { opacity:0.88; transform:scale(1); }
        }
        @keyframes revCount {
          0%   { opacity:0; }
          5%   { opacity:1; }
          100% { opacity:1; }
        }
      `}</style>

      {/* ── Ambient orbs ── */}
      <div style={{
        position: "absolute", left: "75%", top: "15%",
        width: 360, height: 360, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,211,153,0.35) 0%, transparent 70%)",
        opacity: 0.08, filter: "blur(50px)",
        transform: "translate(-50%,-50%)",
        animation: "orb1 12s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", left: "55%", top: "70%",
        width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)",
        opacity: 0.06, filter: "blur(40px)",
        transform: "translate(-50%,-50%)",
        animation: "orb2 15s ease-in-out infinite",
      }} />

      {/* ── Room grid card ── */}
      <div style={{
        position: "absolute", top: 32, right: 16,
        ...glass, padding: "20px 22px", width: 245,
        animation: "fadeSlideLeft 0.7s cubic-bezier(0.34,1.26,0.64,1) 0.1s both, floatA 8s ease-in-out 0.8s infinite",
      }}>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 9.5, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 14 }}>
          Room Status
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7, marginBottom: 14 }}>
          {ROOMS.map((status, i) => (
            <div key={i} style={{
              width: 22, height: 22, borderRadius: 7,
              background: DOT[status] || "#34d399",
              animation: `dotPop 0.4s cubic-bezier(0.34,1.26,0.64,1) ${0.15 + i * 0.04}s both`,
            }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { c: "#34d399", l: "Available" },
            { c: "#60a5fa", l: "Occupied" },
            { c: "#fbbf24", l: "Dirty" },
          ].map(({ c, l }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 3, background: c }} />
              <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 9 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reservation card ── */}
      <div style={{
        position: "absolute", top: 250, right: 36,
        ...glass, padding: "18px 20px", width: 268,
        animation: "fadeSlideLeft 0.7s cubic-bezier(0.34,1.26,0.64,1) 0.25s both, floatB 9.5s ease-in-out 1s infinite",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9.5, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase" }}>
            New Arrival
          </span>
          <div style={{
            background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.35)",
            borderRadius: 20, padding: "2px 10px", color: "#34d399", fontSize: 9, fontWeight: 600,
          }}>
            Confirmed
          </div>
        </div>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 3 }}>
          Amaka Okonkwo
        </div>
        <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, marginBottom: 14 }}>
          Deluxe Room · 2 Adults
        </div>
        <div style={{ display: "flex" }}>
          {[
            { label: "Check-in", value: "Jul 2" },
            { label: "Check-out", value: "Jul 5" },
            { label: "Total", value: "₦45,000" },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none", paddingLeft: i > 0 ? 12 : 0 }}>
              <div style={{ color: "rgba(255,255,255,0.33)", fontSize: 9, marginBottom: 3 }}>{label}</div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Occupancy card ── */}
      <div style={{
        position: "absolute", bottom: 85, right: 45,
        ...glass, padding: "18px 20px", width: 198,
        animation: "fadeSlideLeft 0.7s cubic-bezier(0.34,1.26,0.64,1) 0.4s both, floatC 10s ease-in-out 1.2s infinite",
      }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9.5, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 14 }}>
          Occupancy
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Animated ring */}
          <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
            <svg width={68} height={68} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={34} cy={34} r={28} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
              <circle
                cx={34} cy={34} r={28}
                fill="none" stroke="#34d399" strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="0 175.9"
                style={{ animation: "countUp78 2s cubic-bezier(0.4,0,0.2,1) 0.6s forwards" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 16, fontWeight: 800,
            }}>
              78%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {[
              { c: "#60a5fa", l: "Occupied", v: "14" },
              { c: "#34d399", l: "Available", v: "4" },
              { c: "#fbbf24", l: "Dirty", v: "2" },
            ].map(({ c, l, v }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: c }} />
                  <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 9.5 }}>{l}</span>
                </div>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Revenue badge ── */}
      <div style={{
        position: "absolute", bottom: 85, right: 275,
        ...glass, padding: "14px 18px",
        animation: "fadeSlideUp 0.7s cubic-bezier(0.34,1.26,0.64,1) 0.5s both, floatD 8.5s ease-in-out 1.4s infinite",
      }}>
        <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 9, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 6 }}>
          Today's Revenue
        </div>
        <div style={{ color: "#34d399", fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
          ₦127,400
        </div>
        <div style={{ color: "rgba(52,211,153,0.6)", fontSize: 10, marginTop: 3 }}>
          ↑ 12% from yesterday
        </div>
      </div>

      {/* ── Housekeeping badge ── */}
      <div style={{
        position: "absolute", top: 175, left: 8,
        ...glass, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10, width: 196,
        animation: "fadeSlideUp 0.7s cubic-bezier(0.34,1.26,0.64,1) 0.6s both, floatB 11s ease-in-out 1.6s infinite",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          ✨
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>3 rooms to clean</div>
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginTop: 2 }}>Assigned to Ngozi</div>
        </div>
      </div>
    </div>
  );
}
