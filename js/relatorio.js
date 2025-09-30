// js/relatorio.js — Sistema de Relatórios COM FILTRO DE DISTRITO + Impressão simples (NOMES EM CAPSLOCK)
import { db, auth } from './firebase-config.js';
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dadosRelatorio = {
  frequencias: [],    // registros por data
  planosDeAula: [],   // planos do mês
  matriculas: [],     // alunos matriculados na oficina (com _nomeCaps)
  contexto: {         // usado para título da impressão
    oficina: "",
    mes: 0,
    ano: 0,
    distrito: "",
    professor: "",
    local: "",
  }
};

/* =======================
   Normalização — CAIXA ALTA
   ======================= */
function upperize(str){
  return String(str || "").normalize("NFC").toLocaleUpperCase("pt-BR");
}

// ========= INIT =========
export function init(container, userRole = 'admin') {
  console.log("✅ Relatórios (nomes em CAPSLOCK) + Filtro de Distrito + Impressão");
  const btnGerarRelatorio = container.querySelector("#btn-gerar-relatorio");
  const btnExportarPdf    = container.querySelector("#btn-exportar-pdf");
  const btnExportarExcel  = container.querySelector("#btn-exportar-excel");
  const btnImprimir       = container.querySelector("#btn-imprimir");

  btnGerarRelatorio?.addEventListener("click", () => gerarRelatorio(container));
  btnExportarPdf?.addEventListener("click", () => exportarPDF(container));
  btnExportarExcel?.addEventListener("click", () => exportarExcel(container));
  btnImprimir?.addEventListener("click", () => imprimirRelatorio(container));

  const selectOficina = container.querySelector("#oficina-relatorio");
  selectOficina?.addEventListener("change", () => handleOficinaChange(container));

  carregarDadosIniciais(container);
}

// ========= UI AUX =========
function handleOficinaChange(container) {
  const selectOficina = container.querySelector("#oficina-relatorio");
  const filtroDistritoContainer = container.querySelector("#filtro-distrito-relatorio");
  const selectDistrito = container.querySelector("#distrito-relatorio");

  const oficina = selectOficina.value;
  if (oficina === "Percussão/Fanfarra") {
    filtroDistritoContainer.style.display = "block";
  } else {
    filtroDistritoContainer.style.display = "none";
    selectDistrito.value = "";
  }
}

// Mapeia bairro -> distrito
function determinarDistrito(bairroAluno) {
  const distritosEspecificos = ["Macaoca", "Cajazeiras", "União", "Cacimba Nova", "Paus Branco"];
  if (distritosEspecificos.includes(bairroAluno)) return bairroAluno;
  return "Sede";
}

// remove "/"
function sanitizarNomeOficina(nomeOficina) {
  return nomeOficina.replace(/\//g, '_');
}

// ========= CARREGAR OFICINAS =========
async function carregarDadosIniciais(container) {
  const selectOficina = container.querySelector("#oficina-relatorio");
  const statusCarregamento = container.querySelector("#status-carregamento");

  try {
    statusCarregamento.textContent = "Carregando oficinas...";

    const snapshot = await getDocs(collection(db, "matriculas"));
    const oficinasSet = new Set();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.oficinas)) {
        data.oficinas.forEach(o => oficinasSet.add(o));
      }
    });

    const oficinasOrdenadas = Array.from(oficinasSet).sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"}));
    selectOficina.innerHTML = '<option value="">Selecione uma oficina</option>';
    oficinasOrdenadas.forEach(oficina => {
      const opt = document.createElement("option");
      opt.value = oficina;
      opt.textContent = oficina;
      selectOficina.appendChild(opt);
    });

    statusCarregamento.textContent = "Pronto para gerar relatório";
  } catch (err) {
    console.error("Erro ao carregar oficinas:", err);
    statusCarregamento.textContent = "Erro ao carregar dados";
    mostrarToast(container, "Erro ao carregar oficinas.", "erro");
  }
}

