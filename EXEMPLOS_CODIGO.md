# 🛠️ Exemplos de Código - Implementações Prontas

## 1. Política de Privacidade (politica-privacidade.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Política de Privacidade - Faturamento Médico</title>
    <style>
      body {
        font-family: system-ui;
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
        line-height: 1.6;
      }
      h1 {
        color: #1b3f6e;
      }
      h2 {
        color: #152f5e;
        margin-top: 2rem;
      }
    </style>
  </head>
  <body>
    <h1>Política de Privacidade</h1>
    <p><strong>Última atualização:</strong> 15 de maio de 2026</p>

    <h2>1. Dados Coletados</h2>
    <p>Coletamos os seguintes dados pessoais:</p>
    <ul>
      <li><strong>E-mail:</strong> Para autenticação e recuperação de senha</li>
      <li>
        <strong>Registros médicos/hospitalares:</strong> Dados de produção,
        faturamento e financeiro inseridos por você
      </li>
      <li>
        <strong>Dados de uso:</strong> Logs de acesso e ações realizadas
        (auditoria)
      </li>
    </ul>

    <h2>2. Como Usamos Seus Dados</h2>
    <ul>
      <li>Autenticar seu acesso ao sistema</li>
      <li>Armazenar e processar registros de faturamento</li>
      <li>Gerar relatórios e gráficos personalizados</li>
      <li>Garantir segurança e prevenir fraudes</li>
    </ul>

    <h2>3. Base Legal (LGPD)</h2>
    <p>
      Processamos seus dados com base no <strong>consentimento</strong> (Art.
      7º, I da LGPD) e <strong>execução de contrato</strong> (Art. 7º, V da
      LGPD).
    </p>

    <h2>4. Compartilhamento de Dados</h2>
    <p>
      Seus dados <strong>NÃO</strong> são compartilhados com terceiros, exceto:
    </p>
    <ul>
      <li>
        <strong>Firebase (Google):</strong> Infraestrutura de armazenamento e
        autenticação
      </li>
      <li><strong>Vercel:</strong> Hospedagem da aplicação</li>
    </ul>

    <h2>5. Seus Direitos (Art. 18 da LGPD)</h2>
    <p>Você tem direito a:</p>
    <ul>
      <li><strong>Acessar</strong> seus dados (exportação CSV/Excel)</li>
      <li><strong>Corrigir</strong> dados incompletos ou incorretos</li>
      <li>
        <strong>Excluir</strong> sua conta e todos os dados (direito ao
        esquecimento)
      </li>
      <li>
        <strong>Portabilidade:</strong> Exportar seus dados em formato
        estruturado
      </li>
      <li><strong>Revogar consentimento</strong> a qualquer momento</li>
    </ul>

    <h2>6. Segurança</h2>
    <p>Implementamos medidas técnicas:</p>
    <ul>
      <li>Autenticação Firebase com e-mail/senha</li>
      <li>Comunicação HTTPS criptografada</li>
      <li>Regras de segurança no banco de dados</li>
      <li>Backup automático dos dados</li>
    </ul>

    <h2>7. Retenção de Dados</h2>
    <p>
      Seus dados são mantidos enquanto sua conta estiver ativa. Após exclusão,
      os dados são removidos permanentemente em até 30 dias.
    </p>

    <h2>8. Cookies</h2>
    <p>Usamos apenas cookies essenciais para:</p>
    <ul>
      <li>Manter sua sessão autenticada</li>
      <li>Armazenar preferências do sistema</li>
    </ul>

    <h2>9. Contato</h2>
    <p><strong>Responsável pelos dados:</strong></p>
    <ul>
      <li><strong>E-mail:</strong> dpo@seudominio.com.br</li>
      <li><strong>Telefone:</strong> (XX) XXXX-XXXX</li>
    </ul>

    <h2>10. Alterações</h2>
    <p>
      Esta política pode ser atualizada. Você será notificado sobre mudanças
      significativas.
    </p>

    <p><a href="/">← Voltar ao sistema</a></p>
  </body>
