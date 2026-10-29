"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, FileQuestion } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BookOption = { id: string; title: string };

export function NewTicketForm({ books }: { books: BookOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookId, setBookId] = useState("none");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: bookId === "none" ? null : bookId, subject: form.get("subject"), description: form.get("description") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send your message.");
      router.push("/tickets");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your message.");
      setBusy(false);
    }
  }

  return (
    <form id="new-ticket" className="card ticket-form" onSubmit={submit}>
      <div className="card-head"><div className="form-card-title"><span className="catalog-section-icon"><FileQuestion size={18} /></span><div><h3>Start a conversation</h3><p>Our team typically replies within 2 business days.</p></div></div></div>
      <div className="modal-body">
        <div className="field"><label htmlFor="bookId">What is this about?</label><Select name="bookId" value={bookId} onValueChange={(value: string) => setBookId(value)}><SelectTrigger id="bookId" aria-label="Choose a book"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">General / Account level</SelectItem>{books.map((book) => <SelectItem value={book.id} key={book.id}>{book.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="field"><label htmlFor="subject">Subject</label><input id="subject" name="subject" minLength={4} maxLength={120} placeholder="A short summary of your question" required /></div>
        <div className="field"><label htmlFor="description">Tell us a little more</label><textarea id="description" name="description" minLength={12} maxLength={4000} placeholder="Share any details that will help our team look into this…" required /></div>
        <div className="notice">Your message is securely associated with your account and will be visible to the BookLeaf support team.</div>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="modal-foot"><span className="muted">AI may suggest a category and priority for the team.</span><button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : <>Send to BookLeaf<ArrowRight size={15} /></>}</button></div>
      </div>
    </form>
  );
}
