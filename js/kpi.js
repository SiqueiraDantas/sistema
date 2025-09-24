// js/kpi.js — KPIs com filtro por OFICINA
// Suporta: 'oficinas' (array com NOME), 'oficina' (string),
//          'oficinasIds' (array de ID) e 'oficinaId' (string)

import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Estado ---
let dadosMatriculas = [];
let dadosFiltrados = [];
let filtroOficina = 'todas';

let oficinasById = new Map();  // id -> nome
let idsByName    = new Map();  // nome -> Set(ids)
let nomesOficina = new Set();  // nomes para o select

// --- Init ---
export function init() {
  console.log("✅ KPIs inicializados");
  adicionarEventListeners();
  Promise.all([carregarDadosMatriculas(), carregarOficinas()])
    .then(() => {
      preencherNomesAPartirDasMatriculas();
      popularSelectOficinas();
      aplicarFiltro();
    })
    .catch(err => console.error("Erro na inicialização de KPIs:", err));
}

// --- UI ---
function adicionarEventListeners() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('.print-kpi-chart')) {
      const btn = event.target.closest('.print-kpi-chart');
      imprimirGraficoIndividual(btn.dataset.chartId);
    }
  });

  const btnAplicar = document.getElementById('aplicar-filtro');
  const btnLimpar  = document.getElementById('limpar-filtro');
  const select     = document.getElementById('filtro-oficina');

  if (btnAplicar) btnAplicar.addEventListener('click', () => {
    filtroOficina = (select?.value ?? 'todas');
    aplicarFiltro();
  });
  if (btnLimpar) btnLimpar.addEventListener('click', () => {
    filtroOficina = 'todas';
    if (select) select.value = 'todas';
    aplicarFiltro();
  });
}

// --- Firestore ---
async function carregarDadosMatriculas() {
  console.log("🔄 Carregando matrículas...");
  const qs = await getDocs(collection(db, "matriculas"));
  dadosMatriculas = [];
  qs.forEach(docSnap => dadosMatriculas.push(docSnap.data()));
  console.log(`✅ ${dadosMatriculas.length} matrículas carregadas.`);
}

async function carregarOficinas() {
  try {
    console.log("🔄 Carregando oficinas (coleção)...");
    const qs = await getDocs(collection(db, "oficinas"));
    oficinasById.clear(); idsByName.clear(); nomesOficina.clear();

    qs.forEach(docSnap => {
      const d = docSnap.data() || {};
      const id = docSnap.id;
      const nome = (d.nome || d.titulo || d.oficina || '').toString().trim();
      if (!nome) return;

      oficinasById.set(id, nome);
      const set = idsByName.get(nome) || new Set();
      set.add(id); idsByName.set(nome, set);
      nomesOficina.add(nome);
    });
    console.log(`✅ ${oficinasById.size} oficinas mapeadas da coleção.`);
  } catch (e) {
    console.warn("⚠️ Não consegui ler a coleção 'oficinas'. Vou depender só das matrículas.", e);
  }
}

function preencherNomesAPartirDasMatriculas() {
  dadosMatriculas.forEach(m => {
    if (Array.isArray(m.oficinas)) m.oficinas.forEach(n => n && nomesOficina.add(n));
    if (typeof m.oficina === 'string' && m.oficina.trim()) nomesOficina.add(m.oficina.trim());

    if (Array.isArray(m.oficinasIds)) {
      m.oficinasIds.forEach(id => {
        const nome = oficinasById.get(id);
        if (nome) {
          nomesOficina.add(nome);
          const s = idsByName.get(nome) || new Set();
          s.add(id); idsByName.set(nome, s);
        }
      });
    }
    if (typeof m.oficinaId === 'string') {
      const nome = oficinasById.get(m.oficinaId);
      if (nome) {
        nomesOficina.add(nome);
        const s = idsByName.get(nome) || new Set();
        s.add(m.oficinaId); idsByName.set(nome, s);
      }
    }
  });
}

function popularSelectOficinas() {
  const select = document.getElementById('filtro-oficina');
  if (!select) return;
  select.innerHTML = `<option value="todas">Todas as Oficinas</option>`;
  [...nomesOficina].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(nome=>{
    const opt = document.createElement('option');
    opt.value = nome; opt.textContent = nome;
    select.appendChild(opt);
  });
}