</html>
```

---

## 2. Termos de Uso (termos-uso.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Termos de Uso - Faturamento Médico</title>
    <style>
      body {
        font-family: system-ui;
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
        line-height: 1.6;
      }
      h1 {
        color: #1b3f6e;
      }
      h2 {
        color: #152f5e;
        margin-top: 2rem;
      }
    </style>
  </head>
  <body>
    <h1>Termos de Uso</h1>
    <p><strong>Última atualização:</strong> 15 de maio de 2026</p>

    <h2>1. Aceitação dos Termos</h2>
    <p>
      Ao usar este sistema, você concorda com estes termos. Se não concordar,
      não use o sistema.
    </p>

    <h2>2. Descrição do Serviço</h2>
    <p>Sistema web de controle de faturamento médico/hospitalar com:</p>
    <ul>
      <li>Gerenciamento de convênios e registros</li>
      <li>Cálculo automático de impostos</li>
      <li>Geração de relatórios e gráficos</li>
      <li>Exportação de dados (CSV, Excel, PDF)</li>
    </ul>

    <h2>3. Responsabilidades do Usuário</h2>
    <p>Você é responsável por:</p>
    <ul>
      <li>Manter a confidencialidade da sua senha</li>
      <li>Garantir a veracidade dos dados inseridos</li>
      <li>Fazer backup regular dos seus dados</li>
      <li>Notificar imediatamente sobre uso não autorizado</li>
    </ul>

    <h2>4. Uso Proibido</h2>
    <p>É proibido:</p>
    <ul>
      <li>Usar o sistema para fins ilegais</li>
      <li>Tentar acessar dados de outros usuários</li>
      <li>Realizar engenharia reversa</li>
      <li>Sobrecarregar o sistema intencionalmente</li>
      <li>Compartilhar sua conta com terceiros</li>
    </ul>

    <h2>5. Limitações de Responsabilidade</h2>
    <p>O sistema é fornecido "como está". Não garantimos:</p>
    <ul>
      <li>Disponibilidade 100% (uptime)</li>
      <li>Ausência de erros ou bugs</li>
      <li>Adequação a um propósito específico</li>
    </ul>

    <h2>6. Limitações Técnicas</h2>
    <ul>
      <li>
        <strong>Armazenamento:</strong> Até 1 GB (plano gratuito Firebase)
      </li>
      <li><strong>Usuários simultâneos:</strong> Recomendado até 100</li>
      <li><strong>Registros:</strong> Otimizado para até 10.000 registros</li>
    </ul>

    <h2>7. Suspensão e Cancelamento</h2>
    <p>Podemos suspender ou cancelar sua conta se:</p>
    <ul>
      <li>Violar estes termos</li>
      <li>Realizar atividades fraudulentas</li>
      <li>Não pagar taxas aplicáveis (se houver)</li>
    </ul>

    <h2>8. Propriedade Intelectual</h2>
    <p>
      O código e design do sistema são de propriedade exclusiva do
      desenvolvedor. Você não pode copiar, modificar ou distribuir o sistema.
    </p>

    <h2>9. Alterações nos Termos</h2>
    <p>
      Podemos alterar estes termos a qualquer momento. Você será notificado
      sobre mudanças significativas.
    </p>

    <h2>10. Lei Aplicável</h2>
    <p>
      Estes termos são regidos pelas leis do Brasil. Foro: Comarca de [SUA
      CIDADE].
    </p>

    <h2>11. Contato</h2>
    <p><strong>E-mail:</strong> suporte@seudominio.com.br</p>

    <p><a href="/">← Voltar ao sistema</a></p>
  </body>
</html>
```

---

## 3. Consentimento LGPD no Login (Adicionar em index.html)

**No formulário de login (após o botão "Entrar"):**

```html
<!-- Após </form>, antes de fechar .login-formulario__inner -->
<div
  class="lgpd-consentimento"
  style="margin-top: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 6px;"
>
  <label
    style="display: flex; align-items: start; gap: 0.75rem; font-size: 0.875rem; cursor: pointer;"
  >
    <input
      type="checkbox"
      id="aceitar-lgpd"
      required
      style="margin-top: 0.25rem; width: 16px; height: 16px; cursor: pointer;"
    />
    <span>
      Li e aceito a
      <a
        href="politica-privacidade.html"
        target="_blank"
        style="color: #1b3f6e; text-decoration: underline;"
      >
        Política de Privacidade
      </a>
      e os
      <a
        href="termos-uso.html"
        target="_blank"
        style="color: #1b3f6e; text-decoration: underline;"
      >
        Termos de Uso
      </a>
    </span>
  </label>
</div>
```

