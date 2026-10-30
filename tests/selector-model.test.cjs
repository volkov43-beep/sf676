const {test}=require('node:test');const assert=require('node:assert/strict');const m=require('../assets/js/sf676-selector-model.js');
function exact(){return{table:'table_250x800',taper:'taper_40at5',dro:'dro_optical',coordinates:'coordinates_f3',screw:'screw_ball'}}
function quiz(){return{operations:['milling','slotting'],parts:{description:'Тестовая деталь 100 × 50 мм',dimensionsUnknown:false},tooling:'tooling_40',positioning:'positioning_dro',extras:{items:['delivery'],comment:'Технический пример'}}}
test('Every declared option produces its actual label, with consultation supported',()=>{
 for(const mode of ['exact','quiz'])for(const step of m.modes[mode])for(const [id,label]of step.options||[]){
 const a=mode==='exact'?exact():quiz();a[step.id]=step.type==='multiple'?[id]:step.type==='extras'?{items:[id],comment:''}:id;
 if(mode==='exact'&&step.id==='dro'&&id==='dro_none')a.coordinates='not_applicable';
 const r=m.getResult(mode,a);assert.ok(r,mode+'/'+id);assert.ok(m.summarize(r).rows.find(row=>row.label===step.label).value.includes(label));
 }
});
test('DRO dependency invalidates coordinates on changes, including consultation; no reset on same value',()=>{
 const a=exact();assert.equal(m.setAnswer(a,'exact','dro','dro_none'),true);assert.equal(a.coordinates,'not_applicable');assert.ok(m.getResult('exact',a));
 m.setAnswer(a,'exact','dro','dro_optical');assert.equal(a.coordinates,undefined);assert.equal(m.getResult('exact',a),null);
 m.setAnswer(a,'exact','coordinates','coordinates_f2');m.setAnswer(a,'exact','dro','dro_optical');assert.equal(a.coordinates,'coordinates_f2');
 m.setAnswer(a,'exact','dro','consultation');assert.equal(a.coordinates,undefined);m.setAnswer(a,'exact','coordinates','consultation');assert.ok(m.getResult('exact',a));
});
test('Reject unknown IDs, inherited names, malformed values, duplicates, missing steps and wrong schema',()=>{
 for(const mode of ['invalid','constructor','__proto__',null]){assert.equal(m.getResult(mode,{}),null);assert.equal(m.validAnswer(mode,'table','table_250x800'),false)}
 for(const v of ['invented',{},[],17]){const a=exact();a.table=v;assert.equal(m.getResult('exact',a),null)}
 const a=exact();delete a.screw;assert.equal(m.getResult('exact',a),null);
 const q=quiz();q.operations=['milling','milling'];assert.equal(m.getResult('quiz',q),null);q.operations=['consultation','milling'];assert.equal(m.getResult('quiz',q),null);
 const r=m.getResult('exact',exact());assert.equal(m.validateResult({...r,schemaVersion:2}),null);assert.equal(m.validateResult({...r,contact:'not permitted'}),null);assert.equal(m.validateResult({...r,requiresConfirmation:false}),null);
 assert.equal(m.getResult('exact',{...exact(),dro:'dro_none'}),null);assert.equal(m.getResult('exact',{...exact(),coordinates:'not_applicable'}),null);
});
test('Optional quiz text and extras may be empty; quiz never contains machine selections',()=>{
 const a=m.emptyAnswers('quiz');Object.assign(a,{operations:['consultation'],tooling:'consultation',positioning:'consultation'});const r=m.getResult('quiz',a);
 assert.ok(r);assert.equal(r.requiresConsultation,true);assert.equal(r.selections,undefined);assert.equal(m.summarize(r).rows[1].value,'Не указано');
});
test('Text is bounded and never interpreted as HTML; output is a detached validated snapshot',()=>{
 const q=quiz();q.parts.description='<img src=x>';assert.equal(m.getResult('quiz',q),null);q.parts.description='x'.repeat(1001);assert.equal(m.getResult('quiz',q),null);
 q.parts.description='x'.repeat(1000);let r=m.getResult('quiz',q);assert.ok(r);r.requirements.operations.push('drilling');assert.deepEqual(q.operations,['milling','slotting']);
 q.parts.contact='qa@example.com';assert.equal(m.getResult('quiz',q),null);
});
test('Two modes and reset snapshots are independent; no supplied defaults in exact mode',()=>{
 const a=m.emptyAnswers('exact'),b=m.emptyAnswers('quiz');assert.equal(m.getResult('exact',a),null);m.setAnswer(a,'exact','table','table_300x800');assert.equal(b.table,undefined);assert.deepEqual(m.emptyAnswers('exact'),{});
});
