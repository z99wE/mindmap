/**
 * Thought GPS Core Types
 * Shared types across all packages
 */

export type Channel = 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'signal' | 'email';

export type InputType = 'voice' | 'text' | 'image';

export interface UnifiedMessage {
  id: string;
  user_id: string;
  channel: Channel;
  content: string;
  attachments?: Attachment[];
  metadata: MessageMetadata;
  created_at: Date;
}

export interface Attachment {
  type: 'image' | 'voice' | 'document' | 'location';
  url?: string;
  data?: Buffer;
  mimeType: string;
  size_bytes: number;
}

export interface MessageMetadata {
  timestamp?: Date;
  timezone?: string;
  is_awake_hours?: boolean;
  device_type?: string;
  ip_address?: string;
  user_agent?: string;
  inputType?: 'voice' | 'text' | 'image';
  [key: string]: any;
}

export interface User {
  id: string;
  email: string;
  ceramic_did?: string;
  created_at: Date;
  updated_at: Date;
  timezone: string;
  language: string;
  voice_mode_enabled: boolean;
  focus_mode_enabled: boolean;
}

export interface Thought {
  id: string;
  user_id: string;
  raw_input: string;
  normalized_text: string;
  intent: string;
  channel: Channel;
  input_type: InputType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  created_at: Date;
  processed_at?: Date;
}

export interface APIKey {
  id: string;
  user_id: string;
  service: string;
  encrypted_key: string;
  created_at: Date;
  last_used?: Date;
  expires_at?: Date;
}

export interface Session {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  ip_address: string;
  user_agent: string;
}

export interface SecurityEvent {
  id: string;
  user_id?: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface LLMRequest {
  user_id: string;
  input_type: InputType;
  content: string;
  transcript?: string;
  image_base64?: string;
  text_context?: string;
  complexity?: 'low' | 'medium' | 'high';
}

export interface LLMResponse {
  content: string;
  model: string;
  route: string;
  tokens_used: number;
  latency_ms: number;
  cost: number;
  is_cached?: boolean;
}
