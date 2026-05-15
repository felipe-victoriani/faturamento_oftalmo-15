# 🔒 Regras de Segurança do Firebase Realtime Database

## Como Aplicar as Regras

### Opção 1: Via Console (Recomendado)

1. Acesse o Firebase Console:
   https://console.firebase.google.com/project/financeiro-oftalmo-15/database

2. Vá na aba **"Regras"** (Rules)

3. **Copie e cole** o conteúdo do arquivo `database.rules.json` (sem as chaves externas `{"rules": ...}`, apenas o conteúdo interno)

4. Clique em **"Publicar"** (Publish)

### Opção 2: Via Firebase CLI

Se você tem o Firebase CLI instalado:

```bash
firebase deploy --only database
```

---

## 🛡️ O que essas regras fazem:

### ✅ Proteções Implementadas:

1. **Autenticação Obrigatória**
   - Apenas usuários autenticados podem ler/escrever dados
   - Usuários não autenticados: acesso negado

2. **Estrutura de Dados Validada**
   - Convenios devem ter campo `nome` obrigatório
   - Registros só aceitam campos específicos definidos
   - Campos extras não permitidos (proteção contra injeção)

3. **Tipos de Dados Validados**
   - `valor`, `valorBruto`, `impostos`, etc.: apenas números
   - `producao`, `nFatura`, `dataProtocolo`, etc.: apenas strings
   - `percentualImposto`: número entre 0 e 100

4. **Hierarquia Protegida**
   - `/faturamento/tabelas/` - dados dos convênios e registros
   - `/faturamento/configuracoes/` - configurações globais
   - Outras rotas: bloqueadas

### ⚠️ Importante:

- Estas regras substituem o **"modo teste"** inicial
- Use estas regras em **produção**
- Sempre que adicionar novos campos, atualize as validações

---

## 📋 Estrutura de Dados Esperada

```json
{
  "faturamento": {
    "tabelas": {
      "convenioId1": {
        "nome": "Convenio XYZ",
        "registros": {
          "registroId1": {
            "producao": "2024-03",
            "nFatura": "12345",
            "dataProtocolo": "2024-03-15",
            "valor": 5000.0,
            "nNF": "NF-001",
            "dataNF": "2024-03-20",
            "valorBruto": 5000.0,
            "impostos": 875.0,
            "valorLiquido": 4125.0,
            "valorRecebido": 4125.0,
            "dataRecebimento": "2024-04-10",
            "observacoes": 0,
            "recurso": "",
            "createdAt": 1710500000000,
            "updatedAt": 1710500000000
          }
        }
      }
    },
    "configuracoes": {
      "percentualImposto": 17.5
    }
  }
}
```

---

## 🔧 Para Testar as Regras:

No Console do Firebase, use o **Simulador de Regras**:

1. Clique em **"Regras"** → Botão **"Simulador"**

2. Teste com autenticação:

   ```
   Tipo: Autenticado
   Caminho: /faturamento/tabelas
   Operação: Leitura
   Resultado esperado: ✅ Permitido
   ```

3. Teste sem autenticação:
   ```
   Tipo: Não autenticado
   Caminho: /faturamento/tabelas
   Operação: Leitura
   Resultado esperado: ❌ Negado
   ```

---

## 🚀 Sistema Pronto!

Após aplicar as regras:

1. ✅ Credenciais Firebase configuradas
2. ✅ Authentication ativado (Email/Password)
3. ✅ Realtime Database criado
4. ✅ Regras de segurança aplicadas
5. ✅ Usuário criado

**Agora você pode:**

- Abrir `index.html` no navegador
- Fazer login com seu usuário
- Começar a usar o sistema! 🎉
