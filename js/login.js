async function gerarHashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
sessionStorage.setItem("usuario", JSON.stringify({
  matricula: data.matricula,
  nome_completo: data.nome_completo,
  graduacao: data.graduacao,
  perfil: data.perfil,
  loginTime: Date.now()
}));


async function login() {

  const matricula = document.getElementById("matricula").value
    .trim()
    .toUpperCase();

  const senha = document.getElementById("senha").value;

  if (!matricula || !senha) {
    alert("Informe matrícula e senha");
    return;
  }

  // 🔎 BUSCA SOMENTE PELA MATRÍCULA
  const { data, error } = await supabaseClient
    .from("usuarios")
    .select(`
      matricula,
      nome_completo,
      graduacao,
      perfil,
      senha
    `)
    .eq("matricula", matricula)
    .single();

  if (error || !data) {
    alert("Acesso negado");
    return;
  }

  // 🔐 HASH DA SENHA DIGITADA
  const senhaHashDigitada = await gerarHashSenha(senha);

  // ❌ COMPARAÇÃO
  if (senhaHashDigitada !== data.senha) {
    alert("Acesso negado");
    return;
  }

  // 🔒 SALVA SESSÃO SEM SENHA
  sessionStorage.setItem("usuario", JSON.stringify({
    matricula: data.matricula,
    nome_completo: data.nome_completo,
    graduacao: data.graduacao,
    perfil: data.perfil
  }));

  if (data.perfil === "ADM") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "policial.html";
  }
}
