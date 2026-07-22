import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'razalead-data') : path.join(__dirname, 'data');
const LEADS = path.join(DATA_DIR, 'leads.json');
const SESSIONS = path.join(DATA_DIR, 'sessions.json');
const FOLLOWUPS = path.join(DATA_DIR, 'followups.json');
const META_SETTINGS = path.join(DATA_DIR, 'meta-settings.json');
const KNOWLEDGE_STORE = path.join(DATA_DIR, 'knowledge.json');
const USERS = path.join(DATA_DIR, 'users.json');
const TEMPLATES = path.join(DATA_DIR, 'templates.json');
const QUICK_REPLIES = path.join(DATA_DIR, 'quick-replies.json');
const AUDIT_LOG = path.join(DATA_DIR, 'audit-log.json');
const SAAS_JOBS = path.join(DATA_DIR, 'saas-jobs.json');
const UNRESOLVED = path.join(DATA_DIR, 'unresolved-questions.json');
const WIDGET_SESSIONS = path.join(DATA_DIR, 'widget-sessions.json');
const EMAIL_SETTINGS = path.join(DATA_DIR, 'email-settings.json');
const EMAIL_HISTORY = path.join(DATA_DIR, 'email-history.json');
const AUTOMATION_SETTINGS = path.join(DATA_DIR, 'automation-settings.json');
const COMPETITORS = path.join(DATA_DIR, 'competitors.json');
const PROJECTS = path.join(DATA_DIR, 'projects.json');
const AUTOMATION_BLUEPRINTS = path.join(DATA_DIR, 'automation-blueprints.json');
const PORT = Number(process.env.PORT || 4317);
const DATABASE_URL = process.env.RAZA_NEXT_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
let databasePromise = null;
const stateCache = new Map();
const STATE_CACHE_TTL_MS = Number(process.env.STATE_CACHE_TTL_MS || 30000);

const business = {
  name: process.env.BUSINESS_NAME || 'Raza Productions',
  whatsappLocal: process.env.BUSINESS_WHATSAPP_LOCAL || '03343661913',
  whatsapp: process.env.BUSINESS_WHATSAPP || '+923343661913',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'razalead_os_verify_token',
  jazzcashName: process.env.JAZZCASH_ACCOUNT_NAME || 'Muhammad Raza',
  jazzcashNumber: process.env.JAZZCASH_ACCOUNT_NUMBER || '03343661913',
};

const defaultMeta = {
  graphVersion: process.env.GRAPH_API_VERSION || 'v23.0',
  phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
  accessToken: process.env.META_ACCESS_TOKEN || '',
  wabaId: process.env.META_WABA_ID || '2277937109279661',
};

const aiConfig = {
  provider: (process.env.GROQ_API_KEY ? 'groq' : process.env.AI_PROVIDER || '').toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
};

const saasFeatures = [
  ['proposal', 'AI Proposal Generator', 'Generate a branded client proposal ready for PDF printing.'],
  ['content-calendar', 'AI Content Calendar', 'Create and export a 30-day Podcast Studio content plan.'],
  ['review-collector', 'AI Review Collector', 'Schedule a Google Review request 3 days after completion.'],
  ['upsell', 'AI Upsell Engine', 'Recover clients inactive for 60 days with a 20% offer.'],
  ['competitor-alert', 'Competitor Alert', 'Track up to 5 YouTube channels and log new-video alerts.'],
  ['meeting-scheduler', 'AI Meeting Scheduler', 'Prepare three meeting slots and a calendar booking job.'],
  ['contract-invoice', 'Contract + Invoice', 'Create contract and invoice records when a deal is won.'],
  ['winback', 'AI Winback', 'Queue weekly outreach for clients inactive for 90 days.'],
  ['faq-bot', 'AI FAQ Bot 24/7', 'Manage WhatsApp answers for pricing, timing and location.'],
  ['client-portal', 'Client Portal', 'Create an OTP-protected client progress portal.'],
  ['auto-wishes', 'Auto Wishes', 'Queue birthday and Eid WhatsApp wishes for 9am.'],
  ['voice-proposal', 'Voice to Proposal', 'Prepare voice-note transcription and proposal generation.'],
  ['no-show', 'No Show Rescue', 'Queue two replacement slots five minutes after a missed meeting.'],
  ['task-assigner', 'Team Task Assigner', 'Create production tasks automatically after Deal Won.'],
  ['ghost-recover', 'Ghost Lead Recover', 'Follow up 48 hours after an unanswered proposal.'],
  ['referral', 'Referral Machine', 'Ask five-star reviewers for a referral with a free short video.'],
  ['viral-ideas', 'Viral Idea Generator', 'Generate three hooks and scripts for any niche.'],
  ['smart-portfolio', 'Smart Portfolio', 'Select the best three portfolio projects for a niche.'],
  ['ceo-report', 'Daily CEO Report', 'Compile leads, revenue, top lead and pending proposals.'],
  ['lost-lead', 'Lost Lead Magnet', 'Queue a free PDF and Book Now recovery message after 3 days.'],
].map(([id, name, description], index) => ({ id, name, description, number: index + 1 }));

const PODCAST_BOOKING_URL = 'https://www.razaproductions.com/booking';

const knowledge = {
  portfolioUrl: process.env.PORTFOLIO_URL || 'https://razaproductions.com',
  brandIntro: `Hi 👋 This is Raza Suriya, Founder of Raza Productions. Thanks for reaching out! We offer premium creative and production services. Our work: Facebook https://www.facebook.com/Razaproductionofficial | Instagram https://www.instagram.com/razaproductionspk/ | YouTube https://www.youtube.com/@razaproductionspk | Website https://www.razaproductions.com. Quick Call: +92 3272556069.`,
  humanHandoffMessage: 'Thanks for your message. I do not want to guess and give you the wrong information. I have paused the automated chat and shared your question with the Raza Productions team. A team member will reply personally as soon as possible. 🙌',
  greeting:
    'Assalam o Alaikum! Raza Productions me welcome. Please neeche se option select karein: Services, Portfolio ya Book Podcast.',
  services: [
    {
      id: 'graphic_design',
      name: 'Graphic Design',
      reply: 'Creative posters, social media creatives, branding visuals aur campaign designs.',
    },
    {
      id: 'social_media',
      name: 'Social Media Management',
      reply: 'Content planning, posting, reels strategy, page handling aur monthly growth support.',
    },
    {
      id: 'podcasting',
      name: 'Podcasting',
      reply: 'Studio podcast recording, multi-camera setup, audio cleanup, editing, reels aur publishing support.',
    },
    {
      id: 'ai_videos',
      name: 'AI Videos',
      reply: 'AI-assisted promotional videos, creative concepts, avatars, explainers aur social content.',
    },
    {
      id: 'photography',
      name: 'Photography',
      reply: 'Products, portraits, events, corporate shoots aur social media photography.',
    },
    {
      id: 'video_editing',
      name: 'Video Editing',
      reply: 'Long videos, short reels, color, sound, captions, hooks aur social media cutdowns.',
    },
    {
      id: 'studio_recording',
      name: 'Studio Recording',
      reply: 'Music, podcast, voice over aur studio-based audio/video recording.',
    },
    {
      id: 'cinematography',
      name: 'Cinematography',
      reply: 'Professional shoots, brand videos, event coverage, product shoots aur cinematic visuals.',
    },
    {
      id: 'wedding_production',
      name: 'Wedding Production',
      reply: 'Wedding photography, cinematic films, highlights, reels aur complete event coverage.',
    },
    {
      id: 'live_streaming',
      name: 'Live Streaming',
      reply: 'Events, programs aur sessions ke liye smooth live streaming setup.',
    },
  ],
  podcastSlots: [
    'Monday: 12:00 PM, 3:00 PM, 6:00 PM',
    'Wednesday: 11:00 AM, 2:00 PM, 5:00 PM',
    'Saturday: 1:00 PM, 4:00 PM, 7:00 PM',
  ],
  pricing: [
    'Starter: basic recording/editing or single-service work. Final quote after requirement.',
    'Growth: multi-camera podcast/video + reels + audio cleanup.',
    'Premium: full production crew, advanced edit, color, sound and delivery pack.',
    'Custom: weddings, campaigns, retainers and large events need a custom quote.',
  ],
  quickButtons: [
    { id: 'services', label: 'Services', reply: '' },
    { id: 'portfolio', label: 'Portfolio', reply: '' },
    { id: 'podcast', label: 'Book Podcast', reply: '' },
  ],
  knowledgePoints: [
    {
      match: ['turnaround', 'delivery', 'kitne din'],
      answer: 'Delivery timeline kaam ke scope par depend karti hai. Short reels usually fast ho jati hain; full podcast/video edit ke liye requirement dekh kar timeline confirm hoti hai.',
    },
  ],
  faqs: [
    {
      match: ['price', 'pricing', 'package', 'rate', 'charges', 'cost', 'budget'],
      answer:
        'Pricing service, date, crew size aur deliverables par depend karti hai. Aap service, city, date aur rough budget share kar dein; team final quote confirm karegi.',
    },
    {
      match: ['portfolio', 'sample', 'work', 'website'],
      answer:
        'Portfolio: https://razaproductions.com. Aap bata dein kis type ka sample chahiye: podcast, reels, graphic design, live streaming, studio recording ya cinematography.',
    },
    {
      match: ['payment', 'advance', 'bank', 'jazzcash', 'easypaisa'],
      answer:
        'Booking usually advance payment ke baad confirm hoti hai. Payment bank transfer, JazzCash/EasyPaisa ya cash se manage ho sakti hai.',
    },
    {
      match: ['location', 'studio', 'address', 'karachi'],
      answer:
        'Studio/session details booking ke waqt confirm hoti hain. Aap city aur preferred date/time send kar dein.',
    },
  ],
};

const seedLeads = [
  {
    id: 'L-1001',
    name: 'Demo Podcast Lead',
    phone: '+92 300 4112277',
    source: 'WhatsApp',
    service: 'Podcasting',
    city: 'Karachi',
    status: 'New',
    score: 82,
    label: 'Hot',
    message: 'Podcast recording slot and pricing required.',
    createdAt: new Date().toISOString(),
    nextFollowupAt: addDaysIso(2),
  },
  {
    id: 'L-1002',
    name: 'Demo Brand Lead',
    phone: '+92 321 8800955',
    source: 'Meta',
    service: 'Cinematography',
    city: 'Lahore',
    status: 'Qualified',
    score: 68,
    label: 'Warm',
    message: 'Brand shoot and reels package.',
    createdAt: new Date().toISOString(),
    nextFollowupAt: addDaysIso(4),
  },
];

const seedUsers = [
  {
    id: 'U-OWNER',
    name: 'Raza Productions Owner',
    email: 'owner@razaproductions.com',
    role: 'Owner',
    passwordHash: hashSecret('raza2026'),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'U-SALES',
    name: 'Sales Team',
    email: 'sales@razaproductions.com',
    role: 'Sales',
    passwordHash: hashSecret('sales2026'),
    createdAt: new Date().toISOString(),
  },
];

const seedTemplates = [
  { id: 'welcome', name: 'Welcome', category: 'UTILITY', language: 'en', status: 'draft', body: 'Assalam o Alaikum {{name}}. Raza Productions mein welcome. Aap kis service ke bare mein janna chahte hain?' },
  { id: 'follow_up', name: 'Lead follow-up', category: 'MARKETING', language: 'en', status: 'draft', body: 'Assalam o Alaikum {{name}}. Aapki {{service}} requirement par follow-up kar rahe hain. Kya aap details discuss karna chahenge?' },
];

const seedQuickReplies = [
  { id: 'welcome', label: 'Welcome', text: 'Assalam o Alaikum! Raza Productions mein welcome. Aap kis service ke bare mein maloomat chahte hain?' },
  { id: 'details', label: 'Get details', text: 'Bilkul. Aap apni requirement, preferred date aur contact number share kar dein. Team aapko details confirm karegi.' },
  { id: 'followup', label: 'Follow-up', text: 'Assalam o Alaikum. Aapki requirement par follow-up kar rahe hain. Kya aap is project ko continue karna chahenge?' },
  { id: 'thanks', label: 'Thank you', text: 'Shukriya! Aapka message receive ho gaya hai. Raza Productions team jald aapse contact karegi.' },
];

