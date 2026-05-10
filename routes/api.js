const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const db = require('../db/database');

let _openai = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// ============= MOCK MARKET DATA =============

const BASE_INDICES = [
  { symbol: 'NIFTY50',    name: 'NIFTY 50',    value: 24485.70, change: 145.30,  changePct: 0.60 },
  { symbol: 'SENSEX',     name: 'SENSEX',       value: 80412.25, change: 412.50,  changePct: 0.52 },
  { symbol: 'BANKNIFTY',  name: 'BANK NIFTY',   value: 52135.80, change: -245.60, changePct: -0.47 },
  { symbol: 'NIFTYIT',    name: 'NIFTY IT',     value: 43210.50, change: 312.40,  changePct: 0.73 },
  { symbol: 'NIFTYAUTO',  name: 'NIFTY AUTO',   value: 24856.30, change: 234.50,  changePct: 0.95 },
  { symbol: 'NIFTYPHARMA',name: 'NIFTY PHARMA', value: 22134.60, change: 178.30,  changePct: 0.81 },
];

const SECTORS = [
  { name: 'Information Technology', changePct: 0.73,  color: '#3b82f6' },
  { name: 'Banking & Finance',      changePct: 0.15,  color: '#8b5cf6' },
  { name: 'Auto & EV',              changePct: 1.12,  color: '#f59e0b' },
  { name: 'Energy & Oil',           changePct: 0.83,  color: '#f97316' },
  { name: 'FMCG',                   changePct: -0.24, color: '#ec4899' },
  { name: 'Pharmaceuticals',        changePct: 0.81,  color: '#14b8a6' },
  { name: 'Infrastructure',         changePct: 1.00,  color: '#84cc16' },
  { name: 'Telecom',                changePct: 1.36,  color: '#6366f1' },
];

