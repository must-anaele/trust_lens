type JsonSchema = Record<string, unknown>;

interface GenerateTextOptions {
  instructions: string;
  input: string;
  maxOutputTokens: number;
  format?: { name: string; schema: JsonSchema };
}

function getConfig() {
  const apiKey = process.env.MUST_LITELLM_API_KEY;
  const baseUrl = (process.env.MUST_LITELLM_BASE_URL || "https://litellm.must.company/v1").replace(/\/+$/, "");
  const model = process.env.MUST_LITELLM_MODEL || "codex";
  if (!apiKey) throw new Error("AI reporting is not configured. Set MUST_LITELLM_API_KEY on the server.");
  return { apiKey, baseUrl, model };
}

function extractText(response: any): string {
  if (!response || typeof response !== "object") return "";
  if (typeof response.output_text === "string") return response.output_text;
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if ((part.type === "output_text" || part.type === "text") && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n");
}

function parseEventStream(body: string): { response: any; text: string; error?: string } {
  let completedResponse: any = null;
  const textChunks: string[] = [];
  const events = body.split(/\r?\n\r?\n/);

  for (const event of events) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data || data === "[DONE]") continue;

    try {
      const item = JSON.parse(data);
      if (item.type === "response.output_text.delta" && typeof item.delta === "string") {
        textChunks.push(item.delta);
      } else if (item.type === "response.completed") {
        completedResponse = item.response;
      } else if (item.type === "response.failed" || item.type === "error") {
        return {
          response: completedResponse,
          text: textChunks.join(""),
          error: item.response?.error?.message || item.error?.message || item.message || "The streamed response failed.",
        };
      }
    } catch {
      // Ignore malformed or non-JSON SSE events and continue looking for a final response.
    }
  }

  return { response: completedResponse, text: textChunks.join("") };
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();
  const body: Record<string, unknown> = {
    model,
    instructions: options.instructions,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: options.input }],
      },
    ],
    max_output_tokens: options.maxOutputTokens,
  };
  if (options.format) {
    body.text = {
      format: {
        type: "json_schema",
        name: options.format.name,
        strict: true,
        schema: options.format.schema,
      },
    };
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
    cache: "no-store",
  });
  const rawBody = await response.text();
  const contentType = response.headers.get("content-type") || "unknown content type";
  let payload: any = null;
  let streamedText = "";
  let streamError: string | undefined;
  if (contentType.includes("text/event-stream") || rawBody.trimStart().startsWith("data:")) {
    const stream = parseEventStream(rawBody);
    payload = stream.response;
    streamedText = stream.text;
    streamError = stream.error;
  } else {
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      // Some gateways return plain text or an HTML proxy error instead of JSON.
    }
  }
  if (!response.ok) {
    const detail = typeof payload?.error?.message === "string" ? payload.error.message : "No error details returned.";
    const fallback = rawBody.trim().replaceAll(apiKey, "[redacted]").slice(0, 500);
    throw new Error(`Must LiteLLM request failed (${response.status}): ${(detail === "No error details returned." && fallback ? fallback : detail).replaceAll(apiKey, "[redacted]").slice(0, 500)}`);
  }
  if (streamError) throw new Error(`Must LiteLLM stream failed: ${streamError.replaceAll(apiKey, "[redacted]").slice(0, 500)}`);
  if (!payload) {
    const preview = rawBody.trim().replaceAll(apiKey, "[redacted]").slice(0, 200);
    throw new Error(`Must LiteLLM returned an empty or non-JSON response (${response.status}, ${contentType})${preview ? `: ${preview}` : "."}`);
  }
  if (payload?.status && payload.status !== "completed") {
    throw new Error(`Must LiteLLM response was ${payload.status}.`);
  }
  const text = streamedText || extractText(payload);
  if (!text.trim()) throw new Error("Must LiteLLM returned an empty response.");
  return text;
}

export function hasAiProviderConfig() {
  return Boolean(process.env.MUST_LITELLM_API_KEY);
}
