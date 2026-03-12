"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineCheck,
} from "react-icons/hi2";

interface Integration {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  createdAt: string;
}

const AVAILABLE_INTEGRATIONS = [
  {
    type: "google_drive",
    name: "Google Drive",
    description:
      "Sync files from Google Drive to give the AI context from your documents.",
    icon: "📁",
  },
  {
    type: "hubspot",
    name: "HubSpot",
    description:
      "Pull CRM contact data and deal info to personalize email replies.",
    icon: "🔶",
  },
  {
    type: "quickbooks",
    name: "QuickBooks",
    description:
      "Access invoice and financial data to reference in email replies.",
    icon: "📊",
  },
  {
    type: "slack",
    name: "Slack",
    description:
      "Pull recent channel context for emails related to team discussions.",
    icon: "💬",
  },
  {
    type: "notion",
    name: "Notion",
    description:
      "Access company wiki and docs for richer email context.",
    icon: "📝",
  },
  {
    type: "salesforce",
    name: "Salesforce",
    description:
      "Pull CRM data, opportunities, and contact history for context.",
    icon: "☁️",
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  async function connect(type: string, name: string) {
    // For Google Drive, it's already connected via OAuth scopes
    // For others, this would kick off an OAuth flow specific to each service
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name }),
    });

    if (res.ok) {
      fetchIntegrations();
    }
  }

  async function disconnect(id: string) {
    const res = await fetch(`/api/integrations?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    }
  }

  function isConnected(type: string) {
    return integrations.some((i) => i.type === type);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
        Integrations
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Connect your business tools so the AI can pull relevant context when
        drafting email replies.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {AVAILABLE_INTEGRATIONS.map((avail) => {
          const connected = isConnected(avail.type);
          const integration = integrations.find(
            (i) => i.type === avail.type
          );

          return (
            <div
              key={avail.type}
              className={`rounded-xl border p-5 transition-colors ${
                connected
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{avail.icon}</span>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">
                      {avail.name}
                    </h3>
                    {connected && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <HiOutlineCheck className="h-3 w-3" />
                        Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{avail.description}</p>
              <div className="mt-4">
                {connected ? (
                  <button
                    onClick={() => disconnect(integration!.id)}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                  >
                    <HiOutlineTrash className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connect(avail.type, avail.name)}
                    className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    <HiOutlinePlusCircle className="h-3.5 w-3.5" />
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
