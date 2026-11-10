/**
 * PosInventory.jsx – Point of Sale, Service Billing, Inventory Control and POS reporting
 * for the Slirus Accounts & Tax Compliance Center (mounted by AccountsManager.jsx).
 *
 * Every monetary / stock movement is written ATOMICALLY (one Firestore batch / transaction) to:
 *   1. the sale / stock document            (posSales, posProducts, stockMovements)
 *   2. the Double-Entry Books               (journalEntries  pos_<id>, stock_<id>, zvar_<id> …)
 *   3. the Tax Ledger                       (financeTransactions  pos_<id>, poscogs_<id> …)
 * so the Income Statement, Balance Sheet, CIT sheet and the stock valuation always agree.
 *
 * Sale journal:   Dr Cash / Dr Mobile Money wallet · Cr Sales (4000) / Service revenue (4100) /
 *                 Fees (4400) · Cr Output VAT (2400) · Dr COGS (5000) / Cr Inventory (1200) at average cost.
 * Stock receipt:  Dr Inventory (1200) · Cr Cash | Accounts Payable (2000) | Owner's Equity (3000, opening stock).
 * Stock adjust:   loss  Dr COGS / Cr Inventory (+ deductible Tax Ledger expense); gain Dr Inventory / Cr Other Income.
 * Z-Report close: cash over/short is posted (Dr Other Expense / Cr Cash  or  Dr Cash / Cr Other Income).
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, doc, onSnapshot, query, where, writeBatch, increment, runTransaction,
  setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';

// ─── Constants ──────────────────────────────────────────────────────────────
const VAT_RATE = 0.18;
const TAX_OPTIONS = ['Standard-Rated (18%)', 'Zero-Rated', 'Exempt', 'Not Applicable'];
const DEFAULT_REV_CATEGORIES = ['Retail Goods', 'Food & Beverage', 'Stationery & Printing', 'IT Services', 'Repairs & Maintenance', 'Training', 'Other'];
const BILLING_MODES = [
  { key: 'fixed', label: 'Fixed price (one unit)' },
  { key: 'quantity', label: 'Variable quantity (per unit)' },
  { key: 'time', label: 'Time-based (rate per hour)' },
];
const MOMO = '1010';
const A = { INVENTORY: '1200', AP: '2000', VAT: '2400', EQUITY: '3000', SALES: '4000', SERVICES: '4100', OTHER_INC: '4900', FEES: '4400', COGS: '5000', OTHER_EXP: '5990' };
const MOMO_NETWORKS = ['MTN MoMo', 'Airtel Money'];
const ADJUST_REASONS = ['Count correction', 'Damaged', 'Expired', 'Theft / loss', 'Found / returned', 'Used internally'];

const int = (n) => Math.round(Number(n) || 0);
const num = (n) => Number(n) || 0;
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowEmail = () => auth.currentUser?.email || 'unknown';
const daysAgoStr = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const sumBy = (arr, f) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);

// Highest tier whose minimum quantity is met (tiered bulk pricing).
const tierPrice = (tiers, qty, base) => {
  const hit = [...(tiers || [])].filter(t => num(t.minQty) > 0 && num(t.price) >= 0 && qty >= num(t.minQty)).sort((a, b) => num(b.minQty) - num(a.minQty))[0];
  return hit ? num(hit.price) : num(base);
};

// Dynamic tax & fee calculator. Prices are VAT-exclusive; the discount is spread pro-rata over lines.
const calcCart = (lines, adj) => {
  const priced = lines.map(l => { const unit = tierPrice(l.tiers, l.qty, l.unitPrice); return { ...l, unit, sub: int(unit * l.qty) }; });
  const subtotal = sumBy(priced, l => l.sub);
  const discount = Math.min(subtotal, adj.discountPct > 0 ? int(subtotal * adj.discountPct / 100) : int(adj.discountAmt));
  const ratio = subtotal > 0 ? discount / subtotal : 0;
  let productNet = 0, serviceNet = 0, vat = 0;
  const out = priced.map(l => {
    const net = int(l.sub * (1 - ratio));
    const lv = l.taxTreatment === TAX_OPTIONS[0] ? int(net * VAT_RATE) : 0;
    if (l.kind === 'product') productNet += net; else serviceNet += net;
    vat += lv;
    return { ...l, net, vat: lv };
  });
  const charge = int((subtotal - discount) * num(adj.serviceChargePct) / 100);
  const flat = int(adj.flatFee);
  const feeNet = charge + flat;
  const feeVat = adj.feesTaxable ? int(feeNet * VAT_RATE) : 0;
  vat += feeVat;
  return { lines: out, subtotal, discount, productNet, serviceNet, charge, flat, feeNet, feeVat, vat, total: productNet + serviceNet + feeNet + vat };
};

// Stock consumed by a cart: products sold directly + consumables linked to services. Also the COGS at average cost.
const computeUsage = (lines, productsById) => {
  const usage = {};
  const bump = (pid, key, q) => { usage[pid] = usage[pid] || { sold: 0, consumed: 0 }; usage[pid][key] += q; };
  const withCogs = lines.map(l => {
    let cogs = 0;
    if (l.kind === 'product' && l.refId && productsById[l.refId]) {
      const p = productsById[l.refId];
      if (p.trackStock !== false) { bump(l.refId, 'sold', l.qty); cogs += l.qty * num(p.avgCost); }
    } else if (l.kind === 'service') {
      (l.consumables || []).forEach(c => {
        const p = productsById[c.productId]; if (!p) return;
        const q = num(c.qty) * l.qty;
        bump(c.productId, 'consumed', q); cogs += q * num(p.avgCost);
      });
    }
    return { ...l, cogs: int(cogs) };
  });
  return { usage, lines: withCogs, cogs: sumBy(withCogs, l => l.cogs) };
};

// ─── Reports ────────────────────────────────────────────────────────────────
const buildReport = (sales) => {
  const live = sales.filter(s => s.status !== 'void');
  const voids = sales.filter(s => s.status === 'void');
  const r = { count: live.length, voidCount: voids.length, voidValue: sumBy(voids, s => s.total), subtotal: 0, discount: 0, fees: 0, net: 0, vat: 0, total: 0, cogs: 0, cash: 0, mobile: 0, byCategory: {} };
  live.forEach(s => {
    r.subtotal += num(s.subtotal); r.discount += num(s.discount); r.fees += num(s.feeNet);
    r.net += num(s.productNet) + num(s.serviceNet) + num(s.feeNet); r.vat += num(s.vat); r.total += num(s.total);
    r.cogs += num(s.cogs); r.cash += num(s.cashPortion); r.mobile += num(s.mobilePortion);
    (s.items || []).forEach(i => {
      const c = (r.byCategory[i.category || 'Other'] = r.byCategory[i.category || 'Other'] || { qty: 0, revenue: 0, cogs: 0 });
      c.qty += num(i.qty); c.revenue += num(i.net); c.cogs += num(i.cogs);
    });
    if (num(s.feeNet) > 0) { const c = (r.byCategory['Fees & Surcharges'] = r.byCategory['Fees & Surcharges'] || { qty: 0, revenue: 0, cogs: 0 }); c.revenue += num(s.feeNet); }
  });
  r.gp = r.net - r.cogs;
  return r;
};

// ─── Receipt / report text (thermal 80 mm, 42 chars) ────────────────────────
const W = 42;
const money = (n) => Math.round(num(n)).toLocaleString('en-UG');
const lr = (l, r) => String(l).slice(0, W - String(r).length - 1).padEnd(W - String(r).length) + r;
const ctr = (t) => ' '.repeat(Math.max(0, Math.floor((W - String(t).length) / 2))) + t;
const dash = '-'.repeat(W);
const receiptLines = (sale, co) => {
  const L = [ctr(co.name), ctr(co.address), ctr('Tel ' + co.phone), dash, lr('Receipt:', sale.receiptNo), lr('Date:', `${sale.date} ${sale.time || ''}`), lr('Cashier:', (sale.createdBy || '').split('@')[0]), sale.customer ? lr('Customer:', sale.customer) : null, dash].filter(Boolean);
  (sale.items || []).forEach(i => {
    L.push(String(i.name).slice(0, W)); L.push(lr(`  ${i.qty} x ${money(i.unit)}${i.note ? ' (' + i.note + ')' : ''}`, money(i.sub ?? i.net)));
  });
  L.push(dash, lr('Subtotal', money(sale.subtotal)));
  if (sale.discount > 0) L.push(lr('Discount', '-' + money(sale.discount)));
  if (sale.feeNet > 0) L.push(lr('Service charge / fees', money(sale.feeNet)));
  if (sale.vat > 0) L.push(lr('VAT 18%', money(sale.vat)));
  L.push(lr('TOTAL (UGX)', money(sale.total)), dash);
  (sale.payments || []).forEach(p => L.push(lr(p.method + (p.network ? ' ' + p.network : ''), money(p.amount)) + (p.ref ? '' : '')));
  (sale.payments || []).filter(p => p.ref).forEach(p => L.push(`  Ref: ${p.ref}`));
  if (sale.change > 0) L.push(lr('Change', money(sale.change)));
  L.push(dash, ctr('Thank you for your business!'), ctr(co.website || ''), '');
  return L;
};
const reportLines = (title, meta, r, co) => {
  const L = [ctr(co.name), ctr(title), ...meta.map(m => ctr(m)), dash,
    lr('Transactions', r.count), lr('Gross sales', money(r.subtotal)), lr('Discounts', '-' + money(r.discount)), lr('Fees & service charges', money(r.fees)),
    lr('Net revenue (excl. VAT)', money(r.net)), lr('VAT collected', money(r.vat)), lr('TOTAL TAKINGS', money(r.total)), dash,
    lr('Cash sales', money(r.cash)), lr('Mobile Money sales', money(r.mobile)), dash, 'REVENUE BY CATEGORY'];
  Object.entries(r.byCategory).forEach(([k, v]) => L.push(lr(' ' + k, money(v.revenue))));
  L.push(dash, lr('Cost of goods sold', money(r.cogs)), lr('GROSS PROFIT', money(r.gp)), dash, lr('Voided sales', `${r.voidCount} / ${money(r.voidValue)}`));
  return L;
};
const printText = (lines) => {
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) { alert('Allow pop-ups to print the receipt.'); return; }
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  w.document.write(`<html><head><title>Receipt</title><style>@page{size:80mm auto;margin:2mm}body{margin:0;width:76mm}pre{font:12px/1.25 "Courier New",monospace;margin:0;white-space:pre}</style></head><body><pre>${lines.map(esc).join('\n')}</pre><script>window.onload=function(){window.print();setTimeout(function(){window.close()},400)}<\/script></body></html>`);
  w.document.close();
};
// Raw ESC/POS over Web Serial (USB/serial thermal printers, Chrome/Edge).
let serialPort = null;
const sendEscPos = async (lines) => {
  if (!('serial' in navigator)) { alert('Direct thermal printing needs Chrome/Edge (Web Serial). Use “Print” instead.'); return; }
  try {
    if (!serialPort) { serialPort = await navigator.serial.requestPort(); await serialPort.open({ baudRate: 9600 }); }
    const enc = new TextEncoder();
    const bytes = [new Uint8Array([0x1B, 0x40]), enc.encode(lines.join('\n') + '\n\n\n\n'), new Uint8Array([0x1D, 0x56, 0x00])];
    const wr = serialPort.writable.getWriter();
    for (const b of bytes) await wr.write(b);
    wr.releaseLock();
  } catch (e) { serialPort = null; alert('Could not print to the thermal printer: ' + e.message); }
};

// ─── Small UI helpers ───────────────────────────────────────────────────────
const Modal = ({ ui, title, sub, onClose, onSubmit, submitLabel, children, wide, accent = '#0D9488', hideSubmit }) => {
  const { ms, cu, s } = ui;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true); setError('');
    try { const msg = await onSubmit(); if (msg) setError(msg); else onClose(); }
    catch (err) { setError(err.message || 'Something went wrong.'); }
    finally { setSaving(false); }
  };
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: wide || 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: `4px solid ${accent}` }}>
          <div><h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{title}</h3>{sub && <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{sub}</p>}</div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={ms.modalForm}>
          <div style={ms.body}>{children}{error && <p style={s.loginErr}>{error}</p>}</div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>{hideSubmit ? 'Close' : 'Cancel'}</button>
            {!hideSubmit && <button type="submit" style={{ ...ms.actionBtn, background: accent, color: '#fff' }} disabled={saving}>{saving ? 'Working…' : submitLabel}</button>}
          </div>
        </form>
      </div>
    </div>
  );
};
const Field = ({ ui, label, children, full }) => <div style={full ? { gridColumn: '1 / -1' } : {}}><label style={ui.cu.label}>{label}</label>{children}</div>;
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };

const TiersEditor = ({ ui, tiers, onChange }) => (
  <div style={{ gridColumn: '1 / -1' }}>
    <label style={ui.cu.label}>Tiered bulk pricing (price per unit from this quantity up)</label>
    {(tiers || []).map((t, i) => (
      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input type="number" min="1" style={ui.s.loginInput} placeholder="From qty" value={t.minQty} onChange={e => onChange(tiers.map((x, j) => j === i ? { ...x, minQty: e.target.value } : x))} />
        <input type="number" min="0" style={ui.s.loginInput} placeholder="Unit price" value={t.price} onChange={e => onChange(tiers.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} />
        <button type="button" style={ui.rm.miniBtn} onClick={() => onChange(tiers.filter((_, j) => j !== i))}>✕</button>
      </div>
    ))}
    <button type="button" style={ui.rm.miniBtn} onClick={() => onChange([...(tiers || []), { minQty: '', price: '' }])}>+ Add tier</button>
  </div>
);
const cleanTiers = (tiers) => (tiers || []).filter(t => num(t.minQty) > 0 && t.price !== '').map(t => ({ minQty: num(t.minQty), price: num(t.price) }));

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
const PosInventory = ({ products, transactions, accounts, accountBalances, canWrite, canEdit, canDelete, canApprove, logAudit, ctx, ui, company, categories = [] }) => {
  const { s, gd, cu, Badge, StatCard } = ui;
  const { fmtMoney, ensureBookAccounts, defaultCashCode, mkLine, isBalanced, removeLedgerRow, setOnce, accountsRef, exportTablePDF, downloadCSV, toCSV } = ctx;

  const [view, setView] = useState('pos'); // pos | services | inventory | reports
  const [services, setServices] = useState([]);
  const [sales, setSales] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [timers, setTimers] = useState([]);
  const [err, setErr] = useState('');

  // POS state
  const [cart, setCart] = useState([]);
  const [adj, setAdj] = useState({ discountPct: 0, discountAmt: 0, serviceChargePct: 0, flatFee: 0, feesTaxable: true });
  const [pay, setPay] = useState({ cash: '', mobile: '', network: MOMO_NETWORKS[0], ref: '' });
  const [customer, setCustomer] = useState('');
  const [search, setSearch] = useState('');
  const [showAdj, setShowAdj] = useState(false);
  const [busy, setBusy] = useState(false);
  const [posMsg, setPosMsg] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const [modal, setModal] = useState(null); // {type, data}
  const [tick, setTick] = useState(0);
  const [timerForm, setTimerForm] = useState({ serviceId: '', customer: '' });
  const searchRef = useRef(null);
  const hk = useRef({});

  // Reports state
  const [repFrom, setRepFrom] = useState(daysAgoStr(6));
  const [repTo, setRepTo] = useState(todayStr());
  const [invFilter, setInvFilter] = useState('All');

  const productsById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const servicesById = useMemo(() => Object.fromEntries(services.map(p => [p.id, p])), [services]);
  const revCategories = useMemo(() => [...new Set([...DEFAULT_REV_CATEGORIES, ...categories, ...products.map(p => p.category), ...services.map(p => p.category)].filter(Boolean))], [products, services, categories]);

  // ── Listeners ──
  useEffect(() => {
    const since = daysAgoStr(120);
    const u = [
      onSnapshot(collection(db, 'posServices'), sn => setServices(sn.docs.map(d => ({ id: d.id, ...d.data() }))), e => setErr('Could not load services: ' + e.message)),
      onSnapshot(query(collection(db, 'posSales'), where('date', '>=', since)), sn => setSales(sn.docs.map(d => ({ id: d.id, ...d.data() }))), e => setErr('Could not load sales: ' + e.message)),
      onSnapshot(query(collection(db, 'posShifts'), where('date', '>=', since)), sn => setShifts(sn.docs.map(d => ({ id: d.id, ...d.data() }))), e => setErr('Could not load registers: ' + e.message)),
      onSnapshot(query(collection(db, 'stockMovements'), where('date', '>=', since)), sn => setMovements(sn.docs.map(d => ({ id: d.id, ...d.data() }))), e => setErr('Could not load stock movements: ' + e.message)),
      onSnapshot(query(collection(db, 'posTimers'), where('status', '==', 'running')), sn => setTimers(sn.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
    ];
    return () => u.forEach(f => f());
  }, []);
  useEffect(() => { if (!timers.length) return; const i = setInterval(() => setTick(t => t + 1), 15000); return () => clearInterval(i); }, [timers.length]);

  const email = auth.currentUser?.email || '';
  const myShift = useMemo(() => shifts.find(sh => sh.status === 'open' && (sh.openedBy || '').toLowerCase() === email.toLowerCase()), [shifts, email]);
  const shiftSales = useMemo(() => myShift ? sales.filter(x => x.shiftId === myShift.id) : [], [sales, myShift]);

  // ── Stock helpers ──
  const stockState = (p) => {
    const q = num(p.stockQty), lvl = num(p.reorderLevel);
    if (p.trackStock === false) return 'n/a';
    if (q <= 0) return 'out';
    if (q <= lvl) return 'low';
    return 'ok';
  };
  const lowStock = useMemo(() => products.filter(p => p.active !== false && ['low', 'out'].includes(stockState(p))), [products]);
  const stockValue = useMemo(() => sumBy(products, p => Math.max(0, num(p.stockQty)) * num(p.avgCost)), [products]);
  const inventoryBooks = accountBalances?.[A.INVENTORY] || 0;

  // ── Cart ──
  const calc = useMemo(() => calcCart(cart, adj), [cart, adj]);
  const usageInfo = useMemo(() => computeUsage(calc.lines, productsById), [calc, productsById]);
  const mobileAmt = Math.min(calc.total, Math.max(0, num(pay.mobile)));
  const cashDue = calc.total - mobileAmt;
  const cashTendered = pay.cash === '' ? cashDue : num(pay.cash);
  const change = Math.max(0, cashTendered - cashDue);

  const addLine = useCallback((item, kind, qtyOverride, note) => {
    setPosMsg('');
    setCart(prev => {
      const idx = prev.findIndex(l => l.refId === item.id && l.kind === kind && !l.note && !note && item.billingMode !== 'time');
      if (idx >= 0) return prev.map((l, i) => i === idx ? { ...l, qty: l.qty + (qtyOverride || 1) } : l);
      return [...prev, {
        key: Math.random().toString(36).slice(2, 8), kind, refId: item.id || null, name: item.name, category: item.category || 'Other',
        qty: qtyOverride || 1, unitPrice: num(kind === 'product' ? item.price : item.rate ?? item.price), tiers: item.tiers || [],
        taxTreatment: item.taxTreatment || TAX_OPTIONS[0], billingMode: item.billingMode || 'fixed', unitLabel: item.unit || '',
        consumables: item.consumables || [], object: item.object || 'General / Corporate', note: note || '',
      }];
    });
  }, []);
  const setQty = (key, q) => setCart(prev => prev.map(l => l.key === key ? { ...l, qty: q } : l));
  const clearCart = () => { setCart([]); setPay({ cash: '', mobile: '', network: MOMO_NETWORKS[0], ref: '' }); setAdj({ discountPct: 0, discountAmt: 0, serviceChargePct: 0, flatFee: 0, feesTaxable: true }); setCustomer(''); setPosMsg(''); };

  const catalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = [
      ...products.filter(p => p.active !== false).map(p => ({ ...p, _kind: 'product' })),
      ...services.filter(p => p.active !== false).map(p => ({ ...p, _kind: 'service' })),
    ];
    return q ? items.filter(i => [i.name, i.sku, i.barcode, i.category].some(v => (v || '').toLowerCase().includes(q))) : items;
  }, [products, services, search]);
  const quickItems = useMemo(() => [...products.filter(p => p.active !== false && p.quick).map(p => ({ ...p, _kind: 'product' })), ...services.filter(p => p.active !== false && p.quick).map(p => ({ ...p, _kind: 'service' }))].slice(0, 9), [products, services]);

  const onSearchEnter = (e) => {
    if (e.key !== 'Enter') return;
    const q = search.trim().toLowerCase(); if (!q) return;
    const exact = catalog.find(i => (i.sku || '').toLowerCase() === q || (i.barcode || '').toLowerCase() === q) || (catalog.length === 1 ? catalog[0] : null);
    if (exact) { addLine(exact, exact._kind); setSearch(''); }
  };

  // ── Register (shift) ──
  const openShift = async (floatAmt) => {
    await setDoc(doc(collection(db, 'posShifts')), { date: todayStr(), openedAt: serverTimestamp(), openedBy: email, openingFloat: int(floatAmt), status: 'open' });
    await logAudit('Opened POS register', 'posShifts', `Float ${fmtMoney(floatAmt)}`);
  };

  // ── Complete sale (atomic: sale + stock + stock movements + journal + Tax Ledger) ──
  const completeSale = async () => {
    if (busy) return;
    if (!myShift) { setPosMsg('Open the register first.'); return; }
    if (!cart.length) { setPosMsg('The cart is empty.'); return; }
    if (cart.some(l => !(num(l.qty) > 0))) { setPosMsg('Every line needs a quantity above zero.'); return; }
    if (calc.total <= 0) { setPosMsg('The total must be above zero.'); return; }
    if (mobileAmt > 0 && !pay.ref.trim()) { setPosMsg('Enter the Mobile Money transaction reference.'); return; }
    if (cashTendered < cashDue) { setPosMsg(`Cash tendered is short by ${fmtMoney(cashDue - cashTendered)}.`); return; }
    for (const [pid, u] of Object.entries(usageInfo.usage)) {
      const p = productsById[pid]; const need = u.sold + u.consumed;
      if (p && !p.allowNegative && num(p.stockQty) < need) { setPosMsg(`Not enough stock: ${p.name} has ${p.stockQty} ${p.unit || ''}, needs ${need}.`); return; }
    }
    setBusy(true); setPosMsg('');
    try {
      const list = accountsRef.current;
      const cashCode = defaultCashCode(list);
      const saleRef = doc(collection(db, 'posSales')); const id = saleRef.id;
      const date = todayStr(); const time = new Date().toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
      const receiptNo = `POS-${date.replace(/-/g, '').slice(2)}-${Date.now().toString().slice(-5)}`;
      const cogs = usageInfo.cogs;
      const payments = [];
      if (cashDue > 0) payments.push({ method: 'Cash', amount: cashDue });
      if (mobileAmt > 0) payments.push({ method: 'Mobile Money', amount: mobileAmt, network: pay.network, ref: pay.ref.trim() });
      const usage = Object.entries(usageInfo.usage).map(([pid, u]) => ({ productId: pid, name: productsById[pid]?.name || pid, sold: u.sold, consumed: u.consumed, unitCost: num(productsById[pid]?.avgCost) }));
      const items = usageInfo.lines.map(l => ({ kind: l.kind, refId: l.refId, name: l.name, category: l.category, qty: num(l.qty), unit: l.unit, sub: l.sub, net: l.net, vat: l.vat, cogs: l.cogs, taxTreatment: l.taxTreatment, note: l.note || '', billingMode: l.billingMode }));
      const sale = {
        receiptNo, date, time, items, customer: customer.trim(), shiftId: myShift.id, status: 'completed',
        subtotal: calc.subtotal, discount: calc.discount, serviceChargePct: num(adj.serviceChargePct), flatFee: calc.flat, feeNet: calc.feeNet, feeVat: calc.feeVat,
        productNet: calc.productNet, serviceNet: calc.serviceNet, vat: calc.vat, total: calc.total, cogs,
        payments, cashPortion: cashDue, mobilePortion: mobileAmt, cashTendered: cashDue > 0 ? cashTendered : 0, change: cashDue > 0 ? change : 0,
        usage, journalId: `pos_${id}`, createdAt: serverTimestamp(), createdBy: email,
      };

      const lines = [
        mkLine(list, cashCode, cashDue, 0), mkLine(list, MOMO, mobileAmt, 0),
        mkLine(list, A.SALES, 0, calc.productNet), mkLine(list, A.SERVICES, 0, calc.serviceNet), mkLine(list, A.FEES, 0, calc.feeNet), mkLine(list, A.VAT, 0, calc.vat),
        mkLine(list, A.COGS, cogs, 0), mkLine(list, A.INVENTORY, 0, cogs),
      ].filter(l => l.debit > 0 || l.credit > 0);
      if (!isBalanced(lines)) throw new Error('The sale journal does not balance — nothing was saved.');
      await ensureBookAccounts(list, [cashCode, ...lines.map(l => l.accountCode)]);

      const batch = writeBatch(db);
      batch.set(saleRef, sale);
      usage.forEach(u => {
        const p = productsById[u.productId]; const qty = u.sold + u.consumed;
        batch.update(doc(db, 'posProducts', u.productId), { stockQty: increment(-qty), lastSoldAt: serverTimestamp(), updatedAt: serverTimestamp() });
        batch.set(doc(collection(db, 'stockMovements')), {
          productId: u.productId, productName: p.name, type: u.consumed > 0 && u.sold === 0 ? 'consumption' : 'sale', qty: -qty, unitCost: u.unitCost, value: int(qty * u.unitCost),
          balanceAfter: num(p.stockQty) - qty, saleId: id, ref: receiptNo, date, reason: u.consumed > 0 && u.sold === 0 ? 'Used by service' : 'Sold', createdAt: serverTimestamp(), createdBy: email,
        });
      });
      batch.set(doc(db, 'journalEntries', `pos_${id}`), {
        date, reference: receiptNo, memo: `POS sale ${receiptNo}${customer ? ' — ' + customer : ''}`, entryType: 'cash', lines, status: 'posted', sourcePosId: id,
        createdBy: email, createdAt: serverTimestamp(),
      });
      const net = calc.productNet + calc.serviceNet + calc.feeNet;
      const objects = [...new Set(items.map(i => cart.find(c => c.refId === i.refId)?.object).filter(Boolean))];
      batch.set(doc(db, 'financeTransactions', `pos_${id}`), {
        date, type: 'Income', object: objects.length === 1 ? objects[0] : 'General / Corporate', category: calc.productNet >= calc.serviceNet ? 'Product Sales' : 'Service Fees / Contracts',
        description: `POS sale ${receiptNo}${customer ? ' — ' + customer : ''}`, grossAmount: net, vatTreatment: calc.vat > 0 ? TAX_OPTIONS[0] : TAX_OPTIONS[3], vatAmount: calc.vat,
        whtWithheld: false, whtAmount: 0, whtCertificateNo: '', counterpartyName: customer.trim() || 'Walk-in customer', counterpartyTIN: '',
        paymentMethod: mobileAmt > 0 ? 'Mobile Money' : 'Cash', ref: receiptNo, sourcePosId: id, posKind: 'sale', booksPosted: true, createdAt: serverTimestamp(), createdBy: email,
      });
      if (cogs > 0) {
        batch.set(doc(db, 'financeTransactions', `poscogs_${id}`), {
          date, type: 'Expense', object: 'General / Corporate', category: 'Raw Materials / Inputs', description: `Cost of goods sold — ${receiptNo}`, grossAmount: cogs,
          vatTreatment: TAX_OPTIONS[3], vatAmount: 0, whtWithheld: false, whtAmount: 0, whtCertificateNo: '', counterpartyName: 'Stock', counterpartyTIN: '',
          paymentMethod: 'Cash', ref: receiptNo, sourcePosId: id, posKind: 'cogs', booksPosted: true, createdAt: serverTimestamp(), createdBy: email,
        });
      }
      await batch.commit();

      const nowLow = usage.map(u => productsById[u.productId]).filter(p => p && (num(p.stockQty) - (usage.find(x => x.productId === p.id).sold + usage.find(x => x.productId === p.id).consumed)) <= num(p.reorderLevel) && p.trackStock !== false);
      setLastSale({ ...sale, id, createdAt: null });
      setModal({ type: 'receipt' });
      clearCart();
      if (nowLow.length) setPosMsg(`⚠ Low stock: ${nowLow.map(p => p.name).join(', ')} — reorder soon.`);
      await logAudit('POS sale', receiptNo, `${fmtMoney(calc.total)} · ${payments.map(p => p.method).join('+')}`);
    } catch (e) { console.error(e); setPosMsg('Sale not saved: ' + e.message); }
    finally { setBusy(false); }
  };

  // ── Void a sale (restores stock, voids journal, removes Tax Ledger rows) ──
  const voidSale = async (sale) => {
    const sh = shifts.find(x => x.id === sale.shiftId);
    if (sh && sh.status === 'closed') { alert('This sale belongs to a closed register (Z-Report issued). It can no longer be voided.'); return; }
    const reason = window.prompt(`Void ${sale.receiptNo} (${fmtMoney(sale.total)})? Enter a reason:`);
    if (!reason) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'posSales', sale.id), { status: 'void', voidedAt: serverTimestamp(), voidedBy: email, voidReason: reason });
      (sale.usage || []).forEach(u => {
        const qty = num(u.sold) + num(u.consumed); if (!qty || !productsById[u.productId]) return;
        batch.update(doc(db, 'posProducts', u.productId), { stockQty: increment(qty), updatedAt: serverTimestamp() });
        batch.set(doc(collection(db, 'stockMovements')), { productId: u.productId, productName: u.name, type: 'void', qty, unitCost: u.unitCost, value: int(qty * num(u.unitCost)), saleId: sale.id, ref: sale.receiptNo, date: todayStr(), reason: 'Sale voided', createdAt: serverTimestamp(), createdBy: email });
      });
      batch.update(doc(db, 'journalEntries', `pos_${sale.id}`), { status: 'void' });
      await batch.commit();
      await removeLedgerRow(`pos_${sale.id}`);
      await removeLedgerRow(`poscogs_${sale.id}`);
      await logAudit('Voided POS sale', sale.receiptNo, reason);
    } catch (e) { alert('Could not void: ' + e.message); }
  };

  // ── Time-based billing tracker ──
  const startTimer = async () => {
    const svc = servicesById[timerForm.serviceId];
    if (!svc) { setPosMsg('Choose a time-based service to start.'); return; }
    await setDoc(doc(collection(db, 'posTimers')), { serviceId: svc.id, serviceName: svc.name, customer: timerForm.customer.trim(), startedAt: Date.now(), status: 'running', createdBy: email, createdAt: serverTimestamp() });
    setTimerForm({ ...timerForm, customer: '' });
  };
  const elapsedMin = (t) => Math.max(0, (Date.now() - num(t.startedAt)) / 60000);
  const billedHours = (t, svc) => {
    const inc = Math.max(1, num(svc?.incrementMinutes) || 15), min = num(svc?.minMinutes) || 0;
    const mins = Math.max(min, Math.ceil(elapsedMin(t) / inc) * inc);
    return { mins, hours: Math.round(mins / 60 * 100) / 100 };
  };
  const stopTimer = async (t) => {
    const svc = servicesById[t.serviceId]; if (!svc) { alert('The service for this timer no longer exists.'); return; }
    const b = billedHours(t, svc);
    await updateDoc(doc(db, 'posTimers', t.id), { status: 'billed', stoppedAt: Date.now(), billedMinutes: b.mins });
    addLine(svc, 'service', b.hours, `${b.mins} min${t.customer ? ' · ' + t.customer : ''}`);
    if (t.customer) setCustomer(t.customer);
    setView('pos');
  };
  const cancelTimer = async (t) => { if (window.confirm('Cancel this timer without billing?')) await updateDoc(doc(db, 'posTimers', t.id), { status: 'cancelled' }); };

  // ── Hotkeys: F2 search · F4 clear · F7 custom item · F8 cash exact · F9 mobile exact · F10 complete · Alt+1-9 quick buttons ──
  hk.current = { completeSale, clearCart, quickItems, addLine, total: calc.total, openCustom: () => setModal({ type: 'custom' }) };
  useEffect(() => {
    if (view !== 'pos') return;
    const onKey = (e) => {
      const h = hk.current;
      if (modal) return;
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === 'F4') { e.preventDefault(); h.clearCart(); }
      else if (e.key === 'F7') { e.preventDefault(); h.openCustom(); }
      else if (e.key === 'F8') { e.preventDefault(); setPay(p => ({ ...p, mobile: '', cash: '' })); }
      else if (e.key === 'F9') { e.preventDefault(); setPay(p => ({ ...p, mobile: String(h.total), cash: '' })); }
      else if (e.key === 'F10') { e.preventDefault(); h.completeSale(); }
      else if (e.altKey && /^[1-9]$/.test(e.key)) { const it = h.quickItems[Number(e.key) - 1]; if (it) { e.preventDefault(); h.addLine(it, it._kind); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, modal]);

  // ── Stock: receive / adjust (atomic transaction: product + movement + journal [+ Tax Ledger]) ──
  const receiveStock = async (p, { qty, cost, supplier, funding, ref }) => {
    qty = num(qty); cost = num(cost);
    if (!(qty > 0)) return 'Enter a quantity above zero.';
    if (!(cost >= 0)) return 'Enter the unit cost (excluding VAT).';
    const list = accountsRef.current; const cashCode = defaultCashCode(list);
    const credit = funding === 'credit' ? A.AP : funding === 'opening' ? A.EQUITY : cashCode;
    const value = int(qty * cost);
    const lines = [mkLine(list, A.INVENTORY, value, 0), mkLine(list, credit, 0, value)];
    await ensureBookAccounts(list, [A.INVENTORY, credit]);
    const mid = doc(collection(db, 'stockMovements')).id;
    await runTransaction(db, async (tx) => {
      const pref = doc(db, 'posProducts', p.id); const snap = await tx.get(pref); const cur = snap.data();
      const oldQty = Math.max(0, num(cur.stockQty));
      const avg = (oldQty + qty) > 0 ? ((oldQty * num(cur.avgCost)) + qty * cost) / (oldQty + qty) : cost;
      tx.update(pref, { stockQty: num(cur.stockQty) + qty, avgCost: Math.round(avg * 100) / 100, lastCost: cost, updatedAt: serverTimestamp() });
      tx.set(doc(db, 'stockMovements', mid), { productId: p.id, productName: p.name, type: 'purchase', qty, unitCost: cost, value, balanceAfter: num(cur.stockQty) + qty, ref: ref || '', supplier: supplier || '', reason: funding === 'opening' ? 'Opening stock' : funding === 'credit' ? 'Purchase on credit' : 'Purchase (paid)', date: todayStr(), createdAt: serverTimestamp(), createdBy: email });
      tx.set(doc(db, 'journalEntries', `stock_${mid}`), { date: todayStr(), reference: ref || `STK-${mid.slice(0, 6).toUpperCase()}`, memo: `Stock received: ${qty} × ${p.name}${supplier ? ' from ' + supplier : ''}${funding === 'opening' ? ' (opening balance)' : ''}`, entryType: funding === 'credit' ? 'payable' : 'general', lines, status: 'posted', sourceStockId: mid, createdBy: email, createdAt: serverTimestamp() });
    });
    await logAudit('Received stock', p.name, `${qty} @ ${fmtMoney(cost)}`);
    return '';
  };
  const adjustStock = async (p, { counted, reason }) => {
    if (counted === '' || num(counted) < 0) return 'Enter the counted quantity.';
    const list = accountsRef.current; const mid = doc(collection(db, 'stockMovements')).id;
    const codes = [A.INVENTORY, A.COGS, A.OTHER_INC]; await ensureBookAccounts(list, codes);
    await runTransaction(db, async (tx) => {
      const pref = doc(db, 'posProducts', p.id); const cur = (await tx.get(pref)).data();
      const delta = num(counted) - num(cur.stockQty); if (delta === 0) return;
      const value = int(Math.abs(delta) * num(cur.avgCost));
      tx.update(pref, { stockQty: num(counted), updatedAt: serverTimestamp() });
      tx.set(doc(db, 'stockMovements', mid), { productId: p.id, productName: p.name, type: 'adjustment', qty: delta, unitCost: num(cur.avgCost), value, balanceAfter: num(counted), reason, date: todayStr(), createdAt: serverTimestamp(), createdBy: email });
      if (value > 0) {
        const lines = delta < 0 ? [mkLine(list, A.COGS, value, 0), mkLine(list, A.INVENTORY, 0, value)] : [mkLine(list, A.INVENTORY, value, 0), mkLine(list, A.OTHER_INC, 0, value)];
        tx.set(doc(db, 'journalEntries', `stockadj_${mid}`), { date: todayStr(), reference: `ADJ-${mid.slice(0, 6).toUpperCase()}`, memo: `Stock adjustment (${reason}): ${p.name} ${delta > 0 ? '+' : ''}${delta}`, entryType: 'general', lines, status: 'posted', sourceStockId: mid, createdBy: email, createdAt: serverTimestamp() });
        tx.set(doc(db, 'financeTransactions', `stockadj_${mid}`), { date: todayStr(), type: delta < 0 ? 'Expense' : 'Income', object: 'General / Corporate', category: delta < 0 ? 'Raw Materials / Inputs' : 'Other Income', description: `Stock adjustment (${reason}): ${p.name}`, grossAmount: value, vatTreatment: TAX_OPTIONS[3], vatAmount: 0, whtWithheld: false, whtAmount: 0, whtCertificateNo: '', counterpartyName: 'Stock', counterpartyTIN: '', paymentMethod: 'Cash', ref: `ADJ-${mid.slice(0, 6).toUpperCase()}`, sourcePosId: `stockadj_${mid}`, posKind: 'adjustment', booksPosted: true, createdAt: serverTimestamp(), createdBy: email });
      }
    });
    await logAudit('Adjusted stock', p.name, `${reason} → ${counted}`);
    return '';
  };

  // ── Catalogue CRUD ──
  const saveProduct = async (f, isEdit) => {
    if (!f.name.trim()) return 'Product name is required.';
    if (f.price === '' || num(f.price) < 0) return 'Enter a selling price (excluding VAT).';
    const data = {
      name: f.name.trim(), sku: f.sku.trim(), barcode: f.barcode.trim(), category: f.category.trim() || 'Retail Goods', unit: f.unit.trim() || 'pcs', price: num(f.price),
      tiers: cleanTiers(f.tiers), taxTreatment: f.taxTreatment, reorderLevel: num(f.reorderLevel), reorderQty: num(f.reorderQty), supplier: f.supplier.trim(), object: f.object,
      quick: !!f.quick, active: f.active !== false, allowNegative: !!f.allowNegative, trackStock: f.trackStock !== false, kind: 'product',
    };
    if (isEdit) { await updateDoc(doc(db, 'posProducts', f.id), { ...data, updatedAt: serverTimestamp() }); await logAudit('Updated product', data.name); }
    else { await setDoc(doc(collection(db, 'posProducts')), { ...data, stockQty: 0, avgCost: 0, createdAt: serverTimestamp(), createdBy: email }); await logAudit('Added product', data.name); }
    return '';
  };
  const deleteProduct = async (p) => {
    if (num(p.stockQty) !== 0) { alert('Only products with zero stock can be deleted. Adjust the stock to 0 first, or deactivate the product.'); return; }
    if (!window.confirm(`Delete product "${p.name}"? Its movement history stays in the audit trail.`)) return;
    try { await deleteDoc(doc(db, 'posProducts', p.id)); await logAudit('Deleted product', p.name); } catch (e) { alert('Could not delete: ' + e.message); }
  };
  const saveService = async (f, isEdit) => {
    if (!f.name.trim()) return 'Service name is required.';
    if (f.rate === '' || num(f.rate) < 0) return 'Enter the rate / price (excluding VAT).';
    const data = {
      name: f.name.trim(), category: f.category.trim() || 'IT Services', billingMode: f.billingMode, unit: f.unit.trim() || (f.billingMode === 'time' ? 'hour' : 'unit'), rate: num(f.rate),
      tiers: cleanTiers(f.tiers), taxTreatment: f.taxTreatment, minMinutes: num(f.minMinutes), incrementMinutes: num(f.incrementMinutes) || 15,
      consumables: (f.consumables || []).filter(c => c.productId && num(c.qty) > 0).map(c => ({ productId: c.productId, qty: num(c.qty) })),
      quick: !!f.quick, active: f.active !== false, object: f.object, kind: 'service',
    };
    if (isEdit) { await updateDoc(doc(db, 'posServices', f.id), { ...data, updatedAt: serverTimestamp() }); await logAudit('Updated service', data.name); }
    else { await setDoc(doc(collection(db, 'posServices')), { ...data, createdAt: serverTimestamp(), createdBy: email }); await logAudit('Added service', data.name); }
    return '';
  };
  const deleteService = async (sv) => {
    if (!window.confirm(`Delete service "${sv.name}"?`)) return;
    try { await deleteDoc(doc(db, 'posServices', sv.id)); await logAudit('Deleted service', sv.name); } catch (e) { alert('Could not delete: ' + e.message); }
  };

  // ── X / Z reports ──
  const xReport = useMemo(() => buildReport(shiftSales), [shiftSales]);
  const expectedCash = myShift ? num(myShift.openingFloat) + xReport.cash : 0;
  const printX = () => printText(reportLines('X-REPORT (interim, register stays open)', [`Opened ${myShift.date} by ${(myShift.openedBy || '').split('@')[0]}`, `Printed ${new Date().toLocaleString('en-UG')}`], xReport, company).concat([dash, lr('Opening float', money(myShift.openingFloat)), lr('Expected cash in drawer', money(expectedCash)), '']));
  const closeShift = async ({ counted }) => {
    if (counted === '' || num(counted) < 0) return 'Count the cash in the drawer and enter it.';
    const rep = buildReport(shiftSales); const expected = num(myShift.openingFloat) + rep.cash; const variance = int(num(counted) - expected);
    const list = accountsRef.current; const cashCode = defaultCashCode(list);
    if (Math.abs(variance) >= 1) {
      const lines = variance < 0 ? [mkLine(list, A.OTHER_EXP, -variance, 0), mkLine(list, cashCode, 0, -variance)] : [mkLine(list, cashCode, variance, 0), mkLine(list, A.OTHER_INC, 0, variance)];
      await ensureBookAccounts(list, [cashCode, A.OTHER_EXP, A.OTHER_INC]);
      await setOnce('journalEntries', `zvar_${myShift.id}`, { date: todayStr(), reference: `ZVAR-${myShift.id.slice(0, 5).toUpperCase()}`, memo: `Register cash ${variance < 0 ? 'shortage' : 'overage'} at close`, entryType: 'cash', lines, status: 'posted', sourcePosId: myShift.id, createdBy: email, createdAt: serverTimestamp() });
      await setOnce('financeTransactions', `zvar_${myShift.id}`, { date: todayStr(), type: variance < 0 ? 'Expense' : 'Income', object: 'General / Corporate', category: variance < 0 ? 'Other Operating Expense' : 'Other Income', description: `Register cash ${variance < 0 ? 'shortage' : 'overage'} (Z-Report)`, grossAmount: Math.abs(variance), vatTreatment: TAX_OPTIONS[3], vatAmount: 0, whtWithheld: false, whtAmount: 0, whtCertificateNo: '', counterpartyName: 'Register', counterpartyTIN: '', paymentMethod: 'Cash', ref: `ZVAR-${myShift.id.slice(0, 5).toUpperCase()}`, sourcePosId: myShift.id, posKind: 'variance', booksPosted: true, createdAt: serverTimestamp(), createdBy: email });
    }
    const zNumber = `Z-${todayStr().replace(/-/g, '')}-${String(shifts.filter(x => x.status === 'closed').length + 1).padStart(3, '0')}`;
    const zReport = { ...rep, openingFloat: num(myShift.openingFloat), expectedCash: expected, countedCash: num(counted), variance };
    await updateDoc(doc(db, 'posShifts', myShift.id), { status: 'closed', closedAt: serverTimestamp(), closedBy: email, countedCash: num(counted), expectedCash: expected, variance, zNumber, zReport });
    printText(reportLines(`Z-REPORT ${zNumber}`, [`Register closed ${new Date().toLocaleString('en-UG')}`], rep, company).concat([dash, lr('Opening float', money(myShift.openingFloat)), lr('Expected cash', money(expected)), lr('Counted cash', money(counted)), lr('Over / (short)', money(variance)), '']));
    await logAudit('Closed register (Z-Report)', zNumber, `Takings ${fmtMoney(rep.total)} · variance ${fmtMoney(variance)}`);
    return '';
  };

  // Period report (category breakdown + daily P&L)
  const periodSales = useMemo(() => sales.filter(x => x.date >= repFrom && x.date <= repTo), [sales, repFrom, repTo]);
  const periodReport = useMemo(() => buildReport(periodSales), [periodSales]);
  const dailyPL = useMemo(() => {
    const days = {};
    const slot = (d) => (days[d] = days[d] || { date: d, sales: [], opex: 0, other: 0 });
    periodSales.forEach(x => slot(x.date).sales.push(x));
    transactions.filter(t => typeof t.date === 'string' && t.date >= repFrom && t.date <= repTo).forEach(t => {
      if (t.posKind === 'sale' || t.posKind === 'cogs') return;
      const d = slot(t.date.slice(0, 10)); const amt = num(t.grossAmount);
      if (t.posKind === 'adjustment' || t.posKind === 'variance') d.other += t.type === 'Expense' ? -amt : amt;
      else if (t.type === 'Expense') d.opex += amt;
    });
    return Object.values(days).sort((a, b) => b.date.localeCompare(a.date)).map(d => {
      const r = buildReport(d.sales);
      return { date: d.date, count: r.count, revenue: r.net, cogs: r.cogs, gp: r.gp, gpPct: r.net > 0 ? r.gp / r.net * 100 : 0, vat: r.vat, opex: d.opex, other: d.other, net: r.gp - d.opex + d.other };
    });
  }, [periodSales, transactions, repFrom, repTo]);

  // ═══ Render ═══
  const tabBtn = (k, label, badge) => <button style={{ ...s.tab, ...(view === k ? s.tabActive : {}) }} onClick={() => setView(k)}>{label}{badge > 0 && <span style={{ ...s.tabCount, background: '#FEF3C7', color: '#92400E' }}>{badge}</span>}</button>;
  const stateBadge = (p) => { const st = stateBadgeKey(p); return <Badge text={st.text} tone={st.tone} />; };
  const stateBadgeKey = (p) => ({ n_a: 0, ok: { text: 'In stock', tone: 'green' }, low: { text: 'Low stock', tone: 'amber' }, out: { text: 'Out of stock', tone: 'red' }, 'n/a': { text: 'Not tracked', tone: 'gray' } }[stockState(p)]);
  const recent = useMemo(() => [...movements].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 80), [movements]);
  const invRows = useMemo(() => products.filter(p => invFilter === 'All' || (invFilter === 'Low' ? ['low', 'out'].includes(stockState(p)) : invFilter === 'Inactive' ? p.active === false : true)), [products, invFilter]);
  const posBtn = { border: '1.5px solid #D0DCE8', background: '#fff', borderRadius: 8, padding: '10px 8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' };

  return (
    <>
      {err && <div style={s.errorBanner}>⚠️ {err}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={s.tabs}>{tabBtn('pos', '🛒 Checkout')}{tabBtn('services', '🛠 Services')}{tabBtn('inventory', '📦 Inventory', lowStock.length)}{tabBtn('reports', '📊 Reports')}</div>
        <div style={{ fontSize: 12.5, color: '#5A7A9A' }}>{myShift ? <>Register open since {myShift.date} · float {fmtMoney(myShift.openingFloat)}</> : 'Register closed'}</div>
      </div>

      {/* ───────── CHECKOUT ───────── */}
      {view === 'pos' && (!myShift ? (
        <div style={{ ...s.tableWrap, padding: 28, textAlign: 'center' }}>
          <h3 style={{ ...s.sectionHead, fontSize: 18 }}>Open the register to start selling</h3>
          <p style={{ color: '#5A7A9A', fontSize: 13.5 }}>Enter the cash float in the drawer. Every sale this session is tied to this register and summarised in its Z-Report.</p>
          {canWrite ? <OpenShiftForm ui={ui} onOpen={openShift} /> : <p style={{ color: '#9AAAB8' }}>You need Finance write access to open a register.</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(320px,1fr)', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input ref={searchRef} style={{ ...s.searchInput, minWidth: 0 }} placeholder="Scan barcode / type SKU or name, Enter to add  (F2)" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={onSearchEnter} autoFocus />
              <button style={s.tab} onClick={() => setModal({ type: 'custom' })}>＋ Custom item (F7)</button>
            </div>
            {quickItems.length > 0 && !search && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ ...cu.label, marginBottom: 6 }}>Quick buttons · Alt+1…9</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                  {quickItems.map((it, i) => (
                    <button key={it.id} style={{ ...posBtn, background: '#F0FDFA', borderColor: '#99F6E4' }} onClick={() => addLine(it, it._kind)}>
                      <div style={{ fontSize: 10.5, color: '#0D9488', fontWeight: 700 }}>Alt+{i + 1}</div><div style={{ fontWeight: 700, color: '#1A3C5E', fontSize: 13 }}>{it.name}</div><div style={{ fontSize: 12, color: '#5A7A9A' }}>{fmtMoney(it._kind === 'product' ? it.price : it.rate)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {catalog.map(it => {
                const out = it._kind === 'product' && it.trackStock !== false && num(it.stockQty) <= 0 && !it.allowNegative;
                return (
                  <button key={it._kind + it.id} disabled={out} style={{ ...posBtn, opacity: out ? 0.45 : 1 }} onClick={() => addLine(it, it._kind)}>
                    <div style={{ fontWeight: 700, color: '#1A3C5E', fontSize: 13 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: '#5A7A9A' }}>{fmtMoney(it._kind === 'product' ? it.price : it.rate)}{it._kind === 'service' && it.billingMode === 'time' ? '/hr' : ''}</div>
                    <div style={{ fontSize: 11, color: out ? '#B91C1C' : stockState(it) === 'low' ? '#B45309' : '#9AAAB8' }}>{it._kind === 'product' ? (it.trackStock === false ? it.category : `${it.stockQty} ${it.unit || ''} in stock`) : `Service · ${it.category}`}</div>
                  </button>
                );
              })}
              {catalog.length === 0 && <p style={{ color: '#9AAAB8', fontSize: 13 }}>Nothing matches. Add products in Inventory and services in Services.</p>}
            </div>

            <div style={{ ...s.tableWrap, marginTop: 14, padding: 14 }}>
              <h3 style={{ ...s.sectionHead, marginBottom: 8 }}>⏱ Time-based billing tracker</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <select style={{ ...cu.select, width: 'auto', flex: 1 }} value={timerForm.serviceId} onChange={e => setTimerForm({ ...timerForm, serviceId: e.target.value })}>
                  <option value="">Time-based service…</option>{services.filter(x => x.billingMode === 'time' && x.active !== false).map(x => <option key={x.id} value={x.id}>{x.name} — {fmtMoney(x.rate)}/hr</option>)}
                </select>
                <input style={{ ...s.loginInput, width: 160 }} placeholder="Customer / seat" value={timerForm.customer} onChange={e => setTimerForm({ ...timerForm, customer: e.target.value })} />
                <button style={s.btnShortlist} onClick={startTimer}>▶ Start</button>
              </div>
              {timers.length === 0 ? <p style={{ fontSize: 12.5, color: '#9AAAB8', margin: 0 }}>No running timers.</p> : timers.map(t => {
                const b = billedHours(t, servicesById[t.serviceId]);
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid #F0F4F8', gap: 8, flexWrap: 'wrap' }} data-tick={tick}>
                    <span><strong>{t.serviceName}</strong> {t.customer && `· ${t.customer}`}<span style={{ color: '#5A7A9A', fontSize: 12 }}> — {Math.floor(elapsedMin(t))} min elapsed, bills {b.mins} min ({b.hours} h) = {fmtMoney(b.hours * num(servicesById[t.serviceId]?.rate))}</span></span>
                    <span style={{ display: 'flex', gap: 6 }}><button style={s.btnShortlist} onClick={() => stopTimer(t)}>■ Stop & add to cart</button><button style={s.btnReject} onClick={() => cancelTimer(t)}>Cancel</button></span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart */}
          <div style={{ ...s.tableWrap, padding: 14, position: 'sticky', top: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ ...s.sectionHead, margin: 0 }}>Current sale</h3>
              <button style={s.btnReject} onClick={clearCart}>Clear (F4)</button>
            </div>
            <input style={{ ...s.loginInput, margin: '10px 0' }} placeholder="Customer name (optional)" value={customer} onChange={e => setCustomer(e.target.value)} />
            {cart.length === 0 ? <p style={{ color: '#9AAAB8', fontSize: 13 }}>Cart is empty.</p> : (
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                {calc.lines.map(l => (
                  <div key={l.key} style={{ padding: '7px 0', borderBottom: '1px solid #F0F4F8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1A3C5E' }}>{l.name}{l.note && <span style={{ fontWeight: 400, color: '#9AAAB8' }}> ({l.note})</span>}</span>
                      <span style={{ fontWeight: 700 }}>{fmtMoney(l.sub)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <input type="number" min="0" step={l.billingMode === 'time' || l.billingMode === 'quantity' ? '0.01' : '1'} style={{ ...s.loginInput, width: 80, padding: '5px 8px', fontSize: 13 }} value={cart.find(c => c.key === l.key)?.qty} onChange={e => setQty(l.key, e.target.value === '' ? '' : Number(e.target.value))} />
                      <span style={{ fontSize: 12, color: '#5A7A9A' }}>× {fmtMoney(l.unit)}{l.unit !== l.unitPrice ? ' (bulk price)' : ''}{l.vat > 0 ? ' + VAT' : ''}</span>
                      <button style={{ ...ui.rm.miniBtn, marginLeft: 'auto' }} onClick={() => setCart(prev => prev.filter(c => c.key !== l.key))}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button style={{ ...ui.rm.miniBtn, marginTop: 10 }} onClick={() => setShowAdj(v => !v)}>{showAdj ? '▾' : '▸'} Discount, service charge &amp; fees</button>
            {showAdj && (
              <div style={{ ...grid2, marginTop: 8 }}>
                <Field ui={ui} label="Discount %"><input type="number" min="0" max="100" style={s.loginInput} value={adj.discountPct || ''} onChange={e => setAdj({ ...adj, discountPct: num(e.target.value), discountAmt: 0 })} /></Field>
                <Field ui={ui} label="or Discount UGX"><input type="number" min="0" style={s.loginInput} value={adj.discountAmt || ''} onChange={e => setAdj({ ...adj, discountAmt: num(e.target.value), discountPct: 0 })} /></Field>
                <Field ui={ui} label="Service charge %"><input type="number" min="0" style={s.loginInput} value={adj.serviceChargePct || ''} onChange={e => setAdj({ ...adj, serviceChargePct: num(e.target.value) })} /></Field>
                <Field ui={ui} label="Flat fee UGX (delivery…)"><input type="number" min="0" style={s.loginInput} value={adj.flatFee || ''} onChange={e => setAdj({ ...adj, flatFee: num(e.target.value) })} /></Field>
                <label style={{ gridColumn: '1 / -1', fontSize: 12.5, color: '#1A3C5E', fontWeight: 600 }}><input type="checkbox" checked={adj.feesTaxable} onChange={e => setAdj({ ...adj, feesTaxable: e.target.checked })} /> Charge 18% VAT on fees</label>
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <div style={cu.credRow}><span style={cu.credLabel}>Subtotal</span><span style={cu.credVal}>{fmtMoney(calc.subtotal)}</span></div>
              {calc.discount > 0 && <div style={cu.credRow}><span style={cu.credLabel}>Discount</span><span style={cu.credVal}>−{fmtMoney(calc.discount)}</span></div>}
              {calc.feeNet > 0 && <div style={cu.credRow}><span style={cu.credLabel}>Fees</span><span style={cu.credVal}>{fmtMoney(calc.feeNet)}</span></div>}
              <div style={cu.credRow}><span style={cu.credLabel}>VAT 18%</span><span style={cu.credVal}>{fmtMoney(calc.vat)}</span></div>
              <div style={cu.credRow}><span style={cu.credLabel}>Total</span><span style={{ ...cu.credVal, fontSize: 22, color: '#0D9488' }}>{fmtMoney(calc.total)}</span></div>
            </div>
            <div style={{ ...grid2, marginTop: 8 }}>
              <Field ui={ui} label="Mobile Money (F9 = all)"><input type="number" min="0" style={s.loginInput} value={pay.mobile} onChange={e => setPay({ ...pay, mobile: e.target.value })} /></Field>
              <Field ui={ui} label={`Cash tendered (due ${money(cashDue)})`}><input type="number" min="0" style={s.loginInput} placeholder={String(cashDue)} value={pay.cash} onChange={e => setPay({ ...pay, cash: e.target.value })} /></Field>
              {mobileAmt > 0 && <>
                <Field ui={ui} label="Network"><select style={cu.select} value={pay.network} onChange={e => setPay({ ...pay, network: e.target.value })}>{MOMO_NETWORKS.map(n => <option key={n}>{n}</option>)}</select></Field>
                <Field ui={ui} label="MoMo transaction ID"><input style={s.loginInput} value={pay.ref} onChange={e => setPay({ ...pay, ref: e.target.value })} /></Field>
              </>}
            </div>
            {cashDue > 0 && cashTendered >= cashDue && <p style={{ margin: '8px 0 0', fontWeight: 700, color: '#065F46' }}>Change: {fmtMoney(change)}</p>}
            {posMsg && <p style={{ ...s.loginErr, fontWeight: 600 }}>{posMsg}</p>}
            <button style={{ ...s.loginBtn, background: '#0D9488' }} disabled={busy || !canWrite || cart.length === 0} onClick={completeSale}>{busy ? 'Posting…' : `✓ Complete sale (F10) · ${fmtMoney(calc.total)}`}</button>
            <p style={{ fontSize: 11, color: '#9AAAB8', margin: '8px 0 0' }}>F2 search · F4 clear · F7 custom item · F8 cash exact · F9 mobile money · F10 complete · Alt+1–9 quick buttons</p>
          </div>
        </div>
      ))}

      {/* ───────── SERVICES ───────── */}
      {view === 'services' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ ...s.pageSub, margin: 0 }}>Fixed, variable-quantity and time-based services, with bulk tiers and consumables that draw down stock when sold.</p>
            {canWrite && <button style={{ ...s.loginBtn, width: 'auto', marginTop: 0, padding: '9px 16px', background: '#0D9488' }} onClick={() => setModal({ type: 'service', data: null })}>➕ New Service</button>}
          </div>
          <div style={s.tableWrap}>
            {services.length === 0 ? <div style={s.tableMsg}>No services yet.</div> : (
              <table style={s.table}><thead><tr style={s.thead}><th style={s.th}>Service</th><th style={s.th}>Billing</th><th style={s.th}>Rate</th><th style={s.th}>Tax</th><th style={s.th}>Bulk tiers</th><th style={s.th}>Consumables</th><th style={s.th}>Actions</th></tr></thead>
                <tbody>{services.map(sv => (
                  <tr key={sv.id} style={s.tr}>
                    <td style={s.td}><strong>{sv.name}</strong>{sv.active === false && <Badge text="Inactive" tone="gray" />}<div style={{ fontSize: 11, color: '#9AAAB8' }}>{sv.category}</div></td>
                    <td style={s.td}>{BILLING_MODES.find(b => b.key === sv.billingMode)?.label}{sv.billingMode === 'time' && <div style={{ fontSize: 11, color: '#9AAAB8' }}>min {sv.minMinutes || 0} · per {sv.incrementMinutes || 15} min</div>}</td>
                    <td style={s.td}>{fmtMoney(sv.rate)}{sv.billingMode === 'time' ? '/hr' : ''}</td>
                    <td style={s.td}>{sv.taxTreatment}</td>
                    <td style={{ ...s.td, fontSize: 12 }}>{(sv.tiers || []).map(t => `${t.minQty}+ → ${money(t.price)}`).join(' · ') || '—'}</td>
                    <td style={{ ...s.td, fontSize: 12 }}>{(sv.consumables || []).map(c => `${c.qty} × ${productsById[c.productId]?.name || '?'}`).join(', ') || '—'}</td>
                    <td style={s.td}><div style={{ display: 'flex', gap: 6 }}>{canWrite && <button style={s.btnView} onClick={() => setModal({ type: 'service', data: sv })}>Edit</button>}{canDelete && <button style={s.btnDelete} onClick={() => deleteService(sv)}>Delete</button>}</div></td>
                  </tr>))}</tbody></table>
            )}
          </div>
        </>
      )}

      {/* ───────── INVENTORY ───────── */}
      {view === 'inventory' && (
        <>
          <div style={s.trackGrid}>
            <StatCard label="Stock Value (at cost)" value={fmtMoney(stockValue)} accent="#1A3C5E" sub={`${products.length} product(s)`} />
            <StatCard label="Inventory in Books (1200)" value={fmtMoney(inventoryBooks)} accent={Math.abs(inventoryBooks - stockValue) < 1 ? '#10B981' : '#DC2626'} sub={Math.abs(inventoryBooks - stockValue) < 1 ? '✓ Agrees with stock valuation' : `Difference ${fmtMoney(inventoryBooks - stockValue)} — check manual journals on 1200`} />
            <StatCard label="Low / Out of Stock" value={lowStock.length} accent={lowStock.length ? '#B45309' : '#10B981'} sub="At or below reorder level" />
          </div>
          {lowStock.length > 0 && (
            <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 10, padding: '12px 16px', margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <strong style={{ color: '#92400E' }}>⚠ Reorder alerts ({lowStock.length})</strong>
                <button style={s.tab} onClick={() => exportTablePDF('Reorder List', lowStock, [{ label: 'SKU', get: p => p.sku }, { label: 'Product', get: p => p.name }, { label: 'Supplier', get: p => p.supplier }, { label: 'In stock', get: p => p.stockQty }, { label: 'Reorder level', get: p => p.reorderLevel }, { label: 'Suggested order qty', get: p => Math.max(num(p.reorderQty), num(p.reorderLevel) * 2 - num(p.stockQty)) }, { label: 'Last cost', get: p => p.lastCost || p.avgCost }])}>⬇ Reorder list PDF</button>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#92400E' }}>{lowStock.map(p => <span key={p.id} style={{ display: 'inline-block', marginRight: 14 }}>{p.name}: <strong>{p.stockQty}</strong>/{p.reorderLevel}</span>)}</div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 10px', flexWrap: 'wrap', gap: 8 }}>
            <div style={s.tabs}>{['All', 'Low', 'Inactive'].map(f => <button key={f} style={{ ...s.tab, ...(invFilter === f ? s.tabActive : {}) }} onClick={() => setInvFilter(f)}>{f === 'Low' ? 'Low / Out' : f}</button>)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.tab} onClick={() => exportTablePDF('Stock Valuation', products, [{ label: 'SKU', get: p => p.sku }, { label: 'Product', get: p => p.name }, { label: 'Qty', get: p => p.stockQty }, { label: 'Avg cost', get: p => p.avgCost }, { label: 'Value', get: p => int(Math.max(0, num(p.stockQty)) * num(p.avgCost)) }, { label: 'Reorder level', get: p => p.reorderLevel }])}>⬇ Valuation PDF</button>
              {canWrite && <button style={{ ...s.loginBtn, width: 'auto', marginTop: 0, padding: '9px 16px', background: '#0D9488' }} onClick={() => setModal({ type: 'product', data: null })}>➕ New Product</button>}
            </div>
          </div>
          <div style={s.tableWrap}>
            {invRows.length === 0 ? <div style={s.tableMsg}>No products.</div> : (
              <table style={s.table}><thead><tr style={s.thead}><th style={s.th}>Product</th><th style={s.th}>Stock</th><th style={s.th}>Avg cost</th><th style={s.th}>Value</th><th style={s.th}>Price</th><th style={s.th}>Reorder at / qty</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
                <tbody>{invRows.map(p => (
                  <tr key={p.id} style={s.tr}>
                    <td style={s.td}><strong>{p.name}</strong><div style={{ fontSize: 11, color: '#9AAAB8' }}>{p.sku || '—'} · {p.category}{p.active === false ? ' · inactive' : ''}</div></td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{p.trackStock === false ? '—' : `${p.stockQty} ${p.unit || ''}`}</td>
                    <td style={s.td}>{fmtMoney(p.avgCost)}</td>
                    <td style={s.td}>{fmtMoney(Math.max(0, num(p.stockQty)) * num(p.avgCost))}</td>
                    <td style={s.td}>{fmtMoney(p.price)}</td>
                    <td style={s.td}>{p.reorderLevel || 0} / {p.reorderQty || 0}</td>
                    <td style={s.td}>{stateBadge(p)}</td>
                    <td style={s.td}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {canWrite && p.trackStock !== false && <button style={s.btnShortlist} onClick={() => setModal({ type: 'receive', data: p })}>Receive</button>}
                      {canApprove && p.trackStock !== false && <button style={s.btnView} onClick={() => setModal({ type: 'adjust', data: p })}>Adjust</button>}
                      {canWrite && <button style={s.btnView} onClick={() => setModal({ type: 'product', data: p })}>Edit</button>}
                      {canDelete && <button style={s.btnDelete} onClick={() => deleteProduct(p)}>Delete</button>}
                    </div></td>
                  </tr>))}</tbody></table>
            )}
          </div>
          <h2 style={{ ...s.sectionHead, margin: '24px 0 10px' }}>Stock movement ledger (last 120 days)</h2>
          <div style={s.tableWrap}>
            {recent.length === 0 ? <div style={s.tableMsg}>No movements yet.</div> : (
              <table style={s.table}><thead><tr style={s.thead}><th style={s.th}>Date</th><th style={s.th}>Product</th><th style={s.th}>Type</th><th style={{ ...s.th, textAlign: 'right' }}>Qty</th><th style={{ ...s.th, textAlign: 'right' }}>Unit cost</th><th style={{ ...s.th, textAlign: 'right' }}>Value</th><th style={{ ...s.th, textAlign: 'right' }}>Balance</th><th style={s.th}>Reference</th></tr></thead>
                <tbody>{recent.map(m => (
                  <tr key={m.id} style={s.tr}>
                    <td style={s.td}>{m.date}</td><td style={s.td}>{m.productName}</td>
                    <td style={s.td}><Badge text={m.type} tone={{ purchase: 'green', sale: 'blue', consumption: 'blue', adjustment: 'amber', void: 'gray' }[m.type] || 'gray'} /><div style={{ fontSize: 11, color: '#9AAAB8' }}>{m.reason}</div></td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: num(m.qty) < 0 ? '#B91C1C' : '#065F46' }}>{num(m.qty) > 0 ? '+' : ''}{m.qty}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(m.unitCost)}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(m.value)}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{m.balanceAfter ?? '—'}</td><td style={s.td}>{m.ref || '—'}</td>
                  </tr>))}</tbody></table>
            )}
          </div>
        </>
      )}

      {/* ───────── REPORTS ───────── */}
      {view === 'reports' && (
        <>
          <h2 style={{ ...s.sectionHead, marginTop: 0 }}>X-Report — current register (interim)</h2>
          {!myShift ? <p style={{ color: '#9AAAB8', fontSize: 13 }}>Open the register in Checkout to see an X-Report.</p> : (
            <>
              <div style={s.trackGrid}>
                <StatCard label="Takings so far" value={fmtMoney(xReport.total)} accent="#0D9488" sub={`${xReport.count} sale(s)`} />
                <StatCard label="Net revenue" value={fmtMoney(xReport.net)} accent="#1A3C5E" sub={`VAT ${fmtMoney(xReport.vat)}`} />
                <StatCard label="Cash sales" value={fmtMoney(xReport.cash)} accent="#10B981" sub={`Expected in drawer ${fmtMoney(expectedCash)}`} />
                <StatCard label="Mobile Money" value={fmtMoney(xReport.mobile)} accent="#7C3AED" />
                <StatCard label="Gross profit" value={fmtMoney(xReport.gp)} accent="#059669" sub={`COGS ${fmtMoney(xReport.cogs)}`} />
              </div>
              <div style={{ display: 'flex', gap: 8, margin: '12px 0 8px', flexWrap: 'wrap' }}>
                <button style={s.tab} onClick={printX}>🖨 Print X-Report (80 mm)</button>
                <button style={s.tab} onClick={() => sendEscPos(reportLines('X-REPORT', [`Printed ${new Date().toLocaleString('en-UG')}`], xReport, company))}>🔌 Thermal printer (USB)</button>
                {canApprove && <button style={{ ...s.loginBtn, width: 'auto', marginTop: 0, padding: '8px 16px', background: '#B45309' }} onClick={() => setModal({ type: 'close' })}>⏹ Close register &amp; issue Z-Report</button>}
              </div>
              <h3 style={{ ...s.sectionHead, marginTop: 16 }}>This register's sales</h3>
              <SalesTable ui={ui} sales={shiftSales} fmtMoney={fmtMoney} onVoid={canApprove ? voidSale : null} onPrint={(x) => { setLastSale(x); setModal({ type: 'receipt' }); }} />
            </>
          )}

          <h2 style={{ ...s.sectionHead, margin: '28px 0 10px' }}>Closed registers (Z-Reports)</h2>
          <div style={s.tableWrap}>
            {shifts.filter(x => x.status === 'closed').length === 0 ? <div style={s.tableMsg}>No Z-Reports yet.</div> : (
              <table style={s.table}><thead><tr style={s.thead}><th style={s.th}>Z-Report</th><th style={s.th}>Date</th><th style={s.th}>Cashier</th><th style={{ ...s.th, textAlign: 'right' }}>Takings</th><th style={{ ...s.th, textAlign: 'right' }}>Gross profit</th><th style={{ ...s.th, textAlign: 'right' }}>Cash variance</th><th style={s.th}></th></tr></thead>
                <tbody>{[...shifts].filter(x => x.status === 'closed').sort((a, b) => (b.zNumber || '').localeCompare(a.zNumber || '')).map(x => (
                  <tr key={x.id} style={s.tr}><td style={{ ...s.td, fontWeight: 700 }}>{x.zNumber}</td><td style={s.td}>{x.date}</td><td style={s.td}>{(x.openedBy || '').split('@')[0]}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(x.zReport?.total)}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(x.zReport?.gp)}</td>
                    <td style={{ ...s.td, textAlign: 'right', color: num(x.variance) < 0 ? '#B91C1C' : '#065F46', fontWeight: 700 }}>{fmtMoney(x.variance)}</td>
                    <td style={s.td}><button style={s.btnView} onClick={() => printText(reportLines(`Z-REPORT ${x.zNumber}`, [`Register ${x.date}`], x.zReport, company).concat([dash, lr('Opening float', money(x.zReport.openingFloat)), lr('Expected cash', money(x.zReport.expectedCash)), lr('Counted cash', money(x.zReport.countedCash)), lr('Over / (short)', money(x.zReport.variance)), '']))}>🖨 Reprint</button></td></tr>))}</tbody></table>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '28px 0 10px', flexWrap: 'wrap' }}>
            <h2 style={{ ...s.sectionHead, margin: 0 }}>Revenue by category &amp; daily profit and loss</h2>
            <input type="date" style={{ ...s.loginInput, width: 'auto' }} value={repFrom} onChange={e => setRepFrom(e.target.value)} /><span>to</span>
            <input type="date" style={{ ...s.loginInput, width: 'auto' }} value={repTo} onChange={e => setRepTo(e.target.value)} />
          </div>
          <div style={s.trackGrid}>
            <StatCard label="Net revenue" value={fmtMoney(periodReport.net)} accent="#1A3C5E" sub={`${periodReport.count} sale(s)`} />
            <StatCard label="Cost of goods sold" value={fmtMoney(periodReport.cogs)} accent="#EF4444" />
            <StatCard label="Gross profit" value={fmtMoney(periodReport.gp)} accent="#059669" sub={periodReport.net > 0 ? `${(periodReport.gp / periodReport.net * 100).toFixed(1)}% margin` : ''} />
            <StatCard label="VAT collected" value={fmtMoney(periodReport.vat)} accent="#7C3AED" />
          </div>
          <h3 style={{ ...s.sectionHead, margin: '18px 0 8px' }}>Revenue category breakdown</h3>
          <div style={s.tableWrap}>
            <table style={s.table}><thead><tr style={s.thead}><th style={s.th}>Category</th><th style={{ ...s.th, textAlign: 'right' }}>Qty</th><th style={{ ...s.th, textAlign: 'right' }}>Revenue</th><th style={{ ...s.th, textAlign: 'right' }}>COGS</th><th style={{ ...s.th, textAlign: 'right' }}>Gross profit</th><th style={{ ...s.th, textAlign: 'right' }}>Share</th></tr></thead>
              <tbody>{Object.entries(periodReport.byCategory).sort((a, b) => b[1].revenue - a[1].revenue).map(([k, v]) => (
                <tr key={k} style={s.tr}><td style={s.td}>{k}</td><td style={{ ...s.td, textAlign: 'right' }}>{v.qty || '—'}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(v.revenue)}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(v.cogs)}</td><td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(v.revenue - v.cogs)}</td><td style={{ ...s.td, textAlign: 'right' }}>{periodReport.net > 0 ? (v.revenue / periodReport.net * 100).toFixed(1) + '%' : '—'}</td></tr>))}
                {Object.keys(periodReport.byCategory).length === 0 && <tr><td style={s.tableMsg} colSpan={6}>No sales in this period.</td></tr>}</tbody></table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 8px' }}>
            <h3 style={{ ...s.sectionHead, margin: 0 }}>Daily profit &amp; loss</h3>
            <button style={s.tab} onClick={() => exportTablePDF(`Daily P&L ${repFrom} to ${repTo}`, dailyPL, [{ label: 'Date', get: d => d.date }, { label: 'Sales', get: d => d.count }, { label: 'Revenue', get: d => d.revenue }, { label: 'COGS', get: d => d.cogs }, { label: 'Gross profit', get: d => d.gp }, { label: 'Operating expenses', get: d => d.opex }, { label: 'Stock/cash adj.', get: d => d.other }, { label: 'Net profit', get: d => d.net }])}>⬇ Export PDF</button>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}><thead><tr style={s.thead}><th style={s.th}>Date</th><th style={{ ...s.th, textAlign: 'right' }}>Sales</th><th style={{ ...s.th, textAlign: 'right' }}>Revenue</th><th style={{ ...s.th, textAlign: 'right' }}>COGS</th><th style={{ ...s.th, textAlign: 'right' }}>Gross profit</th><th style={{ ...s.th, textAlign: 'right' }}>Margin</th><th style={{ ...s.th, textAlign: 'right' }}>Op. expenses</th><th style={{ ...s.th, textAlign: 'right' }}>Stock / cash adj.</th><th style={{ ...s.th, textAlign: 'right' }}>Net profit</th></tr></thead>
              <tbody>{dailyPL.map(d => (
                <tr key={d.date} style={s.tr}><td style={s.td}>{d.date}</td><td style={{ ...s.td, textAlign: 'right' }}>{d.count}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(d.revenue)}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(d.cogs)}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(d.gp)}</td><td style={{ ...s.td, textAlign: 'right' }}>{d.gpPct.toFixed(1)}%</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(d.opex)}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(d.other)}</td><td style={{ ...s.td, textAlign: 'right', fontWeight: 800, color: d.net >= 0 ? '#065F46' : '#B91C1C' }}>{fmtMoney(d.net)}</td></tr>))}
                {dailyPL.length === 0 && <tr><td style={s.tableMsg} colSpan={9}>No activity in this period.</td></tr>}</tbody></table>
          </div>
          <p style={{ fontSize: 11.5, color: '#9AAAB8', marginTop: 8 }}>Operating expenses come from the Tax Ledger (payroll, IT Ops, vouchers, manual entries) on the day they were posted. Net profit here is a management view; the CIT engine still applies capital allowances and loss relief.</p>

          <h2 style={{ ...s.sectionHead, margin: '24px 0 10px' }}>All sales in period</h2>
          <SalesTable ui={ui} sales={periodSales} fmtMoney={fmtMoney} onVoid={canApprove ? voidSale : null} onPrint={(x) => { setLastSale(x); setModal({ type: 'receipt' }); }} />
        </>
      )}

      {/* ───────── MODALS ───────── */}
      {modal?.type === 'receipt' && lastSale && (
        <Modal ui={ui} title={`Receipt ${lastSale.receiptNo}`} sub="Sale posted to stock, books and Tax Ledger" accent="#10B981" onClose={() => setModal(null)} onSubmit={async () => ''} hideSubmit wide={460}>
          <pre style={{ font: '12px/1.3 "Courier New",monospace', background: '#F7F9FC', padding: 12, borderRadius: 8, overflowX: 'auto', margin: 0 }}>{receiptLines(lastSale, company).join('\n')}</pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" style={s.btnShortlist} onClick={() => printText(receiptLines(lastSale, company))}>🖨 Print (80 mm)</button>
            <button type="button" style={s.btnView} onClick={() => sendEscPos(receiptLines(lastSale, company))}>🔌 Thermal printer (USB)</button>
          </div>
        </Modal>
      )}
      {modal?.type === 'custom' && <CustomItemModal ui={ui} categories={revCategories} onClose={() => setModal(null)} onAdd={(it) => addLine({ ...it, id: null }, 'service', it.qty, it.note)} />}
      {modal?.type === 'product' && <ProductModal ui={ui} initial={modal.data} categories={revCategories} onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal?.type === 'service' && <ServiceModal ui={ui} initial={modal.data} categories={revCategories} products={products} onClose={() => setModal(null)} onSave={saveService} />}
      {modal?.type === 'receive' && <ReceiveModal ui={ui} product={modal.data} fmtMoney={fmtMoney} onClose={() => setModal(null)} onSave={(f) => receiveStock(modal.data, f)} />}
      {modal?.type === 'adjust' && <AdjustModal ui={ui} product={modal.data} onClose={() => setModal(null)} onSave={(f) => adjustStock(modal.data, f)} />}
      {modal?.type === 'close' && myShift && <CloseShiftModal ui={ui} report={xReport} float={num(myShift.openingFloat)} expected={expectedCash} fmtMoney={fmtMoney} onClose={() => setModal(null)} onSave={closeShift} />}
    </>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────
