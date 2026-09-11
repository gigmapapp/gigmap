'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <Link href="/map" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Map</Link>
          <Link href="/hire" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Hire</Link>
          {user && <Link href="/profile" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Profile</Link>}
          {user && <Link href="/bookings" className="px-3 py-2 rounded-lg hover:bg-zinc-800">Bookings</Link>}
          {user ? (
            <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
              Log out
            </button>
          ) : (
            <Link href="/login" className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600">
              Log in
            </Link>
          )}
        </div>
      </header>

      <main className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Find live music near you</h1>
        <p className="text-zinc-400 text-lg mb-10">
          Discover local gigs, follow musicians, and book artists for private events.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/map" className="px-8 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium">
            See gigs on the map
          </Link>
          <Link
            href={user ? '/hire' : '/login'}
            className="px-8 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-medium"
          >
            Hire a musician
          </Link>
          {user && (
            <Link href="/gigs/new" className="px-8 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-medium">
              Add a gig
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}