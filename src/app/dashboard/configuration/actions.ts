"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/secret-crypto";
import { SNAPTEXT_DEFAULT_ENDPOINT, SNAPTEXT_PROVIDER } from "@/lib/snaptext";
import { snaptextConfigurationSchema } from "@/lib/validations/snaptext-configuration";

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
    ocrModelId: formData.get("ocrModelId") ?? "",
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
      ocrModelId: parsed.data.ocrModelId,
      lastError: null,
    },
    create: {
      provider: SNAPTEXT_PROVIDER,
      apiKey: encryptSecret(apiKey ?? ""),
      endpoint: parsed.data.endpoint,
      enabled: parsed.data.enabled,
      ocrModelId: parsed.data.ocrModelId,
    },
  });

  revalidatePath("/dashboard/configuration");
  return { message: "Snaptext configuration saved." };
}
