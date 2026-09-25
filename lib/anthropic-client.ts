type JsonSchema = Record<string, unknown>;

interface GenerateTextOptions {
  instructions: string;
  input: string;
  maxOutputTokens: number;
  format?: { name: string; schema: JsonSchema };
}

function getConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  if (!apiKey) throw new Error("AI reporting is not configured. Set ANTHROPIC_API_KEY on the server.");
  return { apiKey, model, workspaceId };
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { apiKey, model, workspaceId } = getConfig();
  const body: Record<string, unknown> = {
    model,
    system: options.instructions,
    messages: [{ role: "user", content: options.input }],
    max_tokens: options.maxOutputTokens,
  };
  if (options.format) {
    body.output_config = {
      format: { type: "json_schema", schema: options.format.schema },
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      ...(workspaceId ? { "anthropic-workspace-id": workspaceId } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
    cache: "no-store",
  });
  const rawBody = await response.text();
  let payload: any = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Keep provider errors readable even if the upstream returns non-JSON.
  }

  if (!response.ok) {
    const detail = typeof payload?.error?.message === "string" ? payload.error.message : rawBody.trim();
    throw new Error(`Anthropic request failed (${response.status}): ${detail.replaceAll(apiKey, "[redacted]").slice(0, 500) || "No error details returned."}`);
  }
  const text = (payload?.content ?? [])
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n");
  if (!text.trim()) throw new Error("Anthropic returned an empty response.");
  return text;
}

export function hasAiProviderConfig() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
