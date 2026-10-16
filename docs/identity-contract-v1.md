# Aurore ID — contrat d'identité central (proposition v1)

Statut : **spécification de conception, non activée**. Ce document ne configure aucun fournisseur, ne change aucun projet Supabase et ne migre aucune identité.

## 1. Objectif

Aurore ID est le point d'entrée commun de l'écosystème. L'utilisateur choisit de se connecter depuis Archives, Instituts, Mémoire ou Animation, s'authentifie auprès du fournisseur central, puis revient vers le service demandé. Chaque application reste responsable de ses rôles, de ses autorisations et de ses données.

Le portail web `https://aurore-id.vercel.app` est l'adresse provisoire de l'interface. Elle n'est pas automatiquement l'émetteur OIDC (`issuer`) : celui-ci sera l'URL officielle stable fournie par le fournisseur retenu.

## 2. Architecture cible à évaluer

- Fournisseur central candidat : Auth0, sous réserve de vérifier ses fonctionnalités OIDC, ses limites gratuites, ses règles de domaines/redirections et la possibilité d'utiliser Google comme connexion amont.
- Protocole : OpenID Connect Authorization Code Flow avec PKCE (`S256`), `state`, `nonce`, validation de l'émetteur, de l'audience, de la signature et de l'expiration.
- Chaque application demande une connexion à Aurore ID et ne reçoit que les résultats prévus pour son URL de rappel enregistrée.
- Dans la première phase, les projets Supabase restent les autorités locales pour leurs sessions et leurs politiques RLS. Le modèle envisagé est de faire accepter l'identité centrale par Supabase Auth comme fournisseur externe OIDC, si la configuration et l'offre des projets le permettent. Il ne faut pas remplacer directement les jetons Supabase par les jetons centraux dans les appels existants.
- Les secrets du fournisseur restent côté serveur / dans les variables d'environnement chiffrées. Aucun secret client confidentiel ne doit être intégré dans HTML, JavaScript public ou dépôt Git.

Cette architecture est une hypothèse de travail : elle doit être validée sur un environnement de test avant tout branchement de production.

## 3. Identifiant stable et rapprochement des comptes

L'identité centrale est identifiée par le couple `(issuer, sub)`. L'e-mail sert à l'affichage et à un processus de rapprochement vérifié ; il ne constitue jamais à lui seul une preuve suffisante pour fusionner deux comptes.

Pour chaque application, conserver l'UUID Supabase existant et les données qui en dépendent. Avant d'associer une identité centrale à un compte local, exiger une preuve de contrôle du compte existant ou une procédure administrative documentée. Toute association ambiguë doit échouer de façon fermée et être traitée manuellement. Ne jamais créer automatiquement un deuxième compte uniquement parce qu'une adresse e-mail est déjà connue.

Aucune table de liaison n'est créée dans cette phase. Si une table de correspondance devient nécessaire, son schéma, ses contraintes d'unicité, les droits RLS et la procédure de récupération devront être soumis à validation séparée avant migration.

## 4. Contrat de claims

Claims OIDC minimaux attendus après validation par le fournisseur :

- `iss` : émetteur exact configuré ;
- `sub` : identifiant stable et unique de l'utilisateur chez cet émetteur ;
- `aud` : identifiant du client prévu ;
- `exp`, `iat`, `nonce` : vérifiés selon le protocole ;
- `email` et `email_verified` : utilisés seulement selon les règles de rapprochement approuvées.

Les rôles métier (administrateur, membre d'établissement, élève, éditeur, etc.) ne sont pas accordés par le simple fait de posséder une identité Aurore ID. Ils restent définis et vérifiés dans chaque service.

## 5. Redirections et sessions

- Maintenir une liste explicite des URI de rappel HTTPS pour chaque environnement et chaque service.
- Refuser les redirections libres, les domaines joker et toute URL de retour fournie par l'utilisateur sans comparaison exacte à une liste autorisée.
- Utiliser `state`, `nonce`, PKCE `S256`, cookies de session sécurisés lorsque le flux serveur le permet, et des durées de session raisonnables.
- Ne jamais transmettre de jetons dans les paramètres d'URL après le retour ; ne pas journaliser les jetons, codes, secrets ou données personnelles.
- Prévoir la déconnexion locale, la déconnexion centrale et l'expiration/renouvellement sans supposer qu'elles sont équivalentes.

## 6. Compatibilité des applications existantes

### Section Archives

Le code existant utilise Supabase Auth avec PKCE et traite manuellement le code de retour. Toute expérimentation doit préserver ce comportement ou le remplacer par un parcours entièrement testé. Éviter toute double consommation du code OAuth et préserver le parcours Android/TWA.

### Section Instituts

Le code utilise Supabase Auth avec PKCE et conserve actuellement la session dans `localStorage` sous la clé `aurore-session`. Le Worker vérifie le jeton Supabase et déduit certains accès de l'identifiant de l'utilisateur. Ne pas changer le format ou la clé de session, les UUID, les appartenances, les rôles, ni les politiques RLS sans une migration séparée et testée.

Les deux comptes Instituts identifiés comme clones de test sont exclus du problème opérationnel des comptes sans profil ; ils ne doivent pas servir de référence pour une migration de vrais utilisateurs.

## 7. Critères d'acceptation avant toute activation

1. Un utilisateur peut se connecter via Aurore ID puis revenir au service demandé, sur mobile et navigateur.
2. Un compte existant retrouve exactement son UUID Supabase et ses données ; aucune duplication silencieuse.
3. Les profils sans liaison, les comptes e-mail/mot de passe, les identités Google et les comptes administrateurs sont testés séparément.
4. Les rôles, l'isolation entre établissements et toutes les politiques RLS restent corrects.
5. Les rappels non autorisés, `state`/nonce invalides, jetons expirés, mauvaise audience ou mauvais émetteur sont refusés.
6. Les sessions, le renouvellement, la déconnexion et la récupération après échec réseau sont testés.
7. Une procédure de retour arrière est documentée ; l'ancienne connexion reste disponible jusqu'à validation explicite.

## 8. Hors périmètre de cette étape

Aucun changement de configuration Auth/Google, aucun secret, aucun réglage de fournisseur, aucune migration de compte, aucune modification SQL/RLS et aucune modification des applications de production. Étape suivante proposée : audit des paramètres Auth disponibles dans les tableaux de bord, puis protocole de test isolé et décision finale sur le fournisseur.
