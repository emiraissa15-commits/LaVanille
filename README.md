# SCI Vanille Bio

Application de suivi et de traçabilité pour la filière vanille : producteurs, parcelles, récoltes, collectes, lots, transformations, lots préparés, ventes/exports, inspections, non-conformités et utilisateurs.

Ce guide s'adresse à une personne qui n'a jamais utilisé d'outil de développement. Il explique, étape par étape, comment installer et lancer l'application sur un ordinateur, depuis zéro.

Aucune connaissance en programmation n'est nécessaire : il suffit de copier-coller les commandes indiquées, dans l'ordre.

---

## 1. Comprendre le projet en deux minutes

L'application est composée de deux parties, qui doivent tourner **en même temps** sur l'ordinateur :

- **`backend`** : le moteur de l'application (écrit en Python). Il gère les données, les calculs et la base de données.
- **`frontend`** : l'interface visuelle (celle qu'on utilise dans le navigateur, comme un site web).

Les données sont stockées **localement**, dans un simple fichier sur l'ordinateur (pas besoin d'un serveur externe ni d'une connexion internet une fois l'installation terminée).

---

## 2. Ce qu'il faut installer avant de commencer

Ces installations ne sont à faire **qu'une seule fois**. Une fois faites, on ne les refait plus.

### 2.1 Python (le moteur du backend)

