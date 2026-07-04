# Sana Voice Relay

Standalone Bun WebSocket service that bridges **Twilio Media Streams ↔ Deepgram STT ↔ Gemini (Lovable AI Gateway) ↔ ElevenLabs TTS** for sub-second turn-taking voice calls.

Deploy this once, then set `VOICE_RELAY_WSS_URL` in the main Lovable app.

## Env vars

| Name | Purpose |
| --- | --- |
| `DEEPGRAM_API_KEY` | Deepgram Nova-3 streaming STT |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `ELEVENLABS_VOICE_ID` | Optional — default `EXAVITQu4vr4xnSDxMaL` (Sarah) |
| `LOVABLE_API_KEY` | Lovable AI Gateway (Gemini brain) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (to write transcripts + summaries) |
| `PORT` | Optional, default `8080` |

## Local dev

```bash
cd voice-relay
bun install
bun run dev
```

Expose to Twilio with ngrok/cloudflared:

```bash
cloudflared tunnel --url http://localhost:8080
# → wss://<xxx>.trycloudflare.com/voice
```

## Deploy — Fly.io

```bash
fly launch --no-deploy --copy-config --name sana-voice-relay
fly secrets set DEEPGRAM_API_KEY=... ELEVENLABS_API_KEY=... LOVABLE_API_KEY=... \
                SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
# WSS URL → wss://sana-voice-relay.fly.dev/voice
```

## Deploy — Render / Railway

Point at this folder's `Dockerfile`, set the env vars, expose port `8080`. Then set

```
VOICE_RELAY_WSS_URL=wss://<your-service-host>/voice
```

in the main Lovable app's secrets.

## Health check

```
GET /healthz  → 200 "ok"
```

## Protocol notes

- Inbound: Twilio μ-law 8 kHz base64 chunks (`media` events)
- STT: Deepgram Nova-3 with `interim_results`, `endpointing=250ms`, `utterance_end_ms=1200`
- Barge-in: on any partial while Sana is speaking → `clear` event to Twilio, abort Gemini SSE, close ElevenLabs WSS
- LLM: Gemini 3 Flash SSE — token deltas piped straight into ElevenLabs input-streaming WSS
- TTS: ElevenLabs Turbo v2.5, `output_format=ulaw_8000` → forwarded raw to Twilio
- End-of-call: control marker `END_CALL` from the model, or Twilio `stop`
- Post-call: transcript + JSON summary (mood, topics, promises, action) written to `call_sessions` by `twilio_call_sid`

Expected turn latency: ~600–900 ms end-to-end.
