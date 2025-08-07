// js/inventario.js (VERSÃO 2.0 - Com Gestão de Custódia)
import { db, auth } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let todosOsInstrumentos = []; // Cache para os instrumentos
let instrumentoEditando = null; // Para controlar se estamos editando

export function init(container) {
  console.log("✅ Módulo de Inventário (v2.0 - Custódia) inicializado!");

  // Elementos principais
  const btnNovoInstrumento = container.querySelector("#btn-novo-instrumento");
  const filtroTipo = container.querySelector("#filtro-tipo-instrumento");
  const filtroStatusCustodia = container.querySelector("#filtro-status-custodia");
  const pesquisaInstrumento = container.querySelector("#pesquisa-instrumento");
  
  // Modal de instrumento
  const modalInstrumento = container.querySelector("#modal-instrumento");
  const formInstrumento = container.querySelector("#form-instrumento");
  const btnFecharModalInstrumento = container.querySelector("#modal-instrumento .modal-close");
  const btnCancelarInstrumento = container.querySelector("#btn-cancelar-instrumento");

  // Modal de custódia
  const modalCustodia = container.querySelector("#modal-custodia");
  const formCustodia = container.querySelector("#form-custodia");
  const btnFecharModalCustodia = container.querySelector("#modal-custodia .modal-close");
  const btnCancelarCustodia = container.querySelector("#btn-cancelar-custodia");
  const selectAcaoCustodia = container.querySelector("#custodia-acao");

  if (!btnNovoInstrumento || !modalInstrumento || !formInstrumento) {
    console.error("❌ Erro: Elementos do inventário não encontrados.");
    return;
  }

  // Event Listeners - Filtros
  btnNovoInstrumento.addEventListener("click", () => abrirModalNovoInstrumento(container));
  filtroTipo.addEventListener("change", () => renderizarTabelaInventario(container));
  filtroStatusCustodia.addEventListener("change", () => renderizarTabelaInventario(container));
  pesquisaInstrumento.addEventListener("input", () => renderizarTabelaInventario(container));
  
  // Event Listeners - Modal de Instrumento
  btnFecharModalInstrumento.addEventListener("click", () => fecharModalInstrumento(container));
  btnCancelarInstrumento.addEventListener("click", () => fecharModalInstrumento(container));
  formInstrumento.addEventListener("submit", (e) => salvarInstrumento(e, container));
  
  // Event Listeners - Modal de Custódia
  btnFecharModalCustodia.addEventListener("click", () => fecharModalCustodia(container));
  btnCancelarCustodia.addEventListener("click", () => fecharModalCustodia(container));
  formCustodia.addEventListener("submit", (e) => salvarCustodia(e, container));
  selectAcaoCustodia.addEventListener("change", () => ajustarCamposCustodia(container));
  
  // Fechar modais clicando fora
  modalInstrumento.addEventListener("click", (e) => {
    if (e.target === modalInstrumento) fecharModalInstrumento(container);
  });
  modalCustodia.addEventListener("click", (e) => {
    if (e.target === modalCustodia) fecharModalCustodia(container);
  });

  // Carrega os dados iniciais
  carregarDadosIniciais(container);
}

async function carregarDadosIniciais(container) {
  const tabelaBody = container.querySelector("#corpo-tabela-inventario");
  tabelaBody.innerHTML = '<tr><td colspan="8">Carregando instrumentos...</td></tr>';
  
  try {
    const q = query(collection(db, "inventario"), orderBy("numeroInstrumento", "asc"));
    const snapshot = await getDocs(q);
    todosOsInstrumentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderizarTabelaInventario(container);

  } catch (error) {
    console.error("❌ Erro ao carregar instrumentos:", error);
    tabelaBody.innerHTML = '<tr><td colspan="8">Falha ao carregar dados.</td></tr>';
  }
}

