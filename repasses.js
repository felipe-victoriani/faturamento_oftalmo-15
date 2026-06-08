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

  /** @type {string|null} Mês de referência ativo no modal do perfil da clínica */
  let mesAtivoClinica = null;

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
      totalValorLiquido: 0,
      totalRepasseClinica: 0,
      reembolsoClinica: 0,
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

    // Campo de reembolso clínica removido

    // Botão novo avulso
    document
      .getElementById("btn-novo-avulso")
      .addEventListener("click", abrirModalNovoAvulso);

    // Botão exportar PDF
    document
      .getElementById("btn-exportar-pdf-repasse")
      .addEventListener("click", gerarPDF);

    // Form de avulso
    document
      .getElementById("form-avulso")
      .addEventListener("submit", aoSubmeterAvulso);

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

    // Perfil da Clínica Oftalmo 15 (inline)
    document
      .getElementById("btn-nova-entrada-clinica")
      .addEventListener("click", adicionarEntradaVaziaClinica);

    // Extrato do médico e adiantamentos
    registrarEventosExtrato();
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

    // Opção fixa da Clínica Oftalmo 15
    const optClinica = document.createElement("option");
    optClinica.value = "__clinica__";
    optClinica.textContent = "— Clínica Oftalmo 15 —";
    select.appendChild(optClinica);

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
      Ui.mostrarToast("Selecione um médico ou a clínica", "aviso");
      return;
    }

    const areaMedico = document.getElementById("area-tabela-medico");
    const areaClinica = document.getElementById("area-tabela-clinica");

    if (medicoId === "__clinica__") {
      areaMedico.hidden = true;
      areaClinica.hidden = false;
      carregarClinica(mesAno);
      return;
    }

    areaMedico.hidden = false;
    areaClinica.hidden = true;
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
        // Renderiza cards zerados e remove card do médico
        Ui.renderizarCardsRepasse({
          totalProducao: 0,
          totalRecebido: 0,
          totalValorLiquido: 0,
          totalRepasseClinica: 0,
          reembolsoClinica: 0,
        });
        Ui.removerCardMedico();
      } else {
        renderizarTotalizadores(linhas);
        // Atualiza cards
        console.log(
          "🎴 renderizarRepasse - Chamando calcularEAtualizarCards...",
        );
        calcularEAtualizarCards(linhas, dados.reembolsoClinica || 0);
      }

      // Atualiza campo de reembolso removido
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

      // Verifica se é Unimed para tornar Rep. Médico editável
      const isUnimed = convenio.nome.toLowerCase().includes("unimed");
      const classeRepMedico = isUnimed ? "celula-editavel" : "celula-calculada";
      const editavelRepMedico = isUnimed ? "true" : "false";

      // Para Unimed, se já tem repasseMedico salvo, usa ele; senão usa o calculado
      const repasseMedicoExibido =
        isUnimed && dadosConvenio.repasseMedico !== undefined
          ? dadosConvenio.repasseMedico
          : partilha.repasseMedico;

      console.log(`    💵 Valores calculados:`, {
        valorBruto,
        impostos,
        custosPacotes,
        taxasCartao,
        valorLiquido,
        repasseClinica: partilha.repasseClinica,
        repasseMedicoCalculado: partilha.repasseMedico,
        repasseMedicoSalvo: dadosConvenio.repasseMedico,
        repasseMedicoExibido,
        isUnimed,
      });

      tr.innerHTML = `
        <td><span class="celula-label">Convênio</span><span class="celula-valor">${convenio.nome}</span></td>
        <td><span class="celula-label">Mês Prod.</span><span class="celula-editavel celula-valor" data-campo="mesProducao" contenteditable="true" title="Formato: AAAA-MM (ex: 2026-03)">${dadosConvenio.mesProducao || mesAnoAtivo}</span></td>
        <td><span class="celula-label">Valor Bruto</span><span class="celula-editavel celula-valor" data-campo="valorBruto" contenteditable="${editavel}">${Ui.formatarBRL(valorBruto)}</span></td>
        <td><span class="celula-label">Impostos</span><span class="celula-editavel celula-valor" data-campo="impostos" data-tipo="percentual" contenteditable="${editavel}">${impostos.toFixed(2)}%</span></td>
        <td><span class="celula-label">Custos/Pacotes</span><span class="celula-editavel celula-valor" data-campo="custosPacotes" contenteditable="${editavel}">${Ui.formatarBRL(custosPacotes)}</span></td>
        <td><span class="celula-label">Taxas Cartão</span><span class="celula-editavel celula-valor" data-campo="taxasCartao" data-tipo="percentual" contenteditable="${editavel}">${taxasCartao.toFixed(2)}%</span></td>
        <td><span class="celula-label">Valor Líquido</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(valorLiquido)}</span></td>
        <td><span class="celula-label">Rep. Clínica</span><span class="celula-calculada celula-valor">${Ui.formatarBRL(partilha.repasseClinica)}</span></td>
        <td><span class="celula-label">Rep. Médico</span><span class="${classeRepMedico} celula-valor" data-campo="repasseMedico" contenteditable="${editavelRepMedico}">${Ui.formatarBRL(repasseMedicoExibido)}</span></td>
        <td></td>
      `;

      // Event listeners para células editáveis
      tr.querySelectorAll(".celula-editavel").forEach((celula) => {
        console.log(
          `[Repasses] Adicionando listener em célula editável:`,
          celula.dataset.campo,
          `contenteditable=${celula.contentEditable}`,
          `isUnimed=${isUnimed}`,
          `convenioNome=${convenio.nome}`,
        );

        celula.addEventListener("blur", (e) => {
          console.log(
            `[Repasses] Evento blur disparado em:`,
            e.target.dataset.campo,
            `isUnimed=${isUnimed}`,
          );

          // Se for a célula de repasseMedico do Unimed, usa tratamento especial
          if (e.target.dataset.campo === "repasseMedico" && isUnimed) {
            console.log(
              `[Repasses] ✅ DETECTADO: Edição de Rep. Médico do Unimed!`,
            );
            aoEditarRepasseMedicoUnimed(e, convenioId);
          } else {
            aoEditarCelulaConvenio(e, convenioId);
          }
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
        <td><span class="celula-label">Mês Prod.</span><span class="celula-valor">${dados.mesProducao || mesAnoAtivo}</span></td>
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
   * Calcula os totais e atualiza os 5 cards de resumo acima da tabela.
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
    let totalValorLiquido = 0;
    let totalRepasseClinica = 0;
    let reembolsoAvulsos = 0;

    linhas.forEach((linha, indexLinha) => {
      const celulas = linha.querySelectorAll("td");
      console.log(
        `  📄 Linha ${indexLinha}: ${celulas.length} células encontradas`,
      );

      if (celulas.length < 9) {
        console.log(`  ⚠️ Linha ${indexLinha} ignorada - menos de 9 células`);
        return;
      }

      // Verifica se é linha avulsa com categoria reembolso
      const tipo = linha.dataset.tipo;
      const avulsoId = linha.dataset.avulsoId;

      console.log(
        `  🔍 Linha ${indexLinha}: tipo="${tipo}", avulsoId="${avulsoId}"`,
      );

      if (tipo === "avulso" && avulsoId) {
        console.log(`  📦 dadosAtivos.avulsos existe:`, !!dadosAtivos.avulsos);
        console.log(
          `  📦 dadosAtivos.avulsos[${avulsoId}] existe:`,
          !!dadosAtivos.avulsos?.[avulsoId],
        );

        if (dadosAtivos.avulsos?.[avulsoId]) {
          const dadosAvulso = dadosAtivos.avulsos[avulsoId];
          console.log(`  📋 Categoria do avulso: "${dadosAvulso.categoria}"`);
          console.log(`  💰 Dados completos do avulso:`, dadosAvulso);

          if (dadosAvulso.categoria === "reembolso") {
            // Para reembolsos, soma AMBOS os campos (clínica + médico)
            // pois o valor pode estar em qualquer um dependendo de como foi preenchido
            const valorReembolsoClinica = dadosAvulso.repasseClinica || 0;
            const valorReembolsoMedico = dadosAvulso.repasseMedico || 0;
            const valorReembolsoTotal =
              valorReembolsoClinica + valorReembolsoMedico;

            reembolsoAvulsos += valorReembolsoTotal;
            console.log(`  💸 ✅ REEMBOLSO DETECTADO! Linha ${indexLinha}:`);
            console.log(`      - Repasse Clínica: R$ ${valorReembolsoClinica}`);
            console.log(`      - Repasse Médico: R$ ${valorReembolsoMedico}`);
            console.log(
              `      - Total do Reembolso: R$ ${valorReembolsoTotal}`,
            );
            console.log(
              `  💸 Total reembolsos avulsos acumulado: R$ ${reembolsoAvulsos}`,
            );
            // Não soma produção/recebido para reembolsos
            return;
          } else {
            console.log(
              `  ℹ️ Linha ${indexLinha}: Avulso categoria "${dadosAvulso.categoria}" (não é reembolso)`,
            );
          }
        }
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
      const valorLiquido = getValor(6); // Valor líquido (coluna 7)
      const repasseClinica = getValor(7); // Repasse clínica (coluna 8)
      const repasseMedico = getValor(8); // Repasse médico (coluna 9)

      console.log(
        `  ➕ Linha ${indexLinha}: valorBruto=${valorBruto}, valorLiquido=${valorLiquido}, repasseClinica=${repasseClinica}, repasseMedico=${repasseMedico}`,
      );

      totalProducao += valorBruto;
      totalRecebido += repasseMedico;
      totalValorLiquido += valorLiquido;
      totalRepasseClinica += repasseClinica;
    });

    // Soma reembolso manual + reembolsos de avulsos
    const reembolsoTotal = reembolsoClinica + reembolsoAvulsos;

    console.log("✅ calcularEAtualizarCards - Totais calculados:", {
      totalProducao,
      totalRecebido,
      totalValorLiquido,
      totalRepasseClinica,
      reembolsoClinica: reembolsoClinica,
      reembolsoAvulsos: reembolsoAvulsos,
      reembolsoTotal: reembolsoTotal,
    });

    console.log(
      "🚀 calcularEAtualizarCards - Chamando Ui.renderizarCardsRepasse...",
    );
    Ui.renderizarCardsRepasse({
      totalProducao,
      totalRecebido,
      totalValorLiquido,
      totalRepasseClinica,
      reembolsoClinica: reembolsoTotal,
    });

    // Renderiza card clicável do médico para abrir o extrato
    const nomeMedico = _obterNomeMedicoAtivo();
    if (nomeMedico && nomeMedico !== "—") {
      Ui.renderizarCardMedico(nomeMedico, abrirModalExtrato);
    }
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

    // Campo mesProducao é string (YYYY-MM), não numérico
    if (campo === "mesProducao") {
      if (!/^\d{4}-\d{2}$/.test(valor)) {
        Ui.mostrarToast("Formato inválido. Use AAAA-MM (ex: 2026-03)", "aviso");
        celula.textContent =
          dadosAtivos.convenios?.[convenioId]?.mesProducao || mesAnoAtivo;
        return;
      }
      Db.salvarConvenioRepasse(medicoAtivoId, mesAnoAtivo, convenioId, {
        ...(dadosAtivos.convenios?.[convenioId] || {}),
        mesProducao: valor,
      });
      Ui.mostrarToast("Mês de produção atualizado", "sucesso");
      return;
    }

    // Remove formatação de moeda/percentual
    valor = valor.replace(/[R$\s.%]/g, "").replace(",", ".");
    valor = parseFloat(valor) || 0;

    console.log(`[Repasses] Valor parseado: ${valor}`);

    salvarCelulaConvenio(convenioId, campo, valor);
  }

  /**
   * Handler especial para edição manual do Repasse Médico do Unimed.
   * Salva o valor editado diretamente e recalcula Rep. Clínica.
   * @param {Event} evento
   * @param {string} convenioId
   */
  function aoEditarRepasseMedicoUnimed(evento, convenioId) {
    const celula = evento.target;
    let valor = celula.textContent.trim();

    console.log(`[Repasses] 🎯 aoEditarRepasseMedicoUnimed - CHAMADO!`);
    console.log(`  🏥 Convênio ID: ${convenioId}`);
    console.log(`  📝 Valor original na célula: "${valor}"`);
    console.log(`  📍 Campo: ${celula.dataset.campo}`);

    // Remove formatação de moeda
    valor = valor.replace(/[R$\s.]/g, "").replace(",", ".");
    const valorNumerico = parseFloat(valor) || 0;

    console.log(`  💵 Valor após parseMoeda: R$ ${valorNumerico.toFixed(2)}`);

    salvarRepasseMedicoUnimed(convenioId, valorNumerico);
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

  /**
   * Salva o valor editado manualmente do Repasse Médico do Unimed.
   * Salva apenas o campo repasseMedico sem recalcular outros valores.
   *
   * @param {string} convenioId
   * @param {number} repasseMedicoEditado - Valor editado pelo usuário
   */
  function salvarRepasseMedicoUnimed(convenioId, repasseMedicoEditado) {
    if (!medicoAtivoId || !mesAnoAtivo) {
      console.error(
        "[Repasses] ❌ ERRO: medicoAtivoId ou mesAnoAtivo não definidos!",
      );
      return;
    }

    console.log(`[Repasses] 💾 salvarRepasseMedicoUnimed - INÍCIO`);
    console.log(`  📋 Médico ID: ${medicoAtivoId}`);
    console.log(`  📅 Mês/Ano: ${mesAnoAtivo}`);
    console.log(`  🏥 Convênio ID: ${convenioId}`);
    console.log(
      `  💰 Repasse Médico Editado: R$ ${repasseMedicoEditado.toFixed(2)}`,
    );

    // Busca dados atuais do convênio
    const dadosConvenio = dadosAtivos.convenios?.[convenioId] || {};
    console.log(
      `[Repasses] 📦 Dados atuais do convênio:`,
      JSON.stringify(dadosConvenio, null, 2),
    );

    // Atualiza apenas o repasseMedico mantendo os demais valores
    const dadosParaSalvar = {
      ...dadosConvenio,
      repasseMedico: repasseMedicoEditado,
    };

    console.log(
      `[Repasses] 💾 Dados que serão salvos no Firebase:`,
      JSON.stringify(dadosParaSalvar, null, 2),
    );

    // Salva no Firebase
    console.log(`[Repasses] 🔥 Chamando Db.salvarConvenioRepasse...`);
    Db.salvarConvenioRepasse(
      medicoAtivoId,
      mesAnoAtivo,
      convenioId,
      dadosParaSalvar,
    )
      .then(() => {
        console.log(`[Repasses] ✅ Firebase respondeu: salvo com sucesso!`);
        Ui.mostrarToast("Repasse Médico Unimed atualizado", "sucesso");
      })
      .catch((erro) => {
        console.error(`[Repasses] ❌ Erro ao salvar no Firebase:`, erro);
        Ui.mostrarToast("Erro ao atualizar: " + erro.message, "erro");
      });
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

    // Inicializa mês de produção com o mês ativo
    const inputMesProdNovo = document.getElementById("avulso-mes-producao");
    if (inputMesProdNovo) inputMesProdNovo.value = mesAnoAtivo || "";

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
    document.getElementById("avulso-mes-producao").value =
      dados.mesProducao || mesAnoAtivo || "";
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
    document.getElementById("avulso-valor-liquido").value =
      dados.valorLiquidoFinal || 0;
    document.getElementById("avulso-perc-clinica").value =
      dados.percentualClinica || 50;
    document.getElementById("avulso-perc-medico").value =
      dados.percentualMedico || 50;
    document.getElementById("avulso-rep-clinica").value =
      dados.repasseClinica || 0;
    document.getElementById("avulso-rep-medico").value =
      dados.repasseMedico || 0;

    // Mostra campo de parcelas se necessário
    document.getElementById("grupo-obs-parcelas").hidden =
      dados.formaPagamento !== "parcelas";

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

  // Função calcularValoresModalAvulso removida - formulário agora é 100% manual

  /**
   * Processa o submit do formulário de avulso.
   * Salva os valores exatamente como o usuário digitou (sem cálculos).
   * @param {SubmitEvent} evento
   */
  function aoSubmeterAvulso(evento) {
    evento.preventDefault();

    const form = evento.target;
    const modo = form.dataset.modo;
    const avulsoId = form.dataset.avulsoId;

    // Coleta dados do formulário - todos os valores vêm direto dos inputs
    const valorBruto =
      parseFloat(document.getElementById("avulso-valor-bruto").value) || 0;
    const impostos =
      parseFloat(document.getElementById("avulso-impostos").value) || 0;
    const custosPacotes =
      parseFloat(document.getElementById("avulso-custos-pacotes").value) || 0;
    const taxasCartao =
      parseFloat(document.getElementById("avulso-taxas-cartao").value) || 0;
    const valorLiquido =
      parseFloat(document.getElementById("avulso-valor-liquido").value) || 0;
    const percClinica =
      parseFloat(document.getElementById("avulso-perc-clinica").value) || 0;
    const percMedico =
      parseFloat(document.getElementById("avulso-perc-medico").value) || 0;
    const repasseClinica =
      parseFloat(document.getElementById("avulso-rep-clinica").value) || 0;
    const repasseMedico =
      parseFloat(document.getElementById("avulso-rep-medico").value) || 0;

    const dados = {
      descricao: document.getElementById("avulso-descricao").value.trim(),
      mesProducao:
        document.getElementById("avulso-mes-producao").value || mesAnoAtivo,
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
      repasseClinica: repasseClinica,
      repasseMedico: repasseMedico,
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

  // Handler do campo de reembolso clínica removido

  /* ============================================================
     EXPORTAÇÃO PDF
     ============================================================ */

  /**
   * Gera e baixa um PDF com o repasse do médico/mês atualmente carregado.
   * Usa jsPDF + jspdf-autotable (carregados via CDN no index.html).
   */
  function gerarPDF() {
    if (!medicoAtivoId || !mesAnoAtivo) {
      Ui.mostrarToast("Carregue um repasse antes de exportar", "aviso");
      return;
    }

    const tbody = document.getElementById("corpo-tabela-repasse");
    if (!tbody || tbody.querySelectorAll("tr").length === 0) {
      Ui.mostrarToast("Nenhum dado para exportar", "aviso");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // ── Cabeçalho ──────────────────────────────────────────────
    const nomeMedico =
      document.getElementById("caption-medico-repasse").textContent.trim() ||
      medicoAtivoId;
    const mesTexto =
      document.getElementById("caption-mes-repasse").textContent.trim() ||
      mesAnoAtivo;
    const dataGeracao = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const corPrimaria = [41, 98, 255]; // azul
    const corCinza = [100, 116, 139]; // slate-500
    const corBorda = [226, 232, 240]; // slate-200

    // Faixa de título
    doc.setFillColor(...corPrimaria);
    doc.rect(0, 0, 297, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("REPASSE MÉDICO", 14, 11);

    // Subtítulo (médico + mês)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${nomeMedico}  ·  ${mesTexto}`, 14, 15.5);

    // Data de geração (canto direito)
    doc.setFontSize(7);
    doc.setTextColor(...corCinza);
    doc.text(`Gerado em: ${dataGeracao}`, 283, 15.5, { align: "right" });

    // ── Cards de resumo ────────────────────────────────────────
    const cards = document.querySelectorAll(".repasses-cards .card-resumo");
    let xCard = 14;
    const yCard = 23;
    const cardW = 52;
    const cardH = 16;
    const gap = 4;

    doc.setTextColor(30, 30, 30);
    cards.forEach((card) => {
      const titulo =
        card.querySelector(".card-resumo__titulo")?.textContent.trim() || "";
      const valor =
        card.querySelector(".card-resumo__valor")?.textContent.trim() || "";

      doc.setDrawColor(...corBorda);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(xCard, yCard, cardW, cardH, 2, 2, "FD");

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corCinza);
      doc.text(titulo, xCard + 3, yCard + 5);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(valor, xCard + 3, yCard + 12);

      xCard += cardW + gap;
    });

    // ── Tabela principal ───────────────────────────────────────
    const colunas = [
      { header: "Convênio / Descrição", dataKey: "descricao" },
      { header: "Mês Prod.", dataKey: "mes" },
      { header: "Valor Bruto", dataKey: "bruto" },
      { header: "Impostos (%)", dataKey: "impostos" },
      { header: "Custo/Pac.", dataKey: "custos" },
      { header: "Taxas Cartão (%)", dataKey: "taxas" },
      { header: "Valor Líquido", dataKey: "liquido" },
      { header: "Rep. Clínica", dataKey: "clinica" },
      { header: "Rep. Médico", dataKey: "medico" },
    ];

    const linhas = Array.from(tbody.querySelectorAll("tr")).map((tr) => {
      const tds = tr.querySelectorAll("td");
      const cel = (i) =>
        tds[i]?.querySelector(".celula-valor")?.textContent.trim() || "";
      return {
        descricao: cel(0),
        mes: cel(1),
        bruto: cel(2),
        impostos: cel(3),
        custos: cel(4),
        taxas: cel(5),
        liquido: cel(6),
        clinica: cel(7),
        medico: cel(8),
      };
    });

    // Totais do rodapé
    const tfootCels = document.querySelectorAll(
      "#rodape-tabela-repasse .totalizadores td .celula-valor",
    );
    const totaisRow =
      tfootCels.length >= 7
        ? {
            descricao: "TOTAL",
            mes: "",
            bruto: tfootCels[0]?.textContent.trim() || "",
            impostos: "—",
            custos: tfootCels[1]?.textContent.trim() || "",
            taxas: "—",
            liquido: tfootCels[2]?.textContent.trim() || "",
            clinica: tfootCels[3]?.textContent.trim() || "",
            medico: tfootCels[4]?.textContent.trim() || "",
          }
        : null;

    doc.autoTable({
      columns: colunas,
      body: linhas,
      foot: totaisRow ? [Object.values(totaisRow)] : [],
      startY: yCard + cardH + 6,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        valign: "middle",
        overflow: "ellipsize",
      },
      headStyles: {
        fillColor: corPrimaria,
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 30, 30],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        descricao: { cellWidth: 55 },
        mes: { cellWidth: 20, halign: "center" },
        bruto: { cellWidth: 26, halign: "right" },
        impostos: { cellWidth: 22, halign: "right" },
        custos: { cellWidth: 24, halign: "right" },
        taxas: { cellWidth: 26, halign: "right" },
        liquido: { cellWidth: 26, halign: "right" },
        clinica: { cellWidth: 26, halign: "right" },
        medico: { cellWidth: 26, halign: "right" },
      },
      didParseCell(data) {
        // Destaque linha de totais no footer
        if (data.section === "foot") {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // ── Rodapé da página ───────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...corCinza);
    doc.text("Regras de repasse: Clínica 40%  ·  Médico 60%", 14, pageH - 6);
    doc.text(`Página 1 de 1  ·  ${dataGeracao}`, 283, pageH - 6, {
      align: "right",
    });

    // ── Download ───────────────────────────────────────────────
    const nomeArquivo = `repasse_${nomeMedico.replace(/\s+/g, "_").toLowerCase()}_${mesAnoAtivo}.pdf`;
    doc.save(nomeArquivo);

    Ui.mostrarToast("PDF gerado com sucesso!", "sucesso");
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
     PERFIL DA CLÍNICA
     ============================================================ */

  /**
   * Carrega o perfil da Clínica Oftalmo 15 na seção inline.
   * @param {string} mesAno - Formato "YYYY-MM"
   */
  async function carregarClinica(mesAno) {
    mesAtivoClinica = mesAno;

    // Atualiza o caption da tabela
    const mesData = new Date(mesAno + "-01");
    const mesTexto = mesData.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    const mesTextoCap = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);
    const captionEl = document.getElementById("caption-mes-clinica");
    if (captionEl) {
      captionEl.textContent = mesTextoCap;
      captionEl.setAttribute("datetime", mesAno);
    }

    // Carrega entradas
    const tbody = document.getElementById("corpo-tabela-clinica");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.25rem;color:var(--texto-secundario);">Carregando…</td></tr>`;

    try {
      const todasEntradas = await Db.obterEntradasClinica();

      // Filtra apenas as entradas do mês selecionado
      const entradas = Object.fromEntries(
        Object.entries(todasEntradas).filter(
          ([, e]) => (e.mesReferencia || "") === mesAno,
        ),
      );

      const vals = Object.values(entradas);
      const totalBruto = vals.reduce((s, e) => s + (e.valorBruto || 0), 0);
      const totalLiquidado = vals.reduce(
        (s, e) => s + (e.valorLiquidado || 0),
        0,
      );
      const impostoPct =
        totalBruto > 0 ? ((totalBruto - totalLiquidado) / totalBruto) * 100 : 0;
      Ui.renderizarCardsClinica({
        mesTexto: mesTextoCap,
        totalBruto,
        impostoPct,
        totalLiquidado,
      });
      renderizarTabelaClinica(entradas);
    } catch (erro) {
      console.error("Erro ao carregar entradas da clínica:", erro);
      Ui.mostrarToast("Erro ao carregar dados da clínica", "erro");
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.25rem;color:var(--erro);">Erro ao carregar dados</td></tr>`;
    }
  }

  /**
   * Renderiza todas as linhas da tabela do perfil da clínica.
   * @param {Object} entradas - Snapshot de clinica/entradas
   */
  function renderizarTabelaClinica(entradas) {
    const tbody = document.getElementById("corpo-tabela-clinica");
    tbody.innerHTML = "";

    const ids = Object.keys(entradas);
    if (ids.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--texto-secundario);">Nenhuma entrada cadastrada. Clique em &quot;Adicionar entrada&quot; para começar.</td></tr>`;
      document.getElementById("rodape-tabela-clinica").innerHTML = "";
      return;
    }

    ids.forEach((id) => adicionarLinhaClinica(tbody, id, entradas[id]));
    atualizarTotalizadoresClinicaDOM();
  }

  /**
   * Lê os valores atuais do DOM e atualiza a linha de totais no tfoot da clínica.
   */
  function atualizarTotalizadoresClinicaDOM() {
    const tfoot = document.getElementById("rodape-tabela-clinica");
    if (!tfoot) return;

    let totalBruto = 0;
    let totalLiquidado = 0;
    document.querySelectorAll("#corpo-tabela-clinica tr").forEach((tr) => {
      const brutoEl = tr.querySelector('[data-campo="valorBruto"]');
      const liquidadoEl = tr.querySelector('[data-campo="valorLiquidado"]');
      if (brutoEl) totalBruto += parseMoeda(brutoEl.textContent);
      if (liquidadoEl) totalLiquidado += parseMoeda(liquidadoEl.textContent);
    });

    tfoot.innerHTML = `
      <tr class="totalizadores">
        <th scope="row">TOTAIS</th>
        <td class="totalizador-valor"><span class="celula-label">Valor Bruto</span><span class="celula-valor">${Ui.formatarBRL(totalBruto)}</span></td>
        <td class="totalizador-valor"><span class="celula-label">Imposto %</span><span class="celula-valor">—</span></td>
        <td class="totalizador-valor"><span class="celula-label">Valor Liquidado</span><span class="celula-valor">${Ui.formatarBRL(totalLiquidado)}</span></td>
        <td></td>
      </tr>
    `;

    // Atualiza os cards com os totais atuais
    if (mesAtivoClinica) {
      const mesData = new Date(mesAtivoClinica + "-01");
      const mesTexto = mesData.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      const mesTextoCap = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);
      const impostoPct =
        totalBruto > 0 ? ((totalBruto - totalLiquidado) / totalBruto) * 100 : 0;
      Ui.renderizarCardsClinica({
        mesTexto: mesTextoCap,
        totalBruto,
        impostoPct,
        totalLiquidado,
      });
    }
  }

  /**
   * Adiciona uma linha editável na tabela do perfil da clínica.
   * @param {HTMLElement} tbody
   * @param {string} id - ID do documento no Firebase
   * @param {Object} dados
   */
  function adicionarLinhaClinica(tbody, id, dados) {
    const tr = document.createElement("tr");
    tr.dataset.entradaId = id;

    const mesRef = dados.mesReferencia || mesAtivoClinica || "";
    tr.dataset.mesReferencia = mesRef; // preservado para filtragem, não editável
    const mesProducao = dados.mesProducao || mesRef;
    const valorBruto = dados.valorBruto || 0;
    const impostos = dados.impostos || 0;
    const valorLiquidado = dados.valorLiquidado || 0;

    tr.innerHTML = `
      <td>
        <span class="celula-label">Mês de Prod.</span>
        <span class="celula-editavel celula-valor" data-campo="mesProducao" contenteditable="true" title="Formato: AAAA-MM (ex: 2026-04)">${mesProducao}</span>
      </td>
      <td>
        <span class="celula-label">Valor Bruto</span>
        <span class="celula-editavel celula-valor" data-campo="valorBruto" contenteditable="true">${Ui.formatarBRL(valorBruto)}</span>
      </td>
      <td>
        <span class="celula-label">Imposto %</span>
        <span class="celula-editavel celula-valor" data-campo="impostos" contenteditable="true">${impostos.toFixed(2)}%</span>
      </td>
      <td>
        <span class="celula-label">Valor Liquidado</span>
        <span class="celula-editavel celula-valor" data-campo="valorLiquidado" contenteditable="true">${Ui.formatarBRL(valorLiquidado)}</span>
      </td>
      <td class="celula-acoes">
        <button type="button" class="btn-icone btn-excluir-entrada-clinica" title="Excluir" aria-label="Excluir entrada">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </td>
    `;

    // Células contenteditable
    tr.querySelectorAll(".celula-editavel").forEach((celula) => {
      celula.addEventListener("blur", () =>
        aoEditarCelulaClinica(id, celula, tr),
      );
      celula.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.target.blur();
        }
      });
    });

    // Botão excluir
    tr.querySelector(".btn-excluir-entrada-clinica").addEventListener(
      "click",
      () => {
        if (!confirm("Excluir esta entrada? Esta ação não pode ser desfeita."))
          return;
        Db.excluirEntradaClinica(id)
          .then(() => {
            tr.remove();
            atualizarTotalizadoresClinicaDOM();
            Ui.mostrarToast("Entrada excluída", "sucesso");
          })
          .catch((err) => Ui.mostrarToast("Erro: " + err.message, "erro"));
      },
    );

    tbody.appendChild(tr);
  }

  /**
   * Adiciona uma nova linha vazia na tabela da clínica.
   */
  async function adicionarEntradaVaziaClinica() {
    const dados = {
      mesReferencia: mesAtivoClinica || new Date().toISOString().slice(0, 7),
      valorBruto: 0,
      impostos: 0,
      valorLiquidado: 0,
    };

    try {
      const id = await Db.adicionarEntradaClinica(dados);
      const tbody = document.getElementById("corpo-tabela-clinica");
      // Remove mensagem de "nenhuma entrada" se existir
      if (tbody.querySelector("td[colspan]")) tbody.innerHTML = "";
      adicionarLinhaClinica(tbody, id, dados);
      atualizarTotalizadoresClinicaDOM();
      Ui.mostrarToast("Nova entrada adicionada", "sucesso");
    } catch (erro) {
      Ui.mostrarToast("Erro ao adicionar entrada: " + erro.message, "erro");
    }
  }

  /**
   * Processa blur em célula editável da tabela da clínica.
   * @param {string} id
   * @param {HTMLElement} celula
   * @param {HTMLTableRowElement} tr
   */
  function aoEditarCelulaClinica(id, celula, tr) {
    const campo = celula.dataset.campo;
    const texto = celula.textContent.trim();

    // mesProducao é campo de controle (string YYYY-MM), independente do filtro
    if (campo === "mesProducao") {
      if (!/^\d{4}-\d{2}$/.test(texto)) {
        Ui.mostrarToast("Formato inválido. Use AAAA-MM (ex: 2026-04)", "aviso");
        celula.textContent = mesAtivoClinica || "";
        return;
      }
      salvarCelulaClinica(id, campo, texto, tr);
      return;
    }

    let valor;
    if (campo === "impostos") {
      valor = parseFloat(texto.replace(/[%\s]/g, "").replace(",", ".")) || 0;
    } else {
      valor = parseMoeda(texto);
    }

    salvarCelulaClinica(id, campo, valor, tr);
  }

  /**
   * Recalcula valorLiquidado, atualiza DOM e salva no Firebase.
   * @param {string} id
   * @param {string} campo
   * @param {*} valor
   * @param {HTMLTableRowElement} tr
   */
  function salvarCelulaClinica(id, campo, valor, tr) {
    const brutoEl = tr.querySelector('[data-campo="valorBruto"]');
    const impostosEl = tr.querySelector('[data-campo="impostos"]');
    const liquidadoEl = tr.querySelector('[data-campo="valorLiquidado"]');

    // mesProducao é campo de controle independente — salva só ele e retorna
    if (campo === "mesProducao") {
      Db.atualizarEntradaClinica(id, { mesProducao: String(valor) })
        .then(() => Ui.mostrarToast("Salvo", "sucesso"))
        .catch((err) =>
          Ui.mostrarToast("Erro ao salvar: " + err.message, "erro"),
        );
      return;
    }

    let valorBruto = parseMoeda(brutoEl.textContent);
    let impostos =
      parseFloat(
        impostosEl.textContent.replace(/[%\s]/g, "").replace(",", "."),
      ) || 0;

    if (campo === "valorBruto") valorBruto = valor;
    if (campo === "impostos") impostos = valor;

    // Recalcula liquidado apenas quando bruto ou imposto mudar;
    // se o próprio liquidado foi editado, usa o valor digitado diretamente.
    const valorLiquidado =
      campo === "valorLiquidado"
        ? parseFloat(valor.toFixed(2))
        : parseFloat((valorBruto - (valorBruto * impostos) / 100).toFixed(2));

    // Atualiza DOM
    if (campo === "valorBruto")
      brutoEl.textContent = Ui.formatarBRL(valorBruto);
    if (campo === "impostos")
      impostosEl.textContent = impostos.toFixed(2) + "%";
    liquidadoEl.textContent = Ui.formatarBRL(valorLiquidado);

    // Salva no Firebase — mesReferencia nunca muda (vem do dataset)
    Db.atualizarEntradaClinica(id, {
      mesReferencia: tr.dataset.mesReferencia || mesAtivoClinica || "",
      valorBruto,
      impostos,
      valorLiquidado,
    })
      .then(() => {
        atualizarTotalizadoresClinicaDOM();
        Ui.mostrarToast("Salvo", "sucesso");
      })
      .catch((err) =>
        Ui.mostrarToast("Erro ao salvar: " + err.message, "erro"),
      );
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
     EXTRATO DO MÉDICO — ADIANTAMENTOS
     ============================================================ */

  /** @type {Function|null} Para de ouvir adiantamentos no Firebase */
  let pararOuvirAdiantamentos = null;

  /** @type {Function|null} Para de ouvir status no Firebase */
  let pararOuvirStatusExtrato = null;

  /** @type {Object} Cache dos adiantamentos ativos */
  let adiantamentosAtivos = {};

  /** @type {number} Cache do totalRecebido (repasse médico) para o extrato */
  let totalRecebidoExtrato = 0;

  /** @type {number} Cache do totalValorLiquido para o extrato */
  let totalLiquidoExtrato = 0;

  /** @type {string|null} Mês/ano sendo exibido no extrato (pode diferir do mês da view principal) */
  let mesAnoExtrato = null;

  /** @type {number|null} Timeout do debounce da observação */
  let _debounceObservacao = null;

  /**
   * Abre o modal de extrato do médico.
   * Registra listener de adiantamentos em tempo real.
   */
  function abrirModalExtrato() {
    if (!medicoAtivoId || !mesAnoAtivo) return;

    const pagina = document.getElementById("view-extrato-medico");

    // Preenche nome do médico no header
    const nomeMedico = _obterNomeMedicoAtivo();
    const elNome = document.getElementById("extrato-nome-medico");
    if (elNome) elNome.textContent = nomeMedico;

    // Captura os totais atuais dos cards (já carregados na view principal)
    totalRecebidoExtrato = _lerValorCard("Total Recebido") || 0;
    totalLiquidoExtrato = _lerValorCard("Valor Líquido") || 0;

    pagina.classList.remove("extrato-pagina--oculta");
    pagina.scrollTop = 0;

    // Carrega o mês atual
    _recarregarExtratoParaMes(mesAnoAtivo);
  }

  /**
   * Fecha a página de extrato e para de ouvir listeners.
   */
  function fecharModalExtrato() {
    const pagina = document.getElementById("view-extrato-medico");
    if (pagina) pagina.classList.add("extrato-pagina--oculta");
    if (pararOuvirAdiantamentos) {
      pararOuvirAdiantamentos();
      pararOuvirAdiantamentos = null;
    }
    if (pararOuvirStatusExtrato) {
      pararOuvirStatusExtrato();
      pararOuvirStatusExtrato = null;
    }
    adiantamentosAtivos = {};
    mesAnoExtrato = null;
  }

  /**
   * Navega para o mês anterior (-1) ou próximo (+1) no extrato.
   * @param {number} delta -1 ou +1
   */
  function _navegarMesExtrato(delta) {
    if (!mesAnoExtrato) return;
    const [ano, mes] = mesAnoExtrato.split("-").map(Number);
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 1) {
      novoMes = 12;
      novoAno--;
    }
    if (novoMes > 12) {
      novoMes = 1;
      novoAno++;
    }
    const novoMesAno = `${novoAno}-${String(novoMes).padStart(2, "0")}`;
    _recarregarExtratoParaMes(novoMesAno);
  }

  /**
   * Recarrega o extrato para um mês/ano específico.
   * Para os listeners anteriores, atualiza o header e reinicia tudo.
   * @param {string} mesAno
   */
  async function _recarregarExtratoParaMes(mesAno) {
    if (!medicoAtivoId) return;
    mesAnoExtrato = mesAno;

    // Para listeners anteriores
    if (pararOuvirAdiantamentos) {
      pararOuvirAdiantamentos();
      pararOuvirAdiantamentos = null;
    }
    if (pararOuvirStatusExtrato) {
      pararOuvirStatusExtrato();
      pararOuvirStatusExtrato = null;
    }

    // Zera cache imediatamente para não exibir dados do mês anterior
    adiantamentosAtivos = {};
    totalRecebidoExtrato = 0;
    totalLiquidoExtrato = 0;
    _atualizarExtratoUI();
    _atualizarStatusUI(false);

    // Atualiza o texto do mês no header
    const elMes = document.getElementById("extrato-mes-ref");
    if (elMes) {
      const [ano, mes] = mesAno.split("-");
      const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      elMes.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    }

    // Limpa observação
    const elObs = document.getElementById("extrato-observacao");
    if (elObs) elObs.value = "";

    // Carrega totais do novo mês ANTES de registrar os listeners
    // para que quando o Firebase disparar, os totais já estejam corretos
    if (mesAno === mesAnoAtivo) {
      totalRecebidoExtrato = _lerValorCard("Total Recebido") || 0;
      totalLiquidoExtrato = _lerValorCard("Valor Líquido") || 0;
    } else {
      const totais = await _calcularTotaisParaMes(mesAno);
      // Verifica se o usuário já navegou para outro mês enquanto aguardava
      if (mesAnoExtrato !== mesAno) return;
      totalRecebidoExtrato = totais.repasseMedico;
      totalLiquidoExtrato = totais.valorLiquido;
    }

    // Só registra os listeners depois que os totais estão prontos
    // Assim o primeiro disparo do Firebase já usa valores corretos
    pararOuvirAdiantamentos = Db.ouvirAdiantamentos(
      medicoAtivoId,
      mesAno,
      (dados) => {
        adiantamentosAtivos = dados || {};
        _atualizarExtratoUI();
      },
    );

    let _statusAnterior = null;
    pararOuvirStatusExtrato = Db.ouvirStatusRepasse(
      medicoAtivoId,
      mesAno,
      (status) => {
        const pagoAtual = status.pago || false;
        _atualizarStatusUI(pagoAtual);
        if (elObs && document.activeElement !== elObs) {
          elObs.value = status.observacao || "";
        }
        // Recarrega o histórico somente quando o status pago realmente mudar
        if (_statusAnterior !== null && _statusAnterior !== pagoAtual) {
          _carregarHistoricoParaMes(mesAnoExtrato || mesAno);
        }
        _statusAnterior = pagoAtual;
      },
    );

    // Recarrega histórico relativo ao novo mês
    _carregarHistoricoParaMes(mesAno);
  }

  /**
   * Calcula repasseMedico e valorLiquido de um mês a partir do Firebase.
   * @param {string} mesAno
   * @returns {Promise<{repasseMedico: number, valorLiquido: number}>}
   */
  async function _calcularTotaisParaMes(mesAno) {
    const dados = await Db.obterRepasseUmaVez(medicoAtivoId, mesAno);
    let repasseMedico = 0;
    let valorLiquido = 0;

    if (dados.convenios) {
      Object.values(dados.convenios).forEach((c) => {
        const liq = parseFloat(c.valorLiquidoOrigem || 0);
        const imp = parseFloat(c.impostos || 0);
        const cus = parseFloat(c.custosPacotes || 0);
        const tax = parseFloat(c.taxasCartao || 0);
        const liquido = liq - (liq * imp) / 100 - cus - (liq * tax) / 100;
        valorLiquido += liquido;
        const percMed = parseFloat(c.percentualMedico || 60);
        repasseMedico += parseFloat(((liquido * percMed) / 100).toFixed(2));
      });
    }
    if (dados.avulsos) {
      Object.values(dados.avulsos).forEach((av) => {
        if (av.categoria !== "reembolso") {
          valorLiquido += parseFloat(av.valorLiquidoFinal || 0);
          repasseMedico += parseFloat(av.repasseMedico || 0);
        }
      });
    }
    return { repasseMedico, valorLiquido };
  }

  /**
   * Atualiza o badge e botão de status pago/pendente.
   * @param {boolean} pago
   */
  function _atualizarStatusUI(pago) {
    const badge = document.getElementById("extrato-status-badge");
    const btn = document.getElementById("btn-toggle-pago");
    const texto = document.getElementById("texto-status-pago");
    const iconPago = document.getElementById("icon-status-pago");
    const iconPendente = document.getElementById("icon-status-pendente");

    if (badge) {
      badge.textContent = pago ? "Pago" : "Pendente";
      badge.className = `extrato-status-badge ${pago ? "extrato-status-badge--pago" : "extrato-status-badge--pendente"}`;
    }
    if (btn) {
      btn.className = `extrato-status-btn ${pago ? "extrato-status-btn--pago" : "extrato-status-btn--pendente"}`;
    }
    if (texto)
      texto.textContent = pago ? "Marcar como Pendente" : "Marcar como Pago";
    if (iconPago) iconPago.style.display = pago ? "inline" : "none";
    if (iconPendente) iconPendente.style.display = pago ? "none" : "inline";
  }

  /**
   * Copia o resumo do extrato para a área de transferência.
   */
  async function copiarResumo() {
    const nomeMedico = _obterNomeMedicoAtivo();
    const elMes = document.getElementById("extrato-mes-ref");
    const mesTexto = elMes ? elMes.textContent : mesAnoExtrato;

    const totalAdiantamentos = Object.values(adiantamentosAtivos).reduce(
      (acc, a) => acc + (parseFloat(a.valor) || 0),
      0,
    );
    const saldo = totalRecebidoExtrato - totalAdiantamentos;

    const linhasAdiantamentos = Object.values(adiantamentosAtivos)
      .sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))
      .map(
        (a) =>
          `  • ${a.descricao}: - ${Ui.formatarBRL(parseFloat(a.valor) || 0)}`,
      )
      .join("\n");

    const mensagem = [
      `EXTRATO DE REPASSE — ${nomeMedico.toUpperCase()}`,
      `Período: ${mesTexto}`,
      ``,
      `Valor Líquido Total: ${Ui.formatarBRL(totalLiquidoExtrato)}`,
      `Repasse Médico: ${Ui.formatarBRL(totalRecebidoExtrato)}`,
      totalAdiantamentos > 0
        ? `Adiantamentos:\n${linhasAdiantamentos}\n  Total: - ${Ui.formatarBRL(totalAdiantamentos)}`
        : `Adiantamentos: Nenhum`,
      ``,
      `Saldo a Receber: ${Ui.formatarBRL(saldo)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(mensagem);
      Ui.mostrarToast("Resumo copiado!", "sucesso");
    } catch {
      Ui.mostrarToast("Erro ao copiar resumo", "erro");
    }
  }

  /**
   * Lê o valor numérico de um card de resumo pelo título.
   * @param {string} titulo
   * @returns {number}
   */
  function _lerValorCard(titulo) {
    const cards = document.querySelectorAll(".card-resumo");
    for (const card of cards) {
      const h3 = card.querySelector(".card-resumo__titulo");
      if (h3 && h3.textContent.trim() === titulo) {
        const valorEl = card.querySelector(".card-resumo__valor");
        if (valorEl) return parseMoeda(valorEl.textContent);
      }
    }
    return 0;
  }

  /**
   * Recalcula e re-renderiza os cards e a lista de adiantamentos no modal.
   */
  function _atualizarExtratoUI() {
    const nomeMedico = _obterNomeMedicoAtivo();
    const totalAdiantamentos = Object.values(adiantamentosAtivos).reduce(
      (acc, a) => acc + (parseFloat(a.valor) || 0),
      0,
    );

    Ui.renderizarCardsExtrato({
      nomeMedico,
      valorLiquido: totalLiquidoExtrato,
      repasseMedico: totalRecebidoExtrato,
      totalAdiantamentos,
    });

    _renderizarListaAdiantamentos();
  }

  /**
   * Retorna o nome do médico ativo a partir do <select>.
   * @returns {string}
   */
  function _obterNomeMedicoAtivo() {
    const select = document.getElementById("select-medico");
    if (!select) return "—";
    const opt = select.options[select.selectedIndex];
    return opt ? opt.text : "—";
  }

  /**
   * Renderiza a lista de adiantamentos dentro do modal de extrato.
   */
  function _renderizarListaAdiantamentos() {
    const lista = document.getElementById("lista-adiantamentos");
    if (!lista) return;

    const entradas = Object.entries(adiantamentosAtivos);
    if (entradas.length === 0) {
      lista.innerHTML =
        '<p class="extrato-adiantamentos__vazio">Nenhum adiantamento lançado neste período.</p>';
      return;
    }

    lista.innerHTML = entradas
      .sort((a, b) => (a[1].criadoEm || 0) - (b[1].criadoEm || 0))
      .map(
        ([id, a]) => `
        <div class="adiantamento-item" data-id="${id}">
          <div class="adiantamento-item__info">
            <span class="adiantamento-item__descricao">${_escaparHtml(a.descricao || "—")}</span>
            <span class="adiantamento-item__valor">- ${Ui.formatarBRL(parseFloat(a.valor) || 0)}</span>
          </div>
          <div class="adiantamento-item__acoes">
            <button
              type="button"
              class="btn-editar-adiantamento"
              data-id="${id}"
              data-descricao="${_escaparHtml(a.descricao || "")}"
              data-valor="${parseFloat(a.valor) || 0}"
              aria-label="Editar adiantamento"
              title="Editar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              type="button"
              class="btn-excluir-adiantamento"
              data-id="${id}"
              aria-label="Excluir adiantamento"
              title="Excluir"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      `,
      )
      .join("");
  }

  /**
   * Escapa caracteres HTML para evitar XSS.
   * @param {string} str
   * @returns {string}
   */
  function _escaparHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Abre o modal de novo adiantamento.
   */
  function abrirModalAdiantamento() {
    const form = document.getElementById("form-adiantamento");
    form.reset();
    form.dataset.modo = "novo";
    delete form.dataset.adiantamentoId;
    document.getElementById("modal-adiantamento-titulo").textContent =
      "Novo Adiantamento";
    document.getElementById("btn-salvar-adiantamento").textContent =
      "Salvar adiantamento";
    document.getElementById("modal-adiantamento").showModal();
  }

  /**
   * Abre o modal de adiantamento preenchido para edição.
   * @param {string} id
   * @param {{ descricao: string, valor: number }} dados
   */
  function abrirModalEdicaoAdiantamento(id, dados) {
    const form = document.getElementById("form-adiantamento");
    form.reset();
    form.dataset.modo = "editar";
    form.dataset.adiantamentoId = id;
    document.getElementById("modal-adiantamento-titulo").textContent =
      "Editar Adiantamento";
    document.getElementById("btn-salvar-adiantamento").textContent =
      "Salvar alterações";
    document.getElementById("adiantamento-descricao").value =
      dados.descricao || "";
    document.getElementById("adiantamento-valor").value = dados.valor || "";
    document.getElementById("modal-adiantamento").showModal();
  }

  /**
   * Fecha o modal de novo adiantamento.
   */
  function fecharModalAdiantamento() {
    document.getElementById("modal-adiantamento").close();
  }

  /**
   * Submete o formulário de adiantamento.
   * @param {Event} e
   */
  async function aoSubmeterAdiantamento(e) {
    e.preventDefault();
    if (!medicoAtivoId || !mesAnoAtivo) return;

    const form = e.target;
    const descricao = form.descricao.value.trim();
    const valorRaw = (form.valor.value || "")
      .replace(/[R$\s.]/g, "")
      .replace(",", ".");
    const valor = parseFloat(valorRaw) || 0;

    if (!descricao || valor <= 0) {
      Ui.mostrarToast("Preencha descrição e valor corretamente", "aviso");
      return;
    }

    try {
      if (form.dataset.modo === "editar" && form.dataset.adiantamentoId) {
        await Db.atualizarAdiantamento(
          medicoAtivoId,
          mesAnoAtivo,
          form.dataset.adiantamentoId,
          { descricao, valor },
        );
        Ui.mostrarToast("Adiantamento atualizado com sucesso!", "sucesso");
      } else {
        await Db.adicionarAdiantamento(medicoAtivoId, mesAnoAtivo, {
          descricao,
          valor,
        });
        Ui.mostrarToast("Adiantamento salvo com sucesso!", "sucesso");
      }
      fecharModalAdiantamento();
    } catch (err) {
      console.error("Erro ao salvar adiantamento:", err);
      Ui.mostrarToast("Erro ao salvar adiantamento", "erro");
    }
  }

  /**
   * Registra os eventos dos modais de extrato e adiantamento.
   * Chamado uma única vez em registrarEventos().
   */
  /* ============================================================
     PDF DO EXTRATO
     ============================================================ */

  /**
   * Gera PDF do extrato do médico com os 4 cards e lista de adiantamentos.
   */
  function gerarPDFExtrato() {
    if (!medicoAtivoId || !mesAnoAtivo) return;
    if (!window.jspdf) {
      Ui.mostrarToast("Biblioteca de PDF não carregada", "erro");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const nomeMedico = _obterNomeMedicoAtivo();
    const elMes = document.getElementById("extrato-mes-ref");
    const mesTexto = elMes ? elMes.textContent : mesAnoAtivo;
    const dataGeracao = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const corPrimaria = [41, 98, 255];
    const corCinza = [100, 116, 139];
    const corBorda = [226, 232, 240];

    // Faixa de título
    doc.setFillColor(...corPrimaria);
    doc.rect(0, 0, 210, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EXTRATO DE REPASSE MÉDICO", 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${nomeMedico}  ·  ${mesTexto}`, 14, 18);

    // Cards de resumo
    const cards = document.querySelectorAll(".extrato-cards .card-resumo");
    let yPos = 30;
    doc.setTextColor(30, 30, 30);
    const cardW = 43;
    const cardH = 18;
    let xCard = 14;
    cards.forEach((card) => {
      const titulo =
        card.querySelector(".card-resumo__titulo")?.textContent.trim() || "";
      const valor =
        card.querySelector(".card-resumo__valor")?.textContent.trim() || "";
      doc.setDrawColor(...corBorda);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(xCard, yPos, cardW, cardH, 2, 2, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corCinza);
      doc.text(titulo, xCard + 2, yPos + 6, { maxWidth: cardW - 4 });
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(valor, xCard + 2, yPos + 14, { maxWidth: cardW - 4 });
      xCard += cardW + 3;
    });
    yPos += cardH + 8;

    // Seção de adiantamentos
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...corPrimaria);
    doc.text("Adiantamentos do período", 14, yPos);
    yPos += 6;

    const entradas = Object.values(adiantamentosAtivos);
    if (entradas.length === 0) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...corCinza);
      doc.text("Nenhum adiantamento lançado neste período.", 14, yPos);
      yPos += 6;
    } else {
      doc.autoTable({
        startY: yPos,
        margin: { left: 14, right: 14 },
        head: [["Descrição", "Valor"]],
        body: entradas
          .sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))
          .map((a) => [
            a.descricao || "—",
            `- ${Ui.formatarBRL(parseFloat(a.valor) || 0)}`,
          ]),
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: {
          fillColor: corPrimaria,
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          1: { halign: "right", fontStyle: "bold", textColor: [245, 158, 11] },
        },
      });
      yPos = doc.lastAutoTable.finalY + 8;
    }

    // Rodapé
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...corCinza);
    doc.text(
      `Gerado em: ${dataGeracao}  ·  Clínica Oftalmo 15`,
      105,
      pageH - 6,
      { align: "center" },
    );

    doc.save(`Extrato_${nomeMedico.replace(/\s+/g, "_")}_${mesAnoAtivo}.pdf`);
    Ui.mostrarToast("PDF do extrato exportado!", "sucesso");
  }

  /* ============================================================
     WHATSAPP
     ============================================================ */

  /**
   * Monta mensagem de texto formatada e abre o WhatsApp Web.
   */
  function compartilharWhatsApp() {
    const nomeMedico = _obterNomeMedicoAtivo();
    const elMes = document.getElementById("extrato-mes-ref");
    const mesTexto = elMes ? elMes.textContent : mesAnoAtivo;

    const totalAdiantamentos = Object.values(adiantamentosAtivos).reduce(
      (acc, a) => acc + (parseFloat(a.valor) || 0),
      0,
    );
    const saldo = totalRecebidoExtrato - totalAdiantamentos;

    const linhasAdiantamentos = Object.values(adiantamentosAtivos)
      .sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))
      .map(
        (a) =>
          `  • ${a.descricao}: - ${Ui.formatarBRL(parseFloat(a.valor) || 0)}`,
      )
      .join("\n");

    const mensagem = [
      `🏥 *EXTRATO DE REPASSE — ${nomeMedico.toUpperCase()}*`,
      `📅 Período: ${mesTexto}`,
      ``,

      `💰 *Valor Líquido Total:* ${Ui.formatarBRL(totalLiquidoExtrato)}`,
      `👨‍⚕️ *Repasse Médico:* ${Ui.formatarBRL(totalRecebidoExtrato)}`,
      totalAdiantamentos > 0
        ? `📋 *Adiantamentos:*\n${linhasAdiantamentos}\n  *Total:* - ${Ui.formatarBRL(totalAdiantamentos)}`
        : `📋 *Adiantamentos:* Nenhum`,
      ``,
      `✅ *Saldo a Receber: ${Ui.formatarBRL(saldo)}*`,
      ``,
      `_Clínica Oftalmo 15_`,
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /* ============================================================
     HISTÓRICO DOS ÚLTIMOS MESES
     ============================================================ */

  /**
   * Carrega e renderiza o histórico dos últimos 6 meses relativo a um mês base.
   * @param {string} mesAnoBase
   */
  async function _carregarHistoricoParaMes(mesAnoBase) {
    const container = document.getElementById("tabela-historico");
    if (!container || !medicoAtivoId) return;

    container.innerHTML = `<p class="extrato-adiantamentos__vazio">Carregando histórico...</p>`;

    // Gera lista dos últimos 6 meses (excluindo o mês base)
    const meses = [];
    const [anoAtual, mesAtual] = mesAnoBase.split("-").map(Number);
    for (let i = 1; i <= 6; i++) {
      let m = mesAtual - i;
      let a = anoAtual;
      if (m <= 0) {
        m += 12;
        a -= 1;
      }
      meses.push(`${a}-${String(m).padStart(2, "0")}`);
    }

    // Busca dados de cada mês em paralelo
    const resultados = await Promise.all(
      meses.map(async (mesAno) => {
        const dados = await Db.obterRepasseUmaVez(medicoAtivoId, mesAno);
        let repasseMedico = 0;
        let totalAdiant = 0;

        // Soma repasse médico dos convênios
        if (dados.convenios) {
          Object.values(dados.convenios).forEach((c) => {
            const liq = parseFloat(c.valorLiquidoOrigem || 0);
            const imp = parseFloat(c.impostos || 0);
            const cus = parseFloat(c.custosPacotes || 0);
            const tax = parseFloat(c.taxasCartao || 0);
            const liquido = liq - (liq * imp) / 100 - cus - (liq * tax) / 100;
            const percMed = parseFloat(c.percentualMedico || 60);
            repasseMedico += parseFloat(((liquido * percMed) / 100).toFixed(2));
          });
        }
        // Soma avulsos (rep. médico)
        if (dados.avulsos) {
          Object.values(dados.avulsos).forEach((av) => {
            if (av.categoria !== "reembolso") {
              repasseMedico += parseFloat(av.repasseMedico || 0);
            }
          });
        }
        // Adiantamentos e status em paralelo
        const [adiantsSnap, statusSnap] = await Promise.all([
          new Promise((res) => {
            const para = Db.ouvirAdiantamentos(medicoAtivoId, mesAno, (d) => {
              para();
              res(d);
            });
          }),
          Db.obterStatusUmaVez(medicoAtivoId, mesAno),
        ]);
        if (adiantsSnap) {
          Object.values(adiantsSnap).forEach((a) => {
            totalAdiant += parseFloat(a.valor || 0);
          });
        }

        const pago = statusSnap.pago || false;

        const [ano, mes] = mesAno.split("-");
        const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        return {
          mesAno,
          nomeMes: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
          repasseMedico,
          totalAdiant,
          pago,
          saldo: repasseMedico - totalAdiant,
          temDados: repasseMedico > 0 || totalAdiant > 0,
        };
      }),
    );

    const comDados = resultados.filter((r) => r.temDados);
    if (comDados.length === 0) {
      container.innerHTML = `<p class="extrato-adiantamentos__vazio">Nenhum dado encontrado nos meses anteriores.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="historico-tabela">
        <div class="historico-tabela__head">
          <span>Mês</span>
          <span>Repasse Médico</span>
          <span>Adiantamentos</span>
          <span>Saldo</span>
          <span>Status</span>
        </div>
        ${comDados
          .map(
            (r) => `
          <div class="historico-tabela__row">
            <span class="historico-tabela__mes">${r.nomeMes}</span>
            <span class="historico-tabela__valor">${Ui.formatarBRL(r.repasseMedico)}</span>
            <span class="historico-tabela__adiant">${r.totalAdiant > 0 ? `- ${Ui.formatarBRL(r.totalAdiant)}` : "—"}</span>
            <span class="historico-tabela__saldo ${r.saldo < 0 ? "historico-tabela__saldo--negativo" : ""}">${Ui.formatarBRL(r.saldo)}</span>
            <span class="historico-badge ${r.pago ? "historico-badge--pago" : "historico-badge--pendente"}">${r.pago ? "Pago" : "Pendente"}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  function registrarEventosExtrato() {
    // Botão voltar da página extrato
    document
      .getElementById("btn-voltar-extrato")
      ?.addEventListener("click", fecharModalExtrato);

    // PDF do extrato
    document
      .getElementById("btn-pdf-extrato")
      ?.addEventListener("click", gerarPDFExtrato);

    // WhatsApp
    document
      .getElementById("btn-whatsapp-extrato")
      ?.addEventListener("click", compartilharWhatsApp);

    // Copiar resumo
    document
      .getElementById("btn-copiar-extrato")
      ?.addEventListener("click", copiarResumo);

    // Navegação entre meses
    document
      .getElementById("btn-mes-anterior")
      ?.addEventListener("click", () => _navegarMesExtrato(-1));
    document
      .getElementById("btn-mes-proximo")
      ?.addEventListener("click", () => _navegarMesExtrato(1));

    // Toggle status pago/pendente
    document
      .getElementById("btn-toggle-pago")
      ?.addEventListener("click", async () => {
        if (!medicoAtivoId || !mesAnoExtrato) return;
        const badge = document.getElementById("extrato-status-badge");
        const pagoAtual =
          badge && badge.classList.contains("extrato-status-badge--pago");
        try {
          await Db.salvarStatusRepasse(
            medicoAtivoId,
            mesAnoExtrato,
            !pagoAtual,
          );
        } catch {
          Ui.mostrarToast("Erro ao atualizar status", "erro");
        }
      });

    // Observação com debounce de 1.2s
    document
      .getElementById("extrato-observacao")
      ?.addEventListener("input", (e) => {
        clearTimeout(_debounceObservacao);
        _debounceObservacao = setTimeout(async () => {
          if (!medicoAtivoId || !mesAnoExtrato) return;
          try {
            await Db.salvarObservacaoRepasse(
              medicoAtivoId,
              mesAnoExtrato,
              e.target.value.trim(),
            );
          } catch {
            Ui.mostrarToast("Erro ao salvar observação", "erro");
          }
        }, 1200);
      });

    // Abrir modal adiantamento
    document
      .getElementById("btn-novo-adiantamento")
      ?.addEventListener("click", abrirModalAdiantamento);

    // Fechar modal adiantamento (botão X e botão Cancelar)
    document
      .querySelectorAll(".modal__fechar--adiantamento")
      .forEach((btn) => btn.addEventListener("click", fecharModalAdiantamento));

    document
      .getElementById("modal-adiantamento")
      .addEventListener("click", (e) => {
        if (e.target.id === "modal-adiantamento") fecharModalAdiantamento();
      });

    // Submit do form de adiantamento
    document
      .getElementById("form-adiantamento")
      .addEventListener("submit", aoSubmeterAdiantamento);

    // Delegação de eventos para editar/excluir adiantamentos
    document
      .getElementById("lista-adiantamentos")
      .addEventListener("click", async (e) => {
        const btnEditar = e.target.closest(".btn-editar-adiantamento");
        if (btnEditar) {
          const id = btnEditar.dataset.id;
          const descricao = btnEditar.dataset.descricao;
          const valor = parseFloat(btnEditar.dataset.valor) || 0;
          abrirModalEdicaoAdiantamento(id, { descricao, valor });
          return;
        }
        const btnExcluir = e.target.closest(".btn-excluir-adiantamento");
        if (btnExcluir) {
          const id = btnExcluir.dataset.id;
          try {
            await Db.excluirAdiantamento(
              medicoAtivoId,
              mesAnoExtrato || mesAnoAtivo,
              id,
            );
            Ui.mostrarToast("Adiantamento excluído", "sucesso");
          } catch (err) {
            Ui.mostrarToast("Erro ao excluir adiantamento", "erro");
          }
        }
      });
  }

  /* ============================================================
     EXPORTAÇÃO DO MÓDULO
     ============================================================ */

  return {
    inicializar,
    carregarRepasse,
    sincronizarValoresConvenio,
    aoClicarCarregar,
    executarMigracaoPercentuais,
    gerarPDF,
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
