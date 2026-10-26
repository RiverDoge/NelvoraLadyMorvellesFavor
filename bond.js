const BOND_FILE = "Lady Morvelle's Bond.md";

const ROMAN = { I: 1, V: 5, X: 10 };

function romanToNumber(text) {
    const letters = String(text || '').trim().toUpperCase();
    let total = 0;
    for (let i = 0; i < letters.length; i++) {
        const value = ROMAN[letters[i]] || 0;
        const next = ROMAN[letters[i + 1]] || 0;
        total += value < next ? -value : value;
    }
    return total;
}

function slugify(text) {
    return String(text)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function inline(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
}

function readBlocks(lines) {
    const sections = [{ level: 0, title: '', blocks: [] }];
    let paragraph = null;
    let list = null;
    let table = null;

    const current = () => sections[sections.length - 1];
    const close = () => {
        paragraph = null;
        list = null;
        table = null;
    };

    for (const raw of lines) {
        const line = raw.replace(/\s+$/, '');
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        const item = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);

        if (!line.trim()) {
            paragraph = null;
            table = null;
            continue;
        }

        if (heading) {
            close();
            sections.push({ level: heading[1].length, title: heading[2].trim(), blocks: [] });
            continue;
        }

        if (line.trim().startsWith('|')) {
            paragraph = null;
            list = null;
            if (!table) {
                table = { type: 'table', rows: [] };
                current().blocks.push(table);
            }
            const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
            if (!cells.every(cell => /^:?-+:?$/.test(cell))) table.rows.push(cells);
            continue;
        }

        if (item) {
            paragraph = null;
            table = null;
            const depth = Math.floor(item[1].replace(/\t/g, '    ').length / 2);
            const node = { text: item[3].trim(), ordered: /\d/.test(item[2]), children: [], depth };
            if (!list) {
                list = { type: 'list', items: [], stack: [] };
                current().blocks.push(list);
            }
            while (list.stack.length && list.stack[list.stack.length - 1].depth >= depth) list.stack.pop();
            const parent = list.stack[list.stack.length - 1];
            (parent ? parent.children : list.items).push(node);
            list.stack.push(node);
            continue;
        }

        if (list && /^\s+/.test(line)) {
            const last = list.stack[list.stack.length - 1];
            last.text += ' ' + line.trim();
            continue;
        }

        list = null;
        table = null;
        if (paragraph) {
            paragraph.text += ' ' + line.trim();
        } else {
            paragraph = { type: 'paragraph', text: line.trim() };
            current().blocks.push(paragraph);
        }
    }

    return sections;
}

function splitEntry(text) {
    if (!text.startsWith('**')) return { head: '', body: text };
    const colon = text.indexOf(':**');
    if (colon > -1) return { head: text.slice(2, colon).trim(), body: text.slice(colon + 3).trim() };
    const end = text.indexOf('**', 2);
    if (end > -1) return { head: text.slice(2, end).trim(), body: text.slice(end + 2).replace(/^:\s*/, '').trim() };
    return { head: '', body: text };
}

function splitHead(head) {
    if (!head.endsWith(')')) return { name: head, meta: '' };
    let depth = 0;
    for (let i = head.length - 1; i >= 0; i--) {
        if (head[i] === ')') depth++;
        if (head[i] === '(') depth--;
        if (depth === 0) return { name: head.slice(0, i).trim(), meta: head.slice(i + 1, -1).trim() };
    }
    return { name: head, meta: '' };
}

function readAmount(text) {
    const match = String(text).match(/(\d+|\?\?\?)/);
    if (!match) return null;
    return match[1] === '???' ? '???' : Number(match[1]);
}

function readMeta(meta) {
    const info = { kind: '', tier: 1, cost: null, upkeep: 0, buyout: null, req: 0, charges: 0 };
    meta.split('|').map(part => part.trim()).filter(Boolean).forEach(part => {
        let match;
        if ((match = part.match(/^Tier\s+([IVX]+)$/i))) info.tier = romanToNumber(match[1]);
        else if ((match = part.match(/^Req:\s*Tier\s+([IVX]+)/i))) info.req = romanToNumber(match[1]);
        else if (/^Unlock:/i.test(part)) info.cost = readAmount(part);
        else if (/^Upkeep:/i.test(part)) info.upkeep = readAmount(part);
        else if (/^Buyout:/i.test(part)) info.buyout = readAmount(part);
        else if (/^(\d+|\?\?\?)\s*Favor$/i.test(part)) info.cost = readAmount(part);
        else {
            info.kind = part;
            const charges = part.match(/(\d+)\s*Charges?/i);
            if (charges) info.charges = Number(charges[1]);
        }
    });
    info.passive = /^Passive/i.test(info.kind);
    return info;
}

