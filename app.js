const FLOWER = {
    'underfoot-leverage': ['098', 1], 'silent-poise': ['054', 1], 'crimson-reservoir': ['124', 1], 'blood-spiral-lash': ['040', 1], 'martyrs-resonance': ['012', 1],
    'sanguine-step': ['009', 1], 'shared-suffocation': ['107', 1], 'despondent-tremor': ['109', 0], 'gaze-of-the': ['025', 0], 'parry-the-unbidden': ['053', 1],
    'vessels-attunement': ['117', 0], 'subvocal-incantation': ['029', 1], 'votive-renewal': ['017', 1], 'the-stolen-word': ['134', 0], 'chorus-of-shattered-glass': ['143', 1],
    'parlor-guise': ['104', 0], 'crescent-sickle-conversion': ['031', 0], 'adaptive-scale': ['039', 0], 'sanguine-recall': ['135', 0],
    'crystalline-edge-piercing': ['065', 0], 'crystalline-edge-pure-vitae': ['079', 0], 'crystalline-edge-tuning-glass': ['015', 0],
    'a-playful-scolding-bandages': ['087', 1, 'note'], 'sorbet-on-the-promenade': ['132', 0, 'ticket'], 'a-charcoal-keepsake': ['004', 0, 'sketch'],
    'tea-market-gossip-in-the-conservatory': ['078', 0, 'card'], 'a-tailored-fitting': ['022', 0, 'ribbon'], 'a-wax-sealed-care-parcel': ['141', 0, 'tag'],
    'a-whispered-yearning': ['142', 0, 'letter'], 'the-private-opera-box': ['129', 1, 'ticket'], 'the-royal-envoys-masquerade': ['127', 0, 'invite'],
    'whims-of-a-loyal-servant': ['137', 0, 'letter'],
    'tainted-vitality': ['020', 0], 'the-expressive-muse': ['118', 1]
};

const TIER_ART = [['009', 1], ['029', 1], ['001', 0], ['039', 0], ['129', 1], ['124', 1], ['obsidian-iris', 1]];

const SPECIMEN_SCALE = .72;

const VEIL = [
    ['129', 10, 4, 62, 160, 3], ['050', 48, 2, 58, 172, 5], ['053', 8, 18, 60, -12, 2], ['118', 6, 32, 58, -24, 4],
    ['087', 18, 46, 64, 8, 5], ['143', 40, 58, 70, -6, 2], ['107', 86, 62, 66, 12, 3], ['040', 12, 60, 60, 20, 4],
    ['017', 66, 70, 66, -10, 5], ['098', 30, 72, 58, 14, 3], ['116', 92, 76, 62, -16, 2], ['012', 6, 80, 46, -8, 5],
    ['029', 50, 84, 66, 6, 4], ['053', 80, 88, 70, -14, 3], ['126', 20, 92, 64, 10, 2], ['129', 60, 98, 70, -4, 4],
    ['143', 88, 100, 74, 8, 2], ['107', 36, 100, 66, -12, 3], ['118', 96, 28, 56, 22, 4], ['054', 26, 8, 56, 150, 2],
    ['091', 90, 14, 52, 18, 6], ['087', 30, 24, 62, -18, 6], ['040', 60, 52, 60, 10, 6], ['009', 90, 48, 56, -12, 6],
    ['124', 62, 26, 88, 6, 7], ['009', 80, 38, 52, 24, 7], ['017', 44, 40, 58, -10, 7]
];

const LATCH = [[52, 34, 4], [80, 104, -3], [46, 174, 2], [76, 244, -4], [50, 314, 3], [80, 384, -2]];
const BLANK_PAGE = ['054', '098', '029', '012', '118', '126'];
const BOOK_HEIGHT = 910;

const RICH = new RegExp([
    "(?<dice>\\b\\d+d\\d+\\b)",
    "(?<save>\\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throws?\\b)",
    "(?<dc>\\b(?:Scythe (?:Save )?DC|Spell Save DC|Save DC)\\b)",
    "(?<act>\\bBonus Action\\b|\\bReaction\\b|\\bAction\\b)",
    "(?<dmg>\\b(?:[Nn]ecrotic|[Tt]hunder|[Ss]lashing|[Pp]iercing|[Bb]ludgeoning)\\b|\\b(?:poison|force|psychic)(?= damage))",
    "(?<adv>\\badvantage\\b)",
    "(?<dis>\\bdisadvantage\\b)",
    "(?<cond>\\b(?:knocked prone|prone|[Ss]tunned|Blindsight|immunity|temporary hit points|muffled)\\b)",
    "(?<range>\\b\\d+(?: feet|-foot| ft\\.))",
    "(?<charge>\\b\\d+ [Cc]harges?\\b)",
    "(?<favor>\\b(?:\\d+|\\?\\?\\?) Favor\\b)"
].join('|'), 'g');

let spreads = [];
let current = 0;
let turning = false;
let chargeDraft = null;
let grantOpen = false;
let sealedAt = 0;

const $ = id => document.getElementById(id);

function hash(text) {
    let h = 7;
    for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
}

function jitter(id, spread = .45) {
    const h = hash(id);
    return { rot: ((h % 9) - 4) * spread, shift: (h >> 3) % 4 * 8, sx: 4 + ((h >> 5) % 4) * 6 };
}

function hearts(text) {
    return escapeHtml(text).replace(/&lt;3/g, '<span class="heart">&#9829;</span>');
}

function rich(text) {
    return inline(text).split(/(<[^>]+>)/).map(part => part.startsWith('<') ? part : part.replace(RICH, (match, ...args) => {
        const groups = args[args.length - 1];
        const kind = Object.keys(groups).find(k => groups[k] !== undefined);
        if (kind === 'dmg') return `<span class="dmg dmg-${match.toLowerCase()}">${match}</span>`;
        return `<span class="k-${kind}">${match}</span>`;
    })).join('');
}

function plain(title) {
    return title.replace(/\s*\([^)]*\)\s*$/, '');
}

function specimenHtml() {
    const options = formOptions({ turn: -10 });
    options.mounts = [.3 * options.reach, .74 * options.reach];
    const box = scytheView(options, options.turn, 4);
    const view = [box.x, box.y, box.width, box.height].map(n => n.toFixed(1)).join(' ');
    const width = box.width * SPECIMEN_SCALE * options.size;
    return `<div class="specimen-glass" style="width: ${width.toFixed(1)}px">${scytheSvg('', '', Object.assign(options, { view }))}</div>`;
}

function shortTitle(title) {
    return plain(title).replace(/^Slot(?:less|ted)\s+/i, '');
}

function aside(title) {
    return (title.match(/\(([^)]*)\)\s*$/) || [])[1] || '';
}

function art(file, cut) {
    const src = file === 'obsidian-iris' ? 'assets/flowers/obsidian-iris.webp' : `assets/${cut ? 'flowers/f' : 'plates/p'}${file}.webp`;
    return `<img src="${src}" alt="">`;
}

function label(pattern) {
    return (bond.ledger.rows.find(r => pattern.test(r.label)) || {}).label || '';
}

