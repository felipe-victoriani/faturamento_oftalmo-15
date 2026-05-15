# ✅ Checklist de Implementação - Melhorias Prioritárias

## 🔴 CRÍTICO - Implementar AGORA (Esta Semana)

### 1. Conformidade LGPD

- [ ] Criar arquivo `politica-privacidade.html` com:
  - [ ] Quais dados coletamos (e-mail, registros médicos)
  - [ ] Como usamos os dados
  - [ ] Como protegemos os dados
  - [ ] Direitos do usuário (acesso, exclusão, portabilidade)
  - [ ] Contato do DPO/responsável

- [ ] Criar arquivo `termos-uso.html` com:
  - [ ] Responsabilidades do usuário
  - [ ] Limitações de uso
  - [ ] Garantias e isenções

- [ ] Adicionar checkbox de consentimento no login:

```html
<label>
  <input type="checkbox" id="aceitar-lgpd" required />
  Li e aceito a
  <a href="politica-privacidade.html">Política de Privacidade</a> e os
  <a href="termos-uso.html">Termos de Uso</a>
</label>
```

- [ ] Adicionar botão "Excluir minha conta" nas configurações:

```javascript
async function excluirConta() {
  if (
    !confirm("Tem certeza? Todos os seus dados serão apagados permanentemente.")
  )
    return;
  const user = Auth.obterUsuarioAtual();
  // 1. Excluir dados do Realtime Database
  await firebaseDb.ref(`faturamento/usuarios/${user.uid}`).remove();
  // 2. Excluir conta
  await user.delete();
  // 3. Fazer logout
  await Auth.fazerLogout();
}
```

### 2. Sanitização de Inputs (Prevenir XSS)

- [ ] Instalar DOMPurify:

```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
```

- [ ] Sanitizar em `ui.js` antes de renderizar:

```javascript
function sanitizar(texto) {
  return DOMPurify.sanitize(texto, { ALLOWED_TAGS: [] });
}

// Usar em renderizarTabela:
${sanitizar(registro.nFatura || "—")}
```

### 3. Validação Client-Side

- [ ] Adicionar validação no `app.js` antes de salvar:

```javascript
function validarRegistro(dados) {
  const erros = [];

  if (dados.valor < 0) erros.push("Valor não pode ser negativo");
  if (dados.valorBruto < 0) erros.push("Valor bruto não pode ser negativo");
  if (dados.valorRecebido > dados.valorBruto) {
    erros.push("Valor recebido não pode ser maior que valor bruto");
  }

  if (erros.length > 0) {
    throw new Error(erros.join("\n"));
  }
}
```

---

## 🟡 IMPORTANTE - Implementar em 30 Dias

### 4. Testes Automatizados Básicos

- [ ] Instalar dependências:

```bash
npm init -y
npm install --save-dev jest @testing-library/dom @testing-library/user-event
npm install --save-dev firebase-tools
```

- [ ] Criar `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: "jsdom",
  collectCoverageFrom: ["*.js", "!firebase-config.js"],
  coverageThreshold: {
    global: { lines: 50 },
  },
};
```

- [ ] Criar primeiro teste `ui.test.js`:

```javascript
const { formatarBRL, formatarData } = require("./ui.js");

test("formata valor em BRL", () => {
  expect(formatarBRL(1234.56)).toBe("R$ 1.234,56");
});

test("formata data ISO para BR", () => {
  expect(formatarData("2026-05-15")).toBe("15/05/2026");
});
```

- [ ] Adicionar script no `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 5. Paginação na Tabela

- [ ] Adicionar controles de paginação no `index.html`:

```html
<div class="paginacao">
  <button id="btn-pagina-anterior">← Anterior</button>
  <span id="info-pagina">Página 1 de 10</span>
  <button id="btn-pagina-proxima">Próxima →</button>
</div>
```

- [ ] Implementar em `ui.js`:

```javascript
let paginaAtual = 1;
const REGISTROS_POR_PAGINA = 50;

