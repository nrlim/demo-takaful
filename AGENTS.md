<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Takaful Demo - Agent Execution Rules

## 1. Project Overview & Target
- **Domain**: Email-to-OCR Middleware (Takaful Demo).
- **Execution Target**: Build a robust middleware dashboard that catches incoming emails from configured addresses, sends matching documents to the **Core OCR Engine** service, and displays the processed results on a monitoring dashboard.
- **Core Workflow**:
  1. Catch incoming emails based on a pre-configured list of email addresses.
  2. Identify and filter email contents categorized for OCR processing.
  3. Relevant documents are sent to the Core OCR Engine API to generate OCR results.
  4. OCR results are pushed to a Dashboard, and the corresponding email status is updated to "OCR completed".

---

## 2. Component Guidelines
- **Architecture**: Strictly follow Next.js App Router conventions.
- **UI/Styling**: Build using **Tailwind CSS v4** and **Shadcn UI**. Prioritize accessible, responsive, and reusable components.
- **State/Logic**: Use React 19 features where appropriate. Keep components modular.
- **Anti AI-Slop Design**: DO NOT use themes or components that look like generic AI output. STRICTLY AVOID emojis/emoticons, excessively rounded cards (e.g., `rounded-3xl`), and cliché AI aesthetics. The design must look sharp, professional, and human-crafted.
- **Theme Constraints**: Do NOT use a dark theme. Use a bright, light color palette exclusively.

### 2.1 Strict Design Prohibitions
The following patterns are **BANNED** across all UI work:

| Banned Pattern | Reason |
|---|---|
| Emoji / Emoticons in headings, labels, or buttons | AI-slop indicator |
| `rounded-3xl`, `rounded-full` on cards/containers | Overly soft, generic AI look |
| Gradient backgrounds on main layout (e.g., purple-to-blue hero) | Cliché AI aesthetic |
| Placeholder lorem ipsum text left in production | Unfinished, unprofessional |
| Generic stock icons without contextual meaning | Lazy, unpolished |
| Dark mode / dark theme | Explicitly prohibited by project owner |
| Excessive shadow stacking (`shadow-2xl` on everything) | Visually noisy, unrefined |

### 2.2 Required Design Principles
- Use a **clean, bright, light color palette** — whites, light grays, and one or two accent colors maximum.
- Typography must be legible and hierarchical. Use proper `font-weight` and `font-size` contrast.
- Spacing must be consistent. Prefer Tailwind's spacing scale (`p-4`, `gap-6`, etc.) — never arbitrary pixel values.
- Components should feel **enterprise-grade**: tables with proper headers, status badges with semantic colors, form inputs with clear labels and validation states.
- All interactive elements must have visible hover/focus states.

---

## 3. Integrations & API Specs

### 3.1 Mail Server Connection (ImapFlow)
- **Library**: Use **ImapFlow** (`imapflow` npm package) to connect to the mail server via IMAP.
- **Purpose**: Monitor and catch incoming emails in real-time from configured mailboxes.
- **Connection Config** (stored in `.env`):
  - `IMAP_HOST` — Mail server hostname (e.g., `imap.gmail.com`).
  - `IMAP_PORT` — Port number (default: `993` for TLS).
  - `IMAP_USER` — Email account username.
  - `IMAP_PASS` — Email account password or app-specific password.
  - `IMAP_TLS` — Boolean, must be `true` for production.
- **Implementation Rules**:
  - Run ImapFlow connections **server-side only** (API routes or background jobs). Never expose IMAP credentials to the client.
  - Use IDLE mode or polling to listen for new emails.
  - After fetching an email, parse attachments (PDF documents) and extract metadata (`filename`, `fileSize`, `fileHash`) before sending to the Core OCR Engine.
  - Handle connection drops gracefully — implement automatic reconnection with exponential backoff.
  - Lock processed emails (e.g., mark as read or flag) to prevent duplicate processing.