function phrase(text, pattern) {
    return (String(text).match(pattern) || [''])[0];
}

function appointmentNote() {
    const rule = bond.rules.items.find(r => /Loadout/i.test(r.name));
    return rule ? phrase(rule.text, /requires an appointment with her/i) : '';
}

function audienceNote() {
    return phrase(bond.tiers.text.join(' '), /requires Lady Morvelle's Favor and a personal audience/i);
}

function boxLabel(item, role) {
    const box = item.boxes.find(b => b.role === role);
    return box ? box.label : '';
}

function refillOptions() {
    return (bond.weapon.stats.find(s => /Refilling/i.test(s.label)) || { children: [] }).children;
}

function refillChoice() {
    return refillOptions().find(child => /Presence/i.test(child.head) === state.presence) || { head: '', body: '' };
}

function showTier(instant = false) {
    const veil = $('veil');
    if (instant) veil.classList.add('instant');
    document.documentElement.style.setProperty('--tier', state.tier);
    veil.querySelectorAll('.bloom').forEach(bloom => bloom.classList.toggle('fallen', state.tier >= Number(bloom.dataset.falls)));
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.remove('instant')));
}

function renderVeil() {
    $('veil').insertAdjacentHTML('beforeend', VEIL.map(([f, x, y, w, r, falls], i) => {
        const flip = i % 3 === 1 ? ' flip' : '';
        const dx = (x < 50 ? -1 : 1) * (20 + (i * 13) % 50);
        const delay = ((i * 7) % 5) * .18;
        return `<img class="bloom${flip}" data-falls="${falls}" src="assets/flowers/f${f}.webp" alt="" style="--x:${x}%;--y:${y}%;--w:${w}%;--r:${r}deg;--dx:${dx}px;--dr:${(i % 2 ? 1 : -1) * (30 + i * 3)}deg;--delay:${delay}s">`;
    }).join(''));
}

function renderCrest() {
    $('crest').innerHTML = scytheSvg('', 'class="l"', { reach: .72 }) + scytheSvg('', 'class="r"', { reach: .72, mirror: true }) +
        '<div class="obsidian"><img src="assets/flowers/obsidian-iris.webp" alt=""></div>';
}

function renderSillScythe() {
    const max = maxCharges();
    clampCharges();
    if (chargeDraft !== null) chargeDraft = Math.max(0, Math.min(max, chargeDraft));
    if (chargeDraft === state.charges) chargeDraft = null;
    const target = chargeDraft ?? state.charges;
    const span = formOptions().reach;
    const beads = Array.from({ length: max }, (_, i) => {
        const [x, y] = rodPoint(span * (max > 1 ? .12 + i * (.76 / (max - 1)) : .5));
        const now = i < state.charges;
        const full = i < target;
        const pending = now !== full ? (now ? ' leaving' : ' coming') : '';
        const look = pending
            ? `fill="url(#bead-glass)" stroke="#9e1230" stroke-opacity=".7" stroke-width="1.4" stroke-dasharray="3 3"`
            : `fill="url(#bead-${full ? 'glass' : 'empty'})" stroke="${full ? '#4b0412' : '#9e1230'}" stroke-opacity="${full ? '.4' : '.55'}" stroke-width="${full ? 1 : 1.4}"${full ? ' filter="url(#bead-glow)"' : ''}`;
        return `<circle class="bead-svg${pending}" data-act="bead" data-i="${i}" cx="${x}" cy="${y}" r="12.5" ${look}/>`;
    }).join('');
    const choice = refillChoice();
    const cost = target > state.charges ? Math.ceil((target - state.charges) / refillRate()) : 0;
    const host = $('sill-scythe');
    host.innerHTML = ownIds(`<svg viewBox="0 0 600 600"><g transform="rotate(${-ROD_ANGLE} ${ROD.x1} ${ROD.y1})">${scytheBody(beads, formOptions())}</g>${SCYTHE_DEFS}</svg>`) + `
        <div class="charge-count">${chargeDraft === null
            ? `<span class="refill-note" title="${escapeHtml(choice.head)}">${rich(choice.body)}</span>`
            : `<button class="price confirm" data-act="charges-confirm"${cost > state.favor ? ' disabled' : ''}>Confirm${cost ? ` &middot; ${rich(`${cost} Favor`)}` : ''}</button>
               <button class="charges-cancel" data-act="charges-cancel" aria-label="Cancel">&times;</button>`}
        </div>`;
    fitSvg(host.querySelector('svg'), 14, true);
    const view = host.querySelector('svg').viewBox.baseVal;
    host.querySelector('.charge-count').style.marginTop = `calc(${((ROD.y1 + 14 - view.y) / view.width * 100).toFixed(2)}% + 14px)`;
}

function renderPanes() {
    $('panes').innerHTML = '<div class="pane center"></div>' + bond.tiers.rows.map((row, i) => {
        const slot = state.slots[i] && byId(state.slots[i]);
        const open = state.tier > i;
        const flower = slot ? FLOWER[slot.id] : null;
        const dormant = slot && state.owing.has(slot.id);
        return `
            <button class="pane p${i + 1}${open ? ' unlocked' : ''}${state.tier === i + 1 ? ' current' : ''}${slot && open ? ' filled' : ''}${dormant ? ' dormant' : ''}" data-open="tiers">
                ${flower ? `<img class="pressed-in" src="assets/flowers/f${flower[0]}.webp" alt="">` : ''}
                <span class="num">${row.numeral}</span>
                <span class="name">${slot && open ? escapeHtml(slot.name) : hearts(row.title)}</span>
            </button>`;
    }).join('');
}

function presenceButtons() {
    return refillOptions().slice().sort(a => /Presence/i.test(a.head) ? 1 : -1).map(child => {
        const near = /Presence/i.test(child.head);
        return `<button class="presence-icon ${near ? 'near' : 'afar'}${near === state.presence ? ' on' : ''}" data-near="${near ? 1 : 0}" title="${escapeHtml(child.head)}" aria-label="${escapeHtml(child.head)}"${sealed ? ' disabled' : ''}><span></span></button>`;
    }).join('');
}

