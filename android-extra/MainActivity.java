package br.com.senov.provas;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /* o app está na tela? (se estiver, quem toca a chamada é o próprio app) */
    static volatile boolean visivel = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativoPlugin.class);
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
    }
}
