# IPOP AI Operations Agent - Pitch Deck Context Document

Use this document to build a pitch deck for the CEO and CFO of IPOP (Inclusive Place of Pickleball). The audience is non-technical leadership. Frame everything around business value, operational efficiency, and competitive advantage.

---

## What It Is

An **AI-powered operations assistant** built specifically for IPOP, embedded directly into the company's internal dashboard. It connects to the team's Google Workspace (Gmail, Google Calendar, Google Drive) and lets staff interact with all three through a single conversational interface powered by Anthropic's Claude AI.

Think of it as a **smart command center** where any IPOP team member can ask natural language questions about their emails, schedule, and files -- and get instant, actionable answers without switching between tabs or apps.

---

## The Problem It Solves

IPOP operates across **5 locations** (Burnaby, Surrey, Penticton, Victoria, Nanaimo). Staff are constantly context-switching between Gmail, Google Calendar, and Google Drive to:
- Find and respond to emails from members, vendors, and partners
- Check scheduling across locations
- Locate documents (contracts, reports, spreadsheets, presentations)
- Draft professional communications

This fragmented workflow wastes time, leads to missed emails, scheduling conflicts, and difficulty finding the right files. The AI agent consolidates all of this into one place.

---

## Core Capabilities

### 1. Email Management (Gmail Integration)
- **Search the inbox** using natural language (e.g., "show me unread emails from vendors this week")
- **Read full email threads** to understand conversation context before responding
- **Draft professional replies** with AI assistance -- the agent composes the email, shows it for review, and only creates the draft after explicit confirmation
- **Never sends without approval** -- all drafts require human confirmation before creation
- Emails appear as **rich, clickable cards** in the chat (not raw text), with sender info, subject lines, timestamps, and direct Gmail links

### 2. Calendar Management (Google Calendar Integration)
- **View upcoming events** across any date range ("What's on my calendar this week?", "Do I have anything Monday?")
- **Search for specific events** by keyword, attendee, or location
- **Create new events** with attendees, location, and description -- again, only after user confirmation
- **Smart date awareness** -- the agent always knows today's date and correctly resolves "tomorrow", "next Monday", "this Friday", etc.
- Events display as **styled cards** showing time, location, attendees with RSVP status, and a direct link to Google Calendar

### 3. Google Drive File Access
- **Search across all Drive files** using natural language ("find the Q4 budget spreadsheet", "show me files shared with me recently")
- **Browse folder contents** to navigate the file hierarchy
- **Read and understand 25+ file types**, including:
  - Google Docs, Sheets, and Slides
  - PDFs (full text extraction)
  - Microsoft Word (.docx), Excel (.xlsx), PowerPoint (.pptx)
  - HTML, CSV, JSON, XML, Markdown, plain text
  - Legacy Office formats (.doc, .xls, .ppt)
  - ZIP archives (file listing)
  - RTF documents
- Files appear as **color-coded cards** with type icons, file size, owner, last modified date, and a direct Drive link
- The agent can **read file contents and answer questions about them** (e.g., "What does the membership agreement say about cancellation policy?")

### 4. AI-Powered Email Drafting
- Separate email drafting tool that uses **company context** (brand voice, writing style, services, target market) stored in settings
- Ensures all outgoing communications maintain IPOP's professional tone and brand consistency
- Users can rate drafts (1-5 stars) and provide feedback to improve future drafts

---

## User Experience Highlights

### Conversational Interface
- Clean, modern dark-mode UI that matches IPOP's brand (lime green accent on dark backgrounds)
- **Two interface options**: A dashboard-integrated chat panel and a dedicated full-screen "Operations Agent" view with a sci-fi command-center aesthetic
- Real-time streaming text with **smooth character-by-character reveal animation** (similar to ChatGPT/Gemini)
- **Shimmer animation** on "Thinking..." states so users always know the agent is working

### Smart Visual Feedback
- When the agent uses a tool, the UI shows exactly what it's doing: "Checking Gmail...", "Checking Google Calendar...", "Searching Drive..."
- Tool badges appear on messages showing which integrations were used
- Active tools glow in the sidebar during execution
- All data (emails, events, files) renders as **interactive cards** -- not walls of text

### Conversation History
- All chats are **automatically saved** with persistent history
- **AI-generated titles** -- the first message exchange is summarized into a 3-6 word title (e.g., "Monday Calendar Check", "Q4 Budget Review")
- History grouped by time: Today, Yesterday, Previous 7 Days, Older
- Full conversation replay with all tool results, email cards, and file data preserved

### Granular Tool Control
- Users can **toggle tools on/off** per conversation via a side panel
- Toggle Gmail, Calendar, and/or Drive independently
- Visual indicator shows how many tools are active (e.g., "3/3")

### Pre-Built Quick Actions
- Six suggestion chips get users started instantly:
  - "Summarize my unread emails"
  - "What meetings do I have today?"
  - "Draft a follow-up email to my last client thread"
  - "Find recent files shared with me on Drive"
  - "Any emails I haven't responded to this week?"
  - "Show my calendar for the rest of the week"

