import { 
  UnifiedMessage, 
  Channel, 
  InputType
} from '@thought-gps/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Normalize message from any channel to unified format.
 * 
 * This function:
 * 1. Detects input type (voice, text, image)
 * 2. Extracts user ID
 * 3. Preserves metadata
 * 4. Handles channel-specific formats
 * 
 * @param channel - Source channel
 * @param rawMessage - Raw message from Caspian
 * @returns Normalized UnifiedMessage
 */
export async function normalizeMessage(
  channel: Channel,
  rawMessage: any
): Promise<UnifiedMessage> {
  const normalizers: Record<Channel, (msg: any) => UnifiedMessage> = {
    whatsapp: normalizeWhatsAppMessage,
    telegram: normalizeTelegramMessage,
    slack: normalizeSlackMessage,
    discord: normalizeDiscordMessage,
    signal: normalizeSignalMessage,
    email: normalizeEmailMessage,
  };

  const normalizer = normalizers[channel];
  
  if (!normalizer) {
    throw new Error(`Unknown channel: ${channel}`);
  }

  try {
    const normalized = normalizer(rawMessage);
    
    console.debug('Message normalized', {
      messageId: normalized.id,
      channel: normalized.channel,
      inputType: normalized.metadata.inputType,
    });
    
    return normalized;
    
  } catch (error) {
    console.error('Failed to normalize message', {
      channel,
      error,
      rawMessage: JSON.stringify(rawMessage).substring(0, 200),
    });
    
    throw error;
  }
}

/**
 * Detect input type from message content
 */
function detectInputType(message: any, _channel: Channel): InputType {
  // Voice: audio attachments
  if (message.audio || message.voice || message.voice_note) {
    return 'voice';
  }
  
  // Image: image attachments
  if (message.image || message.photo || message.images) {
    return 'image';
  }
  
  // Default to text
  return 'text';
}

/**
 * WhatsApp message normalizer
 */
function normalizeWhatsAppMessage(msg: any): UnifiedMessage {
  return {
    id: msg.messageId || uuidv4(),
    user_id: msg.from,
    channel: 'whatsapp',
    content: msg.text?.body || msg.caption || '',
    attachments: extractWhatsAppAttachments(msg),
    metadata: {
      inputType: detectInputType(msg, 'whatsapp'),
      timestamp: msg.timestamp,
      messageType: msg.type,
      phoneNumber: msg.from,
    },
    created_at: new Date(msg.timestamp * 1000),
  };
}

/**
 * Telegram message normalizer
 */
function normalizeTelegramMessage(msg: any): UnifiedMessage {
  return {
    id: msg.message_id?.toString() || uuidv4(),
    user_id: msg.from?.id?.toString() || 'unknown',
    channel: 'telegram',
    content: msg.text || msg.caption || '',
    attachments: extractTelegramAttachments(msg),
    metadata: {
      inputType: detectInputType(msg, 'telegram'),
      chatId: msg.chat?.id,
      firstName: msg.from?.first_name,
      username: msg.from?.username,
    },
    created_at: new Date(msg.date * 1000),
  };
}

/**
 * Slack message normalizer
 */
function normalizeSlackMessage(msg: any): UnifiedMessage {
  return {
    id: msg.ts || uuidv4(),
    user_id: msg.user || 'unknown',
    channel: 'slack',
    content: msg.text || '',
    attachments: msg.files,
    metadata: {
      inputType: detectInputType(msg, 'slack'),
      channelId: msg.channel,
      threadTs: msg.thread_ts,
      team: msg.team,
    },
    created_at: new Date(parseInt(msg.ts) * 1000),
  };
}

/**
 * Discord message normalizer
 */
function normalizeDiscordMessage(msg: any): UnifiedMessage {
  return {
    id: msg.id || uuidv4(),
    user_id: msg.author?.id || 'unknown',
    channel: 'discord',
    content: msg.content || '',
    attachments: msg.attachments,
    metadata: {
      inputType: detectInputType(msg, 'discord'),
      guildId: msg.guildId,
      channelId: msg.channelId,
      username: msg.author?.username,
    },
    created_at: msg.createdTimestamp ? 
      new Date(msg.createdTimestamp) : 
      new Date(),
  };
}

/**
 * Signal message normalizer
 */
function normalizeSignalMessage(msg: any): UnifiedMessage {
  return {
    id: msg.id || uuidv4(),
    user_id: msg.from || 'unknown',
    channel: 'signal',
    content: msg.body || '',
    attachments: msg.attachments,
    metadata: {
      inputType: detectInputType(msg, 'signal'),
      timestamp: msg.timestamp,
    },
    created_at: new Date(msg.timestamp),
  };
}

/**
 * Email message normalizer
 */
function normalizeEmailMessage(msg: any): UnifiedMessage {
  return {
    id: msg.messageId || uuidv4(),
    user_id: msg.from || 'unknown',
    channel: 'email',
    content: msg.body || msg.text || '',
    attachments: msg.attachments,
    metadata: {
      inputType: 'text',
      subject: msg.subject,
      from: msg.from,
      to: msg.to,
      inReplyTo: msg.inReplyTo,
    },
    created_at: new Date(msg.date),
  };
}

/**
 * Extract attachments from WhatsApp message
 */
function extractWhatsAppAttachments(msg: any): any[] | undefined {
  const attachments: any[] = [];
  
  if (msg.image) {
    attachments.push({
      type: 'image',
      id: msg.image.id,
      mimeType: msg.image.mime_type,
    });
  }
  
  if (msg.audio) {
    attachments.push({
      type: 'audio',
      id: msg.audio.id,
      mimeType: msg.audio.mime_type,
    });
  }
  
  if (msg.document) {
    attachments.push({
      type: 'document',
      id: msg.document.id,
      filename: msg.document.filename,
      mimeType: msg.document.mime_type,
    });
  }
  
  return attachments.length > 0 ? attachments : undefined;
}

/**
 * Extract attachments from Telegram message
 */
function extractTelegramAttachments(msg: any): any[] | undefined {
  const attachments: any[] = [];
  
  if (msg.photo) {
    const largest = msg.photo[msg.photo.length - 1];
    attachments.push({
      type: 'image',
      fileId: largest.file_id,
      fileSize: largest.file_size,
    });
  }
  
  if (msg.voice) {
    attachments.push({
      type: 'voice',
      fileId: msg.voice.file_id,
      duration: msg.voice.duration,
      mimeType: msg.voice.mime_type,
    });
  }
  
  if (msg.audio) {
    attachments.push({
      type: 'audio',
      fileId: msg.audio.file_id,
      title: msg.audio.title,
      duration: msg.audio.duration,
    });
  }
  
  if (msg.document) {
    attachments.push({
      type: 'document',
      fileId: msg.document.file_id,
      filename: msg.document.file_name,
      mimeType: msg.document.mime_type,
    });
  }
  
  return attachments.length > 0 ? attachments : undefined;
}
