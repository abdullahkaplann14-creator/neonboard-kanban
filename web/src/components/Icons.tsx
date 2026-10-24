import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconSearch = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
  </Svg>
);

export const IconX = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconPlus = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconTrash = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5" />
  </Svg>
);

export const IconPencil = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);

export const IconCalendar = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Svg>
);

export const IconClock = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconTag = (props: IconProps) => (
  <Svg {...props}>
    <path d="m3.5 12.5 8-8H20v8.5l-8 8a1.4 1.4 0 0 1-2 0l-6.5-6.5a1.4 1.4 0 0 1 0-2Z" />
    <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconAlert = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4 2.8 20h18.4L12 4Z" />
    <path d="M12 9.5v4.5M12 17.2v.3" />
  </Svg>
);

export const IconRefresh = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20 11a8 8 0 1 0-2.4 6.3" />
    <path d="M20 4v7h-7" />
  </Svg>
);

export const IconCheck = (props: IconProps) => (
  <Svg {...props}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconInfo = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.3" />
  </Svg>
);

export const IconWifiOff = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3 3l18 18" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0" />
    <path d="M5 13a10 10 0 0 1 4-2.4M19 13a10 10 0 0 0-3-2.1M2 9a15 15 0 0 1 5-3.2M22 9a15 15 0 0 0-6-3.5" />
    <path d="M12 20h.01" />
  </Svg>
);

export const IconGrip = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconLayers = (props: IconProps) => (
  <Svg {...props}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);
