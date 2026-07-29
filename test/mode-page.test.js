import assert from "node:assert/strict";
import test from "node:test";

import {
  basePathFromApiBase,
  buildModeClientScript,
  renderModePage,
} from "../plugins/ai-overviews/src/mode-page.js";

test("AI Mode page uses the installed plugin API base and request language", () => {
  const html = renderModePage(
    "<html lang=\"{{lang}}\"><title>{{title}}</title><link href=\"{{apiBase}}/mode.css\"><a href=\"{{basePath}}/\">{{backHome}}</a></html>",
    {
      apiBase: "/degoog/api/plugin/author-repo-ai-overviews",
      request: new Request(
        "https://search.test/degoog/api/plugin/author-repo-ai-overviews/mode",
        { headers: { "Accept-Language": "fr-BE,fr;q=0.9" } },
      ),
    },
  );
  assert.match(html, /lang="fr"/);
  assert.match(html, /<title>Mode IA<\/title>/);
  assert.match(html, /\/degoog\/api\/plugin\/author-repo-ai-overviews\/mode\.css/);
  assert.match(html, /href="\/degoog\/"/);
  assert.equal(
    basePathFromApiBase("/degoog/api/plugin/author-repo-ai-overviews"),
    "/degoog",
  );
});

test("AI Mode client configuration is serialized without closing its script", () => {
  const script = buildModeClientScript("console.log('mode');", {
    apiBase: "</script>",
  });
  assert.doesNotMatch(script, /<\/script>/);
  assert.match(script, /<\\\/script>/);
  assert.match(script, /console\.log\('mode'\)/);
});
