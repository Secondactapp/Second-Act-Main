"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ─── Tokens ───────────────────────────────────────────────
const T = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  display: "Georgia, 'Times New Roman', serif",
  // Richer type scale
  black: "#28243a", ink: "#3a3550", body: "#68647a", muted: "#9892a8",
  border: "#dcdaeb", bg: "#f4f2fa", cream: "#f8f7fc",
  // Purple family  - slightly warmer
  purple: "#7c6f9f", purpleD: "#6a5d8e", purpleL: "#f0f1f9", purpleMid: "#b8b0d8",
  // Dark gradient for hero sections
  grad: "linear-gradient(155deg, #1e1a2e 0%, #2a2440 55%, #160f28 100%)",
  // Card shadow token
  shadow: "0 4px 20px rgba(26,23,48,0.06)",
  shadowMd: "0 8px 32px rgba(26,23,48,0.10)",
};

// ─── Persistent Storage Helper (localStorage) ────────────
// All operations are async-compatible for drop-in replacement.
// Keys are auto-sanitized.
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
const ROLE_NAMES = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
const URG_TEXTS = ["AI compressing my field faster than expected","Watched peers advance while staying flat","Layoff or restructure changed things","Review or promotion on the line","Drifting, want intentional movement","All of the above","Keen on exploring new opportunities","None of the above"];
const BLOCKER_TEXTS = ["Not enough time  - days are full","Too much information, don't know where to start","I start but don't follow through","I learn things but don't apply them to actual work","Direction paralysis  - too many options or none that feel right"];
const SENIORITY_TEXTS = ["0–3 years","4–8 years","9–15 years","16+ years"];

// ─── Shared Helpers (deduplicated) ──────────────────────
function normalizeBlocker(blocker) {
  return Array.isArray(blocker) ? blocker : (blocker != null ? [blocker] : []);
}

function calcStreak(dayStatus) {
  let s = 0, skipsUsed = 0;
  for (let d = 1; d <= 56; d++) {
    if (dayStatus[d] === 'done') s++;
    else if (dayStatus[d] === 'skipped' && skipsUsed === 0) skipsUsed++;
    else break;
  }
  return s;
}

function lk(arr, idx) {
  return (idx !== undefined && idx >= 0) ? arr[idx] || null : null;
}

function lkm(arr, idxArr) {
  return (idxArr || []).map(i => arr[i]).filter(Boolean).join(", ");
}

// ─── Storage key builder (shared between root & dashboard) ─
function buildDashStorageKey(plan) {
  return `secondact_${[
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
// ─── Curated inspirational quotes — career progress & daily action ───────────
const CAREER_QUOTES = [
  { text: "People who track their progress are 42% more likely to achieve their goals than those who don't.", author: "Goal research, Dominican University" },
  { text: "The most reliable predictor of long-term success isn't talent or intelligence — it's consistent follow-through on small commitments.", author: "Behavioral economics research" },
  { text: "People who write down their goals and review them weekly are significantly more likely to achieve them.", author: "Goal-setting research" },
  { text: "Most people overestimate what they can do in a day and underestimate what they can do in a year of consistent effort.", author: "Productivity research" },
  { text: "The difference between people who make career change happen and those who don't is rarely ambition — it's daily action.", author: "Career transition research" },
  { text: "Habits that are tied to a specific time and place are far more likely to stick than intentions alone.", author: "Implementation intention research" },
  { text: "People who share their progress with a peer are significantly more likely to follow through.", author: "Accountability research" },
  { text: "Identity change precedes behavior change. People who act as if they are already the person they want to become are more likely to get there.", author: "Behavioral psychology" },
  { text: "The average professional who spends 30 minutes a day on deliberate skill development will outperform peers who don't within 12 months.", author: "Deliberate practice research" },
  { text: "Completion, not perfection, is the engine of forward motion. Done is always more valuable than ideal.", author: "Behavioral research" },
  { text: "People who break a large goal into specific weekly tasks are three times more likely to complete it than those who keep the goal abstract.", author: "Implementation research" },
  { text: "The hardest part of any task is starting. Once you begin, momentum does most of the work.", author: "Activation energy research" },
  { text: "Reflection without action is rumination. Action without reflection is busyness. The combination is how careers actually move.", author: "Performance psychology" },
  { text: "People who complete a 30-day streak of any habit are six times more likely to maintain it long-term.", author: "Habit formation research" },
  { text: "Small wins activate the reward circuits in the brain and make the next effort easier — not harder.", author: "Neuroscience of motivation" },
  { text: "The most effective professionals don't have more time — they have clearer priorities and fewer open loops.", author: "Cognitive load research" },
  { text: "Career growth compounds. People who invest in their development consistently for two years outpace peers by a significant margin.", author: "Longitudinal career research" },
  { text: "Clarity reduces procrastination. The vaguer the goal, the more likely it is to be avoided.", author: "Decision psychology" },
  { text: "Skipping once rarely derails a habit. Skipping twice in a row often does.", author: "Habit recovery research" },
  { text: "The act of writing something down transfers it from intention to commitment — and the brain treats commitments differently.", author: "Cognitive psychology" },
  { text: "People who pursue a goal with a clear 'why' persist longer in the face of obstacles than those motivated by external pressure alone.", author: "Self-determination theory" },
  { text: "Showing up on days when you don't feel like it is the behavior that separates people who grow from people who plateau.", author: "Performance research" },
  { text: "The professional who does one specific thing each day compounds faster than the one who does ten things occasionally.", author: "Compound learning research" },
  { text: "Momentum is easier to maintain than to restart. The most important task on any given day is simply not stopping.", author: "Behavioral research" },
  { text: "People tend to overweight recent evidence and underweight long-term patterns. A single hard day is almost never evidence of failure.", author: "Cognitive bias research" },
  { text: "The best time to plan your next move is immediately after completing your last one — when context is fresh and confidence is high.", author: "Planning research" },
  { text: "Waiting until you feel ready is one of the most reliable ways to never begin. Readiness follows action, not the other way around.", author: "Behavioral research" },
  { text: "People who review their week and name what went well are more likely to repeat those behaviors the following week.", author: "Positive psychology research" },
  { text: "The professionals who advance fastest are rarely the most talented — they are the most consistent.", author: "Career development research" },
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
  "The Compounder":   "That's how operators compound. One real thing at a time.",
  "The Cartographer":  "You're building the mental model. This is the work.",
  "The Primed":  "Action is your mechanism. You just proved it.",
  "The Scout":   "Another piece of the map. The picture is getting clearer.",
  "The Incumbent":  "Deliberate progress. That's exactly what this profile does.",
  "The Navigator": "The system is taking shape. This is how strategies get built.",
  "The Launchpad":    "Foundations don't feel dramatic. They just hold everything up.",
  "The Skeptic": "You earned this one. Evidence-first means results that stick.",
  "The Pivot":  "Steady motion. That's the whole game.",
};


const PROFILE_BASE = {
  "The Compounder":   { color: "#0F6E56", bg: "#E1F5EE", border: "#5DCAA5", taskEmphasis: "apply",   voice: "peer",     pacing: "dense" },
  "The Cartographer":  { color: "#185FA5", bg: "#E6F1FB", border: "#85B7EB", taskEmphasis: "read",    voice: "advisor",  pacing: "deep" },
  "The Primed":  { color: "#6B5CE7", bg: "#EEEDFE", border: "#AFA9EC", taskEmphasis: "apply",   voice: "coach",    pacing: "momentum" },
  "The Scout":   { color: "#5C7CE7", bg: "#EEF0FE", border: "#A9B4EC", taskEmphasis: "read",    voice: "guide",    pacing: "progressive" },
  "The Incumbent":  { color: "#854F0B", bg: "#FAEEDA", border: "#EF9F27", taskEmphasis: "reflect", voice: "honest",   pacing: "deliberate" },
  "The Navigator": { color: "#2D5F9A", bg: "#E4EEF8", border: "#7EA8D0", taskEmphasis: "reflect", voice: "advisor",  pacing: "deep" },
  "The Launchpad":    { color: "#2D7D9A", bg: "#E4F3F8", border: "#7ECCE0", taskEmphasis: "apply",   voice: "guide",    pacing: "gentle" },
  "The Skeptic": { color: "#6B4DA3", bg: "#F0ECFE", border: "#B5A3DC", taskEmphasis: "read",    voice: "evidence", pacing: "earned" },
  "The Pivot":  { color: "#A32D2D", bg: "#FCEBEB", border: "#F09595", taskEmphasis: "reflect", voice: "evidence", pacing: "earned" },
};

// ─── Achievement definitions ───────────────────────────────
// id: unique key | icon: emoji | name: displayed title | desc: one-line what it means
// earned: fn(ctx) → bool, where ctx = { dayStatus, dayTasks, streakCount, noraChangeMade, noraPickDay }
const ACHIEVEMENTS = [
  {
    id: "first_move",
    icon: "⚡",
    name: "The First Move",
    desc: "Completed Day 1.",
    earned: ({ dayStatus }) => dayStatus[1] === 'done',
  },
  {
    id: "no_excuses",
    icon: "↩",
    name: "No Excuses",
    desc: "Completed a day right after skipping one.",
    earned: ({ dayStatus }) => {
      for (let d = 2; d <= 56; d++) {
        if (dayStatus[d - 1] === 'skipped' && dayStatus[d] === 'done') return true;
      }
      return false;
    },
  },
  {
    id: "perfect_week",
    icon: "🏅",
    name: "Perfect Week",
    desc: "7/7 days completed in a single week.",
    earned: ({ dayStatus }) => {
      for (let w = 0; w < 8; w++) {
        const allDone = Array.from({ length: 7 }, (_, i) => w * 7 + i + 1).every(d => dayStatus[d] === 'done');
        if (allDone) return true;
      }
      return false;
    },
  },
  {
    id: "compounding",
    icon: "🔥",
    name: "Compounding",
    desc: "14 days in a row.",
    earned: ({ streakCount }) => streakCount >= 14,
  },
  {
    id: "deep_cut",
    icon: "🔍",
    name: "Deep Cut",
    desc: "Completed 3 or more Reflect tasks.",
    earned: ({ dayStatus, dayTasks }) => {
      const count = Object.entries(dayTasks).filter(([d, t]) => dayStatus[d] === 'done' && t?.tag === 'Reflect').length;
      return count >= 3;
    },
  },
  {
    id: "builder",
    icon: "🔨",
    name: "Builder",
    desc: "Completed 5 or more Apply tasks.",
    earned: ({ dayStatus, dayTasks }) => {
      const count = Object.entries(dayTasks).filter(([d, t]) => dayStatus[d] === 'done' && t?.tag === 'Apply').length;
      return count >= 5;
    },
  },
  {
    id: "shifted",
    icon: "🧭",
    name: "Shifted",
    desc: "Changed your goal or weekly focus with Nora.",
    earned: ({ noraChangeMade }) => noraChangeMade,
  },
  {
    id: "noras_pick",
    icon: "✨",
    name: "Nora's Pick",
    desc: "Completed a task Nora built just for you.",
    earned: ({ noraPickDay, dayStatus }) => noraPickDay && dayStatus[noraPickDay] === 'done',
  },
  {
    id: "halfway",
    icon: "🏔",
    name: "Halfway",
    desc: "Completed 4 full weeks.",
    earned: ({ dayStatus }) => Array.from({ length: 28 }, (_, i) => i + 1).filter(d => dayStatus[d] === 'done').length >= 20,
  },
  {
    id: "full_program",
    icon: "🎓",
    name: "Full Program",
    desc: "56 days. You built something real.",
    earned: ({ dayStatus }) => Object.values(dayStatus).filter(s => s === 'done').length >= 50,
  },
];

// ─── Creds tier milestones ─────────────────────────────────
const CRED_MILESTONES = [
  { at: 50,  tier: "Operative",  copy: "You've moved past intention. This is what consistency looks like." },
  { at: 100, tier: "Strategist", copy: "A hundred Creds in. The program is working." },
  { at: 200, tier: "Senior",     copy: "Two hundred Creds. Most people never get here." },
  { at: 350, tier: "Principal",  copy: "This is what real commitment looks like." },
];

function buildProfile(profileName, role, seniority, answers, classification) {
  const r = role.toLowerCase();
  const senior  = seniority >= 2;
  const veteran = seniority >= 3;

  // Destructure all classifier signals
  const {
    isFrustrated, isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    approachStyle, orientation, behavioralStyle,
    isExternallyMotivated, isInternallyMotivated,
    // career situation signals (Change 1)
    careerSituation, urgencyTrigger,
    isInTransition, isStagnating, isHighPerformerFear, isBuildingToward,
    isUrgencyLayoff, isUrgencyPromotion, isUrgencyDrift,
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

  // blocker is now multi-select (array of indices). For single-index lookups use primary.
  const blockerArr = normalizeBlocker(answers.blocker);
  const primaryBlocker = blockerArr[0] ?? -1;

  const urgencyTrigger  = answers.urgency ?? -1;
  const isInTransition   = false; // career_situation removed
  const isStagnating     = false;
  const isHighPerformerFear = false;
  const isBuildingToward = false;
  const isUrgencyLayoff    = urgencyTrigger === 2;
  const isUrgencyPromotion = urgencyTrigger === 3;
  const isUrgencyDrift     = urgencyTrigger === 4;
  const careerSituation    = -1; // career_situation removed

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
  // review/promotion (3) = concrete goal, high readiness signal → +12
  // peers advancing (1) = competitive awareness → +8
  // drifting (4) = self-aware but low urgency → +5
  // AI field change (0) = awareness → +8
  // layoff (2) = reactive, not necessarily ready → +3
  // exploring (5) = open but undirected → +5
  // none (6) = low signal → 0
  readiness += [8, 8, 3, 12, 5, 8, 5, 0][answers.urgency] ?? 0;

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

  // goal — strongest orientation signal
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

  // blocker — behavioral orientation signal
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

  // urgency — secondary orientation signal
  const urgencyOrientMap = {
    0: { opt: 1, prot: 1, nav: 1 }, // AI disruption → mixed
    1: { opt: 2, prot: 1, nav: 0 }, // peers advancing → optimizer/protector
    2: { opt: 0, prot: 2, nav: 1 }, // layoff/restructure → protector
    3: { opt: 3, prot: 0, nav: 0 }, // review/promotion on line → optimizer
    4: { opt: 1, prot: 0, nav: 2 }, // drifting → navigator
    5: { opt: 4, prot: 0, nav: 2 }, // field transition → strong optimizer + navigator
    6: { opt: 1, prot: 1, nav: 1 }, // keen on exploring → balanced
    7: { opt: 0, prot: 0, nav: 0 }, // none of the above → neutral
  };
  const u = urgencyOrientMap[urgencyTrigger] || { opt: 0, prot: 0, nav: 0 };
  optScore += u.opt; protScore += u.prot; navScore += u.nav;

  // role — structural orientation by field (indices match dropdown order)
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

  // style_external_internal removed — derive behavioral style from remaining signals
  const isExternallyMotivated = urgencyTrigger === 1 || urgencyTrigger === 3; // peers/promotion
  const isInternallyMotivated = !isExternallyMotivated;

  // ══════════════════════════════════════════════════════════
  // PATTERN DETECTION
  // ══════════════════════════════════════════════════════════

  const isFrustrated = false; // already_tried removed

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
    "feel confident again — not faking it, actually solid",
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
    isFrustrated, isAnxietyDriven, isPureNavigator, hasTheoryGap,
    isHighCommitmentBeginner, isCredibilityDefender,
    careerSituation, urgencyTrigger,
    isInTransition, isStagnating, isHighPerformerFear, isBuildingToward,
    isUrgencyLayoff, isUrgencyPromotion, isUrgencyDrift,
    ultimateWhy, readinessChip, styleChip,
  };
}

// ════════════════════════════════════════════════════════════
// QUESTIONS , 7 total
// (Change #1: removed daily_want, format; already_tried restored)
// (Change #2: reordered , sliders at 5 and 8 for peak engagement)
// (Change #3: fear reframed as agency)
// (Change #4: ai_level removed — readiness derived from other signals)
// Arc: Facts → Identity → Emotions → Commitment
// ════════════════════════════════════════════════════════════
const questions = [
  {
    id: "name", label: "1 of 7",
    text: "What's your first name?",
    sub: "Just your first name is fine.",
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
      { text: "AI is changing my field faster than I can keep up. I'm not sure where I stand.", sub: "The ground is shifting and you need to know your footing" },
      { text: "I've watched people around me advance while I've stayed flat. That's a hard thing to admit." },
      { text: "The decision was partly made for me. A layoff or restructure changed things." },
      { text: "There's a review or a promotion on the line. I need to show something real." },
      { text: "Nothing is broken exactly. I've just been drifting, and I want to stop before it gets harder." },
      { text: "I'm not unhappy with where I am — I'm unhappy with the field itself. I want out.", sub: "A real change, not just a better version of the same thing" },
      { text: "I'm keen on exploring new opportunities." },
      { text: "None of the above, if I'm being honest." },
    ],
  },
  // ── BLOCK 3: Identity (slider #1 , forced honest take) ──
  {
    id: "style_outcome_process", label: "5 of 7",
    text: "When it comes to making progress on this, which is more true?",
    sub: "Pick the side you lean toward. There's no middle ground.",
    type: "slider",
    left: { text: "Just tell me what to do", desc: "Give me the first move. I can read about it later." },
    right: { text: "Help me understand what's happening", desc: "I can't act with confidence until I can see the full picture." },
  },
  // ── BLOCK 4: Emotions ──
  {
    id: "goal", label: "6 of 7",
    text: "What would feel like real progress in the next 12 months?",
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
    text: "What usually gets in the way when you try to make progress on something that matters?",
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
    isFrustrated, isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    orientation, approachStyle,
    // career situation signals (Change 1)
    careerSituation, urgencyTrigger,
    isInTransition, isStagnating, isHighPerformerFear, isBuildingToward,
    isUrgencyLayoff, isUrgencyPromotion, isUrgencyDrift,
  } = classification;

  const roleName     = QOpt("role", answers.role)             || "your field";
  const seniorityText = QOpt("seniority", answers.seniority)  || "";
  // Normalise blocker to array (question is now multi-select)
  const blockerArr = normalizeBlocker(answers.blocker);
  const primaryBlocker = blockerArr[0] ?? -1;

  // ── BEAT 1: Recognition  - leads with career situation when available, then readiness + pattern flags ──
  // career_situation options: 0=anxious/doing-well, 1=stuck, 2=looking, 3=displaced, 4=successful-worried, 5=building
  // urgency options: 0=AI field change, 1=peers advancing, 2=layoff, 3=review/promo, 4=drifting, 5=all
  const careerSituationText = [
    "You're doing well",
    "You've been in the same place for a while now",
    "You're ready to move",
    "Your situation changed",
    "You're successful",
    "You know what you want",
  ];
  const urgencyText = [
    "AI is changing your field faster than expected",
    "people around you are moving faster",
    "a layoff or restructure forced the question",
    "a review or promotion is on the line",
    "you've been drifting and you want to stop",
    "you've realised it's not your role that's the problem — it's the field",
    "it's everything at once",
  ];
  const careerOpener = careerSituation >= 0 ? careerSituationText[careerSituation] : null;
  const urgencyOpener = urgencyTrigger  >= 0 ? urgencyText[urgencyTrigger]  : null;

  let recognition = "";
  if (isInTransition) {
    recognition = `${seniorityText} into ${roleName.toLowerCase()}, and your situation recently changed  - a transition you may not have chosen. Your plan doesn't treat you like someone who just needs more motivation. It starts where you actually are.`;
  } else if (isStagnating && urgencyTrigger >= 0) {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()}, and ${urgencyOpener} is pushing you to do something about it. The frustration of being stuck at the same level is real. Your plan is built around movement, not reflection.`;
  } else if (isHighPerformerFear) {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and genuinely good at what you do. The unease you're feeling isn't panic. It's pattern recognition. Your plan works with that instinct, not against it.`;
  } else if (isBuildingToward && urgencyTrigger >= 0) {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and you know the direction. ${urgencyOpener.charAt(0).toUpperCase() + urgencyOpener.slice(1)} is what's making right now feel different. Your plan closes the gap between knowing and moving.`;
  } else if (careerOpener && urgencyOpener) {
    recognition = `${careerOpener}, ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()}, and ${urgencyOpener}. Your plan is built for exactly this intersection.`;
  } else if (isFrustrated) {
    recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and you've genuinely tried to get traction with AI , it just hasn't clicked yet. That's a different problem than not having started, and your plan treats it differently.`;
  } else if (isAnxietyDriven) {
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

  // ── BEAT 2: Concern reframe — now multi-select aware ──
  const blockerConcerns = {
    0: "Time is the constraint. Every task in your plan is scoped to 30 minutes or less.",
    1: "Overwhelm is the problem. Your plan is sequential for exactly this reason — one thing at a time, in order.",
    2: "You start things but lose the thread. That's a structure problem, not a motivation problem. Every task has a clear endpoint.",
    3: "You learn things but don't apply them to your actual work. So your plan is built around application, not consumption.",
    4: "Too many options, none that feel right. Your plan cuts through that — one direction, one move at a time.",
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
  else if (answers.goal === 4) goal = "More than anything, you want to feel genuinely solid  - not performing it, actually having it. Every task is a data point that builds the real thing.";

  // ── BEAT 4: Blocker narrative — composite for multi-select ──
  const blockerLines = {
    0: "Time is the real constraint. Every task in your plan fits inside 30 minutes.",
    1: "Overwhelm is one of your blockers — too much, no clear starting point. Your plan is sequential for exactly this reason. We do the filtering so you don't have to.",
    2: "You start things but lose the thread. That's a structure problem, not a motivation problem. Every task has a clear endpoint — you'll know when you're done.",
    3: "You learn things but don't apply them to your actual work. So your plan is built around application, not consumption. Everything asks you to do something real.",
    4: "Direction is one of your blockers. Every task is here for a specific reason — nothing generic, nothing filler.",
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
    isFrustrated, isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    isExternallyMotivated, isInternallyMotivated,
    isUnderstandingOriented, isActionOriented,
    isInTransition, isStagnating, isHighPerformerFear, isBuildingToward,
    isUrgencyLayoff, isUrgencyPromotion, isUrgencyDrift,
  } = classification;

  const sen   = answers.seniority  ?? 0;
  const _blockerArr2 = normalizeBlocker(answers.blocker);
  const concern = _blockerArr2[0] ?? -1;
  const goal    = answers.goal;

  // Career situation opener  - prepended to reason text
  const situationLine =
    isInTransition    ? "You're navigating a transition  - the situation shifted and now you're deciding what comes next." :
    isStagnating      ? "You've been in the same place longer than it should have taken. The frustration is real, and the plan is built around movement." :
    isHighPerformerFear ? "You're doing well by most measures. The unease you're feeling is pattern recognition, not panic." :
    isBuildingToward  ? "You're doing well, and you want to move faster. The plan is built around acceleration, not recovery." :
    null;

  // ── Signal chips ────────────────────────────────────────
  const readinessChip =
    readinessLevel === "high"   ? "High readiness" :
    readinessLevel === "medium" ? "Medium readiness" :
                                  "Early stage";

  const orientChip =
    orientation === "optimizer" ? "Growth-oriented" :
    orientation === "protector" ? "Protection-oriented" :
                                  "Strategy-oriented";

  const approachChip =
    approachStyle === "action"      ? "Action-first" :
    approachStyle === "understanding" ? "Understand-first" :
                                       "Balanced approach";

  const patternChip =
    isFrustrated           ? "Tried & stuck" :
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
                        frustrated: { name: "The Scout",   line: "More context, less pressure to produce output straight away." },
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
    "The Pivot":    { frustrated: { name: "The Launchpad",    line: "Less friction to work through before getting started." },
                        anxiety:    { name: "The Incumbent",  line: "More readiness and a clearer professional asset to build on." },
                        cred:       { name: "The Incumbent",  line: "Higher readiness, clearer on which parts of their expertise to protect." },
                        default:    { name: "The Skeptic", line: "More curiosity, less resistance to new approaches." } },
  };

  function getSecondary(name) {
    const map = SECONDARY[name];
    if (!map) return null;
    if (name === "The Compounder")   return isExternallyMotivated ? map.isExternal : map.default;
    if (name === "The Cartographer")  return isPureNavigator ? map.isPureNav : map.default;
    if (name === "The Primed")  return hasTheoryGap ? map.hasGap : isFrustrated ? map.frustrated : map.default;
    if (name === "The Incumbent")  return isCredibilityDefender ? map.cred : concern === 4 ? map.concern4 : map.default;
    if (name === "The Navigator") return isPureNavigator ? map.pureNav : map.default;
    if (name === "The Launchpad")    return isHighCommitmentBeginner ? map.highCom : map.default;
    if (name === "The Pivot")    return isFrustrated ? map.frustrated : isAnxietyDriven ? map.anxiety : isCredibilityDefender ? map.cred : map.default;
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

  // Prepend career situation context if present
  if (situationLine && reason) reason = situationLine + " " + reason;

  return { signals, reason, secondaryProfile };
}


// ─── Signal Insights ──────────────────────────────────────
// Single personalized observation combining situation + goal + blocker.
// Reads like someone who read every answer and noticed something specific.
function generateSignalInsights(classification, answers) {
  const {
    isFrustrated, isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    isExternallyMotivated, isInternallyMotivated,
    isInTransition, isStagnating, isHighPerformerFear, isBuildingToward,
    isUrgencyLayoff, isUrgencyPromotion, isUrgencyDrift,
    readinessLevel, orientation,
  } = classification;

  const goal    = answers.goal             ?? -1;
  const _blockerArr3 = normalizeBlocker(answers.blocker);
  const concern = _blockerArr3[0] ?? -1; // primary blocker index
  const blocker = concern;

  // Build the insight, 2 lines about who this archetype is for this specific person
  // Crosses: archetype × career situation × urgency × goal
  const careerSit = -1; // career_situation removed
  const urgency   = answers.urgency          ?? -1;
  const profile   = classification.profileName || "";

  // Urgency flavour, what's actually driving this
  const urgencyLine =
    urgency === 0 ? "the field is moving and you need to know where you stand" :
    urgency === 1 ? "people around you are advancing and you're not moving" :
    urgency === 2 ? "a layoff or restructure made the decision for you" :
    urgency === 3 ? "there's a review or promotion on the line" :
    urgency === 4 ? "you've been drifting and you want to stop" :
    urgency === 5 ? "you've decided it's not the role — it's the field itself" :
    urgency === 6 ? "everything is happening at once" : null;

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
  const { isInTransition, isStagnating, isHighPerformerFear, isBuildingToward, isAnxietyDriven, isFrustrated, isCredibilityDefender } = classification || {};
  const goal = answers.goal ?? -1;

  if (isInTransition) return "The situation changed. The move now is to decide what you're building from here  - not what you're recovering from.";
  if (isStagnating && goal === 2) return "Progress that's been missing for too long doesn't come from effort. It comes from moving in one direction on purpose, every day.";
  if (isAnxietyDriven) return "The gap between where you are and where you need to be has a specific size. Specific is always smaller than vague.";
  if (isHighPerformerFear) return "You're not behind. You're pattern-matching. Trust that  - and then do one thing about it today.";
  if (isBuildingToward) return "You're not behind. You're ambitious. The plan turns that into daily movement.";

  if (isCredibilityDefender) return "What you've built over years doesn't disappear. The question is how to make it visible in a field that's changing around it.";
  if (goal === 4) return "Confidence isn't a feeling you wait for. It's a record you build  - one task, one day at a time.";
  if (goal === 1) return "The goal isn't to become something different. It's to make what you already are harder to displace.";
  return "The people who move through this aren't more motivated. They just have a plan that shows up tomorrow.";
}

// ─── Static Outcomes Fallback ─────────────────────────────
// Used when AI generation fails. Returns 3 outcomes keyed to profile + goal.
// Dimensions: (1) concrete output built, (2) clarity gained, (3) habit started.
function generateStaticOutcomes(profileName, answers, classification) {
  const goalIdx = answers.goal ?? 1;
  const { orientation, readinessLevel, isInTransition, isStagnating } = classification || {};

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
    "The Navigator": "You can articulate the decisions your function needs someone to own  - and whether that person should be you.",
    "The Launchpad":    "You know it's not as hard to start as it felt, because you already have.",
    "The Skeptic": "You have enough context to act  - and a clear sense of what's changing fast and what isn't.",
    "The Pivot":    "You've found one angle that's genuinely relevant to your actual situation. Not something generic, something real.",
  };

  let habitSentence;
  if (isInTransition) {
    habitSentence = "You've started building something during this transition instead of waiting for it to resolve.";
  } else if (isStagnating) {
    habitSentence = "You've broken the pattern of knowing you should do something and not doing it. Seven days in a row.";
  } else if (readinessLevel === "high") {
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
        { tag: "Read", time: "10 min", title: `How AI is changing ${isSenior ? "marketing leadership" : "day-to-day marketing"}`, desc: isSenior ? "AI Overviews now affect a large share of search queries. Your team's SEO strategy may already be outdated." : "AI Overviews are reshaping search. Read the click-through data  - your tactics may need updating.", whyBase: "The landscape shifted. Marketers who don't adjust are optimizing for a platform that's changing under them." },
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
      tag: isExperienced ? "Apply" : "Apply",
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

  // careerSituationLabel  - crosses situation + urgency for a specific, personal read
  const cs  = -1; // career_situation removed
  const urg = answers.urgency           ?? -1;
  const careerSituationLabel = (() => {
    if (cs === 0) { // Doing well, anxious
      if (urg === 0) return "Doing well  - field shifting fast";
      if (urg === 3) return "Doing well  - promotion on the line";
      if (urg === 1) return "Doing well  - peers moving faster";
      if (urg === 4) return "Doing well  - quietly drifting";
      return "Good position, ground shifting";
    }
    if (cs === 1) { // Stuck
      if (urg === 1) return "Stuck while others advance";
      if (urg === 0) return "Stuck as the field accelerates";
      if (urg === 4) return "Stuck  - ready to move";
      return "Stuck  - ready to move";
    }
    if (cs === 2) { // Actively looking
      if (urg === 2) return "Looking  - after a restructure";
      if (urg === 3) return "Looking  - promotion or new role";
      return "Actively looking";
    }
    if (cs === 3) { // In transition
      if (urg === 2) return "In transition  - not by choice";
      return "In transition";
    }
    if (cs === 4) { // High performer, uneasy
      if (urg === 0) return "High performer  - field shifting";
      if (urg === 1) return "High performer  - others catching up";
      return "High performer, uneasy";
    }
    if (cs === 5) { // Growing faster
      if (urg === 3) return "Ambitious  - promotion in sight";
      if (urg === 5) return "Ambitious  - ready to accelerate";
      return "Ambitious  - growing faster";
    }
    return "In progress";
  })();

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
const FONTS = ``; // Font loaded via <link> in root component

// ─── Design Tokens ────────────────────────────────────────
const C = {
  // Dark backgrounds
  bg0:      "#08080F",   // deepest, hero base
  bg1:      "#0F0F1C",   // hero gradient mid
  bg2:      "#13131F",   // hero gradient end

  // Accent, refined warm lavender
  accent:   "#9B8FE0",
  accentL:  "#B8AFEC",
  accentLL: "#EAE8FA",
  accentD:  "#6C60C2",

  // Light section
  offWhite: "#FAFAF9",
  white:    "#FFFFFF",

  // Text
  textHero:   "#FFFFFF",
  textDim:    "rgba(255,255,255,0.58)",
  textMuted:  "rgba(255,255,255,0.34)",
  ink:        "#1A1830",
  body:       "#4D4A68",
  muted:      "#9693B0",

  // UI
  border:     "#E9E7F5",
  borderD:    "rgba(255,255,255,0.10)",
  cardShadow: "0 2px 16px rgba(15,14,30,0.07), 0 8px 40px rgba(15,14,30,0.05)",
};

// ─── Logo SVG (arc + glow dot) ────────────────────────────
const Logo = React.memo(function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 56 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7B6FCC" />
          <stop offset="100%" stopColor="#B0A8F0" />
        </linearGradient>
        <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C4BDF7" stopOpacity="1" />
          <stop offset="100%" stopColor="#8B7EE8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Arc */}
      <path
        d="M4 32 A24 24 0 0 1 52 32"
        stroke="url(#arcGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Glow circle */}
      <circle cx="28" cy="26" r="5" fill="url(#dotGlow)" opacity="0.6" />
      {/* Core dot */}
      <circle cx="28" cy="26" r="2.5" fill="#C4BDF7" />
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

// ─── Pill badge ────────────────────────────────────────────
const Pill = React.memo(function Pill({ children, light = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "6px 13px", borderRadius: 100,
      background: light ? C.accentLL : "rgba(155,143,224,0.12)",
      color: light ? C.accentD : C.accentL,
      border: light ? `1px solid ${C.accentLL}` : "1px solid rgba(155,143,224,0.22)",
    }}>
      {children}
    </span>
  );
});

// ─── Section label ─────────────────────────────────────────
function Label({ children, light = false }) {
  return (
    <p style={{
      fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: light ? C.accentD : C.accent,
      margin: "0 0 16px",
    }}>
      {children}
    </p>
  );
}

// ─── Divider ───────────────────────────────────────────────
function Divider({ light = false }) {
  return <div style={{ width: "100%", height: 1, background: light ? C.border : C.borderD, margin: "0" }} />;
}

// SVG wave shape between two section colours — no gradient, flat fills only
function SectionBlend({ from, to, height = 60, flip = false, deep = false }) {
  // deep=true: taller wave with a more gradual curve, for high-contrast transitions
  const wavePath = deep
    ? "M0,20 C200,120 800,0 1200,60 L1200,120 L0,120 Z"
    : "M0,32 C300,60 900,10 1200,38 L1200,60 L0,60 Z";
  const viewH = deep ? 120 : 60;
  return (
    <div style={{ display: "block", lineHeight: 0, marginTop: -1, marginBottom: -1, overflow: "hidden" }}>
      <svg viewBox={`0 0 1200 ${viewH}`} preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: deep ? (height || 120) : height, transform: flip ? "scaleX(-1)" : "none" }}
        aria-hidden="true">
        <rect x="0" y="0" width="1200" height={viewH} fill={from} />
        <path d={wavePath} fill={to} />
      </svg>
    </div>
  );
}

