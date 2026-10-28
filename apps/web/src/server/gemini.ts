import "server-only";

import {
  TicketCategory,
  TicketPriority,
} from "@/generated/prisma/enums";
import { categoryLabels, priorityLabels } from "@/server/tickets";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const KNOWLEDGE = `BookLeaf Publishing operates in India and the US. It handles cover design, typesetting, ISBN, printing, distribution and royalties. Royalties are calculated quarterly and paid within 45 days after quarter end. Amounts below ₹1,000 roll over. ISBN errors are escalated to production within 48 hours. For a verified print quality defect, request photos and arrange a free reprint; print turnaround is usually 5–7 business days. New listings usually take 7–10 business days; unavailable listings often need a stock sync in 24–48 hours. Metadata changes typically take 3–5 business days. Be empathetic, give a concrete next step and timeline, and never invent account facts.`;
const classificationSchema = {
  type: "OBJECT",
  properties: {
    category: { type: "STRING", enum: Object.values(TicketCategory) },
    priority: { type: "STRING", enum: Object.values(TicketPriority) },
    reason: { type: "STRING" },
  },
  required: ["category", "priority", "reason"],
};

async function generate(prompt: string, systemInstruction: string, json = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: json ? 180 : 420,
          ...(json ? { responseMimeType: "application/json", responseSchema: classificationSchema } : {}),
        },
      }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || null;
}

export async function classifyWithGemini(subject: string, description: string) {
  const fallback = classifyFallback(`${subject}\n${description}`);
  if (!process.env.GEMINI_API_KEY) return { ...fallback, reason: "Rules-based fallback; GEMINI_API_KEY is not configured." };
  try {
    const result = await generate(
      `Classify this author support request.\nSubject: ${subject}\nDescription: ${description}\nCategories: ${Object.entries(categoryLabels).map(([key, label]) => `${key} = ${label}`).join("; ")}\nPriorities: ${Object.entries(priorityLabels).map(([key, label]) => `${key} = ${label}`).join("; ")}`,
      "You triage BookLeaf Publishing author support requests. Use the most relevant category. Set CRITICAL only for urgent damage, severe defects, duplicate/wrong ISBN, or significantly overdue payments. Never infer facts absent from the request.",
      true,
    );
    if (!result) return fallback;
    const jsonText = result.match(/\{[\s\S]*\}/)?.[0] ?? result;
    const parsed = JSON.parse(jsonText) as { category?: string; priority?: string; reason?: string };
    const category = Object.values(TicketCategory).find((value) => value === parsed.category);
    const priority = Object.values(TicketPriority).find((value) => value === parsed.priority);
    if (!category || !priority) return fallback;
    return { category, priority, reason: String(parsed.reason ?? "Gemini classification").slice(0, 1000), source: "GEMINI" as const };
  } catch (error) {
    console.error("Gemini ticket classification failed:", error instanceof Error ? error.message : "unknown error");
    return { ...fallback, reason: "Rules-based fallback; Gemini was unavailable." };
  }
}

function classifyFallback(text: string) {
  const value = text.toLowerCase();
  let category: TicketCategory = TicketCategory.GENERAL_INQUIRY;
  if (/isbn|metadata|wrong title|duplicate/.test(value)) category = TicketCategory.ISBN_METADATA;
  else if (/print|binding|blurry|misprint|quality|defect/.test(value)) category = TicketCategory.PRINTING_QUALITY;
  else if (/amazon|flipkart|unavailable|distribution|listing|stock/.test(value)) category = TicketCategory.DISTRIBUTION;
  else if (/production|typeset|cover|proof|status|timeline|stage/.test(value)) category = TicketCategory.PRODUCTION_STATUS;
  else if (/royalt|payment|payout|paid|bank|sales|earning/.test(value)) category = TicketCategory.ROYALTY_PAYMENTS;
  let priority: TicketPriority = TicketPriority.MEDIUM;
  if (/wrong isbn|duplicate isbn|misprint|defect|haven't received|six months|6 months|overdue|urgent|damaged/.test(value)) priority = TicketPriority.CRITICAL;
  else if (category === TicketCategory.ROYALTY_PAYMENTS || category === TicketCategory.ISBN_METADATA || /unavailable/.test(value)) priority = TicketPriority.HIGH;
  else if (/update|bio|description|question|can i/.test(value)) priority = TicketPriority.LOW;
  return { category, priority, reason: "Rules-based classification", source: "RULES" as const };
}

export async function draftWithGemini(input: {
  authorName: string;
  bookTitle: string | null;
  category: TicketCategory;
  description: string;
  subject: string;
  bookStatus?: string | null;
  pendingRoyalty?: number | null;
}) {
  const prompt = [
    `Author: ${input.authorName}`,
    `Book: ${input.bookTitle ?? "General or account question"}`,
    input.bookStatus ? `Book status: ${input.bookStatus}` : "",
    input.pendingRoyalty != null ? `Recorded pending royalty: ₹${input.pendingRoyalty}` : "",
    `Category: ${categoryLabels[input.category]}`,
    `Subject: ${input.subject}`,
    `Request: ${input.description}`,
  ].filter(Boolean).join("\n");
  const text = await generate(prompt, `You are a thoughtful BookLeaf Publishing support representative. Draft a concise, empathetic reply using only the policy and account context. Own BookLeaf errors when known, give a next step and a realistic timeline. If a fact is unknown, ask for it instead of inventing it.\nPolicy: ${KNOWLEDGE}`);
  if (text) return { draft: text, source: "GEMINI" as const, model: MODEL };
  return { draft: fallbackDraft(input.authorName, input.category, input.bookTitle, input.bookStatus), source: "RULES" as const, model: null };
}

function fallbackDraft(name: string, category: TicketCategory, bookTitle: string | null, status?: string | null) {
  const firstName = name.split(" ")[0];
  const drafts: Record<TicketCategory, string> = {
    ROYALTY_PAYMENTS: `Hi ${firstName},\n\nI understand it can be frustrating to wait for royalty information. BookLeaf calculates royalties quarterly and issues payments within 45 days after quarter end. Balances below ₹1,000 roll over to the next quarter.\n\nOur team will review the recorded sales and payout details for ${bookTitle ?? "your title"}. Please check that your bank details are current in your dashboard.`,
    ISBN_METADATA: `Hi ${firstName},\n\nThanks for flagging this. We’ll ask our production team to review the ISBN or metadata record and share an update within 48 hours. If possible, please reply with a photo or link showing the information you’re seeing.`,
    PRINTING_QUALITY: `Hi ${firstName},\n\nI’m sorry the copy didn’t meet your expectations. Please reply with clear photos of the affected pages and the book’s order details. Once verified, we can arrange a free reprint, which usually takes 5–7 business days.`,
    DISTRIBUTION: `Hi ${firstName},\n\nI understand the concern about your listing. An unavailable listing can be caused by a stock sync issue; a re-sync usually takes 24–48 hours. We’ll check the listing and update you here.`,
    PRODUCTION_STATUS: `Hi ${firstName},\n\nThanks for checking in. ${bookTitle ?? "Your title"} is currently listed as “${status ?? "in progress"}”. Our team will verify the latest production step and share a specific timeline within 48 hours.`,
    GENERAL_INQUIRY: `Hi ${firstName},\n\nThanks for getting in touch. We’re reviewing your request and will follow up with the right next steps within 2 business days. If there are details or files that would help, please reply here and we’ll include them in the review.`,
  };
  return drafts[category];
}
