#!/usr/bin/env python3
"""Monta a pasta www/ (PWA) a partir do app app/senov-provas.html.

Uso: python3 tools/build.py <pasta node_modules com @fontsource, @capacitor/core e jspdf>
O resultado (www/) é o que vai para o GitHub Pages e para dentro do APK.
"""
import json, os, re, shutil, subprocess, sys, time
from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(RAIZ, "www")
NM = sys.argv[1]
FONTES = {
    "bricolage-grotesque": ["500", "700", "800"],
    "atkinson-hyperlegible": ["400", "700", "400-italic"],
    "arimo": ["400", "700", "400-italic"],
}
AZUL = (36, 71, 198)
VERSAO = time.strftime("%Y%m%d%H%M%S")

# ---------- fontes locais (funciona sem internet) ----------
os.makedirs(os.path.join(WWW, "fonts"), exist_ok=True)
css = []
for fam, pesos in FONTES.items():
    for p in pesos:
        txt = open(os.path.join(NM, "@fontsource", fam, p + ".css"), encoding="utf-8").read()
        for bloco in re.findall(r"/\* [^*]+ \*/\s*@font-face \{.*?\}", txt, re.S):
            if not re.search(r"-(latin|latin-ext)-\d", bloco):
                continue
            arq = re.search(r"url\(\./files/([^)]+\.woff2)\)", bloco).group(1)
            shutil.copy(os.path.join(NM, "@fontsource", fam, "files", arq), os.path.join(WWW, "fonts", arq))
            bloco = re.sub(r"src: [^;]+;", f"src: url(./fonts/{arq}) format('woff2');", bloco)
            css.append(bloco)
open(os.path.join(WWW, "fonts.css"), "w", encoding="utf-8").write("\n".join(css) + "\n")

# ---------- bibliotecas locais ----------
os.makedirs(os.path.join(WWW, "vendor"), exist_ok=True)
shutil.copy(os.path.join(NM, "jspdf", "dist", "jspdf.umd.min.js"), os.path.join(WWW, "vendor", "jspdf.umd.min.js"))
shutil.copy(os.path.join(NM, "@capacitor", "core", "dist", "capacitor.js"), os.path.join(WWW, "vendor", "capacitor.js"))
# Firebase (login por e-mail, conversas, grupos e mural) empacotado num só arquivo: variável global FB
subprocess.run([os.path.join(os.path.abspath(NM), ".bin", "esbuild"), os.path.join(RAIZ, "tools", "firebase-entry.js"), "--bundle", "--minify",
                "--format=iife", "--global-name=FB", "--target=es2019", "--legal-comments=none",
                "--outfile=" + os.path.join(WWW, "vendor", "firebase.js")], check=True, cwd=RAIZ)
# módulos da rede social (só na versão aplicativo; no claude.ai o app segue sem eles)
MODULOS = ("firebase-config.js", "social-extras.js", "social.js", "social-cripto.js", "social-midia.js", "social-chamada.js", "social-flash.js", "social-mais.js", "social-perto.js", "social-idade.js", "social-banco.js", "social-musica.js", "social-app.js", "social-notas.js", "social-links.js")
for arq in MODULOS:
    shutil.copy(os.path.join(RAIZ, "app", arq), os.path.join(WWW, arq))
# imagens das questões de exemplo (encarte do mercadinho, leitura do AEE)
os.makedirs(os.path.join(WWW, "img", "q"), exist_ok=True)
IMGS_Q = sorted(f for f in os.listdir(os.path.join(RAIZ, "app", "img-q")) if f.endswith(".webp"))
for f in IMGS_Q:
    shutil.copy(os.path.join(RAIZ, "app", "img-q", f), os.path.join(WWW, "img", "q", f))