// ─── Headline Typewriter ───────────────────────────────────
const TYPEWRITER_LINE = "into clarity and action";
function HeadlineTypewriter() {
  const [line1Visible, setLine1Visible] = useState(false);
  const [typed, setTyped] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const done = typed.length === TYPEWRITER_LINE.length;

  // Fade in line 1 on mount
  useEffect(() => {
    const t = setTimeout(() => setLine1Visible(true), 120);
    return () => clearTimeout(t);
  }, []);

  // Start typewriter after line 1 fades in
  useEffect(() => {
    if (!line1Visible) return;
    if (typed.length >= TYPEWRITER_LINE.length) return;
    const t = setTimeout(() => {
      setTyped(TYPEWRITER_LINE.slice(0, typed.length + 1));
    }, typed.length === 0 ? 600 : 49);
    return () => clearTimeout(t);
  }, [line1Visible, typed]);

  // Blink cursor until done, then hide it
  useEffect(() => {
    if (done) { setCursorVisible(false); return; }
    const t = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(t);
  }, [done]);

  return (
    <div style={{ position: "relative", zIndex: 1, margin: "0 0 36px" }}>
      {/* Line 1 */}
      <div style={{
        opacity: line1Visible ? 1 : 0,
        transform: line1Visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}>
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(28px, 5vw, 60px)",
          fontWeight: 400,
          lineHeight: 1.12,
          color: C.textHero,
          letterSpacing: "-0.5px",
          display: "block",
        }}>
          Turn career uncertainty
        </span>
      </div>

      {/* Line 2, typewriter */}
      <div style={{ minHeight: "1.2em" }}>
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(28px, 5vw, 60px)",
          fontWeight: 400,
          lineHeight: 1.12,
          color: C.accentL,
          fontStyle: "italic",
          letterSpacing: "-0.5px",
        }}>
          {typed}
        </span>
        <span style={{
          display: "inline-block",
          width: "2px",
          height: "0.85em",
          background: C.accentL,
          marginLeft: "2px",
          verticalAlign: "middle",
          opacity: cursorVisible && !done ? 1 : 0,
          transition: "opacity 0.1s",
        }} />
      </div>
    </div>
  );
}

