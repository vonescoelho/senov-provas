package br.com.senov.provas;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/* Ao ligar o celular (ou atualizar o app), volta a ficar pronto para receber chamadas. */
public class InicioReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (ChamadasService.prefs(ctx).getBoolean("ativo", false)) ChamadasService.iniciar(ctx);
    }
}