function addDaysIso(days, start = Date.now()) {
  return new Date(new Date(start).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function hashSecret(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

async function database() {
  if (!DATABASE_URL) return null;
  if (!databasePromise) {
    databasePromise = (async () => {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(DATABASE_URL);
      await sql`CREATE TABLE IF NOT EXISTS razalead_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      return sql;
    })();
  }
  return databasePromise;
}

function storeKey(file) {
  return path.basename(file, '.json');
}

async function ensure(file, fallback) {
  const sql = await database();
  if (sql) {
    const key = storeKey(file);
    await sql`INSERT INTO razalead_state (key, value) VALUES (${key}, ${JSON.stringify(fallback)}::jsonb) ON CONFLICT (key) DO NOTHING`;
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  if (!existsSync(file)) await writeFile(file, JSON.stringify(fallback, null, 2));
}

async function readJson(file, fallback) {
  const key = storeKey(file);
  const cached = stateCache.get(key);
  if (cached?.value !== undefined && cached.expiresAt > Date.now()) return structuredClone(cached.value);
  if (cached?.promise) return structuredClone(await cached.promise);
  const promise = (async () => {
    await ensure(file, fallback);
    const sql = await database();
    if (sql) {
      const rows = await sql`SELECT value FROM razalead_state WHERE key = ${key}`;
      return rows[0]?.value ?? fallback;
    }
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch {
      return fallback;
    }
  })();
  stateCache.set(key, { promise, expiresAt: 0 });
  try {
    const value = await promise;
    stateCache.set(key, { value: structuredClone(value), expiresAt: Date.now() + STATE_CACHE_TTL_MS });
    return structuredClone(value);
  } catch (error) {
    stateCache.delete(key);
    throw error;
  }
}

async function writeJson(file, value) {
  const sql = await database();
  if (sql) {
    const key = storeKey(file);
    await sql`INSERT INTO razalead_state (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
    stateCache.set(key, { value: structuredClone(value), expiresAt: Date.now() + STATE_CACHE_TTL_MS });
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(value, null, 2));
  await rename(tempFile, file);
  stateCache.set(storeKey(file), { value: structuredClone(value), expiresAt: Date.now() + STATE_CACHE_TTL_MS });
}

async function audit(action, details = {}) {
  const items = await readJson(AUDIT_LOG, []);
  items.unshift({ id: randomUUID(), action, actor: cleanText(details.actor || 'system'), at: new Date().toISOString(), ...details });
  await writeJson(AUDIT_LOG, items.slice(0, 5000));
  return items[0];
}

async function getTemplates() {
  return readJson(TEMPLATES, seedTemplates);
}

async function getQuickReplies() {
  return readJson(QUICK_REPLIES, seedQuickReplies);
}

async function syncQuickReplies(input) {
  const incoming = Array.isArray(input.items) ? input.items : [];
  const current = await getQuickReplies();
  const merged = new Map(current.map((item) => [cleanText(item.id), item]));
  for (const item of incoming) {
    const id = cleanText(item.id || item.label).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const label = compact(item.label, 80);
    const text = compact(item.text, 3900);
    if (id && label && text) merged.set(id, { id, label, text, updatedAt: new Date().toISOString() });
  }
  const items = [...merged.values()].slice(0, 100);
  await writeJson(QUICK_REPLIES, items);
  return { ok: true, items };
}

async function removeQuickReply(input) {
  const id = cleanText(input.id);
  const items = (await getQuickReplies()).filter((item) => item.id !== id);
  await writeJson(QUICK_REPLIES, items);
  return { ok: true, items };
}

async function saveTemplate(input) {
  const templates = await getTemplates();
  const id = cleanText(input.id || input.name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (!id || !cleanText(input.name) || !cleanText(input.body)) return { ok: false, error: 'name and body required' };
  const item = {
    id,
    name: cleanText(input.name),
    category: cleanText(input.category || 'UTILITY').toUpperCase(),
    language: cleanText(input.language || 'en'),
    status: cleanText(input.status || 'draft').toLowerCase(),
    body: compact(input.body, 4096),
    updatedAt: new Date().toISOString(),
  };
  const index = templates.findIndex((template) => template.id === id);
  if (index >= 0) templates[index] = { ...templates[index], ...item };
  else templates.unshift(item);
  await writeJson(TEMPLATES, templates);
  await audit('template.saved', { actor: input.actor, templateId: id, templateName: item.name });
  return { ok: true, item, templates };
}

async function removeTemplate(input) {
  const id = cleanText(input.id);
  const templates = (await getTemplates()).filter((template) => template.id !== id);
  await writeJson(TEMPLATES, templates);
  await audit('template.removed', { actor: input.actor, templateId: id });
  return { ok: true, templates };
}

async function getCompetitors() {
  return readJson(COMPETITORS, []);
}

function competitorPlatform(url) {
  const value = cleanText(url).toLowerCase();
  if (value.includes('facebook.com')) return 'Facebook';
  if (value.includes('instagram.com')) return 'Instagram';
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube';
  return 'Website';
}

async function saveCompetitor(input) {
  const url = cleanText(input.url);
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'A complete Facebook, Instagram, YouTube or website URL is required.' };
  const items = await getCompetitors();
  const existing = items.find((item) => item.url.toLowerCase() === url.toLowerCase());
  const item = {
    id: existing?.id || randomUUID(),
    name: compact(input.name || new URL(url).hostname.replace(/^www\./, ''), 100),
    url,
    platform: competitorPlatform(url),
    niche: compact(input.niche || 'Creative Production', 100),
    active: input.active !== false,
    lastCheckedAt: existing?.lastCheckedAt || null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const next = [item, ...items.filter((row) => row.id !== item.id)].slice(0, 50);
  await writeJson(COMPETITORS, next);
  await audit('competitor.saved', { actor: input.actor || 'owner', competitorId: item.id, platform: item.platform });
  return { ok: true, item, items: next };
}

async function removeCompetitor(input) {
  const items = (await getCompetitors()).filter((item) => item.id !== cleanText(input.id));
  await writeJson(COMPETITORS, items);
  await audit('competitor.removed', { actor: input.actor || 'owner', competitorId: cleanText(input.id) });
  return { ok: true, items };
}

async function checkCompetitors() {
  const items = await getCompetitors();
  const checkedAt = new Date().toISOString();
  const next = items.map((item) => ({ ...item, lastCheckedAt: checkedAt }));
  await writeJson(COMPETITORS, next);
  return {
    ok: true,
    checkedAt,
    sources: next,
    note: 'Source list is ready. Public competitor post discovery requires approved platform access; links remain available for owner review.',
  };
}

async function getKnowledge() {
  const saved = await readJson(KNOWLEDGE_STORE, knowledge);
  return {
    ...knowledge,
    ...saved,
    brandIntro: saved.brandIntro || knowledge.brandIntro,
    services: Array.isArray(saved.services) && saved.services.length ? saved.services : knowledge.services,
    podcastSlots: Array.isArray(saved.podcastSlots) && saved.podcastSlots.length ? saved.podcastSlots : knowledge.podcastSlots,
    pricing: Array.isArray(saved.pricing) && saved.pricing.length ? saved.pricing : knowledge.pricing,
    faqs: Array.isArray(saved.faqs) && saved.faqs.length ? saved.faqs : knowledge.faqs,
    quickButtons: Array.isArray(saved.quickButtons) && saved.quickButtons.length ? saved.quickButtons : knowledge.quickButtons,
    knowledgePoints: Array.isArray(saved.knowledgePoints) && saved.knowledgePoints.length ? saved.knowledgePoints : knowledge.knowledgePoints,
  };
}

async function saveKnowledge(input) {
  const current = await getKnowledge();
  const next = {
    greeting: compact(input.greeting || current.greeting, 1200),
    portfolioUrl: compact(input.portfolioUrl || current.portfolioUrl || knowledge.portfolioUrl, 1000),
    services: normalizeServices(input.services || current.services),
    podcastSlots: normalizeLines(input.podcastSlots || current.podcastSlots),
    pricing: normalizeLines(input.pricing || current.pricing),
    faqs: normalizeFaqs(input.faqs || current.faqs),
    quickButtons: normalizeButtons(input.quickButtons || current.quickButtons),
    knowledgePoints: normalizeFaqs(input.knowledgePoints || current.knowledgePoints),
    updatedAt: new Date().toISOString(),
  };
  await writeJson(KNOWLEDGE_STORE, next);
  return next;
}

function normalizeLines(value) {
  if (Array.isArray(value)) return value.map((row) => compact(row, 260)).filter(Boolean);
  return String(value || '')
    .split('\n')
    .map((row) => compact(row, 260))
    .filter(Boolean);
}

function normalizeServices(value) {
  if (Array.isArray(value)) {
    return value
      .map((service, index) => ({
        id: cleanText(service.id || service.name || `service_${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: compact(service.name, 80),
        reply: compact(service.reply, 420),
      }))
      .filter((service) => service.name && service.reply);
  }
  return String(value || '')
    .split('\n')
    .map((row, index) => {
      const [name, ...rest] = row.split('|');
      const replyText = rest.join('|');
      return {
        id: cleanText(name || `service_${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: compact(name, 80),
        reply: compact(replyText, 420),
      };
    })
    .filter((service) => service.name && service.reply);
}

function normalizeFaqs(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        match: Array.isArray(item.match) ? item.match.map((word) => compact(word, 60)).filter(Boolean) : normalizeLines(item.match),
        answer: compact(item.answer, 600),
      }))
      .filter((item) => item.match.length && item.answer);
  }
  return String(value || '')
    .split('\n')
    .map((row) => {
      const [matches, ...rest] = row.split('=>');
      return {
        match: String(matches || '')
          .split(',')
          .map((word) => compact(word, 60))
          .filter(Boolean),
        answer: compact(rest.join('=>'), 600),
      };
    })
    .filter((item) => item.match.length && item.answer);
}

function normalizeButtons(value) {
  const reserved = new Set(['services', 'podcast', 'portfolio', 'pricing', 'handoff', 'ask']);
  if (Array.isArray(value)) {
    return value
      .map((button, index) => {
        const label = compact(button.label || button.id || `Button ${index + 1}`, 20);
        const rawId = compact(button.id || label || `button_${index + 1}`, 64);
        const id = reserved.has(rawId) ? rawId : cleanText(rawId).toLowerCase().replace(/[^a-z0-9]+/g, '_');
        return {
          id: id || `button_${index + 1}`,
          label,
          reply: compact(button.reply || '', 900),
        };
      })
      .filter((button) => button.id && button.label);
  }
  return String(value || '')
    .split('\n')
    .map((row, index) => {
      const [idOrLabel, labelOrReply, ...rest] = row.split('|').map((part) => compact(part, 900));
      const hasThreeParts = rest.length > 0;
      const idText = hasThreeParts ? idOrLabel : idOrLabel || `button_${index + 1}`;
      const labelText = hasThreeParts ? labelOrReply : idOrLabel;
      const replyText = hasThreeParts ? rest.join('|') : labelOrReply || '';
      const id = reserved.has(idText) ? idText : cleanText(idText).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      return {
        id: id || `button_${index + 1}`,
        label: compact(labelText, 20),
        reply: compact(replyText, 900),
      };
    })
    .filter((button) => button.id && button.label);
}

async function getMetaConfig() {
  const saved = await readJson(META_SETTINGS, {});
  return {
    graphVersion: saved.graphVersion || defaultMeta.graphVersion,
    phoneNumberId: saved.phoneNumberId || defaultMeta.phoneNumberId,
    accessToken: saved.accessToken || defaultMeta.accessToken,
    wabaId: saved.wabaId || defaultMeta.wabaId,
  };
}

async function saveMetaConfig(input) {
  const current = await readJson(META_SETTINGS, {});
  const next = {
    graphVersion: cleanText(input.graphVersion || current.graphVersion || defaultMeta.graphVersion),
    phoneNumberId: cleanText(input.phoneNumberId || current.phoneNumberId || defaultMeta.phoneNumberId),
    wabaId: cleanText(input.wabaId || current.wabaId || defaultMeta.wabaId),
    accessToken: cleanText(input.accessToken || current.accessToken || defaultMeta.accessToken),
    updatedAt: new Date().toISOString(),
  };
  await writeJson(META_SETTINGS, next);
  return {
    graphVersion: next.graphVersion,
    phoneNumberId: next.phoneNumberId ? 'configured' : 'missing',
    wabaId: next.wabaId ? 'configured' : 'missing',
    accessToken: next.accessToken ? 'configured' : 'missing',
    updatedAt: next.updatedAt,
  };
}

function headers(type = 'application/json') {
  return {
    'content-type': type,
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, headers(type));
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function cronAuthorized(req) {
  if (!process.env.VERCEL) return true;
  const secret = process.env.CRON_SECRET || '';
  return Boolean(secret) && req.headers.authorization === `Bearer ${secret}`;
}

function sendDownload(res, body, type, filename) {
  res.writeHead(200, { ...headers(type), 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'private, no-store' });
  res.end(body);
}

async function getBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { text: raw };
  }
}

function cleanText(value) {
  return String(value || '').trim();
}

function compact(value, max = 3800) {
  return cleanText(value).slice(0, max);
}

function serviceListText(kb = knowledge) {
  return (
    'Raza Productions services:\n' +
    kb.services.map((service, index) => `${index + 1}. ${service.name}`).join('\n') +
    '\n\nNeeche list se required service choose karein.'
  );
}

function serviceButtons(kb = knowledge) {
  return kb.services.slice(0, 10).map((service) => ({ id: `service_${service.id}`, label: service.name }));
}

function podcastText(kb = knowledge) {
  return (
    'Podcast booking ke liye available slots:\n' +
    kb.podcastSlots.join('\n') +
    '\n\nConfirm karne ke liye apna name, preferred day/time, episode type aur guest count send kar dein.'
  );
}

function pricingText(kb = knowledge) {
  return 'Podcast packages:\n' + kb.pricing.map((row, index) => `${index + 1}. ${row}`).join('\n');
}

function buttonsMain(kb = knowledge) {
  const buttons = Array.isArray(kb.quickButtons) && kb.quickButtons.length ? kb.quickButtons : knowledge.quickButtons;
  const preferred = ['services', 'portfolio', 'podcast']
    .map((id) => buttons.find((button) => button.id === id) || knowledge.quickButtons.find((button) => button.id === id))
    .filter(Boolean);
  return preferred.map((button) => ({ id: button.id, label: button.label }));
}

function reply(text, buttons = buttonsMain()) {
  return { text: compact(text), buttons };
}

function detectService(text, kb = knowledge) {
  const input = cleanText(text).toLowerCase();
  const direct = kb.services.find((service) => input.includes(service.name.toLowerCase()));
  if (direct) return direct.name;
  const checks = [
    ['podcast', 'Podcasting'],
    ['recording', 'Studio Recording'],
    ['studio', 'Studio Recording'],
    ['ai video', 'AI Videos'],
    ['ai content', 'AI Videos'],
    ['photography', 'Photography'],
    ['photo', 'Photography'],
    ['wedding', 'Wedding Production'],
    ['graphic', 'Graphic Design'],
    ['design', 'Graphic Design'],
    ['social', 'Social Media Management'],
    ['reel', 'Video Editing'],
    ['editing', 'Video Editing'],
    ['video', 'Video Editing'],
    ['shoot', 'Cinematography'],
    ['cinematography', 'Cinematography'],
    ['event', 'Cinematography'],
    ['live', 'Live Streaming'],
    ['stream', 'Live Streaming'],
  ];
  return checks.find(([keyword]) => input.includes(keyword))?.[1] || 'General inquiry';
}

function detectIntent(text, explicitIntent) {
  if (explicitIntent) return explicitIntent;
  const input = cleanText(text).toLowerCase();
  if (!input) return 'start';
  if (input.match(/\b(thanks|thank you|shukriya|jazak|jazakallah|nice|great|ok|okay)\b/)) return 'thanks';
  if (input.match(/\b(bye|goodbye|allah hafiz|khuda hafiz|phir milte|see you)\b/)) return 'bye';
  if (input.match(/kaise ho|kaisay ho|kese ho|how are you|kia haal|kya haal|tabiyat/)) return 'how_are_you';
  if (input.match(/naam kya|tumhara naam|who are you|ap kon|aap kon|kaun ho/)) return 'identity';
  if (input.match(/joke|mazak|hansao|funny|bored/)) return 'light_chat';
  if (input.match(/mood|tension|pareshan|confused|samajh nahi|samajh nahin|idea chahiye|idea do|help me think/)) return 'supportive';
  if (input.match(/content idea|video idea|reel idea|caption|script idea|topic idea|creative idea|ideas do|suggestion/)) return 'creative_ideas';
  if (input.match(/weather|news|score|rate today|aaj ka rate|latest/)) return 'live_info';
  if (input.match(/service|services|kaam|what do you|kya karte|available/)) return 'services';
  if (input.match(/podcast|slot|book|booking|time|date|appointment/)) return 'podcast';
  if (input.match(/price|pricing|package|rate|charges|cost|budget/)) return 'pricing';
  if (input.match(/portfolio|sample|work|website/)) return 'portfolio';
  if (input.match(/confirm|lead|call|contact|quote|proposal/)) return 'handoff';
  if (input.match(/location|located|address|kahan|kidhar|studio/)) return 'location';
  if (input.match(/\b(hi|hello|salam|assalam|start)\b/)) return 'start';
  return 'ask';
}

function answerQuestion(text, explicitIntent, kb = knowledge) {
  const intent = detectIntent(text, explicitIntent);
  const customButton = (kb.quickButtons || []).find((button) => button.id === explicitIntent && button.reply);
  if (customButton) return reply(customButton.reply, buttonsMain(kb));
  if (intent === 'start') return reply(kb.greeting, buttonsMain(kb));
  if (intent === 'thanks') {
    return reply('Shukriya. Neeche se option select kar dein.', buttonsMain(kb));
  }
  if (intent === 'bye') {
    return reply('Allah Hafiz. Zaroorat ho to menu se option select kar dein.', buttonsMain(kb));
  }
  if (intent === 'how_are_you') {
    return reply('Raza Productions menu ready hai. Please neeche se option choose kar dein.', buttonsMain(kb));
  }
  if (intent === 'identity') {
    return reply('Main Raza Productions ka option-based WhatsApp assistant hoon. Please neeche se option select karein.', buttonsMain(kb));
  }
  if (intent === 'light_chat') {
    return reply('Yeh assistant sirf Raza Productions ke options ke liye hai. Please menu se option choose karein.', buttonsMain(kb));
  }
  if (intent === 'supportive') {
    return reply('Planning ke liye pehle service select karein. Team details ke baad guide kar degi.', buttonsMain(kb));
  }
  if (intent === 'creative_ideas') {
    return reply('Creative ideas ke liye pehle required service select karein: video editing, social media, podcast ya design.', buttonsMain(kb));
  }
  if (intent === 'live_info') {
    return reply('Live/random info available nahi hai. Please Raza Productions ke options me se choose karein.', buttonsMain(kb));
  }
  if (intent === 'services') return reply(serviceListText(kb), buttonsMain(kb));
  if (intent === 'podcast') return reply(podcastText(kb), [
    { id: 'pricing', label: 'Pricing' },
    { id: 'handoff', label: 'Confirm Lead' },
    { id: 'portfolio', label: 'Portfolio' },
  ]);
  if (intent === 'pricing') return reply('Fixed packages sirf Podcast booking ke liye available hain. Doosri services ka quote requirement ke mutabiq customize hota hai.', [
    { id: 'podcast_pricing', label: 'Podcast Packages' },
    { id: 'services', label: 'Choose Service' },
    { id: 'portfolio', label: 'Portfolio' },
  ]);
  if (intent === 'portfolio') {
    return reply(
      'Portfolio: https://razaproductions.com\nAap bata dein aapko kis type ka work dekhna hai: podcast, graphic design, video editing, studio recording, cinematography ya live streaming.',
      [
        { id: 'services', label: 'Services' },
        { id: 'pricing', label: 'Pricing' },
        { id: 'handoff', label: 'Confirm Lead' },
      ],
    );
  }
  if (intent === 'location') {
    return reply(
      'Raza Productions ka studio/session detail booking ke waqt confirm hota hai. Aap city, required service aur preferred date/time send kar dein; team nearest/available setup confirm karegi.',
      [
        { id: 'services', label: 'Services' },
        { id: 'podcast', label: 'Book Podcast' },
        { id: 'handoff', label: 'Confirm Lead' },
      ],
    );
  }
  if (intent === 'handoff') {
    return reply(
      'Lead confirm karne ke liye please ye details send kar dein: name, service, city, preferred date/time, rough budget. Team aapko next step confirm karegi.',
      [
        { id: 'services', label: 'Services' },
        { id: 'podcast', label: 'Book Podcast' },
      ],
    );
  }

  const input = cleanText(text).toLowerCase();
  const allKnowledgePoints = [...(kb.knowledgePoints || []), ...(kb.faqs || [])];
  const faq = allKnowledgePoints.find((item) => item.match.some((word) => input.includes(word)));
  if (faq) return reply(faq.answer, buttonsMain(kb));

  const service = kb.services.find((item) => input.includes(item.name.toLowerCase().split(' ')[0]));
  if (service) return reply(`${service.name}: ${service.reply}\n\nAap date, city aur required deliverables send kar dein.`, buttonsMain(kb));

  return reply(
    'Please neeche se option select karein. Yeh assistant sirf Raza Productions services, podcast booking, portfolio, pricing aur lead confirmation ke liye hai.',
    buttonsMain(kb),
  );
}

function compactLines(items, mapper) {
  return (items || []).map(mapper).filter(Boolean).join('\n');
}

function knowledgeForAi(kb) {
  return [
    `Business: ${business.name}`,
    `WhatsApp: ${business.whatsapp}`,
    `Greeting: ${kb.greeting}`,
    'Services:',
    compactLines(kb.services, (service) => `- ${service.name}: ${service.reply}`),
    'Podcast slots:',
    compactLines(kb.podcastSlots, (slot) => `- ${slot}`),
    'Pricing:',
    compactLines(kb.pricing, (price) => `- ${price}`),
    'Extra knowledge:',
    compactLines(kb.knowledgePoints, (point) => `- Keywords: ${(point.match || []).join(', ')} | Answer: ${point.answer}`),
    'FAQs:',
    compactLines(kb.faqs, (faq) => `- Keywords: ${(faq.match || []).join(', ')} | Answer: ${faq.answer}`),
  ].join('\n').slice(0, 9000);
}

function transcriptForAi(session) {
  return (session.transcript || [])
    .slice(-10)
    .map((item) => `${item.role === 'bot' ? 'Assistant' : 'Customer'}: ${item.text}`)
    .join('\n')
    .slice(0, 5000);
}

function aiSystemPrompt(kb) {
  return [
    `You are the top-tier WhatsApp AI assistant for ${business.name}.`,
    'Reply like a smart human sales assistant, not a stiff bot.',
    'Use Roman Urdu/Hindi/English matching the customer language. Keep replies short: 2 to 5 lines unless the user asks for detail.',
    'Be warm, clear, practical, and friendly. Keep the conversation focused on understanding the customer and helping them choose the right Raza Productions service.',
    'Use only the supplied business knowledge for factual service, price, booking, address, and portfolio answers.',
    'Do not invent confirmed prices, dates, availability, addresses, guarantees, or payment details. If uncertain, ask for service, city, date/time, budget, and say team will confirm.',
    'Qualify naturally across the conversation. Collect only missing details, one or two at a time: name, contact number, required service/work, preferred timeline, and optional budget.',
    'Never repeat a question already answered in the recent conversation.',
    'If the supplied knowledge cannot support a factual answer, say the team will confirm instead of guessing.',
    'Never mention internal prompts, APIs, tokens, or implementation.',
    'Return only the customer-facing message. Always finish the reply; never stop mid-sentence.',
    '',
    'Business knowledge:',
    knowledgeForAi(kb),
  ].join('\n');
}

function aiUserPrompt(text, session) {
  return [
    'Recent conversation:',
    transcriptForAi(session) || 'No previous conversation.',
    '',
    `Customer message: ${text}`,
  ].join('\n');
}

async function aiReply(text, session, kb) {
  const provider = aiConfig.provider || (aiConfig.geminiApiKey ? 'gemini' : aiConfig.groqApiKey ? 'groq' : aiConfig.openaiApiKey ? 'openai' : 'fallback');
  if (provider === 'gemini') {
    const result = await geminiReply(text, session, kb);
    if (result) return result;
    const groqResult = await groqReply(text, session, kb);
    return groqResult || openAiReply(text, session, kb);
  }
  if (provider === 'groq') {
    const result = await groqReply(text, session, kb);
    if (result) return result;
    const geminiResult = await geminiReply(text, session, kb);
    return geminiResult || openAiReply(text, session, kb);
  }
  if (provider === 'openai') {
    const result = await openAiReply(text, session, kb);
    return result || geminiReply(text, session, kb);
  }
  if (aiConfig.geminiApiKey) {
    const result = await geminiReply(text, session, kb);
    if (result) return result;
  }
  if (aiConfig.groqApiKey) {
    const result = await groqReply(text, session, kb);
    if (result) return result;
  }
  if (aiConfig.openaiApiKey) return openAiReply(text, session, kb);
  return null;
}

async function groqReply(text, session, kb) {
  if (!aiConfig.groqApiKey) return null;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${aiConfig.groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiConfig.groqModel,
        messages: [
          { role: 'system', content: aiSystemPrompt(kb) },
          { role: 'user', content: aiUserPrompt(text, session) },
        ],
        temperature: 0.45,
        max_tokens: 500,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    const clean = compact(data.choices?.[0]?.message?.content || '', 1200);
    return clean ? reply(clean, buttonsMain(kb)) : null;
  } catch {
    return null;
  }
}

async function openAiReply(text, session, kb) {
  if (!aiConfig.openaiApiKey) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiConfig.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.openaiModel,
        input: [
          { role: 'system', content: aiSystemPrompt(kb) },
          { role: 'user', content: aiUserPrompt(text, session) },
        ],
        max_output_tokens: 260,
        temperature: 0.45,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    const textOutput =
      data.output_text ||
      data.output?.flatMap((item) => item.content || [])
        ?.map((content) => content.text || '')
        ?.join('\n') ||
      '';
    const clean = compact(textOutput, 1200);
    return clean ? reply(clean, buttonsMain(kb)) : null;
  } catch {
    return null;
  }
}

async function geminiReply(text, session, kb) {
  if (!aiConfig.geminiApiKey) return null;
  const models = [...new Set([aiConfig.geminiModel, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(Boolean))];
  for (const candidate of models) {
   try {
    const model = encodeURIComponent(candidate);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(aiConfig.geminiApiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: aiSystemPrompt(kb) }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: aiUserPrompt(text, session) }],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 700,
        },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) continue;
    const textOutput = extractGeminiText(data);
    const clean = compact(textOutput, 1200);
    if (clean) return reply(clean, buttonsMain(kb));
   } catch {
    // Try the next compatible Gemini model before falling back to verified knowledge.
   }
  }
  return null;
}

async function geminiHealth() {
  if (!aiConfig.geminiApiKey) return { ok: false, configured: false, error: 'GEMINI_API_KEY missing' };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(aiConfig.geminiApiKey)}`);
    const data = await response.json().catch(() => ({}));
    const available = (data.models || []).map((item) => item.name?.replace('models/', '')).filter(Boolean);
    const generationResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiConfig.geminiModel)}:generateContent?key=${encodeURIComponent(aiConfig.geminiApiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: Raza AI OK' }] }], generationConfig: { maxOutputTokens: 40 } }),
    });
    const generationData = await generationResponse.json().catch(() => ({}));
    return {
      ok: response.ok,
      configured: true,
      status: response.status,
      error: data.error?.message || '',
      configuredModel: aiConfig.geminiModel,
      modelAvailable: available.includes(aiConfig.geminiModel),
      compatibleModels: available.filter((name) => /gemini.*flash/i.test(name)).slice(0, 8),
      generation: {
        ok: generationResponse.ok,
        status: generationResponse.status,
        error: generationData.error?.message || '',
        text: compact(extractGeminiText(generationData), 80),
        finishReason: generationData.candidates?.[0]?.finishReason || '',
      },
    };
  } catch (error) {
    return { ok: false, configured: true, status: 0, error: error.message };
  }
}

async function aiHealth() {
  if (aiConfig.provider === 'groq' && aiConfig.groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${aiConfig.groqApiKey}` } });
      const data = await response.json().catch(() => ({}));
      const models = (data.data || []).map((item) => item.id).filter(Boolean);
      return { ok: response.ok, configured: true, provider: 'groq', status: response.status, model: aiConfig.groqModel, modelAvailable: models.includes(aiConfig.groqModel), compatibleModels: models.slice(0, 12), error: data.error?.message || '' };
    } catch (error) {
      return { ok: false, configured: true, provider: 'groq', status: 0, error: error.message };
    }
  }
  const gemini = await geminiHealth();
  return { ...gemini, provider: 'gemini' };
}

function extractGeminiText(data) {
  const fromBlocks = (blocks) => (blocks || [])
    .flatMap((block) => block.parts || block.content || block.output || block.text || [])
    .map((part) => (typeof part === 'string' ? part : part.text || part.output_text || ''))
    .filter(Boolean)
    .join('\n');

  const direct = data.output_text || data.outputText || data.text || '';
  const candidates = data.candidates?.map((candidate) => fromBlocks([candidate.content])).join('\n') || '';
  const steps = (data.steps || [])
    .map((step) => step.output_text || step.outputText || fromBlocks(step.content || step.output || step.response || []))
    .filter(Boolean)
    .join('\n');
  const output = fromBlocks(data.output || data.response || []);
  return [direct, candidates, steps, output].filter(Boolean).join('\n').trim();
}

