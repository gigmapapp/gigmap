import type { ArtistCategory } from '@/lib/types'

export const ARTIST_CATEGORY_OPTIONS: {
  value: ArtistCategory
  label: string
  description: string
}[] = [
  { value: 'solo', label: 'Solo', description: 'Singer, guitarist, or solo act' },
  { value: 'band', label: 'Band', description: 'Group or ensemble' },
  { value: 'dj', label: 'DJ', description: 'DJ / electronic set' },
]

export function categoryLabel(category: string | null | undefined): string {
  const match = ARTIST_CATEGORY_OPTIONS.find((option) => option.value === category)
  return match?.label ?? 'Artist'
}

export const EVENT_TYPE_OPTIONS = [
  'Private party',
  'Birthday',
  'Wedding',
  'Corporate event',
  'Club / venue',
  'Other',
] as const
