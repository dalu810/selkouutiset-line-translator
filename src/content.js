// ===== TRANSLATION FUNCTION =====
async function translateText(text) {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "fi",
        target: "en",
        format: "text",
      }),
    },
  );

  const data = await res.json();
  return data.data.translations[0].translatedText;
}

// ===== MAIN FUNCTION =====
async function processPage() {
  // 1. Find main content area
  const root = document.querySelector("main") || document;

  // 2. Get all paragraph elements
  const all = Array.from(root.querySelectorAll("p"));

  // 3. Filter valid text
  const candidates = all
    .map((el) => ({
      el,
      text: (el.innerText || "").trim(),
    }))
    .filter((x) => x.text.length > 10);

  // 4. Process each paragraph
  for (const { el, text } of candidates) {
    // Avoid duplicate processing
    if (el.dataset.translated === "true") continue;

    // 5. Create wrapper
    const wrapper = document.createElement("div");

    // 6. Finnish line
    const fiDiv = document.createElement("div");
    fiDiv.textContent = text;
    fiDiv.style.marginBottom = "2px";

    // 7. English line (loading state)
    const enDiv = document.createElement("div");
    enDiv.textContent = "Translating...";
    enDiv.style.color = "#1a73e8";
    enDiv.style.marginBottom = "12px";

    // 8. Append to wrapper
    wrapper.appendChild(fiDiv);
    wrapper.appendChild(enDiv);

    // 9. Replace original paragraph
    el.replaceWith(wrapper);

    try {
      // 10. Translate
      const translated = await translateText(text);

      // 11. Update English text
      enDiv.textContent = translated;
    } catch (err) {
      enDiv.textContent = "[Translation failed]";
      console.error(err);
    }

    // 12. Mark as processed
    el.dataset.translated = "true";
  }
}

// ===== RUN =====
processPage();