async function answerQuestionSmart(text, explicitIntent, kb, session) {
  if (String(explicitIntent || '').startsWith('meeting_slot_')) {
    const timestamp = Number(String(explicitIntent).replace('meeting_slot_', ''));
    const selectedAt = new Date(timestamp);
    if (Number.isFinite(selectedAt.getTime())) {
      session.meetingSelection = selectedAt.toISOString();
      session.needsHuman = true;
      return { ...reply(`Aapne ${meetingSlotLabel(selectedAt)} select kiya hai. Raza Productions team availability confirm karke final meeting confirmation bhejegi.`, []), registerLead: true, service: session.flow?.service || 'Meeting' };
    }
  }
  if (explicitIntent === 'start' || (!explicitIntent && detectIntent(text) === 'start')) session.flow = null;
  const flow = session.flow || {};
  if (flow.step === 'awaiting_service_form' && !explicitIntent) {
    const formText = cleanText(text);
    const field = (label, nextLabel) => {
      const pattern = new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabel})\\s*:|$)`, 'i');
      return cleanText(formText.match(pattern)?.[1]);
    };
    const labelledName = field('name', 'contact(?: number)?');
    const labelledContact = field('contact(?: number)?', '$^');
    const phoneMatch = formText.match(/(?:\+?92|0)?3[\d\s-]{9,14}/);
    const typedPhone = cleanText(labelledContact || phoneMatch?.[0] || '').replace(/[^0-9+]/g, '');
    const whatsappPhone = cleanText(session.phone || '').replace(/[^0-9+]/g, '');
    const contactNumber = typedPhone || whatsappPhone;
    const plainName = cleanText(formText
      .replace(phoneMatch?.[0] || '', '')
      .replace(/(?:name|contact(?: number)?)\s*:/gi, '')
      .split('\n').map(cleanText).filter(Boolean)[0]);
    const sessionName = cleanText(session.name || '');
    const usefulSessionName = sessionName && sessionName !== session.phone && !/^\+?\d+$/.test(sessionName) ? sessionName : '';
    const name = labelledName || plainName || usefulSessionName || 'WhatsApp Customer';
    if (!contactNumber) {
      return reply('Aapka naam receive ho gaya. Bas apna contact number bhej dein; spaces ya dashes ke sath bhi chalega.', []);
    }
    const completed = { ...flow, step: 'awaiting_confirmation', name, contactNumber };
    session.flow = completed;
    return {
      ...reply(`Details save ho gayi hain. Agar sab theek hai to Confirm karein:\n\nService: ${completed.service}\nName: ${completed.name}\nContact: ${completed.contactNumber}`, [
      { id: 'submit_quote', label: 'Confirm' },
      { id: 'edit_quote', label: 'Edit Details' },
      { id: 'services', label: 'Cancel' },
      ]),
      registerLead: true,
      service: completed.service,
      leadDetails: { name: completed.name, contactNumber: completed.contactNumber, message: `${completed.service} inquiry received; confirmation pending` },
    };
  }
  if (flow.step === 'awaiting_confirmation' && explicitIntent === 'edit_quote') {
    session.flow = { type: 'service', step: 'awaiting_service_form', service: flow.service };
    return reply('Details dobara ek message mein fill karein:\n\nName:\nContact number:', []);
  }
  if (flow.step === 'awaiting_confirmation' && (['submit_quote', 'confirm_lead'].includes(explicitIntent) || (!explicitIntent && /^(ok|okay|yes|han|haan|confirm|submit|done|theek|sahi)/i.test(cleanText(text))))) {
    session.flow = null;
    return {
      ...reply(`Shukriya ${flow.name}. Aapki ${flow.service} request submit ho gayi hai. Raza Productions team aapse jald call/message par contact karegi.`, [
        { id: 'services', label: 'More Services' },
        { id: 'portfolio', label: 'Portfolio' },
      ]),
      registerLead: true,
      service: flow.service,
      leadDetails: {
        name: flow.name,
        contactNumber: flow.contactNumber,
        message: `${flow.service} inquiry submitted`,
      },
    };
  }
  if (flow.step === 'awaiting_podcast_details' && !explicitIntent) {
    session.flow = null;
    return {
      ...reply('Shukriya. Podcast booking request receive ho gayi hai. Team availability aur final confirmation ke liye aapko call/message karegi.', [
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'services', label: 'More Services' },
      ]),
      registerLead: true,
      service: 'Podcasting',
    };
  }
  if (String(explicitIntent || '').startsWith('service_')) {
    const serviceId = String(explicitIntent).slice('service_'.length);
    const service = kb.services.find((item) => item.id === serviceId);
    if (service) {
      if (service.id === 'podcasting') {
        session.flow = { type: 'podcast', step: 'slots_shown', service: 'Podcasting' };
        return reply(`${service.name} selected. Podcast booking aur availability yahan complete karein: ${PODCAST_BOOKING_URL}`, [
          { id: 'podcast_pricing', label: 'Pricing' },
          { id: 'podcast_confirm', label: 'Confirm Booking' },
          { id: 'portfolio', label: 'Portfolio' },
        ]);
      }
      session.flow = { type: 'service', step: 'service_selected', service: service.name };
      return reply(`${service.name} selected. Quote requirement ke mutabiq customize hota hai.`, [
        { id: 'get_quote', label: 'Get Quote' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'services', label: 'Change Service' },
      ]);
    }
  }
  if (explicitIntent === 'get_quote') {
    const service = flow.service || detectService(text, kb);
    session.flow = { type: 'service', step: 'awaiting_service_form', service };
    return reply(`${service} ke liye dono details ek hi message mein fill karein:\n\nName:\nContact number:`, []);
  }
  if (explicitIntent === 'podcast_pricing' || (flow.type === 'podcast' && !explicitIntent && detectIntent(text) === 'pricing')) {
    session.flow = { type: 'podcast', step: 'pricing_shown', service: 'Podcasting' };
    return reply(pricingText(kb), [
      { id: 'podcast_confirm', label: 'Confirm Booking' },
      { id: 'portfolio', label: 'Portfolio' },
      { id: 'podcast', label: 'Check Slots' },
    ]);
  }
  if (explicitIntent === 'podcast_confirm') {
    session.flow = { type: 'podcast', step: 'awaiting_podcast_details', service: 'Podcasting' };
    return reply('Please ek message mein details send karein:\nName:\nPreferred day/time:\nPackage:\nGuest count:\nEpisode topic/type:\n\nTeam final confirmation ke liye contact karegi.', []);
  }
  const inferredIntent = detectIntent(text, explicitIntent);
  const keepStructuredMenu = ['start', 'services', 'portfolio', 'podcast'].includes(inferredIntent);
  if (!explicitIntent && !session.flow && !keepStructuredMenu) {
    const generated = await aiReply(text, session, kb);
    if (generated) return { ...generated, aiGenerated: true };
  }
  const customButton = (kb.quickButtons || []).find((button) => button.id === explicitIntent && button.reply);
  if (customButton) return reply(customButton.reply, buttonsMain(kb));
  if (explicitIntent === 'services' || detectIntent(text, explicitIntent) === 'services') return reply(serviceListText(kb), serviceButtons(kb));
  if (explicitIntent === 'podcast' || (!explicitIntent && detectIntent(text) === 'podcast')) {
    session.flow = { type: 'podcast', step: 'slots_shown', service: 'Podcasting' };
    return reply(`${podcastText(kb)} Direct booking: ${PODCAST_BOOKING_URL}`, [
      { id: 'podcast_pricing', label: 'Pricing' },
      { id: 'podcast_confirm', label: 'Confirm Booking' },
      { id: 'portfolio', label: 'Portfolio' },
    ]);
  }
  if (explicitIntent === 'portfolio' || (!explicitIntent && detectIntent(text) === 'portfolio')) {
    return reply(`Raza Productions portfolio:\n${kb.portfolioUrl || knowledge.portfolioUrl}\n\nIs link mein hamari work categories aur samples available hain.`, [
      { id: 'services', label: 'Services' },
      { id: 'podcast', label: 'Book Podcast' },
      { id: 'handoff', label: 'Contact Team' },
    ]);
  }
  if (!explicitIntent && detectIntent(text) === 'ask') {
    const generated = await aiReply(text, session, kb);
    if (generated) return { ...generated, aiGenerated: true };
    const result = answerQuestion(text, explicitIntent, kb);
    return {
      ...result,
      text: kb.humanHandoffMessage || knowledge.humanHandoffMessage,
      buttons: [{ id: 'services', label: 'Services' }, { id: 'portfolio', label: 'Portfolio' }],
      needsHuman: true,
      unresolvedQuestion: cleanText(text),
    };
  }
  return answerQuestion(text, explicitIntent, kb);
}

function learningKeywords(question) {
  const stop = new Set(['what','when','where','which','with','this','that','your','have','from','kya','kia','hai','hain','ka','ki','ke','ko','mein','main','aur','par','se','mujhe','ap','aap']);
  return [...new Set(cleanText(question).toLowerCase().match(/[a-z0-9]{3,}/g) || [])].filter((word) => !stop.has(word)).slice(0, 6);
}

async function registerUnresolved(phone, name, question) {
  const items = await readJson(UNRESOLVED, []);
  const existing = items.find((item) => item.phone === phone && item.question.toLowerCase() === question.toLowerCase() && item.status === 'open');
  if (existing) return existing;
  const item = { id: randomUUID(), phone, name, question, status: 'open', createdAt: new Date().toISOString() };
  items.unshift(item);
  await writeJson(UNRESOLVED, items.slice(0, 2000));
  await audit('bot.human_help_requested', { phone, question, unresolvedId: item.id });
  return item;
}

async function learnFromHumanReply(phone, answer) {
  const items = await readJson(UNRESOLVED, []);
  const item = items.find((entry) => entry.phone === phone && entry.status === 'open');
  if (!item || !answer) return null;
  item.status = 'answered'; item.answer = answer; item.answeredAt = new Date().toISOString();
  await writeJson(UNRESOLVED, items);
  const kb = await getKnowledge();
  const match = learningKeywords(item.question);
  if (match.length) {
    const duplicate = (kb.knowledgePoints || []).some((point) => point.answer === answer);
    if (!duplicate) await saveKnowledge({ knowledgePoints: [...(kb.knowledgePoints || []), { match, answer, learnedFrom: 'human_reply', learnedAt: item.answeredAt }] });
  }
  await audit('bot.knowledge_learned', { phone, unresolvedId: item.id, match });
  return item;
}

function hasCommercialSignal(text, service) {
  const input = cleanText(text).toLowerCase();
  const serviceKnown = service && service !== 'General inquiry';
  const seriousWords = input.match(/book|booking|confirm|urgent|today|tomorrow|date|slot|quote|price|pricing|package|budget|shoot|podcast|recording|video|event|stream|reels|design|editing|proposal/);
  return Boolean(serviceKnown && seriousWords);
}

function scoreLead(input) {
  const text = `${input.message || ''} ${input.text || ''} ${input.service || ''}`.toLowerCase();
  let score = 35;
  if (input.phone && input.phone !== 'Unknown') score += 10;
  if (input.city && input.city !== 'Not set') score += 8;
  if (input.service && input.service !== 'General inquiry') score += 12;
  if (input.budget || input.value) score += 12;
  if (text.match(/book|booking|confirm|urgent|today|tomorrow|date|slot|quote|price|package|budget/)) score += 18;
  if (text.match(/podcast|wedding|event|shoot|recording|stream|reels|video/)) score += 10;
  if (text.match(/just asking|later|maybe/)) score -= 10;
  return Math.max(5, Math.min(100, score));
}

function leadScoreReasons(lead) {
  const reasons = [];
  if (Number(lead.value || 0) >= 100000) reasons.push('Budget High');
  else if (Number(lead.value || 0) > 0) reasons.push('Budget Shared');
  if (lead.preferredDate) reasons.push('Timeline Confirmed');
  if (lead.phone && lead.phone !== 'Unknown') reasons.push('Contact Available');
  if (lead.service && lead.service !== 'General inquiry') reasons.push(`Service: ${lead.service}`);
  if (cleanText(lead.message).length >= 25) reasons.push('Detailed Requirement');
  return reasons.length ? reasons : ['New lead - qualification pending'];
}

function enrichLead(lead) {
  return { ...lead, aiScore: Number(lead.score || 0), scoreReasons: leadScoreReasons(lead) };
}

function labelForScore(score) {
  if (score >= 75) return 'Hot';
  if (score >= 50) return 'Warm';
  return 'New';
}

function followupPlanForScore(score, createdAt) {
  if (score >= 75) {
    return [
      { day: 2, stage: 'First follow-up', messageType: 'booking_help' },
      { day: 4, stage: 'Second follow-up', messageType: 'portfolio_pricing' },
      { day: 7, stage: 'Final follow-up', messageType: 'close_or_archive' },
    ].map((step) => ({ ...step, dueAt: addDaysIso(step.day, createdAt) }));
  }
  if (score >= 50) {
    return [
      { day: 4, stage: 'First follow-up', messageType: 'portfolio_pricing' },
      { day: 7, stage: 'Second follow-up', messageType: 'close_or_archive' },
    ].map((step) => ({ ...step, dueAt: addDaysIso(step.day, createdAt) }));
  }
  return [{ day: 7, stage: 'Light follow-up', messageType: 'services_reminder', dueAt: addDaysIso(7, createdAt) }];
}

function followupPlanForDelay(delayMinutes, createdAt) {
  const mins = Number(delayMinutes);
  const safeMinutes = Number.isFinite(mins) ? Math.max(0, mins) : 0;
  return [{
    day: safeMinutes / (60 * 24),
    stage: safeMinutes === 0 ? 'Immediate follow-up' : `${safeMinutes} minute follow-up`,
    messageType: safeMinutes <= 10 ? 'booking_help' : 'portfolio_pricing',
    dueAt: new Date(Date.parse(createdAt) + safeMinutes * 60 * 1000).toISOString(),
  }];
}

function followupMessage(item) {
  if (item.messageType === 'booking_help') {
    return `Assalam o Alaikum ${item.name || ''}, Raza Productions se follow-up. Aap ${item.service || 'service'} ke liye booking/quote continue karna chahenge? Preferred date aur budget send kar dein.`;
  }
  if (item.messageType === 'portfolio_pricing') {
    return `Assalam o Alaikum ${item.name || ''}. Aap ke liye portfolio/pricing guide: https://razaproductions.com. Reply Services, Pricing ya Book Podcast for quick help.`;
  }
  if (item.messageType === 'close_or_archive') {
    return `Assalam o Alaikum ${item.name || ''}. Kya aap Raza Productions ke saath is inquiry ko continue karna chahenge? Reply Yes, Services, ya Book Podcast.`;
  }
  return `Assalam o Alaikum ${item.name || ''}. Raza Productions services: podcasting, video editing, studio recording, cinematography, live streaming, graphic design aur social media. Reply with your requirement.`;
}

async function scheduleFollowups(lead) {
  if (!lead.phone || lead.phone === 'Unknown') return [];
  const list = await readJson(FOLLOWUPS, []);
  const items = followupPlanForScore(lead.score, lead.createdAt).map((step, index) => followupItemFromLead(lead, step, index));
  const activeKeys = new Set(
    list
      .filter((item) => ['scheduled', 'needs_token_or_retry'].includes(item.status))
      .map((item) => `${item.phone}|${item.leadId}|${item.stage}`),
  );
  const freshItems = items.filter((item) => !activeKeys.has(`${item.phone}|${item.leadId}|${item.stage}`));
  if (freshItems.length) await writeJson(FOLLOWUPS, [...freshItems, ...list]);
  return freshItems;
}

function followupItemFromLead(lead, step, index = 0) {
  return {
    id: `F-${Date.now()}-${index}`,
    leadId: lead.id,
    phone: lead.phone,
    name: lead.name,
    service: lead.service,
    score: lead.score,
    label: lead.label,
    stage: step.stage,
    day: step.day,
    messageType: step.messageType,
    dueAt: step.dueAt,
    status: 'scheduled',
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
}

async function scheduleCustomFollowup(input) {
  const list = await readJson(FOLLOWUPS, []);
  const createdAt = new Date().toISOString();
  const phone = cleanText(input.phone || '');
  if (!phone) return [];
  const lead = {
    id: input.leadId || `L-${Date.now()}`,
    name: cleanText(input.name || phone || 'Follow-up lead'),
    phone,
    service: cleanText(input.service || 'General'),
    score: Number.isFinite(Number(input.score)) ? Number(input.score) : 50,
    label: input.label || labelForScore(Number(input.score) || 50),
  };
  const items = followupPlanForDelay(input.delayMinutes, createdAt).map((step, index) => ({
    ...followupItemFromLead(lead, step, index),
    createdAt,
  }));
  const duplicateKeys = new Set(
    list
      .filter((item) => item.status === 'scheduled')
      .map((item) => `${item.phone}|${item.stage}|${item.messageType}`),
  );
  const freshItems = items.filter((item) => !duplicateKeys.has(`${item.phone}|${item.stage}|${item.messageType}`));
  if (freshItems.length) await writeJson(FOLLOWUPS, [...freshItems, ...list]);
  return freshItems;
}

async function dueFollowups() {
  const now = Date.now();
  const list = await readJson(FOLLOWUPS, []);
  return list.filter((item) => item.status === 'scheduled' && new Date(item.dueAt).getTime() <= now);
}

function whatsappButtonPayload(to, text, buttons = []) {
  const allButtons = Array.isArray(buttons) ? buttons : [];
  if (allButtons.length > 3) {
    const rows = allButtons.slice(0, 10).map((button, index) => ({
      id: compact(button.id || `option_${index + 1}`, 200),
      title: compact(button.label || `Option ${index + 1}`, 24),
    })).filter((row) => row.id && row.title);
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: compact(text, 1024) },
        action: { button: 'Choose Service', sections: [{ title: 'Our Services', rows }] },
      },
    };
  }
  const cleanButtons = (Array.isArray(buttons) ? buttons : [])
    .slice(0, 3)
    .map((button, index) => ({
      type: 'reply',
      reply: {
        id: compact(button.id || button.label || `option_${index + 1}`, 256),
        title: compact(button.label || button.id || `Option ${index + 1}`, 20),
      },
    }))
    .filter((button) => button.reply.id && button.reply.title);

  if (!cleanButtons.length) {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: true, body: compact(text, 3900) },
    };
  }

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: compact(text, 1024) },
      action: { buttons: cleanButtons },
    },
  };
}

async function sendWhatsAppText(to, text, buttons = []) {
  return sendWhatsAppPayload(to, whatsappButtonPayload(normalizeWhatsAppNumber(to), text, buttons));
}

function normalizeWhatsAppNumber(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  if (/^0?3\d{9}$/.test(digits)) return `92${digits.replace(/^0/, '')}`;
  return digits;
}

async function sendWhatsAppPayload(to, payload) {
  const meta = await getMetaConfig();
  if (!meta.phoneNumberId || !meta.accessToken) return { sent: false, reason: 'Meta Cloud API env vars missing' };
  const cleanTo = normalizeWhatsAppNumber(to);
  if (!cleanTo) return { sent: false, reason: 'Recipient missing' };
  const url = `https://graph.facebook.com/${meta.graphVersion}/${meta.phoneNumberId}/messages`;
  const finalPayload = { ...payload, to: cleanTo, messaging_product: 'whatsapp' };
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${meta.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(finalPayload),
  });
  const json = await response.json().catch(() => ({}));
  return { sent: response.ok, status: response.status, response: json };
}

function whatsappManualPayload(input) {
  const type = cleanText(input.type || 'text').toLowerCase();
  const text = compact(input.text || input.caption || '', 3900);
  const mediaUrl = cleanText(input.mediaUrl || input.url || '');
  const filename = compact(input.filename || 'Raza-Productions-file', 120);
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  const locationName = compact(input.locationName || business.name, 100);
  const address = compact(input.address || '', 300);
  const contactName = compact(input.contactName || '', 200);
  const contactPhone = normalizeWhatsAppNumber(input.contactPhone || '');

  if (type === 'audio' && cleanText(input.mediaId || '')) {
    return { type: 'audio', audio: { id: cleanText(input.mediaId) } };
  }
  if (type === 'image' && cleanText(input.mediaId || '')) {
    return { type: 'image', image: { id: cleanText(input.mediaId), caption: compact(text, 1024) } };
  }
  if (type === 'video' && cleanText(input.mediaId || '')) {
    return { type: 'video', video: { id: cleanText(input.mediaId), caption: compact(text, 1024) } };
  }
  if (type === 'document' && cleanText(input.mediaId || '')) {
    return { type: 'document', document: { id: cleanText(input.mediaId), filename, caption: compact(text, 1024) } };
  }

  if (type === 'image' && mediaUrl) {
    return { type: 'image', image: { link: mediaUrl, caption: compact(text, 1024) } };
  }
  if (type === 'video' && mediaUrl) {
    return { type: 'video', video: { link: mediaUrl, caption: compact(text, 1024) } };
  }
  if (type === 'audio' && mediaUrl) {
    return { type: 'audio', audio: { link: mediaUrl } };
  }
  if (type === 'document' && mediaUrl) {
    return { type: 'document', document: { link: mediaUrl, filename, caption: compact(text, 1024) } };
  }
  if (type === 'location' && Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      type: 'location',
      location: {
        latitude: lat,
        longitude: lng,
        name: locationName,
        address,
      },
    };
  }
  if (type === 'contact' && contactName && contactPhone) {
    return {
      type: 'contacts',
      contacts: [{
        name: { formatted_name: contactName, first_name: contactName },
        phones: [{ phone: `+${contactPhone}`, wa_id: contactPhone, type: 'WORK' }],
      }],
    };
  }
  return {
    type: 'text',
    text: { preview_url: true, body: text || 'Raza Productions' },
  };
}

async function runDueFollowups() {
  const list = await readJson(FOLLOWUPS, []);
  const settings = await automationSettings();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }).format(new Date()));
  const quiet = settings.quietHoursStart > settings.quietHoursEnd
    ? hour >= settings.quietHoursStart || hour < settings.quietHoursEnd
    : hour >= settings.quietHoursStart && hour < settings.quietHoursEnd;
  if (!settings.whatsappEnabled || quiet) {
    return [{ skipped: true, reason: !settings.whatsappEnabled ? 'WhatsApp automation disabled' : 'Pakistan quiet hours active', due: (await dueFollowups()).length }];
  }
  const now = Date.now();
  const results = [];
  for (const item of list) {
    if (item.status !== 'scheduled' || new Date(item.dueAt).getTime() > now) continue;
    const delivery = await sendWhatsAppText(item.phone, followupMessage(item));
    item.attempts = Number(item.attempts || 0) + 1;
    item.lastAttemptAt = new Date().toISOString();
    item.lastDelivery = delivery;
    item.status = delivery.sent ? 'sent' : 'needs_token_or_retry';
    results.push({ followup: item, delivery });
  }
  await writeJson(FOLLOWUPS, list);
  return results;
}

