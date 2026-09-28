package app.tita.workout;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TitaRestTimer")
public class TitaRestTimerPlugin extends Plugin {
    private static TitaRestTimerPlugin active;

    @Override public void load() { active = this; }

    @Override protected void handleOnDestroy() {
        if (active == this) active = null;
        super.handleOnDestroy();
    }

    @PluginMethod public void start(PluginCall call) {
        String id = call.getString("id");
        Integer duration = call.getInt("durationSeconds");
        Long deadline = call.getLong("deadlineAtMs");
        if (id == null || duration == null || deadline == null || duration <= 0) {
            call.reject("Timer inválido.");
            return;
        }
        try {
            RestTimerState state = RestTimerService.start(getContext(), id, call.getString("workoutId"), duration, deadline);
            call.resolve(RestTimerService.toJson(state, getContext()));
        } catch (Exception error) { call.reject("Não foi possível iniciar o timer Android.", error); }
    }

    @PluginMethod public void getState(PluginCall call) {
        RestTimerState state = RestTimerService.current(getContext());
        RestTimerService.ensureAlarm(getContext(), state);
        call.resolve(RestTimerService.toJson(state, getContext()));
    }

    @PluginMethod public void pause(PluginCall call) {
        call.resolve(RestTimerService.toJson(RestTimerService.pause(getContext()), getContext()));
    }

    @PluginMethod public void resume(PluginCall call) {
        call.resolve(RestTimerService.toJson(RestTimerService.resume(getContext()), getContext()));
    }

    @PluginMethod public void extend(PluginCall call) {
        Integer seconds = call.getInt("seconds");
        call.resolve(RestTimerService.toJson(RestTimerService.extend(getContext(), seconds == null ? 0 : seconds), getContext()));
    }

    @PluginMethod public void cancel(PluginCall call) {
        call.resolve(RestTimerService.toJson(RestTimerService.cancel(getContext()), getContext()));
    }

    @PluginMethod public void openExactAlarmSettings(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT >= 31) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            } catch (Exception error) {
                call.reject("Não foi possível abrir a configuração de alarmes.", error);
                return;
            }
        }
        call.resolve();
    }

    static void announce(RestTimerState state, Context context) {
        TitaRestTimerPlugin plugin = active;
        if (plugin != null) plugin.notifyListeners("timerChanged", RestTimerService.toJson(state, context), true);
    }
}
