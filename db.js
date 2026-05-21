/**
 * db.js
 * Camada de acesso ao Firebase Realtime Database.
 * Todas as leituras e escritas passam por este arquivo.
 * Nenhum outro arquivo deve chamar firebaseDb diretamente.
 *
 * Funções exportadas (em window.Db):
 *   - ouvirTabelas(callback)
 *   - ouvirConfiguracoes(callback)
 *   - ouvirConexao(callback)
 *   - salvarRegistro(convenioId, registroId, dados)
 *   - adicionarRegistro(convenioId, dados)
 *   - excluirRegistro(convenioId, registroId)
 *   - adicionarConvenio(nome)
 *   - excluirConvenio(convenioId)
 *   - salvarConfiguracoes(dados)
 *   - recalcularTodosImpostos(percentual)
 */

window.Db = (() => {
  /* Referências principais do Firebase */
  const refTabelas = firebaseDb.ref("faturamento/tabelas");
  const refConfiguracoes = firebaseDb.ref("faturamento/configuracoes");
  const refConexao = firebaseDb.ref(".info/connected");

  /* ============================================================
     LISTENERS — Ouvir mudanças em tempo real
     ============================================================ */

  /**
   * Ouve mudanças em todas as tabelas de convênios.
   * Executa o callback sempre que houver atualização.
   *
   * @param {Function} callback - Recebe snapshot.val() de todas as tabelas
   */
  function ouvirTabelas(callback) {
    refTabelas.on("value", (snapshot) => {
      const dados = snapshot.val() || {};
      callback(dados);
    });
  }

  /**
   * Obtém todas as tabelas de convênios uma única vez (sem listener).
   * Usado quando precisamos dos dados apenas uma vez, sem atualizações em tempo real.
   *
   * @returns {Promise<Object>} Snapshot de todas as tabelas
   */
  async function obterTabelas() {
    try {
      const snapshot = await refTabelas.once("value");
      return snapshot.val() || {};
    } catch (erro) {
      console.error("Erro ao obter tabelas:", erro);
      return {};
    }
  }

  /**
   * Ouve mudanças nas configurações globais.
   *
   * @param {Function} callback - Recebe snapshot.val() das configurações
   */
  function ouvirConfiguracoes(callback) {
    refConfiguracoes.on("value", (snapshot) => {
      const config = snapshot.val() || { percentualImposto: 11.149 };
      callback(config);
    });
  }

  /**
   * Ouve status de conexão com o Firebase.
   *
   * @param {Function} callback - Recebe true/false indicando conexão
   */
  function ouvirConexao(callback) {
    refConexao.on("value", (snapshot) => {
      const conectado = snapshot.val() === true;
      callback(conectado);
    });
  }

  /* ============================================================
     OPERAÇÕES COM REGISTROS
     ============================================================ */

  /**
   * Calcula impostos e valor líquido baseado no valor bruto.
   *
   * @param {number} valorBruto
   * @param {number} percentualImposto - Em porcentagem (ex: 11.149)
   * @returns {{ impostos: number, valorLiquido: number }}
   */
  function calcularImpostos(valorBruto, percentualImposto) {
    const bruto = parseFloat(valorBruto) || 0;
    const taxa = parseFloat(percentualImposto) || 0;
    const impostos = parseFloat(((bruto * taxa) / 100).toFixed(2));
    const liquido = parseFloat((bruto - impostos).toFixed(2));
    return { impostos, valorLiquido: liquido };
  }

  /**
   * Salva ou atualiza um registro existente.
   * Recalcula impostos automaticamente se valorBruto for alterado.
   *
   * @param {string} convenioId - ID do convênio
   * @param {string} registroId - ID do registro
   * @param {Object} dados - Dados a serem salvos
   * @returns {Promise<void>}
   */
  async function salvarRegistro(convenioId, registroId, dados) {
    try {
      /* Buscar percentual de imposto do convênio específico */
      const convenioSnapshot = await refTabelas.child(convenioId).once("value");
      const convenio = convenioSnapshot.val();
      const percentualImposto = convenio?.percentualImposto || 17.5;

      /* Se valorBruto foi fornecido, calcular impostos */
      if (dados.valorBruto !== undefined) {
        const calculados = calcularImpostos(
          dados.valorBruto,
          percentualImposto,
        );
        dados.impostos = calculados.impostos;
        dados.valorLiquido = calculados.valorLiquido;
      }

      /* Adicionar timestamp de atualização */
      dados.updatedAt = Date.now();

      /* Salvar no Firebase */
      await refTabelas
        .child(`${convenioId}/registros/${registroId}`)
        .update(dados);

      /* Registrar auditoria */
      await registrarAuditoria("UPDATE", "REGISTRO", {
        convenioId,
        registroId,
        campos: Object.keys(dados),
      });

      return { sucesso: true };
    } catch (erro) {
      console.error("Erro ao salvar registro:", erro);
      throw new Error(
        "Não foi possível salvar o registro. Verifique sua conexão.",
      );
    }
  }

  /**
   * Adiciona um novo registro ao convênio.
   *
   * @param {string} convenioId - ID do convênio
   * @param {Object} dados - Dados do novo registro
   * @returns {Promise<string>} ID do registro criado
   */
  async function adicionarRegistro(convenioId, dados) {
    try {
      /* Buscar percentual de imposto do convênio específico */
      const convenioSnapshot = await refTabelas.child(convenioId).once("value");
      const convenio = convenioSnapshot.val();
      const percentualImposto = convenio?.percentualImposto || 17.5;

      /* Calcular impostos se valorBruto foi fornecido */
      if (dados.valorBruto) {
        const calculados = calcularImpostos(
          dados.valorBruto,
          percentualImposto,
        );
        dados.impostos = calculados.impostos;
        dados.valorLiquido = calculados.valorLiquido;
      }

      /* Adicionar timestamps */
      dados.createdAt = Date.now();
      dados.updatedAt = Date.now();

      /* Criar novo registro no Firebase */
      const novoRegistroRef = refTabelas
        .child(`${convenioId}/registros`)
        .push();
      await novoRegistroRef.set(dados);

      /* Registrar auditoria */
      await registrarAuditoria("CREATE", "REGISTRO", {
        convenioId,
        registroId: novoRegistroRef.key,
      });

      return novoRegistroRef.key;
    } catch (erro) {
      console.error("Erro ao adicionar registro:", erro);
      throw new Error("Não foi possível adicionar o registro.");
    }
  }

  /**
   * Exclui um registro do convênio.
   *
   * @param {string} convenioId - ID do convênio
   * @param {string} registroId - ID do registro a excluir
   * @returns {Promise<void>}
   */
  async function excluirRegistro(convenioId, registroId) {
    try {
      await refTabelas.child(`${convenioId}/registros/${registroId}`).remove();

      /* Registrar auditoria */
      await registrarAuditoria("DELETE", "REGISTRO", {
        convenioId,
        registroId,
      });

      return { sucesso: true };
    } catch (erro) {
      console.error("Erro ao excluir registro:", erro);
      throw new Error("Não foi possível excluir o registro.");
    }
  }

  /* ============================================================
     OPERAÇÕES COM CONVÊNIOS
     ============================================================ */

  /**
   * Adiciona um novo convênio (tabela).
   *
   * @param {string} nome - Nome do convênio
   * @param {number} percentualImposto - Percentual de imposto (opcional, padrão 17.5)
   * @returns {Promise<string>} ID do convênio criado
   */
  async function adicionarConvenio(nome, percentualImposto = 17.5) {
    try {
      const novoConvenioRef = refTabelas.push();
      await novoConvenioRef.set({
        nome: nome.trim(),
        percentualImposto: parseFloat(percentualImposto) || 17.5,
        createdAt: Date.now(),
        registros: {},
      });

      return novoConvenioRef.key;
    } catch (erro) {
      console.error("Erro ao adicionar convênio:", erro);
      throw new Error("Não foi possível criar o convênio.");
    }
  }

  /**
   * Exclui um convênio e todos os seus registros.
   *
   * @param {string} convenioId - ID do convênio a excluir
   * @returns {Promise<void>}
   */
  async function excluirConvenio(convenioId) {
    try {
      await refTabelas.child(convenioId).remove();

      /* Registrar auditoria */
      await registrarAuditoria("DELETE", "CONVENIO", {
        convenioId,
      });

      return { sucesso: true };
    } catch (erro) {
      console.error("Erro ao excluir convênio:", erro);
      throw new Error("Não foi possível excluir o convênio.");
    }
  }

  /**
   * Atualiza o percentual de imposto de um convênio específico.
   *
   * @param {string} convenioId - ID do convênio
   * @param {number} percentual - Novo percentual de imposto
   * @returns {Promise<void>}
   */
  async function atualizarPercentualImposto(convenioId, percentual) {
    try {
      /* Atualizar o percentual do convênio */
      await refTabelas.child(`${convenioId}/percentualImposto`).set(percentual);

      /* Buscar todos os registros do convênio */
      const convenioSnapshot = await refTabelas.child(convenioId).once("value");
      const convenio = convenioSnapshot.val();

      let atualizados = 0;
      const updates = {};

      /* Recalcular impostos de todos os registros deste convênio */
      if (convenio && convenio.registros) {
        Object.keys(convenio.registros).forEach((registroId) => {
          const registro = convenio.registros[registroId];

          /* Recalcular apenas se tem valorBruto */
          if (registro.valorBruto) {
            const calculados = calcularImpostos(
              registro.valorBruto,
              percentual,
            );
            updates[`${convenioId}/registros/${registroId}/impostos`] =
              calculados.impostos;
            updates[`${convenioId}/registros/${registroId}/valorLiquido`] =
              calculados.valorLiquido;
            updates[`${convenioId}/registros/${registroId}/updatedAt`] =
              Date.now();
            atualizados++;
          }
        });
      }

      /* Executar todas as atualizações de uma vez */
      if (Object.keys(updates).length > 0) {
        await refTabelas.update(updates);
      }

      /* Registrar auditoria */
      await registrarAuditoria("UPDATE", "CONVENIO", {
        convenioId,
        acao: "atualizar_percentual_imposto",
        novoPercentual: percentual,
        registrosAtualizados: atualizados,
      });

      return { sucesso: true, atualizados };
    } catch (erro) {
      console.error("Erro ao atualizar percentual de imposto:", erro);
      throw new Error("Não foi possível atualizar o percentual de imposto.");
    }
  }

  /* ============================================================
     CONFIGURAÇÕES
     ============================================================ */

  /**
   * Salva configurações globais.
   *
   * @param {Object} dados - Configurações a salvar
   * @returns {Promise<void>}
   */
  async function salvarConfiguracoes(dados) {
    try {
      await refConfiguracoes.update(dados);
      return { sucesso: true };
    } catch (erro) {
      console.error("Erro ao salvar configurações:", erro);
      throw new Error("Não foi possível salvar as configurações.");
    }
  }

  /**
   * Recalcula impostos de todos os registros com novo percentual.
   * Atualiza apenas registros que possuem valorBruto.
   *
   * @param {number} novoPercentual - Novo percentual de imposto
   * @returns {Promise<{total: number, atualizados: number}>}
   */
  async function recalcularTodosImpostos(novoPercentual) {
    try {
      const snapshot = await refTabelas.once("value");
      const tabelas = snapshot.val() || {};

      let total = 0;
      let atualizados = 0;
      const updates = {};

      /* Percorrer todas as tabelas e registros */
      Object.keys(tabelas).forEach((convenioId) => {
        const convenio = tabelas[convenioId];
        if (convenio.registros) {
          Object.keys(convenio.registros).forEach((registroId) => {
            const registro = convenio.registros[registroId];
            total++;

            /* Recalcular apenas se tem valorBruto */
            if (registro.valorBruto) {
              const calculados = calcularImpostos(
                registro.valorBruto,
                novoPercentual,
              );
              updates[`${convenioId}/registros/${registroId}/impostos`] =
                calculados.impostos;
              updates[`${convenioId}/registros/${registroId}/valorLiquido`] =
                calculados.valorLiquido;
              updates[`${convenioId}/registros/${registroId}/updatedAt`] =
                Date.now();
              atualizados++;
            }
          });
        }
      });

      /* Executar todas as atualizações de uma vez */
      if (Object.keys(updates).length > 0) {
        await refTabelas.update(updates);
      }

      return { total, atualizados };
    } catch (erro) {
      console.error("Erro ao recalcular impostos:", erro);
      throw new Error("Não foi possível recalcular os impostos.");
    }
  }

  /**
   * Exporta todos os dados como JSON.
   *
   * @returns {Promise<Object>} Todos os dados do faturamento
   */
  async function exportarJSON() {
    try {
      const snapshot = await firebaseDb.ref("faturamento").once("value");
      return snapshot.val() || {};
    } catch (erro) {
      console.error("Erro ao exportar JSON:", erro);
      throw new Error("Não foi possível exportar os dados.");
    }
  }

  /* ============================================================
     LOG DE AUDITORIA
     ============================================================ */

  /**
   * Registra uma ação de auditoria no Firebase.
   * Útil para rastreamento de operações críticas (LGPD).
   *
   * @param {string} acao - Tipo de ação (CREATE, UPDATE, DELETE)
   * @param {string} entidade - Tipo de entidade (REGISTRO, CONVENIO, CONFIG)
   * @param {Object} detalhes - Detalhes adicionais
   */
  async function registrarAuditoria(acao, entidade, detalhes = {}) {
    try {
      const usuario = firebaseAuth.currentUser;
      const timestamp = Date.now();

      const logEntry = {
        acao,
        entidade,
        usuario: usuario ? usuario.email : "anonimo",
        uid: usuario ? usuario.uid : null,
        timestamp,
        data: new Date(timestamp).toISOString(),
        detalhes,
      };

      /* Salvar no path /faturamento/auditoria/{ano}/{mes}/{timestamp} */
      const dataObj = new Date(timestamp);
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, "0");

      await firebaseDb
        .ref(`faturamento/auditoria/${ano}/${mes}/${timestamp}`)
        .set(logEntry);

      console.log("📋 Auditoria registrada:", acao, entidade);
    } catch (erro) {
      console.error("Erro ao registrar auditoria:", erro);
      /* Não lançar erro para não interromper operação principal */
    }
  }

  /* ============================================================
     REPASSES — Médicos
     ============================================================ */

  /**
   * Escuta mudanças na lista de médicos.
   * @param {Function} callback - Recebe o snapshot como objeto
   */
  function ouvirMedicos(callback) {
    console.log("📡 Configurando listener Firebase em repasses/medicos");
    firebaseDb.ref("repasses/medicos").on("value", (snap) => {
      const dados = snap.val() || {};
      console.log("📥 Firebase retornou dados de médicos:", dados);
      console.log("📊 Quantidade de médicos:", Object.keys(dados).length);
      callback(dados);
    });
  }

  /**
   * Adiciona um novo médico.
   * @param {string} nome
   * @returns {Promise<void>}
   */
  function adicionarMedico(nome) {
    console.log("➕ DB: Adicionando médico:", nome);
    const novoRef = firebaseDb.ref("repasses/medicos").push();
    console.log("🔑 ID gerado:", novoRef.key);
    return novoRef
      .set({ nome, criadoEm: Date.now() })
      .then(() => {
        console.log("✅ DB: Médico salvo com sucesso:", nome);
      })
      .catch((erro) => {
        console.error("❌ DB: Erro ao salvar médico:", erro);
        throw erro;
      });
  }

  /**
   * Renomeia um médico existente.
   * @param {string} medicoId
   * @param {string} novoNome
   * @returns {Promise<void>}
   */
  function renomearMedico(medicoId, novoNome) {
    return firebaseDb
      .ref(`repasses/medicos/${medicoId}`)
      .update({ nome: novoNome });
  }

  /**
   * Exclui um médico e todos os seus lançamentos de repasse.
   * @param {string} medicoId
   * @returns {Promise<void>}
   */
  function excluirMedico(medicoId) {
    return Promise.all([
      firebaseDb.ref(`repasses/medicos/${medicoId}`).remove(),
      firebaseDb.ref(`repasses/lancamentos/${medicoId}`).remove(),
    ]);
  }

  /* ============================================================
     REPASSES — Lançamentos
     ============================================================ */

  /**
   * Escuta os dados de repasse de um médico em um mês específico.
   * @param {string}   medicoId
   * @param {string}   mesAno   - Formato "YYYY-MM"
   * @param {Function} callback - Recebe o snapshot como objeto
   */
  function ouvirRepasse(medicoId, mesAno, callback) {
    firebaseDb
      .ref(`repasses/lancamentos/${medicoId}/${mesAno}`)
      .on("value", (snap) => callback(snap.val() || {}));
  }

  /**
   * Para de escutar o repasse de um médico/mês (chamar ao trocar de médico ou mês).
   * @param {string} medicoId
   * @param {string} mesAno
   */
  function pararOuvirRepasse(medicoId, mesAno) {
    firebaseDb.ref(`repasses/lancamentos/${medicoId}/${mesAno}`).off();
  }

  /**
   * Salva (ou atualiza) os dados de um convênio dentro do repasse.
   * Usado para edição inline das colunas de deduções e partilha.
   *
   * @param {string} medicoId
   * @param {string} mesAno
   * @param {string} convenioId
   * @param {Object} dados - Campos a atualizar (merge parcial)
   * @returns {Promise<void>}
   */
  function salvarConvenioRepasse(medicoId, mesAno, convenioId, dados) {
    console.log(
      `[Db] salvarConvenioRepasse - Path: repasses/lancamentos/${medicoId}/${mesAno}/convenios/${convenioId}`,
    );
    console.log(`[Db] Dados a salvar:`, dados);

    return firebaseDb
      .ref(`repasses/lancamentos/${medicoId}/${mesAno}/convenios/${convenioId}`)
      .update({ ...dados, updatedAt: Date.now() })
      .then(() => {
        console.log(`[Db] Dados salvos com sucesso!`);
      })
      .catch((erro) => {
        console.error(`[Db] Erro ao salvar:`, erro);
      });
  }

  /**
   * Adiciona um novo lançamento avulso ao repasse.
   * @param {string} medicoId
   * @param {string} mesAno
   * @param {Object} dados
   * @returns {Promise<void>}
   */
  function adicionarAvulsoRepasse(medicoId, mesAno, dados) {
    const novoRef = firebaseDb
      .ref(`repasses/lancamentos/${medicoId}/${mesAno}/avulsos`)
      .push();
    return novoRef.set({
      ...dados,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Atualiza um lançamento avulso existente.
   * @param {string} medicoId
   * @param {string} mesAno
   * @param {string} avulsoId
   * @param {Object} dados
   * @returns {Promise<void>}
   */
  function atualizarAvulsoRepasse(medicoId, mesAno, avulsoId, dados) {
    return firebaseDb
      .ref(`repasses/lancamentos/${medicoId}/${mesAno}/avulsos/${avulsoId}`)
      .update({ ...dados, updatedAt: Date.now() });
  }

  /**
   * Exclui um lançamento avulso.
   * @param {string} medicoId
   * @param {string} mesAno
   * @param {string} avulsoId
   * @returns {Promise<void>}
   */
  function excluirAvulsoRepasse(medicoId, mesAno, avulsoId) {
    return firebaseDb
      .ref(`repasses/lancamentos/${medicoId}/${mesAno}/avulsos/${avulsoId}`)
      .remove();
  }

  /**
   * Salva o valor de reembolso clínica do mês.
   * @param {string} medicoId
   * @param {string} mesAno
   * @param {number} valor
   * @returns {Promise<void>}
   */
  function salvarReembolsoClinica(medicoId, mesAno, valor) {
    return firebaseDb
      .ref(`repasses/lancamentos/${medicoId}/${mesAno}`)
      .update({ reembolsoClinica: valor, updatedAt: Date.now() });
  }

  /**
   * Migra todos os convênios de repasse existentes para a nova regra de 40% clínica / 60% médico.
   * Atualiza apenas convênios que tenham percentuais diferentes dos novos padrões.
   *
   * @returns {Promise<{total: number, atualizados: number, medicos: number}>}
   */
  async function migrarPercentuaisRepasse() {
    try {
      console.log("🔄 Iniciando migração de percentuais de repasse...");

      const snapshot = await firebaseDb
        .ref("repasses/lancamentos")
        .once("value");
      const lancamentos = snapshot.val() || {};

      let total = 0;
      let atualizados = 0;
      let medicos = 0;
      const updates = {};

      // Percorrer todos os médicos
      Object.keys(lancamentos).forEach((medicoId) => {
        medicos++;
        const mesesMedico = lancamentos[medicoId];

        // Percorrer todos os meses deste médico
        Object.keys(mesesMedico).forEach((mesAno) => {
          const dadosMes = mesesMedico[mesAno];

          if (dadosMes.convenios) {
            // Percorrer todos os convênios deste mês
            Object.keys(dadosMes.convenios).forEach((convenioId) => {
              const convenio = dadosMes.convenios[convenioId];
              total++;

              const percClinicaAtual = convenio.percentualClinica || 60;
              const percMedicoAtual = convenio.percentualMedico || 40;

              // Atualizar apenas se for diferente dos novos padrões
              if (percClinicaAtual !== 40 || percMedicoAtual !== 60) {
                const valorLiquido = convenio.valorLiquidoFinal || 0;

                // Recalcular repasses com novos percentuais
                const novoRepasseClinica = parseFloat(
                  ((valorLiquido * 40) / 100).toFixed(2),
                );
                const novoRepasseMedico = parseFloat(
                  ((valorLiquido * 60) / 100).toFixed(2),
                );

                const basePath = `${medicoId}/${mesAno}/convenios/${convenioId}`;
                updates[`${basePath}/percentualClinica`] = 40;
                updates[`${basePath}/percentualMedico`] = 60;
                updates[`${basePath}/repasseClinica`] = novoRepasseClinica;
                updates[`${basePath}/repasseMedico`] = novoRepasseMedico;
                updates[`${basePath}/updatedAt`] = Date.now();

                atualizados++;
                console.log(
                  `✅ Agendado: ${convenio.nomeConvenio} - ${mesAno}`,
                );
              }
            });
          }
        });
      });

      // Executar todas as atualizações de uma vez
      if (Object.keys(updates).length > 0) {
        await firebaseDb.ref("repasses/lancamentos").update(updates);
        console.log(
          `✅ Migração concluída: ${atualizados} convênios atualizados de ${total}`,
        );
      } else {
        console.log("ℹ️ Nenhum convênio precisa ser atualizado");
      }

      return { total, atualizados, medicos };
    } catch (erro) {
      console.error("❌ Erro ao migrar percentuais de repasse:", erro);
      throw new Error("Não foi possível migrar os percentuais de repasse.");
    }
  }

  /* ============================================================
     EXPORTAÇÃO DO MÓDULO
     ============================================================ */

  return {
    ouvirTabelas,
    obterTabelas,
    ouvirConfiguracoes,
    ouvirConexao,
    salvarRegistro,
    adicionarRegistro,
    excluirRegistro,
    adicionarConvenio,
    excluirConvenio,
    atualizarPercentualImposto,
    salvarConfiguracoes,
    recalcularTodosImpostos,
    exportarJSON,
    registrarAuditoria,
    // Repasses
    ouvirMedicos,
    adicionarMedico,
    renomearMedico,
    excluirMedico,
    ouvirRepasse,
    pararOuvirRepasse,
    salvarConvenioRepasse,
    adicionarAvulsoRepasse,
    atualizarAvulsoRepasse,
    excluirAvulsoRepasse,
    salvarReembolsoClinica,
    migrarPercentuaisRepasse,
  };
})();
