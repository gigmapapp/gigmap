import { safeHttpUrl } from "@/lib/http-url";
import type { GigSourceKind } from "@/lib/types";

export default function GigSource({
  sourceUrl,
  sourceKind,
  className = "",
}: {
  sourceUrl: string | null;
  sourceKind: GigSourceKind | null;
  className?: string;
}) {
  const href = safeHttpUrl(sourceUrl);
  if (!href) return null;

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label="Source (opens in a new tab)"
        className="inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm font-medium text-accent hover:underline md:min-h-0"
      >
        Source
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
        >
          <path
            d="M6 3.5H3.5v9h9V10M8.5 3.5H12.5V7.5M12.5 3.5 7 9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
      {sourceKind === "public_info" ? (
        <span className="text-xs text-zinc-500">Listed from public info</span>
      ) : null}
    </div>
  );
}
