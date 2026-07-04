import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
const PORT = Number(process.env.PORT || 4317);

const business = {
  name: process.env.BUSINESS_NAME || 'Raza Productions',
  whatsappLocal: process.env.BUSINESS_WHATSAPP_LOCAL || '03343661913',
  whatsapp: process.env.BUSINESS_WHATSAPP || '+923343661913',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'razalead_os_verify_token',
};

const defaultMeta = {
  graphVersion: process.env.GRAPH_API_VERSION || 'v23.0',
  phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
  accessToken: process.env.META_ACCESS_TOKEN || '',
  wabaId: process.env.META_WABA_ID || '2277937109279661',
};

const knowledge = {
  greeting:
    'Assalam o Alaikum! Main Raza Productions ka friendly assistant hoon. Aap normal baat bhi kar sakte hain, ideas discuss kar sakte hain, ya services/podcast/pricing/portfolio pooch sakte hain.',
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
      id: 'voice_over',
      name: 'Voice Over',
      reply: 'Ads, videos, explainers aur presentations ke liye professional voice recording.',
    },
    {
      id: 'animations',
      name: 'Animations',
      reply: '2D animation, explainer content, motion graphics aur simple brand storytelling.',
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

function addDaysIso(days, start = Date.now()) {
  return new Date(new Date(start).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function hashSecret(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

async function ensure(file, fallback) {
  await mkdir(path.dirname(file), { recursive: true });
  if (!existsSync(file)) await writeFile(file, JSON.stringify(fallback, null, 2));
}

async function readJson(file, fallback) {
  await ensure(file, fallback);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2));
}

async function getKnowledge() {
  const saved = await readJson(KNOWLEDGE_STORE, knowledge);
  return {
    ...knowledge,
    ...saved,
    services: Array.isArray(saved.services) && saved.services.length ? saved.services : knowledge.services,
    podcastSlots: Array.isArray(saved.podcastSlots) && saved.podcastSlots.length ? saved.podcastSlots : knowledge.podcastSlots,
    pricing: Array.isArray(saved.pricing) && saved.pricing.length ? saved.pricing : knowledge.pricing,
    faqs: Array.isArray(saved.faqs) && saved.faqs.length ? saved.faqs : knowledge.faqs,
  };
}

async function saveKnowledge(input) {
  const current = await getKnowledge();
  const next = {
    greeting: compact(input.greeting || current.greeting, 1200),
    services: normalizeServices(input.services || current.services),
    podcastSlots: normalizeLines(input.podcastSlots || current.podcastSlots),
    pricing: normalizeLines(input.pricing || current.pricing),
    faqs: normalizeFaqs(input.faqs || current.faqs),
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
    kb.services.map((service, index) => `${index + 1}. ${service.name} - ${service.reply}`).join('\n') +
    '\n\nAap service name, city, date aur rough budget send kar dein.'
  );
}

function podcastText(kb = knowledge) {
  return (
    'Podcast booking ke liye available slots:\n' +
    kb.podcastSlots.join('\n') +
    '\n\nConfirm karne ke liye apna name, preferred day/time, episode type aur guest count send kar dein.'
  );
}

function pricingText(kb = knowledge) {
  return 'Pricing estimate:\n' + kb.pricing.map((row, index) => `${index + 1}. ${row}`).join('\n');
}

function buttonsMain() {
  return [
    { id: 'services', label: 'Services' },
    { id: 'podcast', label: 'Book Podcast' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'pricing', label: 'Pricing' },
  ];
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
    ['voice', 'Voice Over'],
    ['animation', 'Animations'],
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
  if (intent === 'start') return reply(kb.greeting);
  if (intent === 'thanks') {
    return reply('Khushi hui. Aap araam se poochte rahiye, main short aur clear jawab dunga.', [
      { id: 'services', label: 'Services' },
      { id: 'podcast', label: 'Book Podcast' },
      { id: 'portfolio', label: 'Portfolio' },
    ]);
  }
  if (intent === 'bye') {
    return reply('Allah Hafiz. Jab bhi idea, booking ya production help chahiye ho, message kar dena. Main yahin hoon.', [
      { id: 'services', label: 'Services' },
      { id: 'portfolio', label: 'Portfolio' },
    ]);
  }
  if (intent === 'how_are_you') {
    return reply('Main bilkul theek, Raza Productions ki front desk duty sambhal raha hoon. Aap batao, kis cheez mein help chahiye ya bas random baat karni hai?', [
      { id: 'services', label: 'Services' },
      { id: 'podcast', label: 'Book Podcast' },
      { id: 'ask', label: 'Ask Anything' },
    ]);
  }
  if (intent === 'identity') {
    return reply('Main RazaLead OS ka assistant hoon. Mera kaam friendly jawab dena, leads samajhna, services explain karna aur serious inquiry ko follow-up ke liye save karna hai.', [
      { id: 'services', label: 'Services' },
      { id: 'podcast', label: 'Book Podcast' },
      { id: 'portfolio', label: 'Portfolio' },
    ]);
  }
  if (intent === 'light_chat') {
    return reply('Thoda light scene chahiye? Chalo seedhi si baat: creative kaam mein sabse mushkil cheez idea nahi, idea ko finish karna hota hai. Aap batao, mood content ka hai, podcast ka, ya bas casual chat?', [
      { id: 'services', label: 'Services' },
      { id: 'ask', label: 'Ask Anything' },
    ]);
  }
  if (intent === 'supportive') {
    return reply('Samajh gaya. Jab idea unclear ho to pressure mat lo. Simple tareeqa: pehle goal likho, phir audience, phir format. Example: "mujhe brand awareness ke liye 3 reels chahiye." Aap apna goal bata do, main usko clean plan mein convert kar dunga.', [
      { id: 'services', label: 'Services' },
      { id: 'podcast', label: 'Book Podcast' },
      { id: 'portfolio', label: 'Portfolio' },
    ]);
  }
  if (intent === 'creative_ideas') {
    return reply('Bilkul. Creative ideas ke liye mujhe 3 cheezen bata do: kis business/topic ke liye, audience kaun hai, aur format reel/video/podcast/post? Tab main 5 tight ideas de dunga.', [
      { id: 'services', label: 'Services' },
      { id: 'podcast', label: 'Book Podcast' },
    ]);
  }
  if (intent === 'live_info') {
    return reply('Is local demo mein live internet/news/weather connected nahi hai, isliye real-time info confidently nahi bata sakta. Lekin planning, content ideas, services, podcast booking aur production questions mein help kar sakta hoon.', [
      { id: 'services', label: 'Services' },
      { id: 'ask', label: 'Ask Anything' },
    ]);
  }
  if (intent === 'services') return reply(serviceListText(kb));
  if (intent === 'podcast') return reply(podcastText(kb), [
    { id: 'pricing', label: 'Pricing' },
    { id: 'handoff', label: 'Confirm Lead' },
    { id: 'portfolio', label: 'Portfolio' },
  ]);
  if (intent === 'pricing') return reply(pricingText(kb), [
    { id: 'services', label: 'Services' },
    { id: 'podcast', label: 'Book Podcast' },
    { id: 'handoff', label: 'Confirm Lead' },
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
  const faq = kb.faqs.find((item) => item.match.some((word) => input.includes(word)));
  if (faq) return reply(faq.answer);

  const service = kb.services.find((item) => input.includes(item.name.toLowerCase().split(' ')[0]));
  if (service) return reply(`${service.name}: ${service.reply}\n\nAap date, city aur required deliverables send kar dein.`);

  return reply(
    'Haan, samajh raha hoon. Main sirf sales bot nahi hoon, normal baat bhi kar sakta hoon. Aap apna sawaal thoda aur clear kar dein, ya bata dein aapko idea, planning, service info, ya booking mein help chahiye.',
  );
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
  const items = followupPlanForScore(lead.score, lead.createdAt).map((step, index) => ({
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
  }));
  await writeJson(FOLLOWUPS, [...items, ...list]);
  return items;
}

async function dueFollowups() {
  const now = Date.now();
  const list = await readJson(FOLLOWUPS, []);
  return list.filter((item) => item.status === 'scheduled' && new Date(item.dueAt).getTime() <= now);
}

async function sendWhatsAppText(to, text) {
  const meta = await getMetaConfig();
  if (!meta.phoneNumberId || !meta.accessToken) return { sent: false, reason: 'Meta Cloud API env vars missing' };
  const cleanTo = String(to || '').replace(/[^0-9]/g, '');
  if (!cleanTo) return { sent: false, reason: 'Recipient missing' };
  const url = `https://graph.facebook.com/${meta.graphVersion}/${meta.phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: cleanTo,
    type: 'text',
    text: { preview_url: true, body: compact(text, 3900) },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${meta.accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  return { sent: response.ok, status: response.status, response: json };
}

async function runDueFollowups() {
  const list = await readJson(FOLLOWUPS, []);
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
  const service = cleanText(input.service || input.interest || detectService(input.message || input.text, kb));
  const score = scoreLead({ ...input, service });
  const lead = {
    id: `L-${Date.now()}`,
    name: cleanText(input.name || input.profile_name || input.from || 'Unknown lead'),
    phone: cleanText(input.phone || input.from || 'Unknown'),
    source: cleanText(input.source || fallbackSource),
    service,
    city: cleanText(input.city || input.location || 'Not set'),
    status: score >= 75 ? 'Qualified' : 'New',
    score,
    label: labelForScore(score),
    value: Number(input.value || input.budget || 0),
    message: cleanText(input.message || input.text || 'Incoming lead'),
    createdAt,
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
  return {
    isMessage: Boolean(message || payload.text || payload.message),
    isStatus: Boolean(status),
    status: status?.status,
    from: payload.from || payload.phone || message?.from || '',
    name: payload.name || contact?.profile?.name || message?.from || 'WhatsApp User',
    text:
      payload.text ||
      payload.message ||
      message?.text?.body ||
      message?.interactive?.button_reply?.title ||
      message?.interactive?.list_reply?.title ||
      'start',
    intent: payload.intent || message?.interactive?.button_reply?.id || message?.interactive?.list_reply?.id,
  };
}

async function botTurn(payload) {
  const sessions = await readJson(SESSIONS, {});
  const kb = await getKnowledge();
  const phone = cleanText(payload.phone || payload.from || 'demo-user');
  const session = sessions[phone] || { phone, transcript: [] };
  const text = cleanText(payload.text || payload.message || payload.intent || 'start');
  const response = answerQuestion(text, payload.intent, kb);
  session.transcript.push({ role: 'user', text, at: new Date().toISOString() });
  session.transcript.push({ role: 'bot', text: response.text, buttons: response.buttons, at: new Date().toISOString() });
  sessions[phone] = session;
  await writeJson(SESSIONS, sessions);

  let lead = null;
  const intent = detectIntent(text, payload.intent);
  const shouldRegisterLead =
    payload.registerLead ||
    intent === 'handoff' ||
    hasCommercialSignal(text, detectService(text, kb));
  if (shouldRegisterLead) {
    lead = await addLead(
      {
        name: payload.name || phone,
        phone,
        source: payload.source || 'WhatsApp',
        service: detectService(text, kb),
        message: text,
      },
      payload.source || 'WhatsApp',
    );
  }

  return { phone, reply: response, lead, transcript: session.transcript.slice(-12) };
}

async function graphGet(pathname) {
  const meta = await getMetaConfig();
  if (!meta.accessToken) return { ok: false, reason: 'META_ACCESS_TOKEN missing' };
  const url = `https://graph.facebook.com/${meta.graphVersion}/${pathname.replace(/^\//, '')}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${meta.accessToken}` } });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
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
  await writeJson(LEADS, seedLeads);
  await writeJson(SESSIONS, {});
  await writeJson(FOLLOWUPS, []);
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
  return Object.values(sessions).map((session) => {
    const transcript = Array.isArray(session.transcript) ? session.transcript : [];
    const userMessages = transcript.filter((item) => item.role === 'user');
    const botMessages = transcript.filter((item) => item.role === 'bot');
    const last = transcript[transcript.length - 1];
    return {
      phone: session.phone,
      messages: transcript.length,
      lastUserMessage: userMessages[userMessages.length - 1]?.text || '',
      lastBotMessage: botMessages[botMessages.length - 1]?.text || '',
      updatedAt: last?.at || '',
      transcript: transcript.slice(-12),
    };
  });
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
  return { ok: true, token: randomUUID(), user: publicUser };
}

export async function appHandler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'OPTIONS') return send(res, 204, {});
      if (url.pathname === '/' || url.pathname === '/dashboard') {
        return send(res, 200, await readFile(path.join(__dirname, 'public', 'index.html'), 'utf8'), 'text/html');
      }
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
        });
      }
      if (url.pathname === '/api/team' && req.method === 'GET') return send(res, 200, { users: await publicUsers() });
      if (url.pathname === '/api/auth/login' && req.method === 'POST') return send(res, 200, await login(await getBody(req)));
      if (url.pathname === '/api/knowledge' && req.method === 'GET') return send(res, 200, await getKnowledge());
      if (url.pathname === '/api/knowledge' && req.method === 'POST') return send(res, 200, await saveKnowledge(await getBody(req)));
      if (url.pathname === '/api/analytics' && req.method === 'GET') return send(res, 200, await analytics());
      if (url.pathname === '/api/memory' && req.method === 'GET') return send(res, 200, { sessions: await memoryList() });
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
          phoneNumberId: metaConfig.phoneNumberId ? 'configured' : 'missing',
          wabaId: metaConfig.wabaId ? 'configured' : 'missing',
          accessToken: metaConfig.accessToken ? 'configured' : 'missing',
        });
      }
      if (url.pathname === '/api/meta/settings' && req.method === 'POST') return send(res, 200, await saveMetaConfig(await getBody(req)));
      if (url.pathname === '/api/stats' && req.method === 'GET') return send(res, 200, await stats());
      if (url.pathname === '/api/leads' && req.method === 'GET') return send(res, 200, await readJson(LEADS, seedLeads));
      if (url.pathname === '/api/leads' && req.method === 'POST') return send(res, 200, await addLead(await getBody(req), 'Dashboard'));
      if (url.pathname === '/api/followups' && req.method === 'GET') {
        return send(res, 200, { items: await readJson(FOLLOWUPS, []), due: await dueFollowups() });
      }
      if (url.pathname === '/api/followups/run' && req.method === 'POST') return send(res, 200, { results: await runDueFollowups() });
      if (url.pathname === '/api/bot/message' && req.method === 'POST') return send(res, 200, await botTurn(await getBody(req)));
      if (url.pathname === '/api/meta/self-test' && req.method === 'POST') return send(res, 200, await runMetaSelfTest());
      if (url.pathname === '/api/reset' && req.method === 'POST') {
        await reset();
        return send(res, 200, { ok: true });
      }
      if (url.pathname === '/webhooks/whatsapp' && req.method === 'GET') {
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge') || '';
        return send(res, token === business.verifyToken ? 200 : 403, token === business.verifyToken ? challenge : 'Invalid verify token', 'text/plain');
      }
      if (url.pathname === '/webhooks/whatsapp' && req.method === 'POST') {
        const inbound = extractWhatsAppInbound(await getBody(req));
        if (inbound.isStatus || !inbound.isMessage) return send(res, 200, { ok: true, type: 'status_or_test' });
        const turn = await botTurn({ phone: inbound.from, name: inbound.name, text: inbound.text, intent: inbound.intent, source: 'WhatsApp' });
        const delivery = await sendWhatsAppText(inbound.from, turn.reply.text);
        return send(res, 200, { ok: true, turn, delivery });
      }
      if (url.pathname === '/webhooks/meta' && req.method === 'POST') return send(res, 200, await addLead(await getBody(req), 'Meta'));
      if (url.pathname === '/api/website-lead' && req.method === 'POST') return send(res, 200, await addLead(await getBody(req), 'Website'));
      return send(res, 404, { error: 'Not found' });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
}

if (!process.env.VERCEL) {
  http.createServer(appHandler).listen(PORT, () => {
    console.log(`RazaLead OS running at http://localhost:${PORT}`);
  });
}
