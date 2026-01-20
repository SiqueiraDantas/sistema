// js/frequencia_adm.js (VERSÃO COM IMPRESSÃO SECULT INTEGRADA) ✅ multi-banco
import { getDB } from './firebase-config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mostrarNotificacao } from './notificacao.js';

// --- Variáveis de escopo do módulo ---
let todosOsRegistrosAgrupados = [];
let corpoTabela, filtroData, filtroOficina, filtroProfessor;
let modalVisualizar, modalTitulo, modalSubtitulo, modalConteudo, modalFechar;

/**
 * Converte um Timestamp do Firebase ou string de data para DD/MM/YYYY.
 */
function formatarData(dataFirebase) {
  if (!dataFirebase) return "N/A";

  // Timestamp Firestore (v10 geralmente vem com toDate)
  if (dataFirebase.toDate) {
    const data = dataFirebase.toDate();
    return data.toLocaleDateString('pt-BR');
  }

  // Timestamp "cru" (seconds)
  if (dataFirebase.seconds) {
    const data = new Date(dataFirebase.seconds * 1000);
    return data.toLocaleDateString('pt-BR');
  }

  // string antiga
  if (typeof dataFirebase === 'string') return dataFirebase;

  return "Data inválida";
}

function converterParaDate(dataFirebase) {
  if (!dataFirebase) return null;

  if (dataFirebase.toDate) return dataFirebase.toDate();

  if (dataFirebase.seconds) return new Date(dataFirebase.seconds * 1000);

  if (typeof dataFirebase === 'string') {
    const partes = dataFirebase.split('/');
    if (partes.length === 3) return new Date(partes[2], partes[1] - 1, partes[0]);
  }

  return null;
}

/**
 * Imprime frequência no padrão SECULT
 */
