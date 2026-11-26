package com.shema

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class CallVaultSyncWorker(
    val appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val url = URL("https://shema-f5gd.onrender.com/api/v1/health")
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.requestMethod = "GET"
            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                // Signal that background sync is needed when the app returns to foreground
                CallVaultPreferences.setSyncNeeded(appContext, true)
                CallVaultNativeEvents.backgroundSyncNeeded(appContext)
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
