package br.com.senov.provas;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativoPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /* texto no tamanho do layout: a fonte ampliada do sistema não desmonta a tela */
    @Override
    protected void load() {
        super.load();
        if (bridge != null && bridge.getWebView() != null) {
            WebView wv = bridge.getWebView();
            wv.getSettings().setTextZoom(100);
        }
    }
}
