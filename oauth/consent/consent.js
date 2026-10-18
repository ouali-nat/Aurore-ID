(function () {
  "use strict";

  const SUPABASE_URL = "https://woyzakzpqtzwjiyysuum.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QAwjkgFLLx1v6DkESJ-d6g_GHHCQiUm";
  const CANONICAL_ORIGIN = "https://aurore-id.vercel.app";
  const AUTHORIZATION_STORAGE_KEY = "aurore-id.oauth.authorization_id.v1";

  // Keep these exact callback URLs synchronized with the registered Aurore OAuth apps.
  // Match against exact registered URIs before displaying consent or redirecting.
  const ALLOWED_CALLBACKS = [
    "https://tdeotqfsbvouresfhkab.supabase.co/auth/v1/callback",
    "https://fdstrbqvkemtjyxxaxbj.supabase.co/auth/v1/callback",
    "https://iymioasfkithmyqtpipd.supabase.co/auth/v1/callback",
    "https://lhrfsgqonclwqqvjxzht.supabase.co/auth/v1/callback",
    "https://oegxxndiuovisustjstp.supabase.co/auth/v1/callback"
  ];

  const $ = function (id) { return document.getElementById(id); };
  const loginSection = $("login-section");
  const consentSection = $("consent-section");
  const recoverySection = $("recovery-section");
  const notice = $("notice");
  const loginButton = $("login-button");
  const loginForm = $("login-form");
  const modeToggle = $("mode-toggle");
  const resetButton = $("reset-button");
  const recoverySendButton = $("recovery-send");
  const recoveryBackButton = $("recovery-back");
  const updatePasswordButton = $("update-password-button");
  const approveButton = $("approve-button");
  const denyButton = $("deny-button");
  let client = null;
  let authorizationId = "";
  let authorizationDetails = null;
  let authMode = "signin";
  let passwordRecoveryMode = false;
  let busy = false;

  function setNotice(message, good) {
    notice.textContent = String(message || "Une erreur est survenue.");
    notice.className = good ? "notice ok" : "notice";
    notice.style.display = "block";
  }

  function clearNotice() {
    notice.textContent = "";
    notice.style.display = "none";
    notice.className = "notice";
  }

  function setBusy(value) {
    busy = !!value;
    [loginButton, modeToggle, resetButton, recoverySendButton, recoveryBackButton, updatePasswordButton, approveButton, denyButton].forEach(function (button) {
      if (button) button.disabled = busy;
    });
  }

  function loadAuthorizationId() {
    const params = new URLSearchParams(window.location.search);
    let value = params.get("authorization_id") || "";
    if (value) {
      try { sessionStorage.setItem(AUTHORIZATION_STORAGE_KEY, value); } catch (_) {}
      return value;
    }
    try { return sessionStorage.getItem(AUTHORIZATION_STORAGE_KEY) || ""; } catch (_) { return ""; }
  }

  function clearAuthorizationId() {
    try { sessionStorage.removeItem(AUTHORIZATION_STORAGE_KEY); } catch (_) {}
  }

  function consentUrl(id) {
    const url = new URL("/oauth/consent/", CANONICAL_ORIGIN);
    url.searchParams.set("authorization_id", id);
    return url.toString();
  }

  function verifyCallbackUri(uri) {
    if (typeof uri !== "string") return null;
    return ALLOWED_CALLBACKS.indexOf(uri) >= 0 ? uri : null;
  }

  function verifyRedirectUrl(raw, expectedUri) {
    if (typeof raw !== "string" || !raw) throw new Error("Aucune adresse de retour sûre n’a été fournie.");
    const target = new URL(raw);
    if (target.protocol !== "https:" || target.username || target.password) {
      throw new Error("L’adresse de retour ne respecte pas les règles de sécurité.");
    }

    let allowedUri = verifyCallbackUri(expectedUri);
    if (!allowedUri) {
      allowedUri = ALLOWED_CALLBACKS.find(function (uri) {
        const registered = new URL(uri);
        return registered.origin === target.origin && registered.pathname === target.pathname;
      }) || null;
    }
    if (!allowedUri) throw new Error("Ce service n’est pas encore autorisé à recevoir une réponse de connexion.");

    const registeredUri = new URL(allowedUri);
    if (target.origin !== registeredUri.origin || target.pathname !== registeredUri.pathname) {
      throw new Error("L’adresse de retour ne correspond pas à celle enregistrée pour ce service.");
    }
    return target.toString();
  }

  function showLogin() {
    loginSection.style.display = "block";
    consentSection.style.display = "none";
    recoverySection.style.display = "none";
    $("login-identity").style.display = "none";
  }

  function showRecoveryRequest() {
    loginSection.style.display = "none";
    consentSection.style.display = "none";
    recoverySection.style.display = "block";
    $("recovery-request").style.display = "block";
    $("update-password-panel").style.display = "none";
    $("recovery-title").textContent = "Récupérer votre compte";
    $("recovery-copy").textContent = "Indiquez l’adresse e-mail associée à votre compte. Si un compte correspondant existe, un lien de récupération sera envoyé.";
    clearNotice();
  }

  function showPasswordRecovery() {
    loginSection.style.display = "none";
    consentSection.style.display = "none";
    recoverySection.style.display = "block";
    $("recovery-request").style.display = "none";
    $("update-password-panel").style.display = "block";
    $("recovery-title").textContent = "Choisir un nouveau mot de passe";
    $("recovery-copy").textContent = "Choisissez un mot de passe d’au moins 8 caractères pour retrouver l’accès à votre compte Aurore ID.";
    clearNotice();
  }

  function authErrorMessage(error, creatingAccount) {
    const message = String(error && error.message || "").toLowerCase();
    if (message.includes("invalid login credentials")) return "Adresse e-mail ou mot de passe incorrect.";
    if (message.includes("email not confirmed")) return "Confirmez d’abord votre adresse e-mail grâce au message reçu.";
    if (message.includes("user already registered") || message.includes("already been registered")) return "Un compte existe déjà avec cette adresse. Connectez-vous plutôt que de créer un nouveau compte.";
    if (message.includes("password should be at least") || message.includes("password is too short")) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (message.includes("email rate limit") || message.includes("too many requests")) return "Trop de demandes ont été envoyées. Attendez quelques minutes avant de réessayer.";
    if (message.includes("network") || message.includes("fetch")) return "Connexion au service indisponible. Vérifiez votre réseau et réessayez.";
    if (creatingAccount) return "La création du compte n’a pas abouti. Vérifiez l’adresse e-mail et le mot de passe, puis réessayez.";
    return "La connexion n’a pas abouti. Vérifiez vos identifiants, puis réessayez.";
  }

  async function continueAuthenticatedUser(user) {
    const detailsResult = await client.auth.oauth.getAuthorizationDetails(authorizationId);
    const details = detailsResult.data;
    if (detailsResult.error || !details) {
      throw new Error("La demande d’autorisation a expiré ou n’est pas valide. Revenez au service demandeur et recommencez.");
    }

    if (!("authorization_id" in details)) {
      const target = verifyRedirectUrl(details.redirect_url, null);
      clearAuthorizationId();
      window.location.replace(target);
      return;
    }

    showConsent(details, user);
  }

  function showConsent(details, user) {
    const redirectUri = verifyCallbackUri(details.redirect_uri);
    if (!redirectUri) throw new Error("La demande provient d’une adresse de retour non enregistrée. Elle a été bloquée.");

    authorizationDetails = details;
    $("client-name").textContent = String(details.client && details.client.name || "Service Aurore");
    $("redirect-uri").textContent = redirectUri;
    $("login-email").textContent = String(user.email || "compte Aurore connecté");
    $("consent-email").textContent = String(user.email || "compte Aurore connecté");
    $("login-identity").style.display = "flex";
    $("consent-identity").style.display = "flex";

    const list = $("scope-list");
    list.replaceChildren();
    const scopeLabels = {
      openid: "Identifiant de connexion",
      email: "Adresse e-mail",
      profile: "Informations de profil",
      phone: "Numéro de téléphone"
    };
    String(details.scope || "email").split(/\s+/).filter(Boolean).forEach(function (scope) {
      const item = document.createElement("li");
      item.textContent = scopeLabels[scope] || scope;
      list.appendChild(item);
    });

    $("request-details").style.display = "block";
    loginSection.style.display = "none";
    consentSection.style.display = "block";
    clearNotice();
  }

  async function loadSupabaseSdk() {
    if (window.supabase && typeof window.supabase.createClient === "function") return;

    const sources = [
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js",
      "https://unpkg.com/@supabase/supabase-js@2.117.2/dist/umd/supabase.js"
    ];

    for (const src of sources) {
      try {
        await new Promise(function (resolve, reject) {
          const script = document.createElement("script");
          let settled = false;
          const finish = function (error) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            script.onload = null;
            script.onerror = null;
            if (error) {
              script.remove();
              reject(error);
            } else {
              resolve();
            }
          };
          const timer = setTimeout(function () {
            finish(new Error("Délai de chargement dépassé"));
          }, 8000);
          script.src = src;
          script.async = true;
          script.onload = function () { finish(); };
          script.onerror = function () { finish(new Error("CDN inaccessible")); };
          document.head.appendChild(script);
        });
        if (window.supabase && typeof window.supabase.createClient === "function") return;
      } catch (_) {
        // Try the next approved CDN; do not expose internal network details to the user.
      }
    }

    throw new Error("Le service de connexion n’a pas pu être chargé. Vérifiez votre réseau, puis réessayez.");
  }

  async function initialize() {
    if (window.location.origin !== CANONICAL_ORIGIN) {
      throw new Error("Pour une connexion sûre, ouvrez Aurore ID à son adresse officielle : " + CANONICAL_ORIGIN);
    }

    authorizationId = loadAuthorizationId();
    if (!authorizationId || authorizationId.length > 2048) {
      throw new Error("Aucune demande de connexion valide n’a été trouvée. Revenez au service Aurore que vous souhaitez ouvrir.");
    }

    await loadSupabaseSdk();

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    client.auth.onAuthStateChange(function (event, session) {
      if (event === "PASSWORD_RECOVERY") {
        passwordRecoveryMode = true;
        // Only expose the password form when Supabase has a recovery session.
        if (session) showPasswordRecovery();
      }
    });

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (fragment.get("type") === "recovery") passwordRecoveryMode = true;

    if (passwordRecoveryMode) {
      // Supabase may show a recovery fragment even when its token is expired or
      // malformed. Verify that the SDK actually established a session first.
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      if (sessionResult.data && sessionResult.data.session) {
        showPasswordRecovery();
      } else {
        passwordRecoveryMode = false;
        showRecoveryRequest();
        setNotice("Ce lien de récupération est expiré ou incomplet. Demandez un nouveau lien pour choisir un mot de passe.", false);
      }
      return;
    }

    // Security: an existing persisted session is not proof of fresh
    // authentication for this authorization request. Always require the
    // user to submit credentials successfully before continuing to consent.
    showLogin();
  }

  async function handleLogin() {
    if (busy || !client || !authorizationId) return;
    clearNotice();
    const email = String($("login-email-input").value || "").trim();
    const password = String($("login-password").value || "");
    if (!email || !password) {
      setNotice("Saisissez votre adresse e-mail et votre mot de passe.");
      return;
    }
    setBusy(true);
    try {
      if (authMode === "signup") {
        const result = await client.auth.signUp({
          email: email,
          password: password,
          options: { emailRedirectTo: consentUrl(authorizationId) }
        });
        if (result.error) throw result.error;

        if (!result.data || !result.data.session) {
          setNotice("Votre demande de création de compte a été reçue. Consultez votre boîte e-mail pour confirmer l’adresse avant de vous connecter.", true);
          return;
        }
      } else {
        const result = await client.auth.signInWithPassword({ email: email, password: password });
        if (result.error) throw result.error;
      }

      const userResult = await client.auth.getUser();
      const user = userResult.data && userResult.data.user;
      if (userResult.error || !user) {
        throw new Error("Le compte a été reconnu, mais la session n’a pas pu être vérifiée. Recommencez la connexion.");
      }
      await continueAuthenticatedUser(user);
    } catch (error) {
      setNotice(authErrorMessage(error, authMode === "signup"));
    } finally {
      setBusy(false);
    }
  }

  function toggleAuthMode() {
    if (busy) return;
    authMode = authMode === "signin" ? "signup" : "signin";
    const creating = authMode === "signup";
    $("login-title").textContent = creating ? "Créer votre compte Aurore ID" : "Connectez-vous à Aurore ID";
    $("login-copy").textContent = creating
      ? "Créez un compte avec une adresse e-mail que vous pouvez consulter et un mot de passe d’au moins 8 caractères."
      : "Utilisez votre adresse e-mail et votre mot de passe Aurore ID. Votre autorisation pour chaque service reste distincte.";
    loginButton.textContent = creating ? "Créer mon compte" : "Se connecter";
    modeToggle.textContent = creating ? "J’ai déjà un compte" : "Créer un compte Aurore ID";
    $("login-password").autocomplete = creating ? "new-password" : "current-password";
    $("login-password").minLength = creating ? 8 : 1;
    $("login-password").value = "";
    clearNotice();
  }

  async function handleRecoveryRequest() {
    if (busy || !client || !authorizationId) return;
    const email = String($("recovery-email").value || "").trim();
    if (!email) {
      setNotice("Saisissez l’adresse e-mail associée à votre compte.");
      return;
    }
    clearNotice();
    setBusy(true);
    try {
      const result = await client.auth.resetPasswordForEmail(email, {
        redirectTo: consentUrl(authorizationId)
      });
      if (result.error) throw result.error;
      setNotice("Si un compte correspond à cette adresse, un e-mail de récupération va être envoyé. Consultez aussi vos courriers indésirables.", true);
    } catch (error) {
      setNotice(authErrorMessage(error, false));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordUpdate() {
    if (busy || !client) return;
    const password = String($("new-password").value || "");
    const confirm = String($("new-password-confirm").value || "");
    if (password.length < 8) {
      setNotice("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setNotice("Les deux mots de passe ne correspondent pas.");
      return;
    }
    clearNotice();
    setBusy(true);
    try {
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data || !sessionResult.data.session) {
        passwordRecoveryMode = false;
        showRecoveryRequest();
        setNotice("Votre lien de récupération n’est plus valide. Demandez un nouveau lien avant de choisir un mot de passe.", false);
        return;
      }
      const result = await client.auth.updateUser({ password: password });
      if (result.error) throw result.error;
      await client.auth.signOut();
      passwordRecoveryMode = false;
      $("login-password").value = "";
      showLogin();
      setNotice("Mot de passe mis à jour. Vous pouvez maintenant vous connecter à Aurore ID.", true);
    } catch (error) {
      const raw = String(error && (error.message || error.code) || "").toLowerCase();
      if (raw.includes("session missing") || raw.includes("session_not_found") || raw.includes("jwt expired") || raw.includes("invalid refresh token") || raw.includes("refresh token not found")) {
        passwordRecoveryMode = false;
        showRecoveryRequest();
        setNotice("Le lien de récupération a expiré ou n’a pas établi de session. Demandez un nouveau lien et ouvrez-le directement sur cet appareil.", false);
      } else {
        setNotice(authErrorMessage(error, false));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDecision(approve) {
    if (busy || !client || !authorizationDetails || !authorizationId) return;
    clearNotice();
    setBusy(true);
    try {
      const response = approve
        ? await client.auth.oauth.approveAuthorization(authorizationId)
        : await client.auth.oauth.denyAuthorization(authorizationId);
      if (response.error || !response.data || !response.data.redirect_url) {
        throw new Error("Le serveur n’a pas confirmé la décision. Aucune redirection n’a été effectuée.");
      }
      const target = verifyRedirectUrl(response.data.redirect_url, authorizationDetails.redirect_uri);
      clearAuthorizationId();
      window.location.replace(target);
    } catch (error) {
      setNotice(error && error.message ? error.message : "Impossible de traiter la décision. Aucune redirection n’a été effectuée.");
    } finally {
      setBusy(false);
    }
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    handleLogin();
  });
  modeToggle.addEventListener("click", toggleAuthMode);
  resetButton.addEventListener("click", function () {
    $("recovery-email").value = String($("login-email-input").value || "").trim();
    showRecoveryRequest();
  });
  recoverySendButton.addEventListener("click", handleRecoveryRequest);
  recoveryBackButton.addEventListener("click", showLogin);
  updatePasswordButton.addEventListener("click", handlePasswordUpdate);
  approveButton.addEventListener("click", function () { handleDecision(true); });
  denyButton.addEventListener("click", function () { handleDecision(false); });

  initialize().catch(function (error) {
    loginSection.style.display = "none";
    consentSection.style.display = "none";
    setNotice(error && error.message ? error.message : "Aurore ID n’a pas pu traiter cette demande.");
  });
})();