function boxRole(label) {
    if (/^Unlocked/i.test(label)) return 'unlocked';
    if (/^Upkeep Bought Out/i.test(label)) return 'bought';
    if (/^(Equipped|Currently Active)/i.test(label)) return 'active';
    return 'other';
}

function readItem(node) {
    const { head, body } = splitEntry(node.text);
    const { name, meta } = splitHead(head);
    const boxes = [];
    const parts = [];
    node.children.forEach(child => {
        const box = child.text.match(/^\[([ xX])\]\s*(.*)$/);
        if (box) {
            boxes.push({ label: box[2].trim(), role: boxRole(box[2].trim()), checked: box[1] !== ' ' });
        } else {
            const part = splitEntry(child.text);
            parts.push({ name: part.head, text: part.body });
        }
    });
    return Object.assign({ id: slugify(name), name, meta, text: body, boxes, parts }, readMeta(meta));
}

function findSection(sections, pattern, level) {
    return sections.find(section => pattern.test(section.title) && (!level || section.level === level));
}

function sectionText(section) {
    if (!section) return [];
    return section.blocks.filter(block => block.type === 'paragraph').map(block => block.text);
}

function sectionItems(section) {
    if (!section) return [];
    return section.blocks.filter(block => block.type === 'list').flatMap(block => block.items);
}

function childrenOf(sections, parent) {
    const start = sections.indexOf(parent);
    const out = [];
    for (let i = start + 1; i < sections.length && sections[i].level > parent.level; i++) out.push(sections[i]);
    return out;
}

function readLedger(section) {
    const ledger = { title: section ? section.title : '', rows: [], loadout: [] };
    sectionItems(section).forEach(node => {
        const { head, body } = splitEntry(node.text);
        ledger.rows.push({ label: head, value: body });
        node.children.forEach(child => {
            const slot = child.text.match(/^\*(.+?):\*\s*(.*)$/);
            if (slot) ledger.loadout.push({ label: slot[1].trim(), value: slot[2].trim() });
        });
    });
    const value = pattern => (ledger.rows.find(row => pattern.test(row.label)) || {}).value || '';
    const pair = text => (String(text).match(/(\d+)\s*\/\s*(\d+)/) || []).slice(1).map(Number);
    ledger.favor = readAmount(value(/^Current Favor/i)) || 0;
    ledger.lifetime = readAmount(value(/^Lifetime Favor/i)) || 0;
    ledger.charges = pair(value(/^Current Charges/i))[0] || 0;
    ledger.tier = romanToNumber((value(/^Current Scythe Tier/i).match(/Tier\s+([IVX]+)/i) || [])[1]) || 1;
    return ledger;
}

function readTiers(section) {
    const table = section && section.blocks.find(block => block.type === 'table');
    if (!table) return [];
    return table.rows.slice(1).map(cells => {
        const titled = cells[1].match(/^(.*?)\s*\((.*)\)$/);
        return {
            numeral: cells[0],
            n: romanToNumber(cells[0]),
            title: titled ? titled[1] : cells[1],
            standing: titled ? titled[2] : '',
            costText: cells[2],
            cost: /gift/i.test(cells[2]) ? 0 : readAmount(cells[2]),
            bonus: cells[3],
            slots: Number(cells[4]),
            charges: Number(cells[5]),
            dc: Number(cells[6]),
            necrotic: cells[7]
        };
    });
}

