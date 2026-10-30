/* SF676 request forms, schema v1. Demo only: no transport, persistence or analytics.
 * Public contract and validation rules: docs/request-forms.md.
 */
(function () {
  'use strict';
  if (window.SF676Requests) return;
  const dialog = document.getElementById('request-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return; // Keep #order links.
  const form = document.getElementById('request-form');
  const fields = document.getElementById('request-fields');
  const title = document.getElementById('request-title');
  const description = document.getElementById('request-description');
  const status = document.getElementById('request-status');
  const closeButton = dialog.querySelector('.request-close');
  const sendButton = document.getElementById('request-submit');
  const purchaseTypes = [['undecided', 'Другое / пока не определено'], ['44-fz', '44-ФЗ'], ['223-fz', '223-ФЗ'], ['commercial', 'Коммерческая закупка']];
  const documents = [['specifications', 'Технические характеристики'], ['manual', 'Паспорт или руководство по эксплуатации'], ['origin', 'Документы о российском происхождении'], ['declaration', 'Декларация соответствия'], ['configuration', 'Документы по комплектации'], ['quotation', 'Коммерческое предложение'], ['other', 'Другое']];
  const definitions = {
    contact: {label: 'Телефон или e-mail', required: true, max: 254, wide: true},
    name: {label: 'Имя', max: 100},
    company: {label: 'Название предприятия', max: 200},
    organization: {label: 'Название организации', max: 200, wide: true},
    city: {label: 'Город доставки', max: 160, wide: true},
    supplyCity: {label: 'Город поставки', max: 160, wide: true},
    comment: {label: 'Комментарий', type: 'textarea', max: 2000, wide: true},
    task: {label: 'Производственная задача или требования', type: 'textarea', max: 2000, wide: true},
    model: {label: 'Модель существующего станка', max: 160, wide: true},
    condition: {label: 'Состояние оборудования', max: 500, wide: true},
    problem: {label: 'Описание неисправности или производственной задачи', type: 'textarea', max: 2000, wide: true},
    purchaseType: {label: 'Тип закупки', type: 'select', options: purchaseTypes, wide: true},
    documents: {label: 'Какие документы необходимы', type: 'checkboxes', options: documents, wide: true},
    requirements: {label: 'Требования к комплектации', type: 'textarea', max: 2000, wide: true}
  };
  const scenarios = {
    price_quote: {
      title: 'Получить цену СФ676 с доставкой',
      description: 'Укажите контактные данные и город доставки. Подготовим коммерческое предложение с комплектацией, стоимостью и сроком изготовления',
      fields: ['contact', 'name', 'company', 'city', 'comment'], action: 'Отправить запрос цены'
    },
    configuration_help: {
      title: 'Поможем подобрать комплектацию СФ676',
      description: 'Опишите производственную задачу. Технолог поможет определить подходящее исполнение станка',
      fields: ['contact', 'name', 'company', 'task', 'comment'], action: 'Запросить консультацию'
    },
    repair_comparison: {
      title: 'Сравнить ремонт и приобретение нового СФ676',
      description: 'Расскажите о существующем оборудовании. Специалист поможет оценить варианты восстановления и приобретения нового станка',
      fields: ['model', 'condition', 'problem', 'contact', 'name'], action: 'Запросить сравнительный расчёт',
      note: 'Фотографии, видео работы шпинделя и технические материалы можно передать специалисту при дальнейшем общении. Автоматический расчёт и загрузка файлов здесь не выполняются.'
    },
    procurement_documents: {
      title: 'Запросить документы для закупки СФ676',
      description: 'Укажите необходимые документы и контактные данные организации',
      fields: ['contact', 'organization', 'purchaseType', 'documents'], action: 'Отправить запрос документов',
      note: 'Это запрос документов, а не архив для скачивания. Наличие и актуальность конкретных документов нужно уточнить у завода.'
    },
    procurement_nmck: {
      title: 'Получить коммерческое предложение для обоснования НМЦК',
      description: 'Укажите контактные данные организации и требования к поставке СФ676.',
      fields: ['organization', 'contact', 'purchaseType', 'requirements', 'supplyCity', 'comment'], action: 'Запросить КП для НМЦК'
    }
  };
  let active = null;
  let backdropStart = false;
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function renderField(key) {
    const spec = definitions[key];
    const group = el(spec.type === 'checkboxes' ? 'fieldset' : 'div', 'request-field' + (spec.wide ? ' request-field-wide' : '') + (spec.type === 'checkboxes' ? ' request-choices' : ''));
    const label = el(spec.type === 'checkboxes' ? 'legend' : 'label', '', spec.label);
    label.appendChild(el('small', '', spec.required ? ' — обязательно' : ' — необязательно'));
    group.appendChild(label);
    const id = 'request-' + key;
    if (spec.type === 'checkboxes') {
      for (const [value, text] of spec.options) {
        const choice = el('label', 'request-choice');
        const input = el('input'); input.type = 'checkbox'; input.name = key; input.value = value; input.id = id + '-' + value;
        choice.htmlFor = input.id; choice.append(input, el('span', '', text)); group.appendChild(choice);
      }
    } else {
      label.htmlFor = id;
      const input = el(spec.type === 'textarea' ? 'textarea' : spec.type === 'select' ? 'select' : 'input');
      input.id = id; input.name = key;
      if (!spec.type) input.type = 'text';
      if (spec.type === 'select') {
        for (const [value, text] of spec.options) { const option = el('option', '', text); option.value = value; input.appendChild(option); }
      } else {
        input.maxLength = spec.max; input.autocomplete = 'off';
        if (spec.type === 'textarea') input.rows = 3;
        if (key === 'contact') { input.spellcheck = false; input.setAttribute('autocapitalize', 'none'); }
      }
      input.required = !!spec.required;
      input.setAttribute('aria-describedby', id + '-error');
      group.append(input, el('p', 'request-error'));
      group.lastChild.id = id + '-error';
    }
    fields.appendChild(group);
  }
  // Raw contact is never rewritten or truncated. This is syntax checking, not verification.
  function contactError(raw) {
    const value = raw.trim();
    if (!value) return 'Укажите телефон или e-mail.';
    if (value.includes('@')) {
      const parts = value.split('@');
      const local = parts[0], domain = parts[1] || '';
      const valid = parts.length === 2 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u.test(value)
        && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..')
        && domain.split('.').every(part => /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u.test(part));
      return valid ? '' : 'Проверьте e-mail: например, test@example.com.';
    }
    if (!/^\+?[\d\s().-]+$/.test(value)) return 'Введите телефон или e-mail. В телефоне допустимы цифры, пробелы, скобки, дефисы и начальный «+».';
    const digits = value.replace(/\D/g, '');
    const valid = value.startsWith('+') ? /^[1-9]\d{6,14}$/.test(digits) : /^\d{10}$/.test(digits) || /^[78]\d{10}$/.test(digits);
    if (!valid || /^(\d)\1+$/.test(digits)) return 'Проверьте номер: 10 цифр, 11 цифр с 7/8 или международный номер с «+» (7–15 цифр). Лишние цифры не удаляются.';
    if ((value.match(/\(/g) || []).length !== (value.match(/\)/g) || []).length) return 'Проверьте скобки в номере телефона.';
    return '';
  }
  function fieldError(input) {
    const spec = definitions[input.name];
    if (!spec || spec.type === 'checkboxes') return '';
    if (spec.max && input.value.length > spec.max) return 'Максимум ' + spec.max + ' символов.';
    if (/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.value)) return 'Используйте обычный текст без HTML-разметки и символов «<» и «>».';
    if (spec.type === 'select' && !spec.options.some(([value]) => value === input.value)) return 'Выберите тип закупки из списка.';
    return input.name === 'contact' ? contactError(input.value) : '';
  }
  function showError(input) {
    const message = fieldError(input);
    const output = document.getElementById(input.id + '-error');
    if (output) output.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return message;
  }
  function validate() {
    if (!active || !dialog.open) return false;
    let first = null;
    fields.querySelectorAll('input:not([type="checkbox"]),textarea,select').forEach(input => {
      if (showError(input) && !first) first = input;
    });
    status.dataset.state = first ? 'invalid' : 'valid';
    status.textContent = first ? 'Проверьте отмеченные поля. Данные не отправлены.' : 'Поля заполнены корректно. Это только проверка: данные не отправлены. Для обращения используйте телефон или e-mail.';
    if (first) first.focus();
    return !first;
  }
  // Only bounded, plain technical context is accepted; never a DOM fragment or HTML.
  function cleanContext(value) {
    const result = {};
    if (!value || Object.getPrototypeOf(value) !== Object.prototype) return result;
    const selected = window.SF676SelectorModel?.validateResult(value.selector);
    if (selected) result.selector = selected;
    const groups = {
      configuration: ['workTable', 'spindleTaper', 'droType', 'coordinates', 'screwDrive'],
      calculation: null
    };
    for (const [group, keys] of Object.entries(groups)) {
      const source = value[group];
      if (!source || Object.getPrototypeOf(source) !== Object.prototype) continue;
      const target = {};
      for (const key of (keys || Object.keys(source).slice(0, 20))) {
        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) || ['constructor', 'prototype'].includes(key)) continue;
        const item = source[key];
        if (typeof item === 'string' && item.length <= 160 && !/[<>]/.test(item)) target[key] = item;
        else if (typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) target[key] = item;
      }
      if (Object.keys(target).length) result[group] = target;
    }
    return result;
  }
  function renderSelection(result) {
    const summary = window.SF676SelectorModel.summarize(result);
    const box = el('div', 'request-selection request-field-wide');
    box.appendChild(el('h3', '', summary.title));
    const list = el('dl');
    summary.rows.forEach(row => {
      const item = el('div'); item.append(el('dt', '', row.label), el('dd', '', row.value)); list.appendChild(item);
    });
    box.append(list, el('p', '', summary.notice)); fields.appendChild(box);
  }
  function identifier(value, fallback) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : fallback; }
  function lockPage() {
    const body = document.body;
    const previous = {};
    for (const name of ['position', 'top', 'left', 'width', 'paddingRight']) previous[name] = body.style[name];
    const x = window.scrollX, y = window.scrollY;
    const wasScrolled = body.classList.contains('scrolled');
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    const hadLock = document.documentElement.classList.contains('request-lock');
    document.documentElement.classList.add('request-lock');
    Object.assign(body.style, {position: 'fixed', top: -y + 'px', left: -x + 'px', width: '100%', paddingRight: padding + gap + 'px'});
    return {previous, x, y, hadLock, wasScrolled};
  }
  function cleanup() {
    if (!active) return;
    const saved = active; active = null;
    form.reset(); fields.replaceChildren(); title.textContent = ''; description.textContent = ''; status.textContent = ''; delete status.dataset.state;
    backdropStart = false;
    Object.assign(document.body.style, saved.page.previous);
    // Restore existing sticky visibility before returning focus to its CTA.
    document.body.classList.toggle('scrolled', saved.page.wasScrolled);
    if (!saved.page.hadLock) document.documentElement.classList.remove('request-lock');
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(saved.page.x, saved.page.y);
    if (saved.trigger && saved.trigger.isConnected) saved.trigger.focus({preventScroll: true});
    document.documentElement.style.scrollBehavior = previousBehavior;
  }
  function close() { if (dialog.open) dialog.close(); cleanup(); }
  function open(options) {
    if (!options || !Object.hasOwn(scenarios, options.formId)) return false;
    if (dialog.open) return false; // No nested windows; caller can close explicitly first.
    const context = cleanContext(options.context);
    if (options.context && Object.hasOwn(options.context, 'selector') && (options.formId !== 'configuration_help' || !context.selector)) return false;
    cleanup();
    const scenario = scenarios[options.formId];
    fields.replaceChildren(); form.reset(); status.textContent = ''; delete status.dataset.state;
    title.textContent = scenario.title; description.textContent = scenario.description;
    sendButton.textContent = scenario.action;
    const fieldKeys = scenario.fields.filter(key => !(context.selector?.mode === 'quiz' && key === 'task'));
    if (context.selector) {
      description.textContent = 'Ваша сводка добавлена ниже. Укажите контакт для обсуждения с технологом. Это демонстрационная форма без отправки.';
      renderSelection(context.selector);
    }
    fieldKeys.forEach(renderField);
    if (scenario.note) fields.appendChild(el('p', 'request-hint request-field-wide', scenario.note));
    const trigger = options.trigger instanceof HTMLElement ? options.trigger : document.activeElement;
    active = {formId: options.formId, sourceSection: identifier(options.sourceSection, 'unknown'), sourceCta: identifier(options.sourceCta, 'programmatic'), context, fieldKeys, trigger, page: lockPage()};
    try { dialog.showModal(); title.focus({preventScroll: true}); dialog.querySelector('.request-content').scrollTop = 0; }
    catch (_) { cleanup(); return false; }
    return true;
  }
  // A fresh snapshot on explicit request only. No retained contact object or submission.
  function getDraft() {
    if (!active || !dialog.open) return null;
    if (Array.from(fields.querySelectorAll('input:not([type="checkbox"]),textarea,select')).some(input => fieldError(input))) return null;
    const contact = {}, context = cleanContext(active.context);
    for (const key of active.fieldKeys) {
      const spec = definitions[key];
      const value = spec.type === 'checkboxes'
        ? Array.from(fields.querySelectorAll('input[name="' + key + '"]:checked')).map(input => input.value).filter(value => spec.options.some(option => option[0] === value))
        : form.elements.namedItem(key).value;
      if (['contact', 'name', 'company', 'organization'].includes(key)) contact[key === 'contact' ? 'value' : key] = value;
      else context[key] = value;
    }
    return {schemaVersion: 1, formId: active.formId, sourceSection: active.sourceSection, sourceCta: active.sourceCta, context, contact};
  }
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { if (!dialog.open) cleanup(); });
  function outside(event) { const r = dialog.getBoundingClientRect(); return event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom); }
  dialog.addEventListener('pointerdown', event => { backdropStart = outside(event); });
  dialog.addEventListener('click', event => { if (backdropStart && outside(event)) close(); backdropStart = false; });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const stops = Array.from(dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,a[href]'));
    const first = stops[0], last = stops[stops.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.getElementById('request-check').addEventListener('click', validate);
  form.addEventListener('submit', event => { event.preventDefault(); validate(); });
  fields.addEventListener('input', event => { status.textContent = ''; delete status.dataset.state; if (event.target.getAttribute('aria-invalid') === 'true') showError(event.target); });
  fields.addEventListener('focusout', event => { if (event.target.name && event.target.type !== 'checkbox' && event.target.value) showError(event.target); });
  window.addEventListener('pagehide', close);
  window.SF676Requests = Object.freeze({open, close, validate, getDraft});
  document.querySelectorAll('a[data-request-form]').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog'); link.setAttribute('aria-controls', 'request-dialog');
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (open({formId: link.dataset.requestForm, sourceSection: link.dataset.sourceSection, sourceCta: link.dataset.sourceCta, trigger: link})) event.preventDefault();
    });
  });
})();
