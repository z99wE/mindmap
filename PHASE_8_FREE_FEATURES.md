# Phase 8: Free Neuro-Diverse Productivity Infrastructure

## Core Ideology

> Your phone knows where your body is. Thought GPS is the only thing that knows where your mind is.

This is not a productivity app. This is an external prefrontal cortex — the brain region that ADHD, stress, grief, and distraction all attack first. Every feature below is pure code. No new service. No new subscription. No new API key.

---

## Feature 1 — The Thought Interceptor

### Problem
You walk into a room for one specific item, do three other things, go back, and realize you forgot what you came for. The item exists in your hand only if nothing interrupts you between the thought and the action.

### What It Does
When a thought is captured ("I need to call the doctor"), the agent immediately asks one question back — "When? Or where?" If the answer is a place or a time, it becomes a geofenced or time-triggered action. If the answer is silence (the user doesn't respond), it auto-schedules a "thought revival" nudge in 4 hours via WhatsApp.

### Technical Implementation
| Component | Technology | Cost |
|-----------|-----------|------|
| NLP Classification | Regex patterns + existing LLM routing | Free |
| Clarification Flow | Existing Caspian SDK channel | Free |
| Pending Queue | Redis with TTL | Free (existing) |
| Cron Job | Existing background worker | Free |
| WhatsApp Delivery | Existing Caspian SDK | Free |

#### Code Implementation
```javascript
// In server.js - intercept thoughts with intent verbs
const INTENT_PATTERNS = [
  /need to\s+(.*)/i,
  /should\s+(.*)/i,
  /don't forget\s+(.*)/i,
  /remind me\s+(.*)/i,
  /have to\s+(.*)/i,
  /must\s+(.*)/i
];

function detectIntent(message) {
  for (const pattern of INTENT_PATTERNS) {
    const match = message.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Trigger clarification flow
app.post('/api/thought/intercept', async (req, res) => {
  const { userId, message } = req.body;
  const intent = detectIntent(message);
  
  if (intent) {
    // Store as pending, wait for clarification
    await db.query(
      `INSERT INTO memory_graph (user_id, content, status, created_at)
       VALUES ($1, $2, 'pending_clarification', NOW()) RETURNING id`,
      [userId, intent]
    );
    
    // Ask "When? Or where?" via existing channel
    await caspian.send({ channel: 'whatsapp', to: userId, message: 'When? Or where?' });
    
    // Schedule revival if no response in 10 minutes
    redis.setex(`revival:${userId}:${Date.now()}`, 600, intent);
  }
});

// Revival cron job (runs every 5 minutes)
setInterval(async () => {
  const keys = await redis.keys('revival:*');
  for (const key of keys) {
    const [_, userId, timestamp] = key.split(':');
    if (Date.now() - timestamp >= 14400000) { // 4 hours
      const thought = await redis.get(key);
      await caspian.send({ channel: 'whatsapp', to: userId, message: `Thought revival: ${thought}` });
      await redis.del(key);
    }
  }
}, 300000);
```

---

## Feature 2 — Time Blindness Compensation Engine

### Problem
Time blindness is the inability to sense how much time has passed and estimate time needed to get something done. An ADHDer underestimates prep time for an appointment and arrives late — not from disrespect, but because the brain is simply wired differently.

### What It Does
When the user stores a commitment ("meeting at 3pm in Bandra"), the system back-calculates from current location. It fires a "departure alert" — not a reminder about the meeting, but a "leave now" signal that accounts for travel time from current GPS coordinates using OpenStreetMap routing (free, no key).

### Technical Implementation
| Component | Technology | Cost |
|-----------|-----------|------|
| Travel Time | OSRM (Open Source Routing Machine) | Free (self-hostable) |
| Location Query | Tile38 | Free (existing) |
| Trigger Worker | Background worker | Free |
| Alert Delivery | Existing Caspian SDK | Free |

#### Code Implementation
```javascript
// Add to memory_graph schema
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS destination_coords POINT;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS deadline_epoch BIGINT;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS travel_duration_minutes INTEGER;

// Get travel duration from OSRM (self-hosted Docker container)
async function getTravelDuration(startLat, startLng, destLat, destLng) {
  const response = await fetch('http://localhost:5000/route/v1/driving/', {
    method: 'POST',
    body: JSON.stringify({
      coordinates: [[startLng, startLat], [destLng, destLat]],
      annotations: true
    })
  });
  const data = await response.json();
  return data.routes[0].duration / 60; // Convert to minutes
}

// Background worker (runs every 15 minutes)
setInterval(async () => {
  const now = Math.floor(Date.now() / 1000);
  
  // Get all commitments for active users
  const commitments = await db.query(
    `SELECT user_id, destination_coords, deadline_epoch, travel_duration_minutes
     FROM memory_graph 
     WHERE status = 'scheduled' 
       AND deadline_epoch > $1 
       AND deadline_epoch <= $1 + 7200`, // Within 2 hours
    [now]
  );
  
  for (const commit of commitments) {
    const [startLng, startLat] = await getCurrentLocation(commit.user_id);
    const estimatedTravel = await getTravelDuration(startLat, startLng, commit.destination_coords[1], commit.destination_coords[0]);
    
    const travelTimeWithBuffer = (estimatedTravel + 15) * 60; // 15 min buffer
    
    if (now + travelTimeWithBuffer >= commit.deadline_epoch) {
      // Send departure alert
      await caspian.send({
        channel: 'whatsapp',
        to: commit.user_id,
        message: `Leave now — 3:45pm meeting in Bandra. Travel time: ${Math.round(estimatedTravel)}min`
      });
    }
  }
}, 900000); // 15 minutes
```

#### OSRM Setup (Docker)
```bash
# Run OSRM in Docker (one-time setup)
docker run -p 5000:5000 osrm/osrm-backend osrm-routed \
  --algorithm mld \
  --max-table-size 100 \
  --max-viaroute-size 100 \
  /data/india-latest.osrm
```

---

## Feature 3 — The Invisible Checklist

### Problem
You browse every aisle slowly, keep your eyes open, do everything right — and still arrive home missing two items. Then you go back. Then the cashier says "see you tomorrow." Lists fail because people forget to check lists.

### What It Does
When you enter a geofence around a store (supermarket, pharmacy, hardware store — detected automatically via OSM categories), the agent reconstructs a contextual checklist on the fly from your memory graph. It doesn't show you your generic grocery list — it shows you the things specifically tied to this store type that are currently unresolved.

### Technical Implementation
| Component | Technology | Cost |
|-----------|-----------|------|
| Geofence Detection | Tile38 SETHOOK | Free (existing) |
| Store Category | OSM POI tags | Free |
| Memory Query | PostgreSQL | Free (existing) |
| Message Format | Text template | Free |

#### Code Implementation
```javascript
// Tile38 geofence setup (in setup script)
const TILE38_ENDPOINT = 'http://localhost:9851';

async function setupGeofences() {
  const stores = [
    { name: 'supermarket', category: 'grocery', lat: 19.0760, lng: 72.8777, radius: 500 },
    { name: 'pharmacy', category: 'pharmacy', lat: 19.0760, lng: 72.8777, radius: 200 },
    { name: 'gift_shop', category: 'gift', lat: 19.0760, lng: 72.8777, radius: 300 }
  ];
  
  for (const store of stores) {
    await fetch(`${TILE38_ENDPOINT}/sethook/${store.name}`, {
      method: 'POST',
      body: JSON.stringify({
        command: 'SET', 
        key: 'locations',
        group: 'geofences',
        command: 'FENCE',
        near: { lat: store.lat, lng: store.lng, radius: store.radius }
      })
    });
  }
}

// Handle geofence entry webhook
app.post('/api/geofence/entry', async (req, res) => {
  const { object, command, field } = req.body;
  
  if (command === 'ENTER' && object === 'user_location') {
    const [userId, timestamp] = field.split(':');
    const userLocation = JSON.parse(object);
    
    // Detect store type from OSM tags or name matching
    const storeType = detectStoreType(userLocation.name);
    
    // Query memory graph for pending items matching store type
    const items = await db.query(
      `SELECT content, requested_by, created_at 
       FROM memory_graph 
       WHERE user_id = $1 
         AND status = 'pending' 
         AND category IN ($2, 'general')
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId, storeType]
    );
    
    // Format as numbered checklist
    const checklist = items.map((item, i) => 
      `${i + 1}. ${item.content}${item.requested_by ? ` (asked by ${item.requested_by})` : ''}`
    ).join('\n');
    
    // Send via WhatsApp
    await caspian.send({
      channel: 'whatsapp',
      to: userId,
      message: `🔍 ${storeType.toUpperCase()} CHECKLIST\n\n${checklist}\n\nMark items complete in Thought GPS.`
    });
  }
});

