/**
 * Foresight Investor — Research Tab Patch
 * Dynamically injects a "Research" tab + panel into analyst-workbench.html
 * at runtime. Requires the host page to expose WORKBENCH_DATA.
 *
 * Load via: <script src="research-tab.js"></script> placed before </body>
 */
(function() {
  'use strict';

  const REC_URL = 'scripts/_hist/recommendations.json';
  const MON_URL = 'scripts/_hist/monitor_alerts.json';

  // ── Discover the host tab system ──────────────────────────────────────────
  function discoverTabSystem() {
    const tabBtns = document.querySelectorAll('[data-tab]');
    if (tabBtns.length > 0) {
      return { type: 'data-tab', buttons: Array.from(tabBtns) };
    }
    const nav = document.querySelector('nav, header, .nav, .tabs');
    if (nav) {
      return { type: 'nav', container: nav };
    }
    return null;
  }

  // ── Hide old appended inline section ──────────────────────────────────────
  function hideOldAppendedSection() {
    const old = document.getElementById('continuous-research');
    if (old) old.style.display = 'none';
  }

  // ── Create Research tab button ────────────────────────────────────────────
  function createTabButton(system) {
    const btn = document.createElement('button');
    btn.textContent = 'Research';
    btn.setAttribute('data-tab', 'research');
    btn.id = 'tab-research';
    btn.className = 'tab-btn';
    btn.style.cssText = `
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
      transition: color .2s, border-color .2s;
    `;
    btn.onmouseenter = () => { if (!btn.classList.contains('active')) btn.style.color = 'var(--ink)'; };
    btn.onmouseleave = () => { if (!btn.classList.contains('active')) btn.style.color = 'var(--muted)'; };

    // Alert dot (shows when high-severity alerts exist)
    const dot = document.createElement('span');
    dot.id = 'tab-research-dot';
    dot.style.cssText = 'display:none;width:6px;height:6px;background:var(--c1);border-radius:50%;margin-left:6px;vertical-align:middle;';
    btn.appendChild(dot);

    if (system.type === 'data-tab' && system.buttons.length) {
      const ref = system.buttons[system.buttons.length - 1];
      ref.parentNode.insertBefore(btn, ref.nextSibling);
    } else if (system.type === 'nav' && system.container) {
      system.container.appendChild(btn);
    } else {
      const header = document.querySelector('header, .top');
      if (header) header.appendChild(btn);
    }
    return btn;
  }

  // ── Create Research panel ─────────────────────────────────────────────────
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'panel-research';
    panel.setAttribute('data-tab-panel', 'research');
    panel.style.cssText = 'display:none;';
    panel.innerHTML = `
      <div style="padding:18px 0">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px" id="rec-chips"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" id="rec-grid">
          <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 0 rgba(255,255,255,.03),0 8px 30px rgba(0,0,0,.35)">
            <h2 style="margin:0 0 12px;font-size:16px;color:var(--accent);display:flex;align-items:center;gap:10px">
              Recommendations <span id="rec-badge" style="background:var(--line);color:var(--muted);font-size:11px;padding:2px 8px;border-radius:999px;font-weight:600">0</span>
            </h2>
            <div id="rec-body"><div style="color:var(--dim);font-style:italic;padding:20px;text-align:center">Loading…</div></div>
          </div>
          <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 0 rgba(255,255,255,.03),0 8px 30px rgba(0,0,0,.35)">
            <h2 style="margin:0 0 12px;font-size:16px;color:var(--accent);display:flex;align-items:center;gap:10px">
              Monitor Alerts <span id="alert-badge" style="background:var(--line);color:var(--muted);font-size:11px;padding:2px 8px;border-radius:999px;font-weight:600">0</span>
            </h2>
            <div id="alert-body"><div style="color:var(--dim);font-style:italic;padding:20px;text-align:center">Loading…</div></div>
          </div>
        </div>
      </div>
    `;

    const existingPanels = document.querySelector('[data-tab-panel], .tab-panel, .panel');
    if (existingPanels && existingPanels.parentNode) {
      existingPanels.parentNode.appendChild(panel);
    } else {
      const wrap = document.querySelector('.wrap');
      if (wrap) wrap.appendChild(panel);
    }
    return panel;
  }

  // ── Wire tab switching ────────────────────────────────────────────────────
  function wireTabSwitching(btn, panel) {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(b => {
        b.classList.remove('active');
        if (b !== btn) {
          b.style.color = '';
          b.style.borderBottomColor = '';
        }
      });
      document.querySelectorAll('[data-tab-panel]').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      btn.style.color = 'var(--ink)';
      btn.style.borderBottomColor = 'var(--accent)';
      panel.style.display = 'block';
    });

    document.querySelectorAll('[data-tab]').forEach(other => {
      if (other === btn) return;
      other.addEventListener('click', () => {
        btn.classList.remove('active');
        btn.style.color = 'var(--muted)';
        btn.style.borderBottomColor = 'transparent';
        panel.style.display = 'none';
      });
    });
  }

  // ── Render recommendations ────────────────────────────────────────────────
  function renderRecs(rec) {
    const chips = document.getElementById('rec-chips');
    const body = document.getElementById('rec-body');
    const badge = document.getElementById('rec-badge');
    const top = rec.top || [];
    if (badge) badge.textContent = top.length;

    if (chips) {
      const s = rec.summary || {};
      const parts = [];
      if (s.add) parts.push(`<span style="background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 12px;font-size:12px"><b style="color:var(--c5)">${s.add}</b> ADD</span>`);
      if (s.start) parts.push(`<span style="background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 12px;font-size:12px"><b style="color:var(--c4)">${s.start}</b> START</span>`);
      if (s.hold) parts.push(`<span style="background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 12px;font-size:12px"><b style="color:var(--accent)">${s.hold}</b> HOLD</span>`);
      if (s.watch) parts.push(`<span style="background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 12px;font-size:12px"><b style="color:var(--muted)">${s.watch}</b> WATCH</span>`);
      if (s.trim) parts.push(`<span style="background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 12px;font-size:12px"><b style="color:var(--c2)">${s.trim}</b> TRIM</span>`);
      chips.innerHTML = parts.join('') || '';
    }

    if (!top.length) {
      if (body) body.innerHTML = '<div style="color:var(--dim);font-style:italic;padding:20px;text-align:center">No recommendations. Run <code>scripts/recommend.py</code>.</div>';
      return;
    }

    const rows = top.map(r => {
      const badgeStyle = 'display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em';
      const bc = r.action==='ADD'?'rgba(61,220,151,.12);color:#3ddc97':r.action==='START'?'rgba(123,216,143,.12);color:#7bd88f':r.action==='HOLD'?'rgba(91,157,255,.12);color:#5b9dff':r.action==='TRIM'?'rgba(255,159,67,.12);color:#ff9f43':'rgba(139,151,176,.12);color:#8b97b0';
      return `<tr style="border-bottom:1px solid var(--line)">
        <td style="padding:10px"><b style="color:var(--accent);font-size:14px">${r.tk}</b>${r.inBook?' <span style="font-size:10px;color:var(--c2)">[BOOK]</span>':''}<div style="font-size:11px;color:var(--dim)">${r.tier}</div></td>
        <td style="padding:10px"><span style="${badgeStyle};background:${bc}">${r.action}</span></td>
        <td style="padding:10px;font-family:monospace">${r.conf}</td>
        <td style="padding:10px;font-family:monospace">${r.price?'$'+r.price:'—'}</td>
        <td style="padding:10px;font-family:monospace">${r.fwdPe?r.fwdPe+'x':'—'}</td>
      </tr>`;
    }).join('');

    if (body) body.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr><th style="text-align:left;padding:8px 10px;color:var(--dim);font-weight:600;border-bottom:1px solid var(--line)">Ticker</th><th style="text-align:left;padding:8px 10px;color:var(--dim);font-weight:600;border-bottom:1px solid var(--line)">Action</th><th style="text-align:left;padding:8px 10px;color:var(--dim);font-weight:600;border-bottom:1px solid var(--line)">Conf</th><th style="text-align:left;padding:8px 10px;color:var(--dim);font-weight:600;border-bottom:1px solid var(--line)">Price</th><th style="text-align:left;padding:8px 10px;color:var(--dim);font-weight:600;border-bottom:1px solid var(--line)">Fwd P/E</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── Render alerts ─────────────────────────────────────────────────────────
  function renderAlerts(mon) {
    const body = document.getElementById('alert-body');
    const badge = document.getElementById('alert-badge');
    const alerts = mon.alerts || [];
    if (badge) badge.textContent = alerts.length;

    if (!alerts.length) {
      if (body) body.innerHTML = '<div style="color:var(--dim);font-style:italic;padding:20px;text-align:center">No alerts. Run <code>scripts/monitor.py</code>.</div>';
      return;
    }

    const items = alerts.map(a => {
      const border = a.sev==='high'?'var(--c1)':a.sev==='medium'?'var(--c2)':'var(--c4)';
      const color = a.sev==='high'?'var(--c1)':a.sev==='medium'?'var(--c2)':'var(--c4)';
      return `<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:var(--panel2);border-radius:10px;border-left:3px solid ${border};margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;min-width:52px;color:${color}">${a.sev}</div>
        <div style="flex:1">
          ${a.tk?`<b style="color:var(--accent);font-size:13px">${a.tk}</b> `:''}
          <div style="color:var(--muted);font-size:12px;margin-top:2px">${a.msg}</div>
          <div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;margin-top:4px">${(a.type||'').replace(/_/g,' ')}</div>
        </div>
      </div>`;
    }).join('');

    if (body) body.innerHTML = `<div style="display:flex;flex-direction:column">${items}</div>`;
  }

  // ── Alert dot on tab ──────────────────────────────────────────────────────
  function updateAlertDot(mon) {
    const dot = document.getElementById('tab-research-dot');
    if (!dot) return;
    const hasHigh = (mon.alerts || []).some(a => a.sev === 'high');
    dot.style.display = hasHigh ? 'inline-block' : 'none';
  }

  // ── Load and render ───────────────────────────────────────────────────────
  function loadAndRender() {
    let rec = {meta:{},summary:{},top:[]};
    let mon = {meta:{},summary:{},alerts:[]};

    try {
      if (window.WORKBENCH_DATA && window.WORKBENCH_DATA.recommendations) {
        rec = window.WORKBENCH_DATA.recommendations;
      }
      if (window.WORKBENCH_DATA && window.WORKBENCH_DATA.monitor) {
        mon = window.WORKBENCH_DATA.monitor;
      }
    } catch(e) {}

    if (!rec.top.length || !mon.alerts.length) {
      Promise.all([
        fetch(REC_URL).then(r => r.ok ? r.json() : {}).catch(() => {}),
        fetch(MON_URL).then(r => r.ok ? r.json() : {}).catch(() => {})
      ]).then(([recData, monData]) => {
        if (recData && recData.recommendations) {
          rec = {
            meta: recData.meta || {},
            summary: recData.summary || {},
            top: recData.recommendations.slice(0,15).map(r => ({
              tk: r.ticker, action: r.action, conf: r.confidence, tier: r.tier,
              bestSleeve: r.best_sleeve, price: r.price, fwdPe: r.fwd_pe,
              off52: r.off_52w_high, inBook: r.in_book, bookWeight: r.book_weight,
              why: r.confidence_rationale, inv: r.invalidation,
              themes: (r.themes || []).slice(0,3)
            }))
          };
        }
        if (monData && monData.alerts) {
          const alerts = [];
          ['high','medium','low'].forEach(sev => {
            (monData.alerts[sev] || []).slice(0,8).forEach(a => {
              alerts.push({tk: a.ticker || '', type: a.type, sev, msg: a.message || a.msg || ''});
            });
          });
          mon = {meta: monData.meta || {}, summary: monData.summary || {}, alerts};
        }
        renderRecs(rec);
        renderAlerts(mon);
        updateAlertDot(mon);
      });
    } else {
      renderRecs(rec);
      renderAlerts(mon);
      updateAlertDot(mon);
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    hideOldAppendedSection();
    const system = discoverTabSystem();
    if (!system) {
      console.warn('[research-tab] Could not discover tab system');
      return;
    }
    const btn = createTabButton(system);
    const panel = createPanel();
    wireTabSwitching(btn, panel);
    loadAndRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
