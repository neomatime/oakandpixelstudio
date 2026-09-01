// OPS Discovery Engine — automated website audit.
// Fetches the target site, scores 8 digital-experience categories with Claude,
// writes results to Supabase, and returns the summary.
// Env vars required: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const CATEGORIES = [
  'Digital Presence', 'User Experience', 'Conversion', 'Customer Journey',
  'Performance', 'Accessibility', 'Search Foundation', 'Digital Operations',
];

const TIER_VALUES = {
  Signature: { setup: 12500, monthly: 4500 },
  Growth:    { setup: 30000, monthly: 8000 },
  Premium:   { setup: 60000, monthly: 16500 },
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { account_id, audit_id, website_url } = req.body || {};
  if (!account_id || !audit_id || !website_url) {
    res.status(400).json({ error: 'account_id, audit_id, and website_url are required' });
    return;
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const AI_KEY = process.env.ANTHROPIC_API_KEY;

  if (!SB_URL || !SB_KEY) {
    res.status(503).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from Vercel env vars' });
    return;
  }
  if (!AI_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY missing from Vercel env vars' });
    return;
  }

  const dbErrors = [];

  // ── 1. Fetch website HTML ──────────────────────────────────────────────────
  let siteHtml = '';
  let fetchNote = '';
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch(normalizeUrl(website_url), {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'OPS-Discovery/1.0 (Digital Experience Assessment)' },
    });
    clearTimeout(tid);
    const raw = await r.text();
    siteHtml = raw.slice(0, 18000); // 18k chars covers page structure; leaves room for AI response
    if (raw.length > 18000) fetchNote = ' (HTML truncated)';
  } catch (e) {
    siteHtml = `[Website fetch failed: ${e.message}]`;
    fetchNote = ' (site unreachable)';
  }

  // ── 2. Score with Claude ───────────────────────────────────────────────────
  let scores = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
  let findings = [];

  let aiError = null;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': AI_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 8000,
        // Thinking is on by default on Opus 5; medium effort keeps the run
        // inside the serverless time limit.
        output_config: { effort: 'medium' },
        messages: [{ role: 'user', content: buildPrompt(website_url, siteHtml) }],
      }),
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      // Surface the real API error instead of failing silently with zero scores.
      throw new Error(aiData?.error?.message || `Anthropic HTTP ${aiRes.status}`);
    }

    // Find the text block by type — content[0] is a thinking block when
    // thinking is enabled, and reading it yields undefined.
    const textBlock = (aiData.content || []).find(b => b.type === 'text');
    const raw = (textBlock?.text || '').trim();
    if (!raw) throw new Error(`No text block in response (stop_reason: ${aiData.stop_reason})`);

    // Strip markdown fences if the model added them
    const jsonText = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Output hit max_tokens mid-JSON — salvage the scores object alone
      const m = jsonText.match(/"scores"\s*:\s*\{([^}]+)\}/);
      if (!m) throw new Error(`Unparseable response: ${jsonText.slice(0, 200)}`);
      parsed = { scores: JSON.parse(`{${m[1]}}`), findings: [] };
    }

    if (parsed.scores && typeof parsed.scores === 'object') {
      CATEGORIES.forEach(c => {
        if (c in parsed.scores) scores[c] = Number(parsed.scores[c]) || 0;
      });
    }
    if (Array.isArray(parsed.findings)) findings = parsed.findings.slice(0, 8);
  } catch (e) {
    aiError = e.message;
  }

  const now = new Date().toISOString();

  // A failed scoring pass must not be recorded as a completed audit — writing
  // zeros would look like a real result.
  if (aiError) {
    await sbPatch(SB_URL, SB_KEY, 'website_audits', `id=eq.${audit_id}`, {
      status: 'Failed', completed_at: now,
    });
    await sbPost(SB_URL, SB_KEY, 'account_activities', {
      account_id,
      activity_type: 'audit_failed',
      title: 'Website audit failed',
      detail: `${aiError}${fetchNote}`,
    });
    res.status(502).json({ error: aiError });
    return;
  }

  // Clamp scores and compute overall
  CATEGORIES.forEach(c => { scores[c] = Math.max(0, Math.min(100, Math.round(scores[c]))); });
  const overall = Math.round(CATEGORIES.reduce((n, c) => n + scores[c], 0) / CATEGORIES.length);

  // Tier recommendation (mirrors recommendOpsTier in accounts-commercial.js)
  const { tier, confidence, rationale } = recommendTier(scores);
  const values = TIER_VALUES[tier];

  // ── 3. Write to Supabase ───────────────────────────────────────────────────

  const track = async promise => { const err = await promise; if (err) dbErrors.push(err); };

  // Clear prior scores + findings for this audit so a re-run replaces them
  await Promise.all([
    track(sbDelete(SB_URL, SB_KEY, 'audit_category_scores', `audit_id=eq.${audit_id}`)),
    track(sbDelete(SB_URL, SB_KEY, 'audit_findings', `audit_id=eq.${audit_id}`)),
  ]);

  await track(sbPost(SB_URL, SB_KEY, 'audit_category_scores',
    CATEGORIES.map(c => ({ audit_id, category: c, score: scores[c] })),
  ));

  if (findings.length) {
    const validCategory = c => CATEGORIES.includes(c) ? c : CATEGORIES[0];
    await track(sbPost(SB_URL, SB_KEY, 'audit_findings',
      findings.map((f, i) => ({
        audit_id,
        category: validCategory(f.category),
        ops_capability: tier,
        finding:         String(f.finding         || '').slice(0, 500),
        evidence:        String(f.evidence        || '').slice(0, 500),
        business_impact: String(f.business_impact || '').slice(0, 500),
        recommendation:  String(f.recommendation  || '').slice(0, 500),
        sort_order: i,
      })),
    ));
  }

  await track(sbPatch(SB_URL, SB_KEY, 'website_audits', `id=eq.${audit_id}`, {
    overall_score: overall, status: 'Completed', completed_at: now,
  }));

  await track(sbPost(SB_URL, SB_KEY, 'service_recommendations', {
    account_id, audit_id, recommended_tier: tier, confidence, rationale,
  }));

  await track(sbPatch(SB_URL, SB_KEY, 'clients', `id=eq.${account_id}`, {
    recommended_service_tier: tier,
    recommendation_confidence: confidence,
    recommendation_rationale: rationale,
    recommended_at: now,
    estimated_setup_value: values.setup,
    estimated_monthly_value: values.monthly,
    last_website_check: now,
  }));

  await track(sbPost(SB_URL, SB_KEY, 'account_activities', {
    account_id,
    activity_type: 'audit_completed',
    title: 'Website audit completed by OPS Discovery Engine',
    detail: `Overall score: ${overall} / 100 · Recommended: ${tier}${fetchNote}`,
  }));

  res.status(200).json({
    ok: true, overall, tier, confidence, scores,
    findingCount: findings.length,
    ...(dbErrors.length ? { dbErrors } : {}),
  });
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function buildPrompt(url, html) {
  return `You are an expert digital experience auditor working for OPS, a business operations platform. Analyze the website HTML for ${url} and score each category from 0–100 based only on observable evidence in the HTML.

Scoring calibration (be realistic — most SMBs score 20–60 per category):
0–25: Category almost entirely absent
26–45: Basic elements present, major gaps
46–65: Functional but not optimised
66–80: Well-executed with minor gaps
81–100: Industry best practice (rare)

Category definitions:
- Digital Presence: Professional branding, clear value proposition, trust signals (testimonials, logos, awards), visible contact info, social media links
- User Experience: Mobile viewport meta tag, clear navigation structure, logical heading hierarchy, consistent layout, readable text
- Conversion: CTAs visible above the fold, contact/enquiry forms, prominent phone/email, booking or purchase links, low friction paths to contact
- Customer Journey: Services/products explained clearly, about or story page, portfolio or case studies, testimonials or social proof, clear next steps
- Performance: Modern image formats (webp/avif/srcset), lazy loading attributes, deferred scripts, minimal render-blocking tags, CDN hints
- Accessibility: Alt text on images, aria-label attributes, logical h1→h2→h3 heading hierarchy, semantic HTML (nav/main/footer/article), skip navigation
- Search Foundation: Descriptive <title> tag, meta description present, single <h1>, schema.org JSON-LD markup, canonical tag, structured data
- Digital Operations: Online booking or scheduling system, payment or checkout links, client portal or login, CRM or email platform integration, automation or workflow hints

Identify 3–5 high-impact findings — the most significant issues or opportunities you observe.

HTML (may be truncated):
${html}

Respond with ONLY valid JSON — no markdown code fences, no commentary before or after:
{
  "scores": {
    "Digital Presence": <integer>,
    "User Experience": <integer>,
    "Conversion": <integer>,
    "Customer Journey": <integer>,
    "Performance": <integer>,
    "Accessibility": <integer>,
    "Search Foundation": <integer>,
    "Digital Operations": <integer>
  },
  "findings": [
    {
      "category": "<exact category name from the list above>",
      "finding": "<concise finding title, max 80 chars>",
      "evidence": "<specific evidence observed in the HTML, max 200 chars>",
      "business_impact": "<concrete business impact, max 200 chars>",
      "recommendation": "<specific actionable OPS recommendation, max 200 chars>"
    }
  ]
}`;
}

