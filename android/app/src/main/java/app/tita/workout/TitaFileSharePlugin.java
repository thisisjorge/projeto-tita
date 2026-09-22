package app.tita.workout;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "TitaFileShare")
public class TitaFileSharePlugin extends Plugin {

    @PluginMethod
    public void shareFile(PluginCall call) {
        String requestedName = call.getString("fileName");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType");
        String text = call.getString("text");

        if (requestedName == null || requestedName.trim().isEmpty()) {
            call.reject("fileName is required");
            return;
        }

        if (content == null) {
            call.reject("content is required");
            return;
        }

        if (mimeType == null || mimeType.trim().isEmpty()) {
            mimeType = "application/json";
        }

        try {
            String safeName = requestedName.replaceAll("[^a-zA-Z0-9._-]", "_");
            File shareDir = new File(getContext().getCacheDir(), "shares");
            if (!shareDir.exists() && !shareDir.mkdirs()) {
                call.reject("Unable to create temporary share directory");
                return;
            }

            File outputFile = new File(shareDir, safeName);
            try (FileOutputStream stream = new FileOutputStream(outputFile, false)) {
                stream.write(content.getBytes(StandardCharsets.UTF_8));
                stream.flush();
            }

            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                outputFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            if (text != null && !text.trim().isEmpty()) {
                shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            }
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.setClipData(android.content.ClipData.newRawUri(safeName, contentUri));

            Intent chooser = Intent.createChooser(shareIntent, "Compartilhar Backup Titã");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to share file: " + error.getMessage(), error);
        }
    }
}
