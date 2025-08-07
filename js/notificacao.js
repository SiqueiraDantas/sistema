// js/notificacao.js

/**
 * Cria e exibe uma notificação na tela.
 * @param {string} mensagem - A mensagem a ser exibida.
 * @param {string} [tipo='sucesso'] - O tipo de notificação ('sucesso' ou 'erro').
 * @param {number} [duracao=3000] - A duração em milissegundos para a notificação ficar visível.
 */
export function mostrarNotificacao(mensagem, tipo = 'sucesso', duracao = 3000) {
  // Remove qualquer notificação existente para evitar sobreposição
  const notificacaoExistente = document.getElementById('notificacao-customizada');
  if (notificacaoExistente) {
    notificacaoExistente.remove();
  }

  // Cria o elemento da notificação
  const notificacao = document.createElement('div');
  notificacao.id = 'notificacao-customizada';
  notificacao.className = `notificacao-customizada ${tipo}`; // 'sucesso' ou 'erro'
  notificacao.textContent = mensagem;

  // Adiciona a notificação ao corpo do documento
  document.body.appendChild(notificacao);

  // Adiciona a classe para fazer a notificação aparecer com animação
  setTimeout(() => {
    notificacao.classList.add('visivel');
  }, 10); // Pequeno delay para garantir que a transição CSS funcione

  // Configura a remoção automática da notificação
  setTimeout(() => {
    // Remove a classe 'visivel' para animar a saída
    notificacao.classList.remove('visivel');
    
    // Remove o elemento do DOM após a animação de saída
    notificacao.addEventListener('transitionend', () => {
      if (notificacao.parentNode) {
        notificacao.remove();
      }
    });
  }, duracao);
}
