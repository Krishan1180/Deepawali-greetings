// ─── AI Share Market Advisor — Frontend ────────────────────────

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  const state = {
    activeTab: 'dashboard',
    stocks: [],
    portfolio: [],
    chatMessages: [],
    niftyChart: null,
    sectorChart: null,
    stockDetailChart: null,
    portfolioPieChart: null,
    refreshTimer: null,
    currentSort: '',
    currentSearch: '',
  };

  // ─── Utilities ──────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function fmtPrice(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtNum(n) {
    if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return (n / 1e5).toFixed(2) + ' L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  function changeClass(pct) {
    return pct >= 0 ? 'up' : 'down';
  }

  function changeStr(val, pct) {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${Number(val).toFixed(2)} (${sign}${Number(pct).toFixed(2)}%)`;
  }

  async function api(path, options = {}) {
    const res = await fetch('/api' + path, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  // ─── IST Clock ──────────────────────────────────────────────
  function startClock() {
    function tick() {
      const now = new Date();
      const ist = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const el = $('#marketTime');
      if (el) el.textContent = ist + ' IST';
    }
    tick();
    setInterval(tick, 1000);
  }

  // ─── Tab Navigation ─────────────────────────────────────────
  function initTabs() {
    $$('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        $$('.nav-btn').forEach((b) => b.classList.remove('active'));
        $$('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        $('#tab-' + tab).classList.add('active');
        state.activeTab = tab;
        if (tab === 'stocks') renderStockTable();
        if (tab === 'portfolio') loadPortfolio();
        if (tab === 'news') loadNews();
      });
    });
  }

  // ─── Market Overview ────────────────────────────────────────
  async function loadMarketOverview() {
    try {
      const data = await api('/market/overview');
      renderMarketStatus(data.marketStatus);
      renderIndexGrid(data.indices);
      renderTicker(data.indices);
      renderGainersLosers(data.indices);
      renderSectorChart(data.sectors);
    } catch (e) {
      console.error('Market overview error:', e);
    }
  }

  function renderMarketStatus({ open, time }) {
    const badge = $('#marketStatusBadge');
    if (!badge) return;
    badge.className = 'market-badge ' + (open ? 'open' : 'closed');
    badge.querySelector('.market-label').textContent = open ? 'Market Open' : 'Market Closed';
  }

  function renderIndexGrid(indices) {
    const grid = $('#indexGrid');
    if (!grid) return;
    grid.innerHTML = indices.map((idx) => `
      <div class="index-card ${changeClass(idx.changePct)}">
        <div class="index-name">${idx.name}</div>
        <div class="index-value">${idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="index-change ${changeClass(idx.changePct)}">
          ${changeStr(idx.change, idx.changePct)}
        </div>
      </div>`).join('');
  }

  function renderTicker(indices) {
    const items = $('#tickerItems');
    if (!items) return;
    const html = indices.map((idx) =>
      `<span class="ticker-item">
        <span class="ticker-name">${idx.symbol}</span>
        <span class="ticker-val">${idx.value.toLocaleString('en-IN')}</span>
        <span class="ticker-chg ${changeClass(idx.changePct)}">${idx.changePct >= 0 ? '+' : ''}${idx.changePct.toFixed(2)}%</span>
      </span>`
    ).join('');
    items.innerHTML = html + html; // duplicate for infinite scroll
  }

  function renderGainersLosers(indices) {
    const stocks = state.stocks.length ? state.stocks : [];
    if (!stocks.length) return;
    const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
    const gainers = sorted.slice(0, 5);
    const losers = sorted.slice(-5).reverse();

    const gDiv = $('#gainersTable');
    const lDiv = $('#losersTable');
    if (gDiv) gDiv.innerHTML = gainers.map(miniRow).join('');
    if (lDiv) lDiv.innerHTML = losers.map(miniRow).join('');
  }

  function miniRow(s) {
    return `<div class="mini-row">
      <span class="mini-sym">${s.symbol}</span>
      <span class="mini-price">${fmtPrice(s.price)}</span>
      <span class="mini-chg ${changeClass(s.changePct)}">${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%</span>
    </div>`;
  }

  // ─── NIFTY Chart ────────────────────────────────────────────
  async function loadNiftyChart() {
    try {
      const data = await api('/market/stock/NIFTY50').catch(() => null);
      // NIFTY50 not in stock list — use RELIANCE as representative index proxy
      const ref = await api('/market/stock/RELIANCE');
      renderNiftyChart(ref.history);
    } catch (e) {
      // silently skip chart if data unavailable
    }
  }

  function renderNiftyChart(history) {
    const canvas = $('#niftyChart');
    if (!canvas) return;
    if (state.niftyChart) state.niftyChart.destroy();

    const labels = history.map((p) => p.date.slice(5)); // MM-DD
    const values = history.map((p) => p.price);
    const isUp = values[values.length - 1] >= values[0];
    const color = isUp ? '#22c55e' : '#ef4444';

    state.niftyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: color,
          backgroundColor: color + '22',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: '#1e293b' } },
          y: { ticks: { color: '#94a3b8', callback: (v) => '₹' + v.toLocaleString('en-IN') }, grid: { color: '#1e293b' } },
        },
      },
    });
  }

  // ─── Sector Chart ───────────────────────────────────────────
  function renderSectorChart(sectors) {
    const canvas = $('#sectorChart');
    if (!canvas) return;
    if (state.sectorChart) state.sectorChart.destroy();

    const sorted = [...sectors].sort((a, b) => b.changePct - a.changePct);
    state.sectorChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map((s) => s.name),
        datasets: [{
          data: sorted.map((s) => s.changePct),
          backgroundColor: sorted.map((s) => s.changePct >= 0 ? '#22c55e99' : '#ef444499'),
          borderColor: sorted.map((s) => s.changePct >= 0 ? '#22c55e' : '#ef4444'),
          borderWidth: 1,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', callback: (v) => v + '%' }, grid: { color: '#1e293b' } },
          y: { ticks: { color: '#e2e8f0' }, grid: { display: false } },
        },
      },
    });
  }

  // ─── Stock Screener ─────────────────────────────────────────
  async function loadStocks() {
    try {
      const stocks = await api('/market/stocks');
      state.stocks = stocks;
      renderGainersLosers([]);
    } catch (e) {
      console.error('Stocks load error:', e);
    }
  }

  async function renderStockTable() {
    const tbody = $('#stockTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading stocks...</td></tr>';

    try {
      const params = new URLSearchParams();
      if (state.currentSearch) params.set('search', state.currentSearch);
      if (state.currentSort) params.set('sort', state.currentSort);
      const stocks = await api('/market/stocks?' + params.toString());
      state.stocks = stocks;
      renderGainersLosers([]);

      if (!stocks.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No stocks found.</td></tr>';
        return;
      }

      tbody.innerHTML = stocks.map((s) => `
        <tr>
          <td><span class="sym-cell" data-symbol="${s.symbol}">${s.symbol}</span></td>
          <td>${s.name}</td>
          <td><span class="sector-tag">${s.sector}</span></td>
          <td class="right">${fmtPrice(s.price)}</td>
          <td class="right ${changeClass(s.changePct)}">${changeStr(s.change, s.changePct)}</td>
          <td class="right">${fmtNum(s.volume)}</td>
          <td class="right">${s.marketCap}</td>
          <td class="right">${s.pe}</td>
          <td class="center">
            <button class="btn-detail" data-symbol="${s.symbol}">Details</button>
          </td>
        </tr>`).join('');

      // Symbol + detail button click → stock detail panel
      tbody.querySelectorAll('[data-symbol]').forEach((el) => {
        el.addEventListener('click', () => openStockDetail(el.dataset.symbol));
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">Error: ${e.message}</td></tr>`;
    }
  }

  async function openStockDetail(symbol) {
    const panel = $('#stockDetailPanel');
    const content = $('#stockDetailContent');
    if (!panel || !content) return;

    panel.classList.remove('hidden');
    content.innerHTML = '<div class="loading-cell">Loading detail…</div>';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const s = await api('/market/stock/' + symbol);

      content.innerHTML = `
        <div class="detail-header-row">
          <div>
            <h2>${s.symbol} <span class="sector-tag">${s.sector}</span></h2>
            <p class="company-name">${s.name}</p>
          </div>
          <div class="detail-price-block">
            <div class="detail-price">${fmtPrice(s.price)}</div>
            <div class="detail-change ${changeClass(s.changePct)}">${changeStr(s.change, s.changePct)}</div>
          </div>
        </div>
        <p class="stock-desc">${s.description}</p>
        <div class="detail-stats">
          <div class="stat-item"><span class="stat-label">52W High</span><span class="stat-val">${fmtPrice(s.high52w)}</span></div>
          <div class="stat-item"><span class="stat-label">52W Low</span><span class="stat-val">${fmtPrice(s.low52w)}</span></div>
          <div class="stat-item"><span class="stat-label">P/E Ratio</span><span class="stat-val">${s.pe}</span></div>
          <div class="stat-item"><span class="stat-label">Volume</span><span class="stat-val">${fmtNum(s.volume)}</span></div>
          <div class="stat-item"><span class="stat-label">Market Cap</span><span class="stat-val">${s.marketCap}</span></div>
        </div>
        <canvas id="stockDetailChart" height="160"></canvas>
        <div class="detail-actions-row">
          <button class="btn-ai-analyze" data-symbol="${s.symbol}" data-name="${s.name}">🤖 Ask AI to Analyze ${s.symbol}</button>
        </div>`;

      // 30-day price chart
      if (state.stockDetailChart) state.stockDetailChart.destroy();
      const canvas = $('#stockDetailChart');
      if (canvas && s.history) {
        const isUp = s.history[s.history.length - 1]?.price >= s.history[0]?.price;
        const color = isUp ? '#22c55e' : '#ef4444';
        state.stockDetailChart = new Chart(canvas, {
          type: 'line',
          data: {
            labels: s.history.map((p) => p.date.slice(5)),
            datasets: [{
              data: s.history.map((p) => p.price),
              borderColor: color,
              backgroundColor: color + '22',
              borderWidth: 2,
              pointRadius: 0,
              fill: true,
              tension: 0.3,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: '#1e293b' } },
              y: { ticks: { color: '#94a3b8', callback: (v) => '₹' + v.toLocaleString('en-IN') }, grid: { color: '#1e293b' } },
            },
          },
        });
      }

      // AI analyze button → switches to AI tab with pre-filled prompt
      content.querySelector('.btn-ai-analyze')?.addEventListener('click', (e) => {
        const { symbol, name } = e.currentTarget.dataset;
        switchToAIWithPrompt(`Give me a comprehensive analysis of ${symbol} (${name}). Cover: current price action, fundamental analysis, key financial ratios, recent catalysts, support/resistance levels, and your recommendation with target price and stop-loss.`);
      });
    } catch (e) {
      content.innerHTML = `<div class="loading-cell">Error loading ${symbol}: ${e.message}</div>`;
    }
  }

  function switchToAIWithPrompt(prompt) {
    $$('.nav-btn').forEach((b) => b.classList.remove('active'));
    $$('.tab-panel').forEach((p) => p.classList.remove('active'));
    $('[data-tab="ai"]').classList.add('active');
    $('#tab-ai').classList.add('active');
    state.activeTab = 'ai';
    const input = $('#chatInput');
    if (input) {
      input.value = prompt;
      input.focus();
      autoResize(input);
    }
  }

  // ─── Portfolio ──────────────────────────────────────────────
  async function loadPortfolio() {
    try {
      const data = await api('/portfolio');
      state.portfolio = data.holdings;
      renderPortfolioSummary(data.summary);
      renderPortfolioTable(data.holdings);
      renderPortfolioCharts(data.holdings);
      populateSymbolList();
    } catch (e) {
      console.error('Portfolio load error:', e);
    }
  }

  function renderPortfolioSummary({ totalInvested, totalCurrent, totalPnl, totalPnlPct }) {
    $('#totalInvested').textContent = fmtPrice(totalInvested);
    $('#currentValue').textContent  = fmtPrice(totalCurrent);
    const pnlEl  = $('#totalPnl');
    const pctEl  = $('#totalPnlPct');
    if (pnlEl) {
      pnlEl.textContent = (totalPnl >= 0 ? '+' : '') + fmtPrice(totalPnl);
      pnlEl.className = 'summary-value ' + changeClass(totalPnl);
    }
    if (pctEl) {
      pctEl.textContent = (totalPnlPct >= 0 ? '+' : '') + totalPnlPct.toFixed(2) + '%';
      pctEl.className = 'summary-value ' + changeClass(totalPnlPct);
    }
  }

  function renderPortfolioTable(holdings) {
    const tbody = $('#portfolioTableBody');
    if (!tbody) return;
    if (!holdings.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">Add stocks to track your portfolio.</td></tr>';
      return;
    }
    tbody.innerHTML = holdings.map((h) => `
      <tr>
        <td><strong>${h.symbol}</strong></td>
        <td>${h.name}</td>
        <td class="right">${fmtPrice(h.buy_price)}</td>
        <td class="right">${h.quantity}</td>
        <td class="right">${fmtPrice(h.currentPrice)}</td>
        <td class="right">${fmtPrice(h.investedValue)}</td>
        <td class="right">${fmtPrice(h.currentValue)}</td>
        <td class="right ${changeClass(h.pnl)}">${h.pnl >= 0 ? '+' : ''}${fmtPrice(h.pnl)}</td>
        <td class="right ${changeClass(h.pnlPct)}">${h.pnlPct >= 0 ? '+' : ''}${h.pnlPct.toFixed(2)}%</td>
        <td class="center">
          <button class="btn-remove" data-id="${h.id}">✕</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this holding?')) return;
        await api('/portfolio/' + btn.dataset.id, { method: 'DELETE' });
        loadPortfolio();
      });
    });
  }

  function renderPortfolioCharts(holdings) {
    const row = $('#portfolioChartsRow');
    if (!row) return;
    if (!holdings.length) { row.innerHTML = ''; return; }

    row.innerHTML = `
      <div class="card chart-card">
        <div class="card-header"><h3>Portfolio Allocation</h3></div>
        <canvas id="portfolioPieChart" height="260"></canvas>
      </div>`;

    if (state.portfolioPieChart) state.portfolioPieChart.destroy();
    const canvas = $('#portfolioPieChart');
    if (!canvas) return;

    const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899','#6366f1','#84cc16'];
    state.portfolioPieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: holdings.map((h) => h.symbol),
        datasets: [{
          data: holdings.map((h) => h.currentValue),
          backgroundColor: holdings.map((_, i) => colors[i % colors.length]),
          borderColor: '#0b0f1a',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { color: '#e2e8f0', padding: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${fmtPrice(ctx.parsed)} (${((ctx.parsed / holdings.reduce((s, h) => s + h.currentValue, 0)) * 100).toFixed(1)}%)`,
            },
          },
        },
      },
    });
  }

  function populateSymbolList() {
    const dl = $('#symbolList');
    if (!dl || !state.stocks.length) return;
    dl.innerHTML = state.stocks.map((s) => `<option value="${s.symbol}">${s.symbol} — ${s.name}</option>`).join('');
  }

  function initPortfolioForm() {
    $('#addStockBtn')?.addEventListener('click', () => {
      $('#addStockForm').classList.remove('hidden');
      $('#newBuyDate').value = new Date().toISOString().slice(0, 10);
    });

    $('#cancelAddStock')?.addEventListener('click', () => {
      $('#addStockForm').classList.add('hidden');
    });

    $('#confirmAddStock')?.addEventListener('click', async () => {
      const symbol   = $('#newSymbol')?.value.trim().toUpperCase();
      const buyPrice = parseFloat($('#newBuyPrice')?.value);
      const quantity = parseInt($('#newQuantity')?.value);
      const buyDate  = $('#newBuyDate')?.value;

      if (!symbol || !buyPrice || !quantity || !buyDate) {
        alert('Please fill in all fields.');
        return;
      }

      try {
        await api('/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, buy_price: buyPrice, quantity, buy_date: buyDate }),
        });
        $('#addStockForm').classList.add('hidden');
        $('#newSymbol').value = '';
        $('#newBuyPrice').value = '';
        $('#newQuantity').value = '';
        loadPortfolio();
      } catch (e) {
        alert('Error adding stock: ' + e.message);
      }
    });
  }

  // ─── News ────────────────────────────────────────────────────
  async function loadNews() {
    const grid = $('#newsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-cell">Loading news...</div>';
    try {
      const news = await api('/market/news');
      grid.innerHTML = news.map((n) => `
        <div class="news-card sentiment-${n.sentiment}">
          <div class="news-meta">
            <span class="news-source">${n.source}</span>
            <span class="news-time">${n.time}</span>
            <span class="news-sentiment ${n.sentiment}">${n.sentiment === 'positive' ? '▲' : n.sentiment === 'negative' ? '▼' : '●'}</span>
          </div>
          <h3 class="news-title">${n.title}</h3>
          <p class="news-summary">${n.summary}</p>
        </div>`).join('');
    } catch (e) {
      grid.innerHTML = `<div class="loading-cell">Error loading news: ${e.message}</div>`;
    }
  }

  // ─── AI Chat ────────────────────────────────────────────────
  function initAIChat() {
    const sendBtn = $('#sendChatBtn');
    const input   = $('#chatInput');

    sendBtn?.addEventListener('click', sendChat);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
    input?.addEventListener('input', () => autoResize(input));

    $$('.quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        if (input) {
          input.value = prompt;
          autoResize(input);
          input.focus();
        }
        sendChat();
      });
    });
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  async function sendChat() {
    const input = $('#chatInput');
    const text  = input?.value.trim();
    if (!text) return;

    input.value = '';
    autoResize(input);

    // Remove welcome screen
    const welcome = $('#chatMessages .chat-welcome');
    if (welcome) welcome.remove();

    // Append user message
    state.chatMessages.push({ role: 'user', content: text });
    appendChatMessage('user', text);

    // Append thinking placeholder
    const thinkingId = 'thinking-' + Date.now();
    appendThinking(thinkingId);

    const sendBtn = $('#sendChatBtn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.chatMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      // Stream SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiText  = '';

      removeElement(thinkingId);
      const msgId = 'ai-' + Date.now();
      appendAIMessage(msgId, '');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'text') {
              aiText += evt.text;
              updateAIMessage(msgId, aiText);
            } else if (evt.type === 'done') {
              state.chatMessages.push({ role: 'assistant', content: aiText });
            } else if (evt.type === 'error') {
              throw new Error(evt.message);
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') console.warn('SSE parse:', parseErr);
          }
        }
      }
    } catch (e) {
      removeElement(thinkingId);
      appendChatMessage('ai', `❌ **Error:** ${e.message}\n\nPlease ensure the ANTHROPIC_API_KEY environment variable is set on the server.`);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      input?.focus();
    }
  }

  function appendChatMessage(role, text) {
    const container = $('#chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.innerHTML = `<div class="msg-bubble">${role === 'ai' ? marked.parse(text) : escapeHtml(text)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function appendThinking(id) {
    const container = $('#chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ai chat-thinking';
    div.id = id;
    div.innerHTML = `<div class="msg-bubble"><span class="thinking-dots"><span></span><span></span><span></span></span> Analyzing market data...</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function appendAIMessage(id, text) {
    const container = $('#chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.id = id;
    div.innerHTML = `<div class="msg-bubble">${marked.parse(text || ' ')}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function updateAIMessage(id, text) {
    const el = $('#' + id + ' .msg-bubble');
    if (el) {
      el.innerHTML = marked.parse(text);
      const container = $('#chatMessages');
      if (container) container.scrollTop = container.scrollHeight;
    }
  }

  function removeElement(id) {
    const el = $('#' + id);
    if (el) el.remove();
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Stock Screener Controls ─────────────────────────────────
  function initStockControls() {
    let searchTimer;
    $('#stockSearch')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      state.currentSearch = e.target.value.trim();
      searchTimer = setTimeout(renderStockTable, 300);
    });

    $$('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentSort = btn.dataset.sort;
        renderStockTable();
      });
    });

    $('#closeStockDetail')?.addEventListener('click', () => {
      $('#stockDetailPanel').classList.add('hidden');
    });
  }

  // ─── Auto Refresh ───────────────────────────────────────────
  function startAutoRefresh() {
    clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(async () => {
      await loadMarketOverview();
      if (state.activeTab === 'stocks') renderStockTable();
      if (state.activeTab === 'portfolio') loadPortfolio();
      const lastUpd = $('#lastUpdated');
      if (lastUpd) {
        lastUpd.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      }
    }, 30000);
  }

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    startClock();
    initTabs();
    initStockControls();
    initPortfolioForm();
    initAIChat();

    // Load initial data
    await loadStocks();
    await loadMarketOverview();
    await loadNiftyChart();

    const lastUpd = $('#lastUpdated');
    if (lastUpd) {
      lastUpd.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    }

    startAutoRefresh();
  }

  init();
})();
