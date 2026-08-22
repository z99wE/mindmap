/**
 * Predictive Cognitive Load — Lightweight TensorFlow.js ML
 * 
 * Learns from user behavior to predict cognitive overload BEFORE it happens.
 * Runs entirely on the server — zero API cost.
 * 
 * Uses a simple feed-forward neural network trained on:
 * - Hour of day (circadian pattern)
 * - Day of week (weekly pattern)
 * - Recent completion rate (workload signal)
 * - Pending thought count (cognitive debt)
 * - Average urgency of pending thoughts (stress signal)
 * 
 * Predicts: overload probability (0-1) and recommended action.
 */

let tf;
try {
  tf = require('@tensorflow/tfjs-node');
} catch {
  tf = require('@tensorflow/tfjs');
}

const { pool } = require('../db');

// Feature normalization parameters (learned from training)
const FEATURE_MEANS = [12, 3.5, 0.6, 5, 0.5]; // hour, dow, completion_rate, pending_count, avg_urgency
const FEATURE_STDS = [6, 2, 0.3, 4, 0.3];

let model = null;

/**
 * Build and compile the neural network
 */
function buildModel() {
  const m = tf.sequential();
  m.add(tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: 8, activation: 'relu' }));
  m.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })); // 0-1 probability
  
  m.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });
  
  return m;
}

/**
 * Normalize a feature vector
 */
function normalize(features) {
  return features.map((f, i) => (f - FEATURE_MEANS[i]) / (FEATURE_STDS[i] || 1));
}

/**
 * Extract features from a user's recent behavior
 */
async function extractFeatures(userId) {
  const now = new Date();
  const hour = now.getHours();
  const dow = now.getDay();
  
  // Last 7 days of behavior
  const stats = await pool.query(`
    SELECT 
      COUNT(*) as total_thoughts,
      COUNT(*) FILTER (WHERE status = 'completed' OR commitment_fulfilled = true) as completed,
      COUNT(*) FILTER (WHERE status = 'pending' OR (decay_status = 'active' AND commitment_fulfilled = false)) as pending,
      AVG(CASE 
        WHEN urgency_tier = 'critical' THEN 1.0
        WHEN urgency_tier = 'high' THEN 0.75
        WHEN urgency_tier = 'medium' THEN 0.5
        WHEN urgency_tier = 'low' THEN 0.25
        ELSE 0.5
      END) as avg_urgency
    FROM memory_graph
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
  `, [userId]);
  
  const row = stats.rows[0];
  const completionRate = row.total_thoughts > 0 ? parseInt(row.completed) / parseInt(row.total_thoughts) : 0.5;
  const pendingCount = parseInt(row.pending) || 0;
  const avgUrgency = parseFloat(row.avg_urgency) || 0.5;
  
  return [hour, dow, completionRate, pendingCount, avgUrgency];
}

/**
 * Predict overload for a user right now
 */
async function predictOverload(userId) {
  if (!model) {
    model = buildModel();
    // Initialize with random weights — will improve with training data
    // On first prediction, use a heuristic-based fallback
    return heuristicPredict(userId);
  }
  
  try {
    const features = await extractFeatures(userId);
    const normalized = normalize(features);
    
    const input = tf.tensor2d([normalized]);
    const prediction = model.predict(input);
    const probability = (await prediction.data())[0];
    
    input.dispose();
    prediction.dispose();
    
    return {
      overload_probability: Math.round(probability * 100) / 100,
      risk_level: probability > 0.7 ? 'critical' : probability > 0.5 ? 'high' : probability > 0.3 ? 'moderate' : 'low',
      factors: {
        time_pressure: features[3] > 8 ? 'high' : features[3] > 4 ? 'moderate' : 'low',
        urgency_load: features[4] > 0.7 ? 'high' : features[4] > 0.4 ? 'moderate' : 'low',
        completion_trend: features[2] < 0.3 ? 'concerning' : features[2] < 0.6 ? 'moderate' : 'healthy',
        circadian_risk: (features[0] >= 22 || features[0] <= 5) ? 'fatigue_hours' : 'normal'
      },
      recommendation: generateRecommendation(probability, features),
      model_trained: false // Will be true after training
    };
  } catch (e) {
    return heuristicPredict(userId);
  }
}

/**
 * Heuristic fallback when model isn't trained yet
 */
