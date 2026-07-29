# Design system

## Direction

AI Overviews doit ressembler à une capacité native de la page de résultats
degoog, pas à un produit ou chatbot séparé. La hiérarchie est volontairement
calme : réponse d’abord, provenance ensuite, conversation en dernier.

## Fondations

- **Couleurs** : exclusivement les variables de thème degoog (`--bg`,
  `--bg-hover`, `--text-primary`, `--text-secondary`, `--text-link`,
  `--border`, `--border-light`, `--primary`, `--danger`).
- **Typographie** : police héritée de degoog ; titre à `1rem`, corps à
  `0.925rem/1.65`, métadonnées à `0.75rem`.
- **Espacement** : rythme principal de `1rem`, contrôles compacts entre
  `0.4rem` et `0.85rem`.
- **Formes** : rayons modérés de `0.5rem` à `0.75rem`, avec cercle uniquement
  pour les numéros de source.
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

### Sources

Bande horizontale compacte, lisible au clavier et sur mobile. Aucun favicon ou
asset tiers n’est chargé : numéro, titre et domaine suffisent à identifier la
source.

### Conversation

Elle n’apparaît qu’une fois la réponse prête ou développée. Les messages
utilisateur sont distingués avec `--bg-hover`; les réponses restent dans le flux
typographique normal afin de ne pas transformer le panneau en messagerie.

### États

- **Chargement** : trois lignes de squelette.
- **Raisonnement** : zone textuelle secondaire et bornée, masquée dès le premier
  texte final.
- **Erreur** : message compact, bouton de nouvelle tentative, ou retrait complet
  si l’option correspondante est activée.
- **Succès** : copie, développement éventuel, sources et question complémentaire.

## Accessibilité

Les régions en streaming utilisent `aria-live` et `aria-busy`; les erreurs ont
`role="alert"`. Tous les contrôles sont natifs, utilisables au clavier et dotés
d’un focus visible basé sur `--primary`. Les liens externes incluent
`noopener noreferrer`.

