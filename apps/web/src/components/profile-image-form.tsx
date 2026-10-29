"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function ProfileImageForm({ userId, name, hasImage, imageVersion }: { userId: string; name: string; hasImage: boolean; imageVersion: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const endpoint = `/api/users/${encodeURIComponent(userId)}/avatar`;
  const imageUrl = `${endpoint}?v=${imageVersion}`;
  const initials = name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BL";

  async function upload(file?: File) {
    if (!file) return;
    if (!/image\/(jpeg|png|webp)/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP image under 2 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    const body = new FormData();
    body.set("image", file);
    try {
      const response = await fetch(endpoint, { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save your photo.");
      setPreview(URL.createObjectURL(file));
      setMessage("Profile photo updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your photo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not remove your photo.");
      setPreview(null);
      setMessage("Profile photo removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove your photo.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="profile-photo-panel">
    <div className="profile-photo-avatar">{preview ? <Image src={preview} alt="Profile photo preview" width={88} height={88} unoptimized /> : hasImage ? <Image src={imageUrl} alt={`${name} profile`} width={88} height={88} unoptimized /> : <span>{initials}</span>}</div>
    <div className="profile-photo-copy"><h2>Profile photo</h2><p>Use a clear JPG, PNG, or WebP image. Maximum size: 2 MB.</p><div className="profile-photo-actions"><input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile photo" onChange={(event) => void upload(event.currentTarget.files?.[0])} /><button className="btn small" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Saving…" : hasImage || preview ? "Change photo" : "Upload photo"}</button>{(hasImage || preview) && <button className="btn ghost small" type="button" onClick={() => void remove()} disabled={busy}>Remove</button>}</div>{message && <p className="profile-message" role="status">{message}</p>}</div>
  </div>;
}
