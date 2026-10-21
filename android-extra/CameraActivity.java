package br.com.senov.provas;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.util.Size;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.MeteringPoint;
import androidx.camera.core.Preview;
import androidx.camera.core.ZoomState;
import androidx.camera.core.resolutionselector.AspectRatioStrategy;
import androidx.camera.core.resolutionselector.ResolutionSelector;
import androidx.camera.core.resolutionselector.ResolutionStrategy;
import androidx.camera.extensions.ExtensionMode;
import androidx.camera.extensions.ExtensionsManager;
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
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

/* Câmera do ChatMil (CameraX), no estilo das câmeras dos celulares novos:
   modos Retrato / Foto / Vídeo / Noturno (os que o aparelho tiver, via CameraX Extensions), HDR,
   flash (desligado/automático/ligado), grade, temporizador, zoom com pinça e botões 0,5x/1x/2x,
   foco por toque, estabilização, botões de volume como disparador e galeria ao lado do disparador.
   Fotos em alta resolução 16:9 (bom para o Flash) e vídeo Full HD; depois o MidiaPlugin comprime. */
public class CameraActivity extends AppCompatActivity {
    private static final int PEDIR_GALERIA = 41;
    private static final String M_RETRATO = "retrato", M_FOTO = "foto", M_VIDEO = "video", M_NOTURNO = "noturno", M_PRO = "pro";