function renderizarTabelaInventario(container) {
  const tabelaBody = container.querySelector("#corpo-tabela-inventario");
  const filtroTipo = container.querySelector("#filtro-tipo-instrumento").value;
  const filtroStatusCustodia = container.querySelector("#filtro-status-custodia").value;
  const pesquisa = container.querySelector("#pesquisa-instrumento").value.toLowerCase();

  const instrumentosFiltrados = todosOsInstrumentos.filter(instrumento => {
    const correspondeTipo = !filtroTipo || instrumento.tipo === filtroTipo;
    const correspondeStatus = !filtroStatusCustodia || instrumento.statusCustodia === filtroStatusCustodia;
    const correspondePesquisa = !pesquisa || 
      instrumento.nomeInstrumento.toLowerCase().includes(pesquisa) ||
      instrumento.numeroInstrumento.toLowerCase().includes(pesquisa) ||
      (instrumento.responsavelAtual && instrumento.responsavelAtual.toLowerCase().includes(pesquisa));
    
    return correspondeTipo && correspondeStatus && correspondePesquisa;
  });

  tabelaBody.innerHTML = "";
  
  if (instrumentosFiltrados.length === 0) {
    tabelaBody.innerHTML = '<tr><td colspan="8">Nenhum instrumento encontrado.</td></tr>';
    return;
  }

  instrumentosFiltrados.forEach(instrumento => {
    const dataEmprestimo = instrumento.dataEmprestimo ? 
      new Date(instrumento.dataEmprestimo.seconds * 1000).toLocaleDateString('pt-BR') : 
      '-';
    
    const corStatusCustodia = getCorStatusCustodia(instrumento.statusCustodia);
    const corEstadoFisico = getCorEstadoFisico(instrumento.estadoFisico);
    
    // Verifica se está em atraso
    const isAtrasado = verificarAtraso(instrumento);
    const classeAtraso = isAtrasado ? 'linha-atrasada' : '';
    
    const linha = document.createElement("tr");
    linha.className = classeAtraso;
    linha.innerHTML = `
      <td><strong>${instrumento.numeroInstrumento}</strong></td>
      <td>${instrumento.nomeInstrumento}</td>
      <td>${instrumento.tipo}</td>
      <td><span class="badge-status" style="background-color: ${corStatusCustodia}">${instrumento.statusCustodia || 'Disponível'}</span></td>
      <td>${instrumento.responsavelAtual || '-'}</td>
      <td>${dataEmprestimo}</td>
      <td><span class="badge-estado" style="background-color: ${corEstadoFisico}">${instrumento.estadoFisico || 'Bom'}</span></td>
      <td>
        <button class="btn-acao-tabela" onclick="gerenciarCustodia('${instrumento.id}')" title="Gerenciar Custódia">
          <i class="fas fa-exchange-alt"></i>
        </button>
        <button class="btn-acao-tabela" onclick="editarInstrumento('${instrumento.id}')" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-acao-tabela btn-excluir" onclick="excluirInstrumento('${instrumento.id}')" title="Excluir">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tabelaBody.appendChild(linha);
  });
}

function getCorStatusCustodia(status) {
  const cores = {
    'Disponível': '#4CAF50',
    'Emprestado': '#FF9800',
    'Em Manutenção': '#2196F3',
    'Fora de Uso': '#9E9E9E'
  };
  return cores[status] || '#4CAF50';
}

function getCorEstadoFisico(estado) {
  const cores = {
    'Excelente': '#4CAF50',
    'Bom': '#8BC34A',
    'Regular': '#FF9800',
    'Precisa Reparo': '#FF5722',
    'Fora de Uso': '#9E9E9E'
  };
  return cores[estado] || '#8BC34A';
}

function verificarAtraso(instrumento) {
  if (instrumento.statusCustodia !== 'Emprestado' || !instrumento.dataDevolucaoPrevista) {
    return false;
  }
  
  const hoje = new Date();
  const dataPrevista = new Date(instrumento.dataDevolucaoPrevista.seconds * 1000);
  return hoje > dataPrevista;
}

function abrirModalNovoInstrumento(container) {
  instrumentoEditando = null;
  const modal = container.querySelector("#modal-instrumento");
  const titulo = container.querySelector("#modal-titulo");
  const form = container.querySelector("#form-instrumento");
  
  titulo.textContent = "Cadastrar Novo Instrumento";
  form.reset();
  
  // Define valores padrão
  container.querySelector("#status-custodia-instrumento").value = "Disponível";
  container.querySelector("#data-emprestimo").value = "";
  container.querySelector("#data-devolucao-prevista").value = "";
  
  modal.style.display = "flex";
}

function fecharModalInstrumento(container) {
  const modal = container.querySelector("#modal-instrumento");
  modal.style.display = "none";
  instrumentoEditando = null;
}

function fecharModalCustodia(container) {
  const modal = container.querySelector("#modal-custodia");
  modal.style.display = "none";
}

function ajustarCamposCustodia(container) {
  const acao = container.querySelector("#custodia-acao").value;
  const grupoResponsavel = container.querySelector("#grupo-responsavel");
  const grupoDatas = container.querySelector("#grupo-datas");
  const inputResponsavel = container.querySelector("#custodia-responsavel");
  
  // Mostra/esconde campos baseado na ação
  if (acao === 'emprestar') {
    grupoResponsavel.style.display = 'block';
    grupoDatas.style.display = 'flex';
    inputResponsavel.required = true;
    
    // Define data de empréstimo como hoje
    const hoje = new Date().toISOString().split('T')[0];
    container.querySelector("#custodia-data-emprestimo").value = hoje;
    
  } else if (acao === 'devolver' || acao === 'disponibilizar') {
    grupoResponsavel.style.display = 'none';
    grupoDatas.style.display = 'none';
    inputResponsavel.required = false;
    
  } else if (acao === 'manutencao') {
    grupoResponsavel.style.display = 'none';
    grupoDatas.style.display = 'none';
    inputResponsavel.required = false;
  }
}

async function salvarInstrumento(e, container) {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    alert("Sessão expirada. Faça login novamente.");
    return;
  }

  const btnSalvar = container.querySelector("#btn-salvar-instrumento");
  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  try {
    const dadosInstrumento = {
      numeroInstrumento: container.querySelector("#numero-instrumento").value.trim(),
      nomeInstrumento: container.querySelector("#nome-instrumento").value.trim(),
      tipo: container.querySelector("#tipo-instrumento").value,
      estadoFisico: container.querySelector("#estado-fisico-instrumento").value,
      statusCustodia: container.querySelector("#status-custodia-instrumento").value,
      responsavelAtual: container.querySelector("#responsavel-instrumento").value.trim() || null,
      localizacaoFisica: container.querySelector("#localizacao-instrumento").value || null,
      marca: container.querySelector("#marca-instrumento").value.trim() || null,
      observacoes: container.querySelector("#observacoes-instrumento").value.trim() || null,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user.email
    };

    // Adiciona datas se fornecidas
    const dataEmprestimo = container.querySelector("#data-emprestimo").value;
    const dataDevolucao = container.querySelector("#data-devolucao-prevista").value;
    
    if (dataEmprestimo) {
      dadosInstrumento.dataEmprestimo = new Date(dataEmprestimo + 'T00:00:00');
    }
    if (dataDevolucao) {
      dadosInstrumento.dataDevolucaoPrevista = new Date(dataDevolucao + 'T00:00:00');
    }

    if (instrumentoEditando) {
      // Atualizar instrumento existente
      await updateDoc(doc(db, "inventario", instrumentoEditando), dadosInstrumento);
      mostrarToast(container, "Instrumento atualizado com sucesso!");
    } else {
      // Criar novo instrumento
      dadosInstrumento.criadoEm = serverTimestamp();
      dadosInstrumento.criadoPor = user.email;
      await addDoc(collection(db, "inventario"), dadosInstrumento);
      mostrarToast(container, "Instrumento cadastrado com sucesso!");
    }

    fecharModalInstrumento(container);
    carregarDadosIniciais(container); // Recarrega a tabela

  } catch (error) {
    console.error("❌ Erro ao salvar instrumento:", error);
    alert("Falha ao salvar o instrumento. Tente novamente.");
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar Instrumento";
  }
}

async function salvarCustodia(e, container) {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    alert("Sessão expirada. Faça login novamente.");
    return;
  }

  const btnSalvar = container.querySelector("#btn-salvar-custodia");
  btnSalvar.disabled = true;
  btnSalvar.textContent = "Processando...";

  try {
    const instrumentoId = container.querySelector("#custodia-instrumento-id").value;
    const acao = container.querySelector("#custodia-acao").value;
    const responsavel = container.querySelector("#custodia-responsavel").value.trim();
    const dataEmprestimo = container.querySelector("#custodia-data-emprestimo").value;
    const dataDevolucao = container.querySelector("#custodia-data-devolucao").value;
    const observacoes = container.querySelector("#custodia-observacoes").value.trim();

    const dadosAtualizacao = {
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user.email
    };

    // Define os dados baseado na ação
    switch (acao) {
      case 'emprestar':
        dadosAtualizacao.statusCustodia = 'Emprestado';
        dadosAtualizacao.responsavelAtual = responsavel;
        dadosAtualizacao.localizacaoFisica = responsavel.includes('Professor') ? 'Com Professor' : 'Com Aluno';
        if (dataEmprestimo) {
          dadosAtualizacao.dataEmprestimo = new Date(dataEmprestimo + 'T00:00:00');
        }
        if (dataDevolucao) {
          dadosAtualizacao.dataDevolucaoPrevista = new Date(dataDevolucao + 'T00:00:00');
        }
        break;
        
      case 'devolver':
        dadosAtualizacao.statusCustodia = 'Disponível';
        dadosAtualizacao.responsavelAtual = null;
        dadosAtualizacao.localizacaoFisica = 'Depósito';
        dadosAtualizacao.dataEmprestimo = null;
        dadosAtualizacao.dataDevolucaoPrevista = null;
        dadosAtualizacao.dataDevolucaoReal = serverTimestamp();
        break;
        
      case 'manutencao':
        dadosAtualizacao.statusCustodia = 'Em Manutenção';
        dadosAtualizacao.responsavelAtual = null;
        dadosAtualizacao.localizacaoFisica = 'Manutenção';
        break;
        
      case 'disponibilizar':
        dadosAtualizacao.statusCustodia = 'Disponível';
        dadosAtualizacao.responsavelAtual = null;
        dadosAtualizacao.localizacaoFisica = 'Depósito';
        break;
    }

    if (observacoes) {
      dadosAtualizacao.ultimaObservacao = observacoes;
    }

    await updateDoc(doc(db, "inventario", instrumentoId), dadosAtualizacao);
    
    const acaoTexto = {
      'emprestar': 'emprestado',
      'devolver': 'devolvido',
      'manutencao': 'enviado para manutenção',
      'disponibilizar': 'marcado como disponível'
    };
    
    mostrarToast(container, `Instrumento ${acaoTexto[acao]} com sucesso!`);
    fecharModalCustodia(container);
    carregarDadosIniciais(container);

  } catch (error) {
    console.error("❌ Erro ao atualizar custódia:", error);
    alert("Falha ao atualizar a custódia. Tente novamente.");
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Confirmar Ação";
  }
}

// Funções globais para os botões da tabela
window.gerenciarCustodia = function(id) {
  const container = document.querySelector(".inventario-container").parentElement;
  const instrumento = todosOsInstrumentos.find(i => i.id === id);
  
  if (!instrumento) {
    alert("Instrumento não encontrado.");
    return;
  }

  const modal = container.querySelector("#modal-custodia");
  const titulo = container.querySelector("#modal-custodia-titulo");
  const instrumentoInfo = container.querySelector("#modal-custodia-instrumento");
  
  titulo.textContent = "Gerenciar Custódia";
  instrumentoInfo.textContent = `${instrumento.nomeInstrumento} (${instrumento.numeroInstrumento})`;
  
  container.querySelector("#custodia-instrumento-id").value = id;
  container.querySelector("#form-custodia").reset();
  
  // Ajusta campos iniciais
  ajustarCamposCustodia(container);
  
  modal.style.display = "flex";
};

window.editarInstrumento = async function(id) {
  const container = document.querySelector(".inventario-container").parentElement;
  const instrumento = todosOsInstrumentos.find(i => i.id === id);
  
  if (!instrumento) {
    alert("Instrumento não encontrado.");
    return;
  }

  instrumentoEditando = id;
  const modal = container.querySelector("#modal-instrumento");
  const titulo = container.querySelector("#modal-titulo");
  
  titulo.textContent = "Editar Instrumento";
  
  // Preenche o formulário com os dados do instrumento
  container.querySelector("#numero-instrumento").value = instrumento.numeroInstrumento;
  container.querySelector("#nome-instrumento").value = instrumento.nomeInstrumento;
  container.querySelector("#tipo-instrumento").value = instrumento.tipo;
  container.querySelector("#estado-fisico-instrumento").value = instrumento.estadoFisico || 'Bom';
  container.querySelector("#status-custodia-instrumento").value = instrumento.statusCustodia || 'Disponível';
  container.querySelector("#responsavel-instrumento").value = instrumento.responsavelAtual || '';
  container.querySelector("#localizacao-instrumento").value = instrumento.localizacaoFisica || '';
  container.querySelector("#marca-instrumento").value = instrumento.marca || '';
  container.querySelector("#observacoes-instrumento").value = instrumento.observacoes || '';
  
  // Preenche datas se existirem
  if (instrumento.dataEmprestimo) {
    const dataEmp = new Date(instrumento.dataEmprestimo.seconds * 1000);
    container.querySelector("#data-emprestimo").value = dataEmp.toISOString().split('T')[0];
  }
  if (instrumento.dataDevolucaoPrevista) {
    const dataDev = new Date(instrumento.dataDevolucaoPrevista.seconds * 1000);
    container.querySelector("#data-devolucao-prevista").value = dataDev.toISOString().split('T')[0];
  }
  
  modal.style.display = "flex";
};

window.excluirInstrumento = async function(id) {
  const instrumento = todosOsInstrumentos.find(i => i.id === id);
  
  if (!instrumento) {
    alert("Instrumento não encontrado.");
    return;
  }

  const confirmacao = confirm(
    `Tem certeza que deseja excluir o instrumento "${instrumento.nomeInstrumento}" (${instrumento.numeroInstrumento})?\n\nEsta ação não pode ser desfeita.`
  );

  if (!confirmacao) return;

  try {
    await deleteDoc(doc(db, "inventario", id));
    const container = document.querySelector(".inventario-container").parentElement;
    mostrarToast(container, "Instrumento excluído com sucesso!");
    carregarDadosIniciais(container);
  } catch (error) {
    console.error("❌ Erro ao excluir instrumento:", error);
    alert("Falha ao excluir o instrumento. Tente novamente.");
  }
};

function mostrarToast(container, mensagem) {
  const toast = container.querySelector("#toast-inventario");
  const toastMensagem = container.querySelector("#toast-mensagem");
  
  toastMensagem.textContent = mensagem;
  toast.className = "toast-notification visible";
  
  setTimeout(() => {
    toast.className = "toast-notification hidden";
  }, 4000);
}

