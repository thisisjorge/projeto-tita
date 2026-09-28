package app.tita.workout;

import java.util.Locale;

final class IncomingJsonPolicy {
    static final int MAX_BYTES = 5_000_000;

    private IncomingJsonPolicy() {}

    static boolean accepts(String mimeType, String fileName) {
        String mime = mimeType == null ? "" : mimeType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if (mime.equals("application/json") || mime.equals("text/json")) return true;
        if (!mime.isEmpty() && !mime.equals("application/octet-stream") && !mime.equals("text/plain")) return false;
        return fileName != null && fileName.toLowerCase(Locale.ROOT).endsWith(".json");
    }

    static boolean validSize(long bytes) {
        return bytes > 0 && bytes <= MAX_BYTES;
    }
}
