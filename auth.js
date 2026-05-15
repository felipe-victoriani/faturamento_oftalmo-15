/**
 * auth.js
 * Gerenciamento de autenticação Firebase Authentication.
 * Controla login, logout, recuperação de senha e estado do usuário.
 *
 * Funções exportadas (em window.Auth):
 *   - aoMudarEstado(callback)
 *   - fazerLogin(email, senha)
 *   - fazerLogout()
 *   - recuperarSenha(email)
 *   - reenviarEmailSenha()
 *   - obterUsuarioAtual()
 */

window.Auth = (() => {
  /* Callback para mudança de estado — será definido por app.js */
  let callbackMudancaEstado = null;

  /* Armazena o último e-mail usado para recuperação */
  let ultimoEmailRecuperacao = null;

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */

  /**
   * Registra callback para ser executado quando o estado de autenticação mudar.
   * @param {Function} callback - Recebe (usuario) como parâmetro
   */
  function aoMudarEstado(callback) {
    callbackMudancaEstado = callback;

    /* Ouvir mudanças no estado de autenticação */
    firebaseAuth.onAuthStateChanged((usuario) => {
      if (callbackMudancaEstado) {
        callbackMudancaEstado(usuario);
      }
    });
  }

  /* ============================================================
     LOGIN
     ============================================================ */

  /**
   * Realiza login com e-mail e senha.
   * @param {string} email
   * @param {string} senha
   * @returns {Promise<Object>} Usuario do Firebase
   */
  async function fazerLogin(email, senha) {
    try {
      const credencial = await firebaseAuth.signInWithEmailAndPassword(
        email,
        senha,
      );
      return credencial.user;
    } catch (erro) {
      console.error("Erro no login:", erro);

      /* Traduzir erros comuns */
      const mensagensErro = {
        "auth/user-not-found": "Usuário não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/user-disabled": "Esta conta foi desativada.",
        "auth/too-many-requests":
          "Muitas tentativas. Tente novamente mais tarde.",
        "auth/network-request-failed":
          "Erro de conexão. Verifique sua internet.",
      };

      const mensagem =
        mensagensErro[erro.code] || "Erro ao fazer login. Tente novamente.";
      throw new Error(mensagem);
    }
  }

  /* ============================================================
     LOGOUT
     ============================================================ */

  /**
   * Realiza logout do usuário atual.
   * @returns {Promise<void>}
   */
  async function fazerLogout() {
    try {
      await firebaseAuth.signOut();
    } catch (erro) {
      console.error("Erro no logout:", erro);
      throw new Error("Não foi possível sair. Tente novamente.");
    }
  }

  /* ============================================================
     RECUPERAÇÃO DE SENHA
     ============================================================ */

  /**
   * Envia e-mail de recuperação de senha.
   * @param {string} email
   * @returns {Promise<void>}
   */
  async function recuperarSenha(email) {
    try {
      await firebaseAuth.sendPasswordResetEmail(email);
      ultimoEmailRecuperacao = email;
    } catch (erro) {
      console.error("Erro ao recuperar senha:", erro);

      const mensagensErro = {
        "auth/user-not-found": "Usuário não encontrado.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
        "auth/network-request-failed":
          "Erro de conexão. Verifique sua internet.",
      };

      const mensagem =
        mensagensErro[erro.code] || "Erro ao enviar e-mail. Tente novamente.";
      throw new Error(mensagem);
    }
  }

  /**
   * Reenvia e-mail de recuperação para o último e-mail usado.
   * @returns {Promise<void>}
   */
  async function reenviarEmailSenha() {
    if (!ultimoEmailRecuperacao) {
      throw new Error("Nenhum e-mail registrado para reenvio.");
    }
    return recuperarSenha(ultimoEmailRecuperacao);
  }

  /* ============================================================
     ESTADO DO USUÁRIO
     ============================================================ */

  /**
   * Retorna o usuário atualmente autenticado.
   * @returns {Object|null} Usuario do Firebase ou null
   */
  function obterUsuarioAtual() {
    return firebaseAuth.currentUser;
  }

  /* ============================================================
     CONFIGURAR LISTENERS DO FORMULÁRIO DE LOGIN
     ============================================================ */

  /**
   * Configura todos os event listeners da tela de login.
   * Chamado por app.js na inicialização.
   */
  function configurarListenersLogin() {
    const formLogin = document.getElementById("form-login");
    const formRecuperacao = document.getElementById("form-recuperacao");
    const btnEsqueciSenha = document.getElementById("btn-esqueci-senha");
    const btnVoltarLogin = document.getElementById("btn-voltar-login");
    const btnToggleSenha = document.getElementById("btn-toggle-senha");
    const campoSenha = document.getElementById("campo-senha");
    const erroLogin = document.getElementById("erro-login");
    const erroRecuperacao = document.getElementById("erro-recuperacao");
    const painelRecuperacao = document.getElementById("painel-recuperacao");

    /* ---- Submissão do formulário de login ---- */
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroLogin.textContent = "";

      const email = document.getElementById("campo-email").value.trim();
      const senha = document.getElementById("campo-senha").value;
      const checkboxLGPD = document.getElementById("aceitar-lgpd");
      const btnEntrar = document.getElementById("btn-entrar");

      /* Validação básica */
      if (!email || !senha) {
        erroLogin.textContent = "Preencha todos os campos.";
        return;
      }

      /* Validação LGPD */
      if (!checkboxLGPD.checked) {
        erroLogin.textContent =
          "Você precisa aceitar a Política de Privacidade e Termos de Uso para continuar.";
        return;
      }

      /* Estado de loading */
      btnEntrar.classList.add("btn-primario--carregando");
      btnEntrar.disabled = true;

      try {
        await fazerLogin(email, senha);
        /* Sucesso — mudança de estado será tratada por onAuthStateChanged */
      } catch (erro) {
        erroLogin.textContent = erro.message;
        btnEntrar.classList.remove("btn-primario--carregando");
        btnEntrar.disabled = false;
      }
    });

    /* ---- Toggle mostrar/ocultar senha ---- */
    btnToggleSenha.addEventListener("click", () => {
      const tipo = campoSenha.type === "password" ? "text" : "password";
      campoSenha.type = tipo;

      const estaVisivel = tipo === "text";
      btnToggleSenha.setAttribute("aria-pressed", estaVisivel);
      btnToggleSenha.setAttribute(
        "aria-label",
        estaVisivel ? "Ocultar senha" : "Mostrar senha",
      );

      /* Alternar ícone */
      btnToggleSenha.innerHTML = estaVisivel
        ? Ui.Icones.olhoFechado
        : Ui.Icones.olho;
    });

    /* ---- Alternar para painel de recuperação ---- */
    btnEsqueciSenha.addEventListener("click", () => {
      formLogin.hidden = true;
      painelRecuperacao.hidden = false;
      erroLogin.textContent = "";
    });

    /* ---- Voltar ao login ---- */
    btnVoltarLogin.addEventListener("click", () => {
      painelRecuperacao.hidden = true;
      formLogin.hidden = false;
      erroRecuperacao.textContent = "";
    });

    /* ---- Submissão do formulário de recuperação ---- */
    formRecuperacao.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroRecuperacao.textContent = "";

      const email = document
        .getElementById("campo-email-recuperacao")
        .value.trim();

      if (!email) {
        erroRecuperacao.textContent = "Informe um e-mail válido.";
        return;
      }

      const btnEnviar = formRecuperacao.querySelector('button[type="submit"]');
      btnEnviar.disabled = true;
      btnEnviar.textContent = "Enviando...";

      try {
        await recuperarSenha(email);
        Ui.mostrarToast(
          "E-mail de recuperação enviado com sucesso!",
          "sucesso",
        );

        /* Limpar campo e voltar ao login */
        document.getElementById("campo-email-recuperacao").value = "";
        painelRecuperacao.hidden = true;
        formLogin.hidden = false;
      } catch (erro) {
        erroRecuperacao.textContent = erro.message;
      } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = "Enviar link";
      }
    });
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */

  return {
    aoMudarEstado,
    fazerLogin,
    fazerLogout,
    recuperarSenha,
    reenviarEmailSenha,
    obterUsuarioAtual,
    configurarListenersLogin,
  };
})();
