# Design system

## Direction

AI Overviews doit ressembler à une capacité native de la page de résultats
degoog, pas à un produit ou chatbot séparé. La hiérarchie reprend les
interactions observées dans Google AI Overviews : contexte visuel, réponse,
accès compact aux sources, puis conversation.

## Fondations

- **Couleurs** : exclusivement les variables de thème degoog (`--bg`,
  `--bg-hover`, `--text-primary`, `--text-secondary`, `--text-link`,
  `--border`, `--border-light`, `--primary`, `--danger`).
- **Typographie** : police héritée de degoog ; titre à `1rem`, corps à
  `0.925rem/1.65`, métadonnées à `0.75rem`.
- **Espacement** : rythme principal de `1rem`, contrôles compacts entre
  `0.4rem` et `0.85rem`.
- **Formes** : rayons modérés de `0.5rem` à `1rem`; les cercles sont réservés
  aux avatars, numéros et bouton de fermeture, et la pilule au déclencheur compact.
- **Mouvement** : transitions de couleur à `160ms`; squelette discret; toutes
  les animations sont neutralisées avec `prefers-reduced-motion`.

## Composants

### Panneau

Réutilise `degoog-panel`, `degoog-panel--slot` et
`degoog-panel--slot-body-padded`. Le plugin ne crée ni fond spectaculaire, ni
ombre ou bordure concurrente avec le thème.

### Réponse

Le contenu Markdown passe par le renderer nettoyé de degoog. Une vue longue est
limitée à `13rem`, avec un bouton pleine largeur pour révéler la suite. Les
citations sont remplacées après rendu par des éléments DOM et utilisent le badge
degoog.

### Images

Une galerie horizontale de quatre miniatures au maximum précède la réponse
lorsque les résultats en fournissent. Les URLs sont systématiquement converties
en URLs du proxy d’images signé de degoog : aucune requête d’image n’est faite
directement aux sites tiers. Une image défaillante est retirée sans laisser de
cadre cassé.

### Code

Les blocs Markdown clôturés reçoivent un en-tête avec le langage, un bouton de
copie et des numéros de ligne non sélectionnables. La copie du bloc conserve le
texte original, sans les numéros.

### Sources

Un bouton compact affiche jusqu’à trois avatars superposés et le nombre de
sources. Il ouvre une boîte de dialogue centrée sur desktop et un tiroir bas sur
mobile, avec domaine, titre, extrait et numéro de citation. Les miniatures
éventuelles utilisent le même proxy signé que la galerie ; un initial de domaine
sert de repli.

### Conversation

Elle n’apparaît qu’une fois la réponse prête ou développée. Les messages
utilisateur sont distingués avec `--bg-hover`; les réponses restent dans le flux
typographique normal afin de ne pas transformer le panneau en messagerie.

### Mode IA

La page complète est un espace de recherche et de lecture, pas une messagerie
plein écran. La question devient le titre de la session ; la synthèse reste dans
une colonne de `75ch` et les sources occupent un registre latéral fixe sur
desktop, puis repassent sous la réponse sur mobile. Une barre compacte permet de
relancer une recherche tandis que le composeur de suivi reste accessible au bas
du viewport.

L’état vide utilise une seule question centrale et des exemples courts. Aucun
contenu commercial ou historique fictif n’est présenté. Les couleurs, la police,
les surfaces, le focus et les miniatures proxifiées reprennent le système degoog.
La page refuse l’empilement de bulles : chaque suivi devient une nouvelle section
de lecture séparée par une ligne.

### États

- **Chargement** : trois lignes de squelette.
- **Raisonnement** : zone textuelle secondaire et bornée, masquée dès le premier
  texte final.
- **Erreur** : message compact, bouton de nouvelle tentative, ou retrait complet
  si l’option correspondante est activée.
- **Succès** : copie, développement éventuel, galerie, tiroir de sources et
  question complémentaire.

## Accessibilité

Les régions en streaming utilisent `aria-live` et `aria-busy`; les erreurs ont
`role="alert"`. Tous les contrôles sont natifs, utilisables au clavier et dotés
d’un focus visible basé sur `--primary`. Les liens externes incluent
`noopener noreferrer`. Le tiroir est un élément `dialog`, se ferme avec Échap
et restitue le focus au déclencheur.
