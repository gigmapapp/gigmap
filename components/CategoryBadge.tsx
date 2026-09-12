import { categoryLabel } from "@/lib/format";
import type { Category } from "@/lib/types";

const STYLES: Record<Category, string> = {
  solo: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  band: "bg-zinc-100/10 text-zinc-100 ring-zinc-100/20",
  dj: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
};

export default function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ${STYLES[category]}`}
    >
      {categoryLabel(category)}
    </span>
  );
}
