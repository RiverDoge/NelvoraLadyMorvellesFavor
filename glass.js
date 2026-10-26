const SCYTHE_VIEW = '56 64 220 372';
const ROD = { x1: 244, y1: 121, x2: 158, y2: 424 };
const ROD_ANGLE = Math.atan2(ROD.y2 - ROD.y1, ROD.x2 - ROD.x1) * 180 / Math.PI;

const BLADES = {
    crimson: ['#ff9fb0', '#d93556', '#9a0f2c', '#4a0410'],
    vitae: ['#d79bc4', '#7d2f63', '#43113a', '#1c0418'],
    tuning: ['#fff1f4', '#f2b3c0', '#d0697f', '#8e2a45']
};

const SCYTHE_DEFS = `
<defs>
    ${Object.entries(BLADES).map(([name, c]) => `
    <linearGradient id="blade-${name}" x1="0" y1="0" x2=".9" y2="1">
        <stop offset="0" stop-color="${c[0]}" stop-opacity=".88"/>
        <stop offset=".25" stop-color="${c[1]}" stop-opacity=".82"/>
        <stop offset=".6" stop-color="${c[2]}" stop-opacity=".88"/>
        <stop offset="1" stop-color="${c[3]}" stop-opacity=".95"/>
    </linearGradient>`).join('')}
    <linearGradient id="rod-glass" gradientUnits="userSpaceOnUse" x1="244" y1="121" x2="158" y2="424">
        <stop offset="0" stop-color="#c41f43"/>
        <stop offset=".5" stop-color="#93102c"/>
        <stop offset="1" stop-color="#5a0717"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6e3b0"/>
        <stop offset=".45" stop-color="#c49a52"/>
        <stop offset=".7" stop-color="#8a6428"/>
        <stop offset="1" stop-color="#e9cf8e"/>
    </linearGradient>
    <linearGradient id="scythe-sheen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".44" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".5" stop-color="#fff" stop-opacity=".7"/>
        <stop offset=".57" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        <animateTransform attributeName="gradientTransform" type="translate" values="-1 0; 1 0; 1 0" keyTimes="0; .3; 1" dur="8s" repeatCount="indefinite"/>
    </linearGradient>
    <radialGradient id="bead-glass" cx=".36" cy=".3" r=".75">
        <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
        <stop offset=".12" stop-color="#ffd0d8" stop-opacity=".9"/>
        <stop offset=".3" stop-color="#e8506b"/>
        <stop offset=".7" stop-color="#a3112f"/>
        <stop offset="1" stop-color="#560716"/>
    </radialGradient>
    <radialGradient id="bead-empty" cx=".36" cy=".3" r=".75">
        <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
        <stop offset=".14" stop-color="#fff" stop-opacity=".6"/>
        <stop offset=".6" stop-color="#fbeeee" stop-opacity=".55"/>
        <stop offset="1" stop-color="#d9b5b8" stop-opacity=".8"/>
    </radialGradient>
    <clipPath id="blade-clip"><polygon points="40,40 300,40 300,126 236,130 40,268"/></clipPath>
    <filter id="soft"><feGaussianBlur stdDeviation="1.3"/></filter>
    <filter id="thick" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/>
        <feOffset dx="-2" dy="-3" result="o"/>
        <feComposite in="SourceAlpha" in2="o" operator="out" result="rim"/>
        <feFlood flood-color="#2a0108" flood-opacity=".5"/>
        <feComposite in2="rim" operator="in" result="shade"/>
        <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge>
    </filter>
    <filter id="bead-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="g"/>
        <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
</defs>`;

let bladePath = '';
let bladeEdge = '';
let glassCount = 0;

function loadScythe() {
    return fetch('assets/scythe.svg').then(r => r.text()).then(text => {
        bladePath = (text.match(/<path class="body" d="([^"]+)"/) || [])[1] || '';
        bladeEdge = (text.match(/<path class="edge" d="([^"]+)"/) || [])[1] || '';
    });
}

