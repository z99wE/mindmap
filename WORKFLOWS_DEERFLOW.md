# Thought GPS: Deerflow 2.0 Workflow Examples

---

## 🎯 Workflow Architecture

Each thought triggers a **Directed Acyclic Graph (DAG)** of actions.

```
Thought → Intent Detection → Workflow Selection → Execute Steps → Deliver Results
```

---

## 📋 EXAMPLE WORKFLOWS

### Workflow 1: Research + Share

**User Thought**: "Find latest research on AI consciousness, post summary on Twitter"

```yaml
workflow_id: research-and-share
trigger: thought
intent_pattern: "find|research|latest"

steps:
  - id: intent_extraction
    type: process
    service: llm
    prompt: |
      Extract the research topic and target audience from this thought.
      Thought: {user_thought}
      Return JSON: {"topic": "...", "channels": []}
    timeout: 10s
    
  - id: web_search
    type: fetch
    service: duckduckgo
    config:
      query: "{intent_extraction.output.topic} 2024 latest research"
      results: 10
    depends_on: intent_extraction
    timeout: 20s
    
  - id: summarize_results
    type: process
    service: llm
    prompt: |
      Summarize these research papers in 280 characters for Twitter:
      {web_search.output}
    depends_on: web_search
    timeout: 15s
    
  - id: send_twitter
    type: send
    service: twitter
    config:
      api_key: "{user_api_keys.twitter}"
      message: "{summarize_results.output}"
    depends_on: summarize_results
    condition: "twitter in {intent_extraction.output.channels}"
    retry:
      max_attempts: 3
      backoff: exponential
    
  - id: save_to_memory
    type: process
    service: memory
    config:
      type: research_thought
      content: "{user_thought}"
      results: "{web_search.output}"
      summary: "{summarize_results.output}"
      channels_shared: "{intent_extraction.output.channels}"
    depends_on: [send_twitter]
    
  - id: notify_user
    type: send
    service: multi_channel
    config:
      channels: [whatsapp, telegram]
      message: "✓ Found {web_search.output.length} sources and posted to Twitter"
    depends_on: save_to_memory
    always_execute: true

on_error:
  - id: handle_search_error
    condition: "web_search.status == failed"
    action: notify_user
    message: "Couldn't search the web. Try again later?"
    
  - id: handle_post_error
    condition: "send_twitter.status == failed"
    action: save_for_manual_review
    notify: email
```

---

### Workflow 2: Book Flight + Sync Calendar

**User Thought**: "Book flight NYC next Friday, budget $400, add to calendar"

```yaml
workflow_id: book-and-sync
trigger: thought
intent_pattern: "book|flight|travel"

steps:
  - id: parse_travel_intent
    type: process
    service: llm
    prompt: |
      Parse travel booking details:
      Thought: {user_thought}
      Return JSON: {
        "departure": "city",
        "arrival": "city", 
        "date": "YYYY-MM-DD",
        "budget": number,
        "travelers": number
      }
    
  - id: search_flights
    type: fetch
    service: flight_api
    config:
      from: "{parse_travel_intent.output.departure}"
      to: "{parse_travel_intent.output.arrival}"
      date: "{parse_travel_intent.output.date}"
      budget_max: "{parse_travel_intent.output.budget}"
    depends_on: parse_travel_intent
    
  - id: format_options
    type: process
    service: llm
    prompt: |
      Format these 5 best flight options as an interactive choice:
      {search_flights.output}
      Include: time, duration, price, airline
    depends_on: search_flights
    
  - id: send_options
    type: send
    service: telegram
    config:
      api_key: "{user_api_keys.telegram}"
      message: "{format_options.output}"
      buttons: [
        { label: "Book Option 1", callback: "book_flight:1" },
        { label: "Book Option 2", callback: "book_flight:2" },
        { label: "Book Option 3", callback: "book_flight:3" },
      ]
    depends_on: format_options
    interactive: true
    
  - id: wait_user_choice
    type: conditional
    timeout: 300s # 5 minutes
    depends_on: send_options
    on_choice: book_selected_flight
    on_timeout: save_options_for_later
    
  - id: book_selected_flight
    type: send
    service: booking_api
    config:
      flight_id: "{wait_user_choice.selection}"
      user_email: "{user.email}"
      api_key: "{user_api_keys.booking_service}"
    depends_on: wait_user_choice
    condition: "wait_user_choice.user_responded"
    retry:
      max_attempts: 2
    
  - id: extract_booking_details
    type: process
    service: llm
    prompt: |
      Extract calendar event details from booking confirmation:
      {book_selected_flight.output}
      Return: {
        "title": "Flight to {parse_travel_intent.output.arrival}",
        "start_time": "datetime",
        "end_time": "datetime",
        "description": "string"
      }
    depends_on: book_selected_flight
    
  - id: add_to_calendar
    type: send
    service: google_calendar
    config:
      api_key: "{user_api_keys.google}"
      event: "{extract_booking_details.output}"
    depends_on: extract_booking_details
    
  - id: confirm_booking
    type: send
    service: multi_channel
    config:
      channels: [whatsapp, email, slack]
      message: |
        ✓ Flight booked!
        📍 {parse_travel_intent.output.arrival}
        📅 {extract_booking_details.output.start_time}
        💰 {search_flights.selected_option.price}
        📧 Confirmation sent to your email
        📱 Added to Google Calendar
    depends_on: [add_to_calendar, book_selected_flight]

on_error:
  - id: payment_failed
    condition: "book_selected_flight.error contains 'payment'"
    action: send_multi_channel
    message: "Payment failed. Try a different card?"
    
  - id: calendar_sync_failed
    condition: "add_to_calendar.error"
    action: send_email
    message: "Flight booked, but couldn't add to calendar. Add manually?"
```

