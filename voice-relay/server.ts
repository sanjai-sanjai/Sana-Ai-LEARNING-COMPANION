/**
 * Sana Voice Relay — Twilio Media Streams ↔ Deepgram ↔ Gemini ↔ ElevenLabs
 *
 * Deploy this as a standalone Bun service (Fly.io / Render / Railway).
 * Point Twilio TwiML <Stream url="wss://<host>/voice"> at it.
 *
 * Env vars required:
 *   DEEPGRAM_API_KEY       — Deepgram streaming STT key
 *   ELEVENLABS_API_KEY     — ElevenLabs TTS key
 *   ELEVENLABS_VOICE_ID    — Voice ID (default: Sarah "EXAVITQu4vr4xnSDxMaL")
 *   LOVABLE_API_KEY        — Lovable AI Gateway key (for Gemini)
 *   SUPABASE_URL           — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key for writing transcripts
 *   PORT                   — optional, default 8080
 */

import { createClient } from "@supabase/supabase-js";

const {
  DEEPGRAM_API_KEY,
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL",
  LOVABLE_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PORT = "8080",
} = process.env;

for (const [k, v] of Object.entries({
  DEEPGRAM_API_KEY,
  ELEVENLABS_API_KEY,
  LOVABLE_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
})) {
  if (!v) throw new Error(`Missing required env var: ${k}`);
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Types ───────────────────────────────────────────────────────────────────

type Persona = "friendly_coach" | "strict_mentor" | "mom_mode" | "power_coach";

interface CallState {
  streamSid: string | null;
  callSid: string | null;
  reminderId: string | null;
  userId: string | null;
  persona: Persona;
  topic: string | null;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  transcript: Array<{ role: "user" | "assistant"; content: string; at: number }>;
  deepgram: WebSocket | null;
  eleven: WebSocket | null;
  twilio: WebSocket;
  speaking: boolean;         // Sana is currently emitting TTS audio
  pendingUserUtterance: string;
  lastPartialAt: number;
  markCounter: number;
  aiInflight: AbortController | null;
  ended: boolean;
}

// ─── Persona prompts ─────────────────────────────────────────────────────────

const PERSONA_PROMPTS: Record<Persona, string> = {
  friendly_coach:
    "You are Sana, a warm, upbeat friend who helps the student focus. Speak like a supportive peer. Keep replies to 1-2 short sentences.",
  strict_mentor:
    "You are Sana in strict mentor mode. Direct, no-nonsense, holds them accountable. 1-2 crisp sentences.",
  mom_mode:
    "You are Sana in mom mode. Warm, caring, gently insistent. 1-2 loving sentences.",
  power_coach:
    "You are Sana in power coach mode. High-energy, motivational, athlete-style hype. 1-2 punchy sentences.",
};

function buildSystemPrompt(persona: Persona, topic: string | null, extra: string): string {
  const base = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.friendly_coach;
  const topicLine = topic ? ` The study topic today is: ${topic}.` : "";
  return `${base}${topicLine} This is a live phone call. Never say you are an AI. Never use markdown, lists, or long paragraphs. If they want to end the call, say a warm goodbye and append the token END_CALL on its own line. ${extra}`.trim();
}

// ─── Deepgram streaming STT ──────────────────────────────────────────────────

function openDeepgram(state: CallState): WebSocket {
  const params = new URLSearchParams({
    encoding: "mulaw",
    sample_rate: "8000",
    channels: "1",
    model: "nova-3",
    language: "multi",
    interim_results: "true",
    smart_format: "true",
    endpointing: "250",
    utterance_end_ms: "1200",
    vad_events: "true",
  });
  const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
  } as any);

  ws.addEventListener("open", () => console.log("[dg] open", state.callSid));
  ws.addEventListener("error", (e) => console.error("[dg] error", e));
  ws.addEventListener("close", (e) => console.log("[dg] close", e.code, e.reason));

  ws.addEventListener("message", async (evt) => {
    let msg: any;
    try {
      msg = JSON.parse(typeof evt.data === "string" ? evt.data : new TextDecoder().decode(evt.data as ArrayBuffer));
    } catch {
      return;
    }

    if (msg.type === "Results") {
      const alt = msg.channel?.alternatives?.[0];
      const text: string = alt?.transcript ?? "";
      if (!text) return;

      // Barge-in: user started speaking while Sana was talking → cut TTS.
      if (state.speaking) bargeIn(state);

      if (msg.is_final) {
        state.pendingUserUtterance = (state.pendingUserUtterance + " " + text).trim();
      }
      state.lastPartialAt = Date.now();
    } else if (msg.type === "UtteranceEnd" || (msg.type === "Results" && msg.speech_final)) {
      // Utterance boundary → run the LLM turn
      const utterance = state.pendingUserUtterance.trim();
      state.pendingUserUtterance = "";
      if (utterance) void runLlmTurn(state, utterance);
    }
  });

  return ws;
}

