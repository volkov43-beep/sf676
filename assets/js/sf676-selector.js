/* Inline, progressively enhanced wizard. State lives only in this page's memory. */
(function(){
  'use strict';
  const model=window.SF676SelectorModel, root=document.getElementById('sf676-selector');
  if(!model||!root||window.SF676Selector)return;
  const stage=document.getElementById('selector-stage'), reference=document.getElementById('config-reference');
  const states=Object.fromEntries(Object.keys(model.modes).map(mode=>[mode,{answers:model.emptyAnswers(mode),step:0,result:false}]));
  let mode=null;
  const announcement=document.createElement('p');announcement.className='sr-only';announcement.setAttribute('role','status');root.appendChild(announcement);
  function el(tag,css,text){const node=document.createElement(tag);if(css)node.className=css;if(text)node.textContent=text;return node}
  function button(label,action,css='btn out'){const b=el('button',css,label);b.type='button';b.dataset.selectorAction=action;return b}
  function icon(id){const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg'),u=document.createElementNS(ns,'use');s.setAttribute('class','ux-icon');s.setAttribute('viewBox','0 0 48 48');s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');u.setAttribute('href','assets/graphics/engineering.svg#'+id);s.appendChild(u);return s}
  function focusQuestion(heading){
    if(!heading)return;
    // Measure now: a text/viewport resize can precede the shared ResizeObserver callback.
    const header=document.querySelector('.sticky');
    const target=heading.tagName==='LEGEND'?stage.querySelector('.selector-progress'):heading;
    target.style.scrollMarginTop=((header?header.getBoundingClientRect().height:64)+20)+'px';
    heading.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});
  }
  function focusHeading(){focusQuestion(stage.querySelector('[tabindex="-1"]'))}
  function step(){return model.modes[mode][states[mode].step]}
  function showError(message){const e=stage.querySelector('#selector-error');if(e)e.textContent=message;const g=stage.querySelector('fieldset');if(g){if(message)g.setAttribute('aria-invalid','true');else g.removeAttribute('aria-invalid')}}
  function capture(complete){
    const current=step(),state=states[mode];
    if(mode==='exact'&&current.id==='coordinates'&&state.answers.dro==='dro_none')return true;
    let value;
    if(current.type==='single')value=stage.querySelector('input:checked')?.value;
    else if(current.type==='multiple')value=Array.from(stage.querySelectorAll('input:checked')).map(e=>e.value);
    else if(current.type==='parts')value={description:stage.querySelector('textarea').value,dimensionsUnknown:stage.querySelector('input').checked};
    else value={items:Array.from(stage.querySelectorAll('input:checked')).map(e=>e.value),comment:stage.querySelector('textarea').value};
    if(!model.validAnswer(mode,current.id,value,complete)){
      showError(current.type==='parts'||current.type==='extras'?'Проверьте текст: максимум 1 000 символов, без HTML-разметки.':'Выберите вариант или укажите, что требуется консультация технолога.');return false;
    }
    model.setAnswer(state.answers,mode,current.id,value);showError('');return true;
  }
  function renderOptions(current,value,group){
    const list=el('div','selector-options');
    for(const[id,label,hint]of current.options){
      const wrapper=el('label','selector-option'),input=el('input');input.type=current.type==='single'?'radio':'checkbox';input.name='selector-'+current.id;input.value=id;input.id='selector-'+current.id+'-'+id;wrapper.htmlFor=input.id;
      input.checked=Array.isArray(value)?value.includes(id):value===id;
      const text=el('span');text.appendChild(el('b','',label));if(hint)text.appendChild(el('small','',hint));wrapper.append(input,text);list.appendChild(wrapper);
    }
    group.appendChild(list);
  }
  function renderText(current,value,group){
    const id='selector-'+current.id+'-text',label=el('label','selector-text-label',current.type==='parts'?'Опишите детали или укажите примерные габариты — необязательно':'Технический комментарий — необязательно');label.htmlFor=id;
    const input=el('textarea');input.id=id;input.rows=3;input.maxLength=1000;input.autocomplete='off';input.value=value||'';input.setAttribute('aria-describedby','selector-text-note selector-error');
    const hint=el('p','selector-text-note','До 1 000 символов. Только техническая информация — без имени, телефона и e-mail.');hint.id='selector-text-note';group.append(label,input,hint);
  }
  function renderStep(){
    const current=step(),state=states[mode],steps=model.modes[mode];
    const progress=el('div','selector-progress'),meter=el('progress');meter.max=steps.length;meter.value=state.step+1;meter.setAttribute('aria-label','Текущий шаг');progress.append(el('span','',`Шаг ${state.step+1} из ${steps.length}`),meter);stage.appendChild(progress);
    const group=el('fieldset','selector-question');group.setAttribute('aria-describedby','selector-hint selector-error');
    const legend=el('legend');legend.tabIndex=-1;legend.append(icon(current.icon),document.createTextNode(current.title));group.appendChild(legend);
    const hint=el('p','selector-hint',current.hint);hint.id='selector-hint';group.appendChild(hint);
    const value=state.answers[current.id];
    if(mode==='exact'&&current.id==='coordinates'&&state.answers.dro==='dro_none')group.appendChild(el('p','selector-unavailable','Не применяется: выбрано «Без УЦИ». Количество отображаемых координат относится к устройству цифровой индикации. Если измените вариант УЦИ, этот параметр потребуется выбрать заново.'));
    else if(current.type==='single'||current.type==='multiple')renderOptions(current,value,group);
    else if(current.type==='parts'){
      renderText(current,value.description,group);
      const label=el('label','selector-unknown'),input=el('input');input.type='checkbox';input.id='selector-dimensions-unknown';input.checked=value.dimensionsUnknown;label.htmlFor=input.id;label.append(input,el('span','','Точные размеры пока неизвестны'));group.appendChild(label);
    }else{renderOptions(current,value.items,group);renderText(current,value.comment,group)}
    if(mode==='exact')group.appendChild(button('Подробнее об этом параметре','reference','selector-quiet'));
    const error=el('p','selector-error');error.id='selector-error';error.setAttribute('role','alert');group.appendChild(error);stage.appendChild(group);
    const actions=el('div','selector-actions'),back=button('Назад','back');back.disabled=state.step===0;
    actions.append(back,button(state.step===steps.length-1?'Посмотреть результат':'Продолжить','next','btn red'));
    if(model.getResult(mode,state.answers)&&state.step!==steps.length-1)actions.appendChild(button('К результату','result','selector-quiet'));
    actions.appendChild(button('Начать заново','reset','selector-quiet'));stage.appendChild(actions);
  }
  function renderResult(){
    const result=model.getResult(mode,states[mode].answers),summary=model.summarize(result);
    if(!summary){states[mode].result=false;states[mode].step=model.modes[mode].findIndex((_,i)=>!model.stepValid(mode,states[mode].answers,i));renderStep();return}
    const heading=el('h3','selector-result-title',summary.title);heading.tabIndex=-1;stage.appendChild(heading);
    const dl=el('dl','selector-summary');for(const row of summary.rows){const item=el('div');item.append(el('dt','',row.label),el('dd','',row.value));dl.appendChild(item)}stage.append(dl,el('p','selector-notice',summary.notice));
    const actions=el('div','selector-actions selector-result-actions'),request=el('a','btn red',mode==='exact'?'Получить КП по выбранной комплектации':'Передать требования технологу');request.href='#order';request.dataset.selectorAction='request';
    if(window.SF676Requests){request.setAttribute('aria-haspopup','dialog');request.setAttribute('aria-controls','request-dialog')}
    actions.append(request,button(mode==='exact'?'Изменить параметры':'Изменить ответы','edit'),button('Начать заново','reset','selector-quiet'));stage.appendChild(actions);
    stage.appendChild(el('p','selector-text-note','Отправка заявки пока не подключена. Сводку можно обсудить с отделом продаж по телефону или e-mail.'));
  }
  function render(){
    root.classList.toggle('selector-started',!!mode);
    root.querySelectorAll('[data-selector-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.selectorMode===mode)));
    stage.replaceChildren();if(!mode)return;
    if(states[mode].result)renderResult();else renderStep();focusHeading();
  }
  function start(next){if(!Object.hasOwn(states,next))return false;if(mode&&!states[mode].result&&!capture(false))return false;mode=next;render();return true}
  function reset(target=mode){if(!Object.hasOwn(states,target))return false;states[target]={answers:model.emptyAnswers(target),step:0,result:false};if(mode===target)render();announcement.textContent='Ответы текущего сценария очищены.';return true}
  root.addEventListener('click',event=>{
    const choice=event.target.closest('[data-selector-mode]');if(choice){start(choice.dataset.selectorMode);return}
    const control=event.target.closest('[data-selector-action]');if(!control||!mode)return;
    const state=states[mode],action=control.dataset.selectorAction;
    if(action==='request'){
      if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const result=model.getResult(mode,state.answers);
      if(result&&window.SF676Requests?.open({formId:'configuration_help',sourceSection:'config',sourceCta:'selector-'+mode+'-result',context:{selector:result},trigger:control}))event.preventDefault();return;
    }
    if(action==='reset'){reset();return}
    if(action==='edit'){state.result=false;state.step=0;render();return}
    if(action==='reference'){
      reference.open=true;const index=state.step,heading=reference.querySelectorAll('.config-option h3')[index];heading.tabIndex=-1;focusQuestion(heading);return;
    }
    if(!capture(action!=='back'))return;
    if(action==='next'){
      if(state.step<model.modes[mode].length-1)state.step++;else state.result=true;
    }else if(action==='back')state.step=Math.max(0,state.step-1);
    else if(action==='result'){if(!model.getResult(mode,state.answers)){showError('Заполните изменённые параметры перед просмотром результата.');return}state.result=true}
    render();
  });
  root.addEventListener('change',event=>{
    if(!mode||states[mode].result)return;
    if(step().type==='multiple'&&event.target.type==='checkbox'&&event.target.checked){
      stage.querySelectorAll('input[type="checkbox"]').forEach(input=>{if(event.target.value==='consultation'&&input!==event.target)input.checked=false;else if(event.target.value!=='consultation'&&input.value==='consultation')input.checked=false});
    }
    capture(false);
  });
  root.addEventListener('input',event=>{if(event.target.tagName==='TEXTAREA'&&mode)capture(false)});
  window.SF676Selector=Object.freeze({start,reset,getResult:()=>mode?model.getResult(mode,states[mode].answers):null});
  root.hidden=false;
})();
