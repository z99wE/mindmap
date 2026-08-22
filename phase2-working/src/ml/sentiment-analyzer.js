/**
 * Lightweight Sentiment Analyzer — Lexicon-Based
 * 
 * Analyzes emotional tone and cognitive state of thoughts using:
 * - VADER-inspired sentiment lexicon (adapted for thought capture)
 * - Cognitive load indicators (uncertainty, pressure, overwhelm)
 * - Urgency detection without LLM
 * 
 * Cost: $0 — pure text analysis, no API calls.
 */

// Emotion lexicons (curated for thought capture context)
const POSITIVE_WORDS = new Map([
  ['happy', 0.8], ['great', 0.7], ['love', 0.9], ['excited', 0.8],
  ['amazing', 0.8], ['wonderful', 0.8], ['perfect', 0.7], ['excellent', 0.7],
  ['awesome', 0.7], ['fantastic', 0.8], ['brilliant', 0.7], ['proud', 0.7],
  ['grateful', 0.8], ['thankful', 0.7], ['hopeful', 0.6], ['confident', 0.7],
  ['accomplished', 0.8], ['motivated', 0.7], ['inspired', 0.7], ['energized', 0.7],
  ['relieved', 0.6], ['satisfied', 0.6], ['thrilled', 0.8], ['delighted', 0.7],
  ['enjoy', 0.6], ['fun', 0.6], ['celebrate', 0.7], ['win', 0.7],
  ['success', 0.7], ['progress', 0.6], ['improve', 0.5], ['better', 0.5],
  ['good', 0.5], ['nice', 0.4], ['cool', 0.4], ['yay', 0.7],
  ['yes', 0.4], ['done', 0.5], ['finished', 0.5], ['complete', 0.5],
]);

const NEGATIVE_WORDS = new Map([
  ['sad', -0.8], ['angry', -0.8], ['frustrated', -0.7], ['annoyed', -0.6],
  ['worried', -0.6], ['anxious', -0.7], ['stressed', -0.7], ['overwhelmed', -0.8],
  ['depressed', -0.9], ['miserable', -0.9], ['terrible', -0.8], ['awful', -0.8],
  ['hate', -0.8], ['disgusted', -0.7], ['furious', -0.8], ['resentful', -0.7],
  ['disappointed', -0.6], ['regret', -0.7], ['fail', -0.7], ['failed', -0.7],
  ['failure', -0.8], ['broken', -0.6], ['ruined', -0.7], ['lost', -0.5],
  ['lonely', -0.7], ['isolated', -0.6], ['exhausted', -0.6], ['tired', -0.4],
  ['bored', -0.4], ['confused', -0.4], ['lost', -0.5], ['stuck', -0.5],
  ['problem', -0.4], ['issue', -0.3], ['bug', -0.3], ['error', -0.4],
  ['urgent', -0.3], ['asap', -0.4], ['panic', -0.8], ['crisis', -0.8],
  ['never', -0.3], ['can\'t', -0.4], ['impossible', -0.5], ['hopeless', -0.8],
]);

const COGNITIVE_LOAD_WORDS = new Map([
  ['maybe', 0.3], ['perhaps', 0.2], ['unsure', 0.4], ['uncertain', 0.4],
  ['confused', 0.5], ['complicated', 0.4], ['complex', 0.3], ['difficult', 0.3],
  ['overwhelmed', 0.7], ['swamped', 0.6], ['drowning', 0.7], ['chaos', 0.6],
  ['scattered', 0.5], ['fragmented', 0.4], ['disorganized', 0.5], ['messy', 0.4],
  ['multiple', 0.2], ['many', 0.2], ['several', 0.2], ['lots', 0.3],
  ['deadline', 0.4], ['rushed', 0.5], ['behind', 0.4], ['late', 0.3],
  ['catching up', 0.4], ['backlog', 0.5], ['pile', 0.4], ['accumulated', 0.4],
]);

const INTENSITY_MODIFIERS = new Map([
  ['very', 1.5], ['extremely', 2.0], ['incredibly', 1.8], ['absolutely', 1.8],
  ['really', 1.3], ['super', 1.4], ['so', 1.2], ['quite', 1.1],
  ['slightly', 0.5], ['barely', 0.4], ['hardly', 0.3], ['somewhat', 0.6],
  ['a bit', 0.5], ['a little', 0.5], ['kind of', 0.5], ['sort of', 0.5],
]);

