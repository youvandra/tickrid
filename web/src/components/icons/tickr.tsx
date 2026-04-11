import * as React from "react";

export type TickrIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

function baseProps(size: number, props: TickrIconProps) {
  const rest: React.SVGProps<SVGSVGElement> = { ...props };
  // Jangan teruskan prop "size" ke <svg>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (rest as any).size;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": rest["aria-label"] ? undefined : true,
    focusable: false,
    ...rest,
  };
}

export function IconBolt(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z" />
    </svg>
  );
}

export function IconWifi(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M4.5 9.5a12 12 0 0 1 15 0" />
      <path d="M7.8 12.8a7.5 7.5 0 0 1 8.4 0" />
      <path d="M11.2 16.2a3 3 0 0 1 1.6 0" />
      <path d="M12 20h0" />
    </svg>
  );
}

export function IconPhoneQr(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10 5.5h4" />
      <path d="M12 19h0" />
      <path d="M5.5 10.5h0" />
      <path d="M18.5 10.5h0" />
      {/* small "qr" grid */}
      <rect x="9.2" y="9.2" width="2.4" height="2.4" rx="0.4" />
      <rect x="12.4" y="12.4" width="2.4" height="2.4" rx="0.4" />
      <path d="M14.8 9.2h0" />
      <path d="M9.2 14.8h0" />
    </svg>
  );
}

export function IconSliders(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <path d="M10 6v0" />
      <path d="M4 12h2" />
      <path d="M10 12h10" />
      <path d="M6 12v0" />
      <path d="M4 18h14" />
      <path d="M22 18h-2" />
      <path d="M18 18v0" />
      <circle cx="14" cy="6" r="1.8" />
      <circle cx="8" cy="12" r="1.8" />
      <circle cx="20" cy="18" r="1.8" />
    </svg>
  );
}

export function IconSync(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.5 6.5A8.5 8.5 0 0 1 20 10" />
      <path d="M17.5 17.5A8.5 8.5 0 0 1 4 14" />
    </svg>
  );
}

export function IconCheck(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconDisplaySingle(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <rect x="4" y="6" width="16" height="12" rx="2.5" />
      <path d="M7 12h6" />
      <path d="M15 12h2" />
    </svg>
  );
}

export function IconDisplayDual(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <rect x="4" y="6" width="16" height="12" rx="2.5" />
      <path d="M12 6v12" />
      <path d="M7 12h3" />
      <path d="M14 12h3" />
    </svg>
  );
}

export function IconDisplayRotate(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
      <path d="M8 12h0" />
      <path d="M12 12h0" />
      <path d="M16 12h0" />
    </svg>
  );
}

export function IconPulse(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M4 12h4l2-5 4 10 2-5h4" />
    </svg>
  );
}

export function IconGrid(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <rect x="4" y="4" width="6" height="6" rx="1.4" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" />
      <rect x="14" y="14" width="6" height="6" rx="1.4" />
    </svg>
  );
}

export function IconChartUp(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M5 19V6" />
      <path d="M5 19h14" />
      <path d="M7.5 14.5 11 11l2.5 2.5L18 9" />
    </svg>
  );
}

export function IconGlobe(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4c2.2 2.2 3.3 5.3 3.3 8s-1.1 5.8-3.3 8" />
      <path d="M12 4c-2.2 2.2-3.3 5.3-3.3 8s1.1 5.8 3.3 8" />
    </svg>
  );
}

export function IconCoin(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <ellipse cx="12" cy="12" rx="7.5" ry="8" />
      <path d="M9.5 10.5c0-1.1 1.1-2 2.5-2h1" />
      <path d="M14.5 13.5c0 1.1-1.1 2-2.5 2h-1" />
      <path d="M12 8v8" />
    </svg>
  );
}

export function IconLayers(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="m12 5 8 4-8 4-8-4 8-4Z" />
      <path d="m4 13 8 4 8-4" />
      <path d="m4 17 8 4 8-4" />
    </svg>
  );
}

export function IconGem(props: TickrIconProps) {
  const size = props.size ?? 24;
  return (
    <svg {...baseProps(size, props)}>
      <path d="M8 5h8l3 4-7 10L5 9l3-4Z" />
      <path d="M5 9h14" />
      <path d="M10 9 12 5l2 4" />
    </svg>
  );
}
