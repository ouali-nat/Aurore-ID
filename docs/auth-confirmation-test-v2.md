# Aurore ID — parcours de confirmation et choix des services (v2)

Ce scénario doit être testé sur la prévisualisation avant toute fusion vers la branche de production. Utiliser une adresse de test dont on contrôle la boîte de réception ; ne pas utiliser de compte existant important ni modifier les rôles locaux des services.

## Préparation de l’environnement

Avant l’essai sur une prévisualisation Vercel, ajouter son URL HTTPS exacte à la liste Supabase Auth **Redirect URLs**. Le code utilise l’origine courante afin que le lien de confirmation revienne sur la version testée ; une URL qui n’est pas autorisée peut être rejetée par Supabase. Pour l’usage normal, conserver aussi `https://aurore-id.vercel.app/` dans cette liste.

## Parcours d’inscription

1. Ouvrir « Compte Aurore ID », choisir « Créer un compte », renseigner une adresse de test et un mot de passe d’au moins 8 caractères, puis confirmer le mot de passe.
2. Vérifier que le formulaire demande une confirmation par e-mail et qu’aucune préférence de service n’est encore enregistrée.
3. Ouvrir le lien de confirmation reçu. Il doit revenir vers `https://aurore-id.vercel.app/` ou vers l’URL de prévisualisation correspondante et ouvrir le formulaire de sélection des services, après vérification de la session auprès de Supabase Auth.
4. Sélectionner par exemple Plume et Talents. Vérifier que ces deux cartes restent en couleur et que les autres sont grisées. Enregistrer.
5. Recharger la page et vérifier que la session du même onglet est restaurée et que les choix sont toujours représentés correctement.

## Parcours de reconnexion

1. Dans un nouvel onglet ou après la fermeture de la session de test, ouvrir « Compte Aurore ID » et choisir « J’ai déjà un compte ».
2. Entrer le bon e-mail et mot de passe. Le serveur doit accepter la connexion puis restaurer les choix précédemment enregistrés.
3. Tester un mauvais mot de passe : la connexion doit échouer avec un message compréhensible et aucun choix privé ne doit être affiché comme authentifié.
4. Modifier les services sélectionnés puis enregistrer. Recharger et vérifier que la nouvelle sélection a remplacé l’ancienne.

## Contrôles indispensables

- L’adresse e-mail doit être confirmée dans Supabase Auth avant d’ouvrir le formulaire d’association.
- Les sélections doivent être enregistrées dans les métadonnées du compte central seulement après un enregistrement explicite.
- Une sélection colore ou grise les cartes à titre de préférence ; elle n’accorde pas de rôle et ne donne pas accès aux données protégées d’une application.
- La connexion unique inter-domaines n’est pas considérée comme terminée par ce changement ; elle doit être configurée et testée séparément dans chaque service.
- Si le lien de confirmation ne revient pas avec une session vérifiable, ne pas désactiver la confirmation e-mail pour contourner le problème. Vérifier plutôt le modèle d’e-mail, l’URL de site et la liste Supabase des Redirect URLs autorisées.


## Parcours de connexion sécurisée / autorisation OAuth

1. Ouvrir `/oauth/consent/?authorization_id=...` avec une demande d'autorisation de test valide alors qu'une session Aurore ID existe déjà dans le navigateur. La page doit quand même afficher le formulaire e-mail/mot de passe ; elle ne doit pas autoriser ni rediriger automatiquement.
2. Sans remplir les champs, attendre au moins 30 secondes : aucune autorisation, aucun accès au service demandeur et aucune redirection ne doivent se produire.
3. Soumettre un e-mail inexistant ou un mot de passe incorrect : la page doit rester sur le formulaire, afficher une erreur et ne jamais afficher l'écran de consentement.
4. Soumettre le bon e-mail et le bon mot de passe : l'identité doit être validée par Supabase Auth, puis les détails de la demande doivent être présentés avant toute autorisation.
5. Cliquer sur « Refuser la demande » : aucune session du service demandeur ne doit être accordée. Cliquer sur « Autoriser et continuer » seulement dans un test contrôlé ; la redirection doit correspondre exactement au callback autorisé.
6. Vérifier aussi le parcours de récupération du mot de passe, sans réutiliser une session préexistante comme preuve de connexion pour une nouvelle demande d'autorisation.

**Règle de sécurité :** une session Supabase conservée dans le navigateur ne prouve pas que l'utilisateur vient de s'authentifier pour la demande d'autorisation en cours. Chaque nouvelle demande doit nécessiter une connexion explicite par mot de passe avant d'afficher le consentement.