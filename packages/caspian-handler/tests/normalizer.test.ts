import { normalizeMessage } from '../src/normalizer';

describe('Message Normalizer', () => {
  describe('normalizeWhatsAppMessage', () => {
    it('should normalize WhatsApp text message', async () => {
      const rawMessage = {
        messageId: 'msg_123',
        from: '+1234567890',
        text: { body: 'Hello, world!' },
        timestamp: 1625097600,
        type: 'text',
      };
      
      const result = await normalizeMessage('whatsapp', rawMessage);
      
      expect(result.id).toBe('msg_123');
      expect(result.user_id).toBe('+1234567890');
      expect(result.channel).toBe('whatsapp');
      expect(result.content).toBe('Hello, world!');
      expect(result.metadata.inputType).toBe('text');
    });
    
    it('should detect voice input', async () => {
      const rawMessage = {
        messageId: 'msg_456',
        from: '+1234567890',
        audio: { id: 'audio_123', mime_type: 'audio/ogg' },
        timestamp: 1625097600,
        type: 'audio',
      };
      
      const result = await normalizeMessage('whatsapp', rawMessage);
      
      expect(result.metadata.inputType).toBe('voice');
      expect(result.attachments).toBeDefined();
      expect(result.attachments).toHaveLength(1);
    });
    
    it('should detect image input', async () => {
      const rawMessage = {
        messageId: 'msg_789',
        from: '+1234567890',
        image: { id: 'img_123', mime_type: 'image/jpeg' },
        timestamp: 1625097600,
        type: 'image',
      };
      
      const result = await normalizeMessage('whatsapp', rawMessage);
      
      expect(result.metadata.inputType).toBe('image');
    });
  });
  
  describe('normalizeTelegramMessage', () => {
    it('should normalize Telegram text message', async () => {
      const rawMessage = {
        message_id: 12345,
        from: {
          id: 987654321,
          first_name: 'John',
          username: 'john_doe',
        },
        chat: { id: 987654321 },
        text: 'Hello from Telegram!',
        date: 1625097600,
      };
      
      const result = await normalizeMessage('telegram', rawMessage);
      
      expect(result.id).toBe('12345');
      expect(result.user_id).toBe('987654321');
      expect(result.channel).toBe('telegram');
      expect(result.content).toBe('Hello from Telegram!');
    });
    
    it('should handle photo attachments', async () => {
      const rawMessage = {
        message_id: 12346,
        from: { id: 987654321 },
        chat: { id: 987654321 },
        photo: [
          { file_id: 'small', file_size: 1024 },
          { file_id: 'medium', file_size: 2048 },
          { file_id: 'large', file_size: 4096 },
        ],
        date: 1625097600,
      };
      
      const result = await normalizeMessage('telegram', rawMessage);
      
      expect(result.attachments).toBeDefined();
      expect(result.attachments).toHaveLength(1);
    });
  });
  
  describe('normalizeSlackMessage', () => {
    it('should normalize Slack message', async () => {
      const rawMessage = {
        ts: '1625097600.000100',
        user: 'U12345678',
        text: 'Hello from Slack!',
        channel: 'C87654321',
        team: 'T12345678',
      };
      
      const result = await normalizeMessage('slack', rawMessage);
      
      expect(result.id).toBe('1625097600.000100');
      expect(result.user_id).toBe('U12345678');
      expect(result.channel).toBe('slack');
      expect(result.content).toBe('Hello from Slack!');
    });
  });
  
  describe('normalizeDiscordMessage', () => {
    it('should normalize Discord message', async () => {
      const rawMessage = {
        id: '987654321098765432',
        author: {
          id: '123456789012345678',
          username: 'discord_user',
        },
        content: 'Hello from Discord!',
        channelId: '876543210987654321',
        guildId: '765432109876543210',
        createdTimestamp: 1625097600000,
      };
      
      const result = await normalizeMessage('discord', rawMessage);
      
      expect(result.id).toBe('987654321098765432');
      expect(result.user_id).toBe('123456789012345678');
      expect(result.channel).toBe('discord');
      expect(result.content).toBe('Hello from Discord!');
    });
  });
  
  describe('normalizeEmailMessage', () => {
    it('should normalize email message', async () => {
      const rawMessage = {
        messageId: '<msg123@example.com>',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'Hello via email!',
        date: '2021-06-30T12:00:00Z',
      };
      
      const result = await normalizeMessage('email', rawMessage);
      
      expect(result.id).toBe('<msg123@example.com>');
      expect(result.user_id).toBe('sender@example.com');
      expect(result.channel).toBe('email');
      expect(result.content).toBe('Hello via email!');
      expect(result.metadata.subject).toBe('Test Email');
    });
  });
  
  describe('Error handling', () => {
    it('should throw error for unknown channel', async () => {
      await expect(
        normalizeMessage('unknown' as any, {})
      ).rejects.toThrow('Unknown channel');
    });
  });
});