async function addLead(input, fallbackSource = 'WhatsApp') {
  const leads = await readJson(LEADS, seedLeads);
  const kb = await getKnowledge();
  const createdAt = new Date().toISOString();
  const phone = cleanText(input.phone || input.from || 'Unknown');
  const service = cleanText(input.service || input.interest || detectService(input.message || input.text, kb));
  const score = scoreLead({ ...input, service });
  const message = cleanText(input.message || input.text || 'Incoming lead');
  const existingIndex = leads.findIndex((item) => cleanText(item.phone) === phone && phone !== 'Unknown');
  if (existingIndex >= 0) {
    const existing = leads[existingIndex];
    const history = Array.isArray(existing.history) ? existing.history : [];
    const updated = {
      ...existing,
      name: cleanText(input.name || input.profile_name || input.from || existing.name || 'Unknown lead'),
      source: cleanText(input.source || existing.source || fallbackSource),
      service: service || existing.service,
      city: cleanText(input.city || input.location || existing.city || 'Not set'),
      status: Math.max(Number(existing.score || 0), score) >= 75 ? 'Qualified' : existing.status || 'New',
      score: Math.max(Number(existing.score || 0), score),
      label: labelForScore(Math.max(Number(existing.score || 0), score)),
      value: Number(input.value || input.budget || existing.value || 0),
      budgetLabel: cleanText(input.budgetLabel || existing.budgetLabel || ''),
      preferredDate: cleanText(input.preferredDate || existing.preferredDate || ''),
      message,
      updatedAt: createdAt,
      lastMessageAt: createdAt,
      history: history.concat({
        message,
        service,
        source: cleanText(input.source || fallbackSource),
        score,
        at: createdAt,
      }),
    };
    leads.splice(existingIndex, 1);
    leads.unshift(updated);
    await writeJson(LEADS, leads);
    const followups = await scheduleFollowups(updated);
    return { ...updated, followups, preserved: true };
  }
  const lead = {
    id: `L-${Date.now()}`,
    name: cleanText(input.name || input.profile_name || input.from || 'Unknown lead'),
    phone,
    source: cleanText(input.source || fallbackSource),
    service,
    city: cleanText(input.city || input.location || 'Not set'),
    status: score >= 75 ? 'Qualified' : 'New',
    score,
    label: labelForScore(score),
    value: Number(input.value || input.budget || 0),
    budgetLabel: cleanText(input.budgetLabel || ''),
    preferredDate: cleanText(input.preferredDate || ''),
    message,
    createdAt,
    updatedAt: createdAt,
    lastMessageAt: createdAt,
    history: [{ message, service, source: cleanText(input.source || fallbackSource), score, at: createdAt }],
    nextFollowupAt: followupPlanForScore(score, createdAt)[0]?.dueAt || addDaysIso(7, createdAt),
  };
  leads.unshift(lead);
  await writeJson(LEADS, leads);
  const followups = await scheduleFollowups(lead);
  return { ...lead, followups };
}

function extractWhatsAppInbound(payload) {
  const value = payload.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const contact = value?.contacts?.[0];
  const status = value?.statuses?.[0];
  const messageType = message?.type || cleanText(payload.type || 'text');
  const media = message?.audio || message?.voice || message?.image || message?.video || message?.document || {};
  return {
    isMessage: Boolean(message || payload.text || payload.message),
    isStatus: Boolean(status),
    status: status?.status,
    from: payload.from || payload.phone || message?.from || '',
    name: payload.name || contact?.profile?.name || message?.from || 'WhatsApp User',
    type: messageType,
    mediaId: payload.mediaId || media.id || '',
    mimeType: payload.mimeType || media.mime_type || '',
    text:
      payload.text ||
      payload.message ||
      message?.text?.body ||
      message?.interactive?.button_reply?.title ||
      message?.interactive?.list_reply?.title ||
      message?.image?.caption ||
      message?.video?.caption ||
      message?.document?.caption ||
      message?.document?.filename ||
      (['audio', 'voice'].includes(messageType) ? 'Audio message received' : 'start'),
    intent: payload.intent || message?.interactive?.button_reply?.id || message?.interactive?.list_reply?.id,
  };
}

async function botTurn(payload) {
  const sessions = await readJson(SESSIONS, {});
  const kb = await getKnowledge();
  const phone = cleanText(payload.phone || payload.from || 'demo-user');
  const session = sessions[phone] || { phone, name: payload.name || phone, transcript: [], botPaused: false };
  session.name = cleanText(payload.name || session.name || phone);
  const text = cleanText(payload.text || payload.message || payload.intent || 'start');
  const response = await answerQuestionSmart(text, payload.intent, kb, session);
  session.transcript.push({ role: 'user', text, at: new Date().toISOString(), type: payload.type || 'text', mediaId: payload.mediaId || '', mimeType: payload.mimeType || '', mediaUrl: payload.mediaId ? `/api/whatsapp/media/${encodeURIComponent(payload.mediaId)}` : '' });
  session.transcript.push({ role: 'bot', text: response.text, buttons: response.buttons, at: new Date().toISOString() });
  session.lastInboundAt = new Date().toISOString();
  session.lastBotAt = new Date().toISOString();
  session.updatedAt = new Date().toISOString();
  if (response.needsHuman) {
    session.needsHuman = true;
    session.botPaused = true;
    session.pauseReason = 'Bot could not find a confirmed answer';
    session.unresolvedQuestion = response.unresolvedQuestion || text;
    await registerUnresolved(phone, session.name, session.unresolvedQuestion);
  }
  sessions[phone] = session;
  await writeJson(SESSIONS, sessions);

  let lead = null;
  let proposal = null;
  const intent = detectIntent(text, payload.intent);
  const navigationIntent =
    ['start', 'services', 'podcast', 'podcast_pricing', 'portfolio', 'pricing', 'get_quote', 'edit_quote'].includes(intent) ||
    /^(service_|date_|budget_)/.test(String(intent));
  const shouldRegisterLead =
    response.registerLead ||
    payload.registerLead ||
    (!session.flow && intent === 'handoff') ||
    (!session.flow && !navigationIntent && hasCommercialSignal(text, detectService(text, kb)));
  if (shouldRegisterLead) {
    lead = await addLead(
      {
        name: response.leadDetails?.name || payload.name || phone,
        phone: response.leadDetails?.contactNumber || phone,
        source: payload.source || 'WhatsApp',
        service: response.service || detectService(text, kb),
        city: response.leadDetails?.city || payload.city,
        message: response.leadDetails?.message || text,
        preferredDate: response.leadDetails?.preferredDate,
        budgetLabel: response.leadDetails?.budgetLabel,
      },
      payload.source || 'WhatsApp',
    );
    if (response.registerLead && lead) {
      const jobs = await readJson(SAAS_JOBS, []);
      const existingProposal = jobs.find((job) => job.featureId === 'proposal' && job.input?.leadId === lead.id);
      proposal = existingProposal || (await runSaasFeature('proposal', {
        leadId: lead.id,
        name: lead.name,
        email: lead.email || '',
        service: lead.service,
        budget: lead.budgetLabel || 'Custom quote after consultation',
        deadline: lead.preferredDate || 'To be confirmed',
        notes: lead.message,
        baseUrl: 'https://razalead-os-app.vercel.app',
      })).job;
    }
  }

  return { phone, reply: response, lead, proposal, transcript: session.transcript.slice(-12) };
}

async function receiveHumanVisibleMessage(payload) {
  const sessions = await readJson(SESSIONS, {});
  const phone = cleanText(payload.phone || payload.from || 'Unknown');
  const session = sessions[phone] || { phone, name: payload.name || phone, transcript: [], botPaused: false };
  session.name = cleanText(payload.name || session.name || phone);
  session.transcript.push({
    role: 'user',
    text: cleanText(payload.text || payload.message || 'Incoming message'),
    at: new Date().toISOString(),
    source: payload.source || 'WhatsApp',
    type: payload.type || 'text',
    mediaId: payload.mediaId || '',
    mimeType: payload.mimeType || '',
    mediaUrl: payload.mediaId ? `/api/whatsapp/media/${encodeURIComponent(payload.mediaId)}` : '',
  });
  if (['audio', 'voice', 'image', 'video', 'document'].includes(cleanText(payload.type).toLowerCase())) {
    session.needsHuman = true;
    session.botPaused = true;
    session.pauseReason = `${cleanText(payload.type || 'Media')} message needs human review`;
    session.unresolvedQuestion = `${cleanText(payload.type || 'Media')} message received`;
  }
  session.lastInboundAt = new Date().toISOString();
  session.updatedAt = new Date().toISOString();
  sessions[phone] = session;
  await writeJson(SESSIONS, sessions);
  return session;
}

async function setBotPause(input) {
  const sessions = await readJson(SESSIONS, {});
  const phone = cleanText(input.phone || '');
  if (!phone) return { ok: false, error: 'phone required' };
  const session = sessions[phone] || { phone, name: phone, transcript: [], botPaused: false };
  session.botPaused = Boolean(input.paused);
  session.pauseReason = cleanText(input.reason || (session.botPaused ? 'Human takeover' : 'Bot resumed'));
  session.updatedAt = new Date().toISOString();
  session.transcript.push({
    role: 'system',
    text: session.botPaused ? 'Bot paused. Human takeover enabled.' : 'Bot resumed.',
    at: session.updatedAt,
  });
  sessions[phone] = session;
  await writeJson(SESSIONS, sessions);
  await audit(session.botPaused ? 'conversation.takeover' : 'conversation.bot_resumed', { actor: input.actor, phone });
  return { ok: true, session: publicSession(session) };
}

async function updateConversation(input) {
  const sessions = await readJson(SESSIONS, {});
  const phone = cleanText(input.phone);
  if (!phone) return { ok: false, error: 'phone required' };
  const session = sessions[phone] || { phone, name: phone, transcript: [], botPaused: false };
  if (Object.hasOwn(input, 'assignedTo')) session.assignedTo = cleanText(input.assignedTo);
  if (Object.hasOwn(input, 'stage')) session.stage = cleanText(input.stage || 'New');
  if (Object.hasOwn(input, 'leadLabel')) {
    const allowed = ['Hot', 'Warm', 'Cold', 'New'];
    const requested = cleanText(input.leadLabel);
    session.leadLabel = allowed.includes(requested) ? requested : '';
    session.labelSource = session.leadLabel ? 'manual' : 'automatic';
  }
  if (Object.hasOwn(input, 'tags')) session.tags = Array.isArray(input.tags) ? input.tags.map(cleanText).filter(Boolean).slice(0, 20) : cleanText(input.tags).split(',').map(cleanText).filter(Boolean).slice(0, 20);
  if (Object.hasOwn(input, 'notes')) session.notes = compact(input.notes, 4000);
  session.updatedAt = new Date().toISOString();
  sessions[phone] = session;
  await writeJson(SESSIONS, sessions);
  await audit('conversation.updated', { actor: input.actor, phone, assignedTo: session.assignedTo, stage: session.stage });
  return { ok: true, session: publicSession(session) };
}

async function manualReply(input) {
  const sessions = await readJson(SESSIONS, {});
  const phone = cleanText(input.phone || '');
  const type = cleanText(input.type || 'text').toLowerCase();
  const text = compact(input.text || input.caption || '', 3900);
  const mediaUrl = cleanText(input.mediaUrl || input.url || '');
  const hasLocation = Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude));
  if (!phone) return { ok: false, error: 'phone required' };
  if (type === 'text' && !text) return { ok: false, error: 'message text required' };
  if (['image', 'video', 'audio', 'document'].includes(type) && !mediaUrl && !cleanText(input.mediaId || '')) return { ok: false, error: 'media URL or media ID required' };
  if (type === 'location' && !hasLocation) return { ok: false, error: 'latitude and longitude required' };
  if (type === 'contact' && (!cleanText(input.contactName) || !normalizeWhatsAppNumber(input.contactPhone))) return { ok: false, error: 'contact name and phone required' };
  const session = sessions[phone] || { phone, name: phone, transcript: [], botPaused: true };
  session.botPaused = true;
  const displayText = type === 'text'
    ? text
    : type === 'location'
      ? `Location: ${input.locationName || ''} ${input.latitude}, ${input.longitude}`
      : type === 'contact'
        ? `Contact: ${input.contactName} ${input.contactPhone}`
      : `${type.toUpperCase()}: ${mediaUrl || input.mediaId || 'uploaded media'}${text ? `\n${text}` : ''}`;
  const delivery = await sendWhatsAppPayload(phone, whatsappManualPayload(input));
  if (delivery.sent) {
    session.transcript.push({
      role: 'human',
      text: displayText,
      at: new Date().toISOString(),
      type,
      mediaUrl,
      mediaId: cleanText(input.mediaId || ''),
      deliveryStatus: 'sent',
    });
    session.lastHumanAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
  }
  const learned = type === 'text' ? await learnFromHumanReply(phone, text) : null;
  if (learned) {
    session.needsHuman = false;
    session.unresolvedQuestion = '';
    session.pauseReason = 'Human answered; learned knowledge saved';
  }
  session.lastDelivery = delivery;
  sessions[phone] = session;
  await writeJson(SESSIONS, sessions);
  await audit('message.manual_sent', { actor: input.actor, phone, messageType: type, delivered: Boolean(delivery.sent) });
  return { ok: Boolean(delivery.sent), error: delivery.sent ? '' : (delivery.response?.error?.message || delivery.reason || 'WhatsApp delivery failed'), delivery, session: publicSession(session) };
}

async function graphGet(pathname) {
  const meta = await getMetaConfig();
  if (!meta.accessToken) return { ok: false, reason: 'META_ACCESS_TOKEN missing' };
  const url = `https://graph.facebook.com/${meta.graphVersion}/${pathname.replace(/^\//, '')}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${meta.accessToken}` } });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function fetchWhatsAppMedia(mediaId) {
  const meta = await getMetaConfig();
  if (!meta.accessToken) return { ok: false, status: 503, error: 'Meta access token missing' };
  const infoResponse = await fetch(`https://graph.facebook.com/${meta.graphVersion}/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${meta.accessToken}` },
  });
  const info = await infoResponse.json().catch(() => ({}));
  if (!infoResponse.ok || !info.url) return { ok: false, status: infoResponse.status, error: info.error?.message || 'Media not found' };
  const mediaResponse = await fetch(info.url, { headers: { Authorization: `Bearer ${meta.accessToken}` } });
  if (!mediaResponse.ok) return { ok: false, status: mediaResponse.status, error: 'Could not download WhatsApp media' };
  return {
    ok: true,
    status: 200,
    type: mediaResponse.headers.get('content-type') || info.mime_type || 'audio/ogg',
    buffer: Buffer.from(await mediaResponse.arrayBuffer()),
  };
}

