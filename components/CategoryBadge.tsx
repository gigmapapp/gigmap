import { categoryLabel } from '@/lib/artists'

export default function CategoryBadge({ category }: { category: string | null | undefined }) {
  if (!category) return null
  return (
    <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-medium capitalize text-orange-400">
      {categoryLabel(category)}
    </span>
  )
}
