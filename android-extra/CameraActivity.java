package br.com.senov.provas;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.video.FallbackStrategy;
import androidx.camera.video.FileOutputOptions;
import androidx.camera.video.PendingRecording;
import androidx.camera.video.Quality;
import androidx.camera.video.QualitySelector;
import androidx.camera.video.Recorder;
import androidx.camera.video.Recording;
import androidx.camera.video.VideoCapture;
import androidx.camera.video.VideoRecordEvent;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.File;
import java.util.concurrent.Executor;

/* Câmera do ChatMil (CameraX): foto ou vídeo direto do hardware do celular.
   Vídeo em HD com taxa moderada; depois o MidiaPlugin comprime (H.265 quando o aparelho permite). */
public class CameraActivity extends AppCompatActivity {
    private PreviewView preview;
    private ProcessCameraProvider provedor;
    private ImageCapture captura;
    private VideoCapture<Recorder> video;
    private Recording gravando;
    private boolean frente, ehVideo, terminou;
    private int maxSeg;
    private long inicio;
    private TextView tempo, disparo, trocar, modoFoto, modoVideo;
    private final Handler h = new Handler(Looper.getMainLooper());
    private File saida;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Intent i = getIntent();
        ehVideo = !"foto".equals(i.getStringExtra("modo"));
        frente = i.getBooleanExtra("frente", false);
        maxSeg = Math.max(5, Math.min(600, i.getIntExtra("maxSeg", 180)));
        montarTela();
        if (temPermissoes()) iniciar();
        else ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 7);
    }

    private boolean temPermissoes() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }
    private boolean temAudio() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (temPermissoes()) iniciar();
        else { Toast.makeText(this, "Permita o uso da câmera para continuar.", Toast.LENGTH_LONG).show(); cancelar(); }
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private TextView botao(String t, int tam) {
        TextView v = new TextView(this);
        v.setText(t); v.setTextColor(Color.WHITE); v.setTextSize(tam); v.setGravity(Gravity.CENTER);
        v.setPadding(dp(14), dp(10), dp(14), dp(10));
        return v;
    }

    private void montarTela() {
        FrameLayout raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this);
        preview.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        raiz.addView(preview, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout topo = new LinearLayout(this);
        topo.setOrientation(LinearLayout.HORIZONTAL); topo.setGravity(Gravity.CENTER_VERTICAL);
        topo.setPadding(dp(8), dp(36), dp(8), dp(8));
        TextView fechar = botao("✕", 24);
        fechar.setContentDescription("Fechar câmera");
        fechar.setOnClickListener(v -> cancelar());
        tempo = botao("", 18);
        LinearLayout.LayoutParams lt = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        topo.addView(fechar); topo.addView(tempo, lt);
        FrameLayout.LayoutParams ltopo = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP);
        raiz.addView(topo, ltopo);

        LinearLayout baixo = new LinearLayout(this);
        baixo.setOrientation(LinearLayout.VERTICAL); baixo.setGravity(Gravity.CENTER_HORIZONTAL);
        baixo.setPadding(0, dp(8), 0, dp(36));
        LinearLayout modos = new LinearLayout(this);
        modos.setGravity(Gravity.CENTER);
        modoFoto = botao("FOTO", 14); modoVideo = botao("VÍDEO", 14);
        modoFoto.setOnClickListener(v -> trocarModo(false));
        modoVideo.setOnClickListener(v -> trocarModo(true));
        modos.addView(modoFoto); modos.addView(modoVideo);
        LinearLayout linha = new LinearLayout(this);
        linha.setGravity(Gravity.CENTER_VERTICAL);
        View vazio = new View(this);
        disparo = new TextView(this);
        disparo.setContentDescription("Fotografar ou gravar");
        disparo.setOnClickListener(v -> disparar());
        trocar = botao("⟲", 28);
        trocar.setContentDescription("Trocar câmera");
        trocar.setOnClickListener(v -> { if (gravando != null) return; frente = !frente; ligar(); });
        linha.addView(vazio, new LinearLayout.LayoutParams(dp(72), dp(72)));
        LinearLayout.LayoutParams ld = new LinearLayout.LayoutParams(dp(78), dp(78));
        ld.leftMargin = dp(36); ld.rightMargin = dp(36);
        linha.addView(disparo, ld);
        linha.addView(trocar, new LinearLayout.LayoutParams(dp(72), dp(72)));
        baixo.addView(modos); baixo.addView(linha);
        raiz.addView(baixo, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
        setContentView(raiz);
        pintarModo();
    }

    private void pintarModo() {
        modoFoto.setAlpha(ehVideo ? 0.55f : 1f); modoVideo.setAlpha(ehVideo ? 1f : 0.55f);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(gravando != null ? Color.rgb(225, 29, 72) : (ehVideo ? Color.rgb(225, 29, 72) : Color.WHITE));
        g.setStroke(dp(5), gravando != null ? Color.WHITE : Color.argb(170, 255, 255, 255));
        if (gravando != null) g.setCornerRadius(dp(14));
        disparo.setBackground(g);
        tempo.setText(gravando != null ? "" : (ehVideo ? "Vídeo" : "Foto"));
    }

    private void trocarModo(boolean video) {
        if (gravando != null || ehVideo == video) return;
        ehVideo = video; pintarModo(); ligar();
    }

    private void iniciar() {
        final ListenableFuture<ProcessCameraProvider> f = ProcessCameraProvider.getInstance(this);
        f.addListener(() -> {
            try { provedor = f.get(); ligar(); }
            catch (Exception e) { falhar("Não foi possível abrir a câmera."); }
        }, ContextCompat.getMainExecutor(this));
    }

    private void ligar() {
        if (provedor == null) return;
        try {
            provedor.unbindAll();
            Preview p = new Preview.Builder().build();
            p.setSurfaceProvider(preview.getSurfaceProvider());
            CameraSelector sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;
            if (!provedor.hasCamera(sel)) { frente = !frente; sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA; }
            if (ehVideo) {
                Recorder rec = new Recorder.Builder()
                    .setQualitySelector(QualitySelector.from(Quality.HD, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
                    .setTargetVideoEncodingBitRate(4_000_000)
                    .build();
                video = VideoCapture.withOutput(rec);
                captura = null;
                provedor.bindToLifecycle(this, sel, p, video);
            } else {
                captura = new ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .setJpegQuality(88)
                    .build();
                video = null;
                provedor.bindToLifecycle(this, sel, p, captura);
            }
        } catch (Exception e) { falhar("Não foi possível usar esta câmera."); }
    }

    private File novoArquivo(String ext) {
        File d = new File(getCacheDir(), "chatmil");
        if (!d.exists()) d.mkdirs();
        return new File(d, "cam-" + System.currentTimeMillis() + "." + ext);
    }

    private void disparar() {
        Executor ex = ContextCompat.getMainExecutor(this);
        if (!ehVideo) {
            if (captura == null) return;
            saida = novoArquivo("jpg");
            disparo.setEnabled(false);
            captura.takePicture(new ImageCapture.OutputFileOptions.Builder(saida).build(), ex, new ImageCapture.OnImageSavedCallback() {
                @Override public void onImageSaved(ImageCapture.OutputFileResults r) { concluir(saida, "image/jpeg"); }
                @Override public void onError(ImageCaptureException e) { disparo.setEnabled(true); Toast.makeText(CameraActivity.this, "Não deu para tirar a foto. Tente de novo.", Toast.LENGTH_SHORT).show(); }
            });
            return;
        }
        if (video == null) return;
        if (gravando != null) { gravando.stop(); return; }
        saida = novoArquivo("mp4");
        FileOutputOptions op = new FileOutputOptions.Builder(saida).setDurationLimitMillis(maxSeg * 1000L).build();
        PendingRecording pr = video.getOutput().prepareRecording(this, op);
        if (temAudio()) { try { pr = pr.withAudioEnabled(); } catch (SecurityException e) { } }
        gravando = pr.start(ex, ev -> {
            if (ev instanceof VideoRecordEvent.Finalize) {
                VideoRecordEvent.Finalize fin = (VideoRecordEvent.Finalize) ev;
                gravando = null; h.removeCallbacksAndMessages(null);
                if (!fin.hasError() || fin.getError() == VideoRecordEvent.Finalize.ERROR_DURATION_LIMIT_REACHED) concluir(saida, "video/mp4");
                else { pintarModo(); Toast.makeText(CameraActivity.this, "A gravação falhou. Tente de novo.", Toast.LENGTH_SHORT).show(); }
            }
        });
        inicio = System.currentTimeMillis();
        trocar.setAlpha(0.3f); modoFoto.setAlpha(0.3f);
        pintarModo();
        relogio();
    }

    private void relogio() {
        if (gravando == null) return;
        long s = (System.currentTimeMillis() - inicio) / 1000, r = maxSeg - s;
        tempo.setText(String.format(java.util.Locale.US, "● %d:%02d  (faltam %d:%02d)", s / 60, s % 60, Math.max(0, r) / 60, Math.max(0, r) % 60));
        tempo.setTextColor(Color.rgb(255, 120, 140));
        h.postDelayed(this::relogio, 500);
    }

    private void concluir(File f, String tipo) {
        if (terminou) return; terminou = true;
        Intent r = new Intent();
        r.putExtra("caminho", f.getAbsolutePath());
        r.putExtra("tipo", tipo);
        setResult(RESULT_OK, r);
        finish();
    }

    private void falhar(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
        cancelar();
    }

    private void cancelar() {
        if (terminou) return; terminou = true;
        if (gravando != null) { try { gravando.stop(); } catch (Exception e) { } gravando = null; }
        setResult(RESULT_CANCELED);
        finish();
    }

    @Override
    public void onBackPressed() {
        if (gravando != null) { gravando.stop(); return; }
        cancelar();
    }

    @Override
    protected void onDestroy() {
        h.removeCallbacksAndMessages(null);
        if (gravando != null) { try { gravando.stop(); } catch (Exception e) { } }
        super.onDestroy();
    }
}
