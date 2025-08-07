// js/kpi.js - Módulo de KPIs para análise de dados de matrícula (VERSÃO COM GRÁFICOS DE PIZZA PARA IDADE E OFICINA)
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Variáveis de escopo do módulo ---
let dadosMatriculas = [];

export function init( ) {
  console.log("✅ Módulo de KPIs inicializado!");
  carregarDadosMatriculas();
  adicionarEventListeners();
}

function adicionarEventListeners() {
  // Event listener para os botões de impressão individual
  document.addEventListener('click', (event) => {
    if (event.target.closest('.print-kpi-chart')) {
      const button = event.target.closest('.print-kpi-chart');
      const chartId = button.dataset.chartId;
      imprimirGraficoIndividual(chartId);
    }
  });
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
    
    // Gera todos os gráficos
    gerarGraficos();
    
  } catch (error) {
    console.error("❌ Erro ao carregar dados de matrículas:", error);
  }
}

function gerarGraficos() {
  // Gera gráficos para cada categoria
  gerarGraficoBairro();
  gerarGraficoEscola();
  gerarGraficoIdade(); // Agora será pizza
  gerarGraficoRaca();
  gerarGraficoRede();
  gerarGraficoReligiao();
  gerarGraficoOficina(); // Agora será pizza
  gerarGraficoProgramas();
  gerarGraficoSexoAluno();
  
  // Atualiza métricas gerais
  atualizarMetricasGerais();
}

function contarOcorrencias(campo) {
  const contadores = {};
  dadosMatriculas.forEach(matricula => {
    const valor = matricula[campo];
    if (valor) {
      contadores[valor] = (contadores[valor] || 0) + 1;
    }
  });
  return contadores;
}

function contarOcorrenciasArray(campo) {
  const contadores = {};
  dadosMatriculas.forEach(matricula => {
    const array = matricula[campo];
    if (Array.isArray(array)) {
      array.forEach(item => {
        contadores[item] = (contadores[item] || 0) + 1;
      });
    }
  });
  return contadores;
}

function gerarGraficoPizza(containerId, dados, cores = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = Object.values(dados).reduce((sum, val) => sum + val, 0);
  if (total === 0) {
    container.innerHTML = '<p>Nenhum dado disponível</p>';
    return;
  }

  // Cores padrão mais vibrantes
  if (!cores) {
    cores = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
  }

  // Cria o SVG com tamanho maior
  let html = '<svg class="chart-pie-svg" width="350" height="350" viewBox="0 0 350 350">';
  let startAngle = 0;
  let colorIndex = 0;
  const centerX = 175;
  const centerY = 175;
  const radius = 120;

  Object.entries(dados).forEach(([label, value]) => {
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;
    const endAngle = startAngle + angle;

    // Calcula coordenadas do arco
    const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');

    html += `<path d="${pathData}" fill="${cores[colorIndex % cores.length]}" class="chart-pie-slice" />`;

    // Adiciona label se a fatia for grande o suficiente
    if (percentage > 3) {
      const labelAngle = startAngle + angle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180);
      html += `<text x="${labelX}" y="${labelY}" class="chart-pie-label">${percentage.toFixed(1)}%</text>`;
    }

    startAngle = endAngle;
    colorIndex++;
  });

  html += '</svg>';

  // Adiciona legenda melhorada
  html += '<div class="chart-legend">';
  colorIndex = 0;
  Object.entries(dados).forEach(([label, value]) => {
    const percentage = (value / total) * 100;
    html += `<div class="chart-legend-item">
      <span class="chart-legend-color-box" style="background-color: ${cores[colorIndex % cores.length]};"></span>
      <span><strong>${label}:</strong> ${value} (${percentage.toFixed(1)}%)</span>
    </div>`;
    colorIndex++;
  });
  html += '</div>';

  container.innerHTML = html;
}

