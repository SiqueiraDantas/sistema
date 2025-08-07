// js/turmas_adm.js - Módulo de Turmas para o administrador
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Variáveis de escopo do módulo ---
let dadosMatriculas = [];
let corpoTabela, filtroOficina, filtroProfessor;

export function init( ) {
  console.log("✅ Módulo de Turmas (Admin) inicializado!");
  
  // Inicializa elementos DOM
  corpoTabela = document.getElementById('corpo-tabela-turmas');
  filtroOficina = document.getElementById('filtro-oficina-turmas');
  filtroProfessor = document.getElementById('filtro-professor-turmas');
  
  // Carrega dados e configura eventos
  carregarDadosMatriculas();
  adicionarEventListeners();
}

function adicionarEventListeners() {
  if (filtroOficina) {
    filtroOficina.addEventListener('change', aplicarFiltros);
  }
  if (filtroProfessor) {
    filtroProfessor.addEventListener('input', aplicarFiltros);
  }
}

async function carregarDadosMatriculas() {
  try {
    console.log("🔄 Carregando dados de matrículas...");
    const querySnapshot = await getDocs(collection(db, "matriculas"));
    dadosMatriculas = [];
    
    querySnapshot.forEach(doc => {
      dadosMatriculas.push(doc.data());
    });

    console.log(`✅ ${dadosMatriculas.length} matrículas carregadas.`);
    
    // Popula filtros e tabela
    popularFiltroOficinas();
    popularTabela(dadosMatriculas);
    
  } catch (error) {
    console.error("❌ Erro ao carregar dados de matrículas:", error);
    if (corpoTabela) {
      corpoTabela.innerHTML = '<tr><td colspan="5">Erro ao carregar dados. Verifique a conexão com o Firebase.</td></tr>';
    }
  }
}

function popularFiltroOficinas() {
  if (!filtroOficina) return;
  
  // Coleta todas as oficinas únicas
  const oficinasSet = new Set();
  dadosMatriculas.forEach(matricula => {
    if (Array.isArray(matricula.oficinas)) {
      matricula.oficinas.forEach(oficina => {
        oficinasSet.add(oficina);
      });
    }
  });
  
  // Ordena as oficinas alfabeticamente
  const oficinasOrdenadas = Array.from(oficinasSet).sort();
  
  // Limpa e popula o select
  filtroOficina.innerHTML = '<option value="">Todas</option>';
  oficinasOrdenadas.forEach(oficina => {
    const option = document.createElement('option');
    option.value = oficina;
    option.textContent = oficina;
    filtroOficina.appendChild(option);
  });
}

function popularTabela(dados) {
  if (!corpoTabela) return;
  
  if (dados.length === 0) {
    corpoTabela.innerHTML = '<tr><td colspan="5">Nenhuma matrícula encontrada.</td></tr>';
    return;
  }
  
  let html = '';
  dados.forEach(matricula => {
    // Extrai informações do aluno
    const nomeAluno = matricula.nome || 'N/A';
    
    // Extrai informações do responsável
    const nomeResponsavel = matricula.responsavel?.nome || 'N/A';
    const telefoneResponsavel = matricula.responsavel?.telefone || 'N/A';
    
    // Extrai oficinas (array)
    const oficinas = Array.isArray(matricula.oficinas) 
      ? matricula.oficinas.join(', ') 
      : 'N/A';
    
    // Para professores, vamos usar um placeholder por enquanto
    // (você pode implementar a lógica de buscar professores por oficina posteriormente)
    const professores = 'A definir'; // Placeholder
    
    html += `
      <tr>
        <td>${nomeAluno}</td>
        <td>${nomeResponsavel}</td>
        <td>${telefoneResponsavel}</td>
        <td>${oficinas}</td>
        <td>${professores}</td>
      </tr>
    `;
  });
  
  corpoTabela.innerHTML = html;
}

function aplicarFiltros() {
  if (!filtroOficina || !filtroProfessor) return;
  
  const oficinaSelecionada = filtroOficina.value.toLowerCase();
  const professorDigitado = filtroProfessor.value.toLowerCase();
  
  let dadosFiltrados = dadosMatriculas;
  
  // Filtro por oficina
  if (oficinaSelecionada) {
    dadosFiltrados = dadosFiltrados.filter(matricula => {
      if (Array.isArray(matricula.oficinas)) {
        return matricula.oficinas.some(oficina => 
          oficina.toLowerCase().includes(oficinaSelecionada)
        );
      }
      return false;
    });
  }
  
  // Filtro por professor (placeholder - implementar quando tiver dados de professor)
  if (professorDigitado) {
    // Por enquanto, não filtra por professor pois não temos essa informação
    // Você pode implementar isso posteriormente quando tiver a relação oficina-professor
  }
  
  // Atualiza a tabela com os dados filtrados
  popularTabela(dadosFiltrados);
}
