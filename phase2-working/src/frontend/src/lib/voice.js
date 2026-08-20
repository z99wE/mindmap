/**
 * Voice — Speech-to-Text & Text-to-Speech
 * 
 * Uses the Web Speech API (SpeechRecognition + SpeechSynthesis).
 * Both are W3C standards — free, browser-native, commercially licensable.
 * No API keys, no server costs, works offline for TTS.
 * 
 * SpeechRecognition is supported in Chrome, Edge, and Safari (WebKit prefix).
 * Falls back gracefully in Firefox (shows mic button, shows error on use).
 */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

/**
 * Start voice recognition. Calls onResult with interim + final transcripts.
 * @param {object} opts
 * @param {function} opts.onResult - (transcript, isFinal) => void
 * @param {function} opts.onError - (errorMessage) => void
 * @param {function} opts.onEnd - () => void (called when listening stops)
 * @param {string} opts.lang - BCP 47 language tag (default: 'en-US')
 */
export function startListening({ onResult, onError, onEnd, lang = 'en-US' }) {
  if (!SpeechRecognition) {
    if (onError) onError('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
    return;
  }
  if (isListening) return;

  try {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        if (onResult) onResult(transcript, isFinal);
      }
    };

    recognition.onerror = (event) => {
      isListening = false;
      const messages = {
        'no-speech': 'No speech detected. Try again.',
        'aborted': 'Listening stopped.',
        'audio-capture': 'Microphone not found.',
        'network': 'Network error. Check connection.',
        'not-allowed': 'Microphone access denied. Allow microphone in browser settings.',
        'service-not-allowed': 'Speech service not available.',
      };
      if (onError) onError(messages[event.error] || `Speech error: ${event.error}`);
    };

    recognition.onend = () => {
      isListening = false;
      if (onEnd) onEnd();
    };

    recognition.start();
    isListening = true;
  } catch (e) {
    isListening = false;
    if (onError) onError('Could not start speech recognition.');
  }
}

/**
 * Stop voice recognition.
 */
export function stopListening() {
  if (recognition && isListening) {
    try { recognition.stop(); } catch {}
    isListening = false;
  }
}

/**
 * Speak text aloud using browser's SpeechSynthesis.
 * @param {string} text - Text to speak
 * @param {object} [opts]
 * @param {string} [opts.voice] - Preferred voice name (e.g., 'Google US English')
 * @param {number} [opts.rate] - Speed: 0.1 to 10 (default 1.0)
 * @param {number} [opts.pitch] - Pitch: 0 to 2 (default 1.0)
 * @param {number} [opts.volume] - Volume: 0 to 1 (default 1.0)
 * @param {function} [opts.onEnd] - Called when speech finishes
 */
export function speak(text, opts = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = opts.rate || 1.0;
    utterance.pitch = opts.pitch || 1.0;
    utterance.volume = opts.volume || 1.0;

    if (opts.voice) {
      const voices = window.speechSynthesis.getVoices();
      const found = voices.find(v => v.name.includes(opts.voice));
      if (found) utterance.voice = found;
    }

    utterance.onend = () => { if (opts.onEnd) opts.onEnd(); resolve(); };
    utterance.onerror = () => resolve();

    // Chrome bug: speechSynthesis doesn't speak if called immediately
    // Workaround: small delay
    setTimeout(() => window.speechSynthesis.speak(utterance), 50);
  });
}

/**
 * Check if speech recognition is available.
 */
export function isSpeechSupported() {
  return !!SpeechRecognition;
}

/**
 * Check if speech synthesis is available.
 */
export function isTTSSupported() {
  return !!window.speechSynthesis;
}

/**
 * Get available voices for TTS.
 */
export function getVoices() {
  return window.speechSynthesis?.getVoices() || [];
}
