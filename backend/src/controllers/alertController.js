const Alert = require('../models/Alert');
const ApiError = require('../utils/ApiError');

const createAlert = async (req, res, next) => {
  try {
    const { symbol, condition, targetPrice, notifyEmail } = req.body;
    // normalize condition value from frontend (accept 'Goes Above', 'above', 'ABOVE', etc.)
    let cond = (condition || '').toString().toUpperCase();
    if (cond.includes('ABOVE')) cond = 'ABOVE';
    else if (cond.includes('BELOW')) cond = 'BELOW';

    const alert = await Alert.create({
      user: req.user.id,
      symbol: symbol.toUpperCase(),
      condition: cond,
      targetPrice,
      notifyEmail: !!notifyEmail,
    });
    res.status(201).json(alert);
  } catch (err) { next(err); }
};

const getAlerts = async (req, res, next) => {
  try {
    const status = (req.query.status || 'ACTIVE').toString().toUpperCase();
    const alerts = await Alert.find({ user: req.user.id, status }).sort({ createdAt: -1 }).lean();
    res.json(alerts);
  } catch (err) { next(err); }
};

const deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({ _id: req.params.id, user: req.user.id });
    if (!alert) throw new ApiError(404, 'Alert not found');
    await alert.deleteOne();
    res.json({ message: 'Alert deleted' });
  } catch (err) { next(err); }
};

const updateAlert = async (req, res, next) => {
  try {
    const { condition, targetPrice, notifyEmail } = req.body;
    let cond = condition ? condition.toString().toUpperCase() : undefined;
    if (cond && cond.includes('ABOVE')) cond = 'ABOVE';
    else if (cond && cond.includes('BELOW')) cond = 'BELOW';

    const updates = { status: 'ACTIVE' }; // Always reset edited alerts to ACTIVE
    if (cond) updates.condition = cond;
    if (targetPrice !== undefined) updates.targetPrice = Number(targetPrice);
    if (notifyEmail !== undefined) updates.notifyEmail = !!notifyEmail;

    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updates,
      { new: true, runValidators: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) { next(err); }
};

module.exports = {
  createAlert,
  getAlerts,
  deleteAlert,
  updateAlert,
};