# apresentação de PDF (pdf.js) e de DOCX (mammoth): carregados só quando o professor apresenta um arquivo
os.makedirs(os.path.join(WWW, "vendor", "pdfjs"), exist_ok=True)
shutil.copy(os.path.join(NM, "pdfjs-dist", "legacy", "build", "pdf.min.mjs"), os.path.join(WWW, "vendor", "pdfjs", "pdf.min.js"))
shutil.copy(os.path.join(NM, "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs"), os.path.join(WWW, "vendor", "pdfjs", "pdf.worker.min.js"))
shutil.copy(os.path.join(NM, "mammoth", "mammoth.browser.min.js"), os.path.join(WWW, "vendor", "mammoth.browser.min.js"))
# impressão personalizada (pdf-lib) e transcrição de áudio no aparelho (transformers.js; o modelo é baixado só se a pessoa pedir)
shutil.copy(os.path.join(NM, "pdf-lib", "dist", "pdf-lib.min.js"), os.path.join(WWW, "vendor", "pdf-lib.min.js"))
os.makedirs(os.path.join(WWW, "vendor", "transformers"), exist_ok=True)
shutil.copy(os.path.join(NM, "@huggingface", "transformers", "dist", "transformers.min.js"), os.path.join(WWW, "vendor", "transformers", "transformers.min.js"))

# ---------- index.html ----------
src = open(os.path.join(RAIZ, "app", "senov-provas.html"), encoding="utf-8").read()
titulo = re.search(r"<title>.*?</title>", src).group(0)
corpo = src[src.index("<style>"):]
corpo = corpo.replace(
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>',
    '<script src="vendor/jspdf.umd.min.js" async></script>\n<script src="vendor/capacitor.js"></script>\n<script src="local.js"></script>\n'
    '<script src="vendor/firebase.js"></script>\n<script src="firebase-config.js"></script>\n' + "\n".join(f'<script src="{m}"></script>' for m in MODULOS[1:]))