// --- Filtro + Render ---
function aplicarFiltro() {
  if (filtroOficina === 'todas') {
    dadosFiltrados = dadosMatriculas;
  } else {
    const idsEquivalentes = idsByName.get(filtroOficina) || new Set();

    dadosFiltrados = dadosMatriculas.filter(m => {
      if (Array.isArray(m.oficinas) && m.oficinas.includes(filtroOficina)) return true;
      if (typeof m.oficina === 'string' && m.oficina === filtroOficina) return true;

      if (Array.isArray(m.oficinasIds)) {
        for (const id of m.oficinasIds) if (idsEquivalentes.has(id)) return true;
      }
      if (typeof m.oficinaId === 'string' && idsEquivalentes.has(m.oficinaId)) return true;

      return false;
    });
  }

  const escopo = document.getElementById('escopo-atual');
  if (escopo) escopo.textContent = `Escopo: ${filtroOficina === 'todas' ? 'Todas as Oficinas' : filtroOficina}`;

  gerarGraficos(dadosFiltrados);
  atualizarMetricasGerais(dadosFiltrados);
}

// --- Helpers ---
function contarOcorrencias(dataset, campo) {
  const cont = {};
  dataset.forEach(m => { const v = m[campo]; if (v) cont[v] = (cont[v] || 0) + 1; });
  return cont;
}
function contarOcorrenciasArray(dataset, campo) {
  const cont = {};
  dataset.forEach(m => { const arr = m[campo]; if (Array.isArray(arr)) arr.forEach(item => cont[item] = (cont[item] || 0) + 1); });
  return cont;
}

// --- Gráficos ---
function gerarGraficos(dataset) {
  gerarGraficoPizza('chart-bairro',    contarOcorrencias(dataset, 'bairro'));
  gerarGraficoPizza('chart-escola',    contarOcorrencias(dataset, 'escola'));
  gerarGraficoIdade(dataset);
  gerarGraficoPizza('chart-raca',      contarOcorrencias(dataset, 'raca'));
  gerarGraficoPizza('chart-rede',      contarOcorrencias(dataset, 'rede'));
  gerarGraficoPizza('chart-religiao',  contarOcorrencias(dataset, 'religiao'));
  gerarGraficoPizza('chart-oficina',   contarOcorrenciasArray(dataset, 'oficinas'));
  gerarGraficoPizza('chart-programas', contarOcorrenciasArray(dataset, 'programas'));
  gerarGraficoPizza('chart-sexo-aluno',contarOcorrencias(dataset, 'sexo'));
}

function gerarGraficoIdade(dataset) {
  const dados = contarOcorrencias(dataset, 'idade');
  const dadosNum = {};
  Object.entries(dados).forEach(([k,v]) => { const n = parseInt(k); if (!isNaN(n)) dadosNum[k]=v; });
  gerarGraficoPizza('chart-idade', dadosNum);
}