const OpenShiftForm = ({ ui, onOpen }) => {
  const [f, setF] = useState('');
  return <div style={{ display: 'inline-flex', gap: 8 }}><input type="number" min="0" style={{ ...ui.s.loginInput, width: 200 }} placeholder="Opening cash float (UGX)" value={f} onChange={e => setF(e.target.value)} /><button style={{ ...ui.s.loginBtn, width: 'auto', marginTop: 0, padding: '10px 20px' }} onClick={() => onOpen(f || 0)}>Open register</button></div>;
};

const SalesTable = ({ ui, sales, fmtMoney, onVoid, onPrint }) => {
  const { s, Badge } = ui;
  const rows = [...sales].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return (
    <div style={s.tableWrap}>
      {rows.length === 0 ? <div style={s.tableMsg}>No sales.</div> : (
        <table style={s.table}><thead><tr style={s.thead}><th style={s.th}>Receipt</th><th style={s.th}>Items</th><th style={s.th}>Paid by</th><th style={{ ...s.th, textAlign: 'right' }}>Total</th><th style={{ ...s.th, textAlign: 'right' }}>COGS</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
          <tbody>{rows.map(x => (
            <tr key={x.id} style={s.tr}>
              <td style={s.td}><strong>{x.receiptNo}</strong><div style={{ fontSize: 11, color: '#9AAAB8' }}>{x.date} {x.time}{x.customer ? ' · ' + x.customer : ''}</div></td>
              <td style={{ ...s.td, fontSize: 12.5 }}>{(x.items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}</td>
              <td style={s.td}>{(x.payments || []).map(p => p.method).join(' + ')}</td>
              <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(x.total)}</td><td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(x.cogs)}</td>
              <td style={s.td}><Badge text={x.status} tone={x.status === 'void' ? 'gray' : 'green'} /></td>
              <td style={s.td}><div style={{ display: 'flex', gap: 6 }}><button style={s.btnView} onClick={() => onPrint(x)}>🖨 Receipt</button>{onVoid && x.status !== 'void' && <button style={s.btnReject} onClick={() => onVoid(x)}>Void</button>}</div></td>
            </tr>))}</tbody></table>
      )}
    </div>
  );
};

