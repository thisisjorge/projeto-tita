package app.tita.workout;

import static org.junit.Assert.*;
import org.junit.Test;

public class RestTimerStateTest {
    @Test public void runningUsesMonotonicDeadlineAndNeverGoesNegative() {
        RestTimerState timer = RestTimerState.start("one", "workout", 90, 100_000, 10_000, 5_000);
        assertEquals(RestTimerState.RUNNING, timer.status);
        assertEquals(55_000, timer.remainingMs(45_000, 40_000));
        assertEquals(0, timer.remainingMs(120_000, 120_000));
        assertEquals("one", timer.id);
    }

    @Test public void pauseResumeAndExtendUseSameTimer() {
        RestTimerState timer = RestTimerState.start("one", "workout", 90, 100_000, 10_000, 5_000);
        RestTimerState paused = timer.pause(40_000, 35_000);
        assertEquals(RestTimerState.PAUSED, paused.status);
        assertEquals(60_000, paused.remainingMs(70_000, 65_000));
        RestTimerState resumed = paused.resume(80_000, 70_000).extend(30);
        assertEquals("one", resumed.id);
        assertEquals(90_000, resumed.remainingMs(80_000, 70_000));
        assertEquals(120, resumed.durationSeconds);
        assertEquals(0, resumed.withStatus(RestTimerState.CANCELLED).remainingMs(80_000, 70_000));
    }

    @Test public void expiredAndRebootedStateIsDetectableAfterRestore() {
        RestTimerState restored = RestTimerState.start("one", null, 60, 70_000, 10_000, 5_000);
        assertTrue(restored.sameBoot(40_000, 35_000));
        assertFalse(restored.sameBoot(1_000_000, 1_000));
        assertEquals(0, restored.remainingMs(80_000, 65_000));
    }
}