async function transcribeWhatsAppAudio(mediaId) {
  if (!aiConfig.groqApiKey || !mediaId) return { ok: false, error: 'Groq transcription is not configured' };
  const media = await fetchWhatsAppMedia(mediaId);
  if (!media.ok) return media;
  try {
    const form = new FormData();
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    form.append('file', new Blob([media.buffer], { type: media.type }), `whatsapp-audio.${media.type.includes('mpeg') ? 'mp3' : 'ogg'}`);
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${aiConfig.groqApiKey}` }, body: form });
    const data = await response.json().catch(() => ({}));
    const text = compact(data.text || '', 3000);
    return response.ok && text ? { ok: true, text, provider: 'groq-whisper' } : { ok: false, status: response.status, error: data.error?.message || 'Audio transcription failed' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function uploadWhatsAppMedia(input) {
  const meta = await getMetaConfig();
  if (!meta.accessToken || !meta.phoneNumberId) return { ok: false, error: 'Meta connection is incomplete' };
  const raw = String(input.dataUrl || input.base64 || '');
  const match = raw.match(/^data:([^;]+);base64,(.+)$/s);
  const mimeType = cleanText(input.mimeType || match?.[1] || 'application/octet-stream');
  const bytes = Buffer.from(match?.[2] || raw, 'base64');
  if (!bytes.length) return { ok: false, error: 'Audio file is empty' };
  const maxBytes = mimeType.startsWith('video/') ? 16 * 1024 * 1024 : mimeType.startsWith('audio/') ? 8 * 1024 * 1024 : 10 * 1024 * 1024;
  if (bytes.length > maxBytes) return { ok: false, error: `File must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller` };
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', new Blob([bytes], { type: mimeType }), compact(input.filename || 'Raza-attachment', 120));
  const response = await fetch(`https://graph.facebook.com/${meta.graphVersion}/${meta.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${meta.accessToken}` },
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  return response.ok ? { ok: true, mediaId: result.id, mimeType } : { ok: false, error: result.error?.message || 'Audio upload failed', status: response.status };
}

async function runMetaSelfTest() {
  const meta = await getMetaConfig();
  return {
    connected: Boolean(meta.accessToken && meta.phoneNumberId && meta.wabaId),
    graphVersion: meta.graphVersion,
    phoneNumberId: meta.phoneNumberId,
    wabaId: meta.wabaId,
    checks: [
      { name: 'Token owner', result: await graphGet('me?fields=id,name') },
      { name: 'WABA profile', result: await graphGet(`${meta.wabaId}?fields=id,name,currency,timezone_id`) },
      { name: 'WABA phone numbers', result: await graphGet(`${meta.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`) },
      { name: 'Phone number', result: await graphGet(`${meta.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`) },
    ],
  };
}

async function reset() {
  if (process.env.VERCEL && process.env.ALLOW_PRODUCTION_RESET !== 'true') {
    return { ok: false, error: 'Production reset is disabled' };
  }
  await writeJson(LEADS, seedLeads);
  await writeJson(SESSIONS, {});
  await writeJson(FOLLOWUPS, []);
  return { ok: true };
}

async function stats() {
  const leads = await readJson(LEADS, seedLeads);
  const followups = await readJson(FOLLOWUPS, []);
  return {
    totalLeads: leads.length,
    hot: leads.filter((lead) => lead.label === 'Hot').length,
    warm: leads.filter((lead) => lead.label === 'Warm').length,
    scheduledFollowups: followups.filter((item) => item.status === 'scheduled').length,
    dueFollowups: (await dueFollowups()).length,
  };
}

function groupCount(items, key) {
  return items.reduce((acc, item) => {
    const value = cleanText(item[key] || 'Not set');
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function lastDays(leads, days = 7) {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(Date.now() - (days - 1 - index) * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      leads: leads.filter((lead) => String(lead.createdAt || '').slice(0, 10) === key).length,
    };
  });
}

async function analytics() {
  const leads = await readJson(LEADS, seedLeads);
  const followups = await readJson(FOLLOWUPS, []);
  const sessions = await readJson(SESSIONS, {});
  const avgScore = leads.length ? Math.round(leads.reduce((sum, lead) => sum + Number(lead.score || 0), 0) / leads.length) : 0;
  return {
    totalLeads: leads.length,
    averageScore: avgScore,
    conversations: Object.keys(sessions).length,
    followups: {
      total: followups.length,
      scheduled: followups.filter((item) => item.status === 'scheduled').length,
      sent: followups.filter((item) => item.status === 'sent').length,
      needsAttention: followups.filter((item) => item.status === 'needs_token_or_retry').length,
    },
    bySource: groupCount(leads, 'source'),
    byService: groupCount(leads, 'service'),
    byLabel: groupCount(leads, 'label'),
    last7Days: lastDays(leads),
  };
}

async function memoryList() {
  const sessions = await readJson(SESSIONS, {});
  const leads = await readJson(LEADS, seedLeads);
  const byPhone = new Map(leads.map((lead) => [cleanText(lead.phone).replace(/\D/g, '').slice(-10), lead]));
  return Object.values(sessions).map((session) => {
    const linkedLead = byPhone.get(cleanText(session.phone).replace(/\D/g, '').slice(-10));
    const transcript = Array.isArray(session.transcript) ? session.transcript : [];
    const customerText = transcript.filter((item) => item.role === 'user').map((item) => item.text).join(' ');
    const inferredScore = scoreLead({ phone: session.phone, message: customerText, service: linkedLead?.service || session.selectedService || 'General inquiry' });
    const score = Number(linkedLead?.score || inferredScore || 0);
    const automaticLabel = score >= 75 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold';
    return publicSession({ ...session, leadScore: score, automaticLabel, linkedLeadId: linkedLead?.id || '' });
  }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function publicSession(session) {
  const transcript = Array.isArray(session.transcript) ? session.transcript : [];
  const userMessages = transcript.filter((item) => item.role === 'user');
  const botMessages = transcript.filter((item) => item.role === 'bot');
  const humanMessages = transcript.filter((item) => item.role === 'human');
  const last = transcript[transcript.length - 1];
  return {
    phone: session.phone,
    name: session.name || session.phone,
    botPaused: Boolean(session.botPaused),
    needsHuman: Boolean(session.needsHuman),
    unresolvedQuestion: session.unresolvedQuestion || '',
    pauseReason: session.pauseReason || '',
    assignedTo: session.assignedTo || '',
    stage: session.stage || 'New',
    leadLabel: session.leadLabel || session.automaticLabel || 'Cold',
    automaticLabel: session.automaticLabel || 'Cold',
    labelSource: session.leadLabel ? 'manual' : 'automatic',
    leadScore: Number(session.leadScore || 0),
    linkedLeadId: session.linkedLeadId || '',
    tags: Array.isArray(session.tags) ? session.tags : [],
    notes: session.notes || '',
    messages: transcript.length,
    lastUserMessage: userMessages[userMessages.length - 1]?.text || '',
    lastBotMessage: botMessages[botMessages.length - 1]?.text || '',
    lastHumanMessage: humanMessages[humanMessages.length - 1]?.text || '',
    updatedAt: last?.at || session.updatedAt || session.lastInboundAt || '',
    lastDelivery: session.lastDelivery || null,
    transcript,
  };
}

function csvEscape(value) {
  const text = String(value || '');
  return `"${text.replace(/"/g, '""')}"`;
}

async function crmCsv() {
  const leads = await readJson(LEADS, seedLeads);
  const columns = ['id', 'name', 'phone', 'source', 'service', 'city', 'label', 'score', 'status', 'message', 'createdAt', 'nextFollowupAt'];
  const rows = [columns.join(',')].concat(leads.map((lead) => columns.map((column) => csvEscape(lead[column])).join(',')));
  return rows.join('\n');
}

async function publicUsers() {
  const users = await readJson(USERS, seedUsers);
  return users.map(({ passwordHash, ...user }) => user);
}

async function login(input) {
  const users = await readJson(USERS, seedUsers);
  const email = cleanText(input.email).toLowerCase();
  const passwordHash = hashSecret(input.password || input.pin);
  const user = users.find((item) => item.email.toLowerCase() === email && item.passwordHash === passwordHash);
  if (!user) return { ok: false, error: 'Invalid email or PIN' };
  const { passwordHash: _passwordHash, ...publicUser } = user;
  const token = randomUUID();
  await audit('auth.login', { actor: user.email, role: user.role });
  return { ok: true, token, user: publicUser };
}

async function backupBundle() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    leads: await readJson(LEADS, seedLeads),
    sessions: await readJson(SESSIONS, {}),
    followups: await readJson(FOLLOWUPS, []),
    knowledge: await getKnowledge(),
    templates: await getTemplates(),
    users: await publicUsers(),
    competitors: await getCompetitors(),
    auditLog: await readJson(AUDIT_LOG, []),
  };
}

function contentCalendar(niche = 'Podcast Studio') {
  const formats = ['Reel', 'Carousel', 'Story', 'Short', 'Behind the scenes'];
  const themes = ['studio tour', 'guest insight', 'recording tip', 'editing transformation', 'client result', 'microphone tip'];
  return Array.from({ length: 30 }, (_, index) => ({
    day: index + 1,
    niche,
    format: formats[index % formats.length],
    topic: `${niche}: ${themes[index % themes.length]}`,
    hook: `Day ${index + 1}: Stop scrolling if you want a better ${niche.toLowerCase()}.`,
    cta: index % 2 ? 'Send BOOK to reserve a slot.' : 'Save this and share with a creator.',
    bestPostingTime: ['11:00 AM', '2:00 PM', '7:00 PM', '9:00 PM'][index % 4],
  }));
}

function pdfEscape(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '');
}

function createTextPdf(title, sections) {
  const wrap = (value, limit = 72) => {
    const words = pdfEscape(value).split(/\s+/).filter(Boolean).flatMap((word) => {
      if (word.length <= limit) return [word];
      const chunks = [];
      for (let i = 0; i < word.length; i += limit) chunks.push(word.slice(i, i + limit));
      return chunks;
    });
    const lines = [];
    let line = '';
    words.forEach((word) => {
      if (`${line} ${word}`.trim().length > limit && line) { lines.push(line); line = word; }
      else line = `${line} ${word}`.trim();
    });
    if (line) lines.push(line);
    return lines.length ? lines : ['Not provided'];
  };
  const logoPath = path.join(__dirname, 'public', 'rp-brand-logo.jpg');
  const logo = existsSync(logoPath) ? readFileSync(logoPath) : null;
  const centerX = (text, size) => Math.max(38, (595 - pdfEscape(text).length * size * 0.52) / 2);
  const titleLines = wrap(title, 44).slice(0, 2);
  const pageStreams = [];
  let commands = [];
  let y = 0;
  const startPage = (pageNumber) => {
    commands = ['q', '0.055 0.055 0.051 rg', '0 650 595 192 re f', '1 0.196 0.063 rg', '0 650 10 192 re f', 'Q'];
    if (logo) commands.push('q', '154 0 0 79 220.5 754 cm', '/Logo Do', 'Q');
    commands.push('BT', '/F2 18 Tf', '1 1 1 rg');
    titleLines.forEach((line, index) => commands.push(`1 0 0 1 ${centerX(line, 18)} ${716 - index * 22} Tm`, `(${line}) Tj`));
    commands.push('/F1 9 Tf', '0.82 0.78 0.70 rg', `1 0 0 1 ${centerX('CREATIVE MEDIA & PRODUCTION', 9)} 664 Tm`, '(CREATIVE MEDIA & PRODUCTION) Tj', 'ET');
    y = 622;
    if (pageNumber > 1) {
      commands.push('BT', '/F1 8 Tf', '0.35 0.32 0.28 rg', '1 0 0 1 510 655 Tm', `(PAGE ${pageNumber}) Tj`, 'ET');
    }
  };
  const finishPage = (pageNumber) => {
    commands.push('q', '1 0.196 0.063 rg', '36 36 523 2 re f', 'Q', 'BT', '/F1 8 Tf', '0.25 0.22 0.18 rg', '1 0 0 1 36 21 Tm', `(razaproductions.com  |  ${pdfEscape(business.whatsapp)}) Tj`, `1 0 0 1 518 21 Tm`, `(${pageNumber}) Tj`, 'ET');
    pageStreams.push(commands.join('\n'));
  };
  startPage(1);
  sections.forEach((section, index) => {
    const bodyLines = String(section.body || '').split('\n').flatMap((line) => wrap(line));
    const blockHeight = 44 + bodyLines.length * 15;
    if (y - blockHeight < 58) {
      finishPage(pageStreams.length + 1);
      startPage(pageStreams.length + 1);
    }
    commands.push('q', index % 2 ? '0.957 0.941 0.905 rg' : '0.985 0.976 0.948 rg', `36 ${y - blockHeight + 7} 523 ${blockHeight} re f`, '1 0.196 0.063 rg', `36 ${y - blockHeight + 7} 4 ${blockHeight} re f`, 'Q');
    commands.push('BT', '/F2 10 Tf', '1 0.196 0.063 rg', `1 0 0 1 53 ${y - 19} Tm`, `(${pdfEscape(section.heading).toUpperCase()}) Tj`, 'ET');
    bodyLines.forEach((line, lineIndex) => commands.push('BT', '/F1 10 Tf', '0.12 0.14 0.17 rg', `1 0 0 1 53 ${y - 42 - lineIndex * 15} Tm`, `(${line}) Tj`, 'ET'));
    y -= blockHeight + 10;
  });
  finishPage(pageStreams.length + 1);
  const pageCount = pageStreams.length;
  const fontRegularId = 3 + pageCount * 2;
  const fontBoldId = fontRegularId + 1;
  const logoId = fontBoldId + 1;
  const kids = pageStreams.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  const objects = [Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'), Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`)];
  pageStreams.forEach((stream, index) => {
    const contentId = 4 + index * 2;
    objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >>${logo ? ` /XObject << /Logo ${logoId} 0 R >>` : ''} >> /Contents ${contentId} 0 R >>`));
    objects.push(Buffer.from(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`));
  });
  objects.push(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  objects.push(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
  if (logo) objects.push(Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1250 /Height 640 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`),
    logo,
    Buffer.from('\nendstream'),
  ]));
  const parts = [Buffer.from('%PDF-1.4\n')];
  let length = parts[0].length;
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = length;
    const part = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')]);
    parts.push(part); length += part.length;
  });
  const xref = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { trailer += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  parts.push(Buffer.from(trailer));
  return Buffer.concat(parts);
}

function proposalPdf(job) {
  const input = job.input || {};
  return createTextPdf('Professional Proposal', [
    { heading: 'Client', body: input.name || 'Client' },
    { heading: 'Service', body: input.service || 'Production Services' },
    { heading: 'Scope of Work', body: input.notes || `Complete ${input.service || 'production'} planning, execution and delivery.` },
    { heading: 'Timeline', body: input.deadline || 'Final timeline after approval and advance.' },
    { heading: 'Price', body: input.budget || 'Custom quotation' },
    { heading: 'Terms & Payment', body: `50% advance confirms booking. Remaining payment is due before final delivery. Scope changes may affect price and timeline. JazzCash Account Name: ${business.jazzcashName}. JazzCash Number: ${business.jazzcashNumber}.` },
    { heading: 'Contact', body: `${business.name} | ${business.whatsapp}` },
  ]);
}

function requirementPdf(lead) {
  return createTextPdf('Client Requirement', [
    { heading: 'Lead', body: `${lead.name || 'Unknown'} | ${lead.phone || 'No contact'}` },
    { heading: 'Service', body: lead.service || 'General inquiry' },
    { heading: 'AI Score', body: `${lead.score || 0}/100 - ${leadScoreReasons(lead).join(', ')}` },
    { heading: 'Requirement', body: lead.message || 'No requirement recorded.' },
    { heading: 'Timeline', body: lead.preferredDate || 'Not confirmed' },
    { heading: 'Budget', body: lead.budgetLabel || (lead.value ? `PKR ${lead.value}` : 'Not shared') },
    { heading: 'Source', body: lead.source || 'CRM' },
  ]);
}

function lostLeadMagnetPdf(job) {
  const input = job.input || {};
  const service = cleanText(input.service || 'Creative Production');
  const title = cleanText(input.magnetTitle || `${service} Project Starter Guide`);
  return createTextPdf(title, [
    { heading: 'Prepared Especially For', body: input.name || 'Valued Client' },
    { heading: 'Your Project Goal', body: input.goal || `Plan a professional ${service} project with clear scope, production quality and measurable results.` },
    { heading: 'Step 1 - Define The Outcome', body: `Decide what this ${service} project must achieve: awareness, sales, engagement, event coverage or a premium brand presence.` },
    { heading: 'Step 2 - Prepare Your Brief', body: 'Keep your brand references, preferred style, required deliverables, audience and ideal launch date ready. A clear brief reduces revisions and protects the timeline.' },
    { heading: 'Step 3 - Production Checklist', body: `Confirm location, people, products, scripts or talking points, brand assets and approval contact before production begins.` },
    { heading: 'Recommended Next Step', body: `${input.offer || `Book a free 15-minute planning call with Raza Productions. We will review your requirement and recommend the right ${service} approach without obligation.`}\nBook: ${input.bookingUrl || 'https://razaproductions.com/booking/'} | WhatsApp: ${business.whatsapp}` },
  ]);
}

function contractPdf(job) {
  const input = job.input || {};
  return createTextPdf('Production Service Agreement', [
    { heading: 'Client', body: `${input.name || 'Client'} | ${input.phone || input.email || 'Contact pending'}` },
    { heading: 'Service', body: input.service || 'Creative Production Services' },
    { heading: 'Scope', body: input.notes || 'Planning, production, post-production and agreed delivery.' },
    { heading: 'Commercial Terms', body: `Project value: PKR ${Number(input.value || input.budget || 0).toLocaleString()}. 50% advance confirms booking. Remaining payment is due before final delivery.` },
    { heading: 'Approval', body: 'Final scope, dates and deliverables are confirmed in writing by both parties.' },
  ]);
}

function invoicePdf(job) {
  const input = job.input || {};
  const amount = Number(input.value || input.budget || 0);
  return createTextPdf('Invoice', [
    { heading: 'Bill To', body: input.name || 'Client' },
    { heading: 'Service', body: input.service || 'Creative Production Services' },
    { heading: 'Amount', body: amount ? `PKR ${amount.toLocaleString()}` : 'Amount to be confirmed' },
    { heading: 'Payment', body: `JazzCash Account Name: ${business.jazzcashName}\nJazzCash Number: ${business.jazzcashNumber}` },
    { heading: 'Terms', body: '50% advance confirms booking. Remaining payment is due before final delivery.' },
  ]);
}

function defaultProject(lead) {
  const now = new Date().toISOString();
  return {
    id: lead.id,
    leadId: lead.id,
    title: lead.service || 'Creative production project',
    status: lead.status || 'Planning',
    progress: Number(lead.progress || 0),
    summary: lead.portalNote || lead.message || '',
    nextDelivery: lead.nextDelivery || lead.preferredDate || '',
    milestones: [
      { id: randomUUID(), title: 'Requirement confirmed', status: 'pending', dueDate: '' },
      { id: randomUUID(), title: 'Production in progress', status: 'pending', dueDate: '' },
      { id: randomUUID(), title: 'Client review', status: 'pending', dueDate: '' },
      { id: randomUUID(), title: 'Final delivery', status: 'pending', dueDate: '' },
    ],
    files: [],
    submissions: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function getProject(leadId, create = true) {
  const leads = await readJson(LEADS, seedLeads);
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) return null;
  const projects = await readJson(PROJECTS, []);
  let project = projects.find((item) => item.leadId === leadId);
  if (!project && create) {
    project = defaultProject(lead);
    projects.unshift(project);
    await writeJson(PROJECTS, projects);
    await audit('project.created', { leadId, projectId: project.id });
  }
  return project ? { ...project, client: { name: lead.name, phone: lead.phone, email: lead.email, service: lead.service } } : null;
}

async function saveProject(leadId, input) {
  const leads = await readJson(LEADS, seedLeads);
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) return null;
  const projects = await readJson(PROJECTS, []);
  let index = projects.findIndex((item) => item.leadId === leadId);
  const current = index >= 0 ? projects[index] : defaultProject(lead);
  const cleanItems = (items, kind) => (Array.isArray(items) ? items : []).slice(0, 100).map((item) => ({
    id: cleanText(item.id) || randomUUID(),
    title: compact(item.title || item.name || 'Untitled', 160),
    ...(kind === 'milestone' ? { status: ['pending','in_progress','completed'].includes(item.status) ? item.status : 'pending', dueDate: compact(item.dueDate, 40) } : { url: compact(item.url, 1200), type: compact(item.type || 'link', 40), visibility: item.visibility === 'team' ? 'team' : 'client' }),
  }));
  const next = {
    ...current,
    title: compact(input.title ?? current.title, 180),
    status: compact(input.status ?? current.status, 80),
    progress: Math.max(0, Math.min(100, Number(input.progress ?? current.progress ?? 0))),
    summary: compact(input.summary ?? current.summary, 3000),
    nextDelivery: compact(input.nextDelivery ?? current.nextDelivery, 200),
    milestones: input.milestones ? cleanItems(input.milestones, 'milestone') : current.milestones,
    files: input.files ? cleanItems(input.files, 'file') : current.files,
    submissions: current.submissions || [],
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) projects[index] = next; else projects.unshift(next);
  await writeJson(PROJECTS, projects);
  const leadIndex = leads.findIndex((item) => item.id === leadId);
  leads[leadIndex].progress = next.progress;
  leads[leadIndex].nextDelivery = next.nextDelivery;
  leads[leadIndex].portalNote = next.summary;
  leads[leadIndex].updatedAt = next.updatedAt;
  await writeJson(LEADS, leads);
  await audit('project.updated', { actor: input.actor || 'owner', leadId, projectId: next.id });
  return { ...next, client: { name: lead.name, phone: lead.phone, email: lead.email, service: lead.service } };
}

async function addProjectSubmission(leadId, input) {
  const project = await getProject(leadId);
  if (!project) return null;
  const submission = { id: randomUUID(), name: compact(input.name || 'Client', 120), message: compact(input.message, 3000), url: compact(input.url, 1200), createdAt: new Date().toISOString(), status: 'new' };
  const projects = await readJson(PROJECTS, []);
  const index = projects.findIndex((item) => item.leadId === leadId);
  projects[index].submissions = [submission, ...(projects[index].submissions || [])].slice(0, 200);
  projects[index].updatedAt = submission.createdAt;
  await writeJson(PROJECTS, projects);
  await audit('project.client_submission', { leadId, projectId: project.id });
  return submission;
}

function seedAutomationBlueprints() {
  const triggers = {
    proposal: 'Lead qualified', 'content-calendar': 'Manual or monthly', 'review-collector': 'Project completed + 3 days', upsell: 'Client inactive 60 days', 'competitor-alert': 'Daily schedule', 'meeting-scheduler': 'Lead requests meeting', 'contract-invoice': 'Deal marked Won', winback: 'Client inactive 90 days', 'faq-bot': 'Incoming WhatsApp question', 'client-portal': 'Deal marked Won', 'auto-wishes': 'Birthday or configured occasion', 'voice-proposal': 'Manual voice note', 'no-show': 'Meeting missed + 5 minutes', 'task-assigner': 'Deal marked Won', 'ghost-recover': 'Proposal unanswered 48 hours', referral: '5-star review received', 'viral-ideas': 'Manual request', 'smart-portfolio': 'Lead asks for portfolio', 'ceo-report': 'Daily 9:00 AM', 'lost-lead': 'Lead lost + 3 days'
  };
  return saasFeatures.map((feature) => ({ id: feature.id, name: feature.name, enabled: true, mode: ['proposal','review-collector','upsell','meeting-scheduler','winback','auto-wishes','no-show','ghost-recover','referral','lost-lead'].includes(feature.id) ? 'approval' : 'automatic', trigger: triggers[feature.id] || 'Manual', instructions: feature.description, updatedAt: null }));
}

async function automationBlueprints(input) {
  const current = await readJson(AUTOMATION_BLUEPRINTS, seedAutomationBlueprints());
  if (!input) return current;
  const incoming = Array.isArray(input.items) ? input.items : [];
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    if (!byId.has(item.id)) continue;
    const old = byId.get(item.id);
    byId.set(item.id, { ...old, enabled: item.enabled !== false, mode: ['automatic','approval','manual'].includes(item.mode) ? item.mode : old.mode, trigger: compact(item.trigger || old.trigger, 240), instructions: compact(item.instructions || old.instructions, 3000), updatedAt: new Date().toISOString() });
  }
  const next = [...byId.values()];
  await writeJson(AUTOMATION_BLUEPRINTS, next);
  await audit('automation.blueprints.updated', { actor: input.actor || 'owner' });
  return next;
}

function portalHtml(lead, project) {
  const progress = Math.max(0, Math.min(100, Number(project.progress || lead.progress || 0)));
  const safe = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const milestones = (project.milestones || []).map((item) => `<li class="milestone ${safe(item.status)}"><span></span><div><b>${safe(item.title)}</b><small>${safe(item.status.replace('_',' '))}${item.dueDate ? ` · ${safe(item.dueDate)}` : ''}</small></div></li>`).join('');
  const files = (project.files || []).filter((item) => item.visibility !== 'team').map((item) => `<a class="file" href="${safe(item.url)}" target="_blank" rel="noreferrer"><b>${safe(item.title)}</b><small>${safe(item.type || 'file')}</small></a>`).join('') || '<p class="muted">No client files shared yet.</p>';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Raza Productions Client Portal</title><style>*{box-sizing:border-box}body{margin:0;background:#0d0d0c;color:#f7f0e5;font:15px Arial,sans-serif}.wrap{max-width:980px;margin:auto;padding:24px 16px 48px}.head{display:flex;align-items:center;justify-content:space-between;gap:16px}.logo{width:170px;max-width:45vw;background:#eee6d8;padding:6px}.pill{padding:8px 11px;background:#ff32101c;color:#ff5a3b;border:1px solid #ff321044;font-weight:700}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:18px}.card{margin-top:18px;border:1px solid #38332d;background:#191817;padding:22px}.muted,small{color:#aaa197}.bar{height:14px;background:#302d28;overflow:hidden}.bar span{display:block;height:100%;width:${progress}%;background:#ff3210}.milestones{list-style:none;padding:0}.milestone{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #302d28}.milestone>span{width:12px;height:12px;margin-top:3px;border-radius:50%;background:#514b43}.milestone.completed>span{background:#22c55e}.milestone.in_progress>span{background:#ff3210}.milestone small,.file small{display:block;margin-top:5px;text-transform:capitalize}.file{display:block;color:#f7f0e5;text-decoration:none;border:1px solid #39342e;padding:13px;margin-top:9px}.field{width:100%;padding:13px;margin-top:10px;background:#0e0e0d;color:#fff;border:1px solid #484139}.btn{width:100%;padding:13px;margin-top:10px;background:#ff3210;color:#fff;border:0;font-weight:800}@media(max-width:720px){.grid{grid-template-columns:1fr}.head{align-items:flex-start;flex-direction:column}}</style></head><body><main class="wrap"><header class="head"><img class="logo" src="/rp-brand-logo.jpg" alt="Raza Productions"><span class="pill">${safe(project.status || lead.status || 'In progress')}</span></header><h1>${safe(project.title || lead.service || 'Client Project')}</h1><p class="muted">Welcome ${safe(lead.name || 'Client')}. Track progress, open deliveries and send feedback here.</p><section class="card"><h3>Project progress: ${progress}%</h3><div class="bar"><span></span></div><p>${safe(project.summary || 'Our team will keep this portal updated as work moves forward.')}</p><b>Next delivery</b><p class="muted">${safe(project.nextDelivery || 'Team will confirm the next delivery date.')}</p></section><div class="grid"><section class="card"><h2>Project milestones</h2><ul class="milestones">${milestones}</ul></section><section class="card"><h2>Files & deliveries</h2>${files}</section></div><section class="card"><h2>Send feedback or files</h2><input id="name" class="field" placeholder="Your name"><textarea id="message" class="field" rows="4" placeholder="Feedback, changes or approval note"></textarea><input id="url" class="field" placeholder="Google Drive / Dropbox file link (optional)"><button class="btn" onclick="submitFeedback()">Submit to Raza Productions</button><p id="result" class="muted"></p></section></main><script>async function submitFeedback(){const result=document.getElementById('result'),nameField=document.getElementById('name'),messageField=document.getElementById('message'),urlField=document.getElementById('url');if(!messageField.value.trim()&&!urlField.value.trim()){result.textContent='Please add feedback or a file link.';return;}result.textContent='Submitting...';const r=await fetch('/api/projects/${encodeURIComponent(lead.id)}/submissions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:nameField.value,message:messageField.value,url:urlField.value})});result.textContent=r.ok?'Thank you. Your submission is saved and the team has been notified.':'Could not submit. Please try again.';if(r.ok){messageField.value='';urlField.value='';}}</script></body></html>`;
}

async function widgetTurn(input) {
  const sessionId = compact(input.sessionId || randomUUID(), 100);
  const sessions = await readJson(WIDGET_SESSIONS, {});
  const session = sessions[sessionId] || { sessionId, step: 'requirement', data: {}, createdAt: new Date().toISOString() };
  const text = compact(input.text || '', 1200);
  let replyText = '';
  let lead = null;
  if (!text || input.intent === 'start') {
    session.step = 'requirement';
    replyText = 'Assalam o Alaikum! Aapko kis service ya kaam ki requirement hai?';
  } else if (session.step === 'requirement') {
    session.data.requirement = text; session.step = 'budget';
    replyText = 'Aapka approximate budget kya hai? Amount ya "discuss" likh sakte hain.';
  } else if (session.step === 'budget') {
    session.data.budget = text; session.step = 'timeline';
    replyText = 'Project kab tak chahiye? Misal: 1 month, 2 weeks, ya flexible.';
  } else if (session.step === 'timeline') {
    session.data.timeline = text; session.step = 'contact';
    replyText = 'Final step: Apna naam aur contact number ek message mein bhej dein. Misal: Ali - 03XXXXXXXXX';
  } else {
    const phoneMatch = text.match(/(?:\+?92|0)?3\d{9}/);
    const phone = phoneMatch?.[0] || text;
    const name = cleanText(text.replace(phoneMatch?.[0] || '', '').replace(/[-|,:]/g, ' ')) || 'Website Lead';
    const numericBudget = Number(String(session.data.budget || '').replace(/[^0-9]/g, '')) || 0;
    lead = await addLead({ name, phone, source: 'Website AI Widget', service: detectService(session.data.requirement, await getKnowledge()), message: session.data.requirement, preferredDate: session.data.timeline, budgetLabel: session.data.budget, value: numericBudget }, 'Website AI Widget');
    session.step = 'complete'; session.leadId = lead.id;
    replyText = `Shukriya ${name}. Aapki requirement lead ${lead.id} ke sath save ho gayi hai. Raza Productions team jald contact karegi.`;
  }
  session.updatedAt = new Date().toISOString();
  sessions[sessionId] = session;
  await writeJson(WIDGET_SESSIONS, sessions);
  return { ok: true, sessionId, step: session.step, reply: replyText, lead: lead ? enrichLead(lead) : null };
}

async function getEmailSettings() {
  return readJson(EMAIL_SETTINGS, { adminEmail: false, clientEmail: false, adminAddress: '', senderName: business.name, updatedAt: null });
}

async function saveEmailSettings(input) {
  const current = await getEmailSettings();
  const next = { ...current, adminEmail: Boolean(input.adminEmail), clientEmail: Boolean(input.clientEmail), adminAddress: compact(input.adminAddress || current.adminAddress, 200), senderName: compact(input.senderName || current.senderName || business.name, 100), updatedAt: new Date().toISOString() };
  if (next.adminEmail && !/^\S+@\S+\.\S+$/.test(next.adminAddress)) {
    next.adminEmail = false;
    next.warning = 'Admin emails disabled: add a valid admin email address first.';
  } else delete next.warning;
  await writeJson(EMAIL_SETTINGS, next);
  await audit('email.settings.updated', { actor: input.actor || 'dashboard', adminEmail: next.adminEmail, clientEmail: next.clientEmail });
  return { ok: true, settings: next };
}

async function sendTrackedEmail({ to, subject, text, type = 'notification' }) {
  const history = await readJson(EMAIL_HISTORY, []);
  const item = { id: randomUUID(), to: cleanText(to), subject: compact(subject, 200), type, status: 'needs_provider', createdAt: new Date().toISOString() };
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!item.to) item.status = 'missing_recipient';
  else if (apiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json' }, body:JSON.stringify({ from:process.env.EMAIL_FROM || 'Raza Productions <onboarding@resend.dev>', to:[item.to], subject:item.subject, text:compact(text, 10000) }) });
      const data = await response.json().catch(() => ({}));
      item.status = response.ok ? 'sent' : 'failed'; item.providerId = data.id || ''; item.error = response.ok ? '' : JSON.stringify(data).slice(0, 500);
    } catch (error) { item.status = 'failed'; item.error = error.message; }
  }
  history.unshift(item); await writeJson(EMAIL_HISTORY, history.slice(0, 5000));
  await audit('email.delivery', { to:item.to, status:item.status, type });
  return item;
}

function viralIdeas(niche = 'Podcast Studio') {
  return [
    { hook: `3 mistakes people make before booking a ${niche}`, script: 'Open with the biggest mistake, demonstrate the fix, then show the final result.', cta: 'Comment CHECKLIST.' },
    { hook: `What nobody tells you about ${niche}`, script: 'Show a surprising behind-the-scenes detail, explain why it matters, and finish with proof.', cta: 'DM us for a custom plan.' },
    { hook: `${niche} before vs after`, script: 'Use a fast visual comparison, name three improvements, and reveal the workflow.', cta: 'Save this idea for your next shoot.' },
  ];
}

const featureRequiredFields = {
  proposal: ['name', 'phone', 'service'],
  'content-calendar': ['niche'],
  'review-collector': ['name', 'phone'],
  upsell: ['name', 'phone', 'service'],
  'meeting-scheduler': ['name', 'phone', 'service'],
  'contract-invoice': ['name', 'service', 'budget'],
  winback: ['name', 'phone'],
  'auto-wishes': ['name', 'phone', 'occasion'],
  'voice-proposal': ['name', 'service', 'notes'],
  'no-show': ['name', 'phone'],
  'task-assigner': ['name', 'service'],
  'ghost-recover': ['name', 'phone', 'service'],
  referral: ['name', 'phone'],
  'viral-ideas': ['niche'],
  'smart-portfolio': ['name', 'service'],
  'lost-lead': ['name', 'phone', 'service'],
};

function missingFeatureFields(id, input = {}) {
  return (featureRequiredFields[id] || []).filter((key) => !cleanText(input[key]));
}

function featureOutput(id, input, leads, jobs, now) {
  const name = cleanText(input.name || 'Client');
  const service = cleanText(input.service || input.niche || 'Creative Production');
  const phone = cleanText(input.phone);
  if (id === 'content-calendar') return { calendar: contentCalendar(cleanText(input.niche || 'Podcast Studio')), exportReady: true };
  if (id === 'viral-ideas') return { niche: service, ideas: viralIdeas(service) };
  if (id === 'proposal') return { proposal: { client: name, phone, service, budget: cleanText(input.budget || 'Custom quote'), deadline: cleanText(input.deadline || 'After approval'), scope: cleanText(input.notes), brand: business.name, generatedAt: now }, printReady: true };
  if (id === 'review-collector') return { client: name, sendAfterDays: 3, reviewUrl: cleanText(input.reviewUrl || process.env.GOOGLE_REVIEW_URL || 'https://razaproductions.com'), message: automationMessage(id, input) };
  if (id === 'upsell') return { client: name, inactiveDays: Number(input.inactiveDays || 60), offer: cleanText(input.offer || '20% off on next package'), message: automationMessage(id, input) };
  if (id === 'competitor-alert') return { monitoring: true, schedule: 'daily', sources: ['Facebook', 'Instagram', 'YouTube', 'Website'], configuredSources: 0 };
  if (id === 'ceo-report') {
    const topLead = [...leads].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
    return { report: { leads: leads.length, revenue: leads.filter((lead) => ['won', 'completed'].includes(cleanText(lead.status).toLowerCase())).reduce((sum, lead) => sum + Number(lead.value || 0), 0), topLead: topLead?.name || 'None', pendingProposals: jobs.filter((job) => job.featureId === 'proposal' && job.status !== 'completed').length, generatedAt: now } };
  }
  if (id === 'smart-portfolio') return { client: name, niche: service, projects: [1, 2, 3].map((rank) => ({ rank, title: `${service} selected project ${rank}`, url: `${knowledge.portfolioUrl}#${encodeURIComponent(service.toLowerCase())}` })), message: automationMessage(id, input) };
  if (id === 'meeting-scheduler' || id === 'no-show') return { client: name, slots: [1, 2, 3].slice(0, id === 'no-show' ? 2 : 3).map((days, index) => new Date(Date.now() + days * 86400000 + (12 + index * 2) * 3600000).toISOString()), calendarConnected: Boolean(process.env.GOOGLE_CALENDAR_ID), message: automationMessage(id, input) };
  if (id === 'contract-invoice') return { client: name, service, amount: Number(String(input.budget || input.value || 0).replace(/[^0-9]/g, '')) || 0, documents: ['contract', 'invoice'], paymentTerms: '50% advance, balance before final delivery' };
  if (id === 'winback') return { client: name, inactiveDays: Number(input.inactiveDays || 90), offer: cleanText(input.offer || 'Special comeback offer'), message: automationMessage(id, input) };
  if (id === 'faq-bot') return { active: true, mode: 'knowledge-and-button routing', knowledgeTopics: ['services', 'portfolio', 'podcast booking', 'location', 'payment'], handoffEnabled: true };
  if (id === 'client-portal') return { client: name, progress: Number(input.progress || 0), milestones: ['Requirement confirmed', 'Production in progress', 'Client review', 'Final delivery'], shareable: true };
  if (id === 'auto-wishes') return { client: name, occasion: cleanText(input.occasion || 'Birthday'), deliveryTime: cleanText(input.deliveryTime || '09:00 Asia/Karachi'), message: automationMessage(id, input) };
  if (id === 'voice-proposal') return { client: name, service, transcription: cleanText(input.notes), proposalDraft: { client: name, service, requirement: cleanText(input.notes), budget: cleanText(input.budget || 'To be confirmed') }, readyForReview: true };
  if (id === 'task-assigner') return { client: name, service, assignee: cleanText(input.assignee || 'Production Team'), tasks: ['Confirm scope', 'Production planning', 'Shoot or recording', 'Edit and quality check', 'Final delivery'] };
  if (id === 'ghost-recover') return { client: name, proposalAgeHours: Number(input.proposalAgeHours || 48), offer: cleanText(input.offer || '10% off today only'), message: automationMessage(id, input) };
  if (id === 'referral') {
    const reviewVerified = cleanText(input.reviewStatus).toLowerCase() === 'verified' || Boolean(input.reviewVerified);
    return {
      client: name,
      stage: reviewVerified ? 'referral_offer' : 'review_request',
      reviewVerified,
      reviewProof: cleanText(input.reviewProof),
      reviewUrl: cleanText(input.reviewUrl || process.env.GOOGLE_REVIEW_URL || 'https://razaproductions.com'),
      reward: reviewVerified ? cleanText(input.reward || '1 free short video') : null,
      message: automationMessage(id, input),
      nextStep: reviewVerified ? 'Send referral reward offer' : 'Wait for review screenshot, then mark 5-star review verified',
    };
  }
  if (id === 'lost-lead') return { campaign: 'Lost Lead Recovery', magnetTitle: cleanText(input.magnetTitle || `${service} Project Starter Guide`), offer: cleanText(input.offer || 'Free 15-minute project planning call'), bookingUrl: cleanText(input.bookingUrl || 'https://razaproductions.com/booking/'), generatedAt: now, printReady: true };
  return { queued: true, mode: 'automation', integrationReady: true };
}

async function saasSelfAudit() {
  const leads = await readJson(LEADS, seedLeads);
  const jobs = await readJson(SAAS_JOBS, []);
  const sample = { name: 'QA Client', phone: '03000000000', email: 'qa@example.com', service: 'Photography', niche: 'Podcast Studio', budget: '50000', deadline: '30 days', notes: 'Premium agency production requirement', occasion: 'Birthday', reviewUrl: 'https://razaproductions.com', offer: 'Test offer' };
  const now = new Date().toISOString();
  const results = saasFeatures.map((feature) => {
    try {
      const missing = missingFeatureFields(feature.id, sample);
      const output = featureOutput(feature.id, sample, leads, jobs, now);
      const valid = !missing.length && output && Object.keys(output).length > 0;
      return { id: feature.id, name: feature.name, ok: valid, missing, outputKeys: Object.keys(output || {}) };
    } catch (error) {
      return { id: feature.id, name: feature.name, ok: false, error: error.message };
    }
  });
  return { ok: results.every((item) => item.ok), checkedAt: now, passed: results.filter((item) => item.ok).length, total: results.length, results };
}

async function runSaasFeature(id, input = {}) {
  const feature = saasFeatures.find((item) => item.id === id);
  if (!feature) return { ok: false, error: 'Unknown feature' };
  const leads = await readJson(LEADS, seedLeads);
  const jobs = await readJson(SAAS_JOBS, []);
  const now = new Date().toISOString();
  const missing = missingFeatureFields(id, input);
  if (missing.length) return { ok: false, error: `Required fields missing: ${missing.join(', ')}`, missing };
  const output = featureOutput(id, input, leads, jobs, now);
  const internalOnly = ['content-calendar', 'competitor-alert', 'faq-bot', 'client-portal', 'voice-proposal', 'task-assigner', 'contract-invoice', 'viral-ideas', 'smart-portfolio', 'ceo-report'].includes(id);
  const job = { id: randomUUID(), featureId: id, featureName: feature.name, status: 'approval_required', channel: internalOnly ? 'internal' : 'whatsapp', risk: internalOnly ? 'low' : 'customer_message', input, output: { ...output, message: output.message || automationMessage(id, input), deliveryMode: 'owner_approval', reason: 'Manual run prepared for owner approval.' }, createdAt: now, updatedAt: now, history: [{ action: 'recommended', at: now, actor: input.actor || 'dashboard' }] };
  if (id === 'client-portal') job.output.portalUrl = `${input.baseUrl || 'https://razalead-os-app.vercel.app'}/portal/${input.leadId || job.id}`;
  if (id === 'proposal') job.output.downloadUrl = `/api/saas/jobs/${job.id}/proposal.pdf`;
  if (id === 'lost-lead') job.output.downloadUrl = `/api/saas/jobs/${job.id}/lead-magnet.pdf`;
  if (id === 'contract-invoice') {
    job.output.contractUrl = `/api/saas/jobs/${job.id}/contract.pdf`;
    job.output.invoiceUrl = `/api/saas/jobs/${job.id}/invoice.pdf`;
  }
  jobs.unshift(job);
  await writeJson(SAAS_JOBS, jobs.slice(0, 5000));
  if (id === 'proposal') {
    const settings = await getEmailSettings();
    if (settings.adminEmail) await sendTrackedEmail({ to:settings.adminAddress, subject:`Proposal generated for ${input.name || 'Client'}`, text:`A proposal was generated for ${input.name || 'Client'} (${input.service || 'Production Services'}). Download: ${input.baseUrl || 'https://razalead-os-app.vercel.app'}${job.output.downloadUrl}`, type:'admin_proposal' });
    if (settings.clientEmail && input.email) await sendTrackedEmail({ to:input.email, subject:`Your proposal from ${business.name}`, text:`Assalam o Alaikum ${input.name || ''}. Your proposal is ready: ${input.baseUrl || 'https://razalead-os-app.vercel.app'}${job.output.downloadUrl}`, type:'client_proposal' });
  }
  await audit('saas.feature.run', { featureId: id, jobId: job.id, actor: input.actor || 'dashboard' });
  return { ok: true, job };
}

function daysSince(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? Math.floor((Date.now() - time) / 86400000) : 0;
}

function meaningfulCustomerTurn(text) {
  const value = cleanText(text).toLowerCase();
  if (!value || value.length < 4) return false;
  return !['hi', 'hello', 'hey', 'start', 'menu', 'assalam o alaikum', 'aoa', 'ok', 'okay', 'thanks', 'thank you'].includes(value);
}

async function lostLeadCandidates() {
  const leads = await readJson(LEADS, seedLeads);
  const sessions = await readJson(SESSIONS, {});
  const sessionList = Object.values(sessions || {});
  return leads.map((lead) => {
    const phone = normalizeWhatsAppNumber(lead.phone);
    const session = sessionList.find((item) => normalizeWhatsAppNumber(item.phone) === phone);
    const customerTurns = (session?.transcript || []).filter((item) => item.role === 'user' && meaningfulCustomerTurn(item.text));
    const staffTurns = (session?.transcript || []).filter((item) => ['bot', 'assistant', 'human'].includes(item.role));
    const historyTurns = (lead.history || []).filter((item) => meaningfulCustomerTurn(item.message));
    const depth = Math.max(customerTurns.length, historyTurns.length);
    const age = daysSince(lead.lastMessageAt || lead.updatedAt || lead.createdAt);
    const status = cleanText(lead.status).toLowerCase();
    const label = cleanText(lead.label).toLowerCase();
    const meaningfulRequirement = meaningfulCustomerTurn(lead.message) && !/^(general inquiry|inquiry submitted)$/i.test(cleanText(lead.message));
    const engaged = depth >= 2 || (depth >= 1 && staffTurns.length >= 2 && (Number(lead.score || 0) >= 55 || meaningfulRequirement));
    const commerciallyRelevant = ['lost', 'qualified'].includes(status) || ['warm', 'hot'].includes(label) || Number(lead.score || 0) >= 55;
    const closed = ['won', 'completed', 'deal won'].includes(status);
    const eligible = Boolean(phone && age >= 3 && engaged && commerciallyRelevant && !closed);
    return { ...lead, lostMagnetEligible: eligible, inactivityDays: age, conversationDepth: depth, matchingReason: eligible ? `${depth} meaningful customer message${depth === 1 ? '' : 's'}, ${age} days inactive` : '' };
  }).filter((lead) => lead.lostMagnetEligible).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

async function queueAutomationJob(jobs, featureId, lead, reason, dueAt = new Date().toISOString()) {
  const blueprints = await automationBlueprints();
  const blueprint = blueprints.find((item) => item.id === featureId);
  if (blueprint && (!blueprint.enabled || blueprint.mode === 'manual')) return null;
  const key = `${featureId}:${lead.id}:${String(dueAt).slice(0, 10)}`;
  if (jobs.some((job) => job.automationKey === key)) return null;
  const feature = saasFeatures.find((item) => item.id === featureId);
  const message = automationMessage(featureId, lead);
  const internalOnly = ['content-calendar', 'competitor-alert', 'faq-bot', 'client-portal', 'voice-proposal', 'task-assigner', 'contract-invoice', 'viral-ideas', 'smart-portfolio', 'ceo-report'].includes(featureId);
  const job = {
    id: randomUUID(), automationKey: key, featureId, featureName: feature?.name || featureId,
    status: blueprint?.mode === 'automatic' ? 'ready_auto' : 'approval_required', channel: internalOnly ? 'internal' : 'whatsapp', risk: internalOnly ? 'low' : 'customer_message',
    blueprintMode: blueprint?.mode || 'approval',
    input: { leadId: lead.id, name: lead.name, phone: lead.phone, service: lead.service, email: lead.email || '' },
    output: { reason, dueAt, message, deliveryMode: blueprint?.mode === 'automatic' ? 'automatic' : 'owner_approval', instructions: blueprint?.instructions || '', preview: automationPreview(featureId, lead) },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [{ action: 'recommended', at: new Date().toISOString(), actor: 'Raza AI' }],
  };
  if (featureId === 'client-portal') job.output.portalUrl = `/portal/${lead.id}`;
  if (featureId === 'proposal') job.output.downloadUrl = `/api/saas/jobs/${job.id}/proposal.pdf`;
  if (featureId === 'lost-lead') {
    job.output.downloadUrl = `/api/saas/jobs/${job.id}/lead-magnet.pdf`;
    job.output.magnetTitle = `${cleanText(lead.service || 'Creative Production')} Project Starter Guide`;
    job.output.bookingUrl = 'https://razaproductions.com/booking/';
  }
  if (featureId === 'contract-invoice') {
    job.output.contractUrl = `/api/saas/jobs/${job.id}/contract.pdf`;
    job.output.invoiceUrl = `/api/saas/jobs/${job.id}/invoice.pdf`;
  }
  jobs.unshift(job);
  return job;
}

function automationMessage(featureId, lead = {}) {
  const name = cleanText(lead.name || 'there');
  const service = cleanText(lead.service || 'your project');
  const messages = {
    proposal: `Assalam o Alaikum ${name}. Aapki ${service} requirement ka branded proposal ready hai. Team approval ke baad proposal aapko WhatsApp par share karegi. Agar koi detail update karni ho to reply karein.`,
    'review-collector': `Assalam o Alaikum ${name}. Raza Productions ke sath kaam karne ka shukriya. Aap apna honest Google review share kar dein: ${process.env.GOOGLE_REVIEW_URL || 'https://razaproductions.com'}`,
    upsell: `Assalam o Alaikum ${name}. Aapke next ${service} project par Raza Productions ki taraf se 20% returning-client offer available hai. Details chahiye hon to reply karein.`,
    winback: `Assalam o Alaikum ${name}. Kaafi arsay se baat nahi hui. Aapke next creative project ke liye ek special comeback offer ready hai. Kya team details share kare?`,
    'auto-wishes': `Assalam o Alaikum ${name}. Raza Productions ki taraf se bohat mubarak aur best wishes. Khush rahain!`,
    'no-show': `Assalam o Alaikum ${name}. Aaj ki meeting miss ho gayi thi. Hum aapko do naye time slots offer kar sakte hain. Reschedule karna ho to reply karein.`,
    'ghost-recover': `Assalam o Alaikum ${name}. Aapki ${service} proposal par quick follow-up hai. Aaj confirmation par 10% limited offer available hai. Kya koi question clear karna hai?`,
    referral: cleanText(lead.reviewStatus).toLowerCase() === 'verified' || Boolean(lead.reviewVerified)
      ? `Assalam o Alaikum ${name}. Aapke 5-star review aur support ka bohat shukriya. Agar aap kisi business ya friend ko Raza Productions refer karein, to successful referral par aapko apne next project ke sath ${cleanText(lead.reward || '1 free short video')} complimentary milegi.`
      : `Assalam o Alaikum ${name}. Raza Productions ke sath kaam karne ka shukriya. Aap apna honest Google review yahan share kar dein: ${cleanText(lead.reviewUrl || process.env.GOOGLE_REVIEW_URL || 'https://razaproductions.com')} Review submit karne ke baad screenshot isi WhatsApp chat mein share kar dein. Verification ke baad hum aapke liye referral reward unlock kar denge.`,
    'lost-lead': `Assalam o Alaikum ${name}. Aapke ${service} project ko easy banane ke liye Raza Productions ne aapke liye ek free personalized planning guide prepare ki hai. Guide dekh kar jab ready hon, neeche Book Now select karein. Hamari team aapko free planning call par guide karegi.`,
    'meeting-scheduler': `Assalam o Alaikum ${name}. Aapki ${service} discussion ke liye 3 available meeting slots ready hain. Apna preferred slot select kar dein.`,
    'smart-portfolio': `Assalam o Alaikum ${name}. Aapki ${service} requirement ke mutabiq selected portfolio yahan dekhein: ${process.env.PORTFOLIO_URL || 'https://razaproductions.com'}`,
  };
  return messages[featureId] || '';
}

function automationPreview(featureId, lead = {}) {
  if (featureId === 'proposal') return { document: 'Branded proposal PDF', client: lead.name, service: lead.service };
  if (featureId === 'content-calendar') return { calendar: contentCalendar('Podcast Studio') };
  if (featureId === 'contract-invoice') return { documents: ['Contract PDF', 'Invoice PDF'], client: lead.name, amount: Number(lead.value || 0) };
  if (featureId === 'meeting-scheduler' || featureId === 'no-show') return { slots: [1, 2, 3].slice(0, featureId === 'no-show' ? 2 : 3).map((day, i) => new Date(Date.now() + day * 86400000 + (11 + i * 2) * 3600000).toISOString()) };
  if (featureId === 'task-assigner') return { tasks: ['Client confirmation', 'Production planning', 'Shoot/recording', 'Edit and QA', 'Final delivery'] };
  if (featureId === 'viral-ideas') return { ideas: viralIdeas(lead.service || 'Podcast Studio') };
  if (featureId === 'smart-portfolio') return { portfolio: process.env.PORTFOLIO_URL || 'https://razaproductions.com', niche: lead.service || 'Production' };
  if (featureId === 'client-portal') return { portalPath: `/portal/${lead.id}`, progress: Number(lead.progress || 0) };
  if (featureId === 'lost-lead') return { magnetTitle: `${cleanText(lead.service || 'Creative Production')} Project Starter Guide`, format: 'Branded PDF', delivery: 'WhatsApp document + Book Now CTA', bookingUrl: 'https://razaproductions.com/booking/' };
  if (featureId === 'faq-bot') return { active: true, knowledgeTopics: ['services', 'portfolio', 'podcast booking', 'location', 'payment'] };
  return { lead: lead.name, service: lead.service };
}

async function automationSettings(input) {
  const defaults = { approvalRequired: true, scanExistingLeads: true, whatsappEnabled: true, quietHoursStart: 21, quietHoursEnd: 9, updatedAt: null };
  if (!input) return readJson(AUTOMATION_SETTINGS, defaults);
  const current = await readJson(AUTOMATION_SETTINGS, defaults);
  const next = { ...current, ...input, approvalRequired: true, updatedAt: new Date().toISOString() };
  await writeJson(AUTOMATION_SETTINGS, next);
  await audit('automation.settings.updated', { actor: input.actor || 'owner' });
  return next;
}

async function executeAutomationJob(job) {
  if (job.channel === 'whatsapp') {
    if (!job.input?.phone) return { ok: false, error: 'Lead phone number missing' };
    if (!job.output?.message) return { ok: false, error: 'Message draft missing' };
    if (job.featureId === 'proposal' && job.output?.downloadUrl) {
      const baseUrl = cleanText(job.input?.baseUrl || process.env.APP_URL || 'https://razalead-os-app.vercel.app').replace(/\/$/, '');
      const documentUrl = job.output.downloadUrl.startsWith('http') ? job.output.downloadUrl : `${baseUrl}${job.output.downloadUrl}`;
      const delivery = await sendWhatsAppPayload(job.input.phone, {
        type: 'document',
        document: {
          link: documentUrl,
          filename: `Raza-Proposal-${compact(job.input?.name || 'Client', 50).replace(/[^a-z0-9]+/gi, '-')}.pdf`,
          caption: compact(job.output.message, 1024),
        },
      });
      return { ok: delivery.sent, delivery, documentUrl, error: delivery.sent ? '' : (delivery.response?.error?.message || delivery.reason || 'Proposal PDF delivery failed') };
    }
    if (job.featureId === 'lost-lead' && job.output?.downloadUrl) {
      const baseUrl = cleanText(job.input?.baseUrl || process.env.APP_URL || 'https://razalead-os-app.vercel.app').replace(/\/$/, '');
      const documentUrl = job.output.downloadUrl.startsWith('http') ? job.output.downloadUrl : `${baseUrl}${job.output.downloadUrl}`;
      const documentDelivery = await sendWhatsAppPayload(job.input.phone, {
        type: 'document',
        document: {
          link: documentUrl,
          filename: `Raza-Free-Guide-${compact(job.input?.service || 'Project', 45).replace(/[^a-z0-9]+/gi, '-')}.pdf`,
          caption: compact(job.output.message, 1024),
        },
      });
      if (!documentDelivery.sent) return { ok: false, delivery: documentDelivery, documentUrl, error: documentDelivery.response?.error?.message || documentDelivery.reason || 'Lead magnet PDF delivery failed' };
      const ctaDelivery = await sendWhatsAppText(job.input.phone, 'Ready to restart your project? Select an option below.', [
        { id: 'lost_lead_book_now', label: 'Book Now' },
        { id: 'lost_lead_human_help', label: 'Talk to Team' },
      ]);
      return { ok: ctaDelivery.sent, documentDelivery, ctaDelivery, documentUrl, error: ctaDelivery.sent ? '' : (ctaDelivery.response?.error?.message || ctaDelivery.reason || 'Book Now CTA delivery failed') };
    }
    if (['meeting-scheduler', 'no-show'].includes(job.featureId)) {
      const slots = (job.output?.preview?.slots || job.output?.slots || []).slice(0, job.featureId === 'no-show' ? 2 : 3);
      if (!slots.length) return { ok: false, error: 'Meeting slots are missing' };
      const buttons = slots.map((slot) => ({ id: `meeting_slot_${new Date(slot).getTime()}`, label: meetingSlotLabel(slot) }));
      const delivery = await sendWhatsAppText(job.input.phone, job.output.message, buttons);
      return { ok: delivery.sent, delivery, slots, error: delivery.sent ? '' : (delivery.response?.error?.message || delivery.reason || 'Meeting slots delivery failed') };
    }
    const delivery = await sendWhatsAppText(job.input.phone, job.output.message);
    return { ok: delivery.sent, delivery, error: delivery.sent ? '' : (delivery.response?.error?.message || delivery.reason || 'WhatsApp delivery failed') };
  }
  const input = job.input || {};
  const featureId = job.featureId;
  let result = job.output?.preview || { completed: true };
  if (featureId === 'content-calendar') result = { calendar: contentCalendar(input.niche || 'Podcast Studio'), export: 'CSV-ready' };
  else if (featureId === 'viral-ideas') result = { ideas: viralIdeas(input.niche || input.service || 'Podcast Studio') };
  else if (featureId === 'meeting-scheduler' || featureId === 'no-show') result = { slots: job.output?.preview?.slots || [], calendarConnected: Boolean(process.env.GOOGLE_CALENDAR_ID), booking: 'Awaiting selected slot' };
  else if (featureId === 'smart-portfolio') result = { portfolio: process.env.PORTFOLIO_URL || knowledge.portfolioUrl, niche: input.service || 'Production' };
  else if (featureId === 'faq-bot') result = { active: true, knowledgeTopics: knowledge.faqs?.length || 0, mode: 'button-and-FAQ routing' };
  else if (featureId === 'client-portal') result = { portalUrl: job.output?.portalUrl || `/portal/${input.leadId || input.id || 'client'}`, progress: 0, access: 'Shareable client portal link ready' };
  else if (featureId === 'contract-invoice') result = { documents: [{ name: 'Contract PDF', url: job.output?.contractUrl }, { name: 'Invoice PDF', url: job.output?.invoiceUrl }], client: input.name || 'Client', amount: Number(input.value || input.budget || 0), status: 'generated' };
  else if (featureId === 'task-assigner') result = { tasks: ['Client confirmation', 'Production planning', 'Shoot/recording', 'Edit and QA', 'Final delivery'], status: 'ready for team assignment' };
  else if (featureId === 'competitor-alert') result = await checkCompetitors();
  else if (featureId === 'voice-proposal') result = { status: 'voice-note input ready', transcription: 'Upload a voice note from the lead to continue.' };
  else if (['review-collector', 'referral', 'upsell', 'winback', 'ghost-recover', 'lost-lead', 'auto-wishes'].includes(featureId)) result = { message: job.output?.message || '', status: 'message approved and queued' };
  else if (featureId === 'ceo-report') result = { report: job.output || {}, status: 'report generated' };
  return { ok: true, result };
}

function meetingSlotLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Select time';
  return new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(date).replace(',', '');
}

async function automationAction(input) {
  const jobs = await readJson(SAAS_JOBS, []);
  const job = jobs.find((item) => item.id === cleanText(input.jobId));
  if (!job) return { ok: false, error: 'Automation job not found' };
  if (!job.input) job.input = {};
  if (!job.input.phone || !String(job.input.phone).match(/\d{10,}/)) {
    const leads = await readJson(LEADS, seedLeads);
    const normalizedName = cleanText(job.input.name || '').replace(/(?:\+?92|0)?3[\d\s-]{8,18}/g, '').trim().toLowerCase();
    const linked = leads.find((lead) => (job.input.leadId && lead.id === job.input.leadId) || (normalizedName && cleanText(lead.name).toLowerCase() === normalizedName));
    const embedded = String(job.input.name || '').match(/(?:\+?92|0)?3[\d\s-]{8,18}/)?.[0];
    const resolved = linked?.phone || embedded || '';
    if (resolved) {
      job.input.phone = resolved.replace(/[\s-]/g, '');
      job.history = [...(job.history || []), { action: 'phone_resolved', at: new Date().toISOString(), actor: 'Raza OS' }];
    }
  }
  const action = cleanText(input.action).toLowerCase();
  if (input.message !== undefined) job.output.message = compact(input.message, 3900);
  if (input.dueAt) job.output.dueAt = new Date(input.dueAt).toISOString();
  if (action === 'reject') job.status = 'rejected';
  else if (action === 'schedule') job.status = 'scheduled';
  else if (action === 'approve') {
    job.status = 'processing';
    const execution = await executeAutomationJob(job);
    job.execution = execution;
    job.status = execution.ok ? 'completed' : 'failed';
    job.completedAt = execution.ok ? new Date().toISOString() : null;
  } else if (action === 'edit') job.status = 'approval_required';
  else return { ok: false, error: 'Unknown action' };
  job.updatedAt = new Date().toISOString();
  job.history = [...(job.history || []), { action, at: job.updatedAt, actor: input.actor || 'owner' }];
  await writeJson(SAAS_JOBS, jobs);
  await audit(`automation.${action}`, { actor: input.actor || 'owner', jobId: job.id, featureId: job.featureId, status: job.status });
  return { ok: job.status !== 'failed', job };
}

async function runScheduledAutomationJobs() {
  const jobs = await readJson(SAAS_JOBS, []);
  const due = jobs.filter((job) => job.status === 'scheduled' && new Date(job.output?.dueAt || 0).getTime() <= Date.now());
  const results = [];
  for (const job of due) {
    job.status = 'approval_required';
    job.updatedAt = new Date().toISOString();
    job.history = [...(job.history || []), { action: 'due_for_approval', at: job.updatedAt, actor: 'Raza AI' }];
    results.push({ id: job.id, status: job.status });
  }
  await writeJson(SAAS_JOBS, jobs);
  return results;
}

async function runAutomationScanner() {
  const leads = await readJson(LEADS, seedLeads);
  const jobs = await readJson(SAAS_JOBS, []);
  const lostCandidateIds = new Set((await lostLeadCandidates()).map((lead) => lead.id));
  const created = [];
  for (const lead of leads) {
    const age = daysSince(lead.updatedAt || lead.lastMessageAt || lead.createdAt);
    const status = cleanText(lead.status).toLowerCase();
    if (status === 'completed' && age >= 3) created.push(await queueAutomationJob(jobs, 'review-collector', lead, 'Project completed 3+ days ago'));
    if (age >= 60) created.push(await queueAutomationJob(jobs, 'upsell', lead, 'Client inactive for 60+ days'));
    if (age >= 90) created.push(await queueAutomationJob(jobs, 'winback', lead, 'Client inactive for 90+ days'));
    if (lostCandidateIds.has(lead.id)) created.push(await queueAutomationJob(jobs, 'lost-lead', lead, `Meaningful conversation stopped ${age}+ days ago`));
    if (lead.proposalSentAt && daysSince(lead.proposalSentAt) >= 2 && !lead.proposalRepliedAt) created.push(await queueAutomationJob(jobs, 'ghost-recover', lead, 'Proposal unanswered for 48+ hours'));
    if (['qualified', 'hot'].includes(status) || Number(lead.score || 0) >= 75) created.push(await queueAutomationJob(jobs, 'proposal', lead, 'High-intent lead needs a branded proposal'));
    if (['qualified', 'new'].includes(status) && cleanText(lead.message)) created.push(await queueAutomationJob(jobs, 'smart-portfolio', lead, 'Lead needs service-matched portfolio proof'));
    if (['qualified', 'hot'].includes(status)) created.push(await queueAutomationJob(jobs, 'meeting-scheduler', lead, 'Qualified lead is ready for a meeting'));
    if (['won', 'deal won'].includes(status)) {
      created.push(await queueAutomationJob(jobs, 'contract-invoice', lead, 'Deal Won requires contract and invoice'));
      created.push(await queueAutomationJob(jobs, 'task-assigner', lead, 'Deal Won requires production tasks'));
      created.push(await queueAutomationJob(jobs, 'client-portal', lead, 'Won client needs a delivery portal'));
    }
    if (cleanText(lead.meetingStatus).toLowerCase() === 'missed' && Date.now() - new Date(lead.meetingAt || 0).getTime() >= 300000) created.push(await queueAutomationJob(jobs, 'no-show', lead, 'Meeting missed 5+ minutes ago'));
    if (Number(lead.reviewRating || 0) >= 5 && (lead.reviewVerified || cleanText(lead.reviewProofUrl))) {
      created.push(await queueAutomationJob(jobs, 'referral', { ...lead, reviewStatus: 'verified' }, 'Verified five-star review is eligible for referral reward'));
    }
    const dob = lead.dob ? new Date(lead.dob) : null;
    const today = new Date();
    if (dob && dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) created.push(await queueAutomationJob(jobs, 'auto-wishes', lead, 'Client birthday is today'));
  }
  const systemLead = { id: 'SYSTEM', name: business.name, phone: business.whatsapp, service: 'Agency Operations' };
  created.push(await queueAutomationJob(jobs, 'content-calendar', systemLead, 'Daily 30-day content calendar readiness check'));
  created.push(await queueAutomationJob(jobs, 'competitor-alert', systemLead, 'Daily competitor channel monitoring check'));
  created.push(await queueAutomationJob(jobs, 'faq-bot', systemLead, '24/7 FAQ knowledge health check'));
  created.push(await queueAutomationJob(jobs, 'voice-proposal', systemLead, 'Voice-note transcription and proposal workflow health check'));
  created.push(await queueAutomationJob(jobs, 'viral-ideas', systemLead, 'Daily viral idea recommendations'));
  const reportFeature = saasFeatures.find((item) => item.id === 'ceo-report');
  const reportKey = `ceo-report:${new Date().toISOString().slice(0, 10)}`;
  if (!jobs.some((job) => job.automationKey === reportKey)) {
    const topLead = [...leads].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
    const report = { id: randomUUID(), automationKey: reportKey, featureId: 'ceo-report', featureName: reportFeature.name, status: 'approval_required', channel: 'internal', risk: 'low', input: {}, output: { leads: leads.length, won: leads.filter((lead) => cleanText(lead.status).toLowerCase() === 'won').length, revenue: leads.filter((lead) => ['won', 'completed'].includes(cleanText(lead.status).toLowerCase())).reduce((sum, lead) => sum + Number(lead.value || 0), 0), topLead: topLead?.name || 'None', dueAt: new Date().toISOString(), deliveryMode: 'owner_approval' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [{ action: 'recommended', at: new Date().toISOString(), actor: 'Raza AI' }] };
    jobs.unshift(report); created.push(report);
  }
  const safeAutoFeatures = new Set(['content-calendar', 'competitor-alert', 'faq-bot', 'client-portal', 'task-assigner', 'contract-invoice', 'viral-ideas', 'smart-portfolio', 'ceo-report']);
  for (const job of created.filter(Boolean)) {
    if (job.blueprintMode !== 'automatic' || (job.channel === 'internal' && !safeAutoFeatures.has(job.featureId))) continue;
    job.status = 'processing';
    job.execution = await executeAutomationJob(job);
    job.status = job.execution.ok ? 'completed' : 'failed';
    job.completedAt = job.execution.ok ? new Date().toISOString() : null;
    job.updatedAt = new Date().toISOString();
    job.history = [...(job.history || []), { action: 'auto_execute_internal', at: job.updatedAt, actor: 'Raza AI' }];
  }
  await writeJson(SAAS_JOBS, jobs.slice(0, 5000));
  await runScheduledAutomationJobs();
  await audit('automation.scan.completed', { created: created.filter(Boolean).length, checkedLeads: leads.length });
  return { ok: true, checkedLeads: leads.length, created: created.filter(Boolean) };
}

async function runAutomationCycle() {
  const scan = await runAutomationScanner();
  const followups = await runDueFollowups();
  return { ok: true, checkedAt: new Date().toISOString(), scan, followups };
}

async function saasOverview() {
  const jobs = await readJson(SAAS_JOBS, []);
  let migrated = false;
  for (const job of jobs) {
    if (job.status === 'queued') {
      job.status = 'approval_required';
      job.channel = job.channel || (['content-calendar', 'competitor-alert', 'faq-bot', 'client-portal', 'voice-proposal', 'task-assigner', 'contract-invoice', 'viral-ideas', 'smart-portfolio', 'ceo-report'].includes(job.featureId) ? 'internal' : 'whatsapp');
      job.risk = job.risk || (job.channel === 'internal' ? 'low' : 'customer_message');
      job.output = { ...(job.output || {}), message: job.output?.message || automationMessage(job.featureId, job.input || {}), deliveryMode: 'owner_approval', reason: job.output?.reason || 'Legacy job migrated to approval queue.' };
      job.updatedAt = new Date().toISOString();
      job.history = [...(job.history || []), { action: 'migrated_to_approval_queue', at: job.updatedAt, actor: 'Raza OS' }];
      migrated = true;
    }
  }
  if (migrated) await writeJson(SAAS_JOBS, jobs);
  return {
    features: saasFeatures.map((feature) => ({ ...feature, runs: jobs.filter((job) => job.featureId === feature.id).length })),
    jobs: jobs.slice(0, 250),
    queue: {
      approvalRequired: jobs.filter((job) => job.status === 'approval_required').length,
      scheduled: jobs.filter((job) => job.status === 'scheduled').length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
    },
    settings: await automationSettings(),
    integrations: {
      whatsapp: Boolean((await getMetaConfig()).accessToken),
      openai: Boolean(aiConfig.openaiApiKey),
      googleCalendar: Boolean(process.env.GOOGLE_CALENDAR_ID),
      youtube: Boolean(process.env.YOUTUBE_API_KEY),
      competitorSources: (await getCompetitors()).length,
      persistentStorage: Boolean(DATABASE_URL) || !process.env.VERCEL,
    },
  };
}

export async function appHandler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'OPTIONS') return send(res, 204, {});
      if (url.pathname === '/' || url.pathname === '/dashboard') {
        const reactIndex = path.join(__dirname, 'ui-dist', 'index.html');
        return send(res, 200, await readFile(existsSync(reactIndex) ? reactIndex : path.join(__dirname, 'public', 'index.html'), 'utf8'), 'text/html');
      }
      const portalMatch = url.pathname.match(/^\/portal\/([^/]+)$/);
      if (portalMatch && req.method === 'GET') {
        const leads = await readJson(LEADS, seedLeads);
        const lead = leads.find((item) => item.id === decodeURIComponent(portalMatch[1]));
        if (!lead) return send(res, 404, 'Client portal not found', 'text/plain');
        const project = await getProject(lead.id);
        return send(res, 200, portalHtml(lead, project), 'text/html');
      }
      if (url.pathname.startsWith('/assets/')) {
        const assetName = path.basename(url.pathname);
        const assetPath = path.join(__dirname, 'ui-dist', 'assets', assetName);
        if (!existsSync(assetPath)) return send(res, 404, 'Not found', 'text/plain');
        const type = assetName.endsWith('.css') ? 'text/css' : assetName.endsWith('.js') ? 'application/javascript' : 'application/octet-stream';
        return send(res, 200, await readFile(assetPath), type);
      }
      if (url.pathname === '/manifest.webmanifest') return send(res, 200, await readFile(path.join(__dirname, 'public', 'manifest.webmanifest'), 'utf8'), 'application/manifest+json');
      if (url.pathname === '/sw.js') return send(res, 200, await readFile(path.join(__dirname, 'public', 'sw.js'), 'utf8'), 'application/javascript');
      if (url.pathname === '/icon.svg') return send(res, 200, await readFile(path.join(__dirname, 'public', 'icon.svg'), 'utf8'), 'image/svg+xml');
      if (url.pathname === '/api/config') {
        const metaConfig = await getMetaConfig();
        return send(res, 200, {
          business,
          knowledge: await getKnowledge(),
          meta: {
            connected: Boolean(metaConfig.phoneNumberId && metaConfig.accessToken),
            graphVersion: metaConfig.graphVersion,
            phoneNumberId: metaConfig.phoneNumberId ? 'configured' : 'missing',
            wabaId: metaConfig.wabaId ? 'configured' : 'missing',
            accessToken: metaConfig.accessToken ? 'configured' : 'missing',
          },
          ai: {
            connected: Boolean(aiConfig.geminiApiKey || aiConfig.groqApiKey || aiConfig.openaiApiKey),
            provider: aiConfig.provider || (aiConfig.geminiApiKey ? 'gemini' : aiConfig.groqApiKey ? 'groq' : aiConfig.openaiApiKey ? 'openai' : 'safe-fallback'),
            model: aiConfig.provider === 'groq' ? aiConfig.groqModel : aiConfig.provider === 'openai' ? aiConfig.openaiModel : aiConfig.provider === 'gemini' ? aiConfig.geminiModel : aiConfig.geminiApiKey ? aiConfig.geminiModel : aiConfig.groqApiKey ? aiConfig.groqModel : aiConfig.openaiApiKey ? aiConfig.openaiModel : 'knowledge-qualified',
            mode: aiConfig.geminiApiKey || aiConfig.groqApiKey || aiConfig.openaiApiKey ? 'AI qualification with human escalation' : 'Knowledge qualification with human escalation',
          },
          storage: { provider: DATABASE_URL ? 'Postgres' : (process.env.VERCEL ? 'Temporary Vercel storage' : 'Local JSON'), persistent: Boolean(DATABASE_URL) || !process.env.VERCEL },
        });
      }
      if (url.pathname === '/api/health' && req.method === 'GET') {
        const overview = await saasOverview();
        return send(res, 200, { ok: true, checkedAt: new Date().toISOString(), queue: overview.queue, integrations: overview.integrations });
      }
      if (url.pathname === '/api/dashboard' && req.method === 'GET') {
        const [dashboardStats, leads, dashboardAnalytics, team, auditItems, saas] = await Promise.all([
          stats(),
          readJson(LEADS, seedLeads).then((items) => items.map(enrichLead)),
          analytics(),
          publicUsers(),
          readJson(AUDIT_LOG, []),
          saasOverview(),
        ]);
        return send(res, 200, { stats: dashboardStats, leads, analytics: dashboardAnalytics, team, audit: auditItems, saas });
      }
      if (url.pathname === '/api/notifications/pulse' && req.method === 'GET') {
        const [leads, sessions] = await Promise.all([readJson(LEADS, seedLeads), memoryList()]);
        const latestMessageAt = sessions.map((item) => item.updatedAt || item.lastMessageAt || '').filter(Boolean).sort().at(-1) || '';
        return send(res, 200, { leads: leads.length, conversations: sessions.length, latestMessageAt, checkedAt: new Date().toISOString() });
      }
      if (url.pathname === '/api/team' && req.method === 'GET') return send(res, 200, { users: await publicUsers() });
      if (url.pathname === '/api/auth/login' && req.method === 'POST') return send(res, 200, await login(await getBody(req)));
      if (url.pathname === '/api/knowledge' && req.method === 'GET') return send(res, 200, await getKnowledge());
      if (url.pathname === '/api/knowledge' && req.method === 'POST') return send(res, 200, await saveKnowledge(await getBody(req)));
      if (url.pathname === '/api/analytics' && req.method === 'GET') return send(res, 200, await analytics());
      if (url.pathname === '/api/ai/health' && req.method === 'GET') return send(res, 200, await aiHealth());
      if (url.pathname === '/api/memory' && req.method === 'GET') return send(res, 200, { sessions: await memoryList() });
      if (url.pathname === '/api/live-inbox' && req.method === 'GET') return send(res, 200, { sessions: await memoryList(), checkedAt: new Date().toISOString() });
      if (url.pathname === '/api/unresolved' && req.method === 'GET') return send(res, 200, { items: await readJson(UNRESOLVED, []) });
      if (url.pathname === '/api/widget/message' && req.method === 'POST') return send(res, 200, await widgetTurn(await getBody(req)));
      if (url.pathname === '/api/email/settings' && req.method === 'GET') return send(res, 200, { settings: await getEmailSettings() });
      if (url.pathname === '/api/email/settings' && req.method === 'POST') return send(res, 200, await saveEmailSettings(await getBody(req)));
      if (url.pathname === '/api/email/history' && req.method === 'GET') return send(res, 200, { items: await readJson(EMAIL_HISTORY, []) });
      if (url.pathname === '/api/live-inbox/pause' && req.method === 'POST') return send(res, 200, await setBotPause(await getBody(req)));
      if (url.pathname === '/api/live-inbox/update' && req.method === 'POST') return send(res, 200, await updateConversation(await getBody(req)));
      if (url.pathname === '/api/live-inbox/manual-reply' && req.method === 'POST') return send(res, 200, await manualReply(await getBody(req)));
      if (url.pathname === '/api/whatsapp/media/upload' && req.method === 'POST') return send(res, 200, await uploadWhatsAppMedia(await getBody(req)));
      const whatsappMediaMatch = url.pathname.match(/^\/api\/whatsapp\/media\/([^/]+)$/);
      if (whatsappMediaMatch && req.method === 'GET') {
        const media = await fetchWhatsAppMedia(decodeURIComponent(whatsappMediaMatch[1]));
        if (!media.ok) return send(res, media.status || 404, { error: media.error || 'Media not found' });
        res.writeHead(200, { ...headers(media.type), 'cache-control': 'private, max-age=300', 'content-disposition': 'inline' });
        return res.end(media.buffer);
      }
      if (url.pathname === '/api/templates' && req.method === 'GET') return send(res, 200, { templates: await getTemplates() });
      if (url.pathname === '/api/templates' && req.method === 'POST') return send(res, 200, await saveTemplate(await getBody(req)));
      if (url.pathname === '/api/templates/remove' && req.method === 'POST') return send(res, 200, await removeTemplate(await getBody(req)));
      if (url.pathname === '/api/quick-replies' && req.method === 'GET') return send(res, 200, { items: await getQuickReplies() });
      if (url.pathname === '/api/quick-replies/sync' && req.method === 'POST') return send(res, 200, await syncQuickReplies(await getBody(req)));
      if (url.pathname === '/api/quick-replies/remove' && req.method === 'POST') return send(res, 200, await removeQuickReply(await getBody(req)));
      if (url.pathname === '/api/competitors' && req.method === 'GET') return send(res, 200, { items: await getCompetitors() });
      if (url.pathname === '/api/competitors' && req.method === 'POST') return send(res, 200, await saveCompetitor(await getBody(req)));
      if (url.pathname === '/api/competitors/remove' && req.method === 'POST') return send(res, 200, await removeCompetitor(await getBody(req)));
      if (url.pathname === '/api/competitors/check' && req.method === 'POST') return send(res, 200, await checkCompetitors());
      if (url.pathname === '/api/audit-log' && req.method === 'GET') return send(res, 200, { items: await readJson(AUDIT_LOG, []) });
      if (url.pathname === '/api/backup' && req.method === 'GET') return send(res, 200, await backupBundle());
      if (url.pathname === '/api/saas/features' && req.method === 'GET') return send(res, 200, await saasOverview());
      if (url.pathname === '/api/saas/audit' && req.method === 'GET') return send(res, 200, await saasSelfAudit());
      if (url.pathname === '/api/lost-leads/eligible' && req.method === 'GET') return send(res, 200, { items: await lostLeadCandidates() });
      if (url.pathname === '/api/automations/scan' && req.method === 'POST') return send(res, 200, await runAutomationScanner());
      if (url.pathname === '/api/automations/action' && req.method === 'POST') return send(res, 200, await automationAction(await getBody(req)));
      if (url.pathname === '/api/automations/settings' && req.method === 'GET') return send(res, 200, { settings: await automationSettings() });
      if (url.pathname === '/api/automations/settings' && req.method === 'POST') return send(res, 200, { settings: await automationSettings(await getBody(req)) });
      if (url.pathname === '/api/automation-blueprints' && req.method === 'GET') return send(res, 200, { items: await automationBlueprints() });
      if (url.pathname === '/api/automation-blueprints' && req.method === 'POST') return send(res, 200, { items: await automationBlueprints(await getBody(req)) });
      if (url.pathname === '/api/saas/run' && req.method === 'POST') {
        const body = await getBody(req);
        return send(res, 200, await runSaasFeature(cleanText(body.featureId), body));
      }
      const proposalMatch = url.pathname.match(/^\/api\/saas\/jobs\/([^/]+)\/proposal\.pdf$/);
      if (proposalMatch && req.method === 'GET') {
        const jobs = await readJson(SAAS_JOBS, []);
        const job = jobs.find((item) => item.id === proposalMatch[1] && item.featureId === 'proposal');
        if (!job) return send(res, 404, { error: 'Proposal not found' });
        return sendDownload(res, proposalPdf(job), 'application/pdf', `Raza-Proposal-${cleanText(job.input?.name || 'Client').replace(/[^a-z0-9]+/gi, '-')}.pdf`);
      }
      const magnetMatch = url.pathname.match(/^\/api\/saas\/jobs\/([^/]+)\/lead-magnet\.pdf$/);
      if (magnetMatch && req.method === 'GET') {
        const jobs = await readJson(SAAS_JOBS, []);
        const job = jobs.find((item) => item.id === magnetMatch[1] && item.featureId === 'lost-lead');
        if (!job) return send(res, 404, { error: 'Lead magnet not found' });
        return sendDownload(res, lostLeadMagnetPdf(job), 'application/pdf', `Raza-Free-Guide-${cleanText(job.input?.service || 'Project').replace(/[^a-z0-9]+/gi, '-')}.pdf`);
      }
      const contractMatch = url.pathname.match(/^\/api\/saas\/jobs\/([^/]+)\/(contract|invoice)\.pdf$/);
      if (contractMatch && req.method === 'GET') {
        const jobs = await readJson(SAAS_JOBS, []);
        const job = jobs.find((item) => item.id === contractMatch[1] && item.featureId === 'contract-invoice');
        if (!job) return send(res, 404, { error: 'Contract and invoice job not found' });
        const kind = contractMatch[2];
        const pdf = kind === 'contract' ? contractPdf(job) : invoicePdf(job);
        return sendDownload(res, pdf, 'application/pdf', `Raza-${kind}-${cleanText(job.input?.name || 'Client').replace(/[^a-z0-9]+/gi, '-')}.pdf`);
      }
      if (url.pathname === '/api/saas/content-calendar.csv' && req.method === 'GET') {
        const rows = contentCalendar(url.searchParams.get('niche') || 'Podcast Studio');
        const columns = ['day', 'niche', 'format', 'topic', 'hook', 'cta', 'bestPostingTime'];
        return send(res, 200, [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n'), 'text/csv');
      }
      if (url.pathname === '/api/cron/automations' && (req.method === 'GET' || req.method === 'POST')) {
        if (!cronAuthorized(req)) return send(res, 401, { error: 'Unauthorized scheduler request' });
        return send(res, 200, await runAutomationCycle());
      }
      if (url.pathname === '/api/crm/export.csv' && req.method === 'GET') return send(res, 200, await crmCsv(), 'text/csv');
      if (url.pathname === '/api/crm/export.json' && req.method === 'GET') {
        return send(res, 200, {
          exportedAt: new Date().toISOString(),
          leads: await readJson(LEADS, seedLeads),
          followups: await readJson(FOLLOWUPS, []),
          sessions: await memoryList(),
        });
      }
      if (url.pathname === '/api/meta/settings' && req.method === 'GET') {
        const metaConfig = await getMetaConfig();
        return send(res, 200, {
          graphVersion: metaConfig.graphVersion,
          phoneNumberId: metaConfig.phoneNumberId || '',
          wabaId: metaConfig.wabaId || '',
          accessToken: metaConfig.accessToken ? 'configured' : 'missing',
        });
      }
      if (url.pathname === '/api/meta/settings' && req.method === 'POST') return send(res, 200, await saveMetaConfig(await getBody(req)));
      if (url.pathname === '/api/stats' && req.method === 'GET') return send(res, 200, await stats());
      if (url.pathname === '/api/leads' && req.method === 'GET') return send(res, 200, (await readJson(LEADS, seedLeads)).map(enrichLead));
      if (url.pathname === '/api/leads' && req.method === 'POST') return send(res, 200, await addLead(await getBody(req), 'Dashboard'));
      const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
      if (projectMatch && req.method === 'GET') {
        const project = await getProject(decodeURIComponent(projectMatch[1]));
        return project ? send(res, 200, { project }) : send(res, 404, { error: 'Client project not found' });
      }
      if (projectMatch && req.method === 'POST') {
        const project = await saveProject(decodeURIComponent(projectMatch[1]), await getBody(req));
        return project ? send(res, 200, { project }) : send(res, 404, { error: 'Client project not found' });
      }
      const projectSubmissionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/submissions$/);
      if (projectSubmissionMatch && req.method === 'POST') {
        const submission = await addProjectSubmission(decodeURIComponent(projectSubmissionMatch[1]), await getBody(req));
        return submission ? send(res, 200, { ok: true, submission }) : send(res, 404, { error: 'Client project not found' });
      }
      const leadUpdateMatch = url.pathname.match(/^\/api\/leads\/([^/]+)$/);
      if (leadUpdateMatch && req.method === 'POST') {
        const leads = await readJson(LEADS, seedLeads);
        const index = leads.findIndex((item) => item.id === decodeURIComponent(leadUpdateMatch[1]));
        if (index < 0) return send(res, 404, { error: 'Lead not found' });
        const input = await getBody(req);
        const allowed = ['name','email','service','status','value','progress','proposalSentAt','proposalRepliedAt','meetingStatus','meetingAt','reviewRating','reviewVerified','reviewProofUrl','dob','nextDelivery','portalNote'];
        for (const key of allowed) if (input[key] !== undefined) leads[index][key] = ['value','progress','reviewRating'].includes(key) ? Number(input[key] || 0) : cleanText(input[key]);
        leads[index].updatedAt = new Date().toISOString();
        await writeJson(LEADS, leads);
        await audit('lead.updated', { actor: input.actor || 'owner', leadId: leads[index].id });
        return send(res, 200, { ok: true, lead: enrichLead(leads[index]) });
      }
      const requirementMatch = url.pathname.match(/^\/api\/leads\/([^/]+)\/requirement\.pdf$/);
      if (requirementMatch && req.method === 'GET') {
        const leads = await readJson(LEADS, seedLeads);
        const lead = leads.find((item) => item.id === requirementMatch[1]);
        if (!lead) return send(res, 404, { error: 'Lead not found' });
        return sendDownload(res, requirementPdf(lead), 'application/pdf', `Requirement-${cleanText(lead.name || lead.id).replace(/[^a-z0-9]+/gi, '-')}.pdf`);
      }
      if (url.pathname === '/api/followups' && req.method === 'GET') {
        return send(res, 200, { items: await readJson(FOLLOWUPS, []), due: await dueFollowups() });
      }
      if (url.pathname === '/api/followups/schedule' && req.method === 'POST') return send(res, 200, { items: await scheduleCustomFollowup(await getBody(req)) });
      if (url.pathname === '/api/followups/run' && (req.method === 'POST' || req.method === 'GET')) {
        return send(res, 200, { results: await runDueFollowups(), checkedAt: new Date().toISOString() });
      }
      if (url.pathname === '/api/bot/message' && req.method === 'POST') return send(res, 200, await botTurn(await getBody(req)));
      if (url.pathname === '/api/meta/self-test' && req.method === 'POST') return send(res, 200, await runMetaSelfTest());
      if (url.pathname === '/api/reset' && req.method === 'POST') {
        if (process.env.VERCEL) return send(res, 403, { error: 'Production reset is disabled.' });
        return send(res, 200, await reset());
      }
      if (url.pathname === '/webhooks/whatsapp' && req.method === 'GET') {
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge') || '';
        return send(res, token === business.verifyToken ? 200 : 403, token === business.verifyToken ? challenge : 'Invalid verify token', 'text/plain');
      }
      if (url.pathname === '/webhooks/whatsapp' && req.method === 'POST') {
        const inbound = extractWhatsAppInbound(await getBody(req));
        if (inbound.isStatus || !inbound.isMessage) return send(res, 200, { ok: true, type: 'status_or_test' });
        if (['audio', 'voice'].includes(inbound.type)) {
          const sessions = await readJson(SESSIONS, {});
          const existing = sessions[cleanText(inbound.from)];
          const transcription = await transcribeWhatsAppAudio(inbound.mediaId);
          if (existing?.botPaused || !transcription.ok) {
            const session = await receiveHumanVisibleMessage({ phone: inbound.from, name: inbound.name, text: transcription.ok ? transcription.text : inbound.text, type: inbound.type, mediaId: inbound.mediaId, mimeType: inbound.mimeType, source: 'WhatsApp' });
            const delivery = existing?.botPaused ? { sent: false, reason: 'Bot paused by operator' } : await sendWhatsAppText(inbound.from, 'Aapka audio receive ho gaya hai. Hamari team sun kar aapko personally reply karegi.');
            return send(res, 200, { ok: true, mode: 'audio_human_review', transcription, session: publicSession(session), delivery });
          }
          const turn = await botTurn({ phone: inbound.from, name: inbound.name, text: transcription.text, type: inbound.type, mediaId: inbound.mediaId, mimeType: inbound.mimeType, source: 'WhatsApp' });
          const delivery = await sendWhatsAppText(inbound.from, turn.reply.text, turn.reply.buttons);
          return send(res, 200, { ok: true, mode: 'audio_ai_reply', transcription, turn, delivery });
        }
        if (['audio', 'voice', 'image', 'video', 'document'].includes(inbound.type)) {
          const session = await receiveHumanVisibleMessage({
            phone: inbound.from,
            name: inbound.name,
            text: inbound.text,
            type: inbound.type,
            mediaId: inbound.mediaId,
            mimeType: inbound.mimeType,
            source: 'WhatsApp',
          });
          const mediaLabel = inbound.type === 'image' ? 'image' : inbound.type === 'video' ? 'video' : inbound.type === 'document' ? 'document' : 'audio message';
          const delivery = await sendWhatsAppText(inbound.from, `Aapka ${mediaLabel} receive ho gaya hai. Hamari team review karke aapko human reply karegi.`);
          return send(res, 200, { ok: true, mode: 'media_human_review', session: publicSession(session), delivery });
        }
        const sessions = await readJson(SESSIONS, {});
        const existing = sessions[cleanText(inbound.from)];
        if (existing?.botPaused) {
          const session = await receiveHumanVisibleMessage({ phone: inbound.from, name: inbound.name, text: inbound.text, source: 'WhatsApp' });
          return send(res, 200, { ok: true, mode: 'human_takeover', session: publicSession(session), delivery: { sent: false, reason: 'Bot paused by operator' } });
        }
        const turn = await botTurn({ phone: inbound.from, name: inbound.name, text: inbound.text, intent: inbound.intent, source: 'WhatsApp' });
        const delivery = await sendWhatsAppText(inbound.from, turn.reply.text, turn.reply.buttons);
        return send(res, 200, { ok: true, turn, delivery });
      }
      if (url.pathname === '/webhooks/meta' && req.method === 'POST') return send(res, 200, await addLead(await getBody(req), 'Meta'));
      if (url.pathname === '/api/website-lead' && req.method === 'POST') return send(res, 200, await addLead(await getBody(req), 'Website'));
      return send(res, 404, { error: 'Not found' });
    } catch (error) {
      const message = cleanText(error?.message || 'Unexpected server error');
      const storageLimited = /(?:project|storage|database).*(?:limit|quota)|(?:limit|quota).*(?:project|storage|database)|http status 402/i.test(message);
      if (storageLimited) {
        return send(res, 503, {
          error: 'CRM database provider limit reached. Existing data is preserved, but live reads and writes are paused until the database limit is restored.',
          code: 'STORAGE_LIMIT_REACHED',
        });
      }
      return send(res, 500, { error: message });
    }
}

export default appHandler;

if (process.argv.includes('--pdf-qa')) {
  const target = path.join(__dirname, 'tmp', 'pdfs', 'rp-lost-lead-qa.pdf');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, lostLeadMagnetPdf({ input: { name: 'QA Client', service: 'Photography and Cinematic Production', goal: 'Create a premium multi-location campaign with social reels, product photographs, interviews, brand references, review rounds and final delivery formats for every digital platform.', offer: 'Book a free 15-minute planning call. Our production team will review the complete brief and recommend the right crew, equipment and delivery plan without obligation.', bookingUrl: 'https://razaproductions.com/booking/' } }));
  console.log(target);
} else if (process.argv.includes('--saas-audit')) {
  console.log(JSON.stringify(await saasSelfAudit(), null, 2));
} else if (!process.env.VERCEL) {
  http.createServer(appHandler).listen(PORT, () => {
    console.log(`RazaLead OS running at http://localhost:${PORT}`);
  });
}
