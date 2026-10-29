import { BadgeCheck, Mail, MapPin, Shield, UserRound } from "lucide-react";
import { ProfileImageForm } from "@/components/profile-image-form";
import { requireUser } from "@/server/auth";

export default async function ProfilePage() {
  const user = await requireUser();
  return <>
    <div className="pagehead"><div><div className="eyebrow">ACCOUNT SETTINGS</div><h1>My profile</h1><p>Manage your account details and profile photo.</p></div><span className="profile-status"><BadgeCheck size={15} />Account active</span></div>
    <section className="card profile-card"><div className="profile-photo-section"><ProfileImageForm userId={user.id} name={user.name} hasImage={Boolean(user.profileImageType)} imageVersion={user.updatedAt.getTime()} /></div><div className="profile-details"><div><span><UserRound size={14} />Name</span><strong>{user.name}</strong></div><div><span><Mail size={14} />Email</span><strong>{user.email}</strong></div><div><span><Shield size={14} />Account type</span><strong>{user.role === "ADMIN" ? "BookLeaf support team" : "BookLeaf author"}</strong></div>{user.author?.city && <div><span><MapPin size={14} />City</span><strong>{user.author.city}</strong></div>}</div></section>
  </>;
}
