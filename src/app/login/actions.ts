"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, validateLoginCredentials } from "@/lib/auth";

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const username = formData.get("username");
  const password = formData.get("password");

  if (typeof username !== "string" || typeof password !== "string") {
    return { error: "Username dan password wajib diisi." };
  }

  const isValid = validateLoginCredentials({ username, password });

  if (!isValid) {
    return { error: "Kredensial tidak sesuai. Gunakan akun demo yang diberikan." };
  }

  await createSession();
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