function imprimirFrequenciaSECULT(frequenciaId) {
  const registro = todosOsRegistrosAgrupados.find(r => r.id === frequenciaId);
  if (!registro) {
    mostrarNotificacao("Erro: Registro não encontrado para impressão.", "erro");
    return;
  }

  const janelaImpressao = window.open('', '_blank', 'width=800,height=600');

  const [dia, mes, ano] = String(registro.dataFormatada || '').split('/');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesExtenso = meses[(parseInt(mes, 10) || 1) - 1] || '';
  const mesAno = `${mesExtenso}/${ano || ''}`;

  const alunosPresentes = (registro.alunos || []).filter(a => String(a.status || '').toLowerCase() === 'presente');

  const htmlImpressao = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frequência de Alunos - ${registro.oficina || ''}</title>
  <style>
    @page { size: A4; margin: 1cm; }
    *{ margin:0; padding:0; box-sizing:border-box; }
    body{ font-family: Arial, sans-serif; font-size:12px; line-height:1.2; color:#000; }
    .container{ width:100%; max-width:21cm; margin:0 auto; padding:10px; }
    .header{ text-align:center; margin-bottom:20px; }
    .logo-placeholder{
      border:2px dashed #ccc; height:80px; display:flex; align-items:center; justify-content:center;
      margin-bottom:15px; background:#f9f9f9; text-align:center; padding:8px;
    }
    .titulo{ font-size:18px; font-weight:bold; margin-bottom:20px; }
    .info-section{ margin-bottom:15px; }
    .info-row{ display:flex; margin-bottom:8px; align-items:center; }
    .info-label{ font-weight:bold; margin-right:10px; min-width:120px; }
    .info-value{ border-bottom:1px solid #000; flex:1; padding:2px 5px; min-height:20px; }
    .info-row-split{ display:flex; margin-bottom:8px; }
    .info-half{ flex:1; display:flex; align-items:center; }
    .info-half:first-child{ margin-right:20px; }
    .modalidade-options{ display:flex; gap:15px; align-items:center; }
    .modalidade-option{ display:flex; align-items:center; gap:5px; }
    .checkbox{ width:12px; height:12px; border:1px solid #000; display:inline-block; }
    .checkbox.checked::after{ content:'X'; display:block; text-align:center; line-height:10px; font-size:10px; }
    .tabela-frequencia{ width:100%; border-collapse:collapse; margin:20px 0; }
    .tabela-frequencia th, .tabela-frequencia td{ border:1px solid #000; padding:8px 4px; text-align:left; vertical-align:top; }
    .tabela-frequencia th{ background:#f0f0f0; font-weight:bold; text-align:center; }
    .col-numero{ width:5%; text-align:center; }
    .col-nome{ width:30%; }
    .col-mes-ano{ width:15%; text-align:center; }
    .col-idade{ width:10%; text-align:center; }
    .col-conteudo{ width:40%; }
    .assinaturas{ margin-top:40px; display:flex; justify-content:space-between; }
    .assinatura-box{ width:45%; text-align:center; }
    .linha-assinatura{ border-bottom:1px solid #000; height:40px; margin-bottom:5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-placeholder">
        LOGOMARCA DO PROJETO<br/>
        <small>(clicar 2x para editar)</small>
      </div>
      <div class="titulo">FREQUÊNCIA DE ALUNOS</div>
    </div>

    <div class="info-section">
      <div class="info-row">
        <span class="info-label">INSTITUIÇÃO:</span>
        <span class="info-value">ESCOLA DE MÚSICA MADE IN SERTÃO</span>
      </div>

      <div class="info-row">
        <span class="info-label">PROJETO:</span>
        <span class="info-value">MIS EDUCA</span>
      </div>

      <div class="info-row-split">
        <div class="info-half">
          <span class="info-label">CURSO:</span>
          <span class="info-value">${registro.oficina || ''}</span>
        </div>
        <div class="info-half">
          <span class="info-label">CARGA HORÁRIA:</span>
          <span class="info-value">4h semanais</span>
        </div>
      </div>

      <div class="info-row-split">
        <div class="info-half">
          <span class="info-label">LINGUAGEM ARTÍSTICA:</span>
          <span class="info-value">Música</span>
        </div>
        <div class="info-half">
          <span class="info-label">HORÁRIO:</span>
          <span class="info-value">Conforme cronograma</span>
        </div>
      </div>

      <div class="info-row">
        <span class="info-label">MODALIDADE:</span>
        <div class="modalidade-options">
          <div class="modalidade-option"><span class="checkbox checked"></span><span>PRESENCIAL</span></div>
          <div class="modalidade-option"><span class="checkbox"></span><span>ON-LINE</span></div>
          <div class="modalidade-option"><span class="checkbox"></span><span>HÍBRIDO</span></div>
        </div>
      </div>

      <div class="info-row">
        <span class="info-label">PROFESSOR:</span>
        <span class="info-value">${registro.professor || ''}</span>
      </div>
    </div>

    <table class="tabela-frequencia">
      <thead>
        <tr>
          <th class="col-numero">Nº</th>
          <th class="col-nome">NOME</th>
          <th class="col-mes-ano">MÊS/ANO</th>
          <th class="col-idade">IDADE</th>
          <th class="col-conteudo">CONTEÚDO PROGRAMÁTICO</th>
        </tr>
      </thead>
      <tbody>
        ${alunosPresentes.map((aluno, index) => `
          <tr>
            <td class="col-numero">${index + 1}</td>
            <td class="col-nome">${aluno.nome || ''}</td>
            <td class="col-mes-ano">${mesAno}</td>
            <td class="col-idade">-</td>
            <td class="col-conteudo">Prática instrumental e teoria musical</td>
          </tr>
        `).join('')}

        ${Array.from({length: Math.max(0, 15 - alunosPresentes.length)}, (_, idx) => `
          <tr>
            <td class="col-numero">${alunosPresentes.length + idx + 1}</td>
            <td class="col-nome">&nbsp;</td>
            <td class="col-mes-ano">&nbsp;</td>
            <td class="col-idade">&nbsp;</td>
            <td class="col-conteudo">&nbsp;</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="assinaturas">
      <div class="assinatura-box">
        <div class="linha-assinatura"></div>
        <strong>ASSINATURA DO PROFESSOR(A)</strong>
      </div>
      <div class="assinatura-box">
        <div class="linha-assinatura"></div>
        <strong>ASSINATURA DO COORDENADOR(A) PEDAGÓGICO</strong>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 400);
    };
  </script>
</body>
</html>`;

  janelaImpressao.document.write(htmlImpressao);
  janelaImpressao.document.close();
}

// =========================
// INIT DO MÓDULO
// =========================
export function init() {
  corpoTabela = document.getElementById("corpo-tabela-frequencias-admin");
  filtroData = document.getElementById("filtro-frequencia-data");
  filtroOficina = document.getElementById("filtro-frequencia-oficina");
  filtroProfessor = document.getElementById("filtro-frequencia-professor");

  modalVisualizar = document.getElementById("modal-visualizar-frequencia");
  modalTitulo = document.getElementById("modal-frequencia-titulo");
  modalSubtitulo = document.getElementById("modal-frequencia-subtitulo");
  modalConteudo = document.getElementById("modal-frequencia-conteudo");
  modalFechar = document.getElementById("modal-frequencia-fechar");

  if (!corpoTabela || !modalVisualizar) {
    console.error("ERRO CRÍTICO: Tabela ou Modal de frequência não encontrados.");
    return;
  }

  // ✅ força habilitar selects (muito útil quando CSS/HTML deixa disabled)
  if (filtroOficina) filtroOficina.disabled = false;
  if (filtroProfessor) filtroProfessor.disabled = false;

  adicionarEventListeners();

  // Estado inicial dos filtros
  if (filtroOficina) filtroOficina.innerHTML = `<option value="">Carregando...</option>`;
  if (filtroProfessor) filtroProfessor.value = '';

  carregarFrequencias();
}

async function carregarFrequencias() {
  corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Carregando...</td></tr>`;

  try {
    const db = getDB();
    const querySnapshot = await getDocs(collection(db, "frequencias"));
    const registrosAgrupados = {};

    querySnapshot.forEach(docSnap => {
      const dados = docSnap.data() || {};
      const dataFormatada = formatarData(dados.data);
      const oficina = dados.oficina;

      if (dataFormatada !== "Data inválida" && oficina) {
        const chave = `${dataFormatada}_${oficina}`;
        if (!registrosAgrupados[chave]) {
          registrosAgrupados[chave] = {
            id: chave,
            data: dados.data,
            dataFormatada,
            oficina,
            professor: dados.professor || "N/A",
            alunos: [],
            docsIds: []
          };
        }

        if (Array.isArray(dados.alunos)) {
          registrosAgrupados[chave].alunos.push(...dados.alunos);
        }

        registrosAgrupados[chave].docsIds.push(docSnap.id);
      }
    });

    todosOsRegistrosAgrupados = Object.values(registrosAgrupados);

    // ordena por data desc
    todosOsRegistrosAgrupados.sort((a, b) => {
      const da = converterParaDate(a.data);
      const dbb = converterParaDate(b.data);
      return (dbb ? dbb.getTime() : 0) - (da ? da.getTime() : 0);
    });

    renderizarTabela(todosOsRegistrosAgrupados);
    carregarOpcoesFiltros(todosOsRegistrosAgrupados);

  } catch (error) {
    console.error("Erro ao buscar e agrupar frequências:", error);
    corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Erro ao carregar.</td></tr>`;
  }
}

function renderizarTabela(registros) {
  corpoTabela.innerHTML = "";

  if (!registros || registros.length === 0) {
    corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma aula com frequência registrada.</td></tr>`;
    return;
  }

  registros.forEach(reg => {
    const alunos = Array.isArray(reg.alunos) ? reg.alunos : [];
    const presentes = alunos.filter(a => String(a.status || '').toLowerCase() === 'presente').length;
    const faltas = alunos.filter(a => String(a.status || '').toLowerCase() === 'falta').length;

    const tr = document.createElement("tr");
    tr.dataset.frequenciaId = reg.id;
    tr.innerHTML = `
      <td>${reg.dataFormatada || ''}</td>
      <td>${reg.oficina || ''}</td>
      <td>${reg.professor || ''}</td>
      <td><span style="color: var(--verde-sucesso); font-weight: bold;">${presentes}</span></td>
      <td><span style="color: var(--vermelho-perigo); font-weight: bold;">${faltas}</span></td>
      <td class="actions">
        <a href="#" class="acao-visualizar" title="Visualizar Detalhes"><i class="fas fa-eye"></i></a>
        <a href="#" class="acao-editar" title="Editar Frequência"><i class="fas fa-edit"></i></a>
        <a href="#" class="acao-excluir" title="Excluir Registro"><i class="fas fa-trash"></i></a>
        <a href="#" class="acao-imprimir" title="Imprimir no Padrão SECULT"><i class="fas fa-print"></i></a>
      </td>
    `;
    corpoTabela.appendChild(tr);
  });
}

function carregarOpcoesFiltros(registros) {
  // ✅ OFICINAS
  const oficinas = [...new Set((registros || []).map(r => r.oficina).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  if (filtroOficina) {
    filtroOficina.disabled = false;
    filtroOficina.innerHTML = `<option value="">Todas</option>` + oficinas.map(o => `<option value="${o}">${o}</option>`).join('');
    console.log("✅ Filtro de oficinas carregado:", oficinas.length);
  }

  // ✅ PROFESSORES (opcional, mas ajuda muito)
  const profs = [...new Set((registros || []).map(r => r.professor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  // se for input, mantém; se for select, você pode trocar no HTML depois
  // aqui só garante que não esteja travado
  if (filtroProfessor) {
    filtroProfessor.disabled = false;
    console.log("✅ Lista de professores detectada:", profs.length);
  }
}

function aplicarFiltros() {
  const dataSelecionada = filtroData ? filtroData.value : "";
  const oficinaSelecionada = filtroOficina ? filtroOficina.value : "";
  const professorDigitado = (filtroProfessor ? filtroProfessor.value : "").toLowerCase().trim();

  let dataFiltroFormatada = '';
  if (dataSelecionada) {
    const [ano, mes, dia] = dataSelecionada.split('-');
    dataFiltroFormatada = `${dia}/${mes}/${ano}`;
  }

  const registrosFiltrados = (todosOsRegistrosAgrupados || []).filter(reg => {
    const matchData = !dataSelecionada || reg.dataFormatada === dataFiltroFormatada;
    const matchOficina = !oficinaSelecionada || reg.oficina === oficinaSelecionada;
    const matchProfessor = !professorDigitado || (reg.professor && reg.professor.toLowerCase().includes(professorDigitado));
    return matchData && matchOficina && matchProfessor;
  });

  renderizarTabela(registrosFiltrados);
}

function abrirModalVisualizar(frequenciaId) {
  const registro = todosOsRegistrosAgrupados.find(r => r.id === frequenciaId);
  if (!registro) {
    mostrarNotificacao("Erro: Registro não encontrado.", "erro");
    return;
  }

  modalTitulo.textContent = `Frequência de ${registro.oficina || ''}`;
  modalSubtitulo.textContent = `Data: ${registro.dataFormatada || ''} | Professor: ${registro.professor || ''}`;
  modalConteudo.innerHTML = '<p>Carregando...</p>';
  modalVisualizar.style.display = "flex";

  const alunos = Array.isArray(registro.alunos) ? registro.alunos.slice() : [];
  alunos.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));

  if (alunos.length > 0) {
    let htmlAlunos = '<ul>';
    alunos.forEach(aluno => {
      const st = String(aluno.status || '').toLowerCase();
      const statusClass = st === 'presente' ? 'status-presente' : 'status-falta';
      const statusText = st === 'presente' ? 'Presente' : 'Falta';
      htmlAlunos += `<li>${aluno.nome || ''} - <span class="${statusClass}">${statusText}</span></li>`;
    });
    htmlAlunos += '</ul>';
    modalConteudo.innerHTML = htmlAlunos;
  } else {
    modalConteudo.innerHTML = '<p>Nenhum aluno nesta lista de frequência.</p>';
  }
}

async function excluirRegistroDeAula(frequenciaId) {
  const registro = todosOsRegistrosAgrupados.find(r => r.id === frequenciaId);
  if (!registro) return;

  if (!confirm(`Tem certeza que deseja excluir TODOS os registros de frequência da oficina "${registro.oficina}" do dia ${registro.dataFormatada}?`)) {
    return;
  }

  try {
    const db = getDB();
    for (const docId of (registro.docsIds || [])) {
      await deleteDoc(doc(db, "frequencias", docId));
    }
    mostrarNotificacao("Registros de frequência da aula excluídos com sucesso!", "sucesso");
    carregarFrequencias();
  } catch (error) {
    console.error("Erro ao excluir registros da aula:", error);
    mostrarNotificacao("Ocorreu um erro ao excluir os registros. Verifique as permissões do banco de dados.", "erro");
  }
}

function fecharModalVisualizar() {
  if (modalVisualizar) modalVisualizar.style.display = "none";
}

function adicionarEventListeners() {
  if (filtroData) filtroData.addEventListener('change', aplicarFiltros);
  if (filtroOficina) filtroOficina.addEventListener('change', aplicarFiltros);
  if (filtroProfessor) filtroProfessor.addEventListener('input', aplicarFiltros);

  if (corpoTabela) {
    corpoTabela.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      if (!target) return;
      event.preventDefault();

      const tr = target.closest('tr');
      const frequenciaId = tr ? tr.dataset.frequenciaId : null;
      if (!frequenciaId) return;

      if (target.classList.contains('acao-visualizar')) {
        abrirModalVisualizar(frequenciaId);
      } else if (target.classList.contains('acao-excluir')) {
        excluirRegistroDeAula(frequenciaId);
      } else if (target.classList.contains('acao-editar')) {
        mostrarNotificacao("A função de editar será implementada em breve!", "erro");
      } else if (target.classList.contains('acao-imprimir')) {
        imprimirFrequenciaSECULT(frequenciaId);
      }
    });
  }

  if (modalFechar) modalFechar.addEventListener('click', fecharModalVisualizar);
  if (modalVisualizar) {
    modalVisualizar.addEventListener('click', (e) => {
      if (e.target === modalVisualizar) fecharModalVisualizar();
    });
  }
}
