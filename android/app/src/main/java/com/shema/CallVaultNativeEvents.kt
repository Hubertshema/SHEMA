package com.shema

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/** Bridges native completion events into the existing JavaScript sync orchestrator when it is alive. */
object CallVaultNativeEvents {
    private var reactContext: ReactApplicationContext? = null

    fun attach(context: ReactApplicationContext) { reactContext = context }

    fun recordingQueued(id: String) {
        val context = reactContext ?: return
        if (!context.hasActiveReactInstance()) return
        val payload = Arguments.createMap().apply { putString("recordingId", id) }
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("CallVaultRecordingQueued", payload)
    }

    fun backgroundSyncNeeded(context: android.content.Context) {
        val reactCtx = reactContext ?: return
        if (!reactCtx.hasActiveReactInstance()) return
        reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("CallVaultBackgroundSyncNeeded", Arguments.createMap())
    }
}