function rodPoint(t) {
    return [ROD.x1 + (ROD.x2 - ROD.x1) * t, ROD.y1 + (ROD.y2 - ROD.y1) * t];
}

function across(t, width, length, fill, extra = '') {
    const [x, y] = rodPoint(t);
    return `<g transform="translate(${x} ${y}) rotate(${ROD_ANGLE})"><rect x="${-width / 2}" y="${-length / 2}" width="${width}" height="${length}" rx="${Math.min(width, length) / 3}" fill="${fill}" ${extra}/></g>`;
}

function scytheBody(extra = '', options = {}) {
    const reach = options.reach || 1;
    const blade = options.blade || 'crimson';
    const [ex, ey] = rodPoint(reach);
    const mounts = (options.mounts || []).map(t => across(t, 9, 34, 'url(#gold)', 'stroke="#6b4a1c" stroke-opacity=".5" stroke-width=".8"')).join('');
    return `
        <g class="scythe-glass">
            <line x1="${ROD.x1}" y1="${ROD.y1}" x2="${ex}" y2="${ey}" stroke="#3e030c" stroke-opacity=".35" stroke-width="9.5" stroke-linecap="round"/>
            <line x1="${ROD.x1}" y1="${ROD.y1}" x2="${ex}" y2="${ey}" stroke="url(#rod-glass)" stroke-width="7.5" stroke-linecap="round" stroke-opacity=".92"/>
            <line x1="${ROD.x1 - 1.6}" y1="${ROD.y1 + 2}" x2="${ex - 1.6}" y2="${ey - 4}" stroke="#ffd6dd" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/>
            <g clip-path="url(#blade-clip)">
                <path d="${bladePath}" fill="url(#blade-${blade})" stroke="#4a0410" stroke-opacity=".5" stroke-width="1" filter="url(#thick)"/>
                <path d="${bladePath}" fill="url(#scythe-sheen)" style="mix-blend-mode:screen"/>
            </g>
            <path class="edge-path" d="${bladeEdge}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.4" stroke-linecap="round" filter="url(#soft)" transform="translate(1 4)"/>
            ${across(.035, 7, 13, 'url(#gold)', 'stroke="#6b4a1c" stroke-opacity=".45" stroke-width=".6"')}
            ${mounts}
            ${extra}
        </g>`;
}

function ownIds(markup) {
    const n = ++glassCount;
    return markup.replace(/id="([^"]+)"/g, `id="$1-${n}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${n})`);
}

function scytheSvg(extra = '', attrs = '', options = {}) {
    const body = scytheBody(extra, options);
    return ownIds(`<svg viewBox="${SCYTHE_VIEW}" ${attrs}>${SCYTHE_DEFS}${options.mirror ? `<g transform="translate(332 0) scale(-1 1)">${body}</g>` : body}</svg>`);
}

function fitSvg(svg, pad = 8) {
    const toSvg = svg.getScreenCTM().inverse();
    const points = [];
    const add = (el, x, y) => points.push(new DOMPoint(x, y).matrixTransform(el.getScreenCTM()).matrixTransform(toSvg));
    svg.querySelectorAll('line').forEach(el => {
        add(el, +el.getAttribute('x1'), +el.getAttribute('y1'));
        add(el, +el.getAttribute('x2'), +el.getAttribute('y2'));
    });
    svg.querySelectorAll('circle').forEach(el => {
        const cx = +el.getAttribute('cx'), cy = +el.getAttribute('cy'), r = +el.getAttribute('r');
        [[cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r]].forEach(([x, y]) => add(el, x, y));
    });
    svg.querySelectorAll('.edge-path').forEach(el => {
        const length = el.getTotalLength();
        for (let i = 0; i <= 40; i++) {
            const p = el.getPointAtLength(length * i / 40);
            add(el, p.x, p.y);
        }
    });
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const x1 = Math.min(...xs) - pad, y1 = Math.min(...ys) - pad;
    svg.setAttribute('viewBox', `${x1} ${y1} ${Math.max(...xs) - x1 + pad} ${Math.max(...ys) - y1 + pad}`);
}
