# Aurore ID

Le portail d’entrée de l’écosystème Aurore.

## Portail et compte central

- Page d’accueil responsive en HTML, CSS et JavaScript natifs, sans build.
- Accès aux services Aurore : Archives, Instituts, Mémoire, Animation, Plume et Talents.
- Authentification du compte central par Supabase Auth avec adresse e-mail et mot de passe. Le mot de passe est validé par le service d’authentification, jamais par une simple comparaison locale.
- À l’inscription, l’utilisateur doit confirmer son adresse e-mail avant de choisir les services associés à son compte. Le retour de confirmation est vérifié en demandant le profil authentifié au serveur.
- Les choix des services sont conservés dans les métadonnées du compte central. Après reconnexion, les préférences sauvegardées sont restaurées : les services choisis restent en couleur et les autres sont affichés en gris.
- Une session restaurable est gardée dans la session du navigateur et son jeton peut être renouvelé par Supabase Auth. Elle ne constitue pas, à elle seule, un SSO partagé entre les domaines des différents services.
- La sélection d’un service représente une préférence de l’utilisateur ; elle ne crée aucun rôle local et ne donne pas, à elle seule, accès aux données protégées d’un service.
- Les données, rôles et comptes existants des services ne sont pas automatiquement fusionnés.

## Déploiement et sécurité

Le site est prévu pour être servi comme un site statique à la racine du dépôt. L’URL Supabase et la clé publishable sont utilisées par le navigateur pour appeler l’API Auth ; aucun secret serveur ou clé `service_role` ne doit être présent dans le code public.

Le fournisseur Supabase Auth doit garder la confirmation des adresses e-mail activée et autoriser `https://aurore-id.vercel.app/` dans Redirect URLs. Le code reprend l’origine courante pour le retour ; chaque URL de prévisualisation utilisée pour un essai doit donc être autorisée séparément dans Supabase. La politique CSP et les en-têtes de sécurité restent définis dans `vercel.json`.

## Limite actuelle

Le portail gère le compte central et les préférences de services, mais la connexion unique (SSO) doit encore être configurée et validée séparément pour chaque application. Il ne faut pas remplacer les jetons locaux des services par le jeton Aurore ID directement. L’association des comptes préexistants doit exiger une preuve de contrôle du compte local ou une procédure dédiée ; une adresse e-mail identique ne suffit pas à fusionner deux identités.
