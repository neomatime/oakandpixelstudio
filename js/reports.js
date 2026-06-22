'use strict';

let revenueChart = null;

function renderReports() {
  renderReportStats();
  renderRevenueChart();
  renderPipelineFunnel();
  renderRetainerBreakdown();
  renderTopServices();
}

function renderReportStats() {
  const year = new Date().getFullYear().toString();
  const paidInvoices = allInvoices.filter(i => i.payment_status === 'Paid');
  const ytd = paidInvoices
    .filter(i => i.invoice_date?.startsWith(year))
    .reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const mrr = allRetainers
    .filter(r => r.status === 'active')
    .reduce((s, r) => s + (Number(r.monthly_amount) || 0), 0);
  const avgInv = paidInvoices.length
    ? paidInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0) / paidInvoices.length
    : 0;
  const outstanding = allInvoices
    .filter(i => i.payment_status === 'Sent' || i.payment_status === 'Overdue')
    .reduce((s, i) => s + (Number(i.total_amount) || 0), 0);

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set('rpt-ytd',         money(ytd));
  set('rpt-mrr',         money(mrr));
  set('rpt-avg-inv',     money(avgInv));
  set('rpt-outstanding', money(outstanding));
}

function renderRevenueChart() {
  const ctx = document.getElementById('chart-revenue')?.getContext('2d');
  if (!ctx) return;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? 'rgba(245,244,241,.45)' : 'rgba(26,26,24,.45)';
  const gridColor = isDark ? 'rgba(245,244,241,.05)' : 'rgba(26,26,24,.06)';

  const months = [];
  const labels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
    labels.push(d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }));
  }

  const paid = months.map(m =>
    allInvoices
      .filter(i => i.payment_status === 'Paid' && i.invoice_date?.startsWith(m))
      .reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
  );
  const outstanding = months.map(m =>
    allInvoices
      .filter(i => (i.payment_status === 'Sent' || i.payment_status === 'Overdue') && i.invoice_date?.startsWith(m))
      .reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
  );

  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Paid',
          data: paid,
          backgroundColor: 'rgba(90,158,111,.65)',
          borderColor: 'rgba(90,158,111,.9)',
          borderWidth: 1, borderRadius: 3, borderSkipped: false
        },
        {
          label: 'Outstanding',
          data: outstanding,
          backgroundColor: 'rgba(196,150,58,.45)',
          borderColor: 'rgba(196,150,58,.7)',
          borderWidth: 1, borderRadius: 3, borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: { color: textColor, font: { family: "'DM Mono',monospace", size: 10 }, boxWidth: 10, padding: 14 }
        },
        tooltip: {
          callbacks: { label: c => ` R ${Number(c.raw).toLocaleString('en-ZA')}` }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'DM Mono',monospace", size: 10 } }
        },
        y: {
          stacked: true,
          grid: { color: gridColor },
          beginAtZero: true,
          ticks: {
            color: textColor,
            font: { family: "'DM Mono',monospace", size: 10 },
            callback: v => v >= 1000 ? `R ${(v / 1000).toFixed(0)}k` : `R ${v}`
          }
        }
      }
    }
  });
}

function renderPipelineFunnel() {
  const c = $('rpt-funnel');
  if (!c) return;

  const applications = allApplications.length;
  const clients      = allClients.length;
  const retained     = new Set(
    allRetainers.filter(r => r.status === 'active').map(r => r.client_id)
  ).size;

  const convRate   = applications ? Math.round((clients   / applications) * 100) : 0;
  const retainRate = clients      ? Math.round((retained  / clients)      * 100) : 0;
  const max        = Math.max(applications, 1);

  const bar = (label, value, color, pct) => `
    <div style="margin-bottom:.9rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.3rem">
        <span style="font-family:var(--font-m);font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:var(--mist)">${label}</span>
        <span style="font-family:var(--font-d);font-size:1.45rem;color:${color}">${value}</span>
      </div>
      <div style="height:3px;background:var(--border);border-radius:2px">
        <div style="height:3px;background:${color};width:${pct}%;border-radius:2px"></div>
      </div>
    </div>`;

  c.innerHTML = `<div style="padding:1.25rem 1.5rem">
    ${bar('Applications', applications, 'var(--mist)',     100)}
    ${bar('Clients',      clients,      'var(--gold)',     Math.round((clients  / max) * 100))}
    ${bar('Retained',     retained,     'var(--ok)',       Math.round((retained / max) * 100))}
    <div style="display:flex;gap:2rem;margin-top:1rem;padding-top:.85rem;border-top:1px solid var(--border)">
      <div>
        <div style="font-family:var(--font-d);font-size:1.15rem;color:var(--gold)">${convRate}%</div>
        <div style="font-family:var(--font-m);font-size:.5rem;letter-spacing:.1em;text-transform:uppercase;color:var(--mist);margin-top:.15rem">Conv. Rate</div>
      </div>
      <div>
        <div style="font-family:var(--font-d);font-size:1.15rem;color:var(--ok)">${retainRate}%</div>
        <div style="font-family:var(--font-m);font-size:.5rem;letter-spacing:.1em;text-transform:uppercase;color:var(--mist);margin-top:.15rem">Retain Rate</div>
      </div>
    </div>
  </div>`;
}

function renderRetainerBreakdown() {
  const c = $('rpt-retainers');
  if (!c) return;

  const active = allRetainers
    .filter(r => r.status === 'active')
    .sort((a, b) => (Number(b.monthly_amount) || 0) - (Number(a.monthly_amount) || 0));

  if (!active.length) { c.innerHTML = emptyState('No active retainers', 'Active retainer clients will appear here.'); return; }

  c.innerHTML = `<table class="a-table">
    <thead><tr>
      <th>Client</th><th>Plan</th><th style="text-align:right">Monthly</th>
    </tr></thead>
    <tbody>${active.map(r => {
      const client = clientById(r.client_id) || {};
      return `<tr>
        <td class="td-name">${esc(clientDisplayName(client) || '—')}</td>
        <td class="td-dim">${esc(r.plan_name || client.ops_plan || '—')}</td>
        <td style="text-align:right;font-family:var(--font-m);font-size:.78rem;color:var(--ok)">${money(r.monthly_amount)}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function renderTopServices() {
  const c = $('rpt-services');
  if (!c) return;

  const paid = allInvoices.filter(i => i.payment_status === 'Paid');
  const byService = {};
  paid.forEach(inv => {
    const key = inv.service_id || '__none__';
    byService[key] = (byService[key] || 0) + (Number(inv.total_amount) || 0);
  });

  const sorted = Object.entries(byService)
    .map(([id, total]) => ({ name: allServices.find(s => s.id === id)?.name || 'General', total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  if (!sorted.length) { c.innerHTML = emptyState('No invoice data yet', 'Revenue by service will appear once invoices are paid.'); return; }

  const max = sorted[0].total || 1;
  c.innerHTML = `<div style="padding:1.25rem 1.5rem">${sorted.map(s => `
    <div style="margin-bottom:.9rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.3rem">
        <span style="font-size:.8rem">${esc(s.name)}</span>
        <span style="font-family:var(--font-m);font-size:.7rem;color:var(--ok)">${money(s.total)}</span>
      </div>
      <div style="height:3px;background:var(--border);border-radius:2px">
        <div style="height:3px;background:var(--emerald-l);width:${Math.round((s.total / max) * 100)}%;border-radius:2px"></div>
      </div>
    </div>`).join('')}
  </div>`;
}
