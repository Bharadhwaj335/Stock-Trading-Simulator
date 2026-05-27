const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Portfolio = require('../models/Portfolio');
const Trade = require('../models/Trade');

dotenv.config();

const MOCK_TRADERS = [
  { username: "suresh_kumar", name: "Suresh Kumar", email: "suresh.k@iit.edu.in", walletBalance: 120000, totalPnL: 24600, totalPnLPercent: 124.60, rank: 1, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80", badge: "Market Master" },
  { username: "sandboxoctocat", name: "Octocat Developer", email: "sandbox.octocat@gmail.com", walletBalance: 98000, totalPnL: 19800, totalPnLPercent: 98.15, rank: 2, avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80", badge: "Code Trader" },
  { username: "priya_sharma", name: "Priya Sharma", email: "priya.s@bits.edu.in", walletBalance: 86000, totalPnL: 15400, totalPnLPercent: 76.40, rank: 3, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80", badge: "Bull Run" },
  { username: "alex_merc", name: "Alex Mercer", email: "alex.m@stanford.edu", walletBalance: 75000, totalPnL: 11200, totalPnLPercent: 54.80, rank: 4, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80", badge: "Day Trader" },
  { username: "rahul_roy", name: "Rahul Roy", email: "rahul.roy@iim.ac.in", walletBalance: 65000, totalPnL: 8500, totalPnLPercent: 42.10, rank: 5, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&q=80", badge: "Hedge Fund" },
  { username: "googlescholar", name: "Google Scholar (Sandbox)", email: "sandbox.student@mit.edu", walletBalance: 58000, totalPnL: 6800, totalPnLPercent: 34.60, rank: 6, avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80", badge: "Alpha Seeker" },
  { username: "sarah_connor", name: "Sarah Connor", email: "sarah.c@outlook.com", walletBalance: 45000, totalPnL: 4200, totalPnLPercent: 21.05, rank: 7, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80", badge: "Risk Manager" },
  { username: "david_light", name: "David Light", email: "david.l@mit.edu", walletBalance: 38000, totalPnL: 2100, totalPnLPercent: 12.40, rank: 8, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80", badge: "Scalper" },
  { username: "emily_watson", name: "Emily Watson", email: "emily@gmail.com", walletBalance: 32000, totalPnL: 800, totalPnLPercent: 4.80, rank: 9, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80", badge: "Value Investor" },
  { username: "trader_joe", name: "Trader Joe", email: "joe@yahoo.com", walletBalance: 28000, totalPnL: -1200, totalPnLPercent: -4.10, rank: 10, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&q=80", badge: "Novice" }
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for User Seeding...');

    // Clear old seeded mock users
    const mockEmails = MOCK_TRADERS.map(t => t.email);
    await User.deleteMany({ email: { $in: mockEmails } });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("sandbox_pass_1234", salt);

    for (const t of MOCK_TRADERS) {
      // 1. Create User
      const user = await User.create({
        username: t.username,
        email: t.email,
        name: t.name,
        avatar: t.avatar,
        password: hashedPassword,
        walletBalance: t.walletBalance,
        totalPnL: t.totalPnL,
        totalPnLPercent: t.totalPnLPercent,
        rank: t.rank,
        isPublic: true,
        badges: [t.badge]
      });

      // 2. Create Wallet
      await Wallet.create({
        userId: user._id,
        balance: t.walletBalance
      });

      // 3. Create Portfolio with simulated holdings
      const holdings = [
        { symbol: "NVDA", avgBuyPrice: 800.00, qty: 10, totalInvested: 8000.00 },
        { symbol: "AAPL", avgBuyPrice: 170.00, qty: 25, totalInvested: 4250.00 }
      ];

      await Portfolio.create({
        userId: user._id,
        holdings
      });

      // 4. Create mock trade records for social feed
      await Trade.create({
        userId: user._id,
        symbol: "NVDA",
        type: "buy",
        qty: 10,
        priceAtTrade: 800.00,
        totalValue: 8000.00,
        pnl: 753.90
      });

      console.log(`✓ Seeded mock trader: @${t.username}`);
    }

    console.log('Mock User Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('User seeding failed:', err.message);
    process.exit(1);
  }
};

seedUsers();
