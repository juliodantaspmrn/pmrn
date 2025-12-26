 const usuario = JSON.parse(sessionStorage.getItem("usuario"));


if (!usuario) {
  alert("Sessão expirada. Faça login novamente.");
  window.location.href = "index.html";
}

async function carregar() {

  /* =========================
     MENSAGEM DE BOAS-VINDAS
  ========================= */
  document.getElementById("resumo").innerHTML = `
    <h3>SEJA BEM-VINDO, POLICIAL ${usuario.nome_completo}</h3>
    <p>Abaixo segue o demonstrativo do seu banco de pontos.</p>
  `;

  /* =========================
     BUSCA PONTUAÇÕES
  ========================= */
  const { data: pontos, error: erroPontos } = await supabaseClient
    .from("pontuacoes")
    .select("tipo, pontos, data, numero_procedimento, info_adicional")
    .eq("matricula", usuario.matricula)
    .order("data", { ascending: false });

  if (erroPontos) {
    alert(erroPontos.message);
    return;
  }

  let totalPontos = 0;
  let linhasPontos = "";

  pontos.forEach(p => {
    totalPontos += p.pontos;
    linhasPontos += `
      <tr>
        <td>${p.tipo}</td>
        <td>${p.pontos}</td>
        <td>${p.data}</td>
        <td>${p.numero_procedimento || "-"}</td>
        <td>${p.info_adicional || "-"}</td>
      </tr>`;
  });

  document.getElementById("tabelaPontos").innerHTML += linhasPontos;

  /* =========================
     BUSCA COMPENSAÇÕES
  ========================= */
  const { data: comps, error: erroComps } = await supabaseClient
    .from("compensacoes")
    .select("pontos_utilizados, data_compensacao")
    .eq("matricula", usuario.matricula)
    .order("data_compensacao", { ascending: false });

  if (erroComps) {
    alert(erroComps.message);
    return;
  }

  let totalCompensado = 0;
  let linhasComps = "";

  comps.forEach(c => {
    totalCompensado += c.pontos_utilizados;
    linhasComps += `
      <tr>
        <td>${c.data_compensacao}</td>
        <td>${c.pontos_utilizados}</td>
      </tr>`;
  });

  document.getElementById("tabelaCompensacoes").innerHTML += linhasComps;

  /* =========================
     RESUMO FINAL
  ========================= */
  const saldo = totalPontos - totalCompensado;

  document.getElementById("resumo").innerHTML += `
    <hr>
    <p><strong>Total de Pontos:</strong> ${totalPontos}</p>
    <p><strong>Total Compensado:</strong> ${totalCompensado}</p>
    <p><strong>Saldo Atual:</strong> ${saldo}</p>
  `;
}

function logout() {
  sessionStorage.removeItem("usuario");
  window.location.href = "index.html";
}


carregar();
