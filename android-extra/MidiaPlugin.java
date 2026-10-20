package br.com.senov.provas;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.database.Cursor;
import androidx.activity.result.ActivityResult;
import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.effect.Presentation;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.DefaultEncoderFactory;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.ProgressHolder;
import androidx.media3.transformer.Transformer;
import androidx.media3.transformer.VideoEncoderSettings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/* Câmera (CameraX) e compressão de vídeo no próprio aparelho (Media3 Transformer):
   H.265/HEVC quando o celular tem o codificador, senão H.264; resolução e taxa conforme a rede. */
@CapacitorPlugin(name = "Midia")
@androidx.annotation.OptIn(markerClass = androidx.media3.common.util.UnstableApi.class)
public class MidiaPlugin extends Plugin {
    private final Handler principal = new Handler(Looper.getMainLooper());

    /* ---------- câmera ---------- */
    @PluginMethod
    public void camera(PluginCall call) {
        Intent i = new Intent(getContext(), CameraActivity.class);
        i.putExtra("modo", call.getString("modo", "video"));
        i.putExtra("frente", call.getBoolean("frente", false));
        i.putExtra("maxSeg", call.getInt("maxSeg", 180));
        startActivityForResult(call, i, "cameraVoltou");
    }

    @ActivityCallback
    private void cameraVoltou(PluginCall call, ActivityResult r) {
        if (call == null) return;
        if (r.getResultCode() != android.app.Activity.RESULT_OK || r.getData() == null) { call.reject("cancelado"); return; }
        String caminho = r.getData().getStringExtra("caminho"), tipo = r.getData().getStringExtra("tipo");
        if (caminho == null) { call.reject("cancelado"); return; }
        File f = new File(caminho);
        if (tipo != null && tipo.startsWith("video/")) {
            comprimir(Uri.fromFile(f), call.getString("qualidade", "media"), call.getBoolean("hevc", true), 0, 1, (saida, info, erro) -> {
                f.delete();
                if (saida == null) { call.reject(erro == null ? "falhou" : erro); return; }
                info.put("nome", "video-" + System.currentTimeMillis() + ".mp4");
                call.resolve(info);
            });
        } else {
            JSObject o = new JSObject();
            o.put("caminho", f.getAbsolutePath()); o.put("tipo", "image/jpeg"); o.put("nome", "foto-" + System.currentTimeMillis() + ".jpg"); o.put("bytes", f.length());
            call.resolve(o);
        }
    }

