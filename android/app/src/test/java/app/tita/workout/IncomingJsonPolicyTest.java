package app.tita.workout;

import static org.junit.Assert.*;
import org.junit.Test;

public class IncomingJsonPolicyTest {
    @Test public void jsonMimesAreAccepted() {
        assertTrue(IncomingJsonPolicy.accepts("application/json", "arquivo"));
        assertTrue(IncomingJsonPolicy.accepts("text/json; charset=utf-8", "arquivo"));
    }

    @Test public void genericMimeRequiresJsonName() {
        assertTrue(IncomingJsonPolicy.accepts("application/octet-stream", "treino.JSON"));
        assertTrue(IncomingJsonPolicy.accepts("text/plain", "backup.json"));
        assertTrue(IncomingJsonPolicy.accepts(null, "backup.json"));
        assertFalse(IncomingJsonPolicy.accepts("text/plain", "foto.png"));
        assertFalse(IncomingJsonPolicy.accepts("text/plain", "arquivo"));
        assertFalse(IncomingJsonPolicy.accepts("application/pdf", "arquivo.json"));
    }

    @Test public void emptyAndOversizedFilesAreRejected() {
        assertFalse(IncomingJsonPolicy.validSize(0));
        assertTrue(IncomingJsonPolicy.validSize(5_000_000));
        assertFalse(IncomingJsonPolicy.validSize(5_000_001));
    }
}
