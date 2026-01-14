import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, type Product, type ProductsResponse } from '../lib/api'
import { useCart, formatCents } from '../lib/cart'
import TicketCard from '../components/TicketCard'
import RaffleUpsell from '../components/RaffleUpsell'
import CartSummary from '../components/CartSummary'

export default function Home() {
  const [products, setProducts] = useState<ProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { itemCount } = useCart()

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yckc-primary/5 to-white">
      {/* Header */}
      <header className="bg-yckc-primary text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">YCKC Gala 2025</h1>
          <p className="text-xl text-white/80">April 9, 2025</p>
          <p className="mt-4 text-lg">Join us for an evening of music, celebration, and community</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Tickets Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-yckc-primary mb-6">Tickets</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {products?.ticket.map(product => (
              <TicketCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Sponsorship Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-yckc-primary mb-2">Sponsorship Packages</h2>
          <p className="text-gray-600 mb-6">Support YCKC and receive special recognition</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.sponsorship.map(product => (
              <TicketCard key={product.id} product={product} featured={product.price_cents >= 150000} />
            ))}
          </div>
        </section>

        {/* Raffle Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-yckc-primary mb-2">Golden Raffle</h2>
          <p className="text-gray-600 mb-6">Purchase raffle tickets for a chance to win amazing prizes!</p>
          <RaffleUpsell products={products?.raffle || []} />
        </section>
      </main>

      {/* Floating Cart */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <CartSummary />
            <Link to="/checkout" className="btn-primary">
              Continue to Checkout
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-100 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          <p>Youth Chorus of Kansas City</p>
          <p className="text-sm mt-2">Questions? Contact us at ryan@youthchoruskc.org</p>
        </div>
      </footer>
    </div>
  )
}
