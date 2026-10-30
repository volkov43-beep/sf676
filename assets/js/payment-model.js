/* Money model v1: rubles are parsed as text; all arithmetic is integer kopeks. */
(function (root) {
  'use strict';
  const MAX_KOPEKS = 100_000_000_000; // Technical input limit: 1 billion RUB, not an equipment price.
  const keys = ['schemaVersion','mode','currency','source','totalKopeks','advanceKopeks','readinessKopeks','finalKopeks','illustrativeOnly'];
  const integerFormat = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0});
  const plain = value => !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
  const validTotal = value => Number.isSafeInteger(value) && value > 0 && value <= MAX_KOPEKS;
  function parse(value) {
    if (typeof value !== 'string' || value.length > 64) return {state:'invalid',code:'format'};
    const input = value.replace(/^[ \u00a0\u202f]+|[ \u00a0\u202f]+$/g, '');
    if (!input) return {state:'empty'};
    if (/^-[0-9][0-9 \u00a0\u202f]*([.,][0-9]{1,2})?$/.test(input)) return {state:'invalid',code:'positive'};
    // Spaces may only separate complete three-digit groups, never a decimal fraction.
    if (!/^(?:[0-9]+|[0-9]{1,3}(?:[ \u00a0\u202f][0-9]{3})+)(?:[.,][0-9]{1,2})?$/.test(input)) return {state:'invalid',code:'format'};
    const [rubles, fraction=''] = input.replace(/[ \u00a0\u202f]/g, '').split(/[.,]/);
    const kopeks = BigInt(rubles) * 100n + BigInt(fraction.padEnd(2, '0'));
    if (kopeks === 0n) return {state:'invalid',code:'positive'};
    if (kopeks > BigInt(MAX_KOPEKS)) return {state:'invalid',code:'limit'};
    return {state:'valid',totalKopeks:Number(kopeks)};
  }
  function calculate(totalKopeks) {
    if (!validTotal(totalKopeks)) return null;
    const total = BigInt(totalKopeks);
    // Half-up rounding to one kopek; the last instalment absorbs the rounding remainder.
    const advanceKopeks = Number((total * 50n + 50n) / 100n);
    const readinessKopeks = Number((total * 45n + 50n) / 100n);
    return {schemaVersion:1,mode:'payment_schedule',currency:'RUB',source:'user_input',totalKopeks,advanceKopeks,readinessKopeks,finalKopeks:totalKopeks-advanceKopeks-readinessKopeks,illustrativeOnly:true};
  }
  function validateCalculation(value) {
    if (!plain(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key=>!keys.includes(key))) return null;
    const expected = calculate(value.totalKopeks);
    return expected && keys.every(key=>value[key]===expected[key]) ? expected : null;
  }
  function format(kopeks) {
    if (!Number.isSafeInteger(kopeks) || kopeks < 0 || kopeks > MAX_KOPEKS) return '';
    const cents = kopeks % 100;
    return integerFormat.format(BigInt(kopeks) / 100n).replace(/[\u00a0\u202f]/g, ' ') + (cents ? ',' + String(cents).padStart(2, '0') : '') + '\u00a0₽';
  }
  const api = Object.freeze({MAX_KOPEKS,parse,calculate,format,validateCalculation});
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SF676PaymentModel = api;
})(typeof window === 'undefined' ? globalThis : window);
