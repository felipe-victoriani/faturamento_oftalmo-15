# Como Implantar as Regras do Firebase Database

## Problema Identificado

As regras do Firebase Database não incluíam permissões para o caminho `repasses/`, bloqueando a leitura e escrita de dados de médicos.

## Solução Aplicada

Adicionei as regras necessárias no arquivo `database.rules.json`:

- Permissão de leitura e escrita em `repasses/medicos`
- Permissão de leitura e escrita em `repasses/lancamentos`

## Como Implantar as Regras

### Opção 1: Via Firebase Console (Recomendado para teste rápido)

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto: **financeiro-oftalmo-15**
3. No menu lateral, clique em **Realtime Database**
4. Clique na aba **Regras**
5. Copie o conteúdo do arquivo `database.rules.json` e cole no editor
6. Clique em **Publicar**

### Opção 2: Via Firebase CLI

1. **Instale o Firebase CLI** (se ainda não tiver):

   ```powershell
   npm install -g firebase-tools
   ```

2. **Faça login no Firebase**:

   ```powershell
   firebase login
   ```

3. **Inicialize o projeto** (apenas uma vez):

   ```powershell
   firebase init database
   ```

   - Selecione o projeto existente: financeiro-oftalmo-15
   - Mantenha o arquivo de regras como `database.rules.json`

4. **Implante as regras**:
   ```powershell
   firebase deploy --only database
   ```

## Verificação

Após implantar as regras, recarregue a aplicação e verifique no Console do navegador (F12):

- Deve aparecer: ✅ Médicos padrão adicionados com sucesso
- Os médicos devem aparecer no select

## Logs de Debug Adicionados

O código agora inclui logs detalhados no console:

- 🏥 Inicialização do módulo
- 📡 Configuração do listener Firebase
- 📥 Dados recebidos do Firebase
- ➕ Adição de médicos
- ✅ Confirmações de sucesso
- ❌ Erros (se houver)
