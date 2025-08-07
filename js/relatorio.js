// js/relatorio.js (Sistema de Relatórios COM FILTRO DE DISTRITO)
import { db, auth } from './firebase-config.js';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dadosRelatorio = {
  frequencias: [],
  planosDeAula: [],
  matriculas: []
};

export function init(container, userRole = 'admin') {
  console.log("✅ Módulo de Relatórios com Filtro de Distrito inicializado!");

  const btnGerarRelatorio = container.querySelector("#btn-gerar-relatorio");
  const selectOficina = container.querySelector("#oficina-relatorio");
  const selectDistrito = container.querySelector("#distrito-relatorio");
  const filtroDistritoContainer = container.querySelector("#filtro-distrito-relatorio");
  const btnExportarPdf = container.querySelector("#btn-exportar-pdf");
  const btnExportarExcel = container.querySelector("#btn-exportar-excel");
  const btnImprimir = container.querySelector("#btn-imprimir");

  btnGerarRelatorio?.addEventListener("click", () => gerarRelatorio(container));
  btnExportarPdf?.addEventListener("click", () => exportarPDF(container));
  btnExportarExcel?.addEventListener("click", () => exportarExcel(container));
  btnImprimir?.addEventListener("click", () => imprimirRelatorio(container));

  // NOVO: Listener para mostrar/esconder filtro de distrito
  selectOficina?.addEventListener("change", () => handleOficinaChange(container));

  carregarDadosIniciais(container);
}

function handleOficinaChange(container) {
  const selectOficina = container.querySelector("#oficina-relatorio");
  const filtroDistritoContainer = container.querySelector("#filtro-distrito-relatorio");
  const selectDistrito = container.querySelector("#distrito-relatorio");
  
  const oficina = selectOficina.value;
  
  if (oficina === "Percussão/Fanfarra") {
    filtroDistritoContainer.style.display = "block";
  } else {
    filtroDistritoContainer.style.display = "none";
    selectDistrito.value = ""; // Limpa a seleção do distrito
  }
}

function determinarDistrito(bairroAluno) {
  // Lista dos distritos específicos
  const distritosEspecificos = ["Macaoca", "Cajazeiras", "União", "Cacimba Nova", "Paus Branco"];
  
  // Se o bairro do aluno for um dos distritos específicos, retorna ele mesmo
  if (distritosEspecificos.includes(bairroAluno)) {
    return bairroAluno;
  }
  
  // Caso contrário, considera como "Sede"
  return "Sede";
}

