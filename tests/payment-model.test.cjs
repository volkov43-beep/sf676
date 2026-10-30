const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../assets/js/payment-model.js');
test('RU input formats become exact integer kopeks without rewriting input',()=>{
 for(const input of ['4000000','4 000 000','4\u00a0000\u00a0000','4\u202f000\u202f000',' 4 000 000 '])assert.deepEqual(m.parse(input),{state:'valid',totalKopeks:400000000});
 for(const input of ['4000000,50','4000000.5','4 000 000,50','4 000 000.50'])assert.deepEqual(m.parse(input),{state:'valid',totalKopeks:400000050});
 assert.equal(m.parse('0,01').totalKopeks,1);assert.equal(m.parse('1 000 000 000,00').totalKopeks,m.MAX_KOPEKS);
 for(const input of ['', ' ', '\u00a0\u202f'])assert.equal(m.parse(input).state,'empty');
});
test('Invalid inputs cannot produce a calculation or stale result',()=>{
 for(const input of ['0','0,00','-1','-0,01'])assert.equal(m.parse(input).code,'positive');
 for(const input of ['abc','NaN','Infinity','1e6','+100','1,2,3','1.23.4','1,234','1.001','1,234.50','1 23','1  000','1000 000','1, 50','1 000,0 1','1,','.5','1\t000','1\n','<b>100</b>', '1'.repeat(65), null, 100])assert.equal(m.parse(input).state,'invalid',String(input));
 for(const input of ['1 000 000 000,01','999999999999999999999999'])assert.equal(m.parse(input).code,'limit');
 for(const value of [0,-1,1.01,NaN,Infinity,Number.MAX_SAFE_INTEGER,m.MAX_KOPEKS+1,'100'])assert.equal(m.calculate(value),null);
});
test('Required synthetic examples have the exact expected distribution',()=>{
 const cases=[[400000000,[200000000,180000000,20000000]],[100000000,[50000000,45000000,5000000]],[10000000,[5000000,4500000,500000]],[123456789,[61728395,55555555,6172839]],[101,[51,45,5]]];
 for(const [total,expected]of cases){const r=m.calculate(total);assert.deepEqual([r.advanceKopeks,r.readinessKopeks,r.finalKopeks],expected);assert.equal(r.advanceKopeks+r.readinessKopeks+r.finalKopeks,total)}
});
test('Every kopek residue, tiny amounts and upper-bound samples preserve total without negatives',()=>{
 const totals=new Set([1,2,9,10,11,19,20,99,100,m.MAX_KOPEKS]);
 // Exhaustive rounding residues at low, medium and maximum supported magnitudes.
 for(let n=1;n<=20000;n++)totals.add(n);
 for(let n=0;n<100;n++){totals.add(123456700+n);totals.add(m.MAX_KOPEKS-n)}
 for(const n of totals){const r=m.calculate(n);assert.equal(r.advanceKopeks+r.readinessKopeks+r.finalKopeks,n);assert.ok([r.advanceKopeks,r.readinessKopeks,r.finalKopeks].every(x=>Number.isSafeInteger(x)&&x>=0));assert.equal(BigInt(r.advanceKopeks),(BigInt(n)*50n+50n)/100n);assert.equal(BigInt(r.readinessKopeks),(BigInt(n)*45n+50n)/100n)}
});
test('Canonical context rejects unknown keys, wrong arithmetic, types and price claims',()=>{
 const r=m.calculate(123456789);assert.deepEqual(m.validateCalculation(r),r);assert.notEqual(m.validateCalculation(r),r);
 for(const patch of [{schemaVersion:2},{source:'factory'},{currency:'USD'},{mode:'repair'},{illustrativeOnly:false},{totalKopeks:'123456789'},{advanceKopeks:r.advanceKopeks+1},{finalKopeks:-1},{finalKopeks:NaN},{contact:'qa@example.com'}])assert.equal(m.validateCalculation({...r,...patch}),null);
 for(const key of Object.keys(r)){const changed={...r};delete changed[key];assert.equal(m.validateCalculation(changed),null)}
 for(const value of [null,[],{},Object.assign(Object.create(null),r)])assert.equal(m.validateCalculation(value),null);
});
test('Formatting retains kopeks, ruble grouping, and no NaN/Infinity',()=>{
 assert.equal(m.format(200000000),'2 000 000\u00a0₽');assert.equal(m.format(123456789),'1 234 567,89\u00a0₽');assert.equal(m.format(1),'0,01\u00a0₽');assert.equal(m.format(0),'0\u00a0₽');assert.equal(m.format(101),'1,01\u00a0₽');assert.equal(m.format(m.MAX_KOPEKS),'1 000 000 000\u00a0₽');
 for(const value of [undefined,NaN,Infinity,-1,.5])assert.equal(m.format(value),'');
});
