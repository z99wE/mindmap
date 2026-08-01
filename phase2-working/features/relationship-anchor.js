/**
 * Relationship Memory Anchor - Phase 8 Feature
 * 
 * Extracts relationship context from thoughts (who asked, why it matters)
 * Stores emotional weight and context alongside tasks
 * Enhances notifications with relationship context
 */

/**
 * LLM prompt to extract relationship context
 */
const RELATIONSHIP_EXTRACTION_PROMPT = `Extract relationship context from the following thought.

Thought: "{{THOUGHT}}"

Return a JSON object with:
- requested_by: The person who asked (if mentioned)
- context_note: Context about why this matters
- emotional_weight_score: 1-5 based on urgency and personal significance
- category: Suggested category for the task (grocery, health, work, personal, gift, etc.)

Return ONLY valid JSON, no additional text.`;

/**
 * Extract relationship context from a thought
 * @param {object} llmRouter - LLM router function
 * @param {string} thought - The user's thought
 * @returns {Promise<object>} - Extracted context
 */
async function extractRelationshipContext(llmRouter, thought) {
  const prompt = RELATIONSHIP_EXTRACTION_PROMPT.replace('{{THOUGHT}}', thought);
  
  try {
    const response = await llmRouter({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-3.5-turbo',
      temperature: 0.3 // Low temperature for more consistent extraction
    });
    
    const content = response.choices?.[0]?.message?.content || '{}';
    
    // Try to parse JSON from response
    try {
      // Extract JSON from possible markdown blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing relationship context JSON:', parseError);
      return {
        requested_by: null,
        context_note: null,
        emotional_weight_score: 1,
        category: null
      };
    }
  } catch (error) {
    console.error('Error extracting relationship context:', error);
    return {
      requested_by: null,
      context_note: null,
      emotional_weight_score: 1,
      category: null
    };
  }
}

/**
 * Store thought with relationship context
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {string} content - Thought content
 * @param {object} context - Relationship context from LLM
 * @returns {Promise<object>} - Inserted record
 */
async function storeWithRelationshipContext(db, userId, content, context) {
  const result = await db.query(
    `INSERT INTO memory_graph (user_id, content, requested_by, context_note, 
                                emotional_weight_score, category, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
     RETURNING *`,
    [
      userId,
      content,
      context.requested_by || null,
      context.context_note || null,
      context.emotional_weight_score || 1,
      context.category || null
    ]
  );
  
  return result.rows[0];
}

/**
 * Build notification message with relationship context
 * @param {object} task - Task from memory graph
 * @returns {string} - Formatted notification message
 */
function buildNotificationWithContext(task) {
  const parts = [];
  
  // Base task
  parts.push(`⏰ ${task.content}`);
  
  // Relationship context
  if (task.requested_by) {
    parts.push(`\nThey asked: ${task.requested_by}`);
  }
  
  if (task.context_note) {
    parts.push(`\nContext: ${task.context_note}`);
  }
  
  if (task.emotional_weight_score >= 4) {
    parts.push(`\n⚠️ High priority`);
  }
  
  return parts.join('\n');
}

/**
 * Get tasks with their relationship context
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {number} limit - Max tasks to return (default: 10)
 * @returns {Promise<Array>} - Array of tasks with relationship context
 */
async function getTasksWithContext(db, userId, limit = 10) {
  const result = await db.query(
    `SELECT id, content, requested_by, context_note, emotional_weight_score, category, status
     FROM memory_graph 
     WHERE user_id = $1 
       AND status IN ('pending', 'scheduled')
     ORDER BY 
       CASE WHEN emotional_weight_score >= 4 THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows;
}

/**
 * Format tasks as a grouped list by relationship
 * @param {Array} tasks - Array of tasks
 * @returns {string} - Formatted list
 */
function formatTasksByRelationship(tasks) {
  const grouped = {};
  
  for (const task of tasks) {
    const key = task.requested_by || 'General';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(task);
  }
  
  let output = '📋 YOUR TASKS\n\n';
  
  for (const [person, personTasks] of Object.entries(grouped)) {
    if (Object.keys(grouped).length > 1) {
      output += `**${person}**\n`;
    }
    
    personTasks.forEach((task, i) => {
      output += `${i + 1}. ${task.content}`;
      if (task.emotional_weight_score >= 4) {
        output += ' ⚠️';
      }
      output += '\n';
    });
    
    output += '\n';
  }
  
  return output.trim();
}

/**
 * Update task with relationship context
 * @param {object} db - PostgreSQL pool
 * @param {number} taskId - Task ID
 * @param {object} context - Updated context
 * @returns {Promise<object>} - Updated record
 */
async function updateTaskWithContext(db, taskId, context) {
  const result = await db.query(
    `UPDATE memory_graph 
     SET requested_by = $1,
         context_note = $2,
         emotional_weight_score = $3
     WHERE id = $4
     RETURNING *`,
    [
      context.requested_by || null,
      context.context_note || null,
      context.emotional_weight_score || 1,
      taskId
    ]
  );
  
  return result.rows[0];
}

/**
 * Register relationship anchor endpoints
 * @param {object} app - Express app
 * @param {object} db - PostgreSQL pool
 * @param {object} llmRouter - LLM router
 */
function createRelationshipAnchorEndpoints(app, db, llmRouter) {
  // POST /api/thought/extract-context - Extract relationship context from thought
  app.post('/api/thought/extract-context', async (req, res) => {
    try {
      const { userId, message } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: 'userId and message are required' });
      }
      
      const context = await extractRelationshipContext(llmRouter, message);
      
      res.json({
        success: true,
        context,
        willStore: true
      });
    } catch (error) {
      console.error('Error extracting relationship context:', error);
      res.status(500).json({ error: 'Failed to extract context' });
    }
  });
  
  // POST /api/thought/store-with-context - Store thought with relationship context
  app.post('/api/thought/store-with-context', async (req, res) => {
    try {
      const { userId, message } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: 'userId and message are required' });
      }
      
      const context = await extractRelationshipContext(llmRouter, message);
      const task = await storeWithRelationshipContext(db, userId, message, context);
      
      res.json({
        success: true,
        task,
        context
      });
    } catch (error) {
      console.error('Error storing with context:', error);
      res.status(500).json({ error: 'Failed to store task' });
    }
  });
  
  // GET /api/thought/tasks-with-context - Get all tasks with relationship context
  app.get('/api/thought/tasks-with-context/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const tasks = await getTasksWithContext(db, userId, 20);
      
      res.json({
        success: true,
        tasks,
        formatted: formatTasksByRelationship(tasks)
      });
    } catch (error) {
      console.error('Error getting tasks with context:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  });
}

module.exports = {
  extractRelationshipContext,
  storeWithRelationshipContext,
  buildNotificationWithContext,
  getTasksWithContext,
  formatTasksByRelationship,
  updateTaskWithContext,
  createRelationshipAnchorEndpoints
};
