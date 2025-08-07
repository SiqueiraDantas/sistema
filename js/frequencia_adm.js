// js/frequencia_adm.js (VERSÃO COM IMPRESSÃO SECULT INTEGRADA)
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mostrarNotificacao } from './notificacao.js';

// --- Variáveis de escopo do módulo ---
let todosOsRegistrosAgrupados = [];
let corpoTabela, filtroData, filtroOficina, filtroProfessor;
let modalVisualizar, modalTitulo, modalSubtitulo, modalConteudo, modalFechar;

/**
 * Converte um objeto Timestamp do Firebase ou uma string de data para uma data legível.
 * @param {object|string} dataFirebase - O valor do campo de data do Firebase.
 * @returns {string} - A data formatada como DD/MM/YYYY.
 */
function formatarData(dataFirebase ) {
  if (!dataFirebase) return "N/A";
  
  // Verifica se é um objeto Timestamp do Firebase
  if (dataFirebase.seconds) {
    const data = new Date(dataFirebase.seconds * 1000);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  
  // Se já for uma string (formato antigo), apenas retorna
  if (typeof dataFirebase === 'string') {
    return dataFirebase;
  }

  return "Data inválida";
}

/**
 * Converte um objeto Timestamp ou string para um objeto Date para ordenação.
 * @param {object|string} dataFirebase - O valor do campo de data.
 * @returns {Date}
 */
function converterParaDate(dataFirebase) {
    if (!dataFirebase) return null;
    if (dataFirebase.seconds) {
        return new Date(dataFirebase.seconds * 1000);
    }
    if (typeof dataFirebase === 'string') {
        const partes = dataFirebase.split('/');
        if (partes.length === 3) return new Date(partes[2], partes[1] - 1, partes[0]);
    }
    return null;
}

/**
 * NOVA FUNÇÃO: Imprime frequência no padrão SECULT
 * @param {string} frequenciaId - ID do registro de frequência
 */
function imprimirFrequenciaSECULT(frequenciaId) {
  const registro = todosOsRegistrosAgrupados.find(r => r.id === frequenciaId);
  if (!registro) {
    mostrarNotificacao("Erro: Registro não encontrado para impressão.", "erro");
    return;
  }

  // Cria uma nova janela para impressão
  const janelaImpressao = window.open('', '_blank', 'width=800,height=600');
  
  // Extrai mês e ano da data
  const [dia, mes, ano] = registro.dataFormatada.split('/');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesExtenso = meses[parseInt(mes) - 1];
  const mesAno = `${mesExtenso}/${ano}`;

  // Filtra apenas os alunos presentes
  const alunosPresentes = registro.alunos.filter(aluno => aluno.status === 'presente');

  // HTML da página de impressão
  const htmlImpressao = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frequência de Alunos - ${registro.oficina}</title>
    <style>
        @page {
            size: A4;
            margin: 1cm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.2;
            color: #000;
        }
        
        .container {
            width: 100%;
            max-width: 21cm;
            margin: 0 auto;
            padding: 10px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .logo-placeholder {
            border: 2px dashed #ccc;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
            background-color: #f9f9f9;
        }
        
        .titulo {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        .info-section {
            margin-bottom: 15px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 8px;
            align-items: center;
        }
        
        .info-label {
            font-weight: bold;
            margin-right: 10px;
            min-width: 120px;
        }
        
        .info-value {
            border-bottom: 1px solid #000;
            flex: 1;
            padding: 2px 5px;
            min-height: 20px;
        }
        
        .info-row-split {
            display: flex;
            margin-bottom: 8px;
        }
        
        .info-half {
            flex: 1;
            display: flex;
            align-items: center;
        }
        
        .info-half:first-child {
            margin-right: 20px;
        }
        
        .modalidade-options {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .modalidade-option {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .checkbox {
            width: 12px;
            height: 12px;
            border: 1px solid #000;
            display: inline-block;
        }
        
        .checkbox.checked::after {
            content: 'X';
            display: block;
            text-align: center;
            line-height: 10px;
            font-size: 10px;
        }
        
        .tabela-frequencia {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .tabela-frequencia th,
        .tabela-frequencia td {
            border: 1px solid #000;
            padding: 8px 4px;
            text-align: left;
            vertical-align: top;
        }
        
        .tabela-frequencia th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        
        .col-numero {
            width: 5%;
            text-align: center;
        }
        
        .col-nome {
            width: 30%;
        }
        
        .col-mes-ano {
            width: 15%;
            text-align: center;
        }
        
        .col-idade {
            width: 10%;
            text-align: center;
        }
        
        .col-conteudo {
            width: 40%;
        }
        
        .assinaturas {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
        }
        
        .assinatura-box {
            width: 45%;
            text-align: center;
        }
        
        .linha-assinatura {
            border-bottom: 1px solid #000;
            height: 40px;
            margin-bottom: 5px;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .container {
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header com Logo -->
        <div class="header">
            <div class="logo-placeholder">
                LOGOMARCA DO PROJETO  

                <small>(clicar 2x para editar)</small>
            </div>
            <div class="titulo">FREQUÊNCIA DE ALUNOS</div>
        </div>
        
        <!-- Informações do Curso -->
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
                    <span class="info-value">${registro.oficina}</span>
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
                    <div class="modalidade-option">
                        <span class="checkbox checked"></span>
                        <span>PRESENCIAL</span>
                    </div>
                    <div class="modalidade-option">
                        <span class="checkbox"></span>
                        <span>ON-LINE</span>
                    </div>
                    <div class="modalidade-option">
                        <span class="checkbox"></span>
                        <span>HÍBRIDO</span>
                    </div>
                </div>
            </div>
            
            <div class="info-row">
                <span class="info-label">PROFESSOR:</span>
                <span class="info-value">${registro.professor}</span>
            </div>
        </div>
        
        <!-- Tabela de Frequência -->
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
                        <td class="col-nome">${aluno.nome}</td>
                        <td class="col-mes-ano">${mesAno}</td>
                        <td class="col-idade">-</td>
                        <td class="col-conteudo">Prática instrumental e teoria musical</td>
                    </tr>
                `).join('')}
                
                <!-- Linhas em branco para completar a página -->
                ${Array.from({length: Math.max(0, 15 - alunosPresentes.length)}, (_, index) => `
                    <tr>
                        <td class="col-numero">${alunosPresentes.length + index + 1}</td>
                        <td class="col-nome">&nbsp;</td>
                        <td class="col-mes-ano">&nbsp;</td>
                        <td class="col-idade">&nbsp;</td>
                        <td class="col-conteudo">&nbsp;</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Assinaturas -->
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
        // Auto-imprime quando a página carrega
        window.onload = function() {
            setTimeout(function() {
                window.print();
                // Fecha a janela após imprimir
                window.onafterprint = function() {
                    window.close();
                };
            }, 500);
        };
    </script>
</body>
</html>`;

  // Escreve o HTML na nova janela
  janelaImpressao.document.write(htmlImpressao);
  janelaImpressao.document.close();
}

export function init() {
  // Atribuição de Elementos do DOM
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

  adicionarEventListeners();
  carregarFrequencias();
}

async function carregarFrequencias() {
  corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align: center;">Carregando...</td></tr>`;
  try {
    const querySnapshot = await getDocs(collection(db, "frequencias"));
    const registrosAgrupados = {};

    querySnapshot.forEach(doc => {
      const dados = doc.data();
      const dataFormatada = formatarData(dados.data);
      const oficina = dados.oficina;

      if (dataFormatada !== "Data inválida" && oficina) {
        const chave = `${dataFormatada}_${oficina}`;
        if (!registrosAgrupados[chave]) {
          registrosAgrupados[chave] = {
            id: chave,
            data: dados.data,
            dataFormatada: dataFormatada,
            oficina: oficina,
            professor: dados.professor || "N/A",
            alunos: [],
            docsIds: []
          };
        }
        if (dados.alunos) {
            registrosAgrupados[chave].alunos.push(...dados.alunos);
        }
        registrosAgrupados[chave].docsIds.push(doc.id);
      }
    });

    todosOsRegistrosAgrupados = Object.values(registrosAgrupados);
    todosOsRegistrosAgrupados.sort((a, b) => converterParaDate(b.data) - converterParaDate(a.data));
    
    renderizarTabela(todosOsRegistrosAgrupados);
    carregarOpcoesFiltros(todosOsRegistrosAgrupados);

  } catch (error) {
    console.error("Erro ao buscar e agrupar frequências:", error);
    corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar.</td></tr>`;
  }
}

function renderizarTabela(registros) {
  corpoTabela.innerHTML = "";
  if (registros.length === 0) {
    corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align: center;">Nenhuma aula com frequência registrada.</td></tr>`;
    return;
  }

  registros.forEach(reg => {
    const presentes = reg.alunos.filter(aluno => aluno.status === 'presente').length;
    const faltas = reg.alunos.filter(aluno => aluno.status === 'falta').length;

    const tr = document.createElement("tr");
    tr.dataset.frequenciaId = reg.id; 
    tr.innerHTML = `
      <td>${reg.dataFormatada}</td>
      <td>${reg.oficina}</td>
      <td>${reg.professor}</td>
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
  const oficinas = [...new Set(registros.map(r => r.oficina))].sort();
  filtroOficina.innerHTML = `<option value="">Todas</option>`;
  oficinas.forEach(oficina => {
    filtroOficina.innerHTML += `<option value="${oficina}">${oficina}</option>`;
  });
}

function aplicarFiltros() {
  const dataSelecionada = filtroData.value;
  const oficinaSelecionada = filtroOficina.value;
  const professorDigitado = filtroProfessor.value.toLowerCase();

  const registrosFiltrados = todosOsRegistrosAgrupados.filter(reg => {
    let dataFiltroFormatada = '';
    if (dataSelecionada) {
        const [ano, mes, dia] = dataSelecionada.split('-');
        dataFiltroFormatada = `${dia}/${mes}/${ano}`;
    }
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

  modalTitulo.textContent = `Frequência de ${registro.oficina}`;
  modalSubtitulo.textContent = `Data: ${registro.dataFormatada} | Professor: ${registro.professor}`;
  modalConteudo.innerHTML = '<p>Carregando...</p>';
  modalVisualizar.style.display = "flex";

  const alunos = registro.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
  if (alunos.length > 0) {
    let htmlAlunos = '<ul>';
    alunos.forEach(aluno => {
      const statusClass = aluno.status === 'presente' ? 'status-presente' : 'status-falta';
      const statusText = aluno.status === 'presente' ? 'Presente' : 'Falta';
      htmlAlunos += `<li>${aluno.nome} - <span class="${statusClass}">${statusText}</span></li>`;
    });
    htmlAlunos += '</ul>';
    modalConteudo.innerHTML = htmlAlunos;
  } else {
    modalConteudo.innerHTML = '<p>Nenhum aluno nesta lista de frequência.</p>';
  }
}

async function excluirRegistroDeAula(frequenciaId) {
    const registro = todosOsRegistrosAgrupados.find(r => r.id === frequenciaId);
    if (!confirm(`Tem certeza que deseja excluir TODOS os registros de frequência da oficina "${registro.oficina}" do dia ${registro.dataFormatada}?`)) {
        return;
    }

    try {
        for (const docId of registro.docsIds) {
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
  filtroData.addEventListener('change', aplicarFiltros);
  filtroOficina.addEventListener('change', aplicarFiltros);
  filtroProfessor.addEventListener('input', aplicarFiltros);

  corpoTabela.addEventListener('click', (event) => {
    const target = event.target.closest('a');
    if (!target) return;
    event.preventDefault();
    const frequenciaId = target.closest('tr').dataset.frequenciaId;
    if (!frequenciaId) return;

    if (target.classList.contains('acao-visualizar')) {
      abrirModalVisualizar(frequenciaId);
    } else if (target.classList.contains('acao-excluir')) {
      excluirRegistroDeAula(frequenciaId);
    } else if (target.classList.contains('acao-editar')) {
      mostrarNotificacao("A função de editar será implementada em breve!", "erro");
    } else if (target.classList.contains('acao-imprimir')) {
      // NOVA FUNCIONALIDADE: Impressão no padrão SECULT
      imprimirFrequenciaSECULT(frequenciaId);
    }
  });

  modalFechar.addEventListener('click', fecharModalVisualizar);
  modalVisualizar.addEventListener('click', (e) => {
    if (e.target === modalVisualizar) fecharModalVisualizar();
  });
}
