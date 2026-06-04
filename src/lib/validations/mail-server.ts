import { z } from "zod";

export const mailServerConnectionSchema = z.object({
  name: z.string().trim().min(2, "Connection name is required."),
  host: z.string().trim().min(3, "Mail server host is required."),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
  mailbox: z.string().trim().min(1, "Mailbox is required."),
  secure: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const connectionIdSchema = z.object({
  connectionId: z.string().trim().min(1),
});

export type MailServerConnectionInput = z.infer<typeof mailServerConnectionSchema>;
