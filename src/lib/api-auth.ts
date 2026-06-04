export interface ApiErrorResponse {
  error: string;
  code: string;
}

export function validateBearerToken(request: Request): boolean {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  const expectedToken = process.env.API_AUTH_TOKEN;

  return Boolean(token && expectedToken && token === expectedToken);
}

export function apiError(error: string, code: string, status: number): Response {
  return Response.json({ error, code } satisfies ApiErrorResponse, { status });
}
