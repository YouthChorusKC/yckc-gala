import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, type Product, type ProductsResponse } from '../lib/api'
import { useCart, formatCents } from '../lib/cart'
import TicketCard from '../components/TicketCard'
import RaffleModal from '../components/RaffleModal'
import CartSummary from '../components/CartSummary'

// Generate random stars for background
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 3,
    duration: Math.random() * 2 + 2,
  }))
}

const stars = generateStars(50)

export default function Home() {
  const [products, setProducts] = useState<ProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRaffleModal, setShowRaffleModal] = useState(false)
  const { itemCount, items } = useCart()

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Check if cart has tickets (for raffle upsell)
  const hasTicketsInCart = items.some(item =>
    item.product.category === 'ticket' || item.product.category === 'sponsorship'
  )

  if (loading) {
    return (
      <div className="min-h-screen gala-bg flex items-center justify-center">
        <div className="text-gala-gold">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen gala-bg flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - Navy with stars */}
      <header className="gala-bg text-white relative overflow-hidden">
        {/* Animated stars */}
        {stars.map(star => (
          <div
            key={star.id}
            className="star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}

        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          {/* Starburst graphic */}
          <div className="flex justify-center mb-6">
            <img
              src="/starburst.png"
              alt=""
              className="w-40 h-40 md:w-52 md:h-52 object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="gala-title text-4xl md:text-6xl lg:text-7xl gold-text mb-4">
            A Sky Full of Stars
          </h1>

          {/* Subtitle */}
          <p className="elegant-text text-xl md:text-2xl text-gala-gold/90 uppercase tracking-[0.2em] mb-2">
            Youth Chorus of Kansas City
          </p>
          <p className="elegant-text text-lg text-white/70 uppercase tracking-[0.15em] mb-8">
            Gala 2026
          </p>

          {/* Event details */}
          <div className="inline-block bg-gala-gold text-gala-navy px-8 py-3 rounded-full font-semibold text-lg mb-4">
            Thursday, April 9, 2026 • 6:30–8:30pm
          </div>

          <p className="text-white/70 text-base mb-8">
            The Abbott • 1901 Cherry St, Kansas City
          </p>

          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-10">
            Join us for an elegant evening of music, celebration, and community as we support
            the next generation of young singers.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#tickets" className="btn-gold text-lg px-8 py-3 inline-block">
              Get Your Tickets
            </a>
            <a href="#sponsorships" className="btn-gold-outline text-lg px-8 py-3 inline-block">
              Sponsorships
            </a>
            <a href="#raffle" className="btn-gold-outline text-lg px-8 py-3 inline-block">
              Golden Raffle
            </a>
          </div>
        </div>

        {/* Gradient fade to white */}
        <div className="h-24 bg-gradient-to-b from-transparent to-gala-cream" />
      </header>

      {/* Main Content - Cream background */}
      <main className="bg-gala-cream">
        <div className="max-w-6xl mx-auto px-4 py-12">

          {/* About Section */}
          <section className="mb-16">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gala-navy mb-6">About the Event</h2>
              <p className="text-gray-700 text-lg mb-4">
                The Youth Chorus of Kansas City's annual gala is our premier fundraising event,
                bringing together supporters, families, and community members for an unforgettable
                evening of celebration.
              </p>
              <p className="text-gray-700 text-lg">
                Your support helps provide music education and performance opportunities to young
                singers throughout the Kansas City area, regardless of their financial circumstances.
              </p>
            </div>
          </section>

          {/* Tickets Section */}
          <section id="tickets" className="mb-16 scroll-mt-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gala-navy mb-2">Tickets</h2>
              <p className="text-gray-600 elegant-text text-lg">Secure your seats for this special evening</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {products?.ticket.map(product => (
                <TicketCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* Sponsorship Section */}
          <section id="sponsorships" className="mb-16 scroll-mt-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gala-navy mb-2">Sponsorship Packages</h2>
              <p className="text-gray-600 elegant-text text-lg">Support YCKC and receive special recognition</p>
            </div>
            {/* Row 1: Platinum & Gold (centered) */}
            <div className="flex flex-col md:flex-row justify-center gap-6 mb-6">
              {products?.sponsorship
                .filter(p => p.price_cents >= 150000)
                .sort((a, b) => b.price_cents - a.price_cents)
                .map(product => (
                  <div key={product.id} className="w-full max-w-sm mx-auto md:mx-0">
                    <TicketCard product={product} featured />
                  </div>
                ))}
            </div>
            {/* Row 2: Silver, Bronze, Friends */}
            <div className="grid md:grid-cols-3 gap-6">
              {products?.sponsorship
                .filter(p => p.price_cents < 150000)
                .sort((a, b) => b.price_cents - a.price_cents)
                .map(product => (
                  <TicketCard key={product.id} product={product} />
                ))}
            </div>
          </section>

          {/* Golden Raffle Teaser */}
          <section id="raffle" className="mb-16 scroll-mt-8">
            <div
              onClick={() => setShowRaffleModal(true)}
              className="gala-bg rounded-2xl p-8 md:p-12 text-center relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-gala-gold/50 transition-all"
            >
              {/* Mini stars */}
              {stars.slice(0, 20).map(star => (
                <div
                  key={star.id}
                  className="star"
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    animationDelay: `${star.delay}s`,
                    animationDuration: `${star.duration}s`,
                  }}
                />
              ))}

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold gold-text mb-4">Golden Raffle</h2>
                <p className="text-white/80 text-lg mb-6 max-w-xl mx-auto">
                  Purchase raffle entries for a chance to win amazing prizes!
                  The more entries you have, the better your odds.
                </p>
                <div className="flex flex-wrap justify-center gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-gala-gold text-2xl font-bold">1 Entry</div>
                    <div className="text-white/60 text-sm">$25</div>
                  </div>
                  <div className="text-white/30">|</div>
                  <div className="text-center">
                    <div className="text-gala-gold text-2xl font-bold">5 Entries</div>
                    <div className="text-white/60 text-sm">$100</div>
                  </div>
                  <div className="text-white/30">|</div>
                  <div className="text-center">
                    <div className="text-gala-gold text-2xl font-bold">12 Entries</div>
                    <div className="text-white/60 text-sm">$200 <span className="text-green-400">(Best Value)</span></div>
                  </div>
                </div>
                <p className="text-gala-gold/80 text-sm">Click anywhere to add entries</p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Floating Cart */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <CartSummary />
            <div className="flex items-center gap-4">
              {hasTicketsInCart && !items.some(i => i.product.category === 'raffle') && (
                <button
                  onClick={() => setShowRaffleModal(true)}
                  className="text-gala-gold hover:text-gala-goldDark font-medium"
                >
                  + Add Raffle Entries
                </button>
              )}
              <Link to="/checkout" className="btn-gold">
                Continue to Checkout
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Raffle Modal */}
      {showRaffleModal && products?.raffle && (
        <RaffleModal
          products={products.raffle}
          onClose={() => setShowRaffleModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="gala-bg py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gala-gold font-semibold text-lg mb-2">Youth Chorus of Kansas City</p>
          <p className="text-white/60 text-sm">
            Questions? Contact us at{' '}
            <a href="mailto:ryan@youthchoruskc.org" className="text-gala-gold hover:underline">
              ryan@youthchoruskc.org
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
