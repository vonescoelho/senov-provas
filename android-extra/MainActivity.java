package br.com.senov.provas;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /* o app está na tela? (se estiver, quem toca a chamada é o próprio app) */
    static volatile boolean visivel = false;
    private int ultimoTeclado = -1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativoPlugin.class);
        registerPlugin(MidiaPlugin.class);
        super.onCreate(savedInstanceState);
        tratarChamada(getIntent());
        if (ChamadasService.prefs(this).getBoolean("ativo", false)) ChamadasService.iniciar(this);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        tratarChamada(intent);
    }

    @Override
    public void onResume() { super.onResume(); visivel = true; }

    @Override
    public void onPause() { visivel = false; super.onPause(); }

    /* aberto por uma chamada: aparece por cima da tela de bloqueio e avisa o app */
    private void tratarChamada(Intent i) {
        if (i == null) return;
        if (i.getBooleanExtra("chatmil_atualizar", false)) { i.removeExtra("chatmil_atualizar"); NativoPlugin.pedirAtualizar(); }
        String cid = i.getStringExtra("chamada_cid");
        if (cid == null) return;
        String acao = i.getStringExtra("chamada_acao");
        i.removeExtra("chamada_cid");
        ChamadasService.cancelar(this, cid);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        NativoPlugin.chamadaPendente(cid, acao == null ? "abrir" : acao);
    }

    /* texto no tamanho do layout: a fonte ampliada do sistema não desmonta a tela */
    @Override
    protected void load() {
        super.load();
        if (bridge != null && bridge.getWebView() != null) {
            WebView wv = bridge.getWebView();
            wv.getSettings().setTextZoom(100);
            wv.getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
        observarTeclado();
    }

    /* teclado: informa ao app quanto da tela o teclado cobre (0 quando a tela já encolheu sozinha) */
    private void observarTeclado() {
        try {
            final View decor = getWindow().getDecorView();
            decor.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
                try {
                    if (bridge == null || bridge.getWebView() == null) return;
                    WebView w = bridge.getWebView();
                    WindowInsetsCompat ins = ViewCompat.getRootWindowInsets(decor);
                    int ime = 0;
                    if (ins != null && ins.isVisible(WindowInsetsCompat.Type.ime())) ime = ins.getInsets(WindowInsetsCompat.Type.ime()).bottom;
                    int[] loc = new int[2];
                    w.getLocationInWindow(loc);
                    int cobre = ime <= 0 ? 0 : Math.max(0, loc[1] + w.getHeight() - (decor.getHeight() - ime));
                    int css = Math.round(cobre / getResources().getDisplayMetrics().density);
                    if (css != ultimoTeclado) {
                        ultimoTeclado = css;
                        w.evaluateJavascript("window.SENOV_teclado&&window.SENOV_teclado(" + css + ")", null);
                    }
                } catch (Throwable t) { }
            });
        } catch (Throwable t) { }
    }
}
