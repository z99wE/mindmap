/**
 * THOUGHT QUALITY SCORING
 *
 * Rates how actionable each thought is based on:
 * - Verb specificity (vague: "think about" vs specific: "email Sarah")
 * - Deadline presence (has a time constraint?)
 * - Category clarity (is it clear what domain this belongs to?)
 * - Completeness (does it have enough detail to act on?)
 *
 * Then provides coaching to help users write thoughts they'll actually complete.
 * Research shows specific, deadline-bound thoughts have 3x higher completion rates.
 *
 * Cost: $0 — NLP pattern matching, no API calls
 */

'use strict';

// ── Quality Dimensions ────────────────────────────────────────────────────

// Vague verbs that rarely lead to completion
const VAGUE_VERBS = new Set([
  'think', 'consider', 'maybe', 'might', 'look', 'check', 'see',
  'figure', 'explore', 'investigate', 'review', 'ponder', 'wonder',
  'brainstorm', 'mull', 'contemplate', 'assess', 'evaluate',
]);

// Specific verbs that lead to completion
const ACTION_VERBS = new Set([
  'email', 'call', 'send', 'submit', 'write', 'draft', 'create',
  'build', 'fix', 'deploy', 'schedule', 'book', 'buy', 'install',
  'configure', 'test', 'update', 'delete', 'move', 'rename', 'set',
  'finish', 'complete', 'finalize', 'approve', 'review', 'share',
  'post', 'publish', 'upload', 'download', 'print', 'sign', 'pay',
  'deliver', 'pick', 'drop', 'organize', 'clean', 'sort', 'file',
]);

// Time markers that indicate urgency/deadline
const TIME_MARKERS = /\b(today|tomorrow|tonight|this week|this month|by friday|by monday|by end|eod|eow|asap|urgent|now|later today|before|after|next week|this afternoon|this evening|in \d+ (hour|day|week|month))\b/i;

// Person references (indicates delegation or communication)
const PERSON_REFERENCE = /\b(sarah|mike|john|team|manager|client|customer|boss|colleague|friend|mom|dad|wife|husband|partner|doctor|lawyer|accountant)\b/i;

/**
 * Score a thought's quality (0-100).
 * Higher = more actionable = more likely to be completed.
 */
