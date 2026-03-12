"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type TabId = "company" | "writing" | "skills" | "files" | "feedback" | "tools";

interface Settings {
  companyName?: string;
  companyDescription?: string;
  services?: string;
  targetMarket?: string;
  uniqueSellingPoints?: string;
  caseStudies?: string;
  pricingInfo?: string;
  writingStyle?: string;
  writingTone?: string;
  writingExamples?: string;
  skills?: string;
  additionalContext?: string;
  feedbackRules?: string;
  enabledTools?: Record<string, boolean>;
}

interface ContextFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  summary?: string;
  category: string;
  createdAt: string;
  uploadedBy?: { name?: string; email: string };
}

const TONE_PRESETS = [
  "Professional",
  "Conversational",
  "Authoritative",
  "Friendly",
  "Formal",
  "Direct",
  "Empathetic",
  "Persuasive",
];

const FILE_CATEGORIES = [
  { value: "general", label: "General Reference" },
  { value: "brand", label: "Brand Guidelines" },
  { value: "case_study", label: "Case Study" },
  { value: "pricing", label: "Pricing / Rate Card" },
  { value: "process", label: "Process / Methodology" },
  { value: "competitor", label: "Competitor Intel" },
  { value: "template", label: "Template / Example" },
];

const AVAILABLE_TOOLS = [
  {
    id: "gmail_read",
    label: "Gmail - Read Emails",
    description: "Read recent emails and threads for context when drafting replies",
    category: "Google",
  },
  {
    id: "google_drive",
    label: "Google Drive",
    description: "Search and read documents from Google Drive for reference material",
    category: "Google",
  },
  {
    id: "google_calendar",
    label: "Google Calendar",
    description: "Check your calendar for availability when scheduling meetings via email",
    category: "Google",
  },
  {
    id: "knowledge_base",
    label: "Uploaded Knowledge Base",
    description: "Use your uploaded reference files (brand guides, case studies, pricing, etc.)",
    category: "Internal",
  },
  {
    id: "company_profile",
    label: "Company Profile",
    description: "Use company name, description, services, and other profile information",
    category: "Internal",
  },
  {
    id: "contact_history",
    label: "Contact History",
    description: "Review past email exchanges with the same contact for continuity",
    category: "Context",
  },
  {
    id: "web_search",
    label: "Web Search",
    description: "Search the web for recent information about contacts or their companies",
    category: "External",
  },
  {
    id: "crm_lookup",
    label: "CRM Lookup",
    description: "Look up contact details, deal status, and notes from your CRM",
    category: "Integrations",
    comingSoon: true,
  },
  {
    id: "invoice_lookup",
    label: "Invoice / Billing Lookup",
    description: "Check invoice status and billing history when responding to payment inquiries",
    category: "Integrations",
    comingSoon: true,
  },
] as const;

const DEFAULT_TOOLS: Record<string, boolean> = {
  gmail_read: true,
  google_drive: false,
  google_calendar: false,
  knowledge_base: true,
  company_profile: true,
  contact_history: true,
  web_search: false,
  crm_lookup: false,
  invoice_lookup: false,
};

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-dm-text">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-4 py-3 text-sm text-dm-text placeholder:text-dm-text-muted focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-brand-lime transition-colors"
      />
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-dm-text">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-4 py-3 text-sm text-dm-text placeholder:text-dm-text-muted focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-brand-lime transition-colors"
      />
    </div>
  );
}

