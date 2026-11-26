package com.shema

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.telephony.TelephonyManager
import com.facebook.react.bridge.*
import androidx.core.content.ContextCompat
import org.json.JSONObject

class RecordingControlModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    init { CallVaultNativeEvents.attach(context) }
    override fun getName() = "RecordingControlModule"

    @ReactMethod fun addListener(eventName: String) = Unit
    @ReactMethod fun removeListeners(count: Double) = Unit

    @ReactMethod
    fun getStatus(promise: Promise) {
        val map = Arguments.createMap()
        val phoneGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
        val microphoneGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        map.putBoolean("phoneStatePermissionGranted", phoneGranted)
        map.putBoolean("microphonePermissionGranted", microphoneGranted)
        map.putBoolean("monitoringEnabled", CallVaultPreferences.monitoringEnabled(context))
        map.putBoolean("automaticMicrophoneEnabled", CallVaultPreferences.automaticMicrophoneEnabled(context))
        map.putBoolean("consentGranted", CallVaultPreferences.consentGranted(context))
        map.putBoolean("microphoneRecordingSupported", true)
        map.putBoolean("twoSidedCellularRecordingSupported", false)
        map.putString("manufacturer", Build.MANUFACTURER)
        map.putString("model", Build.MODEL)
        map.putInt("apiLevel", Build.VERSION.SDK_INT)
        CallVaultPreferences.lastCallEvent(context)?.let {
            try { map.putMap("lastCallEvent", jsonToMap(JSONObject(it))) } catch (_: Exception) { }
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun configure(monitoring: Boolean, automaticMicrophone: Boolean, consent: Boolean, promise: Promise) {
        val phoneGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
        val micGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (monitoring && !phoneGranted) { promise.reject("PHONE_PERMISSION_REQUIRED", "Phone-state permission is required for monitoring."); return }
        if (automaticMicrophone && (!consent || !micGranted)) { promise.reject("MICROPHONE_REQUIREMENTS", "Explicit consent and microphone permission are required."); return }
        CallVaultPreferences.saveConfiguration(context, monitoring, automaticMicrophone, consent)
        if (automaticMicrophone) MicrophoneRecordingService.start(context) else MicrophoneRecordingService.stop(context)
        promise.resolve(true)
    }

    @ReactMethod
    fun getSyncNeeded(promise: Promise) {
        promise.resolve(CallVaultPreferences.isSyncNeeded(context));
    }

    @ReactMethod
    fun clearSyncNeeded(promise: Promise) {
        CallVaultPreferences.setSyncNeeded(context, false);
        promise.resolve(true);
    }

    @ReactMethod
    fun getDevicePhoneNumber(promise: Promise) {
        var identifier: String? = null
        try {
            val hasPhonePerm = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED
            if (hasPhonePerm) {
                val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                @Suppress("DEPRECATION")
                identifier = telephonyManager.line1Number
            }
        } catch (_: Exception) {
            // Permission or carrier restriction; fall back to ANDROID_ID below
        }

        if (identifier.isNullOrBlank()) {
            identifier = try {
                Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            } catch (_: Exception) {
                null
            }
        }

        promise.resolve(identifier ?: "")
    }

    private fun jsonToMap(json: JSONObject): WritableMap {
        val map = Arguments.createMap()
        json.keys().forEach { key ->
            when (val value = json.get(key)) {
                is Boolean -> map.putBoolean(key, value)
                is Number -> map.putDouble(key, value.toDouble())
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }
}