const STOCKS = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries Ltd',        sector: 'Energy',         price: 2856.45, change: 23.40,   changePct: 0.83,  volume: 4523891,  marketCap: '19.32L Cr', pe: 28.4, high52w: 3024.90, low52w: 2180.65, description: "India's largest conglomerate with businesses in petrochemicals, refining, telecom (Jio), and retail." },
  { symbol: 'TCS',        name: 'Tata Consultancy Services Ltd',  sector: 'IT',             price: 4125.30, change: -15.20,  changePct: -0.37, volume: 1234567,  marketCap: '15.12L Cr', pe: 32.1, high52w: 4592.25, low52w: 3311.50, description: "India's largest IT services company providing consulting, enterprise solutions, and digital services globally." },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd',                  sector: 'Banking',        price: 1842.60, change: 18.75,   changePct: 1.03,  volume: 3892156,  marketCap: '14.05L Cr', pe: 19.8, high52w: 1880.00, low52w: 1363.45, description: "India's largest private sector bank offering a wide range of banking and financial services." },
  { symbol: 'INFOSYS',    name: 'Infosys Ltd',                    sector: 'IT',             price: 1892.45, change: 12.30,   changePct: 0.65,  volume: 2156789,  marketCap: '7.87L Cr',  pe: 28.9, high52w: 2006.45, low52w: 1358.35, description: "Global IT consulting and services company known for digital transformation and business process management." },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',                 sector: 'Banking',        price: 1248.75, change: -8.90,   changePct: -0.71, volume: 5123456,  marketCap: '8.81L Cr',  pe: 20.3, high52w: 1322.45, low52w: 882.35,  description: "India's second-largest private sector bank with diverse financial products and services." },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd',         sector: 'FMCG',           price: 2456.30, change: 15.60,   changePct: 0.64,  volume: 987654,   marketCap: '5.77L Cr',  pe: 55.2, high52w: 2763.35, low52w: 2107.35, description: "India's largest FMCG company with brands in personal care, home care, and food & beverages." },
  { symbol: 'SBIN',       name: 'State Bank of India',            sector: 'Banking',        price: 856.40,  change: 12.25,   changePct: 1.45,  volume: 7234891,  marketCap: '7.65L Cr',  pe: 12.4, high52w: 912.10,  low52w: 543.25,  description: "India's largest public sector bank and a Fortune 500 company with pan-India presence." },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd',              sector: 'Telecom',        price: 1678.90, change: 22.45,   changePct: 1.36,  volume: 2891456,  marketCap: '9.97L Cr',  pe: 68.5, high52w: 1762.95, low52w: 1143.45, description: "India's largest telecommunications company with presence in 18 countries across Asia and Africa." },
  { symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank Ltd',        sector: 'Banking',        price: 1956.25, change: -12.30,  changePct: -0.62, volume: 1567890,  marketCap: '3.91L Cr',  pe: 22.1, high52w: 2194.10, low52w: 1543.85, description: "Leading private sector bank known for quality services, strong risk management, and digital banking." },
  { symbol: 'LT',         name: 'Larsen & Toubro Ltd',            sector: 'Infrastructure', price: 3612.45, change: 35.80,   changePct: 1.00,  volume: 1123456,  marketCap: '5.11L Cr',  pe: 33.7, high52w: 3858.55, low52w: 2601.60, description: "India's largest engineering, construction, and technology conglomerate with global operations." },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',              sector: 'NBFC',           price: 7234.50, change: -45.30,  changePct: -0.62, volume: 987123,   marketCap: '4.39L Cr',  pe: 39.8, high52w: 8192.50, low52w: 6188.20, description: "India's leading NBFC specializing in consumer and SME lending with a vast distribution network." },
  { symbol: 'WIPRO',      name: 'Wipro Ltd',                      sector: 'IT',             price: 578.90,  change: 8.45,    changePct: 1.48,  volume: 3456789,  marketCap: '3.06L Cr',  pe: 24.3, high52w: 623.90,  low52w: 408.35,  description: "Global IT services company offering consulting, business process services, and digital transformation." },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd',               sector: 'Consumer',       price: 2678.40, change: -18.60,  changePct: -0.69, volume: 654321,   marketCap: '2.56L Cr',  pe: 52.1, high52w: 3394.25, low52w: 2324.40, description: "India's largest paint company with pan-India presence and strong international operations." },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki India Ltd',        sector: 'Auto',           price: 13456.70,change: 123.45,  changePct: 0.93,  volume: 345678,   marketCap: '4.11L Cr',  pe: 28.6, high52w: 13680.25,low52w: 9735.20, description: "India's largest car manufacturer, a joint venture with Japan's Suzuki Motor Corporation." },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical Industries',  sector: 'Pharma',         price: 1892.35, change: 28.90,   changePct: 1.55,  volume: 1234567,  marketCap: '4.55L Cr',  pe: 34.2, high52w: 1960.50, low52w: 1206.45, description: "India's largest pharmaceutical company and top global generic drug manufacturer." },
  { symbol: 'TITAN',      name: 'Titan Company Ltd',              sector: 'Consumer',       price: 3456.80, change: -22.35,  changePct: -0.64, volume: 567890,   marketCap: '3.08L Cr',  pe: 93.4, high52w: 3886.05, low52w: 2635.50, description: "India's leading lifestyle company known for Tanishq jewellery, Titan watches, and Fastrack brand." },
  { symbol: 'ADANIENT',   name: 'Adani Enterprises Ltd',          sector: 'Conglomerate',   price: 2456.90, change: 45.60,   changePct: 1.89,  volume: 4567890,  marketCap: '2.82L Cr',  pe: 52.8, high52w: 3743.90, low52w: 2025.90, description: "Flagship company of the Adani Group with diversified interests in mining, airports, and energy." },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd',                sector: 'Auto',           price: 1056.45, change: 18.90,   changePct: 1.82,  volume: 5678901,  marketCap: '3.91L Cr',  pe: 9.8,  high52w: 1179.05, low52w: 614.70,  description: "India's largest automobile company and parent of Jaguar Land Rover (JLR) in UK." },
  { symbol: 'ONGC',       name: 'Oil & Natural Gas Corp Ltd',     sector: 'Energy',         price: 278.45,  change: 4.30,    changePct: 1.57,  volume: 12345678, marketCap: '3.51L Cr',  pe: 7.2,  high52w: 345.00,  low52w: 180.65,  description: "India's largest oil and gas exploration and production company, a Maharatna PSU." },
  { symbol: 'POWERGRID',  name: 'Power Grid Corp of India',       sector: 'Power',          price: 334.60,  change: -2.45,   changePct: -0.73, volume: 3456789,  marketCap: '3.12L Cr',  pe: 18.9, high52w: 366.25,  low52w: 210.30,  description: "India's central transmission utility responsible for the national high voltage power network." },
  { symbol: 'HCLTECH',    name: 'HCL Technologies Ltd',           sector: 'IT',             price: 1567.80, change: 19.40,   changePct: 1.25,  volume: 2345678,  marketCap: '4.25L Cr',  pe: 26.7, high52w: 1642.90, low52w: 1235.45, description: "India's third-largest IT services company with expertise in digital transformation and R&D services." },
  { symbol: 'DRREDDY',    name: "Dr. Reddy's Laboratories",       sector: 'Pharma',         price: 6234.50, change: 56.30,   changePct: 0.91,  volume: 456789,   marketCap: '1.04L Cr',  pe: 23.8, high52w: 7100.00, low52w: 4822.30, description: "Global pharmaceutical company known for generics, active ingredients, and branded formulations." },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd',              sector: 'Finance',        price: 1923.45, change: -14.20,  changePct: -0.73, volume: 789012,   marketCap: '3.07L Cr',  pe: 27.5, high52w: 2028.90, low52w: 1419.60, description: "India's leading diversified financial services holding company, parent of Bajaj Finance and Bajaj Allianz." },
  { symbol: 'NTPC',       name: 'NTPC Ltd',                       sector: 'Power',          price: 389.20,  change: 5.60,    changePct: 1.46,  volume: 8901234,  marketCap: '3.79L Cr',  pe: 16.8, high52w: 448.45,  low52w: 202.20,  description: "India's largest power generation company, expanding aggressively into renewable energy." },
  { symbol: 'ITC',        name: 'ITC Ltd',                        sector: 'FMCG',           price: 456.30,  change: 4.80,    changePct: 1.06,  volume: 15678901, marketCap: '5.70L Cr',  pe: 27.4, high52w: 531.70,  low52w: 366.35,  description: "Diversified conglomerate with businesses in FMCG, hotels, paperboards, packaging, and agribusiness." },
];

