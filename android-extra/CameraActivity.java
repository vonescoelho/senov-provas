package br.com.senov.provas;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.drawable.GradientDrawable;
import android.media.ExifInterface;
import android.media.Image;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
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
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.ImageProxy;
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
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/* Câmera do ChatMil (CameraX), igual em todo o app (Flash, conversas, mural, visualização única):
   modos Retrato / Foto / Vídeo / Noturno / Pro (os que o aparelho tiver), HDR, flash, grade, temporizador,
   zoom, foco por toque, estabilização, botões de volume como disparador e galeria.
   Ferramentas à esquerda (como no Instagram): Loop (vai e volta), Square (várias fotos em grade)
   e Effects (5 estilos de cor). Respeita as barras do Android (nada fica embaixo dos botões do celular). */
public class CameraActivity extends AppCompatActivity {
    private static final int PEDIR_GALERIA = 41;
    private static final String M_RETRATO = "retrato", M_FOTO = "foto", M_VIDEO = "video", M_NOTURNO = "noturno", M_PRO = "pro";
    private static final int LOOP_W = 720, LOOP_H = 1280, LOOP_MS = 1500, LOOP_MAX = 26;
    private static final int AMARELO = Color.rgb(255, 210, 60);

    private FrameLayout raiz, mosaico;
    private PreviewView preview;
    private ProcessCameraProvider provedor;
    private ExtensionsManager extensoes;
    private Camera camera;
    private ImageCapture captura;
    private ImageAnalysis analise;
    private VideoCapture<Recorder> video;
    private Recording gravando;
    private boolean frente, terminou, grade, hdr, estabilizar = true, ocupado;
    private String modo = M_FOTO, efeito = "original";
    private int maxSeg, flash = ImageCapture.FLASH_MODE_OFF, timer = 0;
    private long inicio;
    private TextView tempo, contagem, aviso;
    private View disparo;
    private Icone galeria, trocar;
    private TextView bFlash, bHdr, bGrade, bTimer;
    private LinearLayout topo, baixo, modos, zooms, ferramentas, faixaEfeitos, faixaSquare, acoesSquare;
    private HorizontalScrollView rolarEfeitos;
    private View brilho, anel;
    private Grade vGrade;
    private SeekBar exposicao;
    private TextView rotExp;
    private final Handler h = new Handler(Looper.getMainLooper());
    private final ExecutorService trabalho = Executors.newSingleThreadExecutor();
    private File saida;
    private SharedPreferences prefs;
    private ScaleGestureDetector pinca;
    private GestureDetector toque;

