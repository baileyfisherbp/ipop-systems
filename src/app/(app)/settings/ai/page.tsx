"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

function TextArea({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium text-dm-text">{label}</label>
        {hint && <p className="text-xs text-dm-text-muted mt-0.5">{hint}</p>}
      </div>
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saved" | "error"
  >("idle");
  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) setSettings(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async (data?: Settings) => {
    const toSave = data ?? settings;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileExtract = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setExtracting(true);
    setExtractStatus("Uploading...");

    try {
      // 1. Upload all files
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "general");
        await fetch("/api/settings/files", { method: "POST", body: formData });
      }

      // 2. Extract knowledge from all uploaded files
      setExtractStatus("Reading and extracting knowledge...");
      const res = await fetch("/api/settings/auto-populate", {
        method: "POST",
      });

      if (res.ok) {
        const extracted = await res.json();
        const updated = { ...settings };
        for (const [key, value] of Object.entries(extracted)) {
          if (value !== null && value !== undefined) {
            (updated as Record<string, unknown>)[key] = value;
          }
        }
        setSettings(updated);

        // 3. Auto-save
        setExtractStatus("Saving...");
        await save(updated);
        setExtractStatus("Done — fields updated from your file");
        setTimeout(() => setExtractStatus(null), 3000);
      } else {
        setExtractStatus("Failed to extract — try again");
        setTimeout(() => setExtractStatus(null), 3000);
      }
    } catch {
      setExtractStatus("Something went wrong");
      setTimeout(() => setExtractStatus(null), 3000);
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileExtract(e.dataTransfer.files);
  };

  const update = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dm-bg">
        <div className="mx-auto max-w-2xl space-y-6 p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-dm-border/60" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 w-full animate-pulse rounded-lg bg-dm-border/60"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dm-bg">
      <div className="mx-auto max-w-2xl p-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dm-text">Settings</h1>
            <p className="mt-1 text-sm text-dm-text-muted">
              This context is used across the platform to personalize responses.
            </p>
          </div>
          <button
            onClick={() => save()}
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

        {/* File Upload — Extract & Fill */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-8 rounded-2xl border-2 border-dashed p-6 text-center transition-colors duration-150 ${
            dragOver
              ? "border-brand-lime bg-brand-lime/5"
              : "border-dm-border"
          } ${extracting ? "pointer-events-none opacity-70" : ""}`}
        >
          {extracting ? (
            <div className="flex items-center justify-center gap-3">
              <svg
                className="h-5 w-5 animate-spin text-brand-lime"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm text-dm-text">{extractStatus}</span>
            </div>
          ) : extractStatus ? (
            <p className="text-sm text-green-400">{extractStatus}</p>
          ) : (
            <>
              <p className="text-sm text-dm-text-muted">
                Drop a file to auto-fill — company docs, pitch decks, brand
                guides, etc.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 rounded-lg border border-dm-border px-4 py-2 text-sm font-medium text-dm-text transition-colors hover:bg-dm-surface-raised"
              >
                Browse files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileExtract(e.target.files)}
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dm-text">
              Company Name
            </label>
            <input
              type="text"
              value={settings.companyName ?? ""}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Your company name"
              className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-4 py-3 text-sm text-dm-text placeholder:text-dm-text-muted focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-brand-lime transition-colors"
            />
          </div>

          <TextArea
            label="About"
            hint="What the company does, services, target market, and differentiators."
            value={
              [
                settings.companyDescription,
                settings.services && `Services: ${settings.services}`,
                settings.targetMarket &&
                  `Target market: ${settings.targetMarket}`,
                settings.uniqueSellingPoints &&
                  `Differentiators: ${settings.uniqueSellingPoints}`,
              ]
                .filter(Boolean)
                .join("\n\n") || ""
            }
            onChange={(v) => {
              // Store the full text in companyDescription, clear the split fields
              setSettings((prev) => ({
                ...prev,
                companyDescription: v,
                services: undefined,
                targetMarket: undefined,
                uniqueSellingPoints: undefined,
              }));
            }}
            placeholder="What does your company do? Include services, target customers, and what makes you different."
            rows={5}
          />

          {/* Tone */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dm-text">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONE_PRESETS.map((tone) => (
                <button
                  key={tone}
                  onClick={() => update("writingTone", tone)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
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
            label="Writing Style"
            hint="Guidelines, examples, and any rules for how responses should be written."
            value={
              [settings.writingStyle, settings.writingExamples]
                .filter(Boolean)
                .join("\n\n") || ""
            }
            onChange={(v) => {
              setSettings((prev) => ({
                ...prev,
                writingStyle: v,
                writingExamples: undefined,
              }));
            }}
            placeholder="E.g., 'Keep emails under 3 paragraphs. Use bullet points. Never use exclamation marks. Always end with a clear next step.'"
            rows={4}
          />

          <TextArea
            label="Additional Knowledge"
            hint="Anything else — expertise, case studies, pricing, compliance notes, etc."
            value={
              [
                settings.skills,
                settings.caseStudies &&
                  `Case studies: ${settings.caseStudies}`,
                settings.pricingInfo && `Pricing: ${settings.pricingInfo}`,
                settings.additionalContext,
              ]
                .filter(Boolean)
                .join("\n\n") || ""
            }
            onChange={(v) => {
              setSettings((prev) => ({
                ...prev,
                additionalContext: v,
                skills: undefined,
                caseStudies: undefined,
                pricingInfo: undefined,
              }));
            }}
            placeholder="Certifications, pricing details, case studies, industry terms, compliance requirements..."
            rows={4}
          />

          <TextArea
            label="Rules"
            hint="Hard rules the AI must always follow."
            value={settings.feedbackRules ?? ""}
            onChange={(v) => update("feedbackRules", v)}
            placeholder={`- Never use "Best regards"\n- Always mention 30-day money-back guarantee with pricing\n- Suggest a call instead of giving timeline estimates over email`}
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
