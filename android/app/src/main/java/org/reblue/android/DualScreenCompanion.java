package org.reblue.android;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Presentation;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.hardware.display.DisplayManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;
import android.view.Display;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dual-screen companion: a live, touchable panel for the second display of
 * dual-screen handhelds such as the AYN Thor. The panel is a WebView page from
 * assets/companion/ shown in a {@link Presentation}; it reads the game state the
 * game samples on its own thread (reblue/src/platform/android_companion.cpp).
 * Its art is the game's own, decoded on the device from the installed game
 * files, and its map is the minimap texture the game has loaded.
 *
 * <p>The Presentation window is never focusable, so controller and keyboard
 * events keep going to the game while the second screen is touched.
 */
final class DualScreenCompanion implements DisplayManager.DisplayListener {
    private static final String TAG = "BdCompanion";
    private static final String PREFS = "dual_screen_companion";
    /** Reserved WebView host: the page and the game art share one origin (canvas, localStorage). */
    private static final String HOST = "appassets.androidplatform.net";
    private static final String PAGE = "https://" + HOST + "/companion/index.html";
    static final String PREF_ENABLED = "enabled";

    static native String nativeState();
    /** The leader's live position, "x,z,yaw", empty off the field. */
    static native String nativePos();
    /** True once the game loop runs (guest memory mapped); see waitForEngine. */
    static native boolean nativeEngineReady();
    /** A texture of the installed game as PNG ("d2anime/res/cmn_fc.dds"), or null. */
    static native byte[] nativeGameTexture(String path);
    /** The minimap floor the game is showing, as PNG, or null. */
    static native byte[] nativeMinimap();

    private final Activity activity;
    private final DisplayManager displays;
    private final Handler main = new Handler(Looper.getMainLooper());
    /** Decoded game textures, kept for the session (they never change). */
    private final ConcurrentHashMap<String, byte[]> gameTextures = new ConcurrentHashMap<>();
    private CompanionPresentation presentation;
    private boolean started;
    /** "Turn panel off" lasts until the game is started again. */
    private boolean offThisSession;
    /** The game loop is running, so the WebView may be created. */
    private boolean engineReady;
    private final Runnable waitForEngine = new Runnable() {
        @Override
        public void run() {
            if (!started) return;
            if (isEngineRunning()) {
                engineReady = true;
                refresh();
            } else {
                main.postDelayed(this, 500);
            }
        }
    };

    DualScreenCompanion(Activity activity) {
        this.activity = activity;
        this.displays = (DisplayManager) activity.getSystemService(Context.DISPLAY_SERVICE);
    }

