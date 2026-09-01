(() => {
  if (window.__aiRephraserLoaded) return;
  window.__aiRephraserLoaded = true;

  const MODES = [
    { id: "rephrase", label: "Rephrase", icon: "✦" },
    { id: "formal", label: "Formal", icon: "🎩" },
    { id: "casual", label: "Casual", icon: "😊" },
    { id: "concise", label: "Concise", icon: "✂️" },
    { id: "expand", label: "Expand", icon: "📝" },
    { id: "fix", label: "Fix Grammar", icon: "✔️" },
  ];

  let activeField = null;
  let triggerBtn = null;
  let dropdownEl = null;
  let dropdownVisible = false;

  // ── Trigger button ──────────────────────────────────────────────────────────

  function createTriggerButton() {
    const btn = document.createElement("div");
    btn.id = "ai-rephraser-trigger";
    btn.title = "AI Rephraser";
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/></svg>`;
    btn.addEventListener("mousedown", (e) => e.preventDefault()); // keep input focused
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown(btn);
    });
    document.body.appendChild(btn);
    return btn;
  }

  function positionTrigger(field) {
    if (!triggerBtn) triggerBtn = createTriggerButton();
    const rect = field.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    triggerBtn.style.top = `${rect.bottom + scrollY - 30}px`;
    triggerBtn.style.left = `${rect.right + scrollX - 30}px`;
    triggerBtn.style.display = "flex";
  }

  function hideTrigger() {
    if (triggerBtn) triggerBtn.style.display = "none";
    hideDropdown();
  }

  // ── Dropdown ────────────────────────────────────────────────────────────────

  function createDropdown() {
    const el = document.createElement("div");
    el.id = "ai-rephraser-dropdown";

    MODES.forEach(({ id, label, icon }) => {
      const item = document.createElement("button");
      item.className = "ai-rephraser-mode-btn";
      item.dataset.mode = id;
      item.innerHTML = `<span class="ai-rephraser-mode-icon">${icon}</span><span>${label}</span>`;
      item.addEventListener("mousedown", (e) => e.preventDefault()); // keep input focused
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        hideDropdown();
        rephraseActiveField(id);
      });
      el.appendChild(item);
    });

    document.body.appendChild(el);
    return el;
  }

  function toggleDropdown(anchor) {
    if (dropdownVisible) {
      hideDropdown();
      return;
    }
    if (!dropdownEl) dropdownEl = createDropdown();
    const rect = anchor.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    dropdownEl.style.top = `${rect.top + scrollY - dropdownEl.offsetHeight - 4}px`;
    dropdownEl.style.left = `${rect.left + scrollX - dropdownEl.offsetWidth + rect.width}px`;
    dropdownEl.style.display = "block";
    // Recalc after layout
    requestAnimationFrame(() => {
      const dRect = dropdownEl.getBoundingClientRect();
      if (dRect.top < 0) {
        dropdownEl.style.top = `${rect.bottom + scrollY + 4}px`;
      }
      if (dRect.left < 0) {
        dropdownEl.style.left = `${scrollX + 4}px`;
      }
    });
    dropdownVisible = true;
  }

  function hideDropdown() {
    if (dropdownEl) dropdownEl.style.display = "none";
    dropdownVisible = false;
  }

  // ── Loading overlay ─────────────────────────────────────────────────────────

  function showLoadingOverlay(field) {
    removeLoadingOverlay();
    const overlay = document.createElement("div");
    overlay.id = "ai-rephraser-loading";
    overlay.innerHTML = `<div class="ai-rephraser-spinner"></div><span>Rephrasing…</span>`;
    const rect = field.getBoundingClientRect();
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    document.body.appendChild(overlay);
  }

  function removeLoadingOverlay() {
    document.getElementById("ai-rephraser-loading")?.remove();
  }

  // ── Toast ───────────────────────────────────────────────────────────────────

  function showToast(msg, type = "error") {
    document.getElementById("ai-rephraser-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "ai-rephraser-toast";
    toast.className = `ai-rephraser-toast ai-rephraser-toast--${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // ── Core rephrasing logic ───────────────────────────────────────────────────

  function getFieldText(field) {
    if (field.tagName === "TEXTAREA" || field.tagName === "INPUT") {
      return field.value;
    }
    if (field.isContentEditable) {
      return field.innerText;
    }
    return "";
  }

  function setFieldText(field, text) {
    if (field.tagName === "TEXTAREA" || field.tagName === "INPUT") {
      field.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(field, text);
      } else {
        field.value = text;
      }
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (field.isContentEditable) {
      field.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
    }
  }

  async function rephraseText(text, mode) {
    const settings = await chrome.storage.sync.get(null);
    const provider = settings.activeProvider;
    if (!provider) {
      throw new Error("No AI provider selected. Open extension Settings.");
    }
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "REPHRASE_REQUEST", text, mode, provider, settings },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve(response.result);
          } else {
            reject(new Error(response?.error || "Unknown error"));
          }
        }
      );
    });
  }

  async function rephraseActiveField(mode) {
    if (!activeField) return;
    const text = getFieldText(activeField);
    if (!text.trim()) {
      showToast("Field is empty.", "error");
      return;
    }
    const field = activeField;
    showLoadingOverlay(field);
    hideTrigger();
    try {
      const result = await rephraseText(text, mode);
      setFieldText(field, result);
      showToast("Text rephrased!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      removeLoadingOverlay();
      positionTrigger(field);
    }
  }

  // ── Context menu handler ────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "CONTEXT_MENU_REPHRASE") return;
    const { mode, selectedText } = message;

    const focused = document.activeElement;
    const isEditable =
      focused &&
      (focused.tagName === "TEXTAREA" ||
        (focused.tagName === "INPUT" && focused.type !== "hidden") ||
        focused.isContentEditable);

    if (!isEditable) {
      showToast("Click inside a text field first.", "error");
      return;
    }

    activeField = focused;
    (async () => {
      const text =
        selectedText ||
        (focused.tagName === "TEXTAREA" || focused.tagName === "INPUT"
          ? focused.value.substring(focused.selectionStart, focused.selectionEnd) || focused.value
          : window.getSelection().toString() || focused.innerText);

      if (!text.trim()) {
        showToast("No text selected.", "error");
        return;
      }

      showLoadingOverlay(focused);
      try {
        const result = await rephraseText(text, mode);
        // Replace selection or full value
        if (focused.tagName === "TEXTAREA" || focused.tagName === "INPUT") {
          const start = focused.selectionStart;
          const end = focused.selectionEnd;
          if (start !== end) {
            const before = focused.value.substring(0, start);
            const after = focused.value.substring(end);
            setFieldText(focused, before + result + after);
          } else {
            setFieldText(focused, result);
          }
        } else {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) {
            sel.deleteFromDocument();
            document.execCommand("insertText", false, result);
          } else {
            setFieldText(focused, result);
          }
        }
        showToast("Text rephrased!", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        removeLoadingOverlay();
      }
    })();
  });

  // ── Field focus/blur tracking ───────────────────────────────────────────────

  let hideTimeout;

  function onFocusIn(e) {
    const t = e.target;
    if (
      t.id === "ai-rephraser-trigger" ||
      t.closest?.("#ai-rephraser-dropdown")
    )
      return;

    const editable =
      (t.tagName === "TEXTAREA" && !t.readOnly && !t.disabled) ||
      (t.tagName === "INPUT" &&
        ["text", "search", "url", "email", "password", ""].includes(t.type || "") &&
        !t.readOnly &&
        !t.disabled) ||
      (t.isContentEditable && t.contentEditable === "true");

    if (editable) {
      clearTimeout(hideTimeout);
      activeField = t;
      positionTrigger(t);
    } else {
      scheduleHide();
    }
  }

  function onFocusOut(e) {
    const rel = e.relatedTarget;
    if (
      rel &&
      (rel.id === "ai-rephraser-trigger" || rel.closest?.("#ai-rephraser-dropdown"))
    )
      return;
    scheduleHide();
  }

  function scheduleHide() {
    hideTimeout = setTimeout(() => {
      if (
        document.activeElement?.id !== "ai-rephraser-trigger" &&
        !document.activeElement?.closest?.("#ai-rephraser-dropdown")
      ) {
        hideTrigger();
        activeField = null;
      }
    }, 200);
  }

  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("focusout", onFocusOut, true);

  // Re-position on scroll/resize
  window.addEventListener("scroll", () => {
    if (activeField && triggerBtn?.style.display !== "none") {
      positionTrigger(activeField);
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (activeField && triggerBtn?.style.display !== "none") {
      positionTrigger(activeField);
    }
  }, { passive: true });

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#ai-rephraser-dropdown") &&
      e.target.id !== "ai-rephraser-trigger"
    ) {
      hideDropdown();
    }
  });
})();
