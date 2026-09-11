'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import CategoryBadge from '@/components/CategoryBadge'
import { ARTIST_CATEGORY_OPTIONS } from '@/lib/artists'
import { supabase } from '@/lib/supabaseClient'
import { isArtistCategory, type ArtistCategory, type Profile } from '@/lib/types'

type CategoryFilter = 'all' | ArtistCategory

export default function HirePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [artists, setArtists] = useState<Profile[]>([])
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('id, display_name, bio, genres, is_musician, artist_category')
          .not('artist_category', 'is', null)
          .order('display_name', { ascending: true })

        if (queryError) {
          setError(queryError.message)
          setArtists([])
        } else {
          const hireable = (data || []).filter((row) => isArtistCategory(row.artist_category))
          setArtists(hireable)
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load artists')
      }
      setLoading(false)
    }
    load()
  }, [router])

  const visible = useMemo(() => {
    if (filter === 'all') return artists
    return artists.filter((artist) => artist.artist_category === filter)
  }, [artists, filter])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/hire" className="px-3 py-2 rounded-lg bg-zinc-800 text-orange-400">Hire</Link>
          <Link href="/bookings" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Bookings</Link>
          <Link href="/profile" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Profile</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Hire musicians &amp; DJs</h1>
        <p className="text-zinc-400 mb-8">
          Browse Solo acts, Bands, and DJs, then send a booking request.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterChip>
          {ARTIST_CATEGORY_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              active={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>

        {error && <p className="text-orange-400 text-sm mb-4">{error}</p>}

        {visible.length === 0 && (
          <p className="text-zinc-400">
            No {filter === 'all' ? '' : `${ARTIST_CATEGORY_OPTIONS.find((o) => o.value === filter)?.label} `}
            artists yet. Musicians can set a category on their{' '}
            <Link href="/profile" className="text-orange-400 hover:underline">profile</Link>.
          </p>
        )}

        <div className="space-y-4">
          {visible.map((artist) => {
            const isSelf = artist.id === userId
            return (
              <div key={artist.id} className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold">
                        {artist.display_name || 'Unnamed artist'}
                      </h2>
                      <CategoryBadge category={artist.artist_category} />
                    </div>
                    {artist.genres && <p className="text-zinc-400 text-sm">{artist.genres}</p>}
                    {artist.bio && <p className="text-sm mt-2 text-zinc-300">{artist.bio}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  {isSelf ? (
                    <Link
                      href="/profile"
                      className="inline-block px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
                    >
                      That&apos;s you — edit profile
                    </Link>
                  ) : (
                    <Link
                      href={`/book/${artist.id}`}
                      className="inline-block px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium"
                    >
                      Request booking
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium ${
        active ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}
