/**
 * Thought Classification System - Phase 8 Extension
 * 
 * Classifies thoughts by:
 * 1. Cognitive Load (Creative vs Analytical)
 * 2. Brain Fragment (Frontal, Parietal, Temporal, Occipital)
 * 3. Theme (Work, Finance, Health, Relationships, etc.)
 * 
 * Uses existing LLM routing - NO COST
 */

// ============================================
// 1. CLASSIFICATION PROMPTS (All free - use existing LLM)
// ============================================

const COGNITIVE_LOAD_PROMPT = `Classify this thought by cognitive load:

"\${THOUGHT}"

Return JSON with:
- load_type: "creative" or "analytical"
- load_intensity: 1-10
- brain_area: "frontal" (planning), "parietal" (sensory), "temporal" (memory), "occipital" (visual)
- emotional_tone: "happy", "sad", "neutral", "anxious", "excited"

Return ONLY valid JSON.`;

const THEME_PROMPT = `Classify this thought by theme and relationship:

"\${THOUGHT}"

Return JSON with:
- primary_theme: "work", "finance", "health", "relationships", "ideas", "tasks", "personal", "goals"
- secondary_themes: array of related themes
- mentioned_people: array of people mentioned
- urgency: "low", "medium", "high"
- emotional_context: brief description of why this matters

Return ONLY valid JSON.`;

// ============================================
// 2. CLASSIFICATION FUNCTIONS
// ============================================

/**
 * Classify thought by cognitive load
 * @param {object} llmRouter - LLM router function
 * @param {string} thought - User's thought
 * @returns {Promise<object>} - Classification result
 */
