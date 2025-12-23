async function login() {
  const matricula = document.getElementById("matricula").value;
  const senha = document.getElementById("senha").value;

  const { data, error } = await supabaseClient
    .from("usuarios")
    .select("*")
    .eq("matricula", matricula)
    .eq("senha", senha)
    .single();

  if (error || !data) {
    alert("Acesso negado");
    return;
  }

  localStorage.setItem("usuario", JSON.stringify(data));

  if (data.perfil === "ADM") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "policial.html";
  }
}
