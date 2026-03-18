import React from "react";
import { useState, useEffect, useRef } from "react";

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

// ─── Persistent Storage Helper (artifact-compatible) ─────
// Uses window.storage API instead of localStorage for Claude artifact compatibility.
// All operations are async. Keys are auto-sanitized.
const Store = {
  _clean(key) {
    // Keys: no whitespace, no slashes, no quotes, under 200 chars
    return key.replace(/[\s\/\\"']/g, "").slice(0, 195);
  },
  async get(key) {
    try {
      const result = await window.storage.get(Store._clean(key));
      return result?.value ? JSON.parse(result.value) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      await window.storage.set(Store._clean(key), JSON.stringify(value));
      return true;
    } catch { return false; }
  },
  async del(key) {
    try {
      await window.storage.delete(Store._clean(key));
      return true;
    } catch { return false; }
  },
};

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

// ─── Goal texts — single source of truth ──────────────────
// Indices 0-4 match the goal question options order
const GOAL_TEXTS = [
  "Get a promotion or step into a role that's actually a level up",
  "Move to a better company, one that fits where I want to go",
  "Make a real pivot into a new field, industry, or type of work",
  "Build the skills that keep me relevant, especially as AI changes what the job requires",
  "Feel genuinely solid and confident in my job or career",
];

// Archetype identity taglines — shown on dashboard as behavioral reinforcement
const ARCHETYPE_IDENTITY = {
  "The Compounder":   "Already moving. Now it's about making sure it compounds.",
  "The Cartographer":  "Building the full picture before acting. That's the work.",
  "The Primed":  "You learn by doing. The structure is what makes it stick.",
  "The Scout":   "Mapping before committing. The clarity comes before the move.",
  "The Incumbent":  "Years of real expertise. This is about making sure it holds.",
  "The Navigator": "Thinking before moving. The plan has to be worth trusting.",
  "The Launchpad":    "Earlier than most — and that's exactly where the advantage is.",
  "The Skeptic": "Evidence first, action second. The program works the same way.",
  "The Pivot":  "Starting from where you actually are. The program meets you there.",
};

// Archetype completion lines — shown after completing a task
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
  const concern   = answers?.biggest_concern;
  const blocker   = answers?.blocker;
  const aiLevel   = answers?.ai_level ?? 1;
  const tried     = answers?.already_tried || [];
  const triedReal = tried.filter(x => x !== 5);
  const valuable  = answers?.what_feels_valuable || [];
  const learnStyle = answers?.learn_style || [];
  const sliderOutcome  = answers?.style_outcome_process   ?? 50; // <50 = action, >50 = understand
  const sliderExternal = answers?.style_external_internal ?? 50; // <50 = external, >50 = internal

  const isDeepCommitted  = false; // time question removed
  const isTimeConstrained = false; // time question removed
  const wantsFrameworks   = learnStyle.includes(4);
  const wantsHandsOn      = learnStyle.includes(1);
  const wantsExamples     = learnStyle.includes(3) || valuable.includes(4);
  const wantsStrategicView = valuable.includes(5) || valuable.includes(2);
  const wantsActionPlan   = valuable.includes(3);
  const hasTriedTools     = tried.includes(3);          // actually used tools
  const hasTriedCourses   = tried.includes(1);          // YouTube/courses
  const hasTriedMentor    = tried.includes(4);          // talked to mentor
  const wantsVisible      = isExternallyMotivated;
  const wantsPrivate      = isInternallyMotivated;
  const strongAction      = sliderOutcome < 30;         // dragged hard toward action
  const strongUnderstand  = sliderOutcome > 70;         // dragged hard toward understanding

  const profiles = {
    // ─── HIGH READINESS ──────────────────────────────────────
    "The Compounder": {
      headline: (() => {
        if (concern === 0) return `You're engaged with this and already moving. The question is whether you're building depth  - or just staying busy.`;
        if (concern === 1) return `You're ahead. The real risk now is spreading effort across too many fronts instead of going deep on the things that actually compound.`;
        if (goal === 2)    return `You're ahead of most people. That's a promotion-level advantage. Make it visible.`;
        return veteran
          ? `You're a veteran and you're already using AI. Your plan is about compounding that edge, not just maintaining it.`
          : senior
          ? `You're ahead of most people. Now it's about depth, building something that holds up, not just moving faster.`
          : `You're early in your career and already ahead on AI. Most of your peers haven't started. The question now is how to build on that, not just hold it.`;
      })(),
      description: (() => {
        if (hasTheoryGap && wantsHandsOn) return `You're engaged with this, but you can feel the gap between how often you engage and how much it's actually changed your work. You learn by doing, so your plan is built around making things, not reading about them.`;
        if (hasTheoryGap) return `You're engaged with what's changing, but you can feel the gap between familiarity and depth. The next move is going from ad hoc to systematic.`;
        if (wantsVisible) return `You've moved past awareness into action. Your plan produces output other people notice.`;
        if (wantsPrivate) return `You've moved past awareness into action. Your plan builds depth quietly. The kind that shows up in results.`;
        return `You've moved past awareness into action. The risk now is spreading thin across too many fronts. One deep capability beats five shallow ones.`;
      })(),
      entryPoint: (() => {
        if (wantsHandsOn && blocker === 3) return "Take what's already working. Make it repeatable enough to hand off.";
        if (blocker === 0 || isTimeConstrained) return "Pick the one thing that's already working. Make it faster, then shareable.";
        if (blocker === 3) return "Take the thing that's already working. Build a version that runs the same way every time.";
        if (wantsVisible) return "Pick the output that would be most useful to show someone. Build it today.";
        return "Pick the one thing that's already working. Make it twice as good.";
      })(),
      taskEmphasis: "apply",
    },

    "The Cartographer": {
      headline: (() => {
        if (concern === 5) return `You can feel the blind spots. Closing them takes building the right mental model, not just adding more inputs.`;
        if (concern === 1) return `The question is whether your model of what's happening is solid enough to navigate what's coming.`;
        return veteran
          ? `You've got the experience. What's missing is the framework. A way of thinking about what's changing that holds up as things keep evolving.`
          : `You want to understand what's happening well enough to make real decisions, not just react to whatever's new.`;
      })(),
      description: (() => {
        if (isPureNavigator && wantsStrategicView) return `You want to understand what's changing well enough to make calls that hold up. You said that was the most important thing. Your plan builds exactly that clarity.`;
        if (isPureNavigator) return `You want to understand the landscape well enough to make calls that hold up. That kind of strategic clarity is rarer than just keeping busy, and worth more.`;
        if (wantsFrameworks) return `You're building something harder to replicate than surface-level activity. The people who last aren't the fastest movers. They're the ones with the right mental model. You learn through frameworks, so your plan is built that way.`;
        if (strongUnderstand) return `You told us understanding comes first. That instinct produces something most people never develop: a mental model that holds up as things keep changing.`;
        return `Surface-level busyness doesn't interest you. The people who thrive long-term develop a durable mental model of what's actually changing. That's what you're building.`;
      })(),
      entryPoint: (() => {
        if (wantsFrameworks) return "Build the mental model first. What are the three most consequential things changing in how judgment works in your field?";
        return "Map how the landscape is changing the judgment layer of your work. Start there, not with the execution layer.";
      })(),
      taskEmphasis: "read",
    },

    // ─── MEDIUM READINESS ────────────────────────────────────
    "The Primed": {
      headline: (() => {
        if (hasTheoryGap) return `You've read the articles. Watched the videos. You know what's happening. What's missing is a system that converts that awareness into daily practice.`;
        if (isFrustrated) return `You've tried things and none of them stuck. It's a structure problem, not a motivation one. Your plan works differently.`;
        if (concern === 0) return `The gap between knowing what to do and actually doing it is exactly where you are. The tasks below close it fast.`;
        if (blocker === 2) return `You've started before and lost the thread. Every task below has a clear endpoint. You'll know when it's done.`;
        return senior
          ? `You've built years of expertise. The missing piece isn't more reading. It's a system that turns awareness into practice.`
          : `You know what matters and what's changing. The gap isn't motivation. The right structure for turning that into practice hasn't appeared yet.`;
      })(),
      description: (() => {
        if (hasTheoryGap && hasTriedCourses) return `You've done the courses and read the threads. You know more than most. The gap is that you haven't found a use case that made it feel real. Your plan fixes that. Everything is applied to work that actually matters to you.`;
        if (hasTheoryGap) return `You've built up more awareness than practice. The move from knowing to doing is almost entirely a structure problem. Your plan is built around application.`;
        if (isFrustrated && hasTriedTools) return `You've actually tried things, so you know this isn't about effort. The people who break through stopped sampling and went deep on one area. Your plan does that.`;
        if (isFrustrated) return `Your awareness is solid. What's missing is a system that sticks. The people who make real progress found one thing and went deep. Your plan does that.`;
        if (wantsExamples) return `A few things have clicked, but nothing has fully stuck. You learn best from real examples, so your plan is built around concrete situations from your field, not generic how-tos.`;
        return `You've read, tried things, had conversations about it. The problem isn't that you don't care. Nothing has stuck yet. Awareness without structure fades. Your plan fixes that.`;
      })(),
      entryPoint: (() => {
        if (blocker === 0 || isTimeConstrained) return "Five minutes. One tool. One real task. That's enough.";
        if (blocker === 2) return "Pick one task. Set a timer. Stop when it's done.";
        if (blocker === 3) return "Skip the reading. Do one real thing today.";
        if (wantsHandsOn)  return "Open it up. Do one real thing. Skip the tutorial.";
        return "One tool. One real task. Fifteen minutes.";
      })(),
      taskEmphasis: "apply",
    },

    "The Scout": {
      headline: (() => {
        if (concern === 5) return `Blind spots bother you more than the tools. A map closes them faster than any tutorial.`;
        if (concern === 1) return `You want to know which parts of your work are actually exposed before you decide where to move. Your plan starts there.`;
        if (goal === 3)    return `You want to build something new, not just protect what you have. The first step is understanding what's actually changed.`;
        return senior
          ? `You've built real expertise. Before you move, you need to understand what you're moving toward, not just that it matters.`
          : `You know something important is happening. You want to understand it well enough to choose how to engage, not just react.`;
      })(),
      description: (() => {
        if (blocker === 4 && wantsStrategicView) return `Effort isn't the issue. Signal is. You said you want to understand what's happening well enough to make real decisions. Your plan builds that filter. Every task closes a specific knowledge gap.`;
        if (blocker === 4) return `Effort isn't the issue. Signal is. Knowing what's worth learning is harder than learning it. Your plan filters that. Everything here is chosen for a specific reason.`;
        if (blocker === 1) return `You've felt the overwhelm. Too much information, no clear map. That's a curation problem, not a knowledge one. Your plan cuts through it and gives you a sequence.`;
        if (wantsExamples) return `You want to see how people in your field are actually navigating this before you decide where you fit. Your plan is built around real examples, not thought leadership.`;
        if (wantsFrameworks) return `You want a framework before you commit to a direction. That instinct is an asset. Your plan gives you the mental model first, then the moves.`;
        return `You need a clear picture before you can act with confidence. That instinct is an asset. Your plan builds the map.`;
      })(),
      entryPoint: (() => {
        if (wantsExamples) return "Find three real examples of how people in your field are navigating this. Understand one before you try anything.";
        if (blocker === 1) return "One frame, not twenty articles. Understand the shape of what's happening, then decide where you fit.";
        if (wantsFrameworks) return "Build the map before you move. Start with what's actually changing in your specific field.";
        return "Start with the landscape. Understand what's actually happening in your field before you decide where to move.";
      })(),
      taskEmphasis: "read",
    },

    "The Incumbent": {
      headline: (() => {
        if (isCredibilityDefender) return `You've built something real. Credibility that took years. Your job right now is knowing which parts of that are protected, and which parts need active work.`;
        if (concern === 1)         return `You want to know which parts of your work are actually at risk. That's the right question. It has a more specific answer than anything you've read so far.`;
        if (concern === 4)         return `Younger people move faster. That's real. But they don't have your context, your judgment, or your network. The question is how to make sure that combination is visible.`;
        if (isAnxietyDriven)       return `The anxiety is real and it's tracking something real. The gap between where you are and where you need to be has a specific size. Your plan makes it concrete.`;
        return senior
          ? `You've spent years building expertise that genuinely can't be replaced. Your plan maps exactly which parts are protected and which parts need active reinforcing.`
          : `You've built real skills. Things are changing in your field. The uncertainty isn't whether it matters. It's not knowing which parts of what you've built are safe.`;
      })(),
      description: (() => {
        if (isCredibilityDefender && hasTriedMentor) return `You've already talked to someone you trust about this. You're waiting for a more specific answer than you got. Your plan goes there: exactly what's changing in your work, and what isn't.`;
        if (isCredibilityDefender) return `Your professional credibility is a real asset. The move isn't to become something different. It's to understand what's changing well enough to position what you've built as more valuable, not less.`;
        if (isAnxietyDriven && wantsActionPlan) return `The anxiety is tracking something real. You said you want a clear weekly plan, not vague advice. Your plan is concrete: specific things, in order, with a clear end.`;
        if (isAnxietyDriven)       return `The anxiety is tracking something real. The feeling of being behind and the actual gap are two different things. Your plan makes the gap specific, because specific is always smaller than vague.`;
        if (wantsStrategicView)    return `You're careful, not resistant. You want to understand how your role is actually changing before you decide what to do about it. That's the right order.`;
        return `You're careful, not resistant. You've invested years into expertise that has real value, and you need to know which parts are protected. That's due diligence.`;
      })(),
      entryPoint: (() => {
        if (isCredibilityDefender) return "Identify the three things you do that technology can support but can't replace. Build there first.";
        if (wantsExamples)         return "Find one example of change in your field that worked well for someone at your level of experience. Study what they actually did.";
        return "Name three things you do that no one could walk in and replicate without years of context. Then test that claim.";
      })(),
      taskEmphasis: "reflect",
    },

    "The Navigator": {
      headline: (() => {
        if (isPureNavigator) return `The decisions that matter aren't about tools or tactics. They're about judgment. Which bets to make, which risks to flag, what to own. Your plan builds that clarity.`;
        if (concern === 5)   return `You're aware something structural is missing. The plan below closes the biggest blind spots first.`;
        if (blocker === 1)   return `Everything feels like a flood right now. Your plan gives you a frame that makes it navigable.`;
        return senior
          ? `You don't need to become an expert in everything. You need to understand what's changing well enough to make the calls your role requires.`
          : `Change is creating decisions that didn't exist before. Your job isn't to master everything. It's to know how to think through them.`;
      })(),
      description: (() => {
        if (isPureNavigator && wantsFrameworks) return `You're navigating something genuinely complex. You said you learn through frameworks. Your plan is built that way: model-first, not one tactic at a time. You get the structure to make sense of what's changing before you decide what to do.`;
        if (isPureNavigator) return `You're navigating something genuinely complex. The people who do this well built a clear model of what's changing and why. They didn't just try everything. That's what your plan builds.`;
        if (blocker === 4 && wantsStrategicView) return `You have motivation. What you're missing is a filter and a frame. You said you want to understand what's happening well enough to make real decisions. Your plan builds both.`;
        if (blocker === 4)   return `You have motivation. What you're missing is a filter. Knowing what's actually worth your attention is harder than getting started. Your plan is that filter, already applied.`;
        if (hasTriedMentor)  return `You've already sought out perspectives on this. That counts for something. Navigating change well isn't about doing more. It's about building the model that lets you make the right calls. Your plan builds that model.`;
        return `You need a working model of what's changing in your field: what it means for how decisions get made, where the risk is, where the opportunity is. Your plan builds that clarity.`;
      })(),
      entryPoint: (() => {
        if (wantsFrameworks) return "Build the strategic frame first. What is actually changing in your field, and what decisions does that create for you?";
        return "Get the strategic picture first. Then decide which part requires your attention.";
      })(),
      taskEmphasis: "read",
    },

    // ─── LOW READINESS ───────────────────────────────────────
    "The Launchpad": {
      headline: (() => {
        if (isHighCommitmentBeginner) return `You've got the time and the intention. What's been missing is an entry point that connects to your actual work. Your plan is that entry point.`;
        if (concern === 0)            return `The gap between looking behind and being ahead is smaller than it looks. Your plan creates visible movement fast.`;
        if (concern === 2)            return `The things everyone's talking about aren't as complicated as they seem. One focused session changes your relationship with all of it.`;
        if (blocker === 2)            return `You've started things before and lost momentum. Every task below has a clear end. Something done, not something to maintain.`;
        return senior
          ? `The gap between where you are and where you need to be is smaller than it looks. It just needs a real first step.`
          : `The gap feels huge. It isn't. You haven't had a starting point that connects to your actual work. That's all this is.`;
      })(),
      description: (() => {
        if (isHighCommitmentBeginner && wantsHandsOn) return `You're starting with more than most people do: time and a preference for learning by doing. Start doing something. The understanding follows the practice.`;
        if (isHighCommitmentBeginner) return `You're starting with more than most: time and genuine intent. That combination moves fast once it has direction. Your plan gives you that.`;
        if (blocker === 1)            return `You've felt the overwhelm. The sheer volume of things you could be doing about this. Your plan ignores most of it. There are three things that matter right now. Everything else can wait.`;
        if (wantsActionPlan)          return `You've been watching this from a distance. You sense it matters. You feel the pressure. You said you wanted a clear weekly plan, not inspiration. That's exactly what this is.`;
        if (strongAction)             return `You've been watching this from a distance. You told us you want to act, not read. Your plan skips the theory. It starts with one thing you can do today.`;
        return `You've been watching this from a distance. Reading about it, sensing it matters, feeling the pressure. You haven't found an entry point that clicks. Your plan doesn't start with theory. It starts with one thing you can actually do.`;
      })(),
      entryPoint: (() => {
        if (isHighCommitmentBeginner && wantsHandsOn) return "Start with one real thing. Read about it later.";
        if (isHighCommitmentBeginner) return "You have more time than most people starting out. Use it today.";
        if (isTimeConstrained)        return "Five minutes is enough. Pick one thing and start.";
        if (wantsActionPlan)          return "Task 1 is below. Start there. Everything else follows.";
        return "One small thing. Done. That's the whole game today.";
      })(),
      taskEmphasis: "apply",
    },

    "The Skeptic": {
      headline: (() => {
        if (concern === 5)   return `The blind spots are real. Closing them means understanding the actual shape of what's changing first, before you decide where to move.`;
        if (concern === 1)   return `Before you move, you want to know what you're moving toward. That's the right instinct, as long as it leads somewhere.`;
        if (blocker === 4)   return `The signal-to-noise problem is real. Your plan cuts through it by giving you the right frame first, not more to consume.`;
        if (isDeepCommitted) return `You've got the time to understand this properly. Most people are moving fast without a map. You don't have to.`;
        return senior
          ? `You haven't moved yet because you haven't seen how this applies to your field in a way that's honest about the nuance. That's a reasonable position to be in.`
          : `You're waiting to understand what's happening well enough that your first moves feel intentional. That's a good instinct, as long as it leads somewhere.`;
      })(),
      description: (() => {
        if (wantsFrameworks && strongUnderstand) return `You process things by understanding them first. You told us you dragged all the way toward 'understand first' and that frameworks are how you learn. Your plan honours that. No rushing until you have the right model.`;
        if (wantsFrameworks) return `You process things by understanding them first. You learn through frameworks, so your plan leads with mental models before it asks you to do anything.`;
        if (wantsExamples)   return `You process things by understanding them first, but not abstractly. You want to see real examples from your field before you commit to a direction. Your plan gives you those, sequenced from most to least relevant.`;
        return `You process things by understanding them first. The problem is that most advice is written for people who want quick wins. Your plan gives you the context to move with confidence, not just urgency.`;
      })(),
      entryPoint: (() => {
        if (wantsFrameworks) return "Start with the mental model. What is actually changing in your field? Get that clear before you decide where to move.";
        if (wantsExamples)   return "Find one real example of how someone in your field is navigating this. Read it fully. That's day one.";
        if (blocker === 4)   return "One clear frame for what's actually changing in your field. A map, not a move.";
        return "Start by understanding what's actually changing in your field. Specifics, not headlines.";
      })(),
      taskEmphasis: "read",
    },

    "The Pivot": {
      headline: (() => {
        if (isFrustrated)    return `You've tried things and nothing landed. That's not a you problem. Most of what's out there isn't built for someone who does what you do. Your plan is.`;
        if (isAnxietyDriven) return `The pressure to adapt is real. So is your skepticism. Your plan doesn't ask you to buy in. It asks you to look at one specific thing and decide for yourself.`;
        if (concern === 3)   return `Your credibility took years to build. Your plan starts with evidence, not enthusiasm  - because that's the only kind of argument worth your time.`;
        return veteran
          ? `You've seen enough hype cycles to know better than to chase every new thing. Your plan doesn't ask you to buy in. It asks you to look at one specific thing and decide for yourself.`
          : `You're resistant to hype, not to AI. Your plan is built around your actual work, not a hypothetical professional who does something vaguely similar.`;
      })(),
      description: (() => {
        if (isFrustrated && hasTriedTools) return `You've actually tried things. That separates you from people who haven't started. The problem isn't effort. Nothing was specific enough to your actual work. Your plan starts with your tasks, not generic use cases.`;
        if (isFrustrated) return `You've tried things and they didn't click. The problem wasn't your effort. The format wasn't built for your actual work. Your plan is.`;
        if (isAnxietyDriven) return `The anxiety you're feeling is real. But forcing enthusiasm you don't have won't help. Find one thing that's genuinely relevant to your work, and let that be the starting point.`;
        if (wantsExamples) return `You're resistant to content that isn't relevant to you. You learn from real examples. Your plan is built around actual situations from your field  - what people like you are doing, and what's actually working.`;
        if (hasTriedCourses && hasTriedMentor) return `You've tried to get traction more than once. Courses, conversations. It still hasn't clicked for your field specifically. The problem isn't you. Every source was written for a generic professional. Your plan was written for you.`;
        return `Every article, every newsletter, every piece of advice has felt generic. Written for a hypothetical professional, not for someone who does what you do. Your skepticism is earned. Your plan starts with your specific work and builds from there.`;
      })(),
      entryPoint: (() => {
        if (isFrustrated)  return "One thing that's different from everything you've tried. That's all.";
        if (wantsExamples) return `Find one person navigating something like your situation in a way that would have been useful to you six months ago. Study what they actually did.`;
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
  const tried      = answers.already_tried    || [];
  const valuable   = answers.what_feels_valuable || [];
  const learnStyle = answers.learn_style      || [];
  const triedReal  = tried.filter(x => x !== 5); // 5 = "nothing yet"

  // ── New: career situation + urgency axes (Change 1) ──────────────────────
  const careerSituation = answers.career_situation ?? -1;
  const urgencyTrigger  = answers.urgency         ?? -1;
  // career_situation: 0=anxious/doing-well, 1=stuck, 2=looking, 3=displaced, 4=successful-worried, 5=growth-track
  // urgency: 0=AI field change, 1=peers advancing, 2=layoff/restructure, 3=review/promotion, 4=drifting, 5=all
  const isInTransition   = careerSituation === 3;                     // recently displaced
  const isStagnating     = careerSituation === 1;                     // stuck at same level too long
  const isHighPerformerFear = careerSituation === 4;                  // successful but quietly afraid
  const isBuildingToward = careerSituation === 5;                     // doing well, wants to accelerate (growth track)
  const isUrgencyLayoff  = urgencyTrigger  === 2;                     // layoff/restructure trigger
  const isUrgencyPromotion = urgencyTrigger === 3;                    // review/promotion pressure
  const isUrgencyDrift   = urgencyTrigger  === 4;                     // drifting, want intentionality

  // ══════════════════════════════════════════════════════════
  // AXIS 1: READINESS
  // How far along are they actually , behavior over self-report
  // ══════════════════════════════════════════════════════════
  let readiness = 0;

  // Q3: AI level , primary self-report (0/30/60/90)
  readiness += [0, 30, 60, 90][answers.ai_level] ?? 0;

  // Q10: already_tried , behavioral evidence, weighted by effort level
  if (triedReal.length > 0) readiness += Math.min(triedReal.length * 6, 24);
  if (tried.includes(3)) readiness += 14; // actually used tools , highest signal
  if (tried.includes(1)) readiness += 6;  // YouTube/courses , intentional consumption
  if (tried.includes(4)) readiness += 4;  // talked to mentor , actively seeking
  if (tried.includes(2)) readiness += 3;  // attended conference , committed enough to show up
  if (tried.includes(0)) readiness += 2;  // newsletters , passive but engaged

  // Q4: what_feels_valuable , engagement depth signal
  if (valuable.length >= 3) readiness += 8;   // actively thinking across dimensions
  if (valuable.includes(3)) readiness += 6;   // "clear weekly plan" → ready to act now
  if (valuable.includes(0)) readiness += 3;   // "which tools matter" → tool-aware

  // Q12: time commitment , intent signal
  // High time commitment at low AI level = motivated beginner → boost
  // Very low time at very low AI = low commitment → small penalty
  // time question removed; readiness no longer modulated by stated time

  // Q2: seniority × AI level , being senior with no AI usage means further behind
  if (answers.seniority >= 2 && answers.ai_level <= 1) readiness -= 12;
  if (answers.seniority >= 3 && answers.ai_level === 0) readiness -= 8;

  const readinessLevel = readiness >= 120 ? "high" : readiness >= 50 ? "medium" : "low";

  // ══════════════════════════════════════════════════════════
  // AXIS 2: ORIENTATION
  // What are they trying to accomplish?
  // optimizer = grow/advance | protector = defend | navigator = lead/understand
  // ══════════════════════════════════════════════════════════
  let optScore = 0, protScore = 0, navScore = 0;

  // Q7: goal , strongest orientation signal
  const goalMap = {
    0: { opt: 3, prot: 0, nav: 1 }, // be the go-to → optimizer
    1: { opt: 0, prot: 5, nav: 0 }, // protect current role → strong protector
    2: { opt: 5, prot: 0, nav: 0 }, // get promoted → strong optimizer
    3: { opt: 2, prot: 0, nav: 2 }, // new skills → optimizer + navigator
    4: { opt: 0, prot: 3, nav: 1 }, // feel confident → protector-leaning
    5: { opt: 0, prot: 0, nav: 5 }, // decisions for team → strong navigator
  };
  const g = goalMap[answers.goal] || { opt: 0, prot: 0, nav: 0 };
  optScore += g.opt; protScore += g.prot; navScore += g.nav;

  // Q6: biggest concern , confirms or cross-cuts goal
  const fearMap = {
    0: { opt: 2, prot: 1, nav: 0 }, // seen as behind → visible wins → optimizer
    1: { opt: 0, prot: 4, nav: 1 }, // role at risk → strong protector
    2: { opt: 2, prot: 0, nav: 1 }, // don't understand tools → optimizer/nav
    3: { opt: 0, prot: 5, nav: 0 }, // credibility erosion → strong protector
    4: { opt: 1, prot: 2, nav: 0 }, // younger people faster → protector
    5: { opt: 0, prot: 1, nav: 3 }, // blind spots → navigator
  };
  const f = fearMap[answers.biggest_concern] || { opt: 0, prot: 0, nav: 0 };
  optScore += f.opt; protScore += f.prot; navScore += f.nav;

  // Q9: blocker , behavioral orientation signal
  const blockerMap = {
    0: { opt: 1, prot: 1, nav: 0 }, // time → neutral
    1: { opt: 0, prot: 0, nav: 3 }, // overwhelm → navigator (needs map first)
    2: { opt: 3, prot: 0, nav: 0 }, // can't follow through → optimizer (needs action)
    3: { opt: 3, prot: 0, nav: 0 }, // learns but doesn't apply → optimizer (wants practice)
    4: { opt: 0, prot: 1, nav: 3 }, // don't know what's worth it → navigator
  };
  const b = blockerMap[answers.blocker] || { opt: 0, prot: 0, nav: 0 };
  optScore += b.opt; protScore += b.prot; navScore += b.nav;

  // Q4: what_feels_valuable , secondary orientation (0.5x weight)
  const valuableOrientMap = {
    0: { opt: 1, prot: 0, nav: 1 }, // which tools matter
    1: { opt: 2, prot: 0, nav: 0 }, // skills to build
    2: { opt: 0, prot: 1, nav: 2 }, // how role might change → protective/nav
    3: { opt: 2, prot: 0, nav: 0 }, // clear weekly plan → action-seeker
    4: { opt: 1, prot: 0, nav: 1 }, // examples from field
    5: { opt: 0, prot: 0, nav: 3 }, // understand to make decisions → navigator
  };
  valuable.forEach(v => {
    const vm = valuableOrientMap[v] || { opt: 0, prot: 0, nav: 0 };
    optScore += vm.opt * 0.5; protScore += vm.prot * 0.5; navScore += vm.nav * 0.5;
  });

  // Q11: learn_style , tertiary orientation signal
  if (learnStyle.includes(5)) navScore += 1;       // reflecting → self-aware, navigator tendency
  if (learnStyle.includes(4)) navScore += 1.5;     // frameworks → strategic thinker
  if (learnStyle.includes(3)) navScore += 1;        // industry examples → context-seeker
  if (learnStyle.includes(1)) optScore += 1;        // hands-on → optimizer
  if (learnStyle.includes(2)) optScore += 0.5;      // summaries → efficiency → optimizer

  // Q10: already_tried specific signals
  if (tried.includes(4)) navScore += 0.5;           // talked to mentor → seeks guidance
  if (tried.includes(0)) navScore += 0.5;           // newsletters → passive intake → nav tendency

  // Q1: role , structural orientation by field
  // Some roles have embedded protector or navigator psychology regardless of individual answers
  const roleOrientMap = {
    0:  { opt: 1,   prot: 0,   nav: 0   }, // software → optimizer by default
    1:  { opt: 1,   prot: 0,   nav: 0.5 }, // data → optimizer + light nav
    2:  { opt: 0,   prot: 1.5, nav: 0.5 }, // finance → protector (risk-trained) + nav
    3:  { opt: 1,   prot: 0,   nav: 0   }, // marketing → optimizer
    4:  { opt: 0,   prot: 2,   nav: 0.5 }, // legal → strong protector (professional caution)
    5:  { opt: 0.5, prot: 0,   nav: 1   }, // ops/strategy → navigator
    6:  { opt: 1,   prot: 0,   nav: 0.5 }, // design/product → optimizer + nav
    7:  { opt: 0,   prot: 0.5, nav: 1.5 }, // HR → navigator (people decisions)
    8:  { opt: 1.5, prot: 0,   nav: 0   }, // sales → strong optimizer
    9:  { opt: 0,   prot: 1.5, nav: 1   }, // healthcare → protector (professional caution)
    10: { opt: 0,   prot: 0.5, nav: 1.5 }, // education → navigator (frameworks, systems)
    11: { opt: 0,   prot: 0,   nav: 2   }, // exec/other → navigator (strategic decisions)
  };
  const r = roleOrientMap[answers.role] || { opt: 0, prot: 0, nav: 0 };
  optScore += r.opt; protScore += r.prot; navScore += r.nav;

  // Q2: seniority nudge , veterans default toward protecting what they've built
  if (answers.seniority >= 3) protScore += 2;
  if (answers.seniority <= 1) optScore += 1;

  const orientation = optScore >= protScore && optScore >= navScore ? "optimizer"
    : protScore >= navScore ? "protector" : "navigator";

  // ══════════════════════════════════════════════════════════
  // AXIS 3: APPROACH STYLE , action vs. understanding
  // Sources: Q5 slider (primary), Q8 slider, Q11 learn_style, Q10 tried pattern
  // ══════════════════════════════════════════════════════════
  const sliderOutcome  = answers.style_outcome_process   ?? 50;
  const sliderExternal = answers.style_external_internal ?? 50;
  const isExternallyMotivated = sliderExternal < 50;
  const isInternallyMotivated = sliderExternal > 50;

  let actionSignal = 0, understandSignal = 0;

  // Q5 slider , primary signal (stronger weight toward extremes)
  if      (sliderOutcome < 25) actionSignal     += 5;
  else if (sliderOutcome < 40) actionSignal     += 3;
  else if (sliderOutcome < 50) actionSignal     += 1;
  if      (sliderOutcome > 75) understandSignal += 5;
  else if (sliderOutcome > 60) understandSignal += 3;
  else if (sliderOutcome > 50) understandSignal += 1;

  // Q11: learn_style , confirms or cross-cuts slider
  if (learnStyle.includes(1)) actionSignal     += 2; // hands-on
  if (learnStyle.includes(2)) actionSignal     += 1; // summaries/no fluff
  if (learnStyle.includes(4)) understandSignal += 2; // frameworks
  if (learnStyle.includes(0)) understandSignal += 1; // reading articles
  if (learnStyle.includes(5)) understandSignal += 1; // reflecting
  if (learnStyle.includes(3)) understandSignal += 1; // industry examples (wants context)

  // Q10: tried pattern , "tried lots, still stuck" = pragmatic, not understanding-seeker
  if (triedReal.length >= 3 && answers.ai_level <= 1) actionSignal += 2; // frustrated → needs action, not more reading

  // time question removed

  const approachStyle = actionSignal > understandSignal + 1 ? "action"
    : understandSignal > actionSignal + 1 ? "understanding" : "balanced";

  const isActionOriented       = approachStyle === "action";
  const isUnderstandingOriented = approachStyle === "understanding";
  const isOutcomeOriented = sliderOutcome < 50;
  const isProcessOriented = sliderOutcome > 50;

  // ══════════════════════════════════════════════════════════
  // PATTERN DETECTION , cross-answer combinations
  // These detect behavioral archetypes that single-axis scoring misses
  // ══════════════════════════════════════════════════════════

  // Frustration pattern: tried many approaches, still at low AI level
  // → These are not Researchers (patient) , they're stuck and need something different
  const isFrustrated = triedReal.length >= 3 && answers.ai_level <= 1;

  // Anxiety-driven: concern = younger people moving faster, goal = feel confident
  // → Pure protector regardless of optimizer score
  const isAnxietyDriven = answers.biggest_concern === 4 && answers.goal === 4;

  // Pure navigator: wants strategic decisions AND blind spots are the concern
  // → Amplify nav, override weak signals
  const isPureNavigator = false; // goal 5 removed

  // Theory-practice gap: learns but doesn't apply, AND has tried courses/newsletters
  // → Strong Activator signal even if understanding-oriented
  const hasTheoryGap = answers.blocker === 3 && (tried.includes(0) || tried.includes(1));

  // High-commitment beginner: picks 30+ min per day at AI level 0 or 1
  const isHighCommitmentBeginner = answers.ai_level <= 1; // time question removed; now means any beginner

  // Credibility defender: concern = credibility erosion + senior
  const isCredibilityDefender = answers.biggest_concern === 3 && answers.seniority >= 2;

  // ══════════════════════════════════════════════════════════
  // PROFILE ASSIGNMENT
  // Priority: pattern overrides → 3-axis matrix
  // ══════════════════════════════════════════════════════════
  let profileName;

  if (readinessLevel === "high") {
    // Already using AI , question is how they want to go deeper
    if (isUnderstandingOriented && !isExternallyMotivated) {
      profileName = "The Cartographer"; // Fluent, wants systems and strategic depth quietly
    } else if (orientation === "navigator" && !isActionOriented) {
      profileName = "The Cartographer"; // Navigators at high readiness want frameworks not speed
    } else {
      profileName = "The Compounder";  // Fluent, wants to compound, build, and ship
    }

  } else if (readinessLevel === "medium") {
    if (isCredibilityDefender || (orientation === "protector" && answers.seniority >= 2)) {
      profileName = "The Incumbent";   // Senior + protecting expertise they've built
    } else if (orientation === "protector") {
      profileName = "The Incumbent";   // Any protector at medium readiness
    } else if (isPureNavigator || orientation === "navigator") {
      profileName = "The Navigator";  // Needs the big picture to act or lead
    } else if (hasTheoryGap || (isActionOriented && !isUnderstandingOriented)) {
      profileName = "The Primed";   // Optimizer who needs action, not more reading
    } else if (isUnderstandingOriented) {
      profileName = "The Scout";    // Optimizer who needs the map before moving
    } else {
      profileName = "The Primed";   // Default medium optimizer
    }

  } else {
    // low readiness
    if (isFrustrated) {
      // Tried a lot, still stuck , this is a different problem than "haven't started"
      profileName = orientation === "protector" ? "The Pivot" : "The Pivot";
    } else if (isAnxietyDriven || (orientation === "protector" && answers.seniority >= 2)) {
      profileName = "The Pivot";     // Protector + anxiety = needs credibility not tools
    } else if (isHighCommitmentBeginner && isActionOriented) {
      profileName = "The Launchpad";     // Motivated, just needs the first move
    } else if (isUnderstandingOriented && orientation !== "protector") {
      profileName = "The Skeptic";  // Hasn't started , needs context before moving
    } else if (orientation === "protector") {
      profileName = "The Pivot";     // Protector at low readiness = nothing felt relevant
    } else {
      profileName = "The Launchpad";     // Gap feels huge, willing to move with a nudge
    }
  }

  // ── DERIVED LABELS ──────────────────────────────────────
  const ultimateWhyFromGoal = [
    "be the person your team turns to on this",
    "know your career is protected",
    "open doors that aren't open to you yet",
    "have real options you don't have right now",
    "feel confident again , not faking it, actually solid",
    "have the clarity to make better calls for the people you lead",
  ];
  const ultimateWhy = ultimateWhyFromGoal[answers.goal] || "";

  let behavioralStyle;
  if      (isOutcomeOriented && isExternallyMotivated) behavioralStyle = "visible-doer";
  else if (isOutcomeOriented && isInternallyMotivated) behavioralStyle = "quiet-doer";
  else if (isProcessOriented && isExternallyMotivated) behavioralStyle = "visible-thinker";
  else if (isProcessOriented && isInternallyMotivated) behavioralStyle = "quiet-thinker";
  else behavioralStyle = "balanced";

  const readinessChip = readinessLevel === "high"   ? "High readiness"
    : readinessLevel === "medium" ? "Medium readiness"
    : "Early stage";

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
    // career situation signals (Change 1)
    careerSituation, urgencyTrigger,
    isInTransition, isStagnating, isHighPerformerFear, isBuildingToward,
    isUrgencyLayoff, isUrgencyPromotion, isUrgencyDrift,
    ultimateWhy, readinessChip, styleChip,
  };
}

// ════════════════════════════════════════════════════════════
// QUESTIONS , 12 total, reordered for psychological arc
// (Change #1: removed daily_want, format; already_tried restored)
// (Change #2: reordered , sliders at 5 and 8 for peak engagement)
// (Change #3: fear reframed as agency)
// Arc: Facts → Identity → Emotions → Commitment
// ════════════════════════════════════════════════════════════
const questions = [
  {
    id: "name", label: "1 of 12",
    text: "What's your first name?",
    sub: "Just your first name is fine.",
    type: "text",
    placeholder: "First name",
  },
  // ── BLOCK 1: Facts ──
  {
    id: "role", label: "2 of 12",
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
    id: "seniority", label: "3 of 12",
    text: "Which of these best describes where you are right now?",
    sub: "Not how long you've been working — where you actually sit.",
    type: "single",
    options: [
      { text: "Early career — building the foundations", sub: "Still developing core skills and figuring out the landscape" },
      { text: "Established — capable and growing", sub: "Solid contributor, starting to develop a point of view" },
      { text: "Senior — domain expert, leading or influencing others", sub: "Known for what you do, responsible for more than just your own output" },
      { text: "Leadership — running a team or function", sub: "Accountable for people, outcomes, and direction" },
      { text: "Executive — setting direction, not just executing", sub: "Strategic decisions, org-level accountability" },
    ],
  },
  {
    id: "learn_style", label: "4 of 12",
    text: "How do you learn best?",
    sub: "Select all that apply. Your daily tasks will lean toward these formats.",
    type: "multi",
    options: [
      { text: "Reading articles or reports" },
      { text: "Hands-on — doing the thing, not reading about it" },
      { text: "Short summaries and key takeaways, no fluff" },
      { text: "Real examples from my specific industry" },
      { text: "Frameworks and mental models, or reflecting on what I've seen" },
      { text: "Watching or listening to something explained" },
    ],
  },
  {
    id: "time_available", label: "5 of 12",
    text: "How much time can you realistically give this each day?",
    sub: "Be honest. A small task you do beats a big one you skip.",
    type: "single",
    options: [
      { text: "5 minutes", sub: "Very tight — I need the absolute minimum that still moves things" },
      { text: "10 minutes", sub: "One focused block — enough to do something real" },
      { text: "15–20 minutes", sub: "A bit more — I can go slightly deeper when it matters" },
      { text: "30+ minutes", sub: "I can carve out real time when the task deserves it" },
    ],
  },
  // ── BLOCK 1b: Career situation + urgency trigger ──
  {
    id: "career_situation", label: "6 of 12",
    text: "Where are you in your career right now?",
    sub: "Be honest. This shapes every task we give you more than anything else.",
    type: "single",
    options: [
      { text: "Doing well, but anxious about what's coming", sub: "Good position  - the ground is starting to shift" },
      { text: "Stuck  - same role, similar pay, for too long", sub: "More than ready to be further along" },
      { text: "Actively looking for something different", sub: "Ready to move, not sure which direction" },
      { text: "Recently displaced or navigating a transition", sub: "The decision was made for me" },
      { text: "Successful, but quietly worried about being left behind", sub: "High performer, increasing unease" },
      { text: "Doing well  - and want to move faster", sub: "No crisis. Just know there's a next level and want to reach it." },
      { text: "Navigating AI disruption in my field", sub: "The role is changing. You need to know what that means for you." },
    ],
  },
  {
    id: "urgency", label: "7 of 12",
    text: "What's making this feel urgent right now?",
    sub: "Pick the one that's truest, not the one that sounds most reasonable.",
    type: "single",
    options: [
      { text: "AI is changing my field faster than I can keep up. I'm not sure where I stand.", sub: "The ground is shifting and you need to know your footing" },
      { text: "I've watched people around me advance while I've stayed flat. That's a hard thing to admit." },
      { text: "The decision was partly made for me. A layoff or restructure changed things." },
      { text: "There's a review or a promotion on the line. I need to show something real." },
      { text: "Nothing is broken exactly. I've just been drifting, and I want to stop before it gets harder." },
      { text: "All of the above, if I'm being honest." },
    ],
  },
  // ── BLOCK 3: Identity (slider #1 , forced honest take) ──
  {
    id: "style_outcome_process", label: "8 of 12",
    text: "When it comes to making progress on this, which is more true?",
    sub: "Pick the side you lean toward. There's no middle ground.",
    type: "slider",
    left: { text: "Just tell me what to do", desc: "Give me the first move. I can read about it later." },
    right: { text: "Help me understand what's happening", desc: "I can't act with confidence until I can see the full picture." },
  },
  // ── BLOCK 4: Emotions ──
  {
    id: "goal", label: "9 of 12",
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
  // ── BLOCK 5: Identity (slider #2 , validation driver) ──
  {
    id: "style_external_internal", label: "10 of 12",
    text: "What would actually make you feel like you're on top of this?",
    sub: "Drag toward the statement that's more honest, not more admirable.",
    type: "slider",
    left: { text: "Other people can see I'm ahead", desc: "My colleagues, my boss, my team. They'd know I get it." },
    right: { text: "I know I'm ahead, even if no one notices", desc: "The confidence is internal. I don't need to perform it." },
  },
  // ── BLOCK 6: Constraints ──
  {
    id: "blocker", label: "11 of 12",
    text: "What usually gets in the way when you try to make progress on something that matters?",
    sub: "This shapes how we frame your daily tasks.",
    type: "single",
    options: [
      { text: "Not enough time", sub: "Days are full, hard to carve out space" },
      { text: "Too much information, don't know where to start", sub: "Overwhelm and paralysis" },
      { text: "I start but don't follow through", sub: "Motivation drops off after a few days" },
      { text: "I learn things but don't apply them to actual work", sub: "Theory without practice" },
      { text: "I don't know which direction to move. Too many options, or none that feel right.", sub: "Direction paralysis" },
    ],
  },
  {
    id: "already_tried", label: "12 of 12",
    text: "What have you already tried?",
    sub: "Select all that apply. Everything you've tried brought you here. We won't repeat it.",
    type: "multi",
    options: [
      { text: "Reading articles, books, or career content" },
      { text: "Watching YouTube or taking online courses" },
      { text: "Attending a conference or workshop" },
      { text: "Trying tools or new approaches on my own" },
      { text: "Talking to colleagues, a mentor, or a coach" },
      { text: "Working with a recruiter or career advisor" },
      { text: "Nothing yet. This is where it starts." },
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
  const tried        = answers.already_tried || [];
  const triedNothing = tried.includes(5);
  const triedCount   = tried.filter(x => x !== 5).length;
  const learnStyle   = answers.learn_style   || [];
  const valuable     = answers.what_feels_valuable || [];
  const aiLevel      = answers.ai_level ?? 1;
  const aiLevelText  = ["never used AI tools", "tried a few things", "an occasional user", "using AI daily"][aiLevel] || "exploring AI";

  // ── BEAT 1: Recognition  - leads with career situation when available, then ai_level + pattern flags ──
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
    if (aiLevel === 3)
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and using AI every day , that puts you in a small minority of people in your field who've moved from experimenting to actual practice.`;
    else
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and already using AI regularly , that puts you ahead of most people in your field.`;
  } else if (readinessLevel === "medium") {
    if (aiLevel === 2)
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()}. You use AI occasionally , enough to have seen it work, not enough for it to feel like a consistent part of how you operate.`;
    else
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()}. You've tried some things with AI , enough to know it matters, not enough for it to feel like yours yet.`;
  } else {
    if (isHighCommitmentBeginner)
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and haven't really started with AI yet , but you're willing to put in real time. That combination moves fast once it has direction.`;
    else
      recognition = `You're ${seniorityText.toLowerCase()} into ${roleName.toLowerCase()} and haven't really started with AI yet. That's honest , and it's a smaller gap to close than you think.`;
  }

  // ── BEAT 2: Concern reframe , unchanged, already specific ──
  let concern = "";
  if      (answers.biggest_concern === 0) concern = "You told us the most useful thing right now would be resolving the feeling that colleagues see you as behind. That's a social pressure, not a skills gap , and it responds faster to visible action than to quiet learning.";
  else if (answers.biggest_concern === 1) concern = "You said the most useful thing would be knowing which parts of your role are actually at risk. That's the right question , and the exposure analysis below gives you a specific answer.";
  else if (answers.biggest_concern === 2) concern = "You want to understand the tools everyone else seems to be using. That's a solvable problem , and it's faster to solve than you think. Most of the tools that matter can be learned in a single focused session.";
  else if (answers.biggest_concern === 3) concern = "You want to protect the credibility you've spent years building. The way to protect it is being the person in your field who understands where AI augments expertise and where it doesn't.";
  else if (answers.biggest_concern === 4) concern = "You said younger people are pulling ahead. Here's what the research shows: they're faster at adopting tools, but they don't have your judgment, your network, or your context. The combination of your experience and basic AI fluency is worth more than either alone.";
  else if (answers.biggest_concern === 5) concern = "You said the hardest part is not knowing what you don't know. That's the most honest answer , and the one that responds best to a structured system. Your plan closes that gap one step at a time.";

  // ── BEAT 3: Goal , modulated by orientation + pattern ──
  let goal = "";
  if (answers.goal_custom?.trim()) {
    goal = `Your goal — "${answers.goal_custom.trim()}" — is what every task in this plan is working toward.`;
  } else if (isPureNavigator) {
    goal = "Your goal is clarity for others: understanding what's changing well enough to make better calls for your team. Your plan is weighted toward frameworks and evidence.";
  } else if (hasTheoryGap && answers.goal !== 5) {
    goal = "You've been learning. What's been missing is doing. Your plan is built around application, one concrete action at a time.";
  } else if (answers.goal === 0) goal = "You want to be the person on your team who actually understands what's changing. Your plan produces visible, shareable output.";
  else if (answers.goal === 1) goal = "You're building the kind of depth that makes you harder to displace, not chasing the new shiny thing.";
  else if (answers.goal === 2) goal = "You're thinking about this as a lever for career growth. Your plan builds momentum toward the move you're after.";
  else if (answers.goal === 3) goal = "You're building a skill set that opens doors. Your plan puts you in motion toward that.";
  else if (answers.goal === 4) goal = "More than anything, you want to feel genuinely solid  - not performing it, actually having it. Every task is a data point that builds the real thing.";

  // ── BEAT 4: Blocker + already tried + learn_style ──
  let blocker = "";
  if      (answers.blocker === 0) blocker = `Time is the real constraint. Every task in your plan fits inside 10 minutes. If you only do one thing, do the first one.`;
  else if (answers.blocker === 1) blocker = "You said the problem is overwhelm , too much information, no clear starting point. Your plan is sequential for exactly this reason. One thing at a time, in order. We do the filtering so you don't have to.";
  else if (answers.blocker === 2) blocker = "You told us you start things but lose the thread. That's a structure problem, not a motivation problem. Every task below has a clear endpoint , you'll know when you're done.";
  else if (answers.blocker === 3) blocker = "You said you learn things but don't apply them to your actual work. So your plan is built around application, not consumption. Everything asks you to do something real.";
  else if (answers.blocker === 4) blocker = "You said the hardest part is knowing what's worth learning. That's exactly what this plan resolves. Every task is here for a specific reason , nothing generic, nothing filler.";

  // Append learn_style specificity
  if (learnStyle.includes(1) && !learnStyle.includes(4)) {
    blocker += " Your tasks lean hands-on , trying things, not reading about them.";
  } else if (learnStyle.includes(4) && !learnStyle.includes(1)) {
    blocker += " Your tasks lean toward frameworks and mental models , understanding why before how.";
  } else if (learnStyle.includes(5)) {
    blocker += " Your tasks include reflection prompts , space to notice what's actually shifting as you go.";
  } else if (learnStyle.includes(2)) {
    blocker += " Each task comes with a clear 'why this matters' , no filler, no fluff.";
  } else if (learnStyle.includes(3)) {
    blocker += " Your tasks draw from real examples in your specific field, not generic AI case studies.";
  }

  // Append already_tried specific context , name what they've tried, not just how many
  if (isFrustrated) {
    const triedNames = [];
    if (tried.includes(0)) triedNames.push("newsletters");
    if (tried.includes(1)) triedNames.push("courses and videos");
    if (tried.includes(2)) triedNames.push("conferences");
    if (tried.includes(3)) triedNames.push("the tools directly");
    if (tried.includes(4)) triedNames.push("conversations with mentors");
    const triedStr = triedNames.length > 1
      ? triedNames.slice(0,-1).join(", ") + " and " + triedNames[triedNames.length-1]
      : triedNames[0] || "multiple approaches";
    blocker += ` You've tried ${triedStr} and nothing fully landed. Your plan is different , it starts with your actual work, not a generic starting point.`;
  } else if (triedNothing) {
    blocker += " You haven't tried anything yet , that's fine. Your plan starts from zero with no assumptions.";
  } else if (tried.includes(3) && tried.includes(1)) {
    blocker += " You've used the tools and done the courses , which means you're past the basics. Your plan assumes that.";
  } else if (tried.includes(3)) {
    blocker += " You've actually used the tools already , your plan picks up from there, not from scratch.";
  } else if (tried.includes(4)) {
    blocker += " You've talked to people about this. Your plan gives you something concrete to bring back to those conversations.";
  } else if (tried.includes(1)) {
    blocker += " You've done the courses , your plan shifts from consuming to applying.";
  } else if (triedCount > 0) {
    blocker += " We've accounted for what you've already tried.";
  }

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

  // what_feels_valuable , wire all 6 indices, not just 3/4/5
  if (valuable.includes(5) && orientation === "navigator") {
    style += " Understanding AI well enough to make decisions is the through-line.";
  } else if (valuable.includes(3)) {
    style += " It's an action sequence, not a reading list.";
  } else if (valuable.includes(4)) {
    style += " Your tasks are built from real examples, not theory.";
  } else if (valuable.includes(0)) {
    style += " Every tool mentioned is there for a specific reason.";
  } else if (valuable.includes(1)) {
    style += " Each task builds on the last.";
  } else if (valuable.includes(2)) {
    style += " Your plan tells you what's shifting, not just what to do.";
  }

  // ── BEAT 6: Anchor ──
  let anchor = "";
  if (ultimateWhy) anchor = `Underneath it all , you want to ${ultimateWhy}. Everything below is in service of that.`;

  return { recognition, concern, goal, blocker, style, anchor, ultimateWhy: ultimateWhy || "", aiLevelText };
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

  const ai    = answers.ai_level   ?? 1;
  const sen   = answers.seniority  ?? 0;
  const concern = answers.biggest_concern;
  const goal    = answers.goal;
  const tried   = (answers.already_tried || []).filter(x => x !== 5);

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
    } else if (isFrustrated) {
      reason = `Medium readiness and a frustration pattern. You've tried approaches and nothing has fully clicked. The fix isn't more content. Your plan is built around structure and specificity, not generic starting points.`;
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
    if (isFrustrated) {
      reason = `You've tried ${tried.length} different ${tried.length === 1 ? "approach" : "approaches"} and still haven't found traction. That's a different problem than not having started. Your plan starts with your specific work tasks, not a generic entry point.`;
    } else if (isAnxietyDriven) {
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
  const concern = answers.biggest_concern  ?? -1;
  const blocker = answers.blocker          ?? -1;

  // Build the insight — 2 lines about who this archetype is for this specific person
  // Crosses: archetype × career situation × urgency × goal
  const careerSit = answers.career_situation ?? -1;
  const urgency   = answers.urgency          ?? -1;
  const profile   = classification.profileName || "";

  // Urgency flavour — what's actually driving this
  const urgencyLine =
    urgency === 0 ? "the field is moving and you need to know where you stand" :
    urgency === 1 ? "people around you are advancing and you're not moving" :
    urgency === 2 ? "a layoff or restructure made the decision for you" :
    urgency === 3 ? "there's a review or promotion on the line" :
    urgency === 4 ? "you've been drifting and you want to stop" :
    urgency === 5 ? "everything is happening at once" : null;

  // Goal flavour — what they actually want
  const goalLine =
    answers.goal_custom?.trim()    ? `your goal — ${answers.goal_custom.trim()}` :
    goal === 0 ? "landing a role that's actually a level up" :
    goal === 1 ? "moving to a company that fits where you want to go" :
    goal === 2 ? "making a real pivot into new work" :
    goal === 3 ? "building the skills that keep you relevant as AI reshapes the work" :
    goal === 4 ? "feeling genuinely solid and confident — not performing it, actually there" : "moving forward";

  let text = "";

  if (profile === "The Compounder") {
    text = urgencyLine ? `The Compounder is already in motion — ${urgencyLine} is fuel, not friction.` : `The Compounder is already in motion and needs to make sure it's adding up, not spreading thin.`;

  } else if (profile === "The Cartographer") {
    text = goalLine ? `The Cartographer builds the picture before moving — for you, ${goalLine} requires a mental model that holds, not a list of things to try.` : `The Cartographer builds the picture before making a move, and needs the framework before acting with confidence.`;

  } else if (profile === "The Primed") {
    text = urgencyLine ? `The Primed has the awareness and the intent — with ${urgencyLine}, the move now is structure, not more reading.` : `The Primed has the awareness and the intent — what's been missing is a structure that actually converts that into daily practice.`;

  } else if (profile === "The Scout") {
    text = goalLine ? `The Scout needs enough of the map before committing to ${goalLine} — and your program builds exactly that.` : `The Scout needs to understand the landscape before committing to a direction, and that instinct is worth following.`;

  } else if (profile === "The Incumbent") {
    text = urgencyLine ? `The Incumbent has invested years into expertise that matters — ${urgencyLine} makes it specific, not vague.` : `The Incumbent has invested years into real expertise — the question now is which parts are protected and which need reinforcing.`;

  } else if (profile === "The Navigator") {
    text = goalLine ? `The Navigator thinks before moving — ${goalLine} requires clarity that holds under pressure, and that's what this builds.` : `The Navigator thinks before moving, and needs a picture solid enough to make calls that actually hold.`;

  } else if (profile === "The Launchpad") {
    text = urgencyLine ? `The Launchpad is earlier than most — ${urgencyLine} is the right reason to move now, and the program gives you a real first step.` : `The Launchpad is earlier than most, which is the best position to be in — the whole ground is still open.`;

  } else if (profile === "The Skeptic") {
    text = goalLine ? `The Skeptic doesn't move until the evidence is solid — your program earns that trust one specific thing at a time, toward ${goalLine}.` : `The Skeptic doesn't move until the evidence is solid enough to trust, and that standard is exactly what makes the progress durable.`;

  } else if (profile === "The Pivot") {
    text = urgencyLine ? `The Pivot is navigating a transition — with ${urgencyLine} as the backdrop, the program asks for one real thing per day until the ground feels solid.` : `The Pivot is navigating a transition, and the program meets you where you actually are, not where you were.`;

  } else {
    text = `This program is built specifically for your situation — not a generic version of career development.`;
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
  if (isFrustrated) return "The approaches that didn't work weren't built for your situation. This one is. That's the only difference that matters today.";
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
    "You have something concrete that demonstrates you're ready for the next level — visible, attributable, pointed at.",
    "You have a clear picture of what the right companies look like and what makes you competitive for them.",
    "You've completed one real piece of work in the direction you're pivoting toward.",
    "You've built or practiced one skill that closes the gap between where you are and where AI can't reach.",
    "You have five completed days as evidence — proof to yourself, not just intent.",
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

// ─── Plan Generator , tasks now modulated by ai_level + seniority ──
function generatePlan(answers, auditTasks) {
  const role = QOpt("role", answers.role) || "professional";
  const classification = classifyProfile(answers);
  const profileName = classification.profileName;
  const profileData = buildProfile(profileName, role, answers.seniority, answers, classification);
  const aiLevelLabels = ["complete beginner", "early explorer", "occasional user", "daily practitioner"];
  const aiLevel = aiLevelLabels[answers.ai_level] ?? "early explorer";
  const timeMap = ["5 min", "15 min", "30 min", "60 min"];
  const timeSlot = "15 min"; // fixed; time question removed

  const seniorityText = QOpt("seniority", answers.seniority) || "";
  const goalText = QOpt("goal", answers.goal) || "";
  const concernText = QOpt("biggest_concern", answers.biggest_concern) || "";
  const narrative = generateNarrative(answers, classification);
  const isExperienced = answers.ai_level >= 2;
  const isSenior = answers.seniority >= 2;

  const taskAnalysis = (auditTasks || []).map((task) => {
    const exposure = scoreTaskExposure(task);
    return { task, ...exposure };
  }).filter(t => t.task && t.task.trim().length > 3);
  const avgExposure = taskAnalysis.length > 0 ? Math.round(taskAnalysis.reduce((s, t) => s + t.score, 0) / taskAnalysis.length) : 50;
  const mostExposed = taskAnalysis.length > 0 ? taskAnalysis.reduce((a, b) => a.score > b.score ? a : b) : null;
  const leastExposed = taskAnalysis.length > 0 ? taskAnalysis.reduce((a, b) => a.score < b.score ? a : b) : null;

  // ─── Role × Level task matrix ─────────────────────────
  // Each role has beginner (ai_level 0-1) and experienced (ai_level 2-3) task sets.
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
      tag: isExperienced ? "Apply" : "Tool",
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
  if (emphasis === "apply") { const a = tasks.filter(t => t.tag === "Tool" || t.tag === "Apply"); const r = tasks.filter(t => t.tag !== "Tool" && t.tag !== "Apply"); tasks = [...a, ...r].slice(0, 3); }
  else if (emphasis === "read") { const a = tasks.filter(t => t.tag === "Read" || t.tag === "Reflect"); const r = tasks.filter(t => t.tag !== "Read" && t.tag !== "Reflect"); tasks = [...a, ...r].slice(0, 3); }
  else if (emphasis === "reflect") { const a = tasks.filter(t => t.tag === "Reflect"); const r = tasks.filter(t => t.tag !== "Reflect"); tasks = [...a, ...r].slice(0, 3); }
  if (classification.isOutcomeOriented && answers.ai_level > 0) { const d = tasks.find(t => t.tag === "Tool" || t.tag === "Apply"); if (d && tasks[0] !== d) tasks = [d, ...tasks.filter(t => t !== d)].slice(0, 3); }
  if (classification.isProcessOriented) { const th = tasks.find(t => t.tag === "Read" || t.tag === "Reflect"); if (th && tasks[0] !== th) tasks = [th, ...tasks.filter(t => t !== th)].slice(0, 3); }
  if (answers.blocker === 1) tasks.sort((a, b) => (parseInt(a.time) || 15) - (parseInt(b.time) || 15));
  // Safety: don't lead with Tool for complete beginners
  if (answers.ai_level === 0 && tasks[0]?.tag === "Tool") { const g = tasks.find(t => t.tag === "Read" || t.tag === "Reflect"); if (g) tasks = [g, ...tasks.filter(t => t !== g)].slice(0, 3); }
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
      if (answers.biggest_concern === 0) why = `You want to stop feeling behind. This is the kind of thing that changes that , visible, concrete, ahead of peers. ${why}`;
      else if (answers.biggest_concern === 1) why = `You want to know which parts of your role are at risk. This task gives you that clarity. ${why}`;
      else if (answers.biggest_concern === 3) why = `You want to protect your credibility. This builds it. ${why}`;
      else if (answers.biggest_concern === 5) why = `You want to close the blind spots. This closes one. ${why}`;
      if (ultimateWhy) why += ` You want to ${ultimateWhy}. This is the first step.`;
    }
    if (i === 1) {
      const gWhy = goalWhys[answers.goal];
      if (gWhy) why += ` ${gWhy}`;
    }
    return { ...task, why };
  });

  // careerSituationLabel  - crosses situation + urgency for a specific, personal read
  const cs  = answers.career_situation ?? -1;
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
    aiLevel, seniority: seniorityText, goal: goalText,
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


// ─── Sub-role questions — triggered by specific role selections ───────────────
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
    sub: "Data roles have diverged significantly — this shapes your specific tasks.",
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


// ─── Goal detail sub-questions — per goal index ──────────────────────────────
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
      { text: "I need clarity first — I don't know yet" },
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
      { text: "I'm not sure yet — I need to figure that out" },
    ],
  },
};
// Goal direction follow-up — triggered when goal_detail is "career change" or "own venture"
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

// Backward compat — keep GOAL_DETAIL_QUESTION pointing to goal 2 for any existing refs
const GOAL_DETAIL_QUESTION = GOAL_DETAIL_QUESTIONS[2];


// Which role indices trigger a sub-role question
const ROLES_WITH_SUBROLE = new Set(Object.keys(SUB_ROLE_QUESTIONS).map(Number));



// ─── Google Fonts ──────────────────────────────────────────
// Georgia (editorial display) + Inter (clean UI sans)
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap');
`;

// ─── Design Tokens ────────────────────────────────────────
const C = {
  // Dark backgrounds
  bg0:      "#08080F",   // deepest — hero base
  bg1:      "#0F0F1C",   // hero gradient mid
  bg2:      "#13131F",   // hero gradient end

  // Accent — refined warm lavender
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
function Logo({ size = 28 }) {
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
}

// ─── FadeIn helper ─────────────────────────────────────────
function FadeIn({ children, delay = 0, up = true }) {
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
}

// ─── Pill badge ────────────────────────────────────────────
function Pill({ children, light = false }) {
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
}

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

      {/* Line 2 — typewriter */}
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
          .sa-quotes-grid { grid-template-columns: 1fr !important; }
          .sa-stats-row { flex-direction: column !important; gap: 24px !important; align-items: flex-start !important; }
          .sa-footer-inner { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
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
            <button onClick={onStart} className="sa-btn-primary" style={{ fontSize: 13, padding: "9px 18px" }}>
              Get my plan →
            </button>
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
          <HeadlineTypewriter />

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
              Second Act challenges your thinking and turns your ideas into a plan you can follow, one day at a time.
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
                    {savedPlan._answers?.name ? `${savedPlan._answers.name} · ` : ""}{savedPlan.profileName}
                  </p>
                  <p style={{ fontFamily: "Inter", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    {savedPlan._resumeDay > 1 ? `Day ${savedPlan._resumeDay} · ` : ""}8-week program
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

          {/* Stats strip */}
          <FadeIn delay={360}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginTop: 72, flexWrap: "wrap" }}>
              {[
                { n: "8 weeks", label: "Structured program" },
                { n: "1 task", label: "Per day, every day" },
                { n: "12 types", label: "Of career profiles" },
              ].map(({ n, label }, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, fontWeight: 400, color: C.textHero, lineHeight: 1, marginBottom: 4 }}>{n}</p>
                  <p style={{ fontFamily: "Inter", fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>{label}</p>
                </div>
              ))}
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
                Second Act helps you figure out where you stand, what to focus on, and how to move forward, step by step.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <Divider light />

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section style={{ background: C.white, padding: "96px clamp(16px,5vw,40px) 96px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <Label light>How it works</Label>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                Three steps to a plan that actually works
              </h2>
            </div>
          </FadeIn>

          <div className="sa-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              {
                num: "01",
                title: "Answer 12 questions",
                body: "Tell us where you are, where you want to go, and how you work best. This is intentional as every answer shapes your plan.",
                color: "#EAE8FA",
                textColor: C.accentD,
              },
              {
                num: "02",
                title: "Get your career profile",
                body: "We build a full picture of who you are professionally right now: your archetype, your gap, your most important next move.",
                color: "#E8F0FA",
                textColor: "#2D5F9A",
              },
              {
                num: "03",
                title: "One task. Every morning.",
                body: "Enjoy 56 days of personalized tasks tailored to your role, goal, and working style. Each one takes under 30 minutes and actually moves the needle.",
                color: "#E8FAF1",
                textColor: "#1A7A6E",
              },
            ].map(({ num, title, body, color, textColor }, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="sa-step-card">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 700, color: textColor }}>{num}</span>
                  </div>
                  <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 400, color: C.ink, marginBottom: 12, lineHeight: 1.2 }}>{title}</h3>
                  <p style={{ fontFamily: "Inter", fontSize: 14, color: C.body, lineHeight: 1.75, fontWeight: 300 }}>{body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <Divider light />

      {/* ── PRODUCT PREVIEW ─────────────────────────────────── */}
      <section style={{ background: C.offWhite, padding: "96px clamp(16px,5vw,40px) 96px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <Label light>The daily experience</Label>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                One task a day. Eight weeks.
              </h2>
              <p style={{ fontFamily: "Inter", fontSize: 15, color: C.body, lineHeight: 1.8, fontWeight: 300, maxWidth: 480, margin: "16px auto 0" }}>
                It takes at least 8 weeks to form a new habit, and most people fall off before they get there. Second Act helps you stay consistent, accountable, and moving forward until it sticks.
              </p>
            </div>
          </FadeIn>

          {/* App frame */}
          <FadeIn delay={80}>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(15,14,30,0.14), 0 4px 16px rgba(15,14,30,0.06)", border: `1px solid ${C.border}` }}>
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

      <Divider light />

      {/* ── COMPARISON ──────────────────────────────────────── */}
      <section style={{ background: C.white, padding: "96px clamp(16px,5vw,40px) 96px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <Label light>Why Second Act</Label>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 400, color: C.ink, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                A smarter alternative to traditional coaching
              </h2>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 48px rgba(15,14,30,0.10), 0 2px 12px rgba(15,14,30,0.05)" }}>

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
                  <p style={{ fontFamily: "Inter", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 6px" }}>Your alternative</p>
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
                { label: "Habit formation",  coaching: "Not structured for it",                secondact: "Behaviorally designed for lasting change"  },
              ].map(({ label, coaching, secondact }, i) => {
                const isLast = i === 5;
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
              Get a clear, personalized plan based on where you are, and a thinking partner to keep you accountable.
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
            AI-powered career acceleration · Free to start
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

  const roleIdx = answers.role;
  const hasSubRole = roleIdx !== undefined && ROLES_WITH_SUBROLE.has(roleIdx);
  const subRoleDef = hasSubRole ? SUB_ROLE_QUESTIONS[roleIdx] : null;

  // Effective question: either the sub-role or the normal question
  const currentGoalDetailQ = GOAL_DETAIL_QUESTIONS[answers.goal] || GOAL_DETAIL_QUESTION;
  const q = showingGoalDirection ? { ...GOAL_DIRECTION_QUESTION, label: "9c of 12" } : showingGoalDetail ? { ...currentGoalDetailQ, label: "9b of 12" } : showingSubRole ? { ...subRoleDef, id: "role_detail", type: "single" } : questions[current];
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

  const [history, setHistory] = useState([]); // stack of {current, showingSubRole, showingGoalDetail, showingGoalDirection}

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
        if (current === 8 && !showingGoalDetail && !answers.goal_custom && GOAL_DETAIL_QUESTIONS[answers.goal] && answers.goal_detail === undefined) {
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

          {/* TEXT INPUT — for name */}
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

          {/* DROPDOWN SELECT — for long lists like professions */}
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

              {/* Custom goal — shown first on goal question */}
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
                // Call onComplete directly and synchronously — answers is current at this render
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
function ResultsScreen({ plan, onRestart, onDashboard }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const n = plan.narrative;
  const displayExposure = plan.aiExposureCommentary || null;
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const tagColors = {
    "Tool":    { bg: "#E1F5EE", text: "#0F6E56" },
    "Read":    { bg: "#E6F1FB", text: "#185FA5" },
    "Apply":   { bg: T.purpleL,  text: T.purpleD },
    "Reflect": { bg: "#FEF3C7", text: "#92400E" },
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
          <div style={{ display: "inline-block", width: "100%", maxWidth: 400, padding: "22px 26px", background: T.purpleL, border: `1.5px solid ${T.purpleMid}`, borderRadius: 14, boxShadow: T.shadow }}>
            <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: T.purple, margin: "0 0 8px" }}>{plan.name ? `${plan.name}, your profile` : "Your profile"}</p>
            <p style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 400, color: T.black, margin: 0, letterSpacing: -0.3, lineHeight: 1.2 }}>{plan.profileName}</p>
          </div>
        </div>

        {/* ── WHY THIS PROGRAM + WEEK ARC ── */}
        {/* ── INSIGHT CARD — no title, just the short text ── */}
        {(() => {
          const insights = generateSignalInsights(plan.classification, plan._answers || {});
          const text = insights[0]?.text;
          if (!text) return null;
          return (
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.purple}`, borderRadius: 12, padding: "20px 22px", marginBottom: 28, boxShadow: T.shadow }}>
              <p style={{ fontFamily: T.sans, fontSize: 15, color: T.ink, margin: 0, lineHeight: 1.75 }}>{text}</p>
            </div>
          );
        })()}

        {/* ── WHY THIS PROGRAM — goal + week 1/2/3 ── */}
        {(() => {
          const goalTexts = GOAL_TEXTS;
          const goalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];
          const arc = plan.weekArc || {};
          const cl = plan.classification || {};
          const goalIdx = plan._answers?.goal ?? -1;
          const w1 = arc.a1 || (cl.readinessLevel === "high" ? "You'll have gone deeper on what actually matters — not just stayed busy with the wrong things." : cl.readinessLevel === "medium" ? "You'll have real momentum where right now there's just intention and good timing." : "You'll have built your first real habit — something that exists now where it didn't before.");
          const w2 = arc.a2 || (cl.orientation === "optimizer" ? "You'll be accelerating what's already working, not starting over from scratch." : cl.orientation === "protector" ? "You'll know exactly which parts of what you've built are protected and which need work." : "You'll have a sharper, more specific picture of what you're actually working toward.");
          const w3 = arc.a3 || (goalIdx === 2 ? "Your next move will be visible — to you and to the people who need to see it." : goalIdx === 4 ? "You'll have a real confidence record you can point to, not just a feeling you're trying to hold onto." : "You'll have something concrete to show for this — not just progress in theory, actual proof.");
          const weeks = [
            { label: "Week 1", text: w1 },
            { label: "Week 2", text: w2 },
            { label: "Week 3", text: w3 },
          ];
          return (
            <div style={{ marginBottom: 28, background: "#fff", borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: T.shadow }}>
              <div style={{ padding: "18px 20px", background: T.purpleL, borderBottom: `1px solid ${T.purpleMid}50` }}>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.purple, margin: "0 0 8px" }}>Why this program</p>
                {goalText && <p style={{ fontFamily: T.serif, fontSize: 17, color: T.purpleD, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>{goalText}</p>}
              </div>
              <div style={{ padding: "4px 20px 8px", display: "flex", flexDirection: "column" }}>
                {weeks.map((w, i) => (
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
                <input type="email" placeholder="your@email.com (optional)" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { setSubmitted(true); setTimeout(() => onDashboard && onDashboard(Date.now()), 400); } }}
                  style={{ flex: 1, padding: "14px 16px", border: "none", fontFamily: T.sans, fontSize: 14, outline: "none", background: "#1E1E2E", color: "#fff", minWidth: 0 }} />
                <button onClick={() => { setSubmitted(true); setTimeout(() => onDashboard && onDashboard(Date.now()), 400); }}
                  style={{ background: T.purple, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "14px 20px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  Start Week 1 →
                </button>
              </div>
              <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>Free · No card required · Email optional</p>
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

  const TIME_LABELS = ["5 min", "10 min", "15 min", "20 min"];
  const timePref = answers.time_available !== undefined ? TIME_LABELS[answers.time_available] || "10 min" : "10 min";

  const ctx = {
    name:              answers.name || "",
    role:              get("role", answers.role),
    role_detail:       roleDetailText,
    seniority:         get("seniority", answers.seniority),
    ai_level:          answers.ai_level ?? 1,
    time_available:    timePref,
    goal_detail:       answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[answers.goal] || GOAL_DETAIL_QUESTION)?.options?.[answers.goal_detail]?.text || "") : "",
    goal_direction:    (answers.goal_direction || "").trim(),
    career_situation:  get("career_situation", answers.career_situation),
    urgency:           get("urgency", answers.urgency),
    concern:           answers.biggest_concern !== undefined ? get("biggest_concern", answers.biggest_concern) : get("blocker", answers.blocker),
    goal:              answers.goal_custom || get("goal", answers.goal),
    blocker:           get("blocker", answers.blocker),
    ultimate_why:      (() => {
      if (answers.goal_custom) return answers.goal_custom;
      const fromGoal = ["land a role that's actually a level up", "move to a company that fits where they want to go", "make a real pivot into new work", "build the skills that keep them relevant as AI reshapes what the job requires", "feel genuinely solid and confident — not performing it, actually there"];
      return fromGoal[answers.goal] || "";
    })(),
    style:             answers.style_outcome_process < 30 ? "strongly action-oriented , skip context, give me the move"
                     : answers.style_outcome_process < 50 ? "action-leaning , prefers doing over reading"
                     : answers.style_outcome_process > 70 ? "strongly context-oriented , needs to understand before acting"
                     : "context-leaning , wants enough landscape to act with confidence",
    validation:        answers.style_external_internal < 30 ? "strongly externally motivated , wants peers, boss, team to see progress"
                     : answers.style_external_internal < 50 ? "externally leaning , visible progress matters"
                     : answers.style_external_internal > 70 ? "strongly internally motivated , building for personal confidence, not optics"
                     : "internally leaning , quiet competence over performance",
    learn_style:       getMulti("learn_style").join(", ") || "not specified",
    already_tried:     getMulti("already_tried").join(", ") || "nothing yet",
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

Career situation right now: ${ctx.career_situation || "not specified"}
What's making this feel urgent: ${ctx.urgency || "not specified"}
Biggest concern: "${ctx.concern}"
Goal in 12 months: "${ctx.goal}"
Ultimate motivation: "${ctx.ultimate_why}"

═══ WHO THEY ARE ═══

Role: ${ctx.role}${ctx.role_detail ? ` (${ctx.role_detail})` : ""}
Seniority: ${ctx.seniority}
Context: familiarity with new tools (background only, do NOT use this to generate AI-focused tasks): ${ctx.ai_level}
Main blocker to making progress: "${ctx.blocker}"
Action vs. understanding preference: ${ctx.style}
External vs. internal motivation: ${ctx.validation}
How they learn best: ${ctx.learn_style}
What they've already tried (DO NOT repeat): ${ctx.already_tried}

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

Each task must fit within ${ctx.time_available || "10 min"}. Every task must be completable in that window by someone doing it for the first time.

${ctx.time_available === "5 min" ? "5 min: one tight action, two steps max, no preamble." : (ctx.time_available === "15 min" || ctx.time_available === "20 min") ? "15-20 min: one focused action with room for depth. Three to four steps." : "10 min: one concrete action with a clear stopping point. Three steps of ~3 min each."}
Good scope: read one specific article and write one sentence about what it changes for you. Identify three things in your role that are hardest to replicate. Send one email you have been avoiding. Map one real skill gap. Test one tool on one real piece of work. Write one paragraph you have been putting off.
NOT OK: "explore", "research broadly", "think about your options", or anything that cannot be finished in a single sitting.

Hard rule: if the task cannot be finished in the allotted time, cut scope. Smaller and done beats larger and abandoned.

═══ INSTRUCTIONS ═══

Generate 3 tasks. Task 1 MUST reference their actual work task #1 verbatim in the title.

CRITICAL  - career situation shapes everything: The career situation ("${ctx.career_situation}") and urgency ("${ctx.urgency}") must determine what the tasks are about, not just the tone. A person in transition needs different tasks than a high performer quietly worried. Someone whose urgency is an upcoming review needs tasks that produce visible evidence. Someone drifting needs tasks that create momentum. Tasks must be career development actions  - about positioning, skills, visibility, decisions, and relationships  - not about learning AI tools. The ai_level field is background context only.

Every task has 5 fields:

"context"  - 1 sentence. Name their career situation and something specific from their concern or goal. The "you said..." opener that makes them feel seen before the task starts.

"desc": 2-3 sentences. Name the specific action. Concrete  - if less experienced, say exactly what to do; if senior, give the advanced move. Write in the profile's ${profileCopy.voice} voice and ${profileCopy.pacing} pacing.

"steps"  - 2 steps for 5-min tasks, 2-3 steps for 10-min tasks, 3-4 steps for 15-20-min tasks. Match step count to the time budget. Each step is a single action with a clear stopping point — never multiple sub-actions or open-ended exploration.

"whyBase": 1-2 sentences. Connect to their ultimate motivation: "${ctx.ultimate_why}". Use their actual words. One real, specific payoff  - not generic.

Every task must also:
• Shape the format of each task's steps around how they learn: "${ctx.learn_style}". E.g. if they learn hands-on, every step is something they do, not read; if they learn through frameworks, at least one step builds a mental model
• Never suggest what they've already tried: "${ctx.already_tried}"
• Set the task's "time" field to "${ctx.time_available || '10 min'}"
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
• Reference their goal ("${ctx.goal}"), concern ("${ctx.concern}"), and career situation ("${ctx.career_situation || "in their field"}") directly
• Format: "You have X", "You know Y", "You've done Z"
• One per dimension: (1) concrete output built, (2) clarity gained, (3) habit or behavior started

Also generate a "change_commentary" field: 2-3 sentences about which of their actual work tasks is most exposed to disruption and which is most defensible  - and why. Reference their actual tasks by name.

Respond with ONLY valid JSON, no preamble, no markdown fences:

{"tasks":[{"tag":"Tool|Read|Apply|Reflect","time":"10 min","title":"...","context":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}],"outcomes":["...","...","..."],"change_commentary":"..."}`;

  // ── Prompt: no-audit path ─────────────────────────────────
  const promptNoAudit = `You are generating exactly ONE personalized career development task for Day 1. Make it the most relevant, specific, actionable 10-minute task possible for this person.

═══ THEIR CAREER SITUATION ═══

Career situation right now: ${ctx.career_situation || "not specified"}
What's making this feel urgent: ${ctx.urgency || "not specified"}
Biggest concern: "${ctx.concern}"
Goal in 12 months: "${ctx.goal}"
Ultimate motivation: "${ctx.ultimate_why}"

═══ WHO THEY ARE ═══

Role: ${ctx.role}${ctx.role_detail ? ` (${ctx.role_detail})` : ""}
Seniority: ${ctx.seniority}
Context  - familiarity with new tools (background only, do NOT use this to generate AI-focused tasks): ${ctx.ai_level}
Main blocker to making progress: "${ctx.blocker}"
Action vs. understanding preference: ${ctx.style}
External vs. internal motivation: ${ctx.validation}
How they learn best: ${ctx.learn_style}
What they've already tried (DO NOT repeat): ${ctx.already_tried}

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

Each task must fit within ${ctx.time_available || "10 min"}. Every task must be completable in that window.

${ctx.time_available === "5 min" ? "5 min: one tight action, two steps max, no preamble." : (ctx.time_available === "15 min" || ctx.time_available === "20 min") ? "15-20 min: one focused action with room for depth. Three to four steps." : "10 min: one concrete action with a clear stopping point. Three steps of ~3 min each."}
Good scope: read one specific article and write one sentence about what it changes for you. Identify three things in your role that are hardest to replicate. Send one email you have been avoiding. Map one real skill gap. Test one tool on one real piece of work. Write one paragraph you have been putting off.
NOT OK: "explore", "research broadly", "think about your options", or anything requiring more than one sitting.

Hard rule: if the task cannot be finished in 10 minutes, cut scope until it can.

═══ INSTRUCTIONS ═══

CRITICAL  - career situation shapes everything: The career situation ("${ctx.career_situation}") and urgency ("${ctx.urgency}") must determine what the tasks are about, not just the tone. A person in transition needs different tasks than a high performer quietly worried. Someone whose urgency is an upcoming review needs tasks that produce visible evidence. Someone drifting needs tasks that create momentum. Tasks must be career development actions  - about positioning, skills, visibility, decisions, and relationships  - not about learning AI tools. The ai_level field is background context only.

The task must directly address their biggest concern ("${ctx.concern}") and connect to their goal ("${ctx.goal}"), calibrated around their main blocker: "${ctx.blocker}"

Every task has 5 fields:

"context"  - 1 sentence. Name their career situation and something specific from their concern or goal. The opener that makes them feel seen.

"desc"  - 2-3 sentences. Name the specific action. Concrete  - if less experienced, say exactly what to do; if senior, give the advanced move. Write in the profile's ${profileCopy.voice} voice and ${profileCopy.pacing} pacing.

"steps"  - 2 steps for 5-min tasks, 2-3 steps for 10-min tasks, 3-4 steps for 15-20-min tasks. Match step count to the time budget. Each step is a single concrete action with a clear stopping point.

"whyBase"  - 1-2 sentences. Connect to their ultimate motivation: "${ctx.ultimate_why}". Use their actual words. One real, specific payoff  - not generic.

Every task must also:
• Feel written for a ${ctx.seniority} ${ctx.role} specifically  - not generic career advice
• Shape the format of each task's steps around how they learn: "${ctx.learn_style}"  - e.g. if they learn hands-on, every step is something they do, not read; if they learn through frameworks, at least one step builds a mental model
• Never suggest what they've already tried: "${ctx.already_tried}"
• Set the task's "time" field to "${ctx.time_available || '10 min'}"
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
• Reference their goal ("${ctx.goal}"), concern ("${ctx.concern}"), and career situation ("${ctx.career_situation || "in their field"}") directly
• Format: "You have X", "You know Y", "You've done Z"
• One per dimension: (1) concrete output built, (2) clarity gained, (3) habit or behavior started

Respond with ONLY valid JSON, no preamble, no markdown fences:

{"tasks":[{"tag":"Tool|Read|Apply|Reflect","time":"10 min","title":"...","context":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}],"outcomes":["...","...","..."]}`;

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
  const roleNames    = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
  const goalTexts    = GOAL_TEXTS;
  const situTexts    = ["Doing well, but anxious about what's coming","Stuck  - same level too long","Actively looking for something different","Recently displaced or navigating a transition","Successful, quietly worried about being left behind","Doing well  - wants to move faster"];
  const urgTexts     = ["AI compressing my field faster than expected","Watched peers advance while staying flat","Layoff or restructure changed things","Review or promotion on the line","Drifting — want intentional movement","All of the above"];
  const blockerTexts = ["Not enough time","Too much information, don't know where to start","I start but don't follow through","I learn things but don't apply them","Direction paralysis"];
  const lk = (arr, idx) => (idx !== undefined && idx >= 0) ? arr[idx] || null : null;

  const goalDetailText = answers.goal_detail !== undefined && GOAL_DETAIL_QUESTIONS?.[answers.goal]
    ? GOAL_DETAIL_QUESTIONS[answers.goal].options[answers.goal_detail]?.text || ""
    : "";

  const prompt = `Generate exactly 8 short week theme labels for a 56-day career development program, plus 3 short "you'll be able to" sentences for the first 3 weeks.

PERSON:
Profile: ${cl.profileName || "professional"}
Orientation: ${cl.orientation || "balanced"} (optimizer=growth · protector=defend · navigator=lead)
Readiness: ${cl.readinessLevel || "medium"}
Role: ${(lk(roleNames, answers.role) || "professional") + (answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : "")}
Career situation: ${lk(situTexts, answers.career_situation) || "in career"}
What's making this feel urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}${goalDetailText ? ` — specifically: ${goalDetailText}` : ""}${answers.goal_direction ? `\nTarget direction: ${answers.goal_direction}` : ""}
Main blocker: ${lk(blockerTexts, answers.blocker) || "something gets in the way"}

WEEK THEME RULES:
- The 12-month goal is the destination. Every week must visibly advance toward it.
- Week 1: first move. Start from where they are right now. Specific to their situation and readiness.
- Week 2: deepen the foundation laid in week 1. What becomes possible after that first week.
- Week 3: produce something concrete that serves the 12-month goal. Name what that output is.
- Week 4: consolidation and momentum. The practice is forming.
- Week 5: go deeper on what worked. Build the second layer.
- Week 6: direct, unambiguous work on the 12-month goal. Name it explicitly in this label.
- Week 7: make the work visible or shareable. Test it against reality.
- Week 8: locked in. Habit formed. What the person leaves with.
- Each label is 4-7 words. Specific to their goal and role — not generic.
- Week 6 must name the goal outcome directly (e.g. "Build the case for promotion" or "Land the first industry conversation")
- No AI references. Career development language only.
- Second person implied (e.g. "Build the visibility muscle" not "You build...")
- Arc should feel like a single coherent journey toward the 12-month goal

ABILITY SENTENCE RULES (a1, a2, a3):
- One sentence each, around 15-20 words, written directly to this person
- Describe something tangible they'll be able to do or have after that week
- Vary the opener naturally — "You'll have...", "You'll be able to...", "You'll know...", "Your next move will be..."
- Concrete and specific to their role and goal — not generic
- No AI references. No jargon. No preamble like "By the end of this week".

Return ONLY valid JSON:
{"w1":"...","w2":"...","w3":"...","w4":"...","w5":"...","w6":"...","w7":"...","w8":"...","a1":"...","a2":"...","a3":"..."}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
    ? ["Reading your answers", "Analyzing your work tasks", "Building your personalized plan"]
    : ["Reading your answers", "Mapping your profile", "Building your personalized plan"];

  // Use refs to track intervals so retry properly clears previous ones
  const intervalsRef = useRef({ di: null, pi: null });
  const [errorDetail, setErrorDetail] = useState("");

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
    const templatePlan = generatePlan(answers, auditTasks);
    const cls = classifyProfile(answers);
    const pd = buildProfile(cls.profileName, QOpt("role", answers.role), answers.seniority, answers, cls);
    Promise.all([
      generateAITasks(answers, auditTasks, cls, pd, templatePlan.tasks),
      generateWeekArc(answers, cls),
    ]).then(([ai, arc]) => {
      clearIntervals();
      const weekArc = arc || null;
      if (ai && ai.tasks?.length >= 1) {
        onComplete({
          ...templatePlan,
          tasks: ai.tasks.map((t, i) => ({
            ...t,
            whyBase: t.whyBase || templatePlan.tasks[i]?.whyBase || "",
            why: t.whyBase || "",
          })),
          aiExposureCommentary: ai.change_commentary || null,
          outcomes: (ai.outcomes?.length >= 3) ? ai.outcomes : templatePlan.outcomes,
          weekArc,
        });
      } else {
        // AI failed — show error + retry instead of falling back to template tasks
        setErrorDetail(_lastAITaskError || "API returned no usable data. Check browser console for details.");
        setFailed(true);
      }
    }).catch((err) => {
      console.error("GeneratingScreen error:", err);
      clearIntervals();
      setErrorDetail(`Exception: ${err?.message || String(err)}`);
      setFailed(true);
    });
  };

  useEffect(() => { run(); return clearIntervals; }, []);

  const [retryCount, setRetryCount] = useState(0);

  // Auto-retry once on first failure (transient API errors)
  useEffect(() => {
    if (failed && retryCount === 0) {
      const timer = setTimeout(() => { setRetryCount(1); run(); }, 1500);
      return () => clearTimeout(timer);
    }
  }, [failed]);

  if (failed && retryCount > 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ textAlign: "center", maxWidth: 440, padding: "0 32px" }}>
          <p style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 400, color: T.black, margin: "0 0 8px" }}>Something went wrong.</p>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: "0 0 28px", lineHeight: 1.6 }}>We could not build your plan. Check your connection and try again.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
            <button onClick={() => { setRetryCount(0); run(); }}
              style={{ background: T.black, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "13px 28px", borderRadius: 0, cursor: "pointer" }}>
              Try again
            </button>
            <button onClick={onBack}
              style={{ background: "none", color: T.muted, border: `1px solid ${T.border}`, fontFamily: T.sans, fontSize: 14, padding: "13px 20px", borderRadius: 0, cursor: "pointer" }}>
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } @keyframes firePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }`}</style>
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

  const roleNames     = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
  const goalTexts     = GOAL_TEXTS;
  const situTexts     = ["Doing well, but anxious about what's coming","Stuck  - same level too long","Actively looking for something different","Recently displaced or navigating a transition","Successful, quietly worried about being left behind","Doing well  - wants to move faster"];
  const blockerTexts  = ["Not enough time  - days are full","Too much information, don't know where to start","I start but don't follow through","I learn things but don't apply them to actual work","Direction paralysis  - too many options or none that feel right"];
  const learnOpts     = ["Reading articles or reports","Hands-on  - doing the thing, not reading about it","Short summaries and key takeaways","Real examples from my specific industry","Watching or listening","Trying a tool or doing an exercise"];
  const triedOpts     = ["Reading articles, books, or career content","Watching YouTube or taking online courses","Attending a conference or workshop","Trying tools or new approaches on my own","Talking to colleagues, a mentor, or a coach","Working with a recruiter or career advisor","Nothing yet"];

  const urgTexts      = ["AI compressing my field faster than expected","Watched peers advance while staying flat","Layoff or restructure changed things","Review or promotion on the line","Drifting — want intentional movement","All of the above"];

  const lk  = (arr, idx) => (idx !== undefined && idx >= 0) ? arr[idx] || null : null;
  const lkm = (arr, idxArr) => (idxArr || []).map(i => arr[i]).filter(Boolean).join(", ");
  const alreadyTried = lkm(triedOpts, answers.already_tried) || "nothing yet";
  const learnStyle   = lkm(learnOpts,  answers.learn_style);

  const prompt = `Generate exactly 6 personalized career development tasks for Days 2 through 7 of this person's program. Day 1 is already done  - build forward from it.