function recommendTier(scores) {
  const ops = (scores['Digital Operations'] + scores['Customer Journey']) / 2;
  const complexity = 100 - ops;
  const conversion = 100 - scores['Conversion'];
  if (complexity >= 65) {
    return {
      tier: 'Premium',
      confidence: Math.min(96, Math.round(70 + complexity * 0.25)),
      rationale: 'The assessment indicates complex customer journeys and operational infrastructure needs that benefit from portals, advanced workflows and tailored integrations.',
    };
  }
  if (ops < 65 || conversion >= 45) {
    return {
      tier: 'Growth',
      confidence: Math.min(94, Math.round(68 + Math.max(100 - ops, conversion) * 0.25)),
      rationale: 'The assessment indicates an opportunity to connect customer management, onboarding, bookings, payments and workflow touchpoints.',
    };
  }
  return {
    tier: 'Signature',
    confidence: 82,
    rationale: 'The primary opportunity is to establish a stronger digital foundation with professional presentation, lead capture and booking capability.',
  };
}

// Each helper resolves to null on success, or an error string on failure.
// Never swallow the response — a rejected write (bad column, RLS, constraint)
// is otherwise invisible and looks like a silent no-op.
async function sbWrite(url, table, init) {
  let r;
  try {
    r = await fetch(url, init);
  } catch (e) {
    return `${table}: ${e.message}`;
  }
  if (r.ok) return null;
  const body = await r.text().catch(() => '');
  return `${table}: HTTP ${r.status} ${body.slice(0, 300)}`;
}

async function sbPost(baseUrl, key, table, body) {
  return sbWrite(`${baseUrl}/rest/v1/${table}`, table, {
    method: 'POST',
    headers: sbHeaders(key, 'return=minimal'),
    body: JSON.stringify(body),
  });
}

async function sbPatch(baseUrl, key, table, filter, body) {
  return sbWrite(`${baseUrl}/rest/v1/${table}?${filter}`, table, {
    method: 'PATCH',
    headers: sbHeaders(key, 'return=minimal'),
    body: JSON.stringify(body),
  });
}

async function sbDelete(baseUrl, key, table, filter) {
  return sbWrite(`${baseUrl}/rest/v1/${table}?${filter}`, table, {
    method: 'DELETE',
    headers: sbHeaders(key, 'return=minimal'),
  });
}

function sbHeaders(key, prefer) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}
