import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

const client = new Anthropic();

const TOOL_DESCRIPTIONS: Record<string, string> = {
  get_court_bookings:
    "Court booking data, occupancy rates, and utilization stats from CourtReserve",
  get_staff_schedules:
    "Staff schedules, availability, and coverage gap analysis",
  generate_schedule:
    "Auto-generate optimized staff schedules based on availability and constraints",
  get_financial_data:
    "P&L, revenue breakdown, and expenses by location from QuickBooks",
  search_drive:
    "Search Google Drive for contracts, SOPs, coaching materials, and HR documents",
  get_calendar_events:
    "Upcoming events, clinics, tournaments, and private bookings from Google Calendar",
  get_shop_inventory:
    "Pro shop inventory levels, sales velocity, and reorder flags from Shopify",
  get_member_data:
    "Member stats, activity, skill levels, and churn risk from the member database",
  send_sms_campaign:
    "Send SMS campaigns via Twilio to filtered member segments",
  get_analytics:
    "App/site analytics — feature usage, booking funnel, drop-off points from PostHog",
};

const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_court_bookings",
    description:
      "Get court booking data, occupancy rates, and utilization stats",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
        date_from: { type: "string", description: "ISO date" },
        date_to: { type: "string", description: "ISO date" },
        metric: {
          type: "string",
          enum: [
            "occupancy",
            "revenue",
            "bookings",
            "cancellations",
            "waitlist",
          ],
        },
      },
    },
  },
  {
    name: "get_staff_schedules",
    description: "Get staff schedules, availability, and coverage gaps",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
        week_of: { type: "string", description: "ISO date of Monday" },
        role: {
          type: "string",
          enum: ["all", "front_desk", "coach", "monitor"],
        },
      },
    },
  },
  {
    name: "generate_schedule",
    description:
      "Auto-generate an optimized staff schedule for a given week",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
        week_of: { type: "string" },
        special_events: { type: "array", items: { type: "string" } },
        constraints: {
          type: "string",
          description: "Any special requirements",
        },
      },
    },
  },
  {
    name: "get_financial_data",
    description: "Query P&L, revenue breakdown, expenses by location",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
        period: {
          type: "string",
          enum: ["today", "week", "month", "quarter", "year"],
        },
        metric: {
          type: "string",
          enum: [
            "revenue",
            "expenses",
            "profit",
            "court_revenue",
            "membership_revenue",
            "shop_revenue",
          ],
        },
      },
    },
  },
  {
    name: "search_drive",
    description:
      "Search and retrieve Google Drive documents — contracts, SOPs, coaching materials",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        type: {
          type: "string",
          enum: ["all", "contract", "sop", "hr", "coaching", "legal"],
        },
      },
    },
  },
  {
    name: "get_calendar_events",
    description:
      "Get upcoming events, clinics, tournaments, and private bookings",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
        days_ahead: { type: "number" },
        event_type: {
          type: "string",
          enum: ["all", "clinic", "tournament", "lesson", "maintenance"],
        },
      },
    },
  },
  {
    name: "get_shop_inventory",
    description:
      "Check pro shop inventory levels, sales velocity, and reorder flags",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["all", "paddles", "balls", "accessories", "apparel"],
        },
        low_stock_only: { type: "boolean" },
      },
    },
  },
  {
    name: "get_member_data",
    description:
      "Query member stats, activity, skill levels, and churn risk",
    input_schema: {
      type: "object" as const,
      properties: {
        filter: {
          type: "string",
          enum: ["all", "active", "churned", "at_risk", "new"],
        },
        days_inactive: {
          type: "number",
          description: "Filter by days since last booking",
        },
        location: { type: "string" },
      },
    },
  },
  {
    name: "send_sms_campaign",
    description:
      "Send an SMS campaign to a filtered member segment. ALWAYS show the message and recipient count for confirmation before sending.",
    input_schema: {
      type: "object" as const,
      properties: {
        segment: {
          type: "string",
          description:
            "Who to target, e.g. 'members inactive 14+ days'",
        },
        message: { type: "string", description: "The SMS content" },
        confirmed: {
          type: "boolean",
          description: "True only after user has confirmed",
        },
      },
    },
  },
  {
    name: "get_analytics",
    description:
      "Get app/site analytics — feature usage, booking funnel, drop-off points",
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string" },
        date_from: { type: "string" },
        date_to: { type: "string" },
      },
    },
  },
];

