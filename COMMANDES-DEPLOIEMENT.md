# Aide-mémoire — commandes du projet et déploiement

Ces commandes concernent le projet `cv-app`. Les lancer depuis le terminal indiqué ; ne jamais mettre un mot de passe, un token ou une clé privée dans une commande ou dans ce fichier.

## En local

Depuis la racine du dépôt :

```bash
npm ci
npm run build
```

`npm ci` installe les dépendances du projet. `npm run build` compile Angular et le serveur Node dans `dist/`. Les avertissements de dépréciation npm ne sont pas forcément des erreurs ; vérifier que la commande se termine sans code d'erreur.

Pour lancer l'application en développement :

```bash
npm start
```

Ouvrir ensuite `http://localhost:4300`.

## Transférer le build vers Alwaysdata

Le transfert se fait depuis **ton ordinateur**, à la racine du projet, après un build réussi :

```bash
scp -r dist ashamon@ssh-ashamon.alwaysdata.net:~/cv-app/
```

L'hôte SSH Alwaysdata suit le format `ssh-[nom-du-compte].alwaysdata.net` ; le domaine du site (`ashamon.alwaysdata.net`) n'est pas nécessairement l'hôte SSH. Vérifier la valeur exacte dans le panneau Alwaysdata, section **Remote access / SSH-SFTP**. Si le nom du compte, l'hôte ou le port y sont différents, utiliser ceux du panneau. Pour un port SSH personnalisé, `scp` utilise l'option `-P` majuscule :

```bash
scp -P PORT -r dist UTILISATEUR@HOTE_SSH:~/cv-app/
```

Si le réseau local pose un problème IPv6, on peut forcer IPv4 :

```bash
scp -4 -r dist ashamon@ssh-ashamon.alwaysdata.net:~/cv-app/
```

Pour tester la connexion sans transférer de fichiers :

```bash
ssh -4 ashamon@ssh-ashamon.alwaysdata.net
```

Remplacer l'hôte et le port par les valeurs du panneau s'ils diffèrent. `Connection refused` indique que la connexion a atteint l'hôte, mais que le port demandé ne l'accepte pas ; vérifier d'abord l'hôte SSH et le port, pas la clé privée. `Network is unreachable` indique plutôt un problème de connectivité/routage réseau.

Après transfert, redémarrer le site Node.js depuis le panneau Alwaysdata. La commande du programme configurée pour ce site est :

```bash
node ~/cv-app/dist/server/server.js
```

Le serveur utilise les variables `IP` et `PORT` fournies par Alwaysdata. Ne pas remplacer le port par une valeur codée en dur.

`dist/` est généré localement et ignoré par Git : un `git pull` ne le met pas à jour. Il faut donc reconstruire et retransférer `dist/` à chaque publication qui modifie l'application.

## Mettre à jour les sources Git sur Alwaysdata (facultatif)

Cette étape met à jour les fichiers source du dépôt distant, mais **ne remplace pas** le build publié :

```bash
cd ~/cv-app
git pull origin main
```

Le build et le transfert de `dist/` restent nécessaires. Le serveur a aussi besoin de ses dépendances de production, notamment Express et PDFKit. La commande suivante a été tentée sur Alwaysdata, mais le processus a été tué :

```bash
npm ci --omit=dev --no-audit --no-fund
```

Ne pas relancer cette même commande en boucle : elle n'a pas abouti et les dépendances ne sont donc pas garanties comme installées. Consulter les journaux et les limites de ressources de l'offre Alwaysdata, ou demander au support comment installer les dépendances Node.js dans cet environnement avant de redémarrer le site.

## Envoyer les changements sur GitHub

Depuis ton ordinateur, à la racine du dépôt :

```bash
git status
git add CHEMIN_DU_FICHIER
git commit -m "Décrire le changement"
git push origin main
```

Avant `git add`, vérifier avec `git status` que seuls les fichiers voulus sont concernés. Après le push, reconstruire et transférer `dist/` si tu veux aussi publier ces changements sur Alwaysdata.

## Actualiser l'affichage dans le navigateur

Après redémarrage du site, recharger la page sans cache avec `Ctrl+Shift+R`.