// ========= GERAR RELATÓRIO =========
async function gerarRelatorio(container) {
  const selectOficina = container.querySelector("#oficina-relatorio");
  const selectMes     = container.querySelector("#mes-relatorio");
  const selectAno     = container.querySelector("#ano-relatorio");
  const selectDistrito= container.querySelector("#distrito-relatorio");
  const btnGerar      = container.querySelector("#btn-gerar-relatorio");
  const areaResultados= container.querySelector("#area-resultados");
  const status        = container.querySelector("#status-carregamento");

  const oficina  = selectOficina.value;
  const mes      = parseInt(selectMes.value, 10);
  const ano      = parseInt(selectAno.value, 10);
  const distrito = selectDistrito.value;

  if (!oficina) return mostrarToast(container, "Selecione uma oficina", "erro");
  if (oficina === "Percussão/Fanfarra" && !distrito) {
    return mostrarToast(container, "Selecione um distrito para Percussão/Fanfarra", "erro");
  }

  try {
    btnGerar.disabled = true;
    btnGerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    status.textContent = "Gerando relatório...";

    dadosRelatorio.contexto = { oficina, mes, ano, distrito, professor: "", local: distrito || "Sede" };

    await buscarDadosRelatorio(oficina, mes, ano, distrito);
    renderizarRelatorio(container, oficina, mes, ano, distrito);

    areaResultados.classList.add("visible");
    habilitarBotoesExportacao(container, true);
    status.textContent = "Relatório gerado com sucesso!";
    mostrarToast(container, "Relatório gerado com sucesso!");
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    status.textContent = "Erro ao gerar relatório";
    mostrarToast(container, "Erro ao gerar relatório", "erro");
  } finally {
    btnGerar.disabled = false;
    btnGerar.innerHTML = '<i class="fas fa-chart-line"></i> Gerar Relatório';
  }
}

// ========= BUSCAS NO FIRESTORE =========
async function buscarDadosRelatorio(oficina, mes, ano, distrito = null) {
  // 1) Matriculas
  const matriculasSnap = await getDocs(collection(db, "matriculas"));
  let matriculas = matriculasSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(m => m.oficinas?.includes(oficina));

  if (oficina === "Percussão/Fanfarra" && distrito) {
    matriculas = matriculas.filter(m => {
      const bairro = m.bairro || m.escolaBairro || ""; // ajuste conforme seus campos
      return determinarDistrito(bairro) === distrito;
    });
  }

  // Deriva nome em CAPS e ordena por CAPS
  matriculas = matriculas.map(m => ({ ...m, _nomeCaps: upperize(m.nome || "") }));
  matriculas.sort((a,b) => (a._nomeCaps||"").localeCompare(b._nomeCaps||"", "pt-BR", {sensitivity:"base"}));
  dadosRelatorio.matriculas = matriculas;

  // 2) Frequencias
  await buscarFrequencias(oficina, mes, ano, distrito);

  // 3) Planos de aula
  await buscarPlanosDeAula(oficina, mes, ano, distrito);

  // Capturar professor do plano mais recente (se existir) — em CAPS
  const planoMaisRecente = dadosRelatorio.planosDeAula[0];
  if (planoMaisRecente) {
    const prof = planoMaisRecente.professor || planoMaisRecente.nomeProfessor || "";
    dadosRelatorio.contexto.professor = upperize(prof);
  }
}

async function buscarFrequencias(oficina, mes, ano, distrito = null) {
  const frequenciasSnap = await getDocs(collection(db, "frequencias"));
  const lista = [];
  const oficinaSan = sanitizarNomeOficina(oficina);

  frequenciasSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const docId = docSnap.id;

    // Verifica oficina
    let pertenceAOficina = false;
    if (docId.includes(oficinaSan)) pertenceAOficina = true;
    if (data.oficina === oficina) pertenceAOficina = true;

    // Verifica período
    let pertenceAoPeriodo = false;
    const m = docId.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, Y, M] = m;
      if (parseInt(Y,10)===ano && parseInt(M,10)===mes) pertenceAoPeriodo = true;
    }
    if (data.data) {
      const d = data.data.toDate ? data.data.toDate() : new Date(data.data);
      if (d.getFullYear()===ano && (d.getMonth()+1)===mes) pertenceAoPeriodo = true;
    }

    // Verifica distrito se necessário
    let pertenceAoDistrito = true;
    if (oficina === "Percussão/Fanfarra" && distrito) {
      pertenceAoDistrito = !!(docId.includes(`_${distrito}`) || data.distrito === distrito);
    }

    if (pertenceAOficina && pertenceAoPeriodo && pertenceAoDistrito) {
      // Normaliza a data do registro
      let dataAula = null;
      if (data.data) dataAula = data.data.toDate ? data.data.toDate() : new Date(data.data);
      else if (m) dataAula = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);

      lista.push({
        id: docId,
        dataAula,
        ...data
      });
    }
  });

  // Ordena por data
  lista.sort((a,b) => (a.dataAula?.getTime()||0) - (b.dataAula?.getTime()||0));
  dadosRelatorio.frequencias = lista;
}