// Phase 1: Mock tool results
function getMockToolResult(toolName: string, input: Record<string, unknown>): string {
  const location = (input.location as string) || "All Locations";

  switch (toolName) {
    case "get_court_bookings":
      return JSON.stringify({
        location,
        period: `${input.date_from || "2026-03-04"} to ${input.date_to || "2026-03-11"}`,
        metric: input.metric || "occupancy",
        data: {
          total_courts: 12,
          total_slots: 336,
          booked_slots: 278,
          occupancy_rate: "82.7%",
          peak_hours: "6pm-9pm (95% full)",
          revenue: "$14,280",
          cancellations: 12,
          waitlist_entries: 34,
          busiest_day: "Saturday",
        },
        source: "CourtReserve / Neon DB",
      });

    case "get_staff_schedules":
      return JSON.stringify({
        location,
        week_of: input.week_of || "2026-03-09",
        staff: [
          { name: "Alex Chen", role: "Front Desk", hours: 32, shifts: ["Mon 8-4", "Tue 8-4", "Thu 8-4", "Fri 8-4"] },
          { name: "Jordan Lee", role: "Coach", hours: 24, shifts: ["Mon 4-10", "Wed 4-10", "Sat 10-6"] },
          { name: "Sam Patel", role: "Monitor", hours: 28, shifts: ["Tue 4-10", "Wed 8-4", "Fri 4-10", "Sun 10-6"] },
          { name: "Riley Kim", role: "Front Desk", hours: 20, shifts: ["Sat 8-4", "Sun 8-4", "Mon 4-8"] },
        ],
        coverage_gaps: ["Wednesday 8am-12pm (front desk)", "Sunday 4pm-10pm (monitor)"],
        source: "Staff Scheduling / Neon DB",
      });

    case "generate_schedule":
      return JSON.stringify({
        location,
        week_of: input.week_of || "2026-03-16",
        generated_schedule: {
          Monday: ["Alex Chen: 8-4 (FD)", "Jordan Lee: 4-10 (Coach)", "Sam Patel: 4-10 (Mon)"],
          Tuesday: ["Alex Chen: 8-4 (FD)", "Sam Patel: 8-4 (Mon)", "Jordan Lee: 4-10 (Coach)"],
          Wednesday: ["Riley Kim: 8-4 (FD)", "Sam Patel: 4-10 (Mon)"],
          Thursday: ["Alex Chen: 8-4 (FD)", "Jordan Lee: 4-10 (Coach)"],
          Friday: ["Alex Chen: 8-4 (FD)", "Sam Patel: 4-10 (Mon)"],
          Saturday: ["Riley Kim: 8-4 (FD)", "Jordan Lee: 10-6 (Coach)", "Sam Patel: 10-6 (Mon)"],
          Sunday: ["Riley Kim: 8-4 (FD)", "Sam Patel: 10-6 (Mon)"],
        },
        total_labor_hours: 104,
        estimated_cost: "$2,340",
        notes: "Coverage gap on Sunday evening - consider hiring part-time monitor",
        source: "Schedule Generator (AI-optimized)",
      });

    case "get_financial_data":
      return JSON.stringify({
        location,
        period: input.period || "month",
        data: {
          total_revenue: "$87,450",
          court_revenue: "$52,200",
          membership_revenue: "$24,800",
          shop_revenue: "$7,350",
          lesson_revenue: "$3,100",
          total_expenses: "$61,200",
          net_profit: "$26,250",
          profit_margin: "30.0%",
          vs_last_month: "+8.3%",
          top_expense: "Payroll ($34,500)",
        },
        source: "QuickBooks",
      });

    case "search_drive":
      return JSON.stringify({
        query: input.query,
        results: [
          { name: "Staff Onboarding SOP v3.2", type: "document", modified: "2026-02-15", folder: "SOPs" },
          { name: "Court Maintenance Checklist", type: "spreadsheet", modified: "2026-01-20", folder: "Operations" },
          { name: "Coaching Program Guidelines", type: "document", modified: "2026-03-01", folder: "Coaching" },
        ],
        source: "Google Drive",
      });

    case "get_calendar_events":
      return JSON.stringify({
        location,
        upcoming: [
          { event: "Beginner Clinic", date: "2026-03-13", time: "10am-12pm", courts: "1-2", registrations: 14 },
          { event: "Thursday Night Tournament", date: "2026-03-14", time: "6pm-10pm", courts: "1-8", registrations: 28 },
          { event: "Private Lesson - J. Smith", date: "2026-03-15", time: "2pm-3pm", courts: "12", registrations: 1 },
          { event: "Court Maintenance", date: "2026-03-17", time: "6am-8am", courts: "All", registrations: 0 },
        ],
        source: "Google Calendar",
      });

    case "get_shop_inventory":
      return JSON.stringify({
        category: input.category || "all",
        items: [
          { name: "Selkirk Vanguard 2.0", category: "Paddles", stock: 3, reorder: true, velocity: "4/week" },
          { name: "Franklin X-40 Balls (12pk)", category: "Balls", stock: 24, reorder: false, velocity: "8/week" },
          { name: "IPOP Branded Tee", category: "Apparel", stock: 2, reorder: true, velocity: "3/week" },
          { name: "Overgrip 3-pack", category: "Accessories", stock: 18, reorder: false, velocity: "5/week" },
          { name: "Joola Ben Johns Hyperion", category: "Paddles", stock: 1, reorder: true, velocity: "2/week" },
        ],
        low_stock_count: 3,
        source: "Shopify",
      });

    case "get_member_data":
      return JSON.stringify({
        location,
        filter: input.filter || "all",
        summary: {
          total_members: 847,
          active: 612,
          at_risk: 89,
          churned_30d: 23,
          new_30d: 41,
          avg_bookings_per_member: 3.2,
        },
        top_members: [
          { name: "Dave W.", bookings_30d: 18, skill: "4.0", member_since: "2024-06" },
          { name: "Sarah L.", bookings_30d: 15, skill: "3.5", member_since: "2025-01" },
          { name: "Mike T.", bookings_30d: 14, skill: "4.5", member_since: "2024-03" },
        ],
        at_risk_sample: [
          { name: "Chris P.", last_booking: "2026-02-05", days_inactive: 34 },
          { name: "Anna K.", last_booking: "2026-02-10", days_inactive: 29 },
        ],
        source: "Member DB / Neon",
      });

    case "send_sms_campaign":
      if (!input.confirmed) {
        return JSON.stringify({
          status: "preview",
          segment: input.segment,
          message: input.message,
          estimated_recipients: 47,
          estimated_cost: "$2.35",
          note: "Campaign NOT sent. Show this preview to the user and ask them to confirm before re-calling with confirmed=true.",
          source: "Twilio (preview)",
        });
      }
      return JSON.stringify({
        status: "sent",
        recipients: 47,
        delivered: 45,
        failed: 2,
        cost: "$2.25",
        source: "Twilio",
      });

    case "get_analytics":
      return JSON.stringify({
        metric: input.metric || "booking_funnel",
        period: `${input.date_from || "2026-03-01"} to ${input.date_to || "2026-03-11"}`,
        data: {
          page_views: 12450,
          unique_visitors: 3200,
          booking_started: 890,
          booking_completed: 672,
          conversion_rate: "75.5%",
          drop_off_point: "Payment step (12% drop)",
          top_feature: "Court booking (78% of sessions)",
          mobile_vs_desktop: "64% / 36%",
        },
        source: "PostHog",
      });

    default:
      return JSON.stringify({ error: "Unknown tool", source: "System" });
  }
}