const NEGATION_WORDS = new Set(['not', 'no', 'never', 'neither', 'nobody', 'nothing', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't", "shouldn't", "isn't", "aren't", "wasn't", "weren't"]);

/**
 * Analyze sentiment of a thought
 */
function analyzeSentiment(text) {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: 'neutral', emotions: [], cognitive_load: 0 };
  }
  
  const words = text.toLowerCase().split(/\s+/);
  let sentimentScore = 0;
  let intensity = 1;
  let negate = false;
  let positiveCount = 0;
  let negativeCount = 0;
  let cognitiveLoad = 0;
  const emotions = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:'"]/g, '');
    
    // Check for negation
    if (NEGATION_WORDS.has(word)) {
      negate = true;
      continue;
    }
    
    // Check for intensity modifiers
    if (INTENSITY_MODIFIERS.has(word)) {
      intensity = INTENSITY_MODIFIERS.get(word);
      continue;
    }
    
    // Check positive words
    if (POSITIVE_WORDS.has(word)) {
      let score = POSITIVE_WORDS.get(word) * intensity;
      if (negate) score *= -0.75;
      sentimentScore += score;
      positiveCount++;
      if (score > 0.5) emotions.push({ word, sentiment: 'positive', score: Math.round(score * 100) / 100 });
      negate = false;
      intensity = 1;
    }
    
    // Check negative words
    if (NEGATIVE_WORDS.has(word)) {
      let score = NEGATIVE_WORDS.get(word) * intensity;
      if (negate) score *= -0.75;
      sentimentScore += score;
      negativeCount++;
      if (score < -0.3) emotions.push({ word, sentiment: 'negative', score: Math.round(score * 100) / 100 });
      negate = false;
      intensity = 1;
    }
    
    // Check cognitive load
    if (COGNITIVE_LOAD_WORDS.has(word)) {
      cognitiveLoad += COGNITIVE_LOAD_WORDS.get(word);
    }
    
    // Reset negation after 2 words
    if (negate && i > 0 && !INTENSITY_MODIFIERS.has(word)) {
      negate = false;
    }
  }
  
  // Normalize scores
  const totalWords = words.length || 1;
  const normalizedSentiment = sentimentScore / Math.sqrt(totalWords); // TF-like normalization
  const normalizedCognitiveLoad = Math.min(1, cognitiveLoad / Math.sqrt(totalWords));
  
  // Determine label
  let label;
  if (normalizedSentiment > 0.3) label = 'positive';
  else if (normalizedSentiment < -0.3) label = 'negative';
  else label = 'neutral';
  
  // Detect emotional state
  const emotionalState = detectEmotionalState(normalizedSentiment, normalizedCognitiveLoad, positiveCount, negativeCount);
  
  return {
    score: Math.round(normalizedSentiment * 100) / 100,
    label,
    cognitive_load: Math.round(normalizedCognitiveLoad * 100) / 100,
    emotions: emotions.slice(0, 5), // Top 5
    emotional_state: emotionalState,
    word_count: totalWords,
    positive_signals: positiveCount,
    negative_signals: negativeCount,
    suggestion: generateEmotionalSuggestion(label, normalizedCognitiveLoad, emotionalState)
  };
}

/**
 * Detect overall emotional state
 */
function detectEmotionalState(sentiment, cognitiveLoad, positiveCount, negativeCount) {
  if (sentiment > 0.5 && cognitiveLoad < 0.3) return 'flow_state';
  if (sentiment > 0.3 && cognitiveLoad < 0.4) return 'positive_focus';
  if (sentiment > 0) return 'neutral_engaged';
  if (sentiment < -0.3 && cognitiveLoad > 0.5) return 'overwhelmed';
  if (sentiment < -0.3) return 'negative_distress';
  if (cognitiveLoad > 0.5) return 'high_cognitive_load';
  return 'neutral';
}

/**
 * Generate emotional suggestion
 */
function generateEmotionalSuggestion(label, cognitiveLoad, state) {
  switch (state) {
    case 'overwhelmed':
      return 'Your thought shows signs of overwhelm. Consider breaking this into smaller steps. What\'s the ONE thing you can do right now?';
    case 'negative_distress':
      return 'This thought carries emotional weight. Acknowledging it is the first step. Would setting a specific action help?';
    case 'high_cognitive_load':
      return 'High cognitive complexity detected. Try simplifying: who, what, by when?';
    case 'flow_state':
      return 'Great energy! You\'re in a good state. Capture this momentum — what\'s the next action?';
    case 'positive_focus':
      return 'Positive and focused. A great time to commit to a specific next step.';
    default:
      return null;
  }
}

/**
 * Batch analyze multiple thoughts for patterns
 */
function analyzeThoughtPatterns(thoughts) {
  if (!thoughts.length) return { patterns: [], overall_sentiment: 0 };
  
  const analyses = thoughts.map(t => ({
    ...analyzeSentiment(t.content || t),
    thought: t
  }));
  
  const overallSentiment = analyses.reduce((a, b) => a + b.score, 0) / analyses.length;
  const avgCognitiveLoad = analyses.reduce((a, b) => a + b.cognitive_load, 0) / analyses.length;
  
  // Detect trends
  const stateCounts = {};
  analyses.forEach(a => {
    const state = a.emotional_state;
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  });
  
  const dominantState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0];
  
  return {
    overall_sentiment: Math.round(overallSentiment * 100) / 100,
    average_cognitive_load: Math.round(avgCognitiveLoad * 100) / 100,
    dominant_emotional_state: dominantState ? dominantState[0] : 'neutral',
    state_distribution: stateCounts,
    thought_count: thoughts.length
  };
}

module.exports = { analyzeSentiment, analyzeThoughtPatterns };