function renderLedger() {
    const row = tierRow();
    const used = state.slots.filter(Boolean).length;
    $('ledger').innerHTML = `
        <div class="kicker">${escapeHtml(bond.ledger.title)}</div>
        <h2>Tier ${row.numeral}: ${hearts(row.title)}</h2>
        <div class="standing">${row.standing ? escapeHtml(row.standing) : hearts(row.title)}</div>
        <div class="favor">
            <button class="coin glass" data-act="grant-open" aria-label="Grant"${sealed ? ' disabled' : ''}><span>${state.favor}</span></button>
            <span>${escapeHtml(label(/^Current Favor/i))}</span>
            <i>${escapeHtml(label(/^Lifetime/i))}: ${state.lifetime}</i>
        </div>
        <form class="grant" id="grant"${grantOpen && !sealed ? '' : ' hidden'}>
            <label><span>${escapeHtml(label(/^Current Favor/i))}</span><input type="number" name="favor" min="0" step="1" inputmode="numeric"></label>
            <label><span>${escapeHtml(label(/^Current Charges/i))}</span><input type="number" name="charges" min="0" step="1" inputmode="numeric"></label>
            <button class="price" type="submit">Grant</button>
        </form>
        <div class="pair"><span>${escapeHtml(label(/^Upgrade Slots/i))}</span><em>${used} / ${row.slots}</em></div>
        <div class="pair"><span>${escapeHtml(label(/^Active Passive Upkeep/i))}</span><em>${rich(`${upkeep()} Favor`)} / Month</em></div>
        <div class="form"><span>${escapeHtml(label(/^Current Weapon Form/i))}</span>${rich(weaponForm())}</div>
        <div class="presence">${presenceButtons()}</div>`;
    $('purse').innerHTML = `<span>${state.favor}</span>`;
    $('presence-inside').innerHTML = presenceButtons();
    document.body.classList.toggle('presence-on', state.presence);
}

function renderLatch() {
    const latch = $('latch');
    const tags = [
        [bond.title, 'weapon'],
        [bond.tiers.title, 'tiers'],
        [shortTitle(bond.slotless.title), 'slotless'],
        [shortTitle(bond.slotted.title), 'slotted'],
        [plain(bond.parlor.title), 'parlor'],
        [bond.rules.title, 'rules']
    ];
    latch.innerHTML = '<span class="knob"></span>' + tags.map(([text, key], i) =>
        `<span class="string" data-i="${i}"></span><button class="tag" data-open="${key}" style="left:${LATCH[i][0]}px;top:${LATCH[i][1]}px;--r:${LATCH[i][2]}deg">${escapeHtml(text)}</button>`).join('');
    requestAnimationFrame(() => {
        latch.querySelectorAll('.tag').forEach((tag, i) => {
            const x = LATCH[i][0] + 18;
            const y = LATCH[i][1] + tag.offsetHeight / 2;
            const string = latch.querySelector(`.string[data-i="${i}"]`);
            string.style.left = '19px';
            string.style.top = '13px';
            string.style.width = Math.hypot(x - 19, y - 13) + 'px';
            string.style.transform = `rotate(${Math.atan2(y - 13, x - 19)}rad)`;
        });
    });
}

function renderHome() {
    renderPanes();
    renderSillScythe();
    renderLedger();
}

function titleCard(title, group, extra = '') {
    return `
        <header class="page-title">
            <h2>${escapeHtml(title)}</h2>
            ${group ? `<span class="group">${group}</span>` : ''}
            ${extra}
        </header>`;
}

function metaParts(item) {
    const parts = item.meta.split('|').map(p => p.trim()).filter(Boolean);
    return {
        shown: parts.filter(p => !/^(Unlock:|Upkeep:|Buyout:)/i.test(p) && !/^(\d+|\?\?\?)\s*Favor$/i.test(p)),
        price: parts.find(p => /^Unlock:/i.test(p) || /^(\d+|\?\?\?)\s*Favor$/i.test(p)) || '',
        upkeep: parts.find(p => /^Upkeep:/i.test(p)) || '',
        buyout: parts.find(p => /^Buyout:/i.test(p)) || ''
    };
}

function corners() {
    return '<span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>';
}

function entryHtml(item, i = 0) {
    const [f, cut] = FLOWER[item.id] || ['141', 0];
    const { rot } = jitter(item.id);
    const locked = item.tier > state.tier;
    const owned = state.unlocked.has(item.id);
    const active = state.active.has(item.id);
    const bought = state.bought.has(item.id);
    const meta = metaParts(item);
    const classes = ['entry', i % 2 ? 'alt' : '', locked ? 'sealed' : owned ? 'owned' : 'frosted', active ? 'active' : '', bought ? 'bought' : ''].join(' ');
    const pinTitle = state.presence ? '' : ` title="${escapeHtml(appointmentNote())}"`;
    const terms = item.passive ? `
        <div class="terms">
            ${meta.upkeep ? `<span class="term${bought ? ' paid' : ''}">${escapeHtml(meta.upkeep)}</span>` : ''}
            ${meta.buyout ? `<button class="term gold${bought ? ' woven' : ''}" data-act="buyout" data-id="${item.id}"${!owned || bought ? ' disabled' : ''}>${escapeHtml(meta.buyout)}</button>` : ''}
        </div>` : '';
    return `
        <article class="${classes}" data-id="${item.id}" style="--rot:${rot}deg">
            <button class="price" data-act="unlock" data-id="${item.id}"${locked ? ' disabled' : ''}>${escapeHtml(meta.price)}</button>
            <figure class="specimen ${cut ? 'scrap' : 'clipping'}">${art(f, cut)}${corners()}</figure>
            <div class="card">
                ${corners()}
                <button class="pin" data-act="equip" data-id="${item.id}"${!owned ? ' disabled' : ''}${pinTitle} aria-label="${escapeHtml(boxLabel(item, 'active'))}"></button>
                <h3>${escapeHtml(item.name)}</h3>
                <div class="meta">${escapeHtml(meta.shown.join(' | '))}</div>
                <p>${rich(item.text)}</p>
                ${terms}
            </div>
            <div class="cover"><span class="etch">Tier ${(tierRow(item.tier) || {}).numeral || ''}</span></div>
        </article>`;
}

function signed(n) {
    return n < 0 ? `&minus; ${Math.abs(n)}` : `+ ${n}`;
}

function rollHtml() {
    const row = tierRow();
    const bonus = parseInt(row.bonus, 10) || 0;
    const mod = state.mod || 0;
    const prof = state.prof || 0;
    const on = id => state.active.has(id) && !state.owing.has(id);
    const sickle = state.active.has('crescent-sickle-conversion');
    let type = 'slashing';
    if (state.active.has('crystalline-edge-piercing')) type = 'piercing';
    if (state.active.has('crystalline-edge-pure-vitae')) type = 'necrotic';
    if (state.active.has('crystalline-edge-tuning-glass')) type = 'thunder';
    const flat = mod + bonus;
    const hit = mod + prof + bonus;
    let damage = `${sickle ? '1d8' : '1d10'}${flat ? ` ${signed(flat)}` : ''} ${type}`;
    if (row.necrotic && !/none/i.test(row.necrotic)) damage += ` + ${row.necrotic.replace('+', '')} necrotic`;
    const riders = [];
    const part = name => bond.tiers.features.flatMap(f => f.parts.length ? f.parts : [{ name: f.name, text: f.text }]).find(p => p.name === name);
    if (state.tier >= 3 && part("Crescendo's Hush")) riders.push([state.tier >= 5 && part("Crescendo's End") ? "Crescendo's End" : "Crescendo's Hush", `1 charge: + ${state.tier >= 5 ? '2d8' : '1d8'} necrotic`]);
    if (state.tier >= 4 && part('Thunderous Expulsion')) riders.push([state.tier >= 6 && part('Resonant Expulsion') ? 'Resonant Expulsion' : 'Thunderous Expulsion', `+ ${state.tier >= 6 ? '1d10' : '1d8'} thunder`]);
    if (on('underfoot-leverage')) riders.push([byId('underfoot-leverage').name, '+ 1d4']);
    return `
        <div class="roll">
            <div><span>To Hit</span><b>${hit < 0 ? '&minus;' : '+'}${Math.abs(hit)}</b></div>
            <div class="damage"><span>Damage</span><b>${rich(damage)}</b></div>
        </div>
        ${riders.length ? `<div class="riders">${riders.map(([name, text]) => `<div><em>${escapeHtml(name)}</em> ${rich(text)}</div>`).join('')}</div>` : ''}`;
}

