package br.com.senov.provas;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.text.Html;
import android.util.Base64;
import com.getcapacitor.JSObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/* Prévia de link feita no próprio celular (sem limite de CORS): segue redirecionamentos,
   lê as etiquetas Open Graph / Twitter / <title> da página e baixa a imagem, reduzida para
   uma miniatura pequena (JPEG em base64) que vai junto da mensagem. */
class Previa {
    private static final String UA_ZAP = "WhatsApp/2.24.20.80 A";
    private static final String UA_NAV = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
    private static final Pattern META = Pattern.compile("<meta\\b[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern LINK = Pattern.compile("<link\\b[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern ATTR = Pattern.compile("([a-zA-Z_:][-a-zA-Z0-9_:.]*)\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))");
    private static final Pattern TITULO = Pattern.compile("<title[^>]*>([\\s\\S]*?)</title>", Pattern.CASE_INSENSITIVE);
    private static final Pattern CHARSET = Pattern.compile("charset\\s*=\\s*[\"']?([-a-zA-Z0-9_]+)", Pattern.CASE_INSENSITIVE);

    static class Resposta { String url, tipo; byte[] corpo; }

    static Resposta baixar(String endereco, String ua, int limite, String aceitar) throws Exception {
        String atual = endereco;
        for (int k = 0; k < 7; k++) {
            HttpURLConnection c = (HttpURLConnection) new URL(atual).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(8000); c.setReadTimeout(10000);
            c.setRequestProperty("User-Agent", ua);
            c.setRequestProperty("Accept", aceitar);
            c.setRequestProperty("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.6");
            int st = c.getResponseCode();
            if (st >= 300 && st < 400) {
                String loc = c.getHeaderField("Location");
                c.disconnect();
                if (loc == null) throw new Exception("sem destino");
                atual = new URL(new URL(atual), loc).toString();
                if (!atual.toLowerCase(Locale.US).startsWith("http")) throw new Exception("destino inválido");
                continue;
            }
            if (st >= 400) { c.disconnect(); throw new Exception("HTTP " + st); }
            Resposta r = new Resposta();
            r.url = atual; r.tipo = c.getContentType() == null ? "" : c.getContentType();
            try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] b = new byte[16384]; int n, total = 0;
                while ((n = in.read(b)) > 0) { out.write(b, 0, Math.min(n, limite - total)); total += n; if (total >= limite) break; }
                r.corpo = out.toByteArray();
            } finally { c.disconnect(); }
            return r;
        }
        throw new Exception("muitos redirecionamentos");
    }

    private static String limpar(String s) {
        if (s == null) return "";
        String t;
        try { t = Html.fromHtml(s, Html.FROM_HTML_MODE_LEGACY).toString(); } catch (Throwable e) { t = s; }
        return t.replaceAll("\\s+", " ").trim();
    }

    private static Map<String, String> atributos(String tag) {
        Map<String, String> m = new HashMap<>();
        Matcher a = ATTR.matcher(tag);
        while (a.find()) {
            String v = a.group(3) != null ? a.group(3) : a.group(4) != null ? a.group(4) : a.group(5);
            m.put(a.group(1).toLowerCase(Locale.US), v == null ? "" : v);
        }
        return m;
    }

    private static String texto(Resposta r) {
        Charset cs = Charset.forName("UTF-8");
        Matcher m = CHARSET.matcher(r.tipo);
        String nome = m.find() ? m.group(1) : null;
        if (nome == null) {
            String ini = new String(r.corpo, 0, Math.min(r.corpo.length, 4096), Charset.forName("ISO-8859-1"));
            Matcher m2 = CHARSET.matcher(ini);
            if (m2.find()) nome = m2.group(1);
        }
        try { if (nome != null) cs = Charset.forName(nome); } catch (Exception e) { }
        return new String(r.corpo, cs);
    }

