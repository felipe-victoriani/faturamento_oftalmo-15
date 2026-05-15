/**
 * graficos.js
 * Inicialização e atualização dos 4 gráficos Chart.js.
 * Depende de Chart.js carregado via CDN.
 *
 * Funções exportadas (em window.Graficos):
 *   - inicializar()
 *   - atualizarTodos(dados, ano)
 *   - baixarGrafico(idCanvas)
 */

window.Graficos = (() => {
  /* Instâncias dos gráficos Chart.js */
  let graficoBarrasMes = null;
  let graficoDoughnut = null;
  let graficoLinhaPendente = null;
  let graficoRanking = null;

  /* Configuração de cores consistente */
  const cores = {
    producao: "#1B3F6E",
    bruto: "#065F46",
    recebido: "#5B21B6",
    pendente: "#DC2626",
    convenios: [
      "#1B3F6E",
      "#065F46",
      "#5B21B6",
      "#D97706",
      "#DC2626",
      "#0891B2",
      "#7C3AED",
      "#DB2777",
      "#EA580C",
      "#65A30D",
    ],
  };

  /* ============================================================
     INICIALIZAÇÃO DOS GRÁFICOS
     ============================================================ */

  /**
   * Inicializa todos os gráficos com dados vazios.
   * Deve ser chamado após autenticação bem-sucedida.
   */
  function inicializar() {
    inicializarGraficoBarrasMes();
    inicializarGraficoDoughnut();
    inicializarGraficoLinhaPendente();
    inicializarGraficoRanking();
  }

  /**
   * Gráfico 1: Barras agrupadas - Evolução mensal.
   */
  function inicializarGraficoBarrasMes() {
    const ctx = document.getElementById("grafico-barras-mes");
    if (!ctx) return;

    graficoBarrasMes = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Produção",
            data: [],
            backgroundColor: cores.producao,
            borderRadius: 4,
          },
          {
            label: "Faturado Bruto",
            data: [],
            backgroundColor: cores.bruto,
            borderRadius: 4,
          },
          {
            label: "Recebido",
            data: [],
            backgroundColor: cores.recebido,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { family: "'Geist', sans-serif", size: 12 },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                label += new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(context.parsed.y);
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                }).format(value);
              },
            },
          },
        },
      },
    });
  }

  /**
   * Gráfico 2: Doughnut - Distribuição por convênio.
   */
  function inicializarGraficoDoughnut() {
    const ctx = document.getElementById("grafico-doughnut");
    if (!ctx) return;

    graficoDoughnut = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: cores.convenios,
            borderWidth: 2,
            borderColor: "#FFFFFF",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 12,
              usePointStyle: true,
              font: { family: "'Geist', sans-serif", size: 12 },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const valor = context.parsed;
                const percentual = ((valor / total) * 100).toFixed(1);
                return `${context.label}: ${new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(valor)} (${percentual}%)`;
              },
            },
          },
        },
      },
    });
  }

  /**
   * Gráfico 3: Linha - Evolução do saldo pendente.
   */
  function inicializarGraficoLinhaPendente() {
    const ctx = document.getElementById("grafico-linha-pendente");
    if (!ctx) return;

    graficoLinhaPendente = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Saldo Pendente",
            data: [],
            borderColor: cores.pendente,
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: cores.pendente,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            callbacks: {
              label: function (context) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(context.parsed.y);
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                }).format(value);
              },
            },
          },
        },
      },
    });
  }

  /**
   * Gráfico 4: Barras horizontais - Ranking de convênios.
   */
  function inicializarGraficoRanking() {
    const ctx = document.getElementById("grafico-ranking");
    if (!ctx) return;

    graficoRanking = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Valor Recebido",
            data: [],
            backgroundColor: cores.recebido,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            callbacks: {
              label: function (context) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(context.parsed.x);
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                }).format(value);
              },
            },
          },
          y: {
            grid: { display: false },
          },
        },
      },
    });
  }

  /* ============================================================
     ATUALIZAÇÃO DOS GRÁFICOS
     ============================================================ */

  /**
   * Processa dados brutos e calcula métricas para os gráficos.
   * @param {Object} tabelas - Todas as tabelas do Firebase
   * @param {number} anoFiltro - Ano para filtrar (ex: 2024)
   * @returns {Object} Dados processados para cada gráfico
   */
  function processarDados(tabelas, anoFiltro) {
    const meses = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    /* Estrutura inicial para acumular dados mensais */
    const dadosMensais = Array(12)
      .fill(0)
      .map(() => ({
        producao: 0,
        bruto: 0,
        recebido: 0,
        pendente: 0,
      }));

    /* Dados por convênio */
    const dadosConvenios = {};

    /* Processar cada convênio */
    Object.keys(tabelas).forEach((convenioId) => {
      const convenio = tabelas[convenioId];
      const nomeConvenio = convenio.nome;

      dadosConvenios[nomeConvenio] = {
        producao: 0,
        bruto: 0,
        recebido: 0,
        pendente: 0,
      };

      if (convenio.registros) {
        Object.values(convenio.registros).forEach((registro) => {
          /* Filtrar por ano se dataProtocolo estiver presente */
          let incluir = true;
          if (registro.dataProtocolo && anoFiltro) {
            const ano = parseInt(registro.dataProtocolo.split("-")[0]);
            incluir = ano === anoFiltro;
          }

          if (incluir) {
            /* Determinar mês (usar dataProtocolo ou producao) */
            let mesIndex = 0;
            if (registro.dataProtocolo) {
              mesIndex = parseInt(registro.dataProtocolo.split("-")[1]) - 1;
            } else if (registro.producao) {
              mesIndex = parseInt(registro.producao.split("-")[1]) - 1;
            }

            /* Acumular valores */
            const valorProducao = parseFloat(registro.valor) || 0;
            const valorBruto = parseFloat(registro.valorBruto) || 0;
            const valorRecebido = parseFloat(registro.valorRecebido) || 0;
            const valorLiquido = parseFloat(registro.valorLiquido) || 0;
            const pendente = valorLiquido - valorRecebido;

            if (mesIndex >= 0 && mesIndex < 12) {
              dadosMensais[mesIndex].producao += valorProducao;
              dadosMensais[mesIndex].bruto += valorBruto;
              dadosMensais[mesIndex].recebido += valorRecebido;
              dadosMensais[mesIndex].pendente += pendente;
            }

            dadosConvenios[nomeConvenio].producao += valorProducao;
            dadosConvenios[nomeConvenio].bruto += valorBruto;
            dadosConvenios[nomeConvenio].recebido += valorRecebido;
            dadosConvenios[nomeConvenio].pendente += pendente;
          }
        });
      }
    });

    return {
      meses,
      dadosMensais,
      dadosConvenios,
    };
  }

  /**
   * Atualiza todos os gráficos com novos dados.
   * @param {Object} tabelas - Dados de todas as tabelas
   * @param {number} ano - Ano para filtrar (opcional)
   */
  function atualizarTodos(tabelas, ano) {
    if (!tabelas || Object.keys(tabelas).length === 0) {
      limparTodos();
      return;
    }

    const dados = processarDados(tabelas, ano);

    atualizarGraficoBarrasMes(dados);
    atualizarGraficoDoughnut(dados);
    atualizarGraficoLinhaPendente(dados);
    atualizarGraficoRanking(dados);
  }

  /**
   * Atualiza o gráfico de barras mensais.
   */
  function atualizarGraficoBarrasMes(dados) {
    if (!graficoBarrasMes) return;

    graficoBarrasMes.data.labels = dados.meses;
    graficoBarrasMes.data.datasets[0].data = dados.dadosMensais.map(
      (d) => d.producao,
    );
    graficoBarrasMes.data.datasets[1].data = dados.dadosMensais.map(
      (d) => d.bruto,
    );
    graficoBarrasMes.data.datasets[2].data = dados.dadosMensais.map(
      (d) => d.recebido,
    );
    graficoBarrasMes.update("none");
  }

  /**
   * Atualiza o gráfico de doughnut por convênio.
   */
  function atualizarGraficoDoughnut(dados) {
    if (!graficoDoughnut) return;

    const convenios = Object.keys(dados.dadosConvenios);
    const valores = convenios.map(
      (nome) => dados.dadosConvenios[nome].recebido,
    );

    graficoDoughnut.data.labels = convenios;
    graficoDoughnut.data.datasets[0].data = valores;
    graficoDoughnut.update("none");
  }

  /**
   * Atualiza o gráfico de linha do saldo pendente.
   */
  function atualizarGraficoLinhaPendente(dados) {
    if (!graficoLinhaPendente) return;

    graficoLinhaPendente.data.labels = dados.meses;
    graficoLinhaPendente.data.datasets[0].data = dados.dadosMensais.map(
      (d) => d.pendente,
    );
    graficoLinhaPendente.update("none");
  }

  /**
   * Atualiza o gráfico de ranking.
   */
  function atualizarGraficoRanking(dados) {
    if (!graficoRanking) return;

    /* Ordenar convênios por valor recebido */
    const ranking = Object.keys(dados.dadosConvenios)
      .map((nome) => ({
        nome,
        valor: dados.dadosConvenios[nome].recebido,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10); /* Top 10 */

    graficoRanking.data.labels = ranking.map((item) => item.nome);
    graficoRanking.data.datasets[0].data = ranking.map((item) => item.valor);
    graficoRanking.update("none");
  }

  /**
   * Limpa todos os gráficos (quando não há dados).
   */
  function limparTodos() {
    if (graficoBarrasMes) {
      graficoBarrasMes.data.labels = [];
      graficoBarrasMes.data.datasets.forEach((d) => (d.data = []));
      graficoBarrasMes.update("none");
    }

    if (graficoDoughnut) {
      graficoDoughnut.data.labels = [];
      graficoDoughnut.data.datasets[0].data = [];
      graficoDoughnut.update("none");
    }

    if (graficoLinhaPendente) {
      graficoLinhaPendente.data.labels = [];
      graficoLinhaPendente.data.datasets[0].data = [];
      graficoLinhaPendente.update("none");
    }

    if (graficoRanking) {
      graficoRanking.data.labels = [];
      graficoRanking.data.datasets[0].data = [];
      graficoRanking.update("none");
    }
  }

  /* ============================================================
     EXPORTAÇÃO DE GRÁFICOS
     ============================================================ */

  /**
   * Baixa um gráfico como imagem PNG.
   * @param {string} idCanvas - ID do canvas do gráfico
   */
  function baixarGrafico(idCanvas) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `${idCanvas}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    Ui.mostrarToast("Gráfico exportado com sucesso!", "sucesso");
  }

  /**
   * Popula o select de filtro de ano com anos disponíveis.
   * @param {Object} tabelas - Dados das tabelas
   */
  function popularFiltroAno(tabelas) {
    const select = document.getElementById("filtro-ano");
    if (!select) return;

    const anos = new Set();
    const anoAtual = new Date().getFullYear();

    /* Adicionar ano atual */
    anos.add(anoAtual);

    /* Extrair anos dos dados */
    Object.values(tabelas).forEach((convenio) => {
      if (convenio.registros) {
        Object.values(convenio.registros).forEach((registro) => {
          if (registro.dataProtocolo) {
            const ano = parseInt(registro.dataProtocolo.split("-")[0]);
            anos.add(ano);
          }
          if (registro.producao) {
            const ano = parseInt(registro.producao.split("-")[0]);
            anos.add(ano);
          }
        });
      }
    });

    /* Ordenar anos decrescente */
    const anosOrdenados = Array.from(anos).sort((a, b) => b - a);

    /* Preencher select */
    select.innerHTML = anosOrdenados
      .map(
        (ano) =>
          `<option value="${ano}" ${ano === anoAtual ? "selected" : ""}>${ano}</option>`,
      )
      .join("");
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */

  return {
    inicializar,
    atualizarTodos,
    baixarGrafico,
    popularFiltroAno,
  };
})();
