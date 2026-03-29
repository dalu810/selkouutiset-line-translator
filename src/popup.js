const toggle = document.getElementById("toggle");

chrome.storage.local.get(["enabled"], (res) => {
  toggle.checked = res.enabled ?? true;
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;

  chrome.storage.local.set({ enabled });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "TOGGLE",
      enabled,
    });
  });
});