**No auth.js, validar antes do login:**

```javascript
// Em configurarListenersLogin(), antes de fazerLogin:
const checkboxLGPD = document.getElementById("aceitar-lgpd");
if (!checkboxLGPD.checked) {
  Ui.mostrarToast(
    "Você precisa aceitar a Política de Privacidade e Termos de Uso",
    "aviso",
  );
  return;
}
```

---

## 4. Botão Excluir Conta (Adicionar em modal-configuracoes)

**No index.html, dentro do modal de configurações:**

```html
<!-- Após a seção de exportação, adicionar: -->
<fieldset class="form-edicao__grupo">
  <legend class="form-edicao__legenda">Zona de Perigo</legend>
  <p
    style="color: var(--texto-secundario); font-size: 0.875rem; margin-bottom: 1rem;"
  >
    Atenção: Esta ação é irreversível. Todos os seus dados serão excluídos
    permanentemente.
  </p>
  <button
    type="button"
    id="btn-excluir-conta"
    class="btn-perigo"
    style="width: 100%;"
  >
    🗑️ Excluir minha conta e todos os dados
  </button>
</fieldset>
```

**No app.js, adicionar listener:**

```javascript
// Em configurarEventListeners():
document
  .getElementById("btn-excluir-conta")
  .addEventListener("click", async () => {
    await excluirContaUsuario();
  });

// Nova função:
async function excluirContaUsuario() {
  const usuario = Auth.obterUsuarioAtual();
  if (!usuario) return;

  // Tripla confirmação
  if (
    !confirm(
      "⚠️ ATENÇÃO: Você está prestes a EXCLUIR SUA CONTA.\n\nTodos os seus dados serão APAGADOS PERMANENTEMENTE.\n\nDeseja continuar?",
    )
  ) {
    return;
  }

  if (
    !confirm(
      "⚠️ ÚLTIMA CONFIRMAÇÃO:\n\nTem ABSOLUTA CERTEZA que deseja excluir sua conta?\n\nEsta ação NÃO PODE SER DESFEITA!",
    )
  ) {
    return;
  }

  const confirmacao = prompt(
    "Digite 'EXCLUIR' em letras maiúsculas para confirmar:",
  );
  if (confirmacao !== "EXCLUIR") {
    Ui.mostrarToast("Exclusão cancelada", "aviso");
    return;
  }

  try {
    Ui.mostrarToast("Excluindo sua conta...", "aviso", 10000);

    // 1. Excluir todos os dados do usuário no Firebase
    await firebaseDb.ref(`faturamento/tabelas`).remove();
    await firebaseDb.ref(`faturamento/configuracoes`).remove();
    await firebaseDb.ref(`faturamento/auditoria/${usuario.uid}`).remove();

    // 2. Excluir conta de autenticação
    await usuario.delete();

    // 3. Redirecionar para login
    Ui.mostrarToast("Conta excluída com sucesso. Até logo!", "sucesso");
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (erro) {
    if (erro.code === "auth/requires-recent-login") {
      Ui.mostrarToast(
        "Por segurança, faça login novamente antes de excluir a conta",
        "erro",
      );
      Auth.fazerLogout();
    } else {
      Ui.mostrarToast("Erro ao excluir conta: " + erro.message, "erro");
    }
  }
}
```

---

## 5. Sanitização de Inputs (DOMPurify)

**No index.html, adicionar CDN (após Firebase, antes dos scripts locais):**

```html
<!-- DOMPurify para sanitização -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
```

**No ui.js, criar função de sanitização:**

```javascript
// No início do arquivo, após window.Ui = (function() {
/**
 * Sanitiza texto para prevenir XSS.
 * @param {string} texto
 * @returns {string}
 */
function sanitizar(texto) {
  if (typeof texto !== "string") return texto;
  return DOMPurify.sanitize(texto, {
    ALLOWED_TAGS: [], // Remove todas as tags HTML
    KEEP_CONTENT: true, // Mantém o conteúdo
  });
}
```