// Função para sanitizar nome da oficina (remove barras)
function sanitizarNomeOficina(nomeOficina) {
  return nomeOficina.replace(/\//g, '_');
}

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

    const oficinasOrdenadas = Array.from(oficinasSet).sort();
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

async function gerarRelatorio(container) {
  const selectOficina = container.querySelector("#oficina-relatorio");
  const selectMes = container.querySelector("#mes-relatorio");
  const selectAno = container.querySelector("#ano-relatorio");
  const selectDistrito = container.querySelector("#distrito-relatorio");
  const btnGerar = container.querySelector("#btn-gerar-relatorio");
  const areaResultados = container.querySelector("#area-resultados");
  const status = container.querySelector("#status-carregamento");

  const oficina = selectOficina.value;
  const mes = parseInt(selectMes.value);
  const ano = parseInt(selectAno.value);
  const distrito = selectDistrito.value;

  if (!oficina) return mostrarToast(container, "Selecione uma oficina", "erro");

  // Se for Percussão/Fanfarra, distrito é obrigatório
  if (oficina === "Percussão/Fanfarra" && !distrito) {
    return mostrarToast(container, "Selecione um distrito para Percussão/Fanfarra", "erro");
  }

  try {
    btnGerar.disabled = true;
    btnGerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    status.textContent = "Gerando relatório...";

    console.log(`🔍 Buscando dados para: ${oficina}${distrito ? ` (${distrito})` : ''}, ${mes}/${ano}`);
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

async function buscarDadosRelatorio(oficina, mes, ano, distrito = null) {
  console.log(`📊 Iniciando busca de dados para ${oficina}${distrito ? ` (${distrito})` : ''} em ${mes}/${ano}`);
  
  // 1. Buscar matrículas da oficina
  const matriculasSnap = await getDocs(collection(db, "matriculas"));
  let matriculasFiltradas = matriculasSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(m => m.oficinas?.includes(oficina));

  // Se for Percussão/Fanfarra, filtra por distrito
  if (oficina === "Percussão/Fanfarra" && distrito) {
    matriculasFiltradas = matriculasFiltradas.filter(matricula => {
      const bairroAluno = matricula.bairro;
      const distritoDoAluno = determinarDistrito(bairroAluno);
      return distritoDoAluno === distrito;
    });
  }

  dadosRelatorio.matriculas = matriculasFiltradas;
  console.log(`👥 Encontradas ${dadosRelatorio.matriculas.length} matrículas para ${oficina}${distrito ? ` (${distrito})` : ''}`);

  // 2. Buscar frequências
  await buscarFrequencias(oficina, mes, ano, distrito);

  // 3. Buscar planos de aula
  await buscarPlanosDeAula(oficina, mes, ano, distrito);
}

async function buscarFrequencias(oficina, mes, ano, distrito = null) {
  console.log(`📅 Buscando frequências para ${oficina}${distrito ? ` (${distrito})` : ''} em ${mes}/${ano}`);
  
  try {
    // Busca TODOS os documentos da coleção frequencias
    const frequenciasSnap = await getDocs(collection(db, "frequencias"));
    dadosRelatorio.frequencias = [];

    const oficinaSanitizada = sanitizarNomeOficina(oficina);

    frequenciasSnap.docs.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      
      console.log(`🔍 Analisando documento: ${docId}`, data);
      
      // Verifica se o documento pertence à oficina e período desejados
      let pertenceAOficina = false;
      let pertenceAoPeriodo = false;
      let pertenceAoDistrito = true; // Por padrão, assume que pertence (para oficinas que não são Percussão/Fanfarra)
      
      // Método 1: Verificar se o ID do documento contém a oficina (sanitizada)
      if (docId.includes(oficinaSanitizada)) {
        pertenceAOficina = true;
      }
      
      // Método 2: Verificar se há um campo 'oficina' no documento
      if (data.oficina === oficina) {
        pertenceAOficina = true;
      }

      // Método 3: Verificar distrito para Percussão/Fanfarra
      if (oficina === "Percussão/Fanfarra" && distrito) {
        // Verifica se o ID do documento contém o distrito
        if (docId.includes(`_${distrito}`)) {
          pertenceAoDistrito = true;
        } else if (data.distrito === distrito) {
          pertenceAoDistrito = true;
        } else {
          pertenceAoDistrito = false;
        }
      }
      
      // Método 4: Extrair data do ID do documento (formato: YYYY-MM-DD_Oficina)
      const dataMatch = docId.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dataMatch) {
        const [, docAno, docMes] = dataMatch;
        if (parseInt(docAno) === ano && parseInt(docMes) === mes) {
          pertenceAoPeriodo = true;
        }
      }
      
      // Método 5: Verificar campo 'data' se existir
      if (data.data) {
        const dataDoc = data.data.toDate ? data.data.toDate() : new Date(data.data);
        if (dataDoc.getFullYear() === ano && (dataDoc.getMonth() + 1) === mes) {
          pertenceAoPeriodo = true;
        }
      }
      
      // Se pertence à oficina, ao período e ao distrito, adiciona aos dados
      if (pertenceAOficina && pertenceAoPeriodo && pertenceAoDistrito) {
        console.log(`✅ Documento ${docId} incluído no relatório`);
        dadosRelatorio.frequencias.push({ id: docId, ...data });
      }
    });

    console.log(`📊 Total de frequências encontradas: ${dadosRelatorio.frequencias.length}`);
    
  } catch (error) {
    console.error("Erro ao buscar frequências:", error);
  }
}

