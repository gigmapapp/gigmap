import Link from 'next/link'
import Logo from '@/components/Logo'

export default function MapPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/"><Logo /></Link>
      </header>
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold mb-3">Map</h1>
        <p className="text-zinc-400 mb-6">Live gig map is coming soon.</p>
        <Link href="/hire" className="text-orange-400 hover:underline">
          Hire a musician instead
        </Link>
      </main>
    </div>
  )
}