function gerarGraficoBarras(containerId, dados) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // CORREÇÃO: Verifica se há dados válidos
  const valoresNumericos = Object.values(dados).filter(val => val > 0);
  if (valoresNumericos.length === 0) {
    container.innerHTML = '<p>Nenhum dado disponível</p>';
    return;
  }

  const maxValue = Math.max(...valoresNumericos);
  
  // CORREÇÃO: Ordena os dados por valor (decrescente) para melhor visualização
  const dadosOrdenados = Object.entries(dados)
    .filter(([label, value]) => value > 0) // Remove entradas com valor 0
    .sort(([,a], [,b]) => b - a); // Ordena por valor decrescente

  let html = '<div class="chart-bar-container">';
  
  dadosOrdenados.forEach(([label, value]) => {
    // CORREÇÃO: Calcula a porcentagem baseada no valor máximo
    const percentage = (value / maxValue) * 100;
    // CORREÇÃO: Garante uma largura mínima visível (10%) e máxima (95%)
    const barWidth = Math.max(Math.min(percentage, 95), 10);
    
    html += `
      <div class="chart-bar-item">
        <div class="chart-bar-label">${label}</div>
        <div class="chart-bar-value-container">
          <div class="chart-bar" style="width: ${barWidth}%;">${value}</div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function imprimirGraficoIndividual(chartId) {
  const chartContainer = document.getElementById(chartId);
  if (!chartContainer) {
    console.error(`Gráfico com ID ${chartId} não encontrado.`);
    return;
  }

  // Encontra o título do gráfico
  const card = chartContainer.closest('.kpi-card');
  const titulo = card ? card.querySelector('h3').textContent : 'Gráfico KPI';

  // Cria uma nova janela para impressão
  const janelaImpressao = window.open('', '_blank', 'width=800,height=600');
  
  // HTML da página de impressão
  const htmlImpressao = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo} - KPI</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .print-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .print-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        .print-subtitle {
            font-size: 16px;
            color: #666;
        }
        
        .print-chart-container {
            width: 100%;
            max-width: 600px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        /* Estilos dos gráficos copiados */
        .chart-pie-svg {
            max-width: 100%;
            max-height: 100%;
        }
        .chart-pie-slice {
            stroke: white;
            stroke-width: 2px;
        }
        .chart-pie-label {
            font-size: 12px;
            fill: #333;
            text-anchor: middle;
        }
        .chart-legend {
            margin-top: 20px;
            font-size: 14px;
            width: 100%;
        }
        .chart-legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .chart-legend-color-box {
            width: 15px;
            height: 15px;
            display: inline-block;
            margin-right: 8px;
            border-radius: 3px;
            flex-shrink: 0;
        }
        .chart-bar-container {
            width: 100%;
        }
        .chart-bar-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .chart-bar-label {
            width: 150px;
            font-size: 14px;
            color: #555;
            flex-shrink: 0;
            text-align: right;
            padding-right: 10px;
        }
        .chart-bar-value-container {
            flex-grow: 1;
            display: flex;
            align-items: center;
        }
        .chart-bar {
            background-color: #FF6B35;
            color: white;
            font-size: 12px;
            text-align: right;
            padding: 6px 10px;
            border-radius: 3px;
            min-width: 30px;
        }
    </style>
</head>
<body>
    <div class="print-header">
        <div class="print-title">${titulo}</div>
        <div class="print-subtitle">Escola de Música Made in Sertão - MIS Educa</div>
    </div>
    
    <div class="print-chart-container">
        ${chartContainer.innerHTML}
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

function gerarGraficoBairro() {
  const dados = contarOcorrencias('bairro');
  gerarGraficoPizza('chart-bairro', dados);
}

function gerarGraficoEscola() {
  const dados = contarOcorrencias('escola');
  gerarGraficoPizza('chart-escola', dados);
}

function gerarGraficoIdade() {
  const dados = contarOcorrencias('idade');
  // CORREÇÃO: Converte as idades para números e ordena
  const dadosNumericos = {};
  Object.entries(dados).forEach(([idade, count]) => {
    const idadeNum = parseInt(idade);
    if (!isNaN(idadeNum)) {
      dadosNumericos[idade] = count;
    }
  });
  // MUDANÇA: Agora chama gerarGraficoPizza
  gerarGraficoPizza('chart-idade', dadosNumericos);
}

function gerarGraficoRaca() {
  const dados = contarOcorrencias('raca');
  gerarGraficoPizza('chart-raca', dados);
}

function gerarGraficoRede() {
  const dados = contarOcorrencias('rede');
  gerarGraficoPizza('chart-rede', dados);
}

function gerarGraficoReligiao() {
  const dados = contarOcorrencias('religiao');
  gerarGraficoPizza('chart-religiao', dados);
}

function gerarGraficoOficina() {
  const dados = contarOcorrenciasArray('oficinas');
  // MUDANÇA: Agora chama gerarGraficoPizza
  gerarGraficoPizza('chart-oficina', dados);
}

function gerarGraficoProgramas() {
  const dados = contarOcorrenciasArray('programas');
  gerarGraficoPizza('chart-programas', dados);
}

// CORRIGIDO: Agora usa o campo 'sexo' diretamente do documento de matrícula
function gerarGraficoSexoAluno() {
  const dados = contarOcorrencias('sexo');
  gerarGraficoPizza('chart-sexo-aluno', dados);
}

function atualizarMetricasGerais() {
  const totalMatriculas = dadosMatriculas.length;
  const totalMatriculas2025 = dadosMatriculas.filter(m => m.ano === 2025).length;

  const elementoTotal = document.getElementById('total-matriculas');
  const elemento2025 = document.getElementById('total-matriculas-2025');

  if (elementoTotal) elementoTotal.textContent = totalMatriculas;
  if (elemento2025) elemento2025.textContent = totalMatriculas2025;
}
