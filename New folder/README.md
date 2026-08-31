# SCI Vanille Bio - V1 + V2

Plateforme de tracabilite pour le groupement de producteurs de vanille biologique
(Systeme de Controle Interne). Stack : **FastAPI** (backend, Python) + **React / Vite**
(frontend) + SQLite.

Perimetre couvert a ce jour, conforme a la definition V1/V2 du cahier des charges
(section 23) - `FICHES APPLICATION WEB FINAL.docx` reste la reference en cas de
conflit avec le cahier des charges, conformement aux instructions du projet :

**V1 (socle obligatoire)** : Producteurs, Parcelles, Recoltes, Collectes, Lots
verts, Transformation (avec qualites Gourmet/Standard/TK/Fendue), Lots prepares,
**Stock actuel et Mouvements de stock desormais separes** conformement au
tableau final (module 08 Stock actuel avec quantites initiale/reservee/bloquee/
disponible et statut Disponible/Faible/Rupture/Bloque ; module 09 Mouvements de
stock avec entree/sortie/transfert/correction/blocage/deblocage et motif
obligatoire), Emplacements (module 12, support minimal), Vente/Export,
Tracabilite ascendante et descendante, 5 documents PDF obligatoires + exports
CSV.

**V2 (SCI avance)** : Inspections internes, Non-conformites, tableau de bord
avance + bilan matiere (mass balance), recherche/filtres sur les listes
principales.

**V3 (differe, sur decision du stakeholder)** : mode hors ligne, application
mobile native, QR codes, cartographie avancee, notifications SMS/WhatsApp/email,
analyses statistiques poussees. Rien n'a ete developpe sur ce perimetre.

## Demarrage rapide (environnement deja installe)

Si le venv backend et les node_modules frontend sont deja en place (installation
initiale deja faite), il suffit de deux terminaux PowerShell :

**Terminal 1 - Backend**

```powershell
cd C:\Users\emir\Desktop\nakib\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --port 8001
```

**Terminal 2 - Frontend**

```powershell
cd C:\Users\emir\Desktop\nakib\frontend
npm run dev
```

Puis ouvrir **http://localhost:5173** dans le navigateur et se connecter avec
`admin` / `admin123`. Laisser les deux terminaux ouverts pendant toute la duree
de la demo.

Si l'une de ces commandes echoue (venv introuvable, node_modules manquant), se
referer a l'installation complete ci-dessous.

## Demarrage - Backend (installation complete)

**Windows (PowerShell)** :

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1     # si erreur de "execution policy" : Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
pip install -r requirements.txt
python seed.py                  # cree sci_vanille_v2.db + jeu de donnees de demonstration
python -m uvicorn main:app --reload --port 8001
```

**macOS / Linux (bash)** :

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload --port 8001
```

Comptes de demonstration (crees par `seed.py`) :

| Identifiant     | Mot de passe   | Role                   |
|------------------|----------------|------------------------|
| admin            | admin123       | ADMIN                  |
| coordinator      | coord123       | COORDINATOR_SCI        |
| collecteur       | collecte123    | COLLECTION_MANAGER     |
| transformateur   | transfo123     | TRANSFORMATION_MANAGER |
| stockiste        | stock123       | STOCK_MANAGER          |
| auditeur         | audit123       | INTERNAL_AUDITOR       |

Changez ces mots de passe avant tout usage reel.

**IMPORTANT - schema de base de donnees encore modifie recemment :** les modules
Lots prepares, Stock, Mouvements de stock et Emplacements ont ete retravailles
en profondeur pour suivre exactement le tableau de champs final (nouvelle table
`stock`, nouvelle table `emplacements`, nouvelles colonnes sur `prepared_lots`
et `stock_movements`). Si vous avez un fichier `sci_vanille_v2.db` cree avant
cette mise a jour, il est **incompatible** avec le code actuel et provoquera des
erreurs "no such table" / "no such column". Il n'y a pas de migration
automatique : supprimez `backend/sci_vanille_v2.db` et relancez `python seed.py`
avant de relancer le backend. Aucune perte n'est a prevoir si cette base ne
contenait que des donnees de demonstration/test.