function weaponBlocks() {
    const w = bond.weapon;
    const row = tierRow();
    const head = bond.tiers.headers;
    const scaling = [[head[3], row.bonus], [head[5], maxCharges()], [head[6], row.dc], [head[7], row.necrotic]];
    const stats = w.stats.map(stat => `
        <div class="row"><b>${escapeHtml(stat.label)}</b>${rich(stat.text)}
            ${stat.children.length ? `<ul>${stat.children.map(c => `<li><strong>${escapeHtml(c.head)}:</strong> ${rich(c.body)}</li>`).join('')}</ul>` : ''}
        </div>`).join('');
    const traitArt = [FLOWER['tainted-vitality'], FLOWER['the-expressive-muse']];
    const traits = w.traits.map((t, i) => {
        const [f, cut] = traitArt[i] || ['141', 0];
        return `
            <div class="trait${i % 2 ? ' alt' : ''}" style="--rot:${i % 2 ? .6 : -.5}deg">
                <div class="trait-art ${cut ? 'scrap' : 'clipping'}">${art(f, cut)}</div>
                <div class="card">
                    ${corners()}
                    <h3>${escapeHtml(t.name)}</h3>
                    <div class="meta">${escapeHtml(t.kind)}</div>
                    <p>${rich(t.text)}</p>
                </div>
            </div>`;
    });
    return [
        titleCard(bond.title, `Tier ${row.numeral}: ${hearts(row.title)}`),
        `<div class="showcase"><div class="satin">${specimenHtml()}</div></div>`,
        `<div class="plaque">
            <div class="big-stats">${scaling.map(([k, v]) => `<div><b>${escapeHtml(String(v))}</b><span>${escapeHtml(k)}</span></div>`).join('')}</div>
            <div class="roll-wrap" id="roll">${rollHtml()}</div>
            <form class="stats-in" id="stats-in">
                <label><span>Ability Modifier</span><input type="number" name="mod" step="1" value="${state.mod ?? ''}" placeholder="0"${sealed ? ' disabled' : ''}></label>
                <label><span>Proficiency Bonus</span><input type="number" name="prof" step="1" value="${state.prof ?? ''}" placeholder="0"${sealed ? ' disabled' : ''}></label>
            </form>
            <div class="line"><span>${escapeHtml(label(/^Current Weapon Form/i))}</span><em>${rich(weaponForm())}</em></div>
            <div class="line"><span>${escapeHtml(label(/^Current Charges/i))}</span><em>${state.charges} / ${maxCharges()}</em></div>
        </div>`,
        `<div class="paper-note" style="--rot:.5deg"><span class="sub">${escapeHtml(w.subtitle)}</span>${w.text.map(t => `<p>${rich(t)}</p>`).join('')}</div>`,
        `<div class="spec-card"><h4 class="spec-title">${escapeHtml(plain(w.title))}</h4>${stats}</div>`,
        `<h2 class="subhead">${escapeHtml(w.traitsTitle)}</h2>`,
        ...traits
    ];
}

function tierCard(row, i) {
    const n = row.n;
    const reached = n <= state.tier;
    const next = n === state.tier + 1;
    const head = bond.tiers.headers;
    const features = bond.tiers.features.filter(f => f.tier === n).map(f => f.parts.length
        ? f.parts.map(p => `<div class="feature"><h4>${escapeHtml(p.name)}</h4><p>${rich(p.text)}</p></div>`).join('')
        : `<div class="feature"><h4>${escapeHtml(f.name)}</h4><p>${rich(f.text)}</p></div>`).join('');
    const [f, cut] = TIER_ART[i] || ['141', 0];
    const values = [row.costText, row.bonus, row.slots, row.charges, row.dc, row.necrotic];
    const classes = ['tier-card', 'entry', i % 2 ? 'alt' : '', reached ? 'reached owned' : next ? 'frosted' : 'sealed', n === state.tier ? 'current' : ''].join(' ');
    const title = state.presence ? '' : ` title="${escapeHtml(audienceNote())}"`;
    return `
        <article class="${classes}" data-tier="${n}" style="--rot:${(i % 2 ? .5 : -.4)}deg">
            ${reached ? '' : `<button class="price" data-act="ascend" data-tier="${n}"${next ? '' : ' disabled'}${title}>${escapeHtml(row.costText)}</button>`}
            <div class="tier-art ${f === 'obsidian-iris' || cut ? 'scrap' : 'clipping'}${f === 'obsidian-iris' ? ' obsidian' : ''}">${art(f, cut)}</div>
            <div class="card">
                ${corners()}
                ${n === state.tier ? '<span class="current-pin"></span>' : ''}
                <div class="tier-head">
                    <span class="numeral ${reached ? 'glass' : 'frost'}">${row.numeral}</span>
                    <div><h3>${hearts(row.title)}</h3>${row.standing ? `<i>${escapeHtml(row.standing)}</i>` : ''}</div>
                </div>
                <dl class="tier-stats">${values.map((v, k) => `<dt>${escapeHtml(head[k + 2])}</dt><dd>${rich(String(v))}</dd>`).join('')}</dl>
                ${features}
            </div>
            <div class="cover"><span class="etch">Tier ${row.numeral}</span></div>
        </article>`;
}

function favorHtml(item, i) {
    const [f, cut, kind] = FLOWER[item.id] || ['141', 0, 'card'];
    const { rot } = jitter(item.id, .7);
    const gated = item.req && state.tier < item.req;
    const count = state.requested[item.id] || 0;
    const meta = metaParts(item);
    return `
        <article class="favor-card entry${i % 2 ? ' alt' : ''} ${gated ? 'sealed' : 'open'}${count ? ' requested' : ''}" data-id="${item.id}" style="--rot:${rot}deg">
            <button class="price" data-act="request" data-id="${item.id}"${gated ? ' disabled' : ''}>${escapeHtml(meta.price)}</button>
            <figure class="favor-art ${cut ? 'scrap' : 'clipping'}${kind === 'sketch' ? ' charcoal' : ''}">${art(f, cut)}</figure>
            <div class="eph eph-${kind}">
                <h3>${escapeHtml(item.name)}</h3>
                ${meta.shown.length ? `<div class="meta">${escapeHtml(meta.shown.join(' | '))}</div>` : ''}
                <p>${rich(item.text)}</p>
            </div>
            <div class="cover"><span class="etch">Tier ${(tierRow(item.req) || {}).numeral || ''}</span></div>
            <div class="wax glass">M</div>
            ${count > 1 ? `<span class="times">&times;${count}</span>` : ''}
        </article>`;
}

