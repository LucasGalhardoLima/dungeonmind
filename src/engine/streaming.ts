// LLM streaming handler for DM Engine via Vercel AI Gateway
// Both Anthropic and Gemini route through the same gateway endpoint.

import Anthropic from '@anthropic-ai/sdk';
import Constants from 'expo-constants';
import { fetch as expoFetch, type FetchRequestInit } from 'expo/fetch';

// Adapt expo/fetch to match the Anthropic SDK's expected fetch signature.
// Expo's fetch only accepts `string` + `FetchRequestInit`, but the SDK declares
// `string | URL | Request` + `RequestInit`. In practice the SDK only passes
// strings. The init types differ in that `RequestInit` allows `null` for body,
// signal, and window while `FetchRequestInit` does not — we strip null values.
function toFetchInit(init: RequestInit): FetchRequestInit {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(init)) {
    if (value !== null) {
      result[key] = value;
    }
  }
  return result as FetchRequestInit;
}

const sdkFetch = (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : String(input);
  return expoFetch(url, init ? toFetchInit(init) : undefined);
};

const AI_GATEWAY_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_AI_GATEWAY_API_KEY ??
  process.env['EXPO_PUBLIC_AI_GATEWAY_API_KEY'] ??
  '';

const gateway = new Anthropic({
  apiKey: AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh',
  fetch: sdkFetch,
});

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export interface StreamOptions {
  maxTokens?: number;
}

/**
 * Stream a completion from Claude via Vercel AI Gateway.
 * Calls onToken for each text delta and onComplete with the full accumulated text.
 */
export async function streamCompletion(
  systemPrompt: string,
  userMessage: string,
  callbacks: StreamCallbacks,
  options?: StreamOptions,
): Promise<void> {
  let accumulated = '';

  try {
    const stream = gateway.messages.stream({
      model: 'anthropic/claude-sonnet-4-6',
      max_tokens: options?.maxTokens ?? 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        accumulated += event.delta.text;
        callbacks.onToken(event.delta.text);
      }
    }

    callbacks.onComplete(accumulated);
  } catch (error) {
    callbacks.onError(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Gemini Flash fallback streamer via Vercel AI Gateway.
 * Uses the same Anthropic-compatible API — the gateway routes to Gemini.
 */
export async function streamCompletionGemini(
  systemPrompt: string,
  userMessage: string,
  callbacks: StreamCallbacks,
  options?: StreamOptions,
): Promise<void> {
  let accumulated = '';

  try {
    const stream = gateway.messages.stream({
      model: 'google/gemini-2.0-flash',
      max_tokens: options?.maxTokens ?? 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        accumulated += event.delta.text;
        callbacks.onToken(event.delta.text);
      }
    }

    callbacks.onComplete(accumulated);
  } catch (error) {
    callbacks.onError(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
