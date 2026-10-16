import {POSITIONS} from '../src/catalog.js';
import assert from 'node:assert/strict';
assert.equal(POSITIONS.length,514);
assert.equal(new Set(POSITIONS.map(x=>x.id)).size,514);
assert.deepEqual(POSITIONS.map(x=>x.id),Array.from({length:514},(_,i)=>i+1));
for(const card of POSITIONS){assert.match(card.fileName,/\.png$/);assert.ok([1,2,3,4].includes(card.difficulty));assert.ok(card.imageSource.includes(card.fileName));}
console.log('OK: 514 fichas, IDs únicos, imágenes enlazadas, dificultad válida.');