function detectStoreType(storeName) {
  const storeMap = {
    supermarket: 'grocery',
    grocery: 'grocery',
    pharmacy: 'pharmacy',
    chemist: 'pharmacy',
    hardware: 'hardware',
    gift: 'gift',
    present: 'gift'
  };
  
  const lowerName = storeName.toLowerCase();
  for (const [key, value] of Object.entries(storeMap)) {
    if (lowerName.includes(key)) return value;
  }
  return 'general';
}
```

---

## Feature 4 — The Drift Detector

### Problem
Hours disappear in hyperfocus or drag on during boring tasks. Appointments, deadlines, or recurring obligations slip because they never feel "real" until they're already past.

### What It Does
The agent watches for location drift patterns — you went to work, but it's 7:45pm and you're still there (location hasn't changed in 4+ hours). It cross-references your memory graph and sends a gentle nudge.

### Technical Implementation
| Component | Technology | Cost |
|-----------|-----------|------|
| Position Monitoring | Tile38 SETHOOK | Free (existing) |
| Stale Detection | Tile38 native | Free |
| Context Query | PostgreSQL | Free |
| LLM Summary | Existing routing | Free |

#### Code Implementation
```javascript
// Tile38 setup for stale position detection
app.post('/api/setup/drift-detector', async (req, res) => {
  const { userId } = req.body;
  
  // Create a hook that triggers when position doesn't change for 1 hour
  await fetch(`${TILE38_ENDPOINT}/sethook/stale_${userId}`, {
    method: 'POST',
    body: JSON.stringify({
      command: 'SET',
      key: `user:${userId}:location`,
      command: 'FENCE',
      near: { lat: 0, lng: 0, radius: 200 }, // 200m radius
      options: { stale: '1h' } // Trigger if no movement for 1 hour
    })
  });
});

