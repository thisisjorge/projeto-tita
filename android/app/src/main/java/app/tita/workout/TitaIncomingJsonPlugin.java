package app.tita.workout;

import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@CapacitorPlugin(name = "TitaIncomingJson")
public class TitaIncomingJsonPlugin extends Plugin {
    private static final String PREFS = "tita_incoming_json";
    private static final String HANDLED = "app.tita.workout.INCOMING_HANDLED";

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null || intent.getBooleanExtra(HANDLED, false)) return;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_VIEW.equals(action)) return;

        getActivity().setIntent(intent);
        String source = Intent.ACTION_SEND.equals(action) ? "android-share" : "android-open";
        Uri uri;
        try {
            uri = Intent.ACTION_VIEW.equals(action) ? intent.getData() : streamUri(intent);
        } catch (Exception invalidUri) {
            uri = null;
        }
        String signature = action + ":" + (uri == null ? "missing" : uri);
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
        if (prefs.contains("id") && signature.equals(prefs.getString("signature", ""))) {
            intent.putExtra(HANDLED, true);
            return;
        }

        String mime = intent.getType();
        String name = uri == null ? "arquivo" : displayName(uri);
        if (uri == null) {
            storeError(name, mime, source, signature, "O compartilhamento não contém um arquivo JSON.");
            intent.putExtra(HANDLED, true);
            return;
        }
        if (mime == null) {
            try {
                mime = getContext().getContentResolver().getType(uri);
            } catch (Exception metadataError) {
                String message = metadataError instanceof SecurityException
                    ? "Sem permissão para ler o arquivo compartilhado."
                    : "Não foi possível ler o arquivo compartilhado.";
                storeError(name, null, source, signature, message);
                intent.putExtra(HANDLED, true);
                return;
            }
        }
        if (!IncomingJsonPolicy.accepts(mime, name)) {
            storeError(name, mime, source, signature, "Este arquivo não é um JSON compatível com o Titã.");
            intent.putExtra(HANDLED, true);
            return;
        }

        long reportedSize = reportedSize(uri);
        if (reportedSize > IncomingJsonPolicy.MAX_BYTES) {
            storeError(name, mime, source, signature, "Selecione um JSON de até 5 MB.");
            intent.putExtra(HANDLED, true);
            return;
        }

        String id = UUID.randomUUID().toString();
        File file = new File(getContext().getFilesDir(), "incoming-" + id + ".json");
        long size = 0;
        try (InputStream input = getContext().getContentResolver().openInputStream(uri);
             FileOutputStream output = new FileOutputStream(file)) {
            if (input == null) throw new IllegalArgumentException("Não foi possível abrir o arquivo.");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                size += count;
                if (size > IncomingJsonPolicy.MAX_BYTES) {
                    throw new IllegalArgumentException("Selecione um JSON de até 5 MB.");
                }
                output.write(buffer, 0, count);
            }
            if (!IncomingJsonPolicy.validSize(size)) throw new IllegalArgumentException("O arquivo está vazio.");
            deletePrevious(prefs);
            prefs.edit()
                .putString("id", id)
                .putString("path", file.getAbsolutePath())
                .putString("name", name)
                .putString("mime", mime)
                .putString("source", source)
                .putString("signature", signature)
                .putLong("size", size)
                .remove("error")
                .apply();
            intent.putExtra(HANDLED, true);
            announce(id);
        } catch (Exception error) {
            file.delete();
            String message = error instanceof SecurityException
                ? "Sem permissão para ler o arquivo compartilhado."
                : error instanceof IllegalArgumentException ? error.getMessage()
                : "Não foi possível ler o arquivo compartilhado.";
            storeError(name, mime, source, signature, message);
            intent.putExtra(HANDLED, true);
        }
    }

    @PluginMethod
    public void getPendingSharedFile(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
        JSObject result = new JSObject();
        String id = prefs.getString("id", null);
        result.put("present", id != null);
        if (id == null) {
            call.resolve(result);
            return;
        }
        result.put("id", id);
        result.put("name", prefs.getString("name", "arquivo.json"));
        result.put("mimeType", prefs.getString("mime", "application/json"));
        result.put("source", prefs.getString("source", "android-share"));
        result.put("size", prefs.getLong("size", 0));
        String error = prefs.getString("error", null);
        if (error != null) {
            result.put("error", error);
        } else {
            String path = prefs.getString("path", "");
            try (FileInputStream input = new FileInputStream(path);
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                result.put("text", output.toString(StandardCharsets.UTF_8.name()));
            } catch (Exception readError) {
                result.put("error", "O arquivo recebido não está mais disponível.");
            }
        }
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledgeSharedFile(PluginCall call) {
        String id = call.getString("id");
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
        if (id != null && id.equals(prefs.getString("id", null))) {
            deletePrevious(prefs);
            prefs.edit().clear().apply();
        }
        call.resolve();
    }

    private Uri streamUri(Intent intent) {
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
            if (uri != null) return uri;
        } else {
            @SuppressWarnings("deprecation")
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri != null) return uri;
        }
        return intent.getClipData() != null && intent.getClipData().getItemCount() > 0
            ? intent.getClipData().getItemAt(0).getUri() : null;
    }

    private String displayName(Uri uri) {
        String name = null;
        try (Cursor cursor = getContext().getContentResolver().query(uri,
                new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) name = cursor.getString(0);
        } catch (Exception ignored) {
            // Providers may not expose metadata; the URI segment is only a display fallback.
        }
        if (name == null || name.isEmpty()) name = uri.getLastPathSegment();
        if (name == null || name.isEmpty()) return "arquivo";
        name = name.replaceAll("[\\\\/\\p{Cntrl}]", "_");
        return name.length() > 180 ? name.substring(name.length() - 180) : name;
    }

    private long reportedSize(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri,
                new String[] { OpenableColumns.SIZE }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0)) return cursor.getLong(0);
        } catch (Exception ignored) {
            // The stream limit remains authoritative when the provider omits size.
        }
        return -1;
    }

    private void storeError(String name, String mime, String source, String signature, String message) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
        deletePrevious(prefs);
        String id = UUID.randomUUID().toString();
        prefs.edit().clear()
            .putString("id", id)
            .putString("name", name)
            .putString("mime", mime)
            .putString("source", source)
            .putString("signature", signature)
            .putString("error", message)
            .apply();
        announce(id);
    }

    private void deletePrevious(SharedPreferences prefs) {
        String path = prefs.getString("path", null);
        if (path != null) new File(path).delete();
    }

    private void announce(String id) {
        JSObject event = new JSObject();
        event.put("id", id);
        notifyListeners("sharedFileReceived", event, true);
    }
}