function rulesBlocks() {
    const r = bond.rules;
    const loadoutRule = r.items.find(x => /Loadout/i.test(x.name));
    const upkeepRule = r.items.find(x => /Upkeep/i.test(x.name));
    const count = adjustments();
    const passives = state.slots.filter(Boolean).map(byId).filter(item => item && item.passive);
    const rows = passives.map(item => {
        const meta = metaParts(item);
        const bought = state.bought.has(item.id);
        const owing = state.owing.has(item.id);
        return `<div class="upkeep-row${owing ? ' owing' : ''}">
            <span class="name">${escapeHtml(item.name)}</span>
            <span class="term${bought ? ' woven' : ''}">${escapeHtml(bought ? meta.buyout : meta.upkeep)}</span>
            ${bought ? '<span></span>' : owing ? `<button class="price" data-act="settle" data-id="${item.id}">Settle</button>` : '<span class="ok"></span>'}
        </div>`;
    }).join('');
    return [
        titleCard(r.title, ''),
        ...r.items.map((rule, i) => `
            <div class="rule" style="--rot:${[-.5, .4, -.3][i % 3]}deg">
                <div class="seal-num glass"><span>${i + 1}</span></div>
                <div class="card">${corners()}<h3>${escapeHtml(rule.name)}</h3><p>${rich(rule.text)}</p></div>
            </div>`),
        `<div class="panel" style="--rot:.4deg">
            <h3>${escapeHtml(loadoutRule ? loadoutRule.name : '')}</h3>
            ${state.presence ? `<div class="tally"><div class="coin glass"><span>${visitCost(count)}</span></div><span>${count} ${count === 1 ? 'adjustment' : 'adjustments'}</span></div>`
                : `<p class="quiet">${escapeHtml(appointmentNote())}</p>`}
        </div>`,
        `<div class="panel" style="--rot:-.5deg">
            <h3>${escapeHtml(upkeepRule ? upkeepRule.name : '')}</h3>
            ${rows || `<p class="quiet">${escapeHtml(label(/^Active Passive Upkeep/i))}: 0 Favor / Month</p>`}
            <div class="panel-actions"><button class="price" data-act="month">New month</button></div>
        </div>`
    ];
}

function ledgerValue(row) {
    const tier = tierRow();
    if (/^Current Scythe Tier/i.test(row.label)) return `Tier ${tier.numeral}: ${hearts(tier.title)}`;
    if (/^Standing/i.test(row.label)) return tier.standing ? escapeHtml(tier.standing) : hearts(tier.title);
    if (/^Current Favor/i.test(row.label)) return String(state.favor);
    if (/^Lifetime/i.test(row.label)) return String(state.lifetime);
    if (/^Current Charges/i.test(row.label)) return `${state.charges} / ${maxCharges()}`;
    if (/^Upgrade Slots/i.test(row.label)) return `${state.slots.filter(Boolean).length} / ${tier.slots}`;
    if (/^Active Passive Upkeep/i.test(row.label)) return `${rich(`${upkeep()} Favor`)} / Month`;
    if (/^Current Weapon Form/i.test(row.label)) return rich(weaponForm());
    if (/^Active Slotted Loadout/i.test(row.label)) {
        const empty = (bond.ledger.loadout[0] || {}).value || '';
        const locked = (bond.ledger.loadout[1] || {}).value || '';
        return `<ul>${bond.ledger.loadout.map((slot, i) => {
            const item = state.slots[i] && byId(state.slots[i]);
            const open = state.tier > i;
            return `<li class="${open ? '' : 'locked'}"><em>${escapeHtml(slot.label)}:</em> ${open ? escapeHtml(item ? item.name : empty) : escapeHtml(locked)}</li>`;
        }).join('')}</ul>`;
    }
    return rich(row.value);
}

