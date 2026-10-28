import {
  ClassificationSource,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/generated/prisma/enums";

export const categoryLabels: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata Issues",
  PRINTING_QUALITY: "Printing & Quality",
  DISTRIBUTION: "Distribution & Availability",
  PRODUCTION_STATUS: "Book Status & Production Updates",
  GENERAL_INQUIRY: "General Inquiry",
};

export const priorityLabels: Record<TicketPriority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const categories = Object.keys(categoryLabels) as TicketCategory[];
export const priorities = Object.keys(priorityLabels) as TicketPriority[];
export const statuses = Object.keys(statusLabels) as TicketStatus[];

export function parseCategory(value: unknown) {
  if (typeof value !== "string") return null;
  return (categories.find((category) => category === value || categoryLabels[category] === value) ?? null);
}

export function parsePriority(value: unknown) {
  if (typeof value !== "string") return null;
  return (priorities.find((priority) => priority === value || priorityLabels[priority] === value) ?? null);
}

export function parseStatus(value: unknown) {
  if (typeof value !== "string") return null;
  return (statuses.find((status) => status === value || statusLabels[status] === value) ?? null);
}

export function classifyAndPrioritize(text: string) {
  const value = text.toLowerCase();
  let category: TicketCategory = TicketCategory.GENERAL_INQUIRY;
  if (/isbn|metadata|wrong title|duplicate/.test(value)) category = TicketCategory.ISBN_METADATA;
  else if (/print|binding|blurry|misprint|quality|defect/.test(value)) category = TicketCategory.PRINTING_QUALITY;
  else if (/amazon|flipkart|unavailable|distribution|listing|stock/.test(value)) category = TicketCategory.DISTRIBUTION;
  else if (/production|typeset|cover|proof|status|timeline|stage/.test(value)) category = TicketCategory.PRODUCTION_STATUS;
  else if (/royalt|payment|payout|paid|bank|sales|earning/.test(value)) category = TicketCategory.ROYALTY_PAYMENTS;

  let priority: TicketPriority = TicketPriority.MEDIUM;
  if (/wrong isbn|duplicate isbn|misprint|defect|haven't received|six months|6 months|overdue|urgent|damaged/.test(value)) {
    priority = TicketPriority.CRITICAL;
  } else if (category === TicketCategory.ROYALTY_PAYMENTS || category === TicketCategory.ISBN_METADATA || /unavailable/.test(value)) {
    priority = TicketPriority.HIGH;
  } else if (/update|bio|description|question|can i/.test(value)) {
    priority = TicketPriority.LOW;
  }
  return { category, priority, source: ClassificationSource.RULES };
}

export function categoryDisplay(value: TicketCategory) {
  return categoryLabels[value];
}