const NEWS = [
  { id: 1, title: 'RBI Keeps Repo Rate Unchanged at 6.5%; Maintains Accommodative Stance', source: 'Economic Times', time: '2 hours ago', sentiment: 'neutral',  summary: 'The Reserve Bank of India maintained its benchmark interest rate at 6.5% for the sixth consecutive meeting, citing controlled inflation and steady growth momentum.' },
  { id: 2, title: 'FII Net Buyers: ₹2,456 Cr Inflow in Indian Equities on Global Cues', source: 'Moneycontrol',   time: '3 hours ago', sentiment: 'positive', summary: 'Foreign Institutional Investors turned net buyers as the US Fed signaled a pause in rate hikes, boosting emerging market sentiment.' },
  { id: 3, title: 'IT Sector Rally Continues on Strong Q4 FY25 Guidance from TCS, Infosys', source: 'Business Standard', time: '4 hours ago', sentiment: 'positive', summary: 'Indian IT majors raised their revenue guidance citing revival in BFSI and healthcare verticals in the US market.' },
  { id: 4, title: 'Auto Sector Sales Surge 18% YoY in April 2025; SUV Demand at Record High', source: 'NDTV Profit',     time: '5 hours ago', sentiment: 'positive', summary: 'Maruti Suzuki, Tata Motors, and Hyundai reported strong monthly sales, driven by new model launches and rural demand recovery.' },
  { id: 5, title: "SEBI Tightens F&O Trading Norms; Retail Investors' Weekly Expiry Restricted", source: 'Mint',  time: '6 hours ago', sentiment: 'negative', summary: 'SEBI introduced new regulations requiring higher margins for F&O trades to protect retail investors from excessive speculation.' },
  { id: 6, title: 'Crude Oil Drops to $78/barrel on OPEC+ Supply Concerns; Positive for India', source: 'Reuters', time: '7 hours ago', sentiment: 'positive', summary: 'A decline in crude oil prices is expected to ease India\'s import bill and reduce inflationary pressure on the domestic economy.' },
  { id: 7, title: 'Adani Green Energy Wins 1500 MW Solar Tender; Shares Jump 2%', source: 'LiveMint',          time: '8 hours ago', sentiment: 'positive', summary: 'Adani Green Energy secured a major solar power project contract from SECI, strengthening its renewable energy portfolio.' },
  { id: 8, title: 'India GDP Growth at 7.2% for FY25; Beats IMF Forecast of 6.8%', source: 'Financial Express', time: '10 hours ago', sentiment: 'positive', summary: 'India\'s robust economic performance driven by infrastructure spending, manufacturing growth, and resilient domestic consumption.' },
];

