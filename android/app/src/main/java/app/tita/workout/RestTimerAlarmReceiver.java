package app.tita.workout;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class RestTimerAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        RestTimerState state = RestTimerService.finish(context);
        if (state == null || !RestTimerState.RUNNING.equals(state.status))
            context.stopService(new Intent(context, RestTimerService.class));
    }
}
