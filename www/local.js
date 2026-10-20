/* SENOV Provas — modo aplicativo (PWA e APK).
   Substitui os recursos do claude.ai por equivalentes que funcionam no próprio aparelho:
   - banco de questões e provas: IndexedDB (fica neste aparelho; exporte/importe o JSON para levar a outro)
   - download do PDF: navegador (PWA) ou menu "Compartilhar/Salvar" do Android (APK)
   - revisão por IA: opcional, com chave da API da Anthropic guardada só neste aparelho */
(function () {
  "use strict";
  window.SENOV_LOCAL = true;

  /* ---------- Capacitor (quando roda como APK) ---------- */
  var Cap = window.Capacitor;
  var nativo = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  function plugin(nome) {
    try {
      if (window.capacitorExports && capacitorExports.registerPlugin) return capacitorExports.registerPlugin(nome);
      if (Cap && Cap.registerPlugin) return Cap.registerPlugin(nome);
    } catch (e) { console.warn(e); }
    return null;
  }

  /* ---------- Banco local (mesma interface usada pelo app) ---------- */
  var DBNAME = "senov-provas", STORE = "docs";
  var mem = new Map(), idb = null, ouvintes = new Set();
  function abrir() {
    return new Promise(function (res) {
      try {
        var r = indexedDB.open(DBNAME, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function carregar() {
    return abrir().then(function (db) {
      idb = db;
      if (!idb) return;
      return new Promise(function (res) {
        var rq = idb.transaction(STORE, "readonly").objectStore(STORE).openCursor();
        rq.onsuccess = function () { var c = rq.result; if (c) { mem.set(c.key, c.value); c.continue(); } else res(); };
        rq.onerror = function () { res(); };
      });
    });
  }
  function persistir(p, v) {
    if (!idb) return Promise.resolve();
    return new Promise(function (res, rej) {
      var t = idb.transaction(STORE, "readwrite"), st = t.objectStore(STORE);
      if (v === undefined) st.delete(p); else st.put(v, p);
      t.oncomplete = function () { res(); };
      t.onerror = function () { rej({ code: "quota_exceeded", message: String(t.error) }); };
    });
  }
  var clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  var pai = function (p) { return p.split("/").slice(0, -1).join("/"); };
  var meta = { fromCache: false, hasPendingWrites: false };
  function snapDoc(p) { var v = mem.get(p); return { id: p.split("/").pop(), exists: v !== undefined, data: function () { return clone(v); }, metadata: meta }; }
  function snapCol(p) {
    var docs = Array.from(mem.keys()).filter(function (k) { return pai(k) === p; }).sort().map(snapDoc);
    return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: meta };
  }
  function avisar(p) {
    ouvintes.forEach(function (o) {
      try {
        if (o.tipo === "doc" && o.p === p) o.fn(snapDoc(p));
        else if (o.tipo === "col" && pai(p) === o.p) o.fn(snapCol(o.p));
      } catch (e) { console.error(e); }
    });
  }
  function novoId() { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); }
  function gravar(p, v) {
    var c = v === undefined ? undefined : clone(v);
    if (c === undefined) mem.delete(p); else mem.set(p, c);
    return persistir(p, c).then(function () { avisar(p); });
  }
  function ouvir(tipo, p, fn, snap) {
    var o = { tipo: tipo, p: p, fn: fn }; ouvintes.add(o);
    setTimeout(function () { if (ouvintes.has(o)) fn(snap(p)); }, 0);
    return function () { ouvintes.delete(o); };
  }
  function docRef(p) {
    return {
      id: p.split("/").pop(), path: p,
      get: function () { return Promise.resolve(snapDoc(p)); },
      set: function (d) { return gravar(p, d); },
      update: function (d) {
        if (!mem.has(p)) return Promise.reject({ code: "invalid_argument", message: "Documento não existe" });
        return gravar(p, Object.assign(clone(mem.get(p)), d));
      },
      delete: function () { return gravar(p, undefined); },
      onSnapshot: function (fn) { return ouvir("doc", p, fn, snapDoc); },
      collection: function (n) { return colRef(p + "/" + n); },
      acquire: function () { return Promise.resolve({ acquired: true }); }
    };
  }
  function colRef(p) {
    var q = {
      path: p,
      doc: function (id) { return docRef(p + "/" + (id || novoId())); },
      add: function (d) { var r = docRef(p + "/" + novoId()); return r.set(d).then(function () { return r; }); },
      get: function () { return Promise.resolve(snapCol(p)); },
      onSnapshot: function (fn) { return ouvir("col", p, fn, snapCol); },
      where: function () { return q; }, orderBy: function () { return q; }, limit: function () { return q; }
    };
    return q;
  }
  var db = { doc: docRef, collection: colRef };

  /* ---------- Questões de exemplo (revisadas; lote novo entra também para quem já usa) ---------- */
  var SEED = [
    ["ex01","EF","6º ano","Matemática","Frações",1,true,"Uma pizza foi dividida em 4 partes iguais. Pedro comeu 1 parte. Que fração da pizza Pedro comeu?",["1/4","1/2","3/4","4/1"]],
    ["ex02","EF","6º ano","Matemática","Frações",2,false,"Qual das frações abaixo é equivalente a 2/3?",["4/6","3/2","2/6","6/4"]],
    ["ex03","EF","6º ano","Matemática","Frações",3,false,"Ana leu 2/5 de um livro na segunda-feira e 1/3 na terça-feira. Que fração do livro ela ainda precisa ler?",["4/15","11/15","3/8","1/5"]],
    ["ex04","EF","6º ano","Matemática","Números naturais",1,true,"Quanto é 25 + 17?",["42","32","52","41"]],
    ["ex05","EF","6º ano","Matemática","Números naturais",2,false,"Uma escola tem 12 turmas com 35 estudantes cada. Quantos estudantes há na escola?",["420","47","350","410"]],
    ["ex06","EF","6º ano","Matemática","Números naturais",1,true,"Qual número vem logo depois do 99?",["100","98","101","909"]],
    ["ex07","EF","6º ano","Matemática","Números naturais",3,false,"O menor número natural de três algarismos diferentes é:",["102","100","123","111"]],
    ["ex08","EF","6º ano","Língua Portuguesa","Substantivos",1,true,"Qual palavra é o nome de um animal?",["Gato","Correr","Bonito","Ontem"]],
    ["ex09","EF","6º ano","Língua Portuguesa","Interpretação de texto",2,false,"Leia: \"Choveu a noite toda. De manhã, as ruas do bairro estavam alagadas e as aulas foram suspensas.\"\nPor que as aulas foram suspensas?",["Porque as ruas estavam alagadas.","Porque era feriado.","Porque os professores faltaram.","Porque a escola estava em reforma."]],
    ["ex10","EF","6º ano","Língua Portuguesa","Interpretação de texto",3,false,"Na frase \"Aquele jogador é uma muralha no gol\", a palavra \"muralha\" foi usada para indicar que o jogador:",["defende muito bem.","é muito alto.","trabalha em construções.","não gosta de jogar."]],
    ["ex11","EM","1ª série","Matemática","Função afim",1,true,"Na função f(x) = 2x + 3, quanto vale f(1)?",["5","6","3","2","1"]],
    ["ex12","EM","1ª série","Matemática","Função afim",2,false,"Um táxi cobra R$ 5,00 de bandeirada mais R$ 2,50 por quilômetro rodado. Quanto custa uma corrida de 8 km?",["R$ 25,00","R$ 20,00","R$ 40,00","R$ 15,00","R$ 30,00"]],
    ["ex13","EM","1ª série","Matemática","Função afim",3,false,"A reta que passa pelos pontos (1, 4) e (3, 10) é o gráfico de qual função?",["f(x) = 3x + 1","f(x) = 2x + 2","f(x) = 3x - 1","f(x) = 4x","f(x) = x + 3"]],
    ["ex14","EM","1ª série","Biologia","Citologia",1,true,"Qual parte da célula guarda o material genético (DNA) nas células animais?",["Núcleo","Parede celular","Cloroplasto","Membrana","Vacúolo"]],
    ["ex15","EM","1ª série","Biologia","Citologia",2,false,"A organela responsável pela respiração celular e produção de energia (ATP) é:",["a mitocôndria.","o ribossomo.","o complexo golgiense.","o lisossomo.","o centríolo."]],
    ["ex16","EM","1ª série","Biologia","Citologia",3,false,"Sobre as células procariontes, é correto afirmar que:",["não possuem núcleo delimitado por membrana.","possuem mitocôndrias e cloroplastos.","são exclusivas de animais.","não possuem ribossomos.","têm o DNA sempre dentro do núcleo."]],
    /* lote 2: questões contextualizadas na vida dos estudantes */
    ["ex17","EF","5º ano","Matemática","Sistema monetário",1,true,"Dona Lúcia faz bolos para vender na feira do bairro. No sábado, ela vendeu 6 bolos a R$ 12,00 cada um. Quanto ela recebeu?",["R$ 72,00","R$ 18,00","R$ 62,00","R$ 612,00"]],
    ["ex18","EF","6º ano","Matemática","Porcentagem",2,false,"A conta de água da família de Dona Rita era de R$ 80,00 por mês. Depois que a associação de moradores ajudou a instalar uma cisterna para guardar água da chuva, a conta diminuiu 25%. Quanto a família passou a pagar?",["R$ 60,00","R$ 55,00","R$ 20,00","R$ 75,00"]],
    ["ex19","EF","7º ano","Matemática","Números inteiros",2,false,"Seu Antônio, vendedor ambulante, começou o mês devendo R$ 150,00 ao fornecedor. Na primeira semana, pagou R$ 90,00. Na segunda, comprou fiado mais R$ 60,00 em mercadorias. Qual é a situação dele com o fornecedor ao fim da segunda semana?",["Deve R$ 120,00.","Deve R$ 180,00.","Deve R$ 60,00.","Está quite com o fornecedor."]],
    ["ex20","EF","7º ano","Matemática","Razão e proporção",3,false,"Na feira da agricultura familiar, 3 kg de feijão custam R$ 21,00. No supermercado, 5 kg do mesmo feijão custam R$ 40,00. Quem compra 15 kg na feira, em vez de comprar no supermercado, economiza:",["R$ 15,00","R$ 1,00","R$ 19,00","R$ 105,00"]],
    ["ex21","EF","7º ano","Matemática","Escala",3,false,"A turma desenhou um mapa do bairro na escala 1 : 50 000. No mapa, a distância em linha reta entre a escola e o posto de saúde é de 6 cm. Qual é essa distância real?",["3 km","30 km","300 m","300 km"]],
    ["ex22","EF","8º ano","Matemática","Matemática financeira",3,false,"Uma loja anuncia uma geladeira por R$ 1.800,00 à vista ou em 12 parcelas de R$ 180,00 \"sem entrada\". Ao escolher o parcelamento, quanto a família paga a mais e quanto isso representa em relação ao preço à vista?",["R$ 360,00, ou seja, 20% a mais.","R$ 180,00, ou seja, 10% a mais.","R$ 360,00, ou seja, 36% a mais.","R$ 2.160,00, ou seja, 120% a mais."]],
    ["ex23","EF","8º ano","Matemática","Estatística",3,false,"Numa pesquisa feita pelos estudantes, cinco famílias da rua informaram quantos litros de água compram por semana em galões: 20, 20, 30, 50 e 80 litros. Qual afirmação é verdadeira?",["A média é 40 litros e a mediana é 30 litros.","A média é 30 litros e a mediana é 40 litros.","A média é 40 litros e a moda é 80 litros.","A média, a mediana e a moda são iguais a 40 litros."]],
    ["ex24","EF","9º ano","Matemática","Teorema de Pitágoras",2,false,"Para levar energia elétrica até uma casa do assentamento, um poste de 8 m de altura será firmado por um cabo esticado do topo do poste até um ponto no chão a 6 m da base. Qual é o comprimento do cabo?",["10 m","14 m","12 m","7 m"]],
    ["ex25","EF","9º ano","Matemática","Equação do 2º grau",3,false,"Um grupo de mulheres de uma cooperativa vai cercar uma horta comunitária retangular com 60 m² de área. O comprimento da horta tem 4 m a mais que a largura. Qual é a largura da horta?",["6 m","10 m","4 m","15 m"]],
    ["ex26","EF","4º ano","Língua Portuguesa","Interpretação de texto",1,true,"Leia:\n\"Maria planta coentro e cebolinha no quintal. Aos domingos, ela vende tudo na feira do bairro.\"\nO que Maria vende na feira?",["Coentro e cebolinha.","Bolos e doces.","Peixe e camarão.","Roupas e calçados."]],
    ["ex27","EF","6º ano","Língua Portuguesa","Interpretação de texto",2,false,"Leia:\n\"Aos 60 anos, Dona Francisca entrou na turma de alfabetização da escola do bairro. Na primeira semana, escreveu o próprio nome e disse, emocionada: — Agora ninguém assina por mim.\"\nNa fala de Dona Francisca, aprender a escrever representa principalmente:",["autonomia e dignidade para decidir sobre a própria vida.","a vontade de abandonar o trabalho.","uma obrigação imposta pela família.","o desejo de se tornar professora."]],
    ["ex28","EF","7º ano","Língua Portuguesa","Gêneros textuais",2,false,"Leia o trecho de uma carta enviada por estudantes à prefeitura:\n\"Todos os dias, mais de 200 alunos atravessam a rodovia sem faixa de pedestres para chegar à escola. Por isso, solicitamos a instalação urgente de uma passarela ou de um semáforo.\"\nO argumento usado pelos estudantes para justificar o pedido é:",["o risco diário enfrentado por muitos estudantes.","a beleza que a passarela daria à cidade.","a obrigação de a prefeitura agradar aos alunos.","o fato de a rodovia ser nova."]],
    ["ex29","EF","8º ano","Língua Portuguesa","Fato e opinião",2,false,"Qual dos trechos abaixo expressa uma opinião, e não um fato?",["A feira agroecológica é a melhor coisa que já aconteceu no bairro.","A feira agroecológica acontece todo sábado, na praça central.","Cerca de 30 famílias vendem seus produtos na feira.","A feira começou em março deste ano."]],
    ["ex30","EF","8º ano","Língua Portuguesa","Variação linguística",2,false,"Seu Zé, agricultor do sertão, disse ao neto: \"Hoje o céu tá carregado, vai chover que só!\"\nSobre a fala de Seu Zé, é correto afirmar que:",["é uma variedade regional e informal, adequada a uma conversa em família.","está errada e deve sempre ser corrigida.","mostra que Seu Zé não sabe se comunicar.","só seria aceitável se fosse publicada em um jornal."]],
    ["ex31","EF","9º ano","Língua Portuguesa","Interpretação de texto",3,false,"O educador Paulo Freire escreveu: \"A leitura do mundo precede a leitura da palavra.\"\nNessa frase, o autor defende que:",["a experiência e a compreensão da realidade vêm antes e dão sentido à leitura dos textos.","é preciso aprender a ler antes de conhecer o mundo.","a leitura de livros é desnecessária para quem trabalha.","só quem viaja pelo mundo consegue aprender a ler."]],
    ["ex32","EF","9º ano","Língua Portuguesa","Coesão e conectivos",3,false,"Leia:\n\"A comunidade se organizou e conseguiu a reforma do posto de saúde, embora a prefeitura tenha demorado a responder.\"\nO conectivo \"embora\" estabelece, nessa frase, uma relação de:",["concessão.","causa.","conclusão.","finalidade."]],
    ["ex33","EF","6º ano","Ciências","Água e saúde",2,false,"No sertão, muitas famílias guardam a água da chuva em cisternas. Antes de beber, recomenda-se filtrar e depois ferver ou clorar a água. Por que só filtrar não basta?",["Porque o filtro retém partículas, mas pode não eliminar microrganismos que causam doenças.","Porque a filtração acrescenta sal à água.","Porque a água da chuva é sempre salgada.","Porque a filtração aumenta a quantidade de água."]],
    ["ex34","EF","7º ano","Ciências","Saneamento e saúde",2,false,"Em um bairro sem rede de esgoto, os moradores percebem que muitas crianças têm diarreia com frequência. Qual medida coletiva enfrenta a causa principal do problema?",["Reivindicar e implantar saneamento básico, com coleta e tratamento do esgoto.","Distribuir remédio contra diarreia para todas as famílias.","Proibir as crianças de brincar na rua.","Mudar o horário das aulas na escola."]],
    ["ex35","EF","7º ano","Ciências","Clima e ambiente",3,false,"Sobre a intensificação do efeito estufa e o aquecimento global, é correto afirmar que:",["a queima de combustíveis fósseis e o desmatamento aumentam a concentração de gás carbônico na atmosfera.","o efeito estufa é sempre prejudicial e deveria deixar de existir.","o buraco na camada de ozônio é a principal causa do efeito estufa.","as queimadas diminuem a quantidade de gás carbônico no ar."]],
    ["ex36","EF","7º ano","Ciências","Cadeias alimentares",3,false,"Um agrotóxico que se decompõe muito lentamente foi usado em uma plantação perto de um açude e chegou à água. Na cadeia alimentar \"alga → peixe pequeno → peixe grande → garça\", onde se espera encontrar a maior concentração desse produto?",["Na garça.","Na alga.","No peixe pequeno.","A concentração é igual em todos."]],
    ["ex37","EF","8º ano","Ciências","Energia elétrica",3,false,"Um chuveiro elétrico de 5 000 W (5 kW) é usado 30 minutos por dia, durante 30 dias. Se o kWh custa R$ 0,80, quanto esse chuveiro acrescenta à conta de luz no mês?",["R$ 60,00","R$ 120,00","R$ 75,00","R$ 6,00"]],
    ["ex38","EF","8º ano","História","Abolição no Ceará",3,false,"O Ceará aboliu a escravidão em 1884, quatro anos antes da Lei Áurea. Os jangadeiros liderados por Francisco José do Nascimento, o Dragão do Mar, tiveram papel importante nesse processo porque:",["se recusaram a transportar pessoas escravizadas até os navios no porto de Fortaleza.","compraram todas as pessoas escravizadas da província.","eram donos dos maiores engenhos do Ceará.","assinaram a Lei Áurea junto com a princesa Isabel."]],
    ["ex39","EF","8º ano","História","Pós-abolição",3,false,"A Lei Áurea (1888) aboliu a escravidão no Brasil. Sobre o período que veio depois, é correto afirmar que:",["a falta de políticas de acesso à terra, à educação e ao trabalho para os libertos contribuiu para desigualdades que persistem até hoje.","os ex-escravizados receberam terras e indenização do governo.","a abolição acabou imediatamente com o racismo no país.","o Brasil foi o primeiro país da América a abolir a escravidão."]],
    ["ex40","EF","9º ano","História","Era Vargas e direitos trabalhistas",2,false,"A Consolidação das Leis do Trabalho (CLT), de 1943, reuniu direitos como jornada máxima, férias e salário mínimo. Esses direitos devem ser compreendidos como:",["resultado também de lutas e reivindicações de trabalhadores, ainda que incorporados por um governo.","presentes concedidos sem nenhuma pressão social.","direitos que valiam apenas para os patrões.","uma lei criada no tempo da escravidão."]],
    ["ex41","EF","9º ano","História","Ditadura civil-militar",2,false,"Em 1963, em Angicos (RN), cerca de 300 trabalhadores foram alfabetizados com o método de Paulo Freire. Após o golpe de 1964, Freire foi preso e depois exilado. O regime via como ameaça:",["uma educação que estimulava os adultos a pensar criticamente sobre a própria realidade.","o ensino de matemática nas escolas públicas.","a construção de escolas técnicas.","a criação de bibliotecas nas capitais."]],
    ["ex42","EF","7º ano","Geografia","Semiárido",2,false,"A proposta de \"convivência com o semiárido\" defende principalmente:",["estratégias como cisternas, barragens subterrâneas e manejo da caatinga, adaptadas ao clima da região.","acabar com a seca transformando a caatinga em floresta tropical.","que a população deixe a região durante os períodos sem chuva.","o uso de toda a água dos açudes apenas por grandes indústrias."]],
    ["ex43","EF","9º ano","Geografia","Urbanização",3,false,"Em muitas cidades brasileiras, famílias de baixa renda moram em áreas distantes do centro, com pouco transporte, poucas escolas e poucos postos de saúde. Esse fenômeno é chamado de:",["segregação socioespacial.","êxodo rural.","conurbação.","transumância."]],
    ["ex44","EF","7º ano","Arte","Arte popular",1,false,"A xilogravura, muito usada nas capas dos folhetos de cordel no Nordeste, é uma técnica em que a imagem é:",["entalhada em madeira e depois impressa no papel.","pintada diretamente na parede com spray.","modelada em barro e levada ao forno.","feita com recortes de tecido costurados."]],
    ["ex45","EF","8º ano","Língua Inglesa","Reading",2,false,"Read:\n\"Our community garden feeds 40 families. Everyone helps: kids water the plants and grandparents teach how to grow beans.\"\nWhat do the grandparents do?",["They teach how to grow beans.","They water the plants.","They sell the beans.","They feed 40 families alone."]],
    ["ex46","EF","8º ano","Educação Física","Lutas",1,false,"A roda de capoeira é reconhecida pela UNESCO como Patrimônio Cultural Imaterial da Humanidade. A capoeira tem origem:",["na resistência de africanos escravizados e seus descendentes no Brasil.","nas artes marciais japonesas trazidas por imigrantes.","nos jogos olímpicos da Grécia antiga.","nas danças da corte portuguesa."]],
    ["ex47","EM","1ª série","Matemática","Função afim",3,false,"Uma cooperativa de costureiras tem custo fixo mensal de R$ 1.200,00 e gasta R$ 15,00 para produzir cada peça, vendida por R$ 35,00. Qual é o número mínimo de peças que precisam ser vendidas no mês para que não haja prejuízo?",["60","80","35","24","120"]],
    ["ex48","EM","1ª série","Matemática","Porcentagem",3,false,"Em um ano, o preço da cesta básica subiu 10%. No ano seguinte, subiu mais 10% sobre o novo preço. O aumento acumulado nos dois anos foi de:",["21%","20%","11%","10%","22%"]],
    ["ex49","EM","1ª série","Matemática","Progressão aritmética",2,false,"Para comprar uma caixa d'água, uma família guarda R$ 20,00 no 1º mês, R$ 25,00 no 2º, R$ 30,00 no 3º, e assim por diante. Quanto terá guardado ao final de 12 meses?",["R$ 570,00","R$ 75,00","R$ 540,00","R$ 600,00","R$ 300,00"]],
    ["ex50","EM","1ª série","Matemática","Estatística",3,false,"Em uma empresa, 9 funcionários ganham R$ 1.500,00 por mês e o dono retira R$ 21.000,00. Sobre a renda mensal dessas 10 pessoas, é correto afirmar que:",["a média é R$ 3.450,00, mas a mediana é R$ 1.500,00, o que mostra que a média pode esconder a desigualdade.","a média e a mediana são iguais a R$ 1.500,00.","a média é R$ 2.250,00 e a mediana é R$ 3.450,00.","a mediana é R$ 21.000,00, pois é o maior valor.","a média é R$ 1.500,00, pois a maioria ganha esse valor."]],
    ["ex51","EM","2ª série","Matemática","Probabilidade",2,false,"Em uma turma de EJA com 40 estudantes, 24 trabalham durante o dia. Sorteando-se um estudante ao acaso, qual é a probabilidade de que ele NÃO trabalhe durante o dia?",["40%","60%","24%","16%","1/24"]],
    ["ex52","EM","2ª série","Matemática","Geometria espacial",3,false,"Uma cisterna de placas tem formato aproximadamente cilíndrico, com 3,4 m de diâmetro interno e 1,8 m de altura útil. Usando π ≈ 3 e sabendo que 1 m³ = 1 000 litros, a capacidade aproximada da cisterna é de:",["cerca de 15 600 litros.","cerca de 62 400 litros.","cerca de 9 180 litros.","cerca de 1 560 litros.","cerca de 156 000 litros."]],
    ["ex53","EM","3ª série","Matemática","Juros compostos",3,false,"Uma pessoa usou R$ 1.000,00 do limite do cartão de crédito, com juros compostos de 10% ao mês, e não pagou nada durante 3 meses. Qual será o valor da dívida ao fim desse período?",["R$ 1.331,00","R$ 1.300,00","R$ 1.030,00","R$ 1.100,00","R$ 3.000,00"]],
    ["ex54","EM","1ª série","Língua Portuguesa","Interpretação de texto",3,false,"Leia:\n\"Na roda de conversa, a educadora não começou pelo alfabeto. Perguntou aos pescadores sobre o mar, os barcos e o preço do peixe. Da palavra 'jangada', que todos conheciam, nasceram novas palavras e novas perguntas.\"\nA prática descrita se aproxima da proposta de Paulo Freire porque:",["parte de palavras geradoras ligadas à vida dos educandos e estimula o diálogo sobre a realidade deles.","troca a leitura por conversas informais sem objetivo pedagógico.","considera os pescadores incapazes de aprender o alfabeto.","valoriza a memorização de sílabas fora de contexto.","coloca a educadora como única dona do saber."]],
    ["ex55","EM","2ª série","Língua Portuguesa","Argumentação",3,false,"Em um debate sobre cotas na universidade, um participante diz ao outro: \"Não preciso ouvir sua opinião; você é jovem demais para entender.\"\nEssa fala:",["ataca a pessoa em vez de discutir o argumento apresentado.","apresenta dados estatísticos sobre o tema.","faz uma concessão ao ponto de vista do outro.","usa um exemplo histórico para comprovar a tese.","propõe uma solução para o problema discutido."]],
    ["ex56","EM","3ª série","Língua Portuguesa","Literatura",2,false,"O romance O Quinze (1930), da escritora cearense Rachel de Queiroz, retrata:",["a grande seca de 1915 e a migração de retirantes do sertão.","a vida da corte portuguesa no Rio de Janeiro.","a colonização do Sul do Brasil por imigrantes europeus.","as aventuras de um herói indígena na floresta amazônica.","a industrialização de São Paulo nos anos 1950."]],
    ["ex57","EM","3ª série","Língua Portuguesa","Literatura",3,false,"Em Vidas secas (1938), de Graciliano Ramos, Fabiano tem dificuldade de se expressar com palavras e se sente humilhado diante do soldado amarelo e do patrão. Uma leitura crítica da obra permite relacionar essa dificuldade:",["à exclusão social, que nega ao sertanejo o acesso à escola e à palavra.","a uma característica natural do povo nordestino.","à preferência de Fabiano pela vida na cidade grande.","ao excesso de estudo que Fabiano teve na infância.","ao fato de Fabiano ser estrangeiro."]],
    ["ex58","EM","1ª série","Biologia","Ecologia",2,false,"A caatinga é um bioma exclusivamente brasileiro. Uma adaptação comum de suas plantas à falta de água é:",["a perda das folhas na estação seca, o que reduz a perda de água por transpiração.","a presença de folhas largas e finas durante todo o ano.","raízes superficiais que só absorvem a água do orvalho.","a ausência total de raízes.","a necessidade de chuva diária para sobreviver."]],
    ["ex59","EM","1ª série","Biologia","Saúde coletiva",2,false,"Os casos de dengue, zika e chikungunya aumentam no período chuvoso. A medida coletiva mais eficaz para reduzir a transmissão dessas doenças é:",["eliminar criadouros de água parada, com ação conjunta de moradores e poder público.","tomar antibiótico ao primeiro sinal de febre.","evitar conversar com pessoas doentes, pois a transmissão é pelo ar.","beber bastante água de coco todos os dias.","usar repelente apenas uma vez por mês."]],
    ["ex60","EM","2ª série","Biologia","Genética",3,false,"Um casal procura o posto de saúde para aconselhamento genético. Os dois são heterozigotos (Aa) para o albinismo, característica de herança autossômica recessiva. A probabilidade de terem um filho com albinismo é de:",["25%","50%","75%","0%","100%"]],
    ["ex61","EM","3ª série","Biologia","Evolução",3,false,"Usar antibióticos sem receita ou interromper o tratamento antes do prazo contribui para o surgimento de bactérias resistentes porque:",["o antibiótico seleciona as bactérias que já eram resistentes, que sobrevivem e se multiplicam.","o antibiótico ensina as bactérias a se defenderem.","as bactérias se transformam em vírus.","a resistência surge no organismo da pessoa, e não nas bactérias.","bactérias resistentes surgem apenas dentro de hospitais."]],
    ["ex62","EM","1ª série","Física","Cinemática",2,false,"Um estudante da zona rural mora a 12 km da escola. O ônibus escolar faz esse trajeto em 30 minutos. Qual é a velocidade média do ônibus?",["24 km/h","6 km/h","40 km/h","0,4 km/h","360 km/h"]],
    ["ex63","EM","2ª série","Física","Termologia",2,false,"Por que casas de taipa e de paredes grossas no sertão costumam ser mais frescas por dentro durante o dia?",["Porque paredes grossas, de material com baixa condutividade térmica, demoram a transmitir o calor para o interior.","Porque a taipa produz frio ao absorver a luz do sol.","Porque o barro reflete toda a radiação solar.","Porque o calor não se propaga em materiais naturais.","Porque paredes grossas aumentam a temperatura do lado de fora."]],
    ["ex64","EM","3ª série","Física","Energia elétrica",3,false,"Uma associação comunitária instalou, na escola do bairro, placas solares que geram, em média, 300 kWh por mês. A escola consome 450 kWh por mês e a tarifa é de R$ 0,90 por kWh. Qual é a economia mensal da escola e que fração do seu consumo é atendida pelas placas?",["R$ 270,00, atendendo 2/3 do consumo.","R$ 405,00, atendendo todo o consumo.","R$ 270,00, atendendo 3/2 do consumo.","R$ 135,00, atendendo 1/3 do consumo.","R$ 300,00, atendendo 2/3 do consumo."]],
    ["ex65","EM","1ª série","Química","Combustão",2,false,"Em muitas casas, ainda se cozinha com lenha em fogões sem chaminé. A fumaça pode conter monóxido de carbono (CO), gás tóxico que se forma quando:",["a combustão é incompleta, por falta de oxigênio suficiente.","a lenha queima com excesso de oxigênio.","a água da panela evapora.","o fogo se apaga completamente.","a lenha está muito seca."]],
    ["ex66","EM","2ª série","Química","Soluções",3,false,"O soro caseiro, usado contra a desidratação, pode ser preparado com cerca de 3,5 g de sal e 20 g de açúcar em 1 litro de água. Qual é a concentração de açúcar em g/L e quanto açúcar seria necessário para preparar 250 mL?",["20 g/L; 5 g","20 g/L; 80 g","5 g/L; 20 g","3,5 g/L; 0,875 g","80 g/L; 5 g"]],
    ["ex67","EM","2ª série","Química","pH",3,false,"Uma amostra de água de um rio que recebe esgoto de uma fábrica tem pH 4. Considerando a concentração de íons H⁺, em comparação com uma água de pH 7, essa amostra é:",["1 000 vezes mais ácida.","3 vezes mais ácida.","30 vezes mais ácida.","menos ácida.","neutra."]],
    ["ex68","EM","1ª série","História","Resistência à escravidão",2,false,"O Quilombo dos Palmares, que resistiu por quase um século na Serra da Barriga (atual Alagoas), é lembrado hoje principalmente como:",["símbolo da resistência negra à escravidão, celebrado no Dia da Consciência Negra (20 de novembro).","um povoado criado pela Coroa portuguesa para abrigar colonos.","uma fazenda de açúcar administrada pelos jesuítas.","um movimento de independência liderado pela elite.","uma revolta de imigrantes europeus."]],
    ["ex69","EM","3ª série","História","Movimentos populares no Ceará",3,false,"O Caldeirão de Santa Cruz do Deserto, no Crato (CE), liderado pelo beato José Lourenço, foi uma comunidade em que a terra e a produção eram partilhadas. Entre 1936 e 1937, foi atacado e destruído por forças do governo. Esse episódio pode ser entendido como:",["repressão a uma experiência popular de organização coletiva que desafiava a concentração de terras.","uma guerra entre o Brasil e o Paraguai.","um conflito causado pela invasão de estrangeiros no sertão.","o início da construção de Brasília.","uma revolta de grandes fazendeiros contra os impostos."]],
    ["ex70","EM","3ª série","História","Redemocratização",2,false,"A Constituição de 1988, conhecida como \"Constituição Cidadã\", é marcada:",["pela ampliação de direitos sociais, como a saúde pública universal (SUS) e a educação como direito de todos.","pela proibição do voto dos analfabetos.","pelo fim das eleições diretas para presidente.","pela censura prévia à imprensa.","pelo restabelecimento da escravidão em algumas regiões."]],
    ["ex71","EM","1ª série","Geografia","Clima",2,false,"O El Niño, aquecimento anormal das águas do oceano Pacífico, costuma provocar no Nordeste brasileiro:",["redução das chuvas, agravando as secas no semiárido.","neve nas serras do Ceará.","aumento intenso das chuvas em todo o sertão.","terremotos no litoral.","congelamento dos açudes."]],
    ["ex72","EM","2ª série","Geografia","Questão agrária",3,false,"Segundo o Censo Agropecuário de 2017 (IBGE), a agricultura familiar reúne cerca de 77% dos estabelecimentos rurais, mas ocupa apenas cerca de 23% da área total. Esse dado ajuda a discutir:",["a concentração de terras e a importância da agricultura familiar para a produção de alimentos.","o fim da produção agrícola no Brasil.","a ausência de trabalhadores no campo.","a ideia de que pequenos agricultores possuem a maior parte das terras do país.","a ideia de que o campo não tem relação com a cidade."]],
    ["ex73","EM","1ª série","Sociologia","Desigualdade racial",3,false,"Dados do IBGE mostram que, no Brasil, pessoas pretas e pardas recebem, em média, rendimentos menores que pessoas brancas, mesmo quando têm o mesmo nível de escolaridade. O conceito que ajuda a explicar esse dado é:",["racismo estrutural.","meritocracia.","democracia racial.","mobilidade social ascendente.","êxodo rural."]],
    ["ex74","EM","2ª série","Sociologia","Mundo do trabalho",3,false,"Entregadores de aplicativo costumam trabalhar mais de 10 horas por dia, sem salário fixo, férias ou proteção em caso de acidente, e são chamados pelas empresas de \"parceiros\" ou \"empreendedores\". Uma análise sociológica dessa situação aponta:",["a precarização do trabalho, com a transferência dos riscos da atividade para o trabalhador.","o fim da exploração do trabalho na sociedade atual.","que os entregadores são donos das empresas de aplicativo.","que a tecnologia eliminou a desigualdade entre patrões e trabalhadores.","que o trabalho por aplicativo garante todos os direitos da CLT."]],
    ["ex75","EM","1ª série","Filosofia","Paulo Freire",2,false,"Paulo Freire criticou a chamada \"educação bancária\", na qual:",["o professor \"deposita\" conteúdos nos alunos, vistos como recipientes passivos.","os estudantes aprendem a administrar as finanças pessoais.","o diálogo entre professor e aluno é o centro do processo.","o conhecimento parte da realidade vivida pelos educandos.","os estudantes escolhem os conteúdos sem a participação do professor."]],
    ["ex76","EM","2ª série","Filosofia","Paulo Freire",3,false,"Para Paulo Freire, a práxis é:",["a união entre reflexão e ação para transformar a realidade.","a repetição de exercícios até a memorização.","a prática que dispensa qualquer teoria.","a teoria pura, separada da vida concreta.","a obediência às regras impostas pela escola."]],
    ["ex77","EM","3ª série","Filosofia","Ética",3,false,"Ao acompanhar o julgamento do oficial nazista Adolf Eichmann, a filósofa Hannah Arendt usou a expressão \"banalidade do mal\" para indicar que:",["grandes crimes podem ser cometidos por pessoas comuns que obedecem sem pensar criticamente.","o mal é sempre praticado por monstros sem semelhança com pessoas comuns.","os crimes de guerra não têm importância histórica.","toda obediência é sinônimo de virtude.","o mal é uma ilusão criada pela religião."]],
    ["ex78","EM","3ª série","Língua Inglesa","Reading",2,false,"Read:\n\"Access to clean water is a human right. Yet, millions of people still walk for hours every day to fetch water.\"\nIn this text, the word \"Yet\" expresses:",["contrast.","addition.","cause.","conclusion.","time."]],
    ["ex79", "EF", "6º ano", "Matemática", "Sistema monetário", 1, true, "Dona Rita comprou no Mercadinho da Turma os produtos da imagem: 1 pacote de arroz e 1 quilo de feijão. Quanto ela gastou?", ["R$ 35,00", "R$ 15,00", "R$ 25,00", "R$ 45,00"], {"imgApp": "ex79", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex80", "EF", "6º ano", "Matemática", "Sistema monetário", 1, true, "Para voltar às aulas, Marcos comprou um caderno, um lápis e uma borracha, pelos preços da imagem. Quanto ele pagou?", ["R$ 19,00", "R$ 17,00", "R$ 21,00", "R$ 9,00"], {"imgApp": "ex80", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex81", "EF", "6º ano", "Matemática", "Sistema monetário", 2, true, "No intervalo do trabalho, Seu José pediu uma tapioca e um café (veja os preços). Ele pagou com uma nota de R$ 20,00. Quanto recebeu de troco?", ["R$ 8,00", "R$ 12,00", "R$ 10,00", "R$ 32,00"], {"imgApp": "ex81", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex82", "EF", "6º ano", "Matemática", "Sistema monetário", 1, true, "Observe o encarte. Qual destes produtos tem o maior preço?", ["O queijo.", "O mel.", "A manteiga.", "A lata de milho."], {"imgApp": "ex82", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex83", "EF", "6º ano", "Matemática", "Multiplicação", 2, false, "A cozinha da escola precisa de 3 panelas iguais à da imagem. Quanto a escola vai gastar?", ["R$ 150,00", "R$ 53,00", "R$ 100,00", "R$ 200,00"], {"imgApp": "ex83", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex84", "EF", "7º ano", "Matemática", "Educação financeira", 3, false, "Uma família tem R$ 400,00 para melhorar a casa. Ela quer comprar dois dos produtos da imagem sem passar desse valor. Qual escolha é possível?", ["A mesa e a janela.", "A tela e a janela.", "A tela e a mesa.", "Os três produtos."], {"imgApp": "ex84", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex85", "EF", "6º ano", "Matemática", "Sistema monetário", 2, true, "Ana quer pagar o bolo da imagem com o valor exato, sem precisar de troco. Quais notas ela pode usar?", ["Uma nota de R$ 20,00 e uma de R$ 10,00.", "Uma nota de R$ 20,00 e uma de R$ 5,00.", "Duas notas de R$ 20,00.", "Três notas de R$ 5,00."], {"imgApp": "ex85", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex86", "EF", "7º ano", "Matemática", "Divisão", 3, false, "O pacote de arroz da imagem tem 5 kg. Qual é o preço de cada quilo?", ["R$ 5,00", "R$ 20,00", "R$ 25,00", "R$ 30,00"], {"imgApp": "ex86", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex87", "EF", "6º ano", "Matemática", "Adição", 1, true, "No lanche da tarde, uma pessoa comprou um sanduíche, um suco de caju e uma água. Quanto custou o lanche?", ["R$ 19,00", "R$ 17,00", "R$ 14,00", "R$ 20,00"], {"imgApp": "ex87", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex88", "EF", "8º ano", "Matemática", "Porcentagem", 3, false, "O sapato da imagem ganhou 10% de desconto na sexta-feira. Por quanto ele passou a ser vendido?", ["R$ 108,00", "R$ 110,00", "R$ 12,00", "R$ 130,00"], {"imgApp": "ex88", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex89", "EF", "7º ano", "Matemática", "Multiplicação", 2, false, "Lúcia comprou 2 kg de caju e 1 kg de manga, pelos preços da imagem. Quanto ela gastou?", ["R$ 16,00", "R$ 11,00", "R$ 17,00", "R$ 22,00"], {"imgApp": "ex89", "tituloImg": "Encarte do Mercadinho da Turma", "legenda": "Encarte didático Mercadinho da Turma."}],
    ["ex90", "EF", "6º ano", "Língua Portuguesa", "Gêneros textuais: bilhete", 1, true, "Leia o bilhete:\n\"Marcos,\nSaí para o trabalho cedo. O almoço está na geladeira. Lave a louça e feche a porta. Volto às seis horas.\nClara\"\nOnde está o almoço?", ["Na geladeira.", "No fogão.", "Na casa da vizinha.", "Na mesa."]],
    ["ex91", "EF", "7º ano", "Língua Portuguesa", "Texto instrucional", 2, true, "Leia:\n\"Insira o cartão na máquina. Digite a sua senha. Nunca deixe alguém ver a senha. Escolha a opção saque. Digite o valor desejado. Retire o dinheiro e o comprovante. Não esqueça de pegar o cartão.\"\nQual cuidado o texto dá para proteger o seu dinheiro?", ["Nunca deixar alguém ver a senha.", "Digitar o valor duas vezes.", "Deixar o cartão na máquina.", "Pedir ajuda a qualquer pessoa da fila."]],
    ["ex92", "EF", "7º ano", "Língua Portuguesa", "Texto informativo", 2, true, "Leia:\n\"A dengue é uma doença grave. Ela é transmitida por um mosquito. O mosquito nasce na água parada. Por isso, não deixe água em pneus. Lave os potes dos animais. Tampe a caixa-d'água.\"\nDe acordo com o texto, o mosquito da dengue nasce:", ["na água parada.", "na terra seca.", "no lixo queimado.", "nas folhas das plantas."]],
    ["ex93", "EF", "8º ano", "Língua Portuguesa", "Relato pessoal", 2, false, "Leia:\n\"Saí da escola aos treze anos. Precisei trabalhar na roça. Tinha vergonha de pedir ajuda. Um dia, minha filha me incentivou. Voltei a estudar aos quarenta anos. Hoje eu leio o jornal sozinho. Nunca é tarde para aprender.\"\nA última frase do relato expressa:", ["a ideia principal do texto.", "uma ordem dada ao leitor.", "uma informação sobre o trabalho na roça.", "uma reclamação contra a filha."]],
    ["ex94", "EF", "9º ano", "Língua Portuguesa", "Texto de opinião", 3, false, "Leia:\n\"Muita gente discute esse assunto. Uns dizem que o celular atrapalha. Outros dizem que ele ajuda a estudar. Na minha opinião, depende do uso. Se for para pesquisar, ajuda muito. Se for para jogar, atrapalha a turma.\"\nQual trecho mostra a opinião do autor?", ["\"Na minha opinião, depende do uso.\"", "\"Muita gente discute esse assunto.\"", "\"Uns dizem que o celular atrapalha.\"", "\"Outros dizem que ele ajuda a estudar.\""]],
    ["ex95", "EF", "8º ano", "Língua Portuguesa", "Gêneros textuais: carta", 2, false, "Leia:\n\"Fortaleza, 10 de março de 2026.\nPrezada diretora,\nSou aluno da turma da noite. Preciso faltar na próxima sexta. Tenho consulta no posto de saúde. Vou trazer o atestado na segunda.\nAtenciosamente,\nJoão Pereira\"\nQual é a finalidade dessa carta?", ["Justificar uma falta por causa de uma consulta.", "Pedir para mudar de turma.", "Reclamar da escola.", "Convidar a diretora para uma festa."]],
    ["ex96", "EF", "7º ano", "Língua Portuguesa", "Narrativa", 2, true, "Leia:\n\"O sertão estava seco há meses. O açude tinha virado poeira. Seu Raimundo olhava o céu todo dia. Uma tarde, uma nuvem escura cobriu o sol. Depois veio a chuva grossa. Seu Raimundo chorou de alegria.\"\nPor que Seu Raimundo chorou?", ["De alegria, porque a chuva chegou depois de meses de seca.", "De tristeza, porque o açude quebrou.", "Porque as crianças fizeram barulho.", "Porque o vento derrubou a casa."]],
    ["ex97", "EF", "7º ano", "Língua Portuguesa", "Entrevista", 1, true, "Leia o trecho da entrevista:\n\"— Quem lhe ensinou a fazer renda?\n— Foi minha avó, lá em Aracati.\n— A senhora pretende ensinar alguém?\n— Já ensinei minhas três netas.\"\nQuem ensinou Dona Maria a fazer renda?", ["A avó dela.", "As netas dela.", "A filha dela.", "Uma vizinha."]],
    ["ex98", "EF", "6º ano", "Língua Portuguesa", "Interpretação de texto", 1, true, "Leia:\n\"O vizinho tem uma carroça. O cavalo puxa a carroça. Ele leva macaxeira na carroça.\"\nO que o vizinho leva na carroça?", ["Macaxeira.", "Farinha.", "Peixe.", "Queijo."], {"imgApp": "ex98", "tituloImg": "Carroça levando macaxeira", "legenda": "Ler Passo a Passo, material de AEE."}],
    ["ex99", "EF", "6º ano", "Língua Portuguesa", "Interpretação de texto", 1, true, "Leia:\n\"Minha vizinha vende farinha. A farinha vem da macaxeira. Eu levo a farinha para casa.\"\nDe onde vem a farinha?", ["Da macaxeira.", "Do milho.", "Do trigo.", "Do arroz."], {"imgApp": "ex99", "tituloImg": "Farinha de mandioca", "legenda": "Ler Passo a Passo, material de AEE."}],
    ["ex100", "EF", "6º ano", "Ciências", "Plantas e alimentação", 2, true, "Leia:\n\"O caju é uma fruta do Nordeste. A parte vermelha é o pedúnculo. A castanha fica na ponta. Do caju se faz suco e doce. O Ceará é um grande produtor.\"\nObserve a imagem. Segundo o texto, a parte vermelha do caju é:", ["o pedúnculo.", "a castanha.", "a semente.", "a folha."], {"imgApp": "ex100", "tituloImg": "Caju", "legenda": "Encarte didático Mercadinho da Turma."}]
  ];
  var VERSAO_SEED = 3;
  var REVISADA = { status: "ok", alteracoes: [], problemas: [], em: "2026-10-13T12:00:00Z" };
  function loteDe(r) { var n = parseInt(r[0].slice(2), 10); return n > 78 ? 3 : n > 16 ? 2 : 1; }
  function semear() {
    var v = 0; try { v = parseInt(localStorage.getItem("senov.semeado") || "0", 10) || 0; } catch (e) {}
    if (v >= VERSAO_SEED) return;
    var jaTem = Array.from(mem.keys()).some(function (k) { return k.indexOf("questoes/") === 0; });
    var ps = [];
    SEED.forEach(function (r) {
      var p = "questoes/" + r[0], d = mem.get(p);
      if (d) {
        if (d.exemplo && !d.revisao && d.enunciado === r[7]) { var n = clone(d); n.revisao = REVISADA; ps.push(gravar(p, n)); }
        return;
      }
      var lote = loteDe(r);
      if (lote <= v || (lote === 1 && v === 0 && jaTem)) return;
      var x = r[9] || {};
      ps.push(gravar(p, { autorId: "exemplo", exemplo: true, autorizado: true, nivel: r[1], serie: r[2], disciplina: r[3], conteudo: r[4], dificuldade: r[5], aee: r[6], enunciado: r[7], alternativas: r[8], correta: 0, fixarOrdem: false, revisao: REVISADA,
        temFoto: !!x.imgApp, grafico: null, imgApp: x.imgApp || null, tituloImg: x.tituloImg || "", legenda: x.legenda || "", criadoEm: ["", "2026-09-25T12:00:00Z", "2026-10-13T12:00:00Z", "2026-10-19T12:00:00Z"][lote] }));
    });
    try { localStorage.setItem("senov.semeado", String(VERSAO_SEED)); } catch (e) {}
    return Promise.all(ps);
  }

  /* ---------- Quem está usando (neste aparelho é sempre o dono) ---------- */
  var user = {
    isOwner: function () { return Promise.resolve(true); },
    canEdit: function () { return Promise.resolve(true); },
    can: function () { return Promise.resolve(true); },
    id: function () { return Promise.resolve("local"); },
    me: function () { return Promise.resolve({ id: "local", name: "", avatarUrl: "", color: "#2447C6", email: null, isOwner: true, canEdit: true }); },
    name: function () { return Promise.resolve(""); },
    profiles: function (ids) { var o = {}; [].concat(ids).forEach(function (i) { o[i] = { id: i, name: "", avatarUrl: "", color: "#2447C6", email: null, isMe: i === "local", guest: false }; }); return Promise.resolve(o); },
    search: function () { return Promise.resolve([]); }
  };

  /* ---------- Baixar arquivos ---------- */
  var TIPOS = { pdf: "application/pdf", json: "application/json", csv: "text/csv" };
  function paraBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(",")[1]); };
      fr.onerror = rej; fr.readAsDataURL(blob);
    });
  }
  var downloads = {
    save: function (req) {
      var ext = String(req.filename).split(".").pop().toLowerCase();
      var blob = req.data instanceof Blob ? req.data : new Blob([req.data], { type: TIPOS[ext] || "application/octet-stream" });
      if (nativo) {
        var FS = plugin("Filesystem"), SH = plugin("Share");
        return paraBase64(blob).then(function (b64) {
          return FS.writeFile({ path: req.filename, data: b64, directory: "CACHE" });
        }).then(function (w) {
          return SH.share({ title: req.filename, url: w.uri, dialogTitle: "Salvar ou enviar o arquivo" });
        }).then(function () { return { status: "saved" }; }, function (e) {
          var m = String((e && e.message) || e);
          throw /cancel/i.test(m) ? { code: "declined", message: m } : { code: "unavailable", message: m };
        });
      }
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = req.filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
      return Promise.resolve({ status: "saved" });
    }
  };

  /* ---------- IA (opcional): Gemini grátis do Google ou Claude com chave própria ---------- */
  function cfgIA() { try { return JSON.parse(localStorage.getItem("senov.ia") || "null") || {}; } catch (e) { return {}; } }
  function chaveGemini() { var c = cfgIA(); return c.gemini || window.CS_IA_GEMINI || ""; }
  function temIA() { var c = cfgIA(); return !!(c.chave || chaveGemini()); }
  function textoDe(input) {
    var msgs = typeof input === "string" ? [{ role: "user", content: input }] : input;
    return msgs.map(function (m) { return typeof m.content === "string" ? m.content : (m.content || []).map(function (b) { return b.text || ""; }).join("\n"); }).join("\n\n");
  }
  var MODELOS_G = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"];
  function chamarGemini(modelo, k, texto, json) {
    return fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent?key=" + encodeURIComponent(k), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: texto }] }], generationConfig: json ? { temperature: 0.3, responseMimeType: "application/json" } : { temperature: 0.4 } })
    });
  }
  function perguntarGemini(input, json) {
    var k = chaveGemini(), texto = textoDe(input);
    var salvo = null; try { salvo = localStorage.getItem("senov.gm"); } catch (e) {}
    var lista = (salvo ? [salvo] : []).concat(MODELOS_G.filter(function (m) { return m !== salvo; }));
    function tentar(i) {
      if (i >= lista.length) return descobrir();
      return chamarGemini(lista[i], k, texto, json).then(function (r) {
        if (r.status === 404 || r.status === 400) return r.json().catch(function () { return {}; }).then(function (j) {
          var m = (j && j.error && j.error.message) || ""; if (r.status === 400 && !/model|not found|supported/i.test(m)) throw { code: "unavailable", message: m || "Erro 400" };
          return tentar(i + 1);
        });
        if (r.status === 429) throw { code: "rate_limited", message: "Cota grátis da IA esgotada por hoje" };
        if (r.status === 401 || r.status === 403) throw { code: "not_granted", message: "Chave do Gemini recusada" };
        if (!r.ok) throw { code: "unavailable", message: "Erro " + r.status };
        try { localStorage.setItem("senov.gm", lista[i]); } catch (e) {}
        return r.json().then(function (j) {
          var c = j && j.candidates && j.candidates[0];
          return ((c && c.content && c.content.parts) || []).map(function (p) { return p.text || ""; }).join("");
        });
      }, function () { throw { code: "unavailable", message: "Sem conexão com a internet" }; });
    }
    /* nenhum nome conhecido funcionou: pergunta ao Google quais modelos existem */
    function descobrir() {
      return fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=" + encodeURIComponent(k)).then(function (r) { return r.json(); }).then(function (j) {
        var ms = ((j && j.models) || []).filter(function (m) { return /flash/.test(m.name) && (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0 && !/image|tts|audio|live|thinking-exp/.test(m.name); })
          .map(function (m) { return m.name.replace(/^models\//, ""); });
        if (!ms.length) throw { code: "unavailable", message: "Nenhum modelo disponível" };
        lista = ms.slice(0, 3); return tentar(0);
      });
    }
    return tentar(0);
  }
  function perguntar(input, json) {
    var c = cfgIA();
    if (!c.chave) { if (chaveGemini()) return perguntarGemini(input, json); return Promise.reject({ code: "not_granted", message: "Sem chave da API" }); }
    var msgs = typeof input === "string" ? [{ role: "user", content: input }] : input;
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": c.chave, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: c.modelo || "claude-sonnet-5-5", max_tokens: 4000, messages: msgs })
    }).then(function (r) {
      if (r.ok) return r.json();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var m = (j && j.error && j.error.message) || ("Erro " + r.status);
        throw { code: r.status === 429 ? "rate_limited" : (r.status === 401 || r.status === 403) ? "not_granted" : "unavailable", message: m };
      });
    }, function () { throw { code: "unavailable", message: "Sem conexão com a internet" }; })
      .then(function (j) { return (j.content || []).map(function (b) { return b.text || ""; }).join(""); })
      .catch(function (e) { if (chaveGemini() && e && e.code !== "not_granted") return perguntarGemini(input, json); throw e; });
  }
  var sample = function (input) { return perguntar(input).then(function (t) { return { text: t, truncated: false }; }); };
  sample.json = function (input) {
    return perguntar(input, true).then(function (t) {
      var a = t.indexOf("{"), b = t.lastIndexOf("}");
      if (a < 0 || b < a) throw { code: "invalid_json", message: "Resposta sem JSON", text: t };
      try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw { code: "invalid_json", message: "JSON inválido", text: t }; }
    });
  };
  sample.limits = function () { return Promise.resolve({ images: false }); };

  /* ---------- Ponto de entrada igual ao do claude.ai ---------- */
  var pronto = carregar().then(semear).catch(function (e) { console.error(e); });
  window.claude = {
    use: function (nome) {
      return pronto.then(function () {
        if (nome === "db") return db;
        if (nome === "user") return user;
        if (nome === "downloads") return downloads;
        if (nome === "sample") return temIA() ? sample : null;
        return null;
      });
    }
  };

  /* ---------- Botão "voltar" do Android ---------- */
  window.SENOV_voltar = function () {
    var layer = document.getElementById("layer");
    if (layer && layer.innerHTML) { layer.innerHTML = ""; return true; }
    try { if (typeof S !== "undefined" && S.tab !== "inicio") { S.tab = "inicio"; render(); window.scrollTo(0, 0); return true; } } catch (e) {}
    return false;
  };
  if (nativo) {
    var App = plugin("App");
    if (App) App.addListener("backButton", function () { if (!window.SENOV_voltar()) App.exitApp(); });
  }

  /* ---------- Funcionar sem internet (PWA) ---------- */
  if (!nativo && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function (e) { console.warn(e); }); });
  }
})();
