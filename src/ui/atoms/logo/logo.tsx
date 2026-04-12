import { cn } from "@/lib/utils";

const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;

export type LogoProps = {
  className?: string;
  /** Tailwind size utility; default matches medium marketing lockup */
  size?: "sm" | "md" | "lg";
  alt?: string;
};

const sizeClass = {
  sm: "size-8",
  md: "size-16",
  lg: "size-24",
} as const;

export function Logo({
  className,
  size = "md",
  alt = "AquilaGraph",
}: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt={alt}
      className={cn(sizeClass[size], "shrink-0 object-contain", className)}
    />
  );
}