1. Aller sur [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Télécharger la dernière version (3.10 ou plus récente).
3. Lancer l'installateur. **Étape très importante** : sur le premier écran de l'installation, cocher la case **"Add Python to PATH"** (ou "Ajouter Python au PATH") tout en bas, avant de cliquer sur "Install Now".
4. Une fois l'installation terminée, vérifier que ça a fonctionné :
   - Ouvrir l'invite de commandes Windows (touche `Windows`, taper `cmd`, appuyer sur Entrée).
   - Taper `python --version` et appuyer sur Entrée.
   - Si un numéro de version s'affiche (ex. `Python 3.12.1`), c'est bon.

### 2.2 Node.js (le moteur du frontend)

1. Aller sur [https://nodejs.org/](https://nodejs.org/)
2. Télécharger la version recommandée pour la plupart des utilisateurs ("LTS").
3. Lancer l'installateur et suivre les étapes par défaut (cliquer sur "Suivant" à chaque fois).
4. Vérifier l'installation :
   - Ouvrir une **nouvelle** invite de commandes (fermer l'ancienne si elle était déjà ouverte).
   - Taper `node --version` puis Entrée : un numéro de version doit s'afficher.
   - Taper `npm --version` puis Entrée : un numéro de version doit s'afficher aussi.

### 2.3 Git (pour récupérer le code — optionnel)

Git permet de télécharger le projet en une commande. Ce n'est pas obligatoire : on peut aussi télécharger le code sous forme de fichier ZIP (voir étape 3, option B).

Si vous préférez utiliser Git : aller sur [https://git-scm.com/downloads](https://git-scm.com/downloads), télécharger et installer avec les options par défaut.

---

## 3. Étape 1 — Récupérer le code du projet

### Option A — Avec Git (recommandé)

1. Choisir un emplacement sur l'ordinateur où poser le projet (par exemple le Bureau).
2. Ouvrir l'invite de commandes dans ce dossier :
   - Ouvrir l'explorateur de fichiers, aller dans le dossier choisi.
   - Cliquer dans la barre d'adresse en haut, taper `cmd`, appuyer sur Entrée. Une invite de commandes s'ouvre directement dans ce dossier.
3. Taper la commande suivante puis Entrée :

   ```
   git clone https://github.com/emiraissa15-commits/LaVanille.git
   ```

4. Un nouveau dossier `LaVanille` apparaît, contenant tout le projet.

### Option B — Sans Git (télécharger le ZIP)

1. Aller sur la page du projet : `https://github.com/emiraissa15-commits/LaVanille`
2. Cliquer sur le bouton vert **"Code"**, puis sur **"Download ZIP"**.
3. Une fois le fichier téléchargé, faire un clic droit dessus → **"Extraire tout..."** (ou "Extract All").
4. Le dossier extrait contient tout le projet (avec un sous-dossier `backend` et un sous-dossier `frontend`).

Dans la suite de ce guide, on utilise `LaVanille` comme nom du dossier du projet — adapter si le dossier a été extrait sous un autre nom.

---

## 4. Étape 2 — Installer et démarrer le backend (le moteur)

Toutes les commandes ci-dessous s'exécutent dans une invite de commandes (`cmd`).

1. Ouvrir une invite de commandes et se placer dans le dossier `backend` du projet. Exemple (à adapter selon l'emplacement réel) :

   ```
   cd Desktop\LaVanille\backend
   ```

2. Créer un environnement Python isolé pour le projet (cela évite d'interférer avec d'autres logiciels sur l'ordinateur) :

   ```
   python -m venv venv
   ```

   Cette commande crée un dossier `venv`. Elle ne s'exécute qu'une seule fois, à la première installation.

3. Activer cet environnement :

   ```
   venv\Scripts\activate
   ```

   Si cette commande ne fonctionne pas et que vous utilisez PowerShell plutôt que l'invite de commandes classique, essayer à la place :

   ```
   venv\Scripts\Activate.ps1
   ```

   Une fois activé, le début de la ligne dans le terminal affiche `(venv)` — c'est normal et signifie que tout fonctionne.

   ⚠️ **Cette étape (`venv\Scripts\activate`) doit être refaite à chaque fois qu'on ouvre un nouveau terminal pour travailler sur le backend** (voir aussi la section "Utilisation au quotidien" plus bas).

4. Installer les composants nécessaires au projet (cela peut prendre 1 à 2 minutes) :

   ```
   pip install -r requirements.txt
   ```

5. **Uniquement la toute première fois**, créer des données de démonstration (producteurs, récoltes, comptes utilisateurs...) pour pouvoir tester l'application tout de suite :

   ```
   python seed.py
   ```

   Cette commande affiche une liste de comptes créés (voir la section 6 pour les identifiants).

   ⚠️ Ne pas relancer cette commande plus tard une fois que de vraies données auront été saisies dans l'application : elle est prévue pour préparer un jeu de données de démonstration au tout début.

6. Démarrer le serveur backend :

   ```
   uvicorn main:app --reload --port 8001
   ```

   Si Windows affiche une fenêtre de pare-feu demandant d'autoriser l'accès réseau, cliquer sur **"Autoriser l'accès"**.

   Le terminal affiche alors plusieurs lignes se terminant par quelque chose comme `Application startup complete`. **Ne pas fermer cette fenêtre** : elle doit rester ouverte tant que l'application est utilisée. C'est le moteur qui tourne en arrière-plan.

   Pour vérifier que ça fonctionne : ouvrir un navigateur internet et aller sur `http://localhost:8001/docs`. Une page de documentation technique doit s'afficher (pas besoin de la comprendre, c'est juste pour vérifier que le backend répond).

---

## 5. Étape 3 — Installer et démarrer le frontend (l'interface)

Cette étape se fait dans un **second** terminal, **sans fermer le premier** (celui du backend doit continuer à tourner).

1. Ouvrir une **nouvelle** invite de commandes, et se placer cette fois dans le dossier `frontend` :

   ```
   cd Desktop\LaVanille\frontend
   ```

2. Installer les composants nécessaires (uniquement la première fois ; cela peut prendre quelques minutes) :

   ```
   npm install
   ```

3. Démarrer l'application :

   ```
   npm run dev
   ```

4. Le terminal affiche une adresse ressemblant à :

   ```
   ➜  Local:   http://localhost:5173/
   ```

   Ouvrir cette adresse (`http://localhost:5173`) dans un navigateur (Chrome, Edge, Firefox...). L'application SCI Vanille Bio s'affiche, avec un écran de connexion.

---

## 6. Étape 4 — Se connecter à l'application

Si vous avez exécuté `python seed.py` (étape 4.5), les comptes de démonstration suivants sont disponibles :

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin123` | Administrateur (accès complet, gestion des utilisateurs) |
| `coordinator` | `coord123` | Coordinateur SCI |
| `collecteur` | `collecte123` | Responsable collecte |
| `transformateur` | `transfo123` | Responsable transformation |
| `stockiste` | `stock123` | Responsable stock |
| `auditeur` | `audit123` | Auditeur interne |

⚠️ **Important** : ces mots de passe sont fournis uniquement pour démarrer et tester l'application. Avant toute utilisation réelle, il est fortement recommandé de :
1. Se connecter avec `admin` / `admin123`.
2. Aller dans l'onglet **"Utilisateurs"**.
3. Changer le mot de passe du compte administrateur et créer les comptes réels des personnes qui utiliseront l'application (en leur attribuant le bon rôle), puis désactiver ou supprimer les comptes de démonstration qui ne servent plus.

---

## 7. Utilisation au quotidien (une fois l'installation faite)

Une fois les étapes 4 et 5 réalisées une première fois, il n'est **plus nécessaire de tout réinstaller** à chaque utilisation. Voici la version courte à refaire à chaque démarrage :

**Terminal 1 (backend)** :
```
cd Desktop\LaVanille\backend
venv\Scripts\activate
uvicorn main:app --reload --port 8001
```

**Terminal 2 (frontend)**, dans une deuxième fenêtre :
```
cd Desktop\LaVanille\frontend
npm run dev
```

Puis ouvrir `http://localhost:5173` dans le navigateur.

### Arrêter l'application

Dans chacun des deux terminaux, cliquer dedans puis appuyer sur `Ctrl + C`. Fermer les fenêtres ensuite si besoin.

---

## 8. Questions fréquentes / problèmes courants

**"`python` n'est pas reconnu en tant que commande interne ou externe"**
→ Python n'est pas installé correctement, ou la case "Add Python to PATH" n'a pas été cochée à l'installation (voir 2.1). Réinstaller Python en cochant bien cette case.

**"`npm` n'est pas reconnu en tant que commande interne ou externe"**
→ Node.js n'est pas installé, ou le terminal a été ouvert avant l'installation. Fermer toutes les fenêtres de terminal et en rouvrir une nouvelle après avoir installé Node.js (voir 2.2).

**Le terminal affiche une erreur du type "port already in use" (port déjà utilisé)**
→ Une autre fenêtre fait déjà tourner l'application. Vérifier qu'il n'y a pas déjà un terminal backend ou frontend ouvert ailleurs, ou redémarrer l'ordinateur puis recommencer l'étape 4/5.

**La page dans le navigateur reste blanche, ou affiche une erreur de type "Network Error" / "Failed to fetch"**
→ Cela signifie généralement que le terminal du backend (celui avec `uvicorn`) n'est plus ouvert, ou affiche une erreur. Vérifier ce terminal, le relancer si besoin avec la commande de l'étape 4.6.

**Je veux repartir avec des données vides et un jeu de démonstration neuf**
1. Fermer le terminal du backend (`Ctrl + C`).
2. Dans le dossier `backend`, supprimer le fichier `sci_vanille_v2.db`.
3. Relancer `python seed.py`, puis redémarrer le backend normalement.

⚠️ Cette opération supprime définitivement toutes les données déjà saisies dans l'application. À ne faire que si c'est vraiment voulu.

**Je ne me souviens plus si je dois refaire `pip install` ou `npm install`**
→ Ces deux commandes ne sont nécessaires qu'une seule fois (sauf si le code du projet a été mis à jour depuis GitHub — dans ce cas, il est prudent de les relancer une fois, chacune dans son dossier, avant de redémarrer l'application).


