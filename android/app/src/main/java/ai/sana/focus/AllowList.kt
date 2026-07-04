package ai.sana.focus

/**
 * Allow-list mirrored from src/lib/strict-mode.ts DEFAULT_ALLOW_LIST.
 * Keep in sync when editing the web hook.
 *
 * `essential` apps can never be removed from the allow-list. Others
 * (e.g. YouTube) are user-configurable in Strict Mode settings.
 */
data class AllowedApp(
    val id: String,
    val displayName: String,
    val packageName: String,
    val essential: Boolean,
)

object AllowList {
    val DEFAULT: List<AllowedApp> = listOf(
        AllowedApp("sana", "Sana AI", "ai.sana.focus", essential = true),
        AllowedApp("phone", "Phone", "com.android.dialer", essential = true),
        AllowedApp("camera", "Camera", "com.android.camera2", essential = true),
        AllowedApp("calculator", "Calculator", "com.android.calculator2", essential = true),
        AllowedApp("clock", "Clock", "com.android.deskclock", essential = true),
        AllowedApp("messages", "Messages", "com.google.android.apps.messaging", essential = true),
        AllowedApp("emergency", "Emergency Dialer", "com.android.emergency", essential = true),
        AllowedApp("classroom", "Google Classroom", "com.google.android.apps.classroom", essential = true),
        AllowedApp("youtube", "YouTube", "com.google.android.youtube", essential = false),
    )

    /** Also always allow the current launcher and the system UI. */
    val SYSTEM_ALLOW_PREFIXES = listOf(
        "com.android.systemui",
        "com.android.launcher",
        "com.google.android.apps.nexuslauncher",
        "android",
    )

    fun isAllowed(pkg: String, userAllowList: List<AllowedApp>): Boolean {
        if (SYSTEM_ALLOW_PREFIXES.any { pkg.startsWith(it) }) return true
        return userAllowList.any { it.packageName == pkg }
    }
}
