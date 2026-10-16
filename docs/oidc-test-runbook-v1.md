# Aurore ID — préparation du test OIDC isolé

Statut : **préparation uniquement**. Ce document ne configure aucun fournisseur, ne change aucun secret, ne modifie aucune application de production et ne touche ni aux comptes, ni aux UUID, ni aux données, ni aux politiques RLS.

## 1. Décision technique à tester

Tester en priorité le modèle **Supabase Auth comme session locale + Aurore ID comme fournisseur OIDC externe** (« Custom OAuth/OIDC Provider »), plutôt que l'authentification tierce directe où l'application enverrait le jeton central à Supabase. Le premier modèle garde le rôle de Supabase Auth dans les sessions existantes et permet à chaque service de conserver ses règles RLS. Cette préférence reste une hypothèse jusqu'au test réel.

Documentation officielle : https://supabase.com/docs/guides/auth/custom-oauth-providers

## 2. Ne pas confondre les deux niveaux de connexion

Les URL actuellement communiquées sont les callbacks Google existants de Supabase :

- Archives : `https://tdeotqfsbvouresfhkab.supabase.co/auth/v1/callback`
- Instituts : `https://fdstrbqvkemtjyxxaxbj.supabase.co/auth/v1/callback`

L'identifiant client Google communiqué correspond à la connexion Google actuelle. **Ne pas le remplacer, ne pas modifier ses URI de redirection et ne pas partager de secret Google dans GitHub ou dans une conversation.**

Pour un fournisseur central OIDC, Supabase affichera un callback distinct dans la fiche du fournisseur personnalisé. C'est ce callback, propre au projet Supabase, qu'il faudra enregistrer côté fournisseur central. Le client OIDC central et ses identifiants sont distincts de l'identifiant client Google existant. Le callback exact doit être copié depuis le tableau de bord au moment du test ; ne pas le deviner.

## 3. Préparation de l'environnement de test

Avant de créer une ressource ou d'activer un fournisseur, choisir explicitement l'une des voies suivantes :

1. **Projet Supabase de test dédié** : option la plus sûre pour vérifier le comportement de connexion et de création de compte. Vérifier le coût éventuel avant création ; ne pas utiliser de données réelles.
2. **Branche de développement Supabase** : seulement après vérification du prix et des limites. Une branche de base de données ne garantit pas à elle seule que les paramètres Auth et fournisseurs soient isolés comme attendu.
3. **À défaut de budget ou d'environnement isolé**, rester en lecture seule et documenter les paramètres manquants. Ne pas expérimenter sur Archives ou Instituts en production.

Le fournisseur central (Auth0 candidat) doit être créé en mode test, sans activer de changement dans les applications réelles. Vérifier les limites gratuites et les connexions sociales disponibles avant de choisir définitivement le fournisseur.

## 4. Relevé de configuration — lecture seule

Dans chacun des deux projets Supabase, consulter sans enregistrer de modification :

- Authentication → Sign In / Providers : Google activé ou non, autres fournisseurs activés, présence éventuelle de Custom Providers.
- Authentication → URL Configuration : Site URL et liste exacte des Redirect URLs.
- Paramètres de sécurité/session visibles : durées de session, options de confirmation e-mail et éventuelles restrictions pertinentes.
- Dans Google Cloud Console, relever seulement les noms et URI de redirection autorisées du client OAuth utilisé ; masquer les secrets et toute donnée non nécessaire.

Ne pas copier les clés secrètes, tokens, codes de récupération, clés service-role ou jetons de session dans ce document, dans GitHub ou dans le chat. Si l'accès au tableau de bord est difficile, l'utilisateur peut simplement répondre aux questions ci-dessus ou fournir des captures recadrées avec tous les secrets masqués.

## 5. Cas de test obligatoires

Exécuter d'abord uniquement sur l'environnement isolé, avec des comptes de test contrôlés :

1. Connexion OIDC réussie, retour à l'application prévue et session Supabase locale valide.
2. Annulation de la connexion et retour arrière sans session corrompue.
3. Refus d'une URI de retour non autorisée.
4. Refus d'un flux invalide/expiré et absence de jeton dans l'URL finale ou les journaux.
5. Première connexion d'un compte de test : vérifier précisément quelle ligne `auth.users` et quelles identités sont créées.
6. Connexion d'un compte déjà existant : **ne pas conclure que l'UUID sera conservé simplement parce que l'e-mail est identique**. Comparer avant/après l'UUID local, les identités associées et les données. Si l'association est ambiguë ou crée un doublon, arrêter et ne pas reproduire en production.
7. Déconnexion, renouvellement de session, navigation mobile et reprise après échec réseau.
8. Vérifier les rôles et les règles d'accès au niveau applicatif sans élargir les privilèges.

Le rapprochement d'un compte existant doit être prouvé par un test dédié. Une adresse e-mail identique ne suffit pas comme preuve d'identité. Les comptes réels ne doivent pas être utilisés comme cobayes.

## 6. Garde-fous propres aux services

### Archives

Ne pas remplacer le parcours Google existant. Préserver le flux PKCE et l'échange manuel du code de retour, en évitant qu'un code soit consommé deux fois. Tester séparément le navigateur mobile et l'application Android/TWA. Conserver l'ancien bouton de connexion tant que le nouveau parcours n'est pas accepté.

### Instituts

Ne pas modifier la clé localStorage `aurore-session`, le format de session, les fonctions de restauration, les UUID Supabase ni la validation du jeton par le Worker. Ne pas modifier les appartenances, les rôles ou les politiques RLS. Les deux comptes clones de test signalés par l'utilisateur sont hors périmètre et ne doivent pas servir de référence de migration.

## 7. Critères de décision

**Autoriser une étape suivante seulement si** : le fournisseur et le coût sont acceptés ; le flux OIDC est validé ; le callback provient du tableau de bord ; la connexion locale Supabase fonctionne ; le compte préexistant garde son UUID et ses accès attendus ; les refus de sécurité fonctionnent ; un retour arrière est documenté.

**Arrêter immédiatement si** : un compte existant est dupliqué, un UUID change, une session Supabase attendue disparaît, un rôle est élargi, un callback non autorisé fonctionne, un secret est exposé ou une fonctionnalité mobile casse.

## 8. Retour arrière prévu

Le test ne doit jamais désactiver Google ni remplacer le parcours de connexion existant. Dans un environnement isolé, désactiver/supprimer uniquement le fournisseur de test après collecte des résultats. En production, aucune suppression ni bascule ne doit être faite sans plan séparé, validation des critères, sauvegarde des paramètres et autorisation explicite.

## 9. État actuel

- Contrat d'identité : `docs/identity-contract-v1.md`.
- Préparation du test : ce document.
- Production : inchangée.
- Prochaine action : relever les paramètres Auth/Redirect URLs en lecture seule, puis choisir et confirmer un environnement de test sans frais non approuvés.
