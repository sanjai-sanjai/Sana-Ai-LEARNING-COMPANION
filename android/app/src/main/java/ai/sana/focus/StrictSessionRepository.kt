package ai.sana.focus

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * In-memory session state read by the accessibility service. Persisted to
 * Supabase via StrictSessionRepository on completion.
 *
 * The web app writes the same shape (see src/lib/strict-mode.ts) so both
 * clients read a consistent dashboard.
 */
object StrictSession {
    @Volatile var isActive: Boolean = false
        private set
    @Volatile var allowList: List<AllowedApp> = AllowList.DEFAULT
        private set

    private val scope = CoroutineScope(Dispatchers.IO)
    private var startedAt: Long = 0
    private var plannedSeconds: Int = 0
    private var distractionAttempts: Int = 0
    private val blocked = mutableMapOf<String, Int>()

    fun start(plannedSeconds: Int, allow: List<AllowedApp> = AllowList.DEFAULT) {
        this.startedAt = System.currentTimeMillis()
        this.plannedSeconds = plannedSeconds
        this.allowList = allow
        this.distractionAttempts = 0
        blocked.clear()
        isActive = true
    }

    fun recordDistraction(pkg: String) {
        distractionAttempts += 1
        blocked[pkg] = (blocked[pkg] ?: 0) + 1
    }

    fun emergencyOverride() = finish(completed = false)

    fun complete() = finish(completed = true)

    private fun finish(completed: Boolean) {
        if (!isActive) return
        isActive = false
        val actual = ((System.currentTimeMillis() - startedAt) / 1000).toInt()
        val snapshot = SessionRecord(
            startedAt = startedAt,
            actualSeconds = actual,
            plannedSeconds = plannedSeconds,
            distractionAttempts = distractionAttempts,
            blockedApps = blocked.toMap(),
            completed = completed,
        )
        scope.launch { StrictSessionRepository.upload(snapshot) }
    }
}

data class SessionRecord(
    val startedAt: Long,
    val actualSeconds: Int,
    val plannedSeconds: Int,
    val distractionAttempts: Int,
    val blockedApps: Map<String, Int>,
    val completed: Boolean,
)

/**
 * Talks to the same Supabase project the web app uses (VITE_SUPABASE_URL).
 * Implement with the Supabase Kotlin SDK or plain OkHttp against the
 * PostgREST endpoint. Left as a stub so the schema migration can land
 * separately.
 */
object StrictSessionRepository {
    suspend fun upload(record: SessionRecord) {
        // TODO: POST to /rest/v1/strict_sessions with the authenticated
        // user's JWT (Supabase Auth). Mirror row shape from the web
        // implementation in src/lib/strict-mode.ts.
    }
}
