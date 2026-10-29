"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, BookOpen, ChevronRight, Inbox, LayoutDashboard, LogOut, MessageCircle, Users } from "lucide-react";

type PortalUser = { id: string; name: string; email: string; role: "AUTHOR" | "ADMIN"; updatedAt: Date; profileImageType: string | null };

export function PortalShell({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const links = user.role === "ADMIN"
    ? [
        { href: "/admin/queue", label: "Ticket queue", Icon: Inbox },
        { href: "/admin/books", label: "Book catalog", Icon: BookOpen },
        { href: "/admin/people", label: "People", Icon: Users },
      ]
    : [
        { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
        { href: "/books", label: "My books", Icon: BookOpen },
        { href: "/tickets", label: "My tickets", Icon: MessageCircle },
      ];

  async function signOut() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed. Please try again.");
      router.replace("/login");
      router.refresh();
    } catch {
      setBusy(false);
      window.alert("We couldn’t sign you out. Please try again.");
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><Link href={user.role === "ADMIN" ? "/admin/queue" : "/dashboard"} aria-label="BookLeaf home"><Image className="brand-image" src="/brand/bookleaf-logo.jpg" alt="BookLeaf Publishing" width={180} height={81} priority /></Link></div>
        <div className="workspace-label">{user.role === "ADMIN" ? "OPERATIONS" : "AUTHOR SPACE"}</div>
        <nav className="nav" aria-label="Main navigation">
          {links.map(({ href, Icon, label }) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""}>
              <Icon className="nav-icon" size={17} strokeWidth={1.9} aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
        <div className="side-bottom">
          <Link className="profile-link" href="/profile"><span className="avatar-shell">{user.profileImageType ? <Image src={`/api/users/${encodeURIComponent(user.id)}/avatar?v=${user.updatedAt.getTime()}`} alt="" width={38} height={38} unoptimized /> : initials(user.name)}</span><span className="user-meta"><b>{user.name}</b><span>{user.role === "ADMIN" ? "Support team" : "BookLeaf author"}</span></span><span className="profile-edit-hint">Profile</span></Link>
          <button className="sign-out-button" onClick={signOut} disabled={busy}><LogOut size={15} aria-hidden="true" />{busy ? "Signing out…" : "Sign out"}</button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="crumb">BookLeaf <ChevronRight size={13} aria-hidden="true" /> <strong>{links.find(({ href }) => href === pathname)?.label ?? (pathname === "/profile" ? "My profile" : pathname === "/dashboard" ? "Overview" : "Support")}</strong></div><div className="topright"><span className="system-status"><Activity size={14} aria-hidden="true" />All systems operational</span><span className="avatar mobile-name">{initials(user.name)}</span><button className="topbar-signout" onClick={signOut} disabled={busy}><LogOut size={14} aria-hidden="true" />{busy ? "Signing out…" : "Sign out"}</button></div></header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
