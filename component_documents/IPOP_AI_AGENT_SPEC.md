# IPOP AI Agent — Claude Code Build Spec

## Overview

Build a dedicated AI Agent page for the IPOP operations dashboard. This is an internal staff/owner-facing tool where a conversational AI agent has live access to every data source IPOP touches — bookings, staff schedules, financials, member data, pro shop, communications, and documents.

The page lives at `/agent` inside the existing Next.js PWA.

---

## Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon (Postgres) via Prisma
- **Auth**: Clerk (staff/owner roles only — this page is internal)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`) with streaming
- **SMS**: Twilio
- **Payments/shop**: Stripe + Shopify Storefront API
- **Analytics**: PostHog
- **Hosting**: Vercel

---

## Page Layout

Two-column layout, full viewport height, no scrolling on the outer shell.

### Left Sidebar (260px fixed)
- IPOP logo + "Operations Agent" label
- Location selector dropdown (All Locations / Burnaby / Surrey / Penticton / Victoria / Nanaimo)
- Connected Tools list — 8 tools each with icon, name, short description, and a live status dot
- Status dot animates (glows lime green `#d8ff29`) when that tool is actively being queried

### Right Main Area
- Top bar: page title + current location + agent status (Ready / Thinking...)
- Messages area (scrollable, flex-grow)
- Suggested prompts row (disappears after first real message)
- Input area: auto-expanding textarea + send button

---

## Design Tokens

```css
--bg-base: #0a0d0a;
--bg-sidebar: #0d110d;
--accent: #d8ff29;          /* IPOP lime yellow */
--accent-dim: rgba(216, 255, 41, 0.15);
--border: rgba(255,255,255,0.07);
--text-primary: rgba(255,255,255,0.9);
--text-secondary: rgba(255,255,255,0.5);
--text-muted: rgba(255,255,255,0.25);

--font-display: 'Syne', sans-serif;   /* headings */
--font-body: 'DM Sans', sans-serif;   /* body/chat */
--font-mono: 'DM Mono', monospace;    /* labels, status, badges */
```

Background has a subtle lime-tinted grid pattern (40px × 40px, 2% opacity).

---

## Streaming Chat Implementation

### API Route: `app/api/agent/route.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs";
import { NextRequest } from "next/server";

