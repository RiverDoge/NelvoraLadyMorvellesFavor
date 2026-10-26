const SAVE_KEY = 'morvelle-ledger';
const CODE_PREFIX = 'MV1.';
const UNDO_DEPTH = 40;
const JOURNAL_DEPTH = 120;
const SHARED_JOURNAL = 40;

let bond = null;
let state = null;
let journal = [];
let sealed = false;

function freshState() {
    return {
        tier: bond.ledger.tier || 1,
        favor: bond.ledger.favor,
        lifetime: bond.ledger.lifetime,
        charges: bond.ledger.charges,
        unlocked: new Set(),
        active: new Set(),
        bought: new Set(),
        owing: new Set(),
        slots: bond.tiers.rows.map(() => null),
        presence: false,
        visit: null,
        requested: {}
    };
}

function plainState(source = state) {
    return {
        tier: source.tier,
        favor: source.favor,
        lifetime: source.lifetime,
        charges: source.charges,
        unlocked: [...source.unlocked],
        active: [...source.active],
        bought: [...source.bought],
        owing: [...source.owing],
        slots: [...source.slots],
        presence: source.presence,
        visit: source.visit,
        requested: Object.assign({}, source.requested)
    };
}

function knownIds() {
    return new Set([...bond.slotless.items, ...bond.slotted.groups.flatMap(g => g.items)].map(i => i.id));
}

function readState(plain) {
    const base = freshState();
    if (!plain || typeof plain !== 'object') return base;
    const ids = knownIds();
    const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const list = value => new Set((Array.isArray(value) ? value : []).filter(id => ids.has(id)));
    const tiers = bond.tiers.rows.length;
    base.tier = Math.min(tiers, Math.max(1, Math.round(number(plain.tier, base.tier))));
    base.favor = number(plain.favor, base.favor);
    base.lifetime = number(plain.lifetime, base.lifetime);
    base.charges = Math.max(0, number(plain.charges, base.charges));
    base.unlocked = list(plain.unlocked);
    base.active = list(plain.active);
    base.bought = list(plain.bought);
    base.owing = list(plain.owing);
    base.slots = base.slots.map((_, i) => (Array.isArray(plain.slots) && ids.has(plain.slots[i]) && i < base.tier) ? plain.slots[i] : null);
    base.presence = Boolean(plain.presence);
    base.visit = plain.visit && Array.isArray(plain.visit.slots) ? plain.visit : null;
    if (plain.requested && typeof plain.requested === 'object') {
        bond.parlor.items.forEach(item => {
            const count = number(plain.requested[item.id], 0);
            if (count > 0) base.requested[item.id] = count;
        });
    }
    return base;
}

function readJournal(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(h => h && typeof h === 'object').slice(-JOURNAL_DEPTH).map(h => ({
        t: Number(h.t) || Date.now(),
        l: String(h.l || ''),
        n: String(h.n || ''),
        f: Number(h.f) || 0,
        c: Number(h.c) || 0,
        off: Boolean(h.off),
        b: h.b && typeof h.b === 'object' ? h.b : null
    }));
}

function loadSaved() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch (error) {
        saved = null;
    }
    state = saved ? readState(saved.state) : freshState();
    journal = saved ? readJournal(saved.journal) : [];
}

function save() {
    if (sealed) return;
    const keep = journal.length - UNDO_DEPTH;
    const stored = journal.map((h, i) => i < keep ? Object.assign({}, h, { b: null }) : h);
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, state: plainState(), journal: stored }));
    } catch (error) {
        return;
    }
}

function commit(label, name, before, off = false) {
    journal.push({
        t: Date.now(),
        l: label,
        n: name,
        f: state.favor - before.favor,
        c: state.charges - before.charges,
        off,
        b: before
    });
    if (journal.length > JOURNAL_DEPTH) journal = journal.slice(-JOURNAL_DEPTH);
    save();
}

function undo() {
    const last = journal[journal.length - 1];
    if (!last || !last.b) return false;
    journal.pop();
    state = readState(last.b);
    save();
    return true;
}

function allItems() {
    return [...bond.slotless.items, ...bond.slotted.groups.flatMap(group => group.items)];
}

function byId(id) {
    return allItems().find(item => item.id === id) || bond.parlor.items.find(item => item.id === id);
}

