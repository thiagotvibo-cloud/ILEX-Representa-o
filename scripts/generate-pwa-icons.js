import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Emblema vetorial ILEX (Pilares Dourados + Folha Verde Botânica + Fita Dupla Dourada)
const emblemSvg = `
  <g transform="translate(56, 56) scale(0.78)">
    <!-- 4 Architectural Towers / Columns -->
    <g id="architectural-pillars">
      <polygon points="237,562 338,477 338,898 237,870" fill="#A68A56" />
      <polygon points="367,378 468,304 468,936 367,908" fill="#A68A56" />
      <path d="M 498,660 L 498,172 L 632,62 L 632,530 C 580,575 525,620 498,660 Z" fill="#A68A56" />
      <path d="M 662,332 L 762,420 L 762,490 C 730,500 690,515 662,530 Z" fill="#A68A56" />
    </g>

    <!-- Botanical Leaf Element with Dual Metallic Ribbon -->
    <g id="botanical-leaf">
      <path d="M 508,936 C 498,840 508,685 640,575 C 695,530 750,535 762,540 C 755,565 740,610 718,665 C 680,755 628,875 508,936 Z" 
            fill="#A68A56" />
      <path d="M 518,936 C 512,855 522,710 630,605 C 675,565 722,560 746,560 C 722,635 658,815 518,936 Z" 
            fill="#C0A775" />
      <path d="M 526,936 C 526,845 546,705 650,602 C 702,552 752,556 752,556 C 752,556 728,668 670,778 C 612,886 552,928 526,936 Z" 
            fill="#445236" />
      <path d="M 532,928 Q 600,810 740,580" 
            stroke="#11160F" stroke-width="8" stroke-linecap="round" fill="none" />
      <path d="M 560,862 Q 600,868 630,846" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 570,842 Q 545,826 540,802" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 605,782 Q 655,782 685,746" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 618,762 Q 580,746 568,706" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 655,696 Q 700,686 718,652" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 668,676 Q 625,660 612,620" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 704,622 Q 728,606 736,582" stroke="#11160F" stroke-width="5" stroke-linecap="round" fill="none" />
    </g>
  </g>
`;

// 1. Standard App Icon (512x512 with luxury rounded corners)
const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <rect width="1000" height="1000" rx="220" fill="#17211C" />
  <rect width="996" height="996" x="2" y="2" rx="218" fill="none" stroke="#A68A56" stroke-width="6" stroke-opacity="0.25" />
  ${emblemSvg}
</svg>`;

// 2. Maskable Icon (Full-bleed square background with 65% safe-zone emblem for Android adaptive icons)
const maskableIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <rect width="1000" height="1000" fill="#17211C" />
  <g transform="translate(175, 175) scale(0.65)">
    <!-- 4 Architectural Towers / Columns -->
    <g id="architectural-pillars">
      <polygon points="237,562 338,477 338,898 237,870" fill="#A68A56" />
      <polygon points="367,378 468,304 468,936 367,908" fill="#A68A56" />
      <path d="M 498,660 L 498,172 L 632,62 L 632,530 C 580,575 525,620 498,660 Z" fill="#A68A56" />
      <path d="M 662,332 L 762,420 L 762,490 C 730,500 690,515 662,530 Z" fill="#A68A56" />
    </g>
    <!-- Botanical Leaf Element with Dual Metallic Ribbon -->
    <g id="botanical-leaf">
      <path d="M 508,936 C 498,840 508,685 640,575 C 695,530 750,535 762,540 C 755,565 740,610 718,665 C 680,755 628,875 508,936 Z" fill="#A68A56" />
      <path d="M 518,936 C 512,855 522,710 630,605 C 675,565 722,560 746,560 C 722,635 658,815 518,936 Z" fill="#C0A775" />
      <path d="M 526,936 C 526,845 546,705 650,602 C 702,552 752,556 752,556 C 752,556 728,668 670,778 C 612,886 552,928 526,936 Z" fill="#445236" />
      <path d="M 532,928 Q 600,810 740,580" stroke="#11160F" stroke-width="8" stroke-linecap="round" fill="none" />
      <path d="M 560,862 Q 600,868 630,846" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 570,842 Q 545,826 540,802" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 605,782 Q 655,782 685,746" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 618,762 Q 580,746 568,706" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 655,696 Q 700,686 718,652" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 668,676 Q 625,660 612,620" stroke="#11160F" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M 704,622 Q 728,606 736,582" stroke="#11160F" stroke-width="5" stroke-linecap="round" fill="none" />
    </g>
  </g>
</svg>`;

const tmpAppIcon = path.join('/tmp', 'app-icon-tmp.svg');
const tmpMaskable = path.join('/tmp', 'maskable-tmp.svg');

fs.writeFileSync(tmpAppIcon, appIconSvg);
fs.writeFileSync(tmpMaskable, maskableIconSvg);

// Generate PNG outputs via rsvg-convert
execSync(`rsvg-convert -w 192 -h 192 "${tmpAppIcon}" -o "${path.join(publicDir, 'pwa-192x192.png')}"`);
execSync(`rsvg-convert -w 512 -h 512 "${tmpAppIcon}" -o "${path.join(publicDir, 'pwa-512x512.png')}"`);
execSync(`rsvg-convert -w 180 -h 180 "${tmpAppIcon}" -o "${path.join(publicDir, 'apple-touch-icon.png')}"`);
execSync(`rsvg-convert -w 512 -h 512 "${tmpMaskable}" -o "${path.join(publicDir, 'pwa-maskable-512x512.png')}"`);

console.log('✅ All PWA and touch icons generated with high resolution from the new ILEX logo!');
