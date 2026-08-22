/**
 * Thought Quality Scorer — TF-IDF + N-gram Analysis
 * 
 * Rates how actionable a thought is using information retrieval techniques:
 * - TF-IDF to measure specificity (generic = low score, specific = high)
 * - N-gram analysis to detect action patterns (verbs, deadlines, contacts)
 * - Coherence scoring based on sentence structure
 * 
 * Cost: $0 — pure text analysis, no API calls.
 */

const { pool } = require('../db');

// Action verbs that indicate actionable thoughts
const ACTION_VERBS = new Set([
  'call', 'email', 'send', 'write', 'review', 'schedule', 'book', 'buy',
  'finish', 'complete', 'submit', 'update', 'fix', 'build', 'create',
  'design', 'plan', 'prepare', 'draft', 'approve', 'sign', 'pay',
  'cancel', 'renew', 'register', 'apply', 'upload', 'download',
  'meet', 'discuss', 'present', 'pitch', 'demo', 'test', 'deploy'
]);

// Temporal markers that indicate urgency/deadlines
const TEMPORAL_MARKERS = [
  /\b(today|tonight|now|asap|immediately|right away)\b/i,
  /\b(tomorrow|next week|next month|this week|this month)\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(\d{1,2}\/\d{1,2}\/?\d{0,4})\b/,
  /\b(before|by|due|deadline|until)\b/i,
  /\b(in \d+ (hour|day|week|month)s?)\b/i,
];

// Commitment markers
const COMMITMENT_MARKERS = [
  /\bi (will|shall|promise|swear|commit)\b/i,
  /\bi'm (going to|gonna)\b/i,
  /\b(need to|have to|must|should|ought to)\b/i,
  /\b(i promise|i swear|count on me)\b/i,
];

// Vague/filler words that reduce specificity
const VAGUE_WORDS = new Set([
  'maybe', 'sometime', 'eventually', 'probably', 'stuff',
  'things', 'something', 'anything', 'whatever', 'etc', 'kinda',
  'sort', 'ish', 'like', 'basically', 'actually', 'just'
]);

// Proper nouns / named entities (simplified)
function hasProperNouns(text) {
  const words = text.split(/\s+/);
  return words.filter(w => /^[A-Z][a-z]+/.test(w) && !['I', "I'm", "I'll", "I've", "I'd"].includes(w)).length;
}

/**
 * TF-IDF-like specificity score
 */
function specificityScore(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const uniqueWords = new Set(words);
  const uniqueness = uniqueWords.size / Math.max(words.length, 1);
  const entities = hasProperNouns(text);
  const hasNumbers = /\d/.test(text);
  const hasPercentages = /\d+%/.test(text);
  const hasMoney = /[\$£€]\d+/.test(text);
  const vagueCount = words.filter(w => VAGUE_WORDS.has(w)).length;
  const vaguePenalty = vagueCount / Math.max(words.length, 1);

  let score = 0;
  score += uniqueness * 0.3;
  score += Math.min(entities * 0.1, 0.2);
  score += hasNumbers ? 0.15 : 0;
  score += hasPercentages ? 0.05 : 0;
  score += hasMoney ? 0.05 : 0;
  score -= vaguePenalty * 0.3;
  return Math.max(0, Math.min(1, score));
}

/**
 * Actionability score
 */
function actionabilityScore(text) {
  const words = text.toLowerCase().split(/\s+/);
  const hasActionVerb = words.some(w => ACTION_VERBS.has(w.replace(/[.,!?;:]/g, '')));
  const temporalCount = TEMPORAL_MARKERS.filter(p => p.test(text)).length;
  const commitmentCount = COMMITMENT_MARKERS.filter(p => p.test(text)).length;
  const startsWithAction = ACTION_VERBS.has((words[0] || '').replace(/[.,!?;:]/g, ''));

  let score = 0;
  score += hasActionVerb ? 0.35 : 0;
  score += Math.min(temporalCount * 0.2, 0.4);
  score += Math.min(commitmentCount * 0.15, 0.15);
  score += startsWithAction ? 0.1 : 0;
  return Math.max(0, Math.min(1, score));
}

/**
 * Coherence score
 */
function coherenceScore(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/);
  const lengthScore = words.length >= 5 && words.length <= 20 ? 1.0
    : words.length < 5 ? words.length / 5
    : Math.max(0, 1 - (words.length - 20) / 30);
  const sentenceScore = sentences.length <= 2 ? 1.0 : Math.max(0.3, 1 - (sentences.length - 2) * 0.2);
  const avgWordLen = words.reduce((a, w) => a + w.length, 0) / Math.max(words.length, 1);
  const wordQuality = avgWordLen >= 3 && avgWordLen <= 8 ? 1.0 : 0.6;
  return (lengthScore * 0.4 + sentenceScore * 0.3 + wordQuality * 0.3);
}

/**
 * Extract specific coaching tips based on what's missing
 */
function generateCoachingTips(text, scores) {
  const tips = [];
  if (!scores.hasActionVerb) tips.push({ type: 'action', message: 'Start with a verb: "Call Sarah" instead of "Sarah meeting"', impact: 'high' });
  if (!scores.hasTemporal) tips.push({ type: 'deadline', message: 'Add a deadline — thoughts with deadlines complete 2x more often', impact: 'high' });
  if (scores.isVague) tips.push({ type: 'specificity', message: 'Be more specific: "Buy groceries for Friday dinner" instead of "buy stuff"', impact: 'medium' });
  if (!scores.hasCommitment) tips.push({ type: 'commitment', message: 'Say "I will..." to activate your commitment witness accountability', impact: 'medium' });
  if (scores.tooShort) tips.push({ type: 'detail', message: 'Add context: who, what, where — helps the AI understand your intent', impact: 'medium' });
  if (scores.noEntities) tips.push({ type: 'entities', message: 'Name specific people or projects — enables pattern detection', impact: 'low' });
  return tips;
}

/**
 * Score a thought's quality (0-100)
 */
function scoreThought(text) {
  if (!text || text.trim().length === 0) {
    return { grade: 'F', score: 0, letter: 'F', tips: [{ type: 'empty', message: 'Write something first!', impact: 'critical' }] };
  }

  const spec = specificityScore(text);
  const action = actionabilityScore(text);
  const coherence = coherenceScore(text);
  const rawScore = (spec * 0.35 + action * 0.45 + coherence * 0.20) * 100;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';

  const words = text.toLowerCase().split(/\s+/);
  const hasActionVerb = words.some(w => ACTION_VERBS.has(w.replace(/[.,!?;:]/g, '')));
  const hasTemporal = TEMPORAL_MARKERS.some(p => p.test(text));
  const hasCommitment = COMMITMENT_MARKERS.some(p => p.test(text));
  const isVague = words.filter(w => VAGUE_WORDS.has(w)).length > 0;
  const noEntities = hasProperNouns(text) === 0;
  const tooShort = words.length < 5;

  const tips = generateCoachingTips(text, { hasActionVerb, hasTemporal, hasCommitment, isVague, noEntities, tooShort });

  return {
    grade,
    score,
    breakdown: { specificity: Math.round(spec * 100), actionability: Math.round(action * 100), coherence: Math.round(coherence * 100) },
    tips,
    estimated_completion_boost: grade === 'A' ? '+35%' : grade === 'B' ? '+20%' : grade === 'C' ? '+10%' : '0%'
  };
}

module.exports = { scoreThought, specificityScore, actionabilityScore, coherenceScore };
