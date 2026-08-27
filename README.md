# COOPRO — FIELD REPORT

Application web mobile-first pour créer un signalement photo, générer un PDF local et simuler sa transmission avec un code d’accès.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- browser-image-compression
- pdf-lib
- Vitest

## Principes de sécurité de cette version

- Aucun compte utilisateur.
- Aucun backend réel.
- Aucun service tiers d’e-mail.
- Aucun analytics, pixel, publicité, IA, carte, GPS ou tracking.
- Aucun import depuis galerie ou fichiers.
- Photos prises exclusivement depuis `navigator.mediaDevices.getUserMedia`.
- Compression locale JPEG, dimension maximum 1600 px.
- PDF généré localement et transmission bloquée au-dessus de 3,5 Mo.
- Aucun stockage automatique dans `localStorage`, IndexedDB ou cookies.
- Seuls les codes d’accès peuvent être mémorisés dans `localStorage`, uniquement après activation explicite de “Mémoriser mes codes sur cet appareil”.

## Installation

```bash
npm install
```

## Lancement local

```bash
npm run dev
```

La caméra nécessite un contexte sécurisé. En local, `localhost` est accepté par les navigateurs modernes.

## Tests

```bash
npm test
```

Les tests couvrent :

- maximum 5 photos ;
- validation e-mail ;
- validation formulaire ;
- calcul du poids PDF ;
- suppression de session ;
- simulation des codes : valide, déjà consommé, invalide, erreur de transmission.

## Build

```bash
npm run build
```

## Prévisualisation du build

```bash
npm run preview
```

## GitHub Pages

Le workflow `.github/workflows/pages.yml` déploie `dist` sur GitHub Pages à chaque push sur `main`.

Étapes GitHub restantes si le dépôt distant n’existe pas encore :

```bash
gh repo create COOPRO --private --source=. --remote=origin --push
```

Puis activer GitHub Pages sur “GitHub Actions” dans les paramètres du dépôt si ce n’est pas déjà actif.

## Mock API

La couche `src/lib/reportApi.ts` prépare l’endpoint futur `POST /send-report`.

Payload prévu :

- `reportPdf`
- `accessCode`
- `to`
- `cc`
- `bcc`

Codes de test :

- `OK-1` : code valide ;
- `USED-1` : code déjà consommé ;
- `INVALID-1` : code invalide ;
- `ERROR-1` : erreur de transmission.

Après succès API, l’interface affiche exactement :

> Demande de transmission confiée au prestataire e-mail.

Le service ne garantit pas réception, lecture ou traitement du rapport.
