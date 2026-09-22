package app.tita.workout;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TitaFileSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
