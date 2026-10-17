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
