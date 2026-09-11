'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { supabase } from '@/lib/supabaseClient'
import type { Booking, BookingStatus, Profile } from '@/lib/types'

export default function BookingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data, error: queryError } = await supabase
        .from('bookings')
        .select('*')
        .or(`requester_id.eq.${user.id},musician_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (queryError) {
        setError(queryError.message)
        setBookings([])
        setLoading(false)
        return
      }

      const rows = (data || []) as Booking[]
      setBookings(rows)

      const ids = [...new Set(rows.flatMap((row) => [row.requester_id, row.musician_id]))]
      if (ids.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, display_name, bio, genres, is_musician, artist_category')
          .in('id', ids)
        const map: Record<string, Profile> = {}
        for (const profile of profileRows || []) {
          map[profile.id] = profile
        }
        setProfiles(map)
      }

      setLoading(false)
    }
    load()
  }, [router])

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdatingId(bookingId)
    setError('')
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setBookings((current) =>
        current.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking))
      )
    }
    setUpdatingId(null)
  }

  const incoming = bookings.filter((booking) => booking.musician_id === userId)
  const outgoing = bookings.filter((booking) => booking.requester_id === userId)

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
          <Link href="/bookings" className="px-3 py-2 rounded-lg bg-zinc-800 text-orange-400">Bookings</Link>
          <Link href="/profile" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Profile</Link>
        </nav>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Bookings</h1>
          <Link href="/hire" className="text-sm text-orange-400 hover:underline">
            Hire an artist
          </Link>
        </div>

        {error && <p className="text-orange-400 text-sm mb-4">{error}</p>}

        {bookings.length === 0 && <p className="text-zinc-400">No booking requests yet.</p>}

        {incoming.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Incoming requests</h2>
            <div className="space-y-4">
              {incoming.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  counterpart={profiles[booking.requester_id]}
                  counterpartLabel="From"
                  canRespond={booking.status === 'pending'}
                  updating={updatingId === booking.id}
                  onAccept={() => updateStatus(booking.id, 'accepted')}
                  onDecline={() => updateStatus(booking.id, 'declined')}
                />
              ))}
            </div>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Your requests</h2>
            <div className="space-y-4">
              {outgoing.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  counterpart={profiles[booking.musician_id]}
                  counterpartLabel="To"
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function statusClass(status: string) {
  if (status === 'accepted') return 'text-emerald-400'
  if (status === 'declined') return 'text-red-400'
  return 'text-orange-400'
}

function BookingCard({
  booking,
  counterpart,
  counterpartLabel,
  canRespond,
  updating,
  onAccept,
  onDecline,
}: {
  booking: Booking
  counterpart?: Profile
  counterpartLabel: string
  canRespond?: boolean
  updating?: boolean
  onAccept?: () => void
  onDecline?: () => void
}) {
  return (
    <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
      <p className={`${statusClass(booking.status)} text-sm capitalize`}>{booking.status}</p>
      <p className="font-semibold">{booking.event_type || 'Private event'}</p>
      {counterpart && (
        <p className="text-sm text-zinc-300 mt-0.5">
          {counterpartLabel} {counterpart.display_name || 'GigMap user'}
        </p>
      )}
      <p className="text-zinc-400">{booking.event_date} • {booking.location}</p>
      {booking.message && <p className="text-sm mt-2">{booking.message}</p>}
      {booking.budget && <p className="text-sm text-zinc-500 mt-1">Budget: {booking.budget}</p>}
      {canRespond && onAccept && onDecline && (
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            disabled={updating}
            onClick={onAccept}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Accept'}
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={onDecline}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  )
}
