/**
 * ML Engine Index — Zero-Cost Intelligence
 * 
 * All engines run entirely on the server using math and statistics.
 * No external API calls, no LLM costs, no vendor lock-in.
 * 
 * Engines:
 * - predictive-overload: TensorFlow.js neural network for cognitive load prediction
 * - bayesian-decay: Bayesian forgetting curve calibration per user
 * - thought-quality-scorer: TF-IDF + n-gram actionability scoring
 * - anomaly-detector: Z-score statistical pattern break detection
 * - energy-estimator: Kernel density estimation for productive hours
 * - sentiment-analyzer: Lexicon-based emotional tone analysis
 */

const predictiveOverload = require('./predictive-overload');
const bayesianDecay = require('./bayesian-decay');
const thoughtQuality = require('./thought-quality-scorer');
const anomalyDetector = require('./anomaly-detector');
const energyEstimator = require('./energy-estimator');
const sentimentAnalyzer = require('./sentiment-analyzer');

module.exports = {
  predictiveOverload,
  bayesianDecay,
  thoughtQuality,
  anomalyDetector,
  energyEstimator,
  sentimentAnalyzer
};
