"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type TabId = "company" | "writing" | "skills" | "files";

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
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
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
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
      />
    </div>
  );
}

export default function AISettingsPage() {
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
      if (settingsRes.ok) setSettings(await settingsRes.json());
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

  const toggleFileExpanded = (id: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "company", label: "Company Profile" },
    { id: "writing", label: "Writing Style" },
    { id: "skills", label: "Skills & Knowledge" },
    { id: "files", label: "Uploaded Files" },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            AI Context & Knowledge
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Configure the context injected into every AI-drafted email
          </p>
        </div>
        <div className="flex items-center gap-3">
          {files.length > 0 && (
            <button
              onClick={handleAutoPopulate}
              disabled={autoPopulating}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {autoPopulating ? "Extracting..." : "Auto-populate from files"}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
      <div className="mb-6 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
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
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONE_PRESETS.map((tone) => (
                  <button
                    key={tone}
                    onClick={() => update("writingTone", tone)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      settings.writingTone === tone
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
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
              label="Skills & Knowledge Base"
              value={settings.skills ?? ""}
              onChange={(v) => update("skills", v)}
              placeholder="Certifications, tools, platforms, expertise areas..."
              rows={4}
            />
            <TextArea
              label="Additional Context"
              value={settings.additionalContext ?? ""}
              onChange={(v) => update("additionalContext", v)}
              placeholder="Any other context the AI should know when drafting emails (industry terminology, compliance notes, etc.)"
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
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? "border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800/50"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {uploading
                  ? "Uploading & processing..."
                  : "Drag & drop files here, or click browse"}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
                    className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => toggleFileExpanded(file.id)}
                          className="text-left"
                        >
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {file.name}
                          </p>
                        </button>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {(file.size / 1024).toFixed(1)} KB
                          {" · "}
                          {FILE_CATEGORIES.find((c) => c.value === file.category)?.label ?? file.category}
                          {" · "}
                          {new Date(file.createdAt).toLocaleDateString()}
                          {file.uploadedBy &&
                            ` · ${file.uploadedBy.name ?? file.uploadedBy.email}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="ml-2 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
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
                      <p className="mt-3 rounded bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {file.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {files.length === 0 && (
              <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
                No files uploaded yet. Upload reference documents to give the AI
                more context for drafting emails.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
