package com.shema

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallDetectionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val telephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyCallback: Any? = null
    private var isListening = false

    override fun getName(): String = "CallDetectionModule"

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        val permission = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.READ_PHONE_STATE
        )
        promise.resolve(permission == PackageManager.PERMISSION_GRANTED)
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        if (isListening) {
            promise.resolve(true)
            return
        }

        val permission = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.READ_PHONE_STATE
        )
        if (permission != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "READ_PHONE_STATE permission is not granted.")
            return
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val cb = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) {
                        handleCallState(state, "")
                    }
                }
                telephonyCallback = cb
                telephonyManager.registerTelephonyCallback(reactApplicationContext.mainExecutor, cb)
            } else {
                @Suppress("DEPRECATION")
                val listener = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        super.onCallStateChanged(state, phoneNumber)
                        handleCallState(state, phoneNumber ?: "")
                    }
                }
                phoneStateListener = listener
                @Suppress("DEPRECATION")
                telephonyManager.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
            }
            isListening = true
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LISTENING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        try {
            if (!isListening) {
                promise.resolve(true)
                return
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (telephonyCallback is TelephonyCallback) {
                    telephonyManager.unregisterTelephonyCallback(telephonyCallback as TelephonyCallback)
                }
                telephonyCallback = null
            } else {
                if (phoneStateListener != null) {
                    @Suppress("DEPRECATION")
                    telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
                }
                phoneStateListener = null
            }
            isListening = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    private fun handleCallState(state: Int, phoneNumber: String) {
        val map = Arguments.createMap()
        val eventType: String
        val callDirection: String

        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                eventType = "incoming_ringing"
                callDirection = "incoming"
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                eventType = "call_active"
                callDirection = "unknown"
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                eventType = "call_ended"
                callDirection = "unknown"
            }
            else -> {
                return
            }
        }

        map.putString("eventId", java.util.UUID.randomUUID().toString())
        map.putString("eventType", eventType)
        map.putDouble("timestamp", System.currentTimeMillis().toDouble())
        map.putString("callDirection", callDirection)
        map.putString("source", "android_telephony")
        map.putString("phoneNumber", phoneNumber)

        sendEvent("CallStateChanged", map)
    }
}