    private PreviewView preview;
    private ProcessCameraProvider provedor;
    private ExtensionsManager extensoes;
    private Camera camera;
    private ImageCapture captura;
    private VideoCapture<Recorder> video;
    private Recording gravando;
    private boolean frente, terminou, grade, hdr, estabilizar = true;
    private String modo = M_FOTO;
    private int maxSeg, flash = ImageCapture.FLASH_MODE_OFF, timer = 0;
    private long inicio;
    private TextView tempo, disparo, trocar, galeria, bFlash, bHdr, bGrade, bTimer, contagem;
    private LinearLayout modos, zooms;
    private View brilho, anel;
    private Grade vGrade;
    private SeekBar exposicao;
    private TextView rotExp;
    private final Handler h = new Handler(Looper.getMainLooper());
    private File saida;
    private SharedPreferences prefs;
    private ScaleGestureDetector pinca;
    private GestureDetector toque;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        prefs = getSharedPreferences("chatmil_camera", MODE_PRIVATE);
        Intent i = getIntent();
        modo = "foto".equals(i.getStringExtra("modo")) ? M_FOTO : M_VIDEO;
        frente = i.getBooleanExtra("frente", false);
        maxSeg = Math.max(5, Math.min(600, i.getIntExtra("maxSeg", 180)));
        grade = prefs.getBoolean("grade", false);
        flash = prefs.getInt("flash", ImageCapture.FLASH_MODE_OFF);
        hdr = prefs.getBoolean("hdr", false);
        montarTela();
        if (temPermissoes()) iniciar();
        else ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 7);
    }

    private boolean temPermissoes() { return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED; }
    private boolean temAudio() { return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED; }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (temPermissoes()) iniciar();
        else { Toast.makeText(this, "Permita o uso da câmera para continuar.", Toast.LENGTH_LONG).show(); cancelar(); }
    }

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private TextView botao(String t, float tam) {
        TextView v = new TextView(this);
        v.setText(t); v.setTextColor(Color.WHITE); v.setTextSize(tam); v.setGravity(Gravity.CENTER);
        v.setPadding(dp(12), dp(10), dp(12), dp(10));
        return v;
    }
    private GradientDrawable redondo(int cor) { GradientDrawable g = new GradientDrawable(); g.setShape(GradientDrawable.OVAL); g.setColor(cor); return g; }

    /* grade 3x3 por cima da imagem */
    private static class Grade extends View {
        private final Paint p = new Paint();
        Grade(android.content.Context c) { super(c); p.setColor(Color.argb(150, 255, 255, 255)); p.setStrokeWidth(2f); }
        @Override protected void onDraw(Canvas c) {
            float w = getWidth(), hh = getHeight();
            for (int k = 1; k < 3; k++) { c.drawLine(w * k / 3f, 0, w * k / 3f, hh, p); c.drawLine(0, hh * k / 3f, w, hh * k / 3f, p); }
        }
    }

    private void montarTela() {
        FrameLayout raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this);
        preview.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        preview.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        raiz.addView(preview, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        vGrade = new Grade(this); vGrade.setVisibility(grade ? View.VISIBLE : View.GONE);
        raiz.addView(vGrade, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        /* anel do foco por toque */
        anel = new View(this);
        GradientDrawable ga = new GradientDrawable(); ga.setShape(GradientDrawable.OVAL); ga.setStroke(dp(2), Color.rgb(255, 210, 60)); ga.setColor(Color.TRANSPARENT);
        anel.setBackground(ga); anel.setAlpha(0f);
        raiz.addView(anel, new FrameLayout.LayoutParams(dp(72), dp(72)));

        /* clarão ao fotografar */
        brilho = new View(this); brilho.setBackgroundColor(Color.WHITE); brilho.setAlpha(0f);
        raiz.addView(brilho, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        contagem = botao("", 96); contagem.setAlpha(0.95f); contagem.setVisibility(View.GONE);
        raiz.addView(contagem, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));

        /* barra de cima: fechar · flash · HDR · grade · temporizador */
        LinearLayout topo = new LinearLayout(this);
        topo.setOrientation(LinearLayout.HORIZONTAL); topo.setGravity(Gravity.CENTER_VERTICAL);
        topo.setPadding(dp(6), dp(30), dp(6), dp(6));
        topo.setBackgroundColor(Color.argb(110, 0, 0, 0));
        TextView fechar = botao("✕", 22); fechar.setContentDescription("Fechar câmera"); fechar.setOnClickListener(v -> cancelar());
        tempo = botao("", 16);
        bFlash = botao("", 15); bFlash.setOnClickListener(v -> trocarFlash());
        bHdr = botao("HDR", 14); bHdr.setOnClickListener(v -> { hdr = !hdr; prefs.edit().putBoolean("hdr", hdr).apply(); pintarTopo(); ligar(); });
        bGrade = botao("#", 18); bGrade.setContentDescription("Grade"); bGrade.setOnClickListener(v -> { grade = !grade; prefs.edit().putBoolean("grade", grade).apply(); vGrade.setVisibility(grade ? View.VISIBLE : View.GONE); pintarTopo(); });
        bTimer = botao("⏱", 16); bTimer.setContentDescription("Temporizador"); bTimer.setOnClickListener(v -> { timer = timer == 0 ? 3 : timer == 3 ? 10 : 0; pintarTopo(); });
        topo.addView(fechar); topo.addView(tempo, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        topo.addView(bFlash); topo.addView(bHdr); topo.addView(bGrade); topo.addView(bTimer);
        raiz.addView(topo, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));

        /* parte de baixo: zoom · galeria / disparador / trocar · modos */
        LinearLayout baixo = new LinearLayout(this);
        baixo.setOrientation(LinearLayout.VERTICAL); baixo.setGravity(Gravity.CENTER_HORIZONTAL);
        baixo.setPadding(0, dp(8), 0, dp(26));
        zooms = new LinearLayout(this); zooms.setGravity(Gravity.CENTER);
        LinearLayout linha = new LinearLayout(this); linha.setGravity(Gravity.CENTER_VERTICAL);
        galeria = botao("🖼", 24); galeria.setContentDescription("Galeria"); galeria.setBackground(redondo(Color.argb(90, 255, 255, 255)));
        galeria.setOnClickListener(v -> abrirGaleria());
        disparo = new TextView(this); disparo.setContentDescription("Fotografar ou gravar"); disparo.setOnClickListener(v -> disparar());
        trocar = botao("⟲", 28); trocar.setContentDescription("Trocar câmera"); trocar.setBackground(redondo(Color.argb(90, 255, 255, 255)));
        trocar.setOnClickListener(v -> { if (gravando != null) return; frente = !frente; trocar.animate().rotationBy(180).setDuration(250).start(); ligar(); });
        LinearLayout.LayoutParams lg = new LinearLayout.LayoutParams(dp(58), dp(58));
        LinearLayout.LayoutParams ld = new LinearLayout.LayoutParams(dp(80), dp(80)); ld.leftMargin = dp(40); ld.rightMargin = dp(40);
        linha.addView(galeria, lg); linha.addView(disparo, ld); linha.addView(trocar, new LinearLayout.LayoutParams(dp(58), dp(58)));
        HorizontalScrollView rolar = new HorizontalScrollView(this); rolar.setHorizontalScrollBarEnabled(false);
        modos = new LinearLayout(this); modos.setGravity(Gravity.CENTER); modos.setPadding(dp(8), dp(10), dp(8), 0);
        rolar.addView(modos);
        LinearLayout.LayoutParams lz = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT); lz.bottomMargin = dp(14);
        LinearLayout pro = new LinearLayout(this); pro.setGravity(Gravity.CENTER_VERTICAL); pro.setPadding(dp(20), 0, dp(20), dp(8));
        rotExp = botao("☀ 0", 13);
        exposicao = new SeekBar(this);
        exposicao.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar sb, int v, boolean user) {
                if (!user || camera == null) return;
                int min = camera.getCameraInfo().getExposureState().getExposureCompensationRange().getLower();
                int idx = v + min;
                camera.getCameraControl().setExposureCompensationIndex(idx);
                float passo = camera.getCameraInfo().getExposureState().getExposureCompensationStep().floatValue();
                rotExp.setText(String.format(Locale.US, "☀ %+.1f", idx * passo));
            }
            @Override public void onStartTrackingTouch(SeekBar sb) { }
            @Override public void onStopTrackingTouch(SeekBar sb) { }
        });
        pro.addView(rotExp); pro.addView(exposicao, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        pro.setVisibility(View.GONE); pro.setTag("pro");
        baixo.addView(pro, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        baixo.addView(zooms, lz); baixo.addView(linha);
        baixo.addView(rolar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        raiz.addView(baixo, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
        setContentView(raiz);

        /* pinça para zoom e toque para focar */
        pinca = new ScaleGestureDetector(this, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override public boolean onScale(ScaleGestureDetector d) {
                if (camera == null) return false;
                ZoomState z = camera.getCameraInfo().getZoomState().getValue();
                float atual = z == null ? 1f : z.getZoomRatio();
                aplicarZoom(atual * d.getScaleFactor());
                return true;
            }
        });
        toque = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override public boolean onSingleTapUp(MotionEvent e) { focar(e.getX(), e.getY()); return true; }
            @Override public boolean onDoubleTap(MotionEvent e) { if (gravando == null) { frente = !frente; ligar(); } return true; }
        });
        preview.setOnTouchListener((v, e) -> { pinca.onTouchEvent(e); if (!pinca.isInProgress()) toque.onTouchEvent(e); return true; });
        pintarModos(); pintarTopo(); pintarDisparo();
    }

    /* ---------- aparência ---------- */
    private void pintarTopo() {
        boolean foto = !M_VIDEO.equals(modo);
        String[] nomes = {"⚡̸", "⚡A", "⚡"};
        int idx = flash == ImageCapture.FLASH_MODE_AUTO ? 1 : flash == ImageCapture.FLASH_MODE_ON ? 2 : 0;
        bFlash.setText(foto ? nomes[idx] : (flash == ImageCapture.FLASH_MODE_ON ? "🔦" : "⚡̸"));
        bFlash.setContentDescription("Flash: " + (idx == 0 ? "desligado" : idx == 1 ? "automático" : "ligado"));
        bFlash.setVisibility(frente ? View.GONE : View.VISIBLE);
        boolean temHdr = extensoes != null && M_FOTO.equals(modo) && extensaoDisponivel(ExtensionMode.HDR);
        bHdr.setVisibility(temHdr ? View.VISIBLE : View.GONE);
        bHdr.setTextColor(hdr ? Color.rgb(255, 210, 60) : Color.WHITE);
        bGrade.setTextColor(grade ? Color.rgb(255, 210, 60) : Color.WHITE);
        bTimer.setText(timer == 0 ? "⏱" : "⏱" + timer + "s");
        bTimer.setTextColor(timer == 0 ? Color.WHITE : Color.rgb(255, 210, 60));
        bTimer.setVisibility(foto ? View.VISIBLE : View.GONE);
        if (gravando == null) tempo.setText("");
    }
    private void pintarModos() {
        modos.removeAllViews();
        List<String[]> lista = new ArrayList<>();
        if (extensoes != null && extensaoDisponivel(ExtensionMode.BOKEH)) lista.add(new String[]{M_RETRATO, "RETRATO"});
        lista.add(new String[]{M_FOTO, "FOTO"});
        lista.add(new String[]{M_VIDEO, "VÍDEO"});
        if (extensoes != null && extensaoDisponivel(ExtensionMode.NIGHT)) lista.add(new String[]{M_NOTURNO, "NOTURNO"});
        lista.add(new String[]{M_PRO, "PRO"});
        for (String[] m : lista) {
            TextView t = botao(m[1], 14);
            boolean on = m[0].equals(modo);
            t.setTextColor(on ? Color.WHITE : Color.argb(150, 255, 255, 255));
            t.setTypeface(null, on ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
            final String k = m[0];
            t.setOnClickListener(v -> trocarModo(k));
            modos.addView(t);
        }
    }
    private void pintarDisparo() {
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        boolean vid = M_VIDEO.equals(modo);
        g.setColor(gravando != null ? Color.rgb(225, 29, 72) : (vid ? Color.rgb(225, 29, 72) : Color.WHITE));
        g.setStroke(dp(5), gravando != null ? Color.WHITE : Color.argb(170, 255, 255, 255));
        if (gravando != null) { g.setShape(GradientDrawable.RECTANGLE); g.setCornerRadius(dp(18)); }
        disparo.setBackground(g);
    }
    private void pintarZooms() {
        zooms.removeAllViews();
        if (camera == null) return;
        ZoomState z = camera.getCameraInfo().getZoomState().getValue();
        if (z == null) return;
        float min = z.getMinZoomRatio(), max = z.getMaxZoomRatio(), at = z.getZoomRatio();
        List<Float> op = new ArrayList<>();
        if (min < 0.95f) op.add(min < 0.6f ? 0.5f : min);
        op.add(1f);
        if (max >= 2f) op.add(2f);
        if (max >= 5f) op.add(5f);
        if (op.size() < 2) return;
        for (Float r : op) {
            boolean on = Math.abs(at - r) < 0.05f || (r == 1f && at > 0.95f && at < 1.95f && !op.contains(at));
            TextView t = botao(on ? String.format(Locale.US, "%.1f×", at).replace(".0×", "×") : (r < 1 ? ".5" : String.valueOf(r.intValue())), on ? 14 : 12);
            t.setBackground(redondo(Color.argb(on ? 150 : 90, 0, 0, 0)));
            t.setTextColor(on ? Color.rgb(255, 210, 60) : Color.WHITE);
            final float alvo = r;
            t.setOnClickListener(v -> aplicarZoom(alvo));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(44), dp(44)); lp.leftMargin = dp(6); lp.rightMargin = dp(6);
            zooms.addView(t, lp);
        }
    }

    /* ---------- controles ---------- */
    private void trocarFlash() {
        if (M_VIDEO.equals(modo)) flash = flash == ImageCapture.FLASH_MODE_ON ? ImageCapture.FLASH_MODE_OFF : ImageCapture.FLASH_MODE_ON;
        else flash = flash == ImageCapture.FLASH_MODE_OFF ? ImageCapture.FLASH_MODE_AUTO : flash == ImageCapture.FLASH_MODE_AUTO ? ImageCapture.FLASH_MODE_ON : ImageCapture.FLASH_MODE_OFF;
        prefs.edit().putInt("flash", flash).apply();
        if (captura != null) captura.setFlashMode(flash);
        if (camera != null && M_VIDEO.equals(modo)) { try { camera.getCameraControl().enableTorch(flash == ImageCapture.FLASH_MODE_ON); } catch (Exception e) { } }
        pintarTopo();
    }
    private void aplicarZoom(float r) {
        if (camera == null) return;
        ZoomState z = camera.getCameraInfo().getZoomState().getValue();
        if (z != null) r = Math.max(z.getMinZoomRatio(), Math.min(z.getMaxZoomRatio(), r));
        camera.getCameraControl().setZoomRatio(r);
        h.postDelayed(this::pintarZooms, 120);
    }
    private void focar(float x, float y) {
        if (camera == null) return;
        try {
            MeteringPoint p = preview.getMeteringPointFactory().createPoint(x, y);
            FocusMeteringAction a = new FocusMeteringAction.Builder(p, FocusMeteringAction.FLAG_AF | FocusMeteringAction.FLAG_AE).setAutoCancelDuration(4, TimeUnit.SECONDS).build();
            camera.getCameraControl().startFocusAndMetering(a);
            anel.setX(x - dp(36)); anel.setY(y - dp(36));
            anel.setScaleX(1.4f); anel.setScaleY(1.4f); anel.setAlpha(1f);
            anel.animate().scaleX(1f).scaleY(1f).setDuration(200).withEndAction(() -> anel.animate().alpha(0f).setStartDelay(700).setDuration(300).start()).start();
        } catch (Exception e) { }
    }
    private void trocarModo(String m) {
        if (gravando != null || modo.equals(m)) return;
        modo = m; pintarModos(); pintarTopo(); pintarDisparo(); ligar();
    }
    private boolean extensaoDisponivel(int modoExt) {
        try {
            CameraSelector sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;
            return extensoes != null && provedor != null && provedor.hasCamera(sel) && extensoes.isExtensionAvailable(sel, modoExt);
        } catch (Exception e) { return false; }
    }

    /* ---------- câmera ---------- */
    private void iniciar() {
        final ListenableFuture<ProcessCameraProvider> f = ProcessCameraProvider.getInstance(this);
        f.addListener(() -> {
            try { provedor = f.get(); }
            catch (Exception e) { falhar("Não foi possível abrir a câmera."); return; }
            try {
                final ListenableFuture<ExtensionsManager> fe = ExtensionsManager.getInstanceAsync(this, provedor);
                fe.addListener(() -> {
                    try { extensoes = fe.get(); } catch (Exception e) { extensoes = null; }
                    pintarModos(); pintarTopo(); ligar();
                }, ContextCompat.getMainExecutor(this));
            } catch (Throwable t) { extensoes = null; ligar(); }
        }, ContextCompat.getMainExecutor(this));
    }

    private ResolutionSelector resolucao(Size alvo) {
        return new ResolutionSelector.Builder()
            .setAspectRatioStrategy(AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY)
            .setResolutionStrategy(new ResolutionStrategy(alvo, ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
            .build();
    }

    private void ligar() {
        if (provedor == null) return;
        try {
            provedor.unbindAll();
            CameraSelector sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;
            if (!provedor.hasCamera(sel)) { frente = !frente; sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA; }
            boolean vid = M_VIDEO.equals(modo);
            int ext = M_RETRATO.equals(modo) ? ExtensionMode.BOKEH : M_NOTURNO.equals(modo) ? ExtensionMode.NIGHT : (M_FOTO.equals(modo) && hdr) ? ExtensionMode.HDR : -1;
            if (ext >= 0 && extensoes != null) {
                try { if (extensoes.isExtensionAvailable(sel, ext)) sel = extensoes.getExtensionEnabledCameraSelector(sel, ext); } catch (Exception e) { }
            }
            Preview.Builder pb = new Preview.Builder().setResolutionSelector(resolucao(new Size(1920, 1080)));
            if (vid && estabilizar) { try { pb.setPreviewStabilizationEnabled(true); } catch (Throwable t) { } }
            Preview p = pb.build();
            p.setSurfaceProvider(preview.getSurfaceProvider());
            if (vid) {
                Recorder rec = new Recorder.Builder()
                    .setQualitySelector(QualitySelector.fromOrderedList(Arrays.asList(Quality.FHD, Quality.HD, Quality.SD), FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
                    .setTargetVideoEncodingBitRate(8_000_000)
                    .build();
                VideoCapture.Builder<Recorder> vb = new VideoCapture.Builder<>(rec);
                if (estabilizar) { try { vb.setVideoStabilizationEnabled(true); } catch (Throwable t) { } }
                video = vb.build();
                captura = null;
                try { camera = provedor.bindToLifecycle(this, sel, p, video); }
                catch (Exception e) {
                    /* aparelho sem estabilização: liga de novo sem ela */
                    if (!estabilizar) throw e;
                    estabilizar = false; ligar(); return;
                }
                if (flash == ImageCapture.FLASH_MODE_ON && !frente) { try { camera.getCameraControl().enableTorch(true); } catch (Exception e) { } }
            } else {
                captura = new ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                    .setFlashMode(frente ? ImageCapture.FLASH_MODE_OFF : flash)
                    .setResolutionSelector(resolucao(new Size(3840, 2160)))
                    .setJpegQuality(92)
                    .build();
                video = null;
                try { camera = provedor.bindToLifecycle(this, sel, p, captura); }
                catch (Exception e) {
                    /* modo especial que o aparelho não aguentou: volta para a foto normal */
                    if (ext < 0) throw e;
                    Toast.makeText(this, "Este modo não funcionou neste celular.", Toast.LENGTH_SHORT).show();
                    modo = M_FOTO; hdr = false; prefs.edit().putBoolean("hdr", false).apply(); pintarModos(); ligar(); return;
                }
            }
            camera.getCameraInfo().getZoomState().observe(this, z -> pintarZooms());
            /* modo PRO: compensação de exposição na mão */
            View pro = ((View) exposicao.getParent());
            boolean ehPro = M_PRO.equals(modo) && camera.getCameraInfo().getExposureState().isExposureCompensationSupported();
            pro.setVisibility(ehPro ? View.VISIBLE : View.GONE);
            if (ehPro) {
                android.util.Range<Integer> r = camera.getCameraInfo().getExposureState().getExposureCompensationRange();
                exposicao.setMax(r.getUpper() - r.getLower());
                exposicao.setProgress(camera.getCameraInfo().getExposureState().getExposureCompensationIndex() - r.getLower());
                rotExp.setText("☀ 0");
            }
            pintarTopo(); pintarZooms();
        } catch (Exception e) { falhar("Não foi possível usar esta câmera."); }
    }

    private File novoArquivo(String ext) {
        File d = new File(getCacheDir(), "chatmil");
        if (!d.exists()) d.mkdirs();
        return new File(d, "cam-" + System.currentTimeMillis() + "." + ext);
    }

    private void disparar() {
        if (!M_VIDEO.equals(modo)) {
            if (captura == null || !disparo.isEnabled()) return;
            if (timer > 0) { contar(timer); return; }
            fotografar();
            return;
        }
        if (video == null) return;
        if (gravando != null) { gravando.stop(); return; }
        Executor ex = ContextCompat.getMainExecutor(this);
        saida = novoArquivo("mp4");
        FileOutputOptions op = new FileOutputOptions.Builder(saida).setDurationLimitMillis(maxSeg * 1000L).build();
        PendingRecording pr = video.getOutput().prepareRecording(this, op);
        if (temAudio()) { try { pr = pr.withAudioEnabled(); } catch (SecurityException e) { } }
        gravando = pr.start(ex, ev -> {
            if (ev instanceof VideoRecordEvent.Finalize) {
                VideoRecordEvent.Finalize fin = (VideoRecordEvent.Finalize) ev;
                gravando = null; h.removeCallbacksAndMessages(null);
                if (!fin.hasError() || fin.getError() == VideoRecordEvent.Finalize.ERROR_DURATION_LIMIT_REACHED) concluir(saida, "video/mp4");
                else { pintarDisparo(); modos.setAlpha(1f); Toast.makeText(CameraActivity.this, "A gravação falhou. Tente de novo.", Toast.LENGTH_SHORT).show(); }
            }
        });
        inicio = System.currentTimeMillis();
        trocar.setAlpha(0.3f); modos.setAlpha(0.3f); galeria.setAlpha(0.3f);
        pintarDisparo();
        relogio();
    }
    private void contar(int n) {
        disparo.setEnabled(false);
        contagem.setVisibility(View.VISIBLE); contagem.setText(String.valueOf(n));
        contagem.setScaleX(1.3f); contagem.setScaleY(1.3f); contagem.animate().scaleX(1f).scaleY(1f).setDuration(300).start();
        if (n <= 1) { h.postDelayed(() -> { contagem.setVisibility(View.GONE); disparo.setEnabled(true); fotografar(); }, 1000); return; }
        h.postDelayed(() -> contar(n - 1), 1000);
    }
    private void fotografar() {
        if (captura == null) return;
        saida = novoArquivo("jpg");
        disparo.setEnabled(false);
        brilho.setAlpha(0.85f); brilho.animate().alpha(0f).setDuration(260).start();
        captura.takePicture(new ImageCapture.OutputFileOptions.Builder(saida).build(), ContextCompat.getMainExecutor(this), new ImageCapture.OnImageSavedCallback() {
            @Override public void onImageSaved(ImageCapture.OutputFileResults r) { concluir(saida, "image/jpeg"); }
            @Override public void onError(ImageCaptureException e) { disparo.setEnabled(true); Toast.makeText(CameraActivity.this, "Não deu para tirar a foto. Tente de novo.", Toast.LENGTH_SHORT).show(); }
        });
    }

    private void relogio() {
        if (gravando == null) return;
        long s = (System.currentTimeMillis() - inicio) / 1000, r = maxSeg - s;
        tempo.setText(String.format(Locale.US, "● %d:%02d  (faltam %d:%02d)", s / 60, s % 60, Math.max(0, r) / 60, Math.max(0, r) % 60));
        tempo.setTextColor(Color.rgb(255, 120, 140));
        h.postDelayed(this::relogio, 500);
    }

    /* ---------- galeria ---------- */
    private void abrirGaleria() {
        if (gravando != null) return;
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.setType("*/*");
        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
        i.addCategory(Intent.CATEGORY_OPENABLE);
        try { startActivityForResult(Intent.createChooser(i, "Escolher foto ou vídeo"), PEDIR_GALERIA); }
        catch (Exception e) { Toast.makeText(this, "Galeria indisponível.", Toast.LENGTH_SHORT).show(); }
    }
    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != PEDIR_GALERIA || res != RESULT_OK || data == null || data.getData() == null) return;
        Uri u = data.getData();
        try {
            String tipo = getContentResolver().getType(u);
            if (tipo == null) tipo = "image/jpeg";
            String ext = tipo.startsWith("video/") ? "mp4" : "jpg";
            try (Cursor c = getContentResolver().query(u, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                if (c != null && c.moveToFirst()) { String n = c.getString(0); if (n != null && n.contains(".")) ext = n.substring(n.lastIndexOf('.') + 1).toLowerCase(Locale.US); }
            } catch (Exception e) { }
            File f = novoArquivo(ext);
            try (InputStream in = getContentResolver().openInputStream(u); OutputStream out = new FileOutputStream(f)) {
                byte[] buf = new byte[65536]; int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            concluir(f, tipo);
        } catch (Exception e) { Toast.makeText(this, "Não deu para abrir esse arquivo.", Toast.LENGTH_SHORT).show(); }
    }

    /* botões de volume também fotografam (como na câmera do celular) */
    @Override
    public boolean onKeyDown(int code, KeyEvent ev) {
        if (code == KeyEvent.KEYCODE_VOLUME_DOWN || code == KeyEvent.KEYCODE_VOLUME_UP) { if (ev.getRepeatCount() == 0) disparar(); return true; }
        return super.onKeyDown(code, ev);
    }

    private void concluir(File f, String tipo) {
        if (terminou) return; terminou = true;
        Intent r = new Intent();
        r.putExtra("caminho", f.getAbsolutePath());
        r.putExtra("tipo", tipo);
        setResult(RESULT_OK, r);
        finish();
    }
    private void falhar(String msg) { Toast.makeText(this, msg, Toast.LENGTH_LONG).show(); cancelar(); }
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
