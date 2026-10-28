import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { currentSession } from "@/server/auth";
import { connection } from "next/server";

export default async function LoginPage() {
  await connection();
  const session = await currentSession();
  if (session) redirect(session.user.role === "ADMIN" ? "/admin/queue" : "/dashboard");
  return <LoginForm />;
}
