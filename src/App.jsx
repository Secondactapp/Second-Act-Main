import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ─── SEO Head Manager ─────────────────────────────────────
// Manages document.title, meta tags, and structured data per screen.
// Works in any React SPA (CRA, Vite, Next.js client components).
const SEO_BASE = {
  siteName: "Be Brilliant",
  siteUrl: "https://bebrilapp.com", // Update to your actual domain
  description: "Be Brilliant is your daily career development program. Personality-matched, research-backed, one task a day. Get a clear, personalized career plan in minutes.",
  ogImage: "https://bebrilapp.com/og-image.png", // Update with actual OG image URL
};

function useSEO({ title, description, path, noIndex } = {}) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | ${SEO_BASE.siteName}`
      : `${SEO_BASE.siteName} — Your Daily Career Development Program`;
    const desc = description || SEO_BASE.description;
    const url = `${SEO_BASE.siteUrl}${path || ""}`;

    // Title
    document.title = fullTitle;

    // Meta tags — create or update
    const setMeta = (attr, attrVal, content) => {
      let el = document.querySelector(`meta[${attr}="${attrVal}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, attrVal); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };

    // Core
    setMeta("name", "description", desc);
    setMeta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SEO_BASE.siteName);
    setMeta("property", "og:image", SEO_BASE.ogImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");

    // Twitter Card
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", SEO_BASE.ogImage);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", url);

  }, [title, description, path, noIndex]);
}

// Structured data for landing page (JSON-LD)
function SEOStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Be Brilliant",
    "applicationCategory": "LifestyleApplication",
    "description": SEO_BASE.description,
    "url": SEO_BASE.siteUrl,
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to start"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    }
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ─── Tokens ───────────────────────────────────────────────
const T = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  display: "Georgia, 'Times New Roman', serif",
  mono: "'Space Mono', monospace",
  // Warm charcoal text scale
  black: "#1E1E2A", ink: "#2A2640", body: "#5C5C6E", muted: "#9494A6",
  border: "#E6E4EE", bg: "#FFFDF7",
  // Brand: warm gold/amber, primary accent
  brand: "#E8A820", brandD: "#D49518", brandL: "#F0DEB0", brandMid: "#D8B860",
  // Secondary accent: sage green, for insights, observations, Mr. Bril
  sage: "#D2E8D8", sageD: "#3B7A56", sageL: "#EEF6F0",
  // Secondary accent: lavender, for program structure, strategy, progress
  lav: "#E0D4F8", lavD: "#6B50B8", lavL: "#F6F2FF",
  // No gradient, flat warm cream
  grad: "#F0DEB0",
  // Shadows with warm tone
  shadow: "0 2px 16px rgba(30,30,42,0.06)",
  shadowMd: "0 6px 24px rgba(30,30,42,0.09)",
  // Rare-use pastels (floating shapes, decorative only)
  peach: "#FFD8C4", lemon: "#F0D888", sky: "#C4E0FF",
};

// ─── Persistent Storage Helper (Vercel / browser-compatible) ─────
// Uses localStorage for persistence across sessions.
const Store = {
  _clean(key) {
    return key.replace(/[\s\/\\"']/g, "").slice(0, 195);
  },
  async get(key) {
    try {
      const raw = localStorage.getItem(Store._clean(key));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      localStorage.setItem(Store._clean(key), JSON.stringify(value));
      return true;
    } catch { return false; }
  },
  async del(key) {
    try {
      localStorage.removeItem(Store._clean(key));
      return true;
    } catch { return false; }
  },
};


// ─── Shared Constants (single source of truth) ──────────
const TODAY_ISO = () => new Date().toISOString().split("T")[0]; // "2026-03-20"
const TODAY_READABLE = () => new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); // "Friday, March 20, 2026"
const TODAY_CONTEXT = () => `Today's date is ${TODAY_READABLE()} (${TODAY_ISO()}). Use this to calculate deadlines, timelines, and time remaining accurately.`;
const TOTAL_WEEKS = 52;
const TOTAL_DAYS = TOTAL_WEEKS * 7; // 364
const ROLE_NAMES = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
const URG_TEXTS = ["AI is moving faster than I am","I feel stuck and need a change","A layoff made me rethink my path","I want a promotion or a better role","I want to move to a new company","I want to switch fields","Keen on exploring new opportunities","None of the above"];
const BLOCKER_TEXTS = ["Not enough time, days are full","Too much information, don't know where to start","I start but don't follow through","I learn things but don't apply them to actual work","Direction paralysis, too many options or none that feel right"];
const SENIORITY_TEXTS = ["Early career","Established, capable and growing","Senior, domain expert","Leadership, running a team or function","Executive, setting direction"];

// ─── Shared Helpers (deduplicated) ──────────────────────
function normalizeBlocker(blocker) {
  return Array.isArray(blocker) ? blocker : (blocker != null ? [blocker] : []);
}

function calcStreak(dayStatus) {
  let s = 0, skipsUsed = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    if (dayStatus[d] === 'done') s++;
    else if (dayStatus[d] === 'skipped' && skipsUsed === 0) skipsUsed++;
    else break;
  }
  return s;
}

function lk(arr, idx) {
  return (idx !== undefined && idx >= 0) ? arr[idx] || null : null;
}

// ─── API response text extractor (deduplicated) ──────────
function extractText(data) {
  return (data.content || []).map(b => b.text || "").join("");
}



// ─── Storage key builder (shared between root & dashboard) ─
function buildDashStorageKey(plan) {
  return `bebril_${[
    plan._answers?.name || "",
    plan._answers?.role ?? "",
    plan._answers?.goal ?? "",
    plan.profileName || "",
  ].join("_").replace(/\s+/g, "").slice(0, 60)}`;
}

// ─── Helper: find question by ID ──────────────────────────
function Q(id) { return questions.find(q => q.id === id); }
function QOpt(id, idx) { const q = Q(id); return q?.options?.[idx]?.text || ""; }

// ─── Goal texts, single source of truth ──────────────────
// Indices 0-4 match the goal question options order
const GOAL_TEXTS = [
  "Get a promotion or step into a role that's actually a level up",
  "Move to a better company, one that fits where I want to go",
  "Make a real pivot into a new field, industry, or type of work",
  "Build the skills that keep me relevant, especially as AI changes what the job requires",
  "Feel genuinely solid and confident in my job or career",
];

// Archetype identity taglines, shown on dashboard as behavioral reinforcement
// ─── Curated inspirational quotes, career progress & daily action ───────────
const CAREER_QUOTES = [
  { text: "People who track their progress are 42% more likely to achieve their goals than those who don't.", author: "Goal research, Dominican University" },
  { text: "The most reliable predictor of long-term success isn't talent or intelligence, it's consistent follow-through on small commitments.", author: "Behavioral economics research" },
  { text: "People who write down their goals and review them weekly are significantly more likely to achieve them.", author: "Goal-setting research" },
  { text: "Most people overestimate what they can do in a day and underestimate what they can do in a year of consistent effort.", author: "Productivity research" },
  { text: "The difference between people who make career change happen and those who don't is rarely ambition, it's daily action.", author: "Career transition research" },
  { text: "Habits that are tied to a specific time and place are far more likely to stick than intentions alone.", author: "Implementation intention research" },
  { text: "People who share their progress with a peer are significantly more likely to follow through.", author: "Accountability research" },
  { text: "Identity change precedes behavior change. People who act as if they are already the person they want to become are more likely to get there.", author: "Behavioral psychology" },
  { text: "The average professional who spends 30 minutes a day on deliberate skill development will outperform peers who don't within 8 weeks.", author: "Deliberate practice research" },
  { text: "Completion, not perfection, is the engine of forward motion. Done is always more valuable than ideal.", author: "Behavioral research" },
  { text: "People who break a large goal into specific weekly tasks are three times more likely to complete it than those who keep the goal abstract.", author: "Implementation research" },
  { text: "The hardest part of any task is starting. Once you begin, momentum does most of the work.", author: "Activation energy research" },
  { text: "Reflection without action is rumination. Action without reflection is busyness. The combination is how careers actually move.", author: "Performance psychology" },
  { text: "People who complete a 30-day streak of any habit are six times more likely to maintain it long-term.", author: "Habit formation research" },
  { text: "Small wins activate the reward circuits in the brain and make the next effort easier, not harder.", author: "Neuroscience of motivation" },
  { text: "The most effective professionals don't have more time, they have clearer priorities and fewer open loops.", author: "Cognitive load research" },
  { text: "Career growth compounds. People who invest in their development consistently for two years outpace peers by a significant margin.", author: "Longitudinal career research" },
  { text: "Clarity reduces procrastination. The vaguer the goal, the more likely it is to be avoided.", author: "Decision psychology" },
  { text: "Skipping once rarely derails a habit. Skipping twice in a row often does.", author: "Habit recovery research" },
  { text: "The act of writing something down transfers it from intention to commitment, and the brain treats commitments differently.", author: "Cognitive psychology" },
  { text: "People who pursue a goal with a clear 'why' persist longer in the face of obstacles than those motivated by external pressure alone.", author: "Self-determination theory" },
  { text: "Showing up on days when you don't feel like it is the behavior that separates people who grow from people who plateau.", author: "Performance research" },
  { text: "The professional who does one specific thing each day compounds faster than the one who does ten things occasionally.", author: "Compound learning research" },
  { text: "Momentum is easier to maintain than to restart. The most important task on any given day is simply not stopping.", author: "Behavioral research" },
  { text: "People tend to overweight recent evidence and underweight long-term patterns. A single hard day is almost never evidence of failure.", author: "Cognitive bias research" },
  { text: "The best time to plan your next move is immediately after completing your last one, when context is fresh and confidence is high.", author: "Planning research" },
  { text: "Waiting until you feel ready is one of the most reliable ways to never begin. Readiness follows action, not the other way around.", author: "Behavioral research" },
  { text: "People who review their week and name what went well are more likely to repeat those behaviors the following week.", author: "Positive psychology research" },
  { text: "The professionals who advance fastest are rarely the most talented, they are the most consistent.", author: "Career development research" },
  { text: "A 1% improvement each week compounds to a 67% improvement over a year. Daily consistency matters more than occasional intensity.", author: "Compound growth research" },
];

function pickQuote(dayNum) {
  return CAREER_QUOTES[dayNum % CAREER_QUOTES.length];
}

const ARCHETYPE_IDENTITY = {
  "The Compounder":   "Already moving. Now it's about making sure it compounds.",
  "The Cartographer":  "Building the full picture before acting. That's the work.",
  "The Primed":  "You learn by doing. The structure is what makes it stick.",
  "The Scout":   "Mapping before committing. The clarity comes before the move.",
  "The Incumbent":  "Years of real expertise. This is about making sure it holds.",
  "The Navigator": "Thinking before moving. The plan has to be worth trusting.",
  "The Launchpad":    "Earlier than most, and that's exactly where the advantage is.",
  "The Skeptic": "Evidence first, action second. The program works the same way.",
  "The Pivot":  "Starting from where you actually are. The program meets you there.",
};

// Archetype completion lines, shown after completing a task
const ARCHETYPE_COMPLETION = {
  "The Compounder":   "Compounding. That's what this is. Keep stacking.",
  "The Cartographer":  "Another piece of the map. The picture's getting clearer.",
  "The Primed":  "Action over theory. You just proved it works.",
  "The Scout":   "More signal, less noise. The map is filling in.",
  "The Incumbent":  "Deliberate progress. That's the move.",
  "The Navigator": "Strategy is a muscle. You just flexed it.",
  "The Launchpad":    "Foundations don't feel dramatic. They just hold everything up.",
  "The Skeptic": "Evidence in the bank. That's how trust gets built.",
  "The Pivot":  "Forward motion. That's the whole game right now.",
};


const PROFILE_BASE = {
  "The Compounder":   { color: "#2D9B6B", bg: "#EEFBF3", border: "#B8F0D8", taskEmphasis: "apply",   voice: "peer",     pacing: "dense" },
  "The Cartographer":  { color: "#4080C0", bg: "#F0F8FF", border: "#C0E0FF", taskEmphasis: "read",    voice: "advisor",  pacing: "deep" },
  "The Primed":  { color: "#7B5EC2", bg: "#F5F0FF", border: "#D8C8F8", taskEmphasis: "apply",   voice: "coach",    pacing: "momentum" },
  "The Scout":   { color: "#5C8CE7", bg: "#F0F4FF", border: "#C0D0F8", taskEmphasis: "read",    voice: "guide",    pacing: "progressive" },
  "The Incumbent":  { color: "#D06840", bg: "#FFF4EE", border: "#FFD8C4", taskEmphasis: "reflect", voice: "honest",   pacing: "deliberate" },
  "The Navigator": { color: "#4080C0", bg: "#F0F8FF", border: "#C0E0FF", taskEmphasis: "reflect", voice: "advisor",  pacing: "deep" },
  "The Launchpad":    { color: "#2D9B6B", bg: "#EEFBF3", border: "#B8F0D8", taskEmphasis: "apply",   voice: "guide",    pacing: "gentle" },
  "The Skeptic": { color: "#7B5EC2", bg: "#F5F0FF", border: "#D8C8F8", taskEmphasis: "read",    voice: "evidence", pacing: "earned" },
  "The Pivot":  { color: "#D06840", bg: "#FFF4EE", border: "#FFD8C4", taskEmphasis: "reflect", voice: "evidence", pacing: "earned" },
};

// ─── Achievement definitions ───────────────────────────────
// id: unique key | icon: emoji | name: displayed title | desc: one-line what it means
// earned: fn(ctx) → bool, where ctx = { dayStatus, dayTasks, streakCount, brilChangeMade, brilPickDay }
const ACHIEVEMENTS = [
  {
    id: "first_move",
    icon: "⚡",
    name: "First Move",
    desc: "Day 1 done. The hardest one.",
    earned: ({ dayStatus }) => dayStatus[1] === 'done',
  },
  {
    id: "no_excuses",
    icon: "↩",
    name: "Bounce Back",
    desc: "Came back strong after a skip.",
    earned: ({ dayStatus }) => {
      for (let d = 2; d <= TOTAL_DAYS; d++) {
        if (dayStatus[d - 1] === 'skipped' && dayStatus[d] === 'done') return true;
      }
      return false;
    },
  },
  {
    id: "perfect_week",
    icon: "🏅",
    name: "Flawless Week",
    desc: "7/7. Absolute machine.",
    earned: ({ dayStatus }) => {
      for (let w = 0; w < TOTAL_WEEKS; w++) {
        const allDone = Array.from({ length: 7 }, (_, i) => w * 7 + i + 1).every(d => dayStatus[d] === 'done');
        if (allDone) return true;
      }
      return false;
    },
  },
  {
    id: "compounding",
    icon: "🔥",
    name: "On Fire",
    desc: "14 straight. The streak is real.",
    earned: ({ streakCount }) => streakCount >= 14,
  },
  {
    id: "deep_cut",
    icon: "🔍",
    name: "Deep Thinker",
    desc: "3+ Reflect tasks. Introspection unlocked.",
    earned: ({ dayStatus, dayTasks }) => {
      const count = Object.entries(dayTasks).filter(([d, t]) => dayStatus[d] === 'done' && t?.tag === 'Reflect').length;
      return count >= 3;
    },
  },
  {
    id: "builder",
    icon: "🔨",
    name: "Builder",
    desc: "5+ Apply tasks. Shipping, not just thinking.",
    earned: ({ dayStatus, dayTasks }) => {
      const count = Object.entries(dayTasks).filter(([d, t]) => dayStatus[d] === 'done' && t?.tag === 'Apply').length;
      return count >= 5;
    },
  },
  {
    id: "shifted",
    icon: "🧭",
    name: "Plot Twist",
    desc: "Changed direction with Be Brilliant. Flexibility is a superpower.",
    earned: ({ brilChangeMade }) => brilChangeMade,
  },
  {
    id: "brils_pick",
    icon: "✨",
    name: "Mr. Bril's Pick",
    desc: "Did a task Mr. Bril designed just for you.",
    earned: ({ brilPickDay, dayStatus }) => brilPickDay && dayStatus[brilPickDay] === 'done',
  },
  {
    id: "halfway",
    icon: "🏔",
    name: "Halfway There",
    desc: "26 weeks in. Deep end territory.",
    earned: ({ dayStatus }) => Object.values(dayStatus).filter(s => s === 'done').length >= 130,
  },
  {
    id: "quarter",
    icon: "🎯",
    name: "First Quarter",
    desc: "13 weeks. A whole season of progress.",
    earned: ({ dayStatus }) => Object.values(dayStatus).filter(s => s === 'done').length >= 65,
  },
  {
    id: "full_program",
    icon: "🎓",
    name: "The Full Brilliant",
    desc: "300 days completed. Absolute legend.",
    earned: ({ dayStatus }) => Object.values(dayStatus).filter(s => s === 'done').length >= 300,
  },
];

// ─── Creds tier milestones ─────────────────────────────────
const CRED_MILESTONES = [
  { at: 50,  tier: "Operative",  copy: "50 Creds. You're officially not messing around." },
  { at: 100, tier: "Strategist", copy: "Triple digits. The program is working and you know it." },
  { at: 200, tier: "Senior",     copy: "200 Creds. Most people never get here. You're built different." },
  { at: 350, tier: "Principal",  copy: "350. At this point we should be asking YOU for advice." },
];

function buildProfile(profileName, role, seniority, answers, classification) {
  const r = role.toLowerCase();
  const senior  = seniority >= 2;
  const veteran = seniority >= 3;

  // Destructure all classifier signals
  const {
    isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    approachStyle, orientation, behavioralStyle,
    isExternallyMotivated, isInternallyMotivated,
    urgencyTrigger,
  } = classification || {};

  const goal      = answers?.goal;
  const blockerArr = normalizeBlocker(answers?.blocker);
  const sliderOutcome  = answers?.style_outcome_process   ?? 50;
  const wantsVisible   = isExternallyMotivated;
  const wantsPrivate   = isInternallyMotivated;
  const strongAction   = sliderOutcome < 30;
  const strongUnderstand = sliderOutcome > 70;

  const profiles = {
    // ─── HIGH READINESS ──────────────────────────────────────
    "The Compounder": {
      headline: (() => {
        if (goal === 2) return `You're ahead of most people. That's a promotion-level advantage. Make it visible.`;
        return veteran
          ? `You're a veteran and you're already using AI. Your plan is about compounding that edge, not just maintaining it.`
          : senior
          ? `You're ahead of most people. Now it's about depth, building something that holds up, not just moving faster.`
          : `You're early in your career and already ahead on AI. Most of your peers haven't started. The question now is how to build on that, not just hold it.`;
      })(),
      description: (() => {
        if (hasTheoryGap) return `You're engaged with what's changing, but you can feel the gap between familiarity and depth. The next move is going from ad hoc to systematic.`;
        if (wantsVisible) return `You've moved past awareness into action. Your plan produces output other people notice.`;
        if (wantsPrivate) return `You've moved past awareness into action. Your plan builds depth quietly. The kind that shows up in results.`;
        return `You've moved past awareness into action. The risk now is spreading thin across too many fronts. One deep capability beats five shallow ones.`;
      })(),
      entryPoint: (() => {
        if (wantsVisible) return "Pick the output that would be most useful to show someone. Build it today.";
        return "Pick the one thing that's already working. Make it twice as good.";
      })(),
      taskEmphasis: "apply",
    },

    "The Cartographer": {
      headline: (() => {
        return veteran
          ? `You've got the experience. What's missing is the framework. A way of thinking about what's changing that holds up as things keep evolving.`
          : `You want to understand what's happening well enough to make real decisions, not just react to whatever's new.`;
      })(),
      description: (() => {
        if (isPureNavigator) return `You want to understand the landscape well enough to make calls that hold up. That kind of strategic clarity is rarer than just keeping busy, and worth more.`;
        if (strongUnderstand) return `You told us understanding comes first. That instinct produces something most people never develop: a mental model that holds up as things keep changing.`;
        return `Surface-level busyness doesn't interest you. The people who thrive long-term develop a durable mental model of what's actually changing. That's what you're building.`;
      })(),
      entryPoint: "Map how the landscape is changing the judgment layer of your work. Start there, not with the execution layer.",
      taskEmphasis: "read",
    },

    // ─── MEDIUM READINESS ────────────────────────────────────
    "The Primed": {
      headline: (() => {
        if (hasTheoryGap) return `You've read the articles. Watched the videos. You know what's happening. What's missing is a system that converts that awareness into daily practice.`;
        if (blockerArr.includes(2)) return `You've started before and lost the thread. Every task below has a clear endpoint. You'll know when it's done.`;
        return senior
          ? `You've built years of expertise. The missing piece isn't more reading. It's a system that turns awareness into practice.`
          : `You know what matters and what's changing. The gap isn't motivation. The right structure for turning that into practice hasn't appeared yet.`;
      })(),
      description: (() => {
        if (hasTheoryGap) return `You've built up more awareness than practice. The move from knowing to doing is almost entirely a structure problem. Your plan is built around application.`;
        return `You've read, tried things, had conversations about it. The problem isn't that you don't care. Nothing has stuck yet. Awareness without structure fades. Your plan fixes that.`;
      })(),
      entryPoint: "One tool. One real task. Fifteen minutes.",
      taskEmphasis: "apply",
    },

    "The Scout": {
      headline: (() => {
        if (goal === 3) return `You want to build something new, not just protect what you have. The first step is understanding what's actually changed.`;
        return senior
          ? `You've built real expertise. Before you move, you need to understand what you're moving toward, not just that it matters.`
          : `You know something important is happening. You want to understand it well enough to choose how to engage, not just react.`;
      })(),
      description: (() => {
        if (blockerArr.includes(4)) return `Effort isn't the issue. Signal is. Knowing what's worth learning is harder than learning it. Your plan filters that. Everything here is chosen for a specific reason.`;
        if (blockerArr.includes(1)) return `You've felt the overwhelm. Too much information, no clear map. That's a curation problem, not a knowledge one. Your plan cuts through it and gives you a sequence.`;
        return `You need a clear picture before you can act with confidence. That instinct is an asset. Your plan builds the map.`;
      })(),
      entryPoint: "Start with the landscape. Understand what's actually happening in your field before you decide where to move.",
      taskEmphasis: "read",
    },

    "The Incumbent": {
      headline: (() => {
        if (isCredibilityDefender) return `You've built something real. Credibility that took years. Your job right now is knowing which parts of that are protected, and which parts need active work.`;
        if (isAnxietyDriven)       return `The anxiety is real and it's tracking something real. The gap between where you are and where you need to be has a specific size. Your plan makes it concrete.`;
        return senior
          ? `You've spent years building expertise that genuinely can't be replaced. Your plan maps exactly which parts are protected and which parts need active reinforcing.`
          : `You've built real skills. Things are changing in your field. The uncertainty isn't whether it matters. It's not knowing which parts of what you've built are safe.`;
      })(),
      description: (() => {
        if (isCredibilityDefender) return `Your professional credibility is a real asset. The move isn't to become something different. It's to understand what's changing well enough to position what you've built as more valuable, not less.`;
        if (isAnxietyDriven)       return `The anxiety is tracking something real. The feeling of being behind and the actual gap are two different things. Your plan makes the gap specific, because specific is always smaller than vague.`;
        return `You're careful, not resistant. You've invested years into expertise that has real value, and you need to know which parts are protected. That's due diligence.`;
      })(),
      entryPoint: (() => {
        if (isCredibilityDefender) return "Identify the three things you do that technology can support but can't replace. Build there first.";
        return "Name three things you do that no one could walk in and replicate without years of context. Then test that claim.";
      })(),
      taskEmphasis: "reflect",
    },

    "The Navigator": {
      headline: (() => {
        if (isPureNavigator) return `The decisions that matter aren't about tools or tactics. They're about judgment. Which bets to make, which risks to flag, what to own. Your plan builds that clarity.`;
        return senior
          ? `You don't need to become an expert in everything. You need to understand what's changing well enough to make the calls your role requires.`
          : `Change is creating decisions that didn't exist before. Your job isn't to master everything. It's to know how to think through them.`;
      })(),
      description: (() => {
        if (isPureNavigator) return `You're navigating something genuinely complex. The people who do this well built a clear model of what's changing and why. They didn't just try everything. That's what your plan builds.`;
        return `You need a working model of what's changing in your field: what it means for how decisions get made, where the risk is, where the opportunity is. Your plan builds that clarity.`;
      })(),
      entryPoint: "Get the strategic picture first. Then decide which part requires your attention.",
      taskEmphasis: "read",
    },

    // ─── LOW READINESS ───────────────────────────────────────
    "The Launchpad": {
      headline: (() => {
        if (isHighCommitmentBeginner) return `You've got the time and the intention. What's been missing is an entry point that connects to your actual work. Your plan is that entry point.`;
        if (blockerArr.includes(2))   return `You've started things before and lost momentum. Every task below has a clear end. Something done, not something to maintain.`;
        return senior
          ? `The gap between where you are and where you need to be is smaller than it looks. It just needs a real first step.`
          : `The gap feels huge. It isn't. You haven't had a starting point that connects to your actual work. That's all this is.`;
      })(),
      description: (() => {
        if (isHighCommitmentBeginner) return `You're starting with more than most: time and genuine intent. That combination moves fast once it has direction. Your plan gives you that.`;
        if (blockerArr.includes(1))   return `You've felt the overwhelm. The sheer volume of things you could be doing about this. Your plan ignores most of it. There are three things that matter right now. Everything else can wait.`;
        if (strongAction)             return `You've been watching this from a distance. You told us you want to act, not read. Your plan skips the theory. It starts with one thing you can do today.`;
        return `You've been watching this from a distance. Reading about it, sensing it matters, feeling the pressure. You haven't found an entry point that clicks. Your plan doesn't start with theory. It starts with one thing you can actually do.`;
      })(),
      entryPoint: (() => {
        if (isHighCommitmentBeginner) return "You have more time than most people starting out. Use it today.";
        return "One small thing. Done. That's the whole game today.";
      })(),
      taskEmphasis: "apply",
    },

    "The Skeptic": {
      headline: (() => {
        if (blockerArr.includes(4)) return `The signal-to-noise problem is real. Your plan cuts through it by giving you the right frame first, not more to consume.`;
        return senior
          ? `You haven't moved yet because you haven't seen how this applies to your field in a way that's honest about the nuance. That's a reasonable position to be in.`
          : `You're waiting to understand what's happening well enough that your first moves feel intentional. That's a good instinct, as long as it leads somewhere.`;
      })(),
      description: (() => {
        if (strongUnderstand) return `You process things by understanding them first. You told us understanding comes first. Your plan honours that. No rushing until you have the right model.`;
        return `You process things by understanding them first. The problem is that most advice is written for people who want quick wins. Your plan gives you the context to move with confidence, not just urgency.`;
      })(),
      entryPoint: "Start by understanding what's actually changing in your field. Specifics, not headlines.",
      taskEmphasis: "read",
    },

    "The Pivot": {
      headline: (() => {
        if (isAnxietyDriven) return `The pressure to adapt is real. So is your skepticism. Your plan doesn't ask you to buy in. It asks you to look at one specific thing and decide for yourself.`;
        return veteran
          ? `You've seen enough hype cycles to know better than to chase every new thing. Your plan doesn't ask you to buy in. It asks you to look at one specific thing and decide for yourself.`
          : `You're resistant to hype, not to AI. Your plan is built around your actual work, not a hypothetical professional who does something vaguely similar.`;
      })(),
      description: (() => {
        if (isAnxietyDriven) return `The anxiety you're feeling is real. But forcing enthusiasm you don't have won't help. Find one thing that's genuinely relevant to your work, and let that be the starting point.`;
        return `Every article, every newsletter, every piece of advice has felt generic. Written for a hypothetical professional, not for someone who does what you do. Your skepticism is earned. Your plan starts with your specific work and builds from there.`;
      })(),
      entryPoint: (() => {

        return "Find one real example of someone in your field making progress on something like this. Just one that would have mattered to you six months ago.";
      })(),
      taskEmphasis: "reflect",
    },
  };

  const base = PROFILE_BASE[profileName] || PROFILE_BASE["The Primed"];
  const copy = profiles[profileName] || profiles["The Primed"];
  return { ...base, ...copy, planRationale: copy.entryPoint };
}

// ─── Classifier ───────────────────────────────────────────
function classifyProfile(answers) {
  // Remaining questions: name, role, seniority, urgency,
  // style_outcome_process, goal, blocker
  // Removed: learn_style, time_available, career_situation,
  //          style_external_internal, already_tried

  // blocker is now multi-select (array of indices).
  const blockerArr = normalizeBlocker(answers.blocker);

  const urgencyTrigger  = answers.urgency ?? -1;
  const isUrgencyLayoff    = urgencyTrigger === 2;
  const isUrgencyPromotion = urgencyTrigger === 3;
  const isUrgencyNewCompany = urgencyTrigger === 4;
  const isUrgencySwitchField = urgencyTrigger === 5;

  // ══════════════════════════════════════════════════════════
  // AXIS 1: READINESS
  // Sources: seniority (experience proxy), blocker (self-awareness signal),
  //          urgency (motivation clarity), style slider (action-vs-understand)
  // Range roughly 0–100. Thresholds: high ≥ 70, medium ≥ 35, low < 35.
  // ══════════════════════════════════════════════════════════
  let readiness = 0;

  // Seniority: more experience = higher baseline readiness
  readiness += [10, 25, 45, 55, 65][answers.seniority] ?? 25;

  // Blocker signal: some blockers indicate higher self-awareness (readiness+)
  // "learns but doesn't apply" (3) = has been engaging, just stuck → +15
  // "direction paralysis" (4) = aware enough to feel overwhelm → +8
  // "can't follow through" (2) = has started things → +10
  // "too much info" (1) = early stage paralysis → +5
  // "not enough time" (0) = neutral → +8
  const blockerReadiness = [8, 5, 10, 15, 8];
  readiness += blockerArr.length > 0
    ? Math.round(blockerArr.reduce((sum, b) => sum + (blockerReadiness[b] ?? 5), 0) / blockerArr.length)
    : 5;

  // Urgency: some urgencies signal clearer self-awareness
  // AI moving faster (0) = awareness → +8
  // stuck, need change (1) = self-aware but diffuse → +6
  // layoff rethink (2) = reactive, not necessarily ready → +3
  // want promotion/better role (3) = concrete goal, high readiness → +12
  // want new company (4) = concrete goal, moderate readiness → +10
  // want to switch fields (5) = big move, awareness → +8
  // exploring (6) = open but undirected → +5
  // none (7) = low signal → 0
  readiness += [8, 6, 3, 12, 10, 8, 5, 0][answers.urgency] ?? 0;

  // Style slider: strong action-oriented people have higher readiness
  const sliderVal = answers.style_outcome_process ?? 50;
  if (sliderVal < 25) readiness += 10;       // very action-oriented
  else if (sliderVal < 40) readiness += 5;   // action-leaning
  // understanding-oriented doesn't reduce readiness, just doesn't add

  const readinessLevel = readiness >= 70 ? "high" : readiness >= 35 ? "medium" : "low";

  // ══════════════════════════════════════════════════════════
  // AXIS 2: ORIENTATION
  // Sources: goal (primary), blocker (secondary), role + seniority (structural)
  // ══════════════════════════════════════════════════════════
  let optScore = 0, protScore = 0, navScore = 0;

  // goal, strongest orientation signal
  const goalMap = {
    0: { opt: 3, prot: 0, nav: 1 }, // promotion / level-up → optimizer
    1: { opt: 0, prot: 5, nav: 0 }, // move to better company → protector
    2: { opt: 5, prot: 0, nav: 0 }, // real pivot → strong optimizer
    3: { opt: 2, prot: 0, nav: 2 }, // build relevant skills → optimizer + navigator
    4: { opt: 0, prot: 3, nav: 1 }, // feel solid and confident → protector-leaning
    5: { opt: 2, prot: 0, nav: 2 }, // explore new opportunities → optimizer + navigator
  };
  const g = goalMap[answers.goal] || { opt: 0, prot: 0, nav: 0 };
  optScore += g.opt; protScore += g.prot; navScore += g.nav;

  // blocker, behavioral orientation signal
  const blockerMap = {
    0: { opt: 1, prot: 1, nav: 0 }, // time → neutral
    1: { opt: 0, prot: 0, nav: 3 }, // overwhelm → navigator
    2: { opt: 3, prot: 0, nav: 0 }, // can't follow through → optimizer
    3: { opt: 3, prot: 0, nav: 0 }, // learns but doesn't apply → optimizer
    4: { opt: 0, prot: 1, nav: 3 }, // direction paralysis → navigator
  };
  blockerArr.forEach(b => {
    const bv = blockerMap[b] || { opt: 0, prot: 0, nav: 0 };
    optScore += bv.opt; protScore += bv.prot; navScore += bv.nav;
  });

  // urgency, secondary orientation signal
  const urgencyOrientMap = {
    0: { opt: 1, prot: 1, nav: 1 }, // AI moving faster → mixed
    1: { opt: 1, prot: 0, nav: 2 }, // stuck, need change → navigator (needs direction)
    2: { opt: 0, prot: 2, nav: 1 }, // layoff rethink → protector
    3: { opt: 3, prot: 0, nav: 0 }, // want promotion/better role → optimizer
    4: { opt: 1, prot: 2, nav: 1 }, // want new company → protector (leaving current)
    5: { opt: 4, prot: 0, nav: 2 }, // switch fields → strong optimizer + navigator
    6: { opt: 1, prot: 1, nav: 1 }, // keen on exploring → balanced
    7: { opt: 0, prot: 0, nav: 0 }, // none of the above → neutral
  };
  const u = urgencyOrientMap[urgencyTrigger] || { opt: 0, prot: 0, nav: 0 };
  optScore += u.opt; protScore += u.prot; navScore += u.nav;

  // role, structural orientation by field (indices match dropdown order)
  const roleOrientMap = {
    0:  { opt: 0.5, prot: 1,   nav: 0.5 }, // Architecture / built environment
    1:  { opt: 1,   prot: 0.5, nav: 0   }, // Arts / performance / sport
    2:  { opt: 1.5, prot: 0,   nav: 0   }, // Content creation
    3:  { opt: 1,   prot: 0.5, nav: 0   }, // Creative / design
    4:  { opt: 1,   prot: 0,   nav: 0.5 }, // Data / analytics / BI
    5:  { opt: 0,   prot: 0.5, nav: 1.5 }, // Education / teaching
    6:  { opt: 0,   prot: 1.5, nav: 0.5 }, // Finance / accounting
    7:  { opt: 2,   prot: 0,   nav: 0   }, // Founder / entrepreneur
    8:  { opt: 0,   prot: 1,   nav: 1   }, // Government / public sector
    9:  { opt: 0,   prot: 1.5, nav: 1   }, // Healthcare / medicine
    10: { opt: 0,   prot: 0.5, nav: 1.5 }, // HR / people / recruiting
    11: { opt: 0,   prot: 2,   nav: 0.5 }, // Legal / compliance
    12: { opt: 1,   prot: 0,   nav: 0   }, // Marketing / growth
    13: { opt: 0.5, prot: 1,   nav: 0   }, // Media / journalism / writing
    14: { opt: 0,   prot: 0.5, nav: 1   }, // Mental health / social work
    15: { opt: 0,   prot: 0.5, nav: 1   }, // Nonprofit / charity / NGO
    16: { opt: 0,   prot: 1.5, nav: 0.5 }, // Nursing / allied health
    17: { opt: 0.5, prot: 0,   nav: 1   }, // Operations / strategy
    18: { opt: 1,   prot: 0,   nav: 0.5 }, // Product / UX / design
    19: { opt: 1,   prot: 1,   nav: 0   }, // Real estate / property
    20: { opt: 0.5, prot: 0.5, nav: 1   }, // Research / academia
    21: { opt: 0.5, prot: 1,   nav: 0   }, // Retail / hospitality management
    22: { opt: 1.5, prot: 0,   nav: 0   }, // Sales / business development
    23: { opt: 0.5, prot: 1.5, nav: 0   }, // Skilled trades
    24: { opt: 1,   prot: 0,   nav: 0   }, // Software / engineering
    25: { opt: 0,   prot: 1,   nav: 0.5 }, // Supply chain / logistics
    26: { opt: 0,   prot: 0,   nav: 1.5 }, // Training / instructional design
    27: { opt: 0,   prot: 0,   nav: 0   }, // Something else
  };
  const r = roleOrientMap[answers.role] || { opt: 0, prot: 0, nav: 0 };
  optScore += r.opt; protScore += r.prot; navScore += r.nav;

  // seniority nudge
  if (answers.seniority >= 3) protScore += 2;
  if (answers.seniority <= 1) optScore += 1;

  const orientation = optScore >= protScore && optScore >= navScore ? "optimizer"
    : protScore >= navScore ? "protector" : "navigator";

  // ══════════════════════════════════════════════════════════
  // AXIS 3: APPROACH STYLE
  // Source: style_outcome_process slider only
  // ══════════════════════════════════════════════════════════
  const sliderOutcome = answers.style_outcome_process ?? 50;

  let actionSignal = 0, understandSignal = 0;
  if      (sliderOutcome < 25) actionSignal     += 5;
  else if (sliderOutcome < 40) actionSignal     += 3;
  else if (sliderOutcome < 50) actionSignal     += 1;
  if      (sliderOutcome > 75) understandSignal += 5;
  else if (sliderOutcome > 60) understandSignal += 3;
  else if (sliderOutcome > 50) understandSignal += 1;

  // blocker cross-signal for approach
  if (blockerArr.includes(2)) actionSignal += 2;     // can't follow through → needs action
  if (blockerArr.includes(1)) understandSignal += 2; // overwhelm → needs map first

  const approachStyle = actionSignal > understandSignal + 1 ? "action"
    : understandSignal > actionSignal + 1 ? "understanding" : "balanced";

  const isActionOriented        = approachStyle === "action";
  const isUnderstandingOriented = approachStyle === "understanding";
  const isOutcomeOriented       = sliderOutcome < 50;
  const isProcessOriented       = sliderOutcome > 50;

  // style_external_internal removed, derive behavioral style from remaining signals
  const isExternallyMotivated = urgencyTrigger === 3 || urgencyTrigger === 4; // promotion or new company
  const isInternallyMotivated = !isExternallyMotivated;

  // ══════════════════════════════════════════════════════════
  // PATTERN DETECTION
  // ══════════════════════════════════════════════════════════


  // Theory-practice gap: blocker is "learns but doesn't apply"
  const hasTheoryGap = blockerArr.includes(3);

  // High-commitment beginner: low readiness but action-oriented
  const isHighCommitmentBeginner = readinessLevel === "low" && isActionOriented;

  // Credibility defender: senior + goal is protection-oriented
  const isCredibilityDefender = answers.seniority >= 2 && orientation === "protector";

  // Anxiety-driven: urgency is peers advancing + goal is feel confident
  const isAnxietyDriven = urgencyTrigger === 1 && answers.goal === 4;

  const isPureNavigator = orientation === "navigator" && blockerArr.includes(1);

  // ══════════════════════════════════════════════════════════
  // PROFILE ASSIGNMENT
  // ══════════════════════════════════════════════════════════
  let profileName;

  if (readinessLevel === "high") {
    if (isUnderstandingOriented || orientation === "navigator") {
      profileName = "The Cartographer"; // Fluent, wants systems and strategic depth
    } else {
      profileName = "The Compounder";   // Fluent, wants to compound and ship
    }

  } else if (readinessLevel === "medium") {
    if (isCredibilityDefender || (orientation === "protector" && answers.seniority >= 2)) {
      profileName = "The Incumbent";
    } else if (orientation === "protector") {
      profileName = "The Incumbent";
    } else if (isPureNavigator || orientation === "navigator") {
      profileName = "The Navigator";
    } else if (hasTheoryGap || (isActionOriented && !isUnderstandingOriented)) {
      profileName = "The Primed";
    } else if (isUnderstandingOriented) {
      profileName = "The Scout";
    } else {
      profileName = "The Primed";
    }

  } else {
    // low readiness
    if (isAnxietyDriven || (orientation === "protector" && answers.seniority >= 2)) {
      profileName = "The Pivot";
    } else if (isHighCommitmentBeginner && isActionOriented) {
      profileName = "The Launchpad";
    } else if (isUnderstandingOriented && orientation !== "protector") {
      profileName = "The Skeptic";
    } else if (orientation === "protector") {
      profileName = "The Pivot";
    } else {
      profileName = "The Launchpad";
    }
  }

  // ── DERIVED LABELS ──────────────────────────────────────
  const ultimateWhyFromGoal = [
    "be the person your team turns to on this",
    "know your career is protected",
    "open doors that aren't open to you yet",
    "have real options you don't have right now",
    "feel confident again, not faking it, actually solid",
    "find a direction worth committing to",
    "get real clarity on what comes next",
  ];
  const ultimateWhy = ultimateWhyFromGoal[answers.goal] || "";

  let behavioralStyle;
  if      (isOutcomeOriented && isExternallyMotivated)  behavioralStyle = "visible-doer";
  else if (isOutcomeOriented && isInternallyMotivated)  behavioralStyle = "quiet-doer";
  else if (isProcessOriented && isExternallyMotivated)  behavioralStyle = "visible-thinker";
  else if (isProcessOriented && isInternallyMotivated)  behavioralStyle = "quiet-thinker";
  else behavioralStyle = "balanced";

  const readinessChip = readinessLevel === "high"   ? "High readiness"
    : readinessLevel === "medium" ? "Medium readiness" : "Early stage";

  const styleChips = {
    "visible-doer":    "Act first, share the output",
    "quiet-doer":      "Act first, measure privately",
    "visible-thinker": "Understand first, lead visibly",
    "quiet-thinker":   "Understand first, move quietly",
    "balanced":        "Balanced approach",
  };
  const styleChip = styleChips[behavioralStyle] || "Balanced approach";

  return {
    name: (answers.name || "").trim(),
    profileName, readinessLevel, readinessScore: readiness,
    orientation, optScore, protScore, navScore,
    approachStyle, isActionOriented, isUnderstandingOriented,
    behavioralStyle, isOutcomeOriented, isProcessOriented,
    isExternallyMotivated, isInternallyMotivated,
    isAnxietyDriven, isPureNavigator, hasTheoryGap,
    isHighCommitmentBeginner, isCredibilityDefender,
    urgencyTrigger,
    isUrgencyLayoff, isUrgencyPromotion, isUrgencyNewCompany, isUrgencySwitchField,
    ultimateWhy, readinessChip, styleChip,
  };
}

// ════════════════════════════════════════════════════════════
// QUESTIONS , 7 total
// (Change #1: removed daily_want, format; already_tried restored)
// (Change #2: reordered , sliders at 5 and 8 for peak engagement)
// (Change #3: fear reframed as agency)
// (Change #4: ai_level removed, readiness derived from other signals)
// Arc: Facts → Identity → Emotions → Commitment
// ════════════════════════════════════════════════════════════
const questions = [
  {
    id: "name", label: "1 of 7",
    text: "What's your first name?",
    sub: "We'll use this to personalize everything.",
    type: "text",
    placeholder: "First name",
  },
  // ── BLOCK 1: Facts ──
  {
    id: "role", label: "2 of 7",
    text: "What best describes your current role?",
    sub: "This shapes which changes are coming for your work, and which you can safely ignore.",
    type: "dropdown",
    options: [
      { text: "Architecture / built environment", sub: "Architect, urban planner, civil engineer" },
      { text: "Arts / performance / sport", sub: "Musician, actor, athlete, coach" },
      { text: "Content creation", sub: "YouTuber, podcaster, social media creator" },
      { text: "Creative / design", sub: "Graphic designer, art director, animator, illustrator" },
      { text: "Data / analytics / BI", sub: "Analyst, data scientist, BI developer" },
      { text: "Education / teaching", sub: "Teacher, lecturer, tutor, school leader" },
      { text: "Finance / accounting", sub: "Financial analyst, accountant, CFO, controller" },
      { text: "Founder / entrepreneur", sub: "Building or running your own venture" },
      { text: "Government / public sector", sub: "Civil servant, policy, public administration" },
      { text: "Healthcare / medicine", sub: "Doctor, surgeon, GP, specialist" },
      { text: "HR / people / recruiting", sub: "HR manager, talent acquisition, L&D" },
      { text: "Legal / compliance", sub: "Lawyer, paralegal, compliance officer" },
      { text: "Marketing / growth", sub: "Marketing manager, content, SEO, brand" },
      { text: "Media / journalism / writing", sub: "Journalist, editor, copywriter, author" },
      { text: "Mental health / social work", sub: "Psychologist, counsellor, social worker" },
      { text: "Nonprofit / charity / NGO", sub: "Programme lead, fundraiser, advocacy" },
      { text: "Nursing / allied health", sub: "Nurse, physiotherapist, OT, radiographer" },
      { text: "Operations / strategy", sub: "Operations manager, chief of staff, consultant" },
      { text: "Product / UX / design", sub: "Product manager, UX designer, researcher" },
      { text: "Real estate / property", sub: "Agent, property manager, developer" },
      { text: "Research / academia", sub: "Researcher, scientist, professor, PhD" },
      { text: "Retail / hospitality management", sub: "Store manager, hotel manager, F&B" },
      { text: "Sales / business development", sub: "Account exec, sales manager, BD" },
      { text: "Skilled trades", sub: "Electrician, plumber, carpenter, mechanic, HVAC" },
      { text: "Software / engineering", sub: "Developer, architect, data engineer, QA" },
      { text: "Supply chain / logistics", sub: "Procurement, logistics, supply chain manager" },
      { text: "Training / instructional design", sub: "L&D specialist, corporate trainer, coach" },
      { text: "Something else", sub: "My field isn't listed above" },
    ],
  },
  {
    id: "seniority", label: "3 of 7",
    text: "Which of these best describes where you are right now?",
    sub: "Not how long you've been working, where you actually sit.",
    type: "single",
    options: [
      { text: "Early career, building the foundations", sub: "Still developing core skills and figuring out the landscape" },
      { text: "Established, capable and growing", sub: "Solid contributor, starting to develop a point of view" },
      { text: "Senior, domain expert, leading or influencing others", sub: "Known for what you do, responsible for more than just your own output" },
      { text: "Leadership, running a team or function", sub: "Accountable for people, outcomes, and direction" },
      { text: "Executive, setting direction, not just executing", sub: "Strategic decisions, org-level accountability" },
    ],
  },
  {
    id: "urgency", label: "4 of 7",
    text: "What are you looking to change right now?",
    sub: "Pick the one that's truest, not the one that sounds most reasonable.",
    type: "single",
    options: [
      { text: "AI is moving faster than I am." },
      { text: "I feel stuck and need a change." },
      { text: "A layoff made me rethink my path." },
      { text: "I want a promotion or a better role." },
      { text: "I want to move to a new company." },
      { text: "I want to switch fields." },
      { text: "I'm keen on exploring new opportunities." },
      { text: "None of the above, if I'm being honest." },
    ],
  },
  // ── BLOCK 3: Identity (slider #1 , forced honest take) ──
  {
    id: "style_outcome_process", label: "5 of 7",
    text: "When it comes to making progress on a goal, which is more true?",
    sub: "Pick the side you lean toward. There's no middle ground.",
    type: "slider",
    left: { text: "Just tell me what to do", desc: "Give me the first move. I can read about it later." },
    right: { text: "Help me understand what's happening", desc: "I can't act with confidence until I can see the full picture." },
  },
  // ── BLOCK 4: Emotions ──
  {
    id: "goal", label: "6 of 7",
    text: "What would feel like real progress in your career?",
    sub: "Be specific. This shapes every week of your program.",
    type: "single",
    options: [
      { text: "Get a promotion or step into a role that's actually a level up" },
      { text: "Move to a better company, one that fits where I want to go" },
      { text: "Make a real pivot into a new field, industry, or type of work" },
      { text: "Build the skills that keep me relevant, especially as AI changes what the job requires" },
      { text: "Feel genuinely solid and confident in my job or career" },
    ],
  },
  // ── BLOCK 6: Constraints ──
  {
    id: "blocker", label: "7 of 7",
    text: "What usually gets in the way when you try to make progress?",
    sub: "Choose everything that applies.",
    type: "multi",
    options: [
      { text: "Not enough time", sub: "Days are full, hard to carve out space" },
      { text: "Too much information, don't know where to start", sub: "Overwhelm and paralysis" },
      { text: "I start but don't follow through", sub: "Motivation drops off after a few days" },
      { text: "I learn things but don't apply them to actual work", sub: "Theory without practice" },
      { text: "I don't know which direction to move. Too many options, or none that feel right.", sub: "Direction paralysis" },
    ],
  },
];

// ─── Task Audit ───────────────────────────────────────────
const AUDIT_PROMPTS = [
  { label: "Task 1 of 3", text: "What's the single task that eats most of your time each week?", sub: "Be specific. Not 'analysis' , more like 'building weekly performance reports in Excel.'", placeholder: "e.g. Building weekly performance reports in Excel" },
  { label: "Task 2 of 3", text: "What's a task you do repeatedly that feels like it could be more efficient?", sub: "The one where you think 'there has to be a better way to do this.'", placeholder: "e.g. Summarizing meeting notes and distributing action items" },
  { label: "Task 3 of 3", text: "What's the part of your work that requires the most judgment or experience?", sub: "The thing a smart new hire couldn't do well even with good instructions.", placeholder: "e.g. Deciding which client issues to escalate vs. handle directly" },
];

// ─── Task Exposure Scoring (Change #7: honesty flag) ──────
function scoreTaskExposure(taskText) {
  if (!taskText || taskText.trim().length < 5) return { score: 50, label: "Unknown", color: "#888", isDirectional: true };
  const t = taskText.toLowerCase();
  const highExposure = ["report", "spreadsheet", "excel", "summariz", "compil", "data entry", "formatting", "scheduling", "templat", "invoice", "reconcil", "transcri", "categoriz", "filing", "sorting", "copy edit", "proofread", "translat", "minutes", "logging", "tracking", "boilerplate", "standard", "routine", "repetitive", "manual"];
  const medExposure = ["research", "analyz", "review", "draft", "writing", "content", "outreach", "prospecting", "screening", "presentation", "brief", "documentation", "compare", "benchmark", "audit", "testing", "qa", "code review", "meeting notes", "email", "correspondence", "proposals"];
  const lowExposure = ["negotiat", "relationship", "client", "mentor", "coach", "strategy", "judgment", "decision", "stakeholder", "leadership", "crisis", "conflict", "creative direction", "vision", "culture", "empathy", "trust", "ambiguity", "novel", "complex problem", "cross-functional", "political", "escalat", "nuance"];
  let score = 50;
  highExposure.forEach(kw => { if (t.includes(kw)) score += 12; });
  medExposure.forEach(kw => { if (t.includes(kw)) score += 5; });
  lowExposure.forEach(kw => { if (t.includes(kw)) score -= 10; });
  score = Math.max(10, Math.min(95, score));
  if (score >= 72) return { score, label: "High exposure to change", color: "#D85A30", isDirectional: true };
  if (score >= 45) return { score, label: "Moderate exposure", color: "#BA7517", isDirectional: true };
  return { score, label: "More defensible", color: "#0F6E56", isDirectional: true };
}

// ─── Narrative Generator , returns individual emotional beats ──
// Each beat is a crafted template sentence referencing specific answers.
// The results page renders these as a 6-beat arc:
// 1. Recognition (who you are)
// 2. Concern reframe (what you're dealing with)
// 3. Goal (what staying relevant means for you)
// 4. Blocker (how we've accounted for it)
// 5. Style + context (how the plan is shaped)
// 6. Anchor (ultimate why)
function generateNarrative(answers, classification) {
  const {
    readinessLevel, behavioralStyle, ultimateWhy,
    isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    orientation, approachStyle,
    urgencyTrigger,
  } = classification;

  const roleName     = QOpt("role", answers.role)             || "your field";
  const seniorityText = QOpt("seniority", answers.seniority)  || "";
  // Normalise blocker to array (question is now multi-select)
  const blockerArr = normalizeBlocker(answers.blocker);
  const primaryBlocker = blockerArr[0] ?? -1;

  // ── BEAT 1: Recognition ──
  const urgencyText = [
    "AI is moving faster than you",
    "you feel stuck and need a change",
    "a layoff made you rethink your path",
    "a promotion or better role is the target",
    "you want to move to a new company",
    "you want to switch fields entirely",
    "you're keen on exploring new opportunities",
  ];
  const urgencyOpener = urgencyTrigger  >= 0 ? urgencyText[urgencyTrigger]  : null;

  let recognition = "";
  if (isAnxietyDriven) {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()}. The pressure to stay current on AI is real , you're feeling it. Your plan doesn't pretend that pressure isn't there. It works with it.`;
  } else if (isCredibilityDefender && readinessLevel !== "high") {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} , which means you've built something real. AI is changing parts of your field, and the question isn't whether to engage. It's how to do it without undermining what you've already built.`;
  } else if (readinessLevel === "high") {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and further along than most people in your field. Your plan builds on that advantage.`;
  } else if (readinessLevel === "medium") {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()}. You've got the experience and the awareness. The gap is between knowing it matters and having a system that makes it stick.`;
  } else {
    if (isHighCommitmentBeginner)
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and ready to move , you just haven't had the right starting point. That combination moves fast once it has direction.`;
    else
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()}. The gap between where you are and where you need to be is smaller than it feels. Your plan starts where you actually are.`;
  }

  // ── BEAT 2: Concern reframe, now multi-select aware ──
  const blockerConcerns = {
    0: "Time is the constraint. Every task in your plan is scoped to 30 minutes or less.",
    1: "Overwhelm is the problem. Your plan is sequential for exactly this reason, one thing at a time, in order.",
    2: "You start things but lose the thread. That's a structure problem, not a motivation problem. Every task has a clear endpoint.",
    3: "You learn things but don't apply them to your actual work. So your plan is built around application, not consumption.",
    4: "Too many options, none that feel right. Your plan cuts through that, one direction, one move at a time.",
  };
  let concern = blockerArr.length > 0 ? blockerConcerns[primaryBlocker] || "" : "";

  // ── BEAT 3: Goal , modulated by orientation + pattern ──
  let goal = "";
  if (answers.goal_custom?.trim()) {
    goal = `Your goal, "${answers.goal_custom.trim()}", is what every task in this plan is working toward.`;
  } else if (isPureNavigator) {
    goal = "Your goal is clarity for others: understanding what's changing well enough to make better calls for your team. Your plan is weighted toward frameworks and evidence.";
  } else if (hasTheoryGap && answers.goal !== 5) {
    goal = "You've been learning. What's been missing is doing. Your plan is built around application, one concrete action at a time.";
  } else if (answers.goal === 0) goal = "You want to be the person on your team who actually understands what's changing. Your plan produces visible, shareable output.";
  else if (answers.goal === 1) goal = "You're building the kind of depth that makes you harder to displace, not chasing the new shiny thing.";
  else if (answers.goal === 2) goal = "You're thinking about this as a lever for career growth. Your plan builds momentum toward the move you're after.";
  else if (answers.goal === 3) goal = "You're building a skill set that opens doors. Your plan puts you in motion toward that.";
  else if (answers.goal === 4) goal = "More than anything, you want to feel genuinely solid, not performing it, actually having it. Every task is a data point that builds the real thing.";

  // ── BEAT 4: Blocker narrative, composite for multi-select ──
  const blockerLines = {
    0: "Time is the real constraint. Every task in your plan fits inside 30 minutes.",
    1: "Overwhelm is one of your blockers, too much, no clear starting point. Your plan is sequential for exactly this reason. We do the filtering so you don't have to.",
    2: "You start things but lose the thread. That's a structure problem, not a motivation problem. Every task has a clear endpoint, you'll know when you're done.",
    3: "You learn things but don't apply them to your actual work. So your plan is built around application, not consumption. Everything asks you to do something real.",
    4: "Direction is one of your blockers. Every task is here for a specific reason, nothing generic, nothing filler.",
  };
  let blocker = blockerArr.length > 0
    ? blockerArr.map(b => blockerLines[b]).filter(Boolean).join(" ")
    : "";





  // ── BEAT 5: Style , approachStyle + behavioral style + what_feels_valuable ──
  let style = "";

  // approachStyle gives us more precision than behavioralStyle alone
  if (approachStyle === "action") {
    if      (behavioralStyle === "visible-doer")  style = "Your plan leads with tasks that produce visible, shareable output.";
    else if (behavioralStyle === "quiet-doer")    style = "Your plan builds real competence. No performance pressure.";
    else style = "You told us you want to act. Every task has a concrete output.";
  } else if (approachStyle === "understanding") {
    if      (behavioralStyle === "visible-thinker") style = "Your plan leads with frameworks you can reference in conversations.";
    else if (behavioralStyle === "quiet-thinker")   style = "Your plan is weighted toward mental models. Full picture before action.";
    else style = "Your plan builds the map before asking you to navigate.";
  } else {
    // balanced , use orientation as the differentiator
    if      (orientation === "navigator") style = "Your plan builds understanding and application together, not a tutorial, not a firehose.";
    else if (orientation === "protector") style = "Your plan balances new capability with protecting what works.";
    else style = "Your plan moves fast enough to stay current, deliberately enough to make it stick.";
  }



  // ── BEAT 6: Anchor ──
  let anchor = "";
  if (ultimateWhy) anchor = `Underneath it all , you want to ${ultimateWhy}. Everything below is in service of that.`;

  return { recognition, concern, goal, blocker, style, anchor, ultimateWhy: ultimateWhy || "" };
}

// ─── Profile Reason , explains WHY this profile was assigned ──────
// Returns { signals: string[], reason: string }
// signals = 2-4 short chips naming the dominant axes
// reason  = 2 sentences: what routed them here + what separates it from the adjacent profile
function buildProfileReason(profileName, classification, answers) {
  const {
    readinessLevel, readinessScore,
    orientation, approachStyle, behavioralStyle,
    isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    isExternallyMotivated, isInternallyMotivated,
    isUnderstandingOriented, isActionOriented,
    readinessChip,
  } = classification;

  const sen   = answers.seniority  ?? 0;
  const blockerArr = normalizeBlocker(answers.blocker);
  const concern = blockerArr[0] ?? -1;
  const goal    = answers.goal;

  // ── Signal chips ────────────────────────────────────────

  const orientChip =
    orientation === "optimizer" ? "Growth-oriented" :
    orientation === "protector" ? "Protection-oriented" :
                                  "Strategy-oriented";

  const approachChip =
    approachStyle === "action"      ? "Action-first" :
    approachStyle === "understanding" ? "Understand-first" :
                                       "Balanced approach";

  const patternChip =
    isAnxietyDriven        ? "Anxiety-driven" :
    isCredibilityDefender  ? "Credibility focus" :
    hasTheoryGap           ? "Theory–practice gap" :
    isHighCommitmentBeginner ? "Motivated to start" :
    isPureNavigator        ? "Strategic clarity" :
    null;

  const signals = [readinessChip, orientChip, approachChip, patternChip].filter(Boolean);

  // ── Secondary profile lookup ────────────────────────────
  const SECONDARY = {
    "The Compounder":   { isExternal: { name: "The Cartographer",  line: "Depth-first. Builds the mental framework before applying." },
                        default:    { name: "The Cartographer",  line: "Depth-first. Builds the mental framework before applying." } },
    "The Cartographer":  { isPureNav:  { name: "The Compounder",   line: "Application-first. Turns understanding into visible, shareable output." },
                        default:    { name: "The Compounder",   line: "Application-first. Turns understanding into visible, shareable output." } },
    "The Primed":  { hasGap:     { name: "The Scout",   line: "Builds more context before committing to a direction." },
                        default:    { name: "The Scout",   line: "Builds more context before the first concrete move." } },
    "The Scout":   { default:    { name: "The Primed",  line: "Less context, faster to a concrete first move." } },
    "The Incumbent":  { cred:       { name: "The Navigator", line: "Navigates change for others, not just protecting their own position." },
                        concern4:   { name: "The Primed",  line: "Less protective framing, more focused on building new capability." },
                        default:    { name: "The Primed",  line: "Less protective framing, more focused on building new capability." } },
    "The Navigator": { pureNav:    { name: "The Incumbent",  line: "Protects personal expertise rather than navigating for others." },
                        default:    { name: "The Scout",   line: "Builds personal understanding rather than strategic clarity for the team." } },
    "The Launchpad":    { highCom:    { name: "The Skeptic", line: "More context before the first move." },
                        default:    { name: "The Skeptic", line: "More context, less pressure to act immediately." } },
    "The Skeptic": { default:    { name: "The Launchpad",    line: "Less context-building, faster to a concrete first move." } },
    "The Pivot":    { anxiety:    { name: "The Incumbent",  line: "More readiness and a clearer professional asset to build on." },
                        cred:       { name: "The Incumbent",  line: "Higher readiness, clearer on which parts of their expertise to protect." },
                        default:    { name: "The Skeptic", line: "More curiosity, less resistance to new approaches." } },
  };

  function getSecondary(name) {
    const map = SECONDARY[name];
    if (!map) return null;
    if (name === "The Compounder")   return isExternallyMotivated ? map.isExternal : map.default;
    if (name === "The Cartographer")  return isPureNavigator ? map.isPureNav : map.default;
    if (name === "The Primed")  return hasTheoryGap ? map.hasGap : map.default;
    if (name === "The Incumbent")  return isCredibilityDefender ? map.cred : concern === 4 ? map.concern4 : map.default;
    if (name === "The Navigator") return isPureNavigator ? map.pureNav : map.default;
    if (name === "The Launchpad")    return isHighCommitmentBeginner ? map.highCom : map.default;
    if (name === "The Pivot")    return isAnxietyDriven ? map.anxiety : isCredibilityDefender ? map.cred : map.default;
    return map.default;
  }

  const secondaryProfile = getSecondary(profileName);

  // ── Reason text ─────────────────────────────────────────
  let reason = "";

  if (profileName === "The Compounder") {
    if (isExternallyMotivated) {
      reason = `High readiness and action-first orientation. You want the output to be visible. Your plan focuses on building repeatable workflows, not just one-off wins.`;
    } else {
      reason = `High readiness and action-first approach. The question is whether you're compounding that edge or spreading it thin. Your plan is built around depth, not breadth.`;
    }

  } else if (profileName === "The Cartographer") {
    if (isPureNavigator) {
      reason = `High readiness and a strong navigator signal. You want to make decisions for others, not just get faster personally. Your plan builds the strategic clarity that makes those decisions durable.`;
    } else if (isUnderstandingOriented && !isExternallyMotivated) {
      reason = `High readiness, with a strong pull toward depth over speed. You're building this for your own clarity, not for an audience. Your plan is weighted toward frameworks that hold up as things change.`;
    } else {
      reason = `High readiness and understanding-oriented. You want the framework that holds up as things keep changing. Your plan builds that model before asking you to do anything with it.`;
    }

  } else if (profileName === "The Primed") {
    if (hasTheoryGap) {
      reason = `Medium readiness with a clear pattern: you've been consuming content, but your blocker is that learning doesn't turn into practice. You know enough. Your plan is a system that converts knowledge into action, one real task at a time.`;
    } else {
      reason = `Medium readiness and action-oriented. You've been engaging with what's changing. Your plan turns that engagement into a repeatable practice.`;
    }

  } else if (profileName === "The Scout") {
    reason = `Medium readiness and understanding-oriented. You've started engaging with what's changing enough to know it matters. You need the map before you commit to a direction. Your plan builds that map before asking you to act.`;

  } else if (profileName === "The Incumbent") {
    if (isCredibilityDefender) {
      reason = `Medium readiness, protector orientation, and a specific signal: credibility erosion at ${sen >= 3 ? "veteran" : "senior"} level. You're protecting a real, specific professional asset. Your plan identifies which parts of your expertise are protected by what's changing, and which need active defending.`;
    } else if (concern === 4) {
      reason = `Medium readiness and a protector orientation. The sense that others are moving faster, combined with ${sen >= 2 ? "senior" : "mid-career"} seniority, creates a protection-first priority. Your plan maps exactly which parts of your expertise are protected, and which need defending.`;
    } else {
      reason = `Medium readiness and protector orientation. Your goal and concern both point toward defending your position. Your plan answers the question of what's safe before pushing you toward anything new.`;
    }

  } else if (profileName === "The Navigator") {
    if (isPureNavigator) {
      reason = `The strongest possible navigator signal: your goal is making decisions for others, and your biggest concern is not knowing what you don't know. This is a strategic clarity problem, not a personal skills one. Your plan builds the model that makes those decisions durable.`;
    } else {
      reason = `Medium readiness and navigator orientation. You need enough strategic understanding to lead well. Your plan builds that understanding before asking you to change how you work.`;
    }

  } else if (profileName === "The Launchpad") {
    if (isHighCommitmentBeginner) {
      reason = `You're starting from the beginning, but you're genuinely motivated to move. Your plan gives you the direction that makes that intent count.`;
    } else if (concern === 0) {
      reason = `Low readiness and action-oriented, with social visibility as the primary driver. You want the gap between behind and ahead to close fast. Your plan creates visible movement from day one.`;
    } else {
      reason = `Low readiness and action-oriented. The gap feels large, but you're willing to move. Your plan is built on the principle that understanding follows practice, not the other way round.`;
    }

  } else if (profileName === "The Skeptic") {
    reason = `Low readiness and understanding-oriented. You haven't started yet, but it's not avoidance. You build a clear picture before you act. Your plan honours that: context and frameworks before action.`;

  } else if (profileName === "The Pivot") {
    if (isAnxietyDriven) {
      reason = `Two answers combined: concern about others moving faster, and a goal of feeling confident rather than hitting an outcome. Your plan works through evidence and specificity. It asks you to look at one real thing and decide for yourself.`;
    } else if (isCredibilityDefender && readinessLevel === "low") {
      reason = `Low readiness and a credibility-protection signal at ${sen >= 3 ? "veteran" : "senior"} level. Nothing has felt specific enough to your situation to be worth acting on. Your plan starts with evidence from your specific work, not general content.`;
    } else {
      reason = `Low readiness and protector orientation. Nothing has felt relevant enough to your specific situation to act on. Your plan starts with your specific tasks and builds from there.`;
    }
  }

  return { signals, reason, secondaryProfile };
}


// ─── Signal Insights ──────────────────────────────────────
// Single personalized observation combining situation + goal + blocker.
// Reads like someone who read every answer and noticed something specific.
function generateSignalInsights(classification, answers) {
  const {
    isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    isExternallyMotivated, isInternallyMotivated,
    readinessLevel, orientation,
  } = classification;

  const goal    = answers.goal             ?? -1;
  const blockerArr = normalizeBlocker(answers.blocker);
  const concern = blockerArr[0] ?? -1; // primary blocker index

  // Build the insight, 2 lines about who this archetype is for this specific person
  const urgency   = answers.urgency          ?? -1;
  const profile   = classification.profileName || "";

  // Urgency flavour, what's actually driving this
  const urgencyLine =
    urgency === 0 ? "AI is moving faster than you can keep up" :
    urgency === 1 ? "you feel stuck and need a change" :
    urgency === 2 ? "a layoff made you rethink your path" :
    urgency === 3 ? "you want a promotion or a better role" :
    urgency === 4 ? "you want to move to a new company" :
    urgency === 5 ? "you want to switch fields" :
    urgency === 6 ? "you're keen on exploring new opportunities" : null;

  // Goal flavour, what they actually want
  const goalLine =
    answers.goal_custom?.trim()    ? `your goal, ${answers.goal_custom.trim()}` :
    goal === 0 ? "landing a role that's actually a level up" :
    goal === 1 ? "moving to a company that fits where you want to go" :
    goal === 2 ? "making a real pivot into new work" :
    goal === 3 ? "building the skills that keep you relevant as AI reshapes the work" :
    goal === 4 ? "feeling genuinely solid and confident, not performing it, actually there" : "moving forward";

  let text = "";

  if (profile === "The Compounder") {
    text = urgencyLine ? `The Compounder is already in motion, ${urgencyLine} is fuel, not friction.` : `The Compounder is already in motion and needs to make sure it's adding up, not spreading thin.`;

  } else if (profile === "The Cartographer") {
    text = goalLine ? `The Cartographer builds the picture before moving, for you, ${goalLine} requires a mental model that holds, not a list of things to try.` : `The Cartographer builds the picture before making a move, and needs the framework before acting with confidence.`;

  } else if (profile === "The Primed") {
    text = urgencyLine ? `The Primed has the awareness and the intent, with ${urgencyLine}, the move now is structure, not more reading.` : `The Primed has the awareness and the intent, what's been missing is a structure that actually converts that into daily practice.`;

  } else if (profile === "The Scout") {
    text = goalLine ? `The Scout needs enough of the map before committing to ${goalLine}, and your program builds exactly that.` : `The Scout needs to understand the landscape before committing to a direction, and that instinct is worth following.`;

  } else if (profile === "The Incumbent") {
    text = urgencyLine ? `The Incumbent has invested years into expertise that matters, ${urgencyLine} makes it specific, not vague.` : `The Incumbent has invested years into real expertise, the question now is which parts are protected and which need reinforcing.`;

  } else if (profile === "The Navigator") {
    text = goalLine ? `The Navigator thinks before moving, ${goalLine} requires clarity that holds under pressure, and that's what this builds.` : `The Navigator thinks before moving, and needs a picture solid enough to make calls that actually hold.`;

  } else if (profile === "The Launchpad") {
    text = urgencyLine ? `The Launchpad is earlier than most, ${urgencyLine} is the right reason to move now, and the program gives you a real first step.` : `The Launchpad is earlier than most, which is the best position to be in, the whole ground is still open.`;

  } else if (profile === "The Skeptic") {
    text = goalLine ? `The Skeptic doesn't move until the evidence is solid, your program earns that trust one specific thing at a time, toward ${goalLine}.` : `The Skeptic doesn't move until the evidence is solid enough to trust, and that standard is exactly what makes the progress durable.`;

  } else if (profile === "The Pivot") {
    text = urgencyLine ? `The Pivot is navigating a transition, with ${urgencyLine} as the backdrop, the program asks for one real thing per day until the ground feels solid.` : `The Pivot is navigating a transition, and the program meets you where you actually are, not where you were.`;

  } else {
    text = `This program is built specifically for your situation, not a generic version of career development.`;
  }

  return [{ icon: "→", text }];
}


// ─── Anchor Thought Generator ─────────────────────────────
// One thought to carry through Day 1. Derived from profile + goal.
// Not a task. A lens.
function generateAnchorThought(profileName, answers, classification) {
  const { isAnxietyDriven, isCredibilityDefender } = classification || {};
  const goal = answers.goal ?? -1;

  if (isAnxietyDriven) return "The gap between where you are and where you need to be has a specific size. Specific is always smaller than vague.";

  if (isCredibilityDefender) return "What you've built over years doesn't disappear. The question is how to make it visible in a field that's changing around it.";
  if (goal === 4) return "Confidence isn't a feeling you wait for. It's a record you build, one task, one day at a time.";
  if (goal === 1) return "The goal isn't to become something different. It's to make what you already are harder to displace.";
  return "The people who move through this aren't more motivated. They just have a plan that shows up tomorrow.";
}

// ─── Static Outcomes Fallback ─────────────────────────────
// Used when AI generation fails. Returns 3 outcomes keyed to profile + goal.
// Dimensions: (1) concrete output built, (2) clarity gained, (3) habit started.
function generateStaticOutcomes(profileName, answers, classification) {
  const goalIdx = answers.goal ?? 1;
  const { orientation, readinessLevel } = classification || {};

  const outputByGoal = [
    "You have something concrete that demonstrates you're ready for the next level, visible, attributable, pointed at.",
    "You have a clear picture of what the right companies look like and what makes you competitive for them.",
    "You've completed one real piece of work in the direction you're pivoting toward.",
    "You've built or practiced one skill that closes the gap between where you are and where AI can't reach.",
    "You have five completed days as evidence, proof to yourself, not just intent.",
  ];

  const clarityByProfile = {
    "The Compounder":   "You know which parts of your work are worth doubling down on and which are worth rethinking.",
    "The Cartographer":  "You have a framework for what's changing in your work, not a list of things to try, a clear mental model.",
    "The Primed":  "You know which one area is worth building on, because you've tested a few and found one that fits.",
    "The Scout":   "You have a clear map of what's changing in your field, and where you fit in it.",
    "The Incumbent":  "You know which parts of your expertise compound in the current environment and which need active defending.",
    "The Navigator": "You can articulate the decisions your function needs someone to own, and whether that person should be you.",
    "The Launchpad":    "You know it's not as hard to start as it felt, because you already have.",
    "The Skeptic": "You have enough context to act, and a clear sense of what's changing fast and what isn't.",
    "The Pivot":    "You've found one angle that's genuinely relevant to your actual situation. Not something generic, something real.",
  };

  let habitSentence;
  if (readinessLevel === "high") {
    habitSentence = "You're spending your daily time on depth, not discovery. The kind that compounds.";
  } else if (orientation === "protector") {
    habitSentence = "You've built a daily practice that turns what's changing into specific, low-risk actions.";
  } else if (orientation === "navigator") {
    habitSentence = "You've started a weekly practice of translating what you learn into decisions your team can actually use.";
  } else {
    habitSentence = "You've built a daily practice, small, specific, real, that exists now where it didn't before.";
  }

  return [
    outputByGoal[goalIdx] || outputByGoal[1],
    clarityByProfile[profileName] || "You have a clear picture of what to do next and why it matters for your specific situation.",
    habitSentence,
  ];
}

// ─── Plan Generator , tasks modulated by readiness + seniority ──
function generatePlan(answers, auditTasks) {
  const role = QOpt("role", answers.role) || "professional";
  const classification = classifyProfile(answers);
  const profileName = classification.profileName;
  const profileData = buildProfile(profileName, role, answers.seniority, answers, classification);
  const timeSlot = "30 min"; // default, time question removed

  const seniorityText = QOpt("seniority", answers.seniority) || "";
  const goalText = QOpt("goal", answers.goal) || "";
  const _blockerArrPlan = normalizeBlocker(answers.blocker);
  const concernText = _blockerArrPlan.map(b => QOpt("blocker", b)).filter(Boolean).join("; ") || "";
  const narrative = generateNarrative(answers, classification);
  const isExperienced = classification.readinessLevel === "high";
  const isSenior = answers.seniority >= 2;

  const taskAnalysis = (auditTasks || []).map((task) => {
    const exposure = scoreTaskExposure(task);
    return { task, ...exposure };
  }).filter(t => t.task && t.task.trim().length > 3);
  const avgExposure = taskAnalysis.length > 0 ? Math.round(taskAnalysis.reduce((s, t) => s + t.score, 0) / taskAnalysis.length) : 50;
  const mostExposed = taskAnalysis.length > 0 ? taskAnalysis.reduce((a, b) => a.score > b.score ? a : b) : null;
  const leastExposed = taskAnalysis.length > 0 ? taskAnalysis.reduce((a, b) => a.score < b.score ? a : b) : null;

  // ─── Role × Level task matrix ─────────────────────────
  // Each role has beginner (low/medium readiness) and experienced (high readiness) task sets.
  // Seniority further modulates descriptions via isSenior flag.
  const taskMatrix = {
    // SOFTWARE
    0: {
      headline: isExperienced ? "You're using AI to code. The question is whether you're using it to architect." : "AI is rewriting how software gets built. Time to write your first line with it.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Have AI explain code you didn't write", desc: "Paste a complex function from your codebase into Claude. Ask it to explain the logic, then ask it to find bugs. Compare to your own read.", whyBase: "This is the lowest-friction way to see what AI can actually do with real code , yours." },
        { tag: "Read", time: "8 min", title: `What AI coding tools exist for ${role.toLowerCase()}`, desc: isSenior ? "Copilot, Cursor, Claude, Cody , map which your org is already paying for and which your team should evaluate." : "Copilot, Cursor, Claude , learn what each does and which fits your workflow. Most have free tiers.", whyBase: "You can't use what you don't know exists." },
        { tag: "Reflect", time: "5 min", title: "List 5 things you did this week , which could AI do?", desc: "For each: could an AI do this with a good prompt? Be honest. The answer is usually 'parts of it.'", whyBase: "This exercise turns abstract anxiety into a concrete map." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: "Build a multi-step prompt chain for a recurring task", desc: isSenior ? "Pick a workflow your team repeats. Build a prompt chain that handles it end-to-end. Document it for your team." : "Pick something you do weekly. Build a reusable prompt chain that handles it. Save it.", whyBase: "Single prompts are demos. Chains are infrastructure. This is where the real leverage is." },
        { tag: "Tool", time: "15 min", title: "Use AI to review your own architecture decisions", desc: "Describe a recent system design choice to Claude. Ask it to argue against your decision. See what it catches.", whyBase: "AI as adversarial reviewer surfaces blind spots faster than waiting for a postmortem." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where should your team be using AI and isn't?" : "What's the gap between your AI usage and your team's?", desc: isSenior ? "Map 3 processes your team runs manually that AI could accelerate. Estimate hours saved." : "Are you using AI more or less than your peers? Where's the gap?", whyBase: isSenior ? "Leaders who can quantify AI impact get resources." : "Knowing the gap is the first step to closing it." },
      ],
    },
    // DATA / ANALYTICS
    1: {
      headline: isExperienced ? "You already use AI with data. Now make it systematic." : "AI can now do in minutes what used to take your team days.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Ask Claude to analyze a dataset in plain English", desc: "Take a CSV or table you're working with. Describe the business question and paste the data. See what it finds.", whyBase: "This is what your stakeholders will start doing , you should do it first." },
        { tag: "Read", time: "10 min", title: "How 'AI analyst' roles are being defined right now", desc: isSenior ? "Large firms are publishing these job descriptions. Compare to what your team does." : "These job descriptions are appearing at major firms. Compare to your current role.", whyBase: "This is the job your job is becoming." },
        { tag: "Apply", time: "15 min", title: "Build a prompt for your most repeated report", desc: "Write a reusable prompt that generates your weekly report from raw data. Test it twice, refine.", whyBase: "One good prompt template saves hours per week." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: "Automate one complete analysis workflow", desc: isSenior ? "Pick your team's most time-consuming recurring analysis. Build the full AI-assisted pipeline and document it." : "Pick your most repetitive analysis task. Build the complete AI pipeline: data in, insight out.", whyBase: "Moving from 'AI helps me sometimes' to 'AI runs this' is the jump that matters." },
        { tag: "Tool", time: "15 min", title: "Use AI to find the story your data is telling", desc: "Paste a complex dataset and ask Claude: 'What patterns do you see that I might be missing?' Compare to your own analysis.", whyBase: "AI as a second pair of analytical eyes catches things confirmation bias hides." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Which analyses should your team stop doing manually?" : "Which of your analyses are actually just data formatting?", desc: isSenior ? "Map every recurring analysis. Flag the ones where AI could do the first 80%." : "Be honest about how much of your 'analysis' is just cleaning and formatting.", whyBase: "The analysts who thrive will focus on judgment, not data wrangling." },
      ],
    },
    // MARKETING
    3: {
      headline: isExperienced ? "You're using AI for content. Time to use it for strategy." : "The gap between marketers who use AI and those who don't is visible now.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Generate 5 subject line variants for your next campaign", desc: "Take a real campaign you're working on. Give Claude your audience and goal. Ask for 5 subject lines and explain which to test.", whyBase: "This is a 10-minute task with measurable results , the fastest way to see AI work." },
        { tag: "Read", time: "10 min", title: `How AI is changing ${isSenior ? "marketing leadership" : "day-to-day marketing"}`, desc: isSenior ? "AI Overviews now affect a large share of search queries. Your team's SEO strategy may already be outdated." : "AI Overviews are reshaping search. Read the click-through data, your tactics may need updating.", whyBase: "The landscape shifted. Marketers who don't adjust are optimizing for a platform that's changing under them." },
        { tag: "Apply", time: "15 min", title: "Write your brand voice brief for AI tools", desc: "300 words: who you talk to, your tone, what you never say, three examples. This becomes the system prompt you'll reuse everywhere.", whyBase: "Without this, every AI draft sounds generic. With it, they sound like you." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Build your team's AI content workflow" : "Build a full AI-assisted campaign draft", desc: isSenior ? "Map the content pipeline end-to-end. At each step: where does AI accelerate, where does judgment remain? Document it." : "Take a real brief. Use AI for research, copy drafts, variant generation, and audience segmentation , the full pipeline.", whyBase: "Going from 'I use ChatGPT sometimes' to 'AI is wired into my process' is the shift that compounds." },
        { tag: "Tool", time: "15 min", title: "Use AI to audit your current strategy for blind spots", desc: "Paste your marketing plan into Claude. Ask: 'What am I not considering? What assumptions might be wrong?' Read critically.", whyBase: "AI as strategic challenger surfaces things your team won't say." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Which parts of marketing will still require your judgment in 2 years?" : "What's the one marketing skill AI can't replace for you?", desc: isSenior ? "Map creative judgment vs. execution across your function. Where are you over-investing in execution?" : "Think about what you bring that a prompt can't replicate. Build there.", whyBase: "Knowing your moat lets you invest in it instead of competing with the machine." },
      ],
    },
    // LEGAL
    4: {
      headline: isExperienced ? "You've tried AI for legal work. Now make it defensible." : "Legal is moving slower than other fields , which means adapting now gives a real head start.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Have AI summarize a contract you already know well", desc: "Pick a contract you've reviewed thoroughly. Paste it into Claude and ask for a summary of key terms and risks. Compare to your own read.", whyBase: "Starting with something you already know lets you calibrate what AI gets right , and what it misses." },
        { tag: "Read", time: "10 min", title: "What the ABA says about AI and lawyer competence now", desc: isSenior ? "The ABA updated its formal opinion on AI. This is now a governance question for your practice." : "The ABA updated its formal opinion on AI. Knowing this puts you ahead of most associates.", whyBase: "This is a compliance issue, not just a productivity one." },
        { tag: "Reflect", time: "8 min", title: "List 10 tasks from last week , mark each: automatable or judgment", desc: isSenior ? "For each: if AI handled the first pass, what would you still need to do? Map your actual value." : "Be specific. 'Research' is too vague. 'Researching precedent on employment discrimination in the 9th Circuit' is right.", whyBase: "This granularity separates strategic adaptation from reactive panic." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Design an AI-assisted workflow for one practice area" : "Build a reusable prompt for your most common legal task", desc: isSenior ? "Pick the practice area with the most volume. Map where AI accelerates (research, first drafts, review) and where it doesn't." : "Contract review, memo drafting, research synthesis , pick one and build a prompt you can reuse.", whyBase: "Systematic AI use in legal work is rare enough that doing it well is a genuine differentiator." },
        { tag: "Tool", time: "15 min", title: "Run a side-by-side: your review vs. AI review", desc: "Take a real document. Review it yourself, then have Claude review it. Compare: what did it catch that you missed? What did it miss?", whyBase: "Calibrating trust in AI output is the core skill. This exercise builds it with real stakes." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "What's your practice's AI governance position?" : "Where in your firm is AI already being used , and do they know it?", desc: isSenior ? "If you don't have one, you need one. Draft three principles." : "Associates are already using ChatGPT. The question is whether the firm has guardrails.", whyBase: "The lawyers who lead on AI policy will shape how their firms compete." },
      ],
    },
    // OPS / STRATEGY
    5: {
      headline: isExperienced ? "You've mapped processes. Now map them with an AI lens." : "Operations decides how well AI gets deployed, and most ops leaders aren't ready.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Pick one process and document it step by step", desc: "Choose a recurring process your team runs. For each step: is this judgment or execution? AI handles execution.", whyBase: "Process mapping with an AI lens is the single most valuable ops skill right now." },
        { tag: "Read", time: "10 min", title: `How companies are structuring AI governance in ${isSenior ? "your sector" : "operations"}`, desc: "Leading enterprises have published governance frameworks. Read one. Notice what you're missing.", whyBase: "Companies that stumble on AI almost always have a governance gap. You can prevent that." },
        { tag: "Apply", time: "15 min", title: "Write 5 questions that assess your org's AI readiness", desc: "Tools, data quality, process documentation, ownership, vendor risk. These questions surface the real blockers.", whyBase: "The person who surfaces the right questions usually leads the initiative." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Build the business case for AI in one department" : "Quantify the ROI of AI on one process you own", desc: isSenior ? "Pick the function with the most manual volume. Estimate: hours saved, error reduction, capacity freed." : "Pick a process. Measure: how long does it take now? How long with AI? What's the delta?", whyBase: "Leadership funds what's quantified. This is how you get resources." },
        { tag: "Tool", time: "15 min", title: "Use AI to draft a process improvement proposal", desc: "Pick a process that needs fixing. Ask Claude to draft a proposal with current state, proposed state, and implementation steps.", whyBase: "AI improves how you communicate about processes, not just the processes themselves." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where is AI creating risk in your org that nobody owns?" : "Which tools is your team already paying for that have AI features?", desc: isSenior ? "Shadow AI, ungoverned usage, data exposure. Map the risks." : "Most teams are paying for AI features they don't use. Find them.", whyBase: "Visibility is the ops leader's edge." },
      ],
    },

    // DESIGN / PRODUCT
    6: {
      headline: isExperienced ? "You understand users. AI gives you ten times more signal, if you know how to read it." : "AI is reshaping design and product from both ends. The practitioners who adapt early define the new baseline.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Use AI to synthesize qualitative research you already have", desc: isSenior ? "Take interview transcripts, survey responses, or NPS comments. Paste into Claude and ask: what patterns am I missing? Then push back on its conclusions." : "Take any user feedback, interview notes, or survey responses. Paste into Claude and ask it to find the top 3 patterns. Compare to your own read.", whyBase: "Synthesis is where researchers and PMs spend the most time. This is the highest-leverage AI application in your function." },
        { tag: "Read", time: "10 min", title: isSenior ? "How AI is changing the PM / design org structure" : "What AI tools are actually being used in UX and product right now", desc: isSenior ? "Product and design orgs are flattening as AI absorbs execution work. Read how leading tech companies are restructuring around this." : "Figma AI, Maze, Dovetail, Notion AI , map what exists for design research and ideation. Most have free tiers.", whyBase: "The tools your discipline uses are changing faster than most practitioners realize." },
        { tag: "Reflect", time: "8 min", title: "Which parts of your design or PM work require human judgment?", desc: "List your 5 most time-consuming tasks. For each: could AI produce a first draft? The honest answer tells you where to focus.", whyBase: "Judgment, taste, and user empathy compound. Execution doesn't. This map tells you where to invest." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Build an AI-assisted research pipeline for your team" : "Run a complete AI-assisted discovery sprint on a real problem", desc: isSenior ? "Map your team's research process end-to-end. At each stage, recruiting, synthesis, insight generation, shareout, identify where AI accelerates without replacing judgment. Document the protocol." : "Pick a real design problem. Use AI for: background research, user assumption mapping, insight synthesis, and copy variants. Do the full loop in one session.", whyBase: "Going from 'I use AI for copy' to 'AI is wired into my research process' is the shift that compounds at team scale." },
        { tag: "Tool", time: "15 min", title: "Use AI as a product critic on something you shipped", desc: "Describe a feature or decision you made recently. Give Claude the context, the constraints, and the outcome. Ask it to argue the product decisions were wrong.", whyBase: "AI as adversarial reviewer surfaces the assumptions you stopped questioning. This is hard to get from colleagues." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where is AI creating blind spots in your team's research?" : "What's the difference between AI taste and human taste in design?", desc: isSenior ? "AI synthesis is fast but pattern-matches to what's common. Map where your team's qual research might be getting flattened by AI." : "Try generating design concepts with AI, then ask: what does it consistently miss? That's your moat.", whyBase: "The designers and PMs who thrive will be the ones who know exactly where AI judgment breaks down." },
      ],
    },

    // HR / PEOPLE / RECRUITING
    7: {
      headline: isExperienced ? "People functions are being automated from the outside in. The practitioners who adapt own the strategy layer." : "HR and recruiting are changing faster than most people in the function realize. Starting now is the advantage.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Use AI to rewrite one job description you wrote", desc: isSenior ? "Take a JD your team owns. Ask Claude to rewrite it for clarity, inclusivity, and candidate appeal. Read the diff: what did it improve?" : "Take a job description you wrote or use regularly. Ask Claude to rewrite it to be more compelling and inclusive. Compare the two versions.", whyBase: "JDs are the single highest-leverage recruiting asset. Most are mediocre. This is a fast, visible win." },
        { tag: "Read", time: "10 min", title: isSenior ? "How AI is reshaping the people function: what the research says" : "What AI tools are doing in recruiting and HR right now", desc: isSenior ? "Research on AI in HR is clear: talent acquisition and L&D are the most exposed functions. Read one report." : "Sourcing, screening, onboarding, performance management , AI tools are in every stage. Map what's real vs. hype.", whyBase: "HR professionals who understand AI's role in the function shape policy instead of reacting to it." },
        { tag: "Reflect", time: "8 min", title: "Which parts of your HR work require human judgment, and which are ripe for AI?", desc: "Think through your last week. List 5 tasks. For each: where is your value irreplaceable? Where is it mostly execution? The answer is your map.", whyBase: "The HR professionals who thrive will own the judgment layer , culture, conflict, development, trust. the admin layer." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Build an AI-assisted hiring process for one open role" : "Use AI to build a structured interview guide for a role you're hiring for", desc: isSenior ? "Map the full hiring funnel for one role: sourcing, screening criteria, interview structure, assessment rubric. At each step, identify where AI accelerates and where human judgment is non-negotiable." : "Pick a role you're currently or recently hiring for. Ask Claude to generate a structured interview guide with behavioral questions mapped to the role's core competencies. Refine it with your own knowledge.", whyBase: "Structured interviewing improves hiring quality. AI makes building the structure fast enough that you'll actually do it every time." },
        { tag: "Tool", time: "15 min", title: isSenior ? "Use AI to audit your performance review process for bias" : "Use AI to improve how you give written feedback", desc: isSenior ? "Paste your performance review template into Claude. Ask it to identify where the format is likely to produce gender or recency bias. Then ask for a revised version." : "Take a piece of written feedback you've given recently. Ask Claude to rewrite it to be more actionable and specific. Read the difference.", whyBase: "The quality of written feedback shapes careers. AI makes good feedback more consistent and less dependent on writing skill." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where is AI creating risk in your HR function that leadership doesn't see?" : "How is AI changing what good HR looks like in your organization?", desc: isSenior ? "Shadow AI usage in hiring, performance management, and engagement. Data privacy, bias amplification, and audit risk are real. Map them before they become yours." : "Think through: what does your org expect HR to do that AI is now doing faster? Where does that leave you?", whyBase: "The HR leaders who stay strategic are the ones who see the transformation coming and name it first." },
      ],
    },

    // SALES / BUSINESS DEVELOPMENT
    8: {
      headline: isExperienced ? "AI is changing the top of funnel fast. The sellers who adapt are closing more with less." : "Sales is being disrupted at the prospecting and prep layers. The reps who use AI well are pulling ahead visibly.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Use AI to prep for a real sales call you have this week", desc: "Pick an upcoming call. Give Claude: the company, the role of the person you're meeting, the product you're selling, and the problem you're solving. Ask for a prep brief, likely objections, and three opening questions.", whyBase: "This is the fastest way to see AI's value in your actual workflow , better prep in less time, on a call that's already happening." },
        { tag: "Read", time: "8 min", title: "How AI is changing B2B buying and what that means for sellers", desc: isSenior ? "Buyers are using AI to research vendors before the first call. Your pitch deck and discovery process may need to change." : "Buyers now arrive more informed than ever. AI is doing the research they used to do in early discovery calls. Read how top sellers are adapting.", whyBase: "The nature of the sales conversation is shifting. Understanding how changes how you show up." },
        { tag: "Apply", time: "15 min", title: "Write a cold outreach sequence with AI, then rewrite it yourself", desc: "Give Claude your ICP, your value prop, and a pain point. Ask for a 3-email cold sequence. Then edit it until it sounds like you. Compare before and after.", whyBase: "AI gives you a fast first draft. Your judgment, voice, and specificity are what make it land." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Build an AI-assisted account planning process for your team" : "Use AI to build a full account plan for your most important deal", desc: isSenior ? "Map the stages of your team's account planning process. At each step, build an AI prompt that accelerates the research and synthesis. Document it so your reps can use it." : "Pick your top open opportunity. Use Claude to research the account, map the stakeholders, identify likely objections, and draft a winning strategy. This is what thorough looks like at speed.", whyBase: "Deals are won in the planning, not the pitch. AI gives you thoroughness at a speed that used to require hours." },
        { tag: "Tool", time: "15 min", title: "Use AI to roleplay a difficult sales conversation", desc: isSenior ? "Pick a deal that stalled or a common objection your team struggles with. Roleplay it with Claude as the prospect. Run it 3 times with different buyer personas." : "Tell Claude to act as your most skeptical prospect. Do your pitch. Ask Claude to push back hard. Then ask what you could have done better.", whyBase: "Practice is the fastest path to better conversations. AI gives you a sparring partner who's available at 11pm before a big call." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where in your sales process AI is already changing buyer behavior?" : "Which parts of your sales process are at risk of being automated, and which aren't?", desc: isSenior ? "Buyers research, compare, and shortlist using AI. The discovery call is starting later in the journey. Map what this means for your team's process." : "Prospecting research, email sequences, call prep , map where AI is changing the work. Then map where your judgment and relationships are the actual moat.", whyBase: "The sales professionals who thrive will double down on judgment and relationships. the parts a sequence tool can do." },
      ],
    },

    // HEALTHCARE / SCIENCE
    9: {
      headline: isExperienced ? "AI in healthcare is moving from hype to deployment. The clinicians and researchers who engage now shape how it's used." : "Healthcare AI is real and accelerating. Understanding it isn't optional for anyone in the field.",
      beginner: [
        { tag: "Read", time: timeSlot, title: isSenior ? "What AI is actually deployed in clinical settings right now" : "What AI tools exist in your area of healthcare or research", desc: isSenior ? "Radiology, pathology, and administrative AI have cleared regulatory hurdles. Read what's FDA-approved and deployed. what's in trials." : "Diagnostic AI, clinical documentation tools, literature synthesis , map what's real in your specific area. Focus on what's cleared or in late-stage trials.", whyBase: "The gap between AI in headlines and AI in practice is large. Knowing the difference lets you engage credibly." },
        { tag: "Tool", time: "15 min", title: "Use AI to summarize a complex paper you've been avoiding", desc: "Pick a recent paper in your field that's outside your immediate expertise. Paste the abstract and methods into Claude. Ask for a plain-language summary and the 3 questions it raises.", whyBase: "Cross-disciplinary synthesis is where AI provides the most immediate value in research-heavy fields." },
        { tag: "Reflect", time: "8 min", title: "Which parts of your clinical or research work could AI assist, and which require your judgment?", desc: "Think through your last week. Documentation, literature review, pattern recognition, differential diagnosis , be specific about where AI helps and where your training and context are irreplaceable.", whyBase: "Clinicians who can articulate this distinction will be the ones designing AI-assisted workflows, not just using them." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Map the AI opportunities and risks in your department or research area" : "Use AI to accelerate one literature review you're working on", desc: isSenior ? "Identify 3 processes in your department where AI could reduce burden, and 2 where you'd need governance before touching it. Draft the map." : "Pick a literature review you need to do. Use Claude to generate a structured summary of the landscape, identify key papers, and surface the debates. Then verify what it gets wrong.", whyBase: "AI-assisted literature synthesis is already standard in some research groups. Understanding its limits is as important as its capabilities." },
        { tag: "Tool", time: "15 min", title: isSenior ? "Use AI to draft a governance framework for one clinical AI tool in your org" : "Use AI to help write a section of a paper, grant, or clinical note, then evaluate what it gets wrong", desc: isSenior ? "Even simple AI documentation tools raise questions about accuracy, audit trails, and liability. Draft three principles for governing one specific tool." : "Give Claude the context, pick a section, and ask for a draft. Read it as a critic: what does it miss that only someone in your field would know?", whyBase: "This calibration , knowing exactly where AI breaks down in your specific domain , is the core competency that will matter most." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where is your institution behind on AI, and what would it take to move?" : "What would it mean for your career if AI handled 30% of your documentation load?", desc: isSenior ? "Most healthcare institutions are 2-3 years behind leading health systems on AI adoption. Identify the specific gap and what the change would require." : "Administrative burden is the most immediate target. If AI freed that time, where would your judgment and expertise go? That's the question to answer now.", whyBase: "The professionals who think through this question early are the ones who shape the answer. react to it." },
      ],
    },

    // EDUCATION / TRAINING
    10: {
      headline: isExperienced ? "You shape how people learn. AI is changing that faster than most educators want to admit." : "Education is one of the fields AI is disrupting most visibly. Engaging now puts you ahead of the policy curve.",
      beginner: [
        { tag: "Tool", time: timeSlot, title: "Use AI to create a differentiated version of something you already teach", desc: isSenior ? "Take a lesson, module, or training unit you've delivered many times. Ask Claude to generate three versions: novice, intermediate, and advanced. See how it handles the differentiation." : "Take any lesson plan, training doc, or explanation you've written. Ask Claude to create a version for someone with no background in the topic. Read what it does with the scaffolding.", whyBase: "Differentiation is time-consuming and often skipped. AI makes it fast enough to actually do, for every learner." },
        { tag: "Read", time: "10 min", title: isSenior ? "How institutions are adapting assessment design for the AI era" : "What AI tools are educators and trainers actually using right now", desc: isSenior ? "Assessment is broken. AI writes essays better than most students. Read how leading institutions are redesigning for authenticity and skill demonstration." : "Khanmigo, MagicSchool, Claude, Synthesis , map the tools that exist for your context. Most instructors don't know what's available.", whyBase: "You can't make good decisions about AI in education without knowing what exists and what's actually deployed." },
        { tag: "Reflect", time: "8 min", title: "What does AI change about what's worth teaching in your specific subject?", desc: "If AI can now handle X, what's the point of teaching X? This is the question your field needs to answer. Start with your own subject area.", whyBase: "This reflection is the most important professional question educators face right now. The ones who answer it thoughtfully redesign their teaching. The others get disrupted." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Redesign one assessment for the AI era" : "Build an AI-assisted feedback workflow for something you grade or evaluate regularly", desc: isSenior ? "Pick one high-stakes assessment. Redesign it so that AI assistance is either explicitly part of the task or provably irrelevant to performance. Document the rationale." : "Take something you evaluate regularly , essays, presentations, projects, training exercises. Use AI to generate first-pass feedback. Then add your own layer. Measure what the AI caught that you would have.", whyBase: "Feedback at scale is the hardest part of teaching. AI makes consistent, specific feedback achievable, if you design the workflow." },
        { tag: "Tool", time: "15 min", title: isSenior ? "Use AI to audit a course or program you own for AI relevance" : "Use AI to generate a unit plan on a topic you teach, then critique it", desc: isSenior ? "Ask Claude: given current AI capabilities, which learning objectives in this program are still meaningful, which are obsolete, and which need updating? Read its answer as a critic." : "Give Claude your course topic, level, and learning objectives. Ask for a full unit plan. Then mark every place where it got the pedagogy wrong , that's your moat.", whyBase: "AI generates structure fast. What it can't do is know your learners, your context, and the specific things that make a lesson actually land." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where is your institution's AI policy behind the reality of what students and trainees are doing?" : "How do you want to handle AI use in your teaching, and have you decided yet?", desc: isSenior ? "Students are using AI regardless of policy. Map the gap between your institution's stated position and what's actually happening in classrooms. Then decide what leadership looks like here." : "Most educators are in one of three positions: ban, allow, or design around it. Each has implications. Have you decided? If not, now is the time.", whyBase: "Educators who have a clear, principled position on AI in their teaching are the ones who get asked to help design policy. just follow it." },
      ],
    },

    // OTHER / EXECUTIVE
    11: {
      headline: isExperienced ? "You're at the level where AI decisions are your decisions. The question is whether you're making them on purpose." : "Leaders who understand AI deeply make better calls , on tools, talent, risk, and strategy. This is where it starts.",
      beginner: [
        { tag: "Read", time: timeSlot, title: isSenior ? "What the best-run companies are doing with AI governance right now" : "What AI actually means for the function or org you lead", desc: isSenior ? "Three Fortune 500 companies published their AI governance frameworks this quarter. Read one. Notice the decisions they made that you haven't made yet." : "Look at how organizations in your sector are deploying AI. What's changed in the last 12 months? Where is the real adoption happening versus the hype?", whyBase: "Leaders who don't understand AI can't evaluate the decisions their teams bring to them. This is the minimum viable understanding." },
        { tag: "Tool", time: "15 min", title: "Use AI to stress-test a decision you're currently making", desc: "Describe a real decision to Claude , strategic, operational, or personnel. Give it the full context. Ask it to argue against your current position. Read it as a critic, not a validator.", whyBase: "The higher you are, the fewer people will tell you when you're wrong. AI as adversarial advisor doesn't have that problem." },
        { tag: "Reflect", time: "10 min", title: "Which decisions should AI inform, and which should it never touch?", desc: isSenior ? "Draw the line explicitly. Where do you want AI accelerating analysis, synthesis, or drafting, and where does accountability require human judgment at every step?" : "Think through: where would AI make your team faster and better? Where would using AI create risk, bias, or accountability gaps?", whyBase: "This is the leadership call that defines how your org adapts. Use AI here, not there." },
      ],
      experienced: [
        { tag: "Apply", time: timeSlot, title: isSenior ? "Draft your organization's AI principles, even a rough first version" : "Build an AI-assisted workflow for the highest-volume decision your team makes", desc: isSenior ? "One page. What AI can be used for, what requires human sign-off, what's off-limits, and who owns the decisions. Even a rough version creates the conversation that needs to happen." : "Pick the decision your team makes most often. Build a prompt that gives AI the context and asks for a first-pass recommendation. Run it on 3 real cases. See what it gets right.", whyBase: "Organizations without AI principles are making decisions by default. Leaders who write the first draft shape the culture." },
        { tag: "Tool", time: "15 min", title: isSenior ? "Use AI to analyze competitive intelligence from the recent period" : "Use AI to synthesize a briefing on a strategic topic you're navigating", desc: isSenior ? "Pick a competitor or market shift you're watching. Ask Claude to synthesize everything publicly available from the recently. Then identify the 3 things that change your view." : "Pick a strategic question you're working through. Ask Claude to give you a structured briefing: current state, key uncertainties, and the strongest argument on each side.", whyBase: "Strategic synthesis at speed is where AI gives executives the most leverage. This is what a research team used to take a week to produce." },
        { tag: "Reflect", time: "10 min", title: isSenior ? "Where is your leadership team least equipped to make AI decisions? What are you doing about it?" : "What would you need to know or do to feel confident making AI decisions for your organization?", desc: isSenior ? "The AI decisions being made at your level , on talent, tools, risk, and strategy , require judgment that most senior leaders don't have yet. Be specific about the gap." : "Identify 3 AI decisions you might face in the next 6 months. For each: do you have what you'd need to make it well? The gap is the work.", whyBase: "Leadership at this level isn't about becoming an AI expert. It's about knowing enough to ask the right questions, and recognize a good answer." },
      ],
    },
  };

  // Select tasks: use role-specific matrix if available, else build from default
  const roleMatrix = taskMatrix[answers.role];
  let tasks;
  let headline;

  if (roleMatrix) {
    tasks = (isExperienced ? roleMatrix.experienced : roleMatrix.beginner).map((t, i) => ({ ...t, time: i === 0 ? timeSlot : t.time }));
    headline = roleMatrix.headline;
  } else {
    // Fallback: generic beginner/experienced
    if (isExperienced) {
      tasks = [
        { tag: "Apply", time: timeSlot, title: `Build an AI-assisted workflow for your most repeated ${role.toLowerCase()} task`, desc: `Pick the task you do most often in ${role.toLowerCase()}. Build a reusable AI prompt chain that handles the first 80%.`, whyBase: "Moving from occasional AI use to systematic is the shift that compounds." },
        { tag: "Reflect", time: "10 min", title: `Map where AI augments vs. replaces in ${role.toLowerCase()}`, desc: isSenior ? `For each responsibility you own: where does AI accelerate your judgment, and where does it compete with it?` : `List your 5 most common tasks. For each: is AI a tool or a threat?`, whyBase: "Knowing the difference lets you invest in the right skills." },
        { tag: "Tool", time: "15 min", title: "Use AI to challenge your own assumptions", desc: "Describe a recent decision to Claude. Ask it to argue against you. Read the pushback critically.", whyBase: "AI as adversarial reviewer catches blind spots faster than feedback loops." },
      ];
    } else {
      tasks = [
        { tag: "Tool", time: timeSlot, title: `Try AI on one real ${role.toLowerCase()} task today`, desc: `Pick something you did this week. Paste the context into Claude and ask it to help. See what it produces , not as a replacement, but as a starting point.`, whyBase: "The first time you use AI on your actual work , not a tutorial , is when it clicks." },
        { tag: "Read", time: "10 min", title: `How AI is being used in ${role.toLowerCase()} right now`, desc: isSenior ? `Look at what leading organizations are doing with AI in your function. What's real vs. hype?` : `Three concrete examples of AI in ${role.toLowerCase()}. Focus on what's actually deployed, not what's announced.`, whyBase: "Knowing what's real separates you from people who only read headlines." },
        { tag: "Reflect", time: "8 min", title: `Which parts of your ${role.toLowerCase()} work require human judgment?`, desc: "List 5 things you did this week. For each: could AI do this with a good prompt? The honest answer maps your terrain.", whyBase: "This exercise turns abstract anxiety into a specific, actionable map." },
      ];
    }
    headline = isExperienced
      ? `You're using AI in ${role.toLowerCase()}. Time to make it systematic.`
      : `AI is changing ${role.toLowerCase()}. Here's where to start.`;
  }

  // ─── AUDIT-DRIVEN TASK #1 OVERRIDE ─────────────────────
  // If the user did the audit and their most-exposed task scored high,
  // replace Task #1 with a custom task that directly addresses their work.
  if (mostExposed && mostExposed.score >= 55) {
    const exposedTask = mostExposed.task;
    const customTask = {
      tag: "Apply",
      time: timeSlot,
      title: isExperienced
        ? `Build an AI workflow for "${exposedTask}"`
        : `Try AI on "${exposedTask}"`,
      desc: isExperienced
        ? `You told us "${exposedTask}" takes a significant chunk of your week. Break it into steps: which parts are judgment, which are execution? Build a prompt chain that handles the execution parts. Test it on real material.`
        : `You said "${exposedTask}" is where you spend most of your time. Open Claude, describe exactly what this task involves, and ask it to help you do it. Don't aim for perfection , aim for "huh, that's actually useful."`,
      whyBase: `This is your most exposed task. It's where AI is moving fastest. ${isExperienced ? "Automating it before someone else does is how you stay ahead." : "Trying AI on the thing you actually do is worth more than ten tutorials."}`,
    };
    tasks[0] = customTask;
  }

  // context question removed , team/leader task modulation reserved for future

  // Profile + behavioral style task reordering
  const emphasis = profileData.taskEmphasis;
  if (emphasis === "apply") { const a = tasks.filter(t => t.tag === "Apply"); const r = tasks.filter(t => t.tag !== "Apply"); tasks = [...a, ...r].slice(0, 3); }
  else if (emphasis === "read") { const a = tasks.filter(t => t.tag === "Read" || t.tag === "Reflect"); const r = tasks.filter(t => t.tag !== "Read" && t.tag !== "Reflect"); tasks = [...a, ...r].slice(0, 3); }
  else if (emphasis === "reflect") { const a = tasks.filter(t => t.tag === "Reflect"); const r = tasks.filter(t => t.tag !== "Reflect"); tasks = [...a, ...r].slice(0, 3); }
  if (classification.isOutcomeOriented && isExperienced) { const d = tasks.find(t => t.tag === "Apply"); if (d && tasks[0] !== d) tasks = [d, ...tasks.filter(t => t !== d)].slice(0, 3); }
  if (classification.isProcessOriented) { const th = tasks.find(t => t.tag === "Read" || t.tag === "Reflect"); if (th && tasks[0] !== th) tasks = [th, ...tasks.filter(t => t !== th)].slice(0, 3); }
  if (_blockerArrPlan.includes(1)) tasks.sort((a, b) => (parseInt(a.time) || 15) - (parseInt(b.time) || 15));
  // Safety: don't lead with Tool for low-readiness users
  if (classification.readinessLevel === "low" && tasks[0]?.tag === "Apply") { const g = tasks.find(t => t.tag === "Read" || t.tag === "Reflect"); if (g) tasks = [g, ...tasks.filter(t => t !== g)].slice(0, 3); }
  // But DO keep audit-driven custom task #1 in position if it exists
  if (mostExposed && mostExposed.score >= 55 && tasks[0]?.title?.includes(mostExposed.task) === false) {
    const custom = tasks.find(t => t.title?.includes(mostExposed.task));
    if (custom) tasks = [custom, ...tasks.filter(t => t !== custom)].slice(0, 3);
  }

  // Personalized "why" , concern prefix on task #1, goal reference on #2
  const ultimateWhy = classification.ultimateWhy;
  const goalWhys = {
    0: "This is the kind of thing that positions you as the person who gets it.",
    1: "This directly strengthens the parts of your role AI can't touch.",
    2: "The output is the kind of thing that shows up in performance conversations.",
    3: "This builds a skill that opens doors you don't have access to yet.",
    4: "Completing this is evidence that you're closer than you think.",
    5: "This gives you the clarity to make better decisions for your team.",
  };
  const personalizedTasks = tasks.map((task, i) => {
    let why = task.whyBase;
    if (i === 0) {
      if (_blockerArrPlan.includes(1)) why = `Overwhelm is one of your main obstacles. This task cuts through that. ${why}`;
      else if (_blockerArrPlan.includes(2)) why = `You've had trouble following through before. This task has a clear finish line. ${why}`;
      else if (_blockerArrPlan.includes(3)) why = `You learn things but don't apply them. This task is pure application. ${why}`;
      if (ultimateWhy) why += ` You want to ${ultimateWhy}. This is the first step.`;
    }
    if (i === 1) {
      const gWhy = goalWhys[answers.goal];
      if (gWhy) why += ` ${gWhy}`;
    }
    return { ...task, why };
  });

  const careerSituationLabel = "In progress";

  return {
    name: (answers.name || "").trim(),
    headline, tasks: personalizedTasks, roleName: role,
    profileName, profileData, classification,
    seniority: seniorityText, goal: goalText,
    primaryConcern: concernText, narrative,
    taskAnalysis, avgExposure, mostExposed, leastExposed,
    profileReason: buildProfileReason(profileName, classification, answers),
    outcomes: generateStaticOutcomes(profileName, answers, classification),
    careerSituationLabel,
    classification,
    _answers: answers,
    anchorThought: generateAnchorThought(profileName, answers, classification),
  };
}


// ─── Sub-role questions, triggered by specific role selections ───────────────
const SUB_ROLE_QUESTIONS = {
  11: { // Legal / compliance
    text: "Which best describes your work?",
    sub: "This shapes the specific moves your plan will focus on.",
    options: [
      { text: "BigLaw / large firm", sub: "Associate, senior associate, counsel, partner" },
      { text: "Boutique / mid-size firm", sub: "Smaller firm, niche practice" },
      { text: "In-house counsel", sub: "Corporate legal, GC, deputy GC" },
      { text: "Barrister / chambers", sub: "Independent practice, advocacy" },
      { text: "Government / public sector legal", sub: "Crown, government department, regulator" },
      { text: "Compliance / risk", sub: "Compliance officer, risk manager, regulatory affairs" },
      { text: "Paralegal / legal ops", sub: "Paralegal, legal executive, legal ops" },
    ],
  },
  9: { // Healthcare / medicine
    text: "Which best describes your work?",
    sub: "Your role shapes which parts of healthcare AI is changing first.",
    options: [
      { text: "Hospital / acute care", sub: "NHS trust, hospital system, emergency" },
      { text: "Primary care / GP", sub: "General practice, family medicine, community health" },
      { text: "Specialist / consultant", sub: "Specialist medicine, consultant practice" },
      { text: "Pharma / biotech", sub: "Drug development, clinical trials, regulatory" },
      { text: "MedTech / health tech", sub: "Medical devices, digital health, health AI" },
      { text: "Research / academic medicine", sub: "Clinical research, academic centre, grants" },
      { text: "Public health / policy", sub: "Health policy, epidemiology, public health" },
    ],
  },
  16: { // Nursing / allied health
    text: "Which best describes your role?",
    sub: "This shapes where your specific skills sit in a changing system.",
    options: [
      { text: "Nursing", sub: "RN, ward nurse, community nurse, specialist nurse" },
      { text: "Physiotherapy / OT", sub: "Physio, occupational therapist, rehab" },
      { text: "Radiology / sonography", sub: "Radiographer, sonographer, nuclear medicine" },
      { text: "Pharmacy", sub: "Clinical pharmacist, dispensing, hospital pharmacy" },
      { text: "Midwifery", sub: "Midwife, maternal health" },
      { text: "Paramedic / emergency care", sub: "Paramedic, EMT, critical care" },
      { text: "Other allied health", sub: "Dietitian, speech therapist, podiatry, other" },
    ],
  },
  14: { // Mental health / social work
    text: "Which best describes your work?",
    sub: "Mental health and social care are changing in distinct ways.",
    options: [
      { text: "Clinical psychologist / psychiatrist", sub: "Diagnosed, assessed, prescribed" },
      { text: "Therapist / counsellor", sub: "CBT, EMDR, psychodynamic, integrative" },
      { text: "Social worker", sub: "Statutory, children, adults, hospital" },
      { text: "Community / charity mental health", sub: "VCSE sector, crisis line, outreach" },
      { text: "Private practice", sub: "Independent practice, private clients" },
      { text: "Coaching / wellbeing", sub: "Life coach, executive coach, wellness" },
    ],
  },
  5: { // Education / teaching
    text: "Which best describes your work?",
    sub: "The changes hitting primary school teaching are different from higher education.",
    options: [
      { text: "Primary / elementary school", sub: "Ages 4–11, primary teacher, form tutor" },
      { text: "Secondary / high school", sub: "Ages 11–18, subject teacher, pastoral" },
      { text: "Further education / vocational", sub: "College, vocational, apprenticeships" },
      { text: "University / higher education", sub: "Lecturer, senior lecturer, professor" },
      { text: "Special educational needs", sub: "SEND teacher, SENCo, learning support" },
      { text: "School leadership", sub: "Head teacher, deputy head, principal" },
      { text: "International / independent school", sub: "International curriculum, private school" },
    ],
  },
  3: { // Creative / design
    text: "Which best describes your work?",
    sub: "AI is hitting different parts of creative work at very different speeds.",
    options: [
      { text: "Brand / visual identity", sub: "Brand designer, art director, identity" },
      { text: "UX / product design", sub: "UX designer, interaction designer, design systems" },
      { text: "Illustration / animation", sub: "Illustrator, motion designer, 3D" },
      { text: "Photography / videography", sub: "Photographer, videographer, director" },
      { text: "Fashion / textile / industrial", sub: "Fashion designer, product designer, industrial" },
      { text: "Interior / spatial design", sub: "Interior designer, set designer, spatial" },
      { text: "Freelance / studio", sub: "Independent creative, small studio" },
    ],
  },
  23: { // Skilled trades
    text: "Which trade are you in?",
    sub: "Your specific trade shapes which tools and transitions are most relevant.",
    options: [
      { text: "Electrician", sub: "Domestic, commercial, industrial electrical" },
      { text: "Plumber / gas engineer", sub: "Plumbing, heating, gas, renewables" },
      { text: "Carpenter / joiner", sub: "Site carpenter, joiner, cabinet maker" },
      { text: "Bricklayer / plasterer / tiler", sub: "Masonry, plastering, tiling" },
      { text: "HVAC / refrigeration", sub: "Heating, ventilation, air conditioning" },
      { text: "Mechanic / automotive", sub: "Vehicle technician, MOT tester, diagnostic" },
      { text: "Other skilled trade", sub: "Welder, painter, roofer, landscaper, other" },
    ],
  },
  13: { // Media / journalism / writing
    text: "Which best describes your work?",
    sub: "Generative AI is changing different parts of media at different rates.",
    options: [
      { text: "Journalist / reporter", sub: "News, features, investigations, broadcast" },
      { text: "Editor", sub: "Commissioning editor, sub-editor, content editor" },
      { text: "Copywriter / content writer", sub: "Brand copy, content marketing, SEO writing" },
      { text: "Author / novelist", sub: "Fiction, non-fiction, screenwriting" },
      { text: "Scriptwriter / playwright", sub: "TV, film, theatre, radio" },
      { text: "PR / communications", sub: "PR manager, communications director, press" },
    ],
  },
  24: { // Software / engineering
    text: "Which best describes your work?",
    sub: "Different parts of engineering are changing at different speeds.",
    options: [
      { text: "Frontend / full-stack", sub: "Web development, React, Vue, full-stack" },
      { text: "Backend / infrastructure", sub: "APIs, microservices, cloud, DevOps" },
      { text: "Mobile", sub: "iOS, Android, React Native" },
      { text: "Data engineering / ML ops", sub: "Pipelines, MLOps, data infrastructure" },
      { text: "Embedded / hardware", sub: "Firmware, IoT, systems programming" },
      { text: "QA / testing", sub: "Test automation, QA engineer, SDET" },
      { text: "Architecture / tech lead", sub: "Solution architect, principal engineer, CTO" },
    ],
  },
  6: { // Finance / accounting
    text: "Which best describes your work?",
    sub: "Finance roles are being reshaped in very different ways.",
    options: [
      { text: "Investment banking / capital markets", sub: "IBD, trading, capital markets, M&A" },
      { text: "Asset management / wealth", sub: "Fund manager, wealth advisor, portfolio" },
      { text: "Corporate finance / FP&A", sub: "In-house finance, FP&A, treasury" },
      { text: "Accounting / audit", sub: "Chartered accountant, auditor, Big Four" },
      { text: "Financial planning / advisory", sub: "IFA, financial advisor, private client" },
      { text: "Insurance / actuarial", sub: "Underwriter, actuary, claims" },
      { text: "Fintech / crypto", sub: "Financial technology, digital assets, payments" },
    ],
  },
  4: { // Data / analytics / BI
    text: "Which best describes your work?",
    sub: "Data roles have diverged significantly, this shapes your specific tasks.",
    options: [
      { text: "Data analyst", sub: "Business intelligence, reporting, dashboards, Excel/SQL" },
      { text: "Data scientist", sub: "Modelling, statistical analysis, Python/R, experimentation" },
      { text: "ML / AI engineer", sub: "Model development, MLOps, production ML systems" },
      { text: "BI developer / engineer", sub: "Data warehousing, ETL, Tableau, Power BI, Looker" },
      { text: "Data engineer", sub: "Pipelines, infrastructure, Spark, dbt, cloud data platforms" },
      { text: "Analytics lead / head of data", sub: "Team lead, head of analytics, CDO" },
      { text: "Product analyst", sub: "Product analytics, growth analysis, A/B testing" },
    ],
  },
  18: { // Product / UX / design
    text: "Which best describes your work?",
    sub: "Product and design have very different career trajectories.",
    options: [
      { text: "Product manager", sub: "PM, senior PM, group PM, platform PM" },
      { text: "UX / product designer", sub: "UX designer, product designer, interaction design" },
      { text: "UX researcher", sub: "User research, mixed methods, discovery" },
      { text: "Growth PM / growth analyst", sub: "Growth, experimentation, lifecycle, retention" },
      { text: "Design systems", sub: "Design systems, component libraries, tokens" },
      { text: "Director / VP of Product", sub: "Head of product, CPO, VP product" },
      { text: "Head of design / design director", sub: "Design leadership, creative direction" },
    ],
  },
  12: { // Marketing / growth
    text: "Which best describes your work?",
    sub: "AI is transforming different parts of marketing at very different speeds.",
    options: [
      { text: "Brand / comms / PR", sub: "Brand manager, comms director, PR" },
      { text: "Performance / paid media", sub: "Paid social, PPC, programmatic, biddable" },
      { text: "SEO / content marketing", sub: "SEO manager, content strategist, editorial" },
      { text: "Product marketing", sub: "PMM, go-to-market, positioning, enablement" },
      { text: "Growth / lifecycle", sub: "Growth, CRM, email, retention, lifecycle" },
      { text: "Social media", sub: "Social media manager, community, organic social" },
      { text: "CMO / marketing director", sub: "Head of marketing, VP marketing, CMO" },
    ],
  },
  22: { // Sales / BD
    text: "Which best describes your work?",
    sub: "The skills that matter vary enormously across sales roles.",
    options: [
      { text: "Enterprise / strategic sales", sub: "Enterprise AE, strategic accounts, complex deals" },
      { text: "SMB / mid-market sales", sub: "SMB AE, mid-market, volume sales" },
      { text: "SDR / BDR", sub: "Sales development, outbound prospecting, pipeline generation" },
      { text: "Partnerships / alliances", sub: "Channel, alliances, partner success" },
      { text: "Account management / CS", sub: "Account manager, customer success, renewals" },
      { text: "Agency / new business", sub: "Agency new biz, pitching, RFP" },
      { text: "Sales leader / VP", sub: "Sales manager, VP sales, CRO, head of sales" },
    ],
  },
  10: { // HR / people / recruiting
    text: "Which best describes your work?",
    sub: "HR specialisms are being disrupted in very different ways.",
    options: [
      { text: "HR business partner", sub: "HRBP, generalist, strategic HR" },
      { text: "Talent acquisition / recruiting", sub: "In-house recruiter, TA lead, sourcing" },
      { text: "L&D / organisational development", sub: "Learning and development, OD, capability" },
      { text: "Compensation and benefits", sub: "Reward, total comp, payroll, benefits" },
      { text: "People operations / HR ops", sub: "People ops, HRIS, HR systems, analytics" },
      { text: "Employee relations", sub: "ER adviser, case manager, employment law" },
      { text: "CHRO / Head of People", sub: "HR director, CPO, head of people" },
    ],
  },
  17: { // Operations / strategy
    text: "Which best describes your work?",
    sub: "Ops and strategy span very different day-to-day realities.",
    options: [
      { text: "Management consultant", sub: "Strategy consulting, advisory, Big Four, boutique" },
      { text: "In-house strategy", sub: "Corporate strategy, internal consulting, M&A" },
      { text: "Chief of staff / EA", sub: "Chief of staff, EA to exec, business manager" },
      { text: "Operations manager", sub: "Ops manager, process improvement, BPO" },
      { text: "Programme / project manager", sub: "PMO, programme director, project manager" },
      { text: "Business analyst", sub: "BA, process analyst, systems analyst" },
      { text: "COO / VP Operations", sub: "Head of ops, COO, VP operations" },
    ],
  },
  20: { // Research / academia
    text: "Which best describes your work?",
    sub: "The pressures and opportunities differ significantly across research roles.",
    options: [
      { text: "PhD student", sub: "Doctoral researcher, grad student" },
      { text: "Postdoctoral researcher", sub: "Postdoc, research associate, fellowship" },
      { text: "Lecturer / early career academic", sub: "PI, early career academic, lecturer" },
      { text: "Senior academic / professor", sub: "Senior lecturer, associate professor, professor" },
      { text: "Industry / applied research", sub: "R&D, corporate research, applied science" },
      { text: "Think tank / policy research", sub: "Research fellow, policy analyst, think tank" },
      { text: "Research management", sub: "Research director, grants manager, REF lead" },
    ],
  },
  0: { // Architecture / built environment
    text: "Which best describes your work?",
    sub: "Different built environment roles face very different transitions.",
    options: [
      { text: "Architect", sub: "RIBA qualified, project architect, design architect" },
      { text: "Civil / structural engineer", sub: "Civil engineer, structural engineer, highways" },
      { text: "Building services / MEP engineer", sub: "M&E, building services, energy" },
      { text: "Urban / town planner", sub: "Planning consultant, LPA planner, urban design" },
      { text: "Quantity surveyor / cost consultant", sub: "QS, cost manager, commercial manager" },
      { text: "Project manager", sub: "PM, employer's agent, NEC, RICS PM" },
      { text: "Building / property surveyor", sub: "Building surveyor, valuation, party walls" },
    ],
  },
  15: { // Nonprofit / NGO
    text: "Which best describes your work?",
    sub: "The skills that matter vary significantly across the sector.",
    options: [
      { text: "Programme / project delivery", sub: "Programme manager, project officer, delivery" },
      { text: "Fundraising / development", sub: "Fundraiser, major donor, trusts and grants" },
      { text: "Policy / advocacy / research", sub: "Policy officer, advocacy, public affairs" },
      { text: "Communications / campaigns", sub: "Comms manager, digital, PR, campaigns" },
      { text: "Service delivery / frontline", sub: "Caseworker, support worker, direct service" },
      { text: "Finance / operations", sub: "Finance manager, operations, governance" },
      { text: "CEO / director / leadership", sub: "CEO, ED, director, trustee" },
    ],
  },
  8: { // Government / public sector
    text: "Which best describes your work?",
    sub: "Public sector roles are changing at different speeds depending on the context.",
    options: [
      { text: "Central government / civil service", sub: "Civil servant, policy, Whitehall, federal" },
      { text: "Local government", sub: "Local authority, council, municipal" },
      { text: "Regulatory / arm's-length body", sub: "Regulator, quango, public body" },
      { text: "Healthcare management", sub: "NHS manager, trust board, ICS" },
      { text: "Education administration", sub: "School business manager, MAT, LEA" },
      { text: "Military / defence", sub: "Armed forces, MOD, defence contractor" },
      { text: "Elected / political", sub: "Elected official, political adviser, councillor" },
    ],
  },
};


// ─── Goal detail sub-questions, per goal index ──────────────────────────────
const GOAL_DETAIL_QUESTIONS = {
  2: { // "Get somewhere better"
    id: "goal_detail",
    text: "What does 'somewhere better' actually mean for you?",
    sub: "Pick the one that's closest. This shapes the whole program.",
    type: "single",
    options: [
      { text: "A promotion at my current company" },
      { text: "A move to a different company, same type of role" },
      { text: "A move into a completely different field or industry" },
      { text: "Starting something of my own" },
      { text: "A step back to a more sustainable pace" },
      { text: "I need clarity first, I don't know yet" },
    ],
  },
  3: { // "Build a skill set that opens doors"
    id: "goal_detail",
    text: "Which kind of skills are you trying to build?",
    sub: "This shapes which doors your plan targets.",
    type: "single",
    options: [
      { text: "Technical or AI-adjacent skills" },
      { text: "Leadership and people management" },
      { text: "Skills in a new domain or industry" },
      { text: "Communication, influence, or executive presence" },
      { text: "Strategic or commercial thinking" },
      { text: "I'm not sure yet, I need to figure that out" },
    ],
  },
};
// Goal direction follow-up, triggered when goal_detail is "career change" or "own venture"
const GOAL_DIRECTION_QUESTION = {
  id: "goal_direction",
  text: "Where are you thinking of moving toward?",
  sub: "Even a rough direction helps. You can skip if you're not sure yet.",
  type: "text",
  placeholder: "e.g. tech policy, freelance writing, my own studio, not sure yet...",
  optional: true,
};

// Which goal_detail answers trigger the direction question
// goal 2 (somewhere better): index 2 = different field, index 3 = own venture
// goal 3 (build skills): index 2 = new domain
const NEEDS_DIRECTION = {
  2: [2, 3],  // "somewhere better" → "different field" or "own venture"
  3: [2],     // "build skills" → "skills in a new domain"
};


// Which role indices trigger a sub-role question
const ROLES_WITH_SUBROLE = new Set(Object.keys(SUB_ROLE_QUESTIONS).map(Number));



// ─── Google Fonts ──────────────────────────────────────────
// Georgia (editorial display) + Inter (clean UI sans)
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');`;

// ─── Design Tokens ────────────────────────────────────────
const C = {
  // Flat light backgrounds, no gradients
  bg0:      "#FFFDF7",   // warm cream base
  bg1:      "#FFFDF7",   // same, no gradient
  bg2:      "#FFFDF7",   // same

  // Accent: warm gold
  accent:   "#E8A820",
  accentL:  "#F0C050",
  accentLL: "#EDD8A0",
  accentD:  "#D49518",

  // Sections
  offWhite: "#FFFDF7",
  white:    "#FFFFFF",

  // Text (dark on light)
  textHero:   "#1E1E2A",
  textDim:    "rgba(30,30,42,0.6)",
  textMuted:  "rgba(30,30,42,0.4)",
  ink:        "#1E1E2A",
  body:       "#5C5C6E",
  muted:      "#9494A6",

  // UI
  border:     "#E6E4EE",
  borderD:    "rgba(30,30,42,0.1)",
  cardShadow: "0 2px 16px rgba(30,30,42,0.06)",

  // Pastel supporting (flat)
  mint: "#C8F0D8",
  lemon: "#F0D888",
  lavender: "#E0D4F8",
  sky: "#C4E0FF",
  peach: "#FFD8C4",
};

// ─── Mr. Bril face, embedded emoji image ─────────────────
const BRIL_IMG = "data:image/png;base64,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";
const MrBrilAvatar = React.memo(function MrBrilAvatar({ size = 42, wiggle = false }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      animation: wiggle ? "brilWiggle 0.4s ease" : "none",
    }}>
      <img src={BRIL_IMG} alt="Mr. Bril" width={size} height={size} style={{ borderRadius: "50%", display: "block" }} />
    </div>
  );
});

// ─── Logo image (base64 PNG) ─────────────────────────────
const LOGO_SRC = "data:image/png;base64,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";

// ─── Logo component ────────────────────────────────────────
const Logo = React.memo(function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Be Brilliant logo">
      <rect width="80" height="80" rx="18" fill="#D99A1E" />
      <circle cx="16" cy="66" r="7.5" fill="#fff" />
      <line x1="21" y1="61" x2="42" y2="40" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M53 5 C55.2 21 64 29.8 78 32 C64 34.2 55.2 43 53 59 C50.8 43 42 34.2 28 32 C42 29.8 50.8 21 53 5Z" fill="#fff" />
    </svg>
  );
});

// ─── FadeIn helper ─────────────────────────────────────────
const FadeIn = React.memo(function FadeIn({ children, delay = 0, up = true }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : (up ? "translateY(18px)" : "none"),
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
});


// ─── Section label ─────────────────────────────────────────
function Label({ children, light = false }) {
  return (
    <p style={{
      fontFamily: T.sans, fontSize: 14, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: light ? C.accentD : C.accent,
      margin: "0 0 16px",
    }}>
      {children}
    </p>
  );
}

// ─── REDESIGNED LANDING PAGE ──────────────────────────────
function LandingPage({ onStart, onResume, savedPlan }) {
  useSEO({
    title: null, // Uses default: "Be Brilliant — Your Daily Career Development Program"
    description: "Be Brilliant is your daily career development program. Personality-matched, research-backed, one task a day. Get a clear, personalized career plan in minutes.",
    path: "/",
  });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: T.sans, background: C.offWhite }}>
      <SEOStructuredData />
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
        body { overflow-x: hidden; -webkit-overflow-scrolling: touch; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
        input, textarea, select { font-size: 16px !important; }
        h1, h2, h3, p { word-break: break-word; overflow-wrap: break-word; }

        @media (max-width: 480px) {
          .sa-dash-task-card { border-radius: 16px !important; }
          .sa-dash-bril-box { border-radius: 16px !important; }
          button { min-height: 44px; }
        }
        @media (max-width: 360px) {
          .sa-dash-task-card { padding: 14px 12px !important; }
        }
        @media (hover: none) {
          button, a, [role="button"] { -webkit-tap-highlight-color: transparent; }
        }

        @keyframes float1 { 0%, 100% { transform: translateY(0) rotate(12deg); } 50% { transform: translateY(-14px) rotate(16deg); } }
        @keyframes float2 { 0%, 100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-10px) rotate(-4deg); } }
        @keyframes float3 { 0%, 100% { transform: translateY(0) rotate(20deg); } 50% { transform: translateY(-8px) rotate(24deg); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(2deg); } }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes sparkle { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0); opacity: 1; } 100% { transform: translateY(60px) rotate(360deg); opacity: 0; } }

        .sa-nav-sticky {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
        }
        .sa-nav-scrolled {
          background: rgba(255, 253, 247, 0.95) !important;
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(232,168,32,0.12) !important;
          box-shadow: 0 2px 12px rgba(30,30,42,0.04) !important;
        }

        .sa-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: Inter, sans-serif; font-size: 15px; font-weight: 600;
          letter-spacing: -0.2px; color: #1E1E2A;
          background: #E8A820; border: none; border-radius: 50px;
          padding: 14px 28px; cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s;
          box-shadow: 0 2px 12px rgba(232,168,32,0.25);
          white-space: nowrap;
        }
        .sa-btn-primary:hover {
          background: #D49518; transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(232,168,32,0.35);
        }
        .sa-btn-primary-light {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: Inter, sans-serif; font-size: 15px; font-weight: 600;
          letter-spacing: -0.2px; color: #1E1E2A;
          background: ${C.accentD}; border: none; border-radius: 50px;
          padding: 14px 28px; cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 2px 12px rgba(232,168,32,0.25);
          white-space: nowrap;
        }
        .sa-btn-primary-light:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(232,168,32,0.35);
        }
        .sa-btn-ghost {
          display: inline-flex; align-items: center;
          font-family: Inter, sans-serif; font-size: 13px; font-weight: 500;
          color: ${C.body}; background: transparent;
          border: 1.5px solid ${C.border}; border-radius: 50px;
          padding: 9px 18px; cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .sa-btn-ghost:hover { border-color: ${C.accentD}; color: ${C.accentD}; }

        .sa-step-card {
          background: ${C.white}; border: 1.5px solid ${C.border};
          border-radius: 20px; padding: 28px 28px;
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
        }
        .sa-step-card:hover { transform: translateY(-4px) rotate(-0.5deg); box-shadow: ${C.cardShadow}; border-color: ${C.accent}; }
        .sa-btn-primary:active { transform: scale(0.97); }
        .sa-btn-ghost:active { transform: scale(0.97); }

        .sa-comparison-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 640px) {
          .sa-hero-headline { white-space: normal !important; }
          .sa-hero-cta { flex-direction: column !important; align-items: stretch !important; }
          .sa-hero-cta .sa-btn-primary, .sa-hero-cta .sa-btn-ghost { width: 100%; justify-content: center; }
          .sa-steps-grid { grid-template-columns: 1fr !important; }
          .sa-steps-grid .sa-step-card { display: flex; flex-direction: column; align-items: center; text-align: center; }
          .sa-steps-grid .sa-step-card h3 { text-align: center; }
          .sa-quotes-grid { grid-template-columns: 1fr !important; }
          .sa-stats-row { flex-direction: column !important; gap: 24px !important; align-items: flex-start !important; }
          .sa-footer-inner { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
          .sa-dashboard-frame { text-align: left !important; }
          .sa-dashboard-frame p { text-align: left !important; }
          .bb-compare-table { font-size: 13px !important; }
          .bb-compare-table div[style*="gridTemplateColumns"] { grid-template-columns: 100px 1fr 1fr !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className={`sa-nav-sticky${scrolled ? " sa-nav-scrolled" : ""}`}
        style={{ background: "transparent", borderBottom: "1px solid transparent" }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* Brand, clickable, scrolls to top */}
          <button aria-label="Be Brilliant — scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <img src={LOGO_SRC} alt="Be Brilliant" width={32} height={32} style={{ borderRadius: 7, display: "block" }} />
            <span style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-0.4px" }}>
              Be Brilliant
            </span>
          </button>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {savedPlan && (
              <button onClick={onResume} className="sa-btn-ghost" style={{ fontSize: 13 }}>
                Resume program
              </button>
            )}

          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section aria-label="Hero" style={{
        background: C.offWhite,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "120px clamp(16px,5vw,40px) 100px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Floating geometric decorations */}
        <div style={{ position: "absolute", top: 60, right: "8%", width: 80, height: 80, borderRadius: 20, background: C.lemon, pointerEvents: "none", opacity: 0.7, animation: "float1 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "35%", right: "4%", width: 40, height: 40, borderRadius: "50%", background: C.peach, pointerEvents: "none", opacity: 0.5, animation: "sparkle 4s ease-in-out infinite 1s" }} />
        <div style={{ position: "absolute", bottom: "18%", left: "5%", width: 60, height: 60, borderRadius: 14, background: C.lavender, pointerEvents: "none", opacity: 0.5, animation: "float2 7s ease-in-out infinite 0.5s" }} />
        <div style={{ position: "absolute", bottom: "8%", right: "15%", width: 28, height: 28, borderRadius: "50%", background: C.peach, pointerEvents: "none", opacity: 0.6, animation: "sparkle 3s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 20, height: 20, borderRadius: 6, background: C.sky, pointerEvents: "none", opacity: 0.5, animation: "float3 5s ease-in-out infinite 1.5s" }} />
        <div style={{ position: "absolute", top: "55%", left: "15%", width: 14, height: 14, borderRadius: "50%", background: C.accent, pointerEvents: "none", opacity: 0.3, animation: "sparkle 5s ease-in-out infinite 0.8s" }} />
        <div style={{ position: "absolute", top: 120, left: "50%", width: 24, height: 24, borderRadius: 8, background: C.peach, pointerEvents: "none", opacity: 0.35, animation: "float1 8s ease-in-out infinite 3s" }} />

        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>

          {/* Headline */}
          <FadeIn delay={80}>
            <h1 className="sa-hero-headline" style={{
              fontFamily: T.serif,
              fontSize: "clamp(36px, 6vw, 68px)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: C.textHero,
              letterSpacing: "-1px",
              margin: "0 0 28px",
              position: "relative",
              zIndex: 1,
              whiteSpace: "nowrap",
            }}>
              Make a{" "}
              <span style={{ color: C.accentD, fontStyle: "italic", position: "relative", display: "inline-block" }}>
                brilliant
                <span style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 6, background: C.lemon, borderRadius: 3, zIndex: -1 }} />
              </span>
              {" "}career move
            </h1>
          </FadeIn>

          {/* Subhead */}
          <FadeIn delay={160}>
            <p style={{
              fontFamily: T.sans,
              fontSize: "clamp(16px, 2vw, 19px)",
              lineHeight: 1.75,
              color: C.body,
              maxWidth: 520,
              margin: "0 auto 48px",
              fontWeight: 400,
            }}>
              A daily program that gets you moving. One task a day, zero fluff, and just enough gentle roasting to keep you honest.
            </p>
          </FadeIn>

          {/* Resumed program card */}
          {savedPlan && (
            <FadeIn delay={220}>
              <div style={{
                maxWidth: 420, margin: "0 auto 28px",
                background: "#fff",
                border: `1.5px solid ${C.border}`, borderRadius: 18,
                padding: "18px 22px", display: "flex", alignItems: "center", gap: 14,
                boxShadow: C.cardShadow,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.accentLL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Logo size={24} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>Psst, you left off here</p>
                  <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 2 }}>
                    {savedPlan._answers?.name ? savedPlan._answers.name : "Your program"}
                  </p>
                  <p style={{ fontFamily: T.sans, fontSize: 12, color: C.muted }}>
                    {savedPlan._resumeDay > 1 ? `Day ${savedPlan._resumeDay} · ` : ""}Career program
                  </p>
                </div>
              </div>
            </FadeIn>
          )}

          {/* CTAs */}
          <FadeIn delay={260}>
            <div className="sa-hero-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
              {savedPlan
                ? <button onClick={onResume} className="sa-btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>Continue program →</button>
                : <button onClick={onStart} className="sa-btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>Get my plan (it's free) →</button>
              }
              {savedPlan && (
                <button onClick={onStart} className="sa-btn-ghost">Start fresh instead</button>
              )}
            </div>
          </FadeIn>

        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────── */}
      <section aria-label="The problem" style={{ background: C.white, padding: "96px clamp(16px,5vw,40px) 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <FadeIn>
            <Label light>Sound familiar?</Label>
            <h2 style={{ fontFamily: T.serif, fontSize: "clamp(32px, 4.5vw, 46px)", fontWeight: 400, color: C.ink, lineHeight: 1.3, letterSpacing: "-0.5px", marginBottom: 36 }}>
              You've built skills, experience, and credibility in your field.
            </h2>
          </FadeIn>
          <FadeIn delay={100}>
            <p style={{ fontFamily: T.sans, fontSize: 18, color: C.body, lineHeight: 1.85, fontWeight: 400, marginBottom: 24 }}>
              You've read the articles, saved the podcasts, maybe even started a course. But there's a difference between "I need to do something about my career" and actually doing it.
            </p>
          </FadeIn>
          <FadeIn delay={180}>
            <div style={{ background: C.lemon, borderRadius: 16, padding: "20px 24px", marginTop: 16 }}>
              <p style={{ fontFamily: T.sans, fontSize: 17, color: C.ink, margin: 0, lineHeight: 1.85, fontWeight: 400 }}>
                Be Brilliant delivers a daily, personalized program based on your current reality. Backed by research and tailored to your personality, it updates in real time as you make progress and share feedback.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── COMPARISON ──────────────────────────────────────── */}
      <section aria-label="Why Be Brilliant" id="why-bebril" style={{ background: C.offWhite, padding: "96px clamp(16px,5vw,40px) 96px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <Label light>Why Be Brilliant</Label>
              <h2 style={{ fontFamily: T.serif, fontSize: "clamp(32px, 4.5vw, 46px)", fontWeight: 400, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                A brilliant complement to coaching.
              </h2>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <style>{`
              @media (max-width: 600px) {
                .bb-compare-table { display: none !important; }
                .bb-compare-cards { display: flex !important; }
              }
              @media (min-width: 601px) {
                .bb-compare-cards { display: none !important; }
                .bb-compare-table { display: block !important; }
              }
            `}</style>

            {/* ── DESKTOP TABLE ── */}
            <div className="bb-compare-table" style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 48px rgba(15,14,30,0.10), 0 2px 12px rgba(15,14,30,0.05)" }}>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr" }}>
                <div style={{ background: "#F5F3EC", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }} />
                <div style={{ padding: "22px 28px", background: "#F5F3EC", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
                  <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, margin: "0 0 6px" }}>Traditional</p>
                  <p style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 400, color: C.body, margin: 0, letterSpacing: "-0.3px" }}>Coaching</p>
                </div>
                <div style={{ padding: "22px 28px", background: C.accentLL, position: "relative", overflow: "hidden", borderRadius: "0 16px 0 0" }}>
                  <div style={{ position: "absolute", top: "-30%", right: "-10%", width: 120, height: 120, borderRadius: "50%", background: "rgba(30,30,42,0.05)", pointerEvents: "none" }} />
                  <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accentD, margin: "0 0 6px" }}>Your brilliant alternative</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Logo size={18} />
                    <p style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 400, color: C.ink, margin: 0, letterSpacing: "-0.3px" }}>Be Brilliant</p>
                  </div>
                </div>
              </div>

              {/* Rows */}
              {[
                { label: "Cost",             coaching: "$200–$500 / session 💸",                  bebril: "Free to start. Seriously."                           },
                { label: "Availability",     coaching: "Weekly 1-hour sessions",                  bebril: "24/7. Be Brilliant doesn't sleep."                  },
                { label: "Personalization",  coaching: "Depends on your coach's mood",             bebril: "Tailored to your actual answers"                     },
                { label: "Accountability",   coaching: "Between sessions? You're on your own.",    bebril: "Daily nudges. Lovingly persistent."                  },
                { label: "Time to clarity",  coaching: "Weeks of exploration",                     bebril: "A clear plan in ~3 minutes"                         },
                { label: "Thinking partner", coaching: "Your coach (when scheduled)",              bebril: "Be Brilliant. Every day. Remembers everything."      },
                { label: "Habit formation",  coaching: "Not really their thing",                   bebril: "Research-backed, behaviourally designed, mildly addictive" },
              ].map(({ label, coaching, bebril }, i) => {
                const isLast = i === 6;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr" }}>
                    <div style={{ padding: "18px 20px 18px 24px", background: "#FAFAF7", borderBottom: isLast ? "none" : `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.ink, margin: 0 }}>{label}</p>
                    </div>
                    <div style={{ padding: "18px 24px", background: "#FAFAF7", borderBottom: isLast ? "none" : `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: "#F3F2F7", border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M2 2l4 4M6 2l-4 4" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </span>
                      <p style={{ fontFamily: T.sans, fontSize: 14, color: C.muted, fontWeight: 400, margin: 0, lineHeight: 1.5 }}>{coaching}</p>
                    </div>
                    <div style={{ padding: "18px 24px", background: "rgba(232,168,32,0.05)", borderBottom: isLast ? "none" : `1px solid rgba(232,168,32,0.12)`, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: C.accentD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(232,168,32,0.2)" }}>
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      <p style={{ fontFamily: T.sans, fontSize: 14, color: C.ink, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{bebril}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="bb-compare-cards" style={{ flexDirection: "column", gap: 12 }}>
              {/* Be Brilliant card header */}
              <div style={{ background: C.accentLL, borderRadius: 16, padding: "18px 20px", border: `1px solid rgba(232,168,32,0.25)` }}>
                <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accentD, margin: "0 0 5px" }}>Your brilliant alternative</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Logo size={18} />
                  <p style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 400, color: C.ink, margin: 0 }}>Be Brilliant</p>
                </div>
              </div>
              {[
                { label: "Cost",             coaching: "$200–$500 / session 💸",                  bebril: "Free to start. Seriously."                           },
                { label: "Availability",     coaching: "Weekly 1-hour sessions",                  bebril: "24/7. Be Brilliant doesn't sleep."                  },
                { label: "Personalization",  coaching: "Depends on your coach's mood",             bebril: "Tailored to your actual answers"                     },
                { label: "Accountability",   coaching: "Between sessions? You're on your own.",    bebril: "Daily nudges. Lovingly persistent."                  },
                { label: "Time to clarity",  coaching: "Weeks of exploration",                     bebril: "A clear plan in ~3 minutes"                         },
                { label: "Thinking partner", coaching: "Your coach (when scheduled)",              bebril: "Be Brilliant. Every day. Remembers everything."      },
                { label: "Habit formation",  coaching: "Not really their thing",                   bebril: "Research-backed, behaviourally designed, mildly addictive" },
              ].map(({ label, coaching, bebril }, i) => (
                <div key={i} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 1px 6px rgba(30,28,40,0.05)" }}>
                  <div style={{ padding: "12px 16px", background: "#F5F3EC", borderBottom: `1px solid ${C.border}` }}>
                    <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.ink, margin: 0 }}>{label}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <div style={{ padding: "14px 16px", background: "#FAFAF7", borderRight: `1px solid ${C.border}` }}>
                      <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, margin: "0 0 5px" }}>Coaching</p>
                      <p style={{ fontFamily: T.sans, fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>{coaching}</p>
                    </div>
                    <div style={{ padding: "14px 16px", background: "rgba(232,168,32,0.06)" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accentD, margin: "0 0 5px" }}>Be Brilliant</p>
                      <p style={{ fontFamily: T.sans, fontSize: 14, color: C.ink, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{bebril}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRODUCT PREVIEW ─────────────────────────────────── */}
      <section aria-label="How it works" style={{ background: C.white, padding: "96px clamp(16px,5vw,40px) 96px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <Label light>The daily experience</Label>
              <h2 style={{ fontFamily: T.serif, fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 400, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                Small steps, taken with care, build great futures.
              </h2>
              <p style={{ fontFamily: T.sans, fontSize: 18, color: C.body, lineHeight: 1.8, fontWeight: 400, maxWidth: 520, margin: "18px auto 0" }}>
                Be Brilliant adapts your career plan and keeps you on track.
              </p>
            </div>
          </FadeIn>

          {/* App frame */}
          <FadeIn delay={80}>
            <div className="sa-dashboard-frame" style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(232,168,32,0.08), 0 4px 16px rgba(232,168,32,0.05)", border: `1.5px solid ${C.border}` }}>
              {/* Browser chrome */}
              <div style={{ background: C.accentLL, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#F0D080","#C8F0D8","#E0D4F8"].map((c,i) => <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
                </div>
                <div style={{ flex: 1, background: "#fff", borderRadius: 50, padding: "4px 12px", marginLeft: 8, maxWidth: 280 }}>
                  <span style={{ fontFamily: T.sans, fontSize: 11, color: C.muted }}>bebril.ai/dashboard</span>
                </div>
              </div>

              {/* Dashboard header, matches actual warm cream header */}
              <div style={{ background: "#FBF5E6", padding: "18px 20px 16px", position: "relative", overflow: "hidden" }}>
                {/* Floating shapes */}
                <div style={{ position: "absolute", top: 6, right: "8%", width: 32, height: 32, borderRadius: 9, background: "#C8F0D8", opacity: 0.55, pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 8, right: "2%", width: 16, height: 16, borderRadius: "50%", background: "#E0D4F8", opacity: 0.5, pointerEvents: "none" }} />
                {/* Top bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <button style={{ background: "none", border: "none", color: "#9494A6", fontFamily: T.sans, fontSize: 10, padding: 0 }}>← Back</button>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["Progress", "Goal map"].map(label => (
                      <div key={label} style={{ background: "rgba(30,30,42,0.04)", border: "1px solid #E0DEF0", borderRadius: 20, padding: "4px 10px", fontFamily: T.sans, fontSize: 10, color: "#3A3A50" }}>{label}</div>
                    ))}
                  </div>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 11, color: "#2A2640", fontWeight: 600, margin: "0 0 3px" }}>Alex's program · Week 1</p>
                <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: "#1E1E2A", margin: "0 0 4px", letterSpacing: -0.3 }}>Build stakeholder visibility</p>
                <p style={{ fontFamily: T.sans, fontSize: 11, color: "#5C5C6E", margin: "0 0 12px" }}><span style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A7830" }}>Goal </span>Get promoted to Senior PM</p>
                {/* Stats pills */}
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { icon: "✦", val: "24", label: "Sparks", bg: "#fff", border: "rgba(200,150,30,0.3)" },
                    { icon: "🔥", val: "3", label: "streak", bg: "rgba(251,191,36,0.12)", border: "rgba(180,140,20,0.2)" },
                    { icon: null, val: "2", label: "this week", bg: "rgba(30,30,42,0.04)", border: "rgba(30,30,42,0.1)" },
                  ].map((p, i) => (
                    <div key={i} style={{ height: 46, padding: "0 10px", borderRadius: 13, background: p.bg, border: `1px solid ${p.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                      {p.icon && <span style={{ fontSize: 12 }}>{p.icon}</span>}
                      <div>
                        <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 800, color: "#1E1E2A", margin: 0, lineHeight: 1 }}>{p.val}</p>
                        <p style={{ fontFamily: T.sans, fontSize: 9, color: "#6E5C3A", margin: 0, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{p.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashboard body */}
              <div style={{ background: C.offWhite, padding: "14px 18px" }}>
                {/* Week day strip */}
                <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 8, color: i === 0 ? C.accentD : "#9494A6", marginBottom: 4, fontWeight: i === 0 ? 700 : 400 }}>{d}</p>
                      <div style={{ height: 26, borderRadius: 8, background: i === 0 ? T.brandL : "#F2F1F4", border: i === 0 ? `2px solid ${C.accentL}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", opacity: i > 1 ? 0.35 : 1 }}>
                        {i === 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.accentD }} />}
                        {i === 1 && <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Task card */}
                <div style={{ background: "#fff", border: "1px solid #E6E4EE", borderRadius: 16, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(26,23,48,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, padding: "3px 9px", background: "#FFE4D4", color: "#9A3D20", border: "1.5px solid #E8A080", borderRadius: 5 }}>Apply</span>
                    <span style={{ fontFamily: T.sans, fontSize: 10, color: "#5C5C6E" }}>30 min</span>
                    <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: C.accentD, marginLeft: "auto" }}>Day 2 · 1 task</span>
                  </div>
                  <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: "#1E1E2A", marginBottom: 6, lineHeight: 1.35 }}>Request a cross-functional meeting with the data team</p>
                  <p style={{ fontFamily: T.sans, fontSize: 11, color: "#5C5C6E", marginBottom: 10, lineHeight: 1.6 }}>Stakeholder visibility starts with showing up in rooms you're not yet in.</p>
                  {/* Steps */}
                  <div style={{ background: "#FFE4D4", borderRadius: 7, padding: "8px 10px" }}>
                    {["Draft a 2-line agenda", "Send the calendar invite", "Prep one insight to share"].map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < 2 ? 6 : 0 }}>
                        <div style={{ width: 13, height: 13, borderRadius: 3, border: "1.5px solid #E8A080", background: "#fff", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontFamily: T.sans, fontSize: 10, color: "#2A2640", lineHeight: 1.4, margin: 0 }}>{s}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mr. Bril box */}
                <div style={{ background: "#FDF8EC", border: "1.5px solid rgba(200,150,30,0.3)", borderRadius: 12, padding: "10px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <MrBrilAvatar size={28} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: "#2A2640", margin: "0 0 2px" }}>Stuck on this one?</p>
                    <p style={{ fontFamily: T.sans, fontSize: 10, color: "#5C5C6E", margin: 0 }}>Talk to Mr. Bril →</p>
                  </div>
                </div>

                {/* Completion */}
                <div style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", border: "1.5px solid #E6E4EE" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "#2A2640", marginBottom: 10, fontWeight: 400 }}>Did you complete today's task?</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "#D49518", color: "#fff", borderRadius: 50, padding: "8px 0", fontFamily: T.sans, fontSize: 11, fontWeight: 700, textAlign: "center" }}>Yes, done</div>
                    <div style={{ flex: 0.6, background: C.offWhite, color: "#5C5C6E", border: "1px solid rgba(30,30,42,0.18)", borderRadius: 50, padding: "8px 0", fontFamily: T.sans, fontSize: 11, textAlign: "center" }}>Not today</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section aria-label="Get started" style={{
        background: C.accentLL,
        padding: "96px clamp(16px,5vw,40px)",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 30, right: "12%", width: 50, height: 50, borderRadius: 12, background: C.lemon, pointerEvents: "none", opacity: 0.45, animation: "float1 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: 40, left: "8%", width: 36, height: 36, borderRadius: "50%", background: C.lavender, pointerEvents: "none", opacity: 0.5, animation: "float2 7s ease-in-out infinite 1s" }} />
        <div style={{ position: "absolute", top: "50%", left: "5%", width: 24, height: 24, borderRadius: 6, background: C.sky, pointerEvents: "none", opacity: 0.4, animation: "float3 5s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "25%", right: "6%", width: 18, height: 18, borderRadius: "50%", background: C.peach, pointerEvents: "none", opacity: 0.5, animation: "sparkle 4s ease-in-out infinite 0.5s" }} />
        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <div style={{ fontSize: 48, marginBottom: 20, animation: "wiggle 2s ease-in-out infinite" }}>✦</div>
            <h2 style={{ fontFamily: T.serif, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 400, color: C.ink, lineHeight: 1.1, letterSpacing: "-1px", marginBottom: 20 }}>
              Ready to be <span style={{ color: C.accentD, fontStyle: "italic" }}>brilliant</span>?
            </h2>
            <p style={{ fontFamily: T.sans, fontSize: 19, color: C.body, fontWeight: 400, lineHeight: 1.75, marginBottom: 40, maxWidth: 480, margin: "0 auto 44px" }}>
              Get a clear, personalized career plan in minutes, worst case you learn something about yourself.
            </p>
            <button onClick={onStart} className="sa-btn-primary" style={{ fontSize: 16, padding: "16px 44px" }}>
              Get my plan (it's free) →
            </button>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: C.offWhite, borderTop: `1px solid ${C.border}`, padding: "32px clamp(16px,5vw,40px)" }}>
        <div className="sa-footer-inner" style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img src={LOGO_SRC} alt="Be Brilliant" width={24} height={24} style={{ borderRadius: 5, display: "block" }} />
            <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>Be Brilliant</span>
          </div>
          <span style={{ fontFamily: T.sans, fontSize: 15, color: C.muted, fontWeight: 400 }}>
            Turns out it's mostly structure
          </span>
        </div>
      </footer>

    </div>
  );
}


// ─── Quiz , Lovable-style clean cards ───────────────────
function QuizScreen({ onComplete, onBack }) {
  useSEO({ title: "Career Assessment", description: "Take a 3-minute career assessment to get your personalised Be Brilliant program. 7 questions, zero fluff.", path: "/quiz", noIndex: true });
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const answersRef = React.useRef({});
  React.useLayoutEffect(() => { answersRef.current = answers; }, [answers]);
  const [fade, setFade] = useState(true);
  // showingSubRole: true when we're on the sub-role question (between Q1 and Q2)
  const [showingSubRole, setShowingSubRole] = useState(false);
  const [showProfileMoment, setShowProfileMoment] = useState(false);
  const [showingGoalDetail, setShowingGoalDetail] = useState(false);
  const [showingGoalDirection, setShowingGoalDirection] = useState(false);
  const [history, setHistory] = useState([]); // stack of {current, showingSubRole, showingGoalDetail, showingGoalDirection}

  const roleIdx = answers.role;
  const hasSubRole = roleIdx !== undefined && ROLES_WITH_SUBROLE.has(roleIdx);
  const subRoleDef = hasSubRole ? SUB_ROLE_QUESTIONS[roleIdx] : null;

  // Effective question: either the sub-role or the normal question
  const currentGoalDetailQ = GOAL_DETAIL_QUESTIONS[answers.goal];
  const q = showingGoalDirection ? { ...GOAL_DIRECTION_QUESTION, label: "6c of 7" } : showingGoalDetail ? { ...currentGoalDetailQ, label: "6b of 7" } : showingSubRole ? { ...subRoleDef, id: "role_detail", type: "single" } : questions[current];
  if (!q) return null;

  // Total steps for progress: questions.length + 1 if this role has a sub-role and it hasn't been answered
  const totalSteps = questions.length + (hasSubRole ? 1 : 0);
  const pct = Math.round(((current + (showingSubRole ? 1 : 0)) / totalSteps) * 100);

  const canProceed = () => {
    if (q.type === "multi") return (answers[q.id] || []).length > 0;
    if (q.type === "slider") return answers[q.id] !== undefined && answers[q.id] !== 50;
    if (q.type === "text") return q.optional ? true : (answers[q.id] || "").trim().length > 0;
    if (q.id === "goal") return answers[q.id] !== undefined || !!(answers.goal_custom?.trim());
    return answers[q.id] !== undefined;
  };

  const go = (dir, newRoleIdx) => {
    setFade(false);
    setTimeout(() => {
      if (dir === 1) {
        setHistory(h => [...h, { current, showingSubRole, showingGoalDetail, showingGoalDirection }]);

        const effectiveRoleIdx = newRoleIdx !== undefined ? newRoleIdx : roleIdx;
        const effectiveHasSubRole = effectiveRoleIdx !== undefined && ROLES_WITH_SUBROLE.has(effectiveRoleIdx);

        if (current === 1 && !showingSubRole && effectiveHasSubRole && answers.role_detail === undefined) {
          setShowingSubRole(true); setFade(true); return;
        }
        if (showingSubRole) {
          setShowingSubRole(false); setCurrent(2); setFade(true); return;
        }
        if (current === 5 && !showingGoalDetail && !answers.goal_custom && GOAL_DETAIL_QUESTIONS[answers.goal] && answers.goal_detail === undefined) {
          setShowingGoalDetail(true); setFade(true); return;
        }
        if (showingGoalDetail) {
          setShowingGoalDetail(false);
          const needsDir = NEEDS_DIRECTION[answers.goal]?.includes(answers.goal_detail);
          if (needsDir && answers.goal_direction === undefined) {
            setShowingGoalDirection(true); setFade(true); return;
          }
          setCurrent(c => c + 1); setFade(true); return;
        }
        if (showingGoalDirection) {
          setShowingGoalDirection(false); setCurrent(c => c + 1); setFade(true); return;
        }
        // If we're on the last question, complete the quiz instead of advancing
        if (current >= questions.length - 1) {
          onComplete(answers);
          return;
        }
        setCurrent(c => c + 1);
      } else {
        // Pop last position from history
        setHistory(h => {
          if (h.length === 0) { onBack(); return h; }
          const prev = h[h.length - 1];
          setCurrent(prev.current);
          setShowingSubRole(prev.showingSubRole);
          setShowingGoalDetail(prev.showingGoalDetail);
          setShowingGoalDirection(prev.showingGoalDirection);
          return h.slice(0, -1);
        });
      }
      setFade(true);
    }, 180);
  };
  const toggleMulti = (id, i) => {
    const cur = answers[id] || [];
    const idx = cur.indexOf(i);
    setAnswers({ ...answers, [id]: idx === -1 ? [...cur, i] : cur.filter(x => x !== i) });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite }}>
      {/* Progress bar */}
      <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: T.brand, transition: "width 0.4s ease", borderRadius: 2 }} />
      </div>

      <div style={{ maxWidth: 580, margin: "0 auto", padding: "clamp(24px,5vw,40px) clamp(16px,4vw,24px) 100px" }}>
        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
          <button onClick={() => go(-1)} style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 14, color: T.muted, cursor: "pointer", padding: 0 }}>
            ← Back
          </button>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(232,168,32,0.08)", border: "1px solid rgba(232,168,32,0.15)", borderRadius: 100, padding: "5px 12px" }}>
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.brandD }}>{showingSubRole ? "1b" : current + 1} of {questions.length}</span>
            <span style={{ fontSize: 12 }}>{pct >= 80 ? "🔥" : "·"}</span>
          </div>
        </div>

        {/* Fun encouragement per question, chip style */}
        {current === 0 && !showingSubRole && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>Let's start easy</p>}
        {current === 3 && !showingSubRole && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>The honest one, no wrong answer</p>}
        {current === 5 && !showingSubRole && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>Almost there, this shapes everything</p>}
        {current === 6 && !showingSubRole && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>Last one</p>}

        <div style={{ opacity: fade ? 1 : 0, transform: fade ? "translateY(0)" : "translateY(10px)", transition: "all 0.18s ease" }}>
          {/* Question */}
          <h2 style={{ fontFamily: T.sans, fontSize: "clamp(22px,4vw,27px)", fontWeight: 600, lineHeight: 1.4, color: T.ink, margin: "0 0 8px", letterSpacing: -0.3 }}>{q.text}</h2>
          {q.type === "multi" && <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: "0 0 28px" }}>Pick all that apply, be greedy.</p>}
          {q.type !== "multi" && <div style={{ marginBottom: 32 }} />}

          {/* TEXT INPUT, for name */}
          {q.type === "text" && (
            <div>
              <input
                type="text"
                placeholder={q.placeholder || "Type here..."}
                value={answers[q.id] || ""}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter" && (answers[q.id] || "").trim()) go(1); }}
                autoFocus
                style={{
                  width: "100%", padding: "18px 22px",
                  border: `1.5px solid ${(answers[q.id] || "").trim() ? T.brand : T.border}`,
                  background: "#fff",
                  borderRadius: 16, fontFamily: T.sans, fontSize: 22, fontWeight: 500,
                  color: T.ink, outline: "none", boxSizing: "border-box", letterSpacing: -0.3,
                  boxShadow: "0 2px 8px rgba(30,30,42,0.04)",
                  transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                }}
              />
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "12px 0 0" }}>Hit Enter when you're ready</p>
            </div>
          )}

          {/* DROPDOWN SELECT, for long lists like professions */}
          {q.type === "dropdown" && (
            <div>
              <div style={{ position: "relative" }}>
                <select
                  value={answers[q.id] !== undefined ? answers[q.id] : ""}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    const newAnswers = { ...answers, [q.id]: val };
                    setAnswers(newAnswers);
                    // For role question (Q1), pass new index so go() can check sub-role correctly
                    setTimeout(() => go(1, q.id === 'role' ? val : undefined), 220);
                  }}
                  style={{
                    width: "100%", padding: "18px 44px 18px 22px",
                    border: answers[q.id] !== undefined ? `1.5px solid ${T.brandD}` : `1.5px solid ${T.border}`,
                    background: answers[q.id] !== undefined ? T.brandD : "#fff",
                    borderRadius: 16, fontFamily: T.sans, fontSize: 15,
                    color: answers[q.id] !== undefined ? "#fff" : T.ink,
                    cursor: "pointer", outline: "none", appearance: "none",
                    WebkitAppearance: "none", lineHeight: 1.4,
                    boxShadow: "0 2px 8px rgba(30,30,42,0.04)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}>
                  <option value="" disabled style={{ background: "#fff", color: T.ink }}>Select your field...</option>
                  {q.options.map((opt, i) => (
                    <option key={i} value={i} style={{ background: "#fff", color: "#1E1E2A" }}>{opt.text}</option>
                  ))}
                </select>
                <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.muted }}>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
              </div>
              {answers[q.id] !== undefined && q.options[answers[q.id]]?.sub && (
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: "10px 0 0", lineHeight: 1.6 }}>{q.options[answers[q.id]].sub}</p>
              )}
            </div>
          )}

          {/* SINGLE SELECT */}
          {q.type === "single" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Custom goal, shown first on goal question */}
              {q.id === "goal" && (
                <div style={{ marginBottom: 20 }}>
                  <textarea
                    value={answers.goal_custom || ""}
                    onChange={e => {
                      const val = e.target.value;
                      const next = { ...answersRef.current, goal_custom: val || undefined, goal: val.trim() ? (answersRef.current.goal ?? 0) : answersRef.current.goal };
                      answersRef.current = next;
                      setAnswers(next);
                    }}
                    rows={3}
                    placeholder="e.g. Land a new role by end of April, get promoted before my review..."
                    style={{
                      width: "100%", padding: "18px 20px",
                      border: answers.goal_custom ? `1.5px solid ${T.brand}` : `1.5px solid ${T.border}`,
                      borderRadius: 16, fontFamily: T.sans, fontSize: 15,
                      color: T.ink, outline: "none",
                      background: "#fff",
                      lineHeight: 1.5, boxSizing: "border-box",
                      boxShadow: "0 2px 8px rgba(30,30,42,0.04)",
                      transition: "border-color 0.15s, background 0.15s",
                      resize: "none",
                    }}
                  />
                  <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: "10px 0 0", lineHeight: 1.6 }}>
                    The more specific you are, the more precisely every task gets built around what you're actually trying to do.
                  </p>
                  {answers.goal_custom?.trim() && (
                    <button onClick={() => go(1)}
                      style={{ marginTop: 12, background: T.brand, color: "#fff", border: "none", borderRadius: 50, padding: "12px 28px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(232,168,32,0.25)" }}>
                      Continue →
                    </button>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 16px" }}>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.muted, whiteSpace: "nowrap" }}>or pick the closest</span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                  </div>
                </div>
              )}

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt, i) => {
                const sel = !answers.goal_custom?.trim() && answers[q.id] === i;
                return (
                  <button key={i} onClick={() => { setAnswers({ ...answers, [q.id]: i, ...(q.id === "goal" ? { goal_custom: undefined } : {}) }); setTimeout(() => go(1), 180); }}
                    style={{
                      textAlign: "left", padding: "18px 22px",
                      border: sel ? `1.5px solid ${T.brand}` : `1.5px solid ${T.border}`,
                      background: sel ? T.brandD : "#fff",
                      borderRadius: 14, cursor: "pointer", transition: "all 0.15s", width: "100%",
                      boxShadow: sel ? "0 2px 12px rgba(232,168,32,0.2)" : "0 1px 4px rgba(30,30,42,0.03)",
                    }}>
                    <div style={{ fontFamily: T.sans, fontSize: 16, color: sel ? "#fff" : T.black, fontWeight: sel ? 600 : 400, lineHeight: 1.4 }}>{opt.text}</div>
                  </button>
                );
              })}
              </div>

            </div>
          )}

          {/* MULTI SELECT , card style with checkboxes */}
          {q.type === "multi" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt, i) => {
                const sel = (answers[q.id] || []).includes(i);
                return (
                  <button key={i} onClick={() => toggleMulti(q.id, i)}
                    style={{
                      textAlign: "left", padding: "18px 20px",
                      border: sel ? `1.5px solid ${T.brand}` : `1.5px solid ${T.border}`,
                      borderRadius: 14,
                      background: sel ? T.brandD : "#fff",
                      cursor: "pointer", transition: "all 0.15s", width: "100%",
                      display: "flex", alignItems: "center", gap: 14,
                      boxShadow: sel ? "0 2px 12px rgba(232,168,32,0.2)" : "0 1px 4px rgba(30,30,42,0.03)",
                    }}>
                    {/* Round checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: sel ? `none` : `1.5px solid #C0C0CC`,
                      background: sel ? T.brand : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.12s",
                    }}>
                      {sel && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontFamily: T.sans, fontSize: 16, color: sel ? "#fff" : T.black, fontWeight: sel ? 600 : 400, lineHeight: 1.4 }}>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* SLIDER */}
          {q.type === "slider" && (() => {
            const val = answers[q.id] ?? 50;
            const isLeft = val < 50; const isRight = val > 50;
            const pctFill = val;
            return (
              <div>
                <style>{`
                  .bb-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; outline: none; cursor: pointer; }
                  .bb-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: linear-gradient(to right, ${T.brand} 0%, ${T.brand} ${pctFill}%, ${T.border} ${pctFill}%, ${T.border} 100%); }
                  .bb-slider::-moz-range-track { height: 6px; border-radius: 3px; background: ${T.border}; }
                  .bb-slider::-moz-range-progress { height: 6px; border-radius: 3px; background: ${T.brand}; }
                  .bb-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2.5px solid ${T.brand}; margin-top: -8px; box-shadow: 0 2px 8px rgba(232,168,32,0.25); transition: box-shadow 0.15s; }
                  .bb-slider::-webkit-slider-thumb:hover { box-shadow: 0 3px 14px rgba(232,168,32,0.35); }
                  .bb-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2.5px solid ${T.brand}; box-shadow: 0 2px 8px rgba(232,168,32,0.25); cursor: pointer; }
                `}</style>
                <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                  {[{ data: q.left, active: isLeft, click: 25 }, { data: q.right, active: isRight, click: 75 }].map(({ data, active, click }, si) => (
                    <button key={si} onClick={() => setAnswers({ ...answers, [q.id]: click })}
                      style={{ flex: 1, textAlign: "left", padding: "20px 20px", background: active ? T.brandD : "#fff", border: active ? `1.5px solid ${T.brandD}` : `1.5px solid ${T.border}`, borderRadius: 14, cursor: "pointer", transition: "all 0.15s", boxShadow: active ? "0 2px 12px rgba(232,168,32,0.2)" : "0 1px 4px rgba(30,30,42,0.03)" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 16, fontWeight: active ? 700 : 500, color: active ? "#fff" : T.black, margin: "0 0 4px", lineHeight: 1.3 }}>{data.text}</p>
                      <p style={{ fontFamily: T.sans, fontSize: 14, color: active ? "rgba(255,255,255,0.75)" : T.muted, margin: 0, lineHeight: 1.5 }}>{data.desc}</p>
                    </button>
                  ))}
                </div>
                <div style={{ padding: "0 4px" }}>
                  <input type="range" min={0} max={100} value={val} className="bb-slider"
                    onChange={e => { let v = parseInt(e.target.value); if (v >= 42 && v <= 58) v = v < 50 ? 41 : 59; setAnswers({ ...answers, [q.id]: v }); }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, letterSpacing: "0.03em", color: isLeft ? T.brandD : "#ADADB8" }}>← Strongly</span>
                    <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, letterSpacing: "0.03em", color: isRight ? T.brandD : "#ADADB8" }}>Strongly →</span>
                  </div>
                </div>
                {val === 50 && <p style={{ fontFamily: T.sans, fontSize: 15, color: T.brandD, marginTop: 14, textAlign: "center" }}>Pick a side , you can't stay in the middle.</p>}
              </div>
            );
          })()}
        </div>

        {/* Continue , always shown, active when answered */}
        <div style={{ marginTop: 40, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => {
              if (!canProceed()) return;
              if (current === questions.length - 1) {
                // Call onComplete directly and synchronously, answers is current at this render
                onComplete(answers);
              } else {
                go(1);
              }
            }}
            disabled={!canProceed()}
            style={{
              background: canProceed() ? T.brandD : "#E8E8E8",
              color: canProceed() ? "#fff" : "#AAA",
              border: "none", fontFamily: T.sans, fontSize: 16, fontWeight: 700,
              padding: "16px 48px", borderRadius: 50,
              cursor: canProceed() ? "pointer" : "default", transition: "all 0.2s",
              boxShadow: canProceed() ? "0 4px 16px rgba(180,130,10,0.3)" : "none",
              letterSpacing: -0.2,
            }}>
            {current < questions.length - 1 ? "Continue →" : "See my plan ✦"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Interstitial ─────────────────────────────────────────
// ─── Personalised Profile Bullets ────────────────────────────────────────────
// Generates 3-4 character-driven trait bullets from the user's actual answers.
// Each bullet reads as an observation about who they are, not a feature of their plan.
function generatePersonalisedBullets(plan) {
  const answers = plan._answers || {};
  const bullets = [];

  // ── 1. Seniority + goal in one sentence ──
  const seniorityTexts = [
    "early in your career",
    "established and growing",
    "senior-level",
    "in a leadership position",
    "at executive level",
  ];
  const senText = seniorityTexts[answers.seniority] || null;
  const goalText = answers.goal_custom?.trim()
    || GOAL_TEXTS[answers.goal]?.charAt(0).toLowerCase() + (GOAL_TEXTS[answers.goal]?.slice(1) || "")
    || null;

  if (senText && goalText) {
    bullets.push(`You're ${senText}, and your goal is to ${goalText}.`);
  } else if (goalText) {
    bullets.push(`Your goal is to ${goalText}.`);
  }

  // ── 2. What's driving this ──
  const urgencySentences = [
    "AI is moving faster than you are, and you want to close the gap.",
    "You feel stuck and need a change, and you're ready to make it happen.",
    "A layoff made you rethink your path, and you're choosing what comes next.",
    "You want a promotion or a better role, and you need something real to show for it.",
    "You want to move to a new company and need a plan to get there.",
    "You want to switch fields entirely, a real change in direction.",
    "You're keen on exploring new opportunities and want a structured way to do it.",
    "There's no external pressure driving this, you're here because you decided to be.",
  ];
  if (answers.urgency !== undefined && urgencySentences[answers.urgency]) {
    bullets.push(urgencySentences[answers.urgency]);
  }

  // ── 3. What gets in the way ──
  const blockerSentences = {
    0: "Your days are already full, time is the real constraint, not motivation.",
    1: "There's too much information and not enough clarity on where to start.",
    2: "You've started things before but lost the thread, follow-through has been the gap.",
    3: "You learn plenty, but applying it to actual work is where things stall.",
    4: "Too many possible directions, or none that feel right, you need a filter, not more options.",
  };
  const bArr = Array.isArray(answers.blocker) ? answers.blocker : (answers.blocker != null ? [answers.blocker] : []);
  if (bArr.length === 1 && blockerSentences[bArr[0]]) {
    bullets.push(blockerSentences[bArr[0]]);
  } else if (bArr.length > 1) {
    const parts = bArr.map(i => {
      const labels = ["not enough time", "too much information", "starting but not following through", "learning without applying", "direction paralysis"];
      return labels[i];
    }).filter(Boolean);
    if (parts.length) {
      bullets.push(`The things that usually get in your way: ${parts.join(", ")}.`);
    }
  }

  return bullets.slice(0, 3);
}

function ResultsScreen({ plan, brilInsight, onRestart, onDashboard }) {
  useSEO({ title: `Your Profile: ${plan.profileName || "Results"}`, description: `You're ${plan.profileName}. See your personalised 8-week career development plan from Be Brilliant.`, path: "/results", noIndex: true });
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const n = plan.narrative;
  const displayExposure = plan.aiExposureCommentary || null;
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const tagColors = {
    "Apply":   { bg: "#FFE4D4", text: "#9A3D20", border: "#E8A080" },
    "Reflect": { bg: "#F4EDF8", text: "#6B3880", border: "#CCAADC" },
    "Read":    { bg: "#E8F0FF", text: "#3355AA", border: "#A8C0F0" },
    "Tool":    { bg: "#E6F5EE", text: "#2A6B45", border: "#90CCA8" },
  };

  // Compute a simple exposure score (0–100) from taskAnalysis
  const avgScore = plan.taskAnalysis.length > 0
    ? Math.round(plan.taskAnalysis.reduce((s, t) => s + t.score, 0) / plan.taskAnalysis.length)
    : null;
  const exposureLabel = avgScore == null ? null
    : avgScore >= 65 ? `High exposure (${avgScore}/100)`
    : avgScore >= 40 ? `Significant exposure (${avgScore}/100)`
    : `Moderate exposure (${avgScore}/100)`;
  const exposureColor = avgScore == null ? T.muted
    : avgScore >= 65 ? "#C05621"
    : avgScore >= 40 ? "#92400E"
    : "#0F6E56";
  const exposureBorderColor = avgScore == null ? T.border
    : avgScore >= 65 ? "#FED7AA"
    : avgScore >= 40 ? "#FEF3C7"
    : "#A7F3D0";
  const exposureBg = avgScore == null ? "#fff"
    : avgScore >= 65 ? "#FFF7ED"
    : avgScore >= 40 ? "#FFFBEB"
    : "#ECFDF5";

  return (
    <div style={{ background: C.offWhite, opacity: visible ? 1 : 0, transition: "opacity 0.5s" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(24px, 5vw, 52px) clamp(16px, 4vw, 24px) 80px" }}>

        {/* ── PROFILE BADGE ── */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "pop 0.5s ease" }}>
          <div style={{ display: "inline-block", width: "100%", maxWidth: 400, padding: "26px 26px 22px", background: T.brandL, border: `1.5px solid ${T.brandMid}`, borderRadius: 20, boxShadow: T.shadow, position: "relative", overflow: "hidden" }}>
            {/* Floating shapes */}
            <div style={{ position: "absolute", top: 8, right: "8%", width: 36, height: 36, borderRadius: 10, background: T.brandMid, pointerEvents: "none", opacity: 0.3, animation: "float1 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: "40%", right: "2%", width: 18, height: 18, borderRadius: "50%", background: T.brand, pointerEvents: "none", opacity: 0.2, animation: "sparkle 4s ease-in-out infinite 1s" }} />
            <div style={{ position: "absolute", bottom: 10, left: "5%", width: 24, height: 24, borderRadius: 7, background: T.brandMid, pointerEvents: "none", opacity: 0.25, animation: "float2 7s ease-in-out infinite 0.5s" }} />
            <div style={{ position: "absolute", top: 10, left: "18%", width: 14, height: 14, borderRadius: "50%", background: T.brand, pointerEvents: "none", opacity: 0.2, animation: "sparkle 3.5s ease-in-out infinite 2s" }} />
            {plan.name && (
              <p style={{ fontFamily: T.serif, fontSize: "clamp(26px, 4.5vw, 34px)", fontWeight: 400, color: T.ink, margin: "0 0 4px", lineHeight: 1.15, letterSpacing: -0.3, position: "relative", zIndex: 1 }}>{plan.name.trim()}</p>
            )}
            <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.brandD, margin: 0, position: "relative", zIndex: 1 }}>your brilliant profile</p>
          </div>
        </div>

        {/* ── WHY THIS PROGRAM + WEEK ARC ── */}
        {/* ── PERSONALISED TRAITS ── */}
        {(() => {
          const bullets = generatePersonalisedBullets(plan);
          if (!bullets.length) return null;
          return (
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 28, boxShadow: T.shadow }}>
              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.brandD, margin: "0 0 16px" }}>What we picked up on 👀</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {bullets.map((b, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{
                      flexShrink: 0, marginTop: 4,
                      width: 6, height: 6, borderRadius: "50%",
                      background: T.brand, display: "inline-block",
                    }} />
                    <span style={{ fontFamily: T.sans, fontSize: 15, color: T.ink, lineHeight: 1.7 }}>{b}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: T.sans, fontSize: 16, color: T.body, margin: "18px 0 0", lineHeight: 1.55, fontStyle: "italic" }}>
                We've tweaked everything to match. You'll see.
              </p>
            </div>
          );
        })()}

        {/* ── WHAT MR. BRIL PICKED UP (from intro conversation) ── */}
        {brilInsight && (
          <div style={{ marginBottom: 28, background: "#fff", borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: T.shadow }}>
            <div style={{ padding: "16px 20px", background: "rgba(232,168,32,0.06)", borderBottom: `1px solid rgba(232,168,32,0.12)`, display: "flex", alignItems: "center", gap: 12 }}>
              <MrBrilAvatar size={28} />
              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.brandD, margin: 0 }}>What Mr Bril picked up</p>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: 0, lineHeight: 1.65, fontStyle: "italic" }}>"{brilInsight}"</p>
            </div>
          </div>
        )}

        {/* ── WHY THIS PROGRAM, API-generated week arc only ── */}
        {(() => {
          const arc = plan.weekArc || {};
          // Need at least 2 ability sentences
          if (!arc.a1 || !arc.a2) return null;

          const goalTexts = GOAL_TEXTS;
          const goalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];

          // If deadline is ≤2 weeks, only show 2 steps; otherwise show up to 3
          const deadlineDays = plan._goalDeadline ? Math.max(0, Math.ceil((new Date(plan._goalDeadline) - new Date()) / 86400000)) : null;
          const maxSteps = (deadlineDays !== null && deadlineDays <= 14) ? 2 : 3;
          const steps = [
            { label: "Week 1", text: arc.a1 },
            { label: "Week 2", text: arc.a2 },
            ...(maxSteps >= 3 && arc.a3 ? [{ label: "Week 3", text: arc.a3 }] : []),
          ];

          return (
            <div style={{ marginBottom: 28, background: "#fff", borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: T.shadow }}>
              <div style={{ padding: "18px 20px", background: T.sageL, borderBottom: `1px solid ${T.sage}` }}>
                <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.sageD, margin: "0 0 8px" }}>Why this program</p>
                {goalText && <p style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, margin: 0, lineHeight: 1.5, fontWeight: 400, fontStyle: "italic" }}>{goalText}</p>}
              </div>
              <div style={{ padding: "4px 20px 8px", display: "flex", flexDirection: "column" }}>
                {steps.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "13px 0", borderBottom: i < steps.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ minWidth: 52, flexShrink: 0 }}>
                      <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: T.brandD, display: "block", paddingTop: 2 }}>{w.label}</span>
                    </div>
                    <p style={{ fontFamily: T.sans, fontSize: 16, color: T.body, margin: 0, lineHeight: 1.65 }}>{w.text}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── EMAIL CTA ── */}
        <div style={{ background: "#fff", borderRadius: 24, padding: "clamp(28px,5vw,44px) clamp(20px,4vw,32px)", textAlign: "center", marginBottom: 28, position: "relative", overflow: "hidden", border: `2px solid ${T.brand}`, boxShadow: "0 8px 40px rgba(232,168,32,0.12), 0 0 0 4px rgba(232,168,32,0.06)" }}>
          {/* Warm ambient glow behind content */}
          <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 350, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,168,32,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
          {/* Floating shapes, warm brand tones */}
          <div style={{ position: "absolute", top: 14, right: "7%", width: 36, height: 36, borderRadius: 10, background: T.brandMid, pointerEvents: "none", opacity: 0.2, animation: "float1 6s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: 18, left: "5%", width: 24, height: 24, borderRadius: "50%", background: T.brand, pointerEvents: "none", opacity: 0.15, animation: "sparkle 4s ease-in-out infinite 1.2s" }} />
          <div style={{ position: "absolute", top: "50%", right: "3%", width: 14, height: 14, borderRadius: 4, background: T.brandMid, pointerEvents: "none", opacity: 0.2, animation: "float2 7s ease-in-out infinite 0.8s" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
          {!submitted ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 16 }}>✦</div>
              <h2 style={{ fontFamily: T.serif, fontSize: "clamp(24px,4vw,32px)", fontWeight: 400, color: T.ink, margin: "0 0 10px", lineHeight: 1.2, letterSpacing: -0.4 }}>
                Ready to start?
              </h2>
              <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: "0 0 28px", lineHeight: 1.65 }}>
                Your daily program gets smarter as you progress.
              </p>
              <button
                onClick={() => { setSubmitted(true); setTimeout(() => onDashboard && onDashboard(Date.now()), 1500); }}
                style={{
                  width: "100%", maxWidth: 400,
                  background: T.brand,
                  color: "#1E1E2A",
                  border: "none", fontFamily: T.sans, fontSize: 17, fontWeight: 700,
                  padding: "17px 0", borderRadius: 50, cursor: "pointer",
                  letterSpacing: -0.3, transition: "all 0.2s",
                  boxShadow: "0 4px 20px rgba(232,168,32,0.3)",
                }}>
                Start my program →
              </button>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0", animation: "fadeIn 0.4s ease" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
              <p style={{ fontFamily: T.serif, fontSize: 24, color: T.ink, margin: "0 0 8px", fontWeight: 400 }}>Brilliant. Let's do this.</p>
              <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: 0 }}>Building your dashboard...</p>
            </div>
          )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: "center" }}>
          <button onClick={onRestart} style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.muted, cursor: "pointer", textDecoration: "underline" }}>
            Start over
          </button>
        </div>

      </div>
    </div>
  );
}


// ─── AI Task Generation ────────────────────────────────────
// Diagnostic: last error from AI task generation (read by GeneratingScreen)
let _lastAITaskError = "";

async function generateAITasks(answers, auditTasks, classification, profileData, templateTasks) {
  const get = (id, idx) => { const q = Q(id); return q?.options?.[idx]?.text || "unknown"; };
  const getMulti = (id) => {
    const q = Q(id); if (!q || !answers[id]) return [];
    return (answers[id] || []).map(i => q.options[i]?.text).filter(Boolean);
  };

  // ── Full quiz context ────────────────────────────────────
  const roleDetailText = answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role]
    ? SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || ""
    : "";

  const timePref = "30 min"; // default, time question removed

  const ctx = {
    name:              answers.name || "",
    role:              get("role", answers.role),
    role_detail:       roleDetailText,
    seniority:         get("seniority", answers.seniority),
    readiness_level:   classification.readinessLevel || "medium",
    time_available:    "30 min",
    goal_detail:       answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[answers.goal])?.options?.[answers.goal_detail]?.text || "") : "",
    goal_direction:    (answers.goal_direction || "").trim(),
    career_situation:  "not specified",
    urgency:           get("urgency", answers.urgency),
    concern:           normalizeBlocker(answers.blocker).map(b => get("blocker", b)).filter(Boolean).join("; ") || "not specified",
    goal:              answers.goal_custom || get("goal", answers.goal),
    blocker:           normalizeBlocker(answers.blocker).map(b => get("blocker", b)).filter(Boolean).join("; ") || "not specified",
    ultimate_why:      (() => {
      if (answers.goal_custom) return answers.goal_custom;
      const fromGoal = ["land a role that's actually a level up", "move to a company that fits where they want to go", "make a real pivot into new work", "build the skills that keep them relevant as AI reshapes what the job requires", "feel genuinely solid and confident, not performing it, actually there"];
      return fromGoal[answers.goal] || "";
    })(),
    style:             answers.style_outcome_process < 30 ? "strongly action-oriented , skip context, give me the move"
                     : answers.style_outcome_process < 50 ? "action-leaning , prefers doing over reading"
                     : answers.style_outcome_process > 70 ? "strongly context-oriented , needs to understand before acting"
                     : "context-leaning , wants enough landscape to act with confidence",
    validation:        "not specified",
    learn_style:       "not specified",
    already_tried:     "nothing yet",
    audit_tasks:       (auditTasks || []).filter(t => t && t.trim().length > 3),
  };

  // ── Profile attributes ────────────────────────────────────
  const {
    profileName, readinessLevel, orientation, approachStyle, behavioralStyle,
    isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    isExternallyMotivated, isInternallyMotivated,
    isActionOriented, isUnderstandingOriented,
  } = classification;

  // Build a plain-English description of the active pattern flags
  const activePatterns = [
    isAnxietyDriven        && "Anxiety-driven: feeling outpaced by younger people, goal is to feel confident , motivation is emotional, not strategic",
    isCredibilityDefender  && "Credibility defender: senior professional, primary fear is erosion of professional credibility built over years",
    hasTheoryGap           && "Theory-practice gap: consumes content (courses, newsletters) but blocker is that learning doesn't convert to actual work practice",
    isHighCommitmentBeginner && "Motivated beginner: hasn't started yet but genuinely wants to move. Has the intent, needs the direction and a concrete first step",
    isPureNavigator        && "Pure navigator: wants to understand what's changing well enough to make decisions for others (team/business), strategic clarity problem, not a personal fluency problem",
  ].filter(Boolean);

  // Profile copy context
  const profileCopy = {
    headline:    profileData?.headline   || "",
    description: profileData?.description || "",
    entryPoint:  profileData?.entryPoint  || "",
    voice:       profileData?.voice       || "peer",
    pacing:      profileData?.pacing      || "momentum",
    taskEmphasis: profileData?.taskEmphasis || "apply",
  };

  const hasAudit = ctx.audit_tasks.length > 0;

  // Template tasks , structural baseline with role/level specificity
  const templateSummary = (templateTasks || []).slice(0, 3).map((t, i) =>
    `${i + 1}. [${t.tag}] "${t.title}" , ${t.desc?.slice(0, 120) || ""}...`
  ).join("\n");

  // ── Prompt: audit path ────────────────────────────────────
  const promptWithAudit = `You are generating exactly ONE personalized career development task (Day 1) for a specific professional. They described their actual work, reference it directly and specifically.
${TODAY_CONTEXT()}

═══ THEIR CAREER SITUATION ═══

What they're looking to change: ${ctx.urgency || "not specified"}
Biggest concern: "${ctx.concern}"
Goal: "${ctx.goal}"
Ultimate motivation: "${ctx.ultimate_why}"

═══ WHO THEY ARE ═══

Role: ${ctx.role}${ctx.role_detail ? ` (${ctx.role_detail})` : ""}
Seniority: ${ctx.seniority}
Readiness level: ${ctx.readiness_level}
Main blocker to making progress: "${ctx.blocker}"
Action vs. understanding preference: ${ctx.style}
External vs. internal motivation: ${ctx.validation}


═══ THEIR PROFILE ═══

Profile name: ${profileName}
Readiness level: ${readinessLevel}
Orientation: ${orientation} (optimizer = growth/advance · protector = defend position · navigator = lead/understand for others)
Approach style: ${approachStyle}
Behavioral style: ${behavioralStyle}

Profile headline (the framing they just read about themselves):
"${profileCopy.headline}"

Profile description (what they understand about their situation):
"${profileCopy.description}"

Suggested entry point (their first move):
"${profileCopy.entryPoint}"

Task emphasis for this profile: ${profileCopy.taskEmphasis} (prefer tasks of this type)
Narrative voice: ${profileCopy.voice} (peer = collegial, advisor = authoritative, coach = energizing, guide = gentle, honest = direct, evidence = credibility-first)
Pacing: ${profileCopy.pacing} (dense = pack it in, deep = go slow and thorough, momentum = keep moving, progressive = build step by step, deliberate = careful, gentle = reassuring, earned = trust must be built)

${activePatterns.length > 0 ? `Active psychological patterns that MUST shape the tasks:\n${activePatterns.map(p => "• " + p).join("\n")}` : ""}

═══ THEIR ACTUAL WORK (described in their own words) ═══

Task 1 (most time-consuming): "${ctx.audit_tasks[0]}"
Task 2 (most repeatable): "${ctx.audit_tasks[1] || "not described"}"
Task 3 (most judgment-intensive): "${ctx.audit_tasks[2] || "not described"}"

═══ TEMPLATE TASKS (role/level-specific baseline, rewrite to be far more specific) ═══

${templateSummary}

═══ TIME CALIBRATION ═══

Each task must fit within 30 min. Every task must be completable in that window by someone doing it for the first time.

"30 min: one focused action with room for depth. Three to four steps."
Good scope: read one specific article and write one sentence about what it changes for you. Identify three things in your role that are hardest to replicate. Send one email you have been avoiding. Map one real skill gap. Test one tool on one real piece of work. Write one paragraph you have been putting off.
NOT OK: "explore", "research broadly", "think about your options", or anything that cannot be finished in a single sitting.

Hard rule: if the task cannot be finished in the allotted time, cut scope. Smaller and done beats larger and abandoned.

═══ INSTRUCTIONS ═══

Generate 3 tasks. Task 1 MUST reference their actual work task #1 verbatim in the title.

CRITICAL: What they're looking to change ("${ctx.urgency}") must shape what the task is fundamentally about. Tasks must be career development actions about positioning, skills, visibility, decisions, and relationships.

Every task has 5 fields:

"context", 1 sentence. Name their career situation and something specific from their concern or goal. The "you said..." opener that makes them feel seen before the task starts.

"desc": 2-3 sentences. Name the specific action. Concrete, if less experienced, say exactly what to do; if senior, give the advanced move. Write in the profile's ${profileCopy.voice} voice and ${profileCopy.pacing} pacing.

"steps", 2-3 steps for 15-min tasks, 3-4 steps for 30-min tasks, 4-5 steps for 45-60-min tasks. Match step count to the time budget. Each step is a single action with a clear stopping point, never multiple sub-actions or open-ended exploration.

"whyBase": 1-2 sentences. Connect to their ultimate motivation: "${ctx.ultimate_why}". Use their actual words. One real, specific payoff, not generic.

Every task must also:
• Set the task's "time" field to "30 min"
• Never include any year or date. Use "recently", "now", "currently", or "latest" instead

Writing style:
• Second person throughout
• Contractions naturally (you're, it's, don't, won't)
• Active voice only
• Short sentences. Vary length
• Conversational, direct, confident
• No em dashes
• No contrastive negation ("not X, but Y")
• No generic motivational language

HARD RULE: no AI tool tasks: Do not generate tasks about using ChatGPT, Claude, Copilot, or any AI tool. Do not suggest "test this with AI", "use AI to draft", or any AI-first action. The program is career development, not an AI literacy course. If a person is AI-fluent, that means their tasks should be more strategically advanced, not more AI-focused.

${activePatterns.length > 0 ? `
Critical: this person has active psychological patterns. Every task must account for them:
${activePatterns.map(p => "• " + p).join("\n")}
` : ""}

Also generate an "outcomes" array: exactly 3 sentences describing what is concretely different after completing Week 1.
• Each names a specific observable change, not a feeling
• Reference their goal ("${ctx.goal}") and concern ("${ctx.concern}") directly
• Format: "You have X", "You know Y", "You've done Z"
• One per dimension: (1) concrete output built, (2) clarity gained, (3) habit or behavior started

Also generate a "change_commentary" field: 2-3 sentences about which of their actual work tasks is most exposed to disruption and which is most defensible, and why. Reference their actual tasks by name.

Respond with ONLY valid JSON, no preamble, no markdown fences:

{"tasks":[{"tag":"Apply|Read|Reflect","time":"30 min","title":"...","context":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}],"outcomes":["...","...","..."],"change_commentary":"..."}`;

  // ── Prompt: no-audit path ─────────────────────────────────
  const promptNoAudit = `You are generating exactly ONE personalized career development task for Day 1. Make it the most relevant, specific, actionable 30-minute task possible for this person.
${TODAY_CONTEXT()}

═══ THEIR CAREER SITUATION ═══

What they're looking to change: ${ctx.urgency || "not specified"}
Biggest concern: "${ctx.concern}"
Goal: "${ctx.goal}"
Ultimate motivation: "${ctx.ultimate_why}"

═══ WHO THEY ARE ═══

Role: ${ctx.role}${ctx.role_detail ? ` (${ctx.role_detail})` : ""}
Seniority: ${ctx.seniority}
Readiness level: ${ctx.readiness_level}
Main blocker to making progress: "${ctx.blocker}"
Action vs. understanding preference: ${ctx.style}
External vs. internal motivation: ${ctx.validation}


═══ THEIR PROFILE ═══

Profile name: ${profileName}
Readiness level: ${readinessLevel}
Orientation: ${orientation} (optimizer = growth/advance · protector = defend position · navigator = lead/understand for others)
Approach style: ${approachStyle}
Behavioral style: ${behavioralStyle}

Profile headline (the framing they just read about themselves):
"${profileCopy.headline}"

Profile description (what they understand about their situation):
"${profileCopy.description}"

Suggested entry point (their first move):
"${profileCopy.entryPoint}"

Task emphasis for this profile: ${profileCopy.taskEmphasis} (prefer tasks of this type)
Narrative voice: ${profileCopy.voice} (peer = collegial, advisor = authoritative, coach = energizing, guide = gentle, honest = direct, evidence = credibility-first)
Pacing: ${profileCopy.pacing} (dense = pack it in, deep = go slow and thorough, momentum = keep moving, progressive = build step by step, deliberate = careful, gentle = reassuring, earned = trust must be built)

${activePatterns.length > 0 ? `Active psychological patterns that MUST shape the tasks:\n${activePatterns.map(p => "• " + p).join("\n")}` : ""}

═══ TEMPLATE TASKS (role/level-specific baseline, rewrite to be far more specific) ═══

${templateSummary}

═══ TIME CALIBRATION ═══

Each task must fit within 30 min. Every task must be completable in that window.

"30 min: one focused action with room for depth. Three to four steps."
Good scope: read one specific article and write one sentence about what it changes for you. Identify three things in your role that are hardest to replicate. Send one email you have been avoiding. Map one real skill gap. Test one tool on one real piece of work. Write one paragraph you have been putting off.
NOT OK: "explore", "research broadly", "think about your options", or anything requiring more than one sitting.

Hard rule: if the task cannot be finished in 30 minutes, cut scope until it can.

═══ INSTRUCTIONS ═══

CRITICAL: What they're looking to change ("${ctx.urgency}") must shape what the task is fundamentally about. Tasks must be career development actions about positioning, skills, visibility, decisions, and relationships.

The task must directly address their biggest concern ("${ctx.concern}") and connect to their goal ("${ctx.goal}"), calibrated around their main blocker: "${ctx.blocker}"

Every task has 5 fields:

"context", 1 sentence. Name their career situation and something specific from their concern or goal. The opener that makes them feel seen.

"desc", 2-3 sentences. Name the specific action. Concrete, if less experienced, say exactly what to do; if senior, give the advanced move. Write in the profile's ${profileCopy.voice} voice and ${profileCopy.pacing} pacing.

"steps", 2-3 steps for 15-min tasks, 3-4 steps for 30-min tasks, 4-5 steps for 45-60-min tasks. Match step count to the time budget. Each step is a single concrete action with a clear stopping point.

"whyBase", 1-2 sentences. Connect to their ultimate motivation: "${ctx.ultimate_why}". Use their actual words. One real, specific payoff, not generic.

Every task must also:
• Feel written for a ${ctx.seniority} ${ctx.role} specifically, not generic career advice
• Set the task's "time" field to "30 min"
• Never include any year or date. Use "recently", "now", "currently", or "latest" instead

Writing style:
• Second person throughout
• Contractions naturally (you're, it's, don't, won't)
• Active voice only
• Short sentences. Vary length
• Conversational, direct, confident
• No em dashes
• No contrastive negation ("not X, but Y")
• No generic motivational language

HARD RULE, no AI tool tasks: Do not generate tasks about using ChatGPT, Claude, Copilot, or any AI tool. Do not suggest "test this with AI", "use AI to draft", or any AI-first action. The program is career development, not an AI literacy course. If a person is AI-fluent, that means their tasks should be more strategically advanced, not more AI-focused.

${activePatterns.length > 0 ? `
Critical: this person has active psychological patterns. Every task must account for them:
${activePatterns.map(p => "• " + p).join("\n")}
` : ""}

Also generate an "outcomes" array: exactly 3 sentences describing what is concretely different after completing Week 1.
• Each names a specific observable change, not a feeling
• Reference their goal ("${ctx.goal}") and concern ("${ctx.concern}") directly
• Format: "You have X", "You know Y", "You've done Z"
• One per dimension: (1) concrete output built, (2) clarity gained, (3) habit or behavior started

Respond with ONLY valid JSON, no preamble, no markdown fences:

{"tasks":[{"tag":"Apply|Read|Reflect","time":"30 min","title":"...","context":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}],"outcomes":["...","...","..."]}`;

  const prompt = hasAudit ? promptWithAudit : promptNoAudit;

  // Retry wrapper with exponential backoff for transient failures
  const tryFetch = async (attempt = 0) => {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      const status = response.status;
      console.error("AI task gen HTTP error:", status);
      // Retry on 429 (rate limit) or 5xx (server error), up to 2 retries
      if ((status === 429 || status >= 500) && attempt < 2) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        return tryFetch(attempt + 1);
      }
      _lastAITaskError = `HTTP ${status}${status === 429 ? " (rate limited)" : status >= 500 ? " (server error)" : ""} after ${attempt + 1} attempt(s)`;
      return null;
    }
    return response;
  };

  try {
    _lastAITaskError = "";
    const response = await tryFetch();
    if (!response) return null;
    const data = await response.json();
    const text = extractText(data);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error("AI task gen: no JSON found in response", text.slice(0, 200));
      _lastAITaskError = `No JSON in API response. First 100 chars: "${text.slice(0, 100)}"`;
      return null;
    }
    let parsed;
    try { parsed = JSON.parse(text.slice(start, end + 1)); } catch (parseErr) {
      console.error("AI task gen: JSON parse failed", parseErr, text.slice(start, Math.min(start + 300, end + 1)));
      _lastAITaskError = `JSON parse failed: ${parseErr.message}. Response length: ${text.length} chars`;
      return null;
    }
    if (parsed.tasks?.length >= 1) return parsed;
    _lastAITaskError = `Parsed OK but got ${parsed.tasks?.length ?? 0} tasks (need ≥ 1). Keys: ${Object.keys(parsed).join(", ")}`;
    return null;
  } catch (err) {
    console.error("AI task gen failed:", err);
    _lastAITaskError = `Network/fetch error: ${err?.message || String(err)}`;
    return null;
  }
}


// ─── Week Arc Generator ──────────────────────────────────────────────────────
// Generates 4 personalised week theme labels from full quiz context.
// Called in GeneratingScreen alongside generateAITasks, baked into plan object.
async function generateWeekArc(answers, classification, brilInsight) {
  const cl = classification || {};
  const roleNames    = ROLE_NAMES;
  const goalTexts    = GOAL_TEXTS;
  const urgTexts     = URG_TEXTS;
  const blockerTexts = BLOCKER_TEXTS;
  const goalDetailText = answers.goal_detail !== undefined && GOAL_DETAIL_QUESTIONS?.[answers.goal]
    ? GOAL_DETAIL_QUESTIONS[answers.goal].options[answers.goal_detail]?.text || ""
    : "";

  const prompt = `You are building a personalized 8-week career development cycle. Generate three things:
${TODAY_CONTEXT()}

FIRST: Write 3 "ability sentences" — what this person will be able to do after each of the first 3 steps of their program.
SECOND: Generate 8 short week theme labels for the 8-week cycle.
THIRD: Generate 2 milestone descriptions: a midpoint check (week 4) and an endpoint vision (week 8).

PERSON:
Profile: ${cl.profileName || "professional"}
Orientation: ${cl.orientation || "balanced"} (optimizer=growth · protector=defend · navigator=lead)
Readiness: ${cl.readinessLevel || "medium"}
Role: ${(lk(roleNames, answers.role) || "professional") + (answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : "")}
Seniority: ${SENIORITY_TEXTS[answers.seniority] || "mid-career"}
Action vs. understanding: ${answers.style_outcome_process != null ? (answers.style_outcome_process < 30 ? "strongly action-oriented" : answers.style_outcome_process < 50 ? "action-leaning" : answers.style_outcome_process > 70 ? "strongly understanding-oriented" : "understanding-leaning") : "balanced"}
What's making this feel urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
Goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}${goalDetailText ? `, specifically: ${goalDetailText}` : ""}${answers.goal_direction ? `\nTarget direction: ${answers.goal_direction}` : ""}
Main blocker: ${( normalizeBlocker(answers.blocker).map(b => blockerTexts[b]).filter(Boolean).join("; ") || "something gets in the way")}
${brilInsight ? `\nINSIGHT FROM COACHING CONVERSATION:\n${brilInsight}\nUse this to make the week themes and ability sentences more specific to what was discussed.` : ""}

ABILITY SENTENCES (a1, a2, a3), REQUIRED:
- a1: After Step 1 (first week), what can they do? One sentence, 15-20 words.
- a2: After Step 2 (second week), what can they do? One sentence, 15-20 words.
- a3: After Step 3 (third week), what can they do? One sentence, 15-20 words.
- Written directly to them: "You'll have...", "You'll know...", "You'll be able to..."
- Tangible, specific to their role and goal. Not generic.
- Each step should build on the previous one toward their goal.

WEEK THEMES (w1 through w8), one full 8-week cycle:
- 4-7 words each. Specific to their goal and role.
- Week 1: first move from where they are now.
- Week 2: deepen week 1's foundation.
- Week 3: produce something concrete toward the goal.
- Week 4: midpoint check, consolidate and adjust.
- Week 5: go deeper on what's working.
- Week 6: direct work on the goal (name it explicitly).
- Week 7: make the work visible. Test against reality.
- Week 8: finish strong. Reflect and set up the next cycle.
- No AI references. Second person implied.

CYCLE MILESTONES (mid, end):
- mid (Week 4): Midpoint check. What should be tangibly different by now? 1-2 sentences, specific to their goal.
- end (Week 8): Cycle complete. What has changed? What can they do now that they couldn't before? 1-2 sentences.

Return ONLY valid JSON. a1/a2/a3 and mid/end MUST be included:
{"a1":"...","a2":"...","a3":"...","w1":"...","w2":"...","w3":"...","w4":"...","w5":"...","w6":"...","w7":"...","w8":"...","mid":"...","end":"..."}`;
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Week arc HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = extractText(data);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  } catch (e) {
    console.error("Week arc failed:", e);
    return null;
  }
}

// ─── Generating Screen ───────────────────────────────────
function GeneratingScreen({ answers, auditTasks, brilInsight, onComplete, onBack }) {
  useSEO({ title: "Building Your Plan", path: "/generating", noIndex: true });
  const [dots, setDots] = useState("");
  const [phase, setPhase] = useState(0);
  const [failed, setFailed] = useState(false);
  const hasAudit = (auditTasks || []).filter(t => t && t.trim().length > 3).length > 0;
  const phases = hasAudit
    ? ["Brilliant. Let's do this", "Reading your answers (no judgment)", "Analysing your work tasks (okay, a little judgment)", "Building something actually useful"]
    : ["Brilliant. Let's do this", "Reading your answers (no judgment)", "Figuring out your type (in a nice way)", "Building something actually useful"];

  // Use refs to track intervals so retry properly clears previous ones
  const intervalsRef = useRef({ di: null, pi: null });
  const [errorDetail, setErrorDetail] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const clearIntervals = () => {
    if (intervalsRef.current.di) clearInterval(intervalsRef.current.di);
    if (intervalsRef.current.pi) clearInterval(intervalsRef.current.pi);
    intervalsRef.current = { di: null, pi: null };
  };

  const run = () => {
    clearIntervals();
    setFailed(false);
    setErrorDetail("");
    setPhase(0);
    setDots("");
    intervalsRef.current.di = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    intervalsRef.current.pi = setInterval(() => setPhase(p => Math.min(p + 1, phases.length - 1)), 1800);

    let templatePlan, cls;
    try {
      templatePlan = generatePlan(answers, auditTasks);
      cls = classifyProfile(answers);
    } catch (syncErr) {
      console.error("Plan generation sync error:", syncErr);
      clearIntervals();
      setErrorDetail(`Sync error: ${syncErr?.message || String(syncErr)}`);
      setFailed(true);
      return;
    }

    // Only generate the lightweight week arc (a1/a2/a3 for results page).
    // Day 1 task generation is deferred to dashboard entry to save tokens.
    (async () => {
      try {
        let arcResult = null;
        try {
          arcResult = await generateWeekArc(answers, cls, brilInsight);
        } catch (arcErr) {
          console.error("Week arc error (non-fatal):", arcErr);
        }

        clearIntervals();
        onComplete({
          ...templatePlan,
          tasks: [],
          weekArc: arcResult || null,
        });
      } catch (err) {
        console.error("GeneratingScreen error:", err);
        clearIntervals();
        if (hasRetriedRef.current) {
          onComplete({ ...templatePlan, tasks: [], weekArc: null });
        } else {
          setErrorDetail(`Exception: ${err?.message || String(err)}`);
          setFailed(true);
        }
      }
    })();
  };

  useEffect(() => { run(); return clearIntervals; }, []);

  // Auto-retry once on first failure (transient API errors)
  const hasRetriedRef = useRef(false);
  useEffect(() => {
    if (failed && !hasRetriedRef.current) {
      hasRetriedRef.current = true;
      const timer = setTimeout(() => { setRetryCount(1); run(); }, 1500);
      return () => clearTimeout(timer);
    }
  }, [failed]);

  if (failed && hasRetriedRef.current) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ textAlign: "center", maxWidth: 440, padding: "0 32px" }}>
          <p style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>Oops. Something broke. 🫠</p>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: "0 0 28px", lineHeight: 1.6 }}>Be Brilliant couldn't finish your plan. Check your connection and give it another go.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
            <button onClick={() => { hasRetriedRef.current = false; setRetryCount(0); run(); }}
              style={{ background: T.brand, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "13px 28px", borderRadius: 10, cursor: "pointer" }}>
              Try again
            </button>
            <button onClick={onBack}
              style={{ background: "none", color: T.muted, border: `1px solid ${T.border}`, fontFamily: T.sans, fontSize: 14, padding: "13px 20px", borderRadius: 10, cursor: "pointer" }}>
              Back
            </button>
          </div>
          {errorDetail && (
            <details style={{ textAlign: "left", background: "#f9f8fc", border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 14px", marginTop: 0 }}>
              <summary style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, cursor: "pointer", userSelect: "none" }}>
                Debug info (share this if reporting a bug)
              </summary>
              <pre style={{ fontFamily: "monospace", fontSize: 11, color: T.body, margin: "10px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5 }}>{errorDetail}{`\n\nRetries: ${retryCount}\nTime: ${new Date().toISOString()}\nProfile: ${answers?.name || "?"} / ${QOpt("role", answers?.role) || "?"}`}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.offWhite }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 32px" }}>
        <div style={{ fontSize: 40, margin: "0 auto 28px", animation: "wiggle 1.2s ease-in-out infinite" }}>✦</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } @keyframes firePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } } @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } } @keyframes brilWiggle { 0% { transform: rotate(0); } 20% { transform: rotate(-8deg) scale(1.05); } 40% { transform: rotate(6deg); } 60% { transform: rotate(-4deg); } 80% { transform: rotate(2deg); } 100% { transform: rotate(0) scale(1); } }`}</style>
        <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: -0.2 }}>{phases[phase]}{dots}</p>
        <p style={{ fontFamily: T.sans, fontSize: 16, color: T.body, margin: "10px 0 0" }}>This usually takes about 10 seconds</p>
      </div>
    </div>
  );
}



// ─── Week Plan Generator (Days 2-7) ─────────────────────────────────────────
// Called after email submit. Generates Days 2-7 upfront using Day 1 as anchor.
// Uses the same full-context prompt as generateNextDayTask but batches all days.
async function generateWeekPlan(plan, day1Task) {
  const answers = plan._answers || {};
  const cl = plan.classification || {};

  const roleNames     = ROLE_NAMES;
  const goalTexts     = GOAL_TEXTS;
  const blockerTexts  = BLOCKER_TEXTS;
  const urgTexts      = URG_TEXTS;
  const seniorityTexts = SENIORITY_TEXTS;

  const subRoleText = answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role]
    ? SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || ""
    : "";
  const goalDetailText = answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[answers.goal])?.options?.[answers.goal_detail]?.text || "") : "";
  const goalDirection = (answers.goal_direction || "").trim();
  const goalStatementText = plan._goalStatement || "";

  const stylePref = answers.style_outcome_process != null
    ? (answers.style_outcome_process < 30 ? "strongly action-oriented, skip context, give the move"
      : answers.style_outcome_process < 50 ? "action-leaning, prefers doing over reading"
      : answers.style_outcome_process > 70 ? "strongly context-oriented, needs to understand before acting"
      : "context-leaning, wants enough landscape to act with confidence") : "balanced";

  // Week 1 theme from arc
  const arc = plan.weekArc || {};
  const week1Theme = arc.w1 || "Build your baseline";

  const prompt = `Generate exactly 6 personalized career development tasks for Days 2 through 7 of this person's program. Day 1 is already done, build forward from it.
${TODAY_CONTEXT()}

═══ FULL PROFILE ═══
Profile: ${plan.profileName}
Orientation: ${cl.orientation || "balanced"}
Readiness: ${cl.readinessLevel || "medium"}
Role: ${(lk(roleNames, answers.role) || "professional") + (subRoleText ? ` (${subRoleText})` : "")}
Seniority: ${lk(seniorityTexts, answers.seniority) || "mid-career"}
Action vs. understanding: ${stylePref}
What's making this feel urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
Main blocker: ${( normalizeBlocker(answers.blocker).map(b => blockerTexts[b]).filter(Boolean).join("; ") || "something gets in the way")}

═══ GOAL CONTEXT ═══
Goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}${goalStatementText ? `\nBe Brilliant-refined goal statement: "${goalStatementText}"` : ""}

═══ THIS WEEK ═══
Week 1 focus: "${week1Theme}"

═══ DAY 1 (already done) ═══
"${day1Task?.title || "Day 1 task"}" [${day1Task?.tag || "Apply"}]

═══ RULES ═══
- CRITICAL: Every task must serve BOTH the goal AND the Week 1 focus ("${week1Theme}"). If a task doesn't clearly connect to both, rethink it.
- What they're looking to change ("${lk(urgTexts, answers.urgency)}") must shape what the tasks are fundamentally about.
- Each task is a standalone 30-minute career development action
- Build progressively, each day deepens or extends the previous
- NO AI tool tasks. Career development only: positioning, skills, visibility, decisions, relationships
- Never repeat Day 1
- Shape tasks around their approach preference (${stylePref}): ${stylePref.includes("action") ? "lead with doing, not reading" : stylePref.includes("context") ? "lead with context and frameworks before action" : "balance context and action"}
- If Day 1 had a reflection note ("${day1Task?.reflection || ""}"), build Day 2 directly from what they described
- Second person. Active voice. Short sentences. No em dashes.
- NEVER include specific years, months, quarters, or dates.

Return ONLY valid JSON, no markdown:
{"days":[
  {"day":2,"tag":"Apply|Read|Reflect","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":3,"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":4,"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":5,"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":6,"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":7,"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}
]}`;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Week plan gen HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = extractText(data);
    const start = text.indexOf("{"); const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    let parsed; try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
    if (parsed.days?.length >= 1) return parsed.days;
    return null;
  } catch (e) {
    console.error("Week plan gen failed:", e);
    return null;
  }
}


// ─── Week Batch Generator ────────────────────────────────────────────────────
// Generates 7 tasks for a given week (e.g. Days 8-14 for Week 2).
// Called when the previous week completes. Full history passed in.
async function generateWeekBatch(plan, weekNum, startDay, dayTasks, dayStatus, dayNotes, brilInsight) {
  const answers = plan._answers || {};
  const cl = plan.classification || {};

  const roleNames    = ROLE_NAMES;
  const goalTexts    = GOAL_TEXTS;
  const urgTexts     = URG_TEXTS;

  const arc = plan.weekArc || {};
  const weekThemes = [arc.w1, arc.w2, arc.w3, arc.w4, arc.w5, arc.w6, arc.w7, arc.w8];
  const weekTheme = weekThemes[weekNum - 1] || (plan._adaptedWeekThemes || {})[weekNum] || "Continue building toward your goal";

  // Goal: use Be Brilliant-refined goal statement if available, otherwise quiz goal
  const goalStatementText = plan._goalStatement || "";
  const rawGoalText = answers.goal_custom || lk(goalTexts, answers.goal) || "move forward";
  const effectiveGoal = goalStatementText || rawGoalText;
  const goalDetailText = answers.goal_detail !== undefined && GOAL_DETAIL_QUESTIONS?.[answers.goal]
    ? GOAL_DETAIL_QUESTIONS[answers.goal].options[answers.goal_detail]?.text || ""
    : "";
  const goalDirection = (answers.goal_direction || "").trim();

  // Blocker text
  const blockerText = normalizeBlocker(answers.blocker).map(b => BLOCKER_TEXTS[b]).filter(Boolean).join("; ") || "not specified";

  // Style preference
  const stylePref = answers.style_outcome_process != null
    ? (answers.style_outcome_process < 30 ? "strongly action-oriented"
      : answers.style_outcome_process < 50 ? "action-leaning"
      : answers.style_outcome_process > 70 ? "strongly understanding-oriented"
      : "understanding-leaning") : "balanced";

  // Full history of completed days
  const endDay = startDay - 1;
  const history = Array.from({ length: endDay }, (_, i) => i + 1).map(d => {
    const ds = (dayStatus || {})[d];
    const dn = (dayNotes  || {})[d] || "";
    const dt = (dayTasks  || {})[d];
    const tl = dt ? `"${dt.title}" [${dt.tag}]` : "(not loaded)";
    return `Day ${d}: ${ds === 'done' ? 'DONE' : ds === 'skipped' ? 'SKIPPED' : 'pending'} | ${tl}${dn ? ` | Note: "${dn}"` : ""}`;
  }).join("\n");
  // Surface any reflections explicitly
  const reflections = Array.from({ length: endDay }, (_, i) => i + 1)
    .filter(d => (dayNotes || {})[d])
    .map(d => `Day ${d}: "${(dayNotes || {})[d]}"`);
  const reflectionSummary = reflections.length > 0 ? `\nRecent reflections to build on:\n${reflections.slice(-5).join("\n")}` : "";

  // Compute week-level analytics to inform generation
  const prevWeekStart = startDay - 7;
  const prevWeekEnd = startDay - 1;
  const prevWeekDone = Array.from({ length: 7 }, (_, i) => prevWeekStart + i).filter(d => (dayStatus || {})[d] === 'done').length;
  const prevWeekSkipped = Array.from({ length: 7 }, (_, i) => prevWeekStart + i).filter(d => (dayStatus || {})[d] === 'skipped').length;
  const totalDone = Object.values(dayStatus || {}).filter(s => s === 'done').length;
  const totalSkipped = Object.values(dayStatus || {}).filter(s => s === 'skipped').length;
  const completionRate = (totalDone + totalSkipped) > 0 ? Math.round(totalDone / (totalDone + totalSkipped) * 100) : 100;
  const lastWeekSignal = prevWeekDone >= 6 ? "strong week, go deeper, increase challenge"
    : prevWeekDone >= 4 ? "solid week, maintain pace, build on what worked"
    : prevWeekDone >= 2 ? "patchy week, start lighter this week, rebuild momentum"
    : "very difficult week, open with the easiest possible task, reduce friction significantly";

  // Full arc context so the model sees the journey
  const allThemes = [arc.w1, arc.w2, arc.w3, arc.w4, arc.w5, arc.w6, arc.w7, arc.w8].map((t, i) => `Week ${i+1}: "${t || 'TBD'}"`).join("\n");
  const cycleContext = (arc.mid || arc.end)
    ? `\n\n8-WEEK CYCLE MILESTONES:\nWeek 4 midpoint: ${arc.mid || "Foundation set, direction confirmed"}\nWeek 8 endpoint: ${arc.end || "Goal achieved or significant progress made"}`
    : "";
  const cycleNum = Math.ceil(weekNum / 8);
  const weekInCycle = ((weekNum - 1) % 8) + 1;

  const endDay2 = startDay + 6;
  const prompt = `Generate exactly 7 personalized career development tasks for Days ${startDay} through ${endDay2} (Week ${weekNum}, which is Week ${weekInCycle} of Cycle ${cycleNum}).
${TODAY_CONTEXT()}

FIRST: Evaluate whether the originally planned Week ${weekNum} theme still fits this person based on what actually happened. Then generate tasks aligned with your decision.

═══ WHO THIS PERSON IS ═══
Profile: ${plan.profileName}
Role: ${(lk(roleNames, answers.role) || "professional") + (answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : "")}
Seniority: ${SENIORITY_TEXTS[answers.seniority] || "mid-career"}
Readiness: ${cl.readinessLevel || "medium"}
Orientation: ${cl.orientation || "balanced"} (optimizer=growth · protector=defend · navigator=lead)
Approach: ${stylePref}
What's making this feel urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
Main blockers: ${blockerText}

═══ THEIR GOAL ═══
Goal: "${effectiveGoal}"${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}
${plan._goalDeadline ? `DEADLINE: ${plan._goalDeadline} (${Math.max(0, Math.ceil((new Date(plan._goalDeadline) - new Date()) / 86400000))} days remaining). This is time-bound. ${Math.ceil((new Date(plan._goalDeadline) - new Date()) / 86400000) <= 14 ? "URGENT: Less than 2 weeks left. Every task this week must directly advance the goal. Skip all foundation-building, go straight to output and action." : Math.ceil((new Date(plan._goalDeadline) - new Date()) / 86400000) <= 30 ? "PRESSING: Under a month. Front-load the most impactful tasks early this week." : "Deadline is set but not imminent. Maintain steady progress toward it."}` : ""}
${brilInsight ? `\n═══ BE BRILLIANT COACHING CONTEXT ═══\nBe Brilliant (the person's AI thinking partner) observed the following from recent conversations. Use this to shape tasks, it reflects what the person actually said, not just what they entered in the quiz. If Bril's observations suggest a different direction, skill focus, or priority than the original plan, FOLLOW Be Brilliant's insight, it's more current than the quiz:\n${brilInsight}\n` : ""}
═══ PLANNED ARC ═══
${allThemes}${cycleContext}
${weekNum > 8 ? `\nThis is Week ${weekNum} (Week ${weekInCycle} of Cycle ${cycleNum}). The person has continued beyond their first 8-week cycle. They may have kept their original goal or set a new one. Generate tasks that advance their current goal with the momentum they've built.` : ""}

The ${weekNum <= 8 ? "originally planned" : "suggested"} theme for Week ${weekNum} is: "${weekTheme}"

═══ THEME ADAPTATION INSTRUCTIONS ═══
Evaluate whether "${weekTheme}" is still the right focus for Week ${weekNum}. Consider:
- Did last week's performance reveal something the original plan didn't anticipate?
- Did the person's notes or Be Brilliant conversations surface a more pressing priority?
- Is the person ahead of schedule (could skip to a harder theme) or behind (needs a consolidation week)?
- Has their goal shifted or become more specific through Be Brilliant conversations?

If the original theme still fits, keep it. If something better serves the person right now, write a new 4-7 word theme that:
- Connects to their goal
- Reflects what actually happened, not what was planned
- Feels like a natural next step from where they are NOW
Return your decision in the "adaptedTheme" field.
═══ WEEK ${weekNum} OBJECTIVE ═══
"${weekTheme}"

═══ PREVIOUS WEEK PERFORMANCE ═══
Last week: ${prevWeekDone}/7 days completed, ${prevWeekSkipped} skipped
Overall completion rate: ${completionRate}%
Signal for this week: ${lastWeekSignal}

═══ FULL HISTORY (Days 1-${endDay}) ═══
${history}${reflectionSummary}

═══ RULES ═══
- CRITICAL: The goal ("${effectiveGoal}") must be the through-line, every task should visibly advance toward it.${goalDetailText ? ` The specific angle is: "${goalDetailText}".` : ""}${goalDirection ? ` They're targeting: "${goalDirection}".` : ""}
- Day ${startDay} (the first task of this new week) is especially important: it must feel like a natural continuation of what came before, not a fresh start. Reference something specific from the previous week's completed tasks or notes. The person should feel seen, not reset.
- Use the previous week performance signal above to calibrate difficulty and task length.
- Build progressively on the history. Never repeat a completed task. Reference specific things from their notes.
- All tasks should serve your chosen Week ${weekNum} theme (either the original or your adapted version)
- Shape tasks around their approach preference (${stylePref}): ${stylePref.includes("action") ? "lead with doing, not reading" : stylePref.includes("understanding") ? "lead with context and frameworks before action" : "balance context and action"}.
- Account for their blockers (${blockerText}): ${normalizeBlocker(answers.blocker).includes(0) ? "keep tasks tight, 30 min max" : ""}${normalizeBlocker(answers.blocker).includes(2) ? "every task needs a clear, concrete endpoint" : ""}${normalizeBlocker(answers.blocker).includes(3) ? "emphasize application over consumption" : ""}
- Career development only: positioning, skills, visibility, decisions, relationships
- NO AI tool tasks (no ChatGPT, Claude, Copilot prompting tasks)
- If many skips in history: reduce friction, shorter tasks, more concrete endpoints
- If notes show struggle on a topic: ease off that topic, don't repeat it
- If notes show energy on a topic: go deeper on it
- Tasks should vary in type, mix of Apply, Read, Reflect
- Second person. Active voice. No em dashes. No generic motivational language. No "just", "simply", "easy".

Return ONLY valid JSON, no markdown:
{"adaptedTheme":"4-7 word theme for this week (can be the same as original if it still fits)","days":[
  {"day":${startDay},"tag":"Apply|Read|Reflect","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+1},"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+2},"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+3},"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+4},"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+5},"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+6},"tag":"...","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}
]}`;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Week batch gen HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = extractText(data);
    const start = text.indexOf("{"); const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    let parsed; try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
    if (parsed.days?.length >= 1) return { days: parsed.days, adaptedTheme: parsed.adaptedTheme || null };
    return null;
  } catch (e) {
    console.error("Week batch gen failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD, Week 1 preview, Noom/Duolingo behavioral model
// ═══════════════════════════════════════════════════════════
// ─── Next-Day Task Generator ──────────────────────────────
// Called after each day completes. Generates Day N+1 task via API.
// Key design: minimal explicit reflection (one optional sentence),
// maximum backend adaptation (performance signal + note → AI prompt).
async function generateNextDayTask(plan, dayNum, status, note, brilInsight, dayTasks, dayStatus, dayNotes, timeAvailable) {
  const answers = plan._answers || {};
  const cl = plan.classification || {};
  const profileName = plan.profileName;
  const goalDetailText = answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[answers.goal])?.options?.[answers.goal_detail]?.text || "") : "";
  const goalDirection = (answers.goal_direction || "").trim();
  const goalStatementText = plan._goalStatement || "";

  // Compute current week theme from weekArc for this day's week number
  const thisWeekNum = Math.min(8, Math.ceil((dayNum + 1) / 7));
  const arc = plan.weekArc || {};
  const arcThemes = [arc.w1, arc.w2, arc.w3, arc.w4, arc.w5, arc.w6, arc.w7, arc.w8];
  const thisWeekTheme = arcThemes[thisWeekNum - 1] || "Keep building";

  // Sub-role detail
  const subRoleText = answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role]
    ? SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || ""
    : "";

  // Lookup tables, full quiz answer text
  const roleNames     = ROLE_NAMES;
  const goalTexts     = GOAL_TEXTS;
  const urgTexts      = URG_TEXTS;
  const blockerTexts  = BLOCKER_TEXTS;
  const seniorityTexts = SENIORITY_TEXTS;

  const stylePref = answers.style_outcome_process != null
    ? (answers.style_outcome_process < 30 ? "strongly action-oriented, skip context, give the move"
      : answers.style_outcome_process < 50 ? "action-leaning, prefers doing over reading"
      : answers.style_outcome_process > 70 ? "strongly context-oriented, needs to understand before acting"
      : "context-leaning, wants enough landscape to act with confidence") : "balanced";

  // Full previous-day history
  const dayHistory = Array.from({ length: dayNum }, (_, i) => i + 1).map(d => {
    const ds = (dayStatus || {})[d];
    const dn = (dayNotes  || {})[d] || "";
    const dt = (dayTasks  || {})[d];
    const tl = dt ? `"${dt.title}" [${dt.tag}]` : "(not loaded)";
    return `Day ${d}: ${ds === 'done' ? 'DONE' : ds === 'skipped' ? 'SKIPPED' : 'PENDING'} | Task: ${tl}${dn ? ` | Note: "${dn}"` : ""}`;
  }).join("\n");

  const timePref = timeAvailable || "30 min";

  const perfSignal = dayNum === 0
    ? "This is Day 1. Generate the best possible first task for this person, specific to their role, goal, and profile."
    : status === 'done'
      ? "Completed Day " + dayNum + "." + (note ? " Their note: \"" + note + "\"" : " No reflection note.")
      : status === 'skipped'
        ? "Skipped Day " + dayNum + ". " + (note ? "Their note: \"" + note + "\"" : "No reason given.") + " Generate a shorter, lower-friction task."
        : "Day " + dayNum + " is in progress. Generate the next logical task.";

  // ── Day 1 enrichment: include audit tasks, profile copy, and psychological patterns ──
  const isDay1 = dayNum === 0;
  let day1Context = "";
  if (isDay1) {
    // Audit tasks (the person's actual work descriptions)
    const auditTasks = (plan.taskAnalysis || []).map(t => t.task).filter(Boolean);
    if (auditTasks.length > 0) {
      day1Context += `\n═══ THEIR ACTUAL WORK (described in their own words) ═══\n`;
      auditTasks.forEach((t, i) => { day1Context += `Task ${i+1}: "${t}"\n`; });
    }
    // Profile copy (voice, pacing, entry point)
    const pd = plan.profileData || {};
    if (pd.headline || pd.voice) {
      day1Context += `\n═══ PROFILE COPY ═══\n`;
      if (pd.headline) day1Context += `Headline: "${pd.headline}"\n`;
      if (pd.description) day1Context += `Description: "${pd.description}"\n`;
      if (pd.entryPoint) day1Context += `Entry point: "${pd.entryPoint}"\n`;
      day1Context += `Voice: ${pd.voice || "peer"} | Pacing: ${pd.pacing || "momentum"} | Task emphasis: ${pd.taskEmphasis || "apply"}\n`;
    }
    // Psychological patterns
    const activePatterns = [
      cl.isAnxietyDriven        && "Anxiety-driven: feeling outpaced, goal is to feel confident",
      cl.isCredibilityDefender  && "Credibility defender: senior, fears erosion of professional credibility",
      cl.hasTheoryGap           && "Theory-practice gap: learns but doesn't convert to actual work practice",
      cl.isHighCommitmentBeginner && "Motivated beginner: hasn't started yet but ready to move",
      cl.isPureNavigator        && "Pure navigator: wants to understand what's changing for strategic decisions",
    ].filter(Boolean);
    if (activePatterns.length > 0) {
      day1Context += `\nActive psychological patterns:\n${activePatterns.map(p => "• " + p).join("\n")}\n`;
    }
  }

  const prompt = `Generate exactly ONE personalized ${timePref} career development task for Day ${dayNum + 1} of this person's program.
${TODAY_CONTEXT()}

═══ FULL QUIZ PROFILE ═══
Profile: ${profileName}
Orientation: ${cl.orientation || "balanced"} (optimizer=growth · protector=defend · navigator=lead/understand)
Readiness: ${cl.readinessLevel || "medium"}
Role: ${lk(roleNames, answers.role) || "professional"}${subRoleText ? ` (${subRoleText})` : ""}
Seniority: ${lk(seniorityTexts, answers.seniority) || "mid-career"}
What's making it urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
Main blocker: ${( normalizeBlocker(answers.blocker).map(b => blockerTexts[b]).filter(Boolean).join("; ") || "not specified")}
Action vs. understanding: ${stylePref}

═══ GOAL CONTEXT ═══
Goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward on something that matters"}${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}${goalStatementText ? `\nBe Brilliant-refined goal statement: "${goalStatementText}"` : ""}

═══ THIS WEEK ═══
Week ${thisWeekNum} focus: "${thisWeekTheme}"
${brilInsight ? `\n═══ BE BRILLIANT COACHING INSIGHTS ═══\nIf Be Brilliant adjusted the goal or identified a priority shift, follow that direction, it's more current than the quiz.\n${brilInsight}\n` : ""}
═══ WEEK HISTORY ═══
${dayHistory || "No previous days yet."}

═══ TODAY'S SIGNAL ═══
${perfSignal}
${day1Context}
═══ RULES ═══
- One task only, scoped to exactly ${timePref}. Concrete. Doable in a single sitting.
- CRITICAL: Every task must serve BOTH the goal AND this week's focus ("${thisWeekTheme}"). If the task doesn't clearly connect to both, rethink it.
- Career development actions: positioning, skills, visibility, decisions, relationships.
- HARD RULE: NO AI tool tasks (no ChatGPT, Claude, Copilot, AI drafting).
- If today was skipped: make tomorrow smaller and lower-friction.
- If today was done and note shows difficulty: adjust scope down.
- If today was done and note shows ease or momentum: go one level deeper.
- Build on previous days, don't repeat any task already in the history above.
- Second person. Active voice. Short sentences. No em dashes. No generic motivational language.
- NEVER include specific years, months, quarters, or dates. Use "currently", "now", "emerging", "increasingly" instead.

Return ONLY valid JSON, no markdown:
{"tag":"Apply|Read|Reflect","time":"${timePref}","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}`;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Next day task gen HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = extractText(data);
    const start = text.indexOf("{"); const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  } catch (e) {
    return null;
  }
}



// ─── TaskSteps, checkbox list for each day task ──────────────────────────────
function TaskSteps({ steps, onCheckedChange, initialChecked, tagBg, tagAccent }) {
  const [checked, setChecked] = React.useState(initialChecked || {});
  if (!steps?.length) return null;
  const bg = tagBg || T.bg;
  const accent = tagAccent || T.brand;
  return (
    <div style={{ background: bg, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
      {steps.map((step, si) => (
        <div key={si} onClick={() => { const next = { ...checked, [si]: !checked[si] }; setChecked(next); onCheckedChange && onCheckedChange(next); }}
          style={{ display: "flex", gap: 10, marginBottom: si < steps.length - 1 ? 10 : 0, alignItems: "flex-start", cursor: "pointer" }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked[si] ? accent : T.brandMid}`,
            background: checked[si] ? accent : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1, transition: "all 0.15s",
          }}>
            {checked[si] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <p style={{ fontFamily: T.sans, fontSize: 15, color: checked[si] ? T.muted : T.ink, margin: 0, lineHeight: 1.7, textDecoration: checked[si] ? "line-through" : "none", transition: "all 0.15s" }}>{step}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Bril Chat Modal ──────────────────────────────────────
// Conversational AI that knows the user's full profile and
// extracts insights to feed forward into task generation.
function BrilChatModal({ plan, onClose, onInsight, dayTasks, dayStatus, dayNotes, currentWeekTheme, weekGoalOverride, weekFocusInput, goalStatement, momentumScore, momentumLabel, brilSessionLog, currentDay, isGoalClarification, goalDeadline, dailyTimeAvailable }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const answers = plan._answers || {};
  const cl = plan.classification || {};

  const goalTexts = GOAL_TEXTS;
  const goalText = (answers.goal_custom || goalTexts[answers.goal]) || "move forward on something that matters";
  const isCustomGoal = !!answers.goal_custom;
  const goalDetailText2 = answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS?.[answers.goal])?.options?.[answers.goal_detail]?.text || "") : "";
  const goalDirection = (answers.goal_direction || "").trim();
  const needsDirectionQ = NEEDS_DIRECTION?.[answers.goal]?.includes(answers.goal_detail) && !goalDirection;
  const roleNames = ROLE_NAMES;
  const roleName = answers.role !== undefined ? roleNames[answers.role] || "professional" : "professional";

  // Build the person's own words - day notes, weekly goals they've set
  const personWords = (() => {
    const notes = Object.entries(dayNotes || {}).filter(([,v]) => v && v.trim()).map(([d,v]) => `Day ${d} note: "${v.trim()}"`);
    const wkGoals = Object.entries(weekFocusInput || {}).filter(([,v]) => v && v.trim()).map(([w,v]) => `Week ${w} self-set focus: "${v.trim()}"`);
    if (weekGoalOverride) wkGoals.unshift(`Current week override: "${weekGoalOverride}"`);
    return [...notes, ...wkGoals];
  })();

  // ── Build conditional prompt sections (avoids nested backticks) ──
  const _taskReviewSection = isGoalClarification
    ? "1. Has their goal shifted or become more specific? If so → CMD:CHANGE_GOAL_CUSTOM\n2. Did they mention a deadline? If so → CMD:SET_DEADLINE\nThese are the only CMDs available in this pre-program conversation."
    : "1. Does today's task still make sense? If not → CMD:REPLACE_TODAY_TASK\n2. Does tomorrow's task still align? If not → CMD:REQUEST_TASK\n3. Does the weekly focus still fit? If not → CMD:WEEK_GOAL\n4. Has their goal shifted or become more specific? If so → CMD:CHANGE_GOAL_CUSTOM\n5. Did they mention a deadline? If so → CMD:SET_DEADLINE\nIf ANY of these need updating, include the CMD before NORA_DONE. After any CMD, confirm the change naturally: \"I've adjusted today's task to match what we discussed\" or \"I've updated your weekly focus.\" Do NOT close without checking.";

  const _programChangesHeader = isGoalClarification
    ? "Available commands in this pre-program session (goal and deadline only):"
    : "Execute immediately when the person asks, OR when the conversation reveals their program needs reshaping. Include the command on its own line.\nIMPORTANT: Any replacement task MUST be scoped to " + dailyTimeAvailable + " — the person's selected time window for today.\n- Replace TODAY's task: CMD:REPLACE_TODAY_TASK:concise description (must fit in " + dailyTimeAvailable + ")\n- Replace a specific day's task: CMD:REPLACE_DAY:N:concise description (N = day number, only for unlocked days not yet completed, must fit in " + dailyTimeAvailable + ")\n- Different task tomorrow: CMD:REQUEST_TASK:concise description (must fit in " + dailyTimeAvailable + ")\n- Change weekly focus: CMD:WEEK_GOAL:4-7 word theme (help them sharpen it first if it's vague)";

  const _proactiveSection = isGoalClarification ? "" : "\n- Rebuild the entire current week: CMD:REBUILD_WEEK (when goal or direction has significantly shifted)\n- Slower pace: CMD:SLOW_DOWN\n\nWHEN TO PROACTIVELY SUGGEST CHANGES: Don't wait to be asked. If the conversation reveals their actual goal is different from the program, say so and offer to update. If their weekly focus doesn't match their actions, propose a change. If their goal is more specific than what's in the program, use CMD:CHANGE_GOAL_CUSTOM. If a task isn't working, replace it immediately.\n\nPROACTIVE PROGRAM UPDATES — THIS IS CRITICAL: You are not just a listener. You are the program's brain. When you detect a misalignment, ACT on it:\n- If they describe a goal that's more specific than what's in the program → immediately use CMD:CHANGE_GOAL_CUSTOM with their words. Don't ask \"would you like me to update?\" — update it and tell them you did.\n- If they mention a deadline or timeframe → immediately use CMD:SET_DEADLINE. Don't wait for them to ask.\n- If today's task doesn't match what they need right now → use CMD:REPLACE_TODAY_TASK. Tell them why.\n- If the whole week feels off after what they've shared → use CMD:REBUILD_WEEK. Explain briefly.\n- If they're overwhelmed → use CMD:SLOW_DOWN proactively. \"I'm going to dial things down for you this week.\"\n- You can and SHOULD issue MULTIPLE commands in a single message when warranted.\n- The only time to ask first is when the change is a big directional shift AND they haven't clearly stated a preference. For refinements, deadline capture, task swaps, and pace changes, just do it.\n\nIf they want to make a change that doesn't quite add up, gently check in first: \"Just want to make sure, last time you said [X] was the priority. If we shift to [Y], we'd be moving away from that. Does that feel right to you?\"";

  const _whatTheyDone = isGoalClarification
    ? "This is their first session. No tasks have been generated or completed yet."
    : (() => {
        const completed = Object.entries(dayStatus || {}).filter(([,s]) => s === 'done');
        const skipped = Object.entries(dayStatus || {}).filter(([,s]) => s === 'skipped');
        if (completed.length === 0 && skipped.length === 0) return "No days completed yet.";
        const lines = completed.map(([dn]) => { const task = dayTasks?.[dn]; const note = dayNotes?.[dn]; return task ? "Day " + dn + " ✓: \"" + task.title + "\" [" + task.tag + "]" + (note ? ", note: \"" + note + "\"" : "") : "Day " + dn + ": done"; });
        skipped.forEach(([dn]) => { lines.push("Day " + dn + " ✗: SKIPPED"); });
        return lines.join("\n");
      })();

  const _whereTheyAre = isGoalClarification
    ? "This is a pre-program conversation. No tasks, dashboard, or schedule exist yet."
    : (() => {
        const lines = [];
        lines.push("They are currently on Day " + currentDay + " of their program (Week " + Math.ceil(currentDay / 7) + ", Cycle " + Math.ceil(currentDay / 56) + ")." + (currentDay % 56 > 49 ? " They are nearing the end of their current goal cycle." : ""));
        const todayTask = dayTasks?.[currentDay];
        if (todayTask) {
          lines.push("Today's task (Day " + currentDay + "): \"" + todayTask.title + "\" [" + todayTask.tag + "], not yet completed.");
          if (todayTask.desc) lines.push("Task description: " + todayTask.desc);
          if (todayTask.steps?.length) lines.push("Steps: " + todayTask.steps.map((s, i) => (i + 1) + ". " + s).join(" | "));
          if (todayTask.whyBase) lines.push("Why this task matters: " + todayTask.whyBase);
        } else { lines.push("Today's task (Day " + currentDay + "): not yet generated."); }
        const prevDay = currentDay - 1;
        const prevStatus = prevDay > 0 ? (dayStatus?.[prevDay] || "not started") : null;
        const prevTask = prevDay > 0 ? dayTasks?.[prevDay] : null;
        if (prevDay > 0 && prevStatus === "done" && prevTask) lines.push("IMPORTANT: They completed Day " + prevDay + " (\"" + prevTask.title + "\"), this is confirmed, do NOT say they haven't done it.");
        else if (prevDay > 0 && prevStatus === "skipped") lines.push("Day " + prevDay + " was skipped.");
        else if (prevDay > 0) lines.push("Day " + prevDay + " is pending.");
        const upcoming = [];
        for (let d = currentDay + 1; d <= Math.min(currentDay + 3, TOTAL_DAYS); d++) { const t = dayTasks?.[d]; if (t) upcoming.push("Day " + d + ": \"" + t.title + "\" [" + t.tag + "]"); }
        if (upcoming.length) lines.push("\nUpcoming tasks (review these — if any don't fit after this conversation, use CMD:REPLACE_DAY:N to swap them):\n" + upcoming.join("\n"));
        return lines.join("\n");
      })();

  const _timeAndMomentum = isGoalClarification ? "" : ("- Selected time window today: " + dailyTimeAvailable + " — CRITICAL: any task you suggest or adjust MUST be scoped to exactly " + dailyTimeAvailable + ". Never suggest a task shorter or longer than this.\n- Momentum score: " + (momentumScore ?? "not yet") + "/100 (" + (momentumLabel ?? "early days") + ")");

  const systemPrompt = `You are Mr. Bril, a warm and sharp career thinking partner inside the Be Brilliant app. You're friendly, encouraging, and genuinely invested in this person's progress. You have a playful side, you'll celebrate wins, gently call out excuses, and occasionally crack a smile, but you never joke about their career concerns. Think "the friend who hypes you up AND tells you the truth." You remember what they've said and bring it up when it matters.

CRITICAL — ${TODAY_CONTEXT()} When calculating deadlines or time remaining, ALWAYS use this date as your reference point. The current year is ${new Date().getFullYear()}. If someone says "by end of June" and it is currently ${TODAY_READABLE()}, that means June ${new Date().getMonth() < 5 ? new Date().getFullYear() : new Date().getFullYear() + 1} (the NEXT upcoming June, not a past one). Never say a future deadline has already passed.

═══ WHO THIS PERSON IS (from their quiz) ═══
- First name: ${(answers.name || "").trim() || "not given"}
- Role: ${roleName}${answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : ""}
- Seniority: ${["Early career, building foundations","Established, capable and growing","Senior, domain expert, leading or influencing others","Leadership, running a team or function","Executive, setting direction"][answers.seniority] || "not specified"}
- What's making this feel urgent: ${["AI is moving faster than I am","I feel stuck and need a change","A layoff made me rethink my path","I want a promotion or a better role","I want to move to a new company","I want to switch fields","Keen on exploring new opportunities","None of the above"][answers.urgency] || "not specified"}
- Main blockers: ${normalizeBlocker(answers.blocker).map(b => ["Not enough time","Too much information, don't know where to start","I start but don't follow through","I learn things but don't apply them","Direction paralysis"][b]).filter(Boolean).join("; ") || "not specified"}
- Action vs. understanding: ${answers.style_outcome_process != null ? (answers.style_outcome_process < 30 ? "strongly action-oriented, skip context, give the move" : answers.style_outcome_process < 50 ? "action-leaning" : answers.style_outcome_process > 70 ? "strongly understanding-oriented, needs to see the full picture first" : "leans toward understanding") : "balanced"}

═══ THE PERSON'S COMMITMENTS ═══
- Goal: "${goalText}"${goalDetailText2 ? ` (${goalDetailText2})` : ""}${goalDirection ? `, targeting: ${goalDirection}` : ""}
- Current week focus: "${currentWeekTheme || "building momentum"}"
${goalDeadline ? `- GOAL DEADLINE: ${goalDeadline}. Days remaining: ${Math.max(0, Math.ceil((new Date(goalDeadline) - new Date()) / 86400000))}. This is a time-bound goal, tasks should be front-loaded and urgency-calibrated. If the deadline is close (<2 weeks), every task should directly advance the goal. If the deadline has passed, THIS IS YOUR TOP PRIORITY: open with "Your target date was ${goalDeadline}. How did it go?" Based on their answer, either celebrate and help them set a new goal (CMD:CHANGE_GOAL_CUSTOM), extend the deadline (CMD:SET_DEADLINE), or help them adjust course. Don't skip this, the deadline passing is the most important thing to address.` : "- No specific deadline set. If they mention a timeframe (e.g. 'by end of month', 'in 4 weeks', 'before my review in June'), use CMD:SET_DEADLINE to capture it."}
${goalStatement ? `- Program goal statement: "${goalStatement}"` : ""}
${personWords.length ? `\nTHEIR OWN WORDS (notes they've written, goals they've set):\n${personWords.join("\n")}\n\nThese are things they chose to write down. Use them with care. If what they're saying now doesn't line up with what they wrote before, bring it up gently, not as a gotcha, but as a genuine question. "I noticed you wrote X last week. Does that still feel right, or has something shifted?" This is the value you provide that a journal can't, you remember, and you care enough to ask.` : ""}

═══ WHAT THEY'VE DONE ═══
${_whatTheyDone}

═══ WHERE THEY ARE RIGHT NOW ═══
${_whereTheyAre}

═══ WHAT YOU KNOW ABOUT THEM ═══
- Name: ${(answers.name || "").trim() || "not given"} (use their name naturally, but not in every message)
- Profile: ${plan.profileName}
- Role: ${roleName}
${_timeAndMomentum}
- Orientation: ${cl.orientation || "balanced"}
- Readiness: ${cl.readinessLevel || "medium"}
- Theory-practice gap: ${cl.hasTheoryGap ? "yes, they learn but don't apply" : "no"}
${brilSessionLog?.length ? `
═══ PAST CONVERSATIONS WITH THEM ═══
${brilSessionLog.map((s, i) => `Session ${i + 1} (Day ${s.dayNum}): ${s.summary}${s.changes?.length ? ` Changes made: ${s.changes.join(", ")}.` : ""}`).join("\n")}

This is your memory. Use it naturally and with kindness:
- If they said they'd do something last session, check in warmly: "You mentioned wanting to [X] last time. How did that go?"
- If they changed their goal before and seem to be drifting again, name it gently: "I've noticed we've shifted direction a few times. I want to make sure the program is pointed at the right thing for you."
- If they raised a blocker last time, follow up with care: "Last time you mentioned [X] was getting in the way. Is that still the case?"
- Don't recap this history to them. Just let it inform how you respond.` : ""}

═══ YOUR CORE JOB: HONEST, KIND ACCOUNTABILITY ═══

You are the accountability layer a paper journal can't provide. Your value is connecting what they said yesterday to what they're doing today, and doing it with genuine warmth. You're on their side. You notice things because you care, not because you're keeping score.

1. GOAL ALIGNMENT: If their weekly focus and their actions don't match, raise it as a question, not a verdict. "Your week focus is [X], but it looks like you've been spending time on [Y]. I wonder if the focus needs updating, or if there's something about [X] that feels harder to start?"

1b. 8-WEEK GOAL EVOLUTION: The goal is NOT set in stone. It's a living target. If you sense the person has outgrown their original goal, achieved it early, or discovered a more authentic direction through your conversations, name it: "When you started, your goal was [X]. Based on what you've been saying, it sounds like what you actually want is [Y]. Should we update your goal?" Use CMD:CHANGE_GOAL to update it. This is one of the most valuable things you do, helping them aim at the right thing, not just the first thing they wrote down.

2. COMMITMENT TRACKING: If they wrote a note about something they wanted to do and haven't yet, bring it up gently. "You wrote a note about wanting to [X]. That seemed important to you. Is it still on your mind?"

3. NOTICING CONTRADICTIONS: If what they're saying now doesn't match something from before, name it with curiosity, not judgment. "A couple sessions ago you mentioned [Z] was the priority. Today it sounds like [W] is pulling your attention. I want to make sure we're building toward the right thing, which one matters more right now?"

4. PATTERN NOTICING: If you see a pattern (repeated skipping, frequent goal changes, avoiding certain task types), name it honestly but kindly. "I've noticed the Reflect tasks tend to get skipped. No judgment, but I'm curious if there's something about those that doesn't land for you."

5. HELPING SHARPEN GOALS: If they suggest a weekly focus or goal that's vague or not well connected to their goal, help them make it stronger instead of just accepting it. "That's a starting point. Can we make it more specific? What would it look like if you really nailed that this week?" Or: "How does that connect to your bigger goal of [X]?"

6. WEEKLY GOAL EDITING: They can edit their weekly focus. If they want to change it, help them sharpen it first, then use CMD:WEEK_GOAL to set it. Gently probe weak ones: "I want to make sure this is the right focus. What would be different at the end of this week if you got this right?"

The tone is warm and direct, like a good friend who's genuinely invested in your progress. You say the honest thing, but you say it like someone who's rooting for them. Never sarcastic. Never condescending. Never "gotcha." Just caring and clear.

═══ RESPONSE STYLE ═══
- 2-3 sentences default. Go slightly longer only when wrapping up.
- One question at a time.
- No hollow affirmations ("Great!", "Absolutely!", "That's a great insight!"). But do acknowledge when something lands, briefly and sincerely. "That's honest" or "That makes sense" is fine.
- When they share something vulnerable or real, honor it. A simple "Thank you for saying that" or "That takes some honesty" goes a long way. Then build on it.
- Second person. Contractions. Short sentences. No em dashes.
- Be warm. You like this person. You want them to succeed.

═══ ENDING ═══
You have up to 30 exchanges, but you do NOT need to use them all. End the conversation when:
- You've covered meaningful ground and continuing would be circular
- The person seems satisfied or ready to move on
- The same themes keep coming up without new insight
- You've reached a natural conclusion

EARLY EXIT: If the conversation becomes circular (repeating themes, short non-committal replies, no new ground), wrap it up warmly. Don't force more exchanges.

WARM CLOSING (REQUIRED): You must NEVER end a conversation abruptly. Every closing must:
1. Thank them sincerely for the exchange ("Thanks for talking this through with me" or similar, in your own words)
2. If the conversation covered significant ground, briefly summarise the 2-3 key takeaways before closing
3. Leave them with one concrete, encouraging thing to carry into their day
4. Place NORA_DONE on a new line after your closing message

POST-CONVERSATION TASK REVIEW (MANDATORY — DO THIS EVERY TIME): Before writing NORA_DONE, you MUST review the current state of their program against what was discussed. Specifically check:
${_taskReviewSection}

═══ PROGRAM CHANGES ═══
${_programChangesHeader}
- Change overall goal (pick from list): present 5 options, confirm, then CMD:CHANGE_GOAL:N (N=0-4). Goals: 0=Get a promotion or level-up role, 1=Move to a better company, 2=Pivot into a new field, 3=Build skills to stay relevant as AI reshapes work, 4=Feel genuinely solid and confident
- Set a specific custom goal: CMD:CHANGE_GOAL_CUSTOM:their goal in their words
- Set a goal deadline: CMD:SET_DEADLINE:YYYY-MM-DD (IMPORTANT: Today is ${TODAY_ISO()}. When the person says "by end of June", that means ${new Date().getMonth() < 5 ? new Date().getFullYear() : new Date().getFullYear() + 1}-06-30. When they say "in 4 weeks", calculate from today. When they say "by April", that means ${new Date().getMonth() < 3 ? new Date().getFullYear() : new Date().getFullYear() + 1}-04-30. NEVER use a past year. Always use ${new Date().getFullYear()} or ${new Date().getFullYear() + 1}.)
${_proactiveSection}

Commands are parsed silently, confirm the change in natural language but don't reference the command syntax.

${isGoalClarification
  ? `GOAL CLARIFICATION SESSION: This is their first time. The program has NOT been built yet. No tasks exist. The user has NOT seen a dashboard or chosen how much time they have. Your ONLY job is to understand what they actually want and refine their goal.

Do NOT reference any tasks, daily schedule, time commitment, or "today's task". Do NOT mention "30 minutes" or any time amount. Do NOT say "your program" as if it exists yet. The program will be generated AFTER this conversation, using what you learn here.

Open warmly by acknowledging their goal: ${isCustomGoal ? `they wrote their own goal, so say "You wrote that you want to [goal]" and honor their own words` : `they picked from a list, so say "You chose [goal] as your focus" and probe whether that captures what they really want`}. Ask one thoughtful question that probes whether that's the real thing, what's actually driving it, what specifically they're trying to change, or what real progress would look like for them. If what they say is more specific or different from their answer, use CMD:CHANGE_GOAL_CUSTOM or CMD:CHANGE_GOAL to update it immediately. Do NOT mention a specific timeframe like "8 weeks" unless the person brings up a deadline themselves. IMPORTANT: If their goal includes a timeline or deadline (e.g. "land a job by end of April", "get promoted before my review in June", "launch by Q3"), capture it immediately with CMD:SET_DEADLINE:YYYY-MM-DD. Today is ${TODAY_ISO()}, so "by June" means ${new Date().getMonth() < 5 ? new Date().getFullYear() : new Date().getFullYear() + 1}-06-30, "by April" means ${new Date().getMonth() < 3 ? new Date().getFullYear() : new Date().getFullYear() + 1}-04-30. NEVER use a past year. If their goal is confirmed, end positively and let them know you'll build a plan around what you've discussed. Keep it tight, 3-4 exchanges, not an intake interview.`
  : needsDirectionQ
  ? "They want to move into a different field or start something of their own but haven't said where. Open with a warm, curious question asking what direction they're considering."
  : "Open with a single specific question that shows you've been paying attention. Good openers: reference something they wrote in a day note, gently ask about a skipped task, check whether their weekly focus still feels right, or ask what's on their mind today. Don't open with a generic 'how are things going'."}`;

  // Kick off with Bril's opening question
  useEffect(() => {
    const controller = new AbortController();
    const open = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: "user", content: "START" }],
          }),
        });
        const data = await res.json();
        const text = extractText(data).replace("NORA_DONE", "").trim();
        setMessages([{ role: "assistant", content: text }]);
      } catch (e) {
        if (e.name !== 'AbortError') setMessages([{ role: "assistant", content: "Let me ask you something specific. What's the one thing about your current situation that feels most stuck right now?" }]);
      }
      setLoading(false);
    };
    open();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const MAX_EXCHANGES = 30;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const updated = [...messages, { role: "user", content: userMsg }];
    setMessages(updated);
    setLoading(true);

    // Count how many user turns have happened (including this one)
    const userTurnCount = updated.filter(m => m.role === "user").length;
    const isNearEnd = userTurnCount >= MAX_EXCHANGES - 2;
    const isLast = userTurnCount >= MAX_EXCHANGES;

    // Detect circular conversation: last 3 user messages very similar or short non-committal
    const recentUser = updated.filter(m => m.role === "user").slice(-3).map(m => m.content.toLowerCase().trim());
    const isCircular = recentUser.length >= 3 && (
      recentUser.every(m => m.length < 25) ||
      (recentUser[0] === recentUser[1] || recentUser[1] === recentUser[2])
    );

    // Build the system prompt, appending signals when appropriate
    const promptWithSignal = isCircular
      ? systemPrompt + "\n\nNOTE: This conversation has become circular. It's time to close. Thank them warmly for the exchange, summarise any key takeaways if there were any, give them one concrete thing to carry forward, then write NORA_DONE on a new line. Before NORA_DONE, evaluate whether any CMDs should be issued based on what was discussed. Do not ask another question."
      : isLast
      ? systemPrompt + "\n\nNOTE: This is your final message. Thank them warmly for the exchange. If the conversation covered significant ground, briefly summarise 2-3 key takeaways. Give them one clear, concrete thing to carry into their day. Before writing NORA_DONE, evaluate whether any program changes (CMDs) should be issued based on what was discussed. Then write NORA_DONE on a new line. No questions."
      : isNearEnd
      ? systemPrompt + "\n\nNOTE: You're approaching the end of this conversation. Begin wrapping up naturally. Respond to what they said, then start moving toward a warm close. If there's significant ground to summarise, begin doing so."
      : systemPrompt;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: promptWithSignal,
          messages: updated,
        }),
      });
      const data = await res.json();
      const raw = extractText(data);
      const isDone = raw.includes("NORA_DONE") || isLast;
      const cleanText = raw.replace("NORA_DONE", "").replace(/CMD:[^\n]*/g, '').replace(/\n{2,}/g, '\n').trim();
      setMessages(prev => [...prev, { role: "assistant", content: cleanText }]);

      // Collect ALL commands from this response into a single object
      const cmds = {};
      let m;
      if ((m = raw.match(/CMD:REPLACE_DAY:(\d+):(.+)/))) {
        cmds.replaceDayN = parseInt(m[1]);
        cmds.replaceDayTask = m[2].split('\n')[0].trim();
      }
      if ((m = raw.match(/CMD:CHANGE_GOAL_CUSTOM:(.+)/))) {
        cmds.changeGoalCustom = m[1].split('\n')[0].trim();
      }
      if (raw.includes('CMD:REBUILD_WEEK')) cmds.rebuildWeek = true;
      if (raw.includes('CMD:SLOW_DOWN')) cmds.slowDown = true;
      if ((m = raw.match(/CMD:CHANGE_GOAL:(\d)/))) {
        cmds.changeGoal = parseInt(m[1]);
      }
      if ((m = raw.match(/CMD:WEEK_GOAL:(.+)/))) {
        cmds.weekGoal = m[1].split('\n')[0].trim();
      }
      if ((m = raw.match(/CMD:REPLACE_TODAY_TASK:(.+)/))) {
        cmds.replaceTodayTask = m[1].split('\n')[0].trim();
      }
      if ((m = raw.match(/CMD:REQUEST_TASK:(.+)/))) {
        cmds.requestedTask = m[1].split('\n')[0].trim();
      }
      if ((m = raw.match(/CMD:SET_DEADLINE:(\d{4}-\d{2}-\d{2})/))) {
        cmds.setDeadline = m[1];
      }

      // Call onInsight ONCE with all collected commands.
      // Always call on isDone (to save insight text even without CMDs),
      // and immediately when CMDs are present (so changes apply mid-conversation).
      const hasCmds = Object.keys(cmds).length > 0;
      if (hasCmds || isDone) {
        if (isDone) {
          cmds._done = true;
          // Attach full conversation for history storage
          cmds._messages = [...messages, { role: "assistant", content: cleanText }];
        }
        onInsight && onInsight(cleanText, cmds);
      }

      if (isDone) setDone(true);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Hmm, that didn't work. Mind trying again?" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(45,42,62,0.45)", zIndex: 100, display: "flex", alignItems: isGoalClarification ? "center" : "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 580, background: "#fff", borderRadius: isGoalClarification ? 20 : "20px 20px 0 0", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MrBrilAvatar size={36} />
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>Mr. Bril</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: T.muted, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
              <div style={{
                maxWidth: "82%",
                padding: "12px 16px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                background: m.role === "user" ? T.black : T.bg,
                border: m.role === "assistant" ? `1px solid ${T.border}` : "none",
              }}>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: m.role === "user" ? "#fff" : T.ink, margin: 0, lineHeight: 1.65 }}>{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
              <div style={{ padding: "12px 16px", background: T.bg, borderRadius: "4px 16px 16px 16px", border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.muted, animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input, blocked when done */}
        {done ? (
          <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, flexShrink: 0, textAlign: "center" }}>
            <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "0 0 12px", lineHeight: 1.55 }}>
              {isGoalClarification ? "Great conversation. Let's build your plan." : "That's all for now. Your plan has been updated where needed."}
            </p>
            <button onClick={onClose}
              style={{ background: T.brand, color: "#1E1E2A", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {isGoalClarification ? "Generate my plan →" : "Back to my plan →"}
            </button>
          </div>
        ) : (
          <div style={{ padding: "12px 16px calc(20px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={isGoalClarification ? "Type your answer..." : "What's on your mind? Mr. Bril is all ears..."}
                rows={2}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.sans, fontSize: 16, color: T.black, lineHeight: 1.55, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }}
              />
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ background: input.trim() && !loading ? T.brand : "#EEE", color: input.trim() && !loading ? "#1E1E2A" : "#AAA", border: "none", borderRadius: 10, padding: "12px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0, transition: "all 0.15s" }}>
                Send
              </button>
            </div>
            {isGoalClarification ? (
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <button onClick={() => {
                  // Build comprehensive insight from ALL messages so far
                  const userMsgs = messages.filter(m => m.role === "user").map(m => m.content);
                  const assistantMsgs = messages.filter(m => m.role === "assistant").map(m => m.content);
                  const fullInsight = [
                    userMsgs.length ? `What they said: ${userMsgs.join(" | ")}` : "",
                    assistantMsgs.length ? assistantMsgs.slice(-1)[0] : "",
                  ].filter(Boolean).join("\n\n");
                  setDone(true);
                  onInsight && onInsight(fullInsight, { _done: true, _messages: [...messages] });
                }}
                  style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.muted, cursor: "pointer", textDecoration: "underline", padding: "4px 8px" }}>
                  Skip ahead and generate my plan
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, margin: "8px 0 0" }}>Brainstorm, vent, change direction, tweak tomorrow's task, Mr. Bril is here for all of it</p>
                {messages.filter(m => m.role === "user").length >= 1 && (
                  <div style={{ marginTop: 6, textAlign: "center" }}>
                    <button onClick={() => {
                      const lastAssistant = messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";
                      setDone(true);
                      onInsight && onInsight(lastAssistant, { _done: true, _messages: [...messages] });
                    }}
                      style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: T.muted, cursor: "pointer", padding: "4px 8px", opacity: 0.7 }}>
                      End chat, back to my task
                    </button>
                  </div>
                )}
                {messages.filter(m => m.role === "user").length >= 25 && (
                  <p style={{ fontFamily: T.sans, fontSize: 10, color: T.muted, margin: "4px 0 0", opacity: 0.5 }}>
                    {MAX_EXCHANGES - messages.filter(m => m.role === "user").length} exchange{MAX_EXCHANGES - messages.filter(m => m.role === "user").length === 1 ? "" : "s"} left in this conversation
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Goal Statement Generator ────────────────────────────────────────────────
// Generates a short personalised goal line based on quiz + completed tasks.
// Called on mount and when significant progress happens (NOT on every task edit).
async function generateGoalStatement(plan, dayTasks, dayStatus, dayNotes) {
  const answers = plan._answers || {};
  const goalTexts = GOAL_TEXTS;
  const roleNames = ROLE_NAMES;

  const subRoleText = answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role]
    ? SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || ""
    : "";
  const goalDetailText = answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[answers.goal])?.options?.[answers.goal_detail]?.text || "") : "";
  const goalDirection = (answers.goal_direction || "").trim();
  const arc = plan.weekArc || {};
  const currentWeekNum = Math.min(8, Math.ceil((Object.values(dayStatus).filter(s => s === 'done').length + 1) / 7));
  const currentWeekTheme = [arc.w1, arc.w2, arc.w3, arc.w4, arc.w5, arc.w6, arc.w7, arc.w8][currentWeekNum - 1] || "building momentum";

  const doneDays = Object.entries(dayStatus).filter(([,s]) => s === 'done').length;
  const recentNotes = Object.entries(dayNotes)
    .filter(([k]) => !k.includes('_edit') && dayStatus[k] === 'done')
    .slice(-3)
    .map(([d, n]) => `Day ${d}: "${n}"`).join(', ');
  const recentTasks = Object.entries(dayTasks)
    .filter(([d]) => dayStatus[d] === 'done')
    .slice(-3)
    .map(([, t]) => t?.title).filter(Boolean).join(', ');

  const prompt = `Write a single short goal statement (8–14 words) for this professional's career program. It should feel personal and specific, not generic.
${TODAY_CONTEXT()}

Profile: ${plan.profileName}
Role: ${lk(roleNames, answers.role) || "professional"}${subRoleText ? ` (${subRoleText})` : ""}
Seniority: ${SENIORITY_TEXTS[answers.seniority] || "mid-career"}
Goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}${goalDetailText ? ` (${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}
Current week focus: "${currentWeekTheme}"
Days completed: ${doneDays}
Recent tasks done: ${recentTasks || "none yet"}
Recent notes: ${recentNotes || "none yet"}

Rules:
- 8–14 words only. No quotes. No full stop.
- Specific to their role and goal, not generic
- If days > 0 and tasks/notes available, reflect what they've actually been doing
- Should read like a personal mission statement for this week
- Second person: starts with a verb or "Build", "Make", "Develop" etc
- Do NOT use the word "goal" or "journey"

Return ONLY the statement, nothing else.`;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 60,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = extractText(data).trim();
    return text.replace(/^["']|["']$/g, "").trim();
  } catch (e) {
    return "";
  }
}

// ─── Weekly Check-In Modal ────────────────────────────────────────────────────
// Triggered automatically after completing the last day of each week.
// Bril reviews what landed, what shifted, and whether the goal is still right.
// The conversation output feeds directly into the next week's batch generation.
function WeeklyCheckInModal({ plan, completedWeek, weekTasks, weekNotes, weekStatus, onComplete, onSkip, goalDeadline }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const answers = plan._answers || {};
  const cl = plan.classification || {};

  const goalTexts = GOAL_TEXTS;
  const goalText = (answers.goal_custom || goalTexts[answers.goal]) || "move forward";
  const roleNames = ROLE_NAMES;
  const roleName = answers.role !== undefined ? roleNames[answers.role] || "professional" : "professional";
  const subRoleText = answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role]
    ? SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || ""
    : "";
  const goalDetailText = answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[answers.goal])?.options?.[answers.goal_detail]?.text || "") : "";
  const goalDirection = (answers.goal_direction || "").trim();
  const goalStatementText = plan._goalStatement || "";
  const stylePref = answers.style_outcome_process != null
    ? (answers.style_outcome_process < 30 ? "strongly action-oriented"
      : answers.style_outcome_process < 50 ? "action-leaning"
      : answers.style_outcome_process > 70 ? "strongly understanding-oriented"
      : "understanding-leaning") : "balanced";
  const arc = plan.weekArc || {};
  const weekThemes = [arc.w1, arc.w2, arc.w3, arc.w4, arc.w5, arc.w6, arc.w7, arc.w8];
  const thisWeekTheme = weekThemes[completedWeek - 1] || "building momentum";
  const nextWeekTheme = weekThemes[completedWeek] || null;

  // Summarise the week for the prompt
  const weekSummary = Array.from({ length: 7 }, (_, i) => {
    const d = (completedWeek - 1) * 7 + i + 1;
    const status = (weekStatus || {})[d];
    const note = (weekNotes || {})[d] || "";
    const task = (weekTasks || {})[d];
    return `Day ${d}: ${status === 'done' ? 'DONE' : status === 'skipped' ? 'SKIPPED' : 'unknown'} | "${task?.title || 'unknown'}"${note ? ` | Note: "${note}"` : ''}`;
  }).join('\n');

  const doneCount = Array.from({ length: 7 }, (_, i) => (completedWeek - 1) * 7 + i + 1).filter(d => (weekStatus || {})[d] === 'done').length;

  const systemPrompt = `You are Mr. Bril, a warm and sharp career coach inside the Be Brilliant app. You have a hint of loving sarcasm but always lead with encouragement. You are doing a brief weekly check-in with someone who just finished Week ${completedWeek} of their career development program.

CRITICAL — ${TODAY_CONTEXT()}

═══ WHO THIS PERSON IS ═══
Profile: ${plan.profileName}
Role: ${roleName}${subRoleText ? ` (${subRoleText})` : ""}
Seniority: ${SENIORITY_TEXTS[answers.seniority] || "mid-career"}
Orientation: ${cl.orientation || "balanced"}
Approach: ${stylePref}
What's making this feel urgent: ${URG_TEXTS[answers.urgency] || "not specified"}
Main blockers: ${normalizeBlocker(answers.blocker).map(b => BLOCKER_TEXTS[b]).filter(Boolean).join("; ") || "not specified"}

═══ THEIR GOAL ═══
Goal: "${goalText}"${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}${goalStatementText ? `\nBe Brilliant-refined goal statement: "${goalStatementText}"` : ""}
${goalDeadline ? `Goal deadline: ${goalDeadline} (${Math.max(0, Math.ceil((new Date(goalDeadline) - new Date()) / 86400000))} days remaining).${Math.ceil((new Date(goalDeadline) - new Date()) / 86400000) <= 0 ? " DEADLINE HAS PASSED. THIS IS YOUR TOP PRIORITY for this check-in. Open with: 'Your target date was " + goalDeadline + ". How did it go?' Then help them decide: celebrate and set a new goal (CMD:CHANGE_GOAL_CUSTOM), extend the deadline (CMD:SET_DEADLINE:YYYY-MM-DD), or pivot direction entirely. Don't skip this." : Math.ceil((new Date(goalDeadline) - new Date()) / 86400000) <= 14 ? " DEADLINE IS CLOSE. Check-in should focus on what's still needed to hit it. Every remaining task should directly advance the goal." : ""}` : ""}

═══ WEEK ${completedWeek} ═══
Theme: "${thisWeekTheme}"
${weekSummary}
Completed: ${doneCount}/7 days
${nextWeekTheme ? `\nPlanned Week ${completedWeek + 1} theme: "${nextWeekTheme}"` : ""}

YOUR JOB: In exactly 2–3 exchanges, find out:
1. What actually landed or surprised them this week
2. Whether their goal or focus feels the same or has shifted
3. Anything specific they want more of, less of, or differently in the next week

Then produce a brief insight summary (2–4 sentences) that will shape their Week ${completedWeek + 1} tasks.

RULES:
- One question at a time. Never two.
- Don't repeat what they said. Don't affirm ("Great!", "That's amazing!").
- Be direct and specific. Read the week data before asking, don't ask things you already know.
- If ${doneCount} < 4, acknowledge that directly and ask what got in the way, don't skip it.
- After 2–3 exchanges, close with a short insight summary, then say "NORA_DONE" on its own line.
- GOAL EVOLUTION: The goal can and should evolve. If the person has outgrown it, achieved it early, or discovered something more authentic, suggest updating it. People often start with a vague goal and clarify the real one through action. That's not failure, that's the program working. Use CMD:CHANGE_GOAL:N to update.
- If their goal has clearly shifted, include "CMD:CHANGE_GOAL:N" (N = 0–4, same scale as before).
- If the week focus should change, include "CMD:WEEK_GOAL:short 4–7 word theme".
- These commands go after NORA_DONE, each on its own line.

START: Open with one specific, direct question based on what you see in their week data. If they skipped a lot, ask about that. If they did everything, ask what actually moved them. Make it feel like you read their data.${completedWeek % 8 === 0 ? `

CYCLE COMPLETION: This is the end of a program cycle. After your normal check-in, you MUST ask about their goal going forward. Frame it naturally: "You've completed a full cycle. Your goal was [goal]. Looking at where you are now, do you want to keep pushing on the same goal, or has something shifted?" If they want to change, use CMD:CHANGE_GOAL_CUSTOM with their new goal. If they keep it, say something encouraging about carrying momentum forward. This is a required part of the cycle-end check-in.` : ""}`;

  useEffect(() => {
    const open = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: "user", content: "START" }],
          }),
        });
        const data = await res.json();
        const text = extractText(data).replace("NORA_DONE", "").trim();
        setMessages([{ role: "assistant", content: text }]);
      } catch {
        setMessages([{ role: "assistant", content: "Quick check before we build Week " + (completedWeek + 1) + ". What's the one thing from this week that actually shifted something for you?" }]);
      }
      setLoading(false);
    };
    open();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const updated = [...messages, { role: "user", content: userMsg }];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: systemPrompt,
          messages: updated,
        }),
      });
      const data = await res.json();
      const raw = extractText(data);
      const isDone = raw.includes("NORA_DONE");
      const text = raw.replace(/NORA_DONE[\s\S]*/g, "").trim();
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
      if (isDone) {
        setDone(true);
        const cleanText = raw.replace(/CMD:[^\n]*/g, "").replace(/NORA_DONE/, "").replace(/\n{2,}/g, "\n").trim();
        const cmds = {};
        if (raw.match(/CMD:CHANGE_GOAL:(\d)/)) cmds.changeGoal = parseInt(raw.match(/CMD:CHANGE_GOAL:(\d)/)[1]);
        if (raw.match(/CMD:CHANGE_GOAL_CUSTOM:(.+)/)) cmds.changeGoalCustom = raw.match(/CMD:CHANGE_GOAL_CUSTOM:(.+)/)[1].split('\n')[0].trim();
        if (raw.match(/CMD:WEEK_GOAL:(.+)/)) cmds.weekGoal = raw.match(/CMD:WEEK_GOAL:(.+)/)[1].split('\n')[0].trim();
        if (raw.match(/CMD:SET_DEADLINE:(\d{4}-\d{2}-\d{2})/)) cmds.setDeadline = raw.match(/CMD:SET_DEADLINE:(\d{4}-\d{2}-\d{2})/)[1];
        onComplete && onComplete(cleanText, cmds);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Mr. Bril had a brain freeze. Try once more?" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 110, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 580, background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", background: T.grad, borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MrBrilAvatar size={36} />
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>Mr. Bril</p>
              <p style={{ fontFamily: T.sans, fontSize: 11, color: "#5C5C6E", margin: 0 }}>Week {completedWeek} check-in · shapes your Week {completedWeek + 1} tasks</p>
            </div>
          </div>
          <button onClick={onSkip} style={{ background: "none", border: "none", fontSize: 13, color: "#5C5C6E", cursor: "pointer", padding: "4px 8px", fontFamily: T.sans }}>Skip →</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
              <div style={{ maxWidth: "82%", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px", background: m.role === "user" ? T.black : T.bg, border: m.role === "assistant" ? `1px solid ${T.border}` : "none" }}>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: m.role === "user" ? "#fff" : T.ink, margin: 0, lineHeight: 1.65 }}>{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
              <div style={{ padding: "12px 16px", background: T.bg, borderRadius: "4px 16px 16px 16px", border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", gap: 5 }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.muted, animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />)}</div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {done ? (
          <div style={{ padding: "16px 20px 24px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${T.brandL}`, borderTop: `3px solid ${T.brand}`, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: 0 }}>Building your Week {completedWeek + 1} tasks...</p>
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px 16px 24px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type your reply..."
                rows={2}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.sans, fontSize: 16, color: T.black, lineHeight: 1.55, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }}
              />
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ background: input.trim() && !loading ? T.brand : "#EEE", color: input.trim() && !loading ? "#fff" : "#AAA", border: "none", borderRadius: 10, padding: "12px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0 }}>
                Send
              </button>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, margin: "8px 0 0" }}>2–3 questions · shapes your next week</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── MomentumArc, extracted to respect hooks rules ──────────────────────────
const MomentumArc = React.memo(function MomentumArc({ momentumScore, momentumLabel }) {
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDisplayScore(momentumScore), 300);
    return () => clearTimeout(t);
  }, [momentumScore]);
  const arcColor = displayScore >= 80 ? "#5DCAA5" : displayScore >= 60 ? "#A78BFA" : displayScore >= 40 ? "#818CF8" : "rgba(30,30,42,0.15)";
  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
        <circle cx="40" cy="40" r="32" fill="none" stroke={arcColor} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(displayScore / 100) * 201} 201`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{momentumScore}</span>
        <span style={{ fontFamily: T.sans, fontSize: 9, color: "#5C5C6E", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{momentumLabel}</span>
      </div>
    </div>
  );
});

// ─── DayNoteField, extracted to respect hooks rules ─────────────────────────
function DayNoteField({ dayNum, dayNotes, setDayNotes }) {
  const saved = dayNotes[dayNum] || "";
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(!saved); // start in edit mode only if no saved note
  const [open, setOpen] = useState(!!saved);
  const [justSaved, setJustSaved] = useState(false);

  const save = () => {
    const trimmed = draft.trim();
    setDayNotes(prev => ({ ...prev, [dayNum]: trimmed }));
    setDraft(trimmed);
    setEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const isDirty = draft !== saved;

  return (
    <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 18, paddingTop: 12 }}>
      {!open && !saved ? (
        <button onClick={() => { setOpen(true); setEditing(true); }}
          style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.body, cursor: "pointer", padding: 0, opacity: 0.75, letterSpacing: 0.1 }}>
          + Add note
        </button>
      ) : editing ? (
        /* ── Editing state: active textarea + save button ── */
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Note to self..."
            rows={2}
            style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.brandMid}`, borderRadius: 6, fontFamily: T.sans, fontSize: 16, color: T.black, lineHeight: 1.55, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
            {saved && (
              <button onClick={() => { setDraft(saved); setEditing(false); }}
                style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: T.muted, cursor: "pointer", padding: "4px 8px" }}>
                Cancel
              </button>
            )}
            <button onClick={save} disabled={!draft.trim()}
              style={{ background: draft.trim() ? T.brand : "#E8E8E8", color: draft.trim() ? "#fff" : "#AAA", border: "none", borderRadius: 6, padding: "5px 12px", fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: draft.trim() ? "pointer" : "default", transition: "all 0.15s" }}>
              Save
            </button>
          </div>
        </div>
      ) : (
        /* ── Saved state: dimmed text + edit button ── */
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <p style={{
            flex: 1, margin: 0, padding: "7px 10px",
            fontFamily: T.sans, fontSize: 13, color: T.body, lineHeight: 1.55,
            background: T.bg, borderRadius: 6, border: `1px solid ${T.border}`,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            transition: "opacity 0.3s",
            opacity: justSaved ? 0.6 : 0.75,
          }}>
            {saved}
          </p>
          <button onClick={() => setEditing(true)}
            style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.brand, cursor: "pointer", padding: "7px 0", flexShrink: 0, letterSpacing: 0.1 }}>
            edit
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mail share button, email task to a friend ──────────
function DashboardScreen({ plan: initialPlan, onBack, startDate }) {

  // Local mutable copy of plan so we never mutate the parent's prop
  const [plan, setPlanState] = useState(initialPlan);
  useSEO({ title: `${plan.name ? plan.name + "'s" : "Your"} Program Dashboard`, description: "Your daily career development dashboard. Track progress, complete tasks, and chat with Mr. Bril.", path: "/dashboard", noIndex: true });

  // ── Storage key, unique per user profile ──────────────
  const storageKey = buildDashStorageKey(plan);

  // ── State: initialized with defaults, hydrated async from storage ──
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  // dayTasks: day 1 comes from plan, rest generated
  const [dayTasks, setDayTasks] = useState({ 1: plan.tasks?.[0] || null });
  // dayStatus: null=not started, 'done', 'skipped'
  const [dayStatus, setDayStatus] = useState({});
  // dayNotes: one-sentence optional reflection per day
  const [dayNotes, setDayNotes] = useState({});
  // generating: which day is currently being generated
  const [generating, setGenerating] = useState(null);
  const [dailyTimeAvailable, setDailyTimeAvailable] = useState("30 min");
  const [dailyTimeGenerating, setDailyTimeGenerating] = useState(false);
  const [showCelebration, setShowCelebration] = useState({});
  const [celebrationModal, setCelebrationModal] = useState(null); // {dayNum, earned, crossedMilestone?}
  const [credsMilestoneModal, setCredsMilestoneModal] = useState(null); // {tier, copy, total}
  const [achievementToasts, setAchievementToasts] = useState([]);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalUpdatedDay, setGoalUpdatedDay] = useState(null);
  const [goalUpdating, setGoalUpdating] = useState(false);
  const [paceSlow, setPaceSlow] = useState(false);
  const [weekGoalOverride, setWeekGoalOverride] = useState(null);
  const [adaptedWeekThemes, setAdaptedWeekThemes] = useState({}); // {weekNum: "adapted theme"}
  const [goalStatement, setGoalStatement] = useState("");
  const [arcOpen, setArcOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState({});
  // Bril modal
  const [brilOpen, setBrilOpen] = useState(false);
  const [brilInsight, setBrilInsight] = useState(null);
  const [brilDismissed, setBrilDismissed] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [brilGoalClarification, setBrilGoalClarification] = useState(false); // first-session goal mode
  const [brilMomentumBonus, setBrilMomentumBonus] = useState(0);
  const [brilChangeMade, setBrilChangeMade] = useState(false);
  const [brilPickDay, setBrilPickDay] = useState(null);
  const [brilSessionLog, setBrilSessionLog] = useState([]);
  const [brilChatHistory, setBrilChatHistory] = useState({}); // {dayNum: [{role, content}, ...]}
  const [viewChatDay, setViewChatDay] = useState(null); // day number to view past chat
  const [weekGenerating, setWeekGenerating] = useState(false);
  // Weekly check-in state
  const [weeklyCheckInOpen, setWeeklyCheckInOpen] = useState(null);
  const [weeklyCheckInDone, setWeeklyCheckInDone] = useState({});
  const [pendingWeekGen, setPendingWeekGen] = useState(null);
  const [weekFocusEdit, setWeekFocusEdit] = useState({});
  const [weekFocusInput, setWeekFocusInput] = useState({});
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [progressOpen, setProgressOpen] = useState(false);
  const [headerWeekEdit, setHeaderWeekEdit] = useState(false);
  const [headerWeekDraft, setHeaderWeekDraft] = useState("");
  const [cashPot, setCashPot] = useState(0);
  const [cashAnimations, setCashAnimations] = useState([]); // [{id, amount}]
  const [showCredsLog, setShowCredsLog] = useState(false);
  const [dailyQuotes, setDailyQuotes] = useState({}); // {dayNum: {text, author}}
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallBypassed, setPaywallBypassed] = useState(false);
  const [goalDeadline, setGoalDeadline] = useState(null); // ISO date string e.g. "2026-06-30"

  // Reset time picker when active day changes
  useEffect(() => {
    setDailyTimeAvailable("30 min");
    setDailyTimeGenerating(false);
  }, [activeDay]); // eslint-disable-line

  // ── Load persisted state once on mount (async) ───────────────
  useEffect(() => {
    (async () => {
      const saved = await Store.get(storageKey);
      if (saved) {
        if (saved.activeDay) setActiveDay(saved.activeDay);
        if (saved.dayTasks && Object.keys(saved.dayTasks).length > 0) setDayTasks(prev => ({ ...prev, ...saved.dayTasks }));
        if (saved.dayStatus) setDayStatus(saved.dayStatus);
        if (saved.dayNotes) setDayNotes(saved.dayNotes);
        if (saved.goalUpdatedDay) setGoalUpdatedDay(saved.goalUpdatedDay);
        if (saved.paceSlow) setPaceSlow(saved.paceSlow);
        if (saved.weekGoalOverride) setWeekGoalOverride(saved.weekGoalOverride);
        if (saved.adaptedWeekThemes) setAdaptedWeekThemes(saved.adaptedWeekThemes);
        if (saved.goalStatement) setGoalStatement(saved.goalStatement);
        if (saved.checkedSteps) setCheckedSteps(saved.checkedSteps);
        if (saved.brilInsight) setBrilInsight(saved.brilInsight);
        if (saved.brilDismissed) setBrilDismissed(saved.brilDismissed);
        if (saved.brilMomentumBonus) setBrilMomentumBonus(saved.brilMomentumBonus);
        if (saved.brilChangeMade) setBrilChangeMade(saved.brilChangeMade);
        if (saved.brilPickDay) setBrilPickDay(saved.brilPickDay);
        if (saved.brilSessionLog?.length) setBrilSessionLog(saved.brilSessionLog);
        if (saved.brilChatHistory) setBrilChatHistory(saved.brilChatHistory);
        if (saved.weeklyCheckInDone) setWeeklyCheckInDone(saved.weeklyCheckInDone);
        if (saved.weekFocusInput) setWeekFocusInput(saved.weekFocusInput);
        if (saved.customGoalInput) setCustomGoalInput(saved.customGoalInput);
        if (saved.cashPot != null) setCashPot(saved.cashPot);
        if (saved.paywallBypassed) setPaywallBypassed(saved.paywallBypassed);
        if (saved.goalDeadline) setGoalDeadline(saved.goalDeadline);
      }
      setStorageLoaded(true);
    })();
  }, []); // eslint-disable-line

  // ── Apply Bril intro data from plan (if coming from intro screen) ──
  useEffect(() => {
    if (!storageLoaded) return;
    // If Bril intro was done before reaching dashboard, seed the dashboard state
    if (plan._brilIntroDone && !brilDismissed) {
      setBrilDismissed(true);
    }
    if (plan._brilIntroInsight && !brilInsight) {
      setBrilInsight(plan._brilIntroInsight);
    }
    if (plan._goalDeadline && !goalDeadline) {
      setGoalDeadline(plan._goalDeadline);
    }
  }, [storageLoaded]); // eslint-disable-line

  // ── Persist to storage on every relevant state change ───
  // Debounced to avoid hammering on rapid state changes
  const saveTimerRef = useRef(null);
  const hasHydrated = useRef(false);
  useEffect(() => {
    // Don't persist until initial load is complete (avoids overwriting saved data with defaults)
    if (!storageLoaded) return;
    // Skip the first render after hydration (it would just re-write what we loaded)
    if (!hasHydrated.current) { hasHydrated.current = true; return; }
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      Store.set(storageKey, {
        activeDay, dayTasks, dayStatus, dayNotes,
        goalUpdatedDay, paceSlow, weekGoalOverride, adaptedWeekThemes, goalStatement,
        checkedSteps, brilInsight, brilDismissed, brilMomentumBonus,
        brilChangeMade, brilPickDay, brilSessionLog, brilChatHistory,
        weeklyCheckInDone, weekFocusInput, customGoalInput, cashPot,
        paywallBypassed, goalDeadline,
      });
      // Also update the plan's resume metadata so landing page stays current
      (async () => {
        try {
          const existing = await Store.get(PLAN_STORAGE_KEY) || {};
          const doneCount = Object.values(dayStatus).filter(s => s === 'done').length;
          const sc = calcStreak(dayStatus);
          Store.set(PLAN_STORAGE_KEY, {
            ...existing,
            _resumeDay: doneCount + 1,
            _resumeStreak: sc,
          });
        } catch { /* ignore */ }
      })();
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [
    storageLoaded,
    activeDay, dayTasks, dayStatus, dayNotes,
    goalUpdatedDay, paceSlow, weekGoalOverride, adaptedWeekThemes, goalStatement,
    checkedSteps, brilInsight, brilDismissed, brilMomentumBonus,
    brilChangeMade, brilPickDay, brilSessionLog, brilChatHistory,
    weeklyCheckInDone, weekFocusInput, customGoalInput, cashPot, paywallBypassed, goalDeadline,
  ]); // eslint-disable-line

  const tagColors = {
    "Apply":   { bg: "#FFE4D4", text: "#9A3D20", border: "#E8A080" },
    "Reflect": { bg: "#F4EDF8", text: "#6B3880", border: "#CCAADC" },
    "Read":    { bg: "#E8F0FF", text: "#3355AA", border: "#A8C0F0" },
    "Tool":    { bg: "#E6F5EE", text: "#2A6B45", border: "#90CCA8" },
  };

  // Generate Days 2-7 on dashboard mount, skip if already in storage
  const [weekFailed, setWeekFailed] = useState(false);
  const [isInitialWeekLoad, setIsInitialWeekLoad] = useState(true);
  const generateWeek = (day1Task) => {
    setWeekFailed(false);
    setWeekGenerating(true);
    generateWeekPlan(plan, day1Task).then(days => {
      if (days) {
        const newTasks = {};
        days.forEach(d => { newTasks[d.day] = d; });
        setDayTasks(prev => ({ ...prev, ...newTasks }));
        setWeekGenerating(false);
        setIsInitialWeekLoad(false);
      } else {
        setWeekGenerating(false);
        setIsInitialWeekLoad(false);
        setWeekFailed(true);
      }
    }).catch(() => { setWeekGenerating(false); setIsInitialWeekLoad(false); setWeekFailed(true); });
  };

  // ── Auto-generate Day 1 if missing, then generate week if needed ──
  const day1GenAttempted = useRef(false);
  useEffect(() => {
    if (!storageLoaded) return;
    const day1 = dayTasks[1];
    const hasSavedWeek = Object.keys(dayTasks).filter(k => parseInt(k) >= 2).length >= 3;

    // Case 1: Day 1 needs generating
    if ((!day1 || day1.tag === 'Tool') && !day1GenAttempted.current) {
      day1GenAttempted.current = true;
      setGenerating(1);
      generateNextDayTask(plan, 0, null, "", brilInsight || plan._brilIntroInsight || "", {}, {}, {})
        .then(t => {
          if (t) {
            setDayTasks(prev => ({ ...prev, 1: t }));
            setGenerating(null);
            if (!hasSavedWeek) generateWeek(t);
            else { setWeekGenerating(false); setIsInitialWeekLoad(false); }
          } else {
            setGenerating(null);
            setWeekGenerating(false);
            setIsInitialWeekLoad(false);
          }
        });
    // Case 2: Day 1 exists, check if week needs generating
    } else if (day1 && day1.tag !== 'Tool') {
      if (!hasSavedWeek) generateWeek(day1);
      else { setWeekGenerating(false); setIsInitialWeekLoad(false); }
    }
  }, [storageLoaded]); // eslint-disable-line

  // Generate initial goal statement, skip if we already have one
  useEffect(() => {
    if (!storageLoaded) return;
    if (!goalStatement) {
      generateGoalStatement(plan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
    }
  }, [storageLoaded]); // eslint-disable-line

  // Generate week arc (w1-w8 themes) on dashboard mount if missing
  useEffect(() => {
    if (!storageLoaded) return;
    if (plan.weekArc?.w1) return; // already have it
    (async () => {
      const arc = await generateWeekArc(plan._answers || {}, plan.classification || {}, brilInsight || plan._brilIntroInsight || "");
      if (arc) setPlanState(prev => ({ ...prev, weekArc: arc }));
    })();
  }, [storageLoaded]); // eslint-disable-line

  // Refresh goal statement when a week completes or every 7 days done
  const doneCount = Object.values(dayStatus).filter(s => s === 'done').length;
  useEffect(() => {
    if (doneCount > 0 && doneCount % 7 === 0) {
      generateGoalStatement(plan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
    }
  }, [doneCount]); // eslint-disable-line

  const goalIdx = plan._answers?.goal ?? -1;
  const weekThemes = [
    "Understand what's actually changing",
    "Make yourself harder to move",
    "Build toward the next role",
    "Open the doors that matter",
    "Build the confidence record",
    "Develop the clarity to lead",
  ];
  const weekTheme = plan.weekArc?.w1 || weekThemes[goalIdx] || "Build your baseline";

  const cl = plan.classification || {};
  const arc = plan.weekArc || {};
  const w1 = arc.w1 || (cl.readinessLevel === "high" ? "Go deeper, compound the edge" : cl.readinessLevel === "medium" ? "Close the gap" : "Build the first real habit");
  const w2 = arc.w2 || (cl.orientation === "optimizer" ? "Accelerate what's working" : cl.orientation === "protector" ? "Strengthen what's yours" : "Sharpen the picture");
  const w3 = arc.w3 || (goalIdx === 2 ? "Make the move visible" : goalIdx === 4 ? "Build the confidence record" : "Create something to point to");
  const w4 = arc.w4 || "Lock in the habit";

  // Highest unlocked day: day 1 always unlocked; each subsequent day unlocks after previous is done or skipped
  const highestUnlocked = useMemo(() => {
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      if (!dayStatus[d]) return d;
    }
    return TOTAL_DAYS;
  }, [dayStatus]);

  const streakCount = calcStreak(dayStatus);
  const currentWeek = Math.ceil(highestUnlocked / 7);

  // ── MOMENTUM SCORE (0–100) ──────────────────────────────
  // +8 per completed day, -3 per skipped day, +brilMomentumBonus, streak multiplier
  const momentumScore = useMemo(() => {
    const dc = Object.values(dayStatus).filter(s => s === 'done').length;
    const sc = Object.values(dayStatus).filter(s => s === 'skipped').length;
    const base = dc * 8 - sc * 3;
    const streakBonus = streakCount >= 21 ? 12 : streakCount >= 14 ? 8 : streakCount >= 7 ? 4 : streakCount >= 3 ? 2 : 0;
    return Math.max(0, Math.min(100, base + streakBonus + brilMomentumBonus));
  }, [dayStatus, streakCount, brilMomentumBonus]);

  const momentumLabel = momentumScore >= 80 ? "Peak" : momentumScore >= 60 ? "Strong" : momentumScore >= 40 ? "Building" : momentumScore >= 20 ? "Starting" : "Day 1";

  // ── WEEK BADGES ─────────────────────────────────────────
  // Earned when ≥5/7 days done in a completed week
  const weekBadges = useMemo(() => Array.from({ length: Math.min(currentWeek, TOTAL_WEEKS) }, (_, i) => {
    const wk = i + 1;
    const wkStart = i * 7 + 1;
    const wkDone = Array.from({ length: 7 }, (_, j) => wkStart + j).filter(d => dayStatus[d] === 'done').length;
    const wkComplete = wkStart + 6 < highestUnlocked;
    return wkComplete && wkDone >= 5 ? { week: wk, done: wkDone } : null;
  }).filter(Boolean), [dayStatus, highestUnlocked]);

  // Handles marking a day done or skipped, then triggers next-day generation
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [dayGenFailed, setDayGenFailed] = useState({});
  const dayContentRef = useRef(null);

  // Scroll to the time picker + task card when active day changes
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    // Small delay so React has rendered the new day content
    setTimeout(() => {
      if (dayContentRef.current) {
        dayContentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  }, [activeDay]); // eslint-disable-line
  const markDay = async (dayNum, status) => {
    const note = dayNotes[dayNum] || "";
    // Capture which achievements were already earned before this action
    const ctx0 = { dayStatus, dayTasks, streakCount, brilChangeMade, brilPickDay };
    const prevEarned = new Set(ACHIEVEMENTS.filter(a => a.earned(ctx0)).map(a => a.id));

    // Update status
    const newStatus = { ...dayStatus, [dayNum]: status };
    setDayStatus(newStatus);

    // Check for newly unlocked achievements with the updated status
    const newStreakCount = calcStreak(newStatus);
    const ctx1 = { dayStatus: newStatus, dayTasks, streakCount: newStreakCount, brilChangeMade, brilPickDay };
    const newlyEarned = ACHIEVEMENTS.filter(a => !prevEarned.has(a.id) && a.earned(ctx1));
    if (newlyEarned.length > 0) {
      newlyEarned.forEach((a, i) => {
        setTimeout(() => {
          setAchievementToasts(prev => [...prev, { ...a, _key: `${a.id}-${Date.now()}` }]);
        }, i * 200);
      });
    }

    // ── Strides award + celebration modal ────────────────
    if (status === 'done') {
      const tag = dayTasks[dayNum]?.tag || "Apply";
      const tagCreds = { Apply: 6, Read: 4, Reflect: 5, Tool: 8 };
      let earned = tagCreds[tag] ?? 5;
      if (newStreakCount >= 14) earned += 4;
      else if (newStreakCount >= 7) earned += 2;
      else if (newStreakCount >= 3) earned += 1;
      const animId = `act-${Date.now()}`;
      setCashAnimations(prev => [...prev, { id: animId, amount: earned }]);
      setTimeout(() => setCashAnimations(prev => prev.filter(a => a.id !== animId)), 1400);
      // Detect creds milestone crossing before updating cashPot
      const newPot = cashPot + earned;
      const crossedMilestone = CRED_MILESTONES.find(m => cashPot < m.at && newPot >= m.at) || null;
      setTimeout(() => setCashPot(prev => prev + earned), 500);
      setCelebrationModal({ dayNum, earned, streakCount: newStreakCount, crossedMilestone });

      // Pick a quote from the static library, instant, no API cost
      setDailyQuotes(prev => ({ ...prev, [dayNum]: pickQuote(dayNum) }));
    }
    if (dayNum < TOTAL_DAYS) {
      const nextDay = dayNum + 1;
      const completedWeek = dayNum % 7 === 0 ? dayNum / 7 : null;

      if (completedWeek && completedWeek < TOTAL_WEEKS) {
        // Week boundary: pause generation, open weekly check-in
        const nextWeek = completedWeek + 1;
        const nextWeekStart = completedWeek * 7 + 1;
        const notesWithCurrent = { ...dayNotes, [dayNum]: note };
        setPendingWeekGen({ nextWeek, nextWeekStart, newStatus, notesWithCurrent });
        setWeeklyCheckInOpen(completedWeek);
        setActiveDay(nextDay);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return; // generation happens after check-in completes
      } else {
        // Mid-week: only generate next day if not already pre-generated by batch
        if (!dayTasks[nextDay]) {
          setGenerating(nextDay);
          setDayGenFailed(prev => ({ ...prev, [nextDay]: false }));
          const editSignal = dayNotes[`${dayNum}_edit`] || "";
          const stepsChecked = checkedSteps[dayNum] || {};
          const checkedCount = Object.values(stepsChecked).filter(Boolean).length;
          const totalSteps = (dayTasks[dayNum]?.steps || []).length;
          const stepsSignal = totalSteps > 0 ? `Completed ${checkedCount} of ${totalSteps} steps.` : "";
          const paceNote = paceSlow ? "Person requested slower pace, keep this task shorter and lower-friction." : "";
          const sessionLogNote = brilSessionLog.length
            ? `Bril session history: ${brilSessionLog.slice(-3).map(s => s.summary).join(" | ")}`
            : "";
          const combinedNote = [note, stepsSignal, editSignal, paceNote, brilInsight ? `Be Brilliant coaching context: ${brilInsight.slice(0, 300)}` : "", sessionLogNote].filter(Boolean).join(" | ");
          const nextTask = await generateNextDayTask(plan, dayNum, status, combinedNote, brilInsight, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
          if (nextTask) {
            setDayTasks(prev => ({ ...prev, [nextDay]: nextTask }));
          } else {
            setDayGenFailed(prev => ({ ...prev, [nextDay]: true }));
          }
          setGenerating(null);
        }
      }
    }
  };
  const retryDayGen = async (dayNum) => {
    const prevDay = dayNum - 1;
    const status = dayStatus[prevDay] || 'done';
    setDayGenFailed(prev => ({ ...prev, [dayNum]: false }));
    setGenerating(dayNum);
    const note = [dayNotes[prevDay] || "", brilInsight ? `Be Brilliant coaching context: ${brilInsight.slice(0, 300)}` : ""].filter(Boolean).join(" | ");
    const nextTask = await generateNextDayTask(plan, prevDay, status, note, brilInsight, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
    if (nextTask) {
      setDayTasks(prev => ({ ...prev, [dayNum]: nextTask }));
    } else {
      setDayGenFailed(prev => ({ ...prev, [dayNum]: true }));
    }
    setGenerating(null);
  };

  // Called after weekly check-in completes, runs the deferred week batch generation
  const completeWeekGen = async (weekInsight, cmds = {}) => {
    if (!pendingWeekGen) return;
    const { nextWeek, nextWeekStart, newStatus, notesWithCurrent } = pendingWeekGen;
    // Apply any goal/theme changes from check-in (immutable, don't mutate props)
    let updatedPlan = plan;
    const goalChanged = !!(cmds.changeGoalCustom || cmds.changeGoal !== undefined);
    if (cmds.changeGoalCustom) {
      updatedPlan = { ...plan, _answers: { ...plan._answers, goal_custom: cmds.changeGoalCustom, goal_detail: undefined } };
      setPlanState(updatedPlan);
      setGoalUpdatedDay(highestUnlocked);
      setGoalStatement("");
    }
    if (cmds.changeGoal !== undefined) {
      updatedPlan = { ...plan, _answers: { ...plan._answers, goal: cmds.changeGoal, goal_detail: undefined } };
      setPlanState(updatedPlan);
      setGoalUpdatedDay(highestUnlocked);
      setGoalStatement("");
    }
    // Regenerate week arc when goal changes so themes + milestones align
    if (goalChanged) {
      const newArc = await generateWeekArc(updatedPlan._answers || {}, updatedPlan.classification || {});
      if (newArc) {
        updatedPlan = { ...updatedPlan, weekArc: newArc };
        setPlanState(updatedPlan);
        setWeekGoalOverride(null);
      }
    }
    if (cmds.weekGoal) setWeekGoalOverride(cmds.weekGoal);
    if (cmds.setDeadline) setGoalDeadline(cmds.setDeadline);
    const combinedInsight = [
      brilInsight,
      weekInsight,
      brilSessionLog.length ? `Bril session history: ${brilSessionLog.slice(-4).map(s => s.summary).join(" | ")}` : "",
    ].filter(Boolean).join('\n\n');
    if (weekInsight) setBrilInsight(combinedInsight);
    setWeeklyCheckInOpen(null);
    setWeeklyCheckInDone(prev => ({ ...prev, [nextWeek - 1]: weekInsight || true }));
    setPendingWeekGen(null);
    setWeekGenerating(true);
    const planWithGoal = { ...updatedPlan, _goalStatement: goalStatement, _goalDeadline: goalDeadline };
    const result = await generateWeekBatch(planWithGoal, nextWeek, nextWeekStart, dayTasks, newStatus, notesWithCurrent, combinedInsight);
    if (result?.days) {
      const newTasks = {};
      result.days.forEach(d => { newTasks[d.day] = d; });
      setDayTasks(prev => ({ ...prev, ...newTasks }));
      // Store the adapted theme if the model suggested a different one
      if (result.adaptedTheme) {
        setAdaptedWeekThemes(prev => ({ ...prev, [nextWeek]: result.adaptedTheme }));
      }
    } else {
      setWeekFailed(true);
    }
    setWeekGenerating(false);
    if (cmds.changeGoal !== undefined || cmds.changeGoalCustom) {
      generateGoalStatement(updatedPlan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
    }
  };

  // Calendar-aware day labels: Day 1 falls on the actual weekday the person started
  const START_DOW = startDate ? new Date(startDate).getDay() : 1; // 0=Sun,1=Mon,...6=Sat
  // Build 56-element array of real weekday labels for each day of the program
  const dayLabels = useMemo(() => Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const dow = (START_DOW + i) % 7;
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow];
  }), [START_DOW]);
  const daysOfWeek = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]; // kept for week grid row labels

  // For each week row, which real weekday does day N fall on?
  // weekDayLabels(wk): 7 labels for days (wk-1)*7+1 through wk*7
  const weekDayLabels = (wk) => Array.from({ length: 7 }, (_, i) => {
    const dayNum = (wk - 1) * 7 + i + 1;
    return dayLabels[dayNum - 1] || daysOfWeek[i];
  });
  const currentWeekStart = (currentWeek - 1) * 7 + 1;
  // Build week themes: first 8 from arc, beyond that use adapted or generic fallbacks
  const arcOriginals = [w1, w2, w3, w4, arc.w5, arc.w6, arc.w7, arc.w8];
  const getWeekTheme = (wk) => {
    if (adaptedWeekThemes[wk]) return adaptedWeekThemes[wk];
    if (wk <= 8) return arcOriginals[wk - 1] || `Week ${wk}`;
    // Beyond week 8: repeat the 8-week cycle pattern with adapted themes
    const weekInCycle = ((wk - 1) % 8);
    return arcOriginals[weekInCycle] || `Week ${wk}`;
  };
  const weekThemes56 = Array.from({ length: Math.max(currentWeek + 1, 8) }, (_, i) => getWeekTheme(i + 1));
  const currentWeekTheme = weekGoalOverride || weekThemes56[currentWeek - 1] || weekTheme;

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh", fontFamily: T.sans, animation: "fadeIn 0.5s ease" }}>
      <style>{`
        ${FONTS}
        @keyframes dbFloat1 { 0%, 100% { transform: translateY(0) rotate(12deg); } 50% { transform: translateY(-12px) rotate(16deg); } }
        @keyframes dbFloat2 { 0%, 100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-9px) rotate(-4deg); } }
        @keyframes dbFloat3 { 0%, 100% { transform: translateY(0) rotate(20deg); } 50% { transform: translateY(-7px) rotate(24deg); } }
        @keyframes dbSparkle { 0%, 100% { opacity: 0.35; transform: scale(0.85); } 50% { opacity: 0.65; transform: scale(1.15); } }
        @keyframes potLand {
          0%   { transform: scale(1) rotate(0deg); }
          20%  { transform: scale(1.18) rotate(-4deg); }
          45%  { transform: scale(0.91) rotate(3deg); }
          70%  { transform: scale(1.06) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes cashNumTick {
          0%   { opacity: 0; transform: translateY(7px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes actEarned {
          0%   { opacity: 0; transform: translateY(0) scale(0.8); }
          30%  { opacity: 1; transform: translateY(-28px) scale(1.15); }
          70%  { opacity: 1; transform: translateY(-36px) scale(1); }
          100% { opacity: 0; transform: translateY(-44px) scale(0.9); }
        }
        @media (max-width: 420px) {
          .sa-dash-task-card { padding: 20px 16px !important; }
          .sa-dash-bril-box { padding: 14px 14px !important; }
        }
        @media (max-width: 380px) {
          .sa-dash-task-card { padding: 16px 12px !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: "#FBF5E6", padding: "24px clamp(16px, 4vw, 24px) 20px", position: "relative", overflow: "hidden" }}>
        {/* Floating geometric shapes, mirror hero landing */}
        <div style={{ position: "absolute", top: 10, right: "11%", width: 54, height: 54, borderRadius: 15, background: C.lemon, pointerEvents: "none", opacity: 0.48, animation: "dbFloat1 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "38%", right: "3%", width: 30, height: 30, borderRadius: "50%", background: C.lavender, pointerEvents: "none", opacity: 0.48, animation: "dbSparkle 4s ease-in-out infinite 1s" }} />
        <div style={{ position: "absolute", bottom: "14%", right: "20%", width: 20, height: 20, borderRadius: 6, background: C.sky, pointerEvents: "none", opacity: 0.45, animation: "dbFloat3 5s ease-in-out infinite 0.5s" }} />
        <div style={{ position: "absolute", top: "28%", right: "32%", width: 14, height: 14, borderRadius: "50%", background: C.peach, pointerEvents: "none", opacity: 0.5, animation: "dbSparkle 3.5s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", bottom: "22%", left: "2%", width: 36, height: 36, borderRadius: 10, background: C.lavender, pointerEvents: "none", opacity: 0.38, animation: "dbFloat2 7s ease-in-out infinite 0.8s" }} />
        <div style={{ position: "absolute", top: 7, left: "22%", width: 16, height: 16, borderRadius: "50%", background: C.sky, pointerEvents: "none", opacity: 0.4, animation: "dbSparkle 5s ease-in-out infinite 1.5s" }} />
        <div style={{ position: "absolute", top: 14, left: "7%", width: 22, height: 22, borderRadius: 7, background: C.peach, pointerEvents: "none", opacity: 0.38, animation: "dbFloat1 8s ease-in-out infinite 3s" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "#9494A6", fontFamily: T.sans, fontSize: 12, cursor: "pointer", padding: 0 }}>←</button>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setProgressOpen(true)}
                style={{ background: "rgba(30,30,42,0.03)", border: `1px solid ${C.border}`, borderRadius: 20, padding: "7px 14px", fontFamily: T.sans, fontSize: 13, color: "#3A3A50", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(30,30,42,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(30,30,42,0.03)"}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="7" width="3" height="6" rx="1" fill="rgba(70,60,40,0.55)"/><rect x="5.5" y="4" width="3" height="9" rx="1" fill="rgba(70,60,40,0.55)"/><rect x="10" y="1" width="3" height="12" rx="1" fill="rgba(70,60,40,0.55)"/></svg>
                Progress
              </button>
              <button onClick={() => setArcOpen(o => !o)}
                style={{ background: T.brand, border: "none", borderRadius: 20, padding: "7px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: "#1E1E2A", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", boxShadow: "0 2px 8px rgba(232,168,32,0.2)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(232,168,32,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(232,168,32,0.2)"; }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2.5" cy="11.5" r="1.2" fill="#1E1E2A"/><line x1="3.5" y1="10.5" x2="7.5" y2="6.5" stroke="#1E1E2A" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 2C10.3 4.2 11.8 5.7 14 6C11.8 6.3 10.3 7.8 10 10C9.7 7.8 8.2 6.3 6 6C8.2 5.7 9.7 4.2 10 2Z" fill="#1E1E2A"/></svg>
                Goal map
              </button>
            </div>
          </div>

          {/* Greeting + week theme */}
          <p style={{ fontFamily: T.sans, fontSize: 15, color: "#D49518", margin: "0 0 5px", fontWeight: 600, letterSpacing: -0.2 }}>
            {plan.name ? `${plan.name.trim()}'s program` : "Your program"} · Week {currentWeek}
          </p>
          {/* Week theme, always displayed */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
            <h1 style={{ fontFamily: T.sans, fontSize: "clamp(20px,3.5vw,26px)", fontWeight: 700, color: T.ink, margin: 0, lineHeight: 1.25, letterSpacing: -0.5 }}>
              {currentWeekTheme}
            </h1>
          </div>

          {/* goal, compact */}
          {(() => {
            const goalTexts = GOAL_TEXTS;
            const rawGoalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];
            const displayText = (brilChangeMade && goalStatement) ? goalStatement : rawGoalText;
            const daysLeft = goalDeadline ? Math.max(0, Math.ceil((new Date(goalDeadline) - new Date()) / 86400000)) : null;
            return displayText ? (
              <div style={{ margin: "0 0 16px" }}>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: 0, lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 12, color: "#8A7830" }}>Goal </span>
                  {displayText}
                </p>
                {daysLeft !== null && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "5px 12px", borderRadius: 100, background: daysLeft <= 7 ? "#FEE2E2" : daysLeft <= 30 ? T.brandL : "rgba(30,30,42,0.04)", border: `1px solid ${daysLeft <= 7 ? "#FECACA" : daysLeft <= 30 ? T.brandMid + "60" : T.border}` }}>
                    <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: daysLeft <= 7 ? "#DC2626" : daysLeft <= 30 ? "#92400E" : T.body }}>
                      {daysLeft === 0 ? "Deadline today" : daysLeft < 0 ? `${Math.abs(daysLeft)}d past deadline` : `${daysLeft}d remaining`}
                    </span>
                    <span style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>
                      {goalDeadline && new Date(goalDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {/* ── STATS ROW, compact, horizontal ── */}
          <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>

            {/* Creds */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                onClick={() => setShowCredsLog(true)}
                style={{
                  height: 62, padding: "0 16px",
                  borderRadius: 16,
                  background: "#fff",
                  border: "1.5px solid rgba(200,150,30,0.3)",
                  boxShadow: "0 1px 6px rgba(180,130,20,0.1)",
                  display: "flex", alignItems: "center", gap: 9,
                  cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(180,130,20,0.18)"; e.currentTarget.style.borderColor = "rgba(200,150,30,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 6px rgba(180,130,20,0.1)"; e.currentTarget.style.borderColor = "rgba(200,150,30,0.3)"; }}>
                {/* Sparkle icon, matches brand ✦ motif, grows with progress */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M12 2C12.6 8 16 11.4 22 12C16 12.6 12.6 16 12 22C11.4 16 8 12.6 2 12C8 11.4 11.4 8 12 2Z"
                    fill={doneCount >= 21 ? "#E8A820" : doneCount >= 7 ? "#D49518" : doneCount >= 1 ? "#E8A820" : "#D8B860"}
                    opacity={doneCount === 0 ? 0.4 : 1}
                  />
                  {doneCount >= 7 && <circle cx="19" cy="5" r="1.5" fill="#F0C050" opacity="0.7"/>}
                  {doneCount >= 21 && <circle cx="5" cy="19" r="1" fill="#F0C050" opacity="0.6"/>}
                </svg>
                <div>
                  <p key={cashPot} style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 800, color: "#1E1E2A", margin: 0, lineHeight: 1, animation: cashAnimations.length > 0 ? "cashNumTick 0.35s ease 0.6s both" : "none" }}>{cashPot}</p>
                  <p style={{ fontFamily: T.sans, fontSize: 12, color: "#8B6914", margin: 0, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700 }}>Sparks</p>
                </div>
              </div>
              {cashAnimations.map(anim => (
                <div key={anim.id} style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 10, fontFamily: T.sans, fontSize: 13, fontWeight: 800, color: "#8B6914", whiteSpace: "nowrap", textShadow: "0 2px 8px rgba(139,105,20,0.4)", animation: "actEarned 1.3s ease-out forwards" }}>+{anim.amount} ✦</div>
              ))}
            </div>

            {/* Streak */}
            <div style={{
              height: 62, padding: "0 16px",
              borderRadius: 16,
              background: streakCount >= 7 ? "rgba(251,191,36,0.15)" : streakCount >= 3 ? "rgba(251,146,60,0.12)" : "rgba(30,30,42,0.04)",
              border: `1px solid ${streakCount >= 7 ? "rgba(180,140,20,0.35)" : streakCount >= 3 ? "rgba(180,120,40,0.25)" : "rgba(30,30,42,0.1)"}`,
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 800, color: T.ink, margin: 0, lineHeight: 1 }}>{streakCount || 0}</p>
                <p style={{ fontFamily: T.sans, fontSize: 12, color: "#6E5C3A", margin: 0, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>streak</p>
              </div>
            </div>

            {/* Week progress, ring */}
            {(() => {
              const weekDone = Array.from({length:7},(_,i)=>(currentWeek-1)*7+i+1).filter(d=>dayStatus[d]==='done').length;
              const pct = weekDone / 7;
              const circumference = 2 * Math.PI * 17;
              return (
                <div style={{
                  height: 62, padding: "0 12px 0 8px",
                  borderRadius: 16,
                  background: "rgba(30,30,42,0.04)",
                  border: "1px solid rgba(30,30,42,0.1)",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}>
                  <svg width="38" height="38" viewBox="0 0 38 38">
                    <circle cx="19" cy="19" r="17" fill="none" stroke="rgba(30,30,42,0.1)" strokeWidth="3" />
                    <circle cx="19" cy="19" r="17" fill="none" stroke={pct >= 1 ? "#4AE080" : "#F0C050"} strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${pct * circumference} ${circumference}`}
                      style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 0.5s ease" }} />
                    <text x="19" y="20" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 800, fill: "#2C2C3A" }}>{weekDone}</text>
                  </svg>
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 11, color: "#6E5C3A", margin: 0, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600, lineHeight: 1.3 }}>this</p>
                    <p style={{ fontFamily: T.sans, fontSize: 11, color: "#6E5C3A", margin: 0, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600, lineHeight: 1.3 }}>week</p>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      <div ref={dayContentRef} style={{ maxWidth: 600, margin: "0 auto", padding: "16px clamp(16px, 4vw, 24px) 24px" }}>


        {/* ── WEEK PLAN FAILED BANNER ── */}
        {weekFailed && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: "#991B1B", margin: 0 }}>Could not load your week plan. Check your connection.</p>
            <button onClick={() => generateWeek(dayTasks[1])} style={{ background: "#991B1B", color: "#fff", border: "none", fontFamily: T.sans, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>Retry</button>
          </div>
        )}

        {/* ── PROGRAM GRID, current week expanded, past weeks collapsible, future weeks hidden ── */}
        <div style={{ marginBottom: 24 }}>
          {Array.from({ length: Math.min(currentWeek + 1, TOTAL_WEEKS) }, (_, i) => i + 1).map(wk => {
            const wkStart = (wk - 1) * 7 + 1;
            const wkTheme = weekThemes56[wk-1] || `Week ${wk}`;
            const isCurrentWk = wk === currentWeek;
            const isPastWk = wk < currentWeek;
            const isFutureWk = wkStart > highestUnlocked && !isCurrentWk;

            // Skip future weeks entirely
            if (isFutureWk) return null;

            const wkDone = Array.from({length:7},(_,i)=>wkStart+i).filter(d=>dayStatus[d]==='done').length;
            const isExpanded = isCurrentWk || expandedWeek === wk;

            return (
              <div key={wk} style={{ marginBottom: 12 }}>
                {/* Week header row, clickable for past weeks */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isExpanded ? 7 : 0,
                  cursor: isPastWk ? "pointer" : "default",
                  padding: isPastWk && !isExpanded ? "6px 0" : "0",
                }}
                  onClick={() => { if (isPastWk) setExpandedWeek(expandedWeek === wk ? null : wk); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    {isCurrentWk
                      ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.brand, flexShrink: 0 }} />
                      : <span style={{ fontSize: 13, color: T.brand, flexShrink: 0 }}>✓</span>
                    }
                    <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: isCurrentWk ? T.brand : T.ink, flexShrink: 0 }}>Week {wk}</span>
                    <span style={{ fontFamily: T.sans, fontSize: 14, color: isCurrentWk ? T.ink : T.body, fontWeight: isCurrentWk ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wkTheme}</span>
                    {isCurrentWk && !headerWeekEdit && (
                      <button onClick={(e) => { e.stopPropagation(); setHeaderWeekDraft(currentWeekTheme); setHeaderWeekEdit(true); }}
                        style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: T.brandD, cursor: "pointer", padding: "2px 6px", flexShrink: 0, opacity: 0.85 }}>
                        edit
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 14, color: T.muted }}>{wkDone}/7</span>
                    {isPastWk && (
                      <span style={{ fontFamily: T.sans, fontSize: 12, color: T.brand, opacity: 0.7 }}>
                        {expandedWeek === wk ? "▾" : "▸"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline week focus edit */}
                {isCurrentWk && headerWeekEdit && (
                  <div style={{ padding: "10px 0 6px" }}>
                    <input
                      autoFocus
                      value={headerWeekDraft}
                      onChange={e => setHeaderWeekDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("inline-week-save")?.click(); } if (e.key === "Escape") setHeaderWeekEdit(false); }}
                      placeholder="e.g. Build stakeholder visibility"
                      style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: T.sans, fontSize: 16, fontWeight: 600, color: T.black, background: "#fff", outline: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button id="inline-week-save"
                        disabled={!headerWeekDraft.trim() || goalUpdating}
                        onClick={async () => {
                          const newFocus = headerWeekDraft.trim();
                          if (!newFocus) return;
                          setWeekGoalOverride(newFocus);
                          setHeaderWeekEdit(false);
                          setGoalUpdating(true);
                          const wkStartDay = (currentWeek - 1) * 7 + 1;
                          const remainingDays = Array.from({ length: 7 }, (_, j) => wkStartDay + j).filter(d => d > highestUnlocked && d <= wkStartDay + 6);
                          if (remainingDays.length > 0) {
                            const newTasks = {};
                            for (const d of remainingDays) {
                              const t = await generateNextDayTask(plan, d - 1, dayStatus[d - 1] || 'done', `Week focus: ${newFocus}`, brilInsight, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                              if (t) newTasks[d] = t;
                            }
                            setDayTasks(prev => ({ ...prev, ...newTasks }));
                          }
                          setGoalUpdating(false);
                        }}
                        style={{ background: headerWeekDraft.trim() && !goalUpdating ? T.brand : "rgba(30,30,42,0.04)", color: headerWeekDraft.trim() && !goalUpdating ? "#1E1E2A" : "rgba(30,30,42,0.35)", border: "none", borderRadius: 8, padding: "6px 14px", fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: headerWeekDraft.trim() && !goalUpdating ? "pointer" : "default" }}>
                        {goalUpdating ? "Saving…" : "Save + regenerate"}
                      </button>
                      <button onClick={() => setHeaderWeekEdit(false)}
                        style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: "#6E6E80", cursor: "pointer", padding: "6px 8px" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Day tiles, shown when current or expanded */}
                {isExpanded && (
                  <div style={{ display: "flex", gap: 5 }}>
                    {weekDayLabels(wk).map((d, i) => {
                      const dayNum = wkStart + i;
                      const status = dayStatus[dayNum];
                      const isActive = dayNum === activeDay;
                      const isFuture = dayNum > highestUnlocked;
                      const isGeneratingThis = weekGenerating && isFuture && wk === currentWeek;
                      return (
                        <div key={dayNum} style={{ flex: 1, textAlign: "center", cursor: !isFuture ? "pointer" : "default" }}
                          onClick={() => { if (!isFuture) { setActiveDay(dayNum); window.scrollTo({ top: 0, behavior: "smooth" }); } }}>
                          <p style={{ fontFamily: T.sans, fontSize: 13, color: isActive ? T.brand : T.ink, margin: "0 0 5px", fontWeight: isActive ? 700 : 500, letterSpacing: 0.1 }}>{d}</p>
                          <div style={{
                            height: 36, borderRadius: 10,
                            background: status === 'done' ? "#E8A820" : status === 'skipped' ? "#EEEDEE" : isActive ? T.brandL : "#F2F1F4",
                            border: isActive && !status ? `2px solid ${T.brandMid}` : "2px solid transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: isFuture && !isGeneratingThis ? 0.3 : 1,
                            transition: "all 0.25s ease",
                          }}>
                            {status === 'done' && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                            {status === 'skipped' && <span style={{ color: T.muted, fontSize: 11 }}>–</span>}
                            {!status && !isFuture && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isActive ? T.brand : "#C8C4DC" }} />}
                            {isFuture && isGeneratingThis && <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.peach, opacity: 0.5 }} />}
                            {isFuture && !isGeneratingThis && <svg width="6" height="7" viewBox="0 0 8 9" fill="none"><rect x="0.5" y="3.5" width="7" height="5" rx="1.2" stroke="#C8C4DC" strokeWidth="1.1"/><path d="M2 3.5V2.5a2 2 0 0 1 4 0v1" stroke="#C8C4DC" strokeWidth="1.1" strokeLinecap="round"/></svg>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>


        {/* ── ACTIVE DAY CONTENT ── */}
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(dayNum => {
          if (dayNum !== activeDay) return null;
          const task = dayTasks[dayNum];
          const status = dayStatus[dayNum];
          const note = dayNotes[dayNum] || "";
          const isGenerating = generating === dayNum;
          const isLocked = dayNum > highestUnlocked;
          const ts = task ? (tagColors[task.tag] || tagColors["Read"]) : tagColors["Apply"];

          if (isLocked) {
            return (
              <div key={dayNum} style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="none"><rect x="1" y="7" width="14" height="10" rx="2.5" stroke={T.muted} strokeWidth="1.5"/><path d="M4 7V5a4 4 0 0 1 8 0v2" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 18, color: T.ink, margin: "0 0 10px", fontWeight: 600 }}>Day {dayNum} is waiting.</p>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.muted, margin: 0, lineHeight: 1.6 }}>Complete Day {dayNum - 1} to unlock. Each task is generated from your progress.</p>
              </div>
            );
          }

          if (dayGenFailed[dayNum]) {
            return (
              <div key={dayNum} style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: "0 0 6px", fontWeight: 600 }}>Could not build Day {dayNum}.</p>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: "0 0 20px", lineHeight: 1.6 }}>Check your connection and try again.</p>
                <button onClick={() => retryDayGen(dayNum)}
                  style={{ background: T.brand, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "11px 24px", borderRadius: 10, cursor: "pointer" }}>
                  Try again
                </button>
              </div>
            );
          }

          if (isGenerating || (!task && !isLocked && (weekGenerating || generating !== null))) {
            return (
              <div key={dayNum} style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.brandL}`, borderTop: `3px solid ${T.brand}`, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ fontFamily: T.sans, fontSize: 17, color: T.ink, margin: "0 0 4px", fontWeight: 600 }}>
                  {`Building Day ${dayNum}...`}
                </p>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.muted, margin: 0 }}>
                  {weekGenerating ? "Generating your week ahead." : dayNum === 1 ? "Personalising your first task." : `Adapting to your progress.`}
                </p>
              </div>
            );
          }

          // Task still missing after generation finished → show retry
          if (!task && !isLocked) {
            return (
              <div key={dayNum} style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: "0 0 6px", fontWeight: 600 }}>Could not build Day {dayNum}.</p>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: "0 0 20px", lineHeight: 1.6 }}>Check your connection and try again.</p>
                <button onClick={() => retryDayGen(dayNum)}
                  style={{ background: T.brand, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "11px 24px", borderRadius: 8, cursor: "pointer" }}>
                  Try again
                </button>
              </div>
            );
          }

          return (
            <div key={dayNum}>
              {/* Back breadcrumb, shown when viewing a past day */}
              {status && dayNum < (currentWeek - 1) * 7 + 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <button onClick={() => { setActiveDay(highestUnlocked); setExpandedWeek(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.brand, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    ← Back to Week {currentWeek}
                  </button>
                  <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>· Day {dayNum} · {status === 'done' ? 'Completed' : 'Skipped'}</span>
                </div>
              )}
              {/* ── DAILY TIME PICKER, only when task not yet done/skipped ── */}
              {!status && task && (
                <div style={{ background: "#fff", border: `1px solid #E6E4EE`, borderRadius: 16, padding: "16px 20px", marginBottom: 16 }}>
                  <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>How much time do you have today?</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["15 min", "30 min", "45 min", "1 hour", "3 hours", "5 hours+"].map(opt => {
                      const sel = dailyTimeAvailable === opt;
                      return (
                        <button key={opt} onClick={async () => {
                          if (dailyTimeGenerating) return;
                          setDailyTimeAvailable(opt);
                          setDailyTimeGenerating(true);

                          // Map time slots to task count, per-task time is now API-decided
                          const timeConfig = {
                            "15 min": { count: 1, totalMin: 15, stepsPerTask: "1-2" },
                            "30 min": { count: 1, totalMin: 30, stepsPerTask: "2-4" },
                            "45 min": { count: 1, totalMin: 45, stepsPerTask: "3-5" },
                            "1 hour": { count: 2, totalMin: 60, stepsPerTask: "2-4" },
                            "3 hours": { count: 4, totalMin: 180, stepsPerTask: "3-5" },
                            "5 hours+": { count: 5, totalMin: 300, stepsPerTask: "4-6" },
                          };
                          const cfg = timeConfig[opt] || timeConfig["30 min"];

                          try {
                            if (cfg.count === 1) {
                              // Single task: regenerate with exact time constraint
                              const timeHint = `TIME AVAILABLE TODAY: ${opt}. Generate exactly 1 task that takes exactly ${opt}. Include ${cfg.stepsPerTask} concrete steps. Set the "time" field to exactly "${opt}".`;
                              const t = await generateNextDayTask(plan, dayNum - 1, dayStatus[dayNum - 1] || 'done', timeHint, brilInsight, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                              if (t) {
                                t.time = opt;
                                t._subtasks = null;
                                setDayTasks(prev => ({ ...prev, [dayNum]: t }));
                              }
                            } else {
                              // Multiple tasks: let the API decide individual time allocations based on complexity
                              const timeHint = `TIME AVAILABLE TODAY: ${opt} (${cfg.totalMin} minutes total). Generate exactly ${cfg.count} separate career development tasks. IMPORTANT: Allocate time per task based on complexity, simpler tasks (like a quick read or reflection) should get less time, deeper tasks (like building something or writing a piece of work) should get more. The only constraint: all task "time" fields must sum to exactly ${cfg.totalMin} minutes. Each task must have ${cfg.stepsPerTask} steps. Tasks should complement each other and be diverse in type (mix of Apply, Read, Reflect, Tool). HARD RULE: NO AI tool tasks.

Return ONLY valid JSON, no markdown:
{"tasks":[${Array.from({ length: cfg.count }, () => '{"tag":"Apply|Read|Reflect","time":"X min","title":"...","desc":"...","steps":[...],"whyBase":"..."}').join(",")}]}`;
                              try {
                                const res = await fetch("/api/generate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    model: "claude-sonnet-4-6",
                                    max_tokens: 3000,
                                    messages: [{ role: "user", content: (() => {
                                      const _answers = plan._answers || {};
                                      const _cl = plan.classification || {};
                                      const _subRole = _answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[_answers.role] ? SUB_ROLE_QUESTIONS[_answers.role].options[_answers.role_detail]?.text || "" : "";
                                      const _goalDetail = _answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[_answers.goal])?.options?.[_answers.goal_detail]?.text || "") : "";
                                      const _goalDir = (_answers.goal_direction || "").trim();
                                      const _goalStmt = plan._goalStatement || "";
                                      const _style = _answers.style_outcome_process != null ? (_answers.style_outcome_process < 30 ? "action-oriented" : _answers.style_outcome_process < 50 ? "action-leaning" : _answers.style_outcome_process > 70 ? "understanding-oriented" : "understanding-leaning") : "balanced";
                                      const _arc = plan.weekArc || {};
                                      const _wkNum = Math.min(8, Math.ceil(dayNum / 7));
                                      const _wkTheme = [_arc.w1, _arc.w2, _arc.w3, _arc.w4, _arc.w5, _arc.w6, _arc.w7, _arc.w8][_wkNum - 1] || "Keep building";
                                      const _dayHist = Array.from({ length: Math.min(dayNum - 1, 7) }, (_, i) => dayNum - 1 - i).filter(d => d >= 1).reverse().map(d => {
                                        const ds = dayStatus[d]; const dt = dayTasks[d]; const dn = dayNotes[d] || "";
                                        return `Day ${d}: ${ds === 'done' ? 'DONE' : ds === 'skipped' ? 'SKIPPED' : 'pending'} | ${dt ? `"${dt.title}" [${dt.tag}]` : "unknown"}${dn ? ` | Note: "${dn}"` : ""}`;
                                      }).join("\n");
                                      return `Generate ${cfg.count} career development tasks for this person's Day ${dayNum}.

═══ FULL PROFILE ═══
Profile: ${plan.profileName}
Role: ${plan.roleName || ROLE_NAMES[_answers.role] || "professional"}${_subRole ? ` (${_subRole})` : ""}
Seniority: ${SENIORITY_TEXTS[_answers.seniority] || "mid-career"}
Approach: ${_style}
What's making it urgent: ${URG_TEXTS[_answers.urgency] || "not specified"}
Main blockers: ${normalizeBlocker(_answers.blocker).map(b => BLOCKER_TEXTS[b]).filter(Boolean).join("; ") || "not specified"}
Readiness: ${_cl.readinessLevel || "medium"}

═══ GOAL CONTEXT ═══
Goal: ${_answers.goal_custom || GOAL_TEXTS[_answers.goal] || "move forward"}${_goalDetail ? ` (${_goalDetail})` : ""}${_goalDir ? `\nTarget direction: ${_goalDir}` : ""}${_goalStmt ? `\nBe Brilliant-refined goal: "${_goalStmt}"` : ""}

═══ THIS WEEK ═══
Week ${_wkNum} focus: "${_wkTheme}"
${brilInsight ? `\n═══ BE BRILLIANT COACHING CONTEXT ═══\n${brilInsight.slice(0, 400)}\n` : ""}
═══ RECENT HISTORY ═══
${_dayHist || "No previous days yet."}

${timeHint}`;
                                    })() }],
                                  }),
                                });
                                const data = await res.json();
                                const text = extractText(data);
                                const start = text.indexOf("{"); const end = text.lastIndexOf("}");
                                if (start !== -1 && end !== -1) {
                                  const parsed = JSON.parse(text.slice(start, end + 1));
                                  if (parsed.tasks?.length >= 1) {
                                    const fixedTasks = parsed.tasks.slice(0, cfg.count);
                                    const mainTask = { ...fixedTasks[0], _subtasks: fixedTasks.slice(1) };
                                    setDayTasks(prev => ({ ...prev, [dayNum]: mainTask }));
                                  }
                                }
                              } catch (innerErr) {
                                console.error("Multi-task generation failed:", innerErr);
                                // Fallback: single task for full duration
                                const t = await generateNextDayTask(plan, dayNum - 1, dayStatus[dayNum - 1] || 'done', `TIME AVAILABLE TODAY: ${opt}. Generate 1 substantial task of ${opt} with ${cfg.stepsPerTask} detailed steps. Set "time" to "${opt}".`, brilInsight, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                                if (t) { t.time = opt; setDayTasks(prev => ({ ...prev, [dayNum]: t })); }
                              }
                            }
                          } catch (outerErr) {
                            console.error("Time picker generation failed:", outerErr);
                          } finally {
                            setDailyTimeGenerating(false);
                          }
                        }}
                          style={{
                            fontFamily: T.sans, fontSize: 13, fontWeight: sel ? 700 : 500,
                            padding: "8px 16px", borderRadius: 20,
                            border: `1.5px solid ${sel ? T.brandD : T.border}`,
                            background: sel ? T.brandD : "#fff",
                            color: sel ? "#fff" : T.ink,
                            cursor: dailyTimeGenerating ? "wait" : "pointer",
                            transition: "all 0.12s",
                            opacity: dailyTimeGenerating && !sel ? 0.4 : 1,
                          }}>
                          {opt}
                        </button>
                      );
                    })}
                    {dailyTimeGenerating && (
                      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14, padding: "14px 0", background: "#fff", borderRadius: 14, border: `1.5px solid ${T.border}`, boxShadow: "0 2px 8px rgba(30,30,42,0.04)" }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid ${T.brandL}`, borderTop: `2.5px solid ${T.brand}`, animation: "spin 0.8s linear infinite" }} />
                        <span style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 600, color: T.ink }}>Building your {dailyTimeAvailable} plan…</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── MR. BRIL TASK INVITE ── */}
              {task && !status && (
                <div
                  onClick={() => setBrilOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "#FFFDF7", border: `1.5px solid ${T.brandMid}50`,
                    borderRadius: 16, padding: "14px 18px", marginBottom: 16,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.boxShadow = "0 2px 12px rgba(232,168,32,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${T.brandMid}50`; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <MrBrilAvatar size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 14, color: T.ink, margin: 0, lineHeight: 1.5 }}>
                      I picked today's task based on where you are. Take a look, if it doesn't feel right, <span style={{ color: T.brandD, fontWeight: 600 }}>let's fine-tune it together</span>.
                    </p>
                  </div>
                  <span style={{ fontSize: 16, color: T.brandD, flexShrink: 0 }}>→</span>
                </div>
              )}

              {/* ── TASK CARD(S) ── */}
              {(() => {
                const allTasks = [task, ...(task._subtasks || [])];
                const goalIdx2 = plan._answers?.goal ?? -1;
                const whyLabel2 = [
                  "Why this moves you toward that role:",
                  "Why this makes you a stronger candidate:",
                  "Why this builds toward the pivot:",
                  "Why this keeps you relevant:",
                  "Why this builds real confidence:",
                ][goalIdx2] || "Why this matters:";

                // Compute total time from all task time fields
                const parseMin = (s) => { if (!s) return 0; const m = s.match(/(\d+)/); return m ? parseInt(m[1]) : 0; };
                const totalMin = allTasks.reduce((sum, t) => sum + parseMin(t.time), 0);
                const totalLabel = totalMin >= 60 ? (Math.floor(totalMin / 60) + "h" + (totalMin % 60 ? " " + (totalMin % 60) + "m" : "")) : (totalMin + " min");

                return (
                  <>
                    {allTasks.length > 1 && !status && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", marginBottom: 8 }}>
                        <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink }}>{allTasks.length} tasks for today</span>
                        <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.brand }}>Total: {totalLabel}</span>
                      </div>
                    )}
                    {allTasks.map((t, ti) => {
                  const tColors = tagColors[t.tag] || tagColors["Read"];
                  return (
                    <div key={ti} className="sa-dash-task-card" style={{ background: "#fff", border: `1px solid ${status === 'done' ? "#E6E4EE" : status === 'skipped' ? T.border : "#E6E4EE"}`, borderRadius: 20, padding: "clamp(18px,4vw,28px) clamp(16px,3vw,24px)", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,23,48,0.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", background: tColors.bg, color: tColors.text, border: `1.5px solid ${tColors.border}`, borderRadius: 6 }}>{t.tag}</span>
                        <span style={{ fontFamily: T.sans, fontSize: 15, color: T.body }}>{t.time}</span>
                        {ti === 0 && !status && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.brand, letterSpacing: 0.3 }}>Day {dayNum}{allTasks.length > 1 ? ` · ${allTasks.length} tasks` : ""}</span>}
                        {ti > 0 && !status && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.muted, letterSpacing: 0.3 }}>Task {ti + 1} of {allTasks.length}</span>}
                        {ti === 0 && status === 'done' && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.brandD, background: T.brandL, padding: "4px 12px", borderRadius: 20 }}>Done ✓</span>}
                        {ti === 0 && status === 'skipped' && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, color: T.muted, background: T.bg, padding: "4px 12px", borderRadius: 20 }}>Skipped</span>}
                      </div>
                      <h3 style={{ fontFamily: T.sans, fontSize: 19, fontWeight: 700, color: T.ink, margin: "0 0 14px", lineHeight: 1.3 }}>{t.title}</h3>
                      <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: "0 0 18px", lineHeight: 1.85 }}>{t.desc}</p>
                      <TaskSteps steps={t.steps} initialChecked={(checkedSteps[`${dayNum}_${ti}`] || checkedSteps[dayNum] || {})} onCheckedChange={c => setCheckedSteps(prev => ({ ...prev, [`${dayNum}_${ti}`]: c }))} tagBg={tColors.bg} tagAccent={tColors.text} />
                      {(t.whyBase || t.why) && (
                        <div style={{ borderLeft: `3px solid ${tColors.border || T.border}`, paddingLeft: 14 }}>
                          <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: 0, lineHeight: 1.75 }}>
                            <strong style={{ color: T.ink, fontSize: 15 }}>{whyLabel2} </strong>{t.whyBase || t.why}
                          </p>
                        </div>
                      )}
                      {ti === allTasks.length - 1 && (
                        <DayNoteField dayNum={dayNum} dayNotes={dayNotes} setDayNotes={setDayNotes} />
                      )}
                    </div>
                  );
                })}
                  </>
                );
              })()}

              {/* ── COMPLETION ── */}
              {!status && !showCelebration[dayNum] && (
                <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", border: `1.5px solid ${C.border}` }}>
                  <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 18px" }}>Did you complete today's task?</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => markDay(dayNum, 'done')}
                      style={{ flex: 1, background: T.brandD, color: "#fff", border: "none", borderRadius: 50, padding: "15px 0", fontFamily: T.sans, fontSize: 16, fontWeight: 600, cursor: "pointer", letterSpacing: -0.2, transition: "transform 0.12s", boxShadow: "0 2px 10px rgba(232,168,32,0.25)" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px) scale(1.01)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0) scale(1)"}>
                      Yes, done
                    </button>
                    <button onClick={() => markDay(dayNum, 'skipped')}
                      style={{ flex: 0.5, background: C.offWhite, color: T.body, border: `1px solid rgba(30,30,42,0.18)`, borderRadius: 50, padding: "15px 0", fontFamily: T.sans, fontSize: 14, cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F0EFF8"}
                      onMouseLeave={e => e.currentTarget.style.background = C.offWhite}>
                      Not today
                    </button>
                  </div>
                </div>
              )}

              {/* ── COMPLETED STATE ── */}
              {status === 'done' && dayNum < TOTAL_DAYS && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Celebration card */}
                  <div style={{ background: "#F0DCA0", borderRadius: 20, padding: "22px 24px", border: "1.5px solid #D8B860" }}>
                    {streakCount === 3 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.brand, margin: "0 0 6px" }}>3-day streak · Look at you go.</p>}
                    {streakCount === 7 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.brand, margin: "0 0 6px" }}>7 days straight · A whole week. Brilliant.</p>}
                    {streakCount === 14 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.brand, margin: "0 0 6px" }}>Two weeks · Most people quit by now. Not you.</p>}
                    {streakCount === 21 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.brand, margin: "0 0 6px" }}>21 days · Okay, this is officially a habit now.</p>}
                    {streakCount === 30 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.brand, margin: "0 0 6px" }}>30 days · You absolute legend.</p>}
                    <p style={{ fontFamily: T.sans, fontSize: 18, color: T.ink, margin: "0 0 4px", fontWeight: 700 }}>Day {dayNum}, crushed it.{streakCount > 1 ? ` 🔥 ${streakCount}` : ""}</p>
                    {goalUpdatedDay === dayNum && (
                      <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.brand, margin: "0 0 6px" }}>Goal updated, tasks reshaped ✓</p>
                    )}
                    {note && <p style={{ fontFamily: T.sans, fontSize: 13, color: "#4A4A5C", margin: "0 0 10px", fontStyle: "italic" }}>{note}</p>}

                    {/* Inspirational quote from curated library */}
                    {dailyQuotes[dayNum] && (
                      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 6 }}>
                        <p style={{ fontFamily: T.serif, fontSize: 15, color: T.body, margin: "0 0 5px", lineHeight: 1.6, fontStyle: "italic" }}>
                          {dailyQuotes[dayNum].text}
                        </p>

                      </div>
                    )}

                    {/* View past Bril chat for this day */}
                    {brilChatHistory[dayNum]?.length > 0 && (
                      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 10 }}>
                        <button onClick={() => setViewChatDay(dayNum)}
                          style={{ background: "#FFFDF7", border: `1.5px solid ${T.brandMid}50`, borderRadius: 12, padding: "12px 16px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.brandD, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, width: "100%", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.background = "#FFF9EE"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = `${T.brandMid}50`; e.currentTarget.style.background = "#FFFDF7"; }}>
                          <MrBrilAvatar size={24} />
                          View chat with Mr. Bril
                          <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.6 }}>→</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Up next */}
                  {dayNum < TOTAL_DAYS && (
                    <div style={{ background: "#fff", border: `1px solid #E6E4EE`, borderRadius: 20, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 4px" }}>Up next</p>
                        <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: 0, fontWeight: 600 }}>
                          {dayTasks[dayNum + 1] ? `Day ${dayNum + 1}` : `Day ${dayNum + 1} is being prepared…`}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (dayTasks[dayNum + 1]) { setActiveDay(dayNum + 1); } }}
                        disabled={!dayTasks[dayNum + 1]}
                        style={{ background: dayTasks[dayNum + 1] ? T.black : T.bg, color: dayTasks[dayNum + 1] ? "#fff" : T.muted, border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: T.sans, fontSize: 15, fontWeight: 600, cursor: dayTasks[dayNum + 1] ? "pointer" : "default", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        {!dayTasks[dayNum + 1]
                          ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${T.muted}`, borderTop: `2px solid ${T.brand}`, animation: "spin 0.8s linear infinite" }} />Building…</>
                          : <>Bring on Day {dayNum + 1} →</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              )}

              {status === 'skipped' && dayNum < TOTAL_DAYS && (
                <div style={{ background: "#FAFAF8", borderRadius: 20, padding: "22px 24px", border: `1px solid #E6E4EE` }}>
                  <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 8px" }}>The program adjusted</p>
                  <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: "0 0 6px", fontWeight: 600 }}>Tomorrow is shorter. You're still in it.</p>
                  {note && <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "0 0 8px", fontStyle: "italic" }}>{note}</p>}
                  <p style={{ fontFamily: T.sans, fontSize: 14, color: T.body, margin: "0 0 16px", lineHeight: 1.65 }}>Day {dayNum + 1} has been scaled down based on today. Missing a day isn't the same as stopping.</p>
                  {dayTasks[dayNum + 1] ? (
                    <button onClick={() => { setActiveDay(dayNum + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{ background: T.brand, color: "#fff", border: "none", borderRadius: 12, padding: "13px 22px", fontFamily: T.sans, fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(232,168,32,0.18)" }}>
                      See Day {dayNum + 1} →
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid #E6E4EE`, borderTop: `2.5px solid ${T.brand}`, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                      <span style={{ fontFamily: T.sans, fontSize: 14, color: T.muted }}>Building your next task...</span>
                    </div>
                  )}
                  {brilChatHistory[dayNum]?.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <button onClick={() => setViewChatDay(dayNum)}
                        style={{ background: "#FFFDF7", border: `1.5px solid ${T.brandMid}50`, borderRadius: 12, padding: "12px 16px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.brandD, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, width: "100%", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.background = "#FFF9EE"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${T.brandMid}50`; e.currentTarget.style.background = "#FFFDF7"; }}>
                        <MrBrilAvatar size={24} />
                        View chat with Mr. Bril
                        <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.6 }}>→</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {(status === 'done' || status === 'skipped') && dayNum % 7 === 0 && dayNum <= TOTAL_DAYS && (() => {
                const wkNum = dayNum / 7;
                const doneThisWeek = Array.from({length:7},(_,i)=>dayNum-6+i).filter(d=>dayStatus[d]==='done').length;
                const nextWkTheme = weekThemes56[wkNum] || null;
                const isDone = status === 'done';
                const wkMilestone = {
                  1: "The first week is the one most people never finish. You finished it.",
                  2: "Two weeks in. The pattern is forming.",
                  3: "Three weeks. The research says habits start here.",
                  4: "A solid month of deliberate motion. This is where it starts to compound.",
                  5: "Five weeks of showing up. That's real momentum now.",
                  6: "Six weeks. The habit is yours. The goal is getting closer.",
                  7: "Seven weeks. You've built something worth protecting.",
                  8: "The habit is locked in. What you built here doesn't go away.",
                };
                return (
                  <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${isDone ? T.brandMid : T.border}` }}>
                    {/* Top, week complete */}
                    <div style={{ background: isDone ? T.grad : "#F4F4F6", padding: "24px 24px 20px" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: isDone ? "#8B6914" : T.muted, margin: "0 0 8px" }}>Week {wkNum} complete · {doneThisWeek}/7 days</p>
                      <p style={{ fontFamily: T.sans, fontSize: 20, color: isDone ? "#2C2C3A" : T.black, margin: "0 0 8px", fontWeight: 600, lineHeight: 1.3 }}>
                        {wkMilestone[wkNum] || (isDone ? `${doneThisWeek} of 7 days. That's the week.` : `${doneThisWeek} of 7. Still a week.`)}
                      </p>
                      {isDone && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(30,30,42,0.05)", borderRadius: 20, padding: "4px 12px" }}>
                          <span style={{ fontFamily: T.sans, fontSize: 13, color: "#4A4A5C", fontStyle: "italic" }}>{ARCHETYPE_IDENTITY[plan.profileName] || plan.profileName}</span>
                        </div>
                      )}
                      {/* Task type balance bar for this week */}
                      {isDone && (() => {
                        const wkStart = (wkNum - 1) * 7 + 1;
                        const tagTally = { Apply: 0, Read: 0, Reflect: 0, Tool: 0 };
                        Array.from({ length: 7 }, (_, j) => wkStart + j).forEach(d => {
                          const t = dayTasks[d];
                          if (dayStatus[d] === 'done' && t?.tag && tagTally[t.tag] !== undefined) tagTally[t.tag]++;
                        });
                        const wkTotal = Object.values(tagTally).reduce((a, b) => a + b, 0);
                        if (wkTotal === 0) return null;
                        const tagColors3 = { Apply: "#F0C0A0", Read: "#A8C0F0", Reflect: "#CCAADC", Tool: "#90CCA8" };
                        const order = ["Apply", "Read", "Reflect", "Tool"];
                        return (
                          <div style={{ marginTop: 16 }}>
                            <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5C5C6E", margin: "0 0 6px" }}>This week's mix</p>
                            <div style={{ display: "flex", height: 6, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                              {order.map(tag => {
                                const pct = (tagTally[tag] / wkTotal) * 100;
                                if (pct === 0) return null;
                                return <div key={tag} style={{ width: `${pct}%`, background: tagColors3[tag], transition: "width 0.4s ease" }} />;
                              })}
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                              {order.filter(t => tagTally[t] > 0).map(tag => (
                                <span key={tag} style={{ fontFamily: T.sans, fontSize: 10, color: tagColors3[tag], fontWeight: 600 }}>
                                  {tagTally[tag]} {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Bottom, next week */}
                    {nextWkTheme && wkNum < TOTAL_WEEKS && (
                      <div style={{ background: isDone ? T.brandL : T.bg, padding: "18px 24px" }}>
                        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: isDone ? T.brand : T.muted, margin: "0 0 6px" }}>
                          {isDone ? "Next week's focus" : "Coming up next"}
                        </p>
                        <p style={{ fontFamily: T.sans, fontSize: 16, color: isDone ? T.brandD : T.black, margin: "0 0 4px", fontWeight: 600, fontStyle: "italic" }}>{nextWkTheme}</p>
                        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>
                          {isDone
                            ? wkNum === 1 ? "Be Brilliant adapts what's next based on how this week went."
                            : "Each week's focus is shaped by what you've built so far."
                            : `This week's tasks are ready when you are.`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}



      </div>



      {/* ── PROACTIVE NORA NUDGE, triggered on risk patterns ── */}
      {(() => {
        // Don't show if Bril is open, modal is open, nudge dismissed, week is generating, task is generating, or celebration is showing
        if (brilOpen || weeklyCheckInOpen || arcOpen || progressOpen || nudgeDismissed || weekGenerating || generating || celebrationModal) return null;

        const doneArr = Object.entries(dayStatus).filter(([,s]) => s === 'done').map(([d]) => +d);
        const skipArr = Object.entries(dayStatus).filter(([,s]) => s === 'skipped').map(([d]) => +d);
        const todayUnlocked = !dayStatus[highestUnlocked]; // today's task is unlocked and not acted on
        // Don't nag about streaks if the person just completed the previous day (they literally just added to their streak)
        const prevDayJustDone = highestUnlocked > 1 && dayStatus[highestUnlocked - 1] === 'done';

        // Risk pattern 1: the last two *acted* days were both skipped (not just any two skips on record)
        const actedDays = [...doneArr, ...skipArr].sort((a, b) => a - b);
        const lastTwo = actedDays.slice(-2);
        const doubleSkip = lastTwo.length === 2 && lastTwo.every(d => (dayStatus[d] === 'skipped'));

        // Risk pattern 2: Day 4 slump, specifically day 4 unlocked and not done
        const day4Slump = highestUnlocked === 4 && !dayStatus[4] && doneArr.length >= 2;

        // Risk pattern 3: Week 2 drift, in days 8–14, fewer than 3 done in week 2
        const inWeek2 = highestUnlocked >= 8 && highestUnlocked <= 14;
        const week2Done = Array.from({length:7},(_,i)=>i+8).filter(d=>dayStatus[d]==='done').length;
        const week2Drift = inWeek2 && week2Done < 3 && highestUnlocked >= 11; // only nudge midway through

        // Risk pattern 4: streak at risk, only when streak is still fragile (3-9 days)
        // Don't show if they just completed the previous day (they're actively engaged, not drifting)
        const streakAtRisk = streakCount >= 3 && streakCount <= 9 && todayUnlocked && highestUnlocked > 3 && !prevDayJustDone;

        // Pick highest-priority signal
        let nudge = null;
        if (doubleSkip) nudge = {
          headline: "Two skips in a row, huh?",
          body: "Not judging. (Okay, slightly judging.) Want to figure out what's actually getting in the way?",
          cta: "Talk to Mr. Bril →",
        };
        else if (day4Slump) nudge = {
          headline: "Day 4. The classic wall.",
          body: "The excitement wore off and the habit hasn't kicked in yet. This is literally the most important day to show up. Even badly.",
          cta: "Let's talk it through →",
        };
        else if (week2Drift) nudge = {
          headline: "Week 2. The graveyard of good intentions.",
          body: "Most programs die right here. Yours doesn't have to. A 2-minute check-in might be all you need.",
          cta: "Check in with Be Brilliant →",
        };
        else if (streakAtRisk) nudge = {
          headline: `${streakCount}-day streak on the line 🔥`,
          body: "5 minutes. That's all it takes to keep the chain alive. You've come too far to let this one slide.",
          cta: "Talk to Mr. Bril →",
        };

        if (!nudge) return null;

        return (
          <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 560, zIndex: 50, boxShadow: "0 8px 40px rgba(26,23,48,0.18)", animation: "fadeIn 0.4s ease" }}>
            <div style={{ background: "#fff", borderRadius: 20, border: `1px solid #E6E4EE`, padding: "20px 22px", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ marginTop: 2 }}><MrBrilAvatar size={42} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.ink, margin: "0 0 5px" }}>{nudge.headline}</p>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: "0 0 14px", lineHeight: 1.6 }}>{nudge.body}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setBrilOpen(true)}
                    style={{ background: T.brand, border: "none", borderRadius: 8, padding: "9px 18px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    {nudge.cta} →
                  </button>
                  <button onClick={() => setNudgeDismissed(true)}
                    style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontFamily: T.sans, fontSize: 13, color: T.muted, cursor: "pointer" }}>
                    No, I'm good
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MEET NORA, goal clarification prompt on first dashboard open ── */}
      {storageLoaded && !brilDismissed && !plan._brilIntroDone && highestUnlocked === 1 && !Object.values(Object.fromEntries(Object.entries(dayStatus))).some(s => s === 'done' || s === 'skipped') && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(10,8,20,0.65)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px",
          animation: "fadeIn 0.35s ease",
        }} onClick={e => { if (e.target === e.currentTarget) setBrilDismissed(true); }}>
          <div style={{
            width: "100%", maxWidth: 440,
            background: C.offWhite,
            borderRadius: 24,
            border: `1.5px solid ${T.brandMid}40`,
            boxShadow: "0 32px 80px rgba(26,23,48,0.15)",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Floating decorative shapes */}
            <div style={{ position: "absolute", top: 12, right: "8%", width: 32, height: 32, borderRadius: 9, background: T.lav, pointerEvents: "none", opacity: 0.35, animation: "dbFloat1 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "15%", left: "5%", width: 20, height: 20, borderRadius: "50%", background: T.sage, pointerEvents: "none", opacity: 0.35, animation: "dbSparkle 4s ease-in-out infinite 1s" }} />
            <div style={{ position: "absolute", top: "40%", right: "4%", width: 14, height: 14, borderRadius: 4, background: T.lemon, pointerEvents: "none", opacity: 0.3, animation: "dbFloat2 5s ease-in-out infinite 0.5s" }} />

            {/* Close */}
            <button onClick={() => setBrilDismissed(true)} style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(30,30,42,0.04)", border: `1px solid ${C.border}`,
              borderRadius: "50%", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: C.muted, cursor: "pointer", lineHeight: 1,
              zIndex: 10,
            }}>✕</button>

            <div style={{ padding: "clamp(28px,5vw,44px) clamp(20px,4vw,36px) clamp(24px,4vw,36px)", position: "relative", zIndex: 1, textAlign: "center" }}>
              {/* Centered Bril avatar */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <MrBrilAvatar size={72} wiggle />
              </div>

              <p style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, letterSpacing: "-0.2px", color: T.ink, margin: "0 0 4px" }}>Meet Mr Bril.</p>
              <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", color: T.brandD, margin: "0 0 14px" }}>Your thinking partner.</p>

              <h2 style={{
                fontFamily: T.serif,
                fontSize: 24, fontWeight: 400, lineHeight: 1.25,
                color: C.ink, letterSpacing: "-0.3px",
                margin: "0 0 12px",
              }}>
                Quick chat before you start?
              </h2>

              <p style={{
                fontFamily: T.sans, fontSize: 14, fontWeight: 400,
                color: C.body, lineHeight: 1.7,
                margin: "0 0 28px",
              }}>
                Your plan is built from 7 answers. Mr. Bril can sharpen it in 2 minutes, clarify your goal, adjust the direction, refine what's coming.
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setBrilDismissed(true); setBrilGoalClarification(true); setBrilOpen(true); }}
                  style={{
                    width: "100%", background: T.brand, border: "none",
                    borderRadius: 50, padding: "15px 0",
                    fontFamily: T.sans, fontSize: 15, fontWeight: 600,
                    color: "#1E1E2A", cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(232,168,32,0.25)",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(232,168,32,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,168,32,0.25)"; }}
                >
                  Talk to Mr. Bril →
                </button>
                <button onClick={() => setBrilDismissed(true)}
                  style={{
                    width: "100%", background: "transparent",
                    border: "none",
                    borderRadius: 50, padding: "12px 0",
                    fontFamily: T.sans, fontSize: 14, fontWeight: 500,
                    color: T.muted, cursor: "pointer",
                  }}>
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GOAL MAP MODAL ── */}
      {arcOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,42,62,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 8px" }}
          onClick={e => { if (e.target === e.currentTarget) setArcOpen(false); }}>
          <div style={{ width: "100%", maxWidth: 420, background: "#F8F7FC", borderRadius: 24, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

            {/* Header, shapes sit in absolute clip layer, content has its own padding */}
            <div style={{ background: "#FBF5E6", borderRadius: "24px 24px 0 0", borderBottom: "1px solid rgba(180,150,40,0.14)", position: "relative", overflow: "hidden", flexShrink: 0 }}>
              {/* Floating geometric shapes clipped here */}
              <div style={{ position: "absolute", top: 8, right: "14%", width: 38, height: 38, borderRadius: 11, background: C.sky, pointerEvents: "none", opacity: 0.42, animation: "dbFloat1 6s ease-in-out infinite" }} />
              <div style={{ position: "absolute", top: "55%", right: "3%", width: 18, height: 18, borderRadius: "50%", background: C.lavender, pointerEvents: "none", opacity: 0.42, animation: "dbSparkle 4s ease-in-out infinite 1s" }} />
              <div style={{ position: "absolute", top: 6, left: "28%", width: 14, height: 14, borderRadius: "50%", background: C.sky, pointerEvents: "none", opacity: 0.38, animation: "dbSparkle 3s ease-in-out infinite 2s" }} />
              <div style={{ position: "absolute", top: "30%", right: "8%", width: 12, height: 12, borderRadius: 4, background: C.peach, pointerEvents: "none", opacity: 0.38, animation: "dbFloat2 5.5s ease-in-out infinite 0.5s" }} />
              {/* Content, padded independently so goal text always has space */}
              <div style={{ padding: "20px 22px 28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 700, color: "#D49518", margin: "0 0 12px", lineHeight: 1.2 }}>Goal map</p>
                  {(() => {
                    const rawGoalText = plan._answers?.goal_custom || GOAL_TEXTS[plan._answers?.goal];
                    const displayGoal = (brilChangeMade && goalStatement) ? goalStatement : rawGoalText;
                    return displayGoal ? (
                      <div style={{ borderRadius: 10, padding: "10px 14px", border: `1px solid ${T.border}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <p style={{ fontFamily: T.serif, fontSize: 17, color: T.ink, margin: 0, lineHeight: 1.55, wordBreak: "break-word", fontStyle: "italic", fontWeight: 400, flex: 1 }}>{displayGoal}</p>
                        <button onClick={() => { setArcOpen(false); setShowGoalEdit(true); }} style={{
                          background: "none", border: `1px solid ${T.border}`, borderRadius: 6,
                          width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", flexShrink: 0, marginTop: 2, transition: "border-color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = T.brand}
                        onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
                <button onClick={() => setArcOpen(false)} style={{ background: "rgba(30,30,42,0.06)", border: `1px solid ${C.border}`, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.muted, cursor: "pointer", flexShrink: 0, marginTop: 2 }}>✕</button>
              </div>
            </div>

            {/* Scrollable map */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 80px" }}>
              {(() => {
                // 8 unique emojis, one per week, never repeating
                const WEEK_EMOJIS = ["🌱","🔍","⚡","🤝","🗺️","🚀","✨","🎯"];

                // Layout: responsive via SVG viewBox scaling
                const NODE_R = 32;
                const svgW = 380;
                const LEFT_CX  = 56;
                const RIGHT_CX = 324;
                const NODE_GAP = 96;

                return weekThemes56.slice(0, 8).map((theme, i) => {
                  const w = i + 1;
                  const wStart = i * 7 + 1;
                  const isPast = w < currentWeek;
                  const isCurr = w === currentWeek;
                  const isFut  = w > currentWeek;
                  const wDone  = Array.from({length:7},(_,j)=>wStart+j).filter(d=>dayStatus[d]==='done').length;
                  const isRight = i % 2 === 0; // even → right side, odd → left side
                  const emoji = WEEK_EMOJIS[i] || "⭐";

                  const nodeColor  = isPast ? "#E8A820" : isCurr ? "#D49518" : "#C8C4DC";
                  const nodeBg     = isPast ? "#E8A820" : isCurr ? "#F0C050" : "#F0DEB0";
                  const textColor  = isFut ? T.muted : T.ink;
                  const numColor   = isPast ? "#E8A820" : isCurr ? T.brand : T.muted;
                  const pathColor  = isPast ? "#E8A820" : "#C8C4DC";

                  // The connector SVG sits between this node and the next
                  // Connects from: bottom-centre of current node → top-centre of next node
                  // Current node centre X: isRight → RIGHT_CX, else LEFT_CX
                  // Next node centre X:    isRight → LEFT_CX,  else RIGHT_CX
                  const fromX = isRight ? RIGHT_CX : LEFT_CX;
                  const toX   = isRight ? LEFT_CX  : RIGHT_CX;
                  const svgW  = 380;
                  const svgH  = 72;
                  // Cubic bezier: start at (fromX, 0), end at (toX, svgH)
                  // Control points push the curve outward for a nice S
                  const cp1x = fromX;
                  const cp1y = svgH * 0.45;
                  const cp2x = toX;
                  const cp2y = svgH * 0.55;

                  return (
                    <div key={w}>
                      {/* Node row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: isRight ? "flex-end" : "flex-start" }}>
                        {/* Text label on the opposite side */}
                        <div style={{
                          flex: 1,
                          textAlign: isRight ? "left" : "right",
                          paddingRight: isRight ? 0 : 14,
                          paddingLeft:  isRight ? 14 : 0,
                          order: isRight ? 1 : 2,
                        }}>
                          <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: numColor, margin: "0 0 3px", letterSpacing: 0.8 }}>Step {w}</p>
                          <p style={{ fontFamily: T.sans, fontSize: 15, color: textColor, margin: 0, lineHeight: 1.45, fontWeight: isCurr ? 600 : 400 }}>{theme}</p>
                          {isPast && <p style={{ fontFamily: T.sans, fontSize: 13, color: "#E8A820", margin: "4px 0 0", fontWeight: 600 }}>{wDone}/7 ✓</p>}
                          {isCurr && <p style={{ fontFamily: T.sans, fontSize: 13, color: T.brand, margin: "4px 0 0", fontWeight: 600 }}>You are here · {wDone}/7</p>}
                        </div>

                        {/* Node circle */}
                        <div style={{
                          width: 64, height: 64, borderRadius: "50%",
                          background: nodeBg,
                          border: isCurr ? `3px solid ${T.brand}` : isPast ? "3px solid #E8A820" : `2px solid ${nodeColor}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, position: "relative", zIndex: 2,
                          boxShadow: isCurr ? `0 0 0 5px rgba(232,168,32,0.18), 0 4px 16px rgba(232,168,32,0.15)` : isPast ? "0 2px 8px rgba(232,168,32,0.12)" : "none",
                          order: isRight ? 2 : 1,
                        }}>
                          {isPast
                            ? <span style={{ fontSize: 24, color: "#1E1E2A", fontWeight: 700 }}>✓</span>
                            : <span style={{ fontSize: isCurr ? 26 : 20, filter: isFut ? "grayscale(0.5) opacity(0.5)" : "none" }}>{emoji}</span>
                          }
                        </div>
                      </div>

                      {/* SVG connector to next node */}
                      {i < 7 && (
                        <svg width="100%" height={svgH} viewBox={`0 0 380 ${svgH}`} style={{ display: "block", overflow: "visible" }}>
                          <path
                            d={`M ${fromX} 0 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${svgH}`}
                            stroke={pathColor} strokeWidth="2.5" strokeDasharray="7 5"
                            fill="none" strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Tree destination, goal */}
              <div style={{ textAlign: "center", marginTop: 20, paddingBottom: 16 }}>
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#fff", border: "3px solid #34D072", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 24px rgba(45,156,95,0.35), 0 0 0 6px rgba(52,208,114,0.10)" }}>
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="trkG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7A5230" />
                        <stop offset="100%" stopColor="#5C3A1E" />
                      </linearGradient>
                    </defs>
                    {/* Roots */}
                    <path d="M24 47 Q19 50 15 49" stroke="#6B4020" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    <path d="M32 47 Q37 50 41 49" stroke="#6B4020" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    <path d="M25 48 Q21 52 17 51" stroke="#5C3518" strokeWidth="1" strokeLinecap="round" fill="none" />
                    <path d="M31 48 Q35 52 39 51" stroke="#5C3518" strokeWidth="1" strokeLinecap="round" fill="none" />
                    {/* Trunk */}
                    <path d="M25 48 Q25 40 24 34 Q23.5 30 25 27 L31 27 Q32.5 30 32 34 Q31 40 31 48 Z" fill="url(#trkG)" />
                    <path d="M27 46 Q27.5 40 27 35" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" fill="none" />
                    {/* Main branches */}
                    <path d="M25 30 Q18 25 12 22" stroke="#6B4020" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M31 30 Q38 25 44 22" stroke="#6B4020" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M26 28 Q22 22 18 17" stroke="#6B4020" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M30 28 Q34 22 38 17" stroke="#6B4020" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M28 27 Q28 20 28 14" stroke="#6B4020" strokeWidth="2" strokeLinecap="round" fill="none" />
                    {/* Sub-branches */}
                    <path d="M12 22 Q9 18 8 15" stroke="#7A5230" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                    <path d="M44 22 Q47 18 48 15" stroke="#7A5230" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                    <path d="M18 17 Q14 14 13 10" stroke="#7A5230" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    <path d="M38 17 Q42 14 43 10" stroke="#7A5230" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    {/* Canopy, deep to bright, layered for lush feel */}
                    <ellipse cx="28" cy="17" rx="22" ry="14" fill="#14733A" />
                    <ellipse cx="14" cy="18" rx="10" ry="8" fill="#18843F" />
                    <ellipse cx="42" cy="18" rx="10" ry="8" fill="#18843F" />
                    <ellipse cx="28" cy="15" rx="19" ry="12" fill="#1D9A4A" />
                    <ellipse cx="20" cy="13" rx="11" ry="8" fill="#22A854" />
                    <ellipse cx="36" cy="13" rx="11" ry="8" fill="#22A854" />
                    <ellipse cx="28" cy="11" rx="15" ry="9" fill="#2BBD5E" />
                    <ellipse cx="24" cy="9" rx="10" ry="7" fill="#35D06A" />
                    <ellipse cx="32" cy="9" rx="10" ry="7" fill="#35D06A" />
                    <ellipse cx="28" cy="7" rx="9" ry="6" fill="#42E278" />
                    <ellipse cx="28" cy="5" rx="6" ry="4.5" fill="#58F08E" />
                    {/* Bright crown tip */}
                    <ellipse cx="27" cy="4" rx="3.5" ry="2.5" fill="#78F5A8" />
                    {/* Light dappling */}
                    <ellipse cx="22" cy="8" rx="4" ry="2" fill="rgba(255,255,255,0.2)" transform="rotate(-15 22 8)" />
                    <ellipse cx="34" cy="6" rx="3" ry="1.5" fill="rgba(255,255,255,0.15)" transform="rotate(10 34 6)" />
                    <ellipse cx="16" cy="15" rx="3" ry="1.5" fill="rgba(255,255,255,0.12)" />
                    <ellipse cx="40" cy="14" rx="3" ry="1.5" fill="rgba(255,255,255,0.10)" />
                    <ellipse cx="28" cy="12" rx="5" ry="2" fill="rgba(255,255,255,0.08)" transform="rotate(-5 28 12)" />
                  </svg>
                </div>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 18px", maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
                  <p style={{ fontFamily: T.sans, fontSize: 17, color: T.ink, margin: 0, lineHeight: 1.55, fontWeight: 500 }}>
                    {(() => { const g = plan._answers?.goal_custom || GOAL_TEXTS[plan._answers?.goal]; return (brilChangeMade && goalStatement) ? goalStatement : g; })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRESS MODAL ── */}
      {progressOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,42,62,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
          onClick={e => { if (e.target === e.currentTarget) setProgressOpen(false); }}>
          <div style={{ width: "100%", maxWidth: 600, background: "#fff", borderRadius: 20, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px 22px", background: "#FBF5E6", borderRadius: "20px 20px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0, position: "relative", overflow: "hidden" }}>
              {/* Floating shapes, kept to far right so they don't overlap text */}
              <div style={{ position: "absolute", top: 8, right: "6%", width: 46, height: 46, borderRadius: 13, background: C.peach, pointerEvents: "none", opacity: 0.45, animation: "dbFloat1 6s ease-in-out infinite" }} />
              <div style={{ position: "absolute", bottom: "10%", right: "3%", width: 24, height: 24, borderRadius: "50%", background: C.lavender, pointerEvents: "none", opacity: 0.45, animation: "dbSparkle 4s ease-in-out infinite 1s" }} />
              <div style={{ position: "absolute", top: "42%", right: "14%", width: 14, height: 14, borderRadius: 4, background: C.peach, pointerEvents: "none", opacity: 0.38, animation: "dbFloat3 5s ease-in-out infinite 0.5s" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: "#D49518", margin: "0 0 7px" }}>{plan.name ? `${plan.name}'s progress` : "Your progress"}</p>
                {(() => {
                  const goalTexts = GOAL_TEXTS;
                  const goalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];
                  return goalText ? <p style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, margin: 0, lineHeight: 1.35, fontWeight: 400, letterSpacing: "-0.3px", fontStyle: "italic" }}>{goalText}</p> : null;
                })()}
              </div>
              <button onClick={() => setProgressOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "#5C5C6E", cursor: "pointer", padding: "0 0 0 12px", lineHeight: 1, flexShrink: 0, position: "relative", zIndex: 1 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 32px" }}>
              {(() => {
                const totalDone = Object.values(dayStatus).filter(s => s === 'done').length;
                const totalSkipped = Object.values(dayStatus).filter(s => s === 'skipped').length;
                const completionRate = (totalDone + totalSkipped) > 0 ? Math.round((totalDone / (totalDone + totalSkipped)) * 100) : 0;
                return (
                  <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
                    {[
                      { val: totalDone, label: "days done" },
                      { val: streakCount, label: "day streak" },
                      { val: completionRate + "%", label: "completion" },
                    ].map((s, i) => (
                      <div key={i} style={{ background: T.bg, borderRadius: 12, padding: "14px 12px", textAlign: "center", border: `1px solid ${T.border}` }}>
                        <p style={{ fontFamily: T.sans, fontSize: 24, fontWeight: 800, color: T.ink, margin: "0 0 2px", letterSpacing: -0.5 }}>{s.val}</p>
                        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.body, margin: 0, textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Creds highlight in progress modal */}
                  <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1.5px solid rgba(200,150,30,0.2)", boxShadow: "0 1px 6px rgba(180,130,20,0.07)", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: "#FBF5E6", border: "1.5px solid rgba(200,150,30,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C12.6 8 16 11.4 22 12C16 12.6 12.6 16 12 22C11.4 16 8 12.6 2 12C8 11.4 11.4 8 12 2Z" fill="#E8A820"/>
                        <circle cx="19" cy="5" r="1.5" fill="#F0C050" opacity="0.75"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B6914", margin: "0 0 4px" }}>Sparks</p>
                      <p style={{ fontFamily: T.sans, fontSize: 32, fontWeight: 800, color: "#6B4F0A", margin: 0, lineHeight: 1 }}>{cashPot}</p>
                      <p style={{ fontFamily: T.sans, fontSize: 14, color: "#4A3810", margin: "5px 0 0", lineHeight: 1.55 }}>Every day you show up, you earn a spark. They add up faster than you think.</p>
                    </div>
                  </div>
                  </>
                );
              })()}

              {/* ── MOVEMENT OVER TIME, BUCKETS ── */}
              {(() => {
                const doneDaysTotal = Object.values(dayStatus).filter(s => s === 'done').length;
                if (doneDaysTotal < 2) return null;

                const TAGS = ['Apply', 'Read', 'Reflect', 'Tool'];
                const TAG_COLORS   = { Apply: "#9A3D20", Read: "#3355AA", Reflect: "#6B3880", Tool: "#2A6B45" };
                const TAG_FILLS    = { Apply: "#FFE4D4", Read: "#E8F0FF", Reflect: "#F4EDF8", Tool: "#E6F5EE" };
                const TAG_LABELS   = { Apply: "Apply", Read: "Read", Reflect: "Reflect", Tool: "Tool" };

                const counts = { Apply: 0, Read: 0, Reflect: 0, Tool: 0 };
                Object.entries(dayTasks).forEach(([d, t]) => {
                  if (dayStatus[d] === 'done' && t?.tag && counts[t.tag] !== undefined) counts[t.tag]++;
                });
                const maxCount = Math.max(1, ...Object.values(counts));

                return (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.body, margin: "0 0 12px" }}>Where you've been building</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      {TAGS.map(tag => {
                        const n = counts[tag];
                        const pct = n / maxCount; // 0–1
                        const hasData = n > 0;
                        const color = TAG_COLORS[tag];
                        const BUCKET_H = 64; // compact height
                        const fillH = Math.max(hasData ? 8 : 0, Math.round(pct * BUCKET_H));
                        return (
                          <div key={tag} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                            {/* Count above bucket */}
                            <span style={{
                              fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                              color: hasData ? color : T.border,
                              minHeight: 16, display: "block",
                              opacity: hasData ? 0.85 : 1,
                            }}>{n > 0 ? n : ""}</span>

                            {/* Bucket shell */}
                            <div style={{
                              width: "100%",
                              height: BUCKET_H,
                              borderRadius: "4px 4px 6px 6px",
                              border: `1px solid ${hasData ? color + "33" : T.border}`,
                              background: T.bg,
                              position: "relative",
                              overflow: "hidden",
                            }}>
                              {/* Liquid fill */}
                              {hasData && (
                                <div style={{
                                  position: "absolute",
                                  bottom: 0, left: 0, right: 0,
                                  height: fillH,
                                  background: `${color}66`,
                                  borderRadius: "2px 2px 5px 5px",
                                  transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                                }}>
                                  {/* Shine band */}
                                  <div style={{
                                    position: "absolute", top: 0, left: "12%", right: "12%",
                                    height: 2, background: "rgba(255,255,255,0.4)",
                                    borderRadius: 1,
                                  }} />
                                </div>
                              )}
                            </div>

                            {/* Tag label */}
                            <span style={{
                              fontFamily: T.sans, fontSize: 12, fontWeight: 600,
                              color: hasData ? color : T.muted,
                              textTransform: "uppercase", letterSpacing: 0.5,
                              textAlign: "center", opacity: hasData ? 0.8 : 0.45,
                            }}>{TAG_LABELS[tag]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── WEEKLY BARS ── */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.body, margin: "0 0 12px" }}>Weekly completion</p>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 64 }}>
                  {Array.from({ length: Math.min(currentWeek, TOTAL_WEEKS) }, (_, i) => {
                    const wk = i + 1;
                    const wkStart = i * 7 + 1;
                    const done = Array.from({length:7},(_,j)=>wkStart+j).filter(d=>dayStatus[d]==='done').length;
                    const isCurr = wk === currentWeek;
                    const isFut = wk > currentWeek;
                    const pct = isFut ? 0 : (done / 7);
                    return (
                      <div key={wk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", height: 48, background: T.bg, borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "flex-end", border: isCurr ? `1.5px solid ${T.brandMid}` : "1px solid transparent" }}>
                          <div style={{ width: "100%", height: `${Math.max(pct * 100, isFut ? 0 : 4)}%`, background: isCurr ? T.brand : isFut ? "transparent" : (done >= 5 ? T.brandD : done >= 3 ? T.brand : T.brandMid), borderRadius: "4px 4px 0 0", transition: "height 0.4s ease", opacity: isFut ? 0.2 : 1 }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontFamily: T.sans, fontSize: 11, color: isCurr ? T.brand : T.body, fontWeight: isCurr ? 700 : 400 }}>W{wk}</span>
                          {weeklyCheckInDone[wk] && <span style={{ fontSize: 8, color: T.brand }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── ACHIEVEMENTS ── */}
              {(() => {
                const ctx = { dayStatus, dayTasks, streakCount, brilChangeMade, brilPickDay };
                return (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.body, margin: "0 0 12px" }}>Achievements</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                      {ACHIEVEMENTS.map(a => {
                        const isEarned = a.earned(ctx);
                        return (
                          <div key={a.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "14px 14px", borderRadius: 12,
                            background: isEarned ? T.lavL : T.bg,
                            border: `1px solid ${isEarned ? T.lav : T.border}`,
                            opacity: isEarned ? 1 : 0.65,
                            transition: "opacity 0.2s",
                          }}>
                            <span style={{ fontSize: 22, flexShrink: 0, filter: isEarned ? "none" : "grayscale(1)" }}>{a.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: isEarned ? T.lavD : T.ink, margin: "0 0 2px" }}>{a.name}</p>
                              <p style={{ fontFamily: T.sans, fontSize: 13, color: isEarned ? "#5A4580" : T.muted, margin: 0, lineHeight: 1.45 }}>{a.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── TASK TRAIL ── */}
              {(() => {
                const completedDays = Array.from({length: TOTAL_DAYS}, (_, i) => i + 1)
                  .filter(d => dayStatus[d] === 'done' && dayTasks[d])
                  .slice(-8).reverse();
                if (completedDays.length === 0) return null;
                const tagColors2 = { Apply: "#9A3D20", Read: "#3355AA", Reflect: "#6B3880", Tool: "#2A6B45" };
                const tagBgs2 = { Apply: "#FFE4D4", Read: "#E8F0FF", Reflect: "#F4EDF8", Tool: "#E6F5EE" };
                return (
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.body, margin: "0 0 12px" }}>What you've built</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {completedDays.map(d => {
                        const t = dayTasks[d];
                        const tc = tagColors2[t.tag] || T.brandD;
                        const tb = tagBgs2[t.tag] || T.brandL;
                        return (
                          <div key={d} style={{ padding: "12px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${T.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, padding: "3px 8px", background: tb, color: tc, borderRadius: 4, flexShrink: 0 }}>{t.tag}</span>
                              <span style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, flexShrink: 0 }}>Day {d}</span>
                              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, margin: 0, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── GOAL UPDATE MODAL ── */}
      {showGoalEdit && (() => {
        const GOAL_OPTIONS = GOAL_TEXTS;
        const currentGoal = plan._answers?.goal ?? -1;
        const isCustom = !!plan._answers?.goal_custom;

        const applyGoalChange = async (newGoalIdx, customText) => {
          setShowGoalEdit(false);
          setGoalUpdating(true);
          setGoalStatement("");
          // Immutable update
          let updatedPlan = { ...plan, _answers: { ...plan._answers, goal: newGoalIdx ?? currentGoal, goal_detail: undefined, goal_custom: customText || undefined } };
          setPlanState(updatedPlan);
          setGoalUpdatedDay(highestUnlocked);
          // 1. Regenerate week arc themes
          const newArc = await generateWeekArc(updatedPlan._answers, updatedPlan.classification || {});
          if (newArc) {
            updatedPlan = { ...updatedPlan, weekArc: newArc };
            setPlanState(updatedPlan);
            setWeekGoalOverride(null);
          }
          // 2. Regenerate remaining days in current week
          const wkStart = (currentWeek - 1) * 7 + 1;
          const remainingDays = Array.from({length:7},(_,j)=>wkStart+j)
            .filter(d => d > highestUnlocked && d <= wkStart + 6);
          if (remainingDays.length > 0) {
            const newTasks = {};
            for (const d of remainingDays) {
              const t = await generateNextDayTask(updatedPlan, d - 1, dayStatus[d-1] || 'done', dayNotes[d-1] || "", brilInsight, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
              if (t) newTasks[d] = t;
            }
            setDayTasks(prev => ({ ...prev, ...newTasks }));
          }
          setGoalUpdating(false);
          generateGoalStatement(updatedPlan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
        };

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(45,42,62,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setShowGoalEdit(false); }}>
            <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.brand, margin: "0 0 4px" }}>Your goal</p>
                  <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.6 }}>
                    Changing this reshapes your week arc and remaining tasks.
                  </p>
                </div>
                <button onClick={() => setShowGoalEdit(false)} style={{ background: "none", border: "none", fontSize: 20, color: T.muted, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0, marginLeft: 12 }}>×</button>
              </div>

              {/* Custom goal input */}
              <div style={{ marginBottom: 16, padding: "16px", background: T.bg, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>Write your own</p>
                <textarea
                  value={customGoalInput}
                  onChange={e => setCustomGoalInput(e.target.value)}
                  placeholder="e.g. Land a head of product role at a Series B startup by end of year…"
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.sans, fontSize: 16, color: T.black, lineHeight: 1.6, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff", marginBottom: 10 }}
                />
                <button
                  disabled={!customGoalInput.trim()}
                  onClick={() => customGoalInput.trim() && applyGoalChange(null, customGoalInput.trim())}
                  style={{ background: customGoalInput.trim() ? T.brand : "#CCC", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: customGoalInput.trim() ? "pointer" : "default" }}>
                  Set this goal →
                </button>
              </div>

              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 10px" }}>Or pick one</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {GOAL_OPTIONS.map((opt, i) => {
                  const isCurrent = !isCustom && i === currentGoal;
                  return (
                    <button key={i}
                      onClick={() => { if (isCurrent) { setShowGoalEdit(false); return; } applyGoalChange(i, null); }}
                      style={{
                        textAlign: "left", padding: "14px 18px",
                        border: isCurrent ? `1.5px solid ${T.brand}` : `1.5px solid ${T.border}`,
                        background: isCurrent ? T.brandL : "#fff",
                        borderRadius: 8, cursor: "pointer", fontFamily: T.sans,
                        fontSize: 15, color: isCurrent ? T.brandD : T.black,
                        fontWeight: isCurrent ? 500 : 400, lineHeight: 1.45,
                        transition: "all 0.12s",
                      }}>
                      {opt}{isCurrent ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── GOAL UPDATING BANNER ── */}
      {goalUpdating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.brandL}`, borderTop: `3px solid ${T.brand}`, animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ fontFamily: T.sans, fontSize: 17, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>Reshaping your program</p>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.5 }}>Regenerating tasks to match your updated direction. This takes about 15–30 seconds.</p>
          </div>
        </div>
      )}
      {/* ── WEEK GENERATING BANNER ── */}
      {weekGenerating && !weeklyCheckInOpen && !isInitialWeekLoad && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.brand, color: "#fff", fontFamily: T.sans, fontSize: 14, padding: "12px 20px", borderRadius: 10, zIndex: 99, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          Building your upcoming days...
        </div>
      )}
      {/* ── ACHIEVEMENT CINEMATIC OVERLAY ── */}
      {achievementToasts.length > 0 && (() => {
        const a = achievementToasts[0]; // show one at a time
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(8,6,20,0.82)",
            backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px 16px",
            animation: "achievementBgIn 0.4s cubic-bezier(0.22,1,0.36,1)",
          }} onClick={() => setAchievementToasts(prev => prev.slice(1))}>
            <style>{`
              @keyframes achievementBgIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes achievementCardIn {
                0%   { opacity: 0; transform: scale(0.55) translateY(40px); }
                60%  { opacity: 1; transform: scale(1.06) translateY(-6px); }
                80%  { transform: scale(0.97) translateY(2px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
              @keyframes achievementIconBounce {
                0%   { transform: scale(0.2) rotate(-20deg); opacity: 0; }
                50%  { transform: scale(1.3) rotate(8deg); opacity: 1; }
                70%  { transform: scale(0.9) rotate(-3deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
              }
              @keyframes achievementGlow {
                0%, 100% { box-shadow: 0 24px 64px rgba(232,168,32,0.2), 0 0 0 0 rgba(232,168,32,0.08); }
                50%       { box-shadow: 0 24px 80px rgba(232,168,32,0.35), 0 0 0 12px rgba(232,168,32,0); }
              }
              @keyframes achievementShine {
                0%   { left: -100%; }
                100% { left: 200%; }
              }
              @keyframes particleFloat {
                0%   { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
              }
              @keyframes starSpin {
                0%   { transform: rotate(0deg) scale(0); opacity: 0; }
                40%  { opacity: 1; transform: rotate(180deg) scale(1.2); }
                100% { transform: rotate(360deg) scale(0.8); opacity: 0; }
              }
              @keyframes achievementTapHint {
                0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; }
              }
            `}</style>

            {/* Particle burst */}
            {["⭐","✨","🎉","💫","⚡","🌟","✦","⬟"].map((p, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${20 + i * 9}%`,
                top: `${30 + (i % 3) * 15}%`,
                fontSize: i % 2 === 0 ? 22 : 16,
                animation: `particleFloat ${0.9 + i * 0.15}s ease-out ${i * 0.07}s both`,
                pointerEvents: "none",
              }}>{p}</div>
            ))}
            {["★","◆","●","▲"].map((p, i) => (
              <div key={`s${i}`} style={{
                position: "absolute",
                right: `${10 + i * 11}%`,
                top: `${25 + (i % 4) * 12}%`,
                fontSize: 18,
                color: ["#E8A820","#E0D4F8","#F0D888","#FFD8C4"][i],
                animation: `starSpin ${0.8 + i * 0.2}s ease-out ${i * 0.1 + 0.15}s both`,
                pointerEvents: "none",
              }}>{p}</div>
            ))}

            {/* Main card */}
            <div style={{
              width: "100%", maxWidth: 440,
              background: T.bg,
              borderRadius: 28,
              border: `2px solid ${T.brandMid}`,
              padding: "48px 36px 40px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              animation: "achievementCardIn 0.65s cubic-bezier(0.22,1,0.36,1) both, achievementGlow 2.5s ease-in-out 0.5s infinite",
              boxShadow: "0 24px 64px rgba(232,168,32,0.25)",
            }}>
              {/* Shine sweep */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, width: "40%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                animation: "achievementShine 1.8s ease 0.5s 2",
                pointerEvents: "none",
              }} />

              {/* Ambient glow disc */}
              <div style={{
                position: "absolute", top: "-40%", left: "50%", transform: "translateX(-50%)",
                width: 360, height: 280, borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(232,168,32,0.12), transparent 70%)",
                pointerEvents: "none",
              }} />

              {/* Icon */}
              <div style={{
                fontSize: 96, lineHeight: 1,
                marginBottom: 28,
                display: "inline-block",
                animation: "achievementIconBounce 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both",
                filter: "drop-shadow(0 4px 32px rgba(232,168,32,0.45))",
                position: "relative", zIndex: 1,
              }}>{a.icon}</div>

              {/* Label */}
              <p style={{
                fontFamily: T.sans, fontSize: 12, fontWeight: 700,
                letterSpacing: "0.15em", textTransform: "uppercase",
                color: T.brandD, margin: "0 0 10px",
                position: "relative", zIndex: 1,
              }}>Achievement Unlocked</p>

              {/* Title */}
              <h2 style={{
                fontFamily: T.serif, fontSize: 36, fontWeight: 400,
                color: T.ink, margin: "0 0 14px", lineHeight: 1.15,
                letterSpacing: "-0.5px",
                position: "relative", zIndex: 1,
              }}>{a.name}</h2>

              {/* Desc */}
              <p style={{
                fontFamily: T.sans, fontSize: 16, fontWeight: 400,
                color: T.body, lineHeight: 1.65,
                margin: "0 0 32px",
                position: "relative", zIndex: 1,
              }}>{a.desc}</p>

              {/* Divider line */}
              <div style={{ height: 1, background: T.border, margin: "0 0 20px", position: "relative", zIndex: 1 }} />

              {/* Tap to continue */}
              <p style={{
                fontFamily: T.sans, fontSize: 15, color: T.muted,
                margin: 0, letterSpacing: "0.04em",
                animation: "achievementTapHint 1.8s ease-in-out infinite",
                position: "relative", zIndex: 1,
              }}>Tap anywhere to continue</p>
            </div>
          </div>
        );
      })()}

      {/* ── DAY COMPLETION CELEBRATION MODAL ── */}
      {celebrationModal && (() => {
        const { dayNum: cm_dayNum, earned, streakCount: cm_streak, crossedMilestone } = celebrationModal;
        const nextDay = cm_dayNum + 1;
        const hasNext = nextDay <= TOTAL_DAYS;
        const quote = dailyQuotes[cm_dayNum];
        const closeCelebration = () => {
          setCelebrationModal(null);
          if (crossedMilestone) {
            setTimeout(() => setCredsMilestoneModal({
              tier: crossedMilestone.tier,
              copy: crossedMilestone.copy,
              total: cashPot,
            }), 120);
          }
        };
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "#2C2820",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "24px 20px",
            overflow: "hidden",
          }}>
            <style>{`
              @keyframes celebIn { from { opacity:0; transform: scale(0.88) translateY(20px); } to { opacity:1; transform: scale(1) translateY(0); } }
              @keyframes confettiFall {
                0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
              }
              @keyframes starPop {
                0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
                60%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
              }
            `}</style>

            {/* Confetti */}
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${5 + (i * 5.5) % 90}%`,
                top: `${-5 - (i * 7) % 20}%`,
                width: i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 12,
                height: i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 4,
                borderRadius: i % 3 === 2 ? 2 : "50%",
                background: ["#f0b429","#E0D4F8","#F0C050","#FFD8C4","#C4E0FF","#FBBF24"][i % 6],
                animation: `confettiFall ${2.2 + (i * 0.18) % 1.8}s ease-in ${(i * 0.11) % 1.4}s both`,
                pointerEvents: "none",
              }} />
            ))}

            {/* Card */}
            <div style={{
              width: "100%", maxWidth: 400, textAlign: "center",
              animation: "celebIn 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}>
              {/* Checkmark circle */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "rgba(240,180,41,0.15)",
                  border: "2px solid rgba(232,168,32,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "starPop 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both",
                }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M6 14l6 6 10-12" stroke="#E8A820" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Day done headline */}
              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,210,60,0.95)", margin: "0 0 8px" }}>
                Day {cm_dayNum} complete
              </p>
              <h2 style={{ fontFamily: T.serif, fontSize: 36, fontWeight: 400, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                You did it.
              </h2>

              {/* Only show streak at meaningful milestones: 3, 7, 14, 21, 30 */}
              {[3, 7, 14, 21, 30].includes(cm_streak) ? (
                <p style={{ fontFamily: T.sans, fontSize: 15, color: "rgba(255,255,255,0.6)", margin: "0 0 20px" }}>
                  🔥 {cm_streak}-day streak
                </p>
              ) : <div style={{ height: 20 }} />}

              {/* Creds earned */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(240,180,41,0.15)", border: "1px solid rgba(240,180,41,0.35)", borderRadius: 12, padding: "10px 22px", marginBottom: 28 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C12.6 8 16 11.4 22 12C16 12.6 12.6 16 12 22C11.4 16 8 12.6 2 12C8 11.4 11.4 8 12 2Z" fill="#fad568"/>
                  <circle cx="19" cy="5" r="1.5" fill="#fff" opacity="0.6"/>
                </svg>
                <span style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 800, color: "#fad568" }}>+{earned} Sparks</span>
              </div>

              {/* Quote, bigger, more readable */}
              <div style={{ margin: "0 0 32px", padding: "0 4px" }}>
                {quote ? (
                  <>
                    <p style={{ fontFamily: T.serif, fontSize: 19, color: "rgba(255,255,255,0.78)", margin: "0 0 10px", lineHeight: 1.6, fontStyle: "italic" }}>
                      {quote.text}
                    </p>

                  </>
                ) : null}
              </div>

              {/* CTA */}
              {hasNext ? (
                <button onClick={() => {
                  closeCelebration();
                  if (!crossedMilestone) setTimeout(() => setActiveDay(nextDay), 60);
                  else setTimeout(() => setActiveDay(nextDay), 700);
                }}
                  style={{ width: "100%", background: "#fff", color: T.black, border: "none", borderRadius: 12, padding: "16px 0", fontFamily: T.sans, fontSize: 17, fontWeight: 700, cursor: "pointer", letterSpacing: -0.3, marginBottom: 12 }}>
                  {dayTasks[nextDay] ? `Start Day ${nextDay} →` : "Continue →"}
                </button>
              ) : (
                <button onClick={closeCelebration}
                  style={{ width: "100%", background: "#fff", color: T.black, border: "none", borderRadius: 12, padding: "16px 0", fontFamily: T.sans, fontSize: 17, fontWeight: 700, cursor: "pointer", letterSpacing: -0.3, marginBottom: 12 }}>
                  Keep going →
                </button>
              )}
              <button onClick={closeCelebration}
                style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: "4px 0" }}>
                Back to dashboard
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── CREDS MILESTONE MODAL ── */}
      {credsMilestoneModal && (() => {
        const { tier, copy, total } = credsMilestoneModal;
        // Tier accent colours
        const tierAccent = { Operative: "#5DCAA5", Strategist: "#E8A820", Senior: "#f0b429", Principal: "#F472B6" };
        const accent = tierAccent[tier] || "#E8A820";
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 310,
            background: "#2C2820",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "24px 20px", overflow: "hidden",
          }}>
            <style>{`
              @keyframes milestoneIn { from { opacity:0; transform: scale(0.82) translateY(28px); } to { opacity:1; transform: scale(1) translateY(0); } }
              @keyframes tierGlow { 0%,100% { text-shadow: 0 0 24px ${accent}55; } 50% { text-shadow: 0 0 48px ${accent}99, 0 0 80px ${accent}44; } }
              @keyframes ringExpand { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>

            {/* Ambient glow rings */}
            <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", border: `1px solid ${accent}22`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "ringExpand 0.7s ease 0.1s both", pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: `1px solid ${accent}33`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "ringExpand 0.6s ease 0.05s both", pointerEvents: "none" }} />

            <div style={{ width: "100%", maxWidth: 380, textAlign: "center", animation: "milestoneIn 0.55s cubic-bezier(0.22,1,0.36,1)" }}>

              {/* Badge ring */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: `${accent}22`,
                  border: `2px solid ${accent}66`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 32px ${accent}44`,
                }}>
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <circle cx="17" cy="17" r="13" stroke={accent} strokeWidth="1.5" strokeOpacity="0.5" />
                    <path d="M11 17l4.5 4.5L23 12" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Eyebrow */}
              <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: `${accent}bb`, margin: "0 0 10px" }}>
                Creds milestone
              </p>

              {/* Tier name */}
              <h2 style={{
                fontFamily: T.serif, fontSize: 52, fontWeight: 400, color: accent,
                margin: "0 0 6px", letterSpacing: "-1px", lineHeight: 1,
                animation: "tierGlow 2.5s ease-in-out infinite",
              }}>
                {tier}
              </h2>

              {/* Total */}
              <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 22px", letterSpacing: 0.3 }}>
                {total} Sparks earned
              </p>

              {/* Copy */}
              <p style={{ fontFamily: T.serif, fontSize: 18, color: "rgba(255,255,255,0.72)", margin: "0 0 40px", lineHeight: 1.65, fontStyle: "italic", padding: "0 8px" }}>
                {copy}
              </p>

              {/* CTA */}
              <button
                onClick={() => setCredsMilestoneModal(null)}
                style={{ width: "100%", background: accent, color: "#0a0818", border: "none", borderRadius: 12, padding: "16px 0", fontFamily: T.sans, fontSize: 17, fontWeight: 800, cursor: "pointer", letterSpacing: -0.3 }}>
                Keep going
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── MOVES LOG MODAL ── */}
      {showCredsLog && (() => {
        // Derive earnings log from completed days
        const tagCreds = { Apply: 6, Read: 4, Reflect: 5, Tool: 8 };
        const log = [];
        let runningStreak = 0;
        for (let d = 1; d <= TOTAL_DAYS; d++) {
          if (dayStatus[d] === 'done') {
            runningStreak++;
            const tag = dayTasks[d]?.tag || "Apply";
            const base = tagCreds[tag] ?? 5;
            const bonus = runningStreak >= 14 ? 4 : runningStreak >= 7 ? 2 : runningStreak >= 3 ? 1 : 0;
            const total = base + bonus;
            log.push({ day: d, tag, base, bonus, total, title: dayTasks[d]?.title });
          } else if (dayStatus[d] === 'skipped') {
            // streak allows 1 skip
          } else {
            break;
          }
        }

        const tagColors5 = { Apply: "#9A3D20", Read: "#3355AA", Reflect: "#6B3880", Tool: "#2A6B45" };
        const tagBgs5   = { Apply: "#FFE4D4",  Read: "#E8F0FF",  Reflect: "#F4EDF8", Tool: "#E6F5EE" };

        // Creds breakdown by type
        const byType = log.reduce((acc, e) => { acc[e.tag] = (acc[e.tag]||0) + e.total; return acc; }, {});
        const nextMilestone = [50,100,150,200,300,500].find(m => m > cashPot) || null;

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(30,28,40,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", backdropFilter: "blur(6px)", animation: "fadeIn 0.25s ease" }}
            onClick={e => { if (e.target === e.currentTarget) setShowCredsLog(false); }}>
            <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 20, border: "1.5px solid rgba(200,150,30,0.2)", boxShadow: "0 12px 48px rgba(30,28,40,0.12), 0 2px 8px rgba(30,28,40,0.06)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "24px 24px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "#FBF5E6", borderRadius: "20px 20px 0 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fff", border: "1.5px solid rgba(200,150,30,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(180,130,20,0.1)", flexShrink: 0 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C12.6 8 16 11.4 22 12C16 12.6 12.6 16 12 22C11.4 16 8 12.6 2 12C8 11.4 11.4 8 12 2Z" fill="#E8A820"/>
                      <circle cx="19" cy="5" r="1.5" fill="#F0C050" opacity="0.75"/>
                      <circle cx="5" cy="19" r="1" fill="#F0C050" opacity="0.6"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B6914", margin: "0 0 2px" }}>Your Sparks</p>
                    <p style={{ fontFamily: T.sans, fontSize: 28, fontWeight: 800, color: T.ink, margin: 0, lineHeight: 1.1 }}>{cashPot} <span style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 400, color: T.muted }}>sparks</span></p>
                  </div>
                </div>
                <button onClick={() => setShowCredsLog(false)} style={{ background: "rgba(30,30,42,0.04)", border: `1px solid ${C.border}`, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.muted, cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 32px" }}>

                {/* Next milestone */}
                {nextMilestone && (
                  <div style={{ marginBottom: 20, padding: "12px 16px", background: T.lavL, borderRadius: 12, border: `1px solid ${T.lav}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: 0 }}>Next milestone</p>
                      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.lavD, margin: 0 }}>{cashPot} / {nextMilestone}</p>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(30,30,42,0.04)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (cashPot / nextMilestone) * 100)}%`, background: T.lavD, borderRadius: 3, transition: "width 0.5s ease" }} />
                    </div>
                    <p style={{ fontFamily: T.sans, fontSize: 15, color: T.lavD, margin: "6px 0 0" }}>{nextMilestone - cashPot} sparks to go</p>
                  </div>
                )}

                {/* Breakdown by task type */}
                {Object.keys(byType).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5C5C6E", margin: "0 0 10px" }}>How you sparked them</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([tag, total]) => (
                        <div key={tag} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                          <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, padding: "3px 8px", background: tagBgs5[tag], color: tagColors5[tag], borderRadius: 3 }}>{tag}</span>
                          <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink }}>{total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-day log */}
                <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5C5C6E", margin: "0 0 10px" }}>
                  {log.length > 0 ? "Recent earnings" : "No sparks yet, complete your first day to light things up."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {log.slice().reverse().slice(0, 14).map(entry => (
                    <div key={entry.day} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${T.border}` }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: T.brandL, border: `1px solid ${T.brandMid}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: "#8B6914" }}>{entry.day}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: T.sans, fontSize: 15, color: T.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.title || `Day ${entry.day} completed`}
                        </p>
                        {entry.bonus > 0 && (
                          <p style={{ fontFamily: T.sans, fontSize: 13, color: "#8B6914", margin: "2px 0 0" }}>+{entry.bonus} streak spark</p>
                        )}
                      </div>
                      <p style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 800, color: "#8B6914", margin: 0, flexShrink: 0 }}>+{entry.total}</p>
                    </div>
                  ))}
                </div>

                {log.length === 0 && (
                  <p style={{ fontFamily: T.sans, fontSize: 16, color: T.body, margin: "8px 0 0", lineHeight: 1.65 }}>
                    Sparks are earned every day you complete a task. Tool tasks spark the most. Keep your streak going for bonus sparks.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── NORA MODAL ── */}
      {brilOpen && (
        <BrilChatModal
          plan={plan}
          dayTasks={dayTasks}
          dayStatus={dayStatus}
          dayNotes={dayNotes}
          currentWeekTheme={currentWeekTheme}
          weekGoalOverride={weekGoalOverride}
          weekFocusInput={weekFocusInput}
          goalStatement={goalStatement}
          momentumScore={momentumScore}
          momentumLabel={momentumLabel}
          brilSessionLog={brilSessionLog}
          currentDay={highestUnlocked}
          isGoalClarification={brilGoalClarification}
          goalDeadline={goalDeadline}
          dailyTimeAvailable={dailyTimeAvailable}
          onClose={() => { setBrilOpen(false); setBrilGoalClarification(false); }}
          onInsight={async (text, cmds = {}) => {
            setBrilInsight(text);
            if (cmds.slowDown) setPaceSlow(true);

            // ── Score the Bril conversation for momentum points ──
            // Fire-and-forget: ask Claude to evaluate the interaction value
            (async () => {
              try {
                const hasChange = !!(cmds.weekGoal || cmds.changeGoal !== undefined || cmds.changeGoalCustom || cmds.requestedTask || cmds.replaceTodayTask || cmds.replaceDayN || cmds.rebuildWeek || cmds.slowDown || cmds.setDeadline);
                const prompt = `Rate the quality of this Be Brilliant coaching interaction for a career development program. Score 1-10 based on: depth of insight shared, whether a meaningful change was made, and how much it will improve the person's program.

Interaction summary: "${text?.slice(0, 400) || "brief exchange"}"
Program change made: ${hasChange ? "yes" : "no"}
Type of change: ${cmds.changeGoal !== undefined ? "goal changed" : cmds.weekGoal ? "weekly focus changed" : cmds.requestedTask ? "custom task requested" : cmds.slowDown ? "pace adjusted" : "insight only"}

Return ONLY valid JSON: {"score": N, "reason": "one short sentence"}`;
                const res = await fetch("/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 80, messages: [{ role: "user", content: prompt }] }),
                });
                const data = await res.json();
                const raw = extractText(data).trim();
                const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
                const pts = Math.round((parsed.score / 10) * 8); // max +8 pts from Bril
                if (pts > 0) setBrilMomentumBonus(prev => Math.min(prev + pts, 20)); // cap Bril bonus at 20 total
              } catch (e) { /* silent fail */ }
            })();

            // Helper: regenerate remaining days in the current week
            const regenRemainingDays = async (insightText) => {
              const wkStart = (currentWeek - 1) * 7 + 1;
              // Include today (highestUnlocked) if not completed, plus all future days in the week
              const remainingDays = Array.from({ length: 7 }, (_, j) => wkStart + j)
                .filter(d => d >= highestUnlocked && d <= wkStart + 6 && !dayStatus[d]);
              if (remainingDays.length === 0) return;
              setGoalUpdating(true);
              const newTasks = {};
              for (const d of remainingDays) {
                const prevStatus = dayStatus[d - 1] || 'done';
                const prevNote = dayNotes[d - 1] || "";
                const t = await generateNextDayTask(plan, d - 1, prevStatus, prevNote, insightText, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                if (t) newTasks[d] = t;
              }
              setDayTasks(prev => ({ ...prev, ...newTasks }));
              setGoalUpdating(false);
            };

            // Replace a specific day by number (only unlocked, not completed)
            if (cmds.replaceDayN && cmds.replaceDayTask) {
              const targetDay = cmds.replaceDayN;
              if (targetDay >= 1 && targetDay <= TOTAL_DAYS && targetDay <= highestUnlocked && !dayStatus[targetDay]) {
                setGoalUpdating(true);
                setBrilPickDay(targetDay);
                const hint = `REPLACE DAY ${targetDay} TASK: ${cmds.replaceDayTask}. Build the task directly around this. TIME CONSTRAINT: task must be exactly ${dailyTimeAvailable}.`;
                const t = await generateNextDayTask(plan, targetDay - 1, dayStatus[targetDay - 1] || 'done', hint, text, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                if (t) setDayTasks(prev => ({ ...prev, [targetDay]: t }));
                setGoalUpdating(false);
              }
            }

            if (cmds.changeGoalCustom) {
              const updatedAnswers = { ...plan._answers, goal_custom: cmds.changeGoalCustom, goal_detail: undefined };
              let updatedPlan = { ...plan, _answers: updatedAnswers };
              setPlanState(updatedPlan);
              setGoalUpdatedDay(highestUnlocked);
              setGoalStatement("");
              setBrilChangeMade(true);
              // Regenerate week arc (themes + milestones) for the new goal
              const newArc = await generateWeekArc(updatedAnswers, plan.classification || {});
              if (newArc) {
                updatedPlan = { ...updatedPlan, weekArc: newArc };
                setPlanState(updatedPlan);
                setWeekGoalOverride(null); // clear any manual override, new arc takes over
              }
              await regenRemainingDays(text);
              generateGoalStatement(updatedPlan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
            }

            if (cmds.rebuildWeek) {
              setGoalUpdating(true);
              const wkStart = (currentWeek - 1) * 7 + 1;
              const remainingDays = Array.from({ length: 7 }, (_, j) => wkStart + j)
                .filter(d => d >= highestUnlocked && d <= wkStart + 6 && !dayStatus[d]);
              const newTasks = {};
              for (const d of remainingDays) {
                const t = await generateNextDayTask(plan, d - 1, dayStatus[d - 1] || 'done', `REBUILD: program direction has shifted. TIME CONSTRAINT: each task must be exactly ${dailyTimeAvailable}. ${text?.slice(0, 200) || ""}`, text, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                if (t) newTasks[d] = t;
              }
              setDayTasks(prev => ({ ...prev, ...newTasks }));
              setGoalUpdating(false);
              setBrilChangeMade(true);
            }

            if (cmds.weekGoal) {
              setWeekGoalOverride(cmds.weekGoal);
              setBrilChangeMade(true);
              await regenRemainingDays(text);
            }

            if (cmds.changeGoal !== undefined) {
              const updatedAnswers = { ...plan._answers, goal: cmds.changeGoal, goal_detail: undefined };
              let updatedPlan = { ...plan, _answers: updatedAnswers };
              setPlanState(updatedPlan);
              setGoalUpdatedDay(highestUnlocked);
              setGoalStatement("");
              setBrilChangeMade(true);
              // Regenerate week arc (themes + milestones) for the new goal
              const newArc = await generateWeekArc(updatedAnswers, plan.classification || {});
              if (newArc) {
                updatedPlan = { ...updatedPlan, weekArc: newArc };
                setPlanState(updatedPlan);
                setWeekGoalOverride(null);
              }
              await regenRemainingDays(text);
              generateGoalStatement(updatedPlan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
            }

            // Replace TODAY's task (current unlocked, not yet completed day)
            if (cmds.replaceTodayTask) {
              const todayNum = highestUnlocked;
              if (todayNum <= TOTAL_DAYS && !dayStatus[todayNum]) {
                setGoalUpdating(true);
                setBrilPickDay(todayNum);
                const specificHint = `REPLACE TODAY'S TASK: ${cmds.replaceTodayTask}. Build the task directly around this. TIME CONSTRAINT: task must be exactly ${dailyTimeAvailable}.`;
                const t = await generateNextDayTask(plan, todayNum - 1, dayStatus[todayNum - 1] || 'done', specificHint, text, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                if (t) setDayTasks(prev => ({ ...prev, [todayNum]: t }));
                setGoalUpdating(false);
              }
            }

            if (cmds.requestedTask) {
              const targetDay = dayStatus[highestUnlocked] ? highestUnlocked + 1 : highestUnlocked;
              if (targetDay <= TOTAL_DAYS) {
                setGoalUpdating(true);
                setBrilPickDay(targetDay);
                const specificHint = `SPECIFIC REQUEST: ${cmds.requestedTask}. Build the task directly around this. TIME CONSTRAINT: task must be exactly ${dailyTimeAvailable}.`;
                const t = await generateNextDayTask(plan, targetDay - 1, dayStatus[targetDay - 1] || 'done', specificHint, text, dayTasks, dayStatus, dayNotes, dailyTimeAvailable);
                if (t) setDayTasks(prev => ({ ...prev, [targetDay]: t }));
                setGoalUpdating(false);
              }
            }

            if (cmds.setDeadline) {
              setGoalDeadline(cmds.setDeadline);
              setBrilChangeMade(true);
            }

            // Don't auto-close when done — the BrilChatModal shows a "Back to my plan" button
            // that lets the user read Bril's closing message before leaving.
            // The onClose handler (triggered by that button) will setBrilOpen(false).

            // ── Save full chat history for this day ──
            if (cmds._done && cmds._messages?.length) {
              setBrilChatHistory(prev => ({
                ...prev,
                [highestUnlocked]: [
                  ...(prev[highestUnlocked] || []),
                  ...cmds._messages,
                ],
              }));
            }

            // ── Generate and store session summary on conversation end (fire-and-forget) ──
            if (cmds._done) {
            (async () => {
              try {
                const changes = [
                  cmds.weekGoal ? `Changed weekly focus to: "${cmds.weekGoal}"` : null,
                  cmds.changeGoal !== undefined ? `Changed goal to option ${cmds.changeGoal}` : null,
                  cmds.changeGoalCustom ? `Set custom goal: "${cmds.changeGoalCustom}"` : null,
                  cmds.rebuildWeek ? `Rebuilt current week tasks` : null,
                  cmds.replaceDayN ? `Replaced Day ${cmds.replaceDayN} task: ${cmds.replaceDayTask}` : null,
                  cmds.replaceTodayTask ? `Replaced today's task: ${cmds.replaceTodayTask}` : null,
                  cmds.setDeadline ? `Set goal deadline: ${cmds.setDeadline}` : null,
                  cmds.requestedTask ? `Requested custom task: ${cmds.requestedTask}` : null,
                  cmds.slowDown ? "Requested slower pace" : null,
                ].filter(Boolean);

                const summaryPrompt = `Summarize this Be Brilliant coaching session in 2-3 sentences. Focus on: what the person was working through, any blockers or concerns they raised, what was resolved or shifted. Be specific, this summary will inform future task generation and coaching for this person.

Session content: "${text?.slice(0, 600) || "brief exchange"}"
Program changes made: ${changes.length ? changes.join("; ") : "none"}

Write the summary in third person ("They were working on...", "They mentioned..."). Keep it under 60 words. Return only the summary text, no preamble.`;

                const res = await fetch("/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 120, messages: [{ role: "user", content: summaryPrompt }] }),
                });
                const data = await res.json();
                const summary = extractText(data).trim();
                if (summary) {
                  setBrilSessionLog(prev => [...prev.slice(-6), { // keep last 7 sessions
                    dayNum: highestUnlocked,
                    summary,
                    changes,
                    timestamp: new Date().toISOString(),
                  }]);
                }
              } catch (e) { /* silent fail */ }
            })();
            } // end if (cmds._done)
          }}
        />
      )}

      {/* ── PAYWALL MODAL ── */}
      {!paywallBypassed && doneCount >= 2 && activeDay >= 3 && !celebrationModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "#322E3A",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "24px 16px", overflow: "auto",
        }}>
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            {/* Lock icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(232,168,32,0.12)", border: "2px solid rgba(232,168,32,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="26" height="28" viewBox="0 0 16 18" fill="none"><rect x="1" y="7" width="14" height="10" rx="2.5" stroke="#C8A030" strokeWidth="1.5"/><path d="M4 7V5a4 4 0 0 1 8 0v2" stroke="#C8A030" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
            </div>

            <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,210,60,0.95)", margin: "0 0 10px" }}>
              You've built momentum
            </p>
            <h2 style={{ fontFamily: T.serif, fontSize: "clamp(26px,5vw,34px)", fontWeight: 400, color: "rgba(255,255,255,0.92)", margin: "0 0 8px", lineHeight: 1.15, letterSpacing: -0.5 }}>
              Keep it going.
            </h2>
            <p style={{ fontFamily: T.sans, fontSize: 16, color: "rgba(255,255,255,0.82)", margin: "0 0 32px", lineHeight: 1.65 }}>
              You've completed 2 days. Most people stop here.<br/>The ones who don't are the ones who change.
            </p>

            {/* Pricing tiers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {/* 3-month, recommended */}
              <div style={{
                background: "rgba(232,168,32,0.08)", border: "1.5px solid rgba(232,168,32,0.22)",
                borderRadius: 16, padding: "20px 20px 18px", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, right: 0, background: T.brand, borderRadius: "0 14px 0 10px", padding: "5px 12px" }}>
                  <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>Most popular</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: T.sans, fontSize: 32, fontWeight: 800, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>$13.99</span>
                  <span style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/month</span>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)", margin: "0 0 4px" }}>3 months · $41.97 billed once</p>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.5 }}>A full year of daily career development. Built around your goal, adapted as you grow.</p>
                <button
                  onClick={() => { /* payment integration placeholder */ }}
                  style={{ width: "100%", marginTop: 14, background: "#fff", color: T.black, border: "none", borderRadius: 10, padding: "14px 0", fontFamily: T.sans, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: -0.2 }}>
                  Start 3-month plan
                </button>
              </div>

              {/* 1-month */}
              <div style={{
                background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 16, padding: "18px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>$19.99</span>
                    <span style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/month</span>
                  </div>
                  <button
                    onClick={() => { /* payment integration placeholder */ }}
                    style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: `1.5px solid rgba(255,255,255,0.15)`, borderRadius: 8, padding: "10px 18px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Start monthly
                  </button>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.75)", margin: "6px 0 0", lineHeight: 1.5 }}>Try it for a month. Cancel anytime.</p>
              </div>

              {/* Annual */}
              <div style={{
                background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 16, padding: "18px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>$8.99</span>
                    <span style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/month</span>
                  </div>
                  <button
                    onClick={() => { /* payment integration placeholder */ }}
                    style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: `1.5px solid rgba(255,255,255,0.15)`, borderRadius: 8, padding: "10px 18px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Start annual
                  </button>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "6px 0 0", lineHeight: 1.5 }}>
                  $107.88/year · <span style={{ color: "rgba(93,202,165,0.8)" }}>Save 55%</span> · Built to reach your goal.
                </p>
              </div>
            </div>

            {/* Beta bypass */}
            <button
              onClick={() => { setPaywallBypassed(true); }}
              style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: "#9494A6", cursor: "pointer", padding: "8px 0", transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
              I'm a beta tester, let me in
            </button>
          </div>
        </div>
      )}

      {/* ── BRIL CHAT HISTORY VIEWER ── */}
      {viewChatDay && brilChatHistory[viewChatDay]?.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,42,62,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setViewChatDay(null); }}>
          <div style={{ width: "100%", maxWidth: 540, background: "#fff", borderRadius: 20, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MrBrilAvatar size={30} />
                <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>Chat with Mr. Bril · Day {viewChatDay}</p>
              </div>
              <button onClick={() => setViewChatDay(null)} style={{ background: "none", border: "none", fontSize: 18, color: T.muted, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {brilChatHistory[viewChatDay].map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div style={{
                    maxWidth: "82%",
                    padding: "10px 14px",
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                    background: m.role === "user" ? T.black : T.bg,
                    border: m.role === "assistant" ? `1px solid ${T.border}` : "none",
                  }}>
                    <p style={{ fontFamily: T.sans, fontSize: 13, color: m.role === "user" ? "#fff" : T.ink, margin: 0, lineHeight: 1.6 }}>{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, textAlign: "center", flexShrink: 0 }}>
              <button onClick={() => setViewChatDay(null)}
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 20px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WEEKLY CHECK-IN MODAL ── */}
      {weeklyCheckInOpen && (
        <WeeklyCheckInModal
          plan={plan}
          completedWeek={weeklyCheckInOpen}
          weekTasks={dayTasks}
          weekNotes={dayNotes}
          weekStatus={dayStatus}
          goalDeadline={goalDeadline}
          onComplete={completeWeekGen}
          onSkip={() => completeWeekGen("", {})}
        />
      )}

    </div>
  );
}


// ─── Bril Intro Screen (mandatory before results) ────────
function BrilIntroScreen({ answers, onComplete }) {
  const [brilOpen, setBrilOpen] = useState(false);
  const [introInsight, setIntroInsight] = useState("");
  const [introCmds, setIntroCmds] = useState({});
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // Build a lightweight pre-plan from quiz answers so BrilChatModal can work
  const prePlan = useMemo(() => {
    const cl = classifyProfile(answers);
    return {
      _answers: answers,
      classification: cl,
      profileName: cl.profileName || "professional",
      name: (answers.name || "").trim(),
      weekArc: {},
    };
  }, [answers]);

  useSEO({ title: "Meet Mr Bril", description: "Your career thinking partner. A quick chat to sharpen your plan.", path: "/intro", noIndex: true });

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <style>{`${FONTS} @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } @keyframes dbFloat1 { 0%, 100% { transform: translateY(0) rotate(12deg); } 50% { transform: translateY(-12px) rotate(16deg); } } @keyframes dbFloat2 { 0%, 100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-9px) rotate(-4deg); } } @keyframes dbSparkle { 0%, 100% { opacity: 0.35; transform: scale(0.85); } 50% { opacity: 0.65; transform: scale(1.15); } } @keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } } @keyframes brilWiggle { 0% { transform: rotate(0); } 20% { transform: rotate(-8deg) scale(1.05); } 40% { transform: rotate(6deg); } 60% { transform: rotate(-4deg); } 80% { transform: rotate(2deg); } 100% { transform: rotate(0) scale(1); } }`}</style>

      {!done && !brilOpen && (
        <div style={{
          width: "100%", maxWidth: 440,
          background: "#FFFDF7",
          borderRadius: 24,
          border: `1.5px solid ${T.brandMid}40`,
          boxShadow: "0 32px 80px rgba(26,23,48,0.12)",
          overflow: "hidden",
          position: "relative",
          animation: "fadeIn 0.4s ease",
        }}>
          <div style={{ position: "absolute", top: 12, right: "8%", width: 32, height: 32, borderRadius: 9, background: T.lav, pointerEvents: "none", opacity: 0.35, animation: "dbFloat1 6s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "15%", left: "5%", width: 20, height: 20, borderRadius: "50%", background: T.sage, pointerEvents: "none", opacity: 0.35, animation: "dbSparkle 4s ease-in-out infinite 1s" }} />
          <div style={{ position: "absolute", top: "40%", right: "4%", width: 14, height: 14, borderRadius: 4, background: T.lemon, pointerEvents: "none", opacity: 0.3, animation: "dbFloat2 5s ease-in-out infinite 0.5s" }} />

          <div style={{ padding: "clamp(32px,6vw,52px) clamp(20px,4vw,36px) clamp(28px,5vw,40px)", position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <MrBrilAvatar size={80} wiggle />
            </div>

            <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 700, letterSpacing: "-0.2px", color: T.ink, margin: "0 0 4px" }}>Meet Mr Bril.</p>
            <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, letterSpacing: "0.06em", color: T.brandD, margin: "0 0 20px" }}>Your thinking partner.</p>

            <h2 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 400, lineHeight: 1.25, color: T.ink, letterSpacing: "-0.3px", margin: "0 0 12px" }}>
              Before we build your plan...
            </h2>

            <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 400, color: T.body, lineHeight: 1.7, margin: "0 0 32px" }}>
              Your quiz answers gave us a starting point. A quick conversation with Mr. Bril will sharpen your goal, your direction, and what comes first.
            </p>

            <button onClick={() => setBrilOpen(true)}
              style={{
                width: "100%", background: T.brand, border: "none",
                borderRadius: 50, padding: "16px 0",
                fontFamily: T.sans, fontSize: 16, fontWeight: 600,
                color: "#1E1E2A", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(232,168,32,0.25)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(232,168,32,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,168,32,0.25)"; }}
            >
              Talk to Mr. Bril →
            </button>
          </div>
        </div>
      )}

      {/* Email CTA after Bril finishes */}
      {done && !emailSubmitted && (
        <div style={{
          width: "100%", maxWidth: 440,
          background: "#fff",
          borderRadius: 24,
          border: `2px solid ${T.brand}`,
          boxShadow: "0 8px 40px rgba(232,168,32,0.12), 0 0 0 4px rgba(232,168,32,0.06)",
          padding: "clamp(28px,5vw,44px) clamp(20px,4vw,32px)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          animation: "fadeIn 0.4s ease",
        }}>
          <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 350, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,168,32,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✦</div>
            <h2 style={{ fontFamily: T.serif, fontSize: "clamp(24px,4vw,32px)", fontWeight: 400, color: T.ink, margin: "0 0 10px", lineHeight: 1.2, letterSpacing: -0.4 }}>
              {answers.name ? `${answers.name.trim()}, your Week 1 is ready.` : "Your Week 1 is ready."}
            </h2>
            <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: "0 0 28px", lineHeight: 1.65 }}>
              Your daily program gets smarter as you progress.
            </p>
            <div style={{ maxWidth: 400, margin: "0 auto 16px" }}>
              <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", border: `1.5px solid ${T.border}`, background: T.bg, marginBottom: 12 }}>
                <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailSubmitted(true); setTimeout(() => onComplete(introInsight, introCmds), 1500); } }}
                  style={{ flex: 1, padding: "15px 18px", border: "none", fontFamily: T.sans, fontSize: 16, outline: "none", background: "transparent", color: T.black, minWidth: 0 }} />
              </div>
              {(() => {
                const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                return (
                  <button
                    disabled={!valid}
                    onClick={() => { if (valid) { setEmailSubmitted(true); setTimeout(() => onComplete(introInsight, introCmds), 1500); } }}
                    style={{
                      width: "100%",
                      background: valid ? T.brand : "#E8E6EE",
                      color: valid ? "#1E1E2A" : T.muted,
                      border: "none", fontFamily: T.sans, fontSize: 17, fontWeight: 700,
                      padding: "17px 0", borderRadius: 50, cursor: valid ? "pointer" : "not-allowed",
                      letterSpacing: -0.3, transition: "all 0.2s",
                      boxShadow: valid ? "0 4px 20px rgba(232,168,32,0.3)" : "none",
                    }}>
                    Let's go →
                  </button>
                );
              })()}
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: 0 }}>Free to start</p>
          </div>
        </div>
      )}

      {/* Transition after email submitted — matches GeneratingScreen */}
      {done && emailSubmitted && (
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 32px" }}>
          <div style={{ fontSize: 40, margin: "0 auto 28px", animation: "brilWiggle 1.2s ease-in-out infinite" }}>✦</div>
          <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: -0.2 }}>Brilliant. Let's do this.</p>
          <p style={{ fontFamily: T.sans, fontSize: 16, color: T.body, margin: "10px 0 0" }}>This usually takes about 10 seconds</p>
        </div>
      )}

      {/* Bril chat modal */}
      {brilOpen && (
        <BrilChatModal
          plan={prePlan}
          dayTasks={{}}
          dayStatus={{}}
          dayNotes={{}}
          currentWeekTheme="Getting started"
          weekGoalOverride={null}
          weekFocusInput={{}}
          goalStatement=""
          momentumScore={0}
          momentumLabel="Starting"
          brilSessionLog={[]}
          currentDay={1}
          isGoalClarification={true}
          goalDeadline={null}
          dailyTimeAvailable="30 minutes"
          onClose={() => {
            setBrilOpen(false);
            setDone(true);
          }}
          onInsight={(text, cmds = {}) => {
            // Accumulate: keep latest insight text, merge all CMDs across calls
            if (text) setIntroInsight(text);
            setIntroCmds(prev => {
              const merged = { ...prev };
              // Overwrite with new values (later CMDs take priority)
              Object.entries(cmds).forEach(([k, v]) => {
                if (v !== undefined) merged[k] = v;
              });
              return merged;
            });
          }}
        />
      )}
    </div>
  );
}


// ─── Error Boundary ──────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { this.setState({ info }); console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: 32 }}>
          <div style={{ maxWidth: 500, textAlign: "center" }}>
            <p style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 600, color: "#2D2A3E", marginBottom: 12 }}>Well, that wasn't supposed to happen</p>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: "#9892a8", marginBottom: 24, lineHeight: 1.6 }}>The app encountered an error. Try refreshing.</p>
            <details style={{ textAlign: "left", background: "#f9f8fc", border: "1px solid #dcdaeb", borderRadius: 6, padding: "10px 14px" }}>
              <summary style={{ fontFamily: T.sans, fontSize: 12, color: "#9892a8", cursor: "pointer" }}>Error details</summary>
              <pre style={{ fontFamily: "monospace", fontSize: 11, color: "#3a3550", marginTop: 10, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5 }}>
                {this.state.error?.toString()}
                {"\n\n"}
                {this.state.info?.componentStack || ""}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Root ─────────────────────────────────────────────────
const PLAN_STORAGE_KEY = "bebril_saved_plan";

export default function BeBrilApp() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const [savedPlan, setSavedPlan] = useState(null);
  const [rootLoaded, setRootLoaded] = useState(false);
  const [screen, setScreen] = useState("landing");
  const [dashboardPlan, setDashboardPlan] = useState(null);
  const [programStartDate, setProgramStartDate] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [auditTasks, setAuditTasks] = useState(null);
  const [plan, setPlan] = useState(null);
  const [brilIntroInsight, setBrilIntroInsight] = useState("");

  // Load saved plan from persistent storage on mount
  useEffect(() => {
    // Set html lang attribute for accessibility & SEO
    document.documentElement.lang = "en";
    // Ensure viewport meta exists (some SPA setups miss this)
    if (!document.querySelector('meta[name="viewport"]')) {
      const vp = document.createElement("meta");
      vp.name = "viewport";
      vp.content = "width=device-width, initial-scale=1, viewport-fit=cover";
      document.head.appendChild(vp);
    } else {
      const vp = document.querySelector('meta[name="viewport"]');
      if (!vp.content.includes('viewport-fit')) vp.content += ', viewport-fit=cover';
    }
    // Ensure charset meta exists
    if (!document.querySelector('meta[charset]')) {
      const cs = document.createElement("meta");
      cs.setAttribute("charset", "utf-8");
      document.head.prepend(cs);
    }
    // Set favicon using the Be Brilliant logo SVG
    const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="18" fill="%23D99A1E"/><circle cx="16" cy="66" r="7.5" fill="%23fff"/><line x1="21" y1="61" x2="42" y2="40" stroke="%23fff" stroke-width="7" stroke-linecap="round"/><path d="M53 5C55.2 21 64 29.8 78 32 64 34.2 55.2 43 53 59 50.8 43 42 34.2 28 32 42 29.8 50.8 21 53 5Z" fill="%23fff"/></svg>`;
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) { favicon = document.createElement("link"); favicon.rel = "icon"; document.head.appendChild(favicon); }
    favicon.type = "image/svg+xml";
    favicon.href = `data:image/svg+xml,${faviconSvg}`;
    // Apple touch icon (PNG via canvas)
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 180; canvas.height = 180;
      canvas.getContext("2d").drawImage(img, 0, 0, 180, 180);
      let apple = document.querySelector('link[rel="apple-touch-icon"]');
      if (!apple) { apple = document.createElement("link"); apple.rel = "apple-touch-icon"; document.head.appendChild(apple); }
      apple.href = canvas.toDataURL("image/png");
    };
    img.src = `data:image/svg+xml,${faviconSvg}`;
    (async () => {
      const loaded = await Store.get(PLAN_STORAGE_KEY);
      if (loaded) setSavedPlan(loaded);
      setRootLoaded(true);
    })();
  }, []);

  const goToDashboard = async (thePlan, startDate) => {
    // Compute resume context for the landing page display
    const storageKey = buildDashStorageKey(thePlan);
    try {
      const dashSaved = await Store.get(storageKey) || {};
      const doneCount = Object.values(dashSaved.dayStatus || {}).filter(s => s === 'done').length;
      const streakCount = calcStreak(dashSaved.dayStatus || {});
      const planToSave = {
        ...thePlan,
        _resumeDay: doneCount + 1,
        _resumeStreak: streakCount,
        _startDate: startDate,
      };
      await Store.set(PLAN_STORAGE_KEY, planToSave);
      setSavedPlan(planToSave);
    } catch { /* storage unavailable */ }

    setDashboardPlan(thePlan);
    setProgramStartDate(startDate);
    setScreen("dashboard");
    scrollTop();
  };

  const resumeProgram = () => {
    if (!savedPlan) return;
    setDashboardPlan(savedPlan);
    setProgramStartDate(savedPlan._startDate || Date.now());
    setScreen("dashboard");
    scrollTop();
  };

  // Show nothing until storage is checked (prevents flash of landing without resume button)
  if (!rootLoaded) return <div style={{ minHeight: "100vh", background: "#fff" }} />;

  return (
    <ErrorBoundary>
    <main style={{ minHeight: "100vh", background: "#fff", fontFamily: T.sans }}>
      {screen === "landing" && <LandingPage onStart={() => { Object.keys(localStorage).filter(k => k.startsWith("bebril")).forEach(k => localStorage.removeItem(k)); setSavedPlan(null); setScreen("quiz"); scrollTop(); }} onResume={resumeProgram} savedPlan={savedPlan} />}
      {screen === "quiz" && <QuizScreen onComplete={a => { setAnswers(a); setAuditTasks(null); setScreen("bril_intro"); scrollTop(); }} onBack={() => { setScreen("landing"); scrollTop(); }} />}
      {screen === "bril_intro" && answers && (
        <BrilIntroScreen answers={answers} onComplete={(insight, cmds) => {
          // Apply goal changes from Bril conversation to answers before generating
          let updatedAnswers = { ...answers };
          if (cmds.changeGoalCustom) {
            updatedAnswers = { ...updatedAnswers, goal_custom: cmds.changeGoalCustom, goal_detail: undefined };
          }
          if (cmds.changeGoal !== undefined) {
            updatedAnswers = { ...updatedAnswers, goal: cmds.changeGoal, goal_detail: undefined };
          }
          setAnswers(updatedAnswers);
          // Store insight and deadline for later
          if (insight) setBrilIntroInsight(insight);
          // Store deadline in a ref-like state so GeneratingScreen can access it
          if (cmds.setDeadline) {
            updatedAnswers._brilDeadline = cmds.setDeadline;
            setAnswers(updatedAnswers);
          }
          setScreen("generating");
          scrollTop();
        }} />
      )}
      {screen === "generating" && answers && (
        <GeneratingScreen answers={answers} auditTasks={auditTasks} brilInsight={brilIntroInsight} onComplete={p => {
          // Enrich plan with Bril intro data and go directly to dashboard
          let enrichedPlan = { ...p, _brilIntroDone: true };
          if (brilIntroInsight) enrichedPlan._brilIntroInsight = brilIntroInsight;
          if (answers._brilDeadline) enrichedPlan._goalDeadline = answers._brilDeadline;
          setPlan(enrichedPlan);
          goToDashboard(enrichedPlan, Date.now());
        }} onBack={() => { setScreen("quiz"); scrollTop(); }} />
      )}
      {screen === "dashboard" && dashboardPlan && <DashboardScreen plan={dashboardPlan} startDate={programStartDate} onBack={() => { setScreen("landing"); scrollTop(); }} />}
    </main>
    </ErrorBoundary>
  );
}