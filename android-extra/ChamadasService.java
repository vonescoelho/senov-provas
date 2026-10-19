package br.com.senov.provas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.Timestamp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/* Fica ligado em segundo plano (com uma notificação discreta) ouvindo as chamadas
   que tocam para esta pessoa. Assim o celular toca mesmo com o ChatMil fechado. */
public class ChamadasService extends Service {
    static final String CANAL_CONEXAO = "chatmil_conexao";
    static final String CANAL_CHAMADA = "chatmil_chamadas_v2";
    static final int ID_CONEXAO = 7001;
    static final String PREFS = "chatmil_chamadas";

    /* configuração pública do projeto (a mesma do app web) */
    static final String API_KEY = "AIzaSyAoqw5ygld3gR_qyBpb17qJTRHO_-98Yow";
    static final String APP_ID = "1:707582906445:web:227de759c2b159edd80c04";
    static final String PROJETO = "chatmil-56408";

    private ListenerRegistration reg;
    private String uidOuvindo;
    private final Set<String> tocando = new HashSet<>();
    private final Set<String> jaTratadas = new HashSet<>();

    static synchronized FirebaseApp app(Context c) {
        for (FirebaseApp a : FirebaseApp.getApps(c)) if ("chamadas".equals(a.getName())) return a;
        FirebaseOptions o = new FirebaseOptions.Builder().setApiKey(API_KEY).setApplicationId(APP_ID).setProjectId(PROJETO).build();
        return FirebaseApp.initializeApp(c.getApplicationContext(), o, "chamadas");
    }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static void iniciar(Context c) {
        try {
            Intent i = new Intent(c, ChamadasService.class);
            ContextCompat.startForegroundService(c, i);
        } catch (Exception e) { /* sem permissão para iniciar agora: tenta de novo quando o app abrir */ }
    }

    static void parar(Context c) {
        try { c.stopService(new Intent(c, ChamadasService.class)); } catch (Exception e) { }
    }

    static int idNotif(String cid) { return 9000 + (cid.hashCode() & 0x7ffff); }