---

### Workflow 3: ADHD Task Breakdown + Reminders

**User Thought**: "Write blog post about TypeScript"

```yaml
workflow_id: adhd-task-breakdown
trigger: thought
intent_pattern: "write|create|build|do"

steps:
  - id: detect_task_complexity
    type: process
    service: llm
    prompt: |
      Estimate task complexity (simple/medium/complex) and suggest breakdown:
      Task: {user_thought}
      Consider: estimated time, subtasks, potential blockers
      Return JSON: {
        "complexity": "medium",
        "estimated_hours": 3,
        "subtasks": [],
        "adhd_tips": []
      }
    
  - id: break_into_pomodoros
    type: process
    service: task_engine
    config:
      task: "{user_thought}"
      complexity: "{detect_task_complexity.output.complexity}"
      time_budget: 180 # minutes
      pomodoro_length: 25 # minutes
      strategy: dopamine_driven # Easier tasks first for momentum
    depends_on: detect_task_complexity
    
  - id: create_task_schedule
    type: process
    service: llm
    prompt: |
      Create a realistic schedule for today + next 3 days:
      Pomodoros needed: {break_into_pomodoros.output.pomodoros}
      User timezone: {user.timezone}
      Awake hours: 9 AM - 11 PM
      
      Return: {
        "schedule": [
          { "date": "today", "time": "2:00 PM", "task": "..." },
          ...
        ],
        "reminders": [...]
      }
    depends_on: break_into_pomodoros
    
  - id: save_to_notion
    type: send
    service: notion
    config:
      api_key: "{user_api_keys.notion}"
      database: "tasks"
      properties:
        title: "{user_thought}"
        subtasks: "{break_into_pomodoros.output.subtasks}"
        schedule: "{create_task_schedule.output.schedule}"
        priority: high
        status: "in_progress"
    depends_on: create_task_schedule
    optional: true
    
  - id: create_reminders
    type: send
    service: reminder_engine
    config:
      user_id: "{user.id}"
      reminders: "{create_task_schedule.output.reminders}"
      channels: [slack, telegram, sms]
      style: encouraging # "You got this!"
    depends_on: create_task_schedule
    
  - id: notify_user
    type: send
    service: multi_channel
    config:
      channels: [whatsapp]
      message: |
        🎯 Task broken into {break_into_pomodoros.output.pomodoros} pomodoros
        
        📋 Today:
        {create_task_schedule.output.today_tasks}
        
        💡 Tips:
        {detect_task_complexity.output.adhd_tips}
        
        📱 Reminders set
    depends_on: [create_reminders, save_to_notion]
    
  - id: schedule_check_in
    type: process
    service: scheduler
    config:
      user_id: "{user.id}"
      check_in_times: [
        "tomorrow 9:00 AM",
        "tomorrow 3:00 PM"
      ]
      message_template: |
        How's "{user_thought}" going? 
        [✓ On track] [🆘 Need help] [⏸️ Pause]
    depends_on: notify_user

on_error:
  - id: notion_sync_failed
    condition: "save_to_notion.error"
    action: save_local_backup
    message: "Couldn't sync to Notion, saved locally"
```

---

### Workflow 4: Email Triage + Slack Alert

**Automatic Workflow**: Check email every 30 min, alert on important

