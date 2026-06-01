(function loadAIFormAutofillContent() {
  if (globalThis.__AI_FORM_AUTOFILL_CONTENT_LOADED__) return;
  globalThis.__AI_FORM_AUTOFILL_CONTENT_LOADED__ = true;

  const api = {
    collectFormFields,
    fillFormFields
  };

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
        sendResponse({ filled: fillFormFields(message.plan || []) });
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
    for (const item of plan) {
      const element = findElement(item);
      if (!element || element.disabled || !isVisible(element)) continue;
      if (item.action === "select") {
        setSelectValue(element, item.value);
      } else {
        setNativeValue(element, item.value);
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      filled += 1;
    }
    return filled;
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

  function isFillableCandidate(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === "textarea" || tag === "select") return true;
    const type = (element.getAttribute("type") || "text").toLowerCase();
    return !["button", "submit", "reset", "image", "file", "hidden"].includes(type);
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
    const wrapper = element.closest(".field, .form-field, .input, .control, .row, p, div, li");
    if (!wrapper) return "";
    const clone = wrapper.cloneNode(true);
    clone.querySelectorAll("input, textarea, select, option, script, style").forEach((node) => node.remove());
    return cleanText(clone.textContent).slice(0, 160);
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
