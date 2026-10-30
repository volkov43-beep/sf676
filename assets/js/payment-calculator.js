/* Progressively enhance the existing 50/45/5 scheme. No transport or persistent state. */
(function () {
  'use strict';
  const model = window.SF676PaymentModel, root = document.getElementById('payment-calculator');
  if (!model || !root || window.SF676Payments) return;
  const input = document.getElementById('payment-total'), error = document.getElementById('payment-error');
  const live = document.getElementById('payment-live'), amounts = Array.from(root.querySelectorAll('[data-payment-value]'));
  const messages = {positive:'Укажите стоимость больше нуля.',format:'Введите сумму в рублях: пробелы между тысячами, запятая или точка и не более двух знаков после неё.',limit:'Максимальная сумма для расчёта — 1 000 000 000 ₽.'};
  let timer;
  function getCalculation() {
    const parsed = model.parse(input.value);
    return parsed.state === 'valid' ? model.calculate(parsed.totalKopeks) : null;
  }
  function update(announceNow=false) {
    clearTimeout(timer);
    const parsed = model.parse(input.value), result = parsed.state === 'valid' ? model.calculate(parsed.totalKopeks) : null;
    error.textContent = parsed.state === 'invalid' ? messages[parsed.code] : '';
    if (parsed.state === 'invalid') input.setAttribute('aria-invalid','true'); else input.removeAttribute('aria-invalid');
    for (const node of amounts) {
      node.textContent = result ? model.format(result[node.dataset.paymentValue]) : 'Сумма появится после ввода стоимости';
      node.classList.toggle('payment-value-empty', !result);
    }
    const message = result ? 'Платежи пересчитаны. Общая сумма: '+model.format(result.totalKopeks)+'. Распределение 50, 45 и 5 процентов показано ниже.' : (error.textContent || 'Укажите стоимость для расчёта платежей.');
    const announce = () => { live.textContent = message; };
    // Visual results update immediately. A short pause avoids reading every keystroke.
    if (announceNow) announce(); else timer = setTimeout(announce,650);
  }
  input.addEventListener('input',()=>update());
  input.addEventListener('change',()=>update(true));
  input.addEventListener('blur',()=>update(true));
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();update(true)}});
  window.addEventListener('pagehide',()=>clearTimeout(timer));
  window.SF676Payments = Object.freeze({getCalculation});
  root.querySelectorAll('[data-payment-enhanced]').forEach(node=>{node.hidden=false});
})();
