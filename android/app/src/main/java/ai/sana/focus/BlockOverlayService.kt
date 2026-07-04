package ai.sana.focus

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * Foreground service that draws the "Strict Mode is active" full-screen
 * overlay using TYPE_APPLICATION_OVERLAY. This is the OS-level equivalent
 * of the web `StrictModeOverlay` component in the /src project.
 *
 * Requires SYSTEM_ALERT_WINDOW granted via Settings.canDrawOverlays().
 * The main activity must send the user to that settings screen during
 * onboarding when the permission is missing.
 */
class BlockOverlayService : Service() {

    companion object {
        const val EXTRA_BLOCKED_PACKAGE = "blocked_package"
        private const val CHANNEL_ID = "sana_focus_lock"
        private const val NOTIF_ID = 4210
    }

    private var overlayView: View? = null
    private lateinit var windowManager: WindowManager

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        startInForeground()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val blocked = intent?.getStringExtra(EXTRA_BLOCKED_PACKAGE) ?: "another app"
        showOverlay(blocked)
        return START_STICKY
    }

    private fun showOverlay(blockedPkg: String) {
        if (overlayView != null) return
        val view = LayoutInflater.from(this).inflate(R.layout.overlay_block, null)
        view.findViewById<TextView>(R.id.blocked_text).text =
            getString(R.string.overlay_blocked_body, blockedPkg)
        view.findViewById<View>(R.id.btn_return).setOnClickListener {
            hideOverlay()
        }
        view.findViewById<View>(R.id.btn_emergency).setOnClickListener {
            StrictSession.emergencyOverride()
            hideOverlay()
            stopSelf()
        }

        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_SYSTEM_ALERT

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.CENTER }

        windowManager.addView(view, params)
        overlayView = view
    }

    private fun hideOverlay() {
        overlayView?.let { runCatching { windowManager.removeView(it) } }
        overlayView = null
    }

    override fun onDestroy() {
        hideOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startInForeground() {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Focus Lock",
                NotificationManager.IMPORTANCE_LOW,
            )
            nm.createNotificationChannel(channel)
        }
        val notif: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Strict Mode active")
            .setContentText("Sana is holding your focus.")
            .setSmallIcon(R.drawable.ic_shield)
            .setOngoing(true)
            .build()
        startForeground(NOTIF_ID, notif)
    }
}
