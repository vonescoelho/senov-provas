#!/usr/bin/env python3
"""Monta a pasta www/ (PWA) a partir do app app/senov-provas.html.

Uso: python3 tools/build.py <pasta node_modules com @fontsource, @capacitor/core e jspdf>
O resultado (www/) é o que vai para o GitHub Pages e para dentro do APK.
"""
import json, os, re, shutil, sys, time
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

# ---------- index.html ----------
src = open(os.path.join(RAIZ, "app", "senov-provas.html"), encoding="utf-8").read()
titulo = re.search(r"<title>.*?</title>", src).group(0)
corpo = src[src.index("<style>"):]
corpo = corpo.replace(
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>',
    '<script src="vendor/jspdf.umd.min.js"></script>\n<script src="vendor/capacitor.js"></script>\n<script src="local.js"></script>')
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
<meta name="description" content="Provas adaptadas com gabarito equilibrado, perfil AEE e PDF no padrão ABNT.">
<meta name="theme-color" content="#F2F4F9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0C1120" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="ChatSenov">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
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
def desenhar(tam, fundo=True, escala=1.0, raio=0.22):
    S = tam * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if fundo:
        if raio:
            d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * raio), fill=AZUL + (255,))
        else:
            d.rectangle([0, 0, S, S], fill=AZUL + (255,))
    c = S / 2
    w, h = S * 0.44 * escala, S * 0.54 * escala
    x0, y0 = c - w / 2, c - h / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=int(S * 0.045 * escala), fill=(255, 255, 255, 255))
    d.rectangle([x0 + w * 0.17, y0 + h * 0.07, x0 + w * 0.17 + S * 0.012 * escala, y0 + h * 0.93], fill=(210, 63, 88, 255))
    for k in (0.24, 0.36):
        d.rounded_rectangle([x0 + w * 0.3, y0 + h * k, x0 + w * 0.82, y0 + h * k + S * 0.02 * escala], radius=int(S * 0.01), fill=(200, 208, 230, 255))
    lw = int(S * 0.05 * escala)
    pts = [(x0 + w * 0.32, y0 + h * 0.66), (x0 + w * 0.48, y0 + h * 0.8), (x0 + w * 0.8, y0 + h * 0.5)]
    d.line(pts, fill=AZUL + (255,), width=lw, joint="curve")
    for p_ in (pts[0], pts[2]):
        d.ellipse([p_[0] - lw / 2, p_[1] - lw / 2, p_[0] + lw / 2, p_[1] + lw / 2], fill=AZUL + (255,))
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
Image.new("RGBA", (1024, 1024), AZUL + (255,)).save(os.path.join(ass, "icon-background.png"))
for nome, cor in (("splash.png", (242, 244, 249)), ("splash-dark.png", (12, 17, 32))):
    sp = Image.new("RGBA", (2732, 2732), cor + (255,))
    sp.alpha_composite(desenhar(560), (1086, 1086))
    sp.save(os.path.join(ass, nome))

# ---------- manifest ----------
manifest = {
    "name": "ChatSenov",
    "short_name": "ChatSenov",
    "description": "Provas adaptadas com gabarito equilibrado, perfil AEE e PDF no padrão ABNT.",
    "id": "./",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "any",
    "lang": "pt-BR",
    "background_color": "#F2F4F9",
    "theme_color": "#2447C6",
    "categories": ["education", "productivity"],
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
json.dump(manifest, open(os.path.join(WWW, "manifest.webmanifest"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# ---------- service worker (funciona offline) ----------
arquivos = ["./", "index.html", "local.js", "fonts.css", "manifest.webmanifest", "vendor/jspdf.umd.min.js", "vendor/capacitor.js",
            "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/favicon-32.png", "icons/apple-touch-icon.png"]
arquivos += ["fonts/" + f for f in sorted(os.listdir(os.path.join(WWW, "fonts")))]
sw = f"""/* SENOV Provas — service worker: guarda o app no aparelho para abrir sem internet */
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