// ─── ElevenLabs streaming TTS (WSS input-streaming) ──────────────────────────

function openEleven(state: CallState): WebSocket {
  const url = `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream-input?model_id=eleven_turbo_v2_5&output_format=ulaw_8000&auto_mode=true`;
  const ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    // Initial config message
    ws.send(
      JSON.stringify({
        text: " ",
        voice_settings: { stability: 0.4, similarity_boost: 0.75, speed: 1.0 },
        xi_api_key: ELEVENLABS_API_KEY,
      }),
    );
    console.log("[11] open", state.callSid);
  });

  ws.addEventListener("error", (e) => console.error("[11] error", e));
  ws.addEventListener("close", (e) => {
    console.log("[11] close", e.code);
    state.eleven = null;
  });

  ws.addEventListener("message", (evt) => {
    if (state.ended) return;
    try {
      const data =
        typeof evt.data === "string"
          ? JSON.parse(evt.data)
          : JSON.parse(new TextDecoder().decode(evt.data as ArrayBuffer));
      if (data.audio && state.streamSid) {
        // Forward μ-law 8kHz audio straight to Twilio
        state.twilio.send(
          JSON.stringify({
            event: "media",
            streamSid: state.streamSid,
            media: { payload: data.audio },
          }),
        );
        state.speaking = true;
      }
      if (data.isFinal) {
        // Send a mark so we know when Twilio finishes playing
        state.markCounter += 1;
        state.twilio.send(
          JSON.stringify({
            event: "mark",
            streamSid: state.streamSid,
            mark: { name: `sana-${state.markCounter}` },
          }),
        );
      }
    } catch (e) {
      console.error("[11] parse", e);
    }
  });

  return ws;
}

function ensureEleven(state: CallState): WebSocket {
  if (!state.eleven || state.eleven.readyState > 1) {
    state.eleven = openEleven(state);
  }
  return state.eleven;
}

// ─── Barge-in ────────────────────────────────────────────────────────────────

function bargeIn(state: CallState) {
  // Cancel LLM in flight
  if (state.aiInflight) {
    state.aiInflight.abort();
    state.aiInflight = null;
  }
  // Tell Twilio to drop any queued audio
  if (state.streamSid) {
    state.twilio.send(JSON.stringify({ event: "clear", streamSid: state.streamSid }));
  }
  // Close and reopen the ElevenLabs socket to flush its queue
  try {
    state.eleven?.close();
  } catch {}
  state.eleven = null;
  state.speaking = false;
}

// ─── LLM turn (Lovable AI Gateway → Gemini streaming) ────────────────────────

async function runLlmTurn(state: CallState, userText: string) {
  if (state.ended) return;

  state.history.push({ role: "user", content: userText });
  state.transcript.push({ role: "user", content: userText, at: Date.now() });

  const controller = new AbortController();
  state.aiInflight = controller;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      stream: true,
      messages: [
        { role: "system", content: state.systemPrompt },
        ...state.history.slice(-20),
      ],
    }),
  }).catch((e) => {
    if (e.name !== "AbortError") console.error("[llm] error", e);
    return null;
  });

  if (!resp || !resp.ok || !resp.body) {
    if (resp) console.error("[llm] status", resp.status, await resp.text().catch(() => ""));
    return;
  }

  const eleven = ensureEleven(state);
  // Wait until ElevenLabs socket is open before flushing text.
  if (eleven.readyState === 0) {
    await new Promise<void>((res) => eleven.addEventListener("open", () => res(), { once: true }));
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";
  let sawEndCall = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          const delta: string = chunk.choices?.[0]?.delta?.content ?? "";
          if (!delta) continue;
          assistantText += delta;

          // Strip control markers from spoken audio
          let spoken = delta;
          if (assistantText.includes("END_CALL")) {
            sawEndCall = true;
            spoken = spoken.replace(/END_CALL/g, "");
          }
          if (spoken && eleven.readyState === 1) {
            eleven.send(JSON.stringify({ text: spoken, try_trigger_generation: true }));
          }
        } catch {
          /* ignore partial */
        }
      }
    }
  } catch (e: any) {
    if (e?.name !== "AbortError") console.error("[llm] read", e);
    return;
  }

  // Flush + finalize
  if (eleven.readyState === 1) {
    eleven.send(JSON.stringify({ text: "" })); // signal end of input
  }

  const cleaned = assistantText.replace(/END_CALL/g, "").trim();
  if (cleaned) {
    state.history.push({ role: "assistant", content: cleaned });
    state.transcript.push({ role: "assistant", content: cleaned, at: Date.now() });
  }

  // Persist transcript incrementally
  if (state.callSid) {
    supabase
      .from("call_sessions")
      .update({ transcript: state.transcript })
      .eq("twilio_call_sid", state.callSid)
      .then(({ error }) => {
        if (error) console.error("[db] update transcript", error.message);
      });
  }

  if (sawEndCall) {
    // Let the audio play out, then hang up.
    setTimeout(() => endCall(state), 3500);
  }
}

