/**
 * repasses.js
 * Gerencia a view de Repasses Médicos.
 *
 * Responsabilidades:
 *   - Renderizar seletores de médico e mês
 *   - Carregar e exibir a tabela de repasse do médico/mês selecionado
 *   - Sincronizar valorLiquidoOrigem com os dados de faturamento
 *   - Controlar o modal de lançamento avulso
 *   - Calcular partilha (clínica × médico) em tempo real
 *
 * Depende de: db.js (window.Db), ui.js (window.Ui, Icones)
 * Expõe: window.Repasses
 *
 * NÃO acessa firebaseDb diretamente — todas as operações passam por db.js.
 */

window.Repasses = (() => {
  "use strict";

  /* ============================================================
     ESTADO INTERNO DA VIEW
     ============================================================ */

  /** @type {string|null} ID do médico atualmente selecionado */
  let medicoAtivoId = null;

  /** @type {string|null} Mês/ano atualmente selecionado — formato "YYYY-MM" */
  let mesAnoAtivo = null;

  /** @type {Object} Snapshot dos dados de repasse do médico/mês ativo */
  let dadosAtivos = {};

  /** @type {boolean} Flag para evitar inicialização múltipla */
  let jaInicializado = false;

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */

  /**
   * Inicializa a view de repasses.
   * Chamada por app.js quando o usuário clica na aba Repasses.
   * Popula os seletores e registra os eventos da view.
   */
  function inicializar() {
    console.log("🏥 Inicializando módulo de Repasses...");
    console.log("📊 Estado atual - jaInicializado:", jaInicializado);

    // Popula o seletor de meses (sempre atualiza)
    popularSeletorMeses();

    // Renderiza os cards zerados na inicialização
    console.log("🎴 Renderizando cards iniciais zerados...");
    Ui.renderizarCardsRepasse({
      totalProducao: 0,
      totalRecebido: 0,
      reembolsoClinica: 0,
      liquidoReceber: 0,
    });

    // Registrar eventos (apenas uma vez)
    if (!jaInicializado) {
      jaInicializado = true;

      console.log("🔥 Configurando listener do Firebase para médicos...");

      // Carrega a lista de médicos do Firebase
      Db.ouvirMedicos((medicos) => {
        console.log("🔔 Callback ouvirMedicos disparado!");
        popularSeletorMedicos(medicos);
      });

      // Registrar eventos
      registrarEventos();
    } else {
      console.log("⏭️ Módulo já inicializado anteriormente");
    }
  }

  /**
   * Registra todos os event listeners da view de repasses.
   */
  function registrarEventos() {
    // Botão carregar repasse
    document
      .getElementById("btn-carregar-repasse")
      .addEventListener("click", aoClicarCarregar);

    // Campo de reembolso clínica
    document
      .getElementById("campo-reembolso-clinica")
      .addEventListener("change", aoAlterarReembolso);

    // Botão novo avulso
    document
      .getElementById("btn-novo-avulso")
      .addEventListener("click", abrirModalNovoAvulso);

    // Form de avulso
    document
      .getElementById("form-avulso")
      .addEventListener("submit", aoSubmeterAvulso);

    // Campos do form de avulso para cálculo em tempo real
    const camposCalculo = [
      "avulso-valor-bruto",
      "avulso-impostos",
      "avulso-custos-pacotes",
      "avulso-taxas-cartao",
      "avulso-perc-clinica",
      "avulso-perc-medico",
    ];

    camposCalculo.forEach((id) => {
      const campo = document.getElementById(id);
      if (campo) {
        campo.addEventListener("input", calcularValoresModalAvulso);
      }
    });

    // Mostrar/ocultar campo de observação de parcelas
    document
      .getElementById("avulso-forma-pagamento")
      .addEventListener("change", (e) => {
        const grupoObs = document.getElementById("grupo-obs-parcelas");
        grupoObs.hidden = e.target.value !== "parcelas";
      });

    // Botões de fechar modal
    const botoesFecharAvulso = document.querySelectorAll(
      "#modal-avulso .modal__fechar",
    );
    console.log(
      "🔘 Botões de fechar modal avulso encontrados:",
      botoesFecharAvulso.length,
    );
    botoesFecharAvulso.forEach((btn) => {
      btn.addEventListener("click", fecharModalAvulso);
      console.log(
        "  ✅ Listener adicionado ao botão:",
        btn.getAttribute("aria-label") || btn.textContent.trim(),
      );
    });

    // Fechar modal ao clicar fora (backdrop)
    document.getElementById("modal-avulso").addEventListener("click", (e) => {
      if (e.target.id === "modal-avulso") {
        console.log("🖱️ Clique no backdrop detectado");
        fecharModalAvulso();
      }
    });

    // Botão gerenciar médicos
    document
      .getElementById("btn-gerenciar-medicos")
      .addEventListener("click", abrirModalGerenciarMedicos);

    // Botão adicionar médico no modal
    document
      .getElementById("btn-adicionar-medico")
      .addEventListener("click", aoAdicionarMedico);

    // Permitir adicionar médico com Enter
    document
      .getElementById("input-nome-medico")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          aoAdicionarMedico();
        }
      });

    // Botões de fechar modal de médicos
    const botoesFecharMedicos = document.querySelectorAll(
      "#modal-gerenciar-medicos .modal__fechar",
    );
    console.log(
      "🔘 Botões de fechar modal médicos encontrados:",
      botoesFecharMedicos.length,
    );
    botoesFecharMedicos.forEach((btn) => {
      btn.addEventListener("click", fecharModalGerenciarMedicos);
      console.log(
        "  ✅ Listener adicionado ao botão:",
        btn.getAttribute("aria-label") || btn.textContent.trim(),
      );
    });

    // Fechar modal de médicos ao clicar fora (backdrop)
    document
      .getElementById("modal-gerenciar-medicos")
      .addEventListener("click", (e) => {
        if (e.target.id === "modal-gerenciar-medicos") {
          console.log("🖱️ Clique no backdrop do modal médicos detectado");
          fecharModalGerenciarMedicos();
        }
      });
  }

  /**
   * Popula o <select> de médicos com os dados do Firebase.
   * @param {Object} medicos - Snapshot de repasses/medicos
   */
  function popularSeletorMedicos(medicos) {
    const select = document.getElementById("select-medico");

    if (!select) {
      console.error("❌ Elemento select-medico não encontrado no DOM!");
      return;
    }

    console.log("📋 Populando seletor de médicos:", medicos);
    console.log("📊 Tipo de dados recebido:", typeof medicos);
    console.log("📊 É objeto?", medicos && typeof medicos === "object");
    console.log("📊 Chaves:", medicos ? Object.keys(medicos) : "null");

    // Limpa opções existentes (exceto a primeira)
    while (select.options.length > 1) {
      select.remove(1);
    }

    if (!medicos || Object.keys(medicos).length === 0) {
      console.log("⚠️ Nenhum médico encontrado, adicionando médicos padrão...");
      // Inicializa com médicos padrão se não houver nenhum
      const medicosPadrao = [
        "Dr. Dante",
        "Dr. Alberto",
        "Dra. Fabiana",
        "Dra. Mariza",
        "Dra. Mariana",
      ];

      console.log("➕ Adicionando", medicosPadrao.length, "médicos padrão...");

      // Adiciona todos os médicos padrão
      Promise.all(
        medicosPadrao.map((nome) => {
          console.log("  ➕ Adicionando:", nome);
          return Db.adicionarMedico(nome);
        }),
      )
        .then(() => {
          console.log("✅ Médicos padrão adicionados com sucesso");
        })
        .catch((erro) => {
          console.error("❌ Erro ao adicionar médicos padrão:", erro);
          console.error("❌ Stack:", erro.stack);
        });
      return;
    }

    // Adiciona as opções dos médicos
    let contador = 0;
    Object.entries(medicos).forEach(([id, dados]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = dados.nome || "Sem nome";
      select.appendChild(option);
      contador++;
      console.log(`  ✅ Adicionado ao select: ${dados.nome} (ID: ${id})`);
    });

    console.log(`✅ ${contador} médico(s) carregado(s) no select`);
  }

  /**
   * Popula o <select> de mês/ano com os últimos 24 meses.
   * Mês corrente selecionado por padrão.
   */
  function popularSeletorMeses() {
    const select = document.getElementById("select-mes-repasse");
    const hoje = new Date();

    // Limpa opções existentes
    select.innerHTML = "";

    // Gera os últimos 24 meses
    for (let i = 0; i < 24; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      const mesNome = data.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

      const option = document.createElement("option");
      option.value = mesAno;
      option.textContent = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);

      if (i === 0) option.selected = true; // Mês corrente selecionado

      select.appendChild(option);
    }
  }

  /* ============================================================
     CARREGAMENTO DE DADOS
     ============================================================ */

  /**
   * Handler do botão "Carregar".
   * Valida seleções e carrega o repasse.
   */
  function aoClicarCarregar() {
    const medicoId = document.getElementById("select-medico").value;
    const mesAno = document.getElementById("select-mes-repasse").value;

    if (!medicoId) {
      Ui.mostrarToast("Selecione um médico", "aviso");
      return;
    }

    carregarRepasse(medicoId, mesAno);
  }

  /**
   * Carrega os dados de repasse do médico e mês selecionados.
   * Combina dados de repasses/lancamentos com faturamento/tabelas.
   *
   * @param {string} medicoId
   * @param {string} mesAno - Formato "YYYY-MM"
   */
  function carregarRepasse(medicoId, mesAno) {
    console.log("🔄 carregarRepasse - Iniciando carregamento...");
    console.log("👨‍⚕️ carregarRepasse - Médico ID:", medicoId);
    console.log("📅 carregarRepasse - Mês/Ano:", mesAno);

    // Atualiza estado
    medicoAtivoId = medicoId;
    mesAnoAtivo = mesAno;

    // Mostra loading
    Ui.iniciarSkeletonLoading("loading-repasse");

    // Para de ouvir o repasse anterior, se houver
    if (medicoAtivoId && mesAnoAtivo) {
      Db.pararOuvirRepasse(medicoAtivoId, mesAnoAtivo);
    }

    // Escuta mudanças no repasse
    console.log("👂 carregarRepasse - Iniciando listener do Firebase...");
    Db.ouvirRepasse(medicoId, mesAno, (dados) => {
      console.log("🔥 carregarRepasse - Callback do Firebase disparado!");
      console.log("📦 carregarRepasse - Dados recebidos do Firebase:", dados);

      dadosAtivos = dados;
      renderizarRepasse(dados);
      Ui.pararSkeletonLoading("loading-repasse");
    });

    // Carrega dados de faturamento para sincronizar valores de convênio
    Db.ouvirTabelas((dadosFaturamento) => {
      sincronizarValoresConvenio(medicoId, mesAno, dadosFaturamento);
    });

    // Atualiza caption da tabela
    const nomeSelect = document.getElementById("select-medico");
    const nomeTexto = nomeSelect.options[nomeSelect.selectedIndex].text;
    document.getElementById("caption-medico-repasse").textContent = nomeTexto;

    const mesSelect = document.getElementById("select-mes-repasse");
    const mesTexto = mesSelect.options[mesSelect.selectedIndex].text;
    document.getElementById("caption-mes-repasse").textContent = mesTexto;
    document
      .getElementById("caption-mes-repasse")
      .setAttribute("datetime", mesAno);
  }

  /**
   * Sincroniza o campo valorLiquidoOrigem de cada convênio no repasse
   * com o valor líquido mais recente do módulo de faturamento.
   * Chamada por app.js toda vez que faturamento/tabelas for atualizado.
   *
   * @param {string} medicoId
   * @param {string} mesAno
   * @param {Object} dadosFaturamento - Snapshot completo de faturamento/tabelas
   */
  function sincronizarValoresConvenio(medicoId, mesAno, dadosFaturamento) {
    if (!dadosFaturamento) return;

    Object.entries(dadosFaturamento).forEach(([convenioId, convenio]) => {
      if (!convenio.registros) return;

      // Busca registros do mês específico
      const registrosDoMes = Object.values(convenio.registros).filter((r) => {
        return r.mesProducao && r.mesProducao.startsWith(mesAno);
      });

      if (registrosDoMes.length === 0) return;

      // Soma os valores líquidos deste convênio no mês
      const valorLiquidoOrigem = registrosDoMes.reduce((soma, r) => {
        return soma + (parseFloat(r.valorLiquido) || 0);
      }, 0);

      // Salva no Firebase (cria a estrutura se não existir)
      Db.salvarConvenioRepasse(medicoId, mesAno, convenioId, {
        nomeConvenio: convenio.nome,
        valorLiquidoOrigem: parseFloat(valorLiquidoOrigem.toFixed(2)),
        impostos: 0,
        custosPacotes: 0,
        taxasCartao: 0,
        percentualClinica: 40,
        percentualMedico: 60,
      });
    });
  }

  /* ============================================================
     RENDERIZAÇÃO
     ============================================================ */

  /**
   * Renderiza toda a tabela de repasse.
   * @param {Object} dados - Snapshot completo do repasse
   */
  function renderizarRepasse(dados) {
    console.log("🖼️ renderizarRepasse - Dados recebidos:", dados);

    const tbody = document.getElementById("corpo-tabela-repasse");
    tbody.innerHTML = "";

    // Busca dados de faturamento uma vez (sem listener)
    console.log("📡 renderizarRepasse - Buscando tabelas de faturamento...");
    Db.obterTabelas().then((dadosFaturamento) => {
      console.log("✅ renderizarRepasse - Tabelas de faturamento recebidas");

      renderizarLinhasConvenio(dados.convenios || {}, dadosFaturamento);
      renderizarLinhasAvulsas(dados.avulsos || {});

      // Atualiza totalizadores
      const linhas = tbody.querySelectorAll("tr");
      console.log(
        "📋 renderizarRepasse - Número de linhas renderizadas:",
        linhas.length,
      );

      if (linhas.length === 0) {
        console.log(
          "⚠️ renderizarRepasse - NENHUMA LINHA RENDERIZADA! Tabela vazia.",
        );
        // Renderiza cards zerados
        Ui.renderizarCardsRepasse({
          totalProducao: 0,
          totalRecebido: 0,
          reembolsoClinica: 0,
          liquidoReceber: 0,
        });
      } else {
        renderizarTotalizadores(linhas);
        // Atualiza cards
        console.log(
          "🎴 renderizarRepasse - Chamando calcularEAtualizarCards...",
        );
        calcularEAtualizarCards(linhas, dados.reembolsoClinica || 0);
      }

      // Atualiza campo de reembolso
      document.getElementById("campo-reembolso-clinica").value =
        dados.reembolsoClinica || 0;
    });
  }

  /**
   * Renderiza as linhas fixas de convênio na tabela.
   * Uma linha por convênio cadastrado no sistema.
   *
   * @param {Object} convenios   - Dados de repasses/lancamentos/{id}/{mes}/convenios
   * @param {Object} faturamento - Snapshot de faturamento/tabelas (para puxar valorLiquido)
   */
  function renderizarLinhasConvenio(convenios, faturamento) {
    console.log("📋 renderizarLinhasConvenio - Iniciando...");
    console.log("  📦 Convênios recebidos:", convenios);
    console.log(
      "  📊 Faturamento recebido:",
      faturamento ? Object.keys(faturamento).length + " convênios" : "null",
    );

    const tbody = document.getElementById("corpo-tabela-repasse");

    if (!faturamento) {
      console.log(
        "  ⚠️ renderizarLinhasConvenio - Faturamento vazio, nenhuma linha será renderizada",
      );
      return;
    }

    let linhasRenderizadas = 0;

    // Para cada convênio cadastrado no sistema
    Object.entries(faturamento).forEach(([convenioId, convenio]) => {
      const dadosConvenio = convenios[convenioId] || {};
      const temDados = dadosConvenio.valorLiquidoOrigem > 0;

      console.log(
        `  📝 Processando convênio: ${convenio.nome} (ID: ${convenioId})`,
      );
      console.log(
        `    💰 valorLiquidoOrigem: ${dadosConvenio.valorLiquidoOrigem || 0}`,
      );
      console.log(`    ✅ temDados: ${temDados}`);

      // Sempre permitir edição, mesmo sem dados
      const editavel = "true";

      console.log(
        `[Repasses] Convênio ${convenio.nome}: temDados=${temDados}, editavel=${editavel}`,
      );

      const tr = document.createElement("tr");
      tr.className = temDados
        ? "linha-repasse--com-dados"
        : "linha-repasse--sem-dados";
      tr.dataset.tipo = "convenio";
      tr.dataset.convenioId = convenioId;

      // Calcula valores
      const valorBruto = dadosConvenio.valorLiquidoOrigem || 0;
      const impostos = dadosConvenio.impostos || 0;
      const custosPacotes = dadosConvenio.custosPacotes || 0;
      const taxasCartao = dadosConvenio.taxasCartao || 0;
      const valorLiquido = calcularLiquidoRepasse(
        valorBruto,
        impostos,
        custosPacotes,
        taxasCartao,
      );

      const percClinica = dadosConvenio.percentualClinica || 40;
      const percMedico = dadosConvenio.percentualMedico || 60;
      const partilha = calcularPartilha(valorLiquido, percClinica, percMedico);

      console.log(`    💵 Valores calculados:`, {
        valorBruto,
        impostos,
        custosPacotes,
        taxasCartao,
        valorLiquido,
        repasseClinica: partilha.repasseClinica,
        repasseMedico: partilha.repasseMedico,
      });

      tr.innerHTML = `
        <td><span class="celula-label">Convênio</span><span class="celula-valor">${convenio.nome}</span></td>
        <td><span class="celula-label">Mês Prod.</span><span class="celula-valor">${mesAnoAtivo}</span></td>
        <td><span class="celula-label">Valor Bruto</span><span class="celula-editavel celula-valor" data-campo="valorBruto" contenteditable="${editavel}">${Ui.formatarBRL(valorBruto)}</span></td>
        <td><span class="celula-label">Impostos</span><span class="celula-editavel celula-valor" data-campo="impostos" data-tipo="percentual" contenteditable="${editavel}">${impostos.toFixed(2)}%</span></td>
        <td><span class="celula-label">Custos/Pacotes</span><span class="celula-editavel celula-valor" data-campo="custosPacotes" contenteditable="${editavel}">${Ui.formatarBRL(custosPacotes)}</span></td>
        <td><span class="celula-label">Taxas Cartão</span><span class="celula-editavel celula-valor" data-campo="taxasCartao" data-tipo="percentual" contenteditable="${editavel}">${taxasCartao.toFixed(2)}%</span></td>
        <td><span class="celula-label">Valor Líquido</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(valorLiquido)}</span></td>
        <td><span class="celula-label">Rep. Clínica</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(partilha.repasseClinica)}</span></td>
        <td><span class="celula-label">Rep. Médico</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(partilha.repasseMedico)}</span></td>
        <td></td>
      `;

      // Event listeners para células editáveis
      tr.querySelectorAll(".celula-editavel").forEach((celula) => {
        console.log(
          `[Repasses] Adicionando listener em célula editável:`,
          celula.dataset.campo,
          `contenteditable=${celula.contentEditable}`,
        );

        celula.addEventListener("blur", (e) => {
          console.log(
            `[Repasses] Evento blur disparado em:`,
            e.target.dataset.campo,
          );
          aoEditarCelulaConvenio(e, convenioId);
        });

        celula.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.target.blur();
          }
        });

        celula.addEventListener("click", (e) => {
          console.log(
            `[Repasses] Clique em célula editável:`,
            e.target.dataset.campo,
            `contentEditable=${e.target.contentEditable}`,
          );
        });
      });

      tbody.appendChild(tr);
      linhasRenderizadas++;
      console.log(`  ✅ Linha ${linhasRenderizadas} adicionada ao tbody`);
    });

    console.log(
      `✅ renderizarLinhasConvenio - Total de ${linhasRenderizadas} linhas renderizadas`,
    );
  }

  /**
   * Renderiza as linhas de lançamentos avulsos na tabela.
   * @param {Object} avulsos - Dados de repasses/lancamentos/{id}/{mes}/avulsos
   */
  function renderizarLinhasAvulsas(avulsos) {
    const tbody = document.getElementById("corpo-tabela-repasse");

    if (!avulsos) return;

    Object.entries(avulsos).forEach(([avulsoId, dados]) => {
      const tr = document.createElement("tr");
      tr.className = "linha-repasse--avulsa";
      tr.dataset.tipo = "avulso";
      tr.dataset.avulsoId = avulsoId;

      // Monta descrição com tag de categoria
      const tagCategoria = `<span class="tag-categoria tag-categoria--${dados.categoria}">${formatarCategoria(dados.categoria)}</span>`;
      const descricaoCompleta = `${dados.descricao} ${tagCategoria}`;

      // Observação (sem parênteses, pois agora é coluna dedicada)
      const observacao = dados.observacaoParcelas || "";

      const valorBruto = dados.valorBruto || 0;
      const impostos = dados.impostos || 0;
      const custosPacotes = dados.custosPacotes || 0;
      const taxasCartao = dados.taxasCartao || 0;
      const valorLiquido = dados.valorLiquidoFinal || 0;

      const percClinica = dados.percentualClinica || 0;
      const percMedico = dados.percentualMedico || 0;
      const repasseClinica = dados.repasseClinica || 0;
      const repasseMedico = dados.repasseMedico || 0;

      tr.innerHTML = `
        <td><span class="celula-label">Descrição</span><span class="celula-valor">${descricaoCompleta}${observacao ? ` (${observacao})` : ""}</span></td>
        <td><span class="celula-label">Mês Prod.</span><span class="celula-valor">${mesAnoAtivo}</span></td>
        <td><span class="celula-label">Valor Bruto</span><span class="celula-valor">${Ui.formatarBRL(valorBruto)}</span></td>
        <td><span class="celula-label">Impostos</span><span class="celula-valor">${impostos.toFixed(2)}%</span></td>
        <td><span class="celula-label">Custos/Pacotes</span><span class="celula-valor">${Ui.formatarBRL(custosPacotes)}</span></td>
        <td><span class="celula-label">Taxas Cartão</span><span class="celula-valor">${taxasCartao.toFixed(2)}%</span></td>
        <td><span class="celula-label">Valor Líquido</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(valorLiquido)}</span></td>
        <td><span class="celula-label">Rep. Clínica</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(repasseClinica)}</span></td>
        <td><span class="celula-label">Rep. Médico</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(repasseMedico)}</span></td>
        <td class="celula-acoes">
          <button type="button" class="btn-icone btn-editar-avulso" title="Editar" aria-label="Editar lançamento"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button type="button" class="btn-icone btn-excluir-avulso" title="Excluir" aria-label="Excluir lançamento"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </td>
      `;

      // Event listeners dos botões de ação
      tr.querySelector(".btn-editar-avulso").addEventListener("click", () => {
        abrirModalEdicaoAvulso(avulsoId, dados);
      });

      tr.querySelector(".btn-excluir-avulso").addEventListener("click", () => {
        excluirAvulso(avulsoId);
      });

      tbody.appendChild(tr);
    });
  }

  /**
   * Renderiza o <tfoot> com os totalizadores da tabela.
   * @param {NodeList} linhas - Todas as <tr> do <tbody>
   */
  function renderizarTotalizadores(linhas) {
    const tfoot = document.getElementById("rodape-tabela-repasse");

    let totais = {
      valorBruto: 0,
      impostos: 0,
      custosPacotes: 0,
      taxasCartao: 0,
      valorLiquido: 0,
      repasseClinica: 0,
      repasseMedico: 0,
    };

    linhas.forEach((linha) => {
      const celulas = linha.querySelectorAll("td");
      if (celulas.length < 9) return;

      // Pegar valores dos spans .celula-valor dentro das células
      const getValor = (index) => {
        const span = celulas[index].querySelector(".celula-valor");
        return span ? parseMoeda(span.textContent) : 0;
      };

      totais.valorBruto += getValor(2);
      totais.impostos += getValor(3);
      totais.custosPacotes += getValor(4);
      totais.taxasCartao += getValor(5);
      totais.valorLiquido += getValor(6);
      totais.repasseClinica += getValor(7);
      totais.repasseMedico += getValor(8);
    });

    tfoot.innerHTML = `
      <tr class="totalizadores">
        <th scope="row" colspan="2">TOTAIS</th>
        <td class="totalizador-valor"><span class="celula-label">Valor Bruto</span><span class="celula-valor">${Ui.formatarBRL(totais.valorBruto)}</span></td>
        <td class="totalizador-valor"><span class="celula-label">Impostos</span><span class="celula-valor">—</span></td>
        <td class="totalizador-valor"><span class="celula-label">Custos/Pacotes</span><span class="celula-valor">${Ui.formatarBRL(totais.custosPacotes)}</span></td>
        <td class="totalizador-valor"><span class="celula-label">Taxas Cartão</span><span class="celula-valor">—</span></td>
        <td class="totalizador-valor"><span class="celula-label">Valor Líquido</span><span class="celula-valor">${Ui.formatarBRL(totais.valorLiquido)}</span></td>
        <td class="totalizador-valor"><span class="celula-label">Rep. Clínica</span><span class="celula-valor">${Ui.formatarBRL(totais.repasseClinica)}</span></td>
        <td class="totalizador-valor"><span class="celula-label">Rep. Médico</span><span class="celula-valor">${Ui.formatarBRL(totais.repasseMedico)}</span></td>
        <td></td>
      </tr>
    `;
  }

  /**
   * Calcula os totais e atualiza os 4 cards de resumo acima da tabela.
   * @param {NodeList} linhas - Todas as <tr> do <tbody>
   * @param {number} reembolsoClinica
   */
  function calcularEAtualizarCards(linhas, reembolsoClinica) {
    console.log("📊 calcularEAtualizarCards - Iniciando cálculo...");
    console.log(
      "📋 calcularEAtualizarCards - Número de linhas:",
      linhas.length,
    );
    console.log(
      "💰 calcularEAtualizarCards - Reembolso clínica:",
      reembolsoClinica,
    );

    let totalProducao = 0;
    let totalRecebido = 0;

    linhas.forEach((linha, indexLinha) => {
      const celulas = linha.querySelectorAll("td");
      console.log(
        `  📄 Linha ${indexLinha}: ${celulas.length} células encontradas`,
      );

      if (celulas.length < 9) {
        console.log(`  ⚠️ Linha ${indexLinha} ignorada - menos de 9 células`);
        return;
      }

      // Pegar valores dos spans .celula-valor
      const getValor = (index) => {
        const span = celulas[index].querySelector(".celula-valor");
        const texto = span ? span.textContent : "";
        const valor = span ? parseMoeda(texto) : 0;
        console.log(`    🔢 Célula[${index}]: "${texto}" → ${valor}`);
        return valor;
      };

      const valorBruto = getValor(2); // Valor bruto (coluna 3)
      const repasseMedico = getValor(8); // Repasse médico (coluna 9)

      console.log(
        `  ➕ Linha ${indexLinha}: valorBruto=${valorBruto}, repasseMedico=${repasseMedico}`,
      );

      totalProducao += valorBruto;
      totalRecebido += repasseMedico;
    });

    const liquidoReceber = totalProducao - totalRecebido - reembolsoClinica;

    console.log("✅ calcularEAtualizarCards - Totais calculados:", {
      totalProducao,
      totalRecebido,
      reembolsoClinica,
      liquidoReceber,
    });

    console.log(
      "🚀 calcularEAtualizarCards - Chamando Ui.renderizarCardsRepasse...",
    );
    Ui.renderizarCardsRepasse({
      totalProducao,
      totalRecebido,
      reembolsoClinica,
      liquidoReceber,
    });
  }

  /* ============================================================
     EDIÇÃO INLINE
     ============================================================ */

  /**
   * Handler de edição de célula de convênio.
   * @param {Event} evento
   * @param {string} convenioId
   */
  function aoEditarCelulaConvenio(evento, convenioId) {
    const celula = evento.target;
    const campo = celula.dataset.campo;
    let valor = celula.textContent.trim();

    console.log(
      `[Repasses] aoEditarCelulaConvenio - convenioId: ${convenioId}, campo: ${campo}, valor original: "${valor}"`,
    );

    // Remove formatação de moeda/percentual
    valor = valor.replace(/[R$\s.%]/g, "").replace(",", ".");
    valor = parseFloat(valor) || 0;

    console.log(`[Repasses] Valor parseado: ${valor}`);

    salvarCelulaConvenio(convenioId, campo, valor);
  }

  /**
   * Salva uma célula editada de linha de convênio no Firebase.
   * Recalcula valorLiquidoFinal, repasseClinica e repasseMedico antes de salvar.
   *
   * @param {string} convenioId
   * @param {string} campo      - Nome do campo alterado
   * @param {number} valor
   */
  function salvarCelulaConvenio(convenioId, campo, valor) {
    if (!medicoAtivoId || !mesAnoAtivo) return;

    console.log(
      `[Repasses] salvarCelulaConvenio - convenioId: ${convenioId}, campo: ${campo}, valor: ${valor}`,
    );

    // Busca dados atuais do convênio
    const dadosConvenio = dadosAtivos.convenios?.[convenioId] || {};

    // Mapear campo "valorBruto" para "valorLiquidoOrigem" (campo real no Firebase)
    if (campo === "valorBruto") {
      campo = "valorLiquidoOrigem";
      console.log(`[Repasses] Mapeando valorBruto → valorLiquidoOrigem`);
    }

    // Atualiza o campo alterado
    dadosConvenio[campo] = valor;

    console.log(`[Repasses] dadosConvenio após edição:`, dadosConvenio);

    // Trata ajuste de percentuais
    if (campo === "percentualClinica" || campo === "percentualMedico") {
      const ajuste = ajustarPercentuais(
        campo === "percentualClinica" ? "clinica" : "medico",
        valor,
      );
      dadosConvenio.percentualClinica = ajuste.percentualClinica;
      dadosConvenio.percentualMedico = ajuste.percentualMedico;
    }

    // Recalcula valores
    const valorLiquido = calcularLiquidoRepasse(
      dadosConvenio.valorLiquidoOrigem || 0,
      dadosConvenio.impostos || 0,
      dadosConvenio.custosPacotes || 0,
      dadosConvenio.taxasCartao || 0,
    );

    console.log(
      `[Repasses] Valores para cálculo - valorLiquidoOrigem: ${dadosConvenio.valorLiquidoOrigem}, impostos: ${dadosConvenio.impostos}, custos: ${dadosConvenio.custosPacotes}, taxas: ${dadosConvenio.taxasCartao}`,
    );
    console.log(`[Repasses] Valor líquido calculado: ${valorLiquido}`);

    const partilha = calcularPartilha(
      valorLiquido,
      dadosConvenio.percentualClinica || 60,
      dadosConvenio.percentualMedico || 40,
    );

    console.log(
      `[Repasses] Partilha calculada - Clínica: ${partilha.repasseClinica}, Médico: ${partilha.repasseMedico}`,
    );

    const dadosParaSalvar = {
      ...dadosConvenio,
      valorLiquidoFinal: valorLiquido,
      repasseClinica: partilha.repasseClinica,
      repasseMedico: partilha.repasseMedico,
    };

    console.log(
      `[Repasses] Dados completos para salvar no Firebase:`,
      dadosParaSalvar,
    );

    // Salva no Firebase
    Db.salvarConvenioRepasse(
      medicoAtivoId,
      mesAnoAtivo,
      convenioId,
      dadosParaSalvar,
    );

    Ui.mostrarToast("Valor atualizado", "sucesso");
  }

  /* ============================================================
     CÁLCULOS
     ============================================================ */

  /**
   * Calcula o valor líquido de um lançamento de repasse.
   * Impostos e taxas de cartão são porcentagens (0-100) aplicadas sobre o valor bruto.
   *
   * @param {number} valorBruto
   * @param {number} percentualImpostos - Porcentagem (0-100)
   * @param {number} custosPacotes - Valor em reais
   * @param {number} percentualTaxasCartao - Porcentagem (0-100)
   * @returns {number}
   */
  function calcularLiquidoRepasse(
    valorBruto,
    percentualImpostos,
    custosPacotes,
    percentualTaxasCartao,
  ) {
    const bruto = parseFloat(valorBruto) || 0;
    const percImp = parseFloat(percentualImpostos) || 0;
    const custos = parseFloat(custosPacotes) || 0;
    const percTaxas = parseFloat(percentualTaxasCartao) || 0;

    // Calcula valores reais a partir das porcentagens
    const valorImpostos = (bruto * percImp) / 100;
    const valorTaxas = (bruto * percTaxas) / 100;

    return parseFloat((bruto - valorImpostos - custos - valorTaxas).toFixed(2));
  }

  /**
   * Calcula os repasses de clínica e médico sobre o valor líquido.
   *
   * @param {number} valorLiquido
   * @param {number} percentualClinica - 0 a 100
   * @param {number} percentualMedico  - 0 a 100
   * @returns {{ repasseClinica: number, repasseMedico: number }}
   */
  function calcularPartilha(valorLiquido, percentualClinica, percentualMedico) {
    const liq = parseFloat(valorLiquido) || 0;
    const percCli = parseFloat(percentualClinica) || 0;
    const percMed = parseFloat(percentualMedico) || 0;
    return {
      repasseClinica: parseFloat(((liq * percCli) / 100).toFixed(2)),
      repasseMedico: parseFloat(((liq * percMed) / 100).toFixed(2)),
    };
  }

  /**
   * Garante que % clínica + % médico = 100.
   * Ao alterar um campo, o outro é recalculado automaticamente.
   *
   * @param {'clinica'|'medico'} campoAlterado
   * @param {number} novoValor
   * @returns {{ percentualClinica: number, percentualMedico: number }}
   */
  function ajustarPercentuais(campoAlterado, novoValor) {
    const valor = Math.min(100, Math.max(0, parseFloat(novoValor) || 0));
    return campoAlterado === "clinica"
      ? {
          percentualClinica: valor,
          percentualMedico: parseFloat((100 - valor).toFixed(2)),
        }
      : {
          percentualClinica: parseFloat((100 - valor).toFixed(2)),
          percentualMedico: valor,
        };
  }

  /* ============================================================
     MODAL DE LANÇAMENTO AVULSO
     ============================================================ */

  /**
   * Abre o modal de avulso para criar novo lançamento.
   */
  function abrirModalNovoAvulso() {
    if (!medicoAtivoId || !mesAnoAtivo) {
      Ui.mostrarToast("Selecione um médico e mês primeiro", "aviso");
      return;
    }

    const modal = document.getElementById("modal-avulso");
    const form = document.getElementById("form-avulso");

    form.reset();
    form.dataset.modo = "criar";
    delete form.dataset.avulsoId;

    document.getElementById("modal-avulso-titulo").textContent =
      "Novo Lançamento Avulso";
    document.getElementById("grupo-obs-parcelas").hidden = true;

    modal.showModal();
  }

  /**
   * Abre o modal de avulso preenchido com dados de um lançamento existente.
   * @param {string} avulsoId
   * @param {Object} dados
   */
  function abrirModalEdicaoAvulso(avulsoId, dados) {
    const modal = document.getElementById("modal-avulso");
    const form = document.getElementById("form-avulso");

    form.dataset.modo = "editar";
    form.dataset.avulsoId = avulsoId;

    document.getElementById("modal-avulso-titulo").textContent =
      "Editar Lançamento Avulso";

    // Preenche os campos
    document.getElementById("avulso-descricao").value = dados.descricao || "";
    document.getElementById("avulso-categoria").value =
      dados.categoria || "cirurgia_particular";
    document.getElementById("avulso-forma-pagamento").value =
      dados.formaPagamento || "dinheiro";
    document.getElementById("avulso-obs-parcelas").value =
      dados.observacaoParcelas || "";
    document.getElementById("avulso-valor-bruto").value = dados.valorBruto || 0;
    document.getElementById("avulso-impostos").value = dados.impostos || 0;
    document.getElementById("avulso-custos-pacotes").value =
      dados.custosPacotes || 0;
    document.getElementById("avulso-taxas-cartao").value =
      dados.taxasCartao || 0;
    document.getElementById("avulso-perc-clinica").value =
      dados.percentualClinica || 50;
    document.getElementById("avulso-perc-medico").value =
      dados.percentualMedico || 50;

    // Mostra campo de parcelas se necessário
    document.getElementById("grupo-obs-parcelas").hidden =
      dados.formaPagamento !== "parcelas";

    // Calcula valores
    calcularValoresModalAvulso();

    modal.showModal();
  }

  /**
   * Fecha o modal de avulso.
   */
  function fecharModalAvulso() {
    console.log("❌ Fechando modal avulso...");
    const modal = document.getElementById("modal-avulso");
    const form = document.getElementById("form-avulso");

    // Limpa o formulário
    form.reset();
    delete form.dataset.modo;
    delete form.dataset.avulsoId;

    // Fecha o modal
    modal.close();
    console.log("✅ Modal avulso fechado");
  }

  /**
   * Calcula valores no modal de avulso em tempo real.
   */
  function calcularValoresModalAvulso() {
    const valorBruto =
      parseFloat(document.getElementById("avulso-valor-bruto").value) || 0;
    const impostos =
      parseFloat(document.getElementById("avulso-impostos").value) || 0;
    const custosPacotes =
      parseFloat(document.getElementById("avulso-custos-pacotes").value) || 0;
    const taxasCartao =
      parseFloat(document.getElementById("avulso-taxas-cartao").value) || 0;
    const percClinica =
      parseFloat(document.getElementById("avulso-perc-clinica").value) || 0;
    const percMedico =
      parseFloat(document.getElementById("avulso-perc-medico").value) || 0;

    // Calcula líquido
    const valorLiquido = calcularLiquidoRepasse(
      valorBruto,
      impostos,
      custosPacotes,
      taxasCartao,
    );
    document.getElementById("avulso-valor-liquido").textContent =
      Ui.formatarBRL(valorLiquido);

    // Calcula partilha
    const partilha = calcularPartilha(valorLiquido, percClinica, percMedico);
    document.getElementById("avulso-rep-clinica").textContent = Ui.formatarBRL(
      partilha.repasseClinica,
    );
    document.getElementById("avulso-rep-medico").textContent = Ui.formatarBRL(
      partilha.repasseMedico,
    );
  }

  /**
   * Processa o submit do formulário de avulso.
   * Calcula liquidoFinal e partilha antes de salvar.
   * @param {SubmitEvent} evento
   */
  function aoSubmeterAvulso(evento) {
    evento.preventDefault();

    const form = evento.target;
    const modo = form.dataset.modo;
    const avulsoId = form.dataset.avulsoId;

    // Coleta dados do formulário
    const valorBruto =
      parseFloat(document.getElementById("avulso-valor-bruto").value) || 0;
    const impostos =
      parseFloat(document.getElementById("avulso-impostos").value) || 0;
    const custosPacotes =
      parseFloat(document.getElementById("avulso-custos-pacotes").value) || 0;
    const taxasCartao =
      parseFloat(document.getElementById("avulso-taxas-cartao").value) || 0;
    const percClinica =
      parseFloat(document.getElementById("avulso-perc-clinica").value) || 0;
    const percMedico =
      parseFloat(document.getElementById("avulso-perc-medico").value) || 0;

    const valorLiquido = calcularLiquidoRepasse(
      valorBruto,
      impostos,
      custosPacotes,
      taxasCartao,
    );
    const partilha = calcularPartilha(valorLiquido, percClinica, percMedico);

    const dados = {
      descricao: document.getElementById("avulso-descricao").value.trim(),
      categoria: document.getElementById("avulso-categoria").value,
      formaPagamento: document.getElementById("avulso-forma-pagamento").value,
      observacaoParcelas: document
        .getElementById("avulso-obs-parcelas")
        .value.trim(),
      valorBruto,
      impostos,
      custosPacotes,
      taxasCartao,
      valorLiquidoFinal: valorLiquido,
      percentualClinica: percClinica,
      percentualMedico: percMedico,
      repasseClinica: partilha.repasseClinica,
      repasseMedico: partilha.repasseMedico,
    };

    if (modo === "criar") {
      Db.adicionarAvulsoRepasse(medicoAtivoId, mesAnoAtivo, dados);
      Ui.mostrarToast("Lançamento criado", "sucesso");
    } else {
      Db.atualizarAvulsoRepasse(medicoAtivoId, mesAnoAtivo, avulsoId, dados);
      Ui.mostrarToast("Lançamento atualizado", "sucesso");
    }

    fecharModalAvulso();
  }

  /**
   * Exclui um lançamento avulso após confirmação.
   * @param {string} avulsoId
   */
  function excluirAvulso(avulsoId) {
    if (!confirm("Excluir este lançamento? Esta ação não pode ser desfeita."))
      return;
    Db.excluirAvulsoRepasse(medicoAtivoId, mesAnoAtivo, avulsoId);
    Ui.mostrarToast("Lançamento excluído", "sucesso");
  }

  /**
   * Handler do campo de reembolso clínica.
   * @param {Event} evento
   */
  function aoAlterarReembolso(evento) {
    const valor = parseFloat(evento.target.value) || 0;
    Db.salvarReembolsoClinica(medicoAtivoId, mesAnoAtivo, valor);

    // Atualiza os cards
    const linhas = document.querySelectorAll("#corpo-tabela-repasse tr");
    calcularEAtualizarCards(linhas, valor);
  }

  /* ============================================================
     UTILITÁRIOS
     ============================================================ */

  /**
   * Converte texto de moeda para número.
   * @param {string} texto - Ex: "R$ 1.234,56"
   * @returns {number}
   */
  function parseMoeda(texto) {
    if (!texto) {
      console.log("    💱 parseMoeda: texto vazio → 0");
      return 0;
    }
    const limpo = texto.replace(/[R$\s.]/g, "").replace(",", ".");
    const numero = parseFloat(limpo) || 0;
    console.log(`    💱 parseMoeda: "${texto}" → "${limpo}" → ${numero}`);
    return numero;
  }

  /**
   * Formata nome de categoria para exibição.
   * @param {string} categoria
   * @returns {string}
   */
  function formatarCategoria(categoria) {
    const mapa = {
      cirurgia_particular: "Cirurgia Particular",
      caixa_consultorio: "Caixa Consultório",
      reembolso: "Reembolso",
      repasse_terceiro: "Repasse Terceiro",
      desconto: "Desconto",
      outro: "Outro",
    };
    return mapa[categoria] || categoria;
  }

  /**
   * Formata forma de pagamento para exibição.
   * @param {string} forma
   * @returns {string}
   */
  function formatarFormaPagamento(forma) {
    const mapa = {
      dinheiro: "Dinheiro",
      pix: "PIX",
      cartao_credito: "Cartão Crédito",
      cartao_debito: "Cartão Débito",
      parcelas: "Parcelas",
    };
    return mapa[forma] || forma;
  }

  /* ============================================================
     GERENCIAMENTO DE MÉDICOS
     ============================================================ */

  /**
   * Abre o modal de gerenciar médicos e carrega a lista atual.
   */
  function abrirModalGerenciarMedicos() {
    const modal = document.getElementById("modal-gerenciar-medicos");

    // Carrega e renderiza a lista de médicos
    Db.ouvirMedicos((medicos) => {
      renderizarListaMedicos(medicos);
    });

    modal.showModal();
  }

  /**
   * Fecha o modal de gerenciar médicos.
   */
  function fecharModalGerenciarMedicos() {
    console.log("❌ Fechando modal de gerenciar médicos...");
    const modal = document.getElementById("modal-gerenciar-medicos");
    document.getElementById("input-nome-medico").value = "";
    modal.close();
    console.log("✅ Modal de médicos fechado");
  }

  /**
   * Adiciona um novo médico ao clicar no botão.
   */
  async function aoAdicionarMedico() {
    const input = document.getElementById("input-nome-medico");
    const nome = input.value.trim();

    if (!nome) {
      Ui.mostrarToast("Digite o nome do médico", "aviso");
      return;
    }

    try {
      await Db.adicionarMedico(nome);
      Ui.mostrarToast(`Médico "${nome}" adicionado com sucesso!`, "sucesso");
      input.value = "";
      input.focus();
    } catch (erro) {
      console.error("Erro ao adicionar médico:", erro);
      Ui.mostrarToast("Erro ao adicionar médico: " + erro.message, "erro");
    }
  }

  /**
   * Renderiza a lista de médicos no modal de gerenciamento.
   * @param {Object} medicos - Objeto com os médicos do Firebase
   */
  function renderizarListaMedicos(medicos) {
    const lista = document.getElementById("lista-medicos");

    if (!medicos || Object.keys(medicos).length === 0) {
      lista.innerHTML = `
        <p style="color: var(--texto-secundario); text-align: center; padding: 20px;">
          Nenhum médico cadastrado
        </p>
      `;
      return;
    }

    const html = Object.entries(medicos)
      .map(
        ([id, dados]) =>
          `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--borda);"><span style="font-weight: 500;">${dados.nome || "Sem nome"}</span><button type="button" class="btn-excluir-medico" data-medico-id="${id}" data-medico-nome="${dados.nome || ""}" style="color: var(--pendente); padding: 4px 8px; font-size: 0.875rem; border-radius: var(--raio-sm);" onmouseover="this.style.backgroundColor='var(--pendente-bg)'" onmouseout="this.style.backgroundColor='transparent'">Excluir</button></div>`,
      )
      .join("");

    lista.innerHTML = html;

    // Adiciona event listeners aos botões de excluir
    lista.querySelectorAll(".btn-excluir-medico").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const medicoId = e.target.dataset.medicoId;
        const medicoNome = e.target.dataset.medicoNome;

        if (
          !confirm(
            `Deseja realmente excluir "${medicoNome}"? Todos os repasses deste médico serão perdidos.`,
          )
        ) {
          return;
        }

        try {
          await Db.excluirMedico(medicoId);
          Ui.mostrarToast(
            `Médico "${medicoNome}" excluído com sucesso`,
            "sucesso",
          );
        } catch (erro) {
          console.error("Erro ao excluir médico:", erro);
          Ui.mostrarToast("Erro ao excluir médico: " + erro.message, "erro");
        }
      });
    });
  }

  /* ============================================================
     MIGRAÇÃO DE DADOS
     ============================================================ */

  /**
   * Executa a migração de todos os convênios para a nova regra de 40% clínica / 60% médico.
   * Mostra confirmação ao usuário antes de executar.
   */
  async function executarMigracaoPercentuais() {
    const confirmar = confirm(
      "⚠️ ATENÇÃO: Esta ação irá atualizar TODOS os convênios existentes para a nova regra de repasse:\n\n" +
        "• Clínica: 40%\n" +
        "• Médico: 60%\n\n" +
        "Deseja continuar?",
    );

    if (!confirmar) {
      return;
    }

    try {
      Ui.mostrarToast("Iniciando migração de percentuais...", "aviso");

      const resultado = await Db.migrarPercentuaisRepasse();

      const mensagem =
        `Migração concluída!\n\n` +
        `• Total de convênios analisados: ${resultado.total}\n` +
        `• Convênios atualizados: ${resultado.atualizados}\n` +
        `• Médicos processados: ${resultado.medicos}`;

      console.log("✅ " + mensagem);

      if (resultado.atualizados > 0) {
        Ui.mostrarToast(
          `${resultado.atualizados} convênios atualizados para 40% clínica / 60% médico`,
          "sucesso",
        );

        // Recarregar os dados se houver médico selecionado
        const selectMedico = document.getElementById("select-medico");
        if (selectMedico && selectMedico.value) {
          aoClicarCarregar();
        }
      } else {
        Ui.mostrarToast("Nenhum convênio precisou ser atualizado", "aviso");
      }
    } catch (erro) {
      console.error("❌ Erro ao executar migração:", erro);
      Ui.mostrarToast("Erro ao migrar percentuais: " + erro.message, "erro");
    }
  }

  /* ============================================================
     EXPORTAÇÃO DO MÓDULO
     ============================================================ */

  return {
    inicializar,
    carregarRepasse,
    sincronizarValoresConvenio,
    aoClicarCarregar,
    aoAlterarReembolso,
    executarMigracaoPercentuais,
  };
})();

/* ============================================================
   UTILITÁRIO DE MIGRAÇÃO (GLOBAL)
   ============================================================ */
/**
 * Função global para migração via console.
 * Uso: await window.migrarRepasses4060()
 */
window.migrarRepasses4060 = async function () {
  console.log("🔄 Iniciando migração de percentuais para 40/60...");

  try {
    const resultado = await Db.migrarPercentuaisRepasse();

    console.log("✅ Migração concluída!");
    console.log(`📊 Total analisado: ${resultado.total} convênios`);
    console.log(`✏️ Atualizados: ${resultado.atualizados} convênios`);
    console.log(`👥 Médicos processados: ${resultado.medicos}`);

    alert(
      `✅ Migração concluída!\n\n` +
        `Total: ${resultado.total} convênios\n` +
        `Atualizados: ${resultado.atualizados}\n` +
        `Médicos: ${resultado.medicos}`,
    );

    return resultado;
  } catch (erro) {
    console.error("❌ Erro na migração:", erro);
    alert("❌ Erro ao migrar percentuais: " + erro.message);
    throw erro;
  }
};