function buildSystemPrompt(location: string): string {
  const toolList = Object.entries(TOOL_DESCRIPTIONS)
    .map(([, desc]) => `- ${desc}`)
    .join("\n");

  return `You are IPOP's internal AI operations agent. IPOP (Inclusive Place of Pickleball) is a Canadian multi-location indoor pickleball facility with locations in Burnaby, Surrey, Penticton, Victoria, and Nanaimo.

ACTIVE LOCATION CONTEXT: ${location === "All Locations" ? "You have visibility across all IPOP locations." : `You are focused on the ${location} location.`}

You have access to the following live data sources via tools:
${toolList}

BEHAVIOR:
- Be concise and direct. This is an internal ops tool, not a customer chat.
- When showing data, use markdown tables or structured lists.
- Always cite which data source you pulled from.
- If asked to take an action (send SMS, update schedule, etc.), confirm the action and show what will be sent before executing.
- Flag anomalies proactively (e.g. if asked about revenue and you notice a dip, mention it).
- For multi-location queries, break results down by location.`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, location } = await req.json();

  const systemPrompt = buildSystemPrompt(location || "All Locations");

  // Run the agentic loop: send to Claude, handle tool calls, repeat until we get a text response
  let currentMessages = [...messages];
  const allEvents: Array<{ type: string; [key: string]: unknown }> = [];

  // We'll collect events and handle tool use in a loop
  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: currentMessages,
    tools: TOOL_DEFINITIONS,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const processStream = async (
        messageStream: ReturnType<typeof client.messages.stream>
      ) => {
        const toolUseBlocks: Array<{
          id: string;
          name: string;
          input: Record<string, unknown>;
        }> = [];
        let currentToolBlock: {
          id: string;
          name: string;
          inputJson: string;
        } | null = null;

        for await (const event of messageStream) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // Track tool use blocks
          if (
            event.type === "content_block_start" &&
            event.content_block?.type === "tool_use"
          ) {
            currentToolBlock = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: "",
            };
          }

          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "input_json_delta" &&
            currentToolBlock
          ) {
            currentToolBlock.inputJson += event.delta.partial_json;
          }

          if (event.type === "content_block_stop" && currentToolBlock) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = JSON.parse(currentToolBlock.inputJson || "{}");
            } catch {
              // empty input
            }
            toolUseBlocks.push({
              id: currentToolBlock.id,
              name: currentToolBlock.name,
              input: parsedInput,
            });
            currentToolBlock = null;
          }
        }

        // If there were tool calls, execute them and continue the conversation
        if (toolUseBlocks.length > 0) {
          // Build the assistant message with tool use content blocks
          const assistantContent = toolUseBlocks.map(
            (block) => ({
              type: "tool_use" as const,
              id: block.id,
              name: block.name,
              input: block.input,
            })
          );

          // Build tool results
          const toolResults: Anthropic.ToolResultBlockParam[] =
            toolUseBlocks.map((block) => ({
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: getMockToolResult(block.name, block.input),
            }));

          // Add to conversation
          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: assistantContent },
            { role: "user" as const, content: toolResults },
          ];

          // Continue the conversation
          const nextStream = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOL_DEFINITIONS,
          });

          await processStream(nextStream);
        }
      };

      try {
        await processStream(stream);
      } catch (error) {
        const errorData = JSON.stringify({
          type: "error",
          error: { message: "Stream error" },
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