═══ FULL PROFILE ═══
Profile: ${plan.profileName}
Orientation: ${cl.orientation || "balanced"}
Readiness: ${cl.readinessLevel || "medium"}
Role: ${(lk(roleNames, answers.role) || "professional") + (answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : "")}
Career situation right now: ${lk(situTexts, answers.career_situation) || "in career"}
What's making this feel urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}
Main blocker: ${lk(blockerTexts, answers.blocker) || "something gets in the way"}
Already tried (DO NOT repeat): ${alreadyTried}
How they learn best: ${learnStyle || "any format"}

═══ DAY 1 (already done) ═══
"${day1Task?.title || "Day 1 task"}" [${day1Task?.tag || "Apply"}]

═══ RULES ═══
- CRITICAL: Career situation ("${lk(situTexts, answers.career_situation)}"), urgency ("${lk(urgTexts, answers.urgency)}"), and 12-month goal ("${answers.goal_custom || lk(goalTexts, answers.goal)}") must determine what the tasks are about — not just the tone. A person in transition needs different tasks than a high performer quietly worried. Someone with a promotion on the line needs tasks that produce visible evidence.
- Each task is a standalone 10-minute career development action
- Build progressively  - each day deepens or extends the previous
- NO AI tool tasks. Career development only: positioning, skills, visibility, decisions, relationships
- Never repeat what they've already tried: ${alreadyTried}
- Never repeat Day 1
- Shape steps around how they learn: ${learnStyle || "any format"}
- If Day 1 had a reflection note ("${day1Task?.reflection || ""}"), build Day 2 directly from what they described
- Second person. Active voice. Short sentences. No em dashes.