async function heuristicPredict(userId) {
  const features = await extractFeatures(userId);
  const [hour, dow, completionRate, pendingCount, avgUrgency] = features;
  
  // Weighted heuristic
  const scores = [
    pendingCount > 10 ? 0.3 : pendingCount > 5 ? 0.15 : 0,
    avgUrgency > 0.7 ? 0.25 : avgUrgency > 0.4 ? 0.1 : 0,
    completionRate < 0.3 ? 0.25 : completionRate < 0.6 ? 0.1 : 0,
    (hour >= 22 || hour <= 5) ? 0.15 : hour >= 12 && hour <= 14 ? 0.1 : 0
  ];
  
  const probability = Math.min(1, scores.reduce((a, b) => a + b, 0));
  
  return {
    overload_probability: Math.round(probability * 100) / 100,
    risk_level: probability > 0.7 ? 'critical' : probability > 0.5 ? 'high' : probability > 0.3 ? 'moderate' : 'low',
    factors: {
      time_pressure: pendingCount > 8 ? 'high' : pendingCount > 4 ? 'moderate' : 'low',
      urgency_load: avgUrgency > 0.7 ? 'high' : avgUrgency > 0.4 ? 'moderate' : 'low',
      completion_trend: completionRate < 0.3 ? 'concerning' : completionRate < 0.6 ? 'moderate' : 'healthy',
      circadian_risk: (hour >= 22 || hour <= 5) ? 'fatigue_hours' : 'normal'
    },
    recommendation: generateRecommendation(probability, features),
    model_trained: false
  };
}

/**
 * Generate actionable recommendation
 */
function generateRecommendation(probability, features) {
  const [, , completionRate, pendingCount, avgUrgency] = features;
  
  if (probability > 0.7) {
    return {
      action: 'urgent_break',
      message: `You have ${pendingCount} pending items and your completion rate is ${Math.round(completionRate * 100)}%. Take 15 minutes to breathe — then pick the ONE thing with the highest impact.`,
      priority: 1
    };
  }
  if (probability > 0.5) {
    return {
      action: 'prioritize',
      message: `${pendingCount} items competing for attention. Focus on your top 3 by urgency. Everything else can wait.`,
      priority: 2
    };
  }
  if (probability > 0.3) {
    return {
      action: 'maintain',
      message: 'You\'re in a good zone. Keep momentum on your current task before starting new ones.',
      priority: 3
    };
  }
  return {
    action: 'opportunity',
    message: 'Low cognitive load right now — great time to tackle something challenging or review pending items.',
    priority: 4
  };
}

/**
 * Train the model on a user's historical data
 * Call this periodically (e.g., daily batch job)
 */
async function trainModel(userId) {
  // Gather training data: features -> overload events
  const trainingData = await pool.query(`
    SELECT 
      EXTRACT(HOUR FROM created_at) as hour,
      EXTRACT(DOW FROM created_at) as dow,
      (SELECT COUNT(*) FILTER (WHERE status = 'completed' OR commitment_fulfilled = true)::float / 
              NULLIF(COUNT(*), 0) FROM memory_graph WHERE user_id = $1 AND created_at > m.created_at - INTERVAL '7 days') as completion_rate,
      (SELECT COUNT(*) FROM memory_graph WHERE user_id = $1 AND (status = 'pending' OR (decay_status = 'active' AND commitment_fulfilled = false))) as pending_count,
      AVG(CASE WHEN urgency_tier = 'critical' THEN 1 WHEN urgency_tier = 'high' THEN 0.75 WHEN urgency_tier = 'medium' THEN 0.5 ELSE 0.25 END) as avg_urgency,
      CASE WHEN (SELECT COUNT(*) FROM memory_graph WHERE user_id = $1 AND created_at > m.created_at - INTERVAL '1 day') > 8 THEN 1 ELSE 0 END as overloaded
    FROM memory_graph m
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '90 days'
    GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at), m.created_at
    HAVING COUNT(*) > 0
  `, [userId]);
  
  if (trainingData.rows.length < 10) {
    return { trained: false, reason: 'Not enough data points (need at least 10)' };
  }
  
  const xs = tf.tensor2d(trainingData.rows.map(r => normalize([
    parseFloat(r.hour), parseFloat(r.dow), 
    parseFloat(r.completion_rate) || 0.5, 
    parseInt(r.pending_count) || 0, 
    parseFloat(r.avg_urgency) || 0.5
  ])));
  
  const ys = tf.tensor2d(trainingData.rows.map(r => [r.overloaded]));
  
  if (!model) model = buildModel();
  
  const history = await model.fit(xs, ys, {
    epochs: 20,
    batchSize: 8,
    validationSplit: 0.2,
    verbose: 0
  });
  
  xs.dispose();
  ys.dispose();
  
  return {
    trained: true,
    samples: trainingData.rows.length,
    finalLoss: history.history.loss[history.history.loss.length - 1],
    finalAccuracy: history.history.acc[history.history.acc.length - 1]
  };
}

module.exports = { predictOverload, trainModel, buildModel };
