package br.com.senov.provas;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/* Botão "Recusar" da notificação de chamada: avisa quem ligou sem abrir o app. */
public class ChamadaAcaoReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        final String cid = intent.getStringExtra("chamada_cid");
        if (cid == null) return;
        ChamadasService.cancelar(ctx, cid);
        final PendingResult pr = goAsync();
        try {
            FirebaseUser u = FirebaseAuth.getInstance(ChamadasService.app(ctx)).getCurrentUser();
            if (u == null) { pr.finish(); return; }
            final String uid = u.getUid();
            final DocumentReference ref = FirebaseFirestore.getInstance(ChamadasService.app(ctx)).collection("chamadas").document(cid);
            ref.get().addOnCompleteListener(t -> {
                try {
                    Map<String, Object> m = new HashMap<>();
                    m.put("tocando", FieldValue.arrayRemove(uid));
                    m.put("atualizadoEm", FieldValue.serverTimestamp());
                    if (t.isSuccessful() && t.getResult() != null) {
                        Object mem = t.getResult().get("membros");
                        if (mem instanceof List && ((List<?>) mem).size() <= 2) m.put("estado", "fim");
                    }
                    ref.update(m).addOnCompleteListener(x -> pr.finish());
                } catch (Exception e) { pr.finish(); }
            });
        } catch (Exception e) { pr.finish(); }
    }
}