// Handle drift detection webhook
app.post('/api/drift/detected', async (req, res) => {
  const { userId, location } = req.body;
  
  // Check for nearby deadlines within 3 hours
  const deadlines = await db.query(
    `SELECT content, deadline_epoch 
     FROM memory_graph 
     WHERE user_id = $1 
       AND status = 'pending' 
       AND deadline_epoch BETWEEN EXTRACT(EPOCH FROM NOW()) AND EXTRACT(EPOCH FROM NOW() + INTERVAL '3 hours')
     ORDER BY deadline_epoch ASC 
     LIMIT 5`,
    [userId]
  );
  
  if (deadlines.length > 0) {
    // Generate natural language summary using existing LLM
    const summary = await generateLLMSummary({
      location: 'Still at office',
      userLocation: location,
      pendingItems: deadlines,
      prompt: 'Write a gentle non-alarmist check-in message asking if the user has any time-sensitive tasks tonight.'
    });
    
    await caspian.send({
      channel: 'whatsapp',
      to: userId,
      message: summary
    });
  }
});
```

---

## Feature 5 — The Relationship Memory Anchor

### Problem
You remember what to do but forget why it matters. The eggs weren't about eggs — your wife is fasting and that was her only planned meal. When context is lost, the task feels optional.

### What It Does
When a thought is captured that involves another person ("pick up eggs — wife asked"), the system stores the emotional weight alongside the task. When the location trigger fires, it includes the context.

### Technical Implementation
| Component | Technology | Cost |
|-----------|-----------|------|
| LLM Extraction | Existing routing | Free |
| Schema Update | PostgreSQL | Free |
| Context Injection | Template engine | Free |

#### Code Implementation
```javascript
// Update memory_graph schema
ALTER TABLE memory_graph 
ADD COLUMN IF NOT EXISTS requested_by TEXT,
ADD COLUMN IF NOT EXISTS context_note TEXT,
ADD COLUMN IF NOT EXISTS emotional_weight_score INTEGER CHECK (emotional_weight_score BETWEEN 1 AND 5);

