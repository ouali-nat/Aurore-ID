(function () {
  "use strict";

  const SUPABASE_URL = "https://woyzakzpqtzwjiyysuum.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QAwjkgFLLx1v6DkESJ-d6g_GHHCQiUm";
  const CANONICAL_ORIGIN = "https://aurore-id.vercel.app";
  const AUTHORIZATION_STORAGE_KEY = "aurore-id.oauth.authorization_id.v1";

  // These are the only OAuth callbacks intended for the first rollout.
  // Match against exact registered URIs before displaying consent or redirecting.
  const ALLOWED_CALLBACKS = [
    "https://tdeotqfsbvouresfhkab.supabase.co/auth/v1/callback",
    "https://fdstrbqvkemtjyxxaxbj.supabase.co/auth/v1/callback"
  ];

  const $ = function (id) { return document.getElementById(id); };
  const loginSection = $("login-section");
  const consentSection = $("consent-section");
  const notice = $("notice");
  const loginButton = $("login-button");
  const approveButton = $("approve-button");
  const denyButton = $("deny-button");
  let client = null;
  let authorizationId = "";
  let authorizationDetails = null;
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
    [loginButton, approveButton, denyButton].forEach(function (button) {
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
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js",
      "https://unpkg.com/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js"
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

    const sessionResult = await client.auth.getSession();
    if (sessionResult.error) throw new Error("Impossible de vérifier la session Aurore ID. Recommencez la connexion.");

    const session = sessionResult.data && sessionResult.data.session;
    if (!session) {
      showLogin();
      return;
    }

    const userResult = await client.auth.getUser();
    const user = userResult.data && userResult.data.user;
    if (userResult.error || !user) {
      showLogin();
      return;
    }

    $("login-email").textContent = String(user.email || "compte Aurore connecté");
    $("login-identity").style.display = "flex";

    const detailsResult = await client.auth.oauth.getAuthorizationDetails(authorizationId);
    const details = detailsResult.data;
    if (detailsResult.error || !details) {
      throw new Error("La demande d’autorisation a expiré ou n’est pas valide. Retournez au service demandeur et recommencez.");
    }

    if (!("authorization_id" in details)) {
      const target = verifyRedirectUrl(details.redirect_url, null);
      clearAuthorizationId();
      window.location.replace(target);
      return;
    }

    showConsent(details, user);
  }

  async function handleLogin() {
    if (busy || !client || !authorizationId) return;
    clearNotice();
    setBusy(true);
    try {
      const result = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: consentUrl(authorizationId),
          queryParams: { prompt: "select_account" },
          skipBrowserRedirect: true
        }
      });
      if (result.error) throw result.error;
      // Supabase normally performs the redirect. Keep an explicit fallback for SDK/browser variations.
      if (result.data && result.data.url) window.location.assign(result.data.url);
    } catch (_) {
      setNotice("La connexion Google n’est pas disponible pour le moment. Vérifiez que le fournisseur Google est activé dans les réglages Auth d’Aurore ID, puis réessayez.");
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

  loginButton.addEventListener("click", handleLogin);
  approveButton.addEventListener("click", function () { handleDecision(true); });
  denyButton.addEventListener("click", function () { handleDecision(false); });

  initialize().catch(function (error) {
    loginSection.style.display = "none";
    consentSection.style.display = "none";
    setNotice(error && error.message ? error.message : "Aurore ID n’a pas pu traiter cette demande.");
  });
})();