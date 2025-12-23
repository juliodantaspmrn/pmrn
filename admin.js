const { jsPDF } = window.jspdf;

function $(id){ return document.getElementById(id); }

const admin = JSON.parse(localStorage.getItem("usuario"));
if (!admin || admin.perfil !== "ADM") {
  alert("Acesso não autorizado");
  window.location.href = "index.html";
}
function formatarDataBR(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

/* BOAS-VINDAS */
$("boasVindas").innerHTML =
  `<h3>SEJA BEM-VINDO, ${admin.graduacao} ${admin.nome_completo}</h3>`;

/* CONTROLE DE TELAS */
function mostrar(id) {
  telaInicial(); // primeiro limpa tudo
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}


/* LOGOUT */
function logout(){
  localStorage.clear();
  window.location.href = "index.html";
}

/* CADASTRAR POLICIAL */
async function cadastrarPolicial() {

  if (cadSenha.value !== cadSenhaConf.value) {
    alert("As senhas não conferem");
    return;
  }

  const { error } = await supabaseClient.from("usuarios").insert([{
    matricula: cadMat.value.trim().toUpperCase(),
    nome_completo: cadNome.value.trim().toUpperCase(),
    graduacao: cadGrad.value,
    opm: cadOpm.value.trim().toUpperCase(),
    senha: cadSenha.value,
    perfil: "POLICIAL"
  }]);

  if (error) return alert(error.message);

  alert("Policial cadastrado com sucesso");

  cadMat.value = "";
  cadNome.value = "";
  cadSenha.value = "";
  cadSenhaConf.value = "";
  cadOpm.value = "";
}


/* BUSCAR NOME */
async function buscarNome(valor, destino) {

  const div = document.getElementById(destino);
  div.innerHTML = "";

  if (!valor) return;

  // Quebra por vírgula
  const matriculas = valor
    .split(",")
    .map(m => m.trim())
    .filter(m => m);

  if (!matriculas.length) return;

  // Busca todos de uma vez
  const { data, error } = await supabaseClient
    .from("usuarios")
    .select("matricula, graduacao, nome_completo")
    .in("matricula", matriculas);

  if (error) {
    div.innerHTML = "<span style='color:red'>Erro na consulta</span>";
    return;
  }

  let html = "<strong>Policiais envolvidos:</strong><br>";

  matriculas.forEach(mat => {
    const achou = data.find(u => u.matricula === mat);

    if (achou) {
      html += `• ${achou.graduacao} ${achou.nome_completo}<br>`;
    } else {
      html += `<span style="color:red">⚠ Matrícula ${mat} não cadastrada</span><br>`;
    }
  });

  div.innerHTML = html;
}

/* LANÇAR PONTOS */
async function cadastrarPonto() {

  if (!pontMat.value) return alert("Informe a(s) matrícula(s)");

  const matriculas = pontMat.value
    .split(",")
    .map(m => m.trim())
    .filter(m => m);

  if (!matriculas.length) {
    alert("Nenhuma matrícula válida informada");
    return;
  }

  const pontos = pontTipo.value === "APF" ? 5 : 10;

  // 1️⃣ Buscar todos os policiais informados
  const { data: usuarios } = await supabaseClient
    .from("usuarios")
    .select("matricula")
    .in("matricula", matriculas);

  if (!usuarios || usuarios.length !== matriculas.length) {
    alert("Uma ou mais matrículas não estão cadastradas");
    return;
  }

  // 2️⃣ Monta os lançamentos (um por policial)
  const registros = matriculas.map(mat => ({
    matricula: mat,
    tipo: pontTipo.value,
    pontos: pontos,
    data: pontData.value,
    horario: pontHora.value,
    numero_procedimento: pontProc.value,
    info_adicional: pontInfo.value
  }));

  // 3️⃣ Insere tudo de uma vez
  const { error } = await supabaseClient
    .from("pontuacoes")
    .insert(registros);

  if (error) {
    alert("Erro ao lançar pontuação");
    return;
  }

  alert(`Pontuação lançada para ${matriculas.length} policial(is)`);

  // 4️⃣ Limpa campos
  pontMat.value = "";
  pontData.value = "";
  pontHora.value = "";
  pontProc.value = "";
  pontInfo.value = "";
  $("nomePolicial").innerHTML = "";
}


/* COMPENSAÇÃO */
async function verificarCompensacao(){
  const mat = compMat.value;

  const { data:user } = await supabaseClient
    .from("usuarios").select("id")
    .eq("matricula", mat).single();
  if(!user) return alert("Matrícula não cadastrada");

  const { data:p } = await supabaseClient
    .from("pontuacoes").select("pontos").eq("matricula",mat);
  const { data:c } = await supabaseClient
    .from("compensacoes").select("pontos_utilizados").eq("matricula",mat);

  const totalP = p.reduce((s,x)=>s+x.pontos,0);
  const totalC = c?c.reduce((s,x)=>s+x.pontos_utilizados,0):0;
  const saldo = totalP-totalC;

  if(saldo<40){
    compResultado.innerHTML=`<span style="color:red">Saldo insuficiente: ${saldo}</span>`;
    return;
  }
  compResultado.innerHTML=`Saldo disponível: <b>${saldo}</b><br><button onclick="compensarFolga()">CONFIRMAR</button>`;
}

 async function compensarFolga() {

  if (!compData.value) {
    alert("Informe a data da folga");
    return;
  }

  if (!compCmd.value) {
    alert("Informe o comandante autorizador");
    return;
  }

  const { error } = await supabaseClient
    .from("compensacoes")
    .insert([{
      matricula: compMat.value,
      pontos_utilizados: 40,
      data_compensacao: compData.value, // ✅ DATA INFORMADA PELO USUÁRIO
      comandante_autorizador: compCmd.value
    }]);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Folga compensada com sucesso");

  gerarPDFCompensacao({
    policial: document.getElementById("nomeComp").innerText,
    matricula: compMat.value,
    comandante: compCmd.value,
    data: compData.value // ✅ MESMA DATA NO PDF
  });

  /* LIMPA CAMPOS */
  compMat.value = "";
  compCmd.value = "";
  compData.value = "";
  compResultado.innerHTML = "";
  nomeComp.innerHTML = "";
}


/* PDF COMPENSAÇÃO */
function gerarPDFCompensacao(d){
  const doc = new jsPDF();
  const cod = "2BPM-"+Math.random().toString(36).substr(2,8).toUpperCase();

  doc.text("POLÍCIA MILITAR DO RN – 2º BPM",105,20,{align:"center"});
  doc.text("COMPENSAÇÃO DE FOLGA",105,30,{align:"center"});
  doc.text(`Policial: ${d.policial}`,20,50);
  doc.text(`Matrícula: ${d.matricula}`,20,60);
  doc.text(`Pontos Utilizados: 40`,20,70);
  doc.text(`Comandante: ${d.comandante}`,20,80);
  doc.text(`Data: ${d.data}`,20,90);
  doc.text(`Código: ${cod}`,20,110);

  doc.save(`Compensacao_${d.matricula}.pdf`);
}

/* CONSULTA */
let dadosConsulta = [];

 async function consultarPontos(){

  const matFiltro = consMat.value || null;

  /* USUÁRIOS */
  let qUser = supabaseClient
    .from("usuarios")
    .select("matricula, nome_completo");

  if (matFiltro) qUser = qUser.eq("matricula", matFiltro);

  const { data: usuarios } = await qUser;
  if (!usuarios || usuarios.length === 0) {
    $("resultadoConsulta").innerHTML = "Nenhum registro encontrado";
    return;
  }

  /* PONTUAÇÕES */
  const { data: pontuacoes } = await supabaseClient
    .from("pontuacoes")
    .select("matricula, tipo, pontos, data");

  /* COMPENSAÇÕES */
  const { data: compensacoes } = await supabaseClient
    .from("compensacoes")
    .select("matricula, pontos_utilizados, data_compensacao");

  let html = `
    <table>
      <tr>
        <th>Matrícula</th>
        <th>Nome</th>
        <th>Tipo</th>
        <th>Movimentação</th>
        <th>Data</th>
        <th>Pontos</th>
      </tr>
  `;

  dadosConsulta = [];

  usuarios.forEach(u => {

    let totalP = 0;
    let totalC = 0;

    /* ===== JUNTA MOVIMENTAÇÕES ===== */
    let movimentos = [];

    pontuacoes
      .filter(p => p.matricula === u.matricula)
      .forEach(p => {
        totalP += p.pontos;
        movimentos.push({
          tipo: p.tipo,
          mov: "ADIÇÃO",
          data: p.data,
          pontos: p.pontos
        });
      });

    compensacoes
      .filter(c => c.matricula === u.matricula)
      .forEach(c => {
        totalC += c.pontos_utilizados;
        movimentos.push({
          tipo: "FOLGA",
          mov: "COMPENSAÇÃO",
          data: c.data_compensacao,
          pontos: -c.pontos_utilizados
        });
      });

    /* ===== ORDENA POR DATA ===== */
    movimentos.sort((a, b) => new Date(a.data) - new Date(b.data));

    /* ===== MONTA LINHAS ===== */
    movimentos.forEach(m => {

      const classe = m.mov === "COMPENSAÇÃO" ? "comp" : "";

      html += `
        <tr class="${classe}">
          <td>${u.matricula}</td>
          <td>${u.nome_completo}</td>
          <td>${m.tipo}</td>
          <td>${m.mov}</td>
          <td>${formatarDataBR(m.data)}</td>
          <td>${m.pontos}</td>
        </tr>
      `;

      dadosConsulta.push({
        matricula: u.matricula,
        nome: u.nome_completo,
        tipo: m.tipo,
        mov: m.mov,
        data: m.data,
        pontos: m.pontos
      });
    });

    /* ===== SALDO ===== */
    const saldo = totalP - totalC;

    html += `
      <tr class="saldo">
        <td colspan="5">SALDO ATUAL – ${u.nome_completo}</td>
        <td>${saldo}</td>
      </tr>
    `;
  });

  html += "</table>";
  $("resultadoConsulta").innerHTML = html;
}


/* =========================
   TELA INICIAL / LIMPAR
========================= */
function telaInicial() {
  ["cadastro", "pontos", "compensar", "consulta"].forEach(div => {
    const el = document.getElementById(div);
    if (el) el.style.display = "none";
  });
}
let dadosCompensacoes = [];
function linhaPDF(doc, x, y, cols, larguras) {
  let posX = x;
  cols.forEach((txt, i) => {
    doc.text(String(txt), posX, y);
    posX += larguras[i];
  });
}

function gerarPDFConsulta() {
  if (!dadosConsulta || !dadosConsulta.length) {
    alert("Sem dados para gerar relatório");
    return;
  }

  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF("p", "mm", "a4");

  const margemX = 12;
  let y = 20;

  const larguras = [25, 45, 30, 40, 40];

  doc.setFontSize(14);
  doc.text("RELATÓRIO DE PONTUAÇÃO – 2º BPM", 105, 12, { align: "center" });

  const militares = {};

  // Agrupa pontuações
  dadosConsulta.forEach(p => {
    if (!militares[p.matricula]) {
      militares[p.matricula] = {
        nome: p.nome,
        pontuacoes: [],
        compensacoes: [],
        saldo: 0
      };
    }
    militares[p.matricula].pontuacoes.push(p);
    militares[p.matricula].saldo += Number(p.pontos);
  });

  // Agrupa compensações
  if (dadosCompensacoes) {
    dadosCompensacoes.forEach(c => {
      if (militares[c.matricula]) {
        militares[c.matricula].compensacoes.push(c);
        militares[c.matricula].saldo -= Number(c.pontos_utilizados);
      }
    });
  }

  Object.keys(militares).forEach(matricula => {
    const m = militares[matricula];

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Cabeçalho do militar
    doc.setFillColor(230, 230, 230);
    doc.rect(margemX, y, 186, 8, "F");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Matrícula: ${matricula} | Nome: ${m.nome}`, margemX + 2, y + 5);
    y += 12;

    // ===== PONTUAÇÕES =====
    doc.setTextColor(0, 0, 128);
    doc.setFontSize(10);
    doc.text("PONTUAÇÕES", margemX, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(0);

    linhaPDF(
      doc,
      margemX,
      y,
      ["Data", "Tipo", "Mov.", "Procedimento", "Observação"],
      larguras
    );
    y += 5;

    m.pontuacoes.forEach(p => {
      linhaPDF(
        doc,
        margemX,
        y,
        [
          p.data,
          p.tipo,
          `+${p.pontos}`,
          p.procedimento || "-",
          p.observacao || "-"
        ],
        larguras
      );
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // ===== COMPENSAÇÕES =====
    if (m.compensacoes.length) {
      y += 4;
      doc.setTextColor(128, 0, 0);
      doc.text("COMPENSAÇÕES", margemX, y);
      y += 6;

      doc.setTextColor(0);
      linhaPDF(
        doc,
        margemX,
        y,
        ["Data", "Tipo", "Mov.", "Procedimento", "Comandante"],
        larguras
      );
      y += 5;

      m.compensacoes.forEach(c => {
        linhaPDF(
          doc,
          margemX,
          y,
          [
            c.data_compensacao,
            "FOLGA",
            `-${c.pontos_utilizados}`,
            "-",
            c.comandante_autorizador
          ],
          larguras
        );
        y += 5;
      });
    }

    // ===== SALDO =====
    y += 5;
    doc.setFontSize(11);
    doc.setTextColor(0, 100, 0);
    doc.text(`SALDO ATUAL: ${m.saldo} PONTOS`, margemX, y);

    y += 15;
  });

  doc.save("Relatorio_Pontuacao_Geral_2BPM.pdf");
}



  