// ─── REDESIGNED LANDING PAGE ──────────────────────────────
function LandingPage({ onStart, onResume, savedPlan }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: C.offWhite }}>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .sa-nav-sticky {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
        }
        .sa-nav-scrolled {
          background: rgba(8, 8, 15, 0.92) !important;
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.07) !important;
        }

        .sa-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: Inter, sans-serif; font-size: 15px; font-weight: 600;
          letter-spacing: -0.2px; color: #08080F;
          background: #FFFFFF; border: none; border-radius: 8px;
          padding: 14px 28px; cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
          white-space: nowrap;
        }
        .sa-btn-primary:hover {
          background: #F0EFF8; transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.16);
        }
        .sa-btn-primary-light {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: Inter, sans-serif; font-size: 15px; font-weight: 600;
          letter-spacing: -0.2px; color: #FFFFFF;
          background: ${C.accentD}; border: none; border-radius: 8px;
          padding: 14px 28px; cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 2px 12px rgba(108,96,194,0.35);
          white-space: nowrap;
        }
        .sa-btn-primary-light:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(108,96,194,0.45);
        }
        .sa-btn-ghost {
          display: inline-flex; align-items: center;
          font-family: Inter, sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.55); background: transparent;
          border: 1px solid rgba(255,255,255,0.14); border-radius: 7px;
          padding: 9px 18px; cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .sa-btn-ghost:hover { border-color: rgba(255,255,255,0.35); color: rgba(255,255,255,0.9); }

        .sa-step-card {
          background: ${C.white}; border: 1px solid ${C.border};
          border-radius: 16px; padding: 28px 28px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sa-step-card:hover { transform: translateY(-3px); box-shadow: ${C.cardShadow}; }

        .sa-comparison-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 640px) {
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
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav
        className={`sa-nav-sticky${scrolled ? " sa-nav-scrolled" : ""}`}
        style={{ background: "transparent", borderBottom: "1px solid transparent" }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={26} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, color: C.textHero, letterSpacing: "-0.4px" }}>
              Second Act
            </span>
          </div>

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
      <section style={{
        background: `linear-gradient(160deg, ${C.bg0} 0%, ${C.bg1} 50%, ${C.bg2} 100%)`,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "120px clamp(16px,5vw,40px) 100px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "15%", right: "8%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(120,108,200,0.14) 0%, transparent 68%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(80,140,200,0.07) 0%, transparent 68%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>

          {/* Headline halo */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700, height: 340,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(155,143,224,0.18) 0%, rgba(108,96,194,0.08) 40%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }} />

          {/* Headline */}
          <FadeIn delay={80}>
            <h1 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(32px, 5.5vw, 60px)",
              fontWeight: 400,
              lineHeight: 1.12,
              color: C.textHero,
              letterSpacing: "-0.5px",
              margin: "0 0 36px",
              position: "relative",
              zIndex: 1,
            }}>
              Get <span style={{ color: C.accentL, fontStyle: "italic" }}>unstuck</span> in your career
            </h1>
          </FadeIn>

          {/* Subhead */}
          <FadeIn delay={160}>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(15px, 2vw, 17px)",
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.52)",
              maxWidth: 560,
              margin: "0 auto 52px",
              fontWeight: 300,
            }}>
              Second Act is your thinking partner: it helps you get moving, nudges you when you hesitate, and turns your ideas into a plan you can follow, one day at a time.
            </p>
          </FadeIn>

          {/* Resumed program card */}
          {savedPlan && (
            <FadeIn delay={220}>
              <div style={{
                maxWidth: 420, margin: "0 auto 32px",
                background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14,
                padding: "18px 22px", display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(155,143,224,0.25)", border: "1px solid rgba(155,143,224,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Logo size={18} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Your program is waiting</p>
                  <p style={{ fontFamily: "Inter", fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
                    {savedPlan._answers?.name ? savedPlan._answers.name : "Your program"}
                  </p>
                  <p style={{ fontFamily: "Inter", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    {savedPlan._resumeDay > 1 ? `Day ${savedPlan._resumeDay} · ` : ""}Career program
                  </p>
                </div>
              </div>
            </FadeIn>
          )}

          {/* CTAs */}
          <FadeIn delay={260}>
            <div className="sa-hero-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 0 }}>
              {savedPlan
                ? <button onClick={onResume} className="sa-btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>Continue program →</button>
                : <button onClick={onStart} className="sa-btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>Get my plan →</button>
              }
              {savedPlan && (
                <button onClick={onStart} className="sa-btn-ghost">Start fresh instead</button>
              )}
            </div>
          </FadeIn>

        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────── */}
      <section style={{ background: C.offWhite, padding: "96px clamp(16px,5vw,40px) 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <FadeIn>
            <Label light>Sound familiar?</Label>
            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 400, color: C.ink, lineHeight: 1.35, letterSpacing: "-0.5px", marginBottom: 36 }}>
              You've built skills, experience, and credibility in your field.
            </h2>
          </FadeIn>
          <FadeIn delay={100}>
            <p style={{ fontFamily: "Inter", fontSize: 16, color: C.body, lineHeight: 1.85, fontWeight: 300, marginBottom: 24 }}>
              But something keeps pulling at you... a decision you haven't made, a direction you haven't committed to, a sense that you could be doing something more aligned.
            </p>
          </FadeIn>
          <FadeIn delay={180}>
            <div style={{ borderLeft: `3px solid ${C.accentD}`, paddingLeft: 22, marginTop: 16 }}>
              <p style={{ fontFamily: "Inter", fontSize: 15, color: C.body, margin: 0, lineHeight: 1.85, fontWeight: 400 }}>
                Second Act provides you with a research-backed structure that helps you figure out where you stand, what to focus on, and how to move forward, step by step.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── COMPARISON ──────────────────────────────────────── */}
      <section id="why-second-act" style={{ background: C.white, padding: "96px clamp(16px,5vw,40px) 96px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <Label light>Why Second Act</Label>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 400, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                A smart complement to traditional coaching
              </h2>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <div className="sa-comparison-scroll" style={{ WebkitOverflowScrolling: "touch" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 48px rgba(15,14,30,0.10), 0 2px 12px rgba(15,14,30,0.05)", minWidth: 620 }}>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr" }}>
                {/* Empty corner */}
                <div style={{ background: "#F7F6FB", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }} />
                {/* Coaching header */}
                <div style={{ padding: "24px 32px", background: "#F7F6FB", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
                  <p style={{ fontFamily: "Inter", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, margin: "0 0 6px" }}>Traditional</p>
                  <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20, fontWeight: 400, color: C.body, margin: 0, letterSpacing: "-0.3px" }}>Coaching</p>
                </div>
                {/* Second Act header */}
                <div style={{ padding: "24px 32px", background: C.accentD, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: "-30%", right: "-10%", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
                  <p style={{ fontFamily: "Inter", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 6px" }}>Your complement</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Logo size={16} />
                    <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20, fontWeight: 400, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>Second Act</p>
                  </div>
                </div>
              </div>

              {/* Rows */}
              {[
                { label: "Cost",             coaching: "$200–$500 / session",                  secondact: "Free to start"                            },
                { label: "Availability",     coaching: "Weekly 1-hour sessions",               secondact: "Every day, at your pace"                  },
                { label: "Personalization",  coaching: "Depends on your coach",                secondact: "Proven frameworks, tailored to you"       },
                { label: "Accountability",   coaching: "Between sessions, you're on your own", secondact: "Structured program keeps you on track"    },
                { label: "Time to clarity",  coaching: "Weeks of exploration",                 secondact: "A clear plan in minutes"                  },
                { label: "Thinking partner", coaching: "Your coach",          secondact: "Nora, available every day, remembers your context"              },
                { label: "Habit formation",  coaching: "Not structured for it",                secondact: "Nora keeps you on track, research-backed, behaviorally designed"  },
              ].map(({ label, coaching, secondact }, i) => {
                const isLast = i === 6;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr" }}>

                    {/* Label cell */}
                    <div style={{
                      padding: "20px 24px 20px 28px",
                      background: C.white,
                      borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                      borderRight: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center",
                    }}>
                      <p style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.ink, margin: 0 }}>{label}</p>
                    </div>

                    {/* Coaching cell */}
                    <div style={{
                      padding: "20px 32px",
                      background: C.white,
                      borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                      borderRight: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: "#F3F2F7", border: `1.5px solid ${C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M2 2l4 4M6 2l-4 4" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <p style={{ fontFamily: "Inter", fontSize: 13, color: C.muted, fontWeight: 400, margin: 0, lineHeight: 1.5 }}>{coaching}</p>
                    </div>

                    {/* Second Act cell */}
                    <div style={{
                      padding: "20px 32px",
                      background: "rgba(108,96,194,0.05)",
                      borderBottom: isLast ? "none" : `1px solid rgba(184,175,236,0.4)`,
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: C.accentD,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(108,96,194,0.35)",
                      }}>
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <p style={{ fontFamily: "Inter", fontSize: 13, color: C.ink, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{secondact}</p>
                    </div>

                  </div>
                );
              })}
            </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRODUCT PREVIEW ─────────────────────────────────── */}
      <section style={{ background: C.offWhite, padding: "96px clamp(16px,5vw,40px) 96px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <Label light>The daily experience</Label>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                One task a day. Weekly goals.
              </h2>
              <p style={{ fontFamily: "Inter", fontSize: 15, color: C.body, lineHeight: 1.8, fontWeight: 300, maxWidth: 480, margin: "16px auto 0" }}>
                One task a day built around your role, goal, and working style. And Nora as your thinking partner to adapt your plan and keep you on track.
              </p>
            </div>
          </FadeIn>

          {/* App frame */}
          <FadeIn delay={80}>
            <div className="sa-dashboard-frame" style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(15,14,30,0.14), 0 4px 16px rgba(15,14,30,0.06)", border: `1px solid ${C.border}` }}>
              {/* Browser chrome */}
              <div style={{ background: "#F2F1F7", padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#FF5F57","#FFBD2E","#28C840"].map((c,i) => <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
                </div>
                <div style={{ flex: 1, background: "#fff", borderRadius: 6, padding: "4px 12px", marginLeft: 8, maxWidth: 280 }}>
                  <span style={{ fontFamily: "Inter", fontSize: 11, color: C.muted }}>secondactapp.com · dashboard</span>
                </div>
              </div>

              {/* Dashboard header */}
              <div style={{ background: `linear-gradient(155deg, ${C.bg0} 0%, ${C.bg1} 55%, ${C.bg2} 100%)`, padding: "22px 24px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-20%", right: "2%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(120,108,200,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Logo size={18} />
                    <span style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: "-0.2px" }}>Second Act</span>
                  </div>
                  <span style={{ fontFamily: "Inter", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>Week 1</span>
                </div>
                <p style={{ fontFamily: "Inter", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4, fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase" }}>The Primed · Week 1</p>
                <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: "#fff", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.3px", marginBottom: 8 }}>Start moving on what matters</p>
                <p style={{ fontFamily: "Inter", fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: 300 }}>Day 1 is ready. Your plan starts here.</p>
              </div>

              {/* Dashboard body */}
              <div style={{ background: "#fff", padding: "20px 22px" }}>
                {/* Week strip */}
                <p style={{ fontFamily: "Inter", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accentD, marginBottom: 10 }}>This week</p>
                <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
                  {["M","T","W","T","F","S","S"].map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <p style={{ fontFamily: "Inter", fontSize: 9, color: i === 0 ? C.accentD : C.muted, marginBottom: 5, fontWeight: i === 0 ? 700 : 400 }}>{d}</p>
                      <div style={{ height: 28, borderRadius: 7, background: i === 0 ? C.accentLL : "#F4F4F4", border: i === 0 ? `1.5px solid ${C.accentL}` : "1.5px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", opacity: i > 0 ? 0.4 : 1 }}>
                        {i === 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.accentD }} />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Task card */}
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.accentD}`, borderRadius: 12, padding: "16px", marginBottom: 14, boxShadow: "0 1px 6px rgba(15,14,30,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontFamily: "Inter", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", background: C.accentLL, color: C.accentD, borderRadius: 4 }}>Apply</span>
                    <span style={{ fontFamily: "Inter", fontSize: 11, color: C.muted }}>10 min</span>
                    <span style={{ fontFamily: "Inter", fontSize: 10, fontWeight: 600, color: C.accentD, marginLeft: "auto" }}>Day 1</span>
                  </div>
                  <p style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8, lineHeight: 1.35 }}>Write the one paragraph about your work you've been putting off</p>
                  <p style={{ fontFamily: "Inter", fontSize: 12, color: C.body, marginBottom: 12, lineHeight: 1.65 }}>Generated from your answers. Specific to your role and situation.</p>
                  {["Open a blank doc", "Write without editing for 5 minutes", "Send it to one person"].map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < 2 ? 7 : 0 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: "#fff", border: `1.5px solid ${C.accentL}`, flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontFamily: "Inter", fontSize: 11, color: C.body, lineHeight: 1.5 }}>{s}</p>
                    </div>
                  ))}
                </div>

                {/* Completion */}
                <div style={{ background: C.offWhite, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, color: C.ink, marginBottom: 10 }}>Did you complete today's task?</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: C.ink, color: "#fff", borderRadius: 7, padding: "9px 0", fontFamily: "Inter", fontSize: 12, fontWeight: 600, textAlign: "center" }}>Yes, done ✓</div>
                    <div style={{ flex: 1, background: "#fff", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 0", fontFamily: "Inter", fontSize: 12, textAlign: "center" }}>Not yet</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(155deg, ${C.bg0} 0%, ${C.bg1} 55%, ${C.bg2} 100%)`,
        padding: "96px clamp(16px,5vw,40px)",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(120,108,200,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 400, color: C.textHero, lineHeight: 1.1, letterSpacing: "-1px", marginBottom: 20 }}>
              Get clarity and structure.
            </h2>
            <p style={{ fontFamily: "Inter", fontSize: 15, color: "rgba(255,255,255,0.45)", fontWeight: 300, lineHeight: 1.75, marginBottom: 40, maxWidth: 400, margin: "0 auto 40px" }}>
              Get a clear, personalized plan based on where you are, and Nora as your thinking partner to keep you accountable.
            </p>
            <button onClick={onStart} className="sa-btn-primary" style={{ fontSize: 16, padding: "16px 44px" }}>
              Get my plan →
            </button>
            <p style={{ fontFamily: "Inter", fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 16, letterSpacing: "0.03em" }}>
              Free · 12 questions · Your plan is ready in minutes
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: C.offWhite, borderTop: `1px solid ${C.border}`, padding: "32px clamp(16px,5vw,40px)" }}>
        <div className="sa-footer-inner" style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Logo size={20} />
            <span style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>Second Act</span>
          </div>
          <span style={{ fontFamily: "Inter", fontSize: 12, color: C.muted, fontWeight: 300 }}>
            Structure · Accountability · Free to start
          </span>
        </div>
      </footer>

    </div>
  );
}


// ─── Quiz , Lovable-style clean cards ───────────────────
function QuizScreen({ onComplete, onBack }) {
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
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: T.border }}>
        <div style={{ height: "100%", width: `${pct}%`, background: T.purple, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ maxWidth: 580, margin: "0 auto", padding: "32px 24px 100px" }}>
        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <button onClick={() => go(-1)} style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 14, color: T.muted, cursor: "pointer", padding: 0 }}>
            ← Back
          </button>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.purple }}>{showingSubRole ? "1b" : current + 1} OF {questions.length}{hasSubRole && current === 1 && !showingSubRole ? "+1" : ""}</span>
            <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, marginLeft: 12 }}>{pct}% complete</span>
          </div>
        </div>


        <div style={{ opacity: fade ? 1 : 0, transform: fade ? "translateY(0)" : "translateY(10px)", transition: "all 0.18s ease" }}>
          {/* Question */}
          <h2 style={{ fontFamily: T.serif, fontSize: "clamp(22px,4vw,27px)", fontWeight: 400, lineHeight: 1.45, color: T.black, margin: "0 0 10px", letterSpacing: -0.3 }}>{q.text}</h2>
          {q.type === "multi" && <p style={{ fontFamily: T.sans, fontSize: 13, color: "#BBB", margin: "0 0 20px" }}>Select all that apply</p>}
          {q.type !== "multi" && <div style={{ marginBottom: 24 }} />}

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
                  width: "100%", padding: "16px 20px",
                  border: `1.5px solid ${(answers[q.id] || "").trim() ? T.purple : T.border}`,
                  background: (answers[q.id] || "").trim() ? T.purpleL : "#fff",
                  borderRadius: 0, fontFamily: T.serif, fontSize: 24,
                  color: T.black, outline: "none", boxSizing: "border-box", letterSpacing: -0.3,
                }}
              />
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "10px 0 0" }}>Press Enter or tap Continue</p>
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
                    width: "100%", padding: "16px 44px 16px 20px",
                    border: answers[q.id] !== undefined ? `1.5px solid ${T.purple}` : `1.5px solid ${T.border}`,
                    background: answers[q.id] !== undefined ? T.purpleL : "#fff",
                    borderRadius: 0, fontFamily: T.sans, fontSize: 15,
                    color: answers[q.id] !== undefined ? T.purpleD : T.black,
                    cursor: "pointer", outline: "none", appearance: "none",
                    WebkitAppearance: "none", lineHeight: 1.4,
                  }}>
                  <option value="" disabled>Select your field...</option>
                  {q.options.map((opt, i) => (
                    <option key={i} value={i}>{opt.text}</option>
                  ))}
                </select>
                <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.muted }}>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
              </div>
              {answers[q.id] !== undefined && q.options[answers[q.id]]?.sub && (
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.body, margin: "10px 0 0", lineHeight: 1.6 }}>{q.options[answers[q.id]].sub}</p>
              )}
            </div>
          )}

          {/* SINGLE SELECT */}
          {q.type === "single" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Custom goal, shown first on goal question */}
              {q.id === "goal" && (
                <div style={{ marginBottom: 20 }}>
                  <input
                    value={answers.goal_custom || ""}
                    onChange={e => {
                      const val = e.target.value;
                      const next = { ...answersRef.current, goal_custom: val || undefined, goal: val.trim() ? (answersRef.current.goal ?? 0) : answersRef.current.goal };
                      answersRef.current = next;
                      setAnswers(next);
                    }}
                    onKeyDown={e => { if (e.key === "Enter" && answers.goal_custom?.trim()) { e.preventDefault(); go(1); } }}
                    placeholder="Describe your goal in your own words..."
                    style={{
                      width: "100%", padding: "16px 18px",
                      border: answers.goal_custom ? `1.5px solid ${T.purple}` : `1.5px solid ${T.border}`,
                      borderRadius: 0, fontFamily: T.sans, fontSize: 15,
                      color: T.black, outline: "none",
                      background: answers.goal_custom ? T.purpleL : "#fff",
                      lineHeight: 1.5, boxSizing: "border-box",
                    }}
                  />
                  <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, margin: "7px 0 0", lineHeight: 1.5, opacity: 0.8 }}>
                    The more specific you are, the more precisely every task gets built around what you're actually trying to do.
                  </p>
                  {answers.goal_custom?.trim() && (
                    <button onClick={() => go(1)}
                      style={{ marginTop: 10, background: T.purple, color: "#fff", border: "none", borderRadius: 0, padding: "12px 24px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      Continue →
                    </button>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 14px" }}>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>or pick the closest one</span>
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
                      textAlign: "left", padding: "16px 20px",
                      border: sel ? `1.5px solid ${T.purple}` : `1.5px solid ${T.border}`,
                      background: sel ? T.purpleL : "#fff",
                      borderRadius: 0, cursor: "pointer", transition: "all 0.12s", width: "100%",
                    }}>
                    <div style={{ fontFamily: T.sans, fontSize: 15, color: sel ? T.purpleD : T.black, fontWeight: sel ? 500 : 400, lineHeight: 1.4 }}>{opt.text}</div>
                  </button>
                );
              })}
              </div>

            </div>
          )}

          {/* MULTI SELECT , checkbox style matching screenshots */}
          {q.type === "multi" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {q.options.map((opt, i) => {
                const sel = (answers[q.id] || []).includes(i);
                return (
                  <button key={i} onClick={() => toggleMulti(q.id, i)}
                    style={{
                      textAlign: "left", padding: "16px 18px",
                      border: `1px solid ${T.border}`,
                      borderTop: i === 0 ? `1px solid ${T.border}` : "none",
                      borderRadius: i === 0 ? "10px 10px 0 0" : i === q.options.length - 1 ? "0 0 10px 10px" : 0,
                      background: sel ? T.purpleL : "#fff",
                      cursor: "pointer", transition: "background 0.1s", width: "100%",
                      display: "flex", alignItems: "center", gap: 14,
                    }}>
                    {/* Square checkbox */}
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: sel ? `none` : `1.5px solid #CCC`,
                      background: sel ? T.purple : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.12s",
                    }}>
                      {sel && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontFamily: T.sans, fontSize: 15, color: sel ? T.purpleD : T.black, fontWeight: sel ? 500 : 400, lineHeight: 1.4 }}>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* SLIDER */}
          {q.type === "slider" && (() => {
            const val = answers[q.id] ?? 50;
            const isLeft = val < 50; const isRight = val > 50;
            return (
              <div>
                <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                  {[{ data: q.left, active: isLeft, click: 25 }, { data: q.right, active: isRight, click: 75 }].map(({ data, active, click }, si) => (
                    <button key={si} onClick={() => setAnswers({ ...answers, [q.id]: click })}
                      style={{ flex: 1, textAlign: "left", padding: "20px 18px", background: active ? T.purpleL : "#fff", border: active ? `1.5px solid ${T.purple}` : `1.5px solid ${T.border}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? T.purpleD : T.black, margin: "0 0 4px", lineHeight: 1.3 }}>{data.text}</p>
                      <p style={{ fontFamily: T.sans, fontSize: 12, color: active ? T.purpleD : T.muted, margin: 0, lineHeight: 1.5, opacity: 0.85 }}>{data.desc}</p>
                    </button>
                  ))}
                </div>
                <div style={{ padding: "0 4px" }}>
                  <input type="range" min={0} max={100} value={val}
                    onChange={e => { let v = parseInt(e.target.value); if (v >= 42 && v <= 58) v = v < 50 ? 41 : 59; setAnswers({ ...answers, [q.id]: v }); }}
                    style={{ width: "100%", accentColor: T.purple, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 11, color: isLeft ? T.purpleD : "#CCC", fontWeight: isLeft ? 600 : 400 }}>Strongly</span>
                    <span style={{ fontFamily: T.sans, fontSize: 11, color: isRight ? T.purpleD : "#CCC", fontWeight: isRight ? 600 : 400 }}>Strongly</span>
                  </div>
                </div>
                {val === 50 && <p style={{ fontFamily: T.sans, fontSize: 13, color: T.purple, marginTop: 14, textAlign: "center" }}>Pick a side , you can't stay in the middle.</p>}
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
              background: canProceed() ? T.black : "#E8E8E8",
              color: canProceed() ? "#fff" : "#AAA",
              border: "none", fontFamily: T.sans, fontSize: 15, fontWeight: 500,
              padding: "14px 40px", borderRadius: 8,
              cursor: canProceed() ? "pointer" : "default", transition: "all 0.2s",
            }}>
            {current < questions.length - 1 ? "Continue" : "See my profile"}
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
    "AI is compressing your field faster than expected, and you want to know where you stand.",
    "You've watched peers advance while you've stayed flat, and you're ready to change that.",
    "A layoff or restructure changed things — you didn't choose this moment, but you're choosing what comes next.",
    "There's a review or promotion on the line, and you need something real to show for it.",
    "Nothing is broken exactly, but you've been drifting and want to move with intention.",
    "It's not the role — it's the field itself. You want a real change in direction.",
    "You're keen on exploring new opportunities and want a structured way to do it.",
    "There's no external pressure driving this — you're here because you decided to be.",
  ];
  if (answers.urgency !== undefined && urgencySentences[answers.urgency]) {
    bullets.push(urgencySentences[answers.urgency]);
  }

  // ── 3. What gets in the way ──
  const blockerSentences = {
    0: "Your days are already full — time is the real constraint, not motivation.",
    1: "There's too much information and not enough clarity on where to start.",
    2: "You've started things before but lost the thread — follow-through has been the gap.",
    3: "You learn plenty, but applying it to actual work is where things stall.",
    4: "Too many possible directions, or none that feel right — you need a filter, not more options.",
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

function ResultsScreen({ plan, onRestart, onDashboard }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const n = plan.narrative;
  const displayExposure = plan.aiExposureCommentary || null;
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const tagColors = {
    "Apply":   { bg: "#F0F7F2", text: "#3A6B50", border: "#BDD9C8" },
    "Reflect": { bg: "#F5EFEB", text: "#7A3D2E", border: "#C9A090" },
    "Read":    { bg: "#EEF2FB", text: "#3B55A0", border: "#BACAE8" },
    "Tool":    { bg: "#EDF7F6", text: "#1A6B62", border: "#9ACFC9" },
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
    <div style={{ background: "#fff", opacity: visible ? 1 : 0, transition: "opacity 0.5s" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(24px, 5vw, 52px) clamp(16px, 4vw, 24px) 80px" }}>

        {/* ── PROFILE BADGE ── */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-block", width: "100%", maxWidth: 400, padding: "26px 26px 22px", background: T.purpleL, border: `1.5px solid ${T.purpleMid}`, borderRadius: 14, boxShadow: T.shadow }}>
            {plan.name && (
              <p style={{ fontFamily: T.serif, fontSize: "clamp(26px, 4.5vw, 34px)", fontWeight: 400, color: T.black, margin: "0 0 4px", lineHeight: 1.15, letterSpacing: -0.3 }}>{plan.name.trim()}</p>
            )}
            <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: T.purple, margin: 0 }}>your profile</p>
          </div>
        </div>

        {/* ── WHY THIS PROGRAM + WEEK ARC ── */}
        {/* ── PERSONALISED TRAITS ── */}
        {(() => {
          const bullets = generatePersonalisedBullets(plan);
          if (!bullets.length) return null;
          return (
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 28, boxShadow: T.shadow }}>
              <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.purple, margin: "0 0 16px" }}>What your answers tell us</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {bullets.map((b, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{
                      flexShrink: 0, marginTop: 4,
                      width: 6, height: 6, borderRadius: "50%",
                      background: T.purple, display: "inline-block",
                    }} />
                    <span style={{ fontFamily: T.sans, fontSize: 15, color: T.ink, lineHeight: 1.7 }}>{b}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "18px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>
                Your program has been adapted accordingly.
              </p>
            </div>
          );
        })()}

        {/* ── WHY THIS PROGRAM — API-generated week arc only ── */}
        {(() => {
          const arc = plan.weekArc || {};
          // Only show if the API successfully generated all three sentences
          if (!arc.a1 || !arc.a2 || !arc.a3) return null;

          const goalTexts = GOAL_TEXTS;
          const goalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];

          return (
            <div style={{ marginBottom: 28, background: "#fff", borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: T.shadow }}>
              <div style={{ padding: "18px 20px", background: T.purpleL, borderBottom: `1px solid ${T.purpleMid}50` }}>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.purple, margin: "0 0 8px" }}>Why this program</p>
                {goalText && <p style={{ fontFamily: T.serif, fontSize: 17, color: T.purpleD, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>{goalText}</p>}
              </div>
              <div style={{ padding: "4px 20px 8px", display: "flex", flexDirection: "column" }}>
                {[
                  { label: "Week 1", text: arc.a1 },
                  { label: "Week 2", text: arc.a2 },
                  { label: "Week 3", text: arc.a3 },
                ].map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "13px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ minWidth: 52, flexShrink: 0 }}>
                      <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.purple, display: "block", paddingTop: 2 }}>{w.label}</span>
                    </div>
                    <p style={{ fontFamily: T.sans, fontSize: 15, color: T.ink, margin: 0, lineHeight: 1.55 }}>{w.text}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── EMAIL CTA ── */}
        <div style={{ background: T.grad, borderRadius: 12, padding: "32px 28px", textAlign: "center", marginBottom: 28 }}>
          {!submitted ? (
            <>
              <h2 style={{ fontFamily: T.serif, fontSize: "clamp(20px,3.5vw,26px)", fontWeight: 400, color: "#fff", margin: "0 0 10px", lineHeight: 1.25, letterSpacing: -0.3 }}>
                {plan.name ? `${plan.name}, your Week 1 is ready.` : "Your Week 1 is ready."}
              </h2>
              <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "0 0 20px", lineHeight: 1.65 }}>
                Built from your profile. Adapts as you go.
              </p>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", maxWidth: 400, margin: "0 auto 10px" }}>
                <input type="email" placeholder="Enter your email to get started" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSubmitted(true); setTimeout(() => onDashboard && onDashboard(Date.now()), 400); } }}
                  style={{ flex: 1, padding: "14px 16px", border: "none", fontFamily: T.sans, fontSize: 14, outline: "none", background: "#1E1E2E", color: "#fff", minWidth: 0 }} />
                {(() => {
                  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                  return (
                    <button
                      disabled={!valid}
                      onClick={() => { if (valid) { setSubmitted(true); setTimeout(() => onDashboard && onDashboard(Date.now()), 400); } }}
                      style={{
                        background: valid ? T.purple : "rgba(124,111,159,0.25)",
                        color: valid ? "#fff" : "rgba(255,255,255,0.3)",
                        border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600,
                        padding: "14px 20px", cursor: valid ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap", transition: "all 0.2s",
                      }}>
                      Start Week 1 →
                    </button>
                  );
                })()}
              </div>
              <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>Free · No card required</p>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontFamily: T.serif, fontSize: 18, color: "#fff", margin: 0, fontWeight: 400 }}>Taking you to Week 1...</p>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: "center" }}>
          <button onClick={onRestart} style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.muted, cursor: "pointer", textDecoration: "underline" }}>
            Retake the quiz
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
    isFrustrated, isAnxietyDriven, isCredibilityDefender,
    hasTheoryGap, isHighCommitmentBeginner, isPureNavigator,
    isExternallyMotivated, isInternallyMotivated,
    isActionOriented, isUnderstandingOriented,
  } = classification;

  // Build a plain-English description of the active pattern flags
  const activePatterns = [
    isFrustrated           && "Frustrated: has tried multiple approaches (newsletters, courses, tools) but nothing has clicked , needs structurally different, not more content",
    isAnxietyDriven        && "Anxiety-driven: feeling outpaced by younger people, goal is to feel confident , motivation is emotional, not strategic",
    isCredibilityDefender  && "Credibility defender: senior professional, primary fear is erosion of professional credibility built over years",
    hasTheoryGap           && "Theory-practice gap: consumes content (courses, newsletters) but blocker is that learning doesn't convert to actual work practice",
    isHighCommitmentBeginner && "Motivated beginner: hasn't started yet but genuinely wants to move. Has the intent, needs the direction and a concrete first step",
    isPureNavigator        && "Pure navigator: wants to understand what's changing well enough to make decisions for others (team/business)  - strategic clarity problem, not a personal fluency problem",
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
  const promptWithAudit = `You are generating exactly ONE personalized career development task (Day 1) for a specific professional. They described their actual work  - reference it directly and specifically.

═══ THEIR CAREER SITUATION ═══

What they're looking to change: ${ctx.urgency || "not specified"}
Biggest concern: "${ctx.concern}"
Goal in 12 months: "${ctx.goal}"
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

═══ TEMPLATE TASKS (role/level-specific baseline  - rewrite to be far more specific) ═══

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

"context"  - 1 sentence. Name their career situation and something specific from their concern or goal. The "you said..." opener that makes them feel seen before the task starts.

"desc": 2-3 sentences. Name the specific action. Concrete  - if less experienced, say exactly what to do; if senior, give the advanced move. Write in the profile's ${profileCopy.voice} voice and ${profileCopy.pacing} pacing.

"steps"  - 2-3 steps for 15-min tasks, 3-4 steps for 30-min tasks, 4-5 steps for 45-60-min tasks. Match step count to the time budget. Each step is a single action with a clear stopping point, never multiple sub-actions or open-ended exploration.

"whyBase": 1-2 sentences. Connect to their ultimate motivation: "${ctx.ultimate_why}". Use their actual words. One real, specific payoff  - not generic.

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

HARD RULE: no AI tool tasks: Do not generate tasks about using ChatGPT, Claude, Copilot, or any AI tool. Do not suggest "test this with AI", "use AI to draft", or any AI-first action. The program is career development, not an AI literacy course. If a person is AI-fluent, that means their tasks should be more strategically advanced  - not more AI-focused.

${activePatterns.length > 0 ? `
Critical: this person has active psychological patterns. Every task must account for them:
${activePatterns.map(p => "• " + p).join("\n")}
` : ""}

Also generate an "outcomes" array: exactly 3 sentences describing what is concretely different after completing Week 1.
• Each names a specific observable change, not a feeling
• Reference their goal ("${ctx.goal}") and concern ("${ctx.concern}") directly
• Format: "You have X", "You know Y", "You've done Z"
• One per dimension: (1) concrete output built, (2) clarity gained, (3) habit or behavior started

Also generate a "change_commentary" field: 2-3 sentences about which of their actual work tasks is most exposed to disruption and which is most defensible  - and why. Reference their actual tasks by name.

Respond with ONLY valid JSON, no preamble, no markdown fences:

{"tasks":[{"tag":"Apply|Read|Reflect","time":"30 min","title":"...","context":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}],"outcomes":["...","...","..."],"change_commentary":"..."}`;

  // ── Prompt: no-audit path ─────────────────────────────────
  const promptNoAudit = `You are generating exactly ONE personalized career development task for Day 1. Make it the most relevant, specific, actionable 30-minute task possible for this person.

═══ THEIR CAREER SITUATION ═══

What they're looking to change: ${ctx.urgency || "not specified"}
Biggest concern: "${ctx.concern}"
Goal in 12 months: "${ctx.goal}"
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

═══ TEMPLATE TASKS (role/level-specific baseline  - rewrite to be far more specific) ═══

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

"context"  - 1 sentence. Name their career situation and something specific from their concern or goal. The opener that makes them feel seen.

"desc"  - 2-3 sentences. Name the specific action. Concrete  - if less experienced, say exactly what to do; if senior, give the advanced move. Write in the profile's ${profileCopy.voice} voice and ${profileCopy.pacing} pacing.

"steps"  - 2-3 steps for 15-min tasks, 3-4 steps for 30-min tasks, 4-5 steps for 45-60-min tasks. Match step count to the time budget. Each step is a single concrete action with a clear stopping point.

"whyBase"  - 1-2 sentences. Connect to their ultimate motivation: "${ctx.ultimate_why}". Use their actual words. One real, specific payoff  - not generic.

Every task must also:
• Feel written for a ${ctx.seniority} ${ctx.role} specifically  - not generic career advice
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

HARD RULE  - no AI tool tasks: Do not generate tasks about using ChatGPT, Claude, Copilot, or any AI tool. Do not suggest "test this with AI", "use AI to draft", or any AI-first action. The program is career development, not an AI literacy course. If a person is AI-fluent, that means their tasks should be more strategically advanced  - not more AI-focused.

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
        model: "claude-sonnet-4-20250514",
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
    const text = (data.content || []).map(b => b.text || "").join("");
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
// Called in GeneratingScreen alongside generateAITasks  - baked into plan object.
async function generateWeekArc(answers, classification) {
  const cl = classification || {};
  const roleNames    = ROLE_NAMES;
  const goalTexts    = GOAL_TEXTS;
  const urgTexts     = URG_TEXTS;
  const blockerTexts = BLOCKER_TEXTS;
  const goalDetailText = answers.goal_detail !== undefined && GOAL_DETAIL_QUESTIONS?.[answers.goal]
    ? GOAL_DETAIL_QUESTIONS[answers.goal].options[answers.goal_detail]?.text || ""
    : "";

  const prompt = `You are building a personalized 8-week career development arc. Generate two things:

FIRST (most important): Write 3 "ability sentences" — what this person will be able to do after each of the first 3 weeks.
THEN: Generate 8 short week theme labels.

PERSON:
Profile: ${cl.profileName || "professional"}
Orientation: ${cl.orientation || "balanced"} (optimizer=growth · protector=defend · navigator=lead)
Readiness: ${cl.readinessLevel || "medium"}
Role: ${(lk(roleNames, answers.role) || "professional") + (answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : "")}
Seniority: ${SENIORITY_TEXTS[answers.seniority] || "mid-career"}
Action vs. understanding: ${answers.style_outcome_process != null ? (answers.style_outcome_process < 30 ? "strongly action-oriented" : answers.style_outcome_process < 50 ? "action-leaning" : answers.style_outcome_process > 70 ? "strongly understanding-oriented" : "understanding-leaning") : "balanced"}
What's making this feel urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}${goalDetailText ? `, specifically: ${goalDetailText}` : ""}${answers.goal_direction ? `\nTarget direction: ${answers.goal_direction}` : ""}
Main blocker: ${( normalizeBlocker(answers.blocker).map(b => blockerTexts[b]).filter(Boolean).join("; ") || "something gets in the way")}

ABILITY SENTENCES (a1, a2, a3) — REQUIRED, generate these first:
- a1: After Week 1, what can they do? One sentence, 15-20 words.
- a2: After Week 2, what can they do? One sentence, 15-20 words.
- a3: After Week 3, what can they do? One sentence, 15-20 words.
- Written directly to them: "You'll have...", "You'll know...", "You'll be able to..."
- Tangible, specific to their role and goal. Not generic.

WEEK THEMES (w1 through w8):
- 4-7 words each. Specific to their goal and role.
- Week 1: first move from where they are now.
- Week 2: deepen week 1's foundation.
- Week 3: produce something concrete toward the goal.
- Week 4-5: consolidation, go deeper on what worked.
- Week 6: direct work on the 12-month goal (name it explicitly).
- Week 7: make the work visible. Test against reality.
- Week 8: habit locked in. What they leave with.
- No AI references. Second person implied.

Return ONLY valid JSON. a1/a2/a3 MUST be included:
{"a1":"...","a2":"...","a3":"...","w1":"...","w2":"...","w3":"...","w4":"...","w5":"...","w6":"...","w7":"...","w8":"..."}`;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Week arc HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
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
function GeneratingScreen({ answers, auditTasks, onComplete, onBack }) {
  const [dots, setDots] = useState("");
  const [phase, setPhase] = useState(0);
  const [failed, setFailed] = useState(false);
  const hasAudit = (auditTasks || []).filter(t => t && t.trim().length > 3).length > 0;
  const phases = hasAudit
    ? ["Reading your answers", "Analyzing your work tasks", "Building your personalized program"]
    : ["Reading your answers", "Mapping your profile", "Building your personalized program"];

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
          arcResult = await generateWeekArc(answers, cls);
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
          <p style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 400, color: T.black, margin: "0 0 8px" }}>Something went wrong.</p>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: "0 0 28px", lineHeight: 1.6 }}>We could not build your plan. Check your connection and try again.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
            <button onClick={() => { hasRetriedRef.current = false; setRetryCount(0); run(); }}
              style={{ background: T.black, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "13px 28px", borderRadius: 10, cursor: "pointer" }}>
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 32px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2.5px solid ${T.border}`, borderTopColor: T.purple, margin: "0 auto 32px", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } @keyframes firePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } } @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }`}</style>
        <p style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 400, color: T.black, margin: "0 0 8px", letterSpacing: -0.2 }}>{phases[phase]}{dots}</p>
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
    ? (answers.style_outcome_process < 30 ? "strongly action-oriented — skip context, give the move"
      : answers.style_outcome_process < 50 ? "action-leaning — prefers doing over reading"
      : answers.style_outcome_process > 70 ? "strongly context-oriented — needs to understand before acting"
      : "context-leaning — wants enough landscape to act with confidence") : "balanced";

  // Week 1 theme from arc
  const arc = plan.weekArc || {};
  const week1Theme = arc.w1 || "Build your baseline";

  const prompt = `Generate exactly 6 personalized career development tasks for Days 2 through 7 of this person's program. Day 1 is already done  - build forward from it.

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
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}${goalStatementText ? `\nNora-refined goal statement: "${goalStatementText}"` : ""}

═══ THIS WEEK ═══
Week 1 focus: "${week1Theme}"

═══ DAY 1 (already done) ═══
"${day1Task?.title || "Day 1 task"}" [${day1Task?.tag || "Apply"}]

═══ RULES ═══
- CRITICAL: Every task must serve BOTH the 12-month goal AND the Week 1 focus ("${week1Theme}"). If a task doesn't clearly connect to both, rethink it.
- What they're looking to change ("${lk(urgTexts, answers.urgency)}") must shape what the tasks are fundamentally about.
- Each task is a standalone 30-minute career development action
- Build progressively  - each day deepens or extends the previous
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Week plan gen HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
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
async function generateWeekBatch(plan, weekNum, startDay, dayTasks, dayStatus, dayNotes, noraInsight) {
  const answers = plan._answers || {};
  const cl = plan.classification || {};

  const roleNames    = ROLE_NAMES;
  const goalTexts    = GOAL_TEXTS;
  const urgTexts     = URG_TEXTS;

  const arc = plan.weekArc || {};
  const weekThemes = [arc.w1, arc.w2, arc.w3, arc.w4, arc.w5, arc.w6, arc.w7, arc.w8];
  const weekTheme = weekThemes[weekNum - 1] || "Keep building";

  // Goal: use Nora-refined goal statement if available, otherwise quiz goal
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
  const lastWeekSignal = prevWeekDone >= 6 ? "strong week — go deeper, increase challenge"
    : prevWeekDone >= 4 ? "solid week — maintain pace, build on what worked"
    : prevWeekDone >= 2 ? "patchy week — start lighter this week, rebuild momentum"
    : "very difficult week — open with the easiest possible task, reduce friction significantly";

  // Full 8-week arc (original plan) so the model sees the journey
  const allThemes = [arc.w1, arc.w2, arc.w3, arc.w4, arc.w5, arc.w6, arc.w7, arc.w8].map((t, i) => `Week ${i+1}: "${t || 'TBD'}"`).join("\n");

  const endDay2 = startDay + 6;
  const prompt = `Generate exactly 7 personalized career development tasks for Days ${startDay} through ${endDay2} (Week ${weekNum}).

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
12-month goal: "${effectiveGoal}"${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}
${noraInsight ? `\n═══ NORA COACHING CONTEXT ═══\nNora (the person's AI coach) observed the following from recent conversations. Use this to shape tasks — it reflects what the person actually said, not just what they picked in a quiz. If Nora's observations suggest a different direction, skill focus, or priority than the original plan, FOLLOW NORA's insight — it's more current than the quiz:\n${noraInsight}\n` : ""}
═══ ORIGINALLY PLANNED ARC ═══
${allThemes}

The originally planned theme for Week ${weekNum} is: "${weekTheme}"

═══ THEME ADAPTATION INSTRUCTIONS ═══
Evaluate whether "${weekTheme}" is still the right focus for Week ${weekNum}. Consider:
- Did last week's performance reveal something the original plan didn't anticipate?
- Did the person's notes or Nora conversations surface a more pressing priority?
- Is the person ahead of schedule (could skip to a harder theme) or behind (needs a consolidation week)?
- Has their goal shifted or become more specific through Nora conversations?

If the original theme still fits, keep it. If something better serves the person right now, write a new 4-7 word theme that:
- Connects to their 12-month goal
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
- CRITICAL: The 12-month goal ("${effectiveGoal}") must be the through-line — every task should visibly advance toward it.${goalDetailText ? ` The specific angle is: "${goalDetailText}".` : ""}${goalDirection ? ` They're targeting: "${goalDirection}".` : ""}
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
- Tasks should vary in type — mix of Apply, Read, Reflect
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 3500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Week batch gen HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
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
// DASHBOARD  - Week 1 preview, Noom/Duolingo behavioral model
// ═══════════════════════════════════════════════════════════
// ─── Next-Day Task Generator ──────────────────────────────
// Called after each day completes. Generates Day N+1 task via API.
// Key design: minimal explicit reflection (one optional sentence),
// maximum backend adaptation (performance signal + note → AI prompt).
async function generateNextDayTask(plan, dayNum, status, note, noraInsight, dayTasks, dayStatus, dayNotes) {
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

  // Lookup tables  - full quiz answer text
  const roleNames     = ROLE_NAMES;
  const goalTexts     = GOAL_TEXTS;
  const urgTexts      = URG_TEXTS;
  const blockerTexts  = BLOCKER_TEXTS;
  const seniorityTexts = SENIORITY_TEXTS;

  const stylePref = answers.style_outcome_process != null
    ? (answers.style_outcome_process < 30 ? "strongly action-oriented  - skip context, give the move"
      : answers.style_outcome_process < 50 ? "action-leaning  - prefers doing over reading"
      : answers.style_outcome_process > 70 ? "strongly context-oriented  - needs to understand before acting"
      : "context-leaning  - wants enough landscape to act with confidence") : "balanced";

  // Full previous-day history
  const dayHistory = Array.from({ length: dayNum }, (_, i) => i + 1).map(d => {
    const ds = (dayStatus || {})[d];
    const dn = (dayNotes  || {})[d] || "";
    const dt = (dayTasks  || {})[d];
    const tl = dt ? `"${dt.title}" [${dt.tag}]` : "(not loaded)";
    return `Day ${d}: ${ds === 'done' ? 'DONE' : ds === 'skipped' ? 'SKIPPED' : 'PENDING'} | Task: ${tl}${dn ? ` | Note: "${dn}"` : ""}`;
  }).join("\n");

  const timePref = "30 min";

  const perfSignal = dayNum === 0
    ? "This is Day 1. Generate the best possible first task for this person — specific to their role, goal, and profile."
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
      cl.isFrustrated           && "Frustrated: has tried multiple approaches but nothing clicked",
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

  const prompt = `Generate exactly ONE personalized 30-minute career development task for Day ${dayNum + 1} of this person's program.

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
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward on something that matters"}${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}${goalStatementText ? `\nNora-refined goal statement: "${goalStatementText}"` : ""}

═══ THIS WEEK ═══
Week ${thisWeekNum} focus: "${thisWeekTheme}"
${noraInsight ? `\n═══ NORA COACHING INSIGHTS ═══\nIf Nora adjusted the goal or identified a priority shift, follow that direction — it's more current than the quiz.\n${noraInsight}\n` : ""}
═══ WEEK HISTORY ═══
${dayHistory || "No previous days yet."}

═══ TODAY'S SIGNAL ═══
${perfSignal}
${day1Context}
═══ RULES ═══
- One 30-minute task only. Concrete. Doable in a single sitting.
- CRITICAL: Every task must serve BOTH the 12-month goal AND this week's focus ("${thisWeekTheme}"). If the task doesn't clearly connect to both, rethink it.
- Career development actions: positioning, skills, visibility, decisions, relationships.
- HARD RULE: NO AI tool tasks (no ChatGPT, Claude, Copilot, AI drafting).
- If today was skipped: make tomorrow smaller and lower-friction.
- If today was done and note shows difficulty: adjust scope down.
- If today was done and note shows ease or momentum: go one level deeper.
- Build on previous days  - don't repeat any task already in the history above.
- Second person. Active voice. Short sentences. No em dashes. No generic motivational language.
- NEVER include specific years, months, quarters, or dates. Use "currently", "now", "emerging", "increasingly" instead.

Return ONLY valid JSON, no markdown:
{"tag":"Apply|Read|Reflect","time":"30 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}`;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.error("Next day task gen HTTP error:", res.status); return null; }
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
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
  const bg = tagBg || T.cream;
  const accent = tagAccent || T.purple;
  return (
    <div style={{ background: bg, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
      {steps.map((step, si) => (
        <div key={si} onClick={() => { const next = { ...checked, [si]: !checked[si] }; setChecked(next); onCheckedChange && onCheckedChange(next); }}
          style={{ display: "flex", gap: 10, marginBottom: si < steps.length - 1 ? 10 : 0, alignItems: "flex-start", cursor: "pointer" }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked[si] ? accent : T.purpleMid}`,
            background: checked[si] ? accent : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1, transition: "all 0.15s",
          }}>
            {checked[si] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: checked[si] ? T.muted : T.ink, margin: 0, lineHeight: 1.65, textDecoration: checked[si] ? "line-through" : "none", transition: "all 0.15s" }}>{step}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Nora Chat Modal ──────────────────────────────────────
// Conversational AI that knows the user's full profile and
// extracts insights to feed forward into task generation.
function NoraChatModal({ plan, onClose, onInsight, dayTasks, dayStatus, dayNotes, currentWeekTheme, weekGoalOverride, weekFocusInput, goalStatement, momentumScore, momentumLabel, noraSessionLog, currentDay, isGoalClarification }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const answers = plan._answers || {};
  const cl = plan.classification || {};

  const goalTexts = GOAL_TEXTS;
  const goalText = (answers.goal_custom || goalTexts[answers.goal]) || "move forward on something that matters";
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

  const systemPrompt = `You are Nora, a thoughtful and warm career thinking partner inside Second Act. You genuinely care about this person's progress. You remember what they've said before and gently bring it up when it matters, not to catch them out, but because you're paying attention and you want to help them stay honest with themselves.

═══ WHO THIS PERSON IS (from their quiz) ═══
- First name: ${(answers.name || "").trim() || "not given"}
- Role: ${roleName}${answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : ""}
- Seniority: ${["Early career, building foundations","Established, capable and growing","Senior, domain expert, leading or influencing others","Leadership, running a team or function","Executive, setting direction"][answers.seniority] || "not specified"}
- What's making this feel urgent: ${["AI is changing my field faster than I can keep up","Watched people around me advance while I stayed flat","A layoff or restructure changed things","A review or promotion is on the line","Been drifting, want to stop before it gets harder","Not the role, the field itself — wants out","Keen on exploring new opportunities","None of the above"][answers.urgency] || "not specified"}
- Main blockers: ${normalizeBlocker(answers.blocker).map(b => ["Not enough time","Too much information, don't know where to start","I start but don't follow through","I learn things but don't apply them","Direction paralysis"][b]).filter(Boolean).join("; ") || "not specified"}
- Action vs. understanding: ${answers.style_outcome_process != null ? (answers.style_outcome_process < 30 ? "strongly action-oriented — skip context, give the move" : answers.style_outcome_process < 50 ? "action-leaning" : answers.style_outcome_process > 70 ? "strongly understanding-oriented — needs to see the full picture first" : "leans toward understanding") : "balanced"}

═══ THE PERSON'S COMMITMENTS ═══
- 12-month goal: "${goalText}"${goalDetailText2 ? ` (${goalDetailText2})` : ""}${goalDirection ? `, targeting: ${goalDirection}` : ""}
- Current week focus: "${currentWeekTheme || "building momentum"}"
${goalStatement ? `- Program goal statement: "${goalStatement}"` : ""}
${personWords.length ? `\nTHEIR OWN WORDS (notes they've written, goals they've set):\n${personWords.join("\n")}\n\nThese are things they chose to write down. Use them with care. If what they're saying now doesn't line up with what they wrote before, bring it up gently, not as a gotcha, but as a genuine question. "I noticed you wrote X last week. Does that still feel right, or has something shifted?" This is the value you provide that a journal can't, you remember, and you care enough to ask.` : ""}

═══ WHAT THEY'VE DONE ═══
${(() => {
  const completed = Object.entries(dayStatus || {}).filter(([,s]) => s === 'done');
  const skipped = Object.entries(dayStatus || {}).filter(([,s]) => s === 'skipped');
  if (completed.length === 0 && skipped.length === 0) return "No days completed yet.";
  const lines = completed.map(([dayNum]) => {
    const task = dayTasks?.[dayNum];
    const note = dayNotes?.[dayNum];
    return task ? "Day " + dayNum + " ✓: \"" + task.title + "\" [" + task.tag + "]" + (note ? ", note: \"" + note + "\"" : "") : "Day " + dayNum + ": done";
  });
  skipped.forEach(([dayNum]) => { lines.push(`Day ${dayNum} ✗: SKIPPED`); });
  return lines.join("\n");
})()}

═══ WHERE THEY ARE RIGHT NOW ═══
They are currently on Day ${currentDay} of 56.
${(() => {
  const todayTask = dayTasks?.[currentDay];
  const prevDay = currentDay - 1;
  const prevStatus = prevDay > 0 ? (dayStatus?.[prevDay] || "not started") : null;
  const prevTask = prevDay > 0 ? dayTasks?.[prevDay] : null;
  const lines = [];
  if (todayTask) {
    lines.push("Today's task (Day " + currentDay + "): \"" + todayTask.title + "\" [" + todayTask.tag + "] — not yet completed.");
    if (todayTask.desc) lines.push("Task description: " + todayTask.desc);
    if (todayTask.steps?.length) lines.push("Steps: " + todayTask.steps.map((s, i) => (i + 1) + ". " + s).join(" | "));
    if (todayTask.whyBase) lines.push("Why this task matters: " + todayTask.whyBase);
  } else {
    lines.push("Today's task (Day " + currentDay + "): not yet generated.");
  }
  if (prevDay > 0 && prevStatus === "done" && prevTask) lines.push("IMPORTANT: They completed Day " + prevDay + " (\"" + prevTask.title + "\") — this is confirmed, do NOT say they haven't done it.");
  else if (prevDay > 0 && prevStatus === "skipped") lines.push("Day " + prevDay + " was skipped.");
  else if (prevDay > 0) lines.push("Day " + prevDay + " is pending.");
  return lines.join("\n");
})()}

═══ WHAT YOU KNOW ABOUT THEM ═══
- Name: ${(answers.name || "").trim() || "not given"} (use their name naturally, but not in every message)
- Profile: ${plan.profileName}
- Role: ${roleName}
- Momentum score: ${momentumScore ?? "not yet"}/100 (${momentumLabel ?? "early days"})
- Orientation: ${cl.orientation || "balanced"}
- Readiness: ${cl.readinessLevel || "medium"}
- Frustrated pattern: ${cl.isFrustrated ? "yes, they've tried things before and nothing stuck" : "no"}
- Theory-practice gap: ${cl.hasTheoryGap ? "yes, they learn but don't apply" : "no"}
${noraSessionLog?.length ? `
═══ PAST CONVERSATIONS WITH THEM ═══
${noraSessionLog.map((s, i) => `Session ${i + 1} (Day ${s.dayNum}): ${s.summary}${s.changes?.length ? ` Changes made: ${s.changes.join(", ")}.` : ""}`).join("\n")}

This is your memory. Use it naturally and with kindness:
- If they said they'd do something last session, check in warmly: "You mentioned wanting to [X] last time. How did that go?"
- If they changed their goal before and seem to be drifting again, name it gently: "I've noticed we've shifted direction a few times. I want to make sure the program is pointed at the right thing for you."
- If they raised a blocker last time, follow up with care: "Last time you mentioned [X] was getting in the way. Is that still the case?"
- Don't recap this history to them. Just let it inform how you respond.` : ""}

═══ YOUR CORE JOB: HONEST, KIND ACCOUNTABILITY ═══

You are the accountability layer a paper journal can't provide. Your value is connecting what they said yesterday to what they're doing today, and doing it with genuine warmth. You're on their side. You notice things because you care, not because you're keeping score.

1. GOAL ALIGNMENT: If their weekly focus and their actions don't match, raise it as a question, not a verdict. "Your week focus is [X], but it looks like you've been spending time on [Y]. I wonder if the focus needs updating, or if there's something about [X] that feels harder to start?"

2. COMMITMENT TRACKING: If they wrote a note about something they wanted to do and haven't yet, bring it up gently. "You wrote a note about wanting to [X]. That seemed important to you. Is it still on your mind?"

3. NOTICING CONTRADICTIONS: If what they're saying now doesn't match something from before, name it with curiosity, not judgment. "A couple sessions ago you mentioned [Z] was the priority. Today it sounds like [W] is pulling your attention. I want to make sure we're building toward the right thing, which one matters more right now?"

4. PATTERN NOTICING: If you see a pattern (repeated skipping, frequent goal changes, avoiding certain task types), name it honestly but kindly. "I've noticed the Reflect tasks tend to get skipped. No judgment, but I'm curious if there's something about those that doesn't land for you."

5. HELPING SHARPEN GOALS: If they suggest a weekly focus or goal that's vague or not well connected to their 12-month target, help them make it stronger instead of just accepting it. "That's a starting point. Can we make it more specific? What would it look like if you really nailed that this week?" Or: "How does that connect to your bigger goal of [X]?"

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

POST-CONVERSATION TASK REVIEW: Before writing NORA_DONE, evaluate whether anything discussed should change their program. If their goals shifted, their weekly focus no longer fits, or tomorrow's task doesn't match what came up, include the relevant CMD (see PROGRAM CHANGES below). After any CMD, confirm the change naturally in your closing: "I've adjusted tomorrow's task based on what we talked about" or "I've updated your weekly focus to reflect where your head is now."

═══ PROGRAM CHANGES ═══
Execute immediately when the person asks, OR when the conversation reveals their program needs reshaping. Include the command on its own line:
- Replace TODAY's task: CMD:REPLACE_TODAY_TASK:concise description
- Replace a specific day's task: CMD:REPLACE_DAY:N:concise description (N = day number, only for unlocked days not yet completed)
- Different task tomorrow: CMD:REQUEST_TASK:concise description
- Change weekly focus: CMD:WEEK_GOAL:4-7 word theme (help them sharpen it first if it's vague)
- Change overall goal (pick from list): present 5 options, confirm, then CMD:CHANGE_GOAL:N (N=0-4). Goals: 0=Get a promotion or level-up role, 1=Move to a better company, 2=Pivot into a new field, 3=Build skills to stay relevant as AI reshapes work, 4=Feel genuinely solid and confident
- Set a specific custom goal: CMD:CHANGE_GOAL_CUSTOM:their goal in their words
- Rebuild the entire current week: CMD:REBUILD_WEEK (when goal or direction has significantly shifted)
- Slower pace: CMD:SLOW_DOWN

WHEN TO PROACTIVELY SUGGEST CHANGES: Don't wait to be asked. If the conversation reveals their actual goal is different from the program, say so and offer to update. If their weekly focus doesn't match their actions, propose a change. If their 12-month target is more specific than what they picked, use CMD:CHANGE_GOAL_CUSTOM. If a task isn't working, replace it immediately.

If they want to make a change that doesn't quite add up, gently check in first: "Just want to make sure, last time you said [X] was the priority. If we shift to [Y], we'd be moving away from that. Does that feel right to you?"

Commands are parsed silently, confirm the change in natural language but don't reference the command syntax.

${isGoalClarification
  ? `GOAL CLARIFICATION SESSION: This is their first time on the dashboard. Your job is to make sure the program is built around what they actually want, not just what they picked in the quiz. Open warmly by acknowledging their quiz goal ("You said you want to [goal]") and asking one thoughtful question that probes whether that's the real thing, what's actually driving it, what specifically they're trying to change, or what they'd want to look back on in 12 months. If what they say is more specific or different from their quiz answer, use CMD:CHANGE_GOAL_CUSTOM or CMD:CHANGE_GOAL to update it immediately. If their goal is confirmed, end by noting the program is well-aligned and wish them well with Day 1. Keep it tight, 3-4 exchanges, not an intake interview.`
  : needsDirectionQ
  ? "They want to move into a different field or start something of their own but haven't said where. Open with a warm, curious question asking what direction they're considering."
  : "Open with a single specific question that shows you've been paying attention. Good openers: reference something they wrote in a day note, gently ask about a skipped task, check whether their weekly focus still feels right, or ask what's on their mind today. Don't open with a generic 'how are things going'."}`;

  // Kick off with Nora's opening question
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
        const text = (data.content || []).map(b => b.text || "").join("").replace("NORA_DONE", "").trim();
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
      const raw = (data.content || []).map(b => b.text || "").join("");
      const isDone = raw.includes("NORA_DONE") || isLast;
      const cleanText = raw.replace("NORA_DONE", "").replace(/CMD:[^\n]*/g, '').replace(/\n{2,}/g, '\n').trim();
      setMessages(prev => [...prev, { role: "assistant", content: cleanText }]);

      // Parse and execute CMDs immediately on any message
      if (raw.match(/CMD:REPLACE_DAY:(\d+):(.+)/)) {
        const m = raw.match(/CMD:REPLACE_DAY:(\d+):(.+)/);
        const dayNum = parseInt(m[1]);
        const taskReq = m[2].split('\n')[0].trim();
        onInsight && onInsight(cleanText, { replaceDayN: dayNum, replaceDayTask: taskReq });
      }
      if (raw.match(/CMD:CHANGE_GOAL_CUSTOM:(.+)/)) {
        const customGoal = raw.match(/CMD:CHANGE_GOAL_CUSTOM:(.+)/)[1].split('\n')[0].trim();
        onInsight && onInsight(cleanText, { changeGoalCustom: customGoal });
      }
      if (raw.includes('CMD:REBUILD_WEEK')) {
        onInsight && onInsight(cleanText, { rebuildWeek: true });
      }
      if (raw.includes('CMD:SLOW_DOWN')) {
        onInsight && onInsight(cleanText, { slowDown: true });
      }
      if (raw.match(/CMD:CHANGE_GOAL:(\d)/)) {
        const goalNum = parseInt(raw.match(/CMD:CHANGE_GOAL:(\d)/)[1]);
        onInsight && onInsight(cleanText, { changeGoal: goalNum });
      }
      if (raw.match(/CMD:WEEK_GOAL:(.+)/)) {
        const newGoal = raw.match(/CMD:WEEK_GOAL:(.+)/)[1].split('\n')[0].trim();
        onInsight && onInsight(cleanText, { weekGoal: newGoal });
      }
      if (raw.match(/CMD:REPLACE_TODAY_TASK:(.+)/)) {
        const taskReq = raw.match(/CMD:REPLACE_TODAY_TASK:(.+)/)[1].split('\n')[0].trim();
        onInsight && onInsight(cleanText, { replaceTodayTask: taskReq });
      }
      if (raw.match(/CMD:REQUEST_TASK:(.+)/)) {
        const taskReq = raw.match(/CMD:REQUEST_TASK:(.+)/)[1].split('\n')[0].trim();
        onInsight && onInsight(cleanText, { requestedTask: taskReq });
      }

      if (isDone) setDone(true);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong  - try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 580, background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 400, color: "#fff", fontStyle: "italic" }}>N</span>
            </div>
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.black, margin: 0 }}>Nora</p>
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
                background: m.role === "user" ? T.black : T.cream,
                border: m.role === "assistant" ? `1px solid ${T.border}` : "none",
              }}>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: m.role === "user" ? "#fff" : T.ink, margin: 0, lineHeight: 1.65 }}>{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
              <div style={{ padding: "12px 16px", background: T.cream, borderRadius: "4px 16px 16px 16px", border: `1px solid ${T.border}` }}>
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
              That's the conversation for now. Your plan has been updated where needed.
            </p>
            <button onClick={onClose}
              style={{ background: T.black, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Back to my plan →
            </button>
          </div>
        ) : (
          <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask Nora anything, task, goal, pace..."
                rows={2}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.sans, fontSize: 14, color: T.black, lineHeight: 1.55, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }}
              />
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ background: input.trim() && !loading ? T.purple : "#EEE", color: input.trim() && !loading ? "#fff" : "#AAA", border: "none", borderRadius: 10, padding: "12px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0, transition: "all 0.15s" }}>
                Send
              </button>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, margin: "8px 0 0" }}>Ask Nora to brainstorm with you, change tomorrow's task, adjust your weekly focus, or shift your goal</p>
            {messages.filter(m => m.role === "user").length >= 25 && (
              <p style={{ fontFamily: T.sans, fontSize: 10, color: T.muted, margin: "4px 0 0", opacity: 0.5 }}>
                {MAX_EXCHANGES - messages.filter(m => m.role === "user").length} exchange{MAX_EXCHANGES - messages.filter(m => m.role === "user").length === 1 ? "" : "s"} left in this conversation
              </p>
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

Profile: ${plan.profileName}
Role: ${lk(roleNames, answers.role) || "professional"}${subRoleText ? ` (${subRoleText})` : ""}
Seniority: ${SENIORITY_TEXTS[answers.seniority] || "mid-career"}
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}${goalDetailText ? ` (${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 60,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("").trim();
    return text.replace(/^["']|["']$/g, "").trim();
  } catch (e) {
    return "";
  }
}

// ─── Weekly Check-In Modal ────────────────────────────────────────────────────
// Triggered automatically after completing the last day of each week.
// Nora reviews what landed, what shifted, and whether the goal is still right.
// The conversation output feeds directly into the next week's batch generation.
function WeeklyCheckInModal({ plan, completedWeek, weekTasks, weekNotes, weekStatus, onComplete, onSkip }) {
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

  const systemPrompt = `You are Nora, a sharp career coach inside Second Act. You are doing a brief weekly check-in with someone who just finished Week ${completedWeek} of their career development program.

═══ WHO THIS PERSON IS ═══
Profile: ${plan.profileName}
Role: ${roleName}${subRoleText ? ` (${subRoleText})` : ""}
Seniority: ${SENIORITY_TEXTS[answers.seniority] || "mid-career"}
Orientation: ${cl.orientation || "balanced"}
Approach: ${stylePref}
What's making this feel urgent: ${URG_TEXTS[answers.urgency] || "not specified"}
Main blockers: ${normalizeBlocker(answers.blocker).map(b => BLOCKER_TEXTS[b]).filter(Boolean).join("; ") || "not specified"}

═══ THEIR GOAL ═══
12-month goal: "${goalText}"${goalDetailText ? ` (specifically: ${goalDetailText})` : ""}${goalDirection ? `\nTarget direction: ${goalDirection}` : ""}${goalStatementText ? `\nNora-refined goal statement: "${goalStatementText}"` : ""}

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
- If their goal has clearly shifted, include "CMD:CHANGE_GOAL:N" (N = 0–4, same scale as before).
- If the week focus should change, include "CMD:WEEK_GOAL:short 4–7 word theme".
- These commands go after NORA_DONE, each on its own line.

START: Open with one specific, direct question based on what you see in their week data. If they skipped a lot, ask about that. If they did everything, ask what actually moved them. Make it feel like you read their data.`;

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
        const text = (data.content || []).map(b => b.text || "").join("").replace("NORA_DONE", "").trim();
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
      const raw = (data.content || []).map(b => b.text || "").join("");
      const isDone = raw.includes("NORA_DONE");
      const text = raw.replace(/NORA_DONE[\s\S]*/g, "").trim();
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
      if (isDone) {
        setDone(true);
        const cleanText = raw.replace(/CMD:[^\n]*/g, "").replace(/NORA_DONE/, "").replace(/\n{2,}/g, "\n").trim();
        const cmds = {};
        if (raw.match(/CMD:CHANGE_GOAL:(\d)/)) cmds.changeGoal = parseInt(raw.match(/CMD:CHANGE_GOAL:(\d)/)[1]);
        if (raw.match(/CMD:WEEK_GOAL:(.+)/)) cmds.weekGoal = raw.match(/CMD:WEEK_GOAL:(.+)/)[1].split('\n')[0].trim();
        onComplete && onComplete(cleanText, cmds);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong, try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 110, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 580, background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", background: T.grad, borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 400, color: "#fff", fontStyle: "italic" }}>N</span>
            </div>
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Week {completedWeek} check-in</p>
              <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0 }}>Nora · shapes your Week {completedWeek + 1} tasks</p>
            </div>
          </div>
          <button onClick={onSkip} style={{ background: "none", border: "none", fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "4px 8px", fontFamily: T.sans }}>Skip →</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
              <div style={{ maxWidth: "82%", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px", background: m.role === "user" ? T.black : T.cream, border: m.role === "assistant" ? `1px solid ${T.border}` : "none" }}>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: m.role === "user" ? "#fff" : T.ink, margin: 0, lineHeight: 1.65 }}>{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
              <div style={{ padding: "12px 16px", background: T.cream, borderRadius: "4px 16px 16px 16px", border: `1px solid ${T.border}` }}>
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
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${T.purpleL}`, borderTop: `3px solid ${T.purple}`, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: 0 }}>Building your Week {completedWeek + 1} tasks...</p>
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px 16px 24px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Reply to Nora..."
                rows={2}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.sans, fontSize: 14, color: T.black, lineHeight: 1.55, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }}
              />
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ background: input.trim() && !loading ? T.purple : "#EEE", color: input.trim() && !loading ? "#fff" : "#AAA", border: "none", borderRadius: 10, padding: "12px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0 }}>
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
  const arcColor = displayScore >= 80 ? "#5DCAA5" : displayScore >= 60 ? "#A78BFA" : displayScore >= 40 ? "#818CF8" : "rgba(255,255,255,0.4)";
  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
        <circle cx="40" cy="40" r="32" fill="none" stroke={arcColor} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(displayScore / 100) * 201} 201`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{momentumScore}</span>
        <span style={{ fontFamily: T.sans, fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{momentumLabel}</span>
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
          style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: T.muted, cursor: "pointer", padding: 0, opacity: 0.6, letterSpacing: 0.2 }}>
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
            style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.purpleMid}`, borderRadius: 6, fontFamily: T.sans, fontSize: 12, color: T.black, lineHeight: 1.55, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
            {saved && (
              <button onClick={() => { setDraft(saved); setEditing(false); }}
                style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 11, color: T.muted, cursor: "pointer", padding: "4px 8px" }}>
                Cancel
              </button>
            )}
            <button onClick={save} disabled={!draft.trim()}
              style={{ background: draft.trim() ? T.purple : "#E8E8E8", color: draft.trim() ? "#fff" : "#AAA", border: "none", borderRadius: 6, padding: "5px 12px", fontFamily: T.sans, fontSize: 11, fontWeight: 600, cursor: draft.trim() ? "pointer" : "default", transition: "all 0.15s" }}>
              Save
            </button>
          </div>
        </div>
      ) : (
        /* ── Saved state: dimmed text + edit button ── */
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <p style={{
            flex: 1, margin: 0, padding: "7px 10px",
            fontFamily: T.sans, fontSize: 12, color: T.muted, lineHeight: 1.55,
            background: T.cream, borderRadius: 6, border: `1px solid ${T.border}`,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            transition: "opacity 0.3s",
            opacity: justSaved ? 0.6 : 0.75,
          }}>
            {saved}
          </p>
          <button onClick={() => setEditing(true)}
            style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 11, color: T.purple, cursor: "pointer", padding: "7px 0", flexShrink: 0, letterSpacing: 0.2 }}>
            edit
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mail share button — email task to a friend ──────────
function MailShareButton({ task }) {
  const [hovered, setHovered] = React.useState(false);
  if (!task) return null;
  const subject = encodeURIComponent("Working on this today — want to think it through?");
  const body = encodeURIComponent(
    "Hey, I'm working through a career development program and today's task is:\n\n" +
    task.title + "\n\n" +
    (task.desc || "") + "\n\n" +
    (task.steps?.length ? "Steps:\n" + task.steps.map((s, i) => (i + 1) + ". " + s).join("\n") + "\n\n" : "") +
    "Would be good to talk it through if you have 10 minutes."
  );
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <a
        href={"mailto:?subject=" + subject + "&body=" + body}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 8,
          background: hovered ? T.purpleMid : "transparent",
          border: "1px solid " + (hovered ? T.purple : T.purpleMid),
          cursor: "pointer", textDecoration: "none",
          transition: "background 0.15s, border-color 0.15s",
        }}>
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
          <rect x="0.75" y="0.75" width="13.5" height="10.5" rx="1.5" stroke={T.purpleD} strokeWidth="1.2" />
          <path d="M1 1.5L7.5 7L14 1.5" stroke={T.purpleD} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      {hovered && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: T.black, color: "#fff",
          fontFamily: T.sans, fontSize: 11, fontWeight: 500,
          padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap",
          pointerEvents: "none", zIndex: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          Brainstorm this task with a friend
          <div style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderTop: "5px solid " + T.black,
          }} />
        </div>
      )}
    </div>
  );
}

function DashboardScreen({ plan: initialPlan, onBack, startDate }) {

  // Local mutable copy of plan so we never mutate the parent's prop
  const [plan, setPlanState] = useState(initialPlan);

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
  // Nora modal
  const [noraOpen, setNoraOpen] = useState(false);
  const [noraInsight, setNoraInsight] = useState(null);
  const [noraDismissed, setNoraDismissed] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [noraGoalClarification, setNoraGoalClarification] = useState(false); // first-session goal mode
  const [noraMomentumBonus, setNoraMomentumBonus] = useState(0);
  const [noraChangeMade, setNoraChangeMade] = useState(false);
  const [noraPickDay, setNoraPickDay] = useState(null);
  const [noraSessionLog, setNoraSessionLog] = useState([]);
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
        if (saved.noraInsight) setNoraInsight(saved.noraInsight);
        if (saved.noraDismissed) setNoraDismissed(saved.noraDismissed);
        if (saved.noraMomentumBonus) setNoraMomentumBonus(saved.noraMomentumBonus);
        if (saved.noraChangeMade) setNoraChangeMade(saved.noraChangeMade);
        if (saved.noraPickDay) setNoraPickDay(saved.noraPickDay);
        if (saved.noraSessionLog?.length) setNoraSessionLog(saved.noraSessionLog);
        if (saved.weeklyCheckInDone) setWeeklyCheckInDone(saved.weeklyCheckInDone);
        if (saved.weekFocusInput) setWeekFocusInput(saved.weekFocusInput);
        if (saved.customGoalInput) setCustomGoalInput(saved.customGoalInput);
        if (saved.cashPot != null) setCashPot(saved.cashPot);
        if (saved.paywallBypassed) setPaywallBypassed(saved.paywallBypassed);
      }
      setStorageLoaded(true);
    })();
  }, []); // eslint-disable-line

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
        checkedSteps, noraInsight, noraDismissed, noraMomentumBonus,
        noraChangeMade, noraPickDay, noraSessionLog,
        weeklyCheckInDone, weekFocusInput, customGoalInput, cashPot,
        paywallBypassed,
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
    checkedSteps, noraInsight, noraDismissed, noraMomentumBonus,
    noraChangeMade, noraPickDay, noraSessionLog,
    weeklyCheckInDone, weekFocusInput, customGoalInput, cashPot, paywallBypassed,
  ]); // eslint-disable-line

  const tagColors = {
    "Apply":   { bg: "#F0F7F2", text: "#3A6B50", border: "#BDD9C8" },
    "Reflect": { bg: "#F5EFEB", text: "#7A3D2E", border: "#C9A090" },
    "Read":    { bg: "#EEF2FB", text: "#3B55A0", border: "#BACAE8" },
    "Tool":    { bg: "#EDF7F6", text: "#1A6B62", border: "#9ACFC9" },
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

  // ── Auto-generate Day 1 if missing or was a Tool task (static default) ──
  const day1GenAttempted = useRef(false);
  useEffect(() => {
    if (!storageLoaded) return;
    const day1 = dayTasks[1];
    // Generate if null or if it's a leftover Tool/AI task
    if ((!day1 || day1.tag === 'Tool') && !day1GenAttempted.current) {
      day1GenAttempted.current = true;
      setGenerating(1);
      generateNextDayTask(plan, 0, null, "", noraInsight, {}, {}, {})
        .then(t => {
          if (t) {
            setDayTasks(prev => ({ ...prev, 1: t }));
            setGenerating(null);
            // Trigger week gen once Day 1 is ready
            const hasSavedWeek = Object.keys(dayTasks).filter(k => parseInt(k) >= 2).length >= 3;
            if (!hasSavedWeek) generateWeek(t);
          } else {
            setGenerating(null);
          }
        });
    }
  }, [storageLoaded]); // eslint-disable-line

  useEffect(() => {
    if (!storageLoaded) return;
    const day1 = dayTasks[1];
    // Only run week gen if Day 1 already exists and we don't have saved days 2-7
    if (!day1 || day1.tag === 'Tool') return; // wait for day1 gen effect
    const hasSavedWeek = Object.keys(dayTasks).filter(k => parseInt(k) >= 2).length >= 3;
    if (!hasSavedWeek && !day1GenAttempted.current) generateWeek(day1);
    else { setWeekGenerating(false); setIsInitialWeekLoad(false); }
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
      const arc = await generateWeekArc(plan._answers || {}, plan.classification || {});
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
    for (let d = 1; d <= 56; d++) {
      if (!dayStatus[d]) return d;
    }
    return 56;
  }, [dayStatus]);

  const streakCount = calcStreak(dayStatus);

  // ── MOMENTUM SCORE (0–100) ──────────────────────────────
  // +8 per completed day, -3 per skipped day, +noraMomentumBonus, streak multiplier
  const momentumScore = useMemo(() => {
    const dc = Object.values(dayStatus).filter(s => s === 'done').length;
    const sc = Object.values(dayStatus).filter(s => s === 'skipped').length;
    const base = dc * 8 - sc * 3;
    const streakBonus = streakCount >= 21 ? 12 : streakCount >= 14 ? 8 : streakCount >= 7 ? 4 : streakCount >= 3 ? 2 : 0;
    return Math.max(0, Math.min(100, base + streakBonus + noraMomentumBonus));
  }, [dayStatus, streakCount, noraMomentumBonus]);

  const momentumLabel = momentumScore >= 80 ? "Peak" : momentumScore >= 60 ? "Strong" : momentumScore >= 40 ? "Building" : momentumScore >= 20 ? "Starting" : "Day 1";

  // ── WEEK BADGES ─────────────────────────────────────────
  // Earned when ≥5/7 days done in a completed week
  const weekBadges = useMemo(() => Array.from({ length: 8 }, (_, i) => {
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
    const ctx0 = { dayStatus, dayTasks, streakCount, noraChangeMade, noraPickDay };
    const prevEarned = new Set(ACHIEVEMENTS.filter(a => a.earned(ctx0)).map(a => a.id));

    // Update status
    const newStatus = { ...dayStatus, [dayNum]: status };
    setDayStatus(newStatus);

    // Check for newly unlocked achievements with the updated status
    const newStreakCount = calcStreak(newStatus);
    const ctx1 = { dayStatus: newStatus, dayTasks, streakCount: newStreakCount, noraChangeMade, noraPickDay };
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

      // Pick a quote from the static library — instant, no API cost
      setDailyQuotes(prev => ({ ...prev, [dayNum]: pickQuote(dayNum) }));
    }
    if (dayNum < 56) {
      const nextDay = dayNum + 1;
      const completedWeek = dayNum % 7 === 0 ? dayNum / 7 : null;

      if (completedWeek && completedWeek < 8) {
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
          const sessionLogNote = noraSessionLog.length
            ? `Nora session history: ${noraSessionLog.slice(-3).map(s => s.summary).join(" | ")}`
            : "";
          const combinedNote = [note, stepsSignal, editSignal, paceNote, noraInsight ? `Nora coaching context: ${noraInsight.slice(0, 300)}` : "", sessionLogNote].filter(Boolean).join(" | ");
          const nextTask = await generateNextDayTask(plan, dayNum, status, combinedNote, noraInsight, dayTasks, dayStatus, dayNotes);
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
    const note = [dayNotes[prevDay] || "", noraInsight ? `Nora coaching context: ${noraInsight.slice(0, 300)}` : ""].filter(Boolean).join(" | ");
    const nextTask = await generateNextDayTask(plan, prevDay, status, note, noraInsight, dayTasks, dayStatus, dayNotes);
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
    // Apply any goal/theme changes from check-in (immutable — don't mutate props)
    let updatedPlan = plan;
    if (cmds.changeGoal !== undefined) {
      updatedPlan = { ...plan, _answers: { ...plan._answers, goal: cmds.changeGoal, goal_detail: undefined } };
      setPlanState(updatedPlan);
      setGoalUpdatedDay(highestUnlocked);
      setGoalStatement("");
    }
    if (cmds.weekGoal) setWeekGoalOverride(cmds.weekGoal);
    const combinedInsight = [
      noraInsight,
      weekInsight,
      noraSessionLog.length ? `Nora session history: ${noraSessionLog.slice(-4).map(s => s.summary).join(" | ")}` : "",
    ].filter(Boolean).join('\n\n');
    if (weekInsight) setNoraInsight(combinedInsight);
    setWeeklyCheckInOpen(null);
    setWeeklyCheckInDone(prev => ({ ...prev, [nextWeek - 1]: weekInsight || true }));
    setPendingWeekGen(null);
    setWeekGenerating(true);
    const planWithGoal = { ...updatedPlan, _goalStatement: goalStatement };
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
    if (cmds.changeGoal !== undefined) {
      generateGoalStatement(updatedPlan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
    }
  };

  // Calendar-aware day labels: Day 1 falls on the actual weekday the person started
  const START_DOW = startDate ? new Date(startDate).getDay() : 1; // 0=Sun,1=Mon,...6=Sat
  // Build 56-element array of real weekday labels for each day of the program
  const dayLabels = useMemo(() => Array.from({ length: 56 }, (_, i) => {
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
  const currentWeek = Math.min(8, Math.ceil(highestUnlocked / 7));
  const currentWeekStart = (currentWeek - 1) * 7 + 1;
  const weekThemes56 = [1,2,3,4,5,6,7,8].map(wk => {
    // Priority: adapted theme (from performance-based re-evaluation) > original arc theme > fallback
    if (adaptedWeekThemes[wk]) return adaptedWeekThemes[wk];
    const originals = [w1, w2, w3, w4, arc.w5, arc.w6, arc.w7, arc.w8];
    const fallbacks = [w1, w2, w3, w4, 'Build on what worked', 'Move toward the goal', 'Make the work visible', 'Habit locked in'];
    return originals[wk - 1] || fallbacks[wk - 1];
  });
  const currentWeekTheme = weekGoalOverride || weekThemes56[currentWeek - 1] || weekTheme;

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh", fontFamily: T.sans }}>
      <style>{`
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
          .sa-dash-nora-box { padding: 14px 14px !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(160deg, #1a1730 0%, #2a2445 55%, #1e1835 100%)", padding: "24px clamp(16px, 4vw, 24px) 20px", position: "relative", overflow: "hidden" }}>
        {/* Subtle ambient glow */}
        <div style={{ position: "absolute", top: "-20%", right: "-5%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(155,143,224,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontFamily: T.sans, fontSize: 12, cursor: "pointer", padding: 0 }}>←</button>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setProgressOpen(true)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 12px", fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="7" width="3" height="6" rx="1" fill="rgba(255,255,255,0.55)"/><rect x="5.5" y="4" width="3" height="9" rx="1" fill="rgba(255,255,255,0.55)"/><rect x="10" y="1" width="3" height="12" rx="1" fill="rgba(255,255,255,0.55)"/></svg>
                Progress
              </button>
              <button onClick={() => setArcOpen(o => !o)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 12px", fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 7C1 3.686 3.686 1 7 1s6 2.686 6 6-2.686 6-6 6S1 10.314 1 7Z" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3"/><path d="M7 4v3l2 2" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Goal map
              </button>
            </div>
          </div>

          {/* Greeting + week theme */}
          <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 4px", fontWeight: 500 }}>
            {plan.name ? `${plan.name.trim()}'s program` : "Your program"} · Week {currentWeek}
          </p>
          {headerWeekEdit ? (
            <div style={{ margin: "0 0 6px" }}>
              <input
                autoFocus
                value={headerWeekDraft}
                onChange={e => setHeaderWeekDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("header-week-save")?.click(); } if (e.key === "Escape") setHeaderWeekEdit(false); }}
                placeholder="e.g. Build stakeholder visibility"
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 10, fontFamily: T.sans, fontSize: "clamp(16px, 3vw, 20px)", fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.06)", outline: "none", boxSizing: "border-box", letterSpacing: -0.3 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button id="header-week-save"
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
                        const t = await generateNextDayTask(plan, d - 1, dayStatus[d - 1] || 'done', `Week focus: ${newFocus}`, noraInsight, dayTasks, dayStatus, dayNotes);
                        if (t) newTasks[d] = t;
                      }
                      setDayTasks(prev => ({ ...prev, ...newTasks }));
                    }
                    setGoalUpdating(false);
                  }}
                  style={{ background: headerWeekDraft.trim() && !goalUpdating ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)", color: headerWeekDraft.trim() ? "#fff" : "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 14px", fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: headerWeekDraft.trim() && !goalUpdating ? "pointer" : "default" }}>
                  {goalUpdating ? "Saving…" : "Save + regenerate"}
                </button>
                <button onClick={() => setHeaderWeekEdit(false)}
                  style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "6px 8px" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
              <h1 style={{ fontFamily: T.sans, fontSize: "clamp(18px,3.5vw,24px)", fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.25, letterSpacing: -0.5 }}>
                {currentWeekTheme}
              </h1>
            </div>
          )}

          {/* 12-month goal — compact */}
          {(() => {
            const goalTexts = GOAL_TEXTS;
            const rawGoalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];
            const displayText = (noraChangeMade && goalStatement) ? goalStatement : rawGoalText;
            return displayText ? (
              <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Goal </span>
                {displayText}
              </p>
            ) : null;
          })()}

          {/* ── STATS ROW — compact, horizontal ── */}
          <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>

            {/* Creds */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                onClick={() => setShowCredsLog(true)}
                style={{
                  height: 54, padding: "0 14px",
                  borderRadius: 14,
                  background: "rgba(240,180,41,0.08)",
                  border: "1px solid rgba(240,180,41,0.2)",
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(240,180,41,0.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(240,180,41,0.08)"}>
                <span style={{ fontSize: 18, display: "flex", alignItems: "center" }}>
                  {/* Dynamic coin stack — grows with doneCount */}
                  <svg width={doneCount >= 21 ? 24 : doneCount >= 8 ? 22 : doneCount >= 3 ? 20 : 18} height={doneCount >= 21 ? 28 : doneCount >= 8 ? 24 : doneCount >= 3 ? 20 : 16} viewBox="0 0 48 56" fill="none" style={{ transition: "all 0.5s ease" }}>
                    {/* Bottom coin — always visible */}
                    <ellipse cx="24" cy={doneCount >= 3 ? 50 : 50} rx="13" ry="4.5" fill="#d4900f" stroke="#f0b429" strokeWidth="1"/>
                    <ellipse cx="24" cy={doneCount >= 3 ? 48 : 48} rx="13" ry="4.5" fill="#f0b429" stroke="#fad568" strokeWidth="1.2"/>
                    <ellipse cx="20" cy={doneCount >= 3 ? 47.2 : 47.2} rx="5" ry="1.5" fill="rgba(255,255,255,0.25)" transform={`rotate(-10 20 ${doneCount >= 3 ? 47.2 : 47.2})`}/>
                    {/* 2nd coin — 3+ days */}
                    {doneCount >= 3 && <>
                      <rect x="11" y="38" width="26" height="10" fill="#92640a"/>
                      <ellipse cx="24" cy="38" rx="13" ry="4.5" fill="#c8860e" stroke="#f0b429" strokeWidth="1"/>
                      <ellipse cx="24" cy="36" rx="13" ry="4.5" fill="#f0b429" stroke="#fad568" strokeWidth="1.2"/>
                      <ellipse cx="21" cy="35.2" rx="4.5" ry="1.3" fill="rgba(255,255,255,0.2)" transform="rotate(-8 21 35.2)"/>
                    </>}
                    {/* 3rd coin — 8+ days */}
                    {doneCount >= 8 && <>
                      <rect x="11" y="26" width="26" height="10" fill="#7a5208"/>
                      <ellipse cx="24" cy="26" rx="13" ry="4.5" fill="#d4900f" stroke="#f0b429" strokeWidth="1"/>
                      <ellipse cx="24" cy="24" rx="13" ry="4.5" fill="#f0b429" stroke="#fad568" strokeWidth="1.2"/>
                      <ellipse cx="20" cy="23" rx="5" ry="1.4" fill="rgba(255,255,255,0.22)" transform="rotate(-10 20 23)"/>
                    </>}
                    {/* 4th coin — 21+ days */}
                    {doneCount >= 21 && <>
                      <rect x="11" y="14" width="26" height="10" fill="#5c3c06"/>
                      <ellipse cx="24" cy="14" rx="13" ry="4.5" fill="#c8860e" stroke="#f0b429" strokeWidth="1"/>
                      <ellipse cx="24" cy="12" rx="13" ry="4.5" fill="#f0b429" stroke="#fad568" strokeWidth="1.5"/>
                      <ellipse cx="20" cy="11" rx="5" ry="1.5" fill="rgba(255,255,255,0.3)" transform="rotate(-10 20 11)"/>
                    </>}
                    {/* 5th coin crown — 35+ days */}
                    {doneCount >= 35 && <>
                      <rect x="11" y="4" width="26" height="8" fill="#5c3c06"/>
                      <ellipse cx="24" cy="4" rx="13" ry="4.5" fill="#d4900f" stroke="#fad568" strokeWidth="1"/>
                      <ellipse cx="24" cy="2" rx="13" ry="4.5" fill="#fad568" stroke="#ffe08a" strokeWidth="1.5"/>
                      <ellipse cx="19" cy="1.2" rx="5.5" ry="1.6" fill="rgba(255,255,255,0.35)" transform="rotate(-10 19 1.2)"/>
                    </>}
                  </svg>
                </span>
                <div>
                  <p key={cashPot} style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 800, color: "#fad568", margin: 0, lineHeight: 1, animation: cashAnimations.length > 0 ? "cashNumTick 0.35s ease 0.6s both" : "none" }}>{cashPot}</p>
                  <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(240,180,41,0.55)", margin: 0, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>Creds</p>
                </div>
              </div>
              {cashAnimations.map(anim => (
                <div key={anim.id} style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 10, fontFamily: T.sans, fontSize: 13, fontWeight: 800, color: "#fad568", whiteSpace: "nowrap", textShadow: "0 2px 8px rgba(240,180,41,0.8)", animation: "actEarned 1.3s ease-out forwards" }}>+{anim.amount} Cr</div>
              ))}
            </div>

            {/* Streak */}
            <div style={{
              height: 54, padding: "0 14px",
              borderRadius: 14,
              background: streakCount >= 7 ? "rgba(251,191,36,0.1)" : streakCount >= 3 ? "rgba(251,146,60,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${streakCount >= 7 ? "rgba(251,191,36,0.25)" : streakCount >= 3 ? "rgba(251,146,60,0.2)" : "rgba(255,255,255,0.08)"}`,
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1 }}>{streakCount || 0}</p>
                <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>streak</p>
              </div>
            </div>

            {/* Week progress — ring */}
            {(() => {
              const weekDone = Array.from({length:7},(_,i)=>(currentWeek-1)*7+i+1).filter(d=>dayStatus[d]==='done').length;
              const pct = weekDone / 7;
              const circumference = 2 * Math.PI * 17;
              return (
                <div style={{
                  height: 54, padding: "0 10px 0 6px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}>
                  <svg width="38" height="38" viewBox="0 0 38 38">
                    <circle cx="19" cy="19" r="17" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="19" cy="19" r="17" fill="none" stroke={pct >= 1 ? "#4AE080" : "#9B8FE0"} strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${pct * circumference} ${circumference}`}
                      style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 0.5s ease" }} />
                    <text x="19" y="20" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 800, fill: "#fff" }}>{weekDone}</text>
                  </svg>
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, lineHeight: 1.3 }}>this</p>
                    <p style={{ fontFamily: T.sans, fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, lineHeight: 1.3 }}>week</p>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      <div ref={dayContentRef} style={{ maxWidth: 600, margin: "0 auto", padding: "28px clamp(16px, 4vw, 24px) 24px" }}>


        {/* ── WEEK PLAN FAILED BANNER ── */}
        {weekFailed && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: "#991B1B", margin: 0 }}>Could not load your week plan. Check your connection.</p>
            <button onClick={() => generateWeek(dayTasks[1])} style={{ background: "#991B1B", color: "#fff", border: "none", fontFamily: T.sans, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>Retry</button>
          </div>
        )}

        {/* ── PROGRAM GRID, current week expanded, past weeks collapsible, future weeks hidden ── */}
        <div style={{ marginBottom: 24 }}>
          {[1,2,3,4,5,6,7,8].map(wk => {
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
                      ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.purple, flexShrink: 0 }} />
                      : <span style={{ fontSize: 13, color: T.purple, flexShrink: 0 }}>✓</span>
                    }
                    <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: isCurrentWk ? T.purple : T.body, flexShrink: 0 }}>Week {wk}</span>
                    <span style={{ fontFamily: T.sans, fontSize: 13, color: isCurrentWk ? T.ink : T.muted, fontWeight: isCurrentWk ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wkTheme}</span>
                    {isCurrentWk && (
                      <button onClick={(e) => { e.stopPropagation(); setHeaderWeekDraft(currentWeekTheme); setHeaderWeekEdit(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 11, color: T.purple, cursor: "pointer", padding: "2px 4px", flexShrink: 0, opacity: 0.5 }}>
                        edit
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>{wkDone}/7</span>
                    {isPastWk && (
                      <span style={{ fontFamily: T.sans, fontSize: 12, color: T.purple, opacity: 0.7 }}>
                        {expandedWeek === wk ? "▾" : "▸"}
                      </span>
                    )}
                  </div>
                </div>

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
                          <p style={{ fontFamily: T.sans, fontSize: 11, color: isActive ? T.purple : T.muted, margin: "0 0 5px", fontWeight: isActive ? 700 : 500, letterSpacing: 0.3 }}>{d}</p>
                          <div style={{
                            height: 36, borderRadius: 10,
                            background: status === 'done' ? "linear-gradient(135deg, #7c6f9f, #9B8FD0)" : status === 'skipped' ? "#EEEDEE" : isActive ? T.purpleL : "#F2F1F4",
                            border: isActive && !status ? `2px solid ${T.purpleMid}` : "2px solid transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: isFuture && !isGeneratingThis ? 0.3 : 1,
                            transition: "all 0.25s ease",
                          }}>
                            {status === 'done' && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                            {status === 'skipped' && <span style={{ color: T.muted, fontSize: 11 }}>–</span>}
                            {!status && !isFuture && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isActive ? T.purple : "#C8C4DC" }} />}
                            {isFuture && isGeneratingThis && <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.purpleMid, opacity: 0.5 }} />}
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
        {Array.from({ length: 56 }, (_, i) => i + 1).map(dayNum => {
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
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.cream, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="none"><rect x="1" y="7" width="14" height="10" rx="2.5" stroke={T.muted} strokeWidth="1.5"/><path d="M4 7V5a4 4 0 0 1 8 0v2" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <p style={{ fontFamily: T.serif, fontSize: 20, color: T.black, margin: "0 0 10px", fontWeight: 400 }}>Day {dayNum} is waiting.</p>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.muted, margin: 0, lineHeight: 1.6 }}>Complete Day {dayNum - 1} to unlock. Each task is generated from your progress.</p>
              </div>
            );
          }

          if (dayGenFailed[dayNum]) {
            return (
              <div key={dayNum} style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ fontFamily: T.serif, fontSize: 17, color: T.black, margin: "0 0 6px", fontWeight: 400 }}>Could not build Day {dayNum}.</p>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: "0 0 20px", lineHeight: 1.6 }}>Check your connection and try again.</p>
                <button onClick={() => retryDayGen(dayNum)}
                  style={{ background: T.black, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "11px 24px", borderRadius: 10, cursor: "pointer" }}>
                  Try again
                </button>
              </div>
            );
          }

          if (isGenerating || (!task && !isLocked && (weekGenerating || generating !== null))) {
            return (
              <div key={dayNum} style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.purpleL}`, borderTop: `3px solid ${T.purple}`, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ fontFamily: T.serif, fontSize: 18, color: T.black, margin: "0 0 4px", fontWeight: 400 }}>
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
                <p style={{ fontFamily: T.serif, fontSize: 17, color: T.black, margin: "0 0 6px", fontWeight: 400 }}>Could not build Day {dayNum}.</p>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: "0 0 20px", lineHeight: 1.6 }}>Check your connection and try again.</p>
                <button onClick={() => retryDayGen(dayNum)}
                  style={{ background: T.black, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "11px 24px", borderRadius: 8, cursor: "pointer" }}>
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
                    style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.purple, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    ← Back to Week {currentWeek}
                  </button>
                  <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>· Day {dayNum} · {status === 'done' ? 'Completed' : 'Skipped'}</span>
                </div>
              )}
              {/* ── DAILY TIME PICKER — only when task not yet done/skipped ── */}
              {!status && task && (
                <div style={{ background: "#fff", border: `1px solid #E8E6F2`, borderRadius: 16, padding: "16px 20px", marginBottom: 16 }}>
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.body, margin: "0 0 10px" }}>How much time do you have today?</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["15 min", "30 min", "45 min", "1 hour", "3 hours", "5 hours+"].map(opt => {
                      const sel = dailyTimeAvailable === opt;
                      return (
                        <button key={opt} onClick={async () => {
                          if (dailyTimeGenerating) return;
                          setDailyTimeAvailable(opt);
                          setDailyTimeGenerating(true);

                          // Map time slots to task count — per-task time is now API-decided
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
                              const t = await generateNextDayTask(plan, dayNum - 1, dayStatus[dayNum - 1] || 'done', timeHint, noraInsight, dayTasks, dayStatus, dayNotes);
                              if (t) {
                                t.time = opt;
                                t._subtasks = null;
                                setDayTasks(prev => ({ ...prev, [dayNum]: t }));
                              }
                            } else {
                              // Multiple tasks: let the API decide individual time allocations based on complexity
                              const timeHint = `TIME AVAILABLE TODAY: ${opt} (${cfg.totalMin} minutes total). Generate exactly ${cfg.count} separate career development tasks. IMPORTANT: Allocate time per task based on complexity — simpler tasks (like a quick read or reflection) should get less time, deeper tasks (like building something or writing a piece of work) should get more. The only constraint: all task "time" fields must sum to exactly ${cfg.totalMin} minutes. Each task must have ${cfg.stepsPerTask} steps. Tasks should complement each other and be diverse in type (mix of Apply, Read, Reflect, Tool). HARD RULE: NO AI tool tasks.

Return ONLY valid JSON, no markdown:
{"tasks":[${Array.from({ length: cfg.count }, () => '{"tag":"Apply|Read|Reflect","time":"X min","title":"...","desc":"...","steps":[...],"whyBase":"..."}').join(",")}]}`;
                              try {
                                const res = await fetch("/api/generate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    model: "claude-sonnet-4-20250514",
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
12-month goal: ${_answers.goal_custom || GOAL_TEXTS[_answers.goal] || "move forward"}${_goalDetail ? ` (${_goalDetail})` : ""}${_goalDir ? `\nTarget direction: ${_goalDir}` : ""}${_goalStmt ? `\nNora-refined goal: "${_goalStmt}"` : ""}

═══ THIS WEEK ═══
Week ${_wkNum} focus: "${_wkTheme}"
${noraInsight ? `\n═══ NORA COACHING CONTEXT ═══\n${noraInsight.slice(0, 400)}\n` : ""}
═══ RECENT HISTORY ═══
${_dayHist || "No previous days yet."}

${timeHint}`;
                                    })() }],
                                  }),
                                });
                                const data = await res.json();
                                const text = (data.content || []).map(b => b.text || "").join("");
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
                                const t = await generateNextDayTask(plan, dayNum - 1, dayStatus[dayNum - 1] || 'done', `TIME AVAILABLE TODAY: ${opt}. Generate 1 substantial task of ${opt} with ${cfg.stepsPerTask} detailed steps. Set "time" to "${opt}".`, noraInsight, dayTasks, dayStatus, dayNotes);
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
                            fontFamily: T.sans, fontSize: 12, fontWeight: sel ? 700 : 400,
                            padding: "6px 14px", borderRadius: 20,
                            border: `1.5px solid ${sel ? T.purple : T.border}`,
                            background: sel ? T.purpleL : "#fff",
                            color: sel ? T.purpleD : T.muted,
                            cursor: dailyTimeGenerating ? "wait" : "pointer",
                            transition: "all 0.12s",
                            opacity: dailyTimeGenerating && !sel ? 0.4 : 1,
                          }}>
                          {opt}
                        </button>
                      );
                    })}
                    {dailyTimeGenerating && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${T.purpleL}`, borderTop: `2px solid ${T.purple}`, animation: "spin 0.8s linear infinite" }} />
                        <span style={{ fontFamily: T.sans, fontSize: 12, color: T.muted }}>Building {dailyTimeAvailable} plan…</span>
                      </div>
                    )}
                  </div>
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
                        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>{allTasks.length} tasks for today</span>
                        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.purple }}>Total: {totalLabel}</span>
                      </div>
                    )}
                    {allTasks.map((t, ti) => {
                  const tColors = tagColors[t.tag] || tagColors["Read"];
                  return (
                    <div key={ti} className="sa-dash-task-card" style={{ background: "#fff", border: `1px solid ${status === 'done' ? "#E8E6F2" : status === 'skipped' ? T.border : "#E8E6F2"}`, borderRadius: 20, padding: "28px 24px", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,23,48,0.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", background: tColors.bg, color: tColors.text, border: `1.5px solid ${tColors.border}`, borderRadius: 6 }}>{t.tag}</span>
                        <span style={{ fontFamily: T.sans, fontSize: 14, color: T.muted }}>{t.time}</span>
                        {ti === 0 && !status && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.purple, letterSpacing: 0.5 }}>Day {dayNum}{allTasks.length > 1 ? ` · ${allTasks.length} tasks` : ""}</span>}
                        {ti > 0 && !status && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: 0.5 }}>Task {ti + 1} of {allTasks.length}</span>}
                        {ti === 0 && status === 'done' && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.purpleD, background: T.purpleL, padding: "4px 12px", borderRadius: 20 }}>Done ✓</span>}
                        {ti === 0 && status === 'skipped' && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, color: T.muted, background: T.cream, padding: "4px 12px", borderRadius: 20 }}>Skipped</span>}
                      </div>
                      <h3 style={{ fontFamily: T.sans, fontSize: 19, fontWeight: 700, color: T.black, margin: "0 0 14px", lineHeight: 1.3 }}>{t.title}</h3>
                      <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: "0 0 18px", lineHeight: 1.85 }}>{t.desc}</p>
                      <TaskSteps steps={t.steps} initialChecked={(checkedSteps[`${dayNum}_${ti}`] || checkedSteps[dayNum] || {})} onCheckedChange={c => setCheckedSteps(prev => ({ ...prev, [`${dayNum}_${ti}`]: c }))} tagBg={tColors.bg} tagAccent={tColors.text} />
                      {(t.whyBase || t.why) && (
                        <div style={{ borderLeft: `3px solid ${tColors.border || T.border}`, paddingLeft: 14 }}>
                          <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: 0, lineHeight: 1.75 }}>
                            <strong style={{ color: T.black, fontSize: 15 }}>{whyLabel2} </strong>{t.whyBase || t.why}
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
              {!status && (
                <div className="sa-dash-nora-box" style={{ background: "#fff", border: `1px solid #E8E6F2`, borderRadius: 16, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: T.serif, fontSize: 16, color: "#fff", fontStyle: "italic" }}>N</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 13, color: T.body, margin: "0 0 10px", lineHeight: 1.55 }}>
                      <strong style={{ fontWeight: 600, color: T.purpleD }}>Not sure how to approach this task?</strong>{" "}Brainstorm with Nora. She'll adjust your program based on what you share.
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => setNoraOpen(true)}
                        style={{ background: T.purple, border: "none", borderRadius: 8, padding: "7px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                        Talk to Nora →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── COMPLETION ── */}
              {!status && !showCelebration[dayNum] && (
                <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: `1px solid #E8E6F2` }}>
                  <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>Done with today's task?</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => markDay(dayNum, 'done')}
                      style={{ flex: 1, background: T.purple, color: "#fff", border: "none", borderRadius: 12, padding: "15px 0", fontFamily: T.sans, fontSize: 16, fontWeight: 600, cursor: "pointer", letterSpacing: -0.2, transition: "transform 0.12s", boxShadow: "0 2px 10px rgba(124,111,159,0.3)" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                      Done ✓
                    </button>
                    <button onClick={() => markDay(dayNum, 'skipped')}
                      style={{ flex: 0.6, background: "#F8F7FC", color: T.muted, border: `1px solid #E8E6F2`, borderRadius: 12, padding: "15px 0", fontFamily: T.sans, fontSize: 15, cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F0EFF8"}
                      onMouseLeave={e => e.currentTarget.style.background = "#F8F7FC"}>
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {/* ── COMPLETED STATE ── */}
              {status === 'done' && dayNum < 56 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Celebration card */}
                  <div style={{ background: "linear-gradient(135deg, #1e1a30 0%, #3a2d70 100%)", borderRadius: 20, padding: "22px 24px" }}>
                    {streakCount === 3 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(184,176,216,0.6)", margin: "0 0 6px" }}>3-day streak · The habit is starting.</p>}
                    {streakCount === 7 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(184,176,216,0.6)", margin: "0 0 6px" }}>7 days straight · One full week.</p>}
                    {streakCount === 14 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(184,176,216,0.6)", margin: "0 0 6px" }}>Two weeks · Most people stop here. You didn't.</p>}
                    {streakCount === 21 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(184,176,216,0.6)", margin: "0 0 6px" }}>21 days · This is where it locks in.</p>}
                    {streakCount === 30 && <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(184,176,216,0.6)", margin: "0 0 6px" }}>30 days · You built something real.</p>}
                    <p style={{ fontFamily: T.serif, fontSize: 20, color: "#fff", margin: "0 0 4px", fontWeight: 400 }}>Day {dayNum} done.{streakCount > 1 ? ` 🔥 ${streakCount}` : " ✓"}</p>
                    {goalUpdatedDay === dayNum && (
                      <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(184,176,216,0.5)", margin: "0 0 6px" }}>Goal updated, tasks reshaped ✓</p>
                    )}
                    {note && <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 10px", fontStyle: "italic" }}>{note}</p>}

                    {/* Inspirational quote from curated library */}
                    {dailyQuotes[dayNum] && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, marginTop: 6 }}>
                        <p style={{ fontFamily: T.serif, fontSize: 15, color: "rgba(255,255,255,0.65)", margin: "0 0 5px", lineHeight: 1.6, fontStyle: "italic" }}>
                          {dailyQuotes[dayNum].text}
                        </p>

                      </div>
                    )}
                  </div>

                  {/* Up next */}
                  {dayNum < 56 && (
                    <div style={{ background: "#fff", border: `1px solid #E8E6F2`, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 4px" }}>Up next</p>
                        <p style={{ fontFamily: T.serif, fontSize: 17, color: T.black, margin: 0, fontWeight: 400 }}>
                          {dayTasks[dayNum + 1] ? `Day ${dayNum + 1}` : `Day ${dayNum + 1} is being prepared…`}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (dayTasks[dayNum + 1]) { setActiveDay(dayNum + 1); } }}
                        disabled={!dayTasks[dayNum + 1]}
                        style={{ background: dayTasks[dayNum + 1] ? T.black : T.cream, color: dayTasks[dayNum + 1] ? "#fff" : T.muted, border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: T.sans, fontSize: 15, fontWeight: 600, cursor: dayTasks[dayNum + 1] ? "pointer" : "default", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        {!dayTasks[dayNum + 1]
                          ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${T.muted}`, borderTop: `2px solid ${T.purple}`, animation: "spin 0.8s linear infinite" }} />Building…</>
                          : <>Start Day {dayNum + 1} →</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              )}

              {status === 'skipped' && dayNum < 56 && (
                <div style={{ background: "#FAFAF8", borderRadius: 20, padding: "22px 24px", border: `1px solid #E8E6F2` }}>
                  <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 8px" }}>The program adjusted</p>
                  <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: "0 0 6px", fontWeight: 600 }}>Tomorrow is shorter. You're still in it.</p>
                  {note && <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "0 0 8px", fontStyle: "italic" }}>{note}</p>}
                  <p style={{ fontFamily: T.sans, fontSize: 14, color: T.body, margin: "0 0 16px", lineHeight: 1.65 }}>Day {dayNum + 1} has been scaled down based on today. Missing a day isn't the same as stopping.</p>
                  {dayTasks[dayNum + 1] ? (
                    <button onClick={() => { setActiveDay(dayNum + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{ background: T.purple, color: "#fff", border: "none", borderRadius: 12, padding: "13px 22px", fontFamily: T.sans, fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(124,111,159,0.3)" }}>
                      See Day {dayNum + 1} →
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid #E8E6F2`, borderTop: `2.5px solid ${T.purple}`, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                      <span style={{ fontFamily: T.sans, fontSize: 14, color: T.muted }}>Building your next task...</span>
                    </div>
                  )}
                </div>
              )}
              {(status === 'done' || status === 'skipped') && dayNum % 7 === 0 && dayNum <= 56 && (() => {
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
                  <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${isDone ? T.purpleMid : T.border}` }}>
                    {/* Top, week complete */}
                    <div style={{ background: isDone ? T.grad : "#F4F4F6", padding: "24px 24px 20px" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: isDone ? "rgba(255,255,255,0.5)" : T.muted, margin: "0 0 8px" }}>Week {wkNum} complete · {doneThisWeek}/7 days</p>
                      <p style={{ fontFamily: T.serif, fontSize: 22, color: isDone ? "#fff" : T.black, margin: "0 0 8px", fontWeight: 400, lineHeight: 1.3 }}>
                        {wkMilestone[wkNum] || (isDone ? `${doneThisWeek} of 7 days. That's the week.` : `${doneThisWeek} of 7. Still a week.`)}
                      </p>
                      {isDone && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px" }}>
                          <span style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>{ARCHETYPE_IDENTITY[plan.profileName] || plan.profileName}</span>
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
                        const tagColors3 = { Apply: "#BDD9C8", Read: "#BACAE8", Reflect: "#C9A090", Tool: "#9ACFC9" };
                        const order = ["Apply", "Read", "Reflect", "Tool"];
                        return (
                          <div style={{ marginTop: 16 }}>
                            <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: "0 0 6px" }}>This week's mix</p>
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
                    {nextWkTheme && wkNum < 8 && (
                      <div style={{ background: isDone ? T.purpleL : T.cream, padding: "18px 24px" }}>
                        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: isDone ? T.purple : T.muted, margin: "0 0 6px" }}>
                          {isDone ? "Next week's focus" : "Coming up next"}
                        </p>
                        <p style={{ fontFamily: T.serif, fontSize: 18, color: isDone ? T.purpleD : T.black, margin: "0 0 4px", fontWeight: 400, fontStyle: "italic" }}>{nextWkTheme}</p>
                        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>
                          {isDone
                            ? wkNum === 1 ? "Nora adapts what's next based on how this week went."
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
        // Don't show if Nora is open, modal is open, nudge dismissed, week is generating, task is generating, or celebration is showing
        if (noraOpen || weeklyCheckInOpen || arcOpen || progressOpen || nudgeDismissed || weekGenerating || generating || celebrationModal) return null;

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

        // Risk pattern 4: streak at risk — only when streak is still fragile (3-9 days)
        // Don't show if they just completed the previous day (they're actively engaged, not drifting)
        const streakAtRisk = streakCount >= 3 && streakCount <= 9 && todayUnlocked && highestUnlocked > 3 && !prevDayJustDone;

        // Pick highest-priority signal
        let nudge = null;
        if (doubleSkip) nudge = {
          headline: "Two days skipped.",
          body: "That's not a pattern yet, but it could become one. Want to talk through what's getting in the way?",
          cta: "Talk to Nora",
        };
        else if (day4Slump) nudge = {
          headline: "Day 4 is the wall most people hit.",
          body: "Not because it's harder, because the novelty's gone and the habit isn't locked yet. Nora can help you through it.",
          cta: "Talk it through",
        };
        else if (week2Drift) nudge = {
          headline: "Week 2 is where most programs stall.",
          body: "The first-week momentum has faded and the habit isn't formed yet. This is exactly the moment to check in.",
          cta: "Check in with Nora",
        };
        else if (streakAtRisk) nudge = {
          headline: `Your ${streakCount}-day streak is on the line.`,
          body: "Today's task is waiting. Even 5 minutes keeps the chain alive, Nora can help you figure out how to fit it in.",
          cta: "Talk to Nora",
        };

        if (!nudge) return null;

        return (
          <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 560, zIndex: 50, boxShadow: "0 8px 40px rgba(26,23,48,0.18)", animation: "fadeIn 0.4s ease" }}>
            <div style={{ background: "#fff", borderRadius: 20, border: `1px solid #E8E6F2`, padding: "20px 22px", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontFamily: T.serif, fontSize: 16, color: "#fff", fontStyle: "italic" }}>N</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.black, margin: "0 0 3px" }}>{nudge.headline}</p>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "0 0 12px", lineHeight: 1.55 }}>{nudge.body}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setNoraOpen(true)}
                    style={{ background: T.purple, border: "none", borderRadius: 8, padding: "8px 18px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
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
      {storageLoaded && !noraDismissed && highestUnlocked === 1 && !Object.values(Object.fromEntries(Object.entries(dayStatus))).some(s => s === 'done' || s === 'skipped') && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(10,8,20,0.75)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px",
          animation: "fadeIn 0.35s ease",
        }} onClick={e => { if (e.target === e.currentTarget) setNoraDismissed(true); }}>
          <div style={{
            width: "100%", maxWidth: 520,
            background: "linear-gradient(155deg, #1a1630 0%, #231e3d 55%, #120d26 100%)",
            borderRadius: 24,
            border: "1px solid rgba(155,143,224,0.25)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(155,143,224,0.1)",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Ambient glow */}
            <div style={{
              position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)",
              width: 400, height: 300, borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(155,143,224,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Close */}
            <button onClick={() => setNoraDismissed(true)} style={{
              position: "absolute", top: 18, right: 18,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer", lineHeight: 1,
              zIndex: 10,
            }}>✕</button>

            <div style={{ padding: "40px 40px 36px", position: "relative", zIndex: 1 }}>
              {/* Nora avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c6fd4 0%, #5a4fb5 100%)",
                  border: "2px solid rgba(155,143,224,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 20px rgba(108,96,194,0.4)",
                }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#fff", fontStyle: "italic" }}>N</span>
                </div>
                <div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(155,143,224,0.7)", margin: "0 0 3px" }}>Meet Nora</p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0, fontWeight: 300 }}>Your thinking partner</p>
                </div>
              </div>

              {/* Headline */}
              <h2 style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 26, fontWeight: 400, lineHeight: 1.25,
                color: "#fff", letterSpacing: "-0.3px",
                margin: "0 0 16px",
              }}>
                Before you start, let's make sure your plan is right for you.
              </h2>

              {/* Body */}
              <p style={{
                fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 300,
                color: "rgba(255,255,255,0.55)", lineHeight: 1.75,
                margin: "0 0 32px",
              }}>
                Your plan is built on your quiz answers. Nora can make it sharper, clarify what you actually want, adjust the direction, reshape the tasks. Two minutes now means a better program towards your goal.
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setNoraDismissed(true); setNoraGoalClarification(true); setNoraOpen(true); }}
                  style={{
                    width: "100%", background: "#fff", border: "none",
                    borderRadius: 10, padding: "14px 0",
                    fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
                    color: "#1a1630", cursor: "pointer",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.2)"; }}
                >
                  Talk to Nora first →
                </button>
                <button onClick={() => setNoraDismissed(true)}
                  style={{
                    width: "100%", background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10, padding: "13px 0",
                    fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 400,
                    color: "rgba(255,255,255,0.4)", cursor: "pointer",
                  }}>
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8-WEEK ARC MODAL ── */}
      {arcOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
          onClick={e => { if (e.target === e.currentTarget) setArcOpen(false); }}>
          <div style={{ width: "100%", maxWidth: 420, background: "#F8F7FC", borderRadius: 24, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

            {/* Header */}
            <div style={{ padding: "20px 22px 16px", background: T.grad, borderRadius: "24px 24px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <p style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 400, color: "#fff", margin: "0 0 8px", lineHeight: 1.2 }}>Goal map</p>
                {(() => {
                  const rawGoalText = plan._answers?.goal_custom || GOAL_TEXTS[plan._answers?.goal];
                  const displayGoal = (noraChangeMade && goalStatement) ? goalStatement : rawGoalText;
                  return displayGoal ? (
                    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: "0 0 3px" }}>12-month goal</p>
                      <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.4, fontStyle: "italic" }}>{displayGoal}</p>
                    </div>
                  ) : null;
                })()}
              </div>
              <button onClick={() => setArcOpen(false)} style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "rgba(255,255,255,0.6)", cursor: "pointer", flexShrink: 0 }}>✕</button>
            </div>

            {/* Scrollable map */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 40px" }}>
              {(() => {
                // 8 unique emojis — one per week, never repeating
                const WEEK_EMOJIS = ["🌱","🔍","⚡","🤝","🗺️","🚀","✨","🎯"];

                // Layout: node is 64px, container width ~380px. Left node centre ≈ 56, right ≈ 324
                const NODE_R = 32; // radius
                const LEFT_CX  = 56;
                const RIGHT_CX = 324;
                const NODE_GAP = 96; // px between node centres vertically

                return weekThemes56.map((theme, i) => {
                  const w = i + 1;
                  const wStart = i * 7 + 1;
                  const isPast = w < currentWeek;
                  const isCurr = w === currentWeek;
                  const isFut  = w > currentWeek;
                  const wDone  = Array.from({length:7},(_,j)=>wStart+j).filter(d=>dayStatus[d]==='done').length;
                  const isRight = i % 2 === 0; // even → right side, odd → left side
                  const emoji = WEEK_EMOJIS[i] || "⭐";

                  const nodeColor  = isPast ? "#6C60C2" : isCurr ? "#7c6f9f" : "#C8C4DC";
                  const nodeBg     = isPast ? "linear-gradient(135deg,#6C60C2,#8B7FD4)" : isCurr ? "linear-gradient(135deg,#7c6f9f,#9B8FD0)" : "#EDE9F8";
                  const textColor  = isFut ? T.muted : T.ink;
                  const numColor   = isPast ? "#6C60C2" : isCurr ? T.purple : T.muted;
                  const pathColor  = isPast ? "#6C60C2" : "#C8C4DC";

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
                          <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: numColor, margin: "0 0 3px", letterSpacing: 1, textTransform: "uppercase" }}>Week {w}</p>
                          <p style={{ fontFamily: T.sans, fontSize: 14, color: textColor, margin: 0, lineHeight: 1.4, fontWeight: isCurr ? 600 : 400 }}>{theme}</p>
                          {isPast && <p style={{ fontFamily: T.sans, fontSize: 12, color: "#6C60C2", margin: "4px 0 0", fontWeight: 600 }}>{wDone}/7 ✓</p>}
                          {isCurr && <p style={{ fontFamily: T.sans, fontSize: 12, color: T.purple, margin: "4px 0 0", fontWeight: 600 }}>You are here · {wDone}/7</p>}
                        </div>

                        {/* Node circle */}
                        <div style={{
                          width: 64, height: 64, borderRadius: "50%",
                          background: nodeBg,
                          border: isCurr ? `3px solid ${T.purple}` : isPast ? "3px solid #6C60C2" : `2px solid ${nodeColor}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, position: "relative", zIndex: 2,
                          boxShadow: isCurr ? `0 0 0 5px rgba(124,111,159,0.2), 0 4px 16px rgba(108,96,194,0.3)` : isPast ? "0 2px 8px rgba(108,96,194,0.2)" : "none",
                          order: isRight ? 2 : 1,
                        }}>
                          {isPast
                            ? <span style={{ fontSize: 24, color: "#fff", fontWeight: 700 }}>✓</span>
                            : <span style={{ fontSize: isCurr ? 26 : 20, filter: isFut ? "grayscale(0.5) opacity(0.5)" : "none" }}>{emoji}</span>
                          }
                        </div>
                      </div>

                      {/* SVG connector to next node */}
                      {i < weekThemes56.length - 1 && (
                        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
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

              {/* Tree destination — 12-month goal */}
              <div style={{ textAlign: "center", marginTop: 8 }}>
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
                    {/* Canopy — deep to bright, layered for lush feel */}
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
                <p style={{ fontFamily: T.serif, fontSize: 16, color: T.black, margin: "0 0 4px", fontWeight: 400 }}>12-month goal</p>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.body, margin: 0, lineHeight: 1.5, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
                  {(() => { const g = plan._answers?.goal_custom || GOAL_TEXTS[plan._answers?.goal]; return (noraChangeMade && goalStatement) ? goalStatement : g; })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRESS MODAL ── */}
      {progressOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
          onClick={e => { if (e.target === e.currentTarget) setProgressOpen(false); }}>
          <div style={{ width: "100%", maxWidth: 600, background: "#fff", borderRadius: 20, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 20px 14px", background: T.grad, borderRadius: "20px 20px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 4px" }}>Your progress</p>
                {(() => {
                  const goalTexts = GOAL_TEXTS;
                  const goalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];
                  return goalText ? <p style={{ fontFamily: T.serif, fontSize: 16, color: "#fff", margin: 0, lineHeight: 1.4, fontStyle: "italic", fontWeight: 400 }}>{goalText}</p> : null;
                })()}
              </div>
              <button onClick={() => setProgressOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "0 0 0 12px", lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 32px" }}>
              {/* ── ARCHETYPE ── */}
              {(() => {
                const tagline = ARCHETYPE_IDENTITY[plan.profileName];
                const pb = PROFILE_BASE[plan.profileName] || {};
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: T.purpleL, borderRadius: 12, border: `1px solid ${T.purpleMid}50`, marginBottom: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: pb.bg || T.purpleL, border: `1.5px solid ${pb.border || T.purpleMid}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: T.serif, fontSize: 14, color: pb.color || T.purpleD, fontStyle: "italic", fontWeight: 400 }}>{(plan.name || "").trim().charAt(0).toUpperCase() || "?"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.muted, margin: "0 0 2px", letterSpacing: 1.2, textTransform: "uppercase" }}>Your progress</p>
                      {tagline && <p style={{ fontFamily: T.sans, fontSize: 14, color: T.ink, margin: 0, lineHeight: 1.5 }}>{plan.name ? `${plan.name}, ${tagline.charAt(0).toLowerCase()}${tagline.slice(1)}` : tagline}</p>}
                    </div>
                  </div>
                );
              })()}
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
                      <div key={i} style={{ background: T.cream, borderRadius: 12, padding: "14px 12px", textAlign: "center", border: `1px solid ${T.border}` }}>
                        <p style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 400, color: T.black, margin: "0 0 2px", letterSpacing: -0.5 }}>{s.val}</p>
                        <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Acts highlight in progress modal */}
                  <div style={{ background: "linear-gradient(135deg, #1e1a2e 0%, #2d2650 100%)", borderRadius: 14, padding: "18px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16, border: "1px solid rgba(155,143,224,0.3)" }}>
                    <svg width="44" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="24" cy="27" rx="13" ry="4.5" fill="#92640a" stroke="#c8860e" strokeWidth="1"/>
                      <rect x="11" y="20" width="26" height="7" fill="#92640a"/>
                      <ellipse cx="24" cy="20" rx="13" ry="4.5" fill="#d4900f" stroke="#f0b429" strokeWidth="1"/>
                      <ellipse cx="24" cy="18" rx="13" ry="4.5" fill="#7a5208" stroke="#c8860e" strokeWidth="1"/>
                      <rect x="11" y="11" width="26" height="7" fill="#7a5208"/>
                      <ellipse cx="24" cy="11" rx="13" ry="4.5" fill="#c8860e" stroke="#f0c048" strokeWidth="1"/>
                      <ellipse cx="24" cy="9" rx="13" ry="4.5" fill="#5c3c06" stroke="#c8860e" strokeWidth="1"/>
                      <rect x="11" y="2" width="26" height="7" fill="#5c3c06"/>
                      <ellipse cx="24" cy="2" rx="13" ry="4.5" fill="#f0b429" stroke="#fad568" strokeWidth="1.5"/>
                      <ellipse cx="20" cy="1.2" rx="5" ry="1.5" fill="rgba(255,255,255,0.22)" transform="rotate(-10 20 1.2)"/>
                    </svg>
                    <div>
                      <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,180,41,0.8)", margin: "0 0 3px" }}>Total Creds</p>
                      <p style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 400, color: "#fad568", margin: 0, lineHeight: 1 }}>{cashPot} <span style={{ fontSize: 18, fontWeight: 300, opacity: 0.6 }}>Cr</span></p>
                      <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", lineHeight: 1.5 }}>Each completed day moves you forward. These add up.</p>
                    </div>
                  </div>
                  </>
                );
              })()}

              {/* ── MOVEMENT OVER TIME — BUCKETS ── */}
              {(() => {
                const doneDaysTotal = Object.values(dayStatus).filter(s => s === 'done').length;
                if (doneDaysTotal < 2) return null;

                const TAGS = ['Apply', 'Read', 'Reflect', 'Tool'];
                const TAG_COLORS   = { Apply: "#3A6B50", Read: "#3B55A0", Reflect: "#7A3D2E", Tool: "#1A6B62" };
                const TAG_FILLS    = { Apply: "#E8F4EE", Read: "#EEF2FB", Reflect: "#F5EFEB", Tool: "#EDF7F6" };
                const TAG_LABELS   = { Apply: "Apply", Read: "Read", Reflect: "Reflect", Tool: "Tool" };

                const counts = { Apply: 0, Read: 0, Reflect: 0, Tool: 0 };
                Object.entries(dayTasks).forEach(([d, t]) => {
                  if (dayStatus[d] === 'done' && t?.tag && counts[t.tag] !== undefined) counts[t.tag]++;
                });
                const maxCount = Math.max(1, ...Object.values(counts));

                return (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>Where you've been building</p>
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
                              fontFamily: T.sans, fontSize: 12, fontWeight: 600,
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
                              background: T.cream,
                              position: "relative",
                              overflow: "hidden",
                            }}>
                              {/* Liquid fill */}
                              {hasData && (
                                <div style={{
                                  position: "absolute",
                                  bottom: 0, left: 0, right: 0,
                                  height: fillH,
                                  background: `linear-gradient(180deg, ${color}40 0%, ${color}88 100%)`,
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
                              fontFamily: T.sans, fontSize: 11, fontWeight: 600,
                              color: hasData ? color : T.muted,
                              textTransform: "uppercase", letterSpacing: 0.7,
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
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>Weekly completion</p>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 64 }}>
                  {Array.from({ length: 8 }, (_, i) => {
                    const wk = i + 1;
                    const wkStart = i * 7 + 1;
                    const done = Array.from({length:7},(_,j)=>wkStart+j).filter(d=>dayStatus[d]==='done').length;
                    const isCurr = wk === currentWeek;
                    const isFut = wk > currentWeek;
                    const pct = isFut ? 0 : (done / 7);
                    return (
                      <div key={wk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", height: 48, background: T.cream, borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "flex-end", border: isCurr ? `1.5px solid ${T.purpleMid}` : "1px solid transparent" }}>
                          <div style={{ width: "100%", height: `${Math.max(pct * 100, isFut ? 0 : 4)}%`, background: isCurr ? T.purple : isFut ? "transparent" : (done >= 5 ? T.purpleD : done >= 3 ? T.purple : T.purpleMid), borderRadius: "4px 4px 0 0", transition: "height 0.4s ease", opacity: isFut ? 0.2 : 1 }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontFamily: T.sans, fontSize: 10, color: isCurr ? T.purple : T.muted, fontWeight: isCurr ? 700 : 400 }}>W{wk}</span>
                          {weeklyCheckInDone[wk] && <span style={{ fontSize: 8, color: T.purple }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── ACHIEVEMENTS ── */}
              {(() => {
                const ctx = { dayStatus, dayTasks, streakCount, noraChangeMade, noraPickDay };
                return (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>Achievements</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                      {ACHIEVEMENTS.map(a => {
                        const isEarned = a.earned(ctx);
                        return (
                          <div key={a.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "12px 14px", borderRadius: 12,
                            background: isEarned ? T.purpleL : T.cream,
                            border: `1px solid ${isEarned ? T.purpleMid : T.border}`,
                            opacity: isEarned ? 1 : 0.45,
                            transition: "opacity 0.2s",
                          }}>
                            <span style={{ fontSize: 22, flexShrink: 0, filter: isEarned ? "none" : "grayscale(1)" }}>{a.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: isEarned ? T.purpleD : T.muted, margin: "0 0 1px" }}>{a.name}</p>
                              <p style={{ fontFamily: T.sans, fontSize: 12, color: isEarned ? T.body : T.muted, margin: 0, lineHeight: 1.4 }}>{a.desc}</p>
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
                const completedDays = Array.from({length: 56}, (_, i) => i + 1)
                  .filter(d => dayStatus[d] === 'done' && dayTasks[d])
                  .slice(-8).reverse();
                if (completedDays.length === 0) return null;
                const tagColors2 = { Apply: "#3A6B50", Read: "#3B55A0", Reflect: "#7A3D2E", Tool: "#1A6B62" };
                const tagBgs2 = { Apply: "#F0F7F2", Read: "#EEF2FB", Reflect: "#F5EFEB", Tool: "#EDF7F6" };
                return (
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>What you've built</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {completedDays.map(d => {
                        const t = dayTasks[d];
                        const tc = tagColors2[t.tag] || T.purpleD;
                        const tb = tagBgs2[t.tag] || T.purpleL;
                        return (
                          <div key={d} style={{ padding: "12px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${T.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, padding: "3px 8px", background: tb, color: tc, borderRadius: 4, flexShrink: 0 }}>{t.tag}</span>
                              <span style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, flexShrink: 0 }}>Day {d}</span>
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
              const t = await generateNextDayTask(updatedPlan, d - 1, dayStatus[d-1] || 'done', dayNotes[d-1] || "", noraInsight, dayTasks, dayStatus, dayNotes);
              if (t) newTasks[d] = t;
            }
            setDayTasks(prev => ({ ...prev, ...newTasks }));
          }
          setGoalUpdating(false);
          generateGoalStatement(updatedPlan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
        };

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setShowGoalEdit(false); }}>
            <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.purple, margin: "0 0 4px" }}>12-month goal</p>
                  <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.6 }}>
                    Changing this reshapes your week arc and remaining tasks.
                  </p>
                </div>
                <button onClick={() => setShowGoalEdit(false)} style={{ background: "none", border: "none", fontSize: 20, color: T.muted, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0, marginLeft: 12 }}>×</button>
              </div>

              {/* Custom goal input */}
              <div style={{ marginBottom: 16, padding: "16px", background: T.cream, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>Write your own</p>
                <textarea
                  value={customGoalInput}
                  onChange={e => setCustomGoalInput(e.target.value)}
                  placeholder="e.g. Land a head of product role at a Series B startup by end of year…"
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.sans, fontSize: 14, color: T.black, lineHeight: 1.6, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff", marginBottom: 10 }}
                />
                <button
                  disabled={!customGoalInput.trim()}
                  onClick={() => customGoalInput.trim() && applyGoalChange(null, customGoalInput.trim())}
                  style={{ background: customGoalInput.trim() ? T.purple : "#CCC", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: customGoalInput.trim() ? "pointer" : "default" }}>
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
                        border: isCurrent ? `1.5px solid ${T.purple}` : `1.5px solid ${T.border}`,
                        background: isCurrent ? T.purpleL : "#fff",
                        borderRadius: 8, cursor: "pointer", fontFamily: T.sans,
                        fontSize: 15, color: isCurrent ? T.purpleD : T.black,
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
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.black, color: "#fff", fontFamily: T.sans, fontSize: 14, padding: "12px 20px", borderRadius: 10, zIndex: 99, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          Reshaping your remaining tasks...
        </div>
      )}
      {/* ── WEEK GENERATING BANNER ── */}
      {weekGenerating && !weeklyCheckInOpen && !isInitialWeekLoad && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.purple, color: "#fff", fontFamily: T.sans, fontSize: 14, padding: "12px 20px", borderRadius: 10, zIndex: 99, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
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
                0%, 100% { box-shadow: 0 0 40px 8px rgba(155,143,224,0.35), 0 0 0 0 rgba(155,143,224,0.15); }
                50%       { box-shadow: 0 0 80px 24px rgba(155,143,224,0.55), 0 0 0 40px rgba(155,143,224,0); }
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
                color: ["#B8AFEC","#5DCAA5","#FBBF24","#F472B6"][i],
                animation: `starSpin ${0.8 + i * 0.2}s ease-out ${i * 0.1 + 0.15}s both`,
                pointerEvents: "none",
              }}>{p}</div>
            ))}

            {/* Main card */}
            <div style={{
              width: "100%", maxWidth: 440,
              background: "linear-gradient(155deg, #1a1630 0%, #231e3d 55%, #120d26 100%)",
              borderRadius: 28,
              border: "1.5px solid rgba(155,143,224,0.35)",
              padding: "48px 36px 40px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              animation: "achievementCardIn 0.65s cubic-bezier(0.22,1,0.36,1) both, achievementGlow 2.5s ease-in-out 0.5s infinite",
            }}>
              {/* Shine sweep */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, width: "40%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                animation: "achievementShine 1.8s ease 0.5s 2",
                pointerEvents: "none",
              }} />

              {/* Ambient glow disc */}
              <div style={{
                position: "absolute", top: "-40%", left: "50%", transform: "translateX(-50%)",
                width: 360, height: 280, borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(155,143,224,0.22) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />

              {/* Icon */}
              <div style={{
                fontSize: 96, lineHeight: 1,
                marginBottom: 28,
                display: "inline-block",
                animation: "achievementIconBounce 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both",
                filter: "drop-shadow(0 4px 32px rgba(155,143,224,0.5))",
                position: "relative", zIndex: 1,
              }}>{a.icon}</div>

              {/* Label */}
              <p style={{
                fontFamily: T.sans, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "rgba(155,143,224,0.75)", margin: "0 0 10px",
                position: "relative", zIndex: 1,
              }}>Achievement Unlocked</p>

              {/* Title */}
              <h2 style={{
                fontFamily: T.serif, fontSize: 36, fontWeight: 400,
                color: "#fff", margin: "0 0 14px", lineHeight: 1.15,
                letterSpacing: "-0.5px",
                position: "relative", zIndex: 1,
              }}>{a.name}</h2>

              {/* Desc */}
              <p style={{
                fontFamily: T.sans, fontSize: 16, fontWeight: 300,
                color: "rgba(255,255,255,0.55)", lineHeight: 1.65,
                margin: "0 0 32px",
                position: "relative", zIndex: 1,
              }}>{a.desc}</p>

              {/* Divider line */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 0 20px", position: "relative", zIndex: 1 }} />

              {/* Tap to continue */}
              <p style={{
                fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.35)",
                margin: 0, letterSpacing: "0.05em",
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
        const hasNext = nextDay <= 56;
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
            background: "linear-gradient(155deg, #0e0c1f 0%, #1e1a35 55%, #0a0818 100%)",
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
                background: ["#f0b429","#B8AFEC","#5DCAA5","#F472B6","#60A5FA","#FBBF24"][i % 6],
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
                  background: "rgba(155,143,224,0.18)",
                  border: "2px solid rgba(155,143,224,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "starPop 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both",
                }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M6 14l6 6 10-12" stroke="#B8AFEC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Day done headline */}
              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(155,143,224,0.6)", margin: "0 0 8px" }}>
                Day {cm_dayNum} complete
              </p>
              <h2 style={{ fontFamily: T.serif, fontSize: 36, fontWeight: 400, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                You did it.
              </h2>

              {/* Only show streak at meaningful milestones: 3, 7, 14, 21, 30 */}
              {[3, 7, 14, 21, 30].includes(cm_streak) ? (
                <p style={{ fontFamily: T.sans, fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 20px" }}>
                  🔥 {cm_streak}-day streak
                </p>
              ) : <div style={{ height: 20 }} />}

              {/* Creds earned */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.3)", borderRadius: 12, padding: "10px 20px", marginBottom: 28 }}>
                <svg width="20" height="14" viewBox="0 0 48 32" fill="none">
                  <ellipse cx="24" cy="27" rx="13" ry="4.5" fill="#92640a" stroke="#c8860e" strokeWidth="1"/>
                  <rect x="11" y="20" width="26" height="7" fill="#92640a"/>
                  <ellipse cx="24" cy="20" rx="13" ry="4.5" fill="#d4900f" stroke="#f0b429" strokeWidth="1"/>
                  <ellipse cx="24" cy="18" rx="13" ry="4.5" fill="#7a5208" stroke="#c8860e" strokeWidth="1"/>
                  <rect x="11" y="11" width="26" height="7" fill="#7a5208"/>
                  <ellipse cx="24" cy="11" rx="13" ry="4.5" fill="#f0b429" stroke="#fad568" strokeWidth="1.5"/>
                  <ellipse cx="20" cy="10.2" rx="5" ry="1.5" fill="rgba(255,255,255,0.25)" transform="rotate(-10 20 10.2)"/>
                </svg>
                <span style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 800, color: "#fad568" }}>+{earned} Creds</span>
              </div>

              {/* Quote — bigger, more readable */}
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
                style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.28)", cursor: "pointer", padding: "4px 0" }}>
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
        const tierAccent = { Operative: "#5DCAA5", Strategist: "#B8AFEC", Senior: "#f0b429", Principal: "#F472B6" };
        const accent = tierAccent[tier] || "#B8AFEC";
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 310,
            background: "linear-gradient(155deg, #0a0818 0%, #160f28 55%, #0e0c1f 100%)",
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
                  background: `radial-gradient(circle at 38% 36%, ${accent}33 0%, ${accent}11 100%)`,
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
              <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.38)", margin: "0 0 22px", letterSpacing: 0.3 }}>
                {total} Creds earned
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
        for (let d = 1; d <= 56; d++) {
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

        const tagColors5 = { Apply: "#3A6B50", Read: "#3B55A0", Reflect: "#7A3D2E", Tool: "#1A6B62" };
        const tagBgs5   = { Apply: "#F0F7F2",  Read: "#EEF2FB",  Reflect: "#F5EFEB", Tool: "#EDF7F6" };

        // Creds breakdown by type
        const byType = log.reduce((acc, e) => { acc[e.tag] = (acc[e.tag]||0) + e.total; return acc; }, {});
        const nextMilestone = [50,100,150,200,300,500].find(m => m > cashPot) || null;

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(8,6,20,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", backdropFilter: "blur(8px)", animation: "fadeIn 0.25s ease" }}
            onClick={e => { if (e.target === e.currentTarget) setShowCredsLog(false); }}>
            <div style={{ width: "100%", maxWidth: 560, background: "linear-gradient(175deg, #1a1630 0%, #231e3d 100%)", borderRadius: 20, border: "1px solid rgba(155,143,224,0.2)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <svg width="40" height="30" viewBox="0 0 48 32" fill="none">
                    <ellipse cx="24" cy="27" rx="13" ry="4.5" fill="#92640a" stroke="#c8860e" strokeWidth="1"/>
                    <rect x="11" y="20" width="26" height="7" fill="#92640a"/>
                    <ellipse cx="24" cy="20" rx="13" ry="4.5" fill="#d4900f" stroke="#f0b429" strokeWidth="1"/>
                    <ellipse cx="24" cy="18" rx="13" ry="4.5" fill="#7a5208" stroke="#c8860e" strokeWidth="1"/>
                    <rect x="11" y="11" width="26" height="7" fill="#7a5208"/>
                    <ellipse cx="24" cy="11" rx="13" ry="4.5" fill="#c8860e" stroke="#f0c048" strokeWidth="1"/>
                    <ellipse cx="24" cy="9" rx="13" ry="4.5" fill="#5c3c06" stroke="#c8860e" strokeWidth="1"/>
                    <rect x="11" y="2" width="26" height="7" fill="#5c3c06"/>
                    <ellipse cx="24" cy="2" rx="13" ry="4.5" fill="#f0b429" stroke="#fad568" strokeWidth="1.5"/>
                    <ellipse cx="20" cy="1.2" rx="5" ry="1.5" fill="rgba(255,255,255,0.22)" transform="rotate(-10 20 1.2)"/>
                  </svg>
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(155,143,224,0.65)", margin: 0 }}>Your Creds</p>
                    <p style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 400, color: "#B8AFEC", margin: 0, lineHeight: 1.1 }}>{cashPot} <span style={{ fontSize: 16, fontWeight: 300, opacity: 0.55 }}>Cr</span></p>
                  </div>
                </div>
                <button onClick={() => setShowCredsLog(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 32px" }}>

                {/* Next milestone */}
                {nextMilestone && (
                  <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(155,143,224,0.1)", borderRadius: 12, border: "1px solid rgba(155,143,224,0.18)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>Next milestone</p>
                      <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: "#B8AFEC", margin: 0 }}>{cashPot} / {nextMilestone} Cr</p>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (cashPot / nextMilestone) * 100)}%`, background: "linear-gradient(90deg, #7B6FCC, #B0A8F0)", borderRadius: 3, transition: "width 0.5s ease" }} />
                    </div>
                    <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "6px 0 0" }}>{nextMilestone - cashPot} Cr to go</p>
                  </div>
                )}

                {/* Breakdown by task type */}
                {Object.keys(byType).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", margin: "0 0 10px" }}>How you earned them</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([tag, total]) => (
                        <div key={tag} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
                          <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, padding: "2px 7px", background: tagBgs5[tag], color: tagColors5[tag], borderRadius: 3 }}>{tag}</span>
                          <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: "#B8AFEC" }}>{total} Cr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-day log */}
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", margin: "0 0 10px" }}>
                  {log.length > 0 ? "Recent earnings" : "No Acts yet — complete your first day to start earning."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {log.slice().reverse().slice(0, 14).map(entry => (
                    <div key={entry.day} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(155,143,224,0.12)", border: "1px solid rgba(155,143,224,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: "#B8AFEC" }}>{entry.day}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.75)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.title || `Day ${entry.day} completed`}
                        </p>
                        {entry.bonus > 0 && (
                          <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(155,143,224,0.6)", margin: "2px 0 0" }}>+{entry.bonus} streak bonus</p>
                        )}
                      </div>
                      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 800, color: "#B8AFEC", margin: 0, flexShrink: 0 }}>+{entry.total}</p>
                    </div>
                  ))}
                </div>

                {log.length === 0 && (
                  <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.3)", margin: "8px 0 0", lineHeight: 1.6 }}>
                    Creds accumulate as you complete days. Tool tasks earn the most (8 Creds). Streak bonuses kick in from day 3.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── NORA MODAL ── */}
      {noraOpen && (
        <NoraChatModal
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
          noraSessionLog={noraSessionLog}
          currentDay={highestUnlocked}
          isGoalClarification={noraGoalClarification}
          onClose={() => { setNoraOpen(false); setNoraGoalClarification(false); }}
          onInsight={async (text, cmds = {}) => {
            setNoraInsight(text);
            if (cmds.slowDown) setPaceSlow(true);

            // ── Score the Nora conversation for momentum points ──
            // Fire-and-forget: ask Claude to evaluate the interaction value
            (async () => {
              try {
                const hasChange = !!(cmds.weekGoal || cmds.changeGoal !== undefined || cmds.changeGoalCustom || cmds.requestedTask || cmds.slowDown || cmds.rebuildWeek);
                const prompt = `Rate the quality of this Nora coaching interaction for a career development program. Score 1-10 based on: depth of insight shared, whether a meaningful change was made, and how much it will improve the person's program.

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
                const raw = (data.content || []).map(b => b.text || "").join("").trim();
                const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
                const pts = Math.round((parsed.score / 10) * 8); // max +8 pts from Nora
                if (pts > 0) setNoraMomentumBonus(prev => Math.min(prev + pts, 20)); // cap Nora bonus at 20 total
              } catch (e) { /* silent fail */ }
            })();

            // Helper: regenerate remaining days in the current week
            const regenRemainingDays = async (insightText) => {
              const wkStart = (currentWeek - 1) * 7 + 1;
              const remainingDays = Array.from({ length: 7 }, (_, j) => wkStart + j)
                .filter(d => d > highestUnlocked && d <= wkStart + 6);
              if (remainingDays.length === 0) return;
              setGoalUpdating(true);
              const newTasks = {};
              for (const d of remainingDays) {
                const prevStatus = dayStatus[d - 1] || 'done';
                const prevNote = dayNotes[d - 1] || "";
                const t = await generateNextDayTask(plan, d - 1, prevStatus, prevNote, insightText, dayTasks, dayStatus, dayNotes);
                if (t) newTasks[d] = t;
              }
              setDayTasks(prev => ({ ...prev, ...newTasks }));
              setGoalUpdating(false);
            };

            // Replace a specific day by number (only unlocked, not completed)
            if (cmds.replaceDayN && cmds.replaceDayTask) {
              const targetDay = cmds.replaceDayN;
              if (targetDay >= 1 && targetDay <= 56 && targetDay <= highestUnlocked && !dayStatus[targetDay]) {
                setGoalUpdating(true);
                setNoraPickDay(targetDay);
                const hint = `REPLACE DAY ${targetDay} TASK: ${cmds.replaceDayTask}. Build the task directly around this.`;
                const t = await generateNextDayTask(plan, targetDay - 1, dayStatus[targetDay - 1] || 'done', hint, text, dayTasks, dayStatus, dayNotes);
                if (t) setDayTasks(prev => ({ ...prev, [targetDay]: t }));
                setGoalUpdating(false);
              }
            }

            if (cmds.changeGoalCustom) {
              setPlanState(prev => ({ ...prev, _answers: { ...prev._answers, goal_custom: cmds.changeGoalCustom, goal_detail: undefined } }));
              setGoalUpdatedDay(highestUnlocked);
              setGoalStatement("");
              setNoraChangeMade(true);
              await regenRemainingDays(text);
              generateGoalStatement(plan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
            }

            if (cmds.rebuildWeek) {
              setGoalUpdating(true);
              const wkStart = (currentWeek - 1) * 7 + 1;
              const remainingDays = Array.from({ length: 7 }, (_, j) => wkStart + j)
                .filter(d => d >= highestUnlocked && d <= wkStart + 6 && !dayStatus[d]);
              const newTasks = {};
              for (const d of remainingDays) {
                const t = await generateNextDayTask(plan, d - 1, dayStatus[d - 1] || 'done', `REBUILD: program direction has shifted. ${text?.slice(0, 200) || ""}`, text, dayTasks, dayStatus, dayNotes);
                if (t) newTasks[d] = t;
              }
              setDayTasks(prev => ({ ...prev, ...newTasks }));
              setGoalUpdating(false);
              setNoraChangeMade(true);
            }

            if (cmds.weekGoal) {
              setWeekGoalOverride(cmds.weekGoal);
              setNoraChangeMade(true);
              await regenRemainingDays(text);
            }

            if (cmds.changeGoal !== undefined) {
              setPlanState(prev => ({ ...prev, _answers: { ...prev._answers, goal: cmds.changeGoal, goal_detail: undefined } }));
              setGoalUpdatedDay(highestUnlocked);
              setGoalStatement("");
              setNoraChangeMade(true);
              await regenRemainingDays(text);
              generateGoalStatement(plan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
            }

            // Replace TODAY's task (current unlocked, not yet completed day)
            if (cmds.replaceTodayTask) {
              const todayNum = highestUnlocked;
              if (todayNum <= 56 && !dayStatus[todayNum]) {
                setGoalUpdating(true);
                setNoraPickDay(todayNum);
                const specificHint = `REPLACE TODAY'S TASK: ${cmds.replaceTodayTask}. Build the task directly around this.`;
                const t = await generateNextDayTask(plan, todayNum - 1, dayStatus[todayNum - 1] || 'done', specificHint, text, dayTasks, dayStatus, dayNotes);
                if (t) setDayTasks(prev => ({ ...prev, [todayNum]: t }));
                setGoalUpdating(false);
              }
            }

            if (cmds.requestedTask) {
              const targetDay = dayStatus[highestUnlocked] ? highestUnlocked + 1 : highestUnlocked;
              if (targetDay <= 56) {
                setGoalUpdating(true);
                setNoraPickDay(targetDay);
                const specificHint = `SPECIFIC REQUEST: ${cmds.requestedTask}. Build the task directly around this.`;
                const t = await generateNextDayTask(plan, targetDay - 1, dayStatus[targetDay - 1] || 'done', specificHint, text, dayTasks, dayStatus, dayNotes);
                if (t) setDayTasks(prev => ({ ...prev, [targetDay]: t }));
                setGoalUpdating(false);
              }
            }

            setNoraOpen(false);

            // ── Generate and store session summary (fire-and-forget) ──
            (async () => {
              try {
                const changes = [
                  cmds.weekGoal ? `Changed weekly focus to: "${cmds.weekGoal}"` : null,
                  cmds.changeGoal !== undefined ? `Changed 12-month goal to option ${cmds.changeGoal}` : null,
                  cmds.changeGoalCustom ? `Set custom goal: "${cmds.changeGoalCustom}"` : null,
                  cmds.rebuildWeek ? `Rebuilt current week tasks` : null,
                  cmds.replaceDayN ? `Replaced Day ${cmds.replaceDayN} task: ${cmds.replaceDayTask}` : null,
                  cmds.replaceTodayTask ? `Replaced today's task: ${cmds.replaceTodayTask}` : null,
                  cmds.requestedTask ? `Requested custom task: ${cmds.requestedTask}` : null,
                  cmds.slowDown ? "Requested slower pace" : null,
                ].filter(Boolean);

                const summaryPrompt = `Summarize this Nora coaching session in 2-3 sentences. Focus on: what the person was working through, any blockers or concerns they raised, what was resolved or shifted. Be specific, this summary will inform future task generation and coaching for this person.

Session content: "${text?.slice(0, 600) || "brief exchange"}"
Program changes made: ${changes.length ? changes.join("; ") : "none"}

Write the summary in third person ("They were working on...", "They mentioned..."). Keep it under 60 words. Return only the summary text, no preamble.`;

                const res = await fetch("/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 120, messages: [{ role: "user", content: summaryPrompt }] }),
                });
                const data = await res.json();
                const summary = (data.content || []).map(b => b.text || "").join("").trim();
                if (summary) {
                  setNoraSessionLog(prev => [...prev.slice(-6), { // keep last 7 sessions
                    dayNum: highestUnlocked,
                    summary,
                    changes,
                    timestamp: new Date().toISOString(),
                  }]);
                }
              } catch (e) { /* silent fail */ }
            })();
          }}
        />
      )}

      {/* ── PAYWALL MODAL ── */}
      {!paywallBypassed && doneCount >= 2 && activeDay >= 3 && !celebrationModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "linear-gradient(155deg, #0e0c1f 0%, #1e1a35 55%, #0a0818 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "24px 16px", overflow: "auto",
        }}>
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            {/* Lock icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(155,143,224,0.12)", border: "2px solid rgba(155,143,224,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="26" height="28" viewBox="0 0 16 18" fill="none"><rect x="1" y="7" width="14" height="10" rx="2.5" stroke="#B8AFEC" strokeWidth="1.5"/><path d="M4 7V5a4 4 0 0 1 8 0v2" stroke="#B8AFEC" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
            </div>

            <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(155,143,224,0.6)", margin: "0 0 10px" }}>
              You've built momentum
            </p>
            <h2 style={{ fontFamily: T.serif, fontSize: "clamp(26px,5vw,34px)", fontWeight: 400, color: "#fff", margin: "0 0 8px", lineHeight: 1.15, letterSpacing: -0.5 }}>
              Keep it going.
            </h2>
            <p style={{ fontFamily: T.sans, fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 0 32px", lineHeight: 1.65 }}>
              You've completed 2 days. Most people stop here.<br/>The ones who don't are the ones who change.
            </p>

            {/* Pricing tiers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {/* 3-month — recommended */}
              <div style={{
                background: "rgba(155,143,224,0.12)", border: "2px solid rgba(155,143,224,0.4)",
                borderRadius: 16, padding: "20px 20px 18px", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, right: 0, background: T.purple, borderRadius: "0 14px 0 10px", padding: "5px 12px" }}>
                  <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>Most popular</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: T.sans, fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1 }}>$13.99</span>
                  <span style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>/month</span>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>3 months · $41.97 billed once</p>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.5 }}>It takes 8 weeks to build a real habit. This gives you the full runway.</p>
                <button
                  onClick={() => { /* payment integration placeholder */ }}
                  style={{ width: "100%", marginTop: 14, background: "#fff", color: T.black, border: "none", borderRadius: 10, padding: "14px 0", fontFamily: T.sans, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: -0.2 }}>
                  Start 3-month plan
                </button>
              </div>

              {/* 1-month */}
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: "18px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>$19.99</span>
                    <span style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>/month</span>
                  </div>
                  <button
                    onClick={() => { /* payment integration placeholder */ }}
                    style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 18px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Start monthly
                  </button>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "6px 0 0", lineHeight: 1.5 }}>Try it for a month. Cancel anytime.</p>
              </div>

              {/* Annual */}
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: "18px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>$8.99</span>
                    <span style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>/month</span>
                  </div>
                  <button
                    onClick={() => { /* payment integration placeholder */ }}
                    style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 18px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Start annual
                  </button>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "6px 0 0", lineHeight: 1.5 }}>
                  $107.88/year · <span style={{ color: "rgba(93,202,165,0.8)" }}>Save 55%</span> · Built to reach your 12-month goal.
                </p>
              </div>
            </div>

            {/* Beta bypass */}
            <button
              onClick={() => { setPaywallBypassed(true); }}
              style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "8px 0", transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>
              I'm a beta tester — continue for free
            </button>
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
          onComplete={(insight, cmds) => completeWeekGen(insight, cmds)}
          onSkip={() => completeWeekGen("", {})}
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
            <p style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#28243a", marginBottom: 12 }}>Something went wrong</p>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9892a8", marginBottom: 24, lineHeight: 1.6 }}>The app encountered an error. Try refreshing.</p>
            <details style={{ textAlign: "left", background: "#f9f8fc", border: "1px solid #dcdaeb", borderRadius: 6, padding: "10px 14px" }}>
              <summary style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9892a8", cursor: "pointer" }}>Error details</summary>
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
const PLAN_STORAGE_KEY = "secondact_saved_plan";

export default function SecondActApp() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const [savedPlan, setSavedPlan] = useState(null);
  const [rootLoaded, setRootLoaded] = useState(false);
  const [screen, setScreen] = useState("landing");
  const [dashboardPlan, setDashboardPlan] = useState(null);
  const [programStartDate, setProgramStartDate] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [auditTasks, setAuditTasks] = useState(null);
  const [plan, setPlan] = useState(null);

  // Load saved plan from persistent storage on mount
  useEffect(() => {
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
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      {screen === "landing" && <LandingPage onStart={() => { setScreen("quiz"); scrollTop(); }} onResume={resumeProgram} savedPlan={savedPlan} />}
      {screen === "quiz" && <QuizScreen onComplete={a => { setAnswers(a); setAuditTasks(null); setScreen("generating"); scrollTop(); }} onBack={() => { setScreen("landing"); scrollTop(); }} />}
      {screen === "generating" && answers && (
        <GeneratingScreen answers={answers} auditTasks={auditTasks} onComplete={p => { setPlan(p); setScreen("results"); scrollTop(); }} onBack={() => { setScreen("quiz"); scrollTop(); }} />
      )}
      {screen === "results" && answers && plan && <ResultsScreen plan={plan} onRestart={() => { setScreen("quiz"); setAnswers(null); setAuditTasks(null); setPlan(null); scrollTop(); }} onDashboard={(startDate) => goToDashboard(plan, startDate)} />}
      {screen === "dashboard" && dashboardPlan && <DashboardScreen plan={dashboardPlan} startDate={programStartDate} onBack={() => { if (plan) { setScreen("results"); } else { setScreen("landing"); } scrollTop(); }} />}
    </div>
    </ErrorBoundary>
  );
}