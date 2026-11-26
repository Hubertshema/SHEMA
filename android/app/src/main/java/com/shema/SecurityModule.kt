package com.shema

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecurityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val KEY_ALIAS = "CallVaultMasterKey"
    private val TRANSFORMATION = "AES/GCM/NoPadding"
    private val ANDROID_KEYSTORE = "AndroidKeyStore"
    private val TAG_LENGTH_BIT = 128
    private val IV_LENGTH_BYTE = 12

    override fun getName(): String = "SecurityModule"

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            val parameterSpec = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
            keyGenerator.init(parameterSpec)
            keyGenerator.generateKey()
        }
        val entry = keyStore.getEntry(KEY_ALIAS, null) as KeyStore.SecretKeyEntry
        return entry.secretKey
    }

    @ReactMethod
    fun encryptFile(sourcePath: String, recordingId: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val encryptedDir = File(context.filesDir, "callvault/encrypted")
            if (!encryptedDir.exists()) {
                encryptedDir.mkdirs()
            }
            val destinationFile = File(encryptedDir, "recording_$recordingId.enc")

            val secretKey = getOrCreateSecretKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            val iv = cipher.iv

            val sourceFile = File(sourcePath)
            if (!sourceFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Source file not found at: $sourcePath")
                return
            }

            val inputStream = FileInputStream(sourceFile)
            val outputStream = FileOutputStream(destinationFile)

            // Write IV first (12 bytes)
            outputStream.write(iv)

            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                val encryptedBytes = cipher.update(buffer, 0, bytesRead)
                if (encryptedBytes != null) {
                    outputStream.write(encryptedBytes)
                }
            }
            val finalBytes = cipher.doFinal()
            if (finalBytes != null) {
                outputStream.write(finalBytes)
            }

            inputStream.close()
            outputStream.close()

            promise.resolve(destinationFile.absolutePath)
        } catch (e: Exception) {
            promise.reject("ENCRYPTION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun decryptFile(encryptedPath: String, destinationPath: String, promise: Promise) {
        try {
            val encryptedFile = File(encryptedPath)
            if (!encryptedFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Encrypted file not found at: $encryptedPath")
                return
            }

            val secretKey = getOrCreateSecretKey()
            val inputStream = FileInputStream(encryptedFile)

            val iv = ByteArray(IV_LENGTH_BYTE)
            val readIvBytes = inputStream.read(iv)
            if (readIvBytes != IV_LENGTH_BYTE) {
                inputStream.close()
                promise.reject("DECRYPTION_ERROR", "Invalid encrypted file: missing or incomplete IV")
                return
            }

            val cipher = Cipher.getInstance(TRANSFORMATION)
            val spec = GCMParameterSpec(TAG_LENGTH_BIT, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            val destinationFile = File(destinationPath)
            val outputStream = FileOutputStream(destinationFile)

            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                val decryptedBytes = cipher.update(buffer, 0, bytesRead)
                if (decryptedBytes != null) {
                    outputStream.write(decryptedBytes)
                }
            }
            val finalBytes = cipher.doFinal()
            if (finalBytes != null) {
                outputStream.write(finalBytes)
            }

            inputStream.close()
            outputStream.close()

            promise.resolve(destinationFile.absolutePath)
        } catch (e: Exception) {
            promise.reject("DECRYPTION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun verifyEncryptedFile(encryptedPath: String, promise: Promise) {
        try {
            val file = File(encryptedPath)
            promise.resolve(CallVaultFileCrypto.verify(file))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun deleteEncryptedFile(encryptedPath: String, promise: Promise) {
        try {
            val file = File(encryptedPath)
            if (file.exists()) {
                file.delete()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DELETION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun storeSecureString(key: String, value: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val secureFile = File(context.filesDir, "callvault/secure_prefs.enc")
            if (secureFile.parentFile?.exists() == false) {
                secureFile.parentFile?.mkdirs()
            }

            val json = if (secureFile.exists() && secureFile.length() > IV_LENGTH_BYTE) {
                try {
                    val decryptedStr = decryptStringInternal(secureFile)
                    JSONObject(decryptedStr)
                } catch (e: Exception) {
                    JSONObject()
                }
            } else {
                JSONObject()
            }

            json.put(key, value)
            encryptStringInternal(secureFile, json.toString())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SECURE_STORAGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getSecureString(key: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val secureFile = File(context.filesDir, "callvault/secure_prefs.enc")
            if (!secureFile.exists() || secureFile.length() <= IV_LENGTH_BYTE) {
                promise.resolve(null)
                return
            }
            val decryptedStr = decryptStringInternal(secureFile)
            val json = JSONObject(decryptedStr)
            val value = if (json.has(key)) json.getString(key) else null
            promise.resolve(value)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun removeSecureString(key: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val secureFile = File(context.filesDir, "callvault/secure_prefs.enc")
            if (secureFile.exists() && secureFile.length() > IV_LENGTH_BYTE) {
                val decryptedStr = decryptStringInternal(secureFile)
                val json = JSONObject(decryptedStr)
                json.remove(key)
                encryptStringInternal(secureFile, json.toString())
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SECURE_STORAGE_ERROR", e.message, e)
        }
    }

    private fun encryptStringInternal(file: File, content: String) {
        val secretKey = getOrCreateSecretKey()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        val iv = cipher.iv
        val encryptedBytes = cipher.doFinal(content.toByteArray(Charsets.UTF_8))

        val outputStream = FileOutputStream(file)
        outputStream.write(iv)
        outputStream.write(encryptedBytes)
        outputStream.close()
    }

    private fun decryptStringInternal(file: File): String {
        val inputStream = FileInputStream(file)
        val iv = ByteArray(IV_LENGTH_BYTE)
        val readIv = inputStream.read(iv)
        if (readIv != IV_LENGTH_BYTE) {
            inputStream.close()
            return "{}"
        }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val spec = GCMParameterSpec(TAG_LENGTH_BIT, iv)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), spec)

        val encryptedBytes = inputStream.readBytes()
        inputStream.close()
        val decryptedBytes = cipher.doFinal(encryptedBytes)
        return String(decryptedBytes, Charsets.UTF_8)
    }

    @ReactMethod
    fun uploadFileToUrl(filePath: String, uploadUrl: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File not found at: $filePath")
                return
            }

            val url = URL(uploadUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "PUT"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/octet-stream")
            connection.setRequestProperty("Content-Length", file.length().toString())
            connection.connectTimeout = 60000
            connection.readTimeout = 60000

            val buffer = ByteArray(8192)
            val inputStream = FileInputStream(file)
            val outputStream = connection.outputStream

            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
            }
            outputStream.flush()
            outputStream.close()
            inputStream.close()

            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                promise.resolve(true)
            } else {
                val errorBody = connection.errorStream?.bufferedReader()?.readText() ?: ""
                promise.reject("UPLOAD_FAILED", "Upload failed with status $responseCode: $errorBody")
            }
            connection.disconnect()
        } catch (e: Exception) {
            promise.reject("UPLOAD_ERROR", e.message ?: "Unknown upload error", e)
        }
    }

    @ReactMethod
    fun computeFileChecksum(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File not found at: $filePath")
                return
            }

            val digest = MessageDigest.getInstance("SHA-256")
            val inputStream = FileInputStream(file)
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
            inputStream.close()

            val hashBytes = digest.digest()
            val hexString = hashBytes.joinToString("") { "%02x".format(it) }
            promise.resolve(hexString)
        } catch (e: Exception) {
            promise.reject("CHECKSUM_ERROR", e.message ?: "Unknown checksum error", e)
        }
    }
}
