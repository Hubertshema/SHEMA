package com.shema

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.database.Cursor
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.CallLog
import android.provider.ContactsContract
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.io.File
import java.util.UUID

/**
 * Opt-in, visible microphone-only capture. This service never uses VOICE_CALL or
 * another privileged call-audio source; it can record only the device microphone.
 */
class MicrophoneRecordingService : Service() {
    companion object {
        const val ACTION_START = "com.shema.action.START_MIC_MONITOR"
        const val ACTION_STOP = "com.shema.action.STOP_MIC_MONITOR"
        private const val CHANNEL_ID = "callvault_microphone_monitor"
        private const val NOTIFICATION_ID = 4101

        fun start(context: Context) {
            val intent = Intent(context, MicrophoneRecordingService::class.java).setAction(ACTION_START)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.startService(Intent(context, MicrophoneRecordingService::class.java).setAction(ACTION_STOP))
        }
    }

    private lateinit var telephonyManager: TelephonyManager
    private var callback: TelephonyCallback? = null
    private var legacyListener: PhoneStateListener? = null
    private var priorState = TelephonyManager.CALL_STATE_IDLE
    private var recorder: MediaRecorder? = null
    private var sessionId: String? = null
    private var rawFile: File? = null
    private var startedAt = 0L
    private var currentPhoneNumber: String? = null
    private var currentContactName: String? = null
    private var currentDirection: String = "unknown"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        showForeground("Call event monitoring is active. Microphone recording is visible and opt-in.")
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        registerCallStateCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            finalizeRecording()
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        unregisterCallStateCallback()
        finalizeRecording()
        super.onDestroy()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "CallVault microphone monitoring", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Shown whenever CallVault is monitoring call events or may use the microphone."
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun showForeground(message: String) {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("CallVault monitoring active")
            .setContentText(message)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun registerCallStateCallback() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) = onCallState(state, null)
            }
            telephonyManager.registerTelephonyCallback(mainExecutor, callback!!)
        } else {
            @Suppress("DEPRECATION")
            val listener = object : PhoneStateListener() {
                override fun onCallStateChanged(state: Int, phoneNumber: String?) = onCallState(state, phoneNumber)
            }
            legacyListener = listener
            @Suppress("DEPRECATION")
            telephonyManager.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
        }
    }

    private fun unregisterCallStateCallback() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) callback?.let { telephonyManager.unregisterTelephonyCallback(it) }
        else legacyListener?.let { @Suppress("DEPRECATION") telephonyManager.listen(it, PhoneStateListener.LISTEN_NONE) }
        callback = null
        legacyListener = null
    }

    private fun lookupContactName(phoneNumber: String?): String? {
        if (phoneNumber == null || phoneNumber.isEmpty()) return null
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) return null
        return try {
            val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(phoneNumber))
            val projection = arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME)
            val cursor: Cursor? = contentResolver.query(uri, projection, null, null, null)
            cursor?.use { c ->
                if (c.moveToFirst()) {
                    c.getString(c.getColumnIndexOrThrow(ContactsContract.PhoneLookup.DISPLAY_NAME))
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun resolveNumberFromLastEvent(): Pair<String?, String?> {
        val raw = CallVaultPreferences.lastCallEvent(this) ?: return null to null
        return try {
            val json = org.json.JSONObject(raw)
            val ts = json.optLong("timestamp", 0L)
            if (System.currentTimeMillis() - ts > 120_000L) return null to null
            val num = json.optString("phoneNumber", "").takeIf { it.isNotBlank() }
            val name = json.optString("contactName", "").takeIf { it.isNotBlank() }
                ?: lookupContactName(num)
            num to name
        } catch (_: Exception) {
            null to null
        }
    }

    private fun resolveFromCallLog(sinceMs: Long): Pair<String?, String?> {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            return null to null
        }
        return try {
            val projection = arrayOf(
                CallLog.Calls.NUMBER,
                CallLog.Calls.CACHED_NAME,
                CallLog.Calls.DATE
            )
            val cursor = contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                "${CallLog.Calls.DATE} >= ?",
                arrayOf((sinceMs - 15_000L).toString()),
                "${CallLog.Calls.DATE} DESC"
            )
            cursor?.use { c ->
                if (c.moveToFirst()) {
                    val number = c.getString(c.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                        ?.takeIf { it.isNotBlank() }
                    val cachedName = c.getString(c.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME))
                        ?.takeIf { it.isNotBlank() }
                    val contactName = cachedName ?: lookupContactName(number)
                    number to contactName
                } else null to null
            } ?: (null to null)
        } catch (_: Exception) {
            null to null
        }
    }

    private fun onCallState(state: Int, phoneNumber: String?) {
        if (state == priorState) return
        val previous = priorState
        priorState = state
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                currentDirection = "incoming"
                val (num, name) = if (!phoneNumber.isNullOrBlank()) {
                    phoneNumber to lookupContactName(phoneNumber)
                } else {
                    resolveNumberFromLastEvent()
                }
                currentPhoneNumber = num
                currentContactName = name
                CallVaultPreferences.saveCallEvent(this, "incoming_ringing", "incoming", currentPhoneNumber, currentContactName)
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                val direction = if (previous == TelephonyManager.CALL_STATE_RINGING) "incoming" else "outgoing"
                currentDirection = direction
                if (currentPhoneNumber.isNullOrBlank()) {
                    val (num, name) = if (!phoneNumber.isNullOrBlank()) {
                        phoneNumber to lookupContactName(phoneNumber)
                    } else {
                        resolveNumberFromLastEvent()
                    }
                    currentPhoneNumber = num
                    currentContactName = name
                }
                CallVaultPreferences.saveCallEvent(this, if (direction == "incoming") "incoming_active" else "outgoing_detected", direction, currentPhoneNumber, currentContactName)
                if (CallVaultPreferences.automaticMicrophoneEnabled(this) && CallVaultPreferences.consentGranted(this)) startMicrophoneRecording(direction)
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                if (previous == TelephonyManager.CALL_STATE_RINGING) CallVaultPreferences.saveCallEvent(this, "call_unanswered", "incoming", currentPhoneNumber, currentContactName)
                else CallVaultPreferences.saveCallEvent(this, "call_ended", currentDirection, currentPhoneNumber, currentContactName)
                finalizeRecording()
            }
        }
    }

    private fun startMicrophoneRecording(direction: String) {
        if (recorder != null || ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return
        val id = UUID.randomUUID().toString()
        val directory = File(filesDir, "callvault/recordings/raw").apply { mkdirs() }
        val output = File(directory, "recording_$id.m4a")
        try {
            val mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(this) else @Suppress("DEPRECATION") MediaRecorder()
            mediaRecorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(96_000)
                setAudioSamplingRate(44_100)
                setOutputFile(output.absolutePath)
                prepare()
                start()
            }
            recorder = mediaRecorder
            sessionId = id
            rawFile = output
            startedAt = System.currentTimeMillis()
            showForeground("Microphone recording active. It does not capture protected call audio.")
        } catch (_: Exception) {
            output.delete()
            recorder?.release()
            recorder = null
            CallVaultPreferences.saveCallEvent(this, "recording_error", direction, currentPhoneNumber, currentContactName)
        }
    }

    private fun finalizeRecording() {
        val activeRecorder = recorder ?: return
        val id = sessionId ?: return
        val source = rawFile ?: return
        recorder = null
        try {
            activeRecorder.stop()
        } catch (_: RuntimeException) {
            source.delete()
            activeRecorder.release()
            resetSession()
            return
        }
        activeRecorder.release()
        val durationSeconds = ((System.currentTimeMillis() - startedAt) / 1000).toInt()
        if (durationSeconds < 1 || !source.isFile || source.length() < 1024) {
            source.delete()
            resetSession()
            return
        }
        try {
            if (currentPhoneNumber.isNullOrBlank()) {
                val (num, name) = resolveFromCallLog(startedAt)
                if (!num.isNullOrBlank()) currentPhoneNumber = num
                if (!name.isNullOrBlank()) currentContactName = name
            }
            if (currentContactName.isNullOrBlank() && !currentPhoneNumber.isNullOrBlank()) {
                currentContactName = lookupContactName(currentPhoneNumber)
            }
            val encrypted = File(filesDir, "callvault/encrypted/recording_$id.enc")
            CallVaultFileCrypto.encrypt(source, encrypted)
            if (!CallVaultFileCrypto.verify(encrypted)) throw IllegalStateException("Encrypted file verification failed")
            insertQueuedRecording(id, encrypted, durationSeconds, currentDirection, currentPhoneNumber, currentContactName)
            CallVaultNativeEvents.recordingQueued(id)
            source.delete() // only after successful encryption, verification, and queue insertion
            WorkManager.getInstance(this).enqueueUniqueWork(
                "CallVaultImmediateSync", ExistingWorkPolicy.KEEP, OneTimeWorkRequestBuilder<CallVaultSyncWorker>().build()
            )
        } catch (_: Exception) {
            // Preserve the plaintext file for recovery if encryption or queueing fails.
        } finally {
            resetSession()
            showForeground("Call event monitoring is active. Microphone recording is ready when a supported session begins.")
        }
    }

    private fun insertQueuedRecording(id: String, encrypted: File, duration: Int, callType: String, phoneNumber: String?, contactName: String?) {
        val db = MetadataDatabaseHelper(this).writableDatabase
        val values = ContentValues().apply {
            put(MetadataDatabaseHelper.COL_ID, id)
            put(MetadataDatabaseHelper.COL_CALL_TYPE, callType)
            put(MetadataDatabaseHelper.COL_DURATION, duration)
            put(MetadataDatabaseHelper.COL_FILE_FORMAT, "m4a")
            put(MetadataDatabaseHelper.COL_ENCRYPTED_FILE_PATH, encrypted.absolutePath)
            put(MetadataDatabaseHelper.COL_FILE_SIZE, encrypted.length())
            put(MetadataDatabaseHelper.COL_UPLOAD_STATUS, "queued")
            put(MetadataDatabaseHelper.COL_CREATED_AT, java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date()))
            put(MetadataDatabaseHelper.COL_PHONE_NUMBER, phoneNumber ?: "")
            put(MetadataDatabaseHelper.COL_CONTACT_NAME, contactName ?: "")
        }
        if (db.insertWithOnConflict(MetadataDatabaseHelper.TABLE_RECORDINGS, null, values, android.database.sqlite.SQLiteDatabase.CONFLICT_IGNORE) == -1L) {
            throw IllegalStateException("Duplicate recording session")
        }
    }

    private fun resetSession() {
        sessionId = null
        rawFile = null
        startedAt = 0L
        currentPhoneNumber = null
        currentContactName = null
        currentDirection = "unknown"
    }
}
