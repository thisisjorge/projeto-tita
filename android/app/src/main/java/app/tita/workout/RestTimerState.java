package app.tita.workout;

final class RestTimerState {
    static final String RUNNING = "RUNNING";
    static final String PAUSED = "PAUSED";
    static final String COMPLETED = "COMPLETED";
    static final String CANCELLED = "CANCELLED";

    final String id;
    final String workoutId;
    final String status;
    final int durationSeconds;
    final long startedWallMs;
    final long deadlineWallMs;
    final long deadlineElapsedMs;
    final long bootEpochMs;
    final long pausedRemainingMs;

    RestTimerState(String id, String workoutId, String status, int durationSeconds,
                   long startedWallMs, long deadlineWallMs, long deadlineElapsedMs,
                   long bootEpochMs, long pausedRemainingMs) {
        this.id = id;
        this.workoutId = workoutId;
        this.status = status;
        this.durationSeconds = durationSeconds;
        this.startedWallMs = startedWallMs;
        this.deadlineWallMs = deadlineWallMs;
        this.deadlineElapsedMs = deadlineElapsedMs;
        this.bootEpochMs = bootEpochMs;
        this.pausedRemainingMs = pausedRemainingMs;
    }

    static RestTimerState start(String id, String workoutId, int durationSeconds,
                                long requestedDeadlineWallMs, long nowWallMs, long nowElapsedMs) {
        long remaining = Math.max(0, requestedDeadlineWallMs - nowWallMs);
        return new RestTimerState(id, workoutId, remaining > 0 ? RUNNING : COMPLETED,
            durationSeconds, nowWallMs, nowWallMs + remaining, nowElapsedMs + remaining,
            nowWallMs - nowElapsedMs, 0);
    }

    boolean sameBoot(long nowWallMs, long nowElapsedMs) {
        return Math.abs((nowWallMs - nowElapsedMs) - bootEpochMs) < 10 * 60_000;
    }

    long remainingMs(long nowWallMs, long nowElapsedMs) {
        if (PAUSED.equals(status)) return Math.max(0, pausedRemainingMs);
        if (!RUNNING.equals(status)) return 0;
        return Math.max(0, deadlineElapsedMs - nowElapsedMs);
    }

    RestTimerState pause(long nowWallMs, long nowElapsedMs) {
        if (!RUNNING.equals(status)) return this;
        return new RestTimerState(id, workoutId, PAUSED, durationSeconds, startedWallMs,
            deadlineWallMs, deadlineElapsedMs, bootEpochMs, remainingMs(nowWallMs, nowElapsedMs));
    }

    RestTimerState resume(long nowWallMs, long nowElapsedMs) {
        if (!PAUSED.equals(status)) return this;
        long remaining = Math.max(0, pausedRemainingMs);
        return new RestTimerState(id, workoutId, remaining > 0 ? RUNNING : COMPLETED,
            durationSeconds, startedWallMs, nowWallMs + remaining, nowElapsedMs + remaining,
            nowWallMs - nowElapsedMs, 0);
    }

    RestTimerState extend(int seconds) {
        if (seconds <= 0 || (!RUNNING.equals(status) && !PAUSED.equals(status))) return this;
        long extraMs = seconds * 1000L;
        return new RestTimerState(id, workoutId, status, durationSeconds + seconds,
            startedWallMs, deadlineWallMs + (RUNNING.equals(status) ? extraMs : 0),
            deadlineElapsedMs + (RUNNING.equals(status) ? extraMs : 0), bootEpochMs,
            pausedRemainingMs + (PAUSED.equals(status) ? extraMs : 0));
    }

    RestTimerState withStatus(String next) {
        return new RestTimerState(id, workoutId, next, durationSeconds, startedWallMs,
            deadlineWallMs, deadlineElapsedMs, bootEpochMs, 0);
    }
}