async function buscarPlanosDeAula(oficina, mes, ano, distrito = null) {
  const planosSnap = await getDocs(collection(db, "planosDeAula"));
  const planos = [];

  planosSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.oficina !== oficina) return;

    let noPeriodo = false;
    if (data.data) {
      const d = data.data.toDate ? data.data.toDate() : new Date(data.data);
      if (d.getFullYear()===ano && (d.getMonth()+1)===mes) noPeriodo = true;
    }

    let noDistrito = true;
    if (oficina === "Percussão/Fanfarra" && distrito && data.distrito) {
      noDistrito = (data.distrito === distrito);
    }

    if (noPeriodo && noDistrito) {
      planos.push({ id: docSnap.id, ...data });
    }
  });

  planos.sort((a,b) => {
    const A = a.data ? (a.data.toDate ? a.data.toDate() : new Date(a.data)) : new Date(0);
    const B = b.data ? (b.data.toDate ? b.data.toDate() : new Date(b.data)) : new Date(0);
    return B - A;
  });

  dadosRelatorio.planosDeAula = planos;
}

// ========= RENDER NA TELA =========
function renderizarRelatorio(container, oficina, mes, ano, distrito = null) {
  console.log("🎨 Renderizando relatório (NOMES EM CAPS)...");
  atualizarEstatisticasGerais(container);
  renderizarTabelaFrequencia(container);
  renderizarListaAulas(container);
}

function atualizarEstatisticasGerais(container) {
  const totalAlunos = container.querySelector("#total-alunos");
  const totalAulas = container.querySelector("#total-aulas");
  const frequenciaMedia = container.querySelector("#frequencia-media");

  totalAlunos.textContent = dadosRelatorio.matriculas.length;
  totalAulas.textContent = dadosRelatorio.frequencias.length;

  // Calcula frequência média
  let totalPresencas = 0;
  let totalRegistros = 0;

  dadosRelatorio.frequencias.forEach(freq => {
    // Array de alunos
    if (Array.isArray(freq.alunos)) {
      freq.alunos.forEach(aluno => {
        if (aluno?.status != null) {
          totalRegistros++;
          if (String(aluno.status).toLowerCase() === 'presente' || String(aluno.status).toLowerCase() === 'p' || aluno.status === true) {
            totalPresencas++;
          }
        }
      });
    }
    // Objeto presencas
    else if (freq.presencas && typeof freq.presencas === 'object') {
      Object.values(freq.presencas).forEach(presente => {
        totalRegistros++;
        const s = String(presente).toLowerCase();
        if (presente === true || s === 'presente' || s === 'p') totalPresencas++;
      });
    }
    // Status direto
    else if (freq.status) {
      totalRegistros++;
      const s = String(freq.status).toLowerCase();
      if (s === 'presente' || s === 'p' || freq.status === true) totalPresencas++;
    }
  });

  const media = totalRegistros > 0 ? (totalPresencas / totalRegistros * 100) : 0;
  frequenciaMedia.textContent = `${media.toFixed(1)}%`;
}

