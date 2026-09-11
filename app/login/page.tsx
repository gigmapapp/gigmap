'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage(error.message)
    } else if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        display_name: email.split('@')[0],
        is_musician: false,
        artist_category: null,
      })
      setMessage('Check your email for the confirmation link!')
    }
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else router.push('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex justify-center mb-2">
          <Logo size={36} textSize="text-3xl" />
        </div>
        <p className="text-zinc-400 text-center mb-8">Find live music near you</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-orange-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-orange-500"
          />
          {message && <p className="text-sm text-center text-orange-400">{message}</p>}
          <button onClick={handleSignIn} disabled={loading} className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium disabled:opacity-50">
            {loading ? 'Loading...' : 'Log In'}
          </button>
          <button onClick={handleSignUp} disabled={loading} className="w-full py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 font-medium disabled:opacity-50">
            {loading ? 'Loading...' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}