    static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(PREF_ENABLED, true);
    }

    static void setEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(PREF_ENABLED, enabled).apply();
    }

    /** Activity onStart: show the panel on the second display, if there is one. */
    void start() {
        if (started || displays == null) return;
        started = true;
        displays.registerDisplayListener(this, main);
        // No WebView before the game has mapped its memory: the guest arena is mapped with
        // MAP_FIXED at a fixed address, over anything Chromium reserved there first, which
        // crashes the process at boot.
        if (engineReady) refresh();
        else main.post(waitForEngine);
    }

    /** Activity onStop: hide the panel. */
    void stop() {
        if (!started) return;
        started = false;
        main.removeCallbacks(waitForEngine);
        displays.unregisterDisplayListener(this);
        dismiss();
    }

    private void refresh() {
        if (!engineReady) return;
        if (!started || offThisSession || activity.isFinishing() || !isEnabled(activity)) {
            dismiss();
            return;
        }
        if (presentation != null && presentation.isShowing()
                && presentation.getDisplay().isValid()) return;
        dismiss();
        for (Display display : candidates()) {
            CompanionPresentation candidate = new CompanionPresentation(activity, display);
            try {
                candidate.show();
                presentation = candidate;
                Log.i(TAG, "companion on display " + display.getDisplayId() + " (" + display.getName() + ")");
                return;
            } catch (WindowManager.InvalidDisplayException | IllegalStateException e) {
                Log.w(TAG, "display " + display.getDisplayId() + " refused the companion", e);
            }
        }
    }

    private void dismiss() {
        if (presentation != null) {
            try {
                presentation.dismiss();
            } catch (RuntimeException ignored) {
                // The display may already be gone.
            }
            presentation = null;
        }
    }

    /**
     * Like Eden Duo's AuxPresentation: the union of presentation displays and all
     * displays (some handhelds list the second panel only under one of them),
     * physical panels before virtual or overlay ones.
     */
    @SuppressWarnings("deprecation") // getDefaultDisplay: still the simplest way to name our own display
    private List<Display> candidates() {
        Set<Display> all = new LinkedHashSet<>();
        for (Display d : displays.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)) all.add(d);
        for (Display d : displays.getDisplays()) all.add(d);
        List<Display> preferred = new ArrayList<>(), others = new ArrayList<>();
        int own = activity.getWindowManager().getDefaultDisplay().getDisplayId();
        for (Display d : all) {
            if (d.getDisplayId() == Display.DEFAULT_DISPLAY || d.getDisplayId() == own || !d.isValid()) continue;
            String name = String.valueOf(d.getName()).toLowerCase(Locale.ROOT);
            boolean overlay = name.contains("overlay") || name.contains("virtual") || name.contains("cast");
            boolean presentationFlag = (d.getFlags() & Display.FLAG_PRESENTATION) != 0;
            if (name.contains("screen-2") || name.contains("builtin") || name.contains("built-in")
                    || (!overlay && !presentationFlag)) preferred.add(d);
            else if (!overlay) others.add(d);
        }
        preferred.addAll(others);
        return preferred;
    }

    @Override public void onDisplayAdded(int displayId) { refresh(); }
    @Override public void onDisplayChanged(int displayId) { refresh(); }
    @Override public void onDisplayRemoved(int displayId) {
        if (presentation != null && presentation.getDisplay().getDisplayId() == displayId) dismiss();
        refresh();
    }

    /**
     * /companion/game/<path>.png: a texture of the installed game; /companion/live/minimap.png:
     * the minimap the game has loaded; any other /companion/* from the APK assets.
     */
    private WebResourceResponse serve(Uri url) {
        if (url == null || !HOST.equals(url.getHost())) return null;
        List<String> parts = url.getPathSegments();
        if (parts.size() < 2 || !"companion".equals(parts.get(0))) return notFound();
        for (String part : parts) if (part.isEmpty() || part.equals("..") || part.contains("/")) return notFound();
        String name = parts.get(parts.size() - 1);
        if ("game".equals(parts.get(1))) return gameTexture(parts);
        if ("live".equals(parts.get(1))) {
            if (parts.size() != 3 || !"minimap.png".equals(name)) return notFound();
            byte[] png = safeMinimap();
            return png != null ? png(png, false) : notFound();
        }
        try {
            InputStream data = activity.getAssets().open(TextUtils.join("/", parts));
            return new WebResourceResponse(mime(name), mime(name).startsWith("text/") ? "utf-8" : null, data);
        } catch (IOException e) {
            return notFound();
        }
    }

    private WebResourceResponse gameTexture(List<String> parts) {
        if (parts.size() < 3 || parts.size() > 6) return notFound();
        String file = TextUtils.join("/", parts.subList(2, parts.size()));
        if (!file.endsWith(".png")) return notFound();
        for (int i = 0; i < file.length(); i++) {
            char c = file.charAt(i);
            if (!(Character.isLetterOrDigit(c) || c == '_' || c == '/' || c == '.' || c == '-')) return notFound();
        }
        String dds = file.substring(0, file.length() - 4) + ".dds";
        byte[] png = gameTextures.get(dds);
        if (png == null) {
            try {
                png = nativeGameTexture(dds);
            } catch (UnsatisfiedLinkError e) {
                png = null;
            }
            // Not cached when missing: the game's files may not be mounted yet.
            if (png == null) return notFound();
            gameTextures.put(dds, png);
        }
        return png(png, true);
    }

    private static boolean isEngineRunning() {
        try {
            return nativeEngineReady();
        } catch (UnsatisfiedLinkError e) {
            return false; // libreblue not loaded yet
        }
    }

    private static byte[] safeMinimap() {
        try {
            return nativeMinimap();
        } catch (UnsatisfiedLinkError e) {
            return null;
        }
    }

    private static WebResourceResponse png(byte[] data, boolean cacheable) {
        WebResourceResponse response = new WebResourceResponse("image/png", null,
            new java.io.ByteArrayInputStream(data));
        java.util.Map<String, String> headers = new java.util.HashMap<>();
        headers.put("Cache-Control", cacheable ? "max-age=86400" : "no-store");
        headers.put("Access-Control-Allow-Origin", "*");
        response.setResponseHeaders(headers);
        return response;
    }

    private static WebResourceResponse notFound() {
        WebResourceResponse response = new WebResourceResponse("text/plain", "utf-8", null);
        response.setStatusCodeAndReasonPhrase(404, "Not Found");
        return response;
    }

    private static String mime(String name) {
        if (name.endsWith(".html")) return "text/html";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".json")) return "application/json";
        if (name.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    /** The second-screen window: one WebView with the companion page. */
    private final class CompanionPresentation extends Presentation {
        private WebView web;

        CompanionPresentation(Activity owner, Display display) {
            super(owner, display);
        }

        @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
        @SuppressWarnings("deprecation") // immersive flags: the WindowInsetsController route needs a view first
        @Override
        protected void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            Window window = getWindow();
            if (window != null) {
                // Touch only: key and controller focus stays with the game.
                window.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_FULLSCREEN);
                window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
                window.setBackgroundDrawable(null);
            }
            web = new WebView(getContext());
            web.setBackgroundColor(Color.BLACK);
            web.setHapticFeedbackEnabled(true);
            web.setOverScrollMode(View.OVER_SCROLL_NEVER);
            WebSettings settings = web.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setMediaPlaybackRequiresUserGesture(true);
            settings.setTextZoom(100);
            web.setWebViewClient(new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    return serve(request.getUrl());
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return true; // the panel never navigates away
                }
            });
            web.setWebChromeClient(new WebChromeClient());
            web.addJavascriptInterface(new Bridge(), "BD");
            web.loadUrl(PAGE);
            setContentView(web);
        }

        @Override
        protected void onStop() {
            if (web != null) {
                web.removeJavascriptInterface("BD");
                web.destroy();
                web = null;
            }
            super.onStop();
        }

        /** Called from the page's JavaScript thread. */
        private final class Bridge {
            @JavascriptInterface
            public String state() {
                try {
                    return nativeState();
                } catch (UnsatisfiedLinkError e) {
                    return "{}";
                }
            }

            @JavascriptInterface
            public String pos() {
                try {
                    return nativePos();
                } catch (UnsatisfiedLinkError e) {
                    return "";
                }
            }

            @JavascriptInterface
            public void haptic() {
                main.post(() -> {
                    if (web != null) web.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                });
            }

            @JavascriptInterface
            public String language() {
                return Locale.getDefault().toLanguageTag();
            }

            /** Turns the panel off until the game is started again. */
            @JavascriptInterface
            public void disable() {
                main.post(() -> {
                    offThisSession = true;
                    refresh();
                });
            }
        }
    }
}