function renderizarTabela(registros, convenioId, convenioNome) {
  const registrosArray = Object.keys(registros).map((id) => ({
    id,
    ...registros[id],
  }));
  const inicio = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
  const fim = inicio + REGISTROS_POR_PAGINA;
  const registrosPagina = registrosArray.slice(inicio, fim);

  // Renderizar apenas registrosPagina...

  const totalPaginas = Math.ceil(registrosArray.length / REGISTROS_POR_PAGINA);
  document.getElementById("info-pagina").textContent =
    `Página ${paginaAtual} de ${totalPaginas}`;
}
```

### 6. Firebase App Check

- [ ] Ativar no Firebase Console:
  1. Acessar Firebase Console
  2. Build → App Check
  3. Registrar app
  4. Escolher reCAPTCHA v3

- [ ] Adicionar no `firebase-config.js`:

```javascript
// Após inicializar Firebase
const appCheck = firebase.appCheck();
appCheck.activate("SITE_KEY_RECAPTCHA", true);
```

### 7. Log de Auditoria

- [ ] Criar estrutura no Firebase:

```
faturamento/
  auditoria/
    {userId}/
      {timestamp}/
        acao: "excluir_registro"
        convenioId: "conv123"
        registroId: "reg456"
        timestamp: 1715780925000
        ip: "192.168.1.1" (opcional)
```

- [ ] Criar função em `db.js`:

```javascript
async function registrarAuditoria(acao, detalhes) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  await firebaseDb.ref(`faturamento/auditoria/${user.uid}`).push({
    acao,
    ...detalhes,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

// Usar antes de excluir:
await registrarAuditoria("excluir_registro", { convenioId, registroId });
await excluirRegistro(convenioId, registroId);
```

---

## 🟢 DESEJÁVEL - Implementar em 90 Dias

### 8. Service Worker (PWA)

- [ ] Criar `service-worker.js`:

```javascript
const CACHE_NAME = "financeiro-v1";
const CACHE_URLS = ["/", "/index.html", "/style.css", "/app.js", "/ui.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_URLS)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request)),
  );
});
```

- [ ] Registrar em `index.html`:

```javascript
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
```

### 9. Acessibilidade - Células Editáveis

- [ ] Atualizar em `ui.js`:

```javascript
<span class="celula-editavel"
      contenteditable="true"
      role="textbox"
      aria-label="Editar ${campo}"
      tabindex="0"
      data-campo="${campo}">
```

### 10. Responsividade - Tabela Mobile

- [ ] Adicionar em `style.css`:

```css
@media (max-width: 640px) {
  /* Transformar tabela em cards */
  .tabela-faturamento thead {
    display: none;
  }

  .tabela-faturamento tbody tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid var(--borda);
    border-radius: var(--raio);
  }

  .tabela-faturamento td {
    display: block;
    text-align: right;
  }

  .tabela-faturamento td::before {
    content: attr(data-label);
    float: left;
    font-weight: 600;
  }
}
```

- [ ] Adicionar `data-label` no HTML:

```html
<td data-label="Nº Fatura">
  <span class="celula-editavel">...</span>
</td>
```

---

## 📊 Progresso

- [ ] 0/10 itens críticos concluídos
- [ ] 0/7 itens importantes concluídos
- [ ] 0/3 itens desejáveis concluídos

**Total:** 0/20 ações implementadas (0%)

---

## 🎯 Meta Mensal

**Mês 1:** 10/20 (50%) - Foco em Crítico + Importante  
**Mês 2:** 15/20 (75%) - Incluir Testes  
**Mês 3:** 20/20 (100%) - Sistema completo

---

## 📞 Recursos Úteis

- **LGPD:** https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
- **Firebase App Check:** https://firebase.google.com/docs/app-check
- **Jest Testing:** https://jestjs.io/docs/getting-started
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **DOMPurify:** https://github.com/cure53/DOMPurify
- **PWA Checklist:** https://web.dev/pwa-checklist/