Return ONLY valid JSON, no markdown:
{"days":[
  {"day":2,"tag":"Apply|Read|Reflect|Tool","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":3,"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":4,"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":5,"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":6,"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":7,"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}
]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

  const roleNames    = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
  const goalTexts    = GOAL_TEXTS;
  const situTexts    = ["Doing well, but anxious about what's coming","Stuck — same level too long","Actively looking for something different","Recently displaced or navigating a transition","Successful, quietly worried about being left behind","Doing well — wants to move faster"];
  const urgTexts     = ["AI compressing my field faster than expected","Watched peers advance while staying flat","Layoff or restructure changed things","Review or promotion on the line","Drifting — want intentional movement","All of the above"];
  const triedOpts    = ["Reading articles, books, or career content","Watching YouTube or taking online courses","Attending a conference or workshop","Trying tools or new approaches on my own","Talking to colleagues, a mentor, or a coach","Working with a recruiter or career advisor","Nothing yet"];
  const lk  = (arr, idx) => (idx !== undefined && idx >= 0) ? arr[idx] || null : null;
  const lkm = (arr, idxArr) => (idxArr || []).map(i => arr[i]).filter(Boolean).join(", ");

  const alreadyTried = lkm(triedOpts, answers.already_tried) || "nothing yet";
  const arc = plan.weekArc || {};
  const weekThemes = [arc.w1, arc.w2, arc.w3, arc.w4];
  const weekTheme = weekThemes[weekNum - 1] || "Keep building";

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

  const endDay2 = startDay + 6;
  const prompt = `Generate exactly 7 personalized 10-minute career development tasks for Days ${startDay} through ${endDay2} (Week ${weekNum}) of this person's 30-day program.

═══ PROFILE ═══
Profile: ${plan.profileName}
Role: ${(lk(roleNames, answers.role) || "professional") + (answers.role_detail !== undefined && SUB_ROLE_QUESTIONS[answers.role] ? " (" + (SUB_ROLE_QUESTIONS[answers.role].options[answers.role_detail]?.text || "") + ")" : "")}
Career situation right now: ${lk(situTexts, answers.career_situation) || "in career"}
What's making this feel urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}
Already tried (DO NOT repeat): ${alreadyTried}
${noraInsight ? `\nNora coaching insight: ${noraInsight}\n` : ""}
═══ WEEK ${weekNum} OBJECTIVE ═══
"${weekTheme}"

═══ FULL HISTORY (Days 1-${endDay}) ═══
${history}${reflectionSummary}

═══ RULES ═══
- CRITICAL: Career situation ("${lk(situTexts, answers.career_situation)}"), urgency ("${lk(urgTexts, answers.urgency)}"), and 12-month goal ("${answers.goal_custom || lk(goalTexts, answers.goal)}") must shape what these tasks are fundamentally about — not just the tone.
- Each task is standalone, 10 minutes, doable in one sitting
- Build progressively on the history above. Never repeat a completed task.
- Week ${weekNum} theme: "${weekTheme}" — all tasks should advance this specific objective
- Career development only: positioning, skills, visibility, decisions, relationships
- NO AI tool tasks
- If many days were skipped recently, make Week ${weekNum} tasks shorter and lower-friction
- REFLECTIONS: The history above includes reflection notes (after the pipe on each day). Read them. If a person named something specific they did, build on it. If they mentioned a struggle, adjust scope down for the first few days of this week.
- Second person. Active voice. No em dashes. No generic motivational language.

Return ONLY valid JSON, no markdown:
{"days":[
  {"day":${startDay},"tag":"Apply|Read|Reflect|Tool","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+1},"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+2},"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+3},"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+4},"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+5},"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."},
  {"day":${startDay+6},"tag":"...","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}
]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
    if (parsed.days?.length >= 1) return parsed.days;
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
  const goalDetailText = answers.goal_detail !== undefined ? ((GOAL_DETAIL_QUESTIONS[answers.goal] || GOAL_DETAIL_QUESTION)?.options?.[answers.goal_detail]?.text || "") : "";

  // Lookup tables  - full quiz answer text
  const roleNames     = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
  const goalTexts     = GOAL_TEXTS;
  const situTexts     = ["Doing well, but anxious about what's coming","Stuck  - same level too long","Actively looking for something different","Recently displaced or navigating a transition","Successful, quietly worried about being left behind","Doing well  - wants to move faster"];
  const urgTexts      = ["AI compressing my field faster than expected","Watched peers advance while staying flat","Layoff or restructure changed things","Review or promotion on the line","Drifting  - want intentional movement","All of the above"];
  const concernTexts  = ["Not being seen as relevant or up to date","Losing ground to peers or younger colleagues","My role changing faster than I can adapt","Missing the next opportunity","Not knowing what I don't know  - blind spots","Time passing without real progress"];
  const blockerTexts  = ["Not enough time  - days are full","Too much information, don't know where to start","I start but don't follow through","I learn things but don't apply them to actual work","Direction paralysis  - too many options or none that feel right"];
  const seniorityTexts = ["0–3 years","4–8 years","9–15 years","16+ years"];
  const aiTexts       = ["Don't use AI tools at all","Tried a few things, nothing sticks","Use AI occasionally","AI is part of how I work every day"];
  const learnOpts     = ["Reading articles or reports","Hands-on  - doing the thing, not reading about it","Short summaries and key takeaways","Real examples from my specific industry","Watching or listening","Trying a tool or doing an exercise"];
  const valuableOpts  = ["Knowing which skills are worth building right now","Understanding what's actually changing in my field","Knowing how my role might change","Having a clear weekly plan  - not advice, a plan","Seeing real examples from people in my situation","Understanding enough to make smart decisions for my team"];
  const triedOpts     = ["Reading articles, books, or career content","Watching YouTube or taking online courses","Attending a conference or workshop","Trying tools or new approaches on my own","Talking to colleagues, a mentor, or a coach","Working with a recruiter or career advisor","Nothing yet"];

  const lk  = (arr, idx) => (idx !== undefined && idx >= 0) ? arr[idx] || null : null;
  const lkm = (arr, idxArr) => (idxArr || []).map(i => arr[i]).filter(Boolean).join(", ");

  const stylePref = answers.style_outcome_process != null
    ? (answers.style_outcome_process < 30 ? "strongly action-oriented  - skip context, give the move"
      : answers.style_outcome_process < 50 ? "action-leaning  - prefers doing over reading"
      : answers.style_outcome_process > 70 ? "strongly context-oriented  - needs to understand before acting"
      : "context-leaning  - wants enough landscape to act with confidence") : "balanced";
  const validPref = answers.style_external_internal != null
    ? (answers.style_external_internal < 30 ? "strongly externally motivated  - wants peers/boss to see progress"
      : answers.style_external_internal < 50 ? "externally leaning  - visible progress matters"
      : answers.style_external_internal > 70 ? "strongly internally motivated  - building for personal confidence"
      : "internally leaning  - quiet competence over performance") : "balanced";

  // Full previous-day history
  const dayHistory = Array.from({ length: dayNum }, (_, i) => i + 1).map(d => {
    const ds = (dayStatus || {})[d];
    const dn = (dayNotes  || {})[d] || "";
    const dt = (dayTasks  || {})[d];
    const tl = dt ? `"${dt.title}" [${dt.tag}]` : "(not loaded)";
    return `Day ${d}: ${ds === 'done' ? 'DONE' : ds === 'skipped' ? 'SKIPPED' : 'PENDING'} | Task: ${tl}${dn ? ` | Note: "${dn}"` : ""}`;
  }).join("\n");

  const TIME_LABELS2 = ["5 min", "10 min", "15 min", "20 min"];
  const timePref = (plan._answers?.time_available !== undefined) ? TIME_LABELS2[plan._answers.time_available] || "10 min" : "10 min";

  const perfSignal = status === 'done'
    ? `Completed Day ${dayNum}.${note ? ` Their note: "${note}"` : " No reflection note."}`
    : `Skipped Day ${dayNum}. ${note ? `Their note: "${note}"` : "No reason given."} Generate a shorter, lower-friction task.`;

  const learnStyle   = lkm(learnOpts,    answers.learn_style);
  const alreadyTried = lkm(triedOpts,    answers.already_tried) || "nothing yet";

  const prompt = `Generate exactly ONE personalized 10-minute career development task for Day ${dayNum + 1} of this person's program.

═══ FULL QUIZ PROFILE ═══
Profile: ${profileName}
Orientation: ${cl.orientation || "balanced"} (optimizer=growth · protector=defend · navigator=lead/understand)
Readiness: ${cl.readinessLevel || "medium"}
Role: ${lk(roleNames, answers.role) || "professional"}
Seniority: ${lk(seniorityTexts, answers.seniority) || "mid-career"}
Career situation: ${lk(situTexts, answers.career_situation) || "in career"}
What's making it urgent: ${lk(urgTexts, answers.urgency) || "not specified"}
Biggest concern: ${lk(concernTexts, answers.biggest_concern) || lk(blockerTexts, answers.blocker) || "not specified"}
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward on something that matters"}
Main blocker: ${lk(blockerTexts, answers.blocker) || "something gets in the way"}
Action vs. understanding: ${stylePref}
Internal vs. external motivation: ${validPref}
How they learn best: ${learnStyle || "any format"}
Already tried (DO NOT repeat): ${alreadyTried}
Tool familiarity: ${lk(aiTexts, answers.ai_level) || "not specified"}  - background only, do NOT generate AI tool tasks
${noraInsight ? `\n═══ NORA COACHING INSIGHTS ═══\n${noraInsight}\n` : ""}
═══ WEEK HISTORY ═══
${dayHistory || "No previous days yet."}

═══ TODAY'S SIGNAL ═══
${perfSignal}

═══ RULES ═══
- One 10-minute task only. Concrete. Doable in a single sitting.
- Career development actions: positioning, skills, visibility, decisions, relationships.
- HARD RULE: NO AI tool tasks (no ChatGPT, Claude, Copilot, AI drafting).
- If today was skipped: make tomorrow smaller and lower-friction.
- If today was done and note shows difficulty: adjust scope down.
- If today was done and note shows ease or momentum: go one level deeper.
- Build on previous days  - don't repeat any task already in the history above.
- Never suggest what they've already tried: ${alreadyTried}
- Shape steps around how they learn: ${learnStyle || "any format"}
- Second person. Active voice. Short sentences. No em dashes. No generic motivational language.
- NEVER include specific years, months, quarters, or dates. Use "currently", "now", "emerging", "increasingly" instead.

Return ONLY valid JSON, no markdown:
{"tag":"Apply|Read|Reflect|Tool","time":"10 min","title":"...","desc":"...","steps":[2-4 steps depending on time, each a single concrete action],"whyBase":"..."}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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



// ─── TaskSteps — checkbox list for each day task ──────────────────────────────
function TaskSteps({ steps, onCheckedChange, initialChecked }) {
  const [checked, setChecked] = React.useState(initialChecked || {});
  if (!steps?.length) return null;
  return (
    <div style={{ background: T.cream, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
      {steps.map((step, si) => (
        <div key={si} onClick={() => { const next = { ...checked, [si]: !checked[si] }; setChecked(next); onCheckedChange && onCheckedChange(next); }}
          style={{ display: "flex", gap: 10, marginBottom: si < steps.length - 1 ? 10 : 0, alignItems: "flex-start", cursor: "pointer" }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked[si] ? T.purple : T.purpleMid}`,
            background: checked[si] ? T.purple : "#fff",
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
  const roleNames = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
  const roleName = answers.role !== undefined ? roleNames[answers.role] || "professional" : "professional";
  const situationNames = ["Doing well, but anxious about what's coming","Stuck  - same level too long","Actively looking","In transition","Successful, quietly worried","Doing well  - wants to move faster"];
  const situation = situationNames[answers.career_situation] || "in career";

  // Build the person's own words - day notes, weekly goals they've set
  const personWords = (() => {
    const notes = Object.entries(dayNotes || {}).filter(([,v]) => v && v.trim()).map(([d,v]) => `Day ${d} note: "${v.trim()}"`);
    const wkGoals = Object.entries(weekFocusInput || {}).filter(([,v]) => v && v.trim()).map(([w,v]) => `Week ${w} self-set focus: "${v.trim()}"`);
    if (weekGoalOverride) wkGoals.unshift(`Current week override: "${weekGoalOverride}"`);
    return [...notes, ...wkGoals];
  })();

  const systemPrompt = `You are Nora, a thoughtful and warm career thinking partner inside Second Act. You genuinely care about this person's progress. You remember what they've said before and gently bring it up when it matters — not to catch them out, but because you're paying attention and you want to help them stay honest with themselves.

═══ THE PERSON'S COMMITMENTS ═══
- 12-month goal: "${goalText}"${goalDetailText2 ? ` (${goalDetailText2})` : ""}${goalDirection ? ` — targeting: ${goalDirection}` : ""}
- Current week focus: "${currentWeekTheme || "building momentum"}"
${goalStatement ? `- Program goal statement: "${goalStatement}"` : ""}
${personWords.length ? `\nTHEIR OWN WORDS (notes they've written, goals they've set):\n${personWords.join("\n")}\n\nThese are things they chose to write down. Use them with care. If what they're saying now doesn't line up with what they wrote before, bring it up gently — not as a gotcha, but as a genuine question. "I noticed you wrote X last week. Does that still feel right, or has something shifted?" This is the value you provide that a journal can't — you remember, and you care enough to ask.` : ""}

═══ WHAT THEY'VE DONE ═══
${(() => {
  const completed = Object.entries(dayStatus || {}).filter(([,s]) => s === 'done');
  const skipped = Object.entries(dayStatus || {}).filter(([,s]) => s === 'skipped');
  if (completed.length === 0 && skipped.length === 0) return "No days completed yet.";
  const lines = completed.map(([dayNum]) => {
    const task = dayTasks?.[dayNum];
    const note = dayNotes?.[dayNum];
    return task ? `Day ${dayNum} ✓: "${task.title}" [${task.tag}]${note ? ` — note: "${note}"` : ""}` : `Day ${dayNum}: done`;
  });
  skipped.forEach(([dayNum]) => { lines.push(`Day ${dayNum} ✗: SKIPPED`); });
  return lines.join("\n");
})()}

═══ WHAT YOU KNOW ABOUT THEM ═══
- Profile: ${plan.profileName}
- Role: ${roleName}
- Career situation: ${situation}
- Momentum score: ${momentumScore ?? "not yet"}/100 (${momentumLabel ?? "early days"})
- Orientation: ${cl.orientation || "balanced"}
- Readiness: ${cl.readinessLevel || "medium"}
- Frustrated pattern: ${cl.isFrustrated ? "yes — they've tried things before and nothing stuck" : "no"}
- Theory-practice gap: ${cl.hasTheoryGap ? "yes — they learn but don't apply" : "no"}
${noraSessionLog?.length ? `
═══ PAST CONVERSATIONS WITH THEM ═══
${noraSessionLog.map((s, i) => `Session ${i + 1} (Day ${s.dayNum}): ${s.summary}${s.changes?.length ? ` Changes made: ${s.changes.join(", ")}.` : ""}`).join("\n")}

This is your memory. Use it naturally and with kindness:
- If they said they'd do something last session, check in warmly: "You mentioned wanting to [X] last time. How did that go?"
- If they changed their goal before and seem to be drifting again, name it gently: "I've noticed we've shifted direction a few times. I want to make sure the program is pointed at the right thing for you."
- If they raised a blocker last time, follow up with care: "Last time you mentioned [X] was getting in the way. Is that still the case?"
- Don't recap this history to them. Just let it inform how you respond.` : ""}

═══ YOUR CORE JOB: HONEST, KIND ACCOUNTABILITY ═══

You are the accountability layer a paper journal can't provide. Your value is connecting what they said yesterday to what they're doing today — and doing it with genuine warmth. You're on their side. You notice things because you care, not because you're keeping score.

1. GOAL ALIGNMENT: If their weekly focus and their actions don't match, raise it as a question, not a verdict. "Your week focus is [X], but it looks like you've been spending time on [Y]. I wonder if the focus needs updating, or if there's something about [X] that feels harder to start?"

2. COMMITMENT TRACKING: If they wrote a note about something they wanted to do and haven't yet, bring it up gently. "You wrote a note about wanting to [X]. That seemed important to you. Is it still on your mind?"

3. NOTICING CONTRADICTIONS: If what they're saying now doesn't match something from before, name it with curiosity, not judgment. "A couple sessions ago you mentioned [Z] was the priority. Today it sounds like [W] is pulling your attention. I want to make sure we're building toward the right thing — which one matters more right now?"

4. PATTERN NOTICING: If you see a pattern (repeated skipping, frequent goal changes, avoiding certain task types), name it honestly but kindly. "I've noticed the Reflect tasks tend to get skipped. No judgment — but I'm curious if there's something about those that doesn't land for you."

5. HELPING SHARPEN GOALS: If they suggest a weekly focus or goal that's vague or not well connected to their 12-month target, help them make it stronger instead of just accepting it. "That's a starting point. Can we make it more specific? What would it look like if you really nailed that this week?" Or: "How does that connect to your bigger goal of [X]?"

6. WEEKLY GOAL EDITING: They can edit their weekly focus. If they want to change it, help them sharpen it first — then use CMD:WEEK_GOAL to set it. Gently probe weak ones: "I want to make sure this is the right focus. What would be different at the end of this week if you got this right?"

The tone is warm and direct — like a good friend who's genuinely invested in your progress. You say the honest thing, but you say it like someone who's rooting for them. Never sarcastic. Never condescending. Never "gotcha." Just caring and clear.

═══ RESPONSE STYLE ═══
- 2-3 sentences default. Go slightly longer only when wrapping up.
- One question at a time.
- No hollow affirmations ("Great!", "Absolutely!", "That's a great insight!"). But do acknowledge when something lands — briefly and sincerely. "That's honest" or "That makes sense" is fine.
- When they share something vulnerable or real, honor it. A simple "Thank you for saying that" or "That takes some honesty" goes a long way. Then build on it.
- Second person. Contractions. Short sentences. No em dashes.
- Be warm. You like this person. You want them to succeed.

═══ ENDING ═══
ENDING EARLY: If the conversation feels like it's run its course — they're repeating themselves or there's nothing more to usefully explore — wrap it up warmly. "I think we've covered good ground today." Include NORA_DONE on a new line.

CLOSING: Never end abruptly. Write one sentence that leaves them with something encouraging and concrete — something that connects back to what they shared. NORA_DONE goes after your closing message.

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

WHEN TO PROACTIVELY SUGGEST CHANGES: Don't wait to be asked. If the conversation reveals their actual goal is different from the program — say so and offer to update. If their weekly focus doesn't match their actions — propose a change. If their 12-month target is more specific than what they picked, use CMD:CHANGE_GOAL_CUSTOM. If a task isn't working — replace it immediately.

If they want to make a change that doesn't quite add up, gently check in first: "Just want to make sure — last time you said [X] was the priority. If we shift to [Y], we'd be moving away from that. Does that feel right to you?"

Commands are parsed silently — confirm the change in natural language but don't reference the command syntax.

${isGoalClarification
  ? `GOAL CLARIFICATION SESSION: This is their first time on the dashboard. Your job is to make sure the program is built around what they actually want — not just what they picked in the quiz. Open warmly by acknowledging their quiz goal ("You said you want to [goal]") and asking one thoughtful question that probes whether that's the real thing — what's actually driving it, what specifically they're trying to change, or what they'd want to look back on in 12 months. If what they say is more specific or different from their quiz answer, use CMD:CHANGE_GOAL_CUSTOM or CMD:CHANGE_GOAL to update it immediately. If their goal is confirmed, end by noting the program is well-aligned and wish them well with Day 1. Keep it tight — 3-4 exchanges, not an intake interview.`
  : needsDirectionQ
  ? "They want to move into a different field or start something of their own but haven't said where. Open with a warm, curious question asking what direction they're considering."
  : "Open with a single specific question that shows you've been paying attention. Good openers: reference something they wrote in a day note, gently ask about a skipped task, check whether their weekly focus still feels right, or ask what's on their mind today. Don't open with a generic 'how are things going'."}`;

  // Kick off with Nora's opening question
  useEffect(() => {
    const open = async () => {
      setLoading(true);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
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
      } catch (e) {
        setMessages([{ role: "assistant", content: "Let me ask you something specific. What's the one thing about your current situation that feels most stuck right now?" }]);
      }
      setLoading(false);
    };
    open();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const MAX_EXCHANGES = 7;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const updated = [...messages, { role: "user", content: userMsg }];
    setMessages(updated);
    setLoading(true);

    // Count how many user turns have happened (including this one)
    const userTurnCount = updated.filter(m => m.role === "user").length;
    const isSecondToLast = userTurnCount === MAX_EXCHANGES - 1;
    const isLast = userTurnCount >= MAX_EXCHANGES;

    // Detect circular conversation — last 4 messages very similar in length/content
    const recentUser = updated.filter(m => m.role === "user").slice(-3).map(m => m.content.toLowerCase().trim());
    const isCircular = recentUser.length >= 3 && (
      // Short non-committal replies repeated: "i don't know", "maybe", "not sure", "ok"
      recentUser.every(m => m.length < 25) ||
      // Near-identical consecutive messages
      (recentUser[0] === recentUser[1] || recentUser[1] === recentUser[2])
    );

    // Build the system prompt, appending signals when appropriate
    const promptWithSignal = isCircular
      ? systemPrompt + "\n\nNOTE: This conversation has stalled. Write ONE warm closing sentence — give them something concrete to carry into today — then on the very next line write NORA_DONE. Do not ask another question. Do not explain why you're closing."
      : isSecondToLast
      ? systemPrompt + "\n\nNOTE: You have one exchange left after this. Respond to what they said, then in the same message begin wrapping up — one forward-looking observation that sets up a clean close next turn. No new questions."
      : isLast
      ? systemPrompt + "\n\nNOTE: This is your final message. Write 2-3 sentences: acknowledge what came out of this conversation, give them one clear thing to carry into their day, and close warmly. Then on a new line write NORA_DONE. No questions. No \"feel free to reach out\" filler."
      : systemPrompt;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 250,
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

        {/* Input — blocked when done */}
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
                placeholder="Ask Nora anything — task, goal, pace..."
                rows={2}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.sans, fontSize: 14, color: T.black, lineHeight: 1.55, outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }}
              />
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ background: input.trim() && !loading ? T.purple : "#EEE", color: input.trim() && !loading ? "#fff" : "#AAA", border: "none", borderRadius: 10, padding: "12px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0, transition: "all 0.15s" }}>
                Send
              </button>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, margin: "8px 0 0" }}>Ask Nora to brainstorm with you, change tomorrow's task, adjust your weekly focus, or shift your goal</p>
            {messages.filter(m => m.role === "user").length >= 7 && (
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
  const roleNames = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
  const lk = (arr, idx) => (idx !== undefined && idx >= 0) ? arr[idx] || null : null;

  const doneDays = Object.entries(dayStatus).filter(([,s]) => s === 'done').length;
  const recentNotes = Object.entries(dayNotes)
    .filter(([k]) => !k.includes('_edit') && dayStatus[k] === 'done')
    .slice(-3)
    .map(([d, n]) => `Day ${d}: "${n}"`).join(', ');
  const recentTasks = Object.entries(dayTasks)
    .filter(([d]) => dayStatus[d] === 'done')
    .slice(-3)
    .map(([, t]) => t?.title).filter(Boolean).join(', ');

  const prompt = `Write a single short goal statement (8–14 words) for this professional's career program. It should feel personal and specific — not generic.

Profile: ${plan.profileName}
Role: ${lk(roleNames, answers.role) || "professional"}
12-month goal: ${(answers.goal_custom || lk(goalTexts, answers.goal)) || "move forward"}
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
  const roleNames = ["Architecture/built environment","Arts/performance/sport","Content creation","Creative/design","Data/analytics/BI","Education/teaching","Finance/accounting","Founder/entrepreneur","Government/public sector","Healthcare/medicine","HR/people","Legal/compliance","Marketing/growth","Media/journalism/writing","Mental health/social work","Nonprofit/NGO","Nursing/allied health","Operations/strategy","Product/UX/design","Real estate/property","Research/academia","Retail/hospitality","Sales/BD","Skilled trades","Software/engineering","Supply chain/logistics","Training/L&D","Something else"];
  const roleName = answers.role !== undefined ? roleNames[answers.role] || "professional" : "professional";

  // Summarise the week for the prompt
  const weekSummary = Array.from({ length: 7 }, (_, i) => {
    const d = (completedWeek - 1) * 7 + i + 1;
    const status = (weekStatus || {})[d];
    const note = (weekNotes || {})[d] || "";
    const task = (weekTasks || {})[d];
    return `Day ${d}: ${status === 'done' ? 'DONE' : status === 'skipped' ? 'SKIPPED' : 'unknown'} | "${task?.title || 'unknown'}"${note ? ` | Note: "${note}"` : ''}`;
  }).join('\n');

  const doneCount = Array.from({ length: 7 }, (_, i) => (completedWeek - 1) * 7 + i + 1).filter(d => (weekStatus || {})[d] === 'done').length;

  const systemPrompt = `You are Nora, a sharp career coach inside Second Act. You are doing a brief weekly check-in with someone who just finished Week ${completedWeek} of their 8-week career program.

THEIR WEEK ${completedWeek} SUMMARY:
${weekSummary}

Completed: ${doneCount}/7 days
Current 12-month goal: "${goalText}"
Profile: ${plan.profileName}
Role: ${roleName}
Orientation: ${cl.orientation || "balanced"}

YOUR JOB: In exactly 2–3 exchanges, find out:
1. What actually landed or surprised them this week
2. Whether their goal or focus feels the same or has shifted
3. Anything specific they want more of, less of, or differently in the next week

Then produce a brief insight summary (2–4 sentences) that will shape their Week ${completedWeek + 1} tasks.

RULES:
- One question at a time. Never two.
- Don't repeat what they said. Don't affirm ("Great!", "That's amazing!").
- Be direct and specific. Read the week data before asking — don't ask things you already know.
- If ${doneCount} < 4, acknowledge that directly and ask what got in the way — don't skip it.
- After 2–3 exchanges, close with a short insight summary, then say "NORA_DONE" on its own line.
- If their goal has clearly shifted, include "CMD:CHANGE_GOAL:N" (N = 0–4, same scale as before).
- If the week focus should change, include "CMD:WEEK_GOAL:short 4–7 word theme".
- These commands go after NORA_DONE, each on its own line.

START: Open with one specific, direct question based on what you see in their week data. If they skipped a lot, ask about that. If they did everything, ask what actually moved them. Make it feel like you read their data.`;

  useEffect(() => {
    const open = async () => {
      setLoading(true);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
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
      const res = await fetch("https://api.anthropic.com/v1/messages", {
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
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — try again." }]);
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


// ─── MomentumArc — extracted to respect hooks rules ──────────────────────────
function MomentumArc({ momentumScore, momentumLabel }) {
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDisplayScore(momentumScore), 300);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { setDisplayScore(momentumScore); }, [momentumScore]);
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
}

// ─── DayNoteField — extracted to respect hooks rules ─────────────────────────
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

function DashboardScreen({ plan, onBack, startDate }) {

  // ── Storage key — unique per user profile ──────────────
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
  const [showCelebration, setShowCelebration] = useState({});
  const [achievementToasts, setAchievementToasts] = useState([]);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalUpdatedDay, setGoalUpdatedDay] = useState(null);
  const [goalUpdating, setGoalUpdating] = useState(false);
  const [paceSlow, setPaceSlow] = useState(false);
  const [weekGoalOverride, setWeekGoalOverride] = useState(null);
  const [goalStatement, setGoalStatement] = useState("");
  const [arcOpen, setArcOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState({});
  // Nora modal
  const [noraOpen, setNoraOpen] = useState(false);
  const [noraInsight, setNoraInsight] = useState(null);
  const [noraDismissed, setNoraDismissed] = useState(false);
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
        goalUpdatedDay, paceSlow, weekGoalOverride, goalStatement,
        checkedSteps, noraInsight, noraDismissed, noraMomentumBonus,
        noraChangeMade, noraPickDay, noraSessionLog,
        weeklyCheckInDone, weekFocusInput, customGoalInput,
      });
      // Also update the plan's resume metadata so landing page stays current
      (async () => {
        try {
          const existing = await Store.get(PLAN_STORAGE_KEY) || {};
          const doneCount = Object.values(dayStatus).filter(s => s === 'done').length;
          const sc = (() => {
            let s = 0, skipsUsed = 0;
            for (let d = 1; d <= 56; d++) {
              if (dayStatus[d] === 'done') s++;
              else if (dayStatus[d] === 'skipped' && skipsUsed === 0) skipsUsed++;
              else break;
            }
            return s;
          })();
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
    goalUpdatedDay, paceSlow, weekGoalOverride, goalStatement,
    checkedSteps, noraInsight, noraDismissed, noraMomentumBonus,
    noraChangeMade, noraPickDay, noraSessionLog,
    weeklyCheckInDone, weekFocusInput, customGoalInput,
  ]); // eslint-disable-line

  const tagColors = {
    "Tool":    { bg: "#E1F5EE", text: "#0F6E56" },
    "Read":    { bg: "#E6F1FB", text: "#185FA5" },
    "Apply":   { bg: T.purpleL,  text: T.purpleD },
    "Reflect": { bg: "#FEF3C7", text: "#92400E" },
  };

  // Generate Days 2-7 on dashboard mount — skip if already in storage
  const [weekFailed, setWeekFailed] = useState(false);
  const [isInitialWeekLoad, setIsInitialWeekLoad] = useState(true);
  const generateWeek = () => {
    setWeekFailed(false);
    setWeekGenerating(true);
    const day1 = plan.tasks?.[0];
    generateWeekPlan(plan, day1).then(days => {
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
  useEffect(() => {
    if (!storageLoaded) return;
    // Only generate if we don't already have saved tasks for days 2-7
    const hasSavedWeek = Object.keys(dayTasks).length >= 3;
    if (!hasSavedWeek) generateWeek();
    else { setWeekGenerating(false); setIsInitialWeekLoad(false); }
  }, [storageLoaded]); // eslint-disable-line

  // Generate initial goal statement — skip if we already have one
  useEffect(() => {
    if (!storageLoaded) return;
    if (!goalStatement) {
      generateGoalStatement(plan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
    }
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
  const highestUnlocked = (() => {
    for (let d = 1; d <= 56; d++) {
      if (!dayStatus[d]) return d;
    }
    return 56;
  })();

  const streakCount = (() => {
    let s = 0, skipsUsed = 0;
    for (let d = 1; d <= 56; d++) {
      if (dayStatus[d] === 'done') s++;
      else if (dayStatus[d] === 'skipped' && skipsUsed === 0) { skipsUsed++; }
      else break;
    }
    return s;
  })();

  // ── MOMENTUM SCORE (0–100) ──────────────────────────────
  // +8 per completed day, -3 per skipped day, +noraMomentumBonus, streak multiplier
  const momentumScore = (() => {
    const doneCount = Object.values(dayStatus).filter(s => s === 'done').length;
    const skipCount = Object.values(dayStatus).filter(s => s === 'skipped').length;
    const base = doneCount * 8 - skipCount * 3;
    const streakBonus = streakCount >= 21 ? 12 : streakCount >= 14 ? 8 : streakCount >= 7 ? 4 : streakCount >= 3 ? 2 : 0;
    return Math.max(0, Math.min(100, base + streakBonus + noraMomentumBonus));
  })();

  const momentumLabel = momentumScore >= 80 ? "Peak" : momentumScore >= 60 ? "Strong" : momentumScore >= 40 ? "Building" : momentumScore >= 20 ? "Starting" : "Day 1";

  // ── WEEK BADGES ─────────────────────────────────────────
  // Earned when ≥5/7 days done in a completed week
  const weekBadges = Array.from({ length: 8 }, (_, i) => {
    const wk = i + 1;
    const wkStart = i * 7 + 1;
    const wkDone = Array.from({ length: 7 }, (_, j) => wkStart + j).filter(d => dayStatus[d] === 'done').length;
    const wkComplete = wkStart + 6 < highestUnlocked;
    return wkComplete && wkDone >= 5 ? { week: wk, done: wkDone } : null;
  }).filter(Boolean);

  // Handles marking a day done or skipped, then triggers next-day generation
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [dayGenFailed, setDayGenFailed] = useState({});
  const markDay = async (dayNum, status) => {
    const note = dayNotes[dayNum] || "";
    // Capture which achievements were already earned before this action
    const ctx0 = { dayStatus, dayTasks, streakCount, noraChangeMade, noraPickDay };
    const prevEarned = new Set(ACHIEVEMENTS.filter(a => a.earned(ctx0)).map(a => a.id));

    // Update status
    const newStatus = { ...dayStatus, [dayNum]: status };
    setDayStatus(newStatus);

    // Check for newly unlocked achievements with the updated status
    const newStreakCount = (() => {
      let s = 0, skipsUsed = 0;
      for (let d = 1; d <= 56; d++) {
        if (newStatus[d] === 'done') s++;
        else if (newStatus[d] === 'skipped' && skipsUsed === 0) skipsUsed++;
        else break;
      }
      return s;
    })();
    const ctx1 = { dayStatus: newStatus, dayTasks, streakCount: newStreakCount, noraChangeMade, noraPickDay };
    const newlyEarned = ACHIEVEMENTS.filter(a => !prevEarned.has(a.id) && a.earned(ctx1));
    if (newlyEarned.length > 0) {
      newlyEarned.forEach((a, i) => {
        setTimeout(() => {
          setAchievementToasts(prev => [...prev, { ...a, _key: `${a.id}-${Date.now()}` }]);
          setTimeout(() => setAchievementToasts(prev => prev.filter(t => t.id !== a.id)), 4000);
        }, i * 600);
      });
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
          const paceNote = paceSlow ? "Person requested slower pace — keep this task shorter and lower-friction." : "";
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

  // Called after weekly check-in completes — runs the deferred week batch generation
  const completeWeekGen = async (weekInsight, cmds = {}) => {
    if (!pendingWeekGen) return;
    const { nextWeek, nextWeekStart, newStatus, notesWithCurrent } = pendingWeekGen;
    // Apply any goal/theme changes from check-in
    if (cmds.changeGoal !== undefined) {
      plan._answers.goal = cmds.changeGoal;
      plan._answers.goal_detail = undefined;
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
    const days = await generateWeekBatch(plan, nextWeek, nextWeekStart, dayTasks, newStatus, notesWithCurrent, combinedInsight);
    if (days) {
      const newTasks = {};
      days.forEach(d => { newTasks[d.day] = d; });
      setDayTasks(prev => ({ ...prev, ...newTasks }));
    } else {
      setWeekFailed(true);
    }
    setWeekGenerating(false);
    if (cmds.changeGoal !== undefined) {
      generateGoalStatement(plan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
    }
  };

  // Calendar-aware day labels: Day 1 falls on the actual weekday the person started
  const START_DOW = startDate ? new Date(startDate).getDay() : 1; // 0=Sun,1=Mon,...6=Sat
  // Build 56-element array of real weekday labels for each day of the program
  const dayLabels = Array.from({ length: 56 }, (_, i) => {
    const dow = (START_DOW + i) % 7;
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow];
  });
  const daysOfWeek = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]; // kept for week grid row labels

  // For each week row, which real weekday does day N fall on?
  // weekDayLabels(wk): 7 labels for days (wk-1)*7+1 through wk*7
  const weekDayLabels = (wk) => Array.from({ length: 7 }, (_, i) => {
    const dayNum = (wk - 1) * 7 + i + 1;
    return dayLabels[dayNum - 1] || daysOfWeek[i];
  });
  const currentWeek = Math.min(8, Math.ceil(highestUnlocked / 7));
  const currentWeekStart = (currentWeek - 1) * 7 + 1;
  const weekThemes56 = [w1, w2, w3, w4, arc.w5 || 'Build on what worked', arc.w6 || 'Move toward the goal', arc.w7 || 'Make the work visible', arc.w8 || 'Habit locked in'];
  const currentWeekTheme = weekGoalOverride || weekThemes56[currentWeek - 1] || weekTheme;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: T.sans }}>

      {/* ── HEADER ── */}
      <div style={{ background: T.grad, padding: "28px clamp(16px, 4vw, 24px) 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", right: "3%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,111,159,0.2) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", fontFamily: T.sans, fontSize: 13, cursor: "pointer", padding: 0, letterSpacing: 0.2 }}>← results</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setProgressOpen(true)}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px", fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.75)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="7" width="3" height="6" rx="1" fill="rgba(255,255,255,0.7)"/><rect x="5.5" y="4" width="3" height="9" rx="1" fill="rgba(255,255,255,0.7)"/><rect x="10" y="1" width="3" height="12" rx="1" fill="rgba(255,255,255,0.7)"/></svg>
                <span>Progress</span>
              </button>
              <button onClick={() => setArcOpen(o => !o)}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px", fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.75)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span>Week {currentWeek} of 8</span>
                <span style={{ fontSize: 13, opacity: 0.7 }}>{arcOpen ? "▾" : "▸"}</span>
              </button>
            </div>
          </div>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "0 0 6px", fontWeight: 400 }}>{`${(plan.name || plan.profileName).trim()} · Week ${currentWeek}${paceSlow ? " · Steady pace" : streakCount >= 21 ? " · Habit forming" : streakCount >= 14 ? " · Building momentum" : streakCount >= 7 ? " · Consistent" : streakCount >= 3 ? " · Getting started" : ""}`}</p>
          {headerWeekEdit ? (
            <div style={{ margin: "0 0 6px" }}>
              <input
                autoFocus
                value={headerWeekDraft}
                onChange={e => setHeaderWeekDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("header-week-save")?.click(); } if (e.key === "Escape") setHeaderWeekEdit(false); }}
                placeholder="e.g. Build stakeholder visibility"
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: 8, fontFamily: T.serif, fontSize: "clamp(18px, 3.5vw, 24px)", fontWeight: 400, color: "#fff", background: "rgba(255,255,255,0.08)", outline: "none", boxSizing: "border-box", letterSpacing: -0.3 }}
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
                  style={{ background: headerWeekDraft.trim() && !goalUpdating ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", color: headerWeekDraft.trim() ? "#fff" : "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: headerWeekDraft.trim() && !goalUpdating ? "pointer" : "default" }}>
                  {goalUpdating ? "Saving…" : "Save + regenerate"}
                </button>
                <button onClick={() => setHeaderWeekEdit(false)}
                  style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "6px 8px" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "0 0 6px" }}>
              <h1 style={{ fontFamily: T.serif, fontSize: "clamp(22px,4vw,30px)", fontWeight: 400, color: "#fff", margin: 0, lineHeight: 1.2, letterSpacing: -0.5 }}>
                {currentWeekTheme}
              </h1>
              <button onClick={() => { setHeaderWeekDraft(currentWeekTheme); setHeaderWeekEdit(true); }}
                style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, flexShrink: 0, letterSpacing: 0.2 }}>
                edit
              </button>
            </div>
          )}
          {(() => {
            const goalTexts = GOAL_TEXTS;
            const goalText = plan._answers?.goal_custom || goalTexts[plan._answers?.goal];
            return (goalStatement || goalText) ? (
              <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>{goalStatement || goalText}</p>
            ) : null;
          })()}
          {/* ── STATS ROW ── */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 18 }}>

            {/* Momentum arc */}
            <MomentumArc momentumScore={momentumScore} momentumLabel={momentumLabel} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Streak + this week */}
              <div style={{ display: "flex", gap: 10 }}>
                {streakCount > 0 && (() => {
                  // Color tiers: dim → warm orange → amber → hot red-orange
                  const streakBg = streakCount >= 21 ? "rgba(239,68,68,0.22)"
                    : streakCount >= 14 ? "rgba(249,115,22,0.22)"
                    : streakCount >= 7  ? "rgba(251,191,36,0.18)"
                    : streakCount >= 3  ? "rgba(251,146,60,0.15)"
                    : "rgba(255,255,255,0.08)";
                  const streakBorder = streakCount >= 21 ? "rgba(239,68,68,0.5)"
                    : streakCount >= 14 ? "rgba(249,115,22,0.45)"
                    : streakCount >= 7  ? "rgba(251,191,36,0.4)"
                    : streakCount >= 3  ? "rgba(251,146,60,0.35)"
                    : "rgba(255,255,255,0.1)";
                  const fireSize = streakCount >= 21 ? 26 : streakCount >= 7 ? 24 : 22;
                  const isPulsing = streakCount >= 7;
                  return (
                    <div style={{ background: streakBg, border: `1px solid ${streakBorder}`, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 7, transition: "background 0.5s, border-color 0.5s" }}>
                      <span style={{ fontSize: fireSize, animation: isPulsing ? "firePulse 2s ease-in-out infinite" : "none", display: "inline-block" }}>🔥</span>
                      <div>
                        <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>{streakCount}</p>
                        <p style={{ fontFamily: T.sans, fontSize: 10, color: "rgba(255,255,255,0.4)", margin: 0, textTransform: "uppercase", letterSpacing: 0.8 }}>streak</p>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 7 }}>
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>
                      {Array.from({length:7},(_,i)=>(currentWeek-1)*7+i+1).filter(d=>dayStatus[d]==='done').length}<span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/7</span>
                    </p>
                    <p style={{ fontFamily: T.sans, fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "uppercase", letterSpacing: 0.8 }}>this week</p>
                  </div>
                </div>
              </div>

              {/* Week dot trail — 8 dots */}
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {Array.from({ length: 8 }, (_, i) => {
                  const wk = i + 1;
                  const badge = weekBadges.find(b => b.week === wk);
                  const isCurrent = wk === currentWeek;
                  const isPast = wk < currentWeek;
                  return (
                    <div key={wk} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <div style={{
                        width: isCurrent ? 28 : 22, height: isCurrent ? 28 : 22,
                        borderRadius: "50%",
                        background: badge ? T.purple : isCurrent ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
                        border: badge ? `2px solid ${T.purpleMid}` : isCurrent ? "2px solid rgba(255,255,255,0.5)" : "1.5px solid rgba(255,255,255,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all 0.3s",
                      }}>
                        {badge
                          ? <span style={{ fontSize: 10 }}>✓</span>
                          : <span style={{ fontFamily: T.sans, fontSize: isCurrent ? 10 : 9, fontWeight: 600, color: isCurrent ? "#fff" : "rgba(255,255,255,0.3)" }}>{wk}</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px clamp(16px, 4vw, 24px) 24px" }}>


        {/* ── WEEK PLAN FAILED BANNER ── */}
        {weekFailed && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: "#991B1B", margin: 0 }}>Could not load your week plan. Check your connection.</p>
            <button onClick={generateWeek} style={{ background: "#991B1B", color: "#fff", border: "none", fontFamily: T.sans, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 0, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>Retry</button>
          </div>
        )}

        {/* ── PROGRAM GRID — current week expanded, past weeks collapsible, future weeks hidden ── */}
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
                {/* Week header row — clickable for past weeks */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isExpanded ? 7 : 0,
                  cursor: isPastWk ? "pointer" : "default",
                  padding: isPastWk && !isExpanded ? "6px 0" : "0",
                }}
                  onClick={() => { if (isPastWk) setExpandedWeek(expandedWeek === wk ? null : wk); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    {isCurrentWk
                      ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.purple, flexShrink: 0 }} />
                      : <span style={{ fontSize: 13, color: "#0F6E56", flexShrink: 0 }}>✓</span>
                    }
                    <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: isCurrentWk ? T.purple : T.body, flexShrink: 0 }}>Week {wk}</span>
                    <span style={{ fontFamily: T.sans, fontSize: 13, color: isCurrentWk ? T.ink : T.muted, fontWeight: isCurrentWk ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wkTheme}</span>
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

                {/* Day tiles — shown when current or expanded */}
                {isExpanded && (
                  <div style={{ display: "flex", gap: 4 }}>
                    {weekDayLabels(wk).map((d, i) => {
                      const dayNum = wkStart + i;
                      const status = dayStatus[dayNum];
                      const isActive = dayNum === activeDay;
                      const isFuture = dayNum > highestUnlocked;
                      const isGeneratingThis = weekGenerating && isFuture && wk === currentWeek;
                      return (
                        <div key={dayNum} style={{ flex: 1, textAlign: "center", cursor: !isFuture ? "pointer" : "default" }}
                          onClick={() => { if (!isFuture) { setActiveDay(dayNum); window.scrollTo({ top: 0, behavior: "smooth" }); } }}>
                          <p style={{ fontFamily: T.sans, fontSize: 13, color: isActive ? T.purple : T.muted, margin: "0 0 4px", fontWeight: isActive ? 700 : 400 }}>{d}</p>
                          <div style={{
                            height: 30, borderRadius: 6,
                            background: status === 'done' ? T.purple : status === 'skipped' ? "#E5E5E5" : isActive ? T.purpleL : "#F4F4F4",
                            border: isActive ? `1.5px solid ${T.purpleMid}` : "1.5px solid transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: isFuture && !isGeneratingThis ? 0.35 : 1,
                            transition: "all 0.2s",
                          }}>
                            {status === 'done' && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                            {status === 'skipped' && <span style={{ color: T.muted, fontSize: 13 }}>–</span>}
                            {!status && !isFuture && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isActive ? T.purple : T.muted }} />}
                            {isFuture && isGeneratingThis && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.purpleMid, opacity: 0.6 }} />}
                            {isFuture && !isGeneratingThis && <svg width="6" height="7" viewBox="0 0 8 9" fill="none"><rect x="0.5" y="3.5" width="7" height="5" rx="1.2" stroke={T.muted} strokeWidth="1.1"/><path d="M2 3.5V2.5a2 2 0 0 1 4 0v1" stroke={T.muted} strokeWidth="1.1" strokeLinecap="round"/></svg>}
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
                  style={{ background: T.black, color: "#fff", border: "none", fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: "11px 24px", borderRadius: 0, cursor: "pointer" }}>
                  Try again
                </button>
              </div>
            );
          }

          if (isGenerating || (!task && !isLocked)) {
            return (
              <div key={dayNum} style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.purpleL}`, borderTop: `3px solid ${T.purple}`, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ fontFamily: T.serif, fontSize: 18, color: T.black, margin: "0 0 4px", fontWeight: 400 }}>Building Day {dayNum}...</p>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.muted, margin: 0 }}>Adapting to your Day {dayNum - 1} progress.</p>
              </div>
            );
          }

          return (
            <div key={dayNum}>
              {/* Back breadcrumb — shown when viewing a past day */}
              {status && dayNum < (currentWeek - 1) * 7 + 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <button onClick={() => { setActiveDay(highestUnlocked); setExpandedWeek(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.purple, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    ← Back to Week {currentWeek}
                  </button>
                  <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>· Day {dayNum} · {status === 'done' ? 'Completed' : 'Skipped'}</span>
                </div>
              )}
              {/* Task card */}
              <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderLeft: `4px solid ${status === 'done' ? "#0F6E56" : status === 'skipped' ? T.border : T.purple}`, borderRadius: 16, padding: "28px 24px", marginBottom: 16, boxShadow: T.shadowMd }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", background: ts.bg, color: ts.text, borderRadius: 4 }}>{task.tag}</span>
                  <span style={{ fontFamily: T.sans, fontSize: 14, color: T.muted }}>{task.time}</span>
                  {!status && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.purple, letterSpacing: 0.5 }}>Day {dayNum}</span>}
                  {status === 'done' && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: "#0F6E56", background: "#E1F5EE", padding: "4px 12px", borderRadius: 20 }}>Done ✓</span>}
                  {status === 'skipped' && <span style={{ marginLeft: "auto", fontFamily: T.sans, fontSize: 13, color: T.muted, background: T.cream, padding: "4px 12px", borderRadius: 20 }}>Skipped</span>}
                </div>
                <>
                  <h3 style={{ fontFamily: T.sans, fontSize: 19, fontWeight: 700, color: T.black, margin: "0 0 14px", lineHeight: 1.3 }}>{task.title}</h3>
                  <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink, margin: "0 0 18px", lineHeight: 1.85 }}>{task.desc}</p>
                </>
                <TaskSteps steps={task.steps} initialChecked={checkedSteps[dayNum] || {}} onCheckedChange={c => setCheckedSteps(prev => ({ ...prev, [dayNum]: c }))} />
                {(task.whyBase || task.why) && (() => {
                  const goalIdx2 = plan._answers?.goal ?? -1;
                  const whyLabel2 = [
                    "Why this moves you toward that role:",
                    "Why this makes you a stronger candidate:",
                    "Why this builds toward the pivot:",
                    "Why this keeps you relevant:",
                    "Why this builds real confidence:",
                  ][goalIdx2] || "Why this matters:";
                  return (
                    <div style={{ borderLeft: `3px solid ${T.purple}`, paddingLeft: 14 }}>
                      <p style={{ fontFamily: T.sans, fontSize: 15, color: T.body, margin: 0, lineHeight: 1.75 }}>
                        <strong style={{ color: T.black, fontSize: 15 }}>{whyLabel2} </strong>{task.whyBase || task.why}
                      </p>
                    </div>
                  );
                })()}

                {/* ── NOTE — compact strip at bottom of card ── */}
                <DayNoteField dayNum={dayNum} dayNotes={dayNotes} setDayNotes={setDayNotes} />
              </div>
              {!status && (
                <div style={{ background: T.purpleL, border: `1px solid ${T.purpleMid}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: T.serif, fontSize: 15, color: "#fff", fontStyle: "italic" }}>N</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 15, color: T.purpleD, margin: "0 0 8px", lineHeight: 1.5 }}>
                      Not sure how to approach this task? Want to talk through your goals? Brainstorm with Nora, your thinking partner.
                    </p>
                    <button onClick={() => setNoraOpen(true)}
                      style={{ background: T.purple, border: "none", borderRadius: 8, padding: "7px 16px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                      Talk to Nora →
                    </button>
                  </div>
                </div>
              )}

              {/* ── COMPLETION — no reflection, marks day directly ── */}
              {!status && !showCelebration[dayNum] && (
                <div style={{ background: T.cream, borderRadius: 12, padding: "18px 20px", border: `1px solid ${T.border}` }}>
                  <p style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 400, color: T.black, margin: "0 0 16px", lineHeight: 1.3 }}>Did you complete today's task?</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => {
                      setShowCelebration(prev => ({ ...prev, [dayNum]: true }));
                      setTimeout(() => {
                        setShowCelebration(prev => ({ ...prev, [dayNum]: false }));
                        markDay(dayNum, 'done');
                      }, 1400);
                    }}
                      style={{ flex: 1, background: T.black, color: "#fff", border: "none", borderRadius: 10, padding: "14px 0", fontFamily: T.sans, fontSize: 16, fontWeight: 600, cursor: "pointer", letterSpacing: -0.2 }}>
                      Yes, done ✓
                    </button>
                    <button onClick={() => markDay(dayNum, 'skipped')}
                      style={{ flex: 1, background: "#fff", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 0", fontFamily: T.sans, fontSize: 16, cursor: "pointer" }}>
                      Not yet
                    </button>
                  </div>
                </div>
              )}

              {/* ── COMPLETED STATE ── */}
              {status === 'done' && dayNum < 56 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Celebration card */}
                  <div style={{ background: "linear-gradient(135deg, #0a3d2e 0%, #0F6E56 100%)", borderRadius: 14, padding: "20px 22px", border: "1px solid #5DCAA5" }}>
                    {streakCount === 3 && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5DCAA5", margin: "0 0 6px" }}>3-day streak · The habit is starting.</p>}
                    {streakCount === 7 && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5DCAA5", margin: "0 0 6px" }}>7 days straight · One full week.</p>}
                    {streakCount === 14 && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5DCAA5", margin: "0 0 6px" }}>Two weeks · Most people stop here. You didn't.</p>}
                    {streakCount === 21 && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5DCAA5", margin: "0 0 6px" }}>21 days · This is where it locks in.</p>}
                    {streakCount === 30 && <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5DCAA5", margin: "0 0 6px" }}>30 days · You built something real.</p>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: T.serif, fontSize: 20, color: "#fff", margin: "0 0 4px", fontWeight: 400 }}>Day {dayNum} done.{streakCount > 1 ? ` 🔥 ${streakCount}` : " ✓"}</p>
                        {goalUpdatedDay === dayNum && (
                          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#5DCAA5", margin: "0 0 6px" }}>Goal updated — tasks reshaped ✓</p>
                        )}
                        {note && <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "0 0 8px", fontStyle: "italic" }}>"{note}"</p>}
                        <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.55 }}>
                          {ARCHETYPE_COMPLETION[plan.profileName] || "One more day in the program."}
                        </p>
                      </div>
                      {dayNum < 56 && (
                        <button
                          onClick={() => { if (dayTasks[dayNum + 1]) { setActiveDay(dayNum + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
                          disabled={!dayTasks[dayNum + 1]}
                          style={{ background: "#5DCAA5", color: "#0a3d2e", border: "none", borderRadius: 10, padding: "12px 18px", fontFamily: T.sans, fontSize: 15, fontWeight: 700, cursor: dayTasks[dayNum + 1] ? "pointer" : "default", flexShrink: 0, opacity: 1, display: "flex", alignItems: "center", gap: 8 }}>
                          {!dayTasks[dayNum + 1]
                            ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(10,61,46,0.25)", borderTop: "2px solid #0a3d2e", animation: "spin 0.8s linear infinite" }} />Day {dayNum + 1}</>
                            : <>Day {dayNum + 1} →</>
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress trail — last completed tasks */}
                  {(() => {
                    const completedDays = Array.from({length: dayNum}, (_, i) => i + 1)
                      .filter(d => dayStatus[d] === 'done' && dayTasks[d])
                      .slice(-5);
                    if (completedDays.length < 2) return null;
                    const tagColors2 = { "Tool": "#0F6E56", "Read": "#185FA5", "Apply": T.purpleD, "Reflect": "#92400E" };
                    return (
                      <div style={{ background: T.cream, borderRadius: 12, padding: "16px 18px", border: `1px solid ${T.border}` }}>
                        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>What you've built so far</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {completedDays.map(d => {
                            const t = dayTasks[d];
                            const tc = tagColors2[t.tag] || T.purple;
                            return (
                              <div key={d} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: tc, flexShrink: 0, marginTop: 6 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, margin: 0, lineHeight: 1.45 }}>{t.title}</p>
                                  {dayNotes[d] && <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, margin: "2px 0 0", fontStyle: "italic" }}>"{dayNotes[d]}"</p>}
                                </div>
                                <span style={{ fontFamily: T.sans, fontSize: 11, color: tc, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{t.tag}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {status === 'skipped' && dayNum < 56 && (
                <div style={{ background: T.cream, borderRadius: 14, padding: "20px 22px", border: `1px solid ${T.border}` }}>
                  <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 8px" }}>The program adjusted</p>
                  <p style={{ fontFamily: T.serif, fontSize: 19, color: T.black, margin: "0 0 6px", fontWeight: 400 }}>Tomorrow is shorter. You're still in it.</p>
                  {note && <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "0 0 8px", fontStyle: "italic" }}>"{note}"</p>}
                  <p style={{ fontFamily: T.sans, fontSize: 14, color: T.body, margin: "0 0 16px", lineHeight: 1.6 }}>Day {dayNum + 1} has been scaled down based on today. Missing a day isn't the same as stopping — the habit survives skips. Stopping is a choice.</p>
                  <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
                    {streakCount > 0 ? `Your ${streakCount}-day streak is safe. One skip doesn't break it.` : "Your streak is safe. One skip doesn't break it."}
                  </p>
                  {dayTasks[dayNum + 1] && (
                    <button onClick={() => { setActiveDay(dayNum + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{ background: T.black, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: T.sans, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                      See Day {dayNum + 1} →
                    </button>
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
                  4: "Halfway. The program has your shape now.",
                  5: "Five weeks of daily motion. That's not normal. That's exceptional.",
                  6: "Six weeks. You're in the top few percent of people who ever start something like this.",
                  7: "One week left. The habit is already yours.",
                  8: "56 days. Done. What you built here doesn't go away.",
                };
                return (
                  <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${isDone ? T.purpleMid : T.border}` }}>
                    {/* Top — week complete */}
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
                        const tagColors3 = { Apply: "#A78BFA", Read: "#60A5FA", Reflect: "#FBBF24", Tool: "#34D399" };
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
                    {/* Bottom — next week unlock */}
                    {nextWkTheme && wkNum < 8 && (
                      <div style={{ background: isDone ? T.purpleL : T.cream, padding: "18px 24px" }}>
                        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: isDone ? T.purple : T.muted, margin: "0 0 6px" }}>
                          {isDone ? "🔓 Week " + (wkNum + 1) + " unlocked" : "Week " + (wkNum + 1) + " coming up"}
                        </p>
                        <p style={{ fontFamily: T.serif, fontSize: 18, color: isDone ? T.purpleD : T.black, margin: "0 0 4px", fontWeight: 400, fontStyle: "italic" }}>{nextWkTheme}</p>
                        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>
                          {isDone
                            ? wkNum === 1 ? "Your program adapts from here. Nora shapes what's next based on what you did."
                            : wkNum === 4 ? "The second half builds on everything you've established."
                            : "Each week goes deeper than the last."
                            : `Week ${wkNum + 1} starts fresh. Day ${dayNum + 1} is lighter.`
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



      {/* ── PROACTIVE NORA NUDGE — triggered on risk patterns ── */}
      {(() => {
        // Don't show if Nora is open, modal is open, or it's Day 1 before anything (Meet Nora handles that)
        if (noraOpen || weeklyCheckInOpen || arcOpen || progressOpen) return null;

        const doneArr = Object.entries(dayStatus).filter(([,s]) => s === 'done').map(([d]) => +d);
        const skipArr = Object.entries(dayStatus).filter(([,s]) => s === 'skipped').map(([d]) => +d);
        const todayUnlocked = !dayStatus[highestUnlocked]; // today's task is unlocked and not acted on

        // Risk pattern 1: consecutive skips (2+)
        const recentSkips = skipArr.slice(-2);
        const doubleSkip = recentSkips.length >= 2 && recentSkips[1] - recentSkips[0] === 1;

        // Risk pattern 2: Day 4 slump — specifically day 4 unlocked and not done
        const day4Slump = highestUnlocked === 4 && !dayStatus[4] && doneArr.length >= 2;

        // Risk pattern 3: Week 2 drift — in days 8–14, fewer than 3 done in week 2
        const inWeek2 = highestUnlocked >= 8 && highestUnlocked <= 14;
        const week2Done = Array.from({length:7},(_,i)=>i+8).filter(d=>dayStatus[d]==='done').length;
        const week2Drift = inWeek2 && week2Done < 3 && highestUnlocked >= 11; // only nudge midway through

        // Risk pattern 4: streak at risk — has a streak of 3+ but today's task is sitting untouched
        const streakAtRisk = streakCount >= 3 && todayUnlocked && highestUnlocked > 3;

        // Pick highest-priority signal
        let nudge = null;
        if (doubleSkip) nudge = {
          headline: "Two days skipped.",
          body: "That's not a pattern yet — but it could become one. Want to talk through what's getting in the way?",
          cta: "Talk to Nora",
        };
        else if (day4Slump) nudge = {
          headline: "Day 4 is the wall most people hit.",
          body: "Not because it's harder — because the novelty's gone and the habit isn't locked yet. Nora can help you through it.",
          cta: "Talk it through",
        };
        else if (week2Drift) nudge = {
          headline: "Week 2 is where most programs stall.",
          body: "The first-week momentum has faded and the habit isn't formed yet. This is exactly the moment to check in.",
          cta: "Check in with Nora",
        };
        else if (streakAtRisk) nudge = {
          headline: `Your ${streakCount}-day streak is on the line.`,
          body: "Today's task is waiting. Even 5 minutes keeps the chain alive — Nora can help you figure out how to fit it in.",
          cta: "Talk to Nora",
        };

        if (!nudge) return null;

        return (
          <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 560, zIndex: 50, boxShadow: "0 8px 40px rgba(26,23,48,0.22)", animation: "fadeIn 0.4s ease" }}>
            <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${T.purpleMid}`, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontFamily: T.serif, fontSize: 15, color: "#fff", fontStyle: "italic" }}>N</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.black, margin: "0 0 3px" }}>{nudge.headline}</p>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: "0 0 12px", lineHeight: 1.55 }}>{nudge.body}</p>
                <button onClick={() => setNoraOpen(true)}
                  style={{ background: T.purple, border: "none", borderRadius: 8, padding: "8px 18px", fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                  {nudge.cta} →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MEET NORA — goal clarification prompt on first dashboard open ── */}
      {storageLoaded && !noraDismissed && highestUnlocked === 1 && !Object.values(Object.fromEntries(Object.entries(dayStatus))).some(s => s === 'done' || s === 'skipped') && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(10,8,20,0.75)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px",
          animation: "fadeIn 0.35s ease",
        }}>
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
              zIndex: 1,
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
                Your plan is built on your quiz answers. Nora can make it sharper — clarify what you actually want, adjust the direction, reshape the tasks. Two minutes now means a better program for the next 8 weeks.
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
          <div style={{ width: "100%", maxWidth: 600, background: "#fff", borderRadius: 20, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {(() => {
                  const goalTexts = GOAL_TEXTS;
                  const goalText = (plan._answers?.goal_custom || goalTexts[plan._answers?.goal]);
                  return goalText ? (
                    <div style={{ marginBottom: 14, background: "linear-gradient(135deg, #1e1a2e 0%, #2a2240 100%)", borderRadius: 10, padding: "14px 16px" }}>
                      <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", margin: "0 0 4px" }}>12-month goal</p>
                      <p style={{ fontFamily: T.serif, fontSize: 17, color: "#fff", margin: "0 0 6px", lineHeight: 1.4, fontWeight: 400 }}>{goalText}</p>
                      <button onClick={() => { setArcOpen(false); setShowGoalEdit(true); }}
                        style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                        Change goal →
                      </button>
                    </div>
                  ) : null;
                })()}
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.muted, margin: "0 0 1px" }}>8-week program</p>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: 0 }}>Tap any week to edit its focus</p>
              </div>
              <button onClick={() => setArcOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: T.muted, cursor: "pointer", padding: "0 0 0 12px", lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
              {weekThemes56.map((theme, i) => {
                const w = i + 1;
                const wStart = i * 7 + 1;
                const isCurr = w === currentWeek;
                const isPast = w < currentWeek;
                const wDone = Array.from({length:7},(_,j)=>wStart+j).filter(d=>dayStatus[d]==='done').length;
                return (
                  <div key={w} style={{ padding: "12px 14px", borderRadius: 10, background: isCurr ? T.purpleL : isPast ? T.cream : "#F9F9F9", border: `1px solid ${isCurr ? T.purpleMid : T.border}`, opacity: w > currentWeek + 1 ? 0.5 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: isCurr ? T.purple : isPast ? "#0F6E56" : T.muted, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Week {w}</span>
                          {isPast && <span style={{ fontFamily: T.sans, fontSize: 13, color: "#0F6E56" }}>{wDone}/7 ✓</span>}
                          {isCurr && <span style={{ fontFamily: T.sans, fontSize: 13, color: T.purple }}>current · {wDone}/7</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <p style={{ fontFamily: T.sans, fontSize: 14, color: isCurr ? T.ink : isPast ? T.body : T.muted, margin: 0, lineHeight: 1.5, fontWeight: isCurr ? 500 : 400 }}>{theme}</p>
                          {!isPast && (
                            <button onClick={() => { setWeekFocusEdit(prev => ({ ...prev, [w]: !prev[w] })); setWeekFocusInput(prev => ({ ...prev, [w]: prev[w] || theme })); }}
                              style={{ background: "none", border: "none", fontFamily: T.sans, fontSize: 13, color: T.purple, cursor: "pointer", padding: 0, textDecoration: "underline", flexShrink: 0 }}>
                              {weekFocusEdit?.[w] ? "cancel" : "edit"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isPast && weekFocusEdit?.[w] && (
                      <div style={{ marginTop: 10 }}>
                        <input value={weekFocusInput?.[w] || ""} onChange={e => setWeekFocusInput(prev => ({ ...prev, [w]: e.target.value }))}
                          placeholder="e.g. Build stakeholder visibility…"
                          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.purpleMid}`, borderRadius: 8, fontFamily: T.sans, fontSize: 14, color: T.black, outline: "none", boxSizing: "border-box", background: "#fff", marginBottom: 8 }}
                        />
                        <button
                          disabled={!(weekFocusInput?.[w] || "").trim() || goalUpdating}
                          onClick={async () => {
                            const newFocus = (weekFocusInput?.[w] || "").trim();
                            if (!newFocus) return;
                            if (isCurr) {
                              setWeekGoalOverride(newFocus);
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
                            } else {
                              if (!plan.weekArc) plan.weekArc = {};
                              plan.weekArc[`w${w}`] = newFocus;
                            }
                            setWeekFocusEdit(prev => ({ ...prev, [w]: false }));
                          }}
                          style={{ width: "100%", background: (weekFocusInput?.[w] || "").trim() && !goalUpdating ? T.purple : "#CCC", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: (weekFocusInput?.[w] || "").trim() && !goalUpdating ? "pointer" : "default" }}>
                          {goalUpdating && isCurr ? "Regenerating…" : isCurr ? "Save + regenerate remaining days" : "Save for this week"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
                      <span style={{ fontFamily: T.serif, fontSize: 14, color: pb.color || T.purpleD, fontStyle: "italic", fontWeight: 400 }}>{plan.profileName?.charAt(4) || "A"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.black, margin: "0 0 2px" }}>{plan.name ? `${plan.name}, ${plan.profileName}` : plan.profileName}</p>
                      {tagline && <p style={{ fontFamily: T.sans, fontSize: 13, color: T.body, margin: 0, lineHeight: 1.5 }}>{tagline}</p>}
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const totalDone = Object.values(dayStatus).filter(s => s === 'done').length;
                const totalSkipped = Object.values(dayStatus).filter(s => s === 'skipped').length;
                const completionRate = (totalDone + totalSkipped) > 0 ? Math.round((totalDone / (totalDone + totalSkipped)) * 100) : 0;
                return (
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
                          <div style={{ width: "100%", height: `${Math.max(pct * 100, isFut ? 0 : 4)}%`, background: isCurr ? T.purple : isFut ? "transparent" : (done >= 5 ? "#0F6E56" : done >= 3 ? T.purple : T.purpleMid), borderRadius: "4px 4px 0 0", transition: "height 0.4s ease", opacity: isFut ? 0.2 : 1 }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontFamily: T.sans, fontSize: 10, color: isCurr ? T.purple : T.muted, fontWeight: isCurr ? 700 : 400 }}>W{wk}</span>
                          {weeklyCheckInDone[wk] && <span style={{ fontSize: 8, color: "#0F6E56" }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── TASK TYPE BREAKDOWN ── */}
              {(() => {
                const counts = { Apply: 0, Read: 0, Reflect: 0, Tool: 0 };
                Object.entries(dayTasks).forEach(([d, t]) => { if (dayStatus[d] === 'done' && t?.tag) counts[t.tag] = (counts[t.tag] || 0) + 1; });
                const total = Object.values(counts).reduce((a, b) => a + b, 0);
                if (total === 0) return null;
                const tagColors2 = { Apply: T.purpleD, Read: "#185FA5", Reflect: "#92400E", Tool: "#0F6E56" };
                const tagBgs = { Apply: T.purpleL, Read: "#E6F1FB", Reflect: "#FEF3C7", Tool: "#E1F5EE" };
                return (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, margin: "0 0 12px" }}>How you've been working</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(counts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([tag, n]) => (
                        <div key={tag} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: tagBgs[tag] || T.purpleL, borderRadius: 10, flex: 1, minWidth: 100 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 700, color: tagColors2[tag] || T.purpleD, margin: 0 }}>{n}</p>
                            <p style={{ fontFamily: T.sans, fontSize: 12, color: tagColors2[tag] || T.purpleD, margin: 0, opacity: 0.7 }}>{tag}</p>
                          </div>
                          <p style={{ fontFamily: T.sans, fontSize: 13, color: tagColors2[tag] || T.purpleD, margin: 0, opacity: 0.5 }}>{Math.round(n/total*100)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
                              <p style={{ fontFamily: T.sans, fontSize: 11, color: isEarned ? T.body : T.muted, margin: 0, lineHeight: 1.4 }}>{a.desc}</p>
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
                const tagColors2 = { Apply: T.purpleD, Read: "#185FA5", Reflect: "#92400E", Tool: "#0F6E56" };
                const tagBgs2 = { Apply: T.purpleL, Read: "#E6F1FB", Reflect: "#FEF3C7", Tool: "#E1F5EE" };
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
          // Update answers
          plan._answers.goal = newGoalIdx ?? currentGoal;
          plan._answers.goal_detail = undefined;
          plan._answers.goal_custom = customText || undefined;
          setGoalUpdatedDay(highestUnlocked);
          // 1. Regenerate week arc themes
          const newArc = await generateWeekArc(plan._answers, plan.classification || {});
          if (newArc) {
            plan.weekArc = newArc;
            // Update weekThemes56 via a state-like approach — rebuild from new arc
            const updatedThemes = [
              newArc.w1, newArc.w2, newArc.w3, newArc.w4,
              newArc.w5, newArc.w6, newArc.w7, newArc.w8,
            ];
            // Force re-render by updating a dummy key (weekGoalOverride resets to null to use fresh arc)
            setWeekGoalOverride(null);
          }
          // 2. Regenerate remaining days in current week
          const wkStart = (currentWeek - 1) * 7 + 1;
          const remainingDays = Array.from({length:7},(_,j)=>wkStart+j)
            .filter(d => d > highestUnlocked && d <= wkStart + 6);
          if (remainingDays.length > 0) {
            const newTasks = {};
            for (const d of remainingDays) {
              const t = await generateNextDayTask(plan, d - 1, dayStatus[d-1] || 'done', dayNotes[d-1] || "", noraInsight, dayTasks, dayStatus, dayNotes);
              if (t) newTasks[d] = t;
            }
            setDayTasks(prev => ({ ...prev, ...newTasks }));
          }
          setGoalUpdating(false);
          generateGoalStatement(plan, dayTasks, dayStatus, dayNotes).then(s => { if (s) setGoalStatement(s); });
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
          Building your next week...
        </div>
      )}
      {/* ── ACHIEVEMENT TOASTS ── */}
      {achievementToasts.length > 0 && (
        <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", pointerEvents: "none", width: "min(380px, 90vw)" }}>
          {achievementToasts.map(a => (
            <div key={a._key} style={{
              background: T.black, borderRadius: 14, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
              animation: "fadeIn 0.35s ease",
              pointerEvents: "auto",
            }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.purple, margin: "0 0 2px" }}>Achievement unlocked</p>
                <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 1px" }}>{a.name}</p>
                <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
                const res = await fetch("https://api.anthropic.com/v1/messages", {
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
              plan._answers.goal_custom = cmds.changeGoalCustom;
              plan._answers.goal_detail = undefined;
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
              plan._answers.goal = cmds.changeGoal;
              plan._answers.goal_detail = undefined;
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

                const summaryPrompt = `Summarize this Nora coaching session in 2-3 sentences. Focus on: what the person was working through, any blockers or concerns they raised, what was resolved or shifted. Be specific — this summary will inform future task generation and coaching for this person.

Session content: "${text?.slice(0, 600) || "brief exchange"}"
Program changes made: ${changes.length ? changes.join("; ") : "none"}

Write the summary in third person ("They were working on...", "They mentioned..."). Keep it under 60 words. Return only the summary text, no preamble.`;

                const res = await fetch("https://api.anthropic.com/v1/messages", {
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
      const streakCount = (() => {
        let s = 0, skipsUsed = 0;
        const ds = dashSaved.dayStatus || {};
        for (let d = 1; d <= 56; d++) {
          if (ds[d] === 'done') s++;
          else if (ds[d] === 'skipped' && skipsUsed === 0) skipsUsed++;
          else break;
        }
        return s;
      })();
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
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      {screen === "landing" && <LandingPage onStart={() => { setScreen("quiz"); scrollTop(); }} onResume={resumeProgram} savedPlan={savedPlan} />}
      {screen === "quiz" && <QuizScreen onComplete={a => { setAnswers(a); setAuditTasks(null); setScreen("generating"); scrollTop(); }} onBack={() => { setScreen("landing"); scrollTop(); }} />}
      {screen === "generating" && answers && (
        <GeneratingScreen answers={answers} auditTasks={auditTasks} onComplete={p => { setPlan(p); setScreen("results"); scrollTop(); }} onBack={() => { setScreen("quiz"); scrollTop(); }} />
      )}
      {screen === "results" && answers && plan && <ResultsScreen plan={plan} onRestart={() => { setScreen("quiz"); setAnswers(null); setAuditTasks(null); setPlan(null); scrollTop(); }} onDashboard={(startDate) => goToDashboard(plan, startDate)} />}
      {screen === "dashboard" && dashboardPlan && <DashboardScreen plan={dashboardPlan} startDate={programStartDate} onBack={() => { setScreen("results"); scrollTop(); }} />}
    </div>
  );
}