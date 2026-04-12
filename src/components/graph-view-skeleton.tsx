import { useLingui } from "@lingui/react/macro";

export function GraphViewSkeleton() {
  const { t } = useLingui();
  return (
    <output
      className="flex h-full min-h-[280px] w-full items-center justify-center bg-background p-6"
      aria-live="polite"
    >
      <svg
        className="h-full max-h-[min(72vh,560px)] w-full max-w-4xl text-muted-foreground/35 animate-pulse"
        viewBox="0 0 440 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t`Построение графа, ожидание`}
      >
        <title>{t`Построение графа`}</title>
        <path
          d="M72 88 L188 142 L188 210 M188 142 L320 96 M188 210 L312 218 M96 200 L188 210"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
        <rect
          x="32"
          y="64"
          width="72"
          height="40"
          rx="8"
          fill="currentColor"
          opacity="0.22"
        />
        <rect
          x="152"
          y="118"
          width="88"
          height="44"
          rx="8"
          fill="currentColor"
          opacity="0.28"
        />
        <rect
          x="152"
          y="196"
          width="76"
          height="36"
          rx="8"
          fill="currentColor"
          opacity="0.2"
        />
        <rect
          x="300"
          y="72"
          width="96"
          height="42"
          rx="8"
          fill="currentColor"
          opacity="0.24"
        />
        <rect
          x="288"
          y="196"
          width="84"
          height="40"
          rx="8"
          fill="currentColor"
          opacity="0.18"
        />
        <rect
          x="48"
          y="176"
          width="56"
          height="32"
          rx="6"
          fill="currentColor"
          opacity="0.15"
        />
      </svg>
    </output>
  );
}
