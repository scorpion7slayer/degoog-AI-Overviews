# AI Overviews pour degoog

Un plugin slot pour [degoog](https://github.com/degoog-org/degoog) qui génère une
réponse synthétique et sourcée au-dessus des résultats de recherche. Il reprend
les interactions utiles des Google AI Overviews — réponse directe, citations,
sources visibles et question complémentaire — sans appeler ni extraire les AI
Overviews de Google.

Le plugin se base sur l’architecture du plugin officiel
[AI Summary](https://github.com/degoog-org/official-extensions/tree/main/plugins/ai-summary),
avec davantage de fournisseurs, un adaptateur OpenAI Responses et une interface
plus proche d’une vue d’ensemble de recherche.

## Fonctionnalités

- Réponse en streaming dans le slot natif `at-a-glance`.
- Véritable page **Mode IA**, ouverte depuis l’Overview, avec recherche degoog,
  réponse en page complète, sources latérales et questions complémentaires.
- Citations `[N]` reliées aux résultats degoog réellement envoyés au modèle.
- Bouton compact avec avatars superposés et tiroir détaillé des sources.
- Galerie des miniatures issues des résultats via le proxy d’images signé degoog.
- Blocs de code avec langage, numéros de ligne et copie sans les numéros.
- Copie globale, réponse extensible et questions complémentaires.
- Ollama local sans clé, fournisseurs cloud et passerelles compatibles.
- Détection automatique du protocole par famille de modèle pour OpenCode Zen et Go.
- Appels LLM exclusivement côté serveur (`isClientExposed: false`).
- Clés enregistrées comme secrets degoog et jamais exposées au navigateur.
- Protection contre les instructions injectées dans les titres ou extraits de résultats.
- Cache configurable, limites de requête, délai d’expiration et mode question uniquement.
- Interface anglaise et française, responsive et compatible avec le mode mouvement réduit.

## Installation

### Depuis le Store degoog

1. Ouvrir **Settings → Store**.
2. Ajouter le dépôt `https://github.com/scorpion7slayer/degoog-AI-Overviews`.
3. Installer **AI Overviews**.
4. Redémarrer degoog si l’instance ne recharge pas automatiquement les extensions.
5. Ouvrir la configuration du plugin, choisir un fournisseur, un modèle et, si nécessaire, une clé API.

Le `package.json` à la racine respecte le format des
[dépôts Store degoog](https://degoog-org.github.io/docs/store.html).

### Installation manuelle

Copier le dossier `plugins/ai-overviews` dans :

```text
data/plugins/ai-overviews
```

ou dans le répertoire défini par `DEGOOG_PLUGINS_DIR`, puis redémarrer degoog.

## Fournisseurs

| Preset | Protocole utilisé | URL par défaut | Clé |
|---|---|---|---|
| Ollama local | Ollama `/api/chat` | `http://localhost:11434` | Non |
| Ollama Cloud | Ollama `/api/chat` | `https://ollama.com` | Oui |
| OpenCode Zen | Auto selon le modèle | `https://opencode.ai/zen/v1` | Oui |
| OpenCode Go | Auto selon le modèle | `https://opencode.ai/zen/go/v1` | Oui |
| OpenAI | Responses API | `https://api.openai.com/v1` | Oui |
| OpenAI compatible | Chat Completions | À renseigner | Selon la passerelle |
| Google Gemini | GenerateContent natif | `https://generativelanguage.googleapis.com/v1beta` | Oui |
| Kilo Code Gateway | Chat Completions | `https://api.kilo.ai/api/gateway` | Oui |
| Moonshot / Kimi | Chat Completions | `https://api.moonshot.ai/v1` | Oui |
| Anthropic | Messages API | `https://api.anthropic.com/v1` | Oui |
| OpenRouter | Chat Completions | `https://openrouter.ai/api/v1` | Oui |
| Qwen / Alibaba | Chat Completions | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Oui |
| Z.AI / GLM | Chat Completions | `https://api.z.ai/api/paas/v4` | Oui |
| Perplexity Sonar | Chat Completions | `https://api.perplexity.ai` | Oui |
| Cloudflare Workers AI | Chat Completions | Construit depuis l’Account ID | Oui |
| xAI | Chat Completions | `https://api.x.ai/v1` | Oui |
| Cursor via gateway | Chat Completions | À renseigner | Oui |

Les identifiants de modèle changent plus vite que le plugin. Utiliser l’identifiant
exact affiché par le fournisseur. Pour OpenCode, saisir l’identifiant de l’API
directe (`gpt-5.6-terra`, `qwen3.7-plus`, `kimi-k3`, etc.), sans le préfixe de la
configuration TUI `opencode/` ou `opencode-go/`.

### Cas particuliers

**Ollama et Docker.** `localhost` désigne le conteneur degoog. Sur Docker Desktop,
utiliser généralement `http://host.docker.internal:11434` comme surcharge d’URL.
Sur Linux, rendre l’hôte Ollama accessible au conteneur ou placer les services
sur le même réseau.

**OpenCode Zen.** Le plugin choisit automatiquement Responses pour les modèles
GPT, Messages pour Claude et Qwen, GenerateContent pour Gemini, et Chat
Completions pour les autres familles. Le réglage avancé de protocole permet de
corriger un futur changement côté fournisseur.

**OpenCode Go.** Qwen et MiniMax utilisent Messages ; les autres familles
actuellement documentées utilisent Chat Completions.

**Cloudflare Workers AI.** Renseigner l’Account ID et la clé API. L’AI Gateway ID
est facultatif ; il est transmis dans l’en-tête `cf-aig-gateway-id`. Une URL de
base complète peut aussi remplacer le preset.

**Cursor.** Cursor ne publie pas d’API générale de chat/inférence compatible
OpenAI. Le preset ne prétend donc pas utiliser directement un abonnement Cursor :
il exige l’URL de votre propre passerelle compatible et sa clé.

## Configuration

Les réglages principaux sont :

- **LLM provider**, **Model ID**, **API key** ;
- **Answer depth** : concise, équilibrée ou détaillée ;
- nombre de sources degoog, de 3 à 12 ;
- affichage des sources et déclenchement réservé aux requêtes terminées par `?`.

Les réglages avancés permettent de surcharger l’URL et le protocole, activer le
raisonnement, modifier le délai, les tokens, le cache et le prompt système.
L’activation du raisonnement peut augmenter le coût et la latence ; son contenu
n’est jamais fusionné dans la réponse finale.

## Architecture

```text
plugins/ai-overviews/
├── index.js               # contrat slot, réglages et routes serveur
├── script.js              # streaming, citations et suivi côté navigateur
├── style.css              # rendu natif degoog
├── mode.html              # page complète Mode IA
├── mode.css               # espace de recherche desktop/mobile
├── mode.js                # recherche degoog, streaming et conversation
├── locales/               # traductions en/fr
├── providers/             # adaptateurs protocolaires
└── src/                   # prompt, panneau, pipeline SSE et validation
```

Le navigateur envoie la requête et les résultats déjà rendus à
`/api/plugin/<id>/stream`. Le serveur nettoie les données, construit un prompt
qui marque les résultats comme non fiables, appelle le fournisseur puis renvoie
des événements SSE `delta`, `thinking`, `done` ou `error`.
Les miniatures restent servies par le proxy d’images signé degoog ; leur ajout ne
rend pas le client responsable des appels aux sites sources.

Depuis un Overview, le bouton **Mode IA** transmet temporairement la requête et
les sources déjà chargées à la page complète. Une nouvelle question lancée dans
cette page interroge l’API de recherche degoog, puis envoie uniquement ses
résultats nettoyés au même pipeline LLM côté serveur. L’URL réelle de la page est
construite avec `ctx.apiBase`, afin de rester valide après une installation Store.
La page peut aussi être ouverte directement sur `<ctx.apiBase>/mode` ; une
requête placée dans `?q=` est relancée avec les moteurs degoog actifs.

## Limites

- Une citation signifie que le modèle l’a associée à un extrait de résultat ;
  elle ne remplace pas la vérification de la page source.
- Le plugin synthétise les résultats degoog. Il ne reproduit pas le classement,
  les modèles, les données propriétaires ni les réponses de Google.
- Le Mode IA fourni ici prend en charge le texte et les questions de suivi. Il
  n’implémente pas encore l’envoi vocal, les fichiers, les images utilisateur ou
  un historique persistant.
- La qualité dépend du moteur de recherche, des extraits disponibles, du modèle
  choisi et de sa discipline de citation.
- Les tarifs, modèles, limites et politiques de confidentialité restent ceux de
  chaque fournisseur.

## Développement et tests

Prérequis : Node.js 20 ou plus récent.

```bash
npm test
npm run check
```

La suite couvre les presets, la sélection automatique de protocole, la
validation des réglages, l’échappement HTML/URL, les prompts et les flux OpenAI
Chat, OpenAI Responses, Anthropic, Gemini et Ollama.

Références de développement :

- [Plugins degoog](https://degoog-org.github.io/docs/plugins.html)
- [Styles et variables degoog](https://degoog-org.github.io/docs/styling.html)
- [Traductions degoog](https://degoog-org.github.io/docs/translations.html)
- [Google AI Overviews, référence d’interaction](https://search.google/ways-to-search/ai-overviews/)

## Licence

[MIT](LICENSE)
