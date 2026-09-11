'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { ARTIST_CATEGORY_OPTIONS } from '@/lib/artists'
import { isArtistCategory, type ArtistCategory } from '@/lib/types'

const inputClass =
  'w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-orange-500'

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [genres, setGenres] = useState('')
  const [artistCategory, setArtistCategory] = useState<ArtistCategory | ''>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUser(user)

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setDisplayName(data.display_name || '')
          setBio(data.bio || '')
          setGenres(data.genres || '')
          setArtistCategory(isArtistCategory(data.artist_category) ? data.artist_category : '')
        }
      } catch {
        // Stay on the form if the profile row does not exist yet.
      }
      setLoading(false)
    }
    load()
  }, [router])

  const save = async () => {
    if (!user) return
    const payload = {
      id: user.id,
      display_name: displayName,
      bio,
      genres,
      artist_category: artistCategory || null,
      is_musician: Boolean(artistCategory),
    }
    const { error } = await supabase.from('profiles').upsert(payload)
    setMessage(error ? error.message : artistCategory
      ? 'Profile saved — you are listed for hire.'
      : 'Profile saved!')
  }

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
          <Link href="/hire" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Hire</Link>
          <Link href="/bookings" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Bookings</Link>
          <Link href="/" className="text-sm text-zinc-400">Home</Link>
        </nav>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10 space-y-4">
        <h1 className="text-2xl font-bold">Your profile</h1>

        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            Artist category — pick one to appear on the hire page
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setArtistCategory('')}
              className={`px-3 py-2 rounded-lg text-sm ${
                artistCategory === ''
                  ? 'bg-zinc-700 border border-zinc-500'
                  : 'bg-zinc-800 border border-zinc-800 hover:bg-zinc-700'
              }`}
            >
              Not for hire
            </button>
            {ARTIST_CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setArtistCategory(option.value)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  artistCategory === option.value
                    ? 'bg-orange-500 border border-orange-400'
                    : 'bg-zinc-800 border border-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {artistCategory && (
            <p className="text-xs text-zinc-500">
              {ARTIST_CATEGORY_OPTIONS.find((option) => option.value === artistCategory)?.description}
            </p>
          )}
        </div>

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name / band name"
          className={inputClass}
        />
        <input
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
          placeholder="Genres (rock, jazz, folk...)"
          className={inputClass}
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio"
          className={`${inputClass} min-h-28`}
        />

        {message && <p className="text-orange-400 text-sm">{message}</p>}

        <button onClick={save} className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium">
          Save profile
        </button>

        {artistCategory && (
          <Link href="/hire" className="block text-center py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700">
            See hire listings
          </Link>
        )}
      </main>
    </div>
  )
}