const CustomItemModal = ({ ui, categories, onClose, onAdd }) => {
  const { s, cu } = ui;
  const [f, setF] = useState({ name: '', price: '', qty: 1, category: 'IT Services', taxTreatment: TAX_OPTIONS[0], note: '' });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal ui={ui} title="Custom service / item" sub="One-off line for this sale only (no stock). Save it under Services to reuse it." onClose={onClose} submitLabel="Add to cart"
      onSubmit={async () => { if (!f.name.trim() || !(num(f.price) >= 0) || f.price === '') return 'Name and price are required.'; if (!(num(f.qty) > 0)) return 'Quantity must be above zero.'; onAdd({ name: f.name.trim(), rate: num(f.price), price: num(f.price), qty: num(f.qty), category: f.category, taxTreatment: f.taxTreatment, billingMode: 'quantity', note: f.note }); return ''; }}>
      <div style={grid2}>
        <Field ui={ui} label="Description" full><input style={s.loginInput} value={f.name} onChange={e => u('name', e.target.value)} autoFocus /></Field>
        <Field ui={ui} label="Unit price (excl. VAT)"><input type="number" min="0" style={s.loginInput} value={f.price} onChange={e => u('price', e.target.value)} /></Field>
        <Field ui={ui} label="Quantity"><input type="number" min="0" step="0.01" style={s.loginInput} value={f.qty} onChange={e => u('qty', e.target.value)} /></Field>
        <Field ui={ui} label="Revenue category"><input list="rev-cats" style={s.loginInput} value={f.category} onChange={e => u('category', e.target.value)} /><datalist id="rev-cats">{categories.map(c => <option key={c} value={c} />)}</datalist></Field>
        <Field ui={ui} label="Tax"><select style={cu.select} value={f.taxTreatment} onChange={e => u('taxTreatment', e.target.value)}>{TAX_OPTIONS.map(t => <option key={t}>{t}</option>)}</select></Field>
      </div>
    </Modal>
  );
};