async function classifyCognitiveLoad(llmRouter, thought) {
  const prompt = COGNITIVE_LOAD_PROMPT.replace('{{THOUGHT}}', thought);
  
  try {
    const response = await llmRouter({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-3.5-turbo',
      temperature: 0.3
    });
    
    const content = response.choices?.[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (parseError) {
      return {
        load_type: 'analytical',
        load_intensity: 5,
        brain_area: 'frontal',
        emotional_tone: 'neutral'
      };
    }
  } catch (error) {
    console.error('Error classifying cognitive load:', error);
    return {
      load_type: 'analytical',
      load_intensity: 5,
      brain_area: 'frontal',
      emotional_tone: 'neutral'
    };
  }
}

/**
 * Classify thought by theme
 * @param {object} llmRouter - LLM router function
 * @param {string} thought - User's thought
 * @returns {Promise<object>} - Theme classification result
 */
async function classifyTheme(llmRouter, thought) {
  const prompt = THEME_PROMPT.replace('{{THOUGHT}}', thought);
  
  try {
    const response = await llmRouter({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-3.5-turbo',
      temperature: 0.3
    });
    
    const content = response.choices?.[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (parseError) {
      return {
        primary_theme: 'personal',
        secondary_themes: [],
        mentioned_people: [],
        urgency: 'low',
        emotional_context: null
      };
    }
  } catch (error) {
    console.error('Error classifying theme:', error);
    return {
      primary_theme: 'personal',
      secondary_themes: [],
      mentioned_people: [],
      urgency: 'low',
      emotional_context: null
    };
  }
}

/**
 * Classify thought with both cognitive load and theme
 * @param {object} llmRouter - LLM router function
 * @param {string} thought - User's thought
 * @returns {Promise<object>} - Full classification result
 */
async function classifyThought(llmRouter, thought) {
  const [cognitive, theme] = await Promise.all([
    classifyCognitiveLoad(llmRouter, thought),
    classifyTheme(llmRouter, thought)
  ]);
  
  return {
    thought,
    cognitive_load: cognitive,
    theme_classification: theme,
    classified_at: new Date().toISOString()
  };
}

// ============================================
// 3. INFERRED CLASSIFICATIONS (No LLM needed)
// ============================================

/**
 * Inferred cognitive load based on keywords
 * @param {string} thought - User's thought
 * @returns {object} - Inferred classification
 */
function inferCognitiveLoad(thought) {
  const creativeKeywords = ['create', 'design', 'imagine', 'dream', 'invent', 'write', 'art', 'music', 'draw'];
  const analyticalKeywords = ['analyze', 'calculate', 'compare', 'plan', 'strategy', 'budget', 'timeline', 'schedule'];
  const emotionalKeywords = ['happy', 'sad', 'angry', 'excited', 'anxious', 'love', 'hate'];
  
  const thoughtLower = thought.toLowerCase();
  
  let creativeCount = 0, analyticalCount = 0, emotionalCount = 0;
  
  creativeKeywords.forEach(kw => {
    if (thoughtLower.includes(kw)) creativeCount++;
  });
  
  analyticalKeywords.forEach(kw => {
    if (thoughtLower.includes(kw)) analyticalCount++;
  });
  
  emotionalKeywords.forEach(kw => {
    if (thoughtLower.includes(kw)) emotionalCount++;
  });
  
  let loadType = 'analytical';
  if (creativeCount > analyticalCount) loadType = 'creative';
  
  let brainArea = 'frontal';
  if (thoughtLower.includes('see') || thoughtLower.includes('look')) brainArea = 'occipital';
  else if (thoughtLower.includes('feel') || thoughtLower.includes('hear')) brainArea = 'parietal';
  else if (thoughtLower.includes('remember') || thoughtLower.includes('past')) brainArea = 'temporal';
  
  let emotionalTone = 'neutral';
  if (emotionalCount > 0) emotionalTone = 'emotional';
  else if (creativeCount > 0) emotionalTone = 'excited';
  
  return {
    load_type: loadType,
    load_intensity: Math.min(10, creativeCount + analyticalCount + 2),
    brain_area: brainArea,
    emotional_tone: emotionalTone,
    inferred: true
  };
}

/**
 * Inferred theme based on keywords
 * @param {string} thought - User's thought
 * @returns {object} - Inferred theme classification
 */
function inferTheme(thought) {
  const themeKeywords = {
    work: ['work', 'job', 'meeting', 'project', 'deadline', 'boss', 'client', 'presentation'],
    finance: ['money', 'budget', 'bill', 'pay', 'invest', 'buy', 'price', 'cost'],
    health: ['doctor', 'health', 'exercise', 'food', 'eat', 'sleep', 'pain', 'symptom'],
    relationships: ['mom', 'dad', 'wife', 'husband', 'friend', 'boyfriend', 'girlfriend', 'family'],
    ideas: ['idea', 'think', 'wonder', 'what if', 'maybe', 'imagine'],
    tasks: ['task', 'todo', 'list', 'done', 'finish', 'complete'],
    personal: ['personal', 'myself', 'feel', 'emotion', 'mind'],
    goals: ['goal', 'target', 'aim', 'future', 'someday', 'want to']
  };
  
  const thoughtLower = thought.toLowerCase();
  
  let primaryTheme = 'personal';
  let maxCount = 0;
  const mentionedPeople = [];
  
  // Check for people mentions
  const people = ['mom', 'dad', 'wife', 'husband', 'friend', 'boss', 'client', 'saurav'];
  people.forEach(person => {
    if (thoughtLower.includes(person)) mentionedPeople.push(person);
  });
  
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    let count = 0;
    keywords.forEach(kw => {
      if (thoughtLower.includes(kw)) count++;
    });
    
    if (count > maxCount) {
      maxCount = count;
      primaryTheme = theme;
    }
  }
  
  return {
    primary_theme: primaryTheme,
    secondary_themes: Object.keys(themeKeywords).filter(t => t !== primaryTheme && thoughtLower.includes(t)),
    mentioned_people: mentionedPeople,
    urgency: maxCount > 2 ? 'high' : 'low',
    inferred: true
  };
}

/**
 * Infer full classification without LLM
 * @param {string} thought - User's thought
 * @returns {object} - Full inferred classification
 */
function inferClassification(thought) {
  return {
    thought,
    cognitive_load: inferCognitiveLoad(thought),
    theme_classification: inferTheme(thought),
    inferred: true,
    classified_at: new Date().toISOString()
  };
}

// ============================================
// 4. MEMORY GRAPH INTEGRATION
// ============================================

/**
 * Store classification in memory graph
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {object} classification - Classification result
 * @returns {Promise<object>} - Inserted record
 */
async function storeClassification(db, userId, classification) {
  const { thought, cognitive_load, theme_classification, inferred } = classification;
  
  // Store the original thought
  const thoughtResult = await db.query(
    `INSERT INTO memory_graph (user_id, content, category, status, created_at)
     VALUES ($1, $2, $3, 'classified', NOW())
     RETURNING id`,
    [userId, thought, theme_classification.primary_theme]
  );
  
  const thoughtId = thoughtResult.rows[0].id;
  
  // Store cognitive load attributes
  await db.query(
    `INSERT INTO memory_graph (user_id, entity, attribute, value, created_at)
     VALUES ($1, 'thought_${thoughtId}', 'cognitive.load_type', $2, NOW())`,
    [userId, cognitive_load.load_type]
  );
  
  await db.query(
    `INSERT INTO memory_graph (user_id, entity, attribute, value, created_at)
     VALUES ($1, 'thought_${thoughtId}', 'cognitive.brain_area', $2, NOW())`,
    [userId, cognitive_load.brain_area]
  );
  
  await db.query(
    `INSERT INTO memory_graph (user_id, entity, attribute, value, created_at)
     VALUES ($1, 'thought_${thoughtId}', 'theme.primary', $2, NOW())`,
    [userId, theme_classification.primary_theme]
  );
  
  // Store emotional context if exists
  if (theme_classification.emotional_context) {
    await db.query(
      `INSERT INTO memory_graph (user_id, entity, attribute, value, created_at)
       VALUES ($1, 'thought_${thoughtId}', 'theme.emotional_context', $2, NOW())`,
      [userId, theme_classification.emotional_context]
    );
  }
  
  return { thoughtId, ...classification };
}

/**
 * Get classification statistics for user
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Statistics object
 */
async function getClassificationStats(db, userId) {
  // Count by primary theme
  const themeCounts = await db.query(
    `SELECT attribute as theme, COUNT(*) as count
     FROM memory_graph
     WHERE user_id = $1 AND attribute = 'theme.primary'
     GROUP BY attribute
     ORDER BY count DESC`,
    [userId]
  );
  
  // Count by cognitive load type
  const loadCounts = await db.query(
    `SELECT attribute as load_type, COUNT(*) as count
     FROM memory_graph
     WHERE user_id = $1 AND attribute = 'cognitive.load_type'
     GROUP BY attribute
     ORDER BY count DESC`,
    [userId]
  );
  
  // Count by brain area
  const brainCounts = await db.query(
    `SELECT attribute as brain_area, COUNT(*) as count
     FROM memory_graph
     WHERE user_id = $1 AND attribute = 'cognitive.brain_area'
     GROUP BY attribute
     ORDER BY count DESC`,
    [userId]
  );
  
  // Total thoughts
  const total = await db.query(
    `SELECT COUNT(*) as count FROM memory_graph WHERE user_id = $1 AND category = 'general'`,
    [userId]
  );
  
  return {
    total_thoughts: parseInt(total.rows[0].count) || 0,
    theme_distribution: themeCounts.rows,
    load_distribution: loadCounts.rows,
    brain_distribution: brainCounts.rows
  };
}

/**
 * Get brain fragments visualization data
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Brain fragments data
 */
async function getBrainFragments(db, userId) {
  const stats = await getClassificationStats(db, userId);
  
  // Map brain areas to percentages
  const brainData = {
    frontal: { name: 'Frontal Lobe', function: 'Planning & Decision Making', value: 0, color: '#f08c29' },
    parietal: { name: 'Parietal Lobe', function: 'Sensory Processing', value: 0, color: '#198038' },
    temporal: { name: 'Temporal Lobe', function: 'Memory & Language', value: 0, color: '#0066cc' },
    occipital: { name: 'Occipital Lobe', function: 'Visual Processing', value: 0, color: '#ff6b6b' }
  };
  
  // Calculate values from brain distribution
  for (const row of stats.brain_distribution) {
    if (brainData[row.brain_area]) {
      brainData[row.brain_area].value = row.count;
    }
  }
  
  // Normalize to percentages (relative to each other)
  const total = Object.values(brainData).reduce((sum, b) => sum + b.value, 0) || 1;
  for (const key in brainData) {
    brainData[key].percentage = Math.round((brainData[key].value / total) * 100);
  }
  
  return brainData;
}

/**
 * Get cognitive load distribution
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Cognitive load data
 */
async function getCognitiveDistribution(db, userId) {
  const stats = await getClassificationStats(db, userId);
  
  const loadDistribution = {
    creative: { name: 'Creative Thinking', value: 0, color: '#f08c29' },
    analytical: { name: 'Analytical Thinking', value: 0, color: '#198038' },
    emotional: { name: 'Emotional Processing', value: 0, color: '#0066cc' }
  };
  
  for (const row of stats.load_distribution) {
    if (loadDistribution[row.load_type]) {
      loadDistribution[row.load_type].value = row.count;
    }
  }
  
  const total = Object.values(loadDistribution).reduce((sum, l) => sum + l.value, 0) || 1;
  for (const key in loadDistribution) {
    loadDistribution[key].percentage = Math.round((loadDistribution[key].value / total) * 100);
  }
  
  return loadDistribution;
}

// ============================================
// 5. HTTP ENDPOINTS
// ============================================

/**
 * Register classification endpoints
 * @param {object} app - Express app
 * @param {object} db - PostgreSQL pool
 * @param {object} llmRouter - LLM router
 */
function createClassificationEndpoints(app, db, llmRouter) {
  // POST /api/classify/thought - Classify a thought
  app.post('/api/classify/thought', async (req, res) => {
    try {
      const { userId, thought } = req.body;
      
      if (!userId || !thought) {
        return res.status(400).json({ error: 'userId and thought are required' });
      }
      
      const classification = await classifyThought(llmRouter, thought);
      const stored = await storeClassification(db, userId, classification);
      
      res.json({ success: true, classification, stored });
    } catch (error) {
      console.error('Error classifying thought:', error);
      res.status(500).json({ error: 'Failed to classify thought' });
    }
  });
  
  // POST /api/classify/infer - Inferred classification (no LLM)
  app.post('/api/classify/infer', async (req, res) => {
    try {
      const { thought } = req.body;
      
      if (!thought) {
        return res.status(400).json({ error: 'thought is required' });
      }
      
      const classification = inferClassification(thought);
      
      res.json({ success: true, classification, inferred: true });
    } catch (error) {
      console.error('Error inferring classification:', error);
      res.status(500).json({ error: 'Failed to infer classification' });
    }
  });
  
  // GET /api/classify/stats/:userId - Get classification statistics
  app.get('/api/classify/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const stats = await getClassificationStats(db, userId);
      
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });
  
  // GET /api/classify/brain/:userId - Get brain fragments data
  app.get('/api/classify/brain/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const brainData = await getBrainFragments(db, userId);
      
      res.json({ success: true, brainData });
    } catch (error) {
      console.error('Error getting brain fragments:', error);
      res.status(500).json({ error: 'Failed to get brain fragments' });
    }
  });
  
  // GET /api/classify/cognitive/:userId - Get cognitive distribution
  app.get('/api/classify/cognitive/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const cognitiveData = await getCognitiveDistribution(db, userId);
      
      res.json({ success: true, cognitiveData });
    } catch (error) {
      console.error('Error getting cognitive distribution:', error);
      res.status(500).json({ error: 'Failed to get cognitive distribution' });
    }
  });
}

module.exports = {
  classifyCognitiveLoad,
  classifyTheme,
  classifyThought,
  inferCognitiveLoad,
  inferTheme,
  inferClassification,
  storeClassification,
  getClassificationStats,
  getBrainFragments,
  getCognitiveDistribution,
  createClassificationEndpoints
};