assert "vendor/jspdf.umd.min.js" in corpo, "script do jsPDF não encontrado"
estilo, resto = corpo.split("</style>", 1)
reset = """
/* base equivalente à do claude.ai */
html{color-scheme:light;-webkit-text-size-adjust:100%;height:100%}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;min-height:100%;font-size:14px;overscroll-behavior-y:none}
img{max-width:100%}
[hidden]{display:none!important}
"""
html = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{titulo}
<meta name="description" content="Conversas, grupos, mural e provas para professores. Sem anúncios.">
<meta name="theme-color" content="#F2F4F9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0C1120" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="ChatMil">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preconnect" href="https://firestore.googleapis.com" crossorigin>
<link rel="preconnect" href="https://securetoken.googleapis.com" crossorigin>
<link rel="stylesheet" href="fonts.css">
{estilo}{reset}</style>
</head>
<body>
{resto.strip()}
</body>
</html>
"""
open(os.path.join(WWW, "index.html"), "w", encoding="utf-8").write(html)

# ---------- ícones ----------
# Logo do ChatMil: balão de conversa com ✓ num degradê roxo → rosa → laranja (mais jovem e chamativo)
from PIL import ImageFilter
import math

C1, C2, C3 = (124, 58, 237), (219, 39, 119), (249, 115, 22)

def gradiente(S):
    """degradê diagonal roxo → rosa → laranja"""
    g = Image.new("RGB", (S, S))
    px = g.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * (S - 1))
            if t < 0.55:
                k = t / 0.55; a, b = C1, C2
            else:
                k = (t - 0.55) / 0.45; a, b = C2, C3
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
    return g

def gradiente_rapido(S):
    base = gradiente(256)
    return base.resize((S, S), Image.BICUBIC)

def estrela(d, cx, cy, r, cor):
    pts = []
    for i in range(8):
        ang = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.32
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=cor)

def simbolo(S, escala=1.0):
    """balão de conversa branco com um ✓ no degradê e um brilho amarelo"""
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    c = S / 2
    w, h = S * 0.60 * escala, S * 0.47 * escala
    x0, y0 = c - w / 2, c - h / 2 - S * 0.03 * escala
    # sombra suave
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0)); ds = ImageDraw.Draw(sh)
    ds.rounded_rectangle([x0, y0 + S * 0.02 * escala, x0 + w, y0 + h + S * 0.02 * escala], radius=int(h * 0.42), fill=(40, 0, 60, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(S * 0.025))
    im.alpha_composite(sh)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=int(h * 0.42), fill=(255, 255, 255, 255))
    # rabinho do balão
    d.polygon([(x0 + w * 0.22, y0 + h * 0.80), (x0 + w * 0.13, y0 + h * 1.22), (x0 + w * 0.46, y0 + h * 0.92)], fill=(255, 255, 255, 255))
    # ✓ com degradê
    mask = Image.new("L", (S, S), 0); dm = ImageDraw.Draw(mask)
    lw = int(S * 0.07 * escala)
    pts = [(x0 + w * 0.29, y0 + h * 0.52), (x0 + w * 0.44, y0 + h * 0.70), (x0 + w * 0.72, y0 + h * 0.32)]
    dm.line(pts, fill=255, width=lw, joint="curve")
    for p_ in pts:
        dm.ellipse([p_[0] - lw / 2, p_[1] - lw / 2, p_[0] + lw / 2, p_[1] + lw / 2], fill=255)
    gr = gradiente_rapido(S).convert("RGBA")
    im.paste(gr, (0, 0), mask)
    # brilho
    estrela(d, x0 + w * 0.98, y0 - h * 0.02, S * 0.085 * escala, (255, 214, 10, 255))
    estrela(d, x0 + w * 1.10, y0 + h * 0.30, S * 0.035 * escala, (255, 255, 255, 235))
    return im

def desenhar(tam, fundo=True, escala=1.0, raio=0.22):
    S = tam * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    if fundo:
        g = gradiente_rapido(S).convert("RGBA")
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * raio), fill=255) if raio else ImageDraw.Draw(m).rectangle([0, 0, S, S], fill=255)
        im.paste(g, (0, 0), m)
    im.alpha_composite(simbolo(S, escala))
    return im.resize((tam, tam), Image.LANCZOS)


ic = os.path.join(WWW, "icons")
os.makedirs(ic, exist_ok=True)
desenhar(192).save(os.path.join(ic, "icon-192.png"))
desenhar(512).save(os.path.join(ic, "icon-512.png"))
desenhar(512, raio=0, escala=0.8).save(os.path.join(ic, "maskable-512.png"))
desenhar(180, raio=0).save(os.path.join(ic, "apple-touch-icon.png"))
desenhar(32).save(os.path.join(ic, "favicon-32.png"))
# ícones e splash para o APK (usados pelo @capacitor/assets)
ass = os.path.join(RAIZ, "assets")
os.makedirs(ass, exist_ok=True)
desenhar(1024, raio=0).save(os.path.join(ass, "icon-only.png"))
desenhar(1024, fundo=False, escala=0.62).save(os.path.join(ass, "icon-foreground.png"))
gradiente_rapido(1024).convert("RGBA").save(os.path.join(ass, "icon-background.png"))
for nome, cor in (("splash.png", (242, 244, 249)), ("splash-dark.png", (12, 17, 32))):
    sp = Image.new("RGBA", (2732, 2732), cor + (255,))
    sp.alpha_composite(desenhar(560), (1086, 1086))
    sp.save(os.path.join(ass, nome))

# ---------- manifest ----------
manifest = {
    "name": "ChatMil",
    "short_name": "ChatMil",
    "description": "Conversas, grupos, mural e provas para professores. Sem anúncios.",
    "id": "./",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "any",
    "lang": "pt-BR",
    "background_color": "#F2F4F9",
    "theme_color": "#7C3AED",
    "categories": ["education", "social", "productivity"],
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
json.dump(manifest, open(os.path.join(WWW, "manifest.webmanifest"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# ---------- service worker (funciona offline) ----------
arquivos = ["./", "index.html", "local.js", "fonts.css", "manifest.webmanifest", "vendor/jspdf.umd.min.js", "vendor/capacitor.js",
            "vendor/firebase.js", *MODULOS, *("img/q/" + f for f in IMGS_Q),
            "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/favicon-32.png", "icons/apple-touch-icon.png"]
arquivos += ["fonts/" + f for f in sorted(os.listdir(os.path.join(WWW, "fonts")))]
sw = f"""/* ChatMil — service worker: guarda o app no aparelho para abrir sem internet */
const CACHE = "senov-provas-{VERSAO}";
const ARQUIVOS = {json.dumps(arquivos, ensure_ascii=False)};
self.addEventListener("install", e => {{
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
}});
self.addEventListener("activate", e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("senov-provas-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});
self.addEventListener("fetch", e => {{
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {{
    /* página: tenta a versão nova; sem internet, usa a guardada */
    e.respondWith(fetch(req).then(r => {{ const c = r.clone(); caches.open(CACHE).then(k => k.put("index.html", c)); return r; }}).catch(() => caches.match("index.html")));
    return;
  }}
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {{ const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)); return res; }})));
}});
"""
open(os.path.join(WWW, "sw.js"), "w", encoding="utf-8").write(sw)
print("www/ pronto — versão", VERSAO, "—", len(arquivos), "arquivos no cache")
