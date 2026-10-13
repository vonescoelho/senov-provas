package br.com.senov.provas;

import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.WindowManager;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/* Recursos do Android usados pelo ChatMil: bloquear captura de tela (visualização única),
   abrir arquivo em outro app, salvar em Downloads, imprimir PDF e abrir a transmissão de tela. */
@CapacitorPlugin(name = "Nativo")
public class NativoPlugin extends Plugin {

    private File arquivo(PluginCall call) {
        return new File(Uri.parse(call.getString("uri", "")).getPath());
    }

    private static void copiar(InputStream in, OutputStream out) throws IOException {
        byte[] b = new byte[65536];
        int n;
        while ((n = in.read(b)) > 0) out.write(b, 0, n);
    }

    @PluginMethod
    public void seguro(final PluginCall call) {
        final boolean ligar = Boolean.TRUE.equals(call.getBoolean("ligar", false));
        getActivity().runOnUiThread(() -> {
            if (ligar) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            call.resolve();
        });
    }

    @PluginMethod
    public void transmitir(PluginCall call) {
        try {
            getActivity().startActivity(new Intent("android.settings.CAST_SETTINGS"));
            call.resolve();
        } catch (ActivityNotFoundException e) {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_DISPLAY_SETTINGS));
                call.resolve();
            } catch (Exception e2) {
                call.reject("indisponivel");
            }
        }
    }

    @PluginMethod
    public void abrir(PluginCall call) {
        try {
            File f = arquivo(call);
            Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(u, call.getString("tipo", "*/*"));
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent ch = Intent.createChooser(i, call.getString("titulo", "Abrir com"));
            ch.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(ch);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void salvar(PluginCall call) {
        if (Build.VERSION.SDK_INT < 29) {
            call.reject("antigo");
            return;
        }
        try {
            File f = arquivo(call);
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, call.getString("nome", f.getName()));
            v.put(MediaStore.MediaColumns.MIME_TYPE, call.getString("tipo", "application/octet-stream"));
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/ChatMil");
            ContentResolver cr = getContext().getContentResolver();
            Uri dest = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (dest == null) {
                call.reject("sem destino");
                return;
            }
            try (InputStream in = new FileInputStream(f); OutputStream out = cr.openOutputStream(dest)) {
                copiar(in, out);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void imprimir(final PluginCall call) {
        final File f = arquivo(call);
        final String nome = call.getString("nome", "ChatMil");
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                pm.print(nome, new PrintDocumentAdapter() {
                    @Override
                    public void onLayout(PrintAttributes antes, PrintAttributes novo, CancellationSignal cancel,
                                         LayoutResultCallback cb, Bundle extras) {
                        if (cancel.isCanceled()) {
                            cb.onLayoutCancelled();
                            return;
                        }
                        cb.onLayoutFinished(new PrintDocumentInfo.Builder(nome)
                                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).build(), true);
                    }

                    @Override
                    public void onWrite(PageRange[] paginas, ParcelFileDescriptor destino, CancellationSignal cancel,
                                        WriteResultCallback cb) {
                        try (InputStream in = new FileInputStream(f);
                             OutputStream out = new FileOutputStream(destino.getFileDescriptor())) {
                            copiar(in, out);
                            cb.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
                        } catch (Exception e) {
                            cb.onWriteFailed(e.getMessage());
                        }
                    }
                }, null);
                call.resolve();
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        });
    }
}
