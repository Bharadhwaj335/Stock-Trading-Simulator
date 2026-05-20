const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const PriceHistory = require('../models/PriceHistory');

const subDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

dotenv.config();

const STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 182.52, marketCap: 2.82e12 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', price: 415.32, marketCap: 3.08e12 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', price: 175.98, marketCap: 2.17e12 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', price: 198.11, marketCap: 2.07e12 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', price: 875.39, marketCap: 2.16e12 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', price: 177.58, marketCap: 5.65e11 },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', price: 527.17, marketCap: 1.35e12 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance', price: 198.47, marketCap: 5.72e11 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', price: 152.84, marketCap: 3.68e11 },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Finance', price: 279.34, marketCap: 5.74e11 },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', price: 67.89, marketCap: 5.46e11 },
  { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer', price: 164.21, marketCap: 3.87e11 },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', price: 112.45, marketCap: 4.48e11 },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment', price: 638.29, marketCap: 2.77e11 },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Entertainment', price: 111.72, marketCap: 2.04e11 },
  { symbol: 'BA', name: 'Boeing Company', sector: 'Aerospace', price: 192.34, marketCap: 1.17e11 },
  { symbol: 'GS', name: 'Goldman Sachs Group', sector: 'Finance', price: 483.26, marketCap: 1.56e11 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', price: 163.28, marketCap: 2.64e11 },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', sector: 'Technology', price: 77.43, marketCap: 1.62e11 },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', sector: 'Finance', price: 62.18, marketCap: 6.61e10 },
];

const generateHistory = (basePrice, days = 90) => {
  const history = [];
  let price = basePrice * 0.85;
  const from = subDays(new Date(), days);

  for (let i = 0; i <= days; i++) {
    const drift = (Math.random() - 0.48) * 0.025;
    const open = parseFloat(price.toFixed(2));
    const close = parseFloat((price * (1 + drift)).toFixed(2));
    const high = parseFloat((Math.max(open, close) * (1 + Math.random() * 0.01)).toFixed(2));
    const low = parseFloat((Math.min(open, close) * (1 - Math.random() * 0.01)).toFixed(2));
    const volume = Math.floor(1e6 + Math.random() * 5e7);
    history.push({ symbol: '', open, high, low, close, volume, date: addDays(from, i) });
    price = close;
  }
  return history;
};

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Stock.deleteMany({});
  await PriceHistory.deleteMany({});

  for (const s of STOCKS) {
    await Stock.create({
      ...s,
      currentPrice: s.price,
      previousClose: parseFloat((s.price * 0.99).toFixed(2)),
      change: parseFloat((s.price * 0.01).toFixed(2)),
      changePercent: 1.0,
      volume: Math.floor(1e7 + Math.random() * 5e7),
      high52w: parseFloat((s.price * 1.35).toFixed(2)),
      low52w: parseFloat((s.price * 0.65).toFixed(2)),
    });

    const history = generateHistory(s.price).map(h => ({ ...h, symbol: s.symbol }));
    await PriceHistory.insertMany(history);
    console.log(`✓ Seeded ${s.symbol}`);
  }

  console.log('Seed complete!');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