// ─── Call teardown + summarization ───────────────────────────────────────────

async function endCall(state: CallState) {
  if (state.ended) return;
  state.ended = true;
  try {
    state.deepgram?.close();
  } catch {}
  try {
    state.eleven?.close();
  } catch {}
  try {
    state.twilio.close();
  } catch {}

  if (!state.callSid) return;

  // Fire-and-forget summarization
  try {
    const transcriptText = state.transcript
      .map((t) => `${t.role === "user" ? "User" : "Sana"}: ${t.content}`)
      .join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are analyzing a phone-call transcript between the AI study coach Sana and a student. Return JSON: {summary: string (2-3 sentences), mood: one of ['focused','anxious','tired','motivated','distracted','neutral'], topics: string[], promises: string[], action_taken: 'studied'|'skipped'|'rescheduled'|'unclear'}.",
          },
          { role: "user", content: transcriptText || "(no dialogue)" },
        ],
      }),
    });

    let summary = "", mood = "neutral", topics: string[] = [], promises: string[] = [], action = "unclear";
    if (resp.ok) {
      const j = await resp.json();
      try {
        const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
        summary = parsed.summary ?? "";
        mood = parsed.mood ?? "neutral";
        topics = parsed.topics ?? [];
        promises = parsed.promises ?? [];
        action = parsed.action_taken ?? "unclear";
      } catch {}
    }

    await supabase
      .from("call_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        transcript: state.transcript,
        summary,
        mood,
        topics,
        promises,
        action_taken: action,
      })
      .eq("twilio_call_sid", state.callSid);
  } catch (e) {
    console.error("[end] summarize", e);
  }
}

// ─── Twilio Media Streams WebSocket handler ─────────────────────────────────

const server = Bun.serve({
  port: Number(PORT),
  fetch(req, srv) {
    const url = new URL(req.url);
    if (url.pathname === "/healthz") return new Response("ok");
    if (url.pathname === "/voice") {
      if (srv.upgrade(req)) return;
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    return new Response("Sana Voice Relay", { status: 200 });
  },
  websocket: {
    idleTimeout: 300, // 5 min per Twilio call max on a socket
    open(ws) {
      const state: CallState = {
        streamSid: null,
        callSid: null,
        reminderId: null,
        userId: null,
        persona: "friendly_coach",
        topic: null,
        systemPrompt: "",
        history: [],
        transcript: [],
        deepgram: null,
        eleven: null,
        twilio: ws as unknown as WebSocket,
        speaking: false,
        pendingUserUtterance: "",
        lastPartialAt: 0,
        markCounter: 0,
        aiInflight: null,
        ended: false,
      };
      (ws as any).state = state;
    },
    async message(ws, raw) {
      const state: CallState = (ws as any).state;
      if (state.ended) return;

      let msg: any;
      try {
        msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
      } catch {
        return;
      }

      switch (msg.event) {
        case "connected":
          break;

        case "start": {
          state.streamSid = msg.start?.streamSid ?? null;
          state.callSid = msg.start?.callSid ?? null;
          const params = msg.start?.customParameters ?? {};
          state.reminderId = params.reminder_id ?? null;
          state.userId = params.user_id ?? null;
          state.persona = (params.persona as Persona) ?? "friendly_coach";
          state.topic = params.topic ?? null;
          const displayName = params.display_name ?? null;

          const extra = displayName ? `The student's name is ${displayName}.` : "";
          state.systemPrompt = buildSystemPrompt(state.persona, state.topic, extra);

          console.log("[twilio] start", state.callSid, state.persona);

          // Open Deepgram
          state.deepgram = openDeepgram(state);

          // Kick off opener
          void runLlmTurn(
            state,
            "The call just connected. Greet the student warmly and open the study session naturally.",
          );
          break;
        }

        case "media": {
          // Forward inbound audio to Deepgram
          const dg = state.deepgram;
          if (dg && dg.readyState === 1) {
            const bin = Uint8Array.from(atob(msg.media.payload), (c) => c.charCodeAt(0));
            dg.send(bin);
          }
          break;
        }

        case "mark":
          // Twilio finished playing a chunk we marked → Sana is no longer speaking (if last mark)
          if (msg.mark?.name === `sana-${state.markCounter}`) {
            state.speaking = false;
          }
          break;

        case "stop":
          console.log("[twilio] stop", state.callSid);
          void endCall(state);
          break;
      }
    },
    close(ws) {
      const state: CallState = (ws as any).state;
      if (state) void endCall(state);
    },
  },
});

console.log(`[relay] listening on :${server.port} — WSS path /voice`);
