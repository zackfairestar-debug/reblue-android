package org.reblue.android;

import android.content.Context;
import android.content.SharedPreferences;
import android.system.ErrnoException;
import android.system.Os;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Custom Vulkan driver packages (Mesa Turnip) for libadrenotools: the zip
 * format the Android emulators share, a flat meta.json plus the driver .so
 * named by its "libraryName". Each one is unpacked into
 * files/gpu_drivers/<id>/, which is app-private, as dlopen requires.
 *
 * The choice reaches the native side as environment variables set before the
 * game library starts (platform/android_gpu_driver.cpp). A boot marker is
 * written before each start with a custom driver and removed by the native
 * side once the Vulkan device is up; a marker still there on the next start
 * means that driver took the game down, so it is dropped.
 */
final class GpuDrivers {
    private static final String PREFS = "gpu";
    private static final String KEY_SELECTED = "driver";
    private static final String META = "meta.json";
    private static boolean launchPrepared;

    static final class Driver {
        final String id, name, version, description, libraryName;
        final File dir;

        Driver(String id, File dir, String name, String version, String description, String libraryName) {
            this.id = id;
            this.dir = dir;
            this.name = name;
            this.version = version;
            this.description = description;
            this.libraryName = libraryName;
        }

        String label() {
            return version.isEmpty() ? name : name + " (" + version + ")";
        }
    }

    private GpuDrivers() {}

    static File root(Context context) {
        return new File(context.getFilesDir(), "gpu_drivers");
    }

    private static File bootMarker(Context context) {
        return new File(context.getFilesDir(), "gpu_driver_boot_pending");
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static List<Driver> installed(Context context) {
        List<Driver> result = new ArrayList<>();
        File[] dirs = root(context).listFiles(File::isDirectory);
        if (dirs == null) return result;
        for (File dir : dirs) {
            Driver driver = read(dir);
            if (driver != null) result.add(driver);
        }
        Collections.sort(result, (a, b) -> a.label().compareToIgnoreCase(b.label()));
        return result;
    }

    private static Driver read(File dir) {
        try {
            JSONObject meta = new JSONObject(readText(new File(dir, META)));
            String lib = meta.optString("libraryName", "");
            if (lib.isEmpty() || !new File(dir, lib).isFile()) return null;
            return new Driver(dir.getName(), dir, meta.optString("name", dir.getName()),
                    meta.optString("driverVersion", ""), meta.optString("description", ""), lib);
        } catch (IOException | JSONException e) {
            return null;
        }
    }

    /** The chosen driver, or null for the system one. */
    static Driver selected(Context context) {
        String id = prefs(context).getString(KEY_SELECTED, "");
        if (id.isEmpty()) return null;
        return read(new File(root(context), id));
    }

    static void select(Context context, String id) {
        prefs(context).edit().putString(KEY_SELECTED, id == null ? "" : id).commit();
        //noinspection ResultOfMethodCallIgnored
        bootMarker(context).delete();
    }

    static void delete(Context context, Driver driver) {
        if (selected(context) != null && driver.id.equals(selected(context).id)) select(context, null);
        deleteTree(driver.dir);
    }

    /**
     * Unpacks a driver zip. Entries are flattened to their file names, so a
     * package zipped inside a folder works too and no entry can escape the
     * package's directory. Returns the installed driver.
     */
    static Driver install(Context context, InputStream zip, String fallbackName) throws IOException {
        File root = root(context);
        File staging = new File(root, ".staging");
        deleteTree(staging);
        if (!staging.mkdirs()) throw new IOException("no se pudo crear " + staging);
        try (ZipInputStream in = new ZipInputStream(zip)) {
            ZipEntry entry;
            byte[] buffer = new byte[1 << 16];
            while ((entry = in.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;
                String name = new File(entry.getName()).getName();
                if (name.isEmpty() || name.startsWith(".")) continue;
                try (OutputStream out = new FileOutputStream(new File(staging, name))) {
                    int n;
                    while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
                }
            }
        }
        Driver staged = read(staging);
        if (staged == null) {
            deleteTree(staging);
            throw new IOException("el zip no tiene meta.json con un libraryName que exista");
        }
        String id = sanitize(staged.label().isEmpty() ? fallbackName : staged.label());
        File target = new File(root, id);
        for (int i = 2; target.exists(); ++i) target = new File(root, id + "-" + i);
        if (!staging.renameTo(target)) {
            deleteTree(staging);
            throw new IOException("no se pudo mover el driver a " + target);
        }
        return read(target);
    }

    /**
     * Before the game library starts: drops a driver whose last start never
     * reached a Vulkan device, and passes the chosen one to the native side.
     * Returns the name of a driver it dropped, or null.
     */
    static String prepareLaunch(Context context) {
        // Once per process: the native side loads the driver only once, so a
        // recreated activity must not write a marker nothing will remove.
        if (launchPrepared) return null;
        launchPrepared = true;
        String dropped = null;
        File marker = bootMarker(context);
        Driver driver = selected(context);
        if (marker.exists()) {
            //noinspection ResultOfMethodCallIgnored
            marker.delete();
            if (driver != null) {
                dropped = driver.label();
                select(context, null);
                driver = null;
            }
        }
        try {
            // Mesa keeps compiled shaders on disk only with a cache folder;
            // the Qualcomm driver ignores these.
            Os.setenv("MESA_SHADER_CACHE_DIR",
                    new File(context.getCacheDir(), "mesa_shader_cache").getAbsolutePath(), true);
            Os.setenv("MESA_SHADER_CACHE_MAX_SIZE", "256M", true);
            if (driver == null) {
                Os.unsetenv("REBLUE_VK_DRIVER_LIB");
                return dropped;
            }
            new FileOutputStream(marker).close();
            Os.setenv("REBLUE_VK_DRIVER_DIR", driver.dir.getAbsolutePath() + "/", true);
            Os.setenv("REBLUE_VK_DRIVER_LIB", driver.libraryName, true);
            Os.setenv("REBLUE_VK_HOOK_DIR", context.getApplicationInfo().nativeLibraryDir + "/", true);
            Os.setenv("REBLUE_VK_BOOT_MARKER", marker.getAbsolutePath(), true);
        } catch (ErrnoException | IOException e) {
            // Without the variables the game starts on the system driver.
        }
        return dropped;
    }

    private static String sanitize(String name) {
        String id = name.replaceAll("[^A-Za-z0-9._-]+", "_");
        if (id.length() > 60) id = id.substring(0, 60);
        return id.isEmpty() || id.startsWith(".") ? "driver" : id;
    }

    private static String readText(File file) throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    static void deleteTree(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteTree(child);
        //noinspection ResultOfMethodCallIgnored
        file.delete();
    }
}