function scoreThoughtQuality(content) {
  const lower = content.toLowerCase().trim();
  const words = lower.split(/\s+/);

  let score = 50; // baseline
  const dimensions = [];
  const coaching = [];

  // ── Dimension 1: Verb Specificity (±20 points) ──────────────────────
  const firstWord = words[0]?.replace(/[^a-z]/g, '');
  let verbScore = 0;

  if (ACTION_VERBS.has(firstWord)) {
    verbScore = 20;
    dimensions.push({ name: 'verb', score: 20, detail: `Starts with specific action: "${firstWord}"` });
  } else if (VAGUE_VERBS.has(firstWord)) {
    verbScore = -10;
    dimensions.push({ name: 'verb', score: -10, detail: `Vague opener: "${firstWord}" — try "email", "call", "send"` });
    coaching.push(`Instead of "${firstWord}", try starting with a specific action like "email", "call", or "send".`);
  } else {
    // Check if ANY verb in the thought is specific
    const hasSpecificVerb = words.some(w => ACTION_VERBS.has(w.replace(/[^a-z]/g, '')));
    if (hasSpecificVerb) {
      verbScore = 10;
      dimensions.push({ name: 'verb', score: 10, detail: 'Contains an action verb' });
    }
  }
  score += verbScore;

  // ── Dimension 2: Deadline Presence (±15 points) ─────────────────────
  const hasDeadline = TIME_MARKERS.test(content);
  if (hasDeadline) {
    score += 15;
    dimensions.push({ name: 'deadline', score: 15, detail: 'Has a time marker or deadline' });
  } else {
    score -= 5;
    dimensions.push({ name: 'deadline', score: -5, detail: 'No deadline — add "by Friday" or "today"' });
    coaching.push('Add a deadline: "by Friday", "today", "this week". Thoughts with deadlines complete 2x more often.');
  }

  // ── Dimension 3: Specificity (±15 points) ───────────────────────────
  const hasSpecificNouns = /\b(acme|proposal|report|meeting|presentation|invoice|contract|bug|feature|ticket|pr|pull request|document|spreadsheet|email|slack|github|figma|jira|linear)\b/i.test(content);
  const hasProperNouns = /[A-Z][a-z]+/.test(content); // capitalized words = likely names
  const wordCount = words.length;

  let specificityScore = 0;
  if (hasSpecificNouns) specificityScore += 8;
  if (hasProperNouns) specificityScore += 4;
  if (wordCount >= 5 && wordCount <= 20) specificityScore += 3; // not too short, not too long

  score += specificityScore;
  dimensions.push({
    name: 'specificity',
    score: specificityScore,
    detail: hasSpecificNouns ? 'References specific items' : 'Could be more specific',
  });

  if (!hasSpecificNouns && !hasProperNouns) {
    coaching.push('Add specifics: mention the project name, person, or tool involved.');
  }

  // ── Dimension 4: Actionability (±10 points) ─────────────────────────
  const isQuestion = content.trim().endsWith('?');
  const isNegative = /\b(not|don\'t|can\'t|won\'t|shouldn\'t|isn\'t|aren\'t)\b/.test(lower);
  const hasPerson = PERSON_REFERENCE.test(content);

  let actionScore = 0;
  if (isQuestion) {
    actionScore -= 5;
    coaching.push('Questions are hard to complete. Convert to an action: "Ask Sarah about..."');
  }
  if (isNegative) {
    actionScore -= 3;
    coaching.push('Negative framing ("don\'t forget") is harder to act on. Try positive: "Remember to..."');
  }
  if (hasPerson) {
    actionScore += 5;
    dimensions.push({ name: 'social', score: 5, detail: 'References a person — good for accountability' });
  }

  score += actionScore;

  // ── Dimension 5: Completeness (±10 points) ──────────────────────────
  if (wordCount < 3) {
    score -= 10;
    dimensions.push({ name: 'completeness', score: -10, detail: 'Too brief — add context' });
    coaching.push('Add a bit more detail so you remember the context later.');
  } else if (wordCount >= 5) {
    score += 5;
    dimensions.push({ name: 'completeness', score: 5, detail: 'Good detail level' });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F',
    label: score >= 80 ? 'Highly Actionable' :
           score >= 60 ? 'Actionable' :
           score >= 40 ? 'Needs Improvement' :
           score >= 20 ? 'Vague' : 'Rewrite Suggested',
    dimensions,
    coaching: coaching.slice(0, 2), // max 2 tips
  };
}

/**
 * Batch score multiple thoughts and return aggregate insights.
 */
function scoreBatchQuality(thoughts) {
  const scores = thoughts.map(t => ({
    id: t.id,
    content: t.content,
    ...scoreThoughtQuality(t.content),
  }));

  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const s of scores) gradeDistribution[s.grade]++;

  return {
    scores,
    aggregate: {
      averageScore: Math.round(avgScore),
      averageGrade: avgScore >= 80 ? 'A' : avgScore >= 60 ? 'B' : avgScore >= 40 ? 'C' : avgScore >= 20 ? 'D' : 'F',
      totalThoughts: thoughts.length,
      gradeDistribution,
      topCoaching: getTopCoaching(scores),
    },
  };
}

/**
 * Get the most common coaching suggestions across all scored thoughts.
 */
function getTopCoaching(scores) {
  const coachingCounts = {};
  for (const s of scores) {
    for (const tip of s.coaching) {
      coachingCounts[tip] = (coachingCounts[tip] || 0) + 1;
    }
  }

  return Object.entries(coachingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tip, count]) => ({ tip, occurrences: count }));
}

module.exports = {
  scoreThoughtQuality,
  scoreBatchQuality,
  VAGUE_VERBS,
  ACTION_VERBS,
};