// Small random variance to simulate live prices
function livePrice(base, variance = 0.003) {
  return +(base * (1 + (Math.random() * 2 - 1) * variance)).toFixed(2);
}

function getIndices() {
  return BASE_INDICES.map(idx => ({
    ...idx,
    value:     livePrice(idx.value, 0.002),
    change:    +(idx.change * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2),
    changePct: +(idx.changePct * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2),
  }));
}

function getStocks() {
  return STOCKS.map(s => ({
    ...s,
    price:     livePrice(s.price),
    change:    +(s.change * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2),
    changePct: +(s.changePct * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2),
  }));
}

function generateHistory(basePrice, days = 30) {
  const points = [];
  let price = basePrice * 0.92;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    price = price * (1 + (Math.random() * 0.04 - 0.018));
    points.push({
      date: new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      price: +price.toFixed(2),
    });
  }
  // nudge the last point toward the current price
  points[points.length - 1].price = basePrice;
  return points;
}

// Market status helper
function getMarketStatus() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = ist.getHours(), m = ist.getMinutes(), d = ist.getDay();
  const isWeekday = d >= 1 && d <= 5;
  const afterOpen  = h > 9  || (h === 9  && m >= 15);
  const beforeClose = h < 15 || (h === 15 && m <= 30);
  return { open: isWeekday && afterOpen && beforeClose, time: ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST' };
}

// ============= SYSTEM PROMPT BUILDER =============

