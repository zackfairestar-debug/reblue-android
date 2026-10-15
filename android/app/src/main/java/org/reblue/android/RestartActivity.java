package org.reblue.android;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import java.io.File;

/**
 * Runs in the ":restart" process. Waits for the old game process to exit (it
 * holds the GPU and the guest memory), then starts ReblueActivity again with
 * the arguments it was handed, and exits itself.
 */
public class RestartActivity extends Activity {
    static final String EXTRA_PID = "org.reblue.android.PID";
    private static final long POLL_MS = 50;
    private static final long TIMEOUT_MS = 10000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final int pid = getIntent().getIntExtra(EXTRA_PID, -1);
        final String[] args = getIntent().getStringArrayExtra(ReblueActivity.EXTRA_ARGS);
        final Handler handler = new Handler(Looper.getMainLooper());
        final long deadline = System.currentTimeMillis() + TIMEOUT_MS;
        handler.post(new Runnable() {
            @Override
            public void run() {
                boolean alive = pid > 0 && new File("/proc/" + pid).exists();
                if (alive) {
                    // Same UID, so a game process that hangs on its way out
                    // can be put down rather than restarted into.
                    if (System.currentTimeMillis() >= deadline) {
                        android.os.Process.killProcess(pid);
                    }
                    handler.postDelayed(this, POLL_MS);
                    return;
                }
                Intent intent = new Intent(RestartActivity.this, ReblueActivity.class);
                if (args != null) {
                    intent.putExtra(ReblueActivity.EXTRA_ARGS, args);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
                finish();
                Runtime.getRuntime().exit(0);
            }
        });
    }
}