```yaml
workflow_id: email-triage-auto
trigger: schedule
schedule: "0 * * * *" # Every hour

steps:
  - id: fetch_emails
    type: fetch
    service: email
    config:
      api_key: "{user_api_keys.gmail}"
      query: "is:unread -label:promotions -label:social"
      max_results: 10
      
  - id: classify_importance
    type: process
    service: llm
    prompt: |
      Rate importance (1-10) for each email. Consider:
      - Sender: known contact, CEO, bot?
      - Subject: urgent keywords?
      - Content: action required?
      
      Emails: {fetch_emails.output}
      
      Return array: [
        { id, sender, subject, importance, reason }
      ]
    depends_on: fetch_emails
    
  - id: filter_urgent
    type: process
    service: filter
    config:
      input: "{classify_importance.output}"
      condition: "importance >= 7"
    depends_on: classify_importance
    
  - id: summarize_for_slack
    type: process
    service: llm
    prompt: |
      Create Slack-friendly summary of urgent emails:
      {filter_urgent.output}
      Keep it brief, actionable, include links
    depends_on: filter_urgent
    
  - id: post_to_slack
    type: send
    service: slack
    config:
      api_key: "{user_api_keys.slack}"
      channel: "#inbox-urgent"
      blocks: "{summarize_for_slack.output}"
    depends_on: summarize_for_slack
    condition: "filter_urgent.output.length > 0"
    
  - id: save_summary
    type: process
    service: memory
    config:
      type: email_summary
      hour: now
      emails_checked: "{fetch_emails.output.length}"
      urgent_count: "{filter_urgent.output.length}"
      posted: "{post_to_slack.executed}"
    depends_on: post_to_slack
    always_execute: true

on_error:
  - id: gmail_rate_limit
    condition: "fetch_emails.error contains 'rate limit'"
    action: retry
    backoff: 5m
```

---

### Workflow 5: Voice Note → Task + Reminder

**User sends voice note on Telegram**: "Remind me to call mom tomorrow at 3 PM"

```yaml
workflow_id: voice-to-reminder
trigger: message
channel_filter: [whatsapp, telegram, signal]
message_type: audio

steps:
  - id: transcribe_voice
    type: process
    service: whisper
    config:
      audio: "{message.audio_data}"
      language: auto
    timeout: 30s
    
  - id: parse_reminder_intent
    type: process
    service: llm
    prompt: |
      Extract reminder details from transcription:
      "{transcribe_voice.output}"
      
      Return JSON: {
        "task": "string",
        "reminder_time": "ISO datetime or relative time",
        "channels": ["slack", "whatsapp"],
        "priority": "low|medium|high"
      }
    depends_on: transcribe_voice
    
  - id: resolve_time
    type: process
    service: time_resolver
    config:
      relative_time: "{parse_reminder_intent.output.reminder_time}"
      timezone: "{user.timezone}"
    depends_on: parse_reminder_intent
    
  - id: create_reminder
    type: send
    service: reminder_engine
    config:
      user_id: "{user.id}"
      task: "{parse_reminder_intent.output.task}"
      scheduled_for: "{resolve_time.output.datetime}"
      channels: "{parse_reminder_intent.output.channels}"
      message_template: |
        ⏰ Time to: {parse_reminder_intent.output.task}
    depends_on: resolve_time
    
  - id: confirm_via_channel
    type: send
    service: multi_channel
    config:
      channels: ["{source_channel}"]
      message: |
        ✓ Reminder set
        📝 {parse_reminder_intent.output.task}
        📅 {resolve_time.output.datetime}
        📢 Will notify on: {parse_reminder_intent.output.channels}
    depends_on: create_reminder

on_error:
  - id: transcription_failed
    condition: "transcribe_voice.error"
    action: send_channel
    message: "Couldn't hear you clearly. Can you type it?"
```

---

## 🔧 WORKFLOW EXECUTION ENGINE

**Key Features**:

1. **Parallel Execution**: Steps with no dependencies run in parallel
   ```
   step_a → step_c ─┐
                    ├→ step_e
   step_b ──────────┘
   ```

2. **Error Recovery**: Try fallbacks before failing
   ```
   Primary → Error → Fallback 1 → Error → Fallback 2 → Error → Manual Review
   ```

3. **User Input**: Wait for user to choose option, with timeout
   ```
   Show options → Await choice (5 min) → User selects → Continue
                → Timeout → Save for manual → Notify user
   ```

4. **Conditional Execution**: Skip steps based on conditions
   ```
   if (user_has_twitter_api_key && twitter in channels) {
     execute send_twitter;
   }
   ```

5. **Monitoring & Logging**
   ```
   Every step → Logged to PostgreSQL + Blockchain (Arweave)
   Success/Failure/Timeout all tracked
   User can see full audit trail
   ```

---

## 📝 WORKFLOW DEPLOYMENT

**Store workflows in**:
```
/workflows/*.yaml
```

**Load and validate on startup**:
```typescript
import YAML from "yaml";
import { validateWorkflow } from "@deerflow/validator";

const workflows = fs
  .readdirSync("./workflows")
  .map((file) => ({
    id: file.replace(".yaml", ""),
    config: validateWorkflow(YAML.parse(fs.readFileSync(`./workflows/${file}`))),
  }));

export const workflowEngine = new DeerflowEngine(workflows);
```

**Trigger a workflow**:
```typescript
const result = await workflowEngine.execute({
  workflow_id: "research-and-share",
  user_id: user.id,
  input: {
    user_thought: "Find latest on quantum computing",
  },
});
```

