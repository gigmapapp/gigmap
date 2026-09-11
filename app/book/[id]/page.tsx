'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import CategoryBadge from '@/components/CategoryBadge'
import { EVENT_TYPE_OPTIONS } from '@/lib/artists'
import { supabase } from '@/lib/supabaseClient'
import { isArtistCategory, type Profile } from '@/lib/types'

const inputClass =
  'w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-orange-500'

export default function BookPage({ params }: PageProps<'/book/[id]'>) {
  const { id: musicianId } = use(params)
  const [userId, setUserId] = useState<string | null>(null)
  const [artist, setArtist] = useState<Profile | null>(null)
  const [eventType, setEventType] = useState('Private party')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, bio, genres, is_musician, artist_category')
          .eq('id', musicianId)
          .maybeSingle()

        if (error) {
          setStatus(error.message)
        } else {
          setArtist(data)
        }
      } catch (loadError) {
        setStatus(loadError instanceof Error ? loadError.message : 'Could not load artist')
      }
      setLoading(false)
    }
    load()
  }, [musicianId, router])

  const hireable = artist && isArtistCategory(artist.artist_category)
  const isSelf = Boolean(userId && userId === musicianId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !hireable || isSelf) return
    if (!eventType.trim() || !eventDate || !location.trim()) {
      setStatus('Event type, date, and location are required.')
      return
    }

    setSubmitting(true)
    setStatus('')
    const { error } = await supabase.from('bookings').insert({
      requester_id: userId,
      musician_id: musicianId,
      status: 'pending',
      event_type: eventType.trim(),
      event_date: eventDate,
      location: location.trim(),
      message: message.trim() || null,
      budget: budget.trim() || null,
    })

    if (error) {
      setStatus(error.message)
      setSubmitting(false)
      return
    }

    router.push('/bookings')
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
        </nav>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10 space-y-6">
        <Link href="/hire" className="text-sm text-zinc-400 hover:text-white">
          ← Back to artists
        </Link>

        {!artist || !hireable ? (
          <div>
            <h1 className="text-2xl font-bold mb-2">Artist not available</h1>
            <p className="text-zinc-400">
              This profile is not set up for hire. Browse other artists on the{' '}
              <Link href="/hire" className="text-orange-400 hover:underline">hire page</Link>.
            </p>
            {status && <p className="text-orange-400 text-sm mt-3">{status}</p>}
          </div>
        ) : (
          <>
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{artist.display_name || 'Unnamed artist'}</h1>
                <CategoryBadge category={artist.artist_category} />
              </div>
              {artist.genres && <p className="text-zinc-400">{artist.genres}</p>}
              {artist.bio && <p className="text-sm mt-3 text-zinc-300">{artist.bio}</p>}
            </div>

            {isSelf ? (
              <p className="text-zinc-400">
                You can&apos;t book yourself.{' '}
                <Link href="/profile" className="text-orange-400 hover:underline">Edit your profile</Link>
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h2 className="text-xl font-semibold">Request a booking</h2>

                <label className="block space-y-1">
                  <span className="text-sm text-zinc-400">Event type</span>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className={inputClass}
                  >
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-sm text-zinc-400">Event date</span>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm text-zinc-400">Location</span>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, venue, or address"
                      className={inputClass}
                      required
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-sm text-zinc-400">Message</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell them about the event"
                    className={`${inputClass} min-h-28`}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-zinc-400">Budget (optional)</span>
                  <input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. $500"
                    className={inputClass}
                  />
                </label>

                {status && <p className="text-orange-400 text-sm">{status}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send request'}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}
