package org.reblue.android;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Picks the Vulkan driver the game starts with: the device's own (Qualcomm)
 * or a Mesa Turnip package, installed from a zip or downloaded from the
 * GitHub releases the Android emulators use. Runs in its own process, so it
 * can close a running game to apply the change.
 */
public class GpuDriverActivity extends Activity {
    private static final int REQUEST_ZIP = 1;

    /** GitHub repositories that publish Turnip packages for Adreno. */
    private static final String[][] SOURCES = {
        {"KIMCHI Turnip", "K11MCH1/AdrenoToolsDrivers"},
        {"Mr. Purple Turnip", "MrPurple666/purple-turnip"},
        {"Weab-Chan Freedreno", "Weab-chan/freedreno_turnip-CI"},
        {"Whitebelyash Turnip", "whitebelyash/AdrenoToolsDrivers"},
    };
    private static final int RELEASES_PER_SOURCE = 6;

    private final Handler main = new Handler(Looper.getMainLooper());
    private LinearLayout list;
    private TextView status;
    private String initialSelection;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        GpuDrivers.Driver current = GpuDrivers.selected(this);
        initialSelection = current == null ? "" : current.id;

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(16);
        page.setPadding(pad, pad, pad, pad);

        page.addView(text("Turnip (Mesa) es un driver Vulkan libre para Adreno. Suele ir más rápido "
                + "que el de Qualcomm en juegos recompilados, pero cada versión es distinta: prueba una "
                + "y compara. Si un driver no llega a arrancar el juego, la siguiente vez se vuelve solo "
                + "al del sistema.", 14));