async function buscarPlanosDeAula(oficina, mes, ano, distrito = null) {
  console.log(`📚 Buscando planos de aula para ${oficina}${distrito ? ` (${distrito})` : ''} em ${mes}/${ano}`);
  
  try {
    // Busca TODOS os planos de aula primeiro
    const planosSnap = await getDocs(collection(db, "planosDeAula"));
    dadosRelatorio.planosDeAula = [];

    planosSnap.docs.forEach(doc => {
      const data = doc.data();
      
      // Verifica se pertence à oficina
      if (data.oficina === oficina) {
        // Verifica se pertence ao período
        let pertenceAoPeriodo = false;
        
        if (data.data) {
          const dataPlano = data.data.toDate ? data.data.toDate() : new Date(data.data);
          if (dataPlano.getFullYear() === ano && (dataPlano.getMonth() + 1) === mes) {
            pertenceAoPeriodo = true;
          }
        }

        // Para Percussão/Fanfarra, verifica se pertence ao distrito
        let pertenceAoDistrito = true;
        if (oficina === "Percussão/Fanfarra" && distrito) {
          // Se o plano tem campo distrito, verifica
          if (data.distrito) {
            pertenceAoDistrito = data.distrito === distrito;
          }
          // Se não tem campo distrito, assume que é válido para todos os distritos
          // (planos antigos ou gerais)
        }
        
        if (pertenceAoPeriodo && pertenceAoDistrito) {
          console.log(`✅ Plano de aula incluído: ${data.titulo || 'Sem título'}`);
          dadosRelatorio.planosDeAula.push({ id: doc.id, ...data });
        }
      }
    });

    // Ordena por data (mais recente primeiro)
    dadosRelatorio.planosDeAula.sort((a, b) => {
      const dataA = a.data ? (a.data.toDate ? a.data.toDate() : new Date(a.data)) : new Date(0);
      const dataB = b.data ? (b.data.toDate ? b.data.toDate() : new Date(b.data)) : new Date(0);
      return dataB - dataA;
    });

    console.log(`📚 Total de planos de aula encontrados: ${dadosRelatorio.planosDeAula.length}`);
    
  } catch (error) {
    console.error("Erro ao buscar planos de aula:", error);
  }
}

function renderizarRelatorio(container, oficina, mes, ano, distrito = null) {
  console.log("🎨 Renderizando relatório...");
  atualizarEstatisticasGerais(container);
  renderizarTabelaFrequencia(container);
  renderizarListaAulas(container);
}

