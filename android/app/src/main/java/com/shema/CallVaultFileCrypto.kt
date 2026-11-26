package com.shema

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Shared AES-256-GCM implementation backed by Android Keystore. */
object CallVaultFileCrypto {
    private const val KEY_ALIAS = "CallVaultMasterKey"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val IV_LENGTH = 12
    private const val TAG_LENGTH_BITS = 128

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (!store.containsAlias(KEY_ALIAS)) {
            val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
            generator.init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build())
            generator.generateKey()
        }
        return (store.getEntry(KEY_ALIAS, null) as KeyStore.SecretKeyEntry).secretKey
    }

    fun encrypt(source: File, destination: File) {
        require(source.isFile && source.length() > 0) { "Source recording is missing or empty" }
        destination.parentFile?.mkdirs()
        val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
        FileInputStream(source).use { input ->
            FileOutputStream(destination).use { output ->
                output.write(cipher.iv)
                val buffer = ByteArray(8192)
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    cipher.update(buffer, 0, count)?.let(output::write)
                }
                cipher.doFinal()?.let(output::write)
            }
        }
    }

    /** Reads through the whole cipher text so GCM authentication is actually checked. */
    fun verify(file: File): Boolean {
        return try {
            if (!file.isFile || file.length() <= IV_LENGTH + 16) return false
            FileInputStream(file).use { input ->
                val iv = ByteArray(IV_LENGTH)
                if (input.read(iv) != IV_LENGTH) return false
                val cipher = Cipher.getInstance(TRANSFORMATION).apply {
                    init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_LENGTH_BITS, iv))
                }
                val buffer = ByteArray(8192)
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    cipher.update(buffer, 0, count)
                }
                cipher.doFinal()
            }
            true
        } catch (_: Exception) {
            false
        }
    }
}
