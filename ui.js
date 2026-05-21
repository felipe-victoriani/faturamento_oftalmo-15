/**
 * ui.js
 * Renderização e manipulação do DOM.
 * Não acessa o Firebase diretamente — recebe dados via parâmetros.
 *
 * Funções exportadas (em window.Ui):
 *   - renderizarAbas(convenios, ativoId)
 *   - renderizarCards(totais)
 *   - renderizarTabela(registros, convenioId, convenioNome)
 *   - renderizarTotalizadores(totais)
 *   - abrirModalEdicao(registro, convenioId, registroId)
 *   - mostrarToast(mensagem, tipo)
 *   - mostrarTelaLogin()
 *   - mostrarSistema(usuario)
 *   - atualizarStatusConexao(online)
 *   - iniciarSkeletonLoading()
 *   - pararSkeletonLoading()
 *   - formatarBRL(valor)
 *   - formatarData(dataISO)
 *   - exportarCSV(registros, nomeArquivo)
 *   - exportarExcel(registros, nomeArquivo, nomeTabela)
 *   - exportarPDF(registros, nomeArquivo, nomeTabela)
 */

window.Ui = (() => {
  /* ============================================================
     ÍCONES SVG — Centralizado
     ============================================================ */

  const Icones = {
    envelope: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>`,

    cadeado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`,

    olho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,

    olhoFechado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,

    sair: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,

    engrenagem: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,

    mais: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

    fechar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

    editar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

    lixeira: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,

    lupa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,

    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,

    graficoBarra: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,

    tabela: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,

    wifiOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>`,

    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>`,

    atencao: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

    dinheiro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M18.5 9.5v5M5.5 9.5v5"/></svg>`,

    pessoas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  };

  /* ============================================================
     SANITIZAÇÃO E SEGURANÇA
     ============================================================ */

  /**
   * Sanitiza texto para prevenir XSS.
   * Remove todas as tags HTML mas mantém o conteúdo textual.
   * @param {string} texto
   * @returns {string}
   */
  function sanitizar(texto) {
    if (typeof texto !== "string") return texto;

    /* Verifica se DOMPurify está disponível */
    if (typeof DOMPurify !== "undefined") {
      return DOMPurify.sanitize(texto, {
        ALLOWED_TAGS: [], // Remove todas as tags HTML
        KEEP_CONTENT: true, // Mantém o conteúdo textual
      });
    }

    /* Fallback se DOMPurify não estiver carregado */
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  /* ============================================================
     PAGINAÇÃO
     ============================================================ */

  let paginaAtual = 1;
  const REGISTROS_POR_PAGINA = 50;

  /**
   * Retorna a página atual.
   * @returns {number}
   */
  function getPaginaAtual() {
    return paginaAtual;
  }

  /**
   * Reseta a paginação para a página 1.
   */
  function resetarPagina() {
    paginaAtual = 1;
  }

  /**
   * Altera a página atual.
   * @param {number} novaPagina
   */
  function irParaPagina(novaPagina) {
    paginaAtual = novaPagina;
  }

  /* ============================================================
     UTILITÁRIOS DE FORMATAÇÃO
     ============================================================ */

  /**
   * Formata número para Real Brasileiro.
   * @param {number|string} valor
   * @returns {string} Ex: "R$ 1.234,56" ou "—" se vazio
   */
  function formatarBRL(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  /**
   * Formata data ISO (yyyy-mm-dd ou yyyy-mm) para dd/mm/yyyy.
   * @param {string} dataISO
   * @returns {string} Ex: "15/03/2024" ou "—" se vazio
   */
  function formatarData(dataISO) {
    if (!dataISO) return "—";

    /* Trata formato yyyy-mm (mês de produção) */
    if (dataISO.length === 7) {
      const [ano, mes] = dataISO.split("-");
      return `${mes}/${ano}`;
    }

    /* Trata formato yyyy-mm-dd */
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Converte data formatada dd/mm/yyyy para ISO yyyy-mm-dd.
   * @param {string} dataFormatada
   * @returns {string}
   */
  function desformatarData(dataFormatada) {
    if (!dataFormatada || dataFormatada === "—") return "";
    const partes = dataFormatada.split("/");
    if (partes.length === 2) {
      /* Formato mm/yyyy */
      return `${partes[1]}-${partes[0]}`;
    }
    /* Formato dd/mm/yyyy */
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  /* ============================================================
     RENDERIZAÇÃO DE ABAS DE CONVÊNIOS
     ============================================================ */

  /**
   * Renderiza as abas de convênios no nav-convenios.
   * @param {Object} convenios - Objeto com todos os convênios
   * @param {string} ativoId - ID do convênio atualmente ativo
   */
  function renderizarAbas(convenios, ativoId) {
    const nav = document.getElementById("nav-convenios");
    const btnNovo = document.getElementById("btn-novo-convenio");

    /* Remove todos os containers de abas existentes, mantendo apenas o botão novo */
    const containersExistentes = nav.querySelectorAll(
      ".nav-convenios__aba-container",
    );
    containersExistentes.forEach((container) => container.remove());

    /* Renderiza cada convênio como aba */
    Object.keys(convenios).forEach((id) => {
      const convenio = convenios[id];

      /* Container da aba */
      const abaContainer = document.createElement("div");
      abaContainer.className = "nav-convenios__aba-container";

      /* Botão da aba */
      const aba = document.createElement("button");
      aba.type = "button";
      aba.className = "nav-convenios__aba";
      aba.dataset.convenioId = id;

      /* Nome do convênio */
      const nomeConvenio = document.createElement("span");
      nomeConvenio.className = "nav-convenios__aba-nome";
      nomeConvenio.textContent = convenio.nome;

      /* Percentual de imposto */
      const percentualInfo = document.createElement("span");
      percentualInfo.className = "nav-convenios__aba-percentual";
      percentualInfo.textContent = `${convenio.percentualImposto || 17.5}%`;

      aba.appendChild(nomeConvenio);
      aba.appendChild(percentualInfo);

      if (id === ativoId) {
        aba.classList.add("nav-convenios__aba--ativa");
        aba.setAttribute("aria-current", "true");
      }

      /* Botão de editar percentual */
      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "nav-convenios__btn-editar";
      btnEditar.dataset.convenioId = id;
      btnEditar.dataset.percentualAtual = convenio.percentualImposto || 17.5;
      btnEditar.setAttribute(
        "aria-label",
        `Editar percentual de imposto de ${convenio.nome}`,
      );
      btnEditar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;

      /* Botão de excluir tabela */
      const btnExcluir = document.createElement("button");
      btnExcluir.type = "button";
      btnExcluir.className = "nav-convenios__btn-excluir";
      btnExcluir.dataset.convenioId = id;
      btnExcluir.setAttribute("aria-label", `Excluir tabela ${convenio.nome}`);
      btnExcluir.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;

      abaContainer.appendChild(aba);
      abaContainer.appendChild(btnEditar);
      abaContainer.appendChild(btnExcluir);
      nav.insertBefore(abaContainer, btnNovo);
    });
  }

  /* ============================================================
     RENDERIZAÇÃO DE CARDS DE RESUMO
     ============================================================ */

  /**
   * Renderiza os 6 cards de resumo financeiro.
   * @param {Object} totais - Objeto com os totais calculados
   */
  function renderizarCards(totais) {
    console.log("🎴 renderizarCards - Totais recebidos:", totais);

    const container = document.getElementById("cards-resumo");
    console.log("📦 renderizarCards - Container encontrado:", container);

    const cards = [
      {
        titulo: "Produção Total",
        valor: formatarBRL(totais.producao || 0),
        descricao: "Valor total produzido",
        icone: Icones.graficoBarra,
        classe: "card-resumo--producao",
      },
      {
        titulo: "Faturado Bruto",
        valor: formatarBRL(totais.bruto || 0),
        descricao: "Total em notas fiscais",
        icone: Icones.dinheiro,
        classe: "card-resumo--faturamento",
      },
      {
        titulo: "Impostos",
        valor: formatarBRL(totais.impostos || 0),
        descricao: "Total de tributos",
        icone: Icones.dinheiro,
        classe: "",
      },
      {
        titulo: "Faturado Líquido",
        valor: formatarBRL(totais.liquido || 0),
        descricao: "Bruto menos impostos",
        icone: Icones.dinheiro,
        classe: "card-resumo--faturamento",
      },
      {
        titulo: "Recebido",
        valor: formatarBRL(totais.recebido || 0),
        descricao: "Já depositado em conta",
        icone: Icones.check,
        classe: "card-resumo--financeiro",
      },
      {
        titulo: "Pendente",
        valor: formatarBRL(totais.pendente || 0),
        descricao: "Aguardando recebimento",
        icone: Icones.atencao,
        classe: "card-resumo--pendente",
      },
    ];

    container.innerHTML = cards
      .map(
        (card) => `
      <article class="card-resumo ${card.classe}">
        <header class="card-resumo__cabecalho">
          <h3 class="card-resumo__titulo">${card.titulo}</h3>
          <div class="card-resumo__icone">
            ${card.icone}
          </div>
        </header>
        <p class="card-resumo__valor">${card.valor}</p>
        <p class="card-resumo__descricao">${card.descricao}</p>
      </article>
    `,
      )
      .join("");

    console.log("✅ renderizarCards - Cards renderizados com sucesso!");
    console.log(
      "📝 renderizarCards - HTML gerado:",
      container.innerHTML.substring(0, 200) + "...",
    );
  }

  /**
   * Renderiza os 4 cards de resumo da view de Repasses.
   * Chamada por repasses.js após calcular os totais.
   *
   * @param {Object} totais
   * @param {number} totais.totalProducao    - Soma de todos os valorBruto
   * @param {number} totais.totalRecebido    - Soma dos repasseMedico já recebidos
   * @param {number} totais.reembolsoClinica - Valor manual do campo de reembolso
   * @param {number} totais.liquidoReceber   - totalProducao - totalRecebido - reembolsoClinica
   */
  function renderizarCardsRepasse(totais) {
    console.log("🎴 renderizarCardsRepasse - Totais recebidos:", totais);

    const container = document.querySelector(".repasses-cards");
    console.log("📦 renderizarCardsRepasse - Container encontrado:", container);

    if (!container) {
      console.error(
        "❌ renderizarCardsRepasse - Container .repasses-cards não encontrado!",
      );
      return;
    }

    const cards = [
      {
        titulo: "Total Produção",
        valor: formatarBRL(totais.totalProducao || 0),
        descricao: "Soma de todos os valores brutos",
        icone: Icones.graficoBarra,
        classe: "card-resumo--producao",
      },
      {
        titulo: "Total Recebido",
        valor: formatarBRL(totais.totalRecebido || 0),
        descricao: "Repasse médico total",
        icone: Icones.check,
        classe: "card-resumo--financeiro",
      },
      {
        titulo: "Reembolso Clínica",
        valor: formatarBRL(totais.reembolsoClinica || 0),
        descricao: "Valor a descontar",
        icone: Icones.atencao,
        classe: "",
      },
      {
        titulo: "Líquido a Receber",
        valor: formatarBRL(totais.liquidoReceber || 0),
        descricao: "Produção - Recebido - Reembolso",
        icone: Icones.dinheiro,
        classe: "card-resumo--faturamento",
      },
    ];

    container.innerHTML = cards
      .map(
        (card) => `
      <article class="card-resumo ${card.classe}">
        <header class="card-resumo__cabecalho">
          <h3 class="card-resumo__titulo">${card.titulo}</h3>
          <div class="card-resumo__icone">
            ${card.icone}
          </div>
        </header>
        <p class="card-resumo__valor">${card.valor}</p>
        <p class="card-resumo__descricao">${card.descricao}</p>
      </article>
    `,
      )
      .join("");

    console.log("✅ renderizarCardsRepasse - Cards renderizados!");
    console.log(
      "📝 renderizarCardsRepasse - HTML gerado (primeiros 200 chars):",
      container.innerHTML.substring(0, 200) + "...",
    );
  }

  /* ============================================================
     RENDERIZAÇÃO DA TABELA
     ============================================================ */

  /**
   * Renderiza a tabela de registros do convênio ativo.
   * @param {Object} registros - Registros do convênio
   * @param {string} convenioId - ID do convênio
   * @param {string} convenioNome - Nome do convênio
   */
  function renderizarTabela(registros, convenioId, convenioNome) {
    const tbody = document.getElementById("corpo-tabela");
    const caption = document.getElementById("caption-convenio");

    caption.textContent = convenioNome;

    /* Se não há registros, mostrar mensagem e botão de adicionar */
    if (!registros || Object.keys(registros).length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align: center; padding: 2rem; color: var(--texto-desabilitado);">
            <p style="margin-bottom: 1rem;">Nenhum registro encontrado.</p>
            <button type="button" id="btn-adicionar-linha" class="btn-secundario">
              <span aria-hidden="true">${Icones.mais}</span>
              Adicionar primeiro registro
            </button>
          </td>
        </tr>
      `;

      /* Atualizar controles de paginação */
      document.getElementById("info-pagina").textContent = "Página 0 de 0";
      document.getElementById("btn-pagina-anterior").disabled = true;
      document.getElementById("btn-pagina-proxima").disabled = true;
      return;
    }

    /* Converter objeto em array e ordenar por data de criação */
    const registrosArray = Object.keys(registros)
      .map((id) => ({
        id,
        ...registros[id],
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    /* PAGINAÇÃO */
    const totalRegistros = registrosArray.length;
    const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);
    const inicio = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
    const fim = inicio + REGISTROS_POR_PAGINA;
    const registrosPagina = registrosArray.slice(inicio, fim);

    /* Renderizar apenas a página atual */
    tbody.innerHTML = registrosPagina
      .map(
        (registro) => `
      <tr data-registro-id="${registro.id}" data-convenio-id="${convenioId}">
        <!-- Produção -->
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="producao" data-tipo="month" role="textbox" aria-label="Mês de produção">
            ${formatarData(registro.producao || "")}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="nFatura" role="textbox" aria-label="Número da fatura">
            ${sanitizar(registro.nFatura) || "—"}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="dataProtocolo" data-tipo="date" role="textbox" aria-label="Data do protocolo">
            ${formatarData(registro.dataProtocolo || "")}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="valor" data-tipo="number" role="textbox" aria-label="Valor do protocolo">
            ${formatarBRL(registro.valor || 0)}
          </span>
        </td>
        
        <!-- Faturamento -->
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="nNF" role="textbox" aria-label="Número da nota fiscal">
            ${sanitizar(registro.nNF) || "—"}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="dataNF" data-tipo="date" role="textbox" aria-label="Data da nota fiscal">
            ${formatarData(registro.dataNF || "")}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="valorBruto" data-tipo="number" role="textbox" aria-label="Valor bruto">
            ${formatarBRL(registro.valorBruto || 0)}
          </span>
        </td>
        <td>
          <span class="celula-readonly" aria-label="Impostos calculados automaticamente">${formatarBRL(registro.impostos || 0)}</span>
        </td>
        <td>
          <span class="celula-readonly" aria-label="Valor líquido calculado automaticamente">${formatarBRL(registro.valorLiquido || 0)}</span>
        </td>
        
        <!-- Financeiro -->
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="valorRecebido" data-tipo="number" role="textbox" aria-label="Valor recebido">
            ${formatarBRL(registro.valorRecebido || 0)}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="dataRecebimento" data-tipo="date" role="textbox" aria-label="Data do recebimento">
            ${formatarData(registro.dataRecebimento || "")}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="observacoes" data-tipo="number" role="textbox" aria-label="Valor de observações">
            ${formatarBRL(registro.observacoes || 0)}
          </span>
        </td>
        <td>
          <span class="celula-editavel" contenteditable="true" data-campo="recurso" role="textbox" aria-label="Descrição do recurso">
            ${sanitizar(registro.recurso) || "—"}
          </span>
        </td>
        
        <!-- Ações -->
        <td>
          <div class="acoes-linha">
            <button type="button" class="btn-acao btn-acao--editar" data-acao="editar" aria-label="Editar registro completo">
              ${Icones.editar}
            </button>
            <button type="button" class="btn-acao btn-acao--excluir" data-acao="excluir" aria-label="Excluir registro">
              ${Icones.lixeira}
            </button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");

    /* Adicionar linha de adicionar novo */
    tbody.innerHTML += `
      <tr class="linha-adicionar">
        <td colspan="14" style="text-align: center; padding: 1rem;">
          <button type="button" id="btn-adicionar-linha" class="btn-secundario">
            <span aria-hidden="true">${Icones.mais}</span>
            Adicionar novo registro
          </button>
        </td>
      </tr>
    `;

    /* Atualizar controles de paginação */
    document.getElementById("info-pagina").textContent =
      `Página ${paginaAtual} de ${totalPaginas} (${totalRegistros} ${totalRegistros === 1 ? "registro" : "registros"})`;

    document.getElementById("btn-pagina-anterior").disabled = paginaAtual === 1;
    document.getElementById("btn-pagina-proxima").disabled =
      paginaAtual >= totalPaginas;
  }

  /**
   * Renderiza os totalizadores no rodapé da tabela.
   * @param {Object} totais - Totais calculados
   */
  function renderizarTotalizadores(totais) {
    const tfoot = document.getElementById("rodape-tabela");

    tfoot.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: right;"><strong>TOTAIS:</strong></td>
        <td><strong>${formatarBRL(totais.producao || 0)}</strong></td>
        <td colspan="2"></td>
        <td><strong>${formatarBRL(totais.bruto || 0)}</strong></td>
        <td><strong>${formatarBRL(totais.impostos || 0)}</strong></td>
        <td><strong>${formatarBRL(totais.liquido || 0)}</strong></td>
        <td><strong>${formatarBRL(totais.recebido || 0)}</strong></td>
        <td colspan="3"></td>
        <td></td>
      </tr>
    `;
  }

  /* ============================================================
     MODAL DE EDIÇÃO
     ============================================================ */

  /**
   * Abre o modal de edição com dados preenchidos.
   * @param {Object} registro - Dados do registro
   * @param {string} convenioId - ID do convênio
   * @param {string} registroId - ID do registro
   */
  function abrirModalEdicao(registro, convenioId, registroId) {
    const modal = document.getElementById("modal-edicao");
    const form = document.getElementById("form-edicao");

    /* Alterar título do modal */
    document.getElementById("modal-edicao-titulo").textContent =
      "Editar Registro";

    /* Alterar texto do botão de submit */
    document.getElementById("btn-salvar-edicao").textContent =
      "Salvar Alterações";

    /* Armazenar IDs no form para uso posterior */
    form.dataset.convenioId = convenioId;
    form.dataset.registroId = registroId;

    /* Preencher campos */
    document.getElementById("edicao-producao").value = registro.producao || "";
    document.getElementById("edicao-n-fatura").value = registro.nFatura || "";
    document.getElementById("edicao-data-protocolo").value =
      registro.dataProtocolo || "";
    document.getElementById("edicao-valor").value = registro.valor || "";
    document.getElementById("edicao-n-nf").value = registro.nNF || "";
    document.getElementById("edicao-data-nf").value = registro.dataNF || "";
    document.getElementById("edicao-valor-bruto").value =
      registro.valorBruto || "";
    document.getElementById("edicao-impostos").textContent = formatarBRL(
      registro.impostos || 0,
    );
    document.getElementById("edicao-valor-liquido").textContent = formatarBRL(
      registro.valorLiquido || 0,
    );
    document.getElementById("edicao-valor-recebido").value =
      registro.valorRecebido || "";
    document.getElementById("edicao-data-recebimento").value =
      registro.dataRecebimento || "";
    document.getElementById("edicao-observacoes").value =
      registro.observacoes || "";
    document.getElementById("edicao-recurso").value = registro.recurso || "";

    /* Mostrar botão de excluir */
    document.getElementById("btn-excluir-registro").hidden = false;

    modal.showModal();
  }

  /* ============================================================
     SISTEMA DE TOASTS
     ============================================================ */

  /**
   * Mostra uma notificação toast.
   * @param {string} mensagem - Texto da notificação
   * @param {string} tipo - 'sucesso', 'erro', 'aviso'
   * @param {number} duracao - Tempo em ms (padrão: 4000)
   */
  function mostrarToast(mensagem, tipo = "sucesso", duracao = 4000) {
    const areaToasts = document.getElementById("area-toasts");
    const id = `toast-${Date.now()}`;

    const icones = {
      sucesso: Icones.check,
      erro: Icones.atencao,
      aviso: Icones.atencao,
    };

    const toast = document.createElement("div");
    toast.id = id;
    toast.className = `toast toast--${tipo}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    toast.innerHTML = `
      <div class="toast__icone">${icones[tipo] || icones.sucesso}</div>
      <p class="toast__mensagem">${mensagem}</p>
      <button type="button" class="toast__fechar" aria-label="Fechar notificação">
        ${Icones.fechar}
      </button>
    `;

    areaToasts.appendChild(toast);

    /* Fechar ao clicar no botão */
    toast.querySelector(".toast__fechar").addEventListener("click", () => {
      removerToast(id);
    });

    /* Auto-remover após duração */
    setTimeout(() => {
      removerToast(id);
    }, duracao);
  }

  /**
   * Remove um toast da tela.
   * @param {string} id - ID do toast
   */
  function removerToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }
  }

  /* ============================================================
     NAVEGAÇÃO ENTRE TELAS
     ============================================================ */

  /**
   * Mostra a tela de login e oculta o sistema.
   */
  function mostrarTelaLogin() {
    document.getElementById("tela-login").classList.remove("oculto");
    document.getElementById("sistema").classList.add("oculto");
  }

  /**
   * Mostra o sistema e oculta a tela de login.
   * @param {Object} usuario - Objeto do usuário Firebase
   */
  function mostrarSistema(usuario) {
    document.getElementById("tela-login").classList.add("oculto");
    document.getElementById("sistema").classList.remove("oculto");

    /* Preencher e-mail do usuário */
    const emailSpans = document.querySelectorAll(
      "#usuario-email, #config-usuario-email",
    );
    emailSpans.forEach((span) => {
      span.textContent = usuario.email;
    });
  }

  /* ============================================================
     STATUS DE CONEXÃO
     ============================================================ */

  /**
   * Atualiza o indicador de conexão.
   * @param {boolean} online - true se conectado
   */
  function atualizarStatusConexao(online) {
    const indicador = document.getElementById("indicador-conexao");
    const texto = indicador.querySelector(".indicador-conexao__texto");
    const footerConexao = document.getElementById("footer-conexao");

    if (online) {
      indicador.classList.remove("indicador-conexao--offline");
      texto.textContent = "Online";
      footerConexao.textContent = "Conectado";
      document.getElementById("footer-separador").classList.remove("oculto");
    } else {
      indicador.classList.add("indicador-conexao--offline");
      texto.textContent = "Offline";
      footerConexao.textContent = "Sem conexão";
      document.getElementById("footer-separador").classList.add("oculto");
    }
  }

  /**
   * Atualiza o timestamp da última sincronização.
   */
  function atualizarUltimaSync() {
    const timeElement = document.getElementById("footer-ultima-sync");
    const agora = new Date();
    timeElement.setAttribute("datetime", agora.toISOString());
    timeElement.textContent = agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /* ============================================================
     LOADING SKELETON
     ============================================================ */

  /**
   * Mostra o skeleton de carregamento.
   */
  function iniciarSkeletonLoading() {
    document.getElementById("loading-tabela").classList.remove("oculto");
  }

  /**
   * Oculta o skeleton de carregamento.
   */
  function pararSkeletonLoading() {
    document.getElementById("loading-tabela").classList.add("oculto");
  }

  /* ============================================================
     EXPORTAÇÃO CSV
     ============================================================ */

  /**
   * Converte dados em CSV e faz download.
   * @param {Array} registros - Array de registros
   * @param {string} nomeArquivo - Nome do arquivo
   */
  function exportarCSV(registros, nomeArquivo) {
    const colunas = [
      "Produção",
      "Nº Fatura",
      "Data Protocolo",
      "Valor",
      "Nº NF",
      "Data NF",
      "Valor Bruto",
      "Impostos",
      "Valor Líquido",
      "Valor Recebido",
      "Data Recebimento",
      "Observações",
      "Recurso",
    ];

    let csv = colunas.join(";") + "\n";

    registros.forEach((registro) => {
      const linha = [
        formatarData(registro.producao || ""),
        registro.nFatura || "",
        formatarData(registro.dataProtocolo || ""),
        registro.valor || 0,
        registro.nNF || "",
        formatarData(registro.dataNF || ""),
        registro.valorBruto || 0,
        registro.impostos || 0,
        registro.valorLiquido || 0,
        registro.valorRecebido || 0,
        formatarData(registro.dataRecebimento || ""),
        registro.observacoes || 0,
        registro.recurso || "",
      ];
      csv += linha.join(";") + "\n";
    });

    /* Criar blob e fazer download */
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();

    mostrarToast("CSV exportado com sucesso!", "sucesso");
  }

  /* ============================================================
     EXPORTAÇÃO EXCEL
     ============================================================ */

  /**
   * Converte dados em Excel (.xlsx) e faz download.
   * @param {Array} registros - Array de registros
   * @param {string} nomeArquivo - Nome do arquivo
   * @param {string} nomeTabela - Nome da tabela/convênio
   */
  function exportarExcel(registros, nomeArquivo, nomeTabela = "Faturamento") {
    if (typeof XLSX === "undefined") {
      mostrarToast(
        "Biblioteca Excel não carregada. Recarregue a página.",
        "erro",
      );
      return;
    }

    /* Preparar dados para o Excel */
    const dados = registros.map((registro) => ({
      Produção: formatarData(registro.producao || ""),
      "Nº Fatura": registro.nFatura || "",
      "Data Protocolo": formatarData(registro.dataProtocolo || ""),
      Valor: registro.valor || 0,
      "Nº NF": registro.nNF || "",
      "Data NF": formatarData(registro.dataNF || ""),
      "Valor Bruto": registro.valorBruto || 0,
      Impostos: registro.impostos || 0,
      "Valor Líquido": registro.valorLiquido || 0,
      "Valor Recebido": registro.valorRecebido || 0,
      "Data Recebimento": formatarData(registro.dataRecebimento || ""),
      Observações: registro.observacoes || 0,
      Recurso: registro.recurso || "",
    }));

    /* Criar workbook e worksheet */
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);

    /* Ajustar largura das colunas */
    const colWidths = [
      { wch: 12 }, // Produção
      { wch: 12 }, // Nº Fatura
      { wch: 14 }, // Data Protocolo
      { wch: 12 }, // Valor
      { wch: 10 }, // Nº NF
      { wch: 12 }, // Data NF
      { wch: 12 }, // Valor Bruto
      { wch: 12 }, // Impostos
      { wch: 14 }, // Valor Líquido
      { wch: 14 }, // Valor Recebido
      { wch: 16 }, // Data Recebimento
      { wch: 14 }, // Observações
      { wch: 30 }, // Recurso
    ];
    ws["!cols"] = colWidths;

    /* Adicionar worksheet ao workbook */
    XLSX.utils.book_append_sheet(wb, ws, nomeTabela.substring(0, 31));

    /* Exportar arquivo */
    XLSX.writeFile(wb, nomeArquivo);
    mostrarToast("Excel exportado com sucesso!", "sucesso");
  }

  /* ============================================================
     EXPORTAÇÃO PDF
     ============================================================ */

  /**
   * Converte dados em PDF e faz download.
   * @param {Array} registros - Array de registros
   * @param {string} nomeArquivo - Nome do arquivo
   * @param {string} nomeTabela - Nome da tabela/convênio
   */
  function exportarPDF(registros, nomeArquivo, nomeTabela = "Faturamento") {
    if (typeof jspdf === "undefined" || typeof jspdf.jsPDF === "undefined") {
      mostrarToast(
        "Biblioteca PDF não carregada. Recarregue a página.",
        "erro",
      );
      return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    /* Adicionar título */
    doc.setFontSize(16);
    doc.text(`Relatório de Faturamento - ${nomeTabela}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    /* Preparar dados da tabela */
    const colunas = [
      "Produção",
      "Nº Fatura",
      "Data Prot.",
      "Valor",
      "Nº NF",
      "Data NF",
      "Vl. Bruto",
      "Impostos",
      "Vl. Líquido",
      "Recebido",
      "Data Receb.",
      "Obs.",
    ];

    const linhas = registros.map((registro) => [
      formatarData(registro.producao || ""),
      registro.nFatura || "",
      formatarData(registro.dataProtocolo || ""),
      formatarBRL(registro.valor || 0),
      registro.nNF || "",
      formatarData(registro.dataNF || ""),
      formatarBRL(registro.valorBruto || 0),
      formatarBRL(registro.impostos || 0),
      formatarBRL(registro.valorLiquido || 0),
      formatarBRL(registro.valorRecebido || 0),
      formatarData(registro.dataRecebimento || ""),
      registro.observacoes || 0,
    ]);

    /* Adicionar tabela usando autoTable */
    doc.autoTable({
      head: [colunas],
      body: linhas,
      startY: 28,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 28, left: 14, right: 14 },
    });

    /* Salvar PDF */
    doc.save(nomeArquivo);
    mostrarToast("PDF exportado com sucesso!", "sucesso");
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */

  return {
    renderizarAbas,
    renderizarCards,
    renderizarCardsRepasse,
    renderizarTabela,
    renderizarTotalizadores,
    abrirModalEdicao,
    mostrarToast,
    mostrarTelaLogin,
    mostrarSistema,
    atualizarStatusConexao,
    atualizarUltimaSync,
    iniciarSkeletonLoading,
    pararSkeletonLoading,
    formatarBRL,
    formatarData,
    desformatarData,
    exportarCSV,
    exportarExcel,
    exportarPDF,
    getPaginaAtual,
    resetarPagina,
    irParaPagina,
    Icones,
  };
})();
