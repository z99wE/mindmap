/**
 * Notification Tests
 * 
 * Tests: createNotification, getNotifications, markRead, markAllRead,
 * deliverViaPulseKit, sendWebPush
 */

// Mock the db pool used by notifications module
const mockPool = { query: jest.fn() };
jest.mock('../src/db', () => ({
  pool: mockPool,
}));

const { 
  createNotification, 
  getNotifications, 
  markRead, 
  markAllRead, 
  deliverViaPulseKit 
} = require('../src/notifications');

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// createNotification
// ═══════════════════════════════════════════════════════════
describe('createNotification()', () => {
  test('creates a notification with default type', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'notif-1', type: 'system', title: 'Hello', message: 'Test', channel: 'browser', delivered: false, read: false, sent_at: new Date() }],
    });

    const result = await createNotification('user-1', 'system', 'Hello', 'Test');
    expect(result.id).toBe('notif-1');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining(['user-1'])
    );
  });

  test('maps unknown notification type to system', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'n1', type: 'system' }] });

    await createNotification('user-1', 'unknown_type', 'Title', 'Msg');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining(['system'])
    );
  });

  test('stores metadata as JSON', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'n1' }] });

    await createNotification('user-1', 'system', 'T', 'M', 'email', { score: 95 });
    
    // Check that metadata was JSON-stringified
    const callArgs = mockPool.query.mock.calls[0][1];
    const metadataArg = callArgs[5];
    expect(() => JSON.parse(metadataArg)).not.toThrow();
    const parsed = JSON.parse(metadataArg);
    expect(parsed.score).toBe(95);
  });

  test('handles DB error gracefully', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB error'));
    await expect(createNotification('user-1', 'system', 'T', 'M')).rejects.toThrow('DB error');
  });
});

// ═══════════════════════════════════════════════════════════
// getNotifications
// ═══════════════════════════════════════════════════════════
describe('getNotifications()', () => {
  test('returns paginated notifications', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'n1', title: 'Test' }] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] });

    const result = await getNotifications('user-1');
    expect(result.notifications).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.unread).toBe(1);
  });

  test('filters unread only', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await getNotifications('user-1', 10, 0, true);
    
    // Should include 'AND read = false'
    expect(mockPool.query.mock.calls[0][0]).toContain('AND read = false');
  });

  test('returns empty when no notifications', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const result = await getNotifications('user-1');
    expect(result.notifications).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// markRead
// ═══════════════════════════════════════════════════════════
describe('markRead()', () => {
  test('marks single notification as read', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

    await markRead('user-1', 'notif-1');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE notifications SET read = true'),
      ['notif-1', 'user-1']
    );
  });
});

// ═══════════════════════════════════════════════════════════
// markAllRead
// ═══════════════════════════════════════════════════════════
describe('markAllRead()', () => {
  test('marks all notifications as read for user', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 5 });

    await markAllRead('user-1');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE notifications SET read = true'),
      ['user-1']
    );
  });
});

// ═══════════════════════════════════════════════════════════
// deliverViaPulseKit
// ═══════════════════════════════════════════════════════════
describe('deliverViaPulseKit()', () => {
  const mockPulseKit = { send: jest.fn() };

  test('returns false when pulseKit is null', async () => {
    const result = await deliverViaPulseKit('user-1', { message: 'Test' }, null);
    expect(result).toBe(false);
  });

  test('returns false when user has no channels', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // no channels

    const result = await deliverViaPulseKit('user-1', { id: 'n1', message: 'Test' }, mockPulseKit);
    expect(result).toBe(false);
  });

  test('delivers to first channel in failover mode', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ platform: 'telegram' }] }) // channels
      .mockResolvedValueOnce({ rows: [{ notification_prefs: '{}' }] }); // user prefs (failover default)

    mockPulseKit.send.mockResolvedValueOnce({ delivered: true });
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // mark delivered

    const result = await deliverViaPulseKit('user-1', { id: 'n1', message: 'Test' }, mockPulseKit);
    expect(result).toBe(true);
    expect(mockPulseKit.send).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'telegram', message: 'Test' })
    );
  });

  test('broadcasts to all channels in broadcast mode', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ platform: 'telegram' }, { platform: 'slack' }] }) // channels
      .mockResolvedValueOnce({ rows: [{ notification_prefs: { channel_routing_mode: 'broadcast' } }] }); // broadcast mode

    mockPulseKit.send.mockResolvedValue({ delivered: true });

    const result = await deliverViaPulseKit('user-1', { id: 'n1', message: 'Broadcast' }, mockPulseKit);
    expect(result).toBe(true);
    expect(mockPulseKit.send).toHaveBeenCalledTimes(2);
  });

  test('falls through all channels in failover mode', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ platform: 'telegram' }, { platform: 'slack' }] })
      .mockResolvedValueOnce({ rows: [{ notification_prefs: '{}' }] });

    mockPulseKit.send
      .mockRejectedValueOnce(new Error('Telegram failed'))
      .mockResolvedValueOnce({ delivered: true });

    const result = await deliverViaPulseKit('user-1', { id: 'n1', message: 'Failover' }, mockPulseKit);
    expect(result).toBe(true);
    expect(mockPulseKit.send).toHaveBeenCalledTimes(2);
  });

  test('returns false when all channels fail', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ platform: 'telegram' }] })
      .mockResolvedValueOnce({ rows: [{ notification_prefs: '{}' }] });

    mockPulseKit.send.mockRejectedValueOnce(new Error('Failed'));

    const result = await deliverViaPulseKit('user-1', { id: 'n1', message: 'Fail' }, mockPulseKit);
    expect(result).toBe(false);
  });
});