// LLM extraction at ingestion time
async function extractRelationshipContext(message) {
  const prompt = `Extract relationship context from: "${message}"
  
Return JSON:
{
  "requested_by": "person who asked (if mentioned)",
  "context_note": "relevant context about why this matters",
  "emotional_weight_score": 1-5 based on urgency and personal significance
}`;

  const llmResponse = await callLLM(prompt);
  return JSON.parse(llmResponse);
}

// Store with extracted context
app.post('/api/thought/store', async (req, res) => {
  const { userId, message } = req.body;
  const context = await extractRelationshipContext(message);
  
  await db.query(
    `INSERT INTO memory_graph (user_id, content, requested_by, context_note, emotional_weight_score, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [userId, message, context.requested_by, context.context_note, context.emotional_weight_score]
  );
});

// Use context in notifications
async function generateNotificationWithContext(task) {
  const contextSnippet = task.requested_by 
    ? `Your ${task.requested_by} asked you this.`
    : 'This is pending from your thought stream.';
  
  return `⏰ ${task.content}\n\n${contextSnippet}\n${task.context_note ? `\nContext: ${task.context_note}` : ''}`;
}
```

---

## Feature 6 — The Door Rule

### Problem
The most reliable ADHD trick in the world is taping something across your front door so you literally cannot leave without confronting it. The visual reminder works — until you stop seeing it. Digital equivalents all fail for the same reason: you stop seeing them.

### What It Does
When the user's location shows they're leaving home (geofence exit from home coordinates), the agent fires a departure brief — a single WhatsApp message with max 3 items: the most time-sensitive pending task, the weather if relevant to plans, and one item from the memory graph tagged before_leaving.

### Technical Implementation
| Component | Technology | Cost |
|-----------|-----------|------|
| Home Geofence | Tile38 | Free (existing) |
| Weather API | Open-Meteo (free, no key) | Free |
| Query & Format | PostgreSQL + LLM | Free |

#### Code Implementation
```javascript
// Store home coordinates (user sets during onboarding)
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_location POINT;

// Tile38 hook for home exit
app.post('/api/setup/door-rule', async (req, res) => {
  const { userId } = req.body;
  const user = await db.query('SELECT home_location FROM users WHERE id = $1', [userId]);
  
  if (user.home_location) {
    const [lng, lat] = user.home_location;
    await fetch(`${TILE38_ENDPOINT}/sethook/home_exit_${userId}`, {
      method: 'POST',
      body: JSON.stringify({
        command: 'SET',
        key: `user:${userId}:location`,
        command: 'FENCE',
        near: { lat, lng, radius: 100 }, // 100m home radius
        options: { stale: '5m' } // Check every 5 minutes
      })
    });
  }
});

// Handle home exit
app.post('/api/home/exit', async (req, res) => {
  const { userId } = req.body;
  
  // Get 3 most time-sensitive pending tasks
  const pendingTasks = await db.query(
    `SELECT content, emotional_weight_score 
     FROM memory_graph 
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY emotional_weight_score DESC, created_at ASC
     LIMIT 3`,
    [userId]
  );
  
  // Get weather (Open-Meteo is completely free, no key)
  const user = await db.query('SELECT home_location FROM users WHERE id = $1', [userId]);
  const [lng, lat] = user.home_location;
  
  const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
  const weatherData = await weather.json();
  
  // Compose message
  const taskList = pendingTasks.map((t, i) => `${i + 1}. ${t.content}`).join('\n');
  
  const message = `🚪 Door Rule Check\n\nTasks to handle:\n${taskList}\n\nCurrent weather: ${weatherData.current_weather.temperature}°C`;
  
  await caspian.send({
    channel: 'whatsapp',
    to: userId,
    message
  });
});
```

---

## Implementation Roadmap

### Phase 8.1 — Infrastructure Setup (Week 1)
- [ ] Update memory_graph schema with new columns
- [ ] Set up Tile38 geofences for each feature
- [ ] Configure OSRM Docker container for routing
- [ ] Test LLM extraction for relationship context

### Phase 8.2 — Core Features (Week 2)
- [ ] Thought Interceptor (intent detection + revival)
- [ ] Time Blindness Engine (OSRM travel time)
- [ ] Door Rule (home geofence + departure brief)

### Phase 8.3 — Context Features (Week 3)
- [ ] Invisible Checklist (store geofences + memory query)
- [ ] Drift Detector (stale position monitoring)
- [ ] Relationship Anchor (LLM context extraction)

### Phase 8.4 — Integration Testing (Week 4)
- [ ] Test all features end-to-end
- [ ] Optimize notification timing
- [ ] Document feature usage

---

## Cost Breakdown

| Component | Existing? | New Cost |
|-----------|-----------|----------|
| Tile38 | ✅ | $0 |
| PostgreSQL | ✅ | $0 |
| Caspian SDK | ✅ | $0 |
| LLM Routing | ✅ | $0 |
| OSRM | Self-hosted | $0 |
| Open-Meteo | Free API | $0 |
| Redis | ✅ | $0 |
| **Total** | **All existing** | **$0** |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Thought GPS Phase 8                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │   Tile38        │────▶│  Geofence       │                   │
│  │   (Location)    │     │  Triggers       │                   │
│  └─────────────────┘     └─────────────────┘                   │
│         │                        │                              │
│         │                        ▼                              │
│         │          ┌────────────────────────────┐              │
│         │          │   Background Workers       │              │
│         │          │   - Time Blindness         │              │
│         │          │   - Drift Detector         │              │
│         │          │   - Revival Scheduler      │              │
│         │          └────────────────────────────┘              │
│         │                        │                              │
│         ▼                        ▼                              │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │   PostgreSQL    │     │   Redis Queue   │                   │
│  │   (Memory        │     │   (Pending      │                   │
│  │    Graph)       │     │   Actions)      │                   │
│  └─────────────────┘     └─────────────────┘                   │
│         │                        │                              │
│         ▼                        ▼                              │
│  ┌─────────────────────────────────────────┐                   │
│  │      LLM Routing Layer (Free)           │                   │
│  │  - Featherless.ai / Ollama / vLLM       │                   │
│  └─────────────────────────────────────────┘                   │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  Caspian SDK    │     │  Open-Meteo     │                   │
│  │  (Notifications)│     │  (Free Weather) │                   │
│  └─────────────────┘     └─────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `phase2-working/features/thought-interceptor.js` |
| Create | `phase2-working/features/time-blindness.js` |
| Create | `phase2-working/features/invisible-checklist.js` |
| Create | `phase2-working/features/drift-detector.js` |
| Create | `phase2-working/features/relationship-anchor.js` |
| Create | `phase2-working/features/door-rule.js` |
| Modify | `phase2-working/server.js` (add new endpoints) |
| Modify | `phase2-working/memory-graph.js` (add new schema) |
| Create | `phase2-working/setup/geofences.js` (Tile38 setup) |

---

## Next Steps

1. **Add schema updates** to memory-graph.js
2. **Create geofence setup script** for Tile38
3. **Implement Thought Interceptor** (highest priority - 2 hours)
4. **Implement Door Rule** (quick win - 1 hour)
5. **Set up OSRM Docker container** for routing
6. **Test all features** end-to-end