### 3.2 Core OCR Engine API
- Endpoint: `POST https://api.ocr-engine.internal/v1/jobs`
- Headers: `Authorization: Bearer YOUR_API_KEY`, `Content-Type: application/json`
- Body: `{ pdfUrl: string, filename: string, fileSize: number, fileHash: string }`
- Response: Returns a job object with `status` field.
- **Error Handling**: If the Core OCR Engine API returns a non-2xx status, the system must log the error server-side and mark the email item as "OCR failed" on the dashboard — never silently swallow failures.

---

## 4. Security API Rules

### 4.1 API Authentication (Mandatory)
- **Every** API route created in this project **MUST** require token-based authentication.
- Do **NOT** expose any unauthenticated endpoints — no exceptions.
- Use `Authorization: Bearer <token>` header pattern for all API routes.
- Validate the token server-side on every request before processing any logic.
- Return `401 Unauthorized` immediately if the token is missing or invalid.

### 4.2 Input Validation
- All incoming requests (especially email webhooks) **MUST** be validated using **Zod schemas**.
- Define schemas in a dedicated file (e.g., `src/lib/validations/`). Do not inline schemas in route handlers.
- Reject malformed payloads with `400 Bad Request` and a descriptive (but safe) error message.

### 4.3 Authentication & Authorization
- Dashboard pages must be protected. Verify user sessions before rendering any OCR data.
- Do not rely on client-side checks alone — always enforce access control server-side.

### 4.4 Secret Management
- API keys (Core OCR Engine, auth secrets, etc.) must be stored exclusively in `.env` / `.env.local`.
- **Never** hardcode secrets in source code, commit them to git, or expose them to the client bundle.
- Use `process.env` access only in server components or API routes.

### 4.5 Error Handling
- Return standard HTTP status codes (`200`, `400`, `401`, `403`, `404`, `500`).
- Gracefully handle OCR API failures without leaking stack traces or internal paths.
- All API error responses must follow a consistent shape:
  ```json
  { "error": "Human-readable message", "code": "ERROR_CODE" }
  ```

---

## 5. Required Skills Integration
When working on this project, the agent **MUST** utilize and refer to the skills available in the local directory:
`C:\Users\nural\.agents\skills`

Before executing complex tasks or architecture decisions, ensure your implementation aligns with the expert standards found in skills such as:
- `api-design-principles`
- `api-designer`
- `next-best-practices`
- `postgres-pro`
- `shadcn`
- `supabase-postgres-best-practices`
- `typescript-pro`
- `ui-ux-pro-max`
- `vercel-react-best-practices`

### 5.1 How to Use Skills
1. **Before writing any feature**: Read the relevant skill file(s) from `C:\Users\nural\.agents\skills\<skill-name>` to understand the expected patterns.
2. **During implementation**: Cross-reference your code against skill guidelines. If a skill dictates a specific pattern (e.g., API response format, component structure), follow it.
3. **After completion**: Verify that no skill rule was violated before marking a task as done.

---

## 6. Code Quality Standards

### 6.1 TypeScript
- **Strict mode**: All TypeScript must compile under strict mode without `any` type escapes.
- Use explicit return types on all exported functions and API handlers.
- Prefer `interface` for object shapes, `type` for unions/intersections.

### 6.2 File & Folder Structure
- Follow Next.js App Router conventions: `src/app/` for pages and API routes.
- Shared utilities go in `src/lib/`.
- Reusable UI components go in `src/components/`.
- Validation schemas go in `src/lib/validations/`.
- Type definitions go in `src/types/`.

### 6.3 Naming Conventions
- Files: `kebab-case.ts` (e.g., `email-config.ts`).
- Components: `PascalCase.tsx` (e.g., `EmailTable.tsx`).
- Variables/functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Zod schemas: `camelCaseSchema` (e.g., `emailPayloadSchema`).

### 6.4 General Rules
- No `console.log` in production code — use a proper logger or remove before commit.
- No commented-out code blocks left in files.
- Every component must have a single responsibility.
- Do not install unnecessary dependencies. Use what is already in the stack.