    static JSObject buscar(String endereco) throws Exception {
        Resposta r = null;
        Map<String, String> meta = new HashMap<>();
        String titulo = "", html = "";
        String[] uas = {UA_ZAP, UA_NAV};
        for (String ua : uas) {
            try { r = baixar(endereco, ua, 700_000, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5"); }
            catch (Exception e) { if (ua.equals(UA_NAV)) throw e; continue; }
            if (r.tipo.toLowerCase(Locale.US).startsWith("image/")) break;
            html = texto(r);
            meta.clear();
            Matcher mm = META.matcher(html);
            while (mm.find()) {
                Map<String, String> at = atributos(mm.group());
                String k = at.containsKey("property") ? at.get("property") : at.get("name");
                if (k == null || !at.containsKey("content")) continue;
                k = k.toLowerCase(Locale.US);
                if (!meta.containsKey(k)) meta.put(k, at.get("content"));
            }
            Matcher ml = LINK.matcher(html);
            while (ml.find()) {
                Map<String, String> at = atributos(ml.group());
                String rel = at.get("rel"), href = at.get("href");
                if (rel == null || href == null) continue;
                rel = rel.toLowerCase(Locale.US);
                if (rel.contains("image_src") && !meta.containsKey("image_src")) meta.put("image_src", href);
                if (rel.contains("apple-touch-icon") && !meta.containsKey("icone")) meta.put("icone", href);
            }
            Matcher mt = TITULO.matcher(html);
            titulo = mt.find() ? mt.group(1) : "";
            if (meta.containsKey("og:title") || meta.containsKey("og:image") || meta.containsKey("twitter:title")) break;
        }
        if (r == null) throw new Exception("falhou");
        JSObject o = new JSObject();
        o.put("url", r.url);
        String host = new URL(r.url).getHost().replaceFirst("^www\\.", "");
        if (r.tipo.toLowerCase(Locale.US).startsWith("image/")) {
            o.put("titulo", host);
            miniatura(o, r.corpo);
            return o;
        }
        String t = primeiro(meta, "og:title", "twitter:title");
        if (t.isEmpty()) t = titulo;
        o.put("titulo", cortar(limpar(t), 200));
        o.put("desc", cortar(limpar(primeiro(meta, "og:description", "twitter:description", "description")), 300));
        String site = limpar(primeiro(meta, "og:site_name", "application-name"));
        o.put("site", site.isEmpty() ? host : cortar(site, 60));
        String img = primeiro(meta, "og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src", "image_src", "icone");
        if (!img.isEmpty()) {
            try {
                String iu = new URL(new URL(r.url), limpar(img)).toString();
                if (iu.toLowerCase(Locale.US).startsWith("http")) {
                    Resposta ri = baixar(iu, UA_NAV, 6_000_000, "image/avif,image/webp,image/*,*/*;q=0.5");
                    miniatura(o, ri.corpo);
                }
            } catch (Exception e) { }
        }
        return o;
    }

    private static String primeiro(Map<String, String> m, String... ks) {
        for (String k : ks) { String v = m.get(k); if (v != null && !v.trim().isEmpty()) return v.trim(); }
        return "";
    }
    private static String cortar(String s, int n) { return s.length() > n ? s.substring(0, n - 1) + "…" : s; }

    /* miniatura: lado maior até 480 px, JPEG ~70% (até ~80 KB em base64) */
    private static void miniatura(JSObject o, byte[] dados) {
        try {
            BitmapFactory.Options op = new BitmapFactory.Options();
            op.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(dados, 0, dados.length, op);
            if (op.outWidth <= 0 || op.outHeight <= 0) return;
            int w0 = op.outWidth, h0 = op.outHeight, amostra = 1;
            while (Math.max(w0, h0) / (amostra * 2) >= 480) amostra *= 2;
            BitmapFactory.Options op2 = new BitmapFactory.Options();
            op2.inSampleSize = amostra;
            Bitmap b = BitmapFactory.decodeByteArray(dados, 0, dados.length, op2);
            if (b == null) return;
            float k = Math.min(1f, 480f / Math.max(b.getWidth(), b.getHeight()));
            Bitmap e = k < 1f ? Bitmap.createScaledBitmap(b, Math.max(1, Math.round(b.getWidth() * k)), Math.max(1, Math.round(b.getHeight() * k)), true) : b;
            /* fundo branco para PNG transparente */
            Bitmap f = Bitmap.createBitmap(e.getWidth(), e.getHeight(), Bitmap.Config.ARGB_8888);
            android.graphics.Canvas cv = new android.graphics.Canvas(f);
            cv.drawColor(android.graphics.Color.WHITE);
            cv.drawBitmap(e, 0, 0, null);
            String s = null;
            for (int q = 72; q >= 40; q -= 10) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                f.compress(Bitmap.CompressFormat.JPEG, q, out);
                s = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
                if (s.length() <= 80000) break;
            }
            if (s != null && s.length() <= 105000) {
                o.put("img", "data:image/jpeg;base64," + s);
                o.put("w", w0); o.put("h", h0);
            }
        } catch (Throwable t) { }
    }
}
