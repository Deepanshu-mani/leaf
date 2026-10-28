"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type PortalUser = { id: string; name: string; email: string; role: "AUTHOR" | "ADMIN" };

export function PortalShell({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const links = user.role === "ADMIN"
    ? [["/admin/queue", "◉", "Ticket queue"], ["/admin/books", "▤", "Book catalog"]]
    : [["/dashboard", "⌂", "Overview"], ["/books", "▤", "My books"], ["/tickets", "◷", "My tickets"]];

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><Link href={user.role === "ADMIN" ? "/admin/queue" : "/dashboard"} aria-label="BookLeaf home"><Image className="brand-image" src="/brand/bookleaf-logo.jpg" alt="BookLeaf Publishing" width={180} height={81} priority /></Link></div>
        <div className="workspace-label">{user.role === "ADMIN" ? "OPERATIONS" : "AUTHOR SPACE"}</div>
        <nav className="nav" aria-label="Main navigation">
          {links.map(([href, icon, label]) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="user-chip"><span className="avatar">{initials(user.name)}</span><div className="user-meta"><b>{user.name}</b><span>{user.role === "ADMIN" ? "Support team" : "BookLeaf author"}</span></div><button className="btn ghost" onClick={signOut} disabled={busy} title="Sign out" aria-label="Sign out">↗</button></div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="crumb">BookLeaf <span style={{ padding: "0 7px" }}>/</span> <strong>{links.find(([href]) => href === pathname)?.[2] ?? (pathname === "/dashboard" ? "Overview" : "Support")}</strong></div><div className="topright"><span><i className="online" />All systems operational</span><span className="avatar mobile-name">{initials(user.name)}</span></div></header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
