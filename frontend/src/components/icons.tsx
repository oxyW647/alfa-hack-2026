import type { ReactNode, SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children" | "stroke"> {
  size?: number;
  stroke?: number;
}

function Icon({ size = 18, stroke = 2.4, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (p: IconProps) => (
  <Icon stroke={3.2} {...p}>
    <path d="M5 12l5 5L20 7" />
  </Icon>
);
export const CrossIcon = (p: IconProps) => (
  <Icon stroke={3.2} {...p}>
    <path d="M7 7l10 10M17 7L7 17" />
  </Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon stroke={2.6} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Icon stroke={2.6} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const ArrowLeftIcon = (p: IconProps) => (
  <Icon stroke={2.6} {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);
export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 15l-6-6-6 6" />
  </Icon>
);
export const PlayIcon = ({ size = 14, stroke: _stroke, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M7 4.5v15l12-7.5z" />
  </svg>
);
export const RepeatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </Icon>
);
export const SpinnerIcon = ({ className = "", ...rest }: IconProps) => (
  <Icon stroke={3} className={`animate-spin ${className}`} {...rest}>
    <path d="M21 12a9 9 0 1 1-9-9" />
  </Icon>
);
export const LockIcon = (p: IconProps) => (
  <Icon stroke={2.6} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);
export const EditIcon = (p: IconProps) => (
  <Icon stroke={2} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </Icon>
);
export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
  </Icon>
);
export const DocIcon = (p: IconProps) => (
  <Icon stroke={2} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Icon>
);
export const DocPlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M12 11v6M9 14h6" />
  </Icon>
);
export const ClipboardIcon = (p: IconProps) => (
  <Icon stroke={2.2} {...p}>
    <rect x="8" y="3" width="8" height="4" rx="1" />
    <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
  </Icon>
);
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.5" />
  </Icon>
);
export const TrendIcon = (p: IconProps) => (
  <Icon stroke={2.6} {...p}>
    <path d="M4 17l6-6 4 4 6-8" />
  </Icon>
);
export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icon>
);
export const BanIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M6 6l12 12" />
  </Icon>
);
export const CupIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
    <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
    <path d="M8 3v3M12 3v3" />
  </Icon>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
  </Icon>
);
