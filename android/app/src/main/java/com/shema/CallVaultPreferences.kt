package com.shema

import android.content.Context
import org.json.JSONObject

object CallVaultPreferences {
    private const val FILE = "callvault_recording"
    private const val MONITORING = "monitoring_enabled"
    private const val AUTO_MIC = "automatic_microphone_enabled"
    private const val CONSENT = "microphone_consent_granted"
    private const val LAST_EVENT = "last_call_event"

    private fun prefs(context: Context) = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun monitoringEnabled(context: Context) = prefs(context).getBoolean(MONITORING, false)
    fun automaticMicrophoneEnabled(context: Context) = prefs(context).getBoolean(AUTO_MIC, false)
    fun consentGranted(context: Context) = prefs(context).getBoolean(CONSENT, false)

    fun saveConfiguration(context: Context, monitoring: Boolean, autoMicrophone: Boolean, consent: Boolean) {
        prefs(context).edit()
            .putBoolean(MONITORING, monitoring)
            .putBoolean(AUTO_MIC, autoMicrophone)
            .putBoolean(CONSENT, consent)
            .apply()
    }

    fun saveCallEvent(context: Context, eventType: String, direction: String, phoneNumber: String?, contactName: String?) {
        if (!monitoringEnabled(context)) return
        val event = JSONObject()
            .put("eventId", java.util.UUID.randomUUID().toString())
            .put("eventType", eventType)
            .put("timestamp", System.currentTimeMillis())
            .put("callDirection", direction)
            .put("phoneNumber", phoneNumber ?: "")
            .put("contactName", contactName ?: "")
            .put("source", "android_telephony")
        prefs(context).edit().putString(LAST_EVENT, event.toString()).apply()
    }

    fun lastCallEvent(context: Context): String? = prefs(context).getString(LAST_EVENT, null)

    fun setSyncNeeded(context: Context, needed: Boolean) {
        prefs(context).edit().putBoolean("sync_needed", needed).apply()
    }

    fun isSyncNeeded(context: Context): Boolean = prefs(context).getBoolean("sync_needed", false)
}