function tierRow(n = state.tier) {
    return bond.tiers.rows[n - 1];
}

function isSlotless(item) {
    return bond.slotless.items.includes(item);
}

function maxCharges() {
    const reservoir = state.active.has('crimson-reservoir') && !state.owing.has('crimson-reservoir');
    return tierRow().charges + (reservoir ? 2 : 0);
}

function clampCharges() {
    state.charges = Math.max(0, Math.min(state.charges, maxCharges()));
}

function passivesInUse() {
    return state.slots.filter(Boolean).map(byId).filter(item => item && item.passive && !state.bought.has(item.id));
}

function upkeep() {
    return passivesInUse().reduce((sum, item) => sum + (item.upkeep || 0), 0);
}

function weaponForm() {
    const on = id => state.active.has(id);
    const sickle = on('crescent-sickle-conversion');
    const full = on('adaptive-scale');
    let type = 'Slashing';
    if (on('crystalline-edge-piercing')) type = 'Piercing';
    if (on('crystalline-edge-pure-vitae')) type = 'Necrotic';
    if (on('crystalline-edge-tuning-glass')) type = 'Thunder';
    const props = ['Finesse'];
    if (full && !sickle) props.push('Reach');
    return `${full ? 'Full-Sized' : 'Shrunk'} ${sickle ? 'One-Handed' : 'Two-Handed'} (${sickle ? '1d8' : '1d10'} ${type}, ${props.join(', ')})`;
}

function formOptions(extra = {}) {
    const on = id => state.active.has(id);
    const reach = on('crescent-sickle-conversion') ? .52 : on('adaptive-scale') ? 1.22 : 1;
    const blade = on('crystalline-edge-pure-vitae') ? 'vitae' : on('crystalline-edge-tuning-glass') ? 'tuning' : 'crimson';
    return Object.assign({ reach, blade }, extra);
}

function loadoutKey() {
    const edge = [...state.active].find(id => id.startsWith('crystalline-edge')) || '';
    const slotless = bond.slotless.items.filter(i => !i.id.startsWith('crystalline-edge')).map(i => state.active.has(i.id) ? 1 : 0);
    return { slots: [...state.slots], slotless, edge };
}

function adjustments() {
    if (!state.visit) return 0;
    const now = loadoutKey();
    const before = state.visit.slots.filter(Boolean);
    const after = now.slots.filter(Boolean);
    let count = Math.max(after.filter(id => !before.includes(id)).length, before.filter(id => !after.includes(id)).length);
    count += now.slotless.filter((v, i) => v !== (state.visit.slotless || [])[i]).length;
    if (now.edge !== state.visit.edge) count++;
    return count;
}

function visitCost(count = adjustments()) {
    return Math.min(count * 2, 5);
}

function refillRate() {
    return state.presence ? bond.weapon.refill.near : bond.weapon.refill.afar;
}

function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBytes(text) {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
    const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await out.arrayBuffer());
}

async function makeCode() {
    const payload = {
        v: 1,
        at: Date.now(),
        s: plainState(),
        h: journal.slice(-SHARED_JOURNAL).map(h => ({ t: h.t, l: h.l, n: h.n, f: h.f, c: h.c, off: h.off }))
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const packed = typeof CompressionStream === 'function' ? await pipe(bytes, new CompressionStream('deflate-raw')) : bytes;
    return CODE_PREFIX + (typeof CompressionStream === 'function' ? '' : '0') + bytesToBase64(packed);
}

async function readCode(code) {
    let text = String(code || '').trim();
    const hashed = text.match(/#seal=([A-Za-z0-9_.-]+)/);
    if (hashed) text = hashed[1];
    if (!text.startsWith(CODE_PREFIX)) throw new Error('code');
    text = text.slice(CODE_PREFIX.length);
    let bytes;
    if (text.startsWith('0')) {
        bytes = base64ToBytes(text.slice(1));
    } else {
        bytes = await pipe(base64ToBytes(text), new DecompressionStream('deflate-raw'));
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || payload.v !== 1 || !payload.s) throw new Error('code');
    return { at: payload.at || Date.now(), state: readState(payload.s), journal: readJournal(payload.h) };
}
