import { createHash } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { AcceptInviteForm } from "@/components/accept-invite-form";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Accept invitation", robots: { index: false, follow: false } };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const validFormat = /^[A-Za-z0-9_-]{40,60}$/.test(token);
  const invite = validFormat ? await prisma.userInvite.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") }, select: { name: true, email: true, role: true, expiresAt: true, acceptedAt: true } }) : null;
  const usable = invite && !invite.acceptedAt && invite.expiresAt > new Date();

  return <main className="invite-page"><Link className="invite-brand" href="/login"><Image src="/brand/bookleaf-logo.jpg" alt="BookLeaf Publishing" width={180} height={81} priority /></Link>{usable ? <AcceptInviteForm token={token} name={invite.name} email={invite.email} role={invite.role} /> : <section className="invite-accept-card"><span className="invite-accept-icon is-expired">!</span><div className="eyebrow">INVITATION LINK</div><h1>This invitation can’t be used</h1><p className="invite-accept-intro">The link may have expired or already been used. Ask the person who invited you to create a new one.</p><Link className="btn invite-login-link" href="/login">Return to sign in</Link></section>}<p className="invite-footer">Thoughtfully published. Personally supported.</p></main>;
}
