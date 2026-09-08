/**
 * Iconos con temática automotriz, dibujados en el mismo estilo de línea que lucide (24x24, trazo 2, extremos redondeados).
 * Uso: <SteeringWheelIcon className="size-5" />
 */
type P = { className?: string; strokeWidth?: number };

function Svg({ className, strokeWidth = 2, children }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}

/** Volante */
export function SteeringWheelIcon(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3.2 10.5c2.6 1 5.6 1.5 8.8 1.5s6.2-.5 8.8-1.5" />
      <path d="M12 14.5V21" />
      <path d="M9.8 13.4 4.6 17.5" />
      <path d="m14.2 13.4 5.2 4.1" />
    </Svg>
  );
}

/** Neumático / llanta */
export function WheelIcon(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.2" />
      <path d="M12 6.5v2M12 15.5v2M6.5 12h2M15.5 12h2" />
      <path d="m8.1 8.1 1.4 1.4M14.5 14.5l1.4 1.4M8.1 15.9l1.4-1.4M14.5 9.5l1.4-1.4" />
    </Svg>
  );
}

/** Bandera a cuadros */
export function CheckeredFlagIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M5 21V4" />
      <path d="M5 4h13.5l-2 4 2 4H5" />
      <path d="M9 4v8M13 4v8M5 6.7h13M5 9.3h13.5" strokeWidth={1.2} />
    </Svg>
  );
}

/** Velocímetro */
export function SpeedometerIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M4.3 17.5a9 9 0 1 1 15.4 0" />
      <path d="M12 14.5 16.5 8" />
      <circle cx="12" cy="15" r="1.6" />
      <path d="M12 6.2v1M6.3 8.6l.7.7M17.7 8.6l-.7.7M5 13.6h1M18 13.6h1" />
    </Svg>
  );
}

/** Pistón */
export function PistonIcon(p: P) {
  return (
    <Svg {...p}>
      <rect x="6.5" y="3" width="11" height="7" rx="1.5" />
      <path d="M8.5 6.5h7" />
      <path d="M10 10v3.5h4V10" />
      <path d="M12 13.5 9 20" />
      <circle cx="8.5" cy="20.5" r="1.5" />
      <circle cx="12" cy="13.5" r="1" />
    </Svg>
  );
}

/** Casco de piloto */
export function HelmetIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 13a8 8 0 0 1 16 0v3.5a2 2 0 0 1-2 2H9.5L4 15z" />
      <path d="M4 13h8.5a3 3 0 0 1 3 3v2.5" />
      <path d="M12.5 13V9" />
    </Svg>
  );
}

/** Llave de mecánico */
export function WrenchIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M14.5 6.5a4 4 0 0 0 4.9 4.9L21 13l-8 8-1.6-1.6 5.3-5.3a4 4 0 0 1-4.9-4.9L9.2 6.6 6.6 9.2 3 5.6 5.6 3l3.6 3.6z" />
    </Svg>
  );
}

/** Surtidor de bencina */
export function FuelPumpIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M3 21h12" />
      <path d="M6 6h6v5H6z" />
      <path d="M14 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9.5l-2.5-2.5" />
      <path d="M18.5 7v3" />
    </Svg>
  );
}

/** Trofeo */
export function TrophyIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4.5a1 1 0 0 0-1 1c0 2.5 1.5 4 3.5 4.5M17 6h2.5a1 1 0 0 1 1 1c0 2.5-1.5 4-3.5 4.5" />
    </Svg>
  );
}

/** Auto de perfil */
export function CarIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 13.5 4.6 8.8A2 2 0 0 1 6.5 7.5h8.6a2 2 0 0 1 1.6.8l2.6 3.4 2 .6a1 1 0 0 1 .7 1v2.2a1 1 0 0 1-1 1H3.5a.5.5 0 0 1-.5-.5z" />
      <circle cx="7.5" cy="16.5" r="2" />
      <circle cx="17" cy="16.5" r="2" />
      <path d="M3 11.5h14.5" />
    </Svg>
  );
}

/** Auto de frente (Hot Wheels style) */
export function CarFrontIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M5 13.5 6.4 8.4A2 2 0 0 1 8.3 7h7.4a2 2 0 0 1 1.9 1.4L19 13.5" />
      <path d="M4 13.5h16a1 1 0 0 1 1 1V18H3v-3.5a1 1 0 0 1 1-1z" />
      <path d="M5 18v2M19 18v2" />
      <circle cx="7.5" cy="15.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="15.8" r="1" fill="currentColor" stroke="none" />
      <path d="M10 15.8h4" />
    </Svg>
  );
}

/** Camioneta / pickup */
export function PickupIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 15.5V8a1 1 0 0 1 1-1h6l2.5 4H21a1 1 0 0 1 1 1v3.5" />
      <path d="M2 15.5h20" />
      <circle cx="7" cy="16.5" r="2" />
      <circle cx="17" cy="16.5" r="2" />
      <path d="M10 7v4H4" />
    </Svg>
  );
}

/** Llave de contacto */
export function CarKeyIcon(p: P) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="8" r="4.5" />
      <circle cx="8" cy="8" r="1.2" />
      <path d="m11.2 11.2 8.3 8.3M16.5 16.5l2-2M14 19l2-2" />
    </Svg>
  );
}

/** Caja / blíster de colección */
export function BlisterIcon(p: P) {
  return (
    <Svg {...p}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M10 3v3h4V3" />
      <path d="M8 12.5a4 4 0 0 1 8 0V15a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
      <path d="M8 8.5h8" />
    </Svg>
  );
}

/** Turbo */
export function TurboIcon(p: P) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="12" r="6" />
      <circle cx="11" cy="12" r="2" />
      <path d="M17 12h4v-2" />
      <path d="M11 6V3" />
      <path d="m8 9 2 3-2 3M14 9l-2 3 2 3" strokeWidth={1.3} />
    </Svg>
  );
}

/** Garage / retiro */
export function GarageIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 21V9.5l9-5.5 9 5.5V21" />
      <path d="M7 21v-8h10v8" />
      <path d="M7 16h10" />
    </Svg>
  );
}

/** Ruta / envío */
export function RoadIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 21 9 3h6l5 18" />
      <path d="M12 7v2M12 12v2M12 17v2" />
    </Svg>
  );
}

/** Escudo con llanta (pago seguro) */
export function ShieldWheelIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 7.8 7.5 9.5 4.3-1.7 7.5-5 7.5-9.5V6z" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Semáforo de largada */
export function StartLightsIcon(p: P) {
  return (
    <Svg {...p}>
      <rect x="4" y="7" width="16" height="10" rx="5" />
      <circle cx="8.5" cy="12" r="1.7" />
      <circle cx="15.5" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <path d="M12 3v4M12 17v4" />
    </Svg>
  );
}