    /* ---------- galeria: fotos e vídeos (vídeos saem comprimidos) ---------- */
    @PluginMethod
    public void escolher(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.setType("*/*");
        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, call.getBoolean("multiplo", true));
        i.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(call, Intent.createChooser(i, "Escolher fotos e vídeos"), "galeriaVoltou");
    }

    @ActivityCallback
    private void galeriaVoltou(PluginCall call, ActivityResult r) {
        if (call == null) return;
        if (r.getResultCode() != android.app.Activity.RESULT_OK || r.getData() == null) { call.reject("cancelado"); return; }
        Intent d = r.getData();
        final List<Uri> uris = new ArrayList<>();
        ClipData cd = d.getClipData();
        if (cd != null) for (int k = 0; k < cd.getItemCount() && k < 30; k++) uris.add(cd.getItemAt(k).getUri());
        else if (d.getData() != null) uris.add(d.getData());
        if (uris.isEmpty()) { call.reject("cancelado"); return; }
        processar(call, uris, 0, new JSArray());
    }

    private void processar(PluginCall call, List<Uri> uris, int k, JSArray feitos) {
        if (k >= uris.size()) { JSObject o = new JSObject(); o.put("arquivos", feitos); call.resolve(o); return; }
        Uri u = uris.get(k);
        String tipo = getContext().getContentResolver().getType(u);
        String nome = nomeDe(u);
        if (tipo != null && tipo.startsWith("video/")) {
            comprimir(u, call.getString("qualidade", "media"), call.getBoolean("hevc", true), k, uris.size(), (saida, info, erro) -> {
                if (saida != null) { info.put("nome", nome.replaceAll("\\.\\w+$", "") + ".mp4"); feitos.put(info); }
                else { JSObject x = new JSObject(); x.put("erro", erro == null ? "falhou" : erro); x.put("nome", nome); feitos.put(x); }
                processar(call, uris, k + 1, feitos);
            });
        } else {
            new Thread(() -> {
                JSObject o = new JSObject();
                try {
                    File f = copiar(u, nome);
                    o.put("caminho", f.getAbsolutePath()); o.put("tipo", tipo == null ? "image/jpeg" : tipo); o.put("nome", nome); o.put("bytes", f.length());
                } catch (Exception e) { o.put("erro", "não foi possível ler"); o.put("nome", nome); }
                feitos.put(o);
                principal.post(() -> processar(call, uris, k + 1, feitos));
            }).start();
        }
    }

    private String nomeDe(Uri u) {
        String n = null;
        try (Cursor c = getContext().getContentResolver().query(u, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) n = c.getString(0);
        } catch (Exception e) { }
        return n == null || n.isEmpty() ? "arquivo-" + System.currentTimeMillis() : n.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private File pasta() { File d = new File(getContext().getCacheDir(), "chatmil"); if (!d.exists()) d.mkdirs(); return d; }

    private File copiar(Uri u, String nome) throws Exception {
        File f = new File(pasta(), System.currentTimeMillis() + "-" + nome);
        try (InputStream in = getContext().getContentResolver().openInputStream(u); OutputStream out = new FileOutputStream(f)) {
            byte[] b = new byte[65536]; int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
        }
        return f;
    }

    /* ---------- compressão ---------- */
    interface Pronto { void fim(File saida, JSObject info, String erro); }

    static boolean temCodificador(String mime) {
        try {
            for (MediaCodecInfo ci : new MediaCodecList(MediaCodecList.REGULAR_CODECS).getCodecInfos()) {
                if (!ci.isEncoder()) continue;
                for (String t : ci.getSupportedTypes()) if (t.equalsIgnoreCase(mime)) return true;
            }
        } catch (Exception e) { }
        return false;
    }

    @PluginMethod
    public void suporte(PluginCall call) {
        JSObject o = new JSObject();
        o.put("hevc", temCodificador(MimeTypes.VIDEO_H265));
        o.put("camera", true);
        call.resolve(o);
    }

    private void comprimir(Uri entrada, String qualidade, boolean hevc, int i, int n, Pronto pronto) {
        int w = 0, h = 0, rot = 0; long dur = 0; int brOrig = 0;
        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        try {
            mr.setDataSource(getContext(), entrada);
            w = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));
            h = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
            rot = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
            dur = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));
            brOrig = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE));
        } catch (Exception e) { }
        try { mr.release(); } catch (Exception e) { }
        if (rot == 90 || rot == 270) { int t = w; w = h; h = t; }
        final boolean usarHevc = hevc && temCodificador(MimeTypes.VIDEO_H265);
        final int curto = "alta".equals(qualidade) ? 1080 : "baixa".equals(qualidade) ? 480 : 720;
        int br = "alta".equals(qualidade) ? 3_000_000 : "baixa".equals(qualidade) ? 700_000 : 1_500_000;
        if (!usarHevc) br = br * 3 / 2;
        if (brOrig > 0 && brOrig < br) br = Math.max(400_000, brOrig);
        final int taxa = br;
        final int menor = Math.min(w, h) > 0 ? Math.min(w, h) : curto;
        final int alvo = Math.min(curto, menor) / 2 * 2;
        final int fw = w, fh = h; final long fdur = dur;
        final File saida = new File(pasta(), "env-" + System.currentTimeMillis() + ".mp4");
        principal.post(() -> {
            try {
                List<Effect> efeitos = new ArrayList<>();
                Effect p = presentacao(alvo, fw, fh);
                if (p != null) efeitos.add(p);
                EditedMediaItem item = new EditedMediaItem.Builder(MediaItem.fromUri(entrada))
                    .setEffects(new Effects(Collections.<AudioProcessor>emptyList(), efeitos)).build();
                final Transformer[] tr = new Transformer[1];
                tr[0] = new Transformer.Builder(getContext())
                    .setVideoMimeType(usarHevc ? MimeTypes.VIDEO_H265 : MimeTypes.VIDEO_H264)
                    .setAudioMimeType(MimeTypes.AUDIO_AAC)
                    .setEncoderFactory(new DefaultEncoderFactory.Builder(getContext())
                        .setRequestedVideoEncoderSettings(new VideoEncoderSettings.Builder().setBitrate(taxa).build())
                        .setEnableFallback(true).build())
                    .addListener(new Transformer.Listener() {
                        @Override public void onCompleted(Composition c, ExportResult r) {
                            principal.removeCallbacksAndMessages("prog");
                            JSObject o = new JSObject();
                            o.put("caminho", saida.getAbsolutePath()); o.put("tipo", "video/mp4"); o.put("bytes", saida.length());
                            o.put("codec", usarHevc ? "hevc" : "avc");
                            int[] d = dimensoes(saida);
                            o.put("w", d[0]); o.put("h", d[1]); o.put("dur", (d[2] > 0 ? d[2] : fdur) / 1000.0);
                            pronto.fim(saida, o, null);
                        }
                        @Override public void onError(Composition c, ExportResult r, ExportException e) {
                            principal.removeCallbacksAndMessages("prog");
                            saida.delete();
                            pronto.fim(null, null, "Não foi possível comprimir o vídeo (" + e.getErrorCodeName() + ")");
                        }
                    })
                    .build();
                tr[0].start(item, saida.getAbsolutePath());
                final ProgressHolder ph = new ProgressHolder();
                Runnable prog = new Runnable() {
                    @Override public void run() {
                        try {
                            if (tr[0].getProgress(ph) == Transformer.PROGRESS_STATE_AVAILABLE) {
                                JSObject o = new JSObject(); o.put("f", ph.progress / 100.0); o.put("i", i); o.put("n", n);
                                notifyListeners("progresso", o);
                            }
                        } catch (Exception e) { }
                        principal.postAtTime(this, "prog", android.os.SystemClock.uptimeMillis() + 500);
                    }
                };
                principal.postAtTime(prog, "prog", android.os.SystemClock.uptimeMillis() + 500);
            } catch (Exception e) {
                saida.delete();
                pronto.fim(null, null, "Não foi possível comprimir o vídeo.");
            }
        });
    }

    /* lado menor = alvo, qualquer orientação (Media3 1.6+ tem createForShortSide; senão calcula) */
    private static Effect presentacao(int alvo, int w, int h) {
        try {
            java.lang.reflect.Method m = Presentation.class.getMethod("createForShortSide", int.class);
            return (Effect) m.invoke(null, alvo);
        } catch (Exception e) { }
        if (w <= 0 || h <= 0) return Presentation.createForHeight(alvo);
        return w >= h ? Presentation.createForHeight(alvo) : Presentation.createForHeight(Math.round(alvo * (float) h / w) / 2 * 2);
    }

    private static int[] dimensoes(File f) {
        int[] r = new int[3];
        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        try {
            mr.setDataSource(f.getAbsolutePath());
            int w = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)), h = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
            int rot = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
            r[0] = rot == 90 || rot == 270 ? h : w; r[1] = rot == 90 || rot == 270 ? w : h;
            r[2] = num(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));
        } catch (Exception e) { }
        try { mr.release(); } catch (Exception e) { }
        return r;
    }

    private static int num(String s) { try { return s == null ? 0 : (int) Double.parseDouble(s); } catch (Exception e) { return 0; } }
}