function journalRows(list, first) {
    const last = journal.length - 1;
    return list.map((h, k) => {
        const when = new Date(h.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const favor = h.f ? `<span class="d-favor">${h.f > 0 ? '+' : '&minus;'}${Math.abs(h.f)}</span>` : '';
        const charges = h.c ? `<span class="d-charge">${h.c > 0 ? '+' : '&minus;'}${Math.abs(h.c)}</span>` : '';
        const canUndo = first && k === 0 && !sealed && journal[last] && journal[last].b;
        return `
            <li class="${h.off ? 'off' : ''}">
                <time>${escapeHtml(when)}</time>
                <span class="what"><span class="kind">${hearts(h.l)}</span>${h.n ? ` ${hearts(h.n)}` : ''}</span>
                <span class="delta">${favor}${charges}</span>
                ${canUndo ? '<button class="price undo" data-act="undo">Undo</button>' : ''}
            </li>`;
    }).join('');
}

function ledgerBlocks() {
    const rows = bond.ledger.rows.map(row => `<div class="row"><b>${escapeHtml(row.label)}</b>${ledgerValue(row)}</div>`);
    const split = rows.length - 1;
    const recent = journal.slice().reverse();
    const chunks = [];
    for (let i = 0; i < Math.max(recent.length, 1); i += 14) chunks.push(recent.slice(i, i + 14));
    return [
        titleCard(bond.ledger.title, ''),
        `<div class="spec-card ledger-card">${rows.slice(0, split).join('')}</div>`,
        `<div class="spec-card ledger-card">${rows.slice(split).join('')}</div>`,
        `<div class="panel keepsake" style="--rot:-.4deg">
            <h3>Save code</h3>
            <textarea id="code-out" readonly rows="3" spellcheck="false"></textarea>
            <div class="panel-actions">
                <button class="price" data-act="copy-code">Copy</button>
                <button class="price" data-act="copy-link">Link</button>
            </div>
            ${sealed ? '' : `
            <textarea id="code-in" rows="2" spellcheck="false" placeholder="${CODE_PREFIX}"></textarea>
            <div class="panel-actions"><button class="price" data-act="load-code">Load</button></div>`}
        </div>`,
        ...chunks.map((chunk, i) => `<ol class="journal">${journalRows(chunk, i === 0)}</ol>`)
    ];
}

function sections() {
    const groups = bond.slotted.groups;
    const links = active => `<div class="links">${groups.map((g, i) => `<button data-group="${i}" class="${i === active ? 'on' : ''}">${escapeHtml(g.title)}</button>`).join('')}</div>`;
    const items = (title, list, extra) => [titleCard(title, '', extra), ...list.map((item, i) => entryHtml(item, i))];
    return [
        { key: 'weapon', tab: bond.title, blocks: weaponBlocks },
        { key: 'tiers', tab: bond.tiers.title, blocks: () => [titleCard(bond.tiers.title, ''), `<div class="paper-note" style="--rot:.6deg">${bond.tiers.text.map(p => `<p>${rich(p)}</p>`).join('')}</div>`, ...bond.tiers.rows.map(tierCard)] },
        { key: 'slotless', tab: shortTitle(bond.slotless.title), blocks: () => items(shortTitle(bond.slotless.title), bond.slotless.items) },
        ...groups.map((g, gi) => ({ key: 'slotted', group: gi, tab: shortTitle(bond.slotted.title), blocks: () => items(shortTitle(bond.slotted.title), g.items, links(gi)) })),
        { key: 'parlor', tab: plain(bond.parlor.title), blocks: () => [titleCard(plain(bond.parlor.title), escapeHtml(aside(bond.parlor.title))), `<div class="paper-note" style="--rot:-.5deg">${bond.parlor.text.map(t => `<p>${rich(t)}</p>`).join('')}</div>`, ...bond.parlor.items.map(favorHtml)] },
        { key: 'rules', tab: bond.rules.title, blocks: rulesBlocks },
        { key: 'ledger', tab: bond.ledger.title, blocks: ledgerBlocks }
    ];
}

function buildNotes() {
    const symbols = {
        weapon: scytheSvg('', '', { reach: .7 }),
        tiers: '<span class="sym-arch glass"></span>',
        slotless: '<img src="assets/flowers/f065.webp" alt="">',
        slotted: '<img src="assets/flowers/f124.webp" alt="">',
        parlor: '<span class="sym-seal glass">M</span>',
        rules: '<span class="sym-ruled"></span>',
        ledger: '<span class="sym-coin glass"></span>'
    };
    const seen = new Set();
    $('notes').innerHTML = sections().filter(s => !seen.has(s.key) && seen.add(s.key)).map(s =>
        `<button class="note-tab" data-key="${s.key}"><span class="sym">${symbols[s.key]}</span><span>${escapeHtml(s.tab)}</span></button>`).join('');
}

function paginate(blocks) {
    const probe = $('probe');
    probe.innerHTML = blocks.map(b => `<div class="flow">${b}</div>`).join('');
    const style = getComputedStyle(probe);
    const room = probe.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const gap = 26;
    const pages = [[]];
    let used = 0;
    [...probe.children].forEach((el, i) => {
        const h = el.offsetHeight;
        if (used > 0 && used + h > room) {
            pages.push([]);
            used = 0;
        }
        pages[pages.length - 1].push(blocks[i]);
        used += h + gap;
    });
    probe.innerHTML = '';
    return pages;
}

function buildBook() {
    const at = spreads[current] ? { key: spreads[current].key, group: spreads[current].group, offset: spreads[current].offset } : null;
    spreads = [];
    sections().forEach(section => {
        const pages = paginate(section.blocks());
        if (pages.length % 2) pages.push(null);
        for (let i = 0; i < pages.length; i += 2) {
            spreads.push({ key: section.key, group: section.group, offset: i / 2, left: pages[i], right: pages[i + 1] });
        }
    });
    if (at) {
        const match = spreads.findIndex(s => s.key === at.key && s.group === at.group && s.offset === at.offset);
        const fallback = spreads.findIndex(s => s.key === at.key && s.group === at.group);
        current = match > -1 ? match : Math.max(0, fallback);
    }
}

function pageInner(blocks, side, index) {
    const body = blocks
        ? blocks.map(b => `<div class="flow">${b}</div>`).join('')
        : `<div class="blank"><img src="assets/flowers/f${BLANK_PAGE[index % BLANK_PAGE.length]}.webp" alt=""></div>`;
    const turn = side === 'left'
        ? `<button class="turn prev" data-turn="-1" aria-label="&larr;"${index === 0 ? ' hidden' : ''}></button>`
        : `<button class="turn next" data-turn="1" aria-label="&rarr;"${index === spreads.length - 1 ? ' hidden' : ''}></button>`;
    return body + turn;
}

function showSpread() {
    const spread = spreads[current];
    $('left').innerHTML = pageInner(spread.left, 'left', current);
    $('right').innerHTML = pageInner(spread.right, 'right', current);
    document.querySelectorAll('.note-tab').forEach(b => b.classList.toggle('on', b.dataset.key === spread.key));
    if ($('code-out')) fillCode();
}

function turnTo(target) {
    if (turning || target === current || !spreads[target]) return;
    const forward = target > current;
    const to = spreads[target];
    const lifted = forward ? $('right') : $('left');
    const landing = forward ? $('left') : $('right');
    const front = document.createElement('section');
    front.className = `page ${forward ? 'right' : 'left'}`;
    front.append(...lifted.childNodes);
    const back = document.createElement('section');
    back.className = `page ${forward ? 'left' : 'right'}`;
    back.innerHTML = pageInner(forward ? to.left : to.right, forward ? 'left' : 'right', target);
    lifted.innerHTML = pageInner(forward ? to.right : to.left, forward ? 'right' : 'left', target);
    const leaf = document.createElement('div');
    leaf.className = `leaf ${forward ? 'next' : 'prev'}`;
    const faceFront = document.createElement('div');
    faceFront.className = 'face recto';
    const shadeFront = document.createElement('div');
    shadeFront.className = 'shade';
    faceFront.append(front, shadeFront);
    const faceBack = document.createElement('div');
    faceBack.className = 'face verso';
    const shadeBack = document.createElement('div');
    shadeBack.className = 'shade';
    faceBack.append(back, shadeBack);
    leaf.append(faceFront, faceBack);
    turning = true;
    current = target;
    $('spread').appendChild(leaf);
    document.querySelectorAll('.note-tab').forEach(b => b.classList.toggle('on', b.dataset.key === to.key));
    const images = [...back.querySelectorAll('img'), ...lifted.querySelectorAll('img')];
    const decoded = Promise.all(images.map(img => img.decode ? img.decode().catch(() => {}) : null));
    let finished = false;
    const done = () => {
        if (finished) return;
        finished = true;
        landing.replaceChildren(...back.childNodes);
        leaf.remove();
        turning = false;
        if ($('code-out')) fillCode();
    };
    Promise.race([decoded, new Promise(resolve => setTimeout(resolve, 250))])
        .then(() => requestAnimationFrame(() => {
            const timing = { duration: 950, easing: 'cubic-bezier(.42, .02, .28, 1)', fill: 'forwards' };
            leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${forward ? -180 : 180}deg)` }], timing).finished.then(done, done);
            shadeFront.animate([{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 1 }], timing);
            shadeBack.animate([{ opacity: 1 }, { opacity: 1, offset: .5 }, { opacity: 0 }], timing);
        }));
    setTimeout(done, 2500);
}

function sectionStart(key, group) {
    return Math.max(0, spreads.findIndex(s => s.key === key && (group === undefined || s.group === group)));
}

function fillCode() {
    const out = $('code-out');
    if (!out) return;
    makeCode().then(code => { out.value = code; }).catch(() => { out.value = ''; });
}

function refreshEntry(id) {
    document.querySelectorAll(`.page .entry[data-id="${id}"]:not(.favor-card)`).forEach(old => {
        const tmp = document.createElement('div');
        tmp.innerHTML = entryHtml(byId(id), old.classList.contains('alt') ? 1 : 0).trim();
        const fresh = tmp.firstChild;
        old.className = fresh.className;
        ['.price', '.specimen', '.card'].forEach(sel => old.querySelector(sel).replaceWith(fresh.querySelector(sel)));
    });
}

function refreshFavor(id) {
    const item = bond.parlor.items.find(i => i.id === id);
    document.querySelectorAll(`.page .favor-card[data-id="${id}"]`).forEach(old => {
        const tmp = document.createElement('div');
        tmp.innerHTML = favorHtml(item, old.classList.contains('alt') ? 1 : 0).trim();
        const fresh = tmp.firstChild;
        old.className = fresh.className;
        const times = old.querySelector('.times');
        if (times) times.remove();
        const freshTimes = fresh.querySelector('.times');
        if (freshTimes) old.appendChild(freshTimes);
        old.querySelector('.price').replaceWith(fresh.querySelector('.price'));
    });
}

function isInside() {
    return $('inside').classList.contains('open');
}

function peer(key) {
    const home = $('home');
    const center = document.querySelector('.pane.center').getBoundingClientRect();
    const box = home.getBoundingClientRect();
    home.style.transformOrigin = `${center.left - box.left + center.width / 2}px ${center.top - box.top + center.height * .35}px`;
    chargeDraft = null;
    $('inside').classList.add('open');
    fitScene();
    buildBook();
    current = sectionStart(key);
    showSpread();
    home.classList.add('peering');
    setTimeout(() => home.classList.add('away'), 1250);
}

function stepBack() {
    const home = $('home');
    renderHome();
    home.classList.remove('away');
    $('inside').classList.remove('open');
    requestAnimationFrame(() => requestAnimationFrame(() => home.classList.remove('peering')));
}

function refuse(el) {
    if (!el || !el.classList) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

function rerender() {
    if (isInside()) {
        buildBook();
        if (!turning) showSpread();
    }
    renderHome();
}

function afterChange() {
    if (isInside()) buildBook();
    renderHome();
}

function setPresence(near) {
    if (sealed || near === state.presence) return;
    if (near) {
        state.visit = loadoutKey();
        state.presence = true;
        save();
        return;
    }
    const before = plainState();
    const cost = visitCost();
    state.favor -= cost;
    state.visit = null;
    state.presence = false;
    clampCharges();
    if (cost) {
        const rule = bond.rules.items.find(x => /Loadout/i.test(x.name));
        commit(rule ? rule.name : '', '', before);
    } else {
        save();
    }
}

function act(button) {
    const kind = button.dataset.act;
    if (kind === 'copy-code' || kind === 'copy-link') return copyCode(button, kind === 'copy-link');
    if (kind === 'grant-open') {
        grantOpen = !grantOpen;
        renderLedger();
        if (grantOpen) $('grant').querySelector('input').focus();
        return;
    }
    if (sealed) return refuse(button);
    const id = button.dataset.id;
    const item = id ? byId(id) : null;
    const before = plainState();

    if (kind === 'unlock') {
        if (state.unlocked.has(id)) return;
        const cost = typeof item.cost === 'number' ? item.cost : 0;
        if (state.favor < cost) return refuse(button);
        state.favor -= cost;
        state.unlocked.add(id);
        commit(boxLabel(item, 'unlocked'), item.name, before);
        refreshEntry(id);
        return afterChange();
    }

    if (kind === 'equip') {
        if (!state.presence) return refuse(button);
        const wasActive = state.active.has(id);
        if (wasActive) {
            state.active.delete(id);
            state.owing.delete(id);
            state.slots = state.slots.map(s => s === id ? null : s);
        } else if (!isSlotless(item)) {
            const free = state.slots.findIndex((s, i) => !s && i < state.tier);
            if (free === -1) return refuse(button);
            state.slots[free] = id;
            state.active.add(id);
            if (item.passive && !state.bought.has(id)) state.owing.add(id);
        } else {
            if (id.startsWith('crystalline-edge')) {
                [...state.active].filter(a => a.startsWith('crystalline-edge') && a !== id).forEach(a => state.active.delete(a));
            }
            state.active.add(id);
        }
        if (visitCost() > state.favor) {
            state = readState(before);
            return refuse(button);
        }
        clampCharges();
        commit(boxLabel(item, 'active'), item.name, before, wasActive);
        if (isSlotless(item)) bond.slotless.items.filter(x => x.id.startsWith('crystalline-edge')).forEach(x => refreshEntry(x.id));
        refreshEntry(id);
        return afterChange();
    }

    if (kind === 'buyout') {
        if (state.bought.has(id)) return;
        if (state.favor < (item.buyout || 0)) return refuse(button);
        state.favor -= item.buyout;
        state.bought.add(id);
        state.owing.delete(id);
        clampCharges();
        commit(boxLabel(item, 'bought'), item.name, before);
        refreshEntry(id);
        return afterChange();
    }

    if (kind === 'ascend') {
        const n = Number(button.dataset.tier);
        const row = tierRow(n);
        if (!state.presence || n !== state.tier + 1 || state.favor < row.cost) return refuse(button);
        state.favor -= row.cost;
        state.tier = n;
        commit(`Tier ${row.numeral}`, row.title, before);
        stepBack();
        setTimeout(() => showTier(), 1500);
        return;
    }

    if (kind === 'request') {
        if (item.cost === '???') return askAmount(button, item);
        if (state.favor < item.cost) return refuse(button);
        state.favor -= item.cost;
        state.requested[id] = (state.requested[id] || 0) + 1;
        commit(plain(bond.parlor.title), item.name, before);
        refreshFavor(id);
        return afterChange();
    }

    if (kind === 'settle') {
        if (state.favor < (item.upkeep || 0)) return refuse(button);
        state.favor -= item.upkeep;
        state.owing.delete(id);
        clampCharges();
        commit(metaParts(item).upkeep, item.name, before);
        return rerender();
    }

    if (kind === 'month') {
        const due = passivesInUse();
        if (!due.length) return refuse(button);
        due.forEach(p => state.owing.add(p.id));
        clampCharges();
        commit('New month', '', before);
        return rerender();
    }

    if (kind === 'bead') {
        const i = Number(button.dataset.i);
        const target = chargeDraft ?? state.charges;
        chargeDraft = i < target ? i : i + 1;
        return renderSillScythe();
    }

    if (kind === 'charges-cancel') {
        chargeDraft = null;
        return renderSillScythe();
    }

    if (kind === 'charges-confirm') {
        const target = Math.min(maxCharges(), chargeDraft ?? state.charges);
        if (target > state.charges) {
            const cost = Math.ceil((target - state.charges) / refillRate());
            if (state.favor < cost) return refuse(button);
            state.favor -= cost;
            state.charges = target;
            const choice = refillChoice();
            commit(choice.head, choice.body, before);
        } else if (target < state.charges) {
            state.charges = target;
            commit(label(/^Current Charges/i), '', before);
        }
        chargeDraft = null;
        return rerender();
    }

    if (kind === 'undo') {
        if (!undo()) return refuse(button);
        showTier();
        return rerender();
    }

    if (kind === 'load-code') {
        readCode($('code-in').value).then(loaded => {
            state = loaded.state;
            commit('Save code', '', before);
            showTier();
            rerender();
        }).catch(() => refuse(button));
    }
}

function askAmount(button, item) {
    if (button.querySelector('input')) return;
    button.innerHTML = `<input type="number" min="0" placeholder="???" aria-label="${escapeHtml(item.meta)}">`;
    const input = button.querySelector('input');
    input.focus();
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') return refreshFavor(item.id);
        if (e.key !== 'Enter') return;
        const amount = Number(input.value);
        if (!input.value || amount < 0 || amount > state.favor) return refuse(button);
        const before = plainState();
        state.favor -= amount;
        state.requested[item.id] = (state.requested[item.id] || 0) + 1;
        commit(plain(bond.parlor.title), item.name, before);
        refreshFavor(item.id);
        afterChange();
    });
}

function grantFrom(form) {
    if (sealed) return;
    const favor = Math.max(0, Math.floor(Number(form.favor.value) || 0));
    const charges = Math.max(0, Math.floor(Number(form.charges.value) || 0));
    if (!favor && !charges) return refuse(form.querySelector('.price'));
    const before = plainState();
    state.favor += favor;
    state.lifetime += favor;
    state.charges = Math.min(maxCharges(), state.charges + charges);
    commit('Grant', '', before);
    grantOpen = false;
    rerender();
}

function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return Promise.resolve();
}

function copyCode(button, asLink) {
    makeCode().then(code => copyText(asLink ? `${location.origin}${location.pathname}#seal=${code}` : code)).then(() => {
        button.classList.remove('copied');
        void button.offsetWidth;
        button.classList.add('copied');
    }).catch(() => refuse(button));
}

function fitScene() {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.innerHeight;
    $('scene').style.zoom = Math.max(.55, Math.min(width / 1440, height / 985));
    document.querySelector('.book-wrap').style.zoom = Math.max(.55, Math.min(width / 1440, height / BOOK_HEIGHT));
}

const music = $('music');
const MUSIC_VOLUME = .26;
let musicFade = null;
let musicWanted = true;

function fadeMusic(target, ms, done) {
    clearInterval(musicFade);
    const from = music.volume;
    const start = performance.now();
    musicFade = setInterval(() => {
        const k = Math.min(1, (performance.now() - start) / ms);
        music.volume = from + (target - from) * k * k * (3 - 2 * k);
        if (k < 1) return;
        clearInterval(musicFade);
        if (done) done();
    }, 40);
}

function firstGesture(e) {
    if (e.target.closest && e.target.closest('#music-toggle')) return;
    startMusic();
}

function startMusic() {
    if (!musicWanted || !music.paused) return;
    music.volume = 0;
    music.play().then(() => {
        fadeMusic(MUSIC_VOLUME, 6000);
        document.removeEventListener('pointerdown', firstGesture, true);
        document.removeEventListener('keydown', firstGesture, true);
    }).catch(() => {});
}

function setMusic(on) {
    musicWanted = on;
    $('music-toggle').classList.toggle('off', !on);
    $('music-toggle').setAttribute('aria-pressed', on ? 'true' : 'false');
    try {
        localStorage.setItem('morvelle-music', on ? 'on' : 'off');
    } catch (error) {
        musicWanted = on;
    }
    if (on) startMusic();
    else fadeMusic(0, 1200, () => music.pause());
}

function setFrost(on) {
    document.body.classList.toggle('no-frost', !on);
    $('frost').setAttribute('aria-pressed', on ? 'true' : 'false');
    try {
        localStorage.setItem('morvelle-frost', on ? 'on' : 'off');
    } catch (error) {
        return;
    }
}

function readPreferences() {
    try {
        musicWanted = localStorage.getItem('morvelle-music') !== 'off';
        if (localStorage.getItem('morvelle-frost') === 'off') setFrost(false);
    } catch (error) {
        musicWanted = true;
    }
    $('music-toggle').classList.toggle('off', !musicWanted);
}

document.addEventListener('click', e => {
    const opener = e.target.closest('[data-open]');
    if (opener) return peer(opener.dataset.open);
    const tab = e.target.closest('.note-tab');
    if (tab) return turnTo(sectionStart(tab.dataset.key));
    const group = e.target.closest('[data-group]');
    if (group) return turnTo(sectionStart('slotted', Number(group.dataset.group)));
    const turn = e.target.closest('[data-turn]');
    if (turn) return turnTo(current + Number(turn.dataset.turn));
    const action = e.target.closest('[data-act]');
    if (action) {
        if (action.disabled || (action.getAttribute && action.getAttribute('disabled') !== null)) return;
        return act(action);
    }
    const near = e.target.closest('.presence-icon');
    if (near && !near.disabled) {
        setPresence(near.dataset.near === '1');
        return rerender();
    }
});

document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'grant') grantFrom(e.target);
});

