// ทดสอบสูตรคำนวณกับตัวอย่างในสิ่งที่ส่งมาด้วยของหนังสือ ว 651  (node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../lib/engine.js', import.meta.url), 'utf8') + '\nthis.E = BoqEngine;', ctx);
const E = ctx.E;
const I = (section, qty, cost, id) => ({ id: id ?? `${section}-${cost}-${qty}`, section, type: 'ITEM', qty, cost });

// ตัวอย่างที่ 1/2 งานก่อสร้างอาคาร
const bSec = [
  { code: '1', kind: 'construction', factor: 1.2592 },
  { code: '2', kind: 'equipment', factor: 1.07 },
  { code: '3', kind: 'special', factor: 1 },
];
const bCost = [5e6, 1e6, 8e5, 1e4, 2e5, 2e5, 1e4, 1e4, 4e6, 1e6, 5e5, 1e6, 3e5, 5e5, 2e5, 2e5, 1e5, 5e5, 2e5, 5e5];
const bQty = [100, 50, 80, 80, 80, 40, 100, 100, 100, 50, 200, 50, 200, 50, 80, 60, 80, 100, 80, 200];
const bItems = [
  ...bCost.map((c, i) => I('1', bQty[i], c, 'b' + i)),
  I('2', 50, 2e6, 't'), I('2', 50, 1.5e6, 'c'), I('3', 1, 5e5, 's1'), I('3', 1, 5e5, 's2'),
];

test('ตัวอย่างที่ 1 งานอาคาร — ร้อยละ 1.57', () => {
  const r = E.compute({ offer: 24800000 }, bSec, bItems);
  assert.equal(r.total, 25181816);
  assert.equal(r.P3, 381816);
  assert.equal(r.pct, 1.57);
  assert.equal(r.sumAdj, 24800000);
  const adj = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.equal(adj.b0.adj, 6194991.36); assert.equal(adj.b0.unitAdj, 61949.91);
  assert.equal(adj.b2.adj, 991544.44); assert.equal(adj.b2.unitAdj, 12394.30);
  assert.equal(adj.t.adj, 2106402.00); assert.equal(adj.c.adj, 1579801.50);
  assert.equal(adj.s1.adj, 500000);
  assert.equal(r.secTotals['1'].adj, 20113796.50);
  assert.equal(r.secTotals['2'].adj, 3686203.50);
});

test('ตัวอย่างที่ 2 งานอาคาร 3 จชต. (+5%) — ร้อยละ 6.46', () => {
  const r = E.compute({ offer: 24800000, markupPct: 5 }, bSec, bItems);
  assert.equal(r.total, 26440906.80);
  assert.equal(r.pct, 6.46);
  const adj = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.equal(adj.b0.adj, 6183088.17); assert.equal(adj.b0.unitAdj, 61830.88);
  assert.equal(adj.s1.adj, 525000);
  assert.equal(r.secTotals['1'].adj, 20071773.35);
  assert.equal(r.secTotals['2'].adj, 3678226.65);
  assert.equal(r.sumAdj, 24800000);
});

test('ตัวอย่างที่ 3 งานทาง สะพาน และท่อเหลี่ยม — ร้อยละ 9.39', () => {
  const rc = [[1000, 1970], [3000, 34320], [150, 53868], [3014.6, 1089295.56], [24, 4089.36], [27, 3148.47], [500, 44580],
    [1, 4680], [3, 8940], [3, 8940], [120, 34800], [48, 62400], [4, 13524], [1, 14280]];
  const exp = [2428.87, 42314.16, 66415.48, 1343017.65, 5041.89, 3881.84, 54964.03, 5770.11, 11022.39, 11022.39, 42905.97, 76934.84, 16674.14, 17606.24];
  const items = [...rc.map(([q, c], i) => I('1', q, c, 'r' + i)), I('3', 1, 500000, 'sp')];
  const r = E.compute({ offer: 2200000 }, [{ code: '1', kind: 'construction', factor: 1.3607 }, { code: '3', kind: 'special', factor: 1 }], items);
  assert.equal(r.total, 2376181.32);
  assert.equal(r.pct, 9.39);
  exp.forEach((v, i) => assert.equal(r.rows[i].adj, v, `รายการที่ ${i + 1}`));
  assert.equal(r.rows[0].unitAdj, 2.42);
  assert.equal(r.sumAdj, 2200000);
});

test('ตัวอย่างที่ 4 งานชลประทาน — ร้อยละ 4.20 (วงเงินรวมตรง, ต่างไม่เกิน 0.01 บาทต่อรายการ)', () => {
  const c = [1958.40, 15016.68, 29705.76, 41669.01, 87432.62, 118203.65, 243376.40, 36453.89, 33461.44, 2687.50, 52232.04, 140116.80, 322827.96, 68999.04, 423000, 264377, 72300];
  const q = [720, 252, 252, 13.72, 2486, 38.4, 6920, 12.4, 951.42, 86, 84, 240, 329, 144, 235, 482, 482];
  const exp = [2505.96, 19215.35, 38011.50, 53319.69, 111878.83, 151253.45, 311424.58, 46646.42, 42817.28, 3438.92, 66836.14, 179293.54, 413090.85, 88291.21, 541164.20, 338296.96, 92515.12];
  const items = [...c.map((x, i) => I('1', q[i], x, 'w' + i)), I('3', 1, 500000, 'sp')];
  const r = E.compute({ offer: 3000000 }, [{ code: '1', kind: 'construction', factor: 1.3357 }, { code: '3', kind: 'special', factor: 1 }], items);
  assert.equal(r.total, 3109714.96);
  assert.equal(r.pct, 4.2);
  assert.equal(r.sumAdj, 3000000);
  exp.forEach((v, i) => assert.ok(Math.abs(r.rows[i].adj - v) <= 0.0101, `รายการที่ ${i + 1}: ${r.rows[i].adj} vs ${v}`));
});

test('ไม่ปรับลดค่าใช้จ่ายพิเศษ และวงเงินรวมเท่าราคาเสนอเสมอ', () => {
  for (const offer of [20000000, 23456789.01, 25181816]) {
    const r = E.compute({ offer }, bSec, bItems);
    assert.equal(r.sumAdj, offer);
    assert.ok(r.checks.every((x) => x.ok));
  }
});

test('จำนวนเงินเป็นตัวอักษรไทย', () => {
  assert.equal(E.bahtText(24800000), 'ยี่สิบสี่ล้านแปดแสนบาทถ้วน');
  assert.equal(E.bahtText(3109714.96), 'สามล้านหนึ่งแสนเก้าพันเจ็ดร้อยสิบสี่บาทเก้าสิบหกสตางค์');
  assert.equal(E.bahtText(101), 'หนึ่งร้อยเอ็ดบาทถ้วน');
  assert.equal(E.bahtText(21000000), 'ยี่สิบเอ็ดล้านบาทถ้วน');
});