function atualizarEstatisticasGerais(container) {
  const totalAlunos = container.querySelector("#total-alunos");
  const totalAulas = container.querySelector("#total-aulas");
  const frequenciaMedia = container.querySelector("#frequencia-media");

  totalAlunos.textContent = dadosRelatorio.matriculas.length;
  totalAulas.textContent = dadosRelatorio.planosDeAula.length;

  // Calcula frequência média
  let totalPresencas = 0;
  let totalRegistros = 0;

  dadosRelatorio.frequencias.forEach(freq => {
    console.log("📊 Processando frequência:", freq);
    
    // Método 1: Array de alunos
    if (Array.isArray(freq.alunos)) {
      freq.alunos.forEach(aluno => {
        if (aluno.status) {
          totalRegistros++;
          if (aluno.status.toLowerCase() === 'presente') {
            totalPresencas++;
          }
        }
      });
    }
    
    // Método 2: Objeto presencas
    else if (freq.presencas && typeof freq.presencas === 'object') {
      Object.values(freq.presencas).forEach(presente => {
        totalRegistros++;
        if (presente === true) {
          totalPresencas++;
        }
      });
    }
    
    // Método 3: Status direto
    else if (freq.status) {
      totalRegistros++;
      if (freq.status.toLowerCase() === 'presente') {
        totalPresencas++;
      }
    }
  });

  const media = totalRegistros > 0 ? (totalPresencas / totalRegistros * 100) : 0;
  frequenciaMedia.textContent = `${media.toFixed(1)}%`;
  
  console.log(`📈 Estatísticas: ${dadosRelatorio.matriculas.length} alunos, ${dadosRelatorio.planosDeAula.length} aulas, ${media.toFixed(1)}% frequência`);
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

  // Inicializa estatísticas para cada aluno matriculado
  const estatisticas = {};
  dadosRelatorio.matriculas.forEach(matricula => {
    estatisticas[matricula.nome] = { presencas: 0, faltas: 0, total: 0 };
  });

  // Processa cada registro de frequência
  dadosRelatorio.frequencias.forEach(freq => {
    console.log("🔍 Processando frequência para tabela:", freq);
    
    // Método 1: Array de alunos
    if (Array.isArray(freq.alunos)) {
      freq.alunos.forEach(aluno => {
        const nome = aluno.nome?.trim();
        if (nome && estatisticas[nome]) {
          estatisticas[nome].total++;
          if (aluno.status?.toLowerCase() === 'presente') {
            estatisticas[nome].presencas++;
          } else {
            estatisticas[nome].faltas++;
          }
        }
      });
    }
    
    // Método 2: Objeto presencas
    else if (freq.presencas && typeof freq.presencas === 'object') {
      Object.entries(freq.presencas).forEach(([nome, presente]) => {
        if (estatisticas[nome]) {
          estatisticas[nome].total++;
          if (presente === true) {
            estatisticas[nome].presencas++;
          } else {
            estatisticas[nome].faltas++;
          }
        }
      });
    }
    
    // Método 3: Status direto (um aluno por registro)
    else if (freq.alunoNome && freq.status) {
      const nome = freq.alunoNome;
      if (estatisticas[nome]) {
        estatisticas[nome].total++;
        if (freq.status.toLowerCase() === 'presente') {
          estatisticas[nome].presencas++;
        } else {
          estatisticas[nome].faltas++;
        }
      }
    }
  });

  // Renderiza a tabela
  corpo.innerHTML = "";
  Object.entries(estatisticas).forEach(([nome, stats]) => {
    const percentual = stats.total > 0 ? (stats.presencas / stats.total) * 100 : 0;
    const classeFrequencia = percentual >= 80 ? "frequencia-alta" : 
                           percentual >= 60 ? "frequencia-media" : "frequencia-baixa";
    
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${nome}</td>
      <td>${stats.presencas}</td>
      <td>${stats.faltas}</td>
      <td class="${classeFrequencia}">${percentual.toFixed(1)}%</td>
    `;
    corpo.appendChild(linha);
  });

  console.log("✅ Tabela de frequência renderizada");
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
    
    const div = document.createElement("div");
    div.className = "aula-item";
    div.innerHTML = `
      <div class="aula-titulo">${plano.titulo || "Aula sem título"}</div>
      <div class="aula-data">${dataAula.toLocaleDateString('pt-BR')} - ${plano.professor || plano.nomeProfessor || "Professor não informado"}</div>
    `;
    lista.appendChild(div);
  });

  console.log("✅ Lista de aulas renderizada");
}

function habilitarBotoesExportacao(container, habilitar) {
  ["#btn-exportar-pdf", "#btn-exportar-excel", "#btn-imprimir"].forEach(sel => {
    const btn = container.querySelector(sel);
    if (btn) btn.disabled = !habilitar;
  });
}

function exportarPDF(container) {
  mostrarToast(container, "Funcionalidade de exportação PDF em desenvolvimento.");
}

function exportarExcel(container) {
  mostrarToast(container, "Funcionalidade de exportação Excel em desenvolvimento.");
}

function imprimirRelatorio(container) {
  window.print();
}

function mostrarToast(container, mensagem, tipo = "sucesso") {
  const toast = container.querySelector("#toast-relatorio");
  const msg = container.querySelector("#toast-mensagem-relatorio");
  if (!toast || !msg) return;
  
  msg.textContent = mensagem;
  toast.className = `toast-notification visible ${tipo}`;
  setTimeout(() => {
    toast.className = "toast-notification hidden";
  }, 4000);
}

