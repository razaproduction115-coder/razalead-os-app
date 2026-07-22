import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Command,
  Download,
  ExternalLink,
  FileText,
  Filter,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  Mic,
  PauseCircle,
  Phone,
  MapPin,
  Paperclip,
  PlayCircle,
  Plus,
  Pencil,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Square,
  Target,
  Tags,
  Trash2,
  Upload,
  UserRoundCog,
  Users,
  X,
  Zap,
} from "lucide-react";

const corePages = [
  {
    id: "inbox",
    label: "Live Inbox",
    urdu: "WhatsApp Chat",
    icon: MessageSquare,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    urdu: "ڈیش بورڈ",
    icon: LayoutDashboard,
  },
  { id: "clients", label: "Clients", urdu: "کلائنٹس", icon: Users },
  { id: "proposals", label: "Proposals", urdu: "پروپوزلز", icon: FileText },
  { id: "calendar", label: "Calendar", urdu: "کیلنڈر", icon: CalendarDays },
  {
    id: "automations",
    label: "Automation Control",
    urdu: "Approval Queue",
    icon: Zap,
  },
  { id: "bot-studio", label: "Bot Studio", urdu: "Option Bot", icon: Bot },
  { id: "followups", label: "Follow-ups", urdu: "Queue", icon: Clock3 },
  { id: "analytics", label: "Analytics", urdu: "Reports", icon: Activity },
  {
    id: "knowledge",
    label: "Knowledge Editor",
    urdu: "Bot Content",
    icon: Pencil,
  },
  {
    id: "templates",
    label: "Templates",
    urdu: "WhatsApp",
    icon: MessageSquare,
  },
  { id: "connect", label: "Meta Connection", urdu: "Cloud API", icon: Zap },
  { id: "audit", label: "Audit Log", urdu: "History", icon: FileText },
  { id: "team", label: "Team", urdu: "ٹیم", icon: UserRoundCog },
  { id: "settings", label: "Settings", urdu: "سیٹنگز", icon: Settings },
];

const aiFeatures = [
  ["proposal", "AI Proposal Generator"],
  ["content-calendar", "Content Calendar"],
  ["review-collector", "Review Collector"],
  ["upsell", "Upsell Engine"],
  ["competitor-alert", "Competitor Alert"],
  ["meeting-scheduler", "Meeting Scheduler"],
  ["contract-invoice", "Contract + Invoice"],
  ["winback", "Winback Campaign"],
  ["faq-bot", "FAQ Bot 24/7"],
  ["client-portal", "Client Portal"],
  ["auto-wishes", "Auto Wishes"],
  ["voice-proposal", "Voice to Proposal"],
  ["no-show", "No Show Rescue"],
  ["task-assigner", "Task Assigner"],
  ["ghost-recover", "Ghost Lead Recover"],
  ["referral", "Referral Machine"],
  ["viral-ideas", "Viral Ideas"],
  ["smart-portfolio", "Smart Portfolio"],
  ["ceo-report", "CEO Report"],
  ["lost-lead", "Lost Lead Magnet"],
].map(([id, label], i) => ({ id, label, number: i + 1 }));