**Usar em renderizarTabela():**

```javascript
// Trocar todas as ocorrências de:
${registro.nFatura || "—"}

// Por:
${sanitizar(registro.nFatura) || "—"}

// Exemplo completo:
<td>
  <span class="celula-editavel" contenteditable="true" data-campo="nFatura">
    ${sanitizar(registro.nFatura) || "—"}
  </span>
</td>
```

---

## 6. Validação Client-Side

**No app.js, adicionar função de validação:**

```javascript
/**
 * Valida dados de um registro antes de salvar.
 * @param {Object} dados
 * @throws {Error} Se houver erro de validação
 */
function validarRegistro(dados) {
  const erros = [];

  // Validar valores numéricos
  if (dados.valor !== undefined && dados.valor < 0) {
    erros.push("Valor não pode ser negativo");
  }

  if (dados.valorBruto !== undefined && dados.valorBruto < 0) {
    erros.push("Valor bruto não pode ser negativo");
  }

  if (dados.valorRecebido !== undefined && dados.valorRecebido < 0) {
    erros.push("Valor recebido não pode ser negativo");
  }

  // Validar lógica de negócio
  if (dados.valorRecebido > dados.valorBruto) {
    erros.push("Valor recebido não pode ser maior que valor bruto");
  }

  // Validar datas
  if (dados.dataProtocolo && !validarData(dados.dataProtocolo)) {
    erros.push("Data de protocolo inválida");
  }

  if (dados.dataNF && !validarData(dados.dataNF)) {
    erros.push("Data da NF inválida");
  }

  if (dados.dataRecebimento && !validarData(dados.dataRecebimento)) {
    erros.push("Data de recebimento inválida");
  }

  // Validar strings
  if (dados.nFatura && dados.nFatura.length > 100) {
    erros.push("Número da fatura muito longo (máx. 100 caracteres)");
  }

  if (dados.nNF && dados.nNF.length > 100) {
    erros.push("Número da NF muito longo (máx. 100 caracteres)");
  }

  if (erros.length > 0) {
    throw new Error("Erros de validação:\n" + erros.join("\n"));
  }
}

/**
 * Valida formato de data ISO (YYYY-MM-DD).
 */
function validarData(data) {
  if (!data) return true; // Vazio é permitido
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(data)) return false;
  const d = new Date(data);
  return d instanceof Date && !isNaN(d);
}
```

**Usar em salvarEdicaoCompleta():**

```javascript
async function salvarEdicaoCompleta() {
  const form = document.getElementById("form-edicao");
  const convenioId = form.dataset.convenioId;
  const registroId = form.dataset.registroId;

  const dados = {
    producao: document.getElementById("edicao-producao").value,
    nFatura: document.getElementById("edicao-n-fatura").value,
    // ... demais campos
  };

  try {
    // ✅ ADICIONAR VALIDAÇÃO AQUI
    validarRegistro(dados);

    if (registroId) {
      await Db.salvarRegistro(convenioId, registroId, dados);
      Ui.mostrarToast("Registro atualizado com sucesso!", "sucesso");
    } else {
      await Db.adicionarRegistro(convenioId, dados);
      Ui.mostrarToast("Registro criado com sucesso!", "sucesso");
    }

    document.getElementById("modal-edicao").close();
  } catch (erro) {
    Ui.mostrarToast(erro.message, "erro");
  }
}
```

---

## 7. Paginação na Tabela

**No index.html, adicionar controles de paginação (após o </table>):**

```html
<div
  class="paginacao"
  style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding: 1rem; background: var(--bg-surface); border-radius: var(--raio);"
>
  <button
    type="button"
    id="btn-pagina-anterior"
    class="btn-secundario"
    style="min-width: 120px;"
  >
    ← Anterior
  </button>

  <span
    id="info-pagina"
    style="font-weight: 500; color: var(--texto-secundario);"
  >
    Página 1 de 1
  </span>

  <button
    type="button"
    id="btn-pagina-proxima"
    class="btn-secundario"
    style="min-width: 120px;"
  >
    Próxima →
  </button>
</div>
```

**No ui.js, modificar renderizarTabela:**

