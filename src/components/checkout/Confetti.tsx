/** Confeti sutil solo con CSS (sin JS). Decorativo, respeta prefers-reduced-motion. */
const COLORS = ["#b0d800", "#0a0a0a", "#ec9f47", "#93b500", "#ffffff"];

export function Confetti({ pieces = 28 }: { pieces?: number }) {
  const items = Array.from({ length: pieces }, (_, i) => {
    const left = (i * 37) % 100;
    const delay = ((i * 13) % 20) / 10;
    const duration = 3.2 + ((i * 7) % 15) / 10;
    const size = 6 + ((i * 5) % 6);
    const color = COLORS[i % COLORS.length];
    const rotate = (i * 47) % 360;
    return { left, delay, duration, size, color, rotate, round: i % 3 === 0 };
  });
  return (
    <div aria-hidden className="tw-confetti pointer-events-none absolute inset-x-0 top-0 h-[60vh] overflow-hidden">
      <style>{`
        @keyframes tw-confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translateY(62vh) rotate(720deg); opacity: 0; }
        }
        .tw-confetti span {
          position: absolute; top: 0; display: block;
          animation: tw-confetti-fall var(--d) cubic-bezier(.25,.6,.4,1) var(--delay) 2 both;
        }
        @media (prefers-reduced-motion: reduce) { .tw-confetti { display: none; } }
      `}</style>
      {items.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            background: p.color,
            borderRadius: p.round ? "999px" : "2px",
            transform: `rotate(${p.rotate}deg)`,
            boxShadow: p.color === "#ffffff" ? "0 0 0 1px rgb(0 0 0 / .08)" : undefined,
            ["--d" as string]: `${p.duration}s`,
            ["--delay" as string]: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
