const analyticsService = require('../services/analyticsService');

const getAnalytics = async (req, res, next) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) || req.query.userId || req.params.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

    const [summary, pnlByMonth, sectorExposure, equityCurve, topSymbols] = await Promise.all([
      analyticsService.getSummaryStats(userId, req.query.from, req.query.to),
      analyticsService.getPnLByMonth(userId, year),
      analyticsService.getSectorExposure(userId),
      analyticsService.getEquityCurve(userId),
      analyticsService.getTopSymbols(userId),
    ]);

    return res.json({
      summary,
      pnlByMonth,
      sectorExposure,
      equityCurve,
      mostTraded: topSymbols.mostTraded,
      mostProfitable: topSymbols.mostProfitable,
    });
  } catch (err) {
    next(err);
  }
};

const getEquityCurve = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await analyticsService.getEquityCurve(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const getPnLByMonth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const data = await analyticsService.getPnLByMonth(userId, year);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const getTopSymbols = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await analyticsService.getTopSymbols(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAnalytics,
  getEquityCurve,
  getPnLByMonth,
  getTopSymbols,
};
