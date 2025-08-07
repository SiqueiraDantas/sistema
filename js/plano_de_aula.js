// js/plano_de_aula.js (Focado 100% no Professor - VERSÃO ATUALIZADA)
import { db, auth } from './firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// --- NOVA IMPORTAÇÃO ---
// Importa a função para mostrar notificações customizadas
import { mostrarNotificacao } from './notificacao.js';

export function init(container ) {
  console.log("✅ Módulo de Plano de Aula (Professor) inicializado!");

  const planoForm = container.querySelector("#plano-form");
  const btnSalvar = container.querySelector("#btn-salvar-plano");
  const selectOficina = container.querySelector("#plano-oficina");
  const inputProfessor = container.querySelector("#plano-professor");

  if (!planoForm || !btnSalvar || !selectOficina || !inputProfessor) {
    console.error("❌ Erro: Elementos essenciais do formulário de plano de aula não encontrados.");
    return;
  }

  // Preenche o nome do professor logado, se disponível
  if (auth.currentUser && auth.currentUser.displayName) {
    inputProfessor.value = auth.currentUser.displayName;
  }

  // Adiciona o listener ao formulário para o evento 'submit'
  planoForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Previne o recarregamento da página
    salvarPlano(planoForm, btnSalvar);
  });

  carregarOficinasParaFormulario(selectOficina);
}

async function carregarOficinasParaFormulario(selectElement) {
  selectElement.innerHTML = `<option value="">Carregando oficinas...</option>`;
  try {
    // Idealmente, as oficinas deveriam ser filtradas pelo professor logado.
    // Esta implementação carrega todas as oficinas cadastradas.
    const snapshot = await getDocs(collection(db, "matriculas"));
    const oficinas = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.oficinas) data.oficinas.forEach(o => oficinas.add(o.trim()));
    });
    const oficinasOrdenadas = Array.from(oficinas).sort();
    selectElement.innerHTML = `<option value="">Selecione uma oficina</option>`;
    oficinasOrdenadas.forEach(oficina => {
      selectElement.innerHTML += `<option value="${oficina}">${oficina}</option>`;
    });
  } catch (error) {
    console.error("❌ Erro ao carregar oficinas:", error);
    selectElement.innerHTML = `<option value="">Erro ao carregar</option>`;
    mostrarNotificacao('Erro ao carregar as oficinas.', 'erro');
  }
}

async function salvarPlano(planoForm, btnSalvar) {
  const user = auth.currentUser;
  if (!user) {
    mostrarNotificacao("Sessão expirada. Faça login novamente.", 'erro');
    return;
  }

  // Coleta os dados diretamente do formulário
  const formData = new FormData(planoForm);
  const dadosPlano = {
    titulo: formData.get('plano-titulo').trim(),
    professor: formData.get('plano-professor').trim(),
    oficina: formData.get('plano-oficina'),
    data: formData.get('plano-data'),
    objetivos: formData.get('plano-objetivos').trim(),
    materiais: formData.get('plano-materiais').trim(),
    desenvolvimento: formData.get('plano-descricao').trim(),
    avaliacao: formData.get('plano-avaliacao').trim(),
    professorEmail: user.email,
    criadoEm: serverTimestamp()
  };

  // Validação de campos obrigatórios
  if (!dadosPlano.titulo || !dadosPlano.professor || !dadosPlano.oficina || !dadosPlano.data || !dadosPlano.objetivos || !dadosPlano.desenvolvimento || !dadosPlano.avaliacao) {
    mostrarNotificacao("Por favor, preencha todos os campos obrigatórios.", 'erro');
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  try {
    await addDoc(collection(db, "planosDeAula"), dadosPlano);

    // --- MUDANÇA PRINCIPAL 1: USA A NOVA NOTIFICAÇÃO ---
    mostrarNotificacao("Plano de aula salvo com sucesso!", 'sucesso');

    planoForm.reset();
    // Repõe o nome do professor após limpar o formulário
    if (auth.currentUser && auth.currentUser.displayName) {
        planoForm.querySelector("#plano-professor").value = auth.currentUser.displayName;
    }

    // --- MUDANÇA PRINCIPAL 2: AVISA OUTRAS PARTES DO SISTEMA ---
    // Dispara um evento global que a página do admin pode "ouvir"
    window.dispatchEvent(new CustomEvent('planoSalvo'));

  } catch (error) {
    console.error("❌ Erro ao salvar plano:", error);
    mostrarNotificacao("Falha ao salvar o plano. Tente novamente.", 'erro');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar Plano de Aula";
  }
}
