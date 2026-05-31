# 🚀 StockSim Backend API Service

This microservice acts as the central engine for StockSim, driving user accounts, paper trading execution, live order pollers, real-time Socket.io broadcasts, and custom target alerts.

---

## 🛠️ Technology Stack
- **Runtime**: Node.js v20
- **Framework**: Express.js
- **Database Engine**: Mongoose ODM + MongoDB Atlas Cloud Database
- **Real-Time Communication**: Socket.io
- **Mailing Engine**: Nodemailer (integrated with Brevo SMTP relay)

---

## 📂 Backend File Structure

```text
backend/
├── src/
│   ├── app.js               # Express application initialization
│   ├── index.js             # Server bootstrapper, CORS, proxy settings, and routes
│   ├── config/              # Redis and Database pool connection configs
│   ├── controllers/         # Business logic handlers (Auth, Trades, Leaderboards)
│   ├── middleware/          # JWT protection, request limiters, and error bounds
│   ├── models/              # Mongoose DB schema definitions
│   ├── routes/              # Express API endpoints
│   ├── services/            # Core systems (Trade execution, Brevo Mailer)
│   ├── socket/              # Socket.io connection handlers and price updates
│   └── utils/               # Native cookie handlers, logger helpers
└── package.json             # Core system dependencies
```

---

## 💾 Core Mongoose Schemas

### 1. User Schema (`User.js`)
```javascript
{
  username:         { type: String, required: true, unique: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  walletBalance:    { type: Number, default: 100000 },
  avatar:           { type: String, default: null },
  bio:              { type: String, default: '' },
  isPublic:         { type: Boolean, default: true },
  theme:            { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  watchlist:        [{ type: String }],
  followers:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
  totalPnL:         { type: Number, default: 0 },
  totalPnLPercent:  { type: Number, default: 0 },
  portfolioValue:   { type: Number, default: 0 }
}
```

### 2. Trade Schema (`Trade.js`)
```javascript
{
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  symbol:        { type: String, required: true },
  type:          { type: String, enum: ['buy', 'sell'], required: true },
  qty:           { type: Number, required: true },
  priceAtTrade:  { type: Number, required: true },
  totalValue:    { type: Number, required: true },
  pnl:           { type: Number, default: null }
}
```

### 3. Alert Schema (`Alert.js`)
```javascript
{
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  symbol:       { type: String, required: true },
  condition:    { type: String, enum: ['ABOVE', 'BELOW'], required: true },
  targetPrice:  { type: Number, required: true },
  status:       { type: String, enum: ['ACTIVE', 'TRIGGERED'], default: 'ACTIVE' },
  notifyEmail:  { type: Boolean, default: false }
}
```

---

## 🚀 Running Locally & Commands

To launch the backend API:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Setup**:
   Create a `.env` file based on `.env.example` with your keys.
3. **Scripts**:
   - Run in Development (with hot-reloading via Nodemon):
     ```bash
     npm run dev
     ```
   - Start in Production:
     ```bash
     npm start
     ```
   - Seed database with mock trading stocks:
     ```bash
     npm run seed
     ```

---

## ⚡ Real-Time Systems & Background Jobs
- **Live Price Broadcasts**: Integrates with Socket.io to stream real-time price updates for active stocks to the frontend client.
- **Price Poller & Alert Checker**: Background Cron jobs monitor stock price thresholds every 2 minutes. If a price ticks past a user's alert target, an email notification is automatically dispatched via the **Nodemailer/Brevo** SMTP service.