**Note technique :** la base de donnees a ete renommee `sci_vanille_v2.db` (au lieu
de `sci_vanille.db`) pour eviter une migration manuelle de l'ancien schema. L'ancien
fichier `sci_vanille.db`, s'il existe encore chez vous, n'est plus utilise et peut
etre supprime.

## Demarrage - Frontend

**Windows (PowerShell)** : si `npm install` echoue avec une erreur
`UnauthorizedAccess` / "running scripts is disabled on this system", la
politique d'execution PowerShell bloque les scripts `.ps1` (dont le lanceur
npm). A executer une seule fois pour votre compte utilisateur, puis relancer
la commande :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Puis :

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173, proxy /api -> http://localhost:8001
```

**macOS / Linux (bash)** :

```bash
cd frontend
npm install
npm run dev
```

Lancez le backend (port 8001) avant le frontend : `vite.config.js` proxy `/api`
vers `http://localhost:8001`.

## Ce qui a ete ajoute / corrige dans cette mise a jour

- **Codes automatiques** : PROD-2026-001, PAR-2026-001, REC-2026-001, COL-2026-001,
  LV-2026-001, TR-2026-001 (compteur par module et par annee, voir `backend/codes.py`).
- **Champs d'audit** : `created_by` / `created_at` / `updated_by` / `updated_at` sur
  Producteur, Parcelle, Recolte, Collecte, Lot vert, Transformation.
- **Producteur** : sexe, date de naissance, nombre d'enfants mineurs, ile/region/village,
  contrat signe + date, superficie totale et nombre de parcelles **calcules**
  automatiquement (non stockes, toujours a jour).
- **Parcelle** : statut bio propre a la parcelle (`bio_status`), risque de
  contamination, zone tampon, altitude, unite de superficie.
- **Recolte** : statut bio **herite automatiquement** de la parcelle a la creation
  (non modifiable manuellement), producteur derive automatiquement de la parcelle.
- **Collecte** : producteur et parcelle **herites automatiquement** de la recolte
  liee (le formulaire ne demande que la recolte, pas ces deux champs).
- **Lot vert** : creation par selection de plusieurs collectes validees et non
  affectees ; poids total calcule automatiquement ; **regle de gestion appliquee** :
  si les collectes selectionnees melangent des statuts bio differents (ex. Bio +
  Conventionnel), le lot est **automatiquement bloque** (statut "Bloque") et un
  avertissement est affiche a l'ecran.
- **Transformation** : selection multiple de lots verts disponibles (au lieu d'IDs
  a taper a la main) ; poids entrant, pertes et rendement global calcules
  automatiquement ; poids de sortie par qualite (Gourmet/Standard/TK/Fendue)
  desormais stockes directement sur la transformation ; statut de transformation
  (Brouillon/En cours/Cloturee/Annulee/Bloquee) ajoute ; protection contre la
  reutilisation d'un lot vert deja transforme.
- **Tableau de bord** : branche sur les vraies donnees (`/dashboard/stats`) au lieu
  de chiffres factices.
- Nouvelles pages frontend : Parcelles, Recoltes, Lots verts (absentes auparavant -
  seuls Producteurs, Collectes et Transformations avaient une page).

### Modules 07-09 alignes sur le tableau de champs final (Lots prepares, Stock actuel, Mouvements)

- **Lots prepares (module 07)** : code au format `LP-{QUALITE}-2026-00X` (ex.
  `LP-GOUR-2026-001`), statut en francais conforme au tableau final (En stock /
  Reserve / Vendu / Exporte / Bloque / Annule), statut bio **herite des lots
  verts consommes** par la transformation d'origine, emplacement (relation vers
  le module Emplacements) + detail libre (caisse, etagere...).
- **Stock actuel (module 08)** : desormais une **table dediee**, distincte du
  lot prepare et des mouvements, avec quantite initiale / reservee / bloquee et
  **quantite disponible calculee automatiquement** ; statut du stock
  (Disponible / Faible / Rupture / Bloque) recalcule a chaque mouvement. Une
  position de stock est creee automatiquement pour chaque lot prepare a la
  cloture d'une transformation.
- **Mouvements de stock (module 09)** : types Entree / Sortie / Transfert /
  Correction / **Blocage / Deblocage** (les deux derniers manquaient
  auparavant) ; **motif obligatoire pour tout mouvement**, plus seulement pour
  les corrections ; emplacement source/destination relies au module
  Emplacements plutot que du texte libre.
