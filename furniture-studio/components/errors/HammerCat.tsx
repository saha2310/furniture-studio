/**
 * Белый кот с чёрной обводкой, в строительной каске, стучит молотком по гвоздю.
 * Чистый SVG + CSS-анимации (классы .hc-* в app/globals.css), без JS.
 * Обводка лап и хвоста сделана двумя линиями: широкая чёрная + узкая белая сверху.
 */
const INK = '#141413';
const W = 4; // толщина обводки

export function HammerCat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 260" className={className} role="img" aria-label="Кот в каске чинит что-то молотком">
      {/* тени */}
      <ellipse cx="118" cy="236" rx="78" ry="7" fill={INK} opacity="0.08" />
      <ellipse cx="262" cy="236" rx="56" ry="6" fill={INK} opacity="0.08" />
      <line x1="20" y1="232" x2="320" y2="232" stroke={INK} strokeWidth="3" strokeLinecap="round" />

      {/* доска с гвоздём */}
      <g className="hc-plank">
        <rect x="212" y="210" width="98" height="22" rx="3" fill="#fff" stroke={INK} strokeWidth={W} />
        <line x1="226" y1="221" x2="240" y2="221" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <line x1="280" y1="217" x2="298" y2="217" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <g className="hc-nail">
          <rect x="251" y="200" width="5" height="12" fill="#fff" stroke={INK} strokeWidth="3" />
          <rect x="245" y="196" width="17" height="5" rx="1.5" fill="#fff" stroke={INK} strokeWidth="3" />
        </g>
      </g>

      {/* искры при ударе */}
      <g className="hc-sparks" stroke={INK} strokeWidth="3" strokeLinecap="round">
        <line x1="236" y1="190" x2="226" y2="182" />
        <line x1="253" y1="184" x2="253" y2="172" />
        <line x1="270" y1="190" x2="280" y2="182" />
        <line x1="276" y1="203" x2="288" y2="203" />
        <line x1="230" y1="203" x2="218" y2="203" />
      </g>

      {/* хвост */}
      <g className="hc-tail">
        <path d="M66 222 C26 214 22 168 50 152" fill="none" stroke={INK} strokeWidth="16" strokeLinecap="round" />
        <path d="M66 222 C26 214 22 168 50 152" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      </g>

      {/* тело и задние лапы */}
      <ellipse cx="116" cy="192" rx="58" ry="40" fill="#fff" stroke={INK} strokeWidth={W} />
      <ellipse cx="96" cy="229" rx="15" ry="7" fill="#fff" stroke={INK} strokeWidth={W} />
      <ellipse cx="134" cy="229" rx="15" ry="7" fill="#fff" stroke={INK} strokeWidth={W} />

      {/* голова */}
      <g className="hc-head">
        <path d="M84 104 L80 66 L108 86 Z" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <path d="M156 104 L160 66 L132 86 Z" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <circle cx="120" cy="122" r="42" fill="#fff" stroke={INK} strokeWidth={W} />
        {/* глаза (моргают) */}
        <g className="hc-eyes" fill={INK}>
          <ellipse cx="104" cy="124" rx="4.5" ry="5.5" />
          <ellipse cx="136" cy="124" rx="4.5" ry="5.5" />
        </g>
        {/* брови — сосредоточенный вид */}
        <path d="M96 112 L110 115" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M144 112 L130 115" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle cx="94" cy="138" r="6" fill="#f4a7b9" opacity="0.45" />
        <circle cx="146" cy="138" r="6" fill="#f4a7b9" opacity="0.45" />
        <path d="M116 134 L124 134 L120 139 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M112 143 Q116 147 120 143 Q124 147 128 143" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <g stroke={INK} strokeWidth="2" strokeLinecap="round">
          <line x1="70" y1="132" x2="90" y2="135" />
          <line x1="70" y1="142" x2="90" y2="140" />
          <line x1="170" y1="132" x2="150" y2="135" />
          <line x1="170" y1="142" x2="150" y2="140" />
        </g>
        {/* каска */}
        <path d="M80 100 Q80 60 120 58 Q160 60 160 100 Z" fill="#f5c542" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <path d="M120 58 L120 98" stroke={INK} strokeWidth="3" />
        <path d="M104 62 Q100 78 102 98" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.5" />
        <path d="M136 62 Q140 78 138 98" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.5" />
        <rect x="70" y="96" width="100" height="10" rx="5" fill="#f5c542" stroke={INK} strokeWidth={W} />
      </g>

      {/* передняя лапа с молотком — вращается вокруг плеча */}
      <g className="hc-arm">
        <path d="M148 166 Q172 186 198 186" fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" />
        <path d="M148 166 Q172 186 198 186" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        {/* рукоять */}
        <rect x="196" y="181" width="56" height="9" rx="3" fill="#c98b4a" stroke={INK} strokeWidth="3" />
        {/* боёк */}
        <rect x="241" y="168" width="24" height="30" rx="3" fill="#5b5b58" stroke={INK} strokeWidth="3" />
        <rect x="247" y="168" width="4" height="30" fill="#fff" opacity="0.25" />
        {/* лапка поверх рукояти */}
        <circle cx="203" cy="185" r="10" fill="#fff" stroke={INK} strokeWidth={W} />
        <path d="M199 180 L199 186 M204 179 L204 186" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