    static void criarCanais(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel con = new NotificationChannel(CANAL_CONEXAO, "Conexão de chamadas", NotificationManager.IMPORTANCE_MIN);
        con.setDescription("Mantém o ChatMil pronto para tocar quando alguém ligar");
        con.setShowBadge(false);
        nm.createNotificationChannel(con);
        NotificationChannel ch = new NotificationChannel(CANAL_CHAMADA, "Chamadas recebidas", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Toque quando alguém liga pelo ChatMil");
        Uri som = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        ch.setSound(som, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 900, 600, 900, 600, 900});
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        criarCanais(this);
        Intent abrir = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 1, abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(this, CANAL_CONEXAO)
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setContentTitle("ChatMil")
            .setContentText("Pronto para receber chamadas")
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setContentIntent(pi)
            .build();
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(ID_CONEXAO, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(ID_CONEXAO, n);
        } catch (Exception e) {
            stopSelf();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        FirebaseUser u = null;
        try { u = FirebaseAuth.getInstance(app(this)).getCurrentUser(); } catch (Exception e) { }
        if (u == null || !prefs(this).getBoolean("ativo", false)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (reg == null || !u.getUid().equals(uidOuvindo)) ouvir(u.getUid());
        return START_STICKY;
    }

    private void ouvir(final String uid) {
        if (reg != null) { try { reg.remove(); } catch (Exception e) { } }
        uidOuvindo = uid;
        FirebaseFirestore db = FirebaseFirestore.getInstance(app(this));
        reg = db.collection("chamadas").whereArrayContains("tocando", uid).addSnapshotListener((snap, erro) -> {
            if (erro != null || snap == null) return;
            Set<String> agora = new HashSet<>();
            for (DocumentSnapshot d : snap.getDocuments()) {
                if (!valida(d)) continue;
                agora.add(d.getId());
                if (!tocando.contains(d.getId()) && !jaTratadas.contains(d.getId())) {
                    tocando.add(d.getId());
                    jaTratadas.add(d.getId());
                    tratar(d, uid);
                }
            }
            for (String cid : new HashSet<>(tocando)) {
                if (!agora.contains(cid)) { tocando.remove(cid); cancelar(this, cid); }
            }
        });
    }

    private static boolean valida(DocumentSnapshot d) {
        if ("fim".equals(d.getString("estado"))) return false;
        Object dentro = d.get("dentro");
        if (!(dentro instanceof List) || ((List<?>) dentro).isEmpty()) return false;
        Timestamp t = d.getTimestamp("criadoEm");
        long criado = t != null ? t.toDate().getTime() : System.currentTimeMillis();
        return System.currentTimeMillis() - criado < 60000;
    }

    private void tratar(final DocumentSnapshot d, String uid) {
        final String cid = d.getId(), de = d.getString("de");
        final boolean voz = "voz".equals(d.getString("tipo"));
        final boolean urgente = Boolean.TRUE.equals(d.getBoolean("urgente"));
        final boolean auto = urgente && podeAtenderSozinho(this, de);
        /* app aberto na tela: quem toca é o próprio app */
        if (MainActivity.visivel) return;
        mostrar(cid, "Chamada do ChatMil", voz, urgente, auto);
        if (de != null) {
            FirebaseFirestore.getInstance(app(this)).collection("users").document(de).get().addOnSuccessListener(u -> {
                String nome = u.getString("usuario");
                if (nome == null || nome.isEmpty()) nome = u.getString("nome");
                if (nome != null && tocando.contains(cid)) mostrar(cid, nome, voz, urgente, auto);
            });
        }
        if (auto) abrirApp(this, cid, "auto");
    }

    static boolean podeAtenderSozinho(Context c, String de) {
        if (de == null) return false;
        SharedPreferences p = prefs(c);
        String modo = p.getString("auto_modo", "ninguem");
        if ("ninguem".equals(modo)) return false;
        Set<String> l = p.getStringSet("auto_uids", new HashSet<>());
        return l.contains(de);
    }

    static void abrirApp(Context c, String cid, String acao) {
        Intent i = new Intent(c, MainActivity.class)
            .putExtra("chamada_cid", cid).putExtra("chamada_acao", acao)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        try {
            if (Build.VERSION.SDK_INT < 29 || Settings.canDrawOverlays(c)) c.startActivity(i);
        } catch (Exception e) { }
    }

    private void mostrar(String cid, String nome, boolean voz, boolean urgente, boolean auto) {
        int id = idNotif(cid);
        Intent abrir = new Intent(this, MainActivity.class).putExtra("chamada_cid", cid).putExtra("chamada_acao", auto ? "auto" : "abrir")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        Intent atender = new Intent(this, MainActivity.class).putExtra("chamada_cid", cid).putExtra("chamada_acao", "atender")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        Intent recusar = new Intent(this, ChamadaAcaoReceiver.class).putExtra("chamada_cid", cid).putExtra("chamada_acao", "recusar");
        int f = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent piAbrir = PendingIntent.getActivity(this, id, abrir, f);
        PendingIntent piAtender = PendingIntent.getActivity(this, id + 1, atender, f);
        PendingIntent piRecusar = PendingIntent.getBroadcast(this, id + 2, recusar, f);
        String tipo = (urgente ? "URGENTE · " : "") + (voz ? "Chamada de voz" : "Chamada de vídeo") + (auto ? " · atendendo sozinho" : "");
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CANAL_CHAMADA)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentTitle(nome)
            .setContentText(tipo)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setTimeoutAfter(50000)
            .setContentIntent(piAbrir)
            .setFullScreenIntent(piAbrir, true)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
            .setVibrate(new long[]{0, 900, 600, 900, 600, 900})
            .addAction(0, "Recusar", piRecusar)
            .addAction(0, "Atender", piAtender);
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT;
        try { ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(id, n); } catch (Exception e) { }
    }

    static void cancelar(Context c, String cid) {
        try { ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(idNotif(cid)); } catch (Exception e) { }
    }

    @Override
    public void onDestroy() {
        if (reg != null) { try { reg.remove(); } catch (Exception e) { } }
        reg = null;
        for (String cid : tocando) cancelar(this, cid);
        tocando.clear();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
