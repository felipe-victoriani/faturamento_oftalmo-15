/**
 * app.js
 * Orquestrador principal do sistema.
 * Conecta Auth, Db, Ui e Graficos através de event listeners.
 *
 * Fluxo:
 * 1. Aguarda DOMContentLoaded
 * 2. Configura listeners de autenticação
 * 3. Ao fazer login: carrega dados, inicializa gráficos, renderiza UI
 * 4. Gerencia todos os event listeners (delegação)
 */

(function () {
  "use strict";

  /* Estado global da aplicação */
  let estadoApp = {
    usuario: null,
    tabelas: null,
    configuracoes: { percentualImposto: 17.5 },
    convenioAtivo: null,
    anoAtivo: new Date().getFullYear(),
  };

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */

  document.addEventListener("DOMContentLoaded", () => {
    inicializarApp();
  });

  function inicializarApp() {
    console.log("🚀 Iniciando aplicação...");

    /* Configurar listeners da tela de login */
    Auth.configurarListenersLogin();

    /* Registrar callback de mudança de autenticação */
    Auth.aoMudarEstado((usuario) => {
      if (usuario) {
        aoFazerLogin(usuario);
      } else {
        aoFazerLogout();
      }
    });

    /* Configurar todos os event listeners do sistema */
    configurarEventListeners();
  }

  /* ============================================================
     CALLBACKS DE AUTENTICAÇÃO
     ============================================================ */

  /**
   * Executado quando usuário faz login com sucesso.
   */
  function aoFazerLogin(usuario) {
    console.log("✅ Usuário autenticado:", usuario.email);

    estadoApp.usuario = usuario;

    /* Mostrar tela do sistema */
    Ui.mostrarSistema(usuario);
    Ui.iniciarSkeletonLoading();

    /* Inicializar gráficos */
    Graficos.inicializar();

    /* Ouvir status de conexão */
    Db.ouvirConexao((online) => {
      Ui.atualizarStatusConexao(online);
    });

    /* Ouvir configurações globais */
    Db.ouvirConfiguracoes((config) => {
      if (config) {
        estadoApp.configuracoes = config;
        atualizarCamposConfiguracao(config);
      }
    });

    /* Ouvir todas as tabelas (convênios) */
    Db.ouvirTabelas((tabelas) => {
      estadoApp.tabelas = tabelas;
      Ui.pararSkeletonLoading();

      if (!tabelas || Object.keys(tabelas).length === 0) {
        /* Nenhum convênio — mostrar mensagem */
        Ui.renderizarAbas({}, null);
        Ui.renderizarCards({
          producao: 0,
          bruto: 0,
          impostos: 0,
          liquido: 0,
          recebido: 0,
          pendente: 0,
        });
        Ui.renderizarTabela(null, null, "Nenhum convênio");
        Ui.renderizarTotalizadores({
          producao: 0,
          bruto: 0,
          impostos: 0,
          liquido: 0,
          recebido: 0,
          pendente: 0,
        });
        return;
      }

      /* Definir convênio ativo (primeiro ou último selecionado) */
      if (!estadoApp.convenioAtivo || !tabelas[estadoApp.convenioAtivo]) {
        estadoApp.convenioAtivo = Object.keys(tabelas)[0];
      }

      /* Renderizar interface */
      renderizarInterface();

      /* Atualizar timestamp de sincronização */
      Ui.atualizarUltimaSync();
    });
  }

  /**
   * Executado quando usuário faz logout.
   */
  function aoFazerLogout() {
    console.log("👋 Usuário desconectado");

    estadoApp = {
      usuario: null,
      tabelas: null,
      configuracoes: { percentualImposto: 17.5 },
      convenioAtivo: null,
      anoAtivo: new Date().getFullYear(),
    };

    Ui.mostrarTelaLogin();
  }

  /* ============================================================
     RENDERIZAÇÃO PRINCIPAL
     ============================================================ */

  /**
   * Renderiza toda a interface com base no estado atual.
   */
  function renderizarInterface() {
    const { tabelas, convenioAtivo } = estadoApp;

    if (!tabelas) return;

    /* Renderizar abas de convênios */
    Ui.renderizarAbas(tabelas, convenioAtivo);

    /* Calcular totais do convênio ativo */
    const convenio = tabelas[convenioAtivo];
    const registros = convenio ? convenio.registros : null;
    const totais = calcularTotais(registros);

    /* Renderizar cards de resumo */
    Ui.renderizarCards(totais);

    /* Renderizar tabela */
    Ui.renderizarTabela(
      registros,
      convenioAtivo,
      convenio ? convenio.nome : "Sem nome",
    );

    /* Renderizar totalizadores */
    Ui.renderizarTotalizadores(totais);

    /* Atualizar gráficos */
    Graficos.atualizarTodos(tabelas, estadoApp.anoAtivo);

    /* Popular filtro de ano */
    Graficos.popularFiltroAno(tabelas);
  }

  /**
   * Calcula totais de um conjunto de registros.
   */
  function calcularTotais(registros) {
    const totais = {
      producao: 0,
      bruto: 0,
      impostos: 0,
      liquido: 0,
      recebido: 0,
      pendente: 0,
    };

    if (!registros) return totais;

    Object.values(registros).forEach((registro) => {
      totais.producao += parseFloat(registro.valor) || 0;
      totais.bruto += parseFloat(registro.valorBruto) || 0;
      totais.impostos += parseFloat(registro.impostos) || 0;
      totais.liquido += parseFloat(registro.valorLiquido) || 0;
      totais.recebido += parseFloat(registro.valorRecebido) || 0;
    });

    totais.pendente = totais.liquido - totais.recebido;

    return totais;
  }

  /* ============================================================
     EVENT LISTENERS — DELEGAÇÃO
     ============================================================ */

  function configurarEventListeners() {
    /* ---- Navegação principal ---- */
    document.getElementById("btn-nav-tabelas").addEventListener("click", () => {
      mostrarView("view-tabelas");
    });

    document
      .getElementById("btn-nav-dashboard")
      .addEventListener("click", () => {
        mostrarView("view-dashboard");
      });

    document
      .getElementById("btn-nav-repasses")
      .addEventListener("click", () => {
        mostrarView("view-repasses");
        Repasses.inicializar();
      });

    /* ---- Logout ---- */
    document.getElementById("btn-sair").addEventListener("click", async () => {
      try {
        await Auth.fazerLogout();
      } catch (erro) {
        Ui.mostrarToast(erro.message, "erro");
      }
    });

    /* ---- Botão de configurações ---- */
    document
      .getElementById("btn-configuracoes")
      .addEventListener("click", () => {
        document.getElementById("modal-configuracoes").showModal();
      });

    /* ---- Abas de convênios (delegação) ---- */
    document.getElementById("nav-convenios").addEventListener("click", (e) => {
      /* Clique na aba para trocar de convênio */
      const aba = e.target.closest(".nav-convenios__aba");
      if (aba && !aba.classList.contains("nav-convenios__aba--ativa")) {
        estadoApp.convenioAtivo = aba.dataset.convenioId;
        renderizarInterface();
        return;
      }

      /* Clique no botão de editar percentual */
      const btnEditar = e.target.closest(".nav-convenios__btn-editar");
      if (btnEditar) {
        e.stopPropagation();
        const convenioId = btnEditar.dataset.convenioId;
        const percentualAtual = btnEditar.dataset.percentualAtual;
        const convenioNome = estadoApp.tabelas[convenioId]?.nome || "tabela";
        abrirModalEditarPercentual(convenioId, convenioNome, percentualAtual);
        return;
      }

      /* Clique no botão de excluir tabela */
      const btnExcluir = e.target.closest(".nav-convenios__btn-excluir");
      if (btnExcluir) {
        e.stopPropagation();
        const convenioId = btnExcluir.dataset.convenioId;
        const convenioNome = estadoApp.tabelas[convenioId]?.nome || "tabela";
        confirmarExclusaoTabela(convenioId, convenioNome);
      }
    });

    /* ---- Botão de novo convênio ---- */
    document
      .getElementById("btn-novo-convenio")
      .addEventListener("click", () => {
        document.getElementById("modal-novo-convenio").showModal();
      });

    /* ---- Fechar modais (delegação) ---- */
    document.addEventListener("click", (e) => {
      const btnFechar = e.target.closest("[data-fechar-modal]");
      if (btnFechar) {
        const modalId = btnFechar.getAttribute("data-fechar-modal");
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.close();
        }
      }
    });

    /* ---- Formulário de novo convênio ---- */
    document
      .getElementById("form-novo-convenio")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("novo-convenio-nome").value.trim();
        const percentual =
          parseFloat(
            document.getElementById("novo-convenio-percentual").value,
          ) || 17.5;

        if (!nome) {
          Ui.mostrarToast("Informe o nome do convênio", "aviso");
          return;
        }

        if (percentual < 0 || percentual > 100) {
          Ui.mostrarToast("Percentual deve estar entre 0 e 100", "aviso");
          return;
        }

        try {
          await Db.adicionarConvenio(nome, percentual);
          Ui.mostrarToast("Convênio criado com sucesso!", "sucesso");
          document.getElementById("modal-novo-convenio").close();
          document.getElementById("novo-convenio-nome").value = "";
          document.getElementById("novo-convenio-percentual").value = "17.5";
        } catch (erro) {
          Ui.mostrarToast(erro.message, "erro");
        }
      });

    /* ---- Formulário de editar percentual de imposto ---- */
    document
      .getElementById("form-editar-percentual")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const modal = document.getElementById("modal-editar-percentual");
        const convenioId = modal.dataset.convenioId;
        const percentual = parseFloat(
          document.getElementById("editar-percentual-valor").value,
        );

        if (!convenioId) {
          Ui.mostrarToast("Erro: Convênio não identificado", "erro");
          return;
        }

        if (isNaN(percentual) || percentual < 0 || percentual > 100) {
          Ui.mostrarToast("Percentual deve estar entre 0 e 100", "aviso");
          return;
        }

        try {
          const resultado = await Db.atualizarPercentualImposto(
            convenioId,
            percentual,
          );

          if (resultado.atualizados > 0) {
            Ui.mostrarToast(
              `Percentual atualizado! ${resultado.atualizados} registro(s) recalculado(s).`,
              "sucesso",
            );
          } else {
            Ui.mostrarToast("Percentual atualizado com sucesso!", "sucesso");
          }

          modal.close();
        } catch (erro) {
          Ui.mostrarToast(erro.message, "erro");
        }
      });

    /* ---- Botão de adicionar registro ---- */
    document.getElementById("corpo-tabela").addEventListener("click", (e) => {
      if (e.target.closest("#btn-adicionar-linha")) {
        abrirModalNovoRegistro();
      }

      /* Botões de ação na linha */
      const btnAcao = e.target.closest(".btn-acao");
      if (btnAcao) {
        const linha = btnAcao.closest("tr");
        const registroId = linha.dataset.registroId;
        const convenioId = linha.dataset.convenioId;
        const acao = btnAcao.dataset.acao;

        if (acao === "editar") {
          const registro = estadoApp.tabelas[convenioId].registros[registroId];
          Ui.abrirModalEdicao(registro, convenioId, registroId);
        } else if (acao === "excluir") {
          confirmarExclusao(convenioId, registroId);
        }
      }
    });

    /* ---- Edição inline nas células ---- */
    document.getElementById("corpo-tabela").addEventListener(
      "blur",
      async (e) => {
        const celula = e.target.closest(".celula-editavel");
        if (celula) {
          await salvarEdicaoInline(celula);
        }
      },
      true,
    );

    /* ---- Formulário de edição de registro ---- */
    document
      .getElementById("form-edicao")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await salvarEdicaoCompleta();
      });

    /* ---- Botão de excluir no modal de edição ---- */
    document
      .getElementById("btn-excluir-registro")
      .addEventListener("click", () => {
        const form = document.getElementById("form-edicao");
        const convenioId = form.dataset.convenioId;
        const registroId = form.dataset.registroId;
        document.getElementById("modal-edicao").close();
        confirmarExclusao(convenioId, registroId);
      });

    /* ---- Fechar modais ---- */
    document.querySelectorAll(".modal__fechar").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest("dialog").close();
      });
    });

    /* ---- Formulário de configurações ---- */
    document
      .getElementById("form-configuracoes")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await salvarConfiguracoes();
      });

    /* ---- Botão de recalcular impostos ---- */
    document
      .getElementById("btn-recalcular-impostos")
      .addEventListener("click", async () => {
        const percentual =
          parseFloat(
            document.getElementById("config-percentual-imposto").value,
          ) || 17.5;

        if (
          !confirm(
            `Recalcular impostos de todos os registros com ${percentual}%?`,
          )
        ) {
          return;
        }

        try {
          await Db.recalcularTodosImpostos(percentual);
          Ui.mostrarToast("Impostos recalculados com sucesso!", "sucesso");
        } catch (erro) {
          Ui.mostrarToast(erro.message, "erro");
        }
      });

    /* ---- Busca ---- */
    document.getElementById("campo-busca").addEventListener("input", (e) => {
      realizarBusca(e.target.value);
    });

    /* ---- Filtro de ano no dashboard ---- */
    document.getElementById("filtro-ano").addEventListener("change", (e) => {
      estadoApp.anoAtivo = parseInt(e.target.value);
      Graficos.atualizarTodos(estadoApp.tabelas, estadoApp.anoAtivo);
    });

    /* ---- Botões de download de gráficos ---- */
    document.querySelectorAll('[data-acao="baixar-grafico"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const container = btn.closest(".grafico-container");
        const canvas = container.querySelector("canvas");
        if (canvas) {
          Graficos.baixarGrafico(canvas.id);
        }
      });
    });

    /* ---- Botão de exportar CSV ---- */
    document
      .getElementById("btn-exportar-csv")
      .addEventListener("click", () => {
        exportarCSVConvenioAtivo();
      });

    /* ---- Botão de exportar JSON ---- */
    document
      .getElementById("btn-exportar-json")
      .addEventListener("click", async () => {
        try {
          const dados = await Db.exportarJSON();
          const blob = new Blob([JSON.stringify(dados, null, 2)], {
            type: "application/json",
          });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `backup-${Date.now()}.json`;
          link.click();
          Ui.mostrarToast("Backup JSON exportado com sucesso!", "sucesso");
        } catch (erro) {
          Ui.mostrarToast(erro.message, "erro");
        }
      });

    /* ---- Botão de exportar CSV (todas as tabelas) ---- */
    document
      .getElementById("btn-exportar-csv-tudo")
      .addEventListener("click", () => {
        if (!estadoApp.tabelas) {
          Ui.mostrarToast("Nenhum dado para exportar", "aviso");
          return;
        }

        Object.keys(estadoApp.tabelas).forEach((convenioId) => {
          const convenio = estadoApp.tabelas[convenioId];
          const registros = convenio.registros || {};
          const nomeArquivo = `faturamento-${convenio.nome || convenioId}-${Date.now()}.csv`;
          Ui.exportarCSV(Object.values(registros), nomeArquivo);
        });

        Ui.mostrarToast("Arquivos CSV exportados com sucesso!", "sucesso");
      });

    /* ---- Botão de exportar Excel ---- */
    document
      .getElementById("btn-exportar-excel")
      .addEventListener("click", () => {
        exportarExcelConvenioAtivo();
      });

    /* ---- Botão de exportar PDF ---- */
    document
      .getElementById("btn-exportar-pdf")
      .addEventListener("click", () => {
        exportarPDFConvenioAtivo();
      });

    /* ---- Botão de redefinir senha ---- */
    document
      .getElementById("btn-reset-senha")
      .addEventListener("click", async () => {
        const usuario = Auth.obterUsuarioAtual();
        if (!usuario || !usuario.email) {
          Ui.mostrarToast("Nenhum usuário autenticado", "erro");
          return;
        }

        if (
          !confirm(
            `Enviar e-mail de redefinição de senha para ${usuario.email}?`,
          )
        ) {
          return;
        }

        try {
          await Auth.recuperarSenha(usuario.email);
          Ui.mostrarToast(
            "E-mail de redefinição enviado com sucesso!",
            "sucesso",
          );
        } catch (erro) {
          Ui.mostrarToast(erro.message, "erro");
        }
      });

    /* ---- Cálculo automático de impostos no modal ---- */
    document
      .getElementById("edicao-valor-bruto")
      .addEventListener("input", () => {
        calcularImpostosModal();
      });

    /* ---- Botões de paginação ---- */
    document
      .getElementById("btn-pagina-anterior")
      .addEventListener("click", () => {
        const paginaAtual = Ui.getPaginaAtual();
        if (paginaAtual > 1) {
          Ui.irParaPagina(paginaAtual - 1);
          renderizarInterface();
        }
      });

    document
      .getElementById("btn-pagina-proxima")
      .addEventListener("click", () => {
        const paginaAtual = Ui.getPaginaAtual();
        Ui.irParaPagina(paginaAtual + 1);
        renderizarInterface();
      });

    /* ---- Botão de excluir conta ---- */
    document
      .getElementById("btn-excluir-conta")
      .addEventListener("click", async () => {
        await excluirContaUsuario();
      });
  }

  /* ============================================================
     HANDLERS DE AÇÕES
     ============================================================ */

  /**
   * Alterna visibilidade entre views (Tabelas / Dashboard).
   */
  function mostrarView(viewId) {
    /* Ocultar todas as views */
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.add("view--oculta");
    });

    /* Mostrar a view solicitada */
    const viewAtiva = document.getElementById(viewId);
    if (viewAtiva) {
      viewAtiva.classList.remove("view--oculta");
    }

    /* Atualizar botões ativos */
    document.querySelectorAll(".nav-principal__item").forEach((btn) => {
      btn.classList.remove("nav-principal__item--ativo");
      btn.removeAttribute("aria-current");
    });

    /* Marcar botão ativo */
    if (viewId === "view-tabelas") {
      const btn = document.getElementById("btn-nav-tabelas");
      if (btn) {
        btn.classList.add("nav-principal__item--ativo");
        btn.setAttribute("aria-current", "page");
      }
    } else if (viewId === "view-dashboard") {
      const btn = document.getElementById("btn-nav-dashboard");
      if (btn) {
        btn.classList.add("nav-principal__item--ativo");
        btn.setAttribute("aria-current", "page");
      }
    }
  }

  /**
   * Calcula impostos no modal de edição em tempo real.
   */
  function calcularImpostosModal() {
    const valorBruto =
      parseFloat(document.getElementById("edicao-valor-bruto").value) || 0;
    const percentualImposto = estadoApp.configuracoes.percentualImposto || 17.5;

    const impostos = valorBruto * (percentualImposto / 100);
    const valorLiquido = valorBruto - impostos;

    document.getElementById("edicao-impostos").textContent =
      Ui.formatarBRL(impostos);
    document.getElementById("edicao-valor-liquido").textContent =
      Ui.formatarBRL(valorLiquido);
  }

  /**
   * Abre modal para adicionar novo registro.
   */
  function abrirModalNovoRegistro() {
    /* Verificar se há convênio ativo */
    if (!estadoApp.convenioAtivo) {
      Ui.mostrarToast("Selecione um convênio primeiro", "aviso");
      return;
    }

    const form = document.getElementById("form-edicao");
    form.reset();
    form.dataset.convenioId = estadoApp.convenioAtivo;
    form.dataset.registroId = ""; /* Vazio = novo */

    /* Alterar título do modal */
    document.getElementById("modal-edicao-titulo").textContent =
      "Novo Registro";

    /* Alterar texto do botão de submit */
    document.getElementById("btn-salvar-edicao").textContent = "Criar Registro";

    /* Resetar campos calculados */
    document.getElementById("edicao-impostos").textContent = "R$ 0,00";
    document.getElementById("edicao-valor-liquido").textContent = "R$ 0,00";

    /* Esconder botão de excluir */
    document.getElementById("btn-excluir-registro").hidden = true;

    document.getElementById("modal-edicao").showModal();
  }

  /**
   * Salva edição inline de uma célula.
   */
  async function salvarEdicaoInline(celula) {
    const linha = celula.closest("tr");
    const convenioId = linha.dataset.convenioId;
    const registroId = linha.dataset.registroId;
    const campo = celula.dataset.campo;
    const tipo = celula.dataset.tipo;

    let valor = celula.textContent.trim();

    /* Converter conforme tipo */
    if (tipo === "number") {
      /* Remover formatação BRL */
      valor = valor
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();
      valor = parseFloat(valor) || 0;
    } else if (tipo === "date" || tipo === "month") {
      valor = Ui.desformatarData(valor);
    }

    try {
      const registro = estadoApp.tabelas[convenioId].registros[registroId];
      const dadosAtualizados = { ...registro, [campo]: valor };
      await Db.salvarRegistro(convenioId, registroId, dadosAtualizados);
      Ui.mostrarToast("Registro atualizado!", "sucesso", 2000);
    } catch (erro) {
      Ui.mostrarToast(erro.message, "erro");
      /* Reverter alteração */
      renderizarInterface();
    }
  }

  /**
   * Salva edição completa do modal.
   */
  async function salvarEdicaoCompleta() {
    const form = document.getElementById("form-edicao");
    const convenioId = form.dataset.convenioId;
    const registroId = form.dataset.registroId;

    const dados = {
      producao: document.getElementById("edicao-producao").value,
      nFatura: document.getElementById("edicao-n-fatura").value,
      dataProtocolo: document.getElementById("edicao-data-protocolo").value,
      valor: parseFloat(document.getElementById("edicao-valor").value) || 0,
      nNF: document.getElementById("edicao-n-nf").value,
      dataNF: document.getElementById("edicao-data-nf").value,
      valorBruto:
        parseFloat(document.getElementById("edicao-valor-bruto").value) || 0,
      valorRecebido:
        parseFloat(document.getElementById("edicao-valor-recebido").value) || 0,
      dataRecebimento: document.getElementById("edicao-data-recebimento").value,
      observacoes:
        parseFloat(document.getElementById("edicao-observacoes").value) || 0,
      recurso: document.getElementById("edicao-recurso").value,
    };

    try {
      /* Validar dados antes de salvar */
      validarRegistro(dados);

      if (registroId) {
        /* Editar existente */
        await Db.salvarRegistro(convenioId, registroId, dados);
        Ui.mostrarToast("Registro atualizado com sucesso!", "sucesso");
      } else {
        /* Criar novo */
        await Db.adicionarRegistro(convenioId, dados);
        Ui.mostrarToast("Registro criado com sucesso!", "sucesso");
      }

      document.getElementById("modal-edicao").close();
    } catch (erro) {
      Ui.mostrarToast(erro.message, "erro");
    }
  }

  /**
   * Confirma e executa exclusão de registro.
   */
  async function confirmarExclusao(convenioId, registroId) {
    if (!confirm("Deseja realmente excluir este registro?")) {
      return;
    }

    try {
      await Db.excluirRegistro(convenioId, registroId);
      Ui.mostrarToast("Registro excluído com sucesso!", "sucesso");
    } catch (erro) {
      Ui.mostrarToast(erro.message, "erro");
    }
  }

  /**
   * Salva configurações globais.
   */
  async function salvarConfiguracoes() {
    const percentualImposto =
      parseFloat(document.getElementById("config-percentual-imposto").value) ||
      17.5;

    try {
      await Db.salvarConfiguracoes({ percentualImposto });
      Ui.mostrarToast("Configurações salvas com sucesso!", "sucesso");
      document.getElementById("modal-configuracoes").close();
    } catch (erro) {
      Ui.mostrarToast(erro.message, "erro");
    }
  }

  /**
   * Atualiza campos do formulário de configurações.
   */
  function atualizarCamposConfiguracao(config) {
    const campoImposto = document.getElementById("config-percentual-imposto");
    if (campoImposto) {
      campoImposto.value = config.percentualImposto || 17.5;
    }
  }

  /**
   * Realiza busca na tabela ativa.
   */
  function realizarBusca(termo) {
    const linhas = document.querySelectorAll(
      "#corpo-tabela tr[data-registro-id]",
    );
    const termoLower = termo.toLowerCase();

    linhas.forEach((linha) => {
      const texto = linha.textContent.toLowerCase();
      linha.hidden = termo && !texto.includes(termoLower);
    });
  }

  /**
   * Exporta CSV do convênio ativo.
   */
  function exportarCSVConvenioAtivo() {
    const { tabelas, convenioAtivo } = estadoApp;
    if (!tabelas || !convenioAtivo) {
      Ui.mostrarToast("Nenhum convênio selecionado", "aviso");
      return;
    }

    const convenio = tabelas[convenioAtivo];
    const registros = convenio.registros
      ? Object.values(convenio.registros)
      : [];

    if (registros.length === 0) {
      Ui.mostrarToast("Nenhum registro para exportar", "aviso");
      return;
    }

    const nomeArquivo = `${convenio.nome.replace(/\s/g, "_")}-${Date.now()}.csv`;
    Ui.exportarCSV(registros, nomeArquivo);
  }

  /**
   * Exporta o convênio ativo para Excel (.xlsx).
   */
  function exportarExcelConvenioAtivo() {
    const { tabelas, convenioAtivo } = estadoApp;
    if (!tabelas || !convenioAtivo) {
      Ui.mostrarToast("Nenhum convênio selecionado", "aviso");
      return;
    }

    const convenio = tabelas[convenioAtivo];
    const registros = convenio.registros
      ? Object.values(convenio.registros)
      : [];

    if (registros.length === 0) {
      Ui.mostrarToast("Nenhum registro para exportar", "aviso");
      return;
    }

    const nomeArquivo = `${convenio.nome.replace(/\s/g, "_")}-${Date.now()}.xlsx`;
    Ui.exportarExcel(registros, nomeArquivo, convenio.nome);
  }

  /**
   * Exporta o convênio ativo para PDF.
   */
  function exportarPDFConvenioAtivo() {
    const { tabelas, convenioAtivo } = estadoApp;
    if (!tabelas || !convenioAtivo) {
      Ui.mostrarToast("Nenhum convênio selecionado", "aviso");
      return;
    }

    const convenio = tabelas[convenioAtivo];
    const registros = convenio.registros
      ? Object.values(convenio.registros)
      : [];

    if (registros.length === 0) {
      Ui.mostrarToast("Nenhum registro para exportar", "aviso");
      return;
    }

    const nomeArquivo = `${convenio.nome.replace(/\s/g, "_")}-${Date.now()}.pdf`;
    Ui.exportarPDF(registros, nomeArquivo, convenio.nome);
  }

  /**
   * Abre o modal para editar o percentual de imposto de um convênio.
   */
  function abrirModalEditarPercentual(
    convenioId,
    convenioNome,
    percentualAtual,
  ) {
    const modal = document.getElementById("modal-editar-percentual");
    const inputPercentual = document.getElementById("editar-percentual-valor");
    const nomeConvenio = document.getElementById(
      "modal-percentual-nome-convenio",
    );

    /* Preencher dados do modal */
    nomeConvenio.textContent = convenioNome;
    inputPercentual.value = percentualAtual || "17.5";

    /* Guardar convenioId no modal para uso no submit */
    modal.dataset.convenioId = convenioId;

    /* Abrir modal */
    modal.showModal();
    inputPercentual.focus();
  }

  /**
   * Confirma e executa a exclusão de uma tabela/convênio.
   */
  async function confirmarExclusaoTabela(convenioId, convenioNome) {
    const confirmacao = confirm(
      `Tem certeza que deseja EXCLUIR PERMANENTEMENTE a tabela "${convenioNome}"?\n\n` +
        `Todos os registros desta tabela serão perdidos!\n\n` +
        `Esta ação NÃO pode ser desfeita.`,
    );

    if (!confirmacao) {
      return;
    }

    try {
      await Db.excluirConvenio(convenioId);
      Ui.mostrarToast(
        `Tabela "${convenioNome}" excluída com sucesso!`,
        "sucesso",
      );

      /* Se era a tabela ativa, limpar seleção */
      if (estadoApp.convenioAtivo === convenioId) {
        estadoApp.convenioAtivo = null;
      }
    } catch (erro) {
      Ui.mostrarToast(erro.message, "erro");
    }
  }

  /* ============================================================
     VALIDAÇÃO E SEGURANÇA
     ============================================================ */

  /**
   * Valida dados de um registro antes de salvar.
   * @param {Object} dados - Dados do registro
   * @throws {Error} Se houver erro de validação
   */
  function validarRegistro(dados) {
    const erros = [];

    /* Validar valores numéricos */
    if (dados.valor !== undefined && dados.valor < 0) {
      erros.push("• Valor não pode ser negativo");
    }

    if (dados.valorBruto !== undefined && dados.valorBruto < 0) {
      erros.push("• Valor bruto não pode ser negativo");
    }

    if (dados.valorRecebido !== undefined && dados.valorRecebido < 0) {
      erros.push("• Valor recebido não pode ser negativo");
    }

    if (dados.observacoes !== undefined && dados.observacoes < 0) {
      erros.push("• Observações não pode ser negativo");
    }

    /* Validar lógica de negócio */
    if (dados.valorRecebido > dados.valorBruto && dados.valorBruto > 0) {
      erros.push("• Valor recebido não pode ser maior que valor bruto");
    }

    /* Validar datas */
    if (dados.producao && !validarData(dados.producao, "month")) {
      erros.push("• Mês de produção inválido (formato: YYYY-MM)");
    }

    if (dados.dataProtocolo && !validarData(dados.dataProtocolo)) {
      erros.push("• Data de protocolo inválida (formato: YYYY-MM-DD)");
    }

    if (dados.dataNF && !validarData(dados.dataNF)) {
      erros.push("• Data da NF inválida (formato: YYYY-MM-DD)");
    }

    if (dados.dataRecebimento && !validarData(dados.dataRecebimento)) {
      erros.push("• Data de recebimento inválida (formato: YYYY-MM-DD)");
    }

    /* Validar strings */
    if (dados.nFatura && dados.nFatura.length > 100) {
      erros.push("• Número da fatura muito longo (máximo 100 caracteres)");
    }

    if (dados.nNF && dados.nNF.length > 100) {
      erros.push("• Número da NF muito longo (máximo 100 caracteres)");
    }

    if (dados.recurso && dados.recurso.length > 500) {
      erros.push("• Descrição do recurso muito longa (máximo 500 caracteres)");
    }

    if (erros.length > 0) {
      throw new Error("Erros de validação:\n\n" + erros.join("\n"));
    }
  }

  /**
   * Valida formato de data ISO (YYYY-MM-DD ou YYYY-MM).
   * @param {string} data - Data a validar
   * @param {string} tipo - 'date' ou 'month'
   * @returns {boolean}
   */
  function validarData(data, tipo = "date") {
    if (!data) return true; // Vazio é permitido

    if (tipo === "month") {
      const regex = /^\d{4}-\d{2}$/;
      if (!regex.test(data)) return false;
      const [ano, mes] = data.split("-").map(Number);
      return ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12;
    }

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(data)) return false;
    const d = new Date(data + "T00:00:00");
    return d instanceof Date && !isNaN(d.getTime());
  }

  /**
   * Exclui a conta do usuário e todos os seus dados permanentemente.
   * Implementação conforme LGPD (direito ao esquecimento).
   */
  async function excluirContaUsuario() {
    const usuario = Auth.obterUsuarioAtual();
    if (!usuario) {
      Ui.mostrarToast("Nenhum usuário autenticado", "erro");
      return;
    }

    /* TRIPLA CONFIRMAÇÃO */
    if (
      !confirm(
        "⚠️ ATENÇÃO: Você está prestes a EXCLUIR SUA CONTA.\n\n" +
          "Todos os seus dados serão APAGADOS PERMANENTEMENTE:\n" +
          "• Todos os convênios e tabelas\n" +
          "• Todos os registros de faturamento\n" +
          "• Todas as configurações\n\n" +
          "Esta ação é IRREVERSÍVEL e não pode ser desfeita!\n\n" +
          "Deseja continuar?",
      )
    ) {
      return;
    }

    if (
      !confirm(
        "⚠️ ÚLTIMA CONFIRMAÇÃO:\n\n" +
          "Tem ABSOLUTA CERTEZA que deseja excluir sua conta?\n\n" +
          "Esta ação NÃO PODE SER DESFEITA!\n\n" +
          "Clique em OK para prosseguir com a exclusão permanente.",
      )
    ) {
      return;
    }

    const confirmacao = prompt(
      'Digite "EXCLUIR" em letras MAIÚSCULAS para confirmar a exclusão da conta:',
    );

    if (confirmacao !== "EXCLUIR") {
      Ui.mostrarToast("Exclusão cancelada", "aviso");
      return;
    }

    try {
      Ui.mostrarToast(
        "Excluindo sua conta e todos os dados...",
        "aviso",
        10000,
      );

      /* 1. Excluir todos os dados do usuário no Firebase */
      const { firebaseDb } = window;
      await firebaseDb.ref("faturamento/tabelas").remove();
      await firebaseDb.ref("faturamento/configuracoes").remove();

      /* 2. Excluir conta de autenticação */
      await usuario.delete();

      /* 3. Redirecionar para login */
      Ui.mostrarToast(
        "Conta excluída com sucesso. Seus dados foram removidos permanentemente. Até logo!",
        "sucesso",
        5000,
      );

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (erro) {
      if (erro.code === "auth/requires-recent-login") {
        Ui.mostrarToast(
          "Por segurança, você precisa fazer login novamente antes de excluir a conta. " +
            "Por favor, saia e faça login novamente, depois tente excluir a conta.",
          "erro",
          8000,
        );
        Auth.fazerLogout();
      } else {
        Ui.mostrarToast("Erro ao excluir conta: " + erro.message, "erro");
      }
    }
  }
})();