function readWeapon(section, sections) {
    if (!section) return null;
    const lines = section.blocks.filter(block => block.type === 'paragraph').map(block => block.text);
    const subtitle = lines.find(line => /^\*[^*].*\*$/.test(line)) || '';
    const stats = sectionItems(section).map(node => {
        const { head, body } = splitEntry(node.text);
        return { label: head, text: body, children: node.children.map(child => splitEntry(child.text)) };
    });
    const refill = { near: 2, afar: 1 };
    stats.forEach(stat => stat.children.forEach(child => {
        const rate = child.body.match(/(\d+)\s*Favor\s+refills\s+(\d+)\s*Charge/i);
        if (!rate) return;
        if (/Presence/i.test(child.head)) refill.near = Number(rate[2]) / Number(rate[1]);
        if (/Afar/i.test(child.head)) refill.afar = Number(rate[2]) / Number(rate[1]);
    }));
    const traitSection = childrenOf(sections, section).find(sub => /Traits/i.test(sub.title));
    const traits = sectionItems(traitSection).map(node => {
        const { head, body } = splitEntry(node.text);
        const { name, meta } = splitHead(head);
        return { name, kind: meta, text: body };
    });
    return {
        title: section.title,
        subtitle: subtitle.replace(/^\*|\*$/g, ''),
        text: lines.filter(line => line !== subtitle),
        stats,
        refill,
        traitsTitle: traitSection ? traitSection.title : '',
        traits
    };
}

function readFeatures(section) {
    return sectionItems(section).map(node => {
        const { head, body } = splitEntry(node.text);
        const { name, meta } = splitHead(head);
        return {
            tier: romanToNumber((name.match(/Tier\s+([IVX]+)/i) || [])[1]),
            label: name,
            name: meta,
            text: body,
            parts: node.children.map(child => {
                const part = splitEntry(child.text);
                return { name: part.head, text: part.body };
            })
        };
    });
}

function readRules(section) {
    return sectionItems(section).map(node => {
        const { head, body } = splitEntry(node.text);
        return { name: head, text: body };
    });
}

function readBond(markdown) {
    const sections = readBlocks(markdown.replace(/\r\n?/g, '\n').split('\n'));
    const titleSection = sections.find(section => section.level === 1);
    const weaponSection = findSection(sections, /^Base Weapon/i, 2);
    const tierSection = findSection(sections, /Tiers of Patronage/i, 2);
    const slotlessSection = findSection(sections, /^(Slotless\s+)?Alterations|^Slotless/i, 2);
    const slottedSection = findSection(sections, /^(Slotted\s+)?Upgrades|^Slotted/i, 2);
    const parlorSection = findSection(sections, /Parlor/i, 2);
    const rulesSection = findSection(sections, /Reforging|Upkeep Rules/i, 2);

    const fullTitle = titleSection ? titleSection.title : '';
    const [title, subtitle] = fullTitle.split(/:\s*/);

    return {
        title: title || fullTitle,
        subtitle: subtitle || '',
        fullTitle,
        intro: sectionText(titleSection),
        ledger: readLedger(findSection(sections, /^Ledger/i, 2)),
        weapon: readWeapon(weaponSection, sections),
        tiers: {
            title: tierSection ? tierSection.title : '',
            text: sectionText(tierSection),
            headers: ((tierSection && tierSection.blocks.find(block => block.type === 'table')) || { rows: [[]] }).rows[0],
            rows: readTiers(tierSection),
            features: readFeatures(tierSection && childrenOf(sections, tierSection).find(sub => /Core Features/i.test(sub.title))),
            featuresTitle: (tierSection && (childrenOf(sections, tierSection).find(sub => /Core Features/i.test(sub.title)) || {}).title) || ''
        },
        rules: {
            title: rulesSection ? rulesSection.title : '',
            items: readRules(rulesSection)
        },
        slotless: {
            title: slotlessSection ? slotlessSection.title : '',
            note: sectionText(slotlessSection),
            items: sectionItems(slotlessSection).map(readItem)
        },
        slotted: {
            title: slottedSection ? slottedSection.title : '',
            note: sectionText(slottedSection),
            groups: slottedSection ? childrenOf(sections, slottedSection).map(group => ({
                title: group.title,
                items: sectionItems(group).map(readItem)
            })) : []
        },
        parlor: {
            title: parlorSection ? parlorSection.title : '',
            text: sectionText(parlorSection),
            items: sectionItems(parlorSection).map(readItem)
        }
    };
}

function loadBond() {
    return fetch(encodeURI(BOND_FILE), { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) throw new Error(response.status);
            return response.text();
        })
        .then(readBond);
}
