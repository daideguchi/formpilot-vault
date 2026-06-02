(function loadAIFormAutofillContent() {
  if (globalThis.__AI_FORM_AUTOFILL_CONTENT_LOADED__) return;
  globalThis.__AI_FORM_AUTOFILL_CONTENT_LOADED__ = true;

  const api = {
    collectFormFields,
    fillFormFields,
    undoFillFields
  };

  const undoSnapshots = new Map();

  globalThis.AIFormAutofillContent = api;

  if (globalThis.chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "AFA_COLLECT_FIELDS") {
        sendResponse({
          fields: collectFormFields(),
          locale_context: collectLocaleContext()
        });
        return true;
      }
      if (message?.type === "AFA_FILL_FIELDS") {
        sendResponse(fillFormFields(message.plan || []));
        return true;
      }
      if (message?.type === "AFA_UNDO_FILL_FIELDS") {
        sendResponse(undoFillFields(message.undo_token));
        return true;
      }
      return false;
    });
  }

  function collectFormFields() {
    const elements = Array.from(document.querySelectorAll("input, textarea, select"))
      .filter((element) => isFillableCandidate(element));

    return elements.map((element, index) => {
      const fieldId = `field_${String(index + 1).padStart(3, "0")}`;
      element.dataset.aiFormAutofillFieldId = fieldId;
      const label = getLabel(element);
      return {
        field_id: fieldId,
        selector: cssPath(element),
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute("type") || "",
        role: element.getAttribute("role") || "",
        name: element.getAttribute("name") || "",
        id: element.id || "",
        autocomplete: element.getAttribute("autocomplete") || "",
        placeholder: element.getAttribute("placeholder") || "",
        label,
        aria_label: element.getAttribute("aria-label") || "",
        nearby_text: getNearbyText(element),
        section_title: getSectionTitle(element),
        required: element.required || element.getAttribute("aria-required") === "true",
        disabled: element.disabled,
        visible: isVisible(element),
        ...classifyElementSensitivity(element, label),
        options: getOptions(element)
      };
    });
  }

  function collectLocaleContext() {
    const html = document.documentElement;
    const intl = Intl.DateTimeFormat().resolvedOptions();
    return {
      ui_language: navigator.language || "",
      browser_languages: Array.isArray(navigator.languages) ? navigator.languages.join(",") : navigator.language || "",
      page_language: html.lang || document.querySelector("meta[http-equiv='content-language']")?.content || navigator.language || "",
      text_direction: html.dir || window.getComputedStyle(html).direction || "",
      host_tld: hostTld(location.hostname),
      timezone: intl.timeZone || "",
      calendar: intl.calendar || "",
      numbering_system: intl.numberingSystem || "",
      charset: document.characterSet || "",
      origin: location.origin
    };
  }

  function fillFormFields(plan) {
    let filled = 0;
    let skipped = 0;
    const snapshots = [];
    const changedElements = [];
    const token = `undo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const guardedForms = new Set();

    const removeGuard = installSafeFillGuard(guardedForms);
    for (const item of plan) {
      const element = findElement(item);
      if (!element || element.disabled || !isVisible(element) || shouldSkipElementFill(element, item)) {
        skipped += 1;
        continue;
      }
      const form = element.closest("form");
      if (form) guardedForms.add(form);
      snapshots.push(snapshotElement(element, item));
      if (item.action === "select") {
        setSelectValue(element, item.value);
      } else {
        setNativeValue(element, item.value);
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      changedElements.push(element);
      filled += 1;
    }

    for (const element of changedElements) {
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const expiresAt = Date.now() + 30_000;
    if (snapshots.length > 0) {
      undoSnapshots.set(token, { snapshots, expiresAt });
      setTimeout(() => undoSnapshots.delete(token), 31_000);
    }
    setTimeout(removeGuard, 1500);

    return {
      filled,
      skipped,
      undo_token: snapshots.length > 0 ? token : null,
      undo_expires_at: snapshots.length > 0 ? new Date(expiresAt).toISOString() : null
    };
  }

  function undoFillFields(undoToken) {
    const entry = undoSnapshots.get(undoToken);
    if (!entry || Date.now() > entry.expiresAt) {
      undoSnapshots.delete(undoToken);
      return { undone: 0, expired: true };
    }

    let undone = 0;
    for (const snapshot of entry.snapshots) {
      const element = findElement(snapshot);
      if (!element || element.disabled || !isVisible(element)) continue;
      if (snapshot.tag === "select") {
        element.value = snapshot.previous_value;
      } else {
        setNativeValue(element, snapshot.previous_value);
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      undone += 1;
    }

    undoSnapshots.delete(undoToken);
    return { undone, expired: false };
  }

  function findElement(item) {
    if (item.field_id) {
      const byId = document.querySelector(`[data-ai-form-autofill-field-id="${CSS.escape(item.field_id)}"]`);
      if (byId) return byId;
    }
    if (item.selector) return document.querySelector(item.selector);
    return null;
  }

  function setNativeValue(element, value) {
    const proto = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    descriptor?.set?.call(element, value);
    if (!descriptor?.set) element.value = value;
  }

  function setSelectValue(element, value) {
    if (element.tagName !== "SELECT") {
      setNativeValue(element, value);
      return;
    }
    const desired = String(value);
    const option = Array.from(element.options).find((entry) => {
      return entry.value === desired || entry.textContent.trim() === desired || entry.textContent.includes(desired);
    });
    element.value = option ? option.value : desired;
  }

  function snapshotElement(element, item = {}) {
    return {
      field_id: item.field_id,
      selector: item.selector || cssPath(element),
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || "",
      previous_value: element.value || ""
    };
  }

  function installSafeFillGuard(forms) {
    const submitGuard = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    };
    const keyGuard = (event) => {
      if (event.key !== "Enter") return;
      const target = event.target;
      if (target?.tagName === "TEXTAREA") return;
      if (target?.closest?.("form")) submitGuard(event);
    };
    const clickGuard = (event) => {
      if (isSubmitControl(event.target)) submitGuard(event);
    };

    document.addEventListener("keydown", keyGuard, true);
    document.addEventListener("click", clickGuard, true);
    document.addEventListener("submit", submitGuard, true);

    const interval = setInterval(() => {
      for (const form of forms) form.addEventListener("submit", submitGuard, true);
    }, 20);

    return () => {
      clearInterval(interval);
      document.removeEventListener("keydown", keyGuard, true);
      document.removeEventListener("click", clickGuard, true);
      document.removeEventListener("submit", submitGuard, true);
      for (const form of forms) form.removeEventListener("submit", submitGuard, true);
    };
  }

  function shouldSkipElementFill(element, item = {}) {
    const sensitivity = classifyElementSensitivity(element);
    if (sensitivity.sensitivity_tier >= 4) return true;
    if ((item.sensitive_tier || 0) >= 4) return true;
    if (item.action === "skip" || item.action === "ask") return true;
    return false;
  }

  function isFillableCandidate(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === "textarea" || tag === "select") return true;
    const type = (element.getAttribute("type") || "text").toLowerCase();
    return !["button", "submit", "reset", "image", "file", "hidden"].includes(type);
  }

  function classifyElementSensitivity(element, label = "") {
    const haystack = [
      element.getAttribute("type") || "",
      element.getAttribute("autocomplete") || "",
      element.getAttribute("name") || "",
      element.id || "",
      label,
      element.getAttribute("aria-label") || "",
      element.getAttribute("placeholder") || "",
      getNearbyText(element)
    ].join(" ");
    const type = (element.getAttribute("type") || "").toLowerCase();
    const autocomplete = (element.getAttribute("autocomplete") || "").toLowerCase();
    if (type === "password" || /password|passwd|passphrase|パスワード|暗証番号/i.test(haystack)) {
      return { sensitivity_tier: 4, sensitive_reason: "password_default_skip" };
    }
    if (/^(cc-|webauthn|one-time-code)/i.test(autocomplete) || /credit card|card number|クレジット|カード番号|ssn|social security|tax id|マイナンバー|個人番号|bank account|口座番号|captcha|認証コード|確認コード|otp/i.test(haystack)) {
      return { sensitivity_tier: 4, sensitive_reason: "highly_sensitive_skip" };
    }
    return { sensitivity_tier: null, sensitive_reason: "" };
  }

  function isSubmitControl(target) {
    const element = target?.closest?.("button, input");
    if (!element) return false;
    const tag = element.tagName.toLowerCase();
    const type = (element.getAttribute("type") || (tag === "button" ? "submit" : "")).toLowerCase();
    return type === "submit" || type === "image";
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }

  function getLabel(element) {
    if (element.id) {
      const direct = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (direct) return cleanText(direct.textContent);
    }
    const closest = element.closest("label");
    if (closest) return cleanText(closest.textContent.replace(element.value || "", ""));
    const wrapper = element.closest(".field, .form-field, .input, .control, .row, p, div, li");
    const wrapperLabel = wrapper?.querySelector?.("label");
    return wrapperLabel ? cleanText(wrapperLabel.textContent) : "";
  }

  function getNearbyText(element) {
    const directLabel = element.closest("label");
    if (directLabel) return textWithoutControls(directLabel).slice(0, 160);

    const wrapper = element.closest(".field, .form-field, .input, .control, .row, p, div, li");
    if (!wrapper) return "";
    const controlCount = wrapper.querySelectorAll("input, textarea, select").length;
    if (controlCount > 1) {
      const previous = [];
      let node = element.previousSibling;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) previous.unshift(node.textContent || "");
        if (node.nodeType === Node.ELEMENT_NODE && !node.matches("input, textarea, select, option, script, style")) {
          previous.unshift(node.textContent || "");
        }
        node = node.previousSibling;
      }
      return cleanText(previous.join(" ")).slice(0, 160);
    }
    return textWithoutControls(wrapper).slice(0, 160);
  }

  function textWithoutControls(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("input, textarea, select, option, script, style").forEach((node) => node.remove());
    return cleanText(clone.textContent);
  }

  function getSectionTitle(element) {
    const fieldset = element.closest("fieldset");
    const legend = fieldset?.querySelector("legend");
    if (legend) return cleanText(legend.textContent);
    const section = element.closest("section, form, article, main, div");
    const title = section?.querySelector?.("h1, h2, h3, h4");
    return title ? cleanText(title.textContent) : "";
  }

  function getOptions(element) {
    if (element.tagName !== "SELECT") return null;
    return Array.from(element.options).map((option) => ({
      value: option.value,
      text: cleanText(option.textContent)
    }));
  }

  function cleanText(text = "") {
    return String(text).replace(/\s+/g, " ").trim();
  }

  function hostTld(hostname = "") {
    const parts = String(hostname).split(".").filter(Boolean);
    return parts.length > 1 ? parts.at(-1) : "";
  }

  function cssPath(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let node = element;
    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
      const parent = node.parentElement;
      const tag = node.tagName.toLowerCase();
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
      const index = siblings.indexOf(node) + 1;
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
      node = parent;
    }
    return parts.join(" > ");
  }
})();
