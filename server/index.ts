import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './db.js'
import productsRouter from './routes/products.js'
import checkoutRouter from './routes/checkout.js'
import webhookRouter from './routes/webhook.js'
import ordersRouter from './routes/orders.js'
import attendeesRouter from './routes/attendees.js'
import tablesRouter from './routes/tables.js'
import reportsRouter from './routes/reports.js'

config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3851

// Webhook route needs raw body for Stripe signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }))

// Other routes use JSON
app.use(express.json())
app.use(cors())

// Initialize database
initDb()

// API routes
app.use('/api/products', productsRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/webhook', webhookRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/attendees', attendeesRouter)
app.use('/api/tables', tablesRouter)
app.use('/api/reports', reportsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// In production, serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`YCKC Gala server running on http://localhost:${PORT}`)
})
