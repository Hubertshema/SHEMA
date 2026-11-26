package com.shema

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import android.telephony.TelephonyManager

/**
 * Persists call-state events while the React process is not running. This receiver
 * deliberately does not start microphone capture: recent Android versions prohibit
 * starting a microphone foreground service from the background in many situations.
 */
class PhoneStateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED || !CallVaultPreferences.monitoringEnabled(context)) return
        val phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
        val contactName = lookupContactName(context, phoneNumber)
        when (intent.getStringExtra(TelephonyManager.EXTRA_STATE)) {
            TelephonyManager.EXTRA_STATE_RINGING -> CallVaultPreferences.saveCallEvent(context, "incoming_ringing", "incoming", phoneNumber, contactName)
            TelephonyManager.EXTRA_STATE_OFFHOOK -> CallVaultPreferences.saveCallEvent(context, "call_active", "unknown", phoneNumber, contactName)
            TelephonyManager.EXTRA_STATE_IDLE -> CallVaultPreferences.saveCallEvent(context, "call_ended", "unknown", phoneNumber, contactName)
        }
    }

    private fun lookupContactName(context: Context, phoneNumber: String?): String? {
        if (phoneNumber == null || phoneNumber.isEmpty()) return null
        return try {
            val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(phoneNumber))
            val projection = arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME)
            val cursor: Cursor? = context.contentResolver.query(uri, projection, null, null, null)
            cursor?.use { c ->
                if (c.moveToFirst()) {
                    c.getString(c.getColumnIndexOrThrow(ContactsContract.PhoneLookup.DISPLAY_NAME))
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }
}
