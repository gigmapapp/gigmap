'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [genres, setGenres] = useState('')
  const [isMusician, setIsMusician] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name || '')
        setBio(data.bio || '')
        setGenres(data.genres || '')
        setIsMusician(!!data.is_musician)
      }
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
      is_musician: isMusician,
    }
    const { error } = await supabase.from('profiles').upsert(payload)
    setMessage(error ? error.message : 'Profile saved!')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="text-sm text-zinc-400">Home</Link>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10 space-y-4">
        <h1 className="text-2xl font-bold">Your profile</h1>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isMusician} onChange={(e) => setIsMusician(e.target.checked)} />
          I am a musician
        </label>

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name / band name"
          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700"
        />
        <input
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
          placeholder="Genres (rock, jazz, folk...)"
          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio"
          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 min-h-28"
        />

        {message && <p className="text-orange-400 text-sm">{message}</p>}

        <button onClick={save} className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium">
          Save profile
        </button>

        {isMusician && (
          <Link href="/gigs/new" className="block text-center py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700">
            Add a gig
          </Link>
        )}
      </main>
    </div>
  )
}