function ToolToggle({
  tool,
  enabled,
  onToggle,
}: {
  tool: (typeof AVAILABLE_TOOLS)[number];
  enabled: boolean;
  onToggle: () => void;
}) {
  const comingSoon = "comingSoon" in tool && tool.comingSoon;
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-dm-border p-4 transition-colors ${
        comingSoon ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0 flex-1 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-dm-text">{tool.label}</span>
          {comingSoon && (
            <span className="rounded-full bg-dm-surface-raised px-2 py-0.5 text-[10px] font-medium text-dm-text-muted">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-dm-text-muted">{tool.description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={!!comingSoon}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-lime disabled:cursor-not-allowed ${
          enabled ? "bg-brand-lime" : "bg-dm-border"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function EmailDraftingSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [settings, setSettings] = useState<Settings>({});
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle"
  );
  const [uploading, setUploading] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, filesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/settings/files"),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({
          ...data,
          enabledTools: data.enabledTools ?? DEFAULT_TOOLS,
        });
      }
      if (filesRes.ok) setFiles(await filesRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", uploadCategory);
        const res = await fetch("/api/settings/files", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const newFile = await res.json();
          setFiles((prev) => [newFile, ...prev]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (id: string) => {
    const res = await fetch(`/api/settings/files/${id}`, { method: "DELETE" });
    if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAutoPopulate = async () => {
    setAutoPopulating(true);
    try {
      const res = await fetch("/api/settings/auto-populate", {
        method: "POST",
      });
      if (res.ok) {
        const extracted = await res.json();
        setSettings((prev) => {
          const updated = { ...prev };
          for (const [key, value] of Object.entries(extracted)) {
            if (value !== null && value !== undefined) {
              (updated as any)[key] = value;
            }
          }
          return updated;
        });
      }
    } finally {
      setAutoPopulating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const update = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTool = (toolId: string) => {
    setSettings((prev) => ({
      ...prev,
      enabledTools: {
        ...(prev.enabledTools ?? DEFAULT_TOOLS),
        [toolId]: !(prev.enabledTools ?? DEFAULT_TOOLS)[toolId],
      },
    }));
  };

  const toggleFileExpanded = (id: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "company", label: "Company" },
    { id: "writing", label: "Writing Style" },
    { id: "skills", label: "Knowledge" },
    { id: "files", label: "Files" },
    { id: "feedback", label: "Feedback Rules" },
    { id: "tools", label: "Tools" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-dm-bg">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-dm-border/60" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-dm-border/60" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-lg bg-dm-border/60"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const enabledTools = settings.enabledTools ?? DEFAULT_TOOLS;
  const toolsByCategory = AVAILABLE_TOOLS.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, (typeof AVAILABLE_TOOLS)[number][]>
  );

  return (
    <div className="min-h-screen bg-dm-bg">
      <div className="mx-auto max-w-3xl p-6">
        {/* Page title + actions */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dm-text">
              Email Drafting Settings
            </h1>
            <p className="mt-1 text-sm text-dm-text-muted">
              Configure how your email drafts are generated
            </p>
          </div>
          <div className="flex items-center gap-3">
            {files.length > 0 && activeTab !== "tools" && (
              <button
                onClick={handleAutoPopulate}
                disabled={autoPopulating}
                className="rounded-lg border border-dm-border bg-dm-surface-raised px-4 py-2 text-sm font-medium text-dm-text transition-colors duration-150 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {autoPopulating ? "Extracting..." : "Auto-populate from files"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved"
                  : saveStatus === "error"
                    ? "Error"
                    : "Save"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-dm-surface-raised p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                activeTab === tab.id
                  ? "bg-dm-surface text-dm-text shadow-sm"
                  : "text-dm-text-muted hover:text-dm-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-5">
          {activeTab === "company" && (
            <>
              <Input
                label="Company Name"
                value={settings.companyName ?? ""}
                onChange={(v) => update("companyName", v)}
                placeholder="Your company name"
              />
              <TextArea
                label="Company Description"
                value={settings.companyDescription ?? ""}
                onChange={(v) => update("companyDescription", v)}
                placeholder="What does your company do? Mission, core focus..."
                rows={4}
              />
              <TextArea
                label="Unique Selling Points"
                value={settings.uniqueSellingPoints ?? ""}
                onChange={(v) => update("uniqueSellingPoints", v)}
                placeholder="What makes you different from competitors?"
              />
              <TextArea
                label="Services"
                value={settings.services ?? ""}
                onChange={(v) => update("services", v)}
                placeholder="List your key services or products"
              />
              <TextArea
                label="Pricing Info"
                value={settings.pricingInfo ?? ""}
                onChange={(v) => update("pricingInfo", v)}
                placeholder="Pricing structure, packages, rate cards..."
              />
              <TextArea
                label="Target Market"
                value={settings.targetMarket ?? ""}
                onChange={(v) => update("targetMarket", v)}
                placeholder="Who are your ideal customers?"
              />
              <TextArea
                label="Case Studies"
                value={settings.caseStudies ?? ""}
                onChange={(v) => update("caseStudies", v)}
                placeholder="Notable wins, results, and client success stories"
                rows={4}
              />
            </>
          )}

          {activeTab === "writing" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-dm-text">
                  Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {TONE_PRESETS.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => update("writingTone", tone)}
                      className={`rounded-[100px] px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                        settings.writingTone === tone
                          ? "bg-success text-white"
                          : "border border-dm-border text-dm-text-muted hover:text-dm-text hover:border-dm-text-muted"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={
                    TONE_PRESETS.includes(settings.writingTone ?? "")
                      ? ""
                      : settings.writingTone ?? ""
                  }
                  onChange={(e) => update("writingTone", e.target.value)}
                  placeholder="Or type a custom tone..."
                  className="mt-2 w-full rounded-lg border border-dm-border bg-dm-surface-raised px-4 py-3 text-sm text-dm-text placeholder:text-dm-text-muted focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-brand-lime transition-colors"
                />
              </div>
              <TextArea
                label="Style Guidelines"
                value={settings.writingStyle ?? ""}
                onChange={(v) => update("writingStyle", v)}
                placeholder="How should emails be written? E.g., 'Always lead with a question. Keep paragraphs to 2-3 sentences max. Use bullet points for lists.'"
                rows={4}
              />
              <TextArea
                label="Writing Examples"
                value={settings.writingExamples ?? ""}
                onChange={(v) => update("writingExamples", v)}
                placeholder="Paste examples of emails or copy that represent your ideal writing style"
                rows={6}
              />
            </>
          )}

          {activeTab === "skills" && (
            <>
              <TextArea
                label="Skills & Expertise"
                value={settings.skills ?? ""}
                onChange={(v) => update("skills", v)}
                placeholder="Certifications, tools, platforms, expertise areas..."
                rows={4}
              />
              <TextArea
                label="Additional Context"
                value={settings.additionalContext ?? ""}
                onChange={(v) => update("additionalContext", v)}
                placeholder="Any other context that should be considered when drafting emails (industry terminology, compliance notes, etc.)"
                rows={4}
              />
            </>
          )}

          {activeTab === "files" && (
            <>
              {/* Upload area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-150 ${
                  dragOver
                    ? "border-brand-lime bg-brand-lime/5"
                    : "border-dm-border"
                }`}
              >
                <p className="text-sm text-dm-text-muted">
                  {uploading
                    ? "Uploading & processing..."
                    : "Drag & drop files here, or click browse"}
                </p>
                <p className="mt-1 text-xs text-dm-text-muted">
                  Upload reference documents to improve draft accuracy
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-2 text-sm text-dm-text focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-brand-lime"
                  >
                    {FILE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Browse
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-2xl border border-dm-border bg-dm-surface p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => toggleFileExpanded(file.id)}
                            className="text-left"
                          >
                            <p className="text-sm font-medium text-dm-text">
                              {file.name}
                            </p>
                          </button>
                          <p className="mt-0.5 text-xs text-dm-text-muted">
                            {(file.size / 1024).toFixed(1)} KB
                            {" · "}
                            {FILE_CATEGORIES.find(
                              (c) => c.value === file.category
                            )?.label ?? file.category}
                            {" · "}
                            {new Date(file.createdAt).toLocaleDateString()}
                            {file.uploadedBy &&
                              ` · ${file.uploadedBy.name ?? file.uploadedBy.email}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="ml-2 rounded p-1 text-dm-text-muted transition-colors duration-150 hover:text-red-400"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                      {expandedFiles.has(file.id) && file.summary && (
                        <p className="mt-3 rounded-lg bg-dm-surface-raised p-3 text-sm text-dm-text">
                          {file.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {files.length === 0 && (
                <p className="text-center text-sm text-dm-text-muted">
                  No files uploaded yet. Upload reference documents to improve
                  draft accuracy and relevance.
                </p>
              )}
            </>
          )}

          {activeTab === "feedback" && (
            <>
              <div className="rounded-2xl border border-dm-border bg-dm-surface p-5">
                <h3 className="text-sm font-medium text-dm-text mb-1">
                  Overall Drafting Rules
                </h3>
                <p className="text-xs text-dm-text-muted mb-4">
                  Set rules and corrections that apply to every draft. These are
                  persistent guidelines the drafter will always follow. Per-draft
                  feedback can be left on individual drafts from the Email Drafter
                  page.
                </p>
                <TextArea
                  label=""
                  value={settings.feedbackRules ?? ""}
                  onChange={(v) => update("feedbackRules", v)}
                  placeholder={`Examples:\n- Never use "Best regards" — always sign off with "Thanks,"\n- Always mention our 30-day money-back guarantee when discussing pricing\n- Keep emails under 150 words\n- Don't use exclamation marks\n- When someone asks about timeline, always suggest a call instead of giving estimates over email`}
                  rows={10}
                />
              </div>

              <div className="rounded-2xl border border-dm-border bg-dm-surface p-5">
                <h3 className="text-sm font-medium text-dm-text mb-1">
                  How feedback improves drafts
                </h3>
                <div className="space-y-3 text-xs text-dm-text-muted">
                  <div className="flex gap-3">
                    <span className="shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                      </svg>
                    </span>
                    <p>
                      <strong className="text-dm-text">Thumbs up</strong> on a
                      draft tells the system the tone, structure, and content
                      were on target.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                      </svg>
                    </span>
                    <p>
                      <strong className="text-dm-text">Thumbs down</strong>{" "}
                      with a note (e.g. &ldquo;too formal&rdquo; or &ldquo;wrong
                      product&rdquo;) helps identify specific issues.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-brand-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </span>
                    <p>
                      <strong className="text-dm-text">Rules above</strong> are
                      injected into every draft request as hard constraints the
                      drafter must follow.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "tools" && (
            <>
              <div className="rounded-2xl border border-dm-border bg-dm-surface p-5 mb-5">
                <h3 className="text-sm font-medium text-dm-text mb-1">
                  Drafter Tools
                </h3>
                <p className="text-xs text-dm-text-muted">
                  Control which tools the email drafter can use to gather
                  information and take actions. Enabling more tools gives the
                  drafter richer context for more accurate drafts.
                </p>
              </div>

              {Object.entries(toolsByCategory).map(([category, tools]) => (
                <div key={category}>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-dm-text-muted">
                    {category}
                  </h4>
                  <div className="space-y-2 mb-6">
                    {tools.map((tool) => (
                      <ToolToggle
                        key={tool.id}
                        tool={tool}
                        enabled={!!enabledTools[tool.id]}
                        onToggle={() => toggleTool(tool.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
