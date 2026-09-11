export const ARTIST_CATEGORIES = ['solo', 'band', 'dj'] as const

export type ArtistCategory = (typeof ARTIST_CATEGORIES)[number]

export type BookingStatus = 'pending' | 'accepted' | 'declined'

export type Profile = {
  id: string
  display_name: string | null
  bio: string | null
  genres: string | null
  is_musician: boolean | null
  artist_category: ArtistCategory | null
}

export type Booking = {
  id: string
  requester_id: string
  musician_id: string
  status: BookingStatus | string
  event_type: string | null
  event_date: string | null
  location: string | null
  message: string | null
  budget: string | null
  created_at: string
}

export function isArtistCategory(value: string | null | undefined): value is ArtistCategory {
  return value === 'solo' || value === 'band' || value === 'dj'
}
