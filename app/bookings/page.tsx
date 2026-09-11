'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .or(`requester_id.eq.${user.id},musician_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      setBookings(data || [])
    }
    load()
  }, [router])

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/"><Logo /></Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-6">Bookings</h1>
        {bookings.length === 0 && <p className="text-zinc-400">No booking requests yet.</p>}
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-orange-400 text-sm capitalize">{b.status}</p>
              <p className="font-semibold">{b.event_type || 'Private event'}</p>
              <p className="text-zinc-400">{b.event_date} • {b.location}</p>
              <p className="text-sm mt-2">{b.message}</p>
              {b.budget && <p className="text-sm text-zinc-500 mt-1">Budget: {b.budget}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}