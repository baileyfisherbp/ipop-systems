import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General Reference",
  brand: "Brand Guidelines",
  case_study: "Case Study",
  pricing: "Pricing / Rate Card",
  process: "Process / Methodology",
  competitor: "Competitor Intel",
  template: "Template / Example",
};

export async function loadAIContext() {
  const [settings, files] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.contextFile.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  // Build company context
  const companyParts: string[] = [];
  if (settings?.companyName)
    companyParts.push(`**Company:** ${settings.companyName}`);
  if (settings?.companyDescription)
    companyParts.push(`**Description:** ${settings.companyDescription}`);
  if (settings?.services)
    companyParts.push(`**Services:** ${settings.services}`);
  if (settings?.targetMarket)
    companyParts.push(`**Target Market:** ${settings.targetMarket}`);
  if (settings?.uniqueSellingPoints)
    companyParts.push(`**USPs:** ${settings.uniqueSellingPoints}`);
  if (settings?.caseStudies)
    companyParts.push(`**Case Studies:** ${settings.caseStudies}`);
  if (settings?.pricingInfo)
    companyParts.push(`**Pricing:** ${settings.pricingInfo}`);
  if (settings?.skills)
    companyParts.push(`**Skills & Expertise:** ${settings.skills}`);
  if (settings?.additionalContext)
    companyParts.push(`**Additional Context:** ${settings.additionalContext}`);

  const companyContext = companyParts.join("\n\n");

  // Build writing context
  const writingParts: string[] = [];
  if (settings?.writingTone)
    writingParts.push(`**Tone:** ${settings.writingTone}`);
  if (settings?.writingStyle)
    writingParts.push(`**Style Guidelines:** ${settings.writingStyle}`);
  if (settings?.writingExamples)
    writingParts.push(`**Writing Examples:**\n${settings.writingExamples}`);

  const writingContext = writingParts.join("\n\n");

  // Build files context
  const filesByCategory = new Map<string, typeof files>();
  for (const file of files) {
    const cat = file.category;
    if (!filesByCategory.has(cat)) filesByCategory.set(cat, []);
    filesByCategory.get(cat)!.push(file);
  }

  const fileParts: string[] = [];
  for (const [category, categoryFiles] of filesByCategory) {
    const label = CATEGORY_LABELS[category] ?? category;
    fileParts.push(`### ${label}`);
    for (const file of categoryFiles) {
      const text = file.summary || file.content?.slice(0, 2000) || "";
      fileParts.push(`**${file.name}:**\n${text}`);
    }
  }

  const filesContext = fileParts.join("\n\n");

  return { companyContext, writingContext, filesContext };
}

export function buildContextBlock(context: {
  companyContext: string;
  writingContext: string;
  filesContext: string;
}): string {
  const sections: string[] = [];

  if (context.companyContext) {
    sections.push(
      `## Company Context (from settings)\n\n${context.companyContext}`
    );
  }

  if (context.writingContext) {
    sections.push(
      `## Writing Style Guidelines\n\n${context.writingContext}`
    );
  }

  if (context.filesContext) {
    sections.push(`## Reference Documents\n\n${context.filesContext}`);
  }

  return sections.join("\n\n---\n\n");
}