        status = text("", 14);
        status.setPadding(0, dp(8), 0, dp(8));
        page.addView(status);

        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        page.addView(list);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setPadding(0, dp(12), 0, 0);
        buttons.addView(button("Descargar…", v -> showSources()));
        buttons.addView(button("Instalar zip…", v -> pickZip()));
        buttons.addView(button("Abrir el juego", v -> launchGame()));
        page.addView(buttons);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(page);
        setContentView(scroll);
        refresh();
    }

    private void refresh() {
        list.removeAllViews();
        GpuDrivers.Driver selected = GpuDrivers.selected(this);
        String selectedId = selected == null ? "" : selected.id;

        list.addView(choice("Driver del sistema (Qualcomm)", "", selectedId.isEmpty(), null));
        for (GpuDrivers.Driver driver : GpuDrivers.installed(this)) {
            list.addView(choice(driver.label(), driver.id, driver.id.equals(selectedId), driver));
        }
        boolean changed = !selectedId.equals(initialSelection);
        status.setText(changed && gameRunning()
                ? "El juego está abierto: \"Abrir el juego\" lo cierra y lo vuelve a abrir con este driver."
                : "Se usa al abrir el juego.");
    }

    private View choice(String label, String id, boolean checked, GpuDrivers.Driver driver) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        RadioButton radio = new RadioButton(this);
        radio.setText(label);
        radio.setChecked(checked);
        radio.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        radio.setOnClickListener(v -> {
            GpuDrivers.select(this, id);
            refresh();
        });
        row.addView(radio, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        if (driver != null) {
            Button delete = new Button(this);
            delete.setText("Borrar");
            delete.setOnClickListener(v -> new AlertDialog.Builder(this)
                    .setMessage("¿Borrar " + driver.label() + "?")
                    .setPositiveButton("Borrar", (d, w) -> {
                        GpuDrivers.delete(this, driver);
                        refresh();
                    })
                    .setNegativeButton("Cancelar", null)
                    .show());
            row.addView(delete);
        }
        return row;
    }

    // Install from a zip on the device.

    private void pickZip() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {"application/zip", "application/octet-stream"});
        startActivityForResult(intent, REQUEST_ZIP);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_ZIP || resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        runInBackground("Instalando…", () -> {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                if (in == null) throw new IOException("no se pudo abrir el archivo");
                return GpuDrivers.install(this, in, "driver");
            }
        });
    }

    // Download from GitHub releases.

    private void showSources() {
        String[] names = new String[SOURCES.length];
        for (int i = 0; i < SOURCES.length; ++i) names[i] = SOURCES[i][0];
        new AlertDialog.Builder(this)
                .setTitle("¿De dónde?")
                .setItems(names, (d, which) -> loadReleases(SOURCES[which][0], SOURCES[which][1]))
                .show();
    }

    private static final class Asset {
        final String label, url;

        Asset(String label, String url) {
            this.label = label;
            this.url = url;
        }
    }

    private void loadReleases(String sourceName, String repo) {
        ProgressDialog progress = new ProgressDialog("Buscando versiones de " + sourceName + "…");
        new Thread(() -> {
            List<Asset> assets = new ArrayList<>();
            String error = null;
            try {
                String json = new String(get("https://api.github.com/repos/" + repo
                        + "/releases?per_page=" + RELEASES_PER_SOURCE, "application/vnd.github+json"),
                        StandardCharsets.UTF_8);
                JSONArray releases = new JSONArray(json);
                for (int i = 0; i < releases.length(); ++i) {
                    JSONObject release = releases.getJSONObject(i);
                    String title = release.optString("name", "");
                    if (title.isEmpty()) title = release.optString("tag_name", "");
                    JSONArray files = release.optJSONArray("assets");
                    if (files == null) continue;
                    for (int j = 0; j < files.length(); ++j) {
                        JSONObject file = files.getJSONObject(j);
                        String name = file.optString("name", "");
                        String url = file.optString("browser_download_url", "");
                        // Some releases also carry glibc builds for Linux, which
                        // cannot load on Android.
                        String lower = name.toLowerCase(Locale.ROOT);
                        if (!lower.endsWith(".zip") || lower.contains("emulator") || !url.startsWith("https://")) continue;
                        String size = String.format(Locale.ROOT, "%.1f MB", file.optLong("size", 0) / 1048576.0);
                        assets.add(new Asset(name + "  ·  " + title + "  ·  " + size, url));
                    }
                }
            } catch (Exception e) {
                error = e.getMessage();
            }
            final String failure = error;
            main.post(() -> {
                progress.dismiss();
                if (failure != null || assets.isEmpty()) {
                    alert(failure != null ? describe(failure) : "No hay paquetes .zip en " + sourceName + ".");
                    return;
                }
                String[] labels = new String[assets.size()];
                for (int i = 0; i < labels.length; ++i) labels[i] = assets.get(i).label;
                new AlertDialog.Builder(this)
                        .setTitle(sourceName)
                        .setItems(labels, (d, which) -> download(assets.get(which)))
                        .show();
            });
        }).start();
    }

    private void download(Asset asset) {
        runInBackground("Descargando…", () -> {
            File zip = new File(getCacheDir(), "gpu_driver_download.zip");
            try (OutputStream out = new FileOutputStream(zip)) {
                out.write(get(asset.url, "application/octet-stream"));
            }
            try (InputStream in = new FileInputStream(zip)) {
                return GpuDrivers.install(this, in, "driver");
            } finally {
                //noinspection ResultOfMethodCallIgnored
                zip.delete();
            }
        });
    }

    private static byte[] get(String address, String accept) throws IOException {
        for (int redirects = 0; redirects < 5; ++redirects) {
            HttpURLConnection http = (HttpURLConnection) new URL(address).openConnection();
            http.setConnectTimeout(15000);
            http.setReadTimeout(30000);
            http.setRequestProperty("Accept", accept);
            http.setRequestProperty("User-Agent", "reblue-android");
            http.setInstanceFollowRedirects(true);
            int code = http.getResponseCode();
            if (code / 100 == 3) {
                String next = http.getHeaderField("Location");
                http.disconnect();
                if (next == null || !next.startsWith("https://")) throw new IOException("redirección inválida");
                address = next;
                continue;
            }
            if (code != 200) {
                http.disconnect();
                throw new IOException("HTTP " + code);
            }
            try (InputStream in = http.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[1 << 16];
                int n;
                while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
                return out.toByteArray();
            } finally {
                http.disconnect();
            }
        }
        throw new IOException("demasiadas redirecciones");
    }

    // Applying.

    private boolean gameRunning() {
        return gamePid() > 0;
    }

    private int gamePid() {
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> processes = am.getRunningAppProcesses();
        if (processes == null) return 0;
        for (ActivityManager.RunningAppProcessInfo info : processes) {
            if (getPackageName().equals(info.processName)) return info.pid;
        }
        return 0;
    }

    private void launchGame() {
        GpuDrivers.Driver selected = GpuDrivers.selected(this);
        String selectedId = selected == null ? "" : selected.id;
        int pid = gamePid();
        if (pid > 0 && !selectedId.equals(initialSelection)) {
            new AlertDialog.Builder(this)
                    .setMessage("El juego está abierto. Se cerrará sin guardar para abrirlo con el driver nuevo.")
                    .setPositiveButton("Cerrar y abrir", (d, w) -> {
                        Process.killProcess(pid);
                        // RestartActivity waits for the old process to go.
                        Intent intent = new Intent(this, RestartActivity.class);
                        intent.putExtra(RestartActivity.EXTRA_PID, pid);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        finish();
                    })
                    .setNegativeButton("Cancelar", null)
                    .show();
            return;
        }
        Intent intent = new Intent(this, ReblueActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }

    // Small helpers.

    private interface Work {
        GpuDrivers.Driver run() throws Exception;
    }

    private void runInBackground(String message, Work work) {
        ProgressDialog progress = new ProgressDialog(message);
        new Thread(() -> {
            GpuDrivers.Driver driver = null;
            String error = null;
            try {
                driver = work.run();
            } catch (Exception e) {
                error = e.getMessage();
            }
            final GpuDrivers.Driver installed = driver;
            final String failure = error;
            main.post(() -> {
                progress.dismiss();
                if (installed == null) {
                    alert("No se pudo instalar: " + describe(failure));
                    return;
                }
                // A freshly installed driver is the one the player wants to try.
                GpuDrivers.select(this, installed.id);
                toast("Instalado y elegido: " + installed.label());
                refresh();
            });
        }).start();
    }

    private final class ProgressDialog {
        private final AlertDialog dialog;

        ProgressDialog(String message) {
            LinearLayout row = new LinearLayout(GpuDriverActivity.this);
            row.setPadding(dp(24), dp(24), dp(24), dp(24));
            row.addView(new ProgressBar(GpuDriverActivity.this));
            TextView label = text(message, 16);
            label.setPadding(dp(16), 0, 0, 0);
            row.addView(label);
            dialog = new AlertDialog.Builder(GpuDriverActivity.this).setView(row).setCancelable(false).show();
        }

        void dismiss() {
            if (!isFinishing() && !isDestroyed()) dialog.dismiss();
        }
    }

    private TextView text(String value, int sp) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        return view;
    }

    private Button button(String label, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(label);
        button.setOnClickListener(listener);
        return button;
    }

    private void alert(String message) {
        if (isFinishing() || isDestroyed()) return;
        new AlertDialog.Builder(this).setMessage(message).setPositiveButton("Vale", null).show();
    }

    /** Network failures read as "no connection", not as a Java exception. */
    private static String describe(String error) {
        if (error == null) return "error desconocido";
        if (error.contains("Unable to resolve host") || error.contains("No address associated")
                || error.contains("failed to connect") || error.contains("timeout")) {
            return "Sin conexión a Internet. Conecta la consola al Wi-Fi o instala un zip que ya tengas con \"Instalar zip…\".";
        }
        return error;
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
