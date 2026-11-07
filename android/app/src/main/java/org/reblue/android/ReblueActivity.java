package org.reblue.android;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Process;
import android.view.WindowManager;

import org.libsdl.app.SDLActivity;

import java.util.ArrayList;

/**
 * Hosts re:Blue. SDL3 is linked statically into librexruntime.so, and
 * libreblue.so carries SDL_main, so those are the libraries SDLActivity loads
 * (libc++_shared.so first, which both need).
 */
public class ReblueActivity extends SDLActivity {
    static final String EXTRA_ARGS = "org.reblue.android.ARGS";

    /** Live panel on the second display of dual-screen handhelds (AYN Thor). */
    private DualScreenCompanion companion;

    /**
     * Battery level, charging and temperature for the power-saving mode
     * (platform/android_perf.cpp): Auto drops to 30 fps on a low battery.
     */
    static native void nativeBattery(int percent, boolean charging, int deciCelsius);

    private final BroadcastReceiver battery = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            reportBattery(intent);
        }
    };

    private static void reportBattery(Intent intent) {
        if (intent == null) return;
        int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        int percent = (level >= 0 && scale > 0) ? Math.round(level * 100f / scale) : -1;
        int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING
                || status == BatteryManager.BATTERY_STATUS_FULL;
        int temp = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
        try {
            nativeBattery(percent, charging, temp);
        } catch (UnsatisfiedLinkError e) {
            // The game library did not load; SDL shows its own error.
        }
    }

    @Override
    protected String[] getLibraries() {
        return new String[] { "c++_shared", "rexruntime", "reblue" };
    }

    @Override
    protected String[] getArguments() {
        String[] args = getIntent().getStringArrayExtra(EXTRA_ARGS);
        return args != null ? args : new String[0];
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        companion = new DualScreenCompanion(this);
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (companion != null) companion.start();
        // Sticky: registering hands back the current state straight away.
        reportBattery(registerReceiver(battery, new IntentFilter(Intent.ACTION_BATTERY_CHANGED)));
    }

    @Override
    protected void onStop() {
        if (companion != null) companion.stop();
        try {
            unregisterReceiver(battery);
        } catch (IllegalArgumentException e) {
            // Not registered.
        }
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // The runtime maps the guest address space and keeps process-wide
        // state that a second SDL_main in the same process would trip over,
        // so a finished game takes its process with it.
        if (isFinishing()) {
            Process.killProcess(Process.myPid());
        }
    }

    /**
     * Called from native code (platform/reboot.cpp) right before the game
     * process exits, for settings that only apply on a fresh start. An app
     * cannot exec itself, so RestartActivity, in a process of its own, waits
     * for this one to die and launches the game again.
     */
    public boolean scheduleRestart(String profile, boolean repair) {
        ArrayList<String> args = new ArrayList<>();
        if (profile != null && !profile.isEmpty() && !profile.equals("default")) {
            args.add("--profile");
            args.add(profile);
        }
        if (repair) {
            args.add("--repair");
        }
        Intent intent = new Intent(this, RestartActivity.class);
        intent.putExtra(EXTRA_ARGS, args.toArray(new String[0]));
        intent.putExtra(RestartActivity.EXTRA_PID, Process.myPid());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(intent);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }
}