function buildSystemPrompt() {
  const indices = getIndices();
  const stocks  = getStocks();
  const gainers = [...stocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const losers  = [...stocks].sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  const { open, time } = getMarketStatus();

  const indicesText = indices.map(i => `  - ${i.name}: ${i.value.toLocaleString('en-IN')} (${i.changePct > 0 ? '+' : ''}${i.changePct}%)`).join('\n');
  const gainersText = gainers.map(s => `  - ${s.symbol}: ₹${s.price} (+${s.changePct}%)`).join('\n');
  const losersText  = losers.map(s => `  - ${s.symbol}: ₹${s.price} (${s.changePct}%)`).join('\n');

  return `You are an expert AI financial advisor specializing in Indian stock markets (NSE/BSE).

LIVE MARKET DATA (as of ${time}):
Market Status: ${open ? '🟢 OPEN' : '🔴 CLOSED'}

INDICES:
${indicesText}

TOP GAINERS TODAY:
${gainersText}

TOP LOSERS TODAY:
${losersText}

Your expertise covers:
• Indian indices: NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT, NIFTY AUTO, NIFTY PHARMA, etc.
• Individual NSE/BSE-listed stocks: fundamentals, technicals, sector analysis
• Indian macroeconomics: RBI policy, inflation (CPI/WPI), GDP, FII/DII flows
• Sector rotation, earnings season analysis, F&O data interpretation
• Mutual funds, ETFs, SIPs, and portfolio construction strategies
• Risk management, position sizing, stop-loss strategies

Communication style:
• Be concise, professional, and data-driven
• Use ₹ for Indian Rupee values
• Structure responses with clear headers when covering multiple points
• Mention relevant risk factors for every recommendation
• For individual stock analysis, cover: current price, technicals, fundamentals, catalysts, and risks

⚠️ IMPORTANT DISCLAIMER: Always include a brief reminder that:
- Your analysis is for educational purposes only
- Investments are subject to market risks
- Investors should consult a SEBI-registered investment advisor before making decisions
- Past performance does not guarantee future returns`;
}

// ============= MARKET ROUTES =============

router.get('/market/overview', (req, res) => {
  const indices = getIndices();
  const stocks  = getStocks();
  const { open, time } = getMarketStatus();
  const advancing = stocks.filter(s => s.changePct >= 0).length;
  const declining  = stocks.filter(s => s.changePct < 0).length;

  res.json({
    indices,
    marketStatus: { open, time },
    breadth: { advancing, declining, total: stocks.length },
    sectors: SECTORS.map(s => ({ ...s, changePct: +(s.changePct * (1 + (Math.random() * 0.05 - 0.025))).toFixed(2) })),
  });
});

router.get('/market/stocks', (req, res) => {
  const { search, sector, sort } = req.query;
  let stocks = getStocks();

  if (search) {
    const q = search.toLowerCase();
    stocks = stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  }
  if (sector && sector !== 'all') {
    stocks = stocks.filter(s => s.sector.toLowerCase() === sector.toLowerCase());
  }
  if (sort === 'gainers') stocks.sort((a, b) => b.changePct - a.changePct);
  else if (sort === 'losers') stocks.sort((a, b) => a.changePct - b.changePct);
  else if (sort === 'volume') stocks.sort((a, b) => b.volume - a.volume);

  res.json(stocks);
});

router.get('/market/stock/:symbol', (req, res) => {
  const base = STOCKS.find(s => s.symbol === req.params.symbol.toUpperCase());
  if (!base) return res.status(404).json({ error: 'Stock not found' });
  const stock = { ...base, price: livePrice(base.price) };
  const history = generateHistory(stock.price);
  res.json({ ...stock, history });
});

router.get('/market/news', (req, res) => {
  res.json(NEWS);
});

// ============= PORTFOLIO ROUTES =============

router.get('/portfolio', (req, res) => {
  const holdings = db.prepare('SELECT * FROM portfolio ORDER BY created_at DESC').all();
  const stocks = getStocks();
  const enriched = holdings.map(h => {
    const live = stocks.find(s => s.symbol === h.symbol) || { price: h.buy_price, changePct: 0 };
    const currentValue  = live.price * h.quantity;
    const investedValue = h.buy_price * h.quantity;
    const pnl     = +(currentValue - investedValue).toFixed(2);
    const pnlPct  = +(((currentValue - investedValue) / investedValue) * 100).toFixed(2);
    return { ...h, currentPrice: live.price, currentValue: +currentValue.toFixed(2), investedValue: +investedValue.toFixed(2), pnl, pnlPct, changePct: live.changePct };
  });

  const totalInvested = +enriched.reduce((s, h) => s + h.investedValue, 0).toFixed(2);
  const totalCurrent  = +enriched.reduce((s, h) => s + h.currentValue, 0).toFixed(2);
  const totalPnl      = +(totalCurrent - totalInvested).toFixed(2);
  const totalPnlPct   = totalInvested > 0 ? +(((totalCurrent - totalInvested) / totalInvested) * 100).toFixed(2) : 0;

  res.json({ holdings: enriched, summary: { totalInvested, totalCurrent, totalPnl, totalPnlPct } });
});

router.post('/portfolio', (req, res) => {
  const { symbol, buy_price, quantity, buy_date } = req.body;
  if (!symbol || !buy_price || !quantity || !buy_date) {
    return res.status(400).json({ error: 'symbol, buy_price, quantity, buy_date are required' });
  }
  const stock = STOCKS.find(s => s.symbol === symbol.toUpperCase());
  if (!stock) return res.status(400).json({ error: `Unknown stock symbol: ${symbol}` });

  const result = db.prepare(
    'INSERT INTO portfolio (symbol, name, sector, buy_price, quantity, buy_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(stock.symbol, stock.name, stock.sector, +buy_price, +quantity, buy_date);

  res.json({ id: result.lastInsertRowid, symbol: stock.symbol, name: stock.name });
});

router.delete('/portfolio/:id', (req, res) => {
  db.prepare('DELETE FROM portfolio WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ============= AI CHAT (STREAMING) =============

router.post('/chat', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is not configured. Please set the environment variable to enable the AI Advisor.' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

// AI Portfolio Analysis
router.post('/chat/portfolio-analysis', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is not configured.' });
  }

  const holdings = db.prepare('SELECT * FROM portfolio').all();
  if (holdings.length === 0) {
    return res.status(400).json({ error: 'Portfolio is empty. Add stocks first.' });
  }

  const stocks = getStocks();
  const enriched = holdings.map(h => {
    const live = stocks.find(s => s.symbol === h.symbol) || { price: h.buy_price };
    const pnlPct = +(((live.price - h.buy_price) / h.buy_price) * 100).toFixed(2);
    return `${h.symbol} (${h.name}): ${h.quantity} shares @ ₹${h.buy_price} buy price, current ₹${live.price}, P&L: ${pnlPct > 0 ? '+' : ''}${pnlPct}%`;
  });

  const analysisPrompt = `Please analyze my stock portfolio and provide detailed insights:\n\n${enriched.join('\n')}\n\nProvide: 1) Overall portfolio assessment 2) Individual stock analysis 3) Diversification review 4) Risk assessment 5) Recommendations for improvement`;

  res.json({ prompt: analysisPrompt });
});

module.exports = router;