function renderizarTabelaFrequencia(container) {
  const corpo = container.querySelector("#corpo-tabela-frequencia");

  if (!dadosRelatorio.matriculas.length) {
    corpo.innerHTML = '<tr><td colspan="4" class="sem-dados">Nenhum aluno matriculado nesta oficina</td></tr>';
    return;
  }

  if (!dadosRelatorio.frequencias.length) {
    corpo.innerHTML = '<tr><td colspan="4" class="sem-dados">Sem registros de frequência para este período</td></tr>';
    return;
  }

  // Inicializa estatísticas para cada aluno matriculado (chave = nome CAPS)
  const estatisticas = {};
  dadosRelatorio.matriculas.forEach(matricula => {
    const key = upperize(matricula.nome || "");
    estatisticas[key] = { presencas: 0, faltas: 0, total: 0 };
  });

  // Processa cada registro de frequência
  dadosRelatorio.frequencias.forEach(freq => {
    // Array de alunos
    if (Array.isArray(freq.alunos)) {
      freq.alunos.forEach(aluno => {
        const key = upperize(aluno?.nome?.trim() || "");
        if (key && estatisticas[key]) {
          estatisticas[key].total++;
          const s = String(aluno.status || '').toLowerCase();
          if (s === 'presente' || s === 'p' || aluno.status === true) {
            estatisticas[key].presencas++;
          } else {
            estatisticas[key].faltas++;
          }
        }
      });
    }
    // Objeto presencas (chaves são nomes)
    else if (freq.presencas && typeof freq.presencas === 'object') {
      Object.entries(freq.presencas).forEach(([nome, presente]) => {
        const key = upperize(String(nome || '').trim());
        if (estatisticas[key]) {
          estatisticas[key].total++;
          const s = String(presente).toLowerCase();
          if (presente === true || s === 'presente' || s === 'p') {
            estatisticas[key].presencas++;
          } else {
            estatisticas[key].faltas++;
          }
        }
      });
    }
    // Status direto (um aluno por registro)
    else if (freq.alunoNome && freq.status != null) {
      const key = upperize(freq.alunoNome);
      if (estatisticas[key]) {
        estatisticas[key].total++;
        const s = String(freq.status).toLowerCase();
        if (s === 'presente' || s === 'p' || freq.status === true) {
          estatisticas[key].presencas++;
        } else {
          estatisticas[key].faltas++;
        }
      }
    }
  });

  // Renderiza a tabela (ordenada por nome CAPS)
  const entriesOrdenadas = Object.entries(estatisticas)
    .sort((a,b)=>a[0].localeCompare(b[0], "pt-BR", {sensitivity:"base"}));

  corpo.innerHTML = "";
  entriesOrdenadas.forEach(([nomeCaps, stats]) => {
    const percentual = stats.total > 0 ? (stats.presencas / stats.total) * 100 : 0;
    const classeFrequencia = percentual >= 80 ? "frequencia-alta" : 
                           percentual >= 60 ? "frequencia-media" : "frequencia-baixa";
    
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${nomeCaps}</td>
      <td>${stats.presencas}</td>
      <td>${stats.faltas}</td>
      <td class="${classeFrequencia}">${percentual.toFixed(1)}%</td>
    `;
    corpo.appendChild(linha);
  });

  console.log("✅ Tabela de frequência renderizada (nomes em CAPS)");
}

function renderizarListaAulas(container) {
  const lista = container.querySelector("#lista-aulas");
  
  if (!dadosRelatorio.planosDeAula.length) {
    lista.innerHTML = '<p class="sem-dados">Nenhum plano de aula registrado para esta oficina no período selecionado.</p>';
    return;
  }

  lista.innerHTML = "";
  dadosRelatorio.planosDeAula.forEach(plano => {
    const dataAula = plano.data ? 
      (plano.data.toDate ? plano.data.toDate() : new Date(plano.data)) : 
      new Date();

    const profCaps = upperize(plano.professor || plano.nomeProfessor || "Professor não informado");
    
    const div = document.createElement("div");
    div.className = "aula-item";
    div.innerHTML = `
      <div class="aula-titulo">${plano.titulo || "Aula sem título"}</div>
      <div class="aula-data">${dataAula.toLocaleDateString('pt-BR')} - ${profCaps}</div>
    `;
    lista.appendChild(div);
  });

  console.log("✅ Lista de aulas renderizada (nomes em CAPS)");
}

// ========= EXPORTAÇÕES =========
function exportarPDF(container) {
  mostrarToast(container, "Funcionalidade de exportação PDF em desenvolvimento.");
}

function exportarExcel(container) {
  mostrarToast(container, "Funcionalidade de exportação Excel em desenvolvimento.");
}

// ========= IMPRESSÃO (IMPRIME A TABELA QUE JÁ ESTÁ NA TELA) =========
function imprimirRelatorio(container) {
  const tabela = container.querySelector('#tabela-frequencia-individual');
  if (!tabela) {
    mostrarToast(container, "Tabela não encontrada para impressão.", "erro");
    return;
  }

  // Clona a tabela exibida
  const tabelaClone = tabela.cloneNode(true);

  // Contexto (só para um título simples na impressão)
  const ctx = dadosRelatorio?.contexto || {};
  const nomeMes = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][ctx.mes || 0] || "";
  const tituloHTML = `
    <div style="font-family:Poppins,system-ui,sans-serif;margin:0 0 12px 0;">
      <div style="font-weight:800;font-size:18px;">Relatório de Frequência</div>
      <div style="font-size:12px;color:#444;">
        ${ctx.oficina ? `<strong>Oficina:</strong> ${ctx.oficina} &nbsp;` : ""}
        ${ctx.mes ? `<strong>Mês/Ano:</strong> ${nomeMes}/${ctx.ano||""}` : ""}
        ${ctx.professor ? ` &nbsp; <strong>Professor(a):</strong> ${upperize(ctx.professor)}` : ""}
      </div>
    </div>
  `;

  // Cria overlay temporário
  const overlay = document.createElement('div');
  overlay.id = 'print-only';
  overlay.innerHTML = tituloHTML;

  const wrap = document.createElement('div');
  wrap.className = 'tabela-wrapper';
  wrap.appendChild(tabelaClone);
  overlay.appendChild(wrap);

  // Estilos para imprimir apenas o overlay (e garantir thead repetindo)
  const style = document.createElement('style');
  style.id = 'print-only-style';
  style.textContent = `
    @page { size: A4 portrait; margin: 14mm; }
    @media print {
      body > *:not(#print-only){ display: none !important; }
      #print-only { display: block !important; color:#000; }
      #print-only .tabela-wrapper{ overflow: visible !important; }
      #print-only thead { display: table-header-group; }
      #print-only tfoot { display: table-footer-group; }
      #print-only tr { page-break-inside: avoid; }
    }
    @media screen {
      #print-only{
        position: fixed; inset: 0; background: #fff; padding: 16px;
        z-index: 9999; overflow: auto; box-shadow: 0 0 0 9999px rgba(0,0,0,.4);
      }
    }
  `;

  // Injeta e imprime
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  const cleanup = () => {
    overlay.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  // fallback caso afterprint não dispare
  setTimeout(() => { try { cleanup(); } catch(e){} }, 1200);
}


// ========= TOAST =========
function mostrarToast(container, mensagem, tipo = "sucesso") {
  const toast = container.querySelector("#toast-relatorio") || document.getElementById("toast-relatorio");
  const msg = container.querySelector("#toast-mensagem-relatorio") || document.getElementById("toast-mensagem-relatorio");
  if (!toast || !msg) return;
  msg.textContent = mensagem;
  toast.className = `toast-notification visible ${tipo}`;
  setTimeout(() => {
    toast.className = "toast-notification hidden";
  }, 4000);
}

// ========= UTILS =========
function habilitarBotoesExportacao(container, habilitar) {
  ["#btn-exportar-pdf", "#btn-exportar-excel", "#btn-imprimir"].forEach(sel => {
    const btn = container.querySelector(sel);
    if (btn) btn.disabled = !habilitar;
  });
}

// ========= AUTO-INIT (garante que os eventos existam sem alterar visual) =========
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.relatorio-container');
  if (container) init(container);
});

// Exporta dadosRelatorio se outro módulo quiser ler
export { dadosRelatorio };
