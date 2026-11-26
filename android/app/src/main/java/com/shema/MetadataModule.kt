package com.shema

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

class MetadataDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
    companion object {
        const val DATABASE_NAME = "CallVaultMetadata.db"
        const val DATABASE_VERSION = 1
        const val TABLE_RECORDINGS = "recordings"

        const val COL_ID = "id"
        const val COL_CALL_TYPE = "call_type"
        const val COL_DURATION = "duration"
        const val COL_FILE_FORMAT = "file_format"
        const val COL_ENCRYPTED_FILE_PATH = "encrypted_file_path"
        const val COL_FILE_SIZE = "file_size"
        const val COL_UPLOAD_STATUS = "upload_status"
        const val COL_CREATED_AT = "created_at"
        const val COL_UPLOADED_AT = "uploaded_at"
        const val COL_VERIFIED_AT = "verified_at"
        const val COL_PHONE_NUMBER = "phone_number"
        const val COL_CONTACT_NAME = "contact_name"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createTableQuery = ("CREATE TABLE " + TABLE_RECORDINGS + "("
                + COL_ID + " TEXT PRIMARY KEY,"
                + COL_CALL_TYPE + " TEXT,"
                + COL_DURATION + " INTEGER,"
                + COL_FILE_FORMAT + " TEXT,"
                + COL_ENCRYPTED_FILE_PATH + " TEXT,"
                + COL_FILE_SIZE + " INTEGER,"
                + COL_UPLOAD_STATUS + " TEXT,"
                + COL_CREATED_AT + " TEXT,"
                + COL_UPLOADED_AT + " TEXT,"
                + COL_VERIFIED_AT + " TEXT,"
                + COL_PHONE_NUMBER + " TEXT,"
                + COL_CONTACT_NAME + " TEXT" + ")")
        db.execSQL(createTableQuery)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_RECORDINGS")
        onCreate(db)
    }
}

class MetadataModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val dbHelper = MetadataDatabaseHelper(reactContext)

    override fun getName(): String = "MetadataModule"

    @ReactMethod
    fun insertRecording(metadataJsonStr: String, promise: Promise) {
        try {
            val json = JSONObject(metadataJsonStr)
            val db = dbHelper.writableDatabase
            val values = ContentValues().apply {
                put(MetadataDatabaseHelper.COL_ID, json.getString("id"))
                put(MetadataDatabaseHelper.COL_CALL_TYPE, json.getString("callType"))
                put(MetadataDatabaseHelper.COL_DURATION, json.getInt("duration"))
                put(MetadataDatabaseHelper.COL_FILE_FORMAT, json.getString("fileFormat"))
                put(MetadataDatabaseHelper.COL_ENCRYPTED_FILE_PATH, json.getString("encryptedFilePath"))
                put(MetadataDatabaseHelper.COL_FILE_SIZE, json.getLong("fileSize"))
                put(MetadataDatabaseHelper.COL_UPLOAD_STATUS, json.getString("uploadStatus"))
                put(MetadataDatabaseHelper.COL_CREATED_AT, json.getString("createdAt"))
                put(MetadataDatabaseHelper.COL_UPLOADED_AT, json.optString("uploadedAt", ""))
                put(MetadataDatabaseHelper.COL_VERIFIED_AT, json.optString("verifiedAt", ""))
                put(MetadataDatabaseHelper.COL_PHONE_NUMBER, json.optString("phoneNumber", ""))
                put(MetadataDatabaseHelper.COL_CONTACT_NAME, json.optString("contactName", ""))
            }

            val result = db.insertWithOnConflict(
                MetadataDatabaseHelper.TABLE_RECORDINGS,
                null,
                values,
                SQLiteDatabase.CONFLICT_REPLACE
            )
            if (result != -1L) {
                promise.resolve(true)
            } else {
                promise.reject("DB_INSERT_ERROR", "Failed to insert recording metadata into database")
            }
        } catch (e: Exception) {
            promise.reject("METADATA_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getRecordings(promise: Promise) {
        try {
            val db = dbHelper.readableDatabase
            val cursor = db.query(
                MetadataDatabaseHelper.TABLE_RECORDINGS,
                null,
                null,
                null,
                null,
                null,
                "${MetadataDatabaseHelper.COL_CREATED_AT} DESC"
            )

            val jsonArray = JSONArray()
            while (cursor.moveToNext()) {
                val obj = JSONObject().apply {
                    put("id", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_ID)))
                    put("callType", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_CALL_TYPE)))
                    put("duration", cursor.getInt(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_DURATION)))
                    put("fileFormat", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_FILE_FORMAT)))
                    put("encryptedFilePath", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_ENCRYPTED_FILE_PATH)))
                    put("fileSize", cursor.getLong(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_FILE_SIZE)))
                    put("uploadStatus", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_UPLOAD_STATUS)))
                    put("createdAt", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_CREATED_AT)))
                    put("uploadedAt", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_UPLOADED_AT)))
                    put("verifiedAt", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_VERIFIED_AT)))
                    put("phoneNumber", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_PHONE_NUMBER)))
                    put("contactName", cursor.getString(cursor.getColumnIndexOrThrow(MetadataDatabaseHelper.COL_CONTACT_NAME)))
                }
                jsonArray.put(obj)
            }
            cursor.close()
            promise.resolve(jsonArray.toString())
        } catch (e: Exception) {
            promise.reject("METADATA_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateUploadStatus(id: String, status: String, promise: Promise) {
        try {
            val db = dbHelper.writableDatabase
            val values = ContentValues().apply {
                put(MetadataDatabaseHelper.COL_UPLOAD_STATUS, status)
                if (status == "uploaded") {
                    put(MetadataDatabaseHelper.COL_UPLOADED_AT, java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date()))
                } else if (status == "verified") {
                    put(MetadataDatabaseHelper.COL_VERIFIED_AT, java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date()))
                }
            }
            val rows = db.update(
                MetadataDatabaseHelper.TABLE_RECORDINGS,
                values,
                "${MetadataDatabaseHelper.COL_ID} = ?",
                arrayOf(id)
            )
            promise.resolve(rows > 0)
        } catch (e: Exception) {
            promise.reject("METADATA_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun deleteRecording(id: String, promise: Promise) {
        try {
            val db = dbHelper.writableDatabase
            val rows = db.delete(
                MetadataDatabaseHelper.TABLE_RECORDINGS,
                "${MetadataDatabaseHelper.COL_ID} = ?",
                arrayOf(id)
            )
            promise.resolve(rows > 0)
        } catch (e: Exception) {
            promise.reject("METADATA_ERROR", e.message, e)
        }
    }
}
