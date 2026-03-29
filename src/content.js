// ===== GUARD: prevent duplicate execution =====
if (window.__TRANSLATOR_RUNNING__) {
  console.log("Translator already running");
} else {
  window.__TRANSLATOR_RUNNING__ = true;

  // ===== CONFIG =====
  const { API_KEY, API_URL } = window.CONFIG;

  // ===== TESTING =====
  //const MAX_LINES = 3;

  // ===== STATE =====
  let isEnabled = true;
  let cache = {};

  const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

  // ===== LOAD CACHE =====
  chrome.storage.local.get(["translationCache", "enabled"], (res) => {
    cache = res.translationCache || {};
    isEnabled = res.enabled ?? true;

    // cleanup expired cache
    const now = Date.now();
    let changed = false;

    for (const key in cache) {
      if (now - cache[key].timestamp > CACHE_EXPIRY_MS) {
        delete cache[key];
        changed = true;
      }
    }

    if (changed) saveCache();

    if (isEnabled) runTranslation();
  });

  function saveCache() {
    chrome.storage.local.set({ translationCache: cache });
  }

  // ===== MESSAGE LISTENER =====
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE") {
      isEnabled = msg.enabled;

      if (isEnabled) {
        runTranslation();
      } else {
        removeTranslations();
      }
    }
  });

  // ===== MAIN =====
  function runTranslation() {
    if (!isEnabled) return;

    const article =
      document.querySelector("article") || document.querySelector("main");

    if (!article) return;

    const elements = article.querySelectorAll("p");

    const candidates = Array.from(elements)
      .map((el) => ({
        el,
        text: el.innerText.trim(),
      }))
      .filter((item) => item.text);

    // For testing, limit to first 3 lines
    //const targets = candidates.slice(0, MAX_LINES);
    //translateBatch(targets);
    translateBatch(candidates);
  }

  // ===== BATCH =====
  async function translateBatch(targets) {
    const textsToTranslate = [];
    const mapping = [];

    for (const { el, text } of targets) {
      if (el.dataset.translated) continue;

      const key = text.trim();

      if (cache[key]) {
        const { value, timestamp } = cache[key];

        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          insertTranslation(el, value);
          continue;
        } else {
          delete cache[key];
        }
      }

      textsToTranslate.push(text);
      mapping.push({ el, text });
    }

    if (textsToTranslate.length === 0) return;

    try {
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: textsToTranslate,
          target: "en",
        }),
      });

      const data = await response.json();
      const translations = data.data.translations;

      translations.forEach((item, index) => {
        const translated = decodeHTML(item.translatedText);
        const { el, text } = mapping[index];

        cache[text] = {
          value: translated,
          timestamp: Date.now(),
        };

        insertTranslation(el, translated);
      });

      saveCache();
    } catch (err) {
      console.error("Batch translation error:", err);
    }
  }

  // ===== INSERT INLINE =====
  function insertTranslation(el, translated) {
    const span = document.createElement("span");

    span.innerText = "\n" + translated;
    span.style.color = "blue";
    span.style.fontSize = "0.9em";
    span.dataset.translationNode = "true";

    el.appendChild(span);
    el.dataset.translated = "true";
  }

  // ===== REMOVE =====
  function removeTranslations() {
    document
      .querySelectorAll('[data-translation-node="true"]')
      .forEach((el) => el.remove());

    document.querySelectorAll("[data-translated]").forEach((el) => {
      delete el.dataset.translated;
    });
  }

  // ===== DECODE =====
  function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }
}
