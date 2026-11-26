package com.shema

import android.content.Context
import androidx.work.*
import com.facebook.react.bridge.*
import java.util.concurrent.TimeUnit

class WorkManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val UNIQUE_WORK_NAME = "CallVaultBackgroundSync"

    override fun getName(): String = "WorkManagerModule"

    @ReactMethod
    fun scheduleSync(intervalMinutes: Int, promise: Promise) {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<CallVaultSyncWorker>(
                intervalMinutes.toLong().coerceAtLeast(15),
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(reactApplicationContext).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WORK_MANAGER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelSync(promise: Promise) {
        try {
            WorkManager.getInstance(reactApplicationContext).cancelUniqueWork(UNIQUE_WORK_NAME)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WORK_MANAGER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun triggerImmediateSync(promise: Promise) {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<CallVaultSyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(reactApplicationContext).enqueue(workRequest)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WORK_MANAGER_ERROR", e.message, e)
        }
    }
}
