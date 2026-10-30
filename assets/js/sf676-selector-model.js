/* Shared technical vocabulary and validation. No prices, compatibility rules or transport. */
(function (root) {
  'use strict';
  const consult = ['consultation', 'Требуется консультация технолога'];
  const exact = [
    {id:'table', label:'Рабочий стол', icon:'table', title:'Какой размер рабочего стола вам необходим?', hint:'Точное исполнение стола и количество пазов требуют подтверждения.', type:'single', options:[['table_250x800','250 × 800 мм','Угловой горизонтальный стол из текущего описания.'],['table_300x800','300 × 800 мм','Исполнение с увеличенной рабочей поверхностью.'],consult]},
    {id:'taper', label:'Конус шпинделя', icon:'taper', title:'Какой конус шпинделя вам необходим?', hint:'Учитывайте имеющуюся инструментальную оснастку. Совместимость конкретного инструмента уточняется отдельно.', type:'single', options:[['taper_40at5','40АТ5 — конус 7:24 № 40'],['taper_km4','КМ4 — конус Морзе 4'],consult]},
    {id:'dro', label:'УЦИ', icon:'dro', title:'Какой вариант устройства цифровой индикации необходим?', hint:'Выберите вариант УЦИ или оставьте вопрос для технолога.', type:'single', options:[['dro_none','Без УЦИ'],['dro_magnetic','Магнитная система'],['dro_optical','Оптическая система'],consult]},
    {id:'coordinates', label:'Количество координат', icon:'coordinates', title:'Сколько координат необходимо отображать?', hint:'Количество отображаемых координат относится к УЦИ. Допустимость исполнения подтверждает завод.', type:'single', options:[['coordinates_f2','Ф2 — X, Y'],['coordinates_f3','Ф3 — X, Y, Z'],consult]},
    {id:'screw', label:'Винтовая передача', icon:'screw', title:'Какой тип винтовой передачи необходим?', hint:'ШВП и трапецеидальные передачи — варианты из существующего описания СФ676. Выбор можно обсудить с технологом.', type:'single', options:[['screw_ball','ШВП — шариковая винтовая пара'],['screw_trapezoidal','ТР — трапецеидальная передача'],consult]}
  ];
  const quiz = [
    {id:'operations',label:'Предполагаемые операции',icon:'machine',title:'Какие операции планируете выполнять?',hint:'Можно выбрать несколько операций. Для долбёжных операций требуется дополнительная долбёжная головка.',type:'multiple',options:[['milling','Фрезерование'],['drilling','Сверление'],['boring','Растачивание'],['grooves','Обработка пазов'],['slotting','Долбёжные операции'],['various','Разные операции'],consult]},
    {id:'parts',label:'Обрабатываемые детали',icon:'table',title:'Какие детали планируете обрабатывать?',hint:'Описание или примерные габариты — необязательно. Пригодность станка определяется с учётом операции, закрепления и инструмента.',type:'parts',optional:true},
    {id:'tooling',label:'Инструментальная оснастка',icon:'taper',title:'Какая инструментальная оснастка используется?',hint:'Ответ будет передан технологу; он не подтверждает совместимость всех инструментов.',type:'single',options:[['tooling_40','Оснастка под конус 7:24 № 40'],['tooling_km4','Оснастка под конус Морзе 4'],['tooling_mixed','Различная оснастка'],['tooling_none','Пока нет оснастки'],['consultation','Не знаю — нужна консультация']]},
    {id:'positioning',label:'Требования к УЦИ',icon:'dro',title:'Какие требования к позиционированию и УЦИ?',hint:'Собираем требования к индикации, без расчёта точности и автоматического выбора системы.',type:'single',options:[['positioning_dro','Требуется отображение координат по УЦИ'],['positioning_without','Планируем работать без УЦИ'],['consultation','Необходимо обсудить с технологом']]},
    {id:'extras',label:'Дополнительные условия',icon:'document',title:'Есть ли дополнительные требования?',hint:'Отметьте нужное и при необходимости добавьте технический комментарий. Этот шаг можно пропустить.',type:'extras',optional:true,options:[['accessories','Дополнительная оснастка'],['equipment','Особые требования к комплектации'],['delivery','Требования к доставке и установке'],['timing','Требования к срокам поставки'],['other','Другие технические условия']]}
  ];
  const modes = {exact,quiz};
  const notices = {
    exact:'Это предварительный перечень выбранных параметров. Доступность конкретного сочетания, обозначение модификации и окончательная комплектация подтверждаются заводом при подготовке коммерческого предложения.',
    quiz:'На основании ваших ответов подготовлен перечень требований. Технолог завода поможет определить подходящее исполнение СФ676.'
  };
  const titles = {exact:'Выбранные параметры СФ676',quiz:'Ваши требования к СФ676'};
  const clone = value => JSON.parse(JSON.stringify(value));
  function plain(value) { return !!value && typeof value==='object' && !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype; }
  function keysOnly(value,keys) { return plain(value) && Object.keys(value).every(key=>keys.includes(key)); }
  function text(value) { return typeof value==='string' && value.length<=1000 && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value); }
  function validList(step,value,required) {
    return Array.isArray(value) && (!required || value.length>0) && value.length<=step.options.length && new Set(value).size===value.length && value.every(id=>step.options.some(option=>option[0]===id)) && !(value.includes('consultation')&&value.length>1);
  }
  function validAnswer(mode,id,value,complete=true) {
    if(typeof mode!=='string'||!Object.hasOwn(modes,mode))return false;
    const step=modes[mode].find(step=>step.id===id); if(!step)return false;
    if(step.type==='single') return step.options.some(option=>option[0]===value) || (!complete && value===undefined);
    if(step.type==='multiple') return validList(step,value,!step.optional&&complete);
    if(step.type==='parts') return keysOnly(value,['description','dimensionsUnknown'])&&text(value.description)&&typeof value.dimensionsUnknown==='boolean';
    if(step.type==='extras') return keysOnly(value,['items','comment'])&&validList(step,value.items,false)&&text(value.comment);
    return false;
  }
  function setAnswer(answers,mode,id,value) {
    if(!plain(answers)||!validAnswer(mode,id,value,false))return false;
    const previous=answers[id];
    if(value===undefined)delete answers[id];else answers[id]=clone(value);
    if(mode==='exact'&&id==='dro'&&previous!==value) {
      // UI dependency only: without a display there is no displayed coordinate count.
      if(value==='dro_none')answers.coordinates='not_applicable';
      else delete answers.coordinates;
    }
    return true;
  }
  function stepValid(mode,answers,index) {
    if(typeof mode!=='string'||!Object.hasOwn(modes,mode))return false;
    const step=modes[mode][index];if(!step)return false;
    if(mode==='exact'&&step.id==='coordinates'&&answers.dro==='dro_none')return answers.coordinates==='not_applicable';
    return validAnswer(mode,step.id,answers[step.id]);
  }
  function emptyAnswers(mode) {
    return mode==='quiz'?{operations:[],parts:{description:'',dimensionsUnknown:false},extras:{items:[],comment:''}}:{};
  }
  function getResult(mode,answers) {
    if(typeof mode!=='string'||!Object.hasOwn(modes,mode)||!keysOnly(answers,modes[mode].map(step=>step.id))||!modes[mode].every((_,i)=>stepValid(mode,answers,i)))return null;
    const result={schemaVersion:1,mode};
    result[mode==='exact'?'selections':'requirements']=clone(answers);
    result[mode==='exact'?'requiresConfirmation':'requiresConsultation']=true;
    return result;
  }
  function validateResult(value) {
    if(!plain(value)||value.schemaVersion!==1||!Object.hasOwn(modes,value.mode))return null;
    const key=value.mode==='exact'?'selections':'requirements',flag=value.mode==='exact'?'requiresConfirmation':'requiresConsultation';
    if(!keysOnly(value,['schemaVersion','mode',key,flag])||value[flag]!==true)return null;
    return getResult(value.mode,value[key]);
  }
  function summarize(value) {
    const result=validateResult(value);if(!result)return null;
    const answers=result[result.mode==='exact'?'selections':'requirements'];
    const rows=modes[result.mode].map(step=>{
      const answer=answers[step.id];let value;
      if(answer==='not_applicable')value='Не применяется — выбрано «Без УЦИ»';
      else if(step.type==='single')value=step.options.find(option=>option[0]===answer)[1];
      else if(step.type==='multiple')value=answer.map(id=>step.options.find(option=>option[0]===id)[1]).join('; ');
      else if(step.type==='parts')value=[answer.description.trim(),answer.dimensionsUnknown?'Точные размеры пока неизвестны':''].filter(Boolean).join('. ')||'Не указано';
      else value=[...answer.items.map(id=>step.options.find(option=>option[0]===id)[1]),answer.comment.trim()].filter(Boolean).join('; ')||'Не указано';
      return{label:step.label,value};
    });
    return{title:titles[result.mode],notice:notices[result.mode],rows};
  }
  function freeze(value){Object.values(value).forEach(item=>{if(item&&typeof item==='object')freeze(item)});return Object.freeze(value)}
  const api=Object.freeze({modes:freeze(modes),validAnswer,setAnswer,stepValid,emptyAnswers,getResult,validateResult,summarize});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SF676SelectorModel=api;
})(typeof window==='undefined'?globalThis:window);