```javascript
// Variável global no escopo do módulo
let paginaAtual = 1;
const REGISTROS_POR_PAGINA = 50;

function renderizarTabela(registros, convenioId, convenioNome) {
  const tbody = document.getElementById("corpo-tabela");
  const caption = document.getElementById("caption-convenio");

  caption.textContent = convenioNome;

  if (!registros || Object.keys(registros).length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" style="text-align: center; padding: 2rem;">
          <p style="margin-bottom: 1rem;">Nenhum registro encontrado.</p>
          <button type="button" id="btn-adicionar-linha" class="btn-secundario">
            ${Icones.mais} Adicionar primeiro registro
          </button>
        </td>
      </tr>
    `;
    document.getElementById("info-pagina").textContent = "Página 0 de 0";
    document.getElementById("btn-pagina-anterior").disabled = true;
    document.getElementById("btn-pagina-proxima").disabled = true;
    return;
  }

  // Converter e ordenar
  const registrosArray = Object.keys(registros)
    .map((id) => ({ id, ...registros[id] }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Paginação
  const totalRegistros = registrosArray.length;
  const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);
  const inicio = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
  const fim = inicio + REGISTROS_POR_PAGINA;
  const registrosPagina = registrosArray.slice(inicio, fim);

  // Renderizar apenas a página atual
  tbody.innerHTML = registrosPagina.map(/* ...HTML das linhas... */).join("");

  // Adicionar botão de adicionar
  tbody.innerHTML += `
    <tr class="linha-adicionar">
      <td colspan="14" style="text-align: center; padding: 1rem;">
        <button type="button" id="btn-adicionar-linha" class="btn-secundario">
          ${Icones.mais} Adicionar novo registro
        </button>
      </td>
    </tr>
  `;

  // Atualizar controles de paginação
  document.getElementById("info-pagina").textContent =
    `Página ${paginaAtual} de ${totalPaginas} (${totalRegistros} registros)`;

  document.getElementById("btn-pagina-anterior").disabled = paginaAtual === 1;
  document.getElementById("btn-pagina-proxima").disabled =
    paginaAtual >= totalPaginas;
}

// Exportar função para mudar página
window.Ui.irParaPagina = function (novaPagina) {
  paginaAtual = novaPagina;
  // Re-renderizar tabela atual
  // (app.js precisará chamar renderizarInterface())
};

// Exportar para acessar no app.js
window.Ui.getPaginaAtual = () => paginaAtual;
window.Ui.resetarPagina = () => {
  paginaAtual = 1;
};
```

**No app.js, adicionar listeners de paginação:**

```javascript
// Em configurarEventListeners():
document.getElementById("btn-pagina-anterior").addEventListener("click", () => {
  const paginaAtual = Ui.getPaginaAtual();
  if (paginaAtual > 1) {
    Ui.irParaPagina(paginaAtual - 1);
    renderizarInterface();
  }
});

document.getElementById("btn-pagina-proxima").addEventListener("click", () => {
  const paginaAtual = Ui.getPaginaAtual();
  Ui.irParaPagina(paginaAtual + 1);
  renderizarInterface();
});
```

---

## 📝 Notas de Implementação

1. **Ordem de implementação sugerida:**
   - LGPD (Política + Termos + Consentimento)
   - Sanitização (DOMPurify)
   - Validação client-side
   - Excluir conta
   - Paginação

2. **Testes após cada implementação:**
   - Teste manualmente cada funcionalidade
   - Verifique no console do navegador se há erros
   - Teste em mobile e desktop

3. **Backup antes de implementar:**

   ```bash
   # Fazer commit no Git antes de cada mudança
   git add .
   git commit -m "Antes de implementar [NOME DA FEATURE]"
   ```

4. **Firebase Rules para suportar exclusão de conta:**
   ```json
   {
     "rules": {
       "faturamento": {
         "tabelas": {
           ".read": "auth != null",
           ".write": "auth != null"
         },
         "configuracoes": {
           ".read": "auth != null",
           ".write": "auth != null"
         },
         "auditoria": {
           "$userId": {
             ".read": "auth.uid === $userId",
             ".write": "auth.uid === $userId"
           }
         }
       }
     }
   }
   ```

---

**Pronto para começar a implementar! 🚀**
