/**
 * Webhook Payload Schema Validation
 *
 * Validates incoming webhook payloads before they reach PulseKit handlers.
 * Prevents malformed or malicious payloads from being processed.
 */

/**
 * Validate Slack webhook payload
 */
function validateSlackPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload' };

  // URL verification challenge
  if (payload.type === 'url_verification') {
    if (!payload.challenge || typeof payload.challenge !== 'string') {
      return { valid: false, error: 'Missing challenge token' };
    }
    return { valid: true };
  }

  // Event wrapper
  if (payload.type === 'event_callback') {
    if (!payload.event || typeof payload.event !== 'object') {
      return { valid: false, error: 'Missing event object' };
    }
    if (!payload.event.type) {
      return { valid: false, error: 'Missing event type' };
    }
    return { valid: true };
  }

  return { valid: true }; // Allow unknown types through
}

/**
 * Validate WhatsApp Cloud API webhook payload
 */
function validateWhatsAppPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload' };

  // WhatsApp sends entry[] array
  if (payload.entry && Array.isArray(payload.entry)) {
    for (const entry of payload.entry) {
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages && Array.isArray(change.value.messages)) {
            // Has messages — this is the expected format
            return { valid: true };
          }
        }
      }
    }
  }

  // Status updates have statuses instead of messages
  if (payload.entry && Array.isArray(payload.entry)) {
    for (const entry of payload.entry) {
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.value && change.value.statuses) {
            return { valid: true };
          }
        }
      }
    }
  }

  return { valid: false, error: 'Unrecognized WhatsApp payload format' };
}

/**
 * Validate Signal webhook payload
 */
function validateSignalPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload' };

  // Signal gateway typically sends: { source, sourceNumber, sourceUuid, message, timestamp, ... }
  if (payload.source || payload.sourceNumber || payload.envelope) {
    if (payload.dataMessage || payload.message || payload.envelope?.dataMessage) {
      return { valid: true };
    }
  }

  // Allow standard envelope format from signal-cli
  if (payload.envelope && (payload.envelope.source || payload.envelope.sourceNumber)) {
    return { valid: true };
  }

  return { valid: false, error: 'Unrecognized Signal payload format' };
}

/**
 * Validate SMS webhook payload (Twilio / Vonage)
 */
function validateSmsPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload' };

  // Twilio format: Body, From, To, MessageSid
  // Vonage format: text, msisdn, to, messageId
  if (payload.Body || payload.text) {
    if (payload.From || payload.msisdn) {
      return { valid: true };
    }
  }

  return { valid: false, error: 'Unrecognized SMS payload format' };
}

/**
 * Validate Twitter webhook payload
 */
function validateTwitterPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload' };

  // CRC (Challenge-Response) check
  if (payload.crc_token) {
    if (typeof payload.crc_token !== 'string') {
      return { valid: false, error: 'Invalid CRC token' };
    }
    return { valid: true };
  }

  // Tweet events: { tweet_create_events: [...] }
  if (payload.tweet_create_events && Array.isArray(payload.tweet_create_events)) {
    return { valid: true };
  }

  // Direct message events
  if (payload.direct_message_events && Array.isArray(payload.direct_message_events)) {
    return { valid: true };
  }

  // Allow other Twitter events
  if (payload.type === 'twitter_push_subscription' || payload.type === 'revocation') {
    return { valid: true };
  }

  return { valid: false, error: 'Unrecognized Twitter payload format' };
}

/**
 * Generic webhook payload validation middleware factory.
 * Returns an Express middleware that validates payloads before processing.
 */
function createWebhookValidator(channel) {
  const validators = {
    slack: validateSlackPayload,
    whatsapp: validateWhatsAppPayload,
    signal: validateSignalPayload,
    sms: validateSmsPayload,
    twitter: validateTwitterPayload,
  };

  const validator = validators[channel];
  if (!validator) {
    // Unknown channel — allow through (don't block)
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const result = validator(req.body);
    if (!result.valid) {
      console.warn(`[Webhook] Rejected invalid ${channel} payload:`, result.error);
      return res.status(400).json({ error: `Invalid ${channel} webhook payload`, detail: result.error });
    }
    next();
  };
}

module.exports = {
  createWebhookValidator,
  validateSlackPayload,
  validateWhatsAppPayload,
  validateSignalPayload,
  validateSmsPayload,
  validateTwitterPayload,
};