const api = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options?.signal || controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error(
        "Server response timed out. CRM storage may be temporarily unavailable.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { error: raw };
  }
  if (!response.ok)
    throw new Error(
      data.error || data.message || `Request failed (HTTP ${response.status})`,
    );
  return data;
};

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}
function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}
function PageTitle({ title, urdu, description, action }) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-emerald-400">
          Raza Productions CRM
        </p>
        <h1 className="break-words text-2xl font-extrabold sm:text-3xl">
          {title}{" "}
          <span className="ml-2 font-normal text-slate-500" dir="rtl">
            {urdu}
          </span>
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [feature, setFeature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {},
    leads: [],
    analytics: {},
    team: [],
    audit: [],
    saas: { features: [], jobs: [] },
  });
  const [palette, setPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [toasts, setToasts] = useState([]);
  const [sidebar, setSidebar] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(() => localStorage.getItem("razalead-alerts") !== "off");
  const alertSnapshot = useRef(null);
  const alertAudio = useRef(null);
  const notify = (title, message, type = "success") => {
    const id = Date.now();
    setToasts((v) => [...v, { id, title, message, type }]);
    setTimeout(() => setToasts((v) => v.filter((t) => t.id !== id)), 4500);
  };
  const playAlertSound = () => {
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      const audio = alertAudio.current || new AudioEngine();
      alertAudio.current = audio;
      if (audio.state === "suspended") audio.resume();
      [0, 0.22, 0.48].forEach((delay, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = index === 1 ? "square" : "sine";
        oscillator.frequency.value = [880, 1175, 988][index];
        const start = audio.currentTime + delay;
        gain.gain.setValueAtTime(0.34, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.3);
      });
    } catch {}
  };
  const load = async () => {
    setLoading(true);
    try {
      setData(await api("/api/dashboard"));
    } catch (error) {
      notify("CRM storage unavailable", error.message, "error");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setSidebar(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!alertsEnabled) return;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const pulse = await api("/api/notifications/pulse");
        const previous = alertSnapshot.current;
        alertSnapshot.current = pulse;
        if (!previous) return;
        const newChats = pulse.conversations > previous.conversations;
        const newLeads = pulse.leads > previous.leads;
        const newerMessage = pulse.latestMessageAt && pulse.latestMessageAt !== previous.latestMessageAt;
        if (!newChats && !newLeads && !newerMessage) return;
        playAlertSound();
        const message = newLeads ? "New lead received." : "New WhatsApp message received.";
        notify("New activity", message);
        if (window.Notification?.permission === "granted") new Notification("Raza Lead OS", { body: message, icon: "/icon.svg" });
      } catch {}
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [alertsEnabled]);
  useEffect(() => {
    const ready = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  const toggleAlerts = async () => {
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    localStorage.setItem("razalead-alerts", next ? "on" : "off");
    alertSnapshot.current = null;
    if (next && window.Notification && Notification.permission === "default") await Notification.requestPermission();
    if (next) playAlertSound();
    notify(next ? "Alerts enabled" : "Alerts paused", next ? "New lead ya chat par sound aur notification aayegi." : "Background activity alerts band hain.");
  };
  const navigate = (id) => {
    setPage(id);
    setFeature(null);
    setSidebar(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openFeature = (item) => {
    setFeature(item);
    setPage("feature");
    setSidebar(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const paletteItems = [
    ...corePages.map((x) => ({ ...x, type: "page" })),
    ...aiFeatures.map((x) => ({ ...x, type: "feature" })),
  ].filter((x) =>
    `${x.label} ${x.urdu || ""}`
      .toLowerCase()
      .includes(paletteQuery.toLowerCase()),
  );
  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Sidebar
        open={sidebar}
        page={page}
        feature={feature}
        navigate={navigate}
        openFeature={openFeature}
        close={() => setSidebar(false)}
      />
      <div className="lg:pl-72">
        <Topbar
          openMenu={() => setSidebar(true)}
          openPalette={() => setPalette(true)}
          alertsEnabled={alertsEnabled}
          toggleAlerts={toggleAlerts}
          canInstall={Boolean(installPrompt)}
          installApp={installApp}
        />
        <main className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${page}-${feature?.id || ""}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {page === "dashboard" && (
                <Dashboard data={data} loading={loading} navigate={navigate} />
              )}
              {page === "inbox" && <InboxPage notify={notify} />}
              {page === "clients" && (
                <Clients leads={data.leads} loading={loading} />
              )}
              {page === "proposals" && <ProposalPage notify={notify} />}
              {page === "calendar" && <CalendarPage notify={notify} />}
              {page === "automations" && <AutomationControl notify={notify} />}
              {[
                "bot-studio",
                "followups",
                "analytics",
                "knowledge",
                "templates",
                "connect",
                "audit",
              ].includes(page) && (
                <RestoredToolPage mode={page} notify={notify} />
              )}
              {page === "team" && (
                <TeamPage team={data.team} loading={loading} />
              )}
              {page === "settings" && <SettingsPage notify={notify} />}
              {page === "feature" && (
                <FeaturePage feature={feature} notify={notify} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav
        page={page}
        navigate={navigate}
        openFeatures={() => setPalette(true)}
      />
      <CommandPalette
        open={palette}
        close={() => setPalette(false)}
        query={paletteQuery}
        setQuery={setPaletteQuery}
        items={paletteItems}
        choose={(item) => {
          item.type === "feature" ? openFeature(item) : navigate(item.id);
          setPalette(false);
          setPaletteQuery("");
        }}
      />
      <QuickReplyDock visible={page === "inbox"} notify={notify} />
      <ToastStack toasts={toasts} />
    </div>
  );
}

function QuickReplyDock({ visible, notify }) {
  const defaults = [
    {
      id: "welcome",
      label: "Welcome",
      text: "Assalam o Alaikum! Raza Productions mein welcome. Aap kis service ke bare mein maloomat chahte hain?",
    },
    {
      id: "details",
      label: "Get details",
      text: "Bilkul. Aap apni requirement, preferred date aur contact number share kar dein. Team aapko details confirm karegi.",
    },
    {
      id: "followup",
      label: "Follow-up",
      text: "Assalam o Alaikum. Aapki requirement par follow-up kar rahe hain. Kya aap is project ko continue karna chahenge?",
    },
    {
      id: "thanks",
      label: "Thank you",
      text: "Shukriya! Aapka message receive ho gaya hai. Raza Productions team jald aapse contact karegi.",
    },
  ];
  const [open, setOpen] = useState(false),
    [items, setItems] = useState(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("raza-quick-replies"));
        return Array.isArray(saved) && saved.length ? saved : defaults;
      } catch {
        return defaults;
      }
    }),
    [editing, setEditing] = useState(null),
    [editorOpen, setEditorOpen] = useState(false),
    [draft, setDraft] = useState({ label: "", text: "" });
  useEffect(() => {
    localStorage.setItem("raza-quick-replies", JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    let active = true;
    api("/api/quick-replies")
      .then(async (data) => {
        if (!active) return;
        const combined = new Map(
          (data.items || defaults).map((item) => [item.id, item]),
        );
        for (const item of items) combined.set(item.id, item);
        const synced = [...combined.values()];
        setItems(synced);
        await api("/api/quick-replies/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: synced }),
        });
      })
      .catch((error) =>
        notify?.("Quick replies offline", error.message, "error"),
      );
    return () => {
      active = false;
    };
  }, []);
  const choose = (text) => {
    const box = document.querySelector(
      'textarea[placeholder="Type a human reply..."]',
    );
    if (!box) return;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    setter?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.focus();
    setOpen(false);
  };
  const startEdit = (item) => {
    setEditing(item.id);
    setEditorOpen(true);
    setDraft({ label: item.label, text: item.text });
  };
  const startAdd = () => {
    setEditing(null);
    setEditorOpen(true);
    setDraft({ label: "", text: "" });
  };
  const closeEditor = () => {
    setEditing(null);
    setEditorOpen(false);
    setDraft({ label: "", text: "" });
  };
  const persist = (next) =>
    api("/api/quick-replies/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: next }),
    }).catch((error) =>
      notify?.("Quick reply not synced", error.message, "error"),
    );
  const save = () => {
    if (!draft.label.trim() || !draft.text.trim()) return;
    const item = {
      id:
        editing ||
        `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: draft.label.trim(),
      text: draft.text.trim(),
    };
    setItems((current) => {
      const next = editing
        ? current.map((x) => (x.id === editing ? { ...x, ...item } : x))
        : [...current, item];
      persist(next);
      return next;
    });
    closeEditor();
  };
  const remove = (id) => {
    setItems((current) => {
      const next = current.filter((x) => x.id !== id);
      api("/api/quick-replies/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch((error) =>
        notify?.("Quick reply not removed", error.message, "error"),
      );
      return next;
    });
  };
  if (!visible) return null;
  return (
    <div className="quick-reply-dock fixed right-3 top-20 z-30 w-[calc(100vw-24px)] sm:right-6 sm:w-[420px]">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`quick-reply-toggle rounded-xl border px-3 py-2 text-xs font-bold shadow-xl ${open ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-600 bg-[#16232b] text-slate-200"}`}
        >
          Quick replies {items.length}
        </button>
      </div>
      {open && (
        <div className="mt-2 rounded-2xl border border-slate-700 bg-[#16232b]/98 p-3 shadow-2xl">
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2"
                >
                  <button
                    title={item.text}
                    onClick={() => choose(item.text)}
                    className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-200 hover:text-emerald-300"
                  >
                    {item.label}
                  </button>
                  <button
                    title="Edit"
                    onClick={() => startEdit(item)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => remove(item.id)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 border-t border-slate-700 pt-3">
            {editorOpen ? (
              <div className="grid gap-2">
                <input
                  className="field !min-h-10 text-xs"
                  placeholder="Button name"
                  value={draft.label}
                  onChange={(e) =>
                    setDraft({ ...draft, label: e.target.value })
                  }
                />
                <textarea
                  className="field min-h-24 py-3 text-xs"
                  placeholder="Message template"
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn-secondary !min-h-10"
                    onClick={closeEditor}
                  >
                    <X size={15} />
                    Cancel
                  </button>
                  <button
                    className="btn-primary !min-h-10"
                    disabled={!draft.label.trim() || !draft.text.trim()}
                    onClick={save}
                  >
                    <Save size={15} />
                    {editing ? "Update" : "Save new"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn-secondary w-full !min-h-10 text-xs"
                onClick={startAdd}
              >
                <Plus size={15} />
                Add quick reply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ open, page, feature, navigate, openFeature, close }) {
  return (
    <>
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 transition lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#3a342d] bg-[#090908] transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center gap-3 px-5">
          <img
            src="/rp-brand-logo.jpg"
            alt="Raza Productions"
            className="h-11 w-24 rounded-md bg-[#f3eadb] object-contain p-1"
          />
          <div>
            <b>Raza Lead OS</b>
            <p className="text-xs text-slate-500">Raza Productions CRM</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-600">
            Workspace
          </p>
          {corePages.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={page === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
          <p className="mt-7 px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-emerald-500/70">
            20 AI automations
          </p>
          {aiFeatures.map((item) => (
            <button
              key={item.id}
              onClick={() => openFeature(item)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${page === "feature" && feature?.id === item.id ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <span className="w-6 text-xs font-bold opacity-70">
                {String(item.number).padStart(2, "0")}
              </span>
              <Sparkles size={15} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="rounded-2xl bg-slate-800/70 p-3">
            <p className="text-sm font-semibold">Production connected</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              WhatsApp + Database
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
    >
      <Icon size={19} />
      <span className="font-semibold">{item.label}</span>
      <span className="ml-auto text-xs opacity-60" dir="rtl">
        {item.urdu}
      </span>
    </button>
  );
}

function Topbar({
  openMenu,
  openPalette,
  alertsEnabled,
  toggleAlerts,
  canInstall,
  installApp,
}) {
  return (
    <header className="sticky top-0 z-30 flex h-20 min-w-0 items-center gap-3 overflow-hidden border-b border-slate-800 bg-[#0F172A]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        onClick={openMenu}
        className="btn-secondary !h-11 !w-11 shrink-0 !p-0 lg:hidden"
      >
        <Menu size={20} />
      </button>
      <button
        onClick={openPalette}
        className="flex h-11 min-w-0 max-w-xl flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-left text-sm text-slate-500 transition hover:border-slate-600"
      >
        <Search className="shrink-0" size={18} />
        <span className="truncate">Search leads, features, commands...</span>
        <kbd className="ml-auto hidden rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs sm:block">
          Ctrl K
        </kbd>
      </button>
      {canInstall && (
        <button
          onClick={installApp}
          title="Install Raza Lead OS"
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-sm font-bold text-slate-950"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}
      <button
        onClick={toggleAlerts}
        title={alertsEnabled ? "Disable lead alerts" : "Enable lead alerts"}
        className={`relative flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${alertsEnabled ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-700 bg-slate-900 text-slate-300"}`}
      >
        <Bell size={19} />
        <span className="hidden sm:inline">
          {alertsEnabled ? "Alerts on" : "Enable alerts"}
        </span>
        {alertsEnabled && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white" />
        )}
      </button>
      <div className="hidden items-center gap-3 md:flex">
        <img
          src="/rp-brand-logo.jpg"
          alt="Raza Productions"
          className="h-11 w-16 rounded-md bg-[#f3eadb] object-contain p-1"
        />
        <div>
          <b className="text-sm">Raza Productions</b>
          <p className="text-xs text-slate-500">Owner</p>
        </div>
      </div>
    </header>
  );
}

function Dashboard({ data, loading, navigate }) {
  const stats = [
    ["Total Leads", data.stats.totalLeads || 0, Users],
    ["Hot Leads", data.stats.hot || 0, Target],
    ["Follow-ups", data.stats.scheduledFollowups || 0, Activity],
    ["Conversations", data.analytics.conversations || 0, Bot],
  ];
  const confirmedRevenue = data.leads
    .filter((l) =>
      ["won", "completed"].includes(String(l.status || "").toLowerCase()),
    )
    .reduce((s, l) => s + Number(l.value || 0), 0);
  return (
    <>
      <PageTitle
        title="Dashboard"
        urdu="کاروباری جائزہ"
        description="Leads, revenue signals and today's priorities in one calm workspace."
        action={
          <button className="btn-primary" onClick={() => navigate("clients")}>
            <Plus size={18} />
            Add lead
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <Card key={label}>
            {loading ? (
              <>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-5 h-10 w-20" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    {label}
                  </span>
                  <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
                    <Icon size={20} />
                  </div>
                </div>
                <p className="mt-5 text-4xl font-extrabold">{value}</p>
                <p className="mt-2 text-xs text-emerald-400">Live CRM data</p>
              </>
            )}
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Daily CEO Report</h2>
              <p className="text-sm text-slate-500">آج کی اہم رپورٹ</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              Today
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Average score"
              value={`${data.analytics.averageScore || 0}/100`}
            />
            <MiniStat
              label="Due follow-ups"
              value={data.stats.dueFollowups || 0}
            />
            <MiniStat
              label="Confirmed revenue"
              value={`PKR ${confirmedRevenue.toLocaleString()}`}
            />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
            Revenue includes only Won or Completed deals. Lead budgets remain
            estimates until a deal is confirmed.
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Recent Activity</h2>
          <div className="mt-4 space-y-4">
            {data.audit.slice(0, 6).map((item) => (
              <div key={item.id} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-medium">
                    {item.action?.replaceAll(".", " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.at ? new Date(item.at).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            ))}
            {!data.audit.length && (
              <p className="text-sm text-slate-500">No activity yet.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function Clients({ leads, loading }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const filtered = leads.filter(
    (l) =>
      (filter === "All" || l.label === filter) &&
      `${l.name} ${l.phone} ${l.service}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Clients"
        urdu="کلائنٹس"
        description="Search, qualify and export every lead without losing conversation context."
        action={
          <a href="/api/crm/export.csv" className="btn-secondary no-underline">
            <Download size={18} />
            Export CSV
          </a>
        }
      />
      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-3.5 text-slate-500"
              size={18}
            />
            <input
              className="field pl-11"
              placeholder="Search name, phone, service..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter
              className="absolute left-4 top-3.5 text-slate-500"
              size={18}
            />
            <select
              className="field min-w-44 pl-11"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>Hot</option>
              <option>Warm</option>
              <option>Cold</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                {["Client", "Source", "Service", "AI Score", "Status", ""].map(
                  (h) => (
                    <th key={h} className="border-b border-slate-700 px-4 py-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan="6" className="p-3">
                        <Skeleton className="h-12 w-full" />
                      </td>
                    </tr>
                  ))
                : filtered.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-slate-800/80 transition hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-4">
                        <b>{l.name}</b>
                        <p className="text-xs text-slate-500">{l.phone}</p>
                      </td>
                      <td className="px-4 py-4">{l.source}</td>
                      <td className="px-4 py-4">{l.service}</td>
                      <td className="px-4 py-4">
                        <b className="text-emerald-400">
                          {l.aiScore || l.score}/100
                        </b>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          className="btn-secondary !min-h-9 !px-3"
                          onClick={() => setSelected(l)}
                        >
                          View <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
      <LeadDrawer lead={selected} close={() => setSelected(null)} />
    </>
  );
}
function LeadDrawer({ lead, close }) {
  const [form, setForm] = useState(null),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState("");
  useEffect(() => {
    if (lead) setForm({ ...lead });
  }, [lead]);
  if (!form) return null;
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    setSaved("");
    try {
      const r = await api(`/api/leads/${form.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm(r.lead);
      setSaved("Saved. Automation scanner can now use these lifecycle fields.");
    } catch (e) {
      setSaved(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <AnimatePresence>
      {lead && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-slate-700 bg-[#111C2E] p-5 sm:p-6"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-400">
                  Lead lifecycle
                </p>
                <h2 className="mt-1 text-2xl font-bold">{form.name}</h2>
              </div>
              <button
                className="btn-secondary !h-10 !w-10 !p-0"
                onClick={close}
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat
                label="AI Score"
                value={`${form.aiScore || form.score}/100`}
              />
              <MiniStat label="Label" value={form.label} />
            </div>
            <Card className="mt-4 !shadow-none">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Status</label>
                  <select
                    className="field"
                    value={form.status || "New"}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {["New", "Qualified", "Won", "Completed", "Lost"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="label">Project progress %</label>
                  <input
                    className="field"
                    type="number"
                    min="0"
                    max="100"
                    value={form.progress || 0}
                    onChange={(e) => set("progress", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Meeting status</label>
                  <select
                    className="field"
                    value={form.meetingStatus || ""}
                    onChange={(e) => set("meetingStatus", e.target.value)}
                  >
                    <option value="">Not set</option>
                    <option>Scheduled</option>
                    <option>Completed</option>
                    <option>Missed</option>
                  </select>
                </div>
                <div>
                  <label className="label">Meeting date/time</label>
                  <input
                    className="field"
                    type="datetime-local"
                    value={(form.meetingAt || "").slice(0, 16)}
                    onChange={(e) => set("meetingAt", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Review rating</label>
                  <select
                    className="field"
                    value={form.reviewRating || 0}
                    onChange={(e) => set("reviewRating", e.target.value)}
                  >
                    {[0, 1, 2, 3, 4, 5].map((x) => (
                      <option key={x} value={x}>
                        {x || "Not rated"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Birthday</label>
                  <input
                    className="field"
                    type="date"
                    value={(form.dob || "").slice(0, 10)}
                    onChange={(e) => set("dob", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Next delivery</label>
                  <input
                    className="field"
                    value={form.nextDelivery || ""}
                    onChange={(e) => set("nextDelivery", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Client portal note</label>
                  <textarea
                    className="field min-h-24 py-3"
                    value={form.portalNote || ""}
                    onChange={(e) => set("portalNote", e.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn-primary mt-4 w-full"
                disabled={saving}
                onClick={save}
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save lifecycle"}
              </button>
              {saved && (
                <p className="mt-3 text-sm text-emerald-400">{saved}</p>
              )}
            </Card>
            <ProjectWorkspace leadId={form.id} />
            <Card className="mt-4 !shadow-none">
              <p className="text-sm text-slate-500">Requirement</p>
              <p className="mt-2 whitespace-pre-wrap">
                {form.message || "No requirement recorded."}
              </p>
            </Card>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                className="btn-primary w-full no-underline"
                href={`/api/leads/${form.id}/requirement.pdf`}
              >
                <Download size={18} />
                Requirement PDF
              </a>
              <a
                className="btn-secondary w-full no-underline"
                href={`/portal/${form.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={18} />
                Client portal
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ProjectWorkspace({ leadId }) {
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState("Loading project workspace...");
  const load = async () => {
    try {
      const data = await api(`/api/projects/${leadId}`);
      setProject(data.project);
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    }
  };
  useEffect(() => {
    load();
  }, [leadId]);
  const set = (key, value) =>
    setProject((current) => ({ ...current, [key]: value }));
  const updateItem = (list, id, key, value) =>
    set(
      list,
      project[list].map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    );
  const addMilestone = () =>
    set("milestones", [
      ...(project.milestones || []),
      { id: crypto.randomUUID(), title: "New milestone", status: "pending", dueDate: "" },
    ]);
  const addFile = () =>
    set("files", [
      ...(project.files || []),
      { id: crypto.randomUUID(), title: "New delivery", url: "", type: "link", visibility: "client" },
    ]);
  const remove = (list, id) =>
    set(list, project[list].filter((item) => item.id !== id));
  const save = async () => {
    setStatus("Saving...");
    try {
      const data = await api(`/api/projects/${leadId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(project),
      });
      setProject(data.project);
      setStatus("Project portal saved.");
    } catch (error) {
      setStatus(error.message);
    }
  };
  if (!project)
    return <Card className="mt-4 !shadow-none text-sm text-slate-400">{status}</Card>;
  return (
    <Card className="mt-4 !shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-orange-400">Client project workspace</p>
          <h3 className="mt-1 text-lg font-bold">Portal editor</h3>
        </div>
        <a className="btn-secondary !h-10 !px-3 no-underline" href={`/portal/${leadId}`} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Preview
        </a>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Project title</label>
          <input className="field" value={project.title || ""} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className="label">Portal status</label>
          <input className="field" value={project.status || ""} onChange={(e) => set("status", e.target.value)} />
        </div>
        <div>
          <label className="label">Progress %</label>
          <input className="field" type="number" min="0" max="100" value={project.progress || 0} onChange={(e) => set("progress", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Next delivery</label>
          <input className="field" value={project.nextDelivery || ""} onChange={(e) => set("nextDelivery", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Client update</label>
          <textarea className="field min-h-24 py-3" value={project.summary || ""} onChange={(e) => set("summary", e.target.value)} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <h4 className="font-bold">Milestones</h4>
        <button className="btn-secondary !h-9 !px-3" onClick={addMilestone}><Plus size={15} /> Add</button>
      </div>
      <div className="mt-3 grid gap-3">
        {(project.milestones || []).map((item) => (
          <div key={item.id} className="grid gap-2 rounded-lg border border-slate-700 p-3 sm:grid-cols-[1fr_140px_42px]">
            <input className="field" value={item.title} onChange={(e) => updateItem("milestones", item.id, "title", e.target.value)} />
            <select className="field" value={item.status} onChange={(e) => updateItem("milestones", item.id, "status", e.target.value)}>
              <option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
            </select>
            <button className="btn-secondary !h-11 !w-11 !p-0 text-red-400" onClick={() => remove("milestones", item.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <h4 className="font-bold">Deliveries & files</h4>
        <button className="btn-secondary !h-9 !px-3" onClick={addFile}><Plus size={15} /> Add link</button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Google Drive, Dropbox, Frame.io ya kisi delivery link ko client portal par share karein.</p>
      <div className="mt-3 grid gap-3">
        {(project.files || []).map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-700 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_42px]">
              <input className="field" placeholder="File title" value={item.title} onChange={(e) => updateItem("files", item.id, "title", e.target.value)} />
              <button className="btn-secondary !h-11 !w-11 !p-0 text-red-400" onClick={() => remove("files", item.id)}><Trash2 size={16} /></button>
            </div>
            <input className="field mt-2" placeholder="https://drive.google.com/..." value={item.url} onChange={(e) => updateItem("files", item.id, "url", e.target.value)} />
          </div>
        ))}
      </div>
      {(project.submissions || []).length > 0 && (
        <div className="mt-5">
          <h4 className="font-bold">Client submissions</h4>
          <div className="mt-3 grid gap-2">
            {project.submissions.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-700 p-3 text-sm">
                <b>{item.name}</b><p className="mt-1 whitespace-pre-wrap text-slate-300">{item.message || "File shared"}</p>
                {item.url && <a className="mt-2 block text-orange-400" href={item.url} target="_blank" rel="noreferrer">Open submitted file</a>}
              </div>
            ))}
          </div>
        </div>
      )}
      <button className="btn-primary mt-5 w-full" onClick={save}><Save size={18} /> Save & publish portal</button>
      {status && <p className="mt-3 text-sm text-emerald-400">{status}</p>}
    </Card>
  );
}

function ClientPortalPage({ notify }) {
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/api/leads").then((items) => {
      setLeads(items || []);
      setSelected((items || [])[0]?.id || "");
    }).catch((error) => notify("Could not load clients", error.message, "error")).finally(() => setLoading(false));
  }, []);
  const visible = leads.filter((lead) => `${lead.name} ${lead.phone} ${lead.service}`.toLowerCase().includes(search.toLowerCase()));
  const active = leads.find((lead) => lead.id === selected);
  return <>
    <PageTitle title="Client Portal" urdu="Project delivery" description="Client select karein, milestones aur delivery links update karein, phir public portal link share karein." action={active && <a className="btn-primary no-underline" href={`/portal/${active.id}`} target="_blank" rel="noreferrer"><ExternalLink size={18}/> Open client view</a>} />
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card>
        <div className="relative"><Search className="absolute left-4 top-3.5 text-slate-500" size={18}/><input className="field pl-11" placeholder="Search client..." value={search} onChange={(e) => setSearch(e.target.value)}/></div>
        <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto">
          {loading && <Skeleton className="h-24 w-full"/>}
          {!loading && !visible.length && <p className="py-8 text-center text-sm text-slate-500">No clients found.</p>}
          {visible.map((lead) => <button key={lead.id} onClick={() => setSelected(lead.id)} className={`w-full rounded-lg border p-3 text-left transition ${selected === lead.id ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:bg-slate-800"}`}>
            <b className="block truncate">{lead.name || lead.phone}</b><span className="mt-1 block truncate text-xs text-slate-500">{lead.service || "Project not set"} · {lead.progress || 0}%</span>
          </button>)}
        </div>
      </Card>
      <div>{active ? <ProjectWorkspace leadId={active.id}/> : <Card className="grid min-h-72 place-items-center text-slate-500">Select a client to manage the portal.</Card>}</div>
    </div>
  </>;
}

function ProposalPage({ notify }) {
  const [form, setForm] = useState({
      name: "",
      phone: "",
      service: "",
      budget: "",
      notes: "",
    }),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const generate = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.service.trim())
      return notify(
        "Details required",
        "Client name, WhatsApp number aur service enter karein.",
        "error",
      );
    setBusy(true);
    try {
      const r = await api("/api/saas/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          featureId: "proposal",
          ...form,
          budget: form.budget ? `PKR ${form.budget}` : "Custom quote",
          deadline: "After client approval",
          baseUrl: location.origin,
        }),
      });
      setResult(r.job);
      notify(
        "Proposal draft ready",
        "Automation Control mein review karke Approve & Send karein.",
      );
    } catch (e) {
      notify("Proposal failed", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Proposal Generator"
        urdu="پروپوزل"
        description="Basic details aur amount enter karein. Branded PDF approval queue mein ready ho jayegi."
      />
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="label">Client name</label>
              <input
                className="field"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Client name"
              />
            </div>
            <div>
              <label className="label">WhatsApp number</label>
              <input
                className="field"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="03XXXXXXXXX"
              />
            </div>
            <div>
              <label className="label">Required service</label>
              <input
                className="field"
                value={form.service}
                onChange={(e) => set("service", e.target.value)}
                placeholder="Podcast, Photography, Video..."
              />
            </div>
            <div>
              <label className="label">Amount / Budget (PKR)</label>
              <input
                className="field"
                inputMode="numeric"
                value={form.budget}
                onChange={(e) =>
                  set("budget", e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="50000"
              />
            </div>
            <div>
              <label className="label">Scope / What client needs</label>
              <textarea
                className="field min-h-28 py-3"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Short requirement and deliverables"
              />
            </div>
            <button
              className="btn-primary w-full"
              disabled={busy}
              onClick={generate}
            >
              {busy ? (
                <Activity className="animate-spin" size={18} />
              ) : (
                <FileText size={18} />
              )}
              Generate proposal draft
            </button>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Proposal status</h2>
          {result ? (
            <div className="mt-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <b className="text-emerald-300">Draft ready for approval</b>
                <p className="mt-2 text-sm text-slate-400">
                  Automation Control khol kar message edit karein, phir Approve
                  & Send dabayein. Client ko PDF WhatsApp par milegi.
                </p>
              </div>
              <a
                className="btn-secondary mt-4 w-full no-underline"
                href={result.output?.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={18} />
                Preview PDF
              </a>
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center text-center text-slate-500">
              <div>
                <FileText className="mx-auto mb-3" size={40} />
                <p>Client details enter karke proposal draft banayein.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
function CalendarPage({ notify }) {
  const [result, setResult] = useState(null);
  const [niche, setNiche] = useState("Podcast Studio");
  const run = async () => {
    const r = await api("/api/saas/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        featureId: "content-calendar",
        niche,
        service: niche,
      }),
    });
    setResult(r.job.output.calendar);
    notify("Calendar generated", "30-day content plan ready.");
  };
  return (
    <>
      <PageTitle
        title="Content Calendar"
        urdu="کانٹینٹ کیلنڈر"
        description="Generate a complete 30-day publishing plan and export it to CSV."
      />
      <Card>
        <label className="label">Niche / موضوع</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="field"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
          <button className="btn-primary sm:min-w-52" onClick={run}>
            <Sparkles size={18} />
            Generate 30 days
          </button>
          <a
            className="btn-secondary no-underline"
            href={`/api/saas/content-calendar.csv?niche=${encodeURIComponent(niche)}`}
          >
            <Download size={18} />
            CSV
          </a>
        </div>
      </Card>
      {result && (
        <Card className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr>
                {["Day", "Format", "Topic", "Hook", "Time"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-slate-700 p-3 text-left text-xs uppercase text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((r) => (
                <tr key={r.day} className="border-b border-slate-800">
                  <td className="p-3 font-bold text-emerald-400">{r.day}</td>
                  <td className="p-3">{r.format}</td>
                  <td className="p-3">{r.topic}</td>
                  <td className="p-3 text-slate-400">{r.hook}</td>
                  <td className="p-3">{r.bestPostingTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
function TeamPage({ team, loading }) {
  return (
    <>
      <PageTitle
        title="Team"
        urdu="ٹیم"
        description="Roles, access and workload for Raza Productions."
        action={
          <button className="btn-primary">
            <Plus size={18} />
            Invite member
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))
          : team.map((u) => (
              <Card key={u.id}>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 font-bold text-emerald-400">
                    {u.name
                      ?.split(" ")
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <b>{u.name}</b>
                    <p className="text-sm text-slate-500">{u.email}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">
                    {u.role}
                  </span>
                  <span className="text-xs text-emerald-400">Active</span>
                </div>
              </Card>
            ))}
      </div>
    </>
  );
}
function SettingsPage({ notify }) {
  const [form, setForm] = useState({
    adminEmail: false,
    clientEmail: false,
    adminAddress: "",
    senderName: "Raza Productions",
  });
  const [history, setHistory] = useState([]);
  useEffect(() => {
    Promise.all([api("/api/email/settings"), api("/api/email/history")]).then(
      ([s, h]) => {
        setForm(s.settings);
        setHistory(h.items || []);
      },
    );
  }, []);
  const save = async () => {
    await api("/api/email/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    notify("Settings saved", "Email preferences updated.");
  };
  return (
    <>
      <PageTitle
        title="Settings"
        urdu="سیٹنگز"
        description="Notification preferences, email delivery and system status."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Email + Notifications</h2>
          <div className="mt-5 space-y-4">
            <Toggle
              label="Admin emails"
              urdu="ایڈمن ای میل"
              checked={form.adminEmail}
              set={(v) => setForm({ ...form, adminEmail: v })}
            />
            <Toggle
              label="Client emails"
              urdu="کلائنٹ ای میل"
              checked={form.clientEmail}
              set={(v) => setForm({ ...form, clientEmail: v })}
            />
            <div>
              <label className="label">Admin email / ای میل</label>
              <input
                className="field"
                value={form.adminAddress || ""}
                onChange={(e) =>
                  setForm({ ...form, adminAddress: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Sender name / بھیجنے والا</label>
              <input
                className="field"
                value={form.senderName || ""}
                onChange={(e) =>
                  setForm({ ...form, senderName: e.target.value })
                }
              />
            </div>
            <button className="btn-primary w-full" onClick={save}>
              <Save size={18} />
              Save settings
            </button>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Email History</h2>
          <div className="mt-4 space-y-3">
            {history.slice(0, 10).map((x) => (
              <div
                key={x.id}
                className="rounded-xl border border-slate-700 p-3"
              >
                <div className="flex items-center justify-between">
                  <b className="text-sm">{x.subject}</b>
                  <span
                    className={`text-xs font-bold ${x.status === "sent" ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    {x.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {x.to} · {new Date(x.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {!history.length && (
              <p className="text-sm text-slate-500">No email activity yet.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
function Toggle({ label, urdu, checked, set }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-700 p-4">
      <span>
        <b className="text-sm">{label}</b>
        <span className="ml-2 text-xs text-slate-500" dir="rtl">
          {urdu}
        </span>
      </span>
      <button
        type="button"
        onClick={() => set(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-700"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </label>
  );
}

const featureFormConfig = {
  proposal: { description: "Client brief se branded proposal PDF prepare karein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["email","Client email","email"],["service","Service","text",true],["budget","Quoted amount / Budget","text"],["deadline","Delivery timeline","text"],["notes","Scope and deliverables","textarea"]] },
  "content-calendar": { description: "Selected niche ke liye 30-day publish-ready calendar banayein.", fields: [["niche","Content niche","text",true]] },
  "review-collector": { description: "Completed client ke liye 3-day review request prepare karein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["reviewUrl","Google review URL","url"]] },
  upsell: { description: "60-day inactive client ke liye relevant returning-client offer banayein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["service","Previous service","text",true],["inactiveDays","Inactive days","number"],["offer","Upsell offer","text"]] },
  "contract-invoice": { description: "Won deal ke liye contract aur invoice PDFs prepare karein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel"],["email","Client email","email"],["service","Confirmed service","text",true],["budget","Final deal amount","text",true],["deadline","Delivery date","text"],["notes","Final scope and terms","textarea"]] },
  winback: { description: "90-day inactive client ke liye comeback campaign prepare karein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["service","Previous service","text"],["inactiveDays","Inactive days","number"],["offer","Comeback offer","text"]] },
  "faq-bot": { description: "FAQ knowledge, buttons aur human handoff ka health check run karein.", fields: [] },
  "auto-wishes": { description: "Birthday ya occasion wish ko 9am delivery ke liye prepare karein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["occasion","Occasion","text",true],["deliveryTime","Delivery time","text"]] },
  "voice-proposal": { description: "Voice-note transcription se structured proposal draft banayein.", fields: [["name","Client name","text",true],["service","Service","text",true],["budget","Budget","text"],["notes","Voice transcription / requirement","textarea",true]] },
  "no-show": { description: "Missed meeting ke baad do replacement slots prepare karein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["service","Meeting purpose","text"],["meetingAt","Missed meeting time","datetime-local"]] },
  "task-assigner": { description: "Won deal ko production checklist aur team owner assign karein.", fields: [["name","Client name","text",true],["service","Confirmed service","text",true],["assignee","Team / assignee","text"],["notes","Production notes","textarea"]] },
  "ghost-recover": { description: "48-hour unanswered proposal ke liye controlled follow-up banayein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["service","Proposed service","text",true],["proposalAgeHours","Hours since proposal","number"],["offer","Recovery offer","text"]] },
  referral: { description: "Pehle review request bhejein. Review proof verify hone ke baad hi referral reward offer bhejein.", fields: [["name","Client name","text",true],["phone","WhatsApp number","tel",true],["reviewStatus","Review stage","select",true,[["request","Request review first"],["verified","5-star review verified"]]],["reviewUrl","Google review URL","url"],["reviewProof","Review proof / screenshot note","text"],["reward","Referral reward","text"]] },
  "viral-ideas": { description: "Niche ke liye hook, script aur CTA ke sath 3 ideas banayein.", fields: [["niche","Content niche","text",true]] },
  "smart-portfolio": { description: "Lead ki service ke mutabiq 3 relevant portfolio projects select karein.", fields: [["name","Lead name","text",true],["service","Required service / niche","text",true]] },
  "ceo-report": { description: "Live CRM se leads, confirmed revenue, top lead aur pending proposals compile karein.", fields: [] },
};

const blankFeatureForm = { name:"", phone:"", email:"", service:"Podcast Studio", niche:"Podcast Studio", budget:"", deadline:"", notes:"", reviewUrl:"", reviewStatus:"request", reviewProof:"", inactiveDays:"", offer:"", occasion:"Birthday", deliveryTime:"09:00 Asia/Karachi", meetingAt:"", assignee:"Production Team", proposalAgeHours:"48", reward:"1 free short video" };

function GeneratorPage({ title, urdu, featureId, button, notify, fields }) {
  const config = featureFormConfig[featureId] || { description: fields, fields: [] };
  const [form, setForm] = useState(blankFeatureForm);
  const [result, setResult] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const missing = config.fields.filter(([, , , required]) => required).find(([key]) => !String(form[key] || "").trim());
    if (missing) return notify("Required field missing", `${missing[1]} enter karein.`, "error");
    setBusy(true);
    try {
      const r = await api("/api/saas/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featureId, ...form, baseUrl: location.origin }),
      });
      if (!r.ok) throw new Error(r.error || "Could not generate output");
      setJob(r.job);
      setResult(r.job.output);
      notify("Draft ready", r.job.channel === "whatsapp" ? `${title} ready hai. Review karke Approve & Send karein.` : `${title} generated successfully.`);
    } catch (e) {
      notify("Failed", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const approveAndSend = async () => {
    if (!job) return;
    setBusy(true);
    try {
      const response = await api("/api/automations/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id, action: "approve", message: result?.message || job.output?.message || "" }),
      });
      if (!response.ok) throw new Error(response.job?.execution?.error || response.error || "WhatsApp delivery failed");
      setJob(response.job);
      setResult(response.job.output);
      notify("Sent successfully", `${title} WhatsApp par deliver ho gaya.`);
    } catch (error) {
      notify("Could not send", error.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle title={title} urdu={urdu} description={config.description || fields} />
      <div className="mb-5"><FeatureBlueprintEditor feature={{ id: featureId, label: title }} notify={notify} /></div>
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <div className="space-y-4">
            {config.fields.map(([key, label, type = "text", required, options]) => (
              <div key={key}>
                <label className="label">{label}{required ? " *" : ""}</label>
                {type === "textarea" ? (
                  <textarea className="field min-h-28 py-3" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                ) : type === "select" ? (
                  <select className="field" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                    {(options || []).map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
                  </select>
                ) : (
                  <input className="field" type={type} inputMode={type === "tel" ? "tel" : undefined} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                )}
              </div>
            ))}
            {!config.fields.length && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-slate-300">Ye tool live CRM aur saved settings se output banata hai. Manual client data required nahi.</div>}
            <div className="hidden">
            {[
              ["name", "Client name / نام"],
              ["phone", "WhatsApp number / واٹس ایپ"],
              ["email", "Client email / ای میل"],
              ["service", "Service / سروس"],
              ["budget", "Budget / بجٹ"],
              ["deadline", "Deadline / آخری تاریخ"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="field"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="label">Scope & notes / تفصیل</label>
              <textarea
                className="field min-h-28 py-3"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            </div>
            <button
              className="btn-primary w-full"
              disabled={busy}
              onClick={run}
            >
              {busy ? (
                <Activity className="animate-spin" size={18} />
              ) : (
                <FileText size={18} />
              )}{" "}
              {button}
            </button>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Generated output</h2>
          {result ? (
            <div className="mt-4">
              <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950/70 p-4 text-sm text-slate-300">
                {JSON.stringify(result, null, 2)}
              </pre>
              {result.downloadUrl && (
                <a
                  className="btn-primary mt-4 w-full no-underline"
                  href={result.downloadUrl}
                >
                  <Download size={18} />
                  Download PDF
                </a>
              )}
              {job?.channel === "whatsapp" && (
                <button className="btn-primary mt-4 w-full" disabled={busy || job.status === "completed"} onClick={approveAndSend}>
                  {busy ? <Activity className="animate-spin" size={18} /> : <Send size={18} />}
                  {job.status === "completed" ? "Sent successfully" : "Approve & Send on WhatsApp"}
                </button>
              )}
              {job?.status === "failed" && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{job.execution?.error || "Delivery failed. Check Meta connection and phone number."}</p>}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center text-center text-slate-500">
              <div>
                <FileText className="mx-auto mb-3" size={40} />
                <p>Complete the form to generate a professional output.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function LostLeadMagnetPage({ notify }) {
  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    service: "Creative Production",
    magnetTitle: "",
    goal: "",
    offer: "Free 15-minute project planning call",
    bookingUrl: "https://razaproductions.com/booking/",
  });
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/api/lost-leads/eligible")
      .then((data) => setLeads(data.items || []))
      .catch((error) => notify("Could not load lost leads", error.message, "error"));
  }, []);
  const selectLead = (id) => {
    setSelectedId(id);
    const lead = leads.find((item) => item.id === id);
    if (!lead) return;
    setForm((current) => ({
      ...current,
      name: lead.name || "",
      phone: lead.phone || "",
      service: lead.service || "Creative Production",
      magnetTitle: `${lead.service || "Creative Production"} Project Starter Guide`,
      goal: lead.message || "",
      leadId: lead.id,
    }));
  };
  const generate = async () => {
    if (!form.name.trim() || !form.phone.trim())
      return notify("Client details required", "Name aur WhatsApp number enter karein.", "error");
    setBusy(true);
    try {
      const response = await api("/api/saas/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featureId: "lost-lead", ...form, baseUrl: location.origin }),
      });
      setJob(response.job);
      notify("Premium recovery campaign ready", "PDF aur WhatsApp CTA Automation Control mein approval ke liye ready hain.");
    } catch (error) {
      notify("Campaign generation failed", error.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const approveAndSend = async () => {
    if (!job) return;
    setBusy(true);
    try {
      const response = await api("/api/automations/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id, action: "approve", message: job.output.message }),
      });
      if (!response.ok) throw new Error(response.job?.execution?.error || response.error || "Delivery failed");
      setJob(response.job);
      notify("Recovery kit sent", "Branded PDF aur Book Now CTA WhatsApp par deliver ho gaye.");
    } catch (error) {
      notify("Could not send campaign", error.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return <>
    <PageTitle title="Lost Lead Magnet" urdu="Recovery Campaign" description="Raza AI meaningful chats scan karta hai aur 3 din silent rehne wali engaged leads ko personalized recovery campaign ke liye match karta hai." />
    <div className="mb-5"><FeatureBlueprintEditor feature={{ id: "lost-lead", label: "Lost Lead Magnet" }} notify={notify} /></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      <MiniStat label="AI-matched leads" value={leads.length} />
      <MiniStat label="Trigger" value="Engaged + 3 days silent" />
      <MiniStat label="Delivery" value="PDF + WhatsApp CTA" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <Card>
        <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 p-4">
          <label className="label">Choose an existing lost lead</label>
          <select className="field" value={selectedId} onChange={(event) => selectLead(event.target.value)}>
            <option value="">Manual client details</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name || lead.phone} - {lead.service || "General inquiry"} - {lead.inactivityDays}d silent</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">Cold, greeting-only aur one-message chats automatically exclude hoti hain.</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Client name</label><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">WhatsApp number</label><input className="field" inputMode="tel" placeholder="03XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Service</label><input className="field" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Lead magnet title</label><input className="field" placeholder={`${form.service} Project Starter Guide`} value={form.magnetTitle} onChange={(e) => setForm({ ...form, magnetTitle: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Known requirement / project goal</label><textarea className="field min-h-24 py-3" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Recovery offer</label><input className="field" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Book Now URL</label><input className="field" value={form.bookingUrl} onChange={(e) => setForm({ ...form, bookingUrl: e.target.value })} /></div>
        </div>
        <button className="btn-primary mt-5 w-full" disabled={busy} onClick={generate}>{busy ? <Activity className="animate-spin" size={18}/> : <Sparkles size={18}/>} Generate premium recovery kit</button>
      </Card>
      <Card>
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-orange-400">Campaign preview</p><h2 className="mt-1 text-xl font-bold">Personalized comeback kit</h2></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">RP branded</span></div>
        {job ? <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-5"><p className="text-xs font-bold uppercase text-slate-500">WhatsApp message</p><p className="mt-3 whitespace-pre-wrap leading-7">{job.output.message}</p></div>
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-5"><FileText className="text-orange-400" size={30}/><h3 className="mt-3 text-lg font-bold">{job.output.magnetTitle}</h3><p className="mt-2 text-sm text-slate-400">Agency-branded planning guide, personalized for {form.name}. Includes project planning steps, checklist, offer and booking details.</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><a className="btn-secondary no-underline" href={job.output.downloadUrl} target="_blank" rel="noreferrer"><Download size={18}/> Preview PDF</a><button className="btn-primary" disabled={busy || job.status === "completed"} onClick={approveAndSend}><CheckCircle2 size={18}/> {job.status === "completed" ? "Sent successfully" : "Approve & send"}</button></div>
          <p className="rounded-lg bg-slate-800 p-3 text-sm text-slate-400">Nothing has been sent yet. Approval mode mein owner review zaroori hai; Automatic mode mein eligible lost leads ko scheduler khud deliver karega.</p>
        </div> : <div className="grid min-h-96 place-items-center text-center text-slate-500"><div><Target className="mx-auto mb-3 text-orange-400" size={46}/><p className="font-bold text-slate-300">No recovery kit generated yet</p><p className="mt-2 max-w-sm text-sm">Lost lead choose karein ya manual details enter karke premium campaign generate karein.</p></div></div>}
      </Card>
    </div>
  </>;
}

function FeaturePage({ feature, notify }) {
  if (!feature) return null;
  if (feature.id === "client-portal")
    return <ClientPortalPage notify={notify} />;
  if (feature.id === "competitor-alert")
    return <CompetitorPage notify={notify} />;
  if (feature.id === "meeting-scheduler")
    return <MeetingSchedulerPage notify={notify} />;
  if (feature.id === "lost-lead")
    return <LostLeadMagnetPage notify={notify} />;
  return (
    <GeneratorPage
      title={feature.label}
      urdu="AI آٹومیشن"
      featureId={feature.id}
      button={`Run ${feature.label}`}
      notify={notify}
      fields="One-click automation with permanent CRM job history."
    />
  );
}

function FeatureBlueprintEditor({ feature, notify }) {
  const [item, setItem] = useState(null);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    api("/api/automation-blueprints").then((data) => setItem((data.items || []).find((x) => x.id === feature.id) || null)).catch((error) => notify("Workflow unavailable", error.message, "error"));
  }, [feature.id]);
  const save = async () => {
    try {
      const data = await api("/api/automation-blueprints", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [item] }) });
      setItem((data.items || []).find((x) => x.id === feature.id));
      notify("Workflow saved", `${feature.label} ka trigger aur working rule update ho gaya.`);
    } catch (error) { notify("Could not save workflow", error.message, "error"); }
  };
  if (!item) return <Card><Skeleton className="h-20 w-full" /></Card>;
  return <Card className="border-orange-500/30">
    <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
      <div><p className="text-xs font-bold uppercase text-orange-400">Editable automation workflow</p><h2 className="mt-1 text-lg font-bold">{feature.label} setup</h2></div>
      <ChevronRight className={`transition ${open ? "rotate-90" : ""}`} />
    </button>
    {open && <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="flex items-center justify-between rounded-lg border border-slate-700 p-4 sm:col-span-2"><span><b>Workflow enabled</b><small className="mt-1 block text-slate-500">Off karne par automatic jobs create nahi honge.</small></span><input type="checkbox" className="h-5 w-5" checked={item.enabled} onChange={(e) => setItem({ ...item, enabled: e.target.checked })} /></label>
      <div><label className="label">Execution mode</label><select className="field" value={item.mode} onChange={(e) => setItem({ ...item, mode: e.target.value })}><option value="automatic">Automatic</option><option value="approval">Owner approval first</option><option value="manual">Manual only</option></select></div>
      <div><label className="label">Trigger</label><input className="field" value={item.trigger || ""} onChange={(e) => setItem({ ...item, trigger: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label">Instructions / business rules</label><textarea className="field min-h-28 py-3" value={item.instructions || ""} onChange={(e) => setItem({ ...item, instructions: e.target.value })} /></div>
      <button className="btn-primary sm:col-span-2" onClick={save}><Save size={18} /> Save workflow configuration</button>
    </div>}
  </Card>;
}

function MeetingSchedulerPage({ notify }) {
  const [form, setForm] = useState({
      name: "",
      phone: "",
      service: "Podcast Studio",
    }),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false);
  const run = async () => {
    if (!form.name.trim() || !form.phone.trim())
      return notify(
        "Details required",
        "Client name aur WhatsApp number enter karein.",
        "error",
      );
    setBusy(true);
    try {
      const r = await api("/api/saas/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featureId: "meeting-scheduler", ...form }),
      });
      setResult(r.job.output);
      notify(
        "Meeting draft ready",
        "Automation Control se approve karne par 3 time buttons WhatsApp par jayenge.",
      );
    } catch (e) {
      notify("Could not prepare meeting", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Meeting Scheduler"
        urdu="میٹنگ"
        description="Client ko teen selectable WhatsApp time slots bhejein."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="label">Client name</label>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">WhatsApp number</label>
              <input
                className="field"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03XXXXXXXXX"
              />
            </div>
            <div>
              <label className="label">Meeting purpose / Service</label>
              <input
                className="field"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              />
            </div>
            <button
              className="btn-primary w-full"
              disabled={busy}
              onClick={run}
            >
              <CalendarDays size={18} />
              Prepare 3 slots
            </button>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">WhatsApp delivery</h2>
          {result ? (
            <div className="mt-4 space-y-3">
              {(result.slots || []).map((slot, i) => (
                <div
                  key={slot}
                  className="rounded-xl border border-slate-700 p-4"
                >
                  <b>Option {i + 1}</b>
                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(slot).toLocaleString()}
                  </p>
                </div>
              ))}
              <p className="text-sm text-emerald-400">
                Automation Control se Approve & Send karein.
              </p>
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center text-slate-500">
              <CalendarDays size={42} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function CompetitorPage({ notify }) {
  const [items, setItems] = useState([]),
    [form, setForm] = useState({
      name: "",
      url: "",
      niche: "Creative Production",
    }),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await api("/api/competitors");
    setItems(r.items || []);
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (!form.url.trim())
      return notify(
        "URL required",
        "Facebook, Instagram, YouTube ya website link paste karein.",
        "error",
      );
    setBusy(true);
    try {
      const r = await api("/api/competitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(r.error);
      setForm({ name: "", url: "", niche: form.niche });
      await load();
      notify("Competitor saved", "Source monitoring list mein add ho gaya.");
    } catch (e) {
      notify("Could not save", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id) => {
    await api("/api/competitors/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    notify("Removed", "Competitor source removed.");
  };
  const check = async () => {
    setBusy(true);
    try {
      const r = await api("/api/competitors/check", { method: "POST" });
      await load();
      notify(
        "Review complete",
        `${r.sources?.length || 0} competitor sources checked.`,
      );
    } catch (e) {
      notify("Check failed", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Competitor Watch"
        urdu="کمپیٹیٹر واچ"
        description="Facebook, Instagram, YouTube aur websites ko ek editable watchlist mein manage karein."
        action={
          <button className="btn-primary" disabled={busy} onClick={check}>
            <Activity size={18} />
            Check sources
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
        <Card>
          <h2 className="text-lg font-bold">Add competitor</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Page or brand name</label>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Competitor name"
              />
            </div>
            <div>
              <label className="label">
                Facebook, Instagram, YouTube or website URL
              </label>
              <input
                className="field"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="label">Niche</label>
              <input
                className="field"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
              />
            </div>
            <button
              className="btn-primary w-full"
              disabled={busy}
              onClick={save}
            >
              <Plus size={18} />
              Add to watchlist
            </button>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Watchlist</h2>
          <p className="mt-1 text-sm text-slate-500">
            Official platform access ke baghair system public posts scrape nahi
            karta; saved links owner review ke liye available rehte hain.
          </p>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-slate-700 p-4"
              >
                <div className="min-w-0 flex-1">
                  <b>{item.name}</b>
                  <p className="truncate text-xs text-slate-500">
                    {item.platform} · {item.url}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Last checked:{" "}
                    {item.lastCheckedAt
                      ? new Date(item.lastCheckedAt).toLocaleString()
                      : "Not checked"}
                  </p>
                </div>
                <a
                  className="btn-secondary !px-3 no-underline"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  className="btn-secondary !px-3 text-red-300"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!items.length && (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                No competitor sources added yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function AutomationControl({ notify }) {
  const [data, setData] = useState({ features: [], jobs: [], queue: {} }),
    [tab, setTab] = useState("approval_required"),
    [busy, setBusy] = useState("");
  const load = async () => {
    if (document.visibilityState !== "visible") return;
    try {
      setData(await api("/api/saas/features"));
    } catch (e) {
      notify("Queue refresh failed", e.message, "error");
    }
  };
  useEffect(() => {
    load();
  }, []);
  const scan = async () => {
    setBusy("scan");
    try {
      const r = await api("/api/automations/scan", { method: "POST" });
      await load();
      notify(
        "Lead scan complete",
        `${r.created?.length || 0} new recommendations prepared.`,
      );
    } catch (e) {
      notify("Scan failed", e.message, "error");
    } finally {
      setBusy("");
    }
  };
  const act = async (job, action) => {
    setBusy(job.id);
    try {
      const payload = { jobId: job.id, action, message: job.output?.message };
      if (action === "schedule")
        payload.dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const r = await api("/api/automations/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok)
        throw new Error(
          r.job?.execution?.error || r.error || "Execution failed",
        );
      await load();
      notify(
        action === "approve"
          ? "Automation completed"
          : action === "schedule"
            ? "Scheduled for one hour later"
            : `Automation ${action}d`,
        `${job.featureName} updated.`,
      );
    } catch (e) {
      notify("Action failed", e.message, "error");
    } finally {
      setBusy("");
    }
  };
  const jobs = (data.jobs || []).filter(
    (j) => tab === "all" || j.status === tab,
  );
  const counts = [
    ["approval_required", "Needs approval", data.queue?.approvalRequired || 0],
    ["scheduled", "Scheduled", data.queue?.scheduled || 0],
    ["completed", "Completed", data.queue?.completed || 0],
    ["failed", "Failed", data.queue?.failed || 0],
  ];
  return (
    <>
      <PageTitle
        title="Automation Control"
        urdu="Owner Approval"
        description="Raza AI scans every lead, prepares the next best action, and waits for your approval before any customer message is sent."
        action={
          <button
            className="btn-primary"
            disabled={busy === "scan"}
            onClick={scan}
          >
            <Activity
              className={busy === "scan" ? "animate-spin" : ""}
              size={18}
            />
            Scan all leads
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map(([id, label, value]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`card text-left transition ${tab === id ? "!border-emerald-500 ring-1 ring-emerald-500/30" : "hover:border-slate-600"}`}
          >
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-lg font-bold">Approval Queue</h2>
            {[
              "approval_required",
              "scheduled",
              "completed",
              "failed",
              "all",
            ].map((x) => (
              <button
                key={x}
                onClick={() => setTab(x)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === x ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}
              >
                {x.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {jobs.map((job) => (
              <AutomationJob
                key={job.id}
                job={job}
                busy={busy === job.id}
                act={act}
              />
            ))}
            {!jobs.length && (
              <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-700 text-center text-slate-500">
                <div>
                  <CheckCircle2 className="mx-auto mb-2" />
                  <p>No jobs in this view.</p>
                </div>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">20/20 Coverage</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every feature has a permanent job record and owner-controlled
            workflow.
          </p>
          <div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {(data.features || []).map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-xl border border-slate-700/70 p-3"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-xs font-black text-emerald-400">
                  {String(f.number).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <b className="block truncate text-sm">{f.name}</b>
                  <p className="text-xs text-slate-500">
                    {f.runs || 0} recorded jobs
                  </p>
                </div>
                <CheckCircle2
                  className="ml-auto shrink-0 text-emerald-400"
                  size={17}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function AutomationJob({ job, busy, act }) {
  const [message, setMessage] = useState(job.output?.message || "");
  useEffect(
    () => setMessage(job.output?.message || ""),
    [job.id, job.output?.message],
  );
  const tone =
    job.status === "completed"
      ? "text-emerald-400 bg-emerald-500/10"
      : job.status === "failed"
        ? "text-red-400 bg-red-500/10"
        : job.status === "approval_required"
          ? "text-amber-300 bg-amber-500/10"
          : "text-cyan-300 bg-cyan-500/10";
  const updated = { ...job, output: { ...job.output, message } };
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b>{job.featureName}</b>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tone}`}
            >
              {job.status.replace("_", " ")}
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] uppercase text-slate-400">
              {job.channel || "internal"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {job.input?.name || "Agency system"}{" "}
            {job.input?.service ? `· ${job.input.service}` : ""}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {job.output?.reason || "Manual automation run"}
          </p>
        </div>
        <span className="text-xs text-slate-600">
          {new Date(job.createdAt).toLocaleString()}
        </span>
      </div>
      {job.channel === "whatsapp" && (
        <textarea
          className="field mt-3 min-h-24 py-3 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Approved WhatsApp message draft"
        />
      )}
      {job.output?.preview && (
        <details className="mt-3 rounded-lg bg-slate-900 p-3 text-xs text-slate-400">
          <summary className="cursor-pointer font-bold text-slate-300">
            View generated output
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(job.output.preview, null, 2)}
          </pre>
        </details>
      )}
      {job.execution?.result && (
        <details className="mt-3 rounded-lg bg-emerald-950/20 p-3 text-xs text-emerald-200">
          <summary className="cursor-pointer font-bold">
            View execution result
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(job.execution.result, null, 2)}
          </pre>
        </details>
      )}
      {job.status === "approval_required" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => act(updated, "approve")}
            className="btn-primary"
          >
            <CheckCircle2 size={17} />
            {job.channel === "whatsapp"
              ? "Approve & send"
              : "Approve & complete"}
          </button>
          <button
            disabled={busy}
            onClick={() => act(updated, "schedule")}
            className="btn-secondary"
          >
            <Clock3 size={17} />
            Schedule 1h
          </button>
          <button
            disabled={busy}
            onClick={() => act(updated, "edit")}
            className="btn-secondary"
          >
            <Save size={17} />
            Save draft
          </button>
          <button
            disabled={busy}
            onClick={() => act(updated, "reject")}
            className="btn-secondary text-red-300"
          >
            <X size={17} />
            Reject
          </button>
        </div>
      )}
      {job.status === "failed" && (
        <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          {job.execution?.error ||
            "Execution failed. Check integration settings."}
        </p>
      )}
    </div>
  );
}

function RestoredToolPage({ mode, notify }) {
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({}),
    [message, setMessage] = useState("Services"),
    [chat, setChat] = useState([]);
  const titles = {
    "bot-studio": [
      "Bot Studio",
      "Test the exact option-bot reply before customers receive it.",
    ],
    followups: [
      "Follow-up Queue",
      "Schedule, review and run customer follow-ups.",
    ],
    analytics: [
      "Analytics",
      "Lead quality, sources, services and delivery health.",
    ],
    knowledge: [
      "Knowledge Editor",
      "Edit greeting, services, buttons, portfolio and FAQ answers.",
    ],
    templates: [
      "WhatsApp Templates",
      "Create and manage reusable approved-message drafts.",
    ],
    connect: [
      "Meta Connection",
      "Review Cloud API configuration and run a connection test.",
    ],
    audit: [
      "Audit Log",
      "Permanent history of operator and automation actions.",
    ],
  };
  const load = async () => {
    setBusy(true);
    try {
      const urls = {
        followups: "/api/followups",
        analytics: "/api/analytics",
        knowledge: "/api/knowledge",
        templates: "/api/templates",
        connect: "/api/meta/settings",
        audit: "/api/audit-log",
      };
      if (urls[mode]) {
        const result = await api(urls[mode]);
        setData(result);
        if (mode === "knowledge")
          setForm({
            greeting: result.greeting || "",
            portfolioUrl: result.portfolioUrl || "",
            services: (result.services || [])
              .map((x) => `${x.name} | ${x.reply}`)
              .join("\n"),
            pricing: (result.pricing || []).join("\n"),
            podcastSlots: (result.podcastSlots || []).join("\n"),
            knowledgePoints: (result.knowledgePoints || [])
              .map((x) => `${(x.match || []).join(", ")} => ${x.answer}`)
              .join("\n"),
            faqs: (result.faqs || [])
              .map((x) => `${(x.match || []).join(", ")} => ${x.answer}`)
              .join("\n"),
            quickButtons: (result.quickButtons || [])
              .map((x) => `${x.id} | ${x.label} | ${x.reply || ""}`)
              .join("\n"),
          });
        if (mode === "connect")
          setForm({
            phoneNumberId: result.phoneNumberId || "",
            wabaId: result.wabaId || "",
            graphVersion: result.graphVersion || "v23.0",
            accessToken: "",
          });
      }
    } catch (e) {
      notify("Could not load", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    load();
  }, [mode]);
  const post = async (url, body = {}) => {
    setBusy(true);
    try {
      const result = await api(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      notify("Saved", "Changes are active.");
      await load();
      return result;
    } catch (e) {
      notify("Action failed", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const botSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    setMessage("");
    setChat((v) => [...v, { role: "user", text }]);
    try {
      const r = await api("/api/bot/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "dashboard-simulator", text }),
      });
      setChat((v) => [
        ...v,
        { role: "bot", text: r.reply || r.message || JSON.stringify(r) },
      ]);
    } catch (e) {
      notify("Bot test failed", e.message, "error");
    }
  };
  const [title, description] = titles[mode];
  if (mode === "bot-studio")
    return (
      <>
        <PageTitle title={title} urdu="Simulator" description={description} />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card>
            <div className="min-h-80 space-y-3 rounded-xl bg-slate-950/40 p-4">
              {chat.map((x, i) => (
                <div
                  key={i}
                  className={`flex ${x.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <p
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${x.role === "user" ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}
                  >
                    {x.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && botSend()}
              />
              <button className="btn-primary" onClick={botSend}>
                <Send size={18} />
                Test
              </button>
            </div>
          </Card>
          <Card>
            <b>Test scenarios</b>
            <div className="mt-4 grid gap-2">
              {[
                "Start",
                "Services",
                "Portfolio",
                "Book a Podcast",
                "Get a quote",
              ].map((x) => (
                <button
                  className="btn-secondary justify-start"
                  key={x}
                  onClick={() => setMessage(x)}
                >
                  {x}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </>
    );
  if (mode === "analytics") {
    const d = data || {};
    const groups = [
      ["Lead sources", d.bySource],
      ["Lead labels", d.byLabel],
      ["Services demand", d.byService],
    ];
    return (
      <>
        <PageTitle title={title} urdu="Reports" description={description} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Average score", `${d.averageScore || 0}/100`],
            ["Conversations", d.conversations || 0],
            ["Follow-ups sent", d.followups?.sent || 0],
            ["Needs attention", d.followups?.needsAttention || 0],
          ].map((x) => (
            <Card key={x[0]}>
              <p className="text-sm text-slate-400">{x[0]}</p>
              <b className="mt-3 block text-3xl">{x[1]}</b>
            </Card>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {groups.map(([name, items]) => (
            <Card key={name}>
              <h2 className="font-bold">{name}</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(items || {}).map(([k, v]) => (
                  <div
                    className="flex justify-between border-b border-slate-700 pb-2"
                    key={k}
                  >
                    <span>{k}</span>
                    <b className="text-emerald-400">{v}</b>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }
  if (mode === "followups") {
    const items = data?.items || data || [];
    return (
      <>
        <PageTitle
          title={title}
          urdu="Queue"
          description={description}
          action={
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => post("/api/followups/run")}
            >
              <PlayCircle size={18} />
              Run due
            </button>
          }
        />
        <Card>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="field"
              placeholder="Name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="field"
              placeholder="WhatsApp number"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <select
              className="field"
              onChange={(e) =>
                setForm({ ...form, delayMinutes: e.target.value })
              }
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="60">1 hour</option>
              <option value="1440">1 day</option>
            </select>
            <button
              className="btn-secondary"
              onClick={() =>
                post("/api/followups/schedule", {
                  ...form,
                  service: form.service || "General",
                })
              }
            >
              <Plus size={18} />
              Schedule
            </button>
          </div>
        </Card>
        <Card className="mt-5">
          <div className="space-y-3">
            {items.map((x, i) => (
              <div
                key={x.id || i}
                className="grid gap-2 rounded-xl border border-slate-700 p-3 sm:grid-cols-4"
              >
                <b>{x.name || x.phone}</b>
                <span>{x.service || "General"}</span>
                <span>{x.status || "scheduled"}</span>
                <span className="text-slate-400">
                  {x.dueAt ? new Date(x.dueAt).toLocaleString() : ""}
                </span>
              </div>
            ))}
            {!items.length && (
              <p className="text-slate-500">No follow-ups queued.</p>
            )}
          </div>
        </Card>
      </>
    );
  }
  if (mode === "knowledge")
    return (
      <>
        <PageTitle title={title} urdu="Editor" description={description} />
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Editor
              label="Greeting"
              value={form.greeting}
              set={(v) => setForm({ ...form, greeting: v })}
            />
            <Editor
              label="Portfolio URL"
              value={form.portfolioUrl}
              set={(v) => setForm({ ...form, portfolioUrl: v })}
            />
            <Editor
              label="Services: Name | Reply"
              value={form.services}
              set={(v) => setForm({ ...form, services: v })}
            />
            <Editor
              label="Quick buttons: ID | Label | Reply"
              value={form.quickButtons}
              set={(v) => setForm({ ...form, quickButtons: v })}
            />
            <Editor
              label="Podcast slots"
              value={form.podcastSlots}
              set={(v) => setForm({ ...form, podcastSlots: v })}
            />
            <Editor
              label="Podcast pricing"
              value={form.pricing}
              set={(v) => setForm({ ...form, pricing: v })}
            />
            <Editor
              label="FAQs: keywords => answer"
              value={form.faqs}
              set={(v) => setForm({ ...form, faqs: v })}
            />
            <Editor
              label="Extra knowledge: keywords => answer"
              value={form.knowledgePoints}
              set={(v) => setForm({ ...form, knowledgePoints: v })}
            />
          </div>
          <button
            disabled={busy}
            className="btn-primary mt-5"
            onClick={() => post("/api/knowledge", form)}
          >
            <Save size={18} />
            Save bot knowledge
          </button>
        </Card>
      </>
    );
  if (mode === "templates") {
    const items = data?.templates || [];
    return (
      <>
        <PageTitle title={title} urdu="Messages" description={description} />
        <Card>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="field"
              placeholder="Template name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="field"
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option>UTILITY</option>
              <option>MARKETING</option>
              <option>AUTHENTICATION</option>
            </select>
            <input
              className="field"
              placeholder="Language, e.g. en"
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            />
            <button
              className="btn-primary"
              onClick={() =>
                post("/api/templates", { ...form, status: "draft" })
              }
            >
              <Plus size={18} />
              Save
            </button>
          </div>
          <textarea
            className="field mt-3 min-h-28 py-3"
            placeholder="Message body"
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Card>
        <Card className="mt-5">
          <div className="space-y-3">
            {items.map((x) => (
              <div
                className="flex gap-3 rounded-xl border border-slate-700 p-3"
                key={x.id}
              >
                <div className="min-w-0 flex-1">
                  <b>{x.name}</b>
                  <p className="truncate text-sm text-slate-400">{x.body}</p>
                </div>
                <span>{x.status}</span>
                <button
                  onClick={() => post("/api/templates/remove", { id: x.id })}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </>
    );
  }
  if (mode === "connect")
    return (
      <>
        <PageTitle title={title} urdu="Cloud API" description={description} />
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Editor
              label="Phone Number ID"
              value={form.phoneNumberId}
              set={(v) => setForm({ ...form, phoneNumberId: v })}
            />
            <Editor
              label="WABA ID"
              value={form.wabaId}
              set={(v) => setForm({ ...form, wabaId: v })}
            />
            <Editor
              label="Graph API version"
              value={form.graphVersion}
              set={(v) => setForm({ ...form, graphVersion: v })}
            />
            <Editor
              label="New access token (leave blank to preserve)"
              value={form.accessToken}
              set={(v) => setForm({ ...form, accessToken: v })}
            />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              className="btn-primary"
              onClick={() => post("/api/meta/settings", form)}
            >
              <Save size={18} />
              Save connection
            </button>
            <button
              className="btn-secondary"
              onClick={async () => {
                const r = await post("/api/meta/self-test");
                if (r) setData(r);
              }}
            >
              <Activity size={18} />
              Run test
            </button>
          </div>
          {data?.checks && (
            <pre className="mt-5 overflow-auto rounded-xl bg-slate-950 p-4 text-xs">
              {JSON.stringify(data.checks, null, 2)}
            </pre>
          )}
        </Card>
      </>
    );
  const items = data?.items || [];
  return (
    <>
      <PageTitle
        title={title}
        urdu="History"
        description={description}
        action={
          <button className="btn-secondary" onClick={load}>
            <Activity size={18} />
            Refresh
          </button>
        }
      />
      <Card>
        <div className="space-y-3">
          {items.map((x, i) => (
            <div
              className="grid gap-2 rounded-xl border border-slate-700 p-3 sm:grid-cols-4"
              key={x.id || i}
            >
              <b>{x.action || "Action"}</b>
              <span>{x.actor || "system"}</span>
              <span>{x.phone || x.templateName || ""}</span>
              <span className="text-slate-400">
                {x.at ? new Date(x.at).toLocaleString() : ""}
              </span>
            </div>
          ))}
          {!items.length && (
            <p className="text-slate-500">No audit entries yet.</p>
          )}
        </div>
      </Card>
    </>
  );
}
function Editor({ label, value, set }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {String(value || "").includes("\n") ||
      String(value || "").length > 100 ? (
        <textarea
          className="field min-h-32 py-3"
          value={value || ""}
          onChange={(e) => set(e.target.value)}
        />
      ) : (
        <input
          className="field"
          value={value || ""}
          onChange={(e) => set(e.target.value)}
        />
      )}
    </label>
  );
}

function MobileNav({ page, navigate, openFeatures }) {
  const items = [
    corePages.find((x) => x.id === "inbox"),
    corePages.find((x) => x.id === "dashboard"),
    corePages.find((x) => x.id === "clients"),
    corePages.find((x) => x.id === "automations"),
  ].filter(Boolean);
  return (
    <nav className="mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-700 bg-[#0B1220]/95 px-2 py-2 backdrop-blur lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`mobile-nav-item flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] ${page === item.id ? "text-emerald-400" : "text-slate-500"}`}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={openFeatures}
        className="mobile-nav-item flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] text-slate-500"
      >
        <Sparkles size={19} />
        <span>AI Tools</span>
      </button>
    </nav>
  );
}
function CommandPalette({ open, close, query, setQuery, items, choose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            className="fixed left-1/2 top-[10vh] z-[80] w-[calc(100%-28px)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-700 bg-[#162235] shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
          >
            <div className="flex items-center gap-3 border-b border-slate-700 px-4">
              <Search className="text-slate-500" />
              <input
                autoFocus
                className="h-16 flex-1 bg-transparent outline-none placeholder:text-slate-500"
                placeholder="Search anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="text-xs text-slate-500">ESC</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {items.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => choose(item)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-800"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    {item.type === "feature" ? (
                      <Sparkles size={17} />
                    ) : (
                      React.createElement(item.icon, { size: 17 })
                    )}
                  </div>
                  <div>
                    <b className="text-sm">{item.label}</b>
                    <p className="text-xs text-slate-500">
                      {item.type === "feature"
                        ? "AI automation"
                        : "Workspace page"}
                    </p>
                  </div>
                  <ChevronRight className="ml-auto text-slate-600" size={16} />
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
function ToastStack({ toasts }) {
  return (
    <div className="fixed right-4 top-24 z-[100] grid w-[min(380px,calc(100vw-32px))] gap-3">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
        >
          <div className="flex gap-3">
            {t.type === "error" ? (
              <AlertCircle className="text-red-400" />
            ) : (
              <CheckCircle2 className="text-emerald-400" />
            )}
            <div>
              <b>{t.title}</b>
              <p className="mt-1 text-sm text-slate-400">{t.message}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function InboxPage({ notify }) {
  const [sessions, setSessions] = useState([]),
    [phone, setPhone] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [folder, setFolder] = useState("All"),
    [search, setSearch] = useState(""),
    [attachOpen, setAttachOpen] = useState(false),
    [recording, setRecording] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(false),
    [contact, setContact] = useState({ name: "", phone: "" });
  const recorderRef = useRef(null),
    audioChunks = useRef([]);
  const load = async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const data = await api("/api/live-inbox");
      setSessions(data.sessions || []);
      setPhone((v) => v || data.sessions?.[0]?.phone || "");
    } catch (e) {
      notify("Inbox refresh failed", e.message, "error");
    }
  };
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);
  const active = sessions.find((x) => x.phone === phone) || sessions[0];
  const folders = ["All", "Hot", "Warm", "Cold", "Needs Human"];
  const counts = Object.fromEntries(
    folders.map((name) => [
      name,
      name === "All"
        ? sessions.length
        : name === "Needs Human"
          ? sessions.filter((x) => x.needsHuman).length
          : sessions.filter((x) => x.leadLabel === name).length,
    ]),
  );
  const visibleSessions = sessions.filter(
    (item) =>
      (folder === "All" ||
        (folder === "Needs Human"
          ? item.needsHuman
          : item.leadLabel === folder)) &&
      `${item.name || ""} ${item.phone || ""} ${item.lastUserMessage || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const saveLabel = async (leadLabel) => {
    if (!active) return;
    setBusy(true);
    try {
      await api("/api/live-inbox/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: active.phone, leadLabel }),
      });
      await load();
      notify(
        "Lead label updated",
        leadLabel
          ? `${active.name || active.phone} moved to ${leadLabel}.`
          : "Automatic scoring restored.",
      );
    } catch (e) {
      notify("Could not update label", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const saveConversation = async (fields) => {
    if (!active) return;
    setBusy(true);
    try {
      await api("/api/live-inbox/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: active.phone, ...fields }),
      });
      await load();
      notify(
        "Conversation saved",
        "Tags, notes and assignment details updated.",
      );
    } catch (e) {
      notify("Could not save details", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const sendText = async () => {
    if (!active || !message.trim()) return;
    setBusy(true);
    try {
      const r = await api("/api/live-inbox/manual-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: active.phone,
          type: "text",
          text: message,
        }),
      });
      if (!r.delivery?.sent)
        throw new Error(
          r.delivery?.response?.error?.message || "WhatsApp delivery failed",
        );
      setMessage("");
      await load();
      notify("Message sent", "Human reply delivered.");
    } catch (e) {
      notify("Could not send", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const toggleBot = async () => {
    if (!active) return;
    await api("/api/live-inbox/pause", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: active.phone, paused: !active.botPaused }),
    });
    await load();
  };
  const uploadAndSend = async (file, typeOverride = "") => {
    if (!file || !active) return;
    const type =
      typeOverride ||
      (file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "document");
    const limit = type === "video" ? 16 : type === "audio" ? 8 : 10;
    if (file.size > limit * 1024 * 1024) {
      notify("File too large", `Use a ${limit} MB or smaller file.`, "error");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const supportedVoice = type !== "audio" || /^audio\/(mp4|ogg|mpeg|aac|amr)/i.test(file.type);
      const initialType = type === "audio" && !supportedVoice ? "application/octet-stream" : (file.type || "application/octet-stream");
      const up = await api("/api/whatsapp/media/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          mimeType: initialType,
          filename: file.name,
        }),
      });
      if (!up.ok) throw new Error(up.error || "Upload failed");
      const outboundType = type === "audio" && !supportedVoice ? "document" : type;
      const r = await api("/api/live-inbox/manual-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: active.phone,
          type: outboundType,
          mediaId: up.mediaId,
          filename: file.name,
          text: message,
        }),
      });
      let deliveredAs = outboundType === "document" && type === "audio" ? "playable audio file" : type;
      if (!r.delivery?.sent) {
        if (type !== "audio")
          throw new Error(
            r.delivery?.response?.error?.message || "WhatsApp delivery failed",
          );
        const documentUpload = await api("/api/whatsapp/media/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dataUrl, mimeType: "application/octet-stream", filename: file.name || `Raza-voice-${Date.now()}.audio` }),
        });
        if (!documentUpload.ok) throw new Error(documentUpload.error || "Voice fallback upload failed");
        const fallback = await api("/api/live-inbox/manual-reply", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phone: active.phone,
            type: "document",
            mediaId: documentUpload.mediaId,
            filename: file.name || `Raza-voice-${Date.now()}.audio`,
            text: message || "Voice message",
          }),
        });
        if (!fallback.delivery?.sent)
          throw new Error(
            fallback.delivery?.response?.error?.message ||
              r.delivery?.response?.error?.message ||
              "Voice message delivery failed",
          );
        deliveredAs = "playable audio file";
      }
      setMessage("");
      setAttachOpen(false);
      await load();
      notify("Attachment sent", `${deliveredAs} delivered on WhatsApp.`);
    } catch (error) {
      notify("Attachment failed", error.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const sendMedia = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await uploadAndSend(file);
  };
  const sendLocation = () => {
    if (!active || !navigator.geolocation)
      return notify(
        "Location unavailable",
        "Browser location access is not available.",
        "error",
      );
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await api("/api/live-inbox/manual-reply", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              phone: active.phone,
              type: "location",
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              locationName: "Shared location",
            }),
          });
          if (!r.delivery?.sent)
            throw new Error(
              r.delivery?.response?.error?.message ||
                "Location delivery failed",
            );
          setAttachOpen(false);
          await load();
          notify("Location sent", "Current location delivered on WhatsApp.");
        } catch (e) {
          notify("Location failed", e.message, "error");
        } finally {
          setBusy(false);
        }
      },
      (e) => {
        setBusy(false);
        notify("Location permission needed", e.message, "error");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  const sendContact = async () => {
    if (!active || !contact.name.trim() || !contact.phone.trim())
      return notify(
        "Contact details needed",
        "Enter contact name and number.",
        "error",
      );
    setBusy(true);
    try {
      const r = await api("/api/live-inbox/manual-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: active.phone,
          type: "contact",
          contactName: contact.name,
          contactPhone: contact.phone,
        }),
      });
      if (!r.delivery?.sent)
        throw new Error(
          r.delivery?.response?.error?.message || "Contact delivery failed",
        );
      setContact({ name: "", phone: "" });
      setAttachOpen(false);
      await load();
      notify("Contact sent", "Contact card delivered on WhatsApp.");
    } catch (e) {
      notify("Contact failed", e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = [
        "audio/mp4;codecs=mp4a.40.2",
        "audio/mp4;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        stream,
        preferred ? { mimeType: preferred } : undefined,
      );
      audioChunks.current = [];
      recorder.ondataavailable = (e) =>
        e.data.size && audioChunks.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const mime = recorder.mimeType || preferred || "audio/webm";
        const extension = mime.includes("mp4")
          ? "m4a"
          : mime.includes("ogg")
            ? "ogg"
            : "webm";
        const blob = new Blob(audioChunks.current, { type: mime });
        await uploadAndSend(
          new File([blob], `voice-${Date.now()}.${extension}`, {
            type: blob.type,
          }),
          "audio",
        );
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      notify("Microphone unavailable", e.message, "error");
    }
  };
  return (
    <>
      <PageTitle
        title="Live Inbox"
        urdu="WhatsApp"
        description="Chats refresh every 30 seconds and are automatically organized by lead strength."
        action={
          <button className="btn-secondary" onClick={load}>
            <Activity size={18} />
            Refresh
          </button>
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {folders.map((name) => (
          <button
            key={name}
            onClick={() => setFolder(name)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${folder === name ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-700 bg-slate-900 text-slate-300"}`}
          >
            {name} <span className="ml-1 opacity-70">{counts[name]}</span>
          </button>
        ))}
      </div>
      <div className="grid min-h-[650px] gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-slate-700 p-4">
            <b>{folder} Chats</b>
            <p className="text-xs text-slate-500">
              {visibleSessions.length} conversations
            </p>
            <div className="relative mt-3">
              <Search
                className="absolute left-3 top-3 text-slate-500"
                size={16}
              />
              <input
                className="field !min-h-10 pl-9 text-sm"
                placeholder="Search chats"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[650px] overflow-y-auto">
            {visibleSessions.map((item) => (
              <button
                key={item.phone}
                onClick={() => setPhone(item.phone)}
                className={`w-full border-b border-slate-800 p-4 text-left ${active?.phone === item.phone ? "bg-emerald-500/10" : "hover:bg-slate-800/60"}`}
              >
                <div className="flex items-center gap-2">
                  <b className="min-w-0 flex-1 truncate text-sm">
                    {item.name || item.phone}
                  </b>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black ${item.leadLabel === "Hot" ? "bg-red-500/15 text-red-300" : item.leadLabel === "Warm" ? "bg-amber-500/15 text-amber-300" : "bg-slate-700 text-slate-300"}`}
                  >
                    {item.leadLabel}
                  </span>
                  {item.needsHuman && (
                    <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-bold text-cyan-300">
                      HUMAN
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {item.lastUserMessage || "No preview"}
                </p>
                <p className="mt-2 text-[10px] text-slate-600">
                  Score {item.leadScore}/100 · {item.labelSource}
                </p>
              </button>
            ))}
            {!visibleSessions.length && (
              <p className="p-6 text-sm text-slate-500">
                No chats in this folder.
              </p>
            )}
          </div>
        </Card>
        <Card className="flex min-w-0 flex-col !p-0 overflow-hidden">
          {active ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 p-4">
                <div className="min-w-0 flex-1">
                  <b>{active.name || active.phone}</b>
                  <p className="text-xs text-slate-500">
                    {active.phone} · AI score {active.leadScore}/100
                  </p>
                </div>
                <select
                  title="Lead label"
                  className="field !min-h-10 w-auto min-w-32 text-sm"
                  value={
                    active.labelSource === "manual" ? active.leadLabel : ""
                  }
                  disabled={busy}
                  onChange={(e) => saveLabel(e.target.value)}
                >
                  <option value="">Auto: {active.automaticLabel}</option>
                  <option>Hot</option>
                  <option>Warm</option>
                  <option>Cold</option>
                  <option>New</option>
                </select>
                <button
                  title="Conversation details"
                  onClick={() => setDetailsOpen((value) => !value)}
                  className={`btn-secondary !h-10 !w-10 !p-0 ${detailsOpen ? "!border-emerald-500 !text-emerald-300" : ""}`}
                >
                  <Tags size={17} />
                </button>
                <a
                  href={`tel:${String(active.phone || "").replace(/[^\d+]/g, "")}`}
                  title={`Call ${active.name || active.phone}`}
                  aria-label={`Call ${active.name || active.phone}`}
                  className="btn-primary !h-10 !w-10 !min-h-10 shrink-0 !p-0"
                >
                  <Phone size={18} />
                </a>
                <button
                  onClick={toggleBot}
                  className={active.botPaused ? "btn-primary" : "btn-secondary"}
                >
                  {active.botPaused ? (
                    <PlayCircle size={18} />
                  ) : (
                    <PauseCircle size={18} />
                  )}{" "}
                  {active.botPaused ? "Resume AI" : "Human takeover"}
                </button>
              </div>
              {detailsOpen && (
                <ConversationDetails
                  active={active}
                  busy={busy}
                  save={saveConversation}
                />
              )}
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-950/30 p-4">
                {(active.transcript || []).map((item, i) => (
                  <div
                    key={`${item.at}-${i}`}
                    className={`flex ${item.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm sm:max-w-[72%] ${item.role === "user" ? "bg-slate-800" : item.role === "human" ? "bg-emerald-500 text-slate-950" : "bg-cyan-500/15 text-cyan-100"}`}
                    >
                      <MessageAttachment item={item} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-700 p-4">
                {attachOpen && (
                  <div className="mb-3 rounded-xl border border-slate-700 bg-slate-900 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="btn-secondary cursor-pointer justify-start">
                        <Upload size={17} /> Image, video or document
                        <input
                          className="hidden"
                          type="file"
                          accept="image/*,video/mp4,video/3gpp,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                          onChange={sendMedia}
                        />
                      </label>
                      <button className="btn-secondary justify-start" onClick={sendLocation}>
                        <MapPin size={17} /> Current location
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input className="field !min-h-10 text-sm" placeholder="Contact name" value={contact.name} onChange={(e)=>setContact({...contact,name:e.target.value})}/>
                      <input className="field !min-h-10 text-sm" placeholder="Contact number" value={contact.phone} onChange={(e)=>setContact({...contact,phone:e.target.value})}/>
                      <button className="btn-secondary" onClick={sendContact}><Users size={17}/> Send contact</button>
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button
                    className={`btn-secondary !h-12 !w-12 shrink-0 !p-0 ${attachOpen ? "!border-emerald-500 !text-emerald-300" : ""}`}
                    title="Attachments and location"
                    onClick={()=>setAttachOpen((value)=>!value)}
                  >
                    <Paperclip size={19} />
                  </button>
                  <textarea
                    className="field min-h-12 flex-1 resize-none py-3"
                    rows="1"
                    placeholder="Type a human reply..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendText();
                      }
                    }}
                  />
                  <button
                    className={`!h-12 !w-12 shrink-0 !p-0 ${recording ? "btn-primary !bg-red-500" : "btn-secondary"}`}
                    disabled={busy}
                    title={recording ? "Stop and send voice note" : "Record voice note"}
                    onClick={toggleRecording}
                  >
                    {recording ? <Square size={17}/> : <Mic size={19}/>} 
                  </button>
                  <button
                    className="btn-primary !h-12 !w-12 shrink-0 !p-0"
                    disabled={busy}
                    onClick={sendText}
                  >
                    <Send size={19} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Text, voice notes, images, video, documents, contacts and live location are supported.
                </p>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-slate-500">
              <MessageSquare size={42} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function ConversationDetails({ active, busy, save }) {
  const [form,setForm]=useState({assignedTo:active.assignedTo||'',stage:active.stage||'New',tags:(active.tags||[]).join(', '),notes:active.notes||''});
  useEffect(()=>setForm({assignedTo:active.assignedTo||'',stage:active.stage||'New',tags:(active.tags||[]).join(', '),notes:active.notes||''}),[active.phone,active.assignedTo,active.stage,active.tags,active.notes]);
  return <div className="grid gap-3 border-b border-slate-700 bg-slate-900/70 p-4 sm:grid-cols-2">
    <label><span className="label">Assigned to</span><input className="field !min-h-10 text-sm" placeholder="Team member" value={form.assignedTo} onChange={e=>setForm({...form,assignedTo:e.target.value})}/></label>
    <label><span className="label">Sales stage</span><select className="field !min-h-10 text-sm" value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{['New','Qualified','Proposal','Won','Lost'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="sm:col-span-2"><span className="label">Tags</span><input className="field !min-h-10 text-sm" placeholder="podcast, urgent, karachi" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/></label>
    <label className="sm:col-span-2"><span className="label">Private notes</span><textarea className="field min-h-20 py-3 text-sm" placeholder="Notes visible only to your team" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    <button className="btn-primary sm:col-span-2" disabled={busy} onClick={()=>save(form)}><Save size={17}/>Save conversation details</button>
  </div>;
}

function MessageAttachment({ item }) {
  if (item.type === "image" && item.mediaUrl)
    return (
      <>
        <a href={item.mediaUrl} target="_blank" rel="noreferrer">
          <img
            src={item.mediaUrl}
            alt={item.text || "WhatsApp image"}
            className="max-h-80 w-full rounded-xl object-contain"
          />
        </a>
        {item.text && item.text !== "start" && (
          <p className="mt-2 whitespace-pre-wrap break-words">{item.text}</p>
        )}
      </>
    );
  if (item.type === "video" && item.mediaUrl)
    return (
      <>
        <video
          controls
          preload="metadata"
          src={item.mediaUrl}
          className="max-h-80 w-full rounded-xl"
        />
        {item.text && item.text !== "start" && (
          <p className="mt-2 whitespace-pre-wrap break-words">{item.text}</p>
        )}
      </>
    );
  if (["audio", "voice"].includes(item.type) && item.mediaUrl)
    return (
      <>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold">
          <Mic size={15} />
          Audio message
        </div>
        <audio
          controls
          preload="none"
          src={item.mediaUrl}
          className="max-w-full"
        />
      </>
    );
  if (item.type === "document" && item.mediaUrl)
    return (
      <a
        href={item.mediaUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-secondary no-underline"
      >
        <FileText size={18} />
        Open document
      </a>
    );
  return <p className="whitespace-pre-wrap break-words">{item.text}</p>;
}

export default App;
