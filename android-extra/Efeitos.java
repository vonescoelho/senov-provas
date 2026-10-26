package br.com.senov.provas;

import android.graphics.ColorMatrix;

/* Estilos de cor da câmera ("Effects"), inspirados nos Estilos Fotográficos do iPhone.
   Os mesmos números servem para a prévia ao vivo, a foto, o Loop, o Square e o vídeo. */
final class Efeitos {
    static final String[] CHAVES = {"original", "contraste", "vibrante", "quente", "frio", "rose"};
    static final String[] NOMES = {"Original", "Rich Contrast", "Vibrant", "Warm", "Cool", "Rose Gold"};
    /* cor de exemplo de cada estilo (bolinha no botão) */
    static final int[] CORES = {0xFFB0B0B0, 0xFF3A3F55, 0xFFFF4F7B, 0xFFFFA24C, 0xFF4FA3FF, 0xFFF2A7A0};

    private Efeitos() { }

    static int indice(String k) {
        for (int i = 0; i < CHAVES.length; i++) if (CHAVES[i].equals(k)) return i;
        return 0;
    }

    private static ColorMatrix escala(float r, float g, float b, float or, float og, float ob) {
        return new ColorMatrix(new float[]{
            r, 0, 0, 0, or,
            0, g, 0, 0, og,
            0, 0, b, 0, ob,
            0, 0, 0, 1, 0});
    }
    private static ColorMatrix contraste(float c, float brilho) {
        float t = 128f * (1f - c) + brilho;
        return escala(c, c, c, t, t, t);
    }
    private static ColorMatrix saturacao(float s) { ColorMatrix m = new ColorMatrix(); m.setSaturation(s); return m; }

    /* null = sem efeito */
    static ColorMatrix matriz(String k) {
        if (k == null) return null;
        ColorMatrix m = new ColorMatrix();
        switch (k) {
            case "contraste": m.postConcat(saturacao(1.06f)); m.postConcat(contraste(1.17f, -2f)); break;
            case "vibrante": m.postConcat(saturacao(1.38f)); m.postConcat(contraste(1.04f, 4f)); break;
            case "quente": m.postConcat(saturacao(1.06f)); m.postConcat(escala(1.07f, 1.01f, 0.90f, 6f, 1f, -6f)); break;
            case "frio": m.postConcat(saturacao(0.98f)); m.postConcat(escala(0.93f, 1.0f, 1.08f, -4f, 0f, 8f)); break;
            case "rose": m.postConcat(saturacao(0.92f)); m.postConcat(contraste(0.97f, 0f)); m.postConcat(escala(1.06f, 0.97f, 1.0f, 10f, 2f, 6f)); break;
            default: return null;
        }
        return m;
    }

    /* mesma matriz no formato do Media3 (4x4, por colunas, cores de 0 a 1, aplicada a (r, g, b, 1)) */
    static float[] rgb4x4(String k) {
        ColorMatrix cm = matriz(k);
        if (cm == null) return null;
        float[] a = cm.getArray();
        float[] m = new float[16];
        for (int lin = 0; lin < 3; lin++) {
            m[lin] = a[lin * 5];            /* coluna 0: R */
            m[4 + lin] = a[lin * 5 + 1];    /* coluna 1: G */
            m[8 + lin] = a[lin * 5 + 2];    /* coluna 2: B */
            m[12 + lin] = a[lin * 5 + 4] / 255f; /* coluna 3: deslocamento */
        }
        m[15] = 1f;
        return m;
    }
}
