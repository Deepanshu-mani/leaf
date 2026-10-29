import { redirect } from "next/navigation";
import { BookOpen, Headset, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPeople } from "@/components/admin-people";
import { AdminInvitePanel } from "@/components/admin-invite-panel";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export default async function AdminPeoplePage() {
  const currentUser = await requireUser();
  if (currentUser.role !== UserRole.ADMIN) redirect("/dashboard");
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, isActive: true, createdAt: true, profileImageType: true,
      author: { select: { city: true, phone: true, joinedDate: true, _count: { select: { books: true, tickets: true } } } },
      _count: { select: { assignedTickets: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const pendingInvites = await prisma.userInvite.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, email: true, name: true, role: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const people = users.map((user) => ({
    id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive,
    joinedAt: (user.author?.joinedDate ?? user.createdAt).toISOString(), profileImageType: user.profileImageType,
    city: user.author?.city ?? null, phone: user.author?.phone ?? null,
    books: user.author?._count.books ?? 0, tickets: user.author?._count.tickets ?? 0,
    assignedTickets: user._count.assignedTickets,
  }));
  const teamCount = people.filter((person) => person.role === UserRole.ADMIN).length;
  const authorCount = people.filter((person) => person.role === UserRole.AUTHOR).length;
  const inactiveCount = people.filter((person) => !person.isActive).length;
  return <>
    <div className="pagehead"><div><div className="eyebrow">BOOKLEAF OPERATIONS</div><h1>People</h1><p>Manage your publishing community and invite people into their workspace.</p></div></div>
    <div className="stat-grid"><Stat icon={<UserRound />} label="Authors" value={authorCount} sub="Author accounts" /><Stat icon={<UsersRound />} label="Team members" value={teamCount} sub="Internal support team" /><Stat icon={<BookOpen />} label="Active accounts" value={people.length - inactiveCount} sub="Across the directory" /><Stat icon={<Headset />} label="Support tickets" value={people.reduce((sum, person) => sum + person.tickets, 0)} sub="Submitted by authors" /></div>
    <AdminInvitePanel initialInvites={pendingInvites.map((invite) => ({ ...invite, role: invite.role as "ADMIN" | "AUTHOR", expiresAt: invite.expiresAt.toISOString() }))} />
    <AdminPeople people={people} />
  </>;
}
function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: number; sub: string }) { return <div className="stat"><div className="stat-label">{label}<span className="queue-stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>; }