const ProductModal = ({ ui, initial, categories, onClose, onSave }) => {
  const { s, cu } = ui;
  const [f, setF] = useState(initial ? { sku: '', barcode: '', supplier: '', reorderLevel: 0, reorderQty: 0, tiers: [], object: 'General / Corporate', ...initial } : { name: '', sku: '', barcode: '', category: 'Retail Goods', unit: 'pcs', price: '', tiers: [], taxTreatment: TAX_OPTIONS[0], reorderLevel: 5, reorderQty: 20, supplier: '', object: 'General / Corporate', quick: false, active: true, allowNegative: false, trackStock: true });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal ui={ui} wide={640} title={initial ? 'Edit product' : 'New product'} sub="Stock quantity changes only through Receive stock, sales and Adjust, so books and stock never drift." onClose={onClose} submitLabel={initial ? '💾 Save' : '➕ Add product'} onSubmit={() => onSave(f, !!initial)}>
      <div style={grid2}>
        <Field ui={ui} label="Name" full><input style={s.loginInput} value={f.name} onChange={e => u('name', e.target.value)} /></Field>
        <Field ui={ui} label="SKU"><input style={s.loginInput} value={f.sku} onChange={e => u('sku', e.target.value)} /></Field>
        <Field ui={ui} label="Barcode"><input style={s.loginInput} value={f.barcode} onChange={e => u('barcode', e.target.value)} /></Field>
        <Field ui={ui} label="Revenue category"><input list="prod-cats" style={s.loginInput} value={f.category} onChange={e => u('category', e.target.value)} /><datalist id="prod-cats">{categories.map(c => <option key={c} value={c} />)}</datalist></Field>
        <Field ui={ui} label="Unit"><input style={s.loginInput} value={f.unit} onChange={e => u('unit', e.target.value)} placeholder="pcs, kg, litre…" /></Field>
        <Field ui={ui} label="Selling price (excl. VAT)"><input type="number" min="0" style={s.loginInput} value={f.price} onChange={e => u('price', e.target.value)} /></Field>
        <Field ui={ui} label="Tax"><select style={cu.select} value={f.taxTreatment} onChange={e => u('taxTreatment', e.target.value)}>{TAX_OPTIONS.map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field ui={ui} label="Reorder threshold (alert at or below)"><input type="number" min="0" style={s.loginInput} value={f.reorderLevel} onChange={e => u('reorderLevel', e.target.value)} /></Field>
        <Field ui={ui} label="Reorder quantity"><input type="number" min="0" style={s.loginInput} value={f.reorderQty} onChange={e => u('reorderQty', e.target.value)} /></Field>
        <Field ui={ui} label="Supplier"><input style={s.loginInput} value={f.supplier} onChange={e => u('supplier', e.target.value)} /></Field>
        <Field ui={ui} label="Business object"><select style={cu.select} value={f.object} onChange={e => u('object', e.target.value)}>{['ICT & Software Services', 'Financial Technology (Fintech)', 'Fashion & Retail', 'Agriculture', 'Real Estate', 'General / Corporate'].map(o => <option key={o}>{o}</option>)}</select></Field>
        <TiersEditor ui={ui} tiers={f.tiers} onChange={(t) => u('tiers', t)} />
        <label style={{ fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={!!f.quick} onChange={e => u('quick', e.target.checked)} /> Quick button (Alt+1–9)</label>
        <label style={{ fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={f.active !== false} onChange={e => u('active', e.target.checked)} /> Active</label>
        <label style={{ fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={f.trackStock !== false} onChange={e => u('trackStock', e.target.checked)} /> Track stock</label>
        <label style={{ fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={!!f.allowNegative} onChange={e => u('allowNegative', e.target.checked)} /> Allow selling below zero</label>
      </div>
    </Modal>
  );
};

const ServiceModal = ({ ui, initial, categories, products, onClose, onSave }) => {
  const { s, cu } = ui;
  const [f, setF] = useState(initial ? { tiers: [], consumables: [], minMinutes: 0, incrementMinutes: 15, object: 'General / Corporate', ...initial } : { name: '', category: 'IT Services', billingMode: 'fixed', unit: '', rate: '', tiers: [], taxTreatment: TAX_OPTIONS[0], minMinutes: 0, incrementMinutes: 15, consumables: [], quick: false, active: true, object: 'General / Corporate' });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal ui={ui} wide={640} title={initial ? 'Edit service' : 'New service'} sub="Linked consumables are deducted from stock (and costed into COGS) every time the service is sold." onClose={onClose} submitLabel={initial ? '💾 Save' : '➕ Add service'} onSubmit={() => onSave(f, !!initial)}>
      <div style={grid2}>
        <Field ui={ui} label="Service name" full><input style={s.loginInput} value={f.name} onChange={e => u('name', e.target.value)} /></Field>
        <Field ui={ui} label="Revenue category"><input list="svc-cats" style={s.loginInput} value={f.category} onChange={e => u('category', e.target.value)} /><datalist id="svc-cats">{categories.map(c => <option key={c} value={c} />)}</datalist></Field>
        <Field ui={ui} label="Billing mode"><select style={cu.select} value={f.billingMode} onChange={e => u('billingMode', e.target.value)}>{BILLING_MODES.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select></Field>
        <Field ui={ui} label={f.billingMode === 'time' ? 'Rate per hour (excl. VAT)' : 'Price per unit (excl. VAT)'}><input type="number" min="0" style={s.loginInput} value={f.rate} onChange={e => u('rate', e.target.value)} /></Field>
        <Field ui={ui} label="Unit label"><input style={s.loginInput} value={f.unit} onChange={e => u('unit', e.target.value)} placeholder={f.billingMode === 'time' ? 'hour' : 'page, job…'} /></Field>
        <Field ui={ui} label="Tax"><select style={cu.select} value={f.taxTreatment} onChange={e => u('taxTreatment', e.target.value)}>{TAX_OPTIONS.map(t => <option key={t}>{t}</option>)}</select></Field>
        {f.billingMode === 'time' && <>
          <Field ui={ui} label="Minimum billable minutes"><input type="number" min="0" style={s.loginInput} value={f.minMinutes} onChange={e => u('minMinutes', e.target.value)} /></Field>
          <Field ui={ui} label="Round up to every (minutes)"><input type="number" min="1" style={s.loginInput} value={f.incrementMinutes} onChange={e => u('incrementMinutes', e.target.value)} /></Field>
        </>}
        <TiersEditor ui={ui} tiers={f.tiers} onChange={(t) => u('tiers', t)} />
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={cu.label}>Consumables used per unit sold (per hour for time-based)</label>
          {(f.consumables || []).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <select style={cu.select} value={c.productId} onChange={e => u('consumables', f.consumables.map((x, j) => j === i ? { ...x, productId: e.target.value } : x))}><option value="">Product…</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input type="number" min="0" step="0.01" style={{ ...s.loginInput, width: 110 }} placeholder="Qty" value={c.qty} onChange={e => u('consumables', f.consumables.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} />
              <button type="button" style={ui.rm.miniBtn} onClick={() => u('consumables', f.consumables.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" style={ui.rm.miniBtn} onClick={() => u('consumables', [...(f.consumables || []), { productId: '', qty: 1 }])}>+ Link consumable</button>
        </div>
        <label style={{ fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={!!f.quick} onChange={e => u('quick', e.target.checked)} /> Quick button</label>
        <label style={{ fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={f.active !== false} onChange={e => u('active', e.target.checked)} /> Active</label>
      </div>
    </Modal>
  );
};

const ReceiveModal = ({ ui, product, fmtMoney, onClose, onSave }) => {
  const { s, cu } = ui;
  const [f, setF] = useState({ qty: '', cost: product.lastCost || product.avgCost || '', supplier: product.supplier || '', ref: '', funding: 'cash' });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal ui={ui} title={`Receive stock — ${product.name}`} sub={`On hand: ${product.stockQty} ${product.unit || ''} · average cost ${fmtMoney(product.avgCost)}`} onClose={onClose} submitLabel="✓ Receive & post" onSubmit={() => onSave(f)}>
      <div style={grid2}>
        <Field ui={ui} label="Quantity received"><input type="number" min="0" step="0.01" style={s.loginInput} value={f.qty} onChange={e => u('qty', e.target.value)} autoFocus /></Field>
        <Field ui={ui} label="Unit cost (excl. VAT)"><input type="number" min="0" style={s.loginInput} value={f.cost} onChange={e => u('cost', e.target.value)} /></Field>
        <Field ui={ui} label="Supplier"><input style={s.loginInput} value={f.supplier} onChange={e => u('supplier', e.target.value)} /></Field>
        <Field ui={ui} label="Invoice / GRN ref"><input style={s.loginInput} value={f.ref} onChange={e => u('ref', e.target.value)} /></Field>
        <Field ui={ui} label="How it is funded" full><select style={cu.select} value={f.funding} onChange={e => u('funding', e.target.value)}>
          <option value="cash">Paid now from cash / bank (Cr Cash)</option><option value="credit">On credit — owed to supplier (Cr Accounts Payable)</option><option value="opening">Opening stock already owned (Cr Owner's Equity)</option></select></Field>
      </div>
      <p style={{ fontSize: 12.5, color: '#5A7A9A', marginTop: 10 }}>Stock value added: <strong>{fmtMoney(num(f.qty) * num(f.cost))}</strong> (Dr Inventory). The average cost is recalculated automatically.</p>
    </Modal>
  );
};

const AdjustModal = ({ ui, product, onClose, onSave }) => {
  const { s, cu } = ui;
  const [f, setF] = useState({ counted: '', reason: ADJUST_REASONS[0] });
  return (
    <Modal ui={ui} accent="#B45309" title={`Stock count / adjustment — ${product.name}`} sub={`System quantity: ${product.stockQty} ${product.unit || ''}`} onClose={onClose} submitLabel="Post adjustment" onSubmit={() => onSave(f)}>
      <div style={grid2}>
        <Field ui={ui} label="Counted quantity"><input type="number" min="0" step="0.01" style={s.loginInput} value={f.counted} onChange={e => setF({ ...f, counted: e.target.value })} autoFocus /></Field>
        <Field ui={ui} label="Reason"><select style={cu.select} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })}>{ADJUST_REASONS.map(r => <option key={r}>{r}</option>)}</select></Field>
      </div>
      {f.counted !== '' && <p style={{ fontSize: 12.5, color: '#92400E', marginTop: 10 }}>Difference: <strong>{num(f.counted) - num(product.stockQty)}</strong> {product.unit || ''} at average cost {Math.round(num(product.avgCost)).toLocaleString()} — a loss is expensed (COGS / Tax Ledger); a gain is booked to Other Income.</p>}
    </Modal>
  );
};

const CloseShiftModal = ({ ui, report, float, expected, fmtMoney, onClose, onSave }) => {
  const { s, cu } = ui;
  const [counted, setCounted] = useState('');
  const variance = counted === '' ? null : num(counted) - expected;
  return (
    <Modal ui={ui} accent="#B45309" title="Close register & issue Z-Report" sub="A Z-Report is final: sales in it can no longer be voided." onClose={onClose} submitLabel="⏹ Close & print Z-Report" onSubmit={() => onSave({ counted })}>
      {[['Sales', report.count], ['Net revenue', fmtMoney(report.net)], ['VAT collected', fmtMoney(report.vat)], ['Total takings', fmtMoney(report.total)], ['Cash sales', fmtMoney(report.cash)], ['Mobile Money sales', fmtMoney(report.mobile)], ['Opening float', fmtMoney(float)], ['Expected cash in drawer', fmtMoney(expected)]].map(([l, v]) => <div key={l} style={cu.credRow}><span style={cu.credLabel}>{l}</span><span style={cu.credVal}>{v}</span></div>)}
      <label style={{ ...cu.label, marginTop: 14 }}>Counted cash in drawer</label>
      <input type="number" min="0" style={s.loginInput} value={counted} onChange={e => setCounted(e.target.value)} autoFocus />
      {variance !== null && <p style={{ fontWeight: 700, color: variance < 0 ? '#B91C1C' : '#065F46' }}>{variance === 0 ? 'Drawer balances.' : `${variance < 0 ? 'Short' : 'Over'} by ${fmtMoney(Math.abs(variance))} — will be posted to the books.`}</p>}
    </Modal>
  );
};

export default PosInventory;