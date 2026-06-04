"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/secret-crypto";
import { SNAPTEXT_DEFAULT_ENDPOINT, SNAPTEXT_PROVIDER } from "@/lib/snaptext";

const snaptextConfigurationSchema = z.object({
  apiKey: z.string().trim().optional(),
  endpoint: z.url().default(SNAPTEXT_DEFAULT_ENDPOINT),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export interface ConfigurationActionState {
  message?: string;
  error?: string;
}

export async function saveSnaptextConfigurationAction(
  _previousState: ConfigurationActionState,
  formData: FormData,
): Promise<ConfigurationActionState> {
  if (!(await isAuthenticated())) {
    return { error: "Unauthorized session." };
  }

  const parsed = snaptextConfigurationSchema.safeParse({
    apiKey: formData.get("apiKey"),
    endpoint: formData.get("endpoint") || SNAPTEXT_DEFAULT_ENDPOINT,
    enabled: formData.get("enabled") ?? "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid configuration." };
  }

  const existingConfig = await prisma.integrationConfiguration.findUnique({
    where: { provider: SNAPTEXT_PROVIDER },
  });
  const apiKey = parsed.data.apiKey?.trim();

  if (!apiKey && !existingConfig) {
    return { error: "Snaptext API key is required for first-time setup." };
  }

  await prisma.integrationConfiguration.upsert({
    where: { provider: SNAPTEXT_PROVIDER },
    update: {
      ...(apiKey ? { apiKey: encryptSecret(apiKey) } : {}),
      endpoint: parsed.data.endpoint,
      enabled: parsed.data.enabled,
      lastError: null,
    },
    create: {
      provider: SNAPTEXT_PROVIDER,
      apiKey: encryptSecret(apiKey ?? ""),
      endpoint: parsed.data.endpoint,
      enabled: parsed.data.enabled,
    },
  });

  revalidatePath("/dashboard/configuration");
  return { message: "Snaptext configuration saved." };
}
