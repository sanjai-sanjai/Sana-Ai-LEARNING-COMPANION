package ai.sana.focus

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/**
 * Detects foreground app changes and, if the app is not on the user's
 * allow-list AND Strict Mode is active, launches the BlockOverlayService.
 *
 * We deliberately do NOT read window content — see accessibility_service_config.xml
 * (canRetrieveWindowContent=false). This keeps us within Play Store's
 * narrow-purpose accessibility policy.
 */
class FocusAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val e = event ?: return
        if (e.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkg = e.packageName?.toString() ?: return
        if (!StrictSession.isActive) return
        if (AllowList.isAllowed(pkg, StrictSession.allowList)) return

        // Foreground app is not allowed → surface the overlay.
        // We do NOT force-stop the other app (not permitted on non-owner devices).
        // Instead we bring Sana back to the front and draw the overlay.
        StrictSession.recordDistraction(pkg)

        val overlay = Intent(this, BlockOverlayService::class.java).apply {
            putExtra(BlockOverlayService.EXTRA_BLOCKED_PACKAGE, pkg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startForegroundService(overlay)

        val relaunchSana = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        relaunchSana?.let { startActivity(it) }
    }

    override fun onInterrupt() = Unit
}
