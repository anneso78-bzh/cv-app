# Portfolio Angular — CV, CCM et protection des données

Application Angular autonome : CV synthétique sur une page, filtres CCM/DPO et source JSON.

## Démarrer l'application

Prérequis : Node.js 22.22+, 24.15+ ou 26.1+ et npm.

```bash
npm install
npm start
```

Cette commande lance le backend PDF sur le port 3000 et Angular sur le port 4300. Ouvrir `http://localhost:4300`.

En production, compiler puis démarrer le serveur :

```bash
npm run build
npm run start:server
```

Le serveur Node sert l'application et expose `GET /api/cv.pdf`, qui génère et télécharge un PDF A4 à fond blanc à partir de `src/assets/data/cv-data.json` (ou de sa copie de production).

## Compiler pour la production

```bash
npm run build
```

Les fichiers publiables sont générés dans `dist/cv-ccm-portfolio/browser`.

## Structure

- `src/app/core/models/` : modèles TypeScript du CV.
- `src/app/core/services/` : chargement HTTP des données CV.
- `src/app/features/cv-viewer/` : expertises et expériences, avec filtres CCM/DPO.
- `src/assets/data/cv-data.json` : données publiques du CV, sans coordonnées directes.

## Fonctionnalités

- CV compact en deux colonnes, avec filtres de présentation CCM, DPO et globale.
- Onglet dédié à la consultation et à la copie de la source JSON du CV.
- Téléchargement d'un CV PDF A4, généré côté serveur à partir du JSON canonique et prêt à imprimer sur fond blanc.
- Mise en page responsive.

## Sécurité et limites

Les données de `src/assets` sont publiques et accessibles à toute personne qui visite le site. Les coordonnées de téléphone et d'e-mail ne sont donc pas enregistrées dans le JSON du CV. Le lien e-mail est reconstruit dans le code client pour limiter la collecte automatisée ; ce procédé est de l'obfuscation, pas un contrôle d'accès. Le navigateur finit nécessairement par connaître l'adresse destinataire.

Ne placez aucun secret, mot de passe ou clé privée dans une application front-end. Un chiffrement dont la clé est fournie au même visiteur dans l'URL ne protège pas les données contre ce visiteur et l'URL peut fuiter dans l'historique ou les journaux. Pour restreindre réellement l'accès, utiliser un service côté serveur avec authentification et autorisation.

Les textes du CV sont rendus par interpolation Angular, sans insertion HTML. La configuration CSP doit être définie par le serveur ou l'hébergeur et adaptée aux ressources réellement utilisées ; une politique CSP ne peut pas être appliquée de façon fiable depuis cette application seule.

Le backend lit le JSON du dépôt au lieu d'accepter un document arbitraire depuis le navigateur. Les erreurs de génération sont journalisées côté serveur et renvoyées avec un statut HTTP 500.

## Personnalisation

Mettre à jour le contenu public dans `src/assets/data/cv-data.json`.