- **Emplacements (module 12, support minimal)** : creation d'un magasin/zone/
  etagere directement depuis la page Stock, utilise par les lots prepares et
  les mouvements.
- **Vente/Export** : applique desormais la regle du cahier des charges "une
  vente confirmee doit reserver ou sortir la quantite correspondante du
  stock" - une vente au statut *Prepare* **reserve** la quantite (n'affecte
  pas le stock physique), une vente *Expediee* ou *Cloturee* **sort**
  reellement le stock et solde la reservation associee.

### Ajouts V1 (fermeture des ecarts restants)

- **Stock (module 9)** : mouvements reels (entree/sortie/transfert/correction)
  avec emplacement, justification et utilisateur responsable, historises dans
  `stock_movements` ; inventaire par qualite et par emplacement (`/stock/inventory`).
- **Vente/Export (module 10)** : numero de facture genere automatiquement,
  chaque vente cree un mouvement de sortie de stock trace, statut
  Prepare/Expedie/Cloture.
- **Documents PDF obligatoires (module 17)** : les 5 documents demandes par le
  cahier des charges sont maintenant generes : bordereau de collecte, fiche lot
  vert, rapport de transformation, fiche lot prepare, rapport de tracabilite
  (en plus du rapport de recolte deja existant).
- **Exports CSV** : `/exports/producers.csv`, `transformations.csv`, `sales.csv`,
  `stock.csv`.

### Ajouts V2

- **Inspections internes (module 12)** : checklist, resultat (Conforme / Conforme
  avec reserve / Non conforme), signatures auditeur/producteur, rapport PDF ;
  une inspection "Non conforme" **suspend automatiquement** la parcelle concernee.
- **Non-conformites (module 13)** : type mineure/majeure, action corrective,
  responsable, echeance, sanction, liees optionnellement a une inspection.
- **Tableau de bord avance + bilan matiere** (`/dashboard/mass-balance`,
  `/dashboard/top-producers`, page "Bilan matiere") : reconciliation du poids a
  chaque etape (recolte -> collecte -> lot vert -> transformation -> stock ->
  vente), ecart theorique signale si different de 0, rendement par qualite,
  classement des producteurs par volume.
- **Recherche/filtres** : ajoutes sur Producteurs, Ventes et Non-conformites.
  Les autres listes (Parcelles, Recoltes, Collectes, Lots verts, Transformations,
  Stock) n'ont pas encore de filtre de recherche - a etendre si besoin.

## Limites connues

- Un lot vert consomme les lots verts selectionnes **en totalite** lors d'une
  transformation (la base de donnees garde `remaining_weight` pour une
  consommation partielle future, mais l'interface ne le propose pas encore).
- Region/village restent des champs texte libres (pas de liste hierarchique
  ile -> region -> village).
- Photo du producteur (`photo_path`) : le champ existe cote backend mais
  l'upload de fichier n'est pas encore branche dans le formulaire frontend.
- Notifications email non implementees (necessiteraient un serveur SMTP reel) ;
  aucune notification n'est envoyee ni simulee actuellement.
- Recherche/filtres pas encore generalises a toutes les listes (voir ci-dessus).
- V3 (mode hors ligne, mobile natif, QR codes, cartographie avancee,
  notifications SMS/WhatsApp) : non commence, differe sur decision explicite
  du stakeholder.
- `backend/check_db.py` et `backend/check_inspections.py` sont d'anciens scripts
  de debogage ponctuels ; ils referencent l'ancien nom de fichier `sci_vanille.db`
  et ne sont pas necessaires au fonctionnement de l'application.

## Verification effectuee

Tous les endpoints V1 et V2 ont ete testes directement (creation, lecture,
heritages, calculs, regle de blocage Bio/Conventionnel, protection
anti-reutilisation d'un lot transforme, mouvements de stock avec controle de
stock insuffisant, suspension automatique de parcelle sur inspection non
conforme, bilan matiere, exports CSV, generation des 6 documents PDF) via des
appels HTTP directs contre le backend, et le frontend a ete compile avec succes
(`npm run build`, 1421 modules). Un test manuel de bout en bout dans le
navigateur (apres `npm run dev`) reste recommande avant toute mise en
production.
