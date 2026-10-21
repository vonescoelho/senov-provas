package br.com.senov.provas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/* Atualização do ChatMil sem precisar baixar pelo navegador: confere a última versão publicada
   no GitHub (apk-vN), avisa com uma notificação pequena e baixa/instala pelo próprio app. */
public class Atualizacao {
    static final String API = "https://api.github.com/repos/vonescoelho/senov-provas/releases?per_page=8";
    static final String PREFIXO_URL = "https://github.com/vonescoelho/senov-provas/releases/download/";
    static final String CANAL = "chatmil_atualizacoes";
    static final int ID_NOTIF = 7301;
    private static Handler h;

    static int versaoInstalada(Context c) {
        try {
            PackageInfo pi = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? (int) pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception e) { return 0; }
    }

    static String ler(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[16384]; int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        return b.toString("UTF-8");
    }

    /* {versao, url} da versão mais nova publicada, ou null */
    static JSONObject ultima() throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(API).openConnection();
        c.setRequestProperty("Accept", "application/vnd.github+json");
        c.setRequestProperty("User-Agent", "ChatMil-Android");
        c.setConnectTimeout(15000); c.setReadTimeout(20000);
        try {
            if (c.getResponseCode() != 200) return null;
            JSONArray a = new JSONArray(ler(c.getInputStream()));
            int melhor = 0; String url = null;
            Pattern p = Pattern.compile("^apk-v(\\d+)$");
            for (int i = 0; i < a.length(); i++) {
                JSONObject r = a.getJSONObject(i);
                if (r.optBoolean("draft") || r.optBoolean("prerelease")) continue;
                Matcher m = p.matcher(r.optString("tag_name", ""));
                if (!m.find()) continue;
                int v = Integer.parseInt(m.group(1));
                JSONArray as = r.optJSONArray("assets");
                String u = null;
                if (as != null) for (int j = 0; j < as.length(); j++) {
                    JSONObject x = as.getJSONObject(j);
                    if (x.optString("name", "").endsWith(".apk")) u = x.optString("browser_download_url", null);
                }
                if (u != null && u.startsWith(PREFIXO_URL) && v > melhor) { melhor = v; url = u; }
            }
            if (url == null) return null;
            JSONObject o = new JSONObject();
            o.put("versao", melhor);
            o.put("url", url);
            return o;
        } finally { c.disconnect(); }
    }

    /* em segundo plano: se houver versão nova, uma notificação pequena (uma vez por versão) */
    static void verificarENotificar(final Context ctx) {
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try {
                JSONObject u = ultima();
                if (u == null) return;
                int v = u.getInt("versao");
                if (v <= versaoInstalada(app)) return;
                SharedPreferences sp = app.getSharedPreferences("chatmil_atualizacao", Context.MODE_PRIVATE);
                if (sp.getInt("avisou", 0) >= v) return;
                if (MainActivity.visivel) return;              /* com o app aberto, o aviso aparece dentro dele */
                notificar(app);
                sp.edit().putInt("avisou", v).apply();
            } catch (Throwable t) { }
        }).start();
    }

    /* confere de novo a cada 12 horas enquanto o serviço de chamadas estiver ligado */
    static void agendar(final Context ctx) {
        if (h != null) return;
        h = new Handler(Looper.getMainLooper());
        final Runnable r = new Runnable() {
            @Override public void run() { verificarENotificar(ctx); h.postDelayed(this, 12L * 3600 * 1000); }
        };
        h.postDelayed(r, 60 * 1000);
    }

    static void notificar(Context ctx) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CANAL, "Atualizações do app", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Avisa quando há uma versão nova do ChatMil");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        Intent i = new Intent(ctx, MainActivity.class);
        i.putExtra("chatmil_atualizar", true);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, ID_NOTIF, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(ctx, CANAL)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("Nova versão do ChatMil")
            .setContentText("Toque para atualizar.")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build();
        try { NotificationManagerCompat.from(ctx).notify(ID_NOTIF, n); } catch (SecurityException e) { }
    }
}