// --- Pizza (SVG) — CORRIGIDO para caso 100% ---
function gerarGraficoPizza(containerId, dados, cores = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // remove entradas 0
  const entries = Object.entries(dados).filter(([,v]) => v > 0);
  const total = entries.reduce((s, [,v]) => s + v, 0);
  if (total === 0) { container.innerHTML = '<p>Nenhum dado disponível</p>'; return; }

  if (!cores) {
    cores = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9','#F8C471','#82E0AA','#F1948A','#7FB3D5','#D7BDE2'];
  }

  const cx = 175, cy = 175, r = 120;
  let html = `<svg class="chart-pie-svg" width="350" height="350" viewBox="0 0 350 350">`;

  // ✅ Caso 100% (apenas 1 categoria): desenha um círculo cheio
  if (entries.length === 1) {
    const [label, value] = entries[0];
    html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cores[0]}"></circle>`;
    html += `<text x="${cx}" y="${cy}" class="chart-pie-label" dominant-baseline="middle">${(value/total*100).toFixed(1)}%</text>`;
    html += `</svg>`;
    html += '<div class="chart-legend">';
    html += `
      <div class="chart-legend-item">
        <span class="chart-legend-color-box" style="background:${cores[0]}"></span>
        <span><strong>${label}:</strong> ${value} (100.0%)</span>
      </div>`;
    html += '</div>';
    container.innerHTML = html;
    return;
  }

  // 🍰 Caso normal com várias fatias
  let start = 0, idx = 0;
  entries.forEach(([label, value]) => {
    const angle = (value / total) * 360;
    // evita 360 exato na última fatia
    const end = idx === entries.length - 1 ? 359.999 : start + angle;

    const x1 = cx + r*Math.cos(start*Math.PI/180);
    const y1 = cy + r*Math.sin(start*Math.PI/180);
    const x2 = cx + r*Math.cos(end*Math.PI/180);
    const y2 = cy + r*Math.sin(end*Math.PI/180);
    const large = (end - start) > 180 ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    html += `<path d="${d}" fill="${cores[idx % cores.length]}" class="chart-pie-slice"></path>`;

    const perc = (value/total)*100;
    if (perc > 3) {
      const mid = start + (end - start)/2;
      const rx = cx + (r*0.7)*Math.cos(mid*Math.PI/180);
      const ry = cy + (r*0.7)*Math.sin(mid*Math.PI/180);
      html += `<text x="${rx}" y="${ry}" class="chart-pie-label">${perc.toFixed(1)}%</text>`;
    }

    start = end; idx++;
  });
  html += '</svg>';

  // Legenda
  html += '<div class="chart-legend">';
  idx = 0;
  entries.forEach(([label, value]) => {
    const perc = (value/total)*100;
    html += `
      <div class="chart-legend-item">
        <span class="chart-legend-color-box" style="background:${cores[idx % cores.length]}"></span>
        <span><strong>${label}:</strong> ${value} (${perc.toFixed(1)}%)</span>
      </div>`;
    idx++;
  });
  html += '</div>';

  container.innerHTML = html;
}

// --- Impressão ---
function imprimirGraficoIndividual(chartId) {
  const chartContainer = document.getElementById(chartId);
  if (!chartContainer) return console.error(`Gráfico ${chartId} não encontrado.`);
  const card = chartContainer.closest('.kpi-card');
  const titulo = card ? (card.querySelector('h3')?.textContent || 'Gráfico KPI') : 'Gráfico KPI';

  const win = window.open('', '_blank', 'width=800,height=600');
  const html = `
<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo} - KPI</title>
<style>
  @page{ size:A4; margin:2cm; }
  *{ margin:0; padding:0; box-sizing:border-box; }
  body{ font-family:Arial, sans-serif; color:#333; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
  .print-title{ font-size:24px; font-weight:bold; margin-bottom:8px; }
  .print-subtitle{ font-size:14px; color:#666; margin-bottom:20px; }
  .print-chart-container{ width:100%; max-width:600px; display:flex; flex-direction:column; align-items:center; }
  .chart-pie-svg{ max-width:100%; max-height:100%; }
  .chart-pie-slice{ stroke:#fff; stroke-width:2px; }
  .chart-pie-label{ font-size:12px; fill:#333; text-anchor:middle; }
  .chart-legend{ margin-top:20px; font-size:14px; width:100%; }
  .chart-legend-item{ display:flex; align-items:center; margin-bottom:8px; gap:8px; }
  .chart-legend-color-box{ width:15px; height:15px; border-radius:3px; }
</style>
</head>
<body>
  <div class="print-title">${titulo}</div>
  <div class="print-subtitle">Escola de Música Made In Sertão — MIS Educa</div>
  <div class="print-chart-container">${chartContainer.innerHTML}</div>
  <script>window.onload=()=>{ setTimeout(()=>{ window.print(); window.onafterprint=()=>window.close(); }, 400); };</script>
</body></html>`;
  win.document.write(html);
  win.document.close();
}

// --- Métricas ---
function atualizarMetricasGerais(dataset) {
  const total = dataset.length;
  const total2025 = dataset.filter(m => m.ano === 2025).length;
  const elTotal = document.getElementById('total-matriculas');
  const el2025 = document.getElementById('total-matriculas-2025');
  if (elTotal) elTotal.textContent = total;
  if (el2025) el2025.textContent = total2025;
}