### Multi-Location Awareness
- Location selector lets users filter context to a specific IPOP location or view across all locations
- The AI agent knows which location context it's operating in and tailors responses accordingly

---

## Technical Architecture (Simplified for Pitch)

- **AI Model**: Anthropic Claude Sonnet 4 (latest, most capable conversational AI)
- **Title Generation**: Claude Haiku (fast, cost-effective for short summaries)
- **Framework**: Next.js (React) -- modern, fast, production-grade web framework
- **Database**: PostgreSQL via Prisma ORM -- reliable, scalable data storage
- **Authentication**: Google OAuth with role-based access (Owner, Admin, User)
- **Security**: All actions require user confirmation. The agent can read and draft but never sends, deletes, or modifies without explicit approval. OAuth tokens are securely stored and automatically refreshed.
- **Streaming**: Server-Sent Events (SSE) for real-time, low-latency AI responses

---

## Security & Access Control

- **Google OAuth sign-in** -- no separate passwords to manage
- **Email whitelist** -- only approved email addresses can access the system
- **Role hierarchy**: Owner > Admin > User (settings access restricted to Admin+)
- **Read-heavy permissions**: Gmail read + compose (no send), Calendar read + event creation, Drive read-only
- **All destructive actions require confirmation** -- the agent always asks before creating drafts, events, etc.
- **Token security**: OAuth refresh tokens stored encrypted in the database, automatically refreshed on expiry

---

## Business Value Propositions

### Time Savings
- Eliminate tab-switching between Gmail, Calendar, and Drive
- Find emails, events, and files in seconds with natural language instead of manual searching
- AI-drafted emails maintain quality while cutting writing time significantly

### Operational Consistency
- Company-wide writing style and brand voice enforced through AI context settings
- Consistent, professional communications across all 5 locations
- Centralized tool access means standardized workflows

### Reduced Training Overhead
- New staff interact with one tool instead of learning Gmail power-user tricks, Calendar scheduling, and Drive organization
- Natural language interface requires zero training -- just type what you need

### Scalability
- Adding new locations doesn't increase operational complexity -- the agent scales with the organization
- Tool categories can be expanded (future: inventory, booking systems, POS integration, CRM)
- Company context settings (brand voice, services, pricing) update once and apply everywhere

### Competitive Advantage
- Most pickleball facilities and sports facilities in general do not have AI-powered operations tools
- Demonstrates technological sophistication to partners, investors, and members
- Positions IPOP as an innovation leader in the indoor sports facility space

---

## What's Built and Working Today

| Feature | Status |
|---|---|
| Gmail search, read, and thread viewing | Live |
| Email draft creation with confirmation | Live |
| Calendar event listing and search | Live |
| Calendar event creation with confirmation | Live |
| Google Drive file search | Live |
| Drive folder browsing | Live |
| Drive file reading (25+ formats including PDF, DOCX, XLSX, PPTX) | Live |
| Real-time streaming responses | Live |
| Interactive email/calendar/file cards | Live |
| Persistent chat history with AI-generated titles | Live |
| Multi-location context switching | Live |
| Tool toggle panel (Gmail/Calendar/Drive) | Live |
| Role-based access control (Owner/Admin/User) | Live |
| Company context settings for brand voice | Live |
| Smooth text animation and shimmer effects | Live |
| Google OAuth with automatic token refresh | Live |

---

## Future Expansion Opportunities

- **Booking system integration** -- let the agent check court availability, manage reservations
- **POS/payment integration** -- query revenue, membership status, payment history
- **Custom MCP tool connections** -- plug in any third-party service (Slack, CRM, inventory)
- **Staff scheduling** -- manage shifts and availability through the agent
- **Member communication** -- bulk draft personalized emails to member segments
- **Analytics queries** -- "How many bookings did Burnaby have last month?"
- **Automated workflows** -- scheduled tasks like daily email summaries or weekly calendar digests

---

## Key Talking Points for CEO/CFO

1. **"One interface to rule them all"** -- Staff stop juggling Gmail, Calendar, and Drive tabs. Everything is accessible through natural conversation.

2. **"AI that reads your files"** -- The agent doesn't just search Drive, it actually reads and understands PDFs, Word docs, spreadsheets, and presentations. Ask it questions about any document.

3. **"Professional drafts in seconds"** -- Email drafting with built-in brand voice consistency. Every outgoing email sounds like IPOP, regardless of who writes it.

4. **"Nothing happens without approval"** -- The agent is a power tool, not an autonomous actor. Every draft and event creation requires explicit human confirmation.

5. **"It knows what day it is"** -- Unlike generic AI chatbots, this agent is date-aware and location-aware. "What's on my calendar Monday?" always returns the correct Monday.

6. **"Built to grow"** -- The architecture supports adding new tool integrations (booking systems, POS, CRM) without rebuilding the core. Each new integration is a plugin.

7. **"Conversations are saved"** -- Chat history with AI-generated titles means nothing gets lost. Staff can revisit past research, drafts, and file lookups anytime.

8. **"Five locations, one brain"** -- Multi-location awareness means the agent can operate in the context of a specific facility or across all of IPOP.
