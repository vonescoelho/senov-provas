package br.com.senov.provas;

import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;
import android.os.PowerManager;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import java.util.HashSet;
import java.util.Set;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/* Recursos do Android usados pelo ChatMil: bloquear captura de tela (visualização única),
   abrir arquivo em outro app, salvar em Downloads, imprimir PDF e abrir a transmissão de tela. */
@CapacitorPlugin(name = "Nativo")
public class NativoPlugin extends Plugin {
    private static NativoPlugin atual;
    private static JSObject pendente;

    @Override
    public void load() { atual = this; }

    /* chamada que abriu o app (notificação, tela cheia ou atender sozinho) */
    static void chamadaPendente(String cid, String acao) {
        JSObject o = new JSObject();
        o.put("cid", cid);
        o.put("acao", acao);
        pendente = o;
        NativoPlugin p = atual;
        if (p != null) p.notifyListeners("chamada", o, true);
    }

    @PluginMethod
    public void pendente(PluginCall call) {
        JSObject r = new JSObject();
        if (pendente != null) { r.put("cid", pendente.getString("cid")); r.put("acao", pendente.getString("acao")); pendente = null; }
        call.resolve(r);
    }

    /* entra (só uma vez) na conta para o serviço de chamadas ouvir em segundo plano */
    @PluginMethod
    public void chamadasEntrar(final PluginCall call) {
        String email = call.getString("email", ""), senha = call.getString("senha", "");
        if (email.isEmpty() || senha.isEmpty()) { call.reject("faltam dados"); return; }
        try {
            FirebaseAuth.getInstance(ChamadasService.app(getContext())).signInWithEmailAndPassword(email, senha)
                .addOnSuccessListener(r -> {
                    ChamadasService.prefs(getContext()).edit().putBoolean("ativo", true).apply();
                    ChamadasService.iniciar(getContext());
                    JSObject o = new JSObject();
                    o.put("uid", r.getUser() != null ? r.getUser().getUid() : "");
                    call.resolve(o);
                })
                .addOnFailureListener(e -> call.reject(String.valueOf(e.getMessage())));
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void chamadasSair(PluginCall call) {
        try {
            ChamadasService.prefs(getContext()).edit().putBoolean("ativo", false).apply();
            ChamadasService.parar(getContext());
            FirebaseAuth.getInstance(ChamadasService.app(getContext())).signOut();
        } catch (Exception e) { }
        call.resolve();
    }

    @PluginMethod
    public void chamadasLigar(PluginCall call) {
        ChamadasService.prefs(getContext()).edit().putBoolean("ativo", true).apply();
        ChamadasService.iniciar(getContext());
        call.resolve();
    }

    @PluginMethod
    public void chamadasEstado(PluginCall call) {
        Context c = getContext();
        JSObject o = new JSObject();
        String uid = "";
        try { FirebaseUser u = FirebaseAuth.getInstance(ChamadasService.app(c)).getCurrentUser(); if (u != null) uid = u.getUid(); } catch (Exception e) { }
        o.put("uid", uid);
        o.put("ativo", ChamadasService.prefs(c).getBoolean("ativo", false));
        o.put("notificacoes", NotificationManagerCompat.from(c).areNotificationsEnabled());
        o.put("sobrepor", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c));
        boolean bat = true;
        try { PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE); if (Build.VERSION.SDK_INT >= 23) bat = pm.isIgnoringBatteryOptimizations(c.getPackageName()); } catch (Exception e) { }
        o.put("bateria", bat);
        boolean tela = true;
        try { if (Build.VERSION.SDK_INT >= 34) tela = ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).canUseFullScreenIntent(); } catch (Exception e) { }
        o.put("telaCheia", tela);
        call.resolve(o);
    }

    /* abre o pedido de permissão certo do Android */
    @PluginMethod
    public void permissao(PluginCall call) {
        String tipo = call.getString("tipo", "");
        Context c = getContext();
        Uri pacote = Uri.parse("package:" + c.getPackageName());
        try {
            if ("notificacoes".equals(tipo)) {
                if (Build.VERSION.SDK_INT >= 33 && !NotificationManagerCompat.from(c).areNotificationsEnabled()
                    && !ChamadasService.prefs(c).getBoolean("pediuNotif", false)) {
                    ChamadasService.prefs(c).edit().putBoolean("pediuNotif", true).apply();
                    ActivityCompat.requestPermissions(getActivity(), new String[]{"android.permission.POST_NOTIFICATIONS"}, 4321);
                } else {
                    Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
                    getActivity().startActivity(i);
                }
            } else if ("sobrepor".equals(tipo)) {
                getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pacote));
            } else if ("bateria".equals(tipo)) {
                getActivity().startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pacote));
            } else if ("telaCheia".equals(tipo)) {
                if (Build.VERSION.SDK_INT >= 34) getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pacote));
            } else if ("app".equals(tipo)) {
                getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pacote));
            }
            call.resolve();
        } catch (Exception e) {
            try { getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pacote)); call.resolve(); }
            catch (Exception e2) { call.reject(String.valueOf(e.getMessage())); }
        }
    }

    /* quem pode ter a chamada urgente atendida sozinha */
    @PluginMethod
    public void autoAtender(PluginCall call) {
        Set<String> l = new HashSet<>();
        try {
            JSArray a = call.getArray("uids");
            if (a != null) for (int k = 0; k < a.length(); k++) l.add(a.getString(k));
        } catch (Exception e) { }
        ChamadasService.prefs(getContext()).edit().putString("auto_modo", call.getString("modo", "ninguem")).putStringSet("auto_uids", l).apply();
        call.resolve();
    }

    /* fim da chamada: deixa de aparecer por cima da tela de bloqueio */
    @PluginMethod
    public void fimChamada(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= 27) { getActivity().setShowWhenLocked(false); getActivity().setTurnScreenOn(false); }
                else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
                am.setSpeakerphoneOn(false);
                am.setMode(AudioManager.MODE_NORMAL);
            } catch (Exception e) { }
            call.resolve();
        });
    }

    /* alto-falante ligado (chamada atendida sozinha) */
    @PluginMethod
    public void altoFalante(PluginCall call) {
        boolean ligar = Boolean.TRUE.equals(call.getBoolean("ligar", true));
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            am.setMode(AudioManager.MODE_IN_COMMUNICATION);
            am.setSpeakerphoneOn(ligar);
        } catch (Exception e) { }
        call.resolve();
    }

    /* abre um link no app certo (Shopee, Hotmart, YouTube…) ou no navegador */
    @PluginMethod
    public void link(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("https://") && !url.startsWith("http://")) { call.reject("link inválido"); return; }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /* prévia de link (título, descrição e miniatura) lida pelo próprio celular */
    @PluginMethod
    public void previaLink(final PluginCall call) {
        final String url = call.getString("url", "");
        if (!url.startsWith("https://") && !url.startsWith("http://")) { call.reject("link inválido"); return; }
        new Thread(() -> {
            try { call.resolve(Previa.buscar(url)); }
            catch (Throwable e) { call.reject("sem prévia"); }
        }).start();
    }

    private File arquivo(PluginCall call) {
        return new File(Uri.parse(call.getString("uri", "")).getPath());
    }

    private static void copiar(InputStream in, OutputStream out) throws IOException {
        byte[] b = new byte[65536];
        int n;
        while ((n = in.read(b)) > 0) out.write(b, 0, n);
    }

    @PluginMethod
    public void seguro(final PluginCall call) {
        final boolean ligar = Boolean.TRUE.equals(call.getBoolean("ligar", false));
        getActivity().runOnUiThread(() -> {
            if (ligar) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            call.resolve();
        });
    }

    @PluginMethod
    public void transmitir(PluginCall call) {
        try {
            getActivity().startActivity(new Intent("android.settings.CAST_SETTINGS"));
            call.resolve();
        } catch (ActivityNotFoundException e) {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_DISPLAY_SETTINGS));
                call.resolve();
            } catch (Exception e2) {
                call.reject("indisponivel");
            }
        }
    }

    /* ---------- atualização do app ---------- */
    private static boolean pedidoAtualizar = false;
    static void pedirAtualizar() {
        pedidoAtualizar = true;
        if (atual != null) { atual.notifyListeners("atualizar", new JSObject()); }
    }

    @PluginMethod
    public void versao(PluginCall call) {
        JSObject o = new JSObject();
        o.put("codigo", Atualizacao.versaoInstalada(getContext()));
        try { o.put("nome", getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName); } catch (Exception e) { o.put("nome", ""); }
        o.put("pedido", pedidoAtualizar);
        pedidoAtualizar = false;
        call.resolve(o);
    }

    @PluginMethod
    public void podeInstalar(PluginCall call) {
        JSObject o = new JSObject();
        o.put("ok", Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(o);
    }

    @PluginMethod
    public void permitirInstalar(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            }
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void baixarAtualizacao(final PluginCall call) {
        final String url = call.getString("url", "");
        if (!url.startsWith(Atualizacao.PREFIXO_URL) || !url.endsWith(".apk")) { call.reject("endereço inválido"); return; }
        new Thread(() -> {
            java.net.HttpURLConnection c = null;
            try {
                File dir = new File(getContext().getCacheDir(), "atualizacao");
                dir.mkdirs();
                File f = new File(dir, "ChatMil.apk");
                if (f.exists()) f.delete();
                String atualUrl = url;
                for (int r = 0; r < 6; r++) {
                    c = (java.net.HttpURLConnection) new java.net.URL(atualUrl).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(20000); c.setReadTimeout(30000);
                    c.setRequestProperty("User-Agent", "ChatMil-Android");
                    int st = c.getResponseCode();
                    if (st >= 300 && st < 400) { atualUrl = new java.net.URL(new java.net.URL(atualUrl), c.getHeaderField("Location")).toString(); c.disconnect(); c = null; continue; }
                    if (st != 200) throw new IOException("Erro " + st);
                    break;
                }
                if (c == null) throw new IOException("muitos redirecionamentos");
                long total = c.getContentLengthLong(), lido = 0, ult = 0;
                byte[] buf = new byte[65536];
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(f)) {
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n); lido += n;
                        long agora = System.currentTimeMillis();
                        if (agora - ult > 300) { ult = agora; JSObject p = new JSObject(); p.put("lido", lido); p.put("total", total); notifyListeners("atualizacaoProgresso", p); }
                    }
                }
                /* confere se é mesmo o ChatMil antes de instalar */
                android.content.pm.PackageInfo pi = getContext().getPackageManager().getPackageArchiveInfo(f.getPath(), 0);
                if (pi == null || !getContext().getPackageName().equals(pi.packageName)) { f.delete(); throw new IOException("arquivo inválido"); }
                Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(u, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                JSObject r = new JSObject();
                r.put("ok", true);
                r.put("versao", pi.versionName);
                call.resolve(r);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            } finally { if (c != null) c.disconnect(); }
        }).start();
    }

    @PluginMethod
    public void abrir(PluginCall call) {
        try {
            File f = arquivo(call);
            Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(u, call.getString("tipo", "*/*"));
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent ch = Intent.createChooser(i, call.getString("titulo", "Abrir com"));
            ch.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(ch);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void salvar(PluginCall call) {
        if (Build.VERSION.SDK_INT < 29) {
            call.reject("antigo");
            return;
        }
        try {
            File f = arquivo(call);
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, call.getString("nome", f.getName()));
            v.put(MediaStore.MediaColumns.MIME_TYPE, call.getString("tipo", "application/octet-stream"));
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/ChatMil");
            ContentResolver cr = getContext().getContentResolver();
            Uri dest = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (dest == null) {
                call.reject("sem destino");
                return;
            }
            try (InputStream in = new FileInputStream(f); OutputStream out = cr.openOutputStream(dest)) {
                copiar(in, out);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void imprimir(final PluginCall call) {
        final File f = arquivo(call);
        final String nome = call.getString("nome", "ChatMil");
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                pm.print(nome, new PrintDocumentAdapter() {
                    @Override
                    public void onLayout(PrintAttributes antes, PrintAttributes novo, CancellationSignal cancel,
                                         LayoutResultCallback cb, Bundle extras) {
                        if (cancel.isCanceled()) {
                            cb.onLayoutCancelled();
                            return;
                        }
                        cb.onLayoutFinished(new PrintDocumentInfo.Builder(nome)
                                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).build(), true);
                    }

                    @Override
                    public void onWrite(PageRange[] paginas, ParcelFileDescriptor destino, CancellationSignal cancel,
                                        WriteResultCallback cb) {
                        try (InputStream in = new FileInputStream(f);
                             OutputStream out = new FileOutputStream(destino.getFileDescriptor())) {
                            copiar(in, out);
                            cb.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
                        } catch (Exception e) {
                            cb.onWriteFailed(e.getMessage());
                        }
                    }
                }, null);
                call.resolve();
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        });
    }
}