const client = new Anthropic();

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messages, location, tools: enabledTools } = await req.json();

  const systemPrompt = buildSystemPrompt(location, enabledTools);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
    tools: buildToolDefinitions(enabledTools),
  });

  // Return a ReadableStream that forwards SSE events
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      for await (const event of stream) {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
      
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### System Prompt Builder

```typescript
function buildSystemPrompt(location: string, enabledTools: string[]): string {
  return `You are IPOP's internal AI operations agent. IPOP (Inclusive Place of Pickleball) is a Canadian multi-location indoor pickleball facility.

ACTIVE LOCATION CONTEXT: ${location === "All Locations" ? "You have visibility across all IPOP locations." : `You are focused on the ${location} location.`}

You have access to the following live data sources via tools:
${enabledTools.map(t => `- ${TOOL_DESCRIPTIONS[t]}`).join("\n")}

BEHAVIOR:
- Be concise and direct. This is an internal ops tool, not a customer chat.
- When showing data, use markdown tables or structured lists.
- Always cite which data source you pulled from.
- If asked to take an action (send SMS, update schedule, etc.), confirm the action and show what will be sent before executing.
- Flag anomalies proactively (e.g. if asked about revenue and you notice a dip, mention it).
- For multi-location queries, break results down by location.`;
}
```

---

## Tool Definitions

These are the MCP-style tools the agent can call. Each maps to a server action that queries the real data source.

### 1. `get_court_bookings`
**Source**: Neon DB (CourtReserve replacement data)
```typescript
{
  name: "get_court_bookings",
  description: "Get court booking data, occupancy rates, and utilization stats",
  input_schema: {
    type: "object",
    properties: {
      location: { type: "string" },
      date_from: { type: "string", description: "ISO date" },
      date_to: { type: "string", description: "ISO date" },
      metric: { 
        type: "string", 
        enum: ["occupancy", "revenue", "bookings", "cancellations", "waitlist"] 
      }
    }
  }
}
```

### 2. `get_staff_schedules`
**Source**: Neon DB (staff scheduling module)
```typescript
{
  name: "get_staff_schedules",
  description: "Get staff schedules, availability, and coverage gaps",
  input_schema: {
    type: "object",
    properties: {
      location: { type: "string" },
      week_of: { type: "string", description: "ISO date of Monday" },
      role: { type: "string", enum: ["all", "front_desk", "coach", "monitor"] }
    }
  }
}
```

### 3. `generate_schedule`
**Source**: Claude reasoning over staff availability data
```typescript
{
  name: "generate_schedule",
  description: "Auto-generate an optimized staff schedule for a given week",
  input_schema: {
    type: "object",
    properties: {
      location: { type: "string" },
      week_of: { type: "string" },
      special_events: { type: "array", items: { type: "string" } },
      constraints: { type: "string", description: "Any special requirements" }
    }
  }
}
```

### 4. `get_financial_data`
**Source**: QuickBooks API
```typescript
{
  name: "get_financial_data",
  description: "Query P&L, revenue breakdown, expenses by location",
  input_schema: {
    type: "object",
    properties: {
      location: { type: "string" },
      period: { type: "string", enum: ["today", "week", "month", "quarter", "year"] },
      metric: { type: "string", enum: ["revenue", "expenses", "profit", "court_revenue", "membership_revenue", "shop_revenue"] }
    }
  }
}
```

### 5. `search_drive`
**Source**: Google Drive API
```typescript
{
  name: "search_drive",
  description: "Search and retrieve Google Drive documents — contracts, SOPs, coaching materials",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string" },
      type: { type: "string", enum: ["all", "contract", "sop", "hr", "coaching", "legal"] }
    }
  }
}
```

### 6. `get_calendar_events`
**Source**: Google Calendar API
```typescript
{
  name: "get_calendar_events",
  description: "Get upcoming events, clinics, tournaments, and private bookings",
  input_schema: {
    type: "object",
    properties: {
      location: { type: "string" },
      days_ahead: { type: "number", default: 14 },
      event_type: { type: "string", enum: ["all", "clinic", "tournament", "lesson", "maintenance"] }
    }
  }
}
```

### 7. `get_shop_inventory`
**Source**: Shopify Storefront API
```typescript
{
  name: "get_shop_inventory",
  description: "Check pro shop inventory levels, sales velocity, and reorder flags",
  input_schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["all", "paddles", "balls", "accessories", "apparel"] },
      low_stock_only: { type: "boolean" }
    }
  }
}
```

### 8. `get_member_data`
**Source**: Neon DB (member profiles)
```typescript
{
  name: "get_member_data",
  description: "Query member stats, activity, skill levels, and churn risk",
  input_schema: {
    type: "object",
    properties: {
      filter: { type: "string", enum: ["all", "active", "churned", "at_risk", "new"] },
      days_inactive: { type: "number", description: "Filter by days since last booking" },
      location: { type: "string" }
    }
  }
}
```

### 9. `send_sms_campaign`
**Source**: Twilio
```typescript
{
  name: "send_sms_campaign",
  description: "Send an SMS campaign to a filtered member segment. ALWAYS show the message and recipient count for confirmation before sending.",
  input_schema: {
    type: "object",
    properties: {
      segment: { type: "string", description: "Who to target, e.g. 'members inactive 14+ days'" },
      message: { type: "string", description: "The SMS content" },
      confirmed: { type: "boolean", description: "True only after user has confirmed" }
    }
  }
}
```

### 10. `get_analytics`
**Source**: PostHog
```typescript
{
  name: "get_analytics",
  description: "Get app/site analytics — feature usage, booking funnel, drop-off points",
  input_schema: {
    type: "object",
    properties: {
      metric: { type: "string" },
      date_from: { type: "string" },
      date_to: { type: "string" }
    }
  }
}
```

---

## Frontend Component Structure

```
app/
  agent/
    page.tsx                  ← Main page (server component, auth check)
    layout.tsx                ← Full-screen layout, no nav
    components/
      AgentChat.tsx           ← Main client component with state
      Sidebar.tsx             ← Tool list + location selector
      MessageList.tsx         ← Scrollable messages
      Message.tsx             ← Individual message bubble
      ToolCallBadge.tsx       ← Animated tool indicator
      InputBar.tsx            ← Textarea + send button
      SuggestionChips.tsx     ← Quick-start prompts
    hooks/
      useAgentStream.ts       ← Streaming logic
      useToolState.ts         ← Active tool tracking
```

---

## `useAgentStream` Hook

```typescript
export function useAgentStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());
  const [streaming, setStreaming] = useState(false);

  const send = async (userMessage: string, location: string) => {
    setStreaming(true);
    
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    
    // Add empty assistant message
    setMessages(prev => [...prev, { role: "assistant", content: "", toolCalls: [] }]);

    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, location }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      const lines = text.split("\n").filter(l => l.startsWith("data: "));
      
      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        
        const event = JSON.parse(data);
        
        // Handle tool use start — light up the sidebar
        if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
          const toolName = event.content_block.name;
          setActiveTools(prev => new Set([...prev, toolName]));
          
          // Add tool call to message
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            last.toolCalls = [...(last.toolCalls || []), toolName];
            return updated;
          });
          
          // Remove after 2s
          setTimeout(() => {
            setActiveTools(prev => {
              const next = new Set(prev);
              next.delete(toolName);
              return next;
            });
          }, 2000);
        }
        
        // Stream text delta
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            last.content += event.delta.text;
            return updated;
          });
        }
      }
    }
    
    setStreaming(false);
  };

  return { messages, send, streaming, activeTools };
}
```

---

## Suggested Prompts (Seed on First Load)

```typescript
const SUGGESTED_PROMPTS = [
  "What's our court utilization rate for Burnaby this week?",
  "Generate next week's staff schedule across all locations",
  "Which members haven't booked in 30+ days?",
  "What's our revenue per court hour vs last month?",
  "Draft an SMS campaign for Thursday evening open courts",
  "Flag any low inventory items in the pro shop",
  "What events are coming up in the next 2 weeks?",
  "Show me our top 10 most active members this month",
];
```

Hide suggestions after the user sends their first message.

---

## Tool Display Names + Icons

```typescript
export const TOOLS = [
  { id: "get_court_bookings",   icon: "🏓", label: "Bookings & Courts",  desc: "CourtReserve data, occupancy, waitlists" },
  { id: "get_staff_schedules",  icon: "👥", label: "Staff & Scheduling", desc: "Shifts, availability, coverage" },
  { id: "get_financial_data",   icon: "📊", label: "Finance",            desc: "QuickBooks, revenue, P&L by location" },
  { id: "search_drive",         icon: "📁", label: "Google Drive",       desc: "SOPs, contracts, coaching docs" },
  { id: "get_calendar_events",  icon: "📅", label: "Calendar",           desc: "Events, clinics, tournaments" },
  { id: "get_shop_inventory",   icon: "🛒", label: "Pro Shop",           desc: "Shopify inventory, sales velocity" },
  { id: "get_member_data",      icon: "🎖️", label: "Members",           desc: "Profiles, skill ratings, history" },
  { id: "send_sms_campaign",    icon: "💬", label: "Comms",             desc: "Twilio SMS, email campaigns" },
];
```

---

## Auth & Access Control

- Route is protected by Clerk middleware
- Only users with `role: "staff"` or `role: "owner"` can access
- Owner role sees all locations and financial data
- Staff role is scoped to their assigned location(s)

```typescript
// middleware.ts
export default authMiddleware({
  publicRoutes: ["/", "/api/webhook/(.*)"],
  afterAuth(auth, req) {
    if (req.nextUrl.pathname.startsWith("/agent")) {
      const role = auth.sessionClaims?.metadata?.role;
      if (!role || !["staff", "owner"].includes(role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }
});
```

---

## Environment Variables Needed

```bash
ANTHROPIC_API_KEY=
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REALM_ID=
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
SHOPIFY_STOREFRONT_TOKEN=
SHOPIFY_STORE_DOMAIN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
POSTHOG_API_KEY=
DATABASE_URL=           ← Neon connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

---

## Phase Rollout

**Phase 1 — Shell + Fake Data** (build first, validate UX)
- Full UI working
- Streaming response from Claude
- Tool calls show in sidebar (simulated)
- Hard-coded mock data returned from tool handlers

**Phase 2 — Real Data Connections**
- Connect Neon DB (bookings, members, staff)
- Connect Shopify
- Connect Google Calendar

**Phase 3 — External Integrations**
- QuickBooks OAuth flow
- Google Drive OAuth flow  
- Twilio SMS with confirmation gate

**Phase 4 — Agent Intelligence**
- Proactive anomaly flagging
- Schedule generation with optimization
- Churn risk scoring
- Automated daily digest (Slack/email)

---

## Visual Reference

Primary accent: `#d8ff29` (IPOP lime yellow)
Background family: deep near-blacks (`#0a0d0a`, `#0d110d`)
Font stack: Syne (headings) + DM Sans (body) + DM Mono (labels/mono)
Grid background: 40px tile, lime at 2% opacity
Sidebar tool dots: glow lime when active, dim when idle
Message bubbles: user = lime-tinted, agent = white-tinted glass
Cursor blink on streaming: 2px lime bar

See the `ipop-agent.jsx` prototype file for the full working visual reference.
