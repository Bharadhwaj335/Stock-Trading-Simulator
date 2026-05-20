const SUPPORTED_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMD', 'INTC', 'CRM', 'SHOP', 'UBER',
  'AMZN', 'TSLA', 'NFLX', 'BABA', 'TGT', 'WMT', 'NKE', 'DIS',
  'V', 'MA', 'JPM', 'BAC', 'PYPL',
  'PFE', 'JNJ', 'XOM', 'BA', 'GE', 'F', 'GM'
];

const SECTORS = {
  AAPL: 'Technology',  MSFT: 'Technology',  GOOGL: 'Technology',
  NVDA: 'Technology',  META: 'Technology',  AMD: 'Technology',
  INTC: 'Technology',  CRM: 'Technology',   SHOP: 'Technology',
  UBER: 'Technology',  AMZN: 'Consumer',    TSLA: 'Consumer',
  NFLX: 'Consumer',   BABA: 'Consumer',    TGT: 'Consumer',
  WMT: 'Consumer',    NKE: 'Consumer',     DIS: 'Consumer',
  V: 'Finance',        MA: 'Finance',       JPM: 'Finance',
  BAC: 'Finance',      PYPL: 'Finance',     PFE: 'Healthcare',
  JNJ: 'Healthcare',  XOM: 'Energy',       BA: 'Industrial',
  GE: 'Industrial',   F: 'Industrial',     GM: 'Industrial',
};

const STARTING_BALANCE = 30000;

module.exports = { SUPPORTED_SYMBOLS, SECTORS, STARTING_BALANCE };
