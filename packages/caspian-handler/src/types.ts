import { z } from 'zod';

/**
 * Channel configuration schema
 */
export const ChannelConfigSchema = z.object({
  whatsapp: z.object({
    apiToken: z.string(),
    accountId: z.string().optional(),
  }).optional(),
  
  telegram: z.object({
    botToken: z.string(),
  }).optional(),
  
  slack: z.object({
    botToken: z.string(),
    signingSecret: z.string(),
  }).optional(),
  
  discord: z.object({
    botToken: z.string(),
  }).optional(),
  
  signal: z.object({
    phoneNumber: z.string(),
    pin: z.string().optional(),
  }).optional(),
  
  email: z.object({
    smtpHost: z.string(),
    smtpPort: z.number(),
    smtpUser: z.string(),
    smtpPassword: z.string(),
  }).optional(),
});

export type ChannelConfig = z.infer<typeof ChannelConfigSchema>;

/**
 * Message validation schema
 */
export const IncomingMessageSchema = z.object({
  channel: z.enum([
    'whatsapp', 
    'telegram', 
    'slack', 
    'discord', 
    'signal', 
    'email'
  ]),
  
  userId: z.string().min(1, 'User ID required'),
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long'),
    
  attachments: z.array(z.object({
    type: z.enum(['image', 'audio', 'video', 'document']),
    url: z.string().url(),
    size: z.number().max(25 * 1024 * 1024), // 25MB max
  })).optional(),
  
  metadata: z.record(z.unknown()).optional(),
});

export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;