document.addEventListener('input', e => {
    const form = e.target.closest('#stats-in');
    if (!form || sealed) return;
    const read = value => value === '' ? null : Math.round(Number(value)) || 0;
    state.mod = read(form.mod.value);
    state.prof = read(form.prof.value);
    save();
    $('roll').innerHTML = rollHtml();
    afterChange();
});

document.addEventListener('keydown', e => {
    if (!isInside() || (e.target.closest && e.target.closest('input, textarea'))) return;
    if (e.key === 'Escape') return stepBack();
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step) turnTo(current + step);
});

$('back').addEventListener('click', stepBack);
$('frost').addEventListener('click', () => setFrost(document.body.classList.contains('no-frost')));
$('music-toggle').addEventListener('click', () => setMusic(!musicWanted));
window.addEventListener('resize', fitScene);
window.addEventListener('storage', e => {
    if (e.key !== SAVE_KEY || sealed) return;
    chargeDraft = null;
    loadSaved();
    showTier();
    rerender();
});

function openSeal(code) {
    return readCode(code).then(loaded => {
        sealed = true;
        sealedAt = loaded.at;
        state = loaded.state;
        journal = loaded.journal;
        document.body.classList.add('sealed');
        $('sealed-mark').hidden = false;
        $('sealed-date').textContent = new Date(sealedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }).catch(() => loadSaved());
}

readPreferences();
fitScene();
document.addEventListener('pointerdown', firstGesture, true);
document.addEventListener('keydown', firstGesture, true);
startMusic();

Promise.all([loadBond(), loadScythe(), document.fonts ? document.fonts.ready : null]).then(([data]) => {
    bond = data;
    const seal = location.hash.match(/^#seal=(.+)$/);
    return seal ? openSeal(seal[1]) : loadSaved();
}).then(() => {
    $('title').textContent = bond.title;
    $('subtitle').textContent = bond.subtitle;
    renderVeil();
    renderCrest();
    buildNotes();
    renderLatch();
    renderHome();
    showTier(true);
    document.body.classList.add('ready');
}).catch(() => {
    document.body.classList.add('failed');
});
