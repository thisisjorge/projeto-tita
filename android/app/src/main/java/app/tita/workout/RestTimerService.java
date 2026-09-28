package app.tita.workout;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

import com.getcapacitor.JSObject;

public class RestTimerService extends Service {
    static final String ACTION_REFRESH = "app.tita.workout.timer.REFRESH";
    static final String ACTION_EXTEND = "app.tita.workout.timer.EXTEND";
    static final String ACTION_STOP = "app.tita.workout.timer.STOP";
    static final String ACTION_FINISH = "app.tita.workout.timer.FINISH";
    private static final String PREFS = "tita_native_rest_timer";
    private static final String ACTIVE_CHANNEL = "tita_rest_active";
    private static final String DONE_CHANNEL = "tita_rest_done";
    private static final int ACTIVE_ID = 2301;
    private static final int DONE_ID = 2302;
    private static final int ALARM_ID = 2303;
    private static final Object LOCK = new Object();

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            synchronized (LOCK) {
                RestTimerState state = read(RestTimerService.this);
                if (state == null || !RestTimerState.RUNNING.equals(state.status)) {
                    stopSelf();
                    return;
                }
                if (state.remainingMs(System.currentTimeMillis(), SystemClock.elapsedRealtime()) <= 0) {
                    finish(RestTimerService.this);
                    stopSelf();
                } else {
                    handler.postDelayed(this, Math.min(1000, state.remainingMs(System.currentTimeMillis(), SystemClock.elapsedRealtime())));
                }
            }
        }
    };

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_REFRESH : intent.getAction();
        if (ACTION_EXTEND.equals(action)) {
            extend(this, 30);
        } else if (ACTION_STOP.equals(action)) {
            cancel(this);
        } else if (ACTION_FINISH.equals(action)) {
            finish(this);
        }
        RestTimerState state = current(this);
        if (state == null || !RestTimerState.RUNNING.equals(state.status)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        ensureAlarm(this, state);
        createChannels(this);
        startForeground(ACTIVE_ID, activeNotification(this, state));
        handler.removeCallbacks(tick);
        handler.post(tick);
        return START_STICKY;
    }

    @Override public void onDestroy() {
        handler.removeCallbacks(tick);
        super.onDestroy();
    }

    static RestTimerState current(Context context) {
        synchronized (LOCK) {
            RestTimerState state = read(context);
            if (state == null) return null;
            long wall = System.currentTimeMillis(), elapsed = SystemClock.elapsedRealtime();
            if (RestTimerState.RUNNING.equals(state.status)) {
                if (!state.sameBoot(wall, elapsed)) {
                    state = state.withStatus(RestTimerState.CANCELLED);
                    save(context, state);
                    cancelAlarm(context);
                } else if (state.remainingMs(wall, elapsed) <= 0) {
                    state = finish(context);
                }
            }
            return state;
        }
    }

    static RestTimerState start(Context context, String id, String workoutId, int seconds, long deadlineWallMs) {
        synchronized (LOCK) {
            cancelAlarm(context);
            ((NotificationManager) context.getSystemService(NOTIFICATION_SERVICE)).cancel(DONE_ID);
            RestTimerState state = RestTimerState.start(id, workoutId, seconds,
                deadlineWallMs, System.currentTimeMillis(), SystemClock.elapsedRealtime());
            save(context, state);
            if (RestTimerState.RUNNING.equals(state.status)) {
                scheduleAlarm(context, state);
                launch(context);
            }
            TitaRestTimerPlugin.announce(state, context);
            return state;
        }
    }

    static RestTimerState pause(Context context) {
        synchronized (LOCK) {
            RestTimerState state = current(context);
            if (state == null) return null;
            state = state.pause(System.currentTimeMillis(), SystemClock.elapsedRealtime());
            save(context, state);
            cancelAlarm(context);
            context.stopService(new Intent(context, RestTimerService.class));
            TitaRestTimerPlugin.announce(state, context);
            return state;
        }
    }

    static RestTimerState resume(Context context) {
        synchronized (LOCK) {
            RestTimerState state = current(context);
            if (state == null) return null;
            state = state.resume(System.currentTimeMillis(), SystemClock.elapsedRealtime());
            save(context, state);
            if (RestTimerState.RUNNING.equals(state.status)) {
                scheduleAlarm(context, state);
                launch(context);
            }
            TitaRestTimerPlugin.announce(state, context);
            return state;
        }
    }

    static RestTimerState extend(Context context, int seconds) {
        synchronized (LOCK) {
            RestTimerState state = current(context);
            if (state == null) return null;
            state = state.extend(seconds);
            save(context, state);
            if (RestTimerState.RUNNING.equals(state.status)) {
                scheduleAlarm(context, state);
                launch(context);
            }
            TitaRestTimerPlugin.announce(state, context);
            return state;
        }
    }

    static RestTimerState cancel(Context context) {
        synchronized (LOCK) {
            RestTimerState state = read(context);
            if (state == null) return null;
            state = state.withStatus(RestTimerState.CANCELLED);
            save(context, state);
            cancelAlarm(context);
            ((NotificationManager) context.getSystemService(NOTIFICATION_SERVICE)).cancel(DONE_ID);
            context.stopService(new Intent(context, RestTimerService.class));
            TitaRestTimerPlugin.announce(state, context);
            return state;
        }
    }

    static RestTimerState finish(Context context) {
        synchronized (LOCK) {
            RestTimerState state = read(context);
            if (state == null || !RestTimerState.RUNNING.equals(state.status)) return state;
            if (state.remainingMs(System.currentTimeMillis(), SystemClock.elapsedRealtime()) > 0) return state;
            state = state.withStatus(RestTimerState.COMPLETED);
            save(context, state);
            cancelAlarm(context);
            createChannels(context);
            NotificationManager manager = (NotificationManager) context.getSystemService(NOTIFICATION_SERVICE);
            manager.cancel(ACTIVE_ID);
            if (notificationsAllowed(context)) manager.notify(DONE_ID, doneNotification(context));
            TitaRestTimerPlugin.announce(state, context);
            return state;
        }
    }

    private static void launch(Context context) {
        Intent intent = new Intent(context, RestTimerService.class).setAction(ACTION_REFRESH);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }

    private static PendingIntent alarmIntent(Context context) {
        Intent intent = new Intent(context, RestTimerAlarmReceiver.class).setAction(ACTION_FINISH);
        return PendingIntent.getBroadcast(context, ALARM_ID, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void scheduleAlarm(Context context, RestTimerState state) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(ALARM_SERVICE);
        PendingIntent pending = alarmIntent(context);
        alarms.cancel(pending);
        boolean exact = false;
        try {
            if (Build.VERSION.SDK_INT >= 31 && !alarms.canScheduleExactAlarms()) {
                alarms.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, state.deadlineElapsedMs, pending);
            } else {
                alarms.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, state.deadlineElapsedMs, pending);
                exact = true;
            }
        } catch (SecurityException permissionChanged) {
            alarms.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, state.deadlineElapsedMs, pending);
        }
        prefs(context).edit().putBoolean("exactScheduled", exact).apply();
    }

    static void ensureAlarm(Context context, RestTimerState state) {
        if (state != null && RestTimerState.RUNNING.equals(state.status)
                && prefs(context).getBoolean("exactScheduled", false) != exactAlertsAllowed(context)) {
            scheduleAlarm(context, state);
        }
    }

    private static void cancelAlarm(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(ALARM_SERVICE);
        alarms.cancel(alarmIntent(context));
    }

    static boolean exactAlertsAllowed(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(ALARM_SERVICE);
        return Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms();
    }

    static boolean notificationsAllowed(Context context) {
        return Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(NOTIFICATION_SERVICE);
        NotificationChannel active = new NotificationChannel(ACTIVE_CHANNEL, "Descanso em andamento", NotificationManager.IMPORTANCE_LOW);
        active.setDescription("Contagem do tempo de descanso e controles do timer.");
        active.setSound(null, null);
        manager.createNotificationChannel(active);
        NotificationChannel done = new NotificationChannel(DONE_CHANNEL, "Descanso concluído", NotificationManager.IMPORTANCE_HIGH);
        done.setDescription("Aviso sonoro e vibração ao fim do descanso.");
        done.enableVibration(true);
        manager.createNotificationChannel(done);
    }

    private static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent serviceAction(Context context, String action, int requestCode) {
        return PendingIntent.getService(context, requestCode,
            new Intent(context, RestTimerService.class).setAction(action),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static Notification activeNotification(Context context, RestTimerState state) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, ACTIVE_CHANNEL) : new Notification.Builder(context);
        return builder.setSmallIcon(R.drawable.ic_stat_name)
            .setContentTitle("Titã · Descanso")
            .setContentText("Tempo restante")
            .setWhen(System.currentTimeMillis() + state.remainingMs(System.currentTimeMillis(), SystemClock.elapsedRealtime()))
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(openApp(context))
            .addAction(new Notification.Action.Builder(0, "+30 s", serviceAction(context, ACTION_EXTEND, 1)).build())
            .addAction(new Notification.Action.Builder(0, "Parar", serviceAction(context, ACTION_STOP, 2)).build())
            .build();
    }

    private static Notification doneNotification(Context context) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, DONE_CHANNEL) : new Notification.Builder(context);
        return builder.setSmallIcon(R.drawable.ic_stat_name)
            .setContentTitle("Titã · Descanso concluído")
            .setContentText("Pronto para a próxima série.")
            .setAutoCancel(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(openApp(context))
            .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE)
            .build();
    }

    private static SharedPreferences prefs(Context context) { return context.getSharedPreferences(PREFS, 0); }

    private static void save(Context context, RestTimerState state) {
        prefs(context).edit()
            .putString("id", state.id).putString("workoutId", state.workoutId)
            .putString("status", state.status).putInt("duration", state.durationSeconds)
            .putLong("startedWall", state.startedWallMs).putLong("deadlineWall", state.deadlineWallMs)
            .putLong("deadlineElapsed", state.deadlineElapsedMs).putLong("bootEpoch", state.bootEpochMs)
            .putLong("pausedRemaining", state.pausedRemainingMs).commit();
    }

    private static RestTimerState read(Context context) {
        SharedPreferences p = prefs(context);
        String id = p.getString("id", null);
        if (id == null) return null;
        return new RestTimerState(id, p.getString("workoutId", null), p.getString("status", RestTimerState.CANCELLED),
            p.getInt("duration", 0), p.getLong("startedWall", 0), p.getLong("deadlineWall", 0),
            p.getLong("deadlineElapsed", 0), p.getLong("bootEpoch", 0), p.getLong("pausedRemaining", 0));
    }

    static JSObject toJson(RestTimerState state, Context context) {
        JSObject data = new JSObject();
        data.put("present", state != null);
        data.put("notificationsAllowed", notificationsAllowed(context));
        data.put("exactAlertsAllowed", exactAlertsAllowed(context));
        if (state == null) return data;
        data.put("id", state.id);
        data.put("workoutId", state.workoutId);
        data.put("status", state.status);
        data.put("durationSeconds", state.durationSeconds);
        data.put("startedAtMs", state.startedWallMs);
        data.put("deadlineAtMs", System.currentTimeMillis() + state.remainingMs(System.currentTimeMillis(), SystemClock.elapsedRealtime()));
        data.put("remainingMs", state.remainingMs(System.currentTimeMillis(), SystemClock.elapsedRealtime()));
        return data;
    }
}
