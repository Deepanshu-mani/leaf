import "server-only";

import {
  TicketCategory,
  TicketPriority,
} from "@/generated/prisma/enums";
import { categoryLabels, priorityLabels } from "@/server/tickets";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const KNOWLEDGE = `COMPANY: BookLeaf Publishing is a self-publishing company operating in India and the US. It offers Standard Free and Bestseller Breakthrough (premium, with marketing and distribution add-ons). BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution, and royalties. Its in-house facility and warehouse are in Delhi; print partners include Repro India and Epitome Books.

ROYALTIES: The author share is 80% of net profit and BookLeaf's share is 20%. Net profit means MRP minus printing cost, platform commission (such as Amazon or Flipkart), and shipping. Royalties are calculated quarterly and paid within 45 days after quarter-end. The minimum payout is ₹1,000; smaller balances roll over. Payment is by bank transfer to the account linked in the author's dashboard. Authors can view platform sales and royalty breakdowns in their dashboard.

ISBN AND METADATA: Every BookLeaf-published book receives a unique ISBN registered under BookLeaf's imprint. Authors wanting their own imprint must obtain their own ISBN. A duplicate/wrong ISBN or wrong-book link is high priority and should be escalated to production; give a 48-hour resolution/update expectation when the issue requires investigation. Metadata updates can be submitted through the dashboard or by emailing BookLeaf and typically take 3–5 business days to appear on platforms.

PRINTING: In-house printing handles most orders; overflow or special formats go to Repro India or Epitome Books. Standard print turnaround is 5–7 business days from order confirmation. For a reported misprint, binding defect, or color issue, apologise, ask for photos of the defective copy if needed, and arrange a free reprint after verification. The 5–7 business-day estimate applies to the reprint after verification.

DISTRIBUTION: Listings include Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store. New listings typically go live within 7–10 business days after publication is complete. An unavailable listing usually indicates a stock sync issue; the distribution team can trigger a re-sync, which typically takes 24–48 hours.

PRODUCTION: Stages are Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live. Authors are updated at each stage by email. Delays commonly occur while awaiting author cover approval or during proofreading revision rounds; confirm actual status and do not guess a completion date.

TONE: Authors are partners. Be empathetic and professional, acknowledge the issue before solutions, use actual facts supplied for the case, own BookLeaf errors, give a clear next action and an appropriate timeline for escalations, and avoid blaming the author. Never invent account-specific facts.`;
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
  const text = await generate(prompt, `You write customer support replies for BookLeaf Publishing. Return only the ready-to-review reply, with no subject line, analysis, classification, or markdown heading.

Writing rules:
- Greet the author by first name and acknowledge the specific issue they raised in one natural sentence.
- Be warm, calm, direct, and concise (about 70–120 words). Avoid canned apologies, repetition, corporate jargon, and promises you cannot verify.
- Give one useful next step and a timeline only when the policy below supports it. If the supplied context does not say what has happened to this author's account or book, say that the team needs to check it; never imply that a check is already underway or completed.
- Use the book title only when relevant. Do not expose internal category, priority, notes, model details, or staff-only information.
- Never invent sales, payment dates, order numbers, listing state, production progress, or completed actions. Ask one concise question only if a missing detail is needed to move the case forward.
- Sign off simply as “BookLeaf Support”.

Approved policy and general guidance (use only what applies; do not turn typical ranges into a guaranteed completion date):\n${KNOWLEDGE}`);
  if (text) return { draft: text, source: "GEMINI" as const, model: MODEL };
  return { draft: fallbackDraft(input.authorName, input.category, input.bookTitle, input.bookStatus), source: "RULES" as const, model: null };
}

function fallbackDraft(name: string, category: TicketCategory, bookTitle: string | null, status?: string | null) {
  const firstName = name.split(" ")[0];
  const drafts: Record<TicketCategory, string> = {
    ROYALTY_PAYMENTS: `Hi ${firstName},\n\nThanks for reaching out about your royalties. BookLeaf calculates royalties quarterly and pays within 45 days after quarter-end. The author share is 80% of net profit after printing costs, platform commission, and shipping; balances below ₹1,000 roll over.\n\nPlease check that your bank details are current in your dashboard. If you share the quarter or payout you mean, our team can review the breakdown with you.\n\nBookLeaf Support`,
    ISBN_METADATA: `Hi ${firstName},\n\nThanks for flagging this. Please reply with a link or photo showing the information you’re seeing so the team can review the record. ISBN errors are escalated to production, with an update within 48 hours; metadata changes typically take 3–5 business days to appear on platforms.\n\nBookLeaf Support`,
    PRINTING_QUALITY: `Hi ${firstName},\n\nI’m sorry the printed copy may have a quality issue. Please send clear photos of the affected pages and the book’s order details so the team can verify it. For a confirmed print defect, BookLeaf can arrange a free reprint; printing typically takes 5–7 business days.\n\nBookLeaf Support`,
    DISTRIBUTION: `Hi ${firstName},\n\nI understand why an unavailable listing is concerning. A stock sync issue can sometimes cause this, and a re-sync typically takes 24–48 hours. Please share the store link if you have it so the team can check the listing.\n\nBookLeaf Support`,
    PRODUCTION_STATUS: `Hi ${firstName},\n\nThanks for checking in about ${bookTitle ?? "your book"}. The information currently available lists its status as “${status ?? "in progress"}”, but the latest production step still needs to be confirmed. Our team can verify that and share a more specific update.\n\nBookLeaf Support`,
    GENERAL_INQUIRY: `Hi ${firstName},\n\nThanks for getting in touch. We’ll review your request and share the right next steps. If there’s a book title, order detail, or link that would help us understand the issue, please reply with it.\n\nBookLeaf Support`,
  };
  return drafts[category];
}