    /* Loop */
    private boolean loop, capturandoLoop, loopFechado;
    private long loopInicio, loopUltimo;
    private final List<byte[]> quadros = new ArrayList<>();
    /* Square */
    private int square = 0, squareUltimo = 4;
    private final List<Bitmap> celulas = new ArrayList<>();
    private boolean ferrAbertas = true, efeitosAbertos;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        /* tela inteira, mas respeitando as barras do Android pelos "insets" */
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        try { getWindow().setStatusBarColor(Color.TRANSPARENT); getWindow().setNavigationBarColor(Color.argb(1, 0, 0, 0)); } catch (Throwable t) { }
        prefs = getSharedPreferences("chatmil_camera", MODE_PRIVATE);
        Intent i = getIntent();
        modo = "foto".equals(i.getStringExtra("modo")) ? M_FOTO : M_VIDEO;
        frente = i.getBooleanExtra("frente", false);
        maxSeg = Math.max(5, Math.min(600, i.getIntExtra("maxSeg", 180)));
        grade = prefs.getBoolean("grade", false);
        flash = prefs.getInt("flash", ImageCapture.FLASH_MODE_OFF);
        hdr = prefs.getBoolean("hdr", false);
        efeito = prefs.getString("efeito", "original");
        if (Efeitos.matriz(efeito) == null) efeito = "original";
        squareUltimo = prefs.getInt("square", 4);
        montarTela();
        try { new WindowInsetsControllerCompat(getWindow(), raiz).setAppearanceLightStatusBars(false); } catch (Throwable t) { }
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
        v.setShadowLayer(dp(3), 0, dp(1), Color.argb(140, 0, 0, 0));
        return v;
    }
    private GradientDrawable redondo(int cor) { GradientDrawable g = new GradientDrawable(); g.setShape(GradientDrawable.OVAL); g.setColor(cor); return g; }
    private GradientDrawable pilula(int cor, int borda) {
        GradientDrawable g = new GradientDrawable(); g.setCornerRadius(dp(40)); g.setColor(cor);
        if (borda != 0) g.setStroke(dp(2), borda);
        return g;
    }

    /* grade 3x3 por cima da imagem */
    private static class Grade extends View {
        private final Paint p = new Paint();
        Grade(android.content.Context c) { super(c); p.setColor(Color.argb(150, 255, 255, 255)); p.setStrokeWidth(2f); }
        @Override protected void onDraw(Canvas c) {
            float w = getWidth(), hh = getHeight();
            for (int k = 1; k < 3; k++) { c.drawLine(w * k / 3f, 0, w * k / 3f, hh, p); c.drawLine(0, hh * k / 3f, w, hh * k / 3f, p); }
        }
    }

    /* ícones desenhados (sem emoji): galeria, trocar câmera, loop, square, efeitos */
    static class Icone extends View {
        static final int GALERIA = 1, TROCAR = 2, LOOP = 3, SQUARE = 4, EFEITOS = 5;
        int tipo, n = 4; boolean ativo;
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        Icone(android.content.Context c, int tipo) { super(c); this.tipo = tipo; p.setStyle(Paint.Style.STROKE); p.setStrokeCap(Paint.Cap.ROUND); p.setStrokeJoin(Paint.Join.ROUND); }
        @Override protected void onDraw(Canvas c) {
            float w = getWidth(), hh = getHeight(), s = Math.min(w, hh), cx = w / 2f, cy = hh / 2f, r = s * 0.27f;
            p.setColor(ativo ? AMARELO : Color.WHITE); p.setStrokeWidth(Math.max(2f, s * 0.055f)); p.setStyle(Paint.Style.STROKE);
            switch (tipo) {
                case GALERIA: {
                    RectF q = new RectF(cx - r * 1.15f, cy - r, cx + r * 1.15f, cy + r);
                    c.drawRoundRect(q, r * 0.3f, r * 0.3f, p);
                    c.drawCircle(cx + r * 0.45f, cy - r * 0.4f, r * 0.18f, p);
                    Path m = new Path(); m.moveTo(q.left + r * 0.1f, q.bottom - r * 0.15f); m.lineTo(cx - r * 0.35f, cy - r * 0.05f); m.lineTo(cx + r * 0.15f, cy + r * 0.5f); m.lineTo(cx + r * 0.5f, cy + r * 0.2f); m.lineTo(q.right - r * 0.1f, q.bottom - r * 0.15f);
                    c.drawPath(m, p);
                    break;
                }
                case TROCAR: {
                    RectF a = new RectF(cx - r, cy - r, cx + r, cy + r);
                    c.drawArc(a, 200, 130, false, p);
                    c.drawArc(a, 20, 130, false, p);
                    seta(c, cx + r * (float) Math.cos(Math.toRadians(330)), cy + r * (float) Math.sin(Math.toRadians(330)), 60);
                    seta(c, cx + r * (float) Math.cos(Math.toRadians(150)), cy + r * (float) Math.sin(Math.toRadians(150)), 240);
                    break;
                }
                case LOOP: {
                    Path m = new Path(); float a = r * 1.35f;
                    for (int k = 0; k <= 72; k++) {
                        double t = k * Math.PI * 2 / 72, d = 1 + Math.sin(t) * Math.sin(t);
                        float x = cx + (float) (a * Math.cos(t) / d), y = cy + (float) (a * Math.sin(t) * Math.cos(t) / d);
                        if (k == 0) m.moveTo(x, y); else m.lineTo(x, y);
                    }
                    c.drawPath(m, p);
                    break;
                }
                case SQUARE: {
                    RectF q = new RectF(cx - r, cy - r * 1.2f, cx + r, cy + r * 1.2f);
                    c.drawRoundRect(q, r * 0.25f, r * 0.25f, p);
                    int col = n >= 4 ? 2 : 1, lin = n == 4 ? 2 : n == 6 ? 3 : n;
                    for (int k = 1; k < col; k++) c.drawLine(q.left + q.width() * k / col, q.top, q.left + q.width() * k / col, q.bottom, p);
                    for (int k = 1; k < lin; k++) c.drawLine(q.left, q.top + q.height() * k / lin, q.right, q.top + q.height() * k / lin, p);
                    break;
                }
                case EFEITOS: {
                    p.setStyle(Paint.Style.FILL_AND_STROKE);
                    estrela(c, cx - r * 0.2f, cy + r * 0.15f, r * 0.95f);
                    estrela(c, cx + r * 0.75f, cy - r * 0.75f, r * 0.42f);
                    break;
                }
            }
        }
        private void seta(Canvas c, float x, float y, float ang) {
            float l = getWidth() * 0.09f; double a1 = Math.toRadians(ang + 150), a2 = Math.toRadians(ang - 150);
            c.drawLine(x, y, x + (float) (l * Math.cos(a1)), y + (float) (l * Math.sin(a1)), p);
            c.drawLine(x, y, x + (float) (l * Math.cos(a2)), y + (float) (l * Math.sin(a2)), p);
        }
        private void estrela(Canvas c, float x, float y, float r) {
            Path m = new Path(); float k = r * 0.28f;
            m.moveTo(x, y - r); m.quadTo(x + k * 0.4f, y - k * 0.4f, x + r, y); m.quadTo(x + k * 0.4f, y + k * 0.4f, x, y + r);
            m.quadTo(x - k * 0.4f, y + k * 0.4f, x - r, y); m.quadTo(x - k * 0.4f, y - k * 0.4f, x, y - r); m.close();
            c.drawPath(m, p);
        }
    }

    private void montarTela() {
        raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.BLACK);
        mosaico = new FrameLayout(this); mosaico.setVisibility(View.GONE); mosaico.setBackgroundColor(Color.rgb(24, 24, 28));
        raiz.addView(mosaico, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        preview = new PreviewView(this);
        preview.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        preview.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        preview.setOnHierarchyChangeListener(new ViewGroup.OnHierarchyChangeListener() {
            @Override public void onChildViewAdded(View pai, View filho) { h.post(CameraActivity.this::aplicarEfeitoPrevia); }
            @Override public void onChildViewRemoved(View pai, View filho) { }
        });
        raiz.addView(preview, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        vGrade = new Grade(this); vGrade.setVisibility(grade ? View.VISIBLE : View.GONE);
        raiz.addView(vGrade, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        anel = new View(this);
        GradientDrawable ga = new GradientDrawable(); ga.setShape(GradientDrawable.OVAL); ga.setStroke(dp(2), AMARELO); ga.setColor(Color.TRANSPARENT);
        anel.setBackground(ga); anel.setAlpha(0f);
        raiz.addView(anel, new FrameLayout.LayoutParams(dp(72), dp(72)));

        brilho = new View(this); brilho.setBackgroundColor(Color.WHITE); brilho.setAlpha(0f);
        raiz.addView(brilho, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        contagem = botao("", 96); contagem.setAlpha(0.95f); contagem.setVisibility(View.GONE);
        raiz.addView(contagem, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        aviso = botao("", 16); aviso.setVisibility(View.GONE); aviso.setBackground(pilula(Color.argb(170, 0, 0, 0), 0)); aviso.setPadding(dp(18), dp(10), dp(18), dp(10));
        raiz.addView(aviso, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));

        /* barra de cima: fechar · tempo · flash · HDR · grade · temporizador */
        topo = new LinearLayout(this);
        topo.setOrientation(LinearLayout.HORIZONTAL); topo.setGravity(Gravity.CENTER_VERTICAL);
        topo.setPadding(dp(6), dp(30), dp(6), dp(6));
        topo.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Color.argb(150, 0, 0, 0), Color.TRANSPARENT}));
        TextView fechar = botao("✕", 22); fechar.setContentDescription("Fechar câmera"); fechar.setOnClickListener(v -> cancelar());
        tempo = botao("", 15);
        bFlash = botao("", 15); bFlash.setOnClickListener(v -> trocarFlash());
        bHdr = botao("HDR", 14); bHdr.setOnClickListener(v -> { hdr = !hdr; prefs.edit().putBoolean("hdr", hdr).apply(); pintarTopo(); ligar(); });
        bGrade = botao("#", 18); bGrade.setContentDescription("Grade"); bGrade.setOnClickListener(v -> { grade = !grade; prefs.edit().putBoolean("grade", grade).apply(); vGrade.setVisibility(grade && square == 0 ? View.VISIBLE : View.GONE); pintarTopo(); });
        bTimer = botao("⏱", 16); bTimer.setContentDescription("Temporizador"); bTimer.setOnClickListener(v -> { timer = timer == 0 ? 3 : timer == 3 ? 10 : 0; pintarTopo(); });
        topo.addView(fechar); topo.addView(tempo, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        topo.addView(bFlash); topo.addView(bHdr); topo.addView(bGrade); topo.addView(bTimer);
        raiz.addView(topo, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));

        /* ferramentas à esquerda (Loop, Square, Effects) */
        ferramentas = new LinearLayout(this); ferramentas.setOrientation(LinearLayout.VERTICAL); ferramentas.setPadding(dp(10), 0, dp(4), 0);
        raiz.addView(ferramentas, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.START | Gravity.CENTER_VERTICAL));

        /* parte de baixo: estilos · square · zoom · galeria / disparador / trocar · modos */
        baixo = new LinearLayout(this);
        baixo.setOrientation(LinearLayout.VERTICAL); baixo.setGravity(Gravity.CENTER_HORIZONTAL);
        baixo.setPadding(0, dp(8), 0, dp(26));
        baixo.setBackground(new GradientDrawable(GradientDrawable.Orientation.BOTTOM_TOP, new int[]{Color.argb(170, 0, 0, 0), Color.TRANSPARENT}));

        rolarEfeitos = new HorizontalScrollView(this); rolarEfeitos.setHorizontalScrollBarEnabled(false); rolarEfeitos.setVisibility(View.GONE);
        faixaEfeitos = new LinearLayout(this); faixaEfeitos.setPadding(dp(10), 0, dp(10), dp(10)); faixaEfeitos.setGravity(Gravity.CENTER_VERTICAL);
        rolarEfeitos.addView(faixaEfeitos);
        baixo.addView(rolarEfeitos, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        faixaSquare = new LinearLayout(this); faixaSquare.setGravity(Gravity.CENTER); faixaSquare.setVisibility(View.GONE); faixaSquare.setPadding(0, 0, 0, dp(10));
        baixo.addView(faixaSquare, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        acoesSquare = new LinearLayout(this); acoesSquare.setGravity(Gravity.CENTER); acoesSquare.setVisibility(View.GONE); acoesSquare.setPadding(0, 0, 0, dp(10));
        baixo.addView(acoesSquare, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        zooms = new LinearLayout(this); zooms.setGravity(Gravity.CENTER);
        LinearLayout linha = new LinearLayout(this); linha.setGravity(Gravity.CENTER_VERTICAL);
        galeria = new Icone(this, Icone.GALERIA); galeria.setContentDescription("Galeria"); galeria.setBackground(redondo(Color.argb(90, 255, 255, 255)));
        galeria.setOnClickListener(v -> abrirGaleria());
        disparo = new View(this); disparo.setContentDescription("Fotografar ou gravar"); disparo.setOnClickListener(v -> disparar());
        trocar = new Icone(this, Icone.TROCAR); trocar.setContentDescription("Trocar câmera"); trocar.setBackground(redondo(Color.argb(90, 255, 255, 255)));
        trocar.setOnClickListener(v -> { if (gravando != null || capturandoLoop || ocupado) return; frente = !frente; trocar.animate().rotationBy(180).setDuration(250).start(); ligar(); });
        LinearLayout.LayoutParams ld = new LinearLayout.LayoutParams(dp(80), dp(80)); ld.leftMargin = dp(40); ld.rightMargin = dp(40);
        linha.addView(galeria, new LinearLayout.LayoutParams(dp(56), dp(56))); linha.addView(disparo, ld); linha.addView(trocar, new LinearLayout.LayoutParams(dp(56), dp(56)));
        HorizontalScrollView rolar = new HorizontalScrollView(this); rolar.setHorizontalScrollBarEnabled(false);
        modos = new LinearLayout(this); modos.setGravity(Gravity.CENTER); modos.setPadding(dp(8), dp(12), dp(8), 0);
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
        pro.setVisibility(View.GONE);
        baixo.addView(pro, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        baixo.addView(zooms, lz); baixo.addView(linha);
        baixo.addView(rolar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        raiz.addView(baixo, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
        setContentView(raiz);

        /* barras do Android: o topo desce abaixo da barra de status e os modos sobem acima dos botões do celular */
        ViewCompat.setOnApplyWindowInsetsListener(raiz, (v, ins) -> {
            Insets bar = ins.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            topo.setPadding(dp(6) + bar.left, bar.top + dp(6), dp(6) + bar.right, dp(10));
            baixo.setPadding(bar.left, dp(10), bar.right, bar.bottom + dp(16));
            ferramentas.setPadding(dp(10) + bar.left, 0, dp(4), 0);
            return ins;
        });

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
            @Override public boolean onDoubleTap(MotionEvent e) { if (gravando == null && !capturandoLoop && !ocupado) { frente = !frente; ligar(); } return true; }
        });
        preview.setOnTouchListener((v, e) -> { pinca.onTouchEvent(e); if (!pinca.isInProgress()) toque.onTouchEvent(e); return true; });
        pintarModos(); pintarTopo(); pintarDisparo(); pintarFerramentas(); pintarEfeitos();
    }

    /* ---------- aparência ---------- */
    private void pintarTopo() {
        boolean foto = !M_VIDEO.equals(modo) || loop;
        String[] nomes = {"⚡̸", "⚡A", "⚡"};
        int idx = flash == ImageCapture.FLASH_MODE_AUTO ? 1 : flash == ImageCapture.FLASH_MODE_ON ? 2 : 0;
        bFlash.setText(!M_VIDEO.equals(modo) ? nomes[idx] : (flash == ImageCapture.FLASH_MODE_ON ? "🔦" : "⚡̸"));
        bFlash.setContentDescription("Flash: " + (idx == 0 ? "desligado" : idx == 1 ? "automático" : "ligado"));
        bFlash.setVisibility(frente || loop || square > 0 ? View.GONE : View.VISIBLE);
        boolean temHdr = extensoes != null && M_FOTO.equals(modo) && !loop && square == 0 && extensaoDisponivel(ExtensionMode.HDR);
        bHdr.setVisibility(temHdr ? View.VISIBLE : View.GONE);
        bHdr.setTextColor(hdr ? AMARELO : Color.WHITE);
        bGrade.setTextColor(grade ? AMARELO : Color.WHITE);
        bTimer.setText(timer == 0 ? "⏱" : "⏱" + timer + "s");
        bTimer.setTextColor(timer == 0 ? Color.WHITE : AMARELO);
        bTimer.setVisibility(foto && !loop ? View.VISIBLE : View.GONE);
        if (gravando == null && !capturandoLoop) {
            tempo.setTextColor(Color.WHITE);
            tempo.setText(loop ? "Loop" : square > 0 ? "Square · " + Math.min(celulas.size() + 1, square) + " de " + square : "");
        }
    }
    private void pintarModos() {
        modos.removeAllViews();
        List<String[]> lista = new ArrayList<>();
        if (extensoes != null && extensaoDisponivel(ExtensionMode.BOKEH)) lista.add(new String[]{M_RETRATO, "RETRATO"});
        lista.add(new String[]{M_FOTO, "FOTO"});
        lista.add(new String[]{M_VIDEO, "VÍDEO"});
        if (extensoes != null && extensaoDisponivel(ExtensionMode.NIGHT)) lista.add(new String[]{M_NOTURNO, "NOTURNO"});
        lista.add(new String[]{M_PRO, "PRO"});
        boolean ferr = loop || square > 0;
        for (String[] m : lista) {
            TextView t = botao(m[1], 14);
            boolean on = !ferr && m[0].equals(modo);
            t.setTextColor(on ? AMARELO : Color.argb(170, 255, 255, 255));
            t.setTypeface(null, on ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
            t.setPadding(dp(13), dp(8), dp(13), dp(8));
            final String k = m[0];
            t.setOnClickListener(v -> trocarModo(k));
            modos.addView(t);
        }
    }
    private void pintarDisparo() {
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        boolean vid = M_VIDEO.equals(modo) && !loop && square == 0;
        boolean rec = gravando != null || capturandoLoop;
        g.setColor(rec ? Color.rgb(225, 29, 72) : vid ? Color.rgb(225, 29, 72) : Color.WHITE);
        g.setStroke(dp(5), rec ? Color.WHITE : loop ? AMARELO : Color.argb(170, 255, 255, 255));
        if (gravando != null) { g.setShape(GradientDrawable.RECTANGLE); g.setCornerRadius(dp(18)); }
        disparo.setBackground(g);
    }
    private void pintarFerramentas() {
        ferramentas.removeAllViews();
        boolean livre = gravando == null && !capturandoLoop && !ocupado;
        ferramentas.setVisibility(livre ? View.VISIBLE : View.INVISIBLE);
        if (!ferrAbertas) { ferramentas.addView(itemFerramenta(Icone.EFEITOS, "Ferramentas", false, v -> { ferrAbertas = true; pintarFerramentas(); })); return; }
        ferramentas.addView(itemFerramenta(Icone.LOOP, "Loop", loop, v -> alternarLoop()));
        View sq = itemFerramenta(Icone.SQUARE, "Square", square > 0, v -> alternarSquare());
        ferramentas.addView(sq);
        ferramentas.addView(itemFerramenta(Icone.EFEITOS, "Effects", efeitosAbertos || !"original".equals(efeito), v -> { efeitosAbertos = !efeitosAbertos; pintarEfeitos(); pintarFerramentas(); }));
        TextView fecharF = botao("︿  Fechar", 13); fecharF.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        fecharF.setOnClickListener(v -> { ferrAbertas = false; efeitosAbertos = false; pintarEfeitos(); pintarFerramentas(); });
        ferramentas.addView(fecharF);
    }
    private View itemFerramenta(int tipo, String nome, boolean ativo, View.OnClickListener ok) {
        LinearLayout l = new LinearLayout(this); l.setGravity(Gravity.CENTER_VERTICAL); l.setPadding(0, dp(5), dp(6), dp(5));
        Icone ic = new Icone(this, tipo); ic.ativo = ativo; if (tipo == Icone.SQUARE) ic.n = square > 0 ? square : squareUltimo;
        ic.setBackground(redondo(ativo ? Color.argb(150, 0, 0, 0) : Color.argb(90, 0, 0, 0)));
        l.addView(ic, new LinearLayout.LayoutParams(dp(46), dp(46)));
        TextView t = botao(nome, 14); t.setPadding(dp(10), 0, 0, 0); t.setTypeface(null, android.graphics.Typeface.BOLD);
        if (ativo) t.setTextColor(AMARELO);
        l.addView(t);
        l.setOnClickListener(ok); l.setContentDescription(nome);
        return l;
    }
    private void pintarEfeitos() {
        faixaEfeitos.removeAllViews();
        for (int i = 0; i < Efeitos.CHAVES.length; i++) {
            final String k = Efeitos.CHAVES[i];
            boolean on = k.equals(efeito);
            LinearLayout chip = new LinearLayout(this); chip.setGravity(Gravity.CENTER_VERTICAL); chip.setPadding(dp(10), dp(7), dp(14), dp(7));
            chip.setBackground(pilula(on ? Color.argb(200, 0, 0, 0) : Color.argb(110, 0, 0, 0), on ? AMARELO : 0));
            View bola = new View(this); bola.setBackground(redondo(Efeitos.CORES[i]));
            chip.addView(bola, new LinearLayout.LayoutParams(dp(14), dp(14)));
            TextView t = botao(Efeitos.NOMES[i], 13); t.setPadding(dp(8), 0, 0, 0); t.setTextColor(on ? AMARELO : Color.WHITE);
            chip.addView(t);
            chip.setOnClickListener(v -> { efeito = k; prefs.edit().putString("efeito", k).apply(); aplicarEfeitoPrevia(); pintarEfeitos(); pintarFerramentas(); });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT); lp.rightMargin = dp(8);
            faixaEfeitos.addView(chip, lp);
        }
        rolarEfeitos.setVisibility(efeitosAbertos ? View.VISIBLE : View.GONE);
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
            t.setPadding(0, 0, 0, 0);
            t.setBackground(redondo(Color.argb(on ? 150 : 90, 0, 0, 0)));
            t.setTextColor(on ? AMARELO : Color.WHITE);
            final float alvo = r;
            t.setOnClickListener(v -> aplicarZoom(alvo));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(44), dp(44)); lp.leftMargin = dp(6); lp.rightMargin = dp(6);
            zooms.addView(t, lp);
        }
    }

    /* ---------- efeitos de cor ---------- */
    private TextureView acharTextura(View v) {
        if (v instanceof TextureView) return (TextureView) v;
        if (v instanceof ViewGroup) {
            ViewGroup g = (ViewGroup) v;
            for (int i = 0; i < g.getChildCount(); i++) { TextureView t = acharTextura(g.getChildAt(i)); if (t != null) return t; }
        }
        return null;
    }
    private Paint pinturaEfeito() {
        ColorMatrix m = Efeitos.matriz(efeito);
        if (m == null) return null;
        Paint p = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
        p.setColorFilter(new ColorMatrixColorFilter(m));
        return p;
    }
    private void aplicarEfeitoPrevia() {
        try { TextureView t = acharTextura(preview); if (t != null) t.setLayerPaint(pinturaEfeito()); } catch (Throwable e) { }
    }
    /* aplica o estilo na foto já salva (respeitando a orientação) */
    private void efeitoNaFoto(File f) throws Exception {
        Paint p = pinturaEfeito();
        if (p == null) return;
        int ori = ExifInterface.ORIENTATION_NORMAL;
        try { ori = new ExifInterface(f.getAbsolutePath()).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL); } catch (Exception e) { }
        BitmapFactory.Options op = new BitmapFactory.Options(); op.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getAbsolutePath(), op);
        int amostra = 1;
        while (Math.max(op.outWidth, op.outHeight) / amostra > 3000) amostra *= 2;
        BitmapFactory.Options op2 = new BitmapFactory.Options(); op2.inSampleSize = amostra;
        Bitmap src = BitmapFactory.decodeFile(f.getAbsolutePath(), op2);
        if (src == null) return;
        int w = src.getWidth(), hh = src.getHeight(), graus = ori == ExifInterface.ORIENTATION_ROTATE_90 ? 90 : ori == ExifInterface.ORIENTATION_ROTATE_180 ? 180 : ori == ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
        int ow = graus % 180 == 0 ? w : hh, oh = graus % 180 == 0 ? hh : w;
        Bitmap out = Bitmap.createBitmap(ow, oh, Bitmap.Config.ARGB_8888);
        Matrix m = new Matrix();
        m.postRotate(graus);
        if (graus == 90) m.postTranslate(hh, 0); else if (graus == 180) m.postTranslate(w, hh); else if (graus == 270) m.postTranslate(0, w);
        new Canvas(out).drawBitmap(src, m, p);
        src.recycle();
        try (FileOutputStream o = new FileOutputStream(f)) { out.compress(Bitmap.CompressFormat.JPEG, 92, o); }
        out.recycle();
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
            anel.setX(preview.getX() + x - dp(36)); anel.setY(preview.getY() + y - dp(36));
            anel.setScaleX(1.4f); anel.setScaleY(1.4f); anel.setAlpha(1f);
            anel.animate().scaleX(1f).scaleY(1f).setDuration(200).withEndAction(() -> anel.animate().alpha(0f).setStartDelay(700).setDuration(300).start()).start();
        } catch (Exception e) { }
    }
    private void trocarModo(String m) {
        if (gravando != null || capturandoLoop || ocupado) return;
        boolean ferr = loop || square > 0;
        if (modo.equals(m) && !ferr) return;
        if (loop) loop = false;
        if (square > 0) sairSquare();
        modo = m; pintarModos(); pintarTopo(); pintarDisparo(); pintarFerramentas(); ligar();
    }
    private boolean extensaoDisponivel(int modoExt) {
        try {
            CameraSelector sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;
            return extensoes != null && provedor != null && provedor.hasCamera(sel) && extensoes.isExtensionAvailable(sel, modoExt);
        } catch (Exception e) { return false; }
    }

    /* ---------- Loop ---------- */
    private void alternarLoop() {
        if (gravando != null || capturandoLoop || ocupado) return;
        if (square > 0) sairSquare();
        loop = !loop;
        if (loop && M_VIDEO.equals(modo)) modo = M_FOTO;
        pintarModos(); pintarTopo(); pintarDisparo(); pintarFerramentas(); ligar();
        if (loop) mostrarAviso("Loop: toque no botão e segure o celular parado", 2200);
    }
    /* chamado pela análise de imagem (fora da tela principal) */
    private void quadroLoop(ImageProxy img) {
        try {
            if (!capturandoLoop) return;
            long agora = System.currentTimeMillis();
            if (agora - loopUltimo < 62) return;
            loopUltimo = agora;
            Bitmap bm = img.toBitmap();
            int rot = img.getImageInfo().getRotationDegrees();
            Matrix m = new Matrix();
            m.postRotate(rot);
            RectF r = new RectF(0, 0, bm.getWidth(), bm.getHeight());
            m.mapRect(r);
            m.postTranslate(-r.left, -r.top);
            if (frente) { m.postScale(-1, 1); m.postTranslate(r.width(), 0); }
            float k = Math.max(LOOP_W / r.width(), LOOP_H / r.height());
            m.postScale(k, k);
            m.postTranslate((LOOP_W - r.width() * k) / 2f, (LOOP_H - r.height() * k) / 2f);
            Bitmap q = Bitmap.createBitmap(LOOP_W, LOOP_H, Bitmap.Config.ARGB_8888);
            Paint p = pinturaEfeito();
            if (p == null) p = new Paint(Paint.FILTER_BITMAP_FLAG);
            new Canvas(q).drawBitmap(bm, m, p);
            bm.recycle();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            q.compress(Bitmap.CompressFormat.JPEG, 88, out);
            q.recycle();
            synchronized (quadros) { quadros.add(out.toByteArray()); }
            int n; synchronized (quadros) { n = quadros.size(); }
            if (n >= LOOP_MAX || agora - loopInicio >= LOOP_MS) { capturandoLoop = false; h.post(this::fecharLoop); }
        } catch (Throwable t) {
            capturandoLoop = false; h.post(() -> { Toast.makeText(this, "O Loop não funcionou neste celular.", Toast.LENGTH_SHORT).show(); pintarDisparo(); pintarFerramentas(); pintarTopo(); });
        } finally { img.close(); }
    }
    private void comecarLoop() {
        if (analise == null || capturandoLoop || ocupado) return;
        synchronized (quadros) { quadros.clear(); }
        loopInicio = System.currentTimeMillis(); loopUltimo = 0;
        loopFechado = false; capturandoLoop = true;
        tempo.setText("● Loop"); tempo.setTextColor(Color.rgb(255, 120, 140));
        pintarDisparo(); pintarFerramentas();
        disparo.animate().scaleX(1.12f).scaleY(1.12f).setDuration(LOOP_MS / 2).withEndAction(() -> disparo.animate().scaleX(1f).scaleY(1f).setDuration(LOOP_MS / 2).start()).start();
        h.postDelayed(() -> { if (capturandoLoop) { capturandoLoop = false; fecharLoop(); } }, LOOP_MS + 900);
    }
    private void fecharLoop() {
        if (loopFechado || ocupado || terminou) return;
        loopFechado = true;
        final List<byte[]> l;
        synchronized (quadros) { l = new ArrayList<>(quadros); quadros.clear(); }
        if (l.size() < 4) { Toast.makeText(this, "Loop muito curto. Tente de novo.", Toast.LENGTH_SHORT).show(); pintarDisparo(); pintarFerramentas(); pintarTopo(); return; }
        ocupado = true; pintarFerramentas(); mostrarAviso("Criando o Loop…", 0);
        trabalho.execute(() -> {
            try {
                File f = codificarLoop(l);
                h.post(() -> { ocupado = false; concluir(f, "video/mp4", false); });
            } catch (Throwable t) {
                h.post(() -> { ocupado = false; esconderAviso(); pintarDisparo(); pintarFerramentas(); pintarTopo(); Toast.makeText(this, "Não deu para criar o Loop neste celular.", Toast.LENGTH_LONG).show(); });
            }
        });
    }
    /* vai e volta 3 vezes, 30 quadros por segundo, H.264 */
    private File codificarLoop(List<byte[]> l) throws Exception {
        List<Integer> ordem = new ArrayList<>();
        for (int volta = 0; volta < 3; volta++) {
            for (int i = 0; i < l.size(); i++) ordem.add(i);
            for (int i = l.size() - 2; i > 0; i--) ordem.add(i);
        }
        File out = novoArquivo("mp4");
        MediaFormat fmt = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, LOOP_W, LOOP_H);
        fmt.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible);
        fmt.setInteger(MediaFormat.KEY_BIT_RATE, 5_000_000);
        fmt.setInteger(MediaFormat.KEY_FRAME_RATE, 30);
        fmt.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
        MediaCodec enc = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC);
        MediaMuxer mux = null;
        boolean muxOn = false;
        try {
            enc.configure(fmt, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
            enc.start();
            mux = new MediaMuxer(out.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            int faixa = -1, k = 0;
            int[] px = new int[LOOP_W * LOOP_H];
            MediaCodec.BufferInfo bi = new MediaCodec.BufferInfo();
            boolean fimEntrada = false, fimSaida = false;
            final long passo = 1_000_000L / 30;
            long limite = System.currentTimeMillis() + 60_000;
            while (!fimSaida) {
                if (System.currentTimeMillis() > limite) throw new Exception("demorou");
                if (!fimEntrada) {
                    int ib = enc.dequeueInputBuffer(10_000);
                    if (ib >= 0) {
                        if (k >= ordem.size()) {
                            enc.queueInputBuffer(ib, 0, 0, k * passo, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                            fimEntrada = true;
                        } else {
                            byte[] j = l.get(ordem.get(k));
                            Bitmap b = BitmapFactory.decodeByteArray(j, 0, j.length);
                            b.getPixels(px, 0, LOOP_W, 0, 0, LOOP_W, LOOP_H);
                            b.recycle();
                            ByteBuffer cap = enc.getInputBuffer(ib);
                            int tamanho = cap == null ? LOOP_W * LOOP_H * 3 / 2 : Math.min(cap.capacity(), LOOP_W * LOOP_H * 3 / 2);
                            Image im = enc.getInputImage(ib);
                            if (im == null) throw new Exception("sem imagem de entrada");
                            escreverYuv(im, px);
                            enc.queueInputBuffer(ib, 0, tamanho, k * passo, 0);
                            k++;
                        }
                    }
                }
                int ob = enc.dequeueOutputBuffer(bi, 10_000);
                if (ob == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    faixa = mux.addTrack(enc.getOutputFormat()); mux.start(); muxOn = true;
                } else if (ob >= 0) {
                    ByteBuffer bb = enc.getOutputBuffer(ob);
                    if ((bi.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) bi.size = 0;
                    if (bi.size > 0 && muxOn && bb != null) { bb.position(bi.offset); bb.limit(bi.offset + bi.size); mux.writeSampleData(faixa, bb, bi); }
                    enc.releaseOutputBuffer(ob, false);
                    if ((bi.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) fimSaida = true;
                }
            }
        } finally {
            try { enc.stop(); } catch (Exception e) { }
            enc.release();
            if (mux != null) { try { if (muxOn) mux.stop(); } catch (Exception e) { } mux.release(); }
        }
        if (!muxOn || out.length() < 1000) throw new Exception("vídeo vazio");
        return out;
    }
    /* RGB → YUV 4:2:0 (BT.601), respeitando o formato de cada celular (planar ou intercalado) */
    private static void escreverYuv(Image im, int[] px) {
        Image.Plane[] p = im.getPlanes();
        ByteBuffer y = p[0].getBuffer(), u = p[1].getBuffer(), v = p[2].getBuffer();
        int ys = p[0].getRowStride(), yp = p[0].getPixelStride();
        int us = p[1].getRowStride(), up = p[1].getPixelStride();
        int vs = p[2].getRowStride(), vp = p[2].getPixelStride();
        int W = LOOP_W, H = LOOP_H;
        for (int j = 0; j < H; j++) {
            int base = j * W;
            for (int i = 0; i < W; i++) {
                int c = px[base + i], r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
                int Y = ((66 * r + 129 * g + 25 * b + 128) >> 8) + 16;
                y.put(j * ys + i * yp, (byte) (Y < 0 ? 0 : Y > 255 ? 255 : Y));
                if ((j & 1) == 0 && (i & 1) == 0) {
                    int U = ((-38 * r - 74 * g + 112 * b + 128) >> 8) + 128;
                    int V = ((112 * r - 94 * g - 18 * b + 128) >> 8) + 128;
                    u.put((j >> 1) * us + (i >> 1) * up, (byte) (U < 0 ? 0 : U > 255 ? 255 : U));
                    v.put((j >> 1) * vs + (i >> 1) * vp, (byte) (V < 0 ? 0 : V > 255 ? 255 : V));
                }
            }
        }
    }

    /* ---------- Square (várias fotos numa grade) ---------- */
    private void alternarSquare() {
        if (gravando != null || capturandoLoop || ocupado) return;
        if (square > 0) { sairSquare(); pintarModos(); pintarTopo(); pintarDisparo(); pintarFerramentas(); ligar(); return; }
        loop = false;
        if (!M_FOTO.equals(modo)) modo = M_FOTO;
        entrarSquare(squareUltimo);
        pintarModos(); pintarTopo(); pintarDisparo(); pintarFerramentas(); ligar();
    }
    private void entrarSquare(int n) {
        square = n; squareUltimo = n; prefs.edit().putInt("square", n).apply();
        limparCelulas();
        vGrade.setVisibility(View.GONE);
        mosaico.setVisibility(View.VISIBLE);
        pintarFaixaSquare();
        h.post(this::posicionarSquare);
    }
    private void sairSquare() {
        square = 0; limparCelulas();
        mosaico.removeAllViews(); mosaico.setVisibility(View.GONE);
        faixaSquare.setVisibility(View.GONE); acoesSquare.setVisibility(View.GONE);
        preview.setVisibility(View.VISIBLE);
        preview.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        vGrade.setVisibility(grade ? View.VISIBLE : View.GONE);
        h.postDelayed(this::aplicarEfeitoPrevia, 200);
    }
    private void limparCelulas() { mosaico.removeAllViews(); for (Bitmap b : celulas) b.recycle(); celulas.clear(); }
    private Rect celula(int i) {
        int W = raiz.getWidth(), H = raiz.getHeight();
        int col = square >= 4 ? 2 : 1, lin = square == 4 ? 2 : square == 6 ? 3 : square;
        int c = i % col, l = i / col;
        return new Rect(W * c / col, H * l / lin, W * (c + 1) / col, H * (l + 1) / lin);
    }
    private void pintarFaixaSquare() {
        faixaSquare.removeAllViews();
        int[] ops = {2, 3, 4, 6};
        for (int n : ops) {
            Icone ic = new Icone(this, Icone.SQUARE); ic.n = n; ic.ativo = n == square;
            ic.setBackground(redondo(Color.argb(n == square ? 170 : 90, 0, 0, 0)));
            ic.setContentDescription("Grade de " + n);
            ic.setOnClickListener(v -> { if (celulas.isEmpty() || n != square) { entrarSquare(n); pintarTopo(); pintarFerramentas(); } });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(42), dp(42)); lp.leftMargin = dp(7); lp.rightMargin = dp(7);
            faixaSquare.addView(ic, lp);
        }
        boolean completo = celulas.size() >= square;
        faixaSquare.setVisibility(square > 0 && celulas.isEmpty() ? View.VISIBLE : View.GONE);
        acoesSquare.removeAllViews();
        if (square > 0 && !celulas.isEmpty()) {
            TextView desfazer = botao("↶ Desfazer", 14); desfazer.setBackground(pilula(Color.argb(140, 0, 0, 0), 0));
            desfazer.setOnClickListener(v -> desfazerSquare());
            acoesSquare.addView(desfazer);
            if (completo) {
                TextView pronto = botao("✓ Usar", 15); pronto.setBackground(pilula(AMARELO, 0)); pronto.setTextColor(Color.BLACK);
                pronto.setTypeface(null, android.graphics.Typeface.BOLD);
                pronto.setOnClickListener(v -> salvarSquare());
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT); lp.leftMargin = dp(14);
                acoesSquare.addView(pronto, lp);
            }
        }
        acoesSquare.setVisibility(acoesSquare.getChildCount() > 0 ? View.VISIBLE : View.GONE);
    }
    /* mostra as fotos já tiradas e coloca a câmera no próximo espaço da grade */
    private void posicionarSquare() {
        if (square == 0) return;
        mosaico.removeAllViews();
        for (int i = 0; i < square; i++) {
            Rect r = celula(i);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(r.width(), r.height()); lp.leftMargin = r.left; lp.topMargin = r.top; lp.gravity = Gravity.TOP | Gravity.START;
            if (i < celulas.size()) {
                ImageView iv = new ImageView(this); iv.setScaleType(ImageView.ScaleType.CENTER_CROP); iv.setImageBitmap(celulas.get(i));
                mosaico.addView(iv, lp);
            } else {
                View vazio = new View(this);
                GradientDrawable g = new GradientDrawable(); g.setColor(Color.rgb(30, 30, 36)); g.setStroke(1, Color.argb(60, 255, 255, 255));
                vazio.setBackground(g);
                mosaico.addView(vazio, lp);
            }
        }
        if (celulas.size() < square) {
            Rect r = celula(celulas.size());
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(r.width(), r.height()); lp.leftMargin = r.left; lp.topMargin = r.top; lp.gravity = Gravity.TOP | Gravity.START;
            preview.setLayoutParams(lp); preview.setVisibility(View.VISIBLE);
        } else preview.setVisibility(View.INVISIBLE);
        pintarDisparo();
    }
    private void desfazerSquare() {
        if (celulas.isEmpty() || ocupado) return;
        Bitmap b = celulas.remove(celulas.size() - 1);
        posicionarSquare(); pintarFaixaSquare(); pintarTopo();
        h.post(b::recycle);
    }
    private void fotoSquare() {
        if (celulas.size() >= square) return;
        Bitmap b = null;
        try { b = preview.getBitmap(); } catch (Throwable t) { }
        if (b == null) { Toast.makeText(this, "Espere a câmera abrir e tente de novo.", Toast.LENGTH_SHORT).show(); return; }
        Paint p = pinturaEfeito();
        if (p != null) {
            Bitmap c = Bitmap.createBitmap(b.getWidth(), b.getHeight(), Bitmap.Config.ARGB_8888);
            new Canvas(c).drawBitmap(b, 0, 0, p); b.recycle(); b = c;
        }
        brilho.setAlpha(0.7f); brilho.animate().alpha(0f).setDuration(220).start();
        celulas.add(b);
        posicionarSquare(); pintarFaixaSquare(); pintarTopo();
    }
    private void salvarSquare() {
        if (ocupado || celulas.size() < square) return;
        ocupado = true; pintarFerramentas(); mostrarAviso("Montando…", 0);
        final int W = raiz.getWidth(), H = raiz.getHeight();
        final List<Rect> rs = new ArrayList<>();
        for (int i = 0; i < square; i++) rs.add(celula(i));
        final List<Bitmap> fotos = new ArrayList<>(celulas);
        trabalho.execute(() -> {
            try {
                float k = Math.min(1f, 1080f / W);
                int ow = Math.round(W * k), oh = Math.round(H * k);
                Bitmap out = Bitmap.createBitmap(ow, oh, Bitmap.Config.ARGB_8888);
                Canvas c = new Canvas(out); c.drawColor(Color.BLACK);
                Paint p = new Paint(Paint.FILTER_BITMAP_FLAG);
                for (int i = 0; i < fotos.size(); i++) {
                    Rect r = rs.get(i); Bitmap b = fotos.get(i);
                    RectF d = new RectF(r.left * k, r.top * k, r.right * k, r.bottom * k);
                    /* corta o centro para caber no espaço */
                    float esc = Math.max(d.width() / b.getWidth(), d.height() / b.getHeight());
                    float sw = d.width() / esc, sh = d.height() / esc;
                    Rect src = new Rect(Math.round((b.getWidth() - sw) / 2), Math.round((b.getHeight() - sh) / 2), Math.round((b.getWidth() + sw) / 2), Math.round((b.getHeight() + sh) / 2));
                    c.drawBitmap(b, src, d, p);
                }
                File f = novoArquivo("jpg");
                try (FileOutputStream o = new FileOutputStream(f)) { out.compress(Bitmap.CompressFormat.JPEG, 92, o); }
                out.recycle();
                h.post(() -> { ocupado = false; concluir(f, "image/jpeg", false); });
            } catch (Throwable t) {
                h.post(() -> { ocupado = false; esconderAviso(); pintarFerramentas(); Toast.makeText(this, "Não deu para montar as fotos.", Toast.LENGTH_SHORT).show(); });
            }
        });
    }

    private void mostrarAviso(String t, long ms) {
        aviso.setText(t); aviso.setVisibility(View.VISIBLE); aviso.setAlpha(1f);
        if (ms > 0) h.postDelayed(() -> { if (aviso.getText().toString().equals(t)) esconderAviso(); }, ms);
    }
    private void esconderAviso() { aviso.setVisibility(View.GONE); }

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
            analise = null;
            CameraSelector sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;
            if (!provedor.hasCamera(sel)) { frente = !frente; sel = frente ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA; }
            boolean vid = M_VIDEO.equals(modo) && !loop && square == 0;
            int ext = (loop || square > 0) ? -1 : M_RETRATO.equals(modo) ? ExtensionMode.BOKEH : M_NOTURNO.equals(modo) ? ExtensionMode.NIGHT : (M_FOTO.equals(modo) && hdr) ? ExtensionMode.HDR : -1;
            if (ext >= 0 && extensoes != null) {
                try { if (extensoes.isExtensionAvailable(sel, ext)) sel = extensoes.getExtensionEnabledCameraSelector(sel, ext); } catch (Exception e) { }
            }
            Preview.Builder pb = new Preview.Builder().setResolutionSelector(resolucao(new Size(1920, 1080)));
            if (vid && estabilizar) { try { pb.setPreviewStabilizationEnabled(true); } catch (Throwable t) { } }
            Preview p = pb.build();
            p.setSurfaceProvider(preview.getSurfaceProvider());
            if (loop) {
                analise = new ImageAnalysis.Builder()
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setResolutionSelector(resolucao(new Size(1280, 720)))
                    .build();
                analise.setAnalyzer(trabalho, this::quadroLoop);
                captura = null; video = null;
                camera = provedor.bindToLifecycle(this, sel, p, analise);
            } else if (vid) {
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
                    if (ext < 0) throw e;
                    Toast.makeText(this, "Este modo não funcionou neste celular.", Toast.LENGTH_SHORT).show();
                    modo = M_FOTO; hdr = false; prefs.edit().putBoolean("hdr", false).apply(); pintarModos(); ligar(); return;
                }
            }
            camera.getCameraInfo().getZoomState().observe(this, z -> pintarZooms());
            View pro = ((View) exposicao.getParent());
            boolean ehPro = M_PRO.equals(modo) && !loop && square == 0 && camera.getCameraInfo().getExposureState().isExposureCompensationSupported();
            pro.setVisibility(ehPro ? View.VISIBLE : View.GONE);
            if (ehPro) {
                android.util.Range<Integer> r = camera.getCameraInfo().getExposureState().getExposureCompensationRange();
                exposicao.setMax(r.getUpper() - r.getLower());
                exposicao.setProgress(camera.getCameraInfo().getExposureState().getExposureCompensationIndex() - r.getLower());
                rotExp.setText("☀ 0");
            }
            pintarTopo(); pintarZooms();
            h.postDelayed(this::aplicarEfeitoPrevia, 250); h.postDelayed(this::aplicarEfeitoPrevia, 900);
        } catch (Exception e) {
            if (loop) { loop = false; Toast.makeText(this, "O Loop não funcionou neste celular.", Toast.LENGTH_SHORT).show(); pintarModos(); pintarFerramentas(); ligar(); return; }
            falhar("Não foi possível usar esta câmera.");
        }
    }

    private File novoArquivo(String ext) {
        File d = new File(getCacheDir(), "chatmil");
        if (!d.exists()) d.mkdirs();
        return new File(d, "cam-" + System.currentTimeMillis() + "." + ext);
    }

    private void disparar() {
        if (ocupado || !disparo.isEnabled()) return;
        if (loop) { if (!capturandoLoop) comecarLoop(); return; }
        if (square > 0) { if (timer > 0) { contar(timer); return; } fotoSquare(); return; }
        if (!M_VIDEO.equals(modo)) {
            if (captura == null) return;
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
                if (!fin.hasError() || fin.getError() == VideoRecordEvent.Finalize.ERROR_DURATION_LIMIT_REACHED) concluir(saida, "video/mp4", true);
                else { pintarDisparo(); modos.setAlpha(1f); trocar.setAlpha(1f); galeria.setAlpha(1f); pintarFerramentas(); Toast.makeText(CameraActivity.this, "A gravação falhou. Tente de novo.", Toast.LENGTH_SHORT).show(); }
            }
        });
        inicio = System.currentTimeMillis();
        trocar.setAlpha(0.3f); modos.setAlpha(0.3f); galeria.setAlpha(0.3f);
        pintarDisparo(); pintarFerramentas();
        relogio();
    }
    private void contar(int n) {
        disparo.setEnabled(false);
        contagem.setVisibility(View.VISIBLE); contagem.setText(String.valueOf(n));
        contagem.setScaleX(1.3f); contagem.setScaleY(1.3f); contagem.animate().scaleX(1f).scaleY(1f).setDuration(300).start();
        if (n <= 1) { h.postDelayed(() -> { contagem.setVisibility(View.GONE); disparo.setEnabled(true); if (square > 0) fotoSquare(); else fotografar(); }, 1000); return; }
        h.postDelayed(() -> contar(n - 1), 1000);
    }
    private void fotografar() {
        if (captura == null) return;
        saida = novoArquivo("jpg");
        disparo.setEnabled(false);
        brilho.setAlpha(0.85f); brilho.animate().alpha(0f).setDuration(260).start();
        captura.takePicture(new ImageCapture.OutputFileOptions.Builder(saida).build(), ContextCompat.getMainExecutor(this), new ImageCapture.OnImageSavedCallback() {
            @Override public void onImageSaved(ImageCapture.OutputFileResults r) {
                if (Efeitos.matriz(efeito) == null) { concluir(saida, "image/jpeg", false); return; }
                ocupado = true; mostrarAviso("Aplicando " + Efeitos.NOMES[Efeitos.indice(efeito)] + "…", 0);
                final File f = saida;
                trabalho.execute(() -> {
                    try { efeitoNaFoto(f); } catch (Throwable t) { }
                    h.post(() -> { ocupado = false; concluir(f, "image/jpeg", false); });
                });
            }
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
        if (gravando != null || capturandoLoop || ocupado) return;
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
            concluir(f, tipo, false);
        } catch (Exception e) { Toast.makeText(this, "Não deu para abrir esse arquivo.", Toast.LENGTH_SHORT).show(); }
    }

    /* botões de volume também fotografam (como na câmera do celular) */
    @Override
    public boolean onKeyDown(int code, KeyEvent ev) {
        if (code == KeyEvent.KEYCODE_VOLUME_DOWN || code == KeyEvent.KEYCODE_VOLUME_UP) { if (ev.getRepeatCount() == 0) disparar(); return true; }
        return super.onKeyDown(code, ev);
    }

    /* comEfeitoNoVideo: o vídeo comum recebe o estilo depois, na compressão (MidiaPlugin) */
    private void concluir(File f, String tipo, boolean comEfeitoNoVideo) {
        if (terminou) return; terminou = true;
        Intent r = new Intent();
        r.putExtra("caminho", f.getAbsolutePath());
        r.putExtra("tipo", tipo);
        if (comEfeitoNoVideo && Efeitos.matriz(efeito) != null) r.putExtra("efeito", efeito);
        setResult(RESULT_OK, r);
        finish();
    }
    private void falhar(String msg) { Toast.makeText(this, msg, Toast.LENGTH_LONG).show(); cancelar(); }
    private void cancelar() {
        if (terminou) return; terminou = true;
        capturandoLoop = false;
        if (gravando != null) { try { gravando.stop(); } catch (Exception e) { } gravando = null; }
        setResult(RESULT_CANCELED);
        finish();
    }
    @Override
    public void onBackPressed() {
        if (gravando != null) { gravando.stop(); return; }
        if (ocupado) return;
        if (square > 0 && !celulas.isEmpty()) { desfazerSquare(); return; }
        cancelar();
    }
    @Override
    protected void onDestroy() {
        h.removeCallbacksAndMessages(null);
        capturandoLoop = false;
        if (gravando != null) { try { gravando.stop(); } catch (Exception e) { } }
        try { if (provedor != null) provedor.unbindAll(); } catch (Exception e) { }
        trabalho.shutdown();
        super.onDestroy();
    }
}
