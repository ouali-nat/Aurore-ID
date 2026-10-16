# Aurore ID

Le portail d’entrée de l’écosystème Aurore.

## Première version

- Page d’accueil responsive en HTML, CSS et JavaScript natifs, sans dépendances ni build.
- Accès directs vers Aurore — Section Archives, Aurore Instituts, Aurore Mémoire et Aurore Animation.
- Interface adaptée aux mobiles, navigation clavier, prise en compte de la préférence de réduction des animations.
- En-têtes HTTP de sécurité configurés pour Vercel.
- La connexion centralisée est volontairement inactive dans cette version. Le bouton explique son état au lieu d’afficher une fausse connexion.
- Aucun compte, session ou profil utilisateur n’est créé ou modifié par cette page.

## Déploiement

Le site est prévu pour être servi comme un site statique à la racine du dépôt. Aucun secret ni variable d’environnement n’est requis.

## Prochaine phase

Avant d’intégrer la connexion Google et le SSO, concevoir et tester le flux d’identité central, les redirections autorisées, la validation des jetons et le lien des identités avec les comptes existants. Ne pas supprimer ou migrer les comptes actuels sans procédure de rapprochement testée.
