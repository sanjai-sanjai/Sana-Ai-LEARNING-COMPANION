# Sana AI — Android Focus Lock (Strict Mode)

Native Android companion to the Sana web app. Implements the OS-level
enforcement layer that a browser cannot: monitoring the foreground app,
overlaying a full-screen lock over other apps, and returning the user to
Sana when they try to escape a focus session.

> **Status:** scaffold. This directory contains the module structure,
> `AndroidManifest.xml`, and service stubs. Open it in Android Studio to
> finish wiring the Gradle build, sign, and ship to Play Store.

## Architecture

```
    ┌─────────────────────┐       HTTPS       ┌────────────────────┐
    │  Sana Web (this     │  ───────────────► │  Supabase (shared) │
    │  repo, TanStack)    │  ◄─────────────── │                    │
    └─────────────────────┘                   └──────────┬─────────┘
                                                         │
                                                         │ same tables
                                                         ▼
    ┌───────────────────────────────────────────────────────────────┐
    │  Android app (this /android directory)                        │
    │                                                               │
    │  FocusAccessibilityService  ── observes foreground app events │
    │  UsageStatsMonitor          ── polls UsageStatsManager        │
    │  BlockOverlayService        ── TYPE_APPLICATION_OVERLAY view  │
    │  StrictSessionRepository    ── writes to Supabase             │
    │  NotificationListenerSvc    ── (optional) mutes notifications │
    └───────────────────────────────────────────────────────────────┘
```

## Required permissions (Play-policy compliant)

Declared in `app/src/main/AndroidManifest.xml`:

- `android.permission.BIND_ACCESSIBILITY_SERVICE` — foreground-app events.
- `android.permission.PACKAGE_USAGE_STATS` — UsageStatsManager (runtime opt-in).
- `android.permission.SYSTEM_ALERT_WINDOW` — draw the overlay.
- `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` — optional, mute notifications during focus.
- `android.permission.POST_NOTIFICATIONS` — session state notifications.
- `android.permission.FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` — keep the monitor alive.
- `android.permission.INTERNET` — sync with Supabase.

**Play Store policy:** the Accessibility Service must have a narrow,
declared purpose (focus/distraction blocking) and cannot be used for
general-purpose automation. The onboarding flow must clearly explain
each permission and provide a "why we need this" screen. See
`docs/PLAY_STORE_JUSTIFICATION.md` (to be authored) before submission.

## No unsupported APIs

- No root, no `su` calls.
- No hidden APIs, no reflection into `ActivityManager.forceStopPackage`.
- No launching a foreground app on the user's behalf beyond re-launching
  Sana itself (Android does not permit force-stopping arbitrary apps
  without device owner mode).

## Graceful degradation

If a permission is refused, the app disables the corresponding feature
and shows an in-app explainer with a button to re-request. It never
fails silently or blocks the whole app.

| Permission missing         | Feature disabled                          |
| -------------------------- | ----------------------------------------- |
| Accessibility Service      | Real-time foreground-app blocking         |
| Usage Access               | Polling-based blocking + weekly analytics |
| Display Over Other Apps    | Full-screen overlay (falls back to notif) |
| Notification Listener      | Notification muting                       |
| POST_NOTIFICATIONS         | Session-state notifications               |

## Build

```bash
# from repo root
cd android
./gradlew :app:assembleDebug          # debug APK
./gradlew :app:bundleRelease          # AAB for Play Console
```

## Files in this scaffold

- `app/src/main/AndroidManifest.xml`
- `app/src/main/java/ai/sana/focus/FocusAccessibilityService.kt`
- `app/src/main/java/ai/sana/focus/BlockOverlayService.kt`
- `app/src/main/java/ai/sana/focus/AllowList.kt`
- `app/src/main/java/ai/sana/focus/StrictSessionRepository.kt`
- `app/src/main/res/xml/accessibility_service_config.xml`
- `app/src/main/res/layout/overlay_block.xml`

The web app in `/src` is the source of truth for allow-list defaults,
adaptive Sana copy, and analytics schema. Mirror any changes to
`AllowList.kt` when you edit `src/lib/strict-mode.ts`.
