"""
Script to generate exact vector SVG assets for ILEX Logos:
- LOGO-05 / logo-05-dourada.svg (Dourada para fundos escuros)
- LOGO-06 / logo-06-verde.svg (Verde para fundos claros)
"""

import os

SVG_DIR = "public/assets"
os.makedirs(SVG_DIR, exist_ok=True)

# Exact colors from uploaded images:
# LOGO-05: Gold pillars (#A68A56), Green leaf body (#445236), Dual-tone gold ribbon (#A68A56 & #C0A775), Dark Charcoal veins (#11160F)
# LOGO-06: Green pillars (#445236), Green leaf body (#445236), Dual-tone gold ribbon (#A68A56 & #C0A775), Dark Charcoal veins (#11160F)

GOLD_PILLAR = "#A68A56"
GREEN_PILLAR = "#445236"
GOLD_OUTER_RIBBON = "#A68A56"
GOLD_INNER_RIBBON = "#C0A775"
LEAF_GREEN = "#445236"
VEIN_DARK = "#11160F"

def generate_svg(variant="gold"):
    """
    variant: 'gold' (Logo 05 - fundos escuros) or 'green' (Logo 06 - fundos claros)
    """
    pillar_color = GOLD_PILLAR if variant == "gold" else GREEN_PILLAR

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="100%" height="100%" fill="none">
  <!-- ILEX Architectural Columns & Botanical Leaf Mark -->
  <!-- Variant: {"LOGO-05 (Pilares Dourados)" if variant == "gold" else "LOGO-06 (Pilares Verdes)"} -->
  
  <!-- 4 Architectural Towers / Columns -->
  <g id="architectural-pillars">
    <!-- Pillar 1 (Leftmost Tower) -->
    <polygon points="237,562 338,477 338,898 237,870" fill="{pillar_color}" />

    <!-- Pillar 2 (Second Tower) -->
    <polygon points="367,378 468,304 468,936 367,908" fill="{pillar_color}" />

    <!-- Pillar 3 (Tall Central Spire - sculpted above leaf) -->
    <path d="M 498,660 L 498,172 L 632,62 L 632,530 C 580,575 525,620 498,660 Z" fill="{pillar_color}" />

    <!-- Pillar 4 (Right Facet Tower - sculpted above leaf) -->
    <path d="M 662,332 L 762,420 L 762,490 C 730,500 690,515 662,530 Z" fill="{pillar_color}" />
  </g>

  <!-- Botanical Leaf Element with Dual Metallic Ribbon -->
  <g id="botanical-leaf">
    <!-- Outer Metallic Ribbon (Layer 1 - Warm Gold) -->
    <path d="M 508,936 C 498,840 508,685 640,575 C 695,530 750,535 762,540 C 755,565 740,610 718,665 C 680,755 628,875 508,936 Z" 
          fill="{GOLD_OUTER_RIBBON}" />

    <!-- Inner Ribbon Layer (Layer 2 - Champagne Accent) -->
    <path d="M 518,936 C 512,855 522,710 630,605 C 675,565 722,560 746,560 C 722,635 658,815 518,936 Z" 
          fill="{GOLD_INNER_RIBBON}" />

    <!-- Primary Leaf Body (Layer 3 - Botanical Forest Green) -->
    <path d="M 526,936 C 526,845 546,705 650,602 C 702,552 752,556 752,556 C 752,556 728,668 670,778 C 612,886 552,928 526,936 Z" 
          fill="{LEAF_GREEN}" />

    <!-- Midrib Central Spine (Layer 4 - Dark Botanical Veins) -->
    <path d="M 532,928 Q 600,810 740,580" 
          stroke="{VEIN_DARK}" stroke-width="8" stroke-linecap="round" fill="none" />

    <!-- Lateral Branching Veins -->
    <path d="M 560,862 Q 600,868 630,846" stroke="{VEIN_DARK}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 570,842 Q 545,826 540,802" stroke="{VEIN_DARK}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 605,782 Q 655,782 685,746" stroke="{VEIN_DARK}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 618,762 Q 580,746 568,706" stroke="{VEIN_DARK}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 655,696 Q 700,686 718,652" stroke="{VEIN_DARK}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 668,676 Q 625,660 612,620" stroke="{VEIN_DARK}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 704,622 Q 728,606 736,582" stroke="{VEIN_DARK}" stroke-width="5" stroke-linecap="round" fill="none" />
  </g>
</svg>'''
    return svg_content

# Generate canonical and named files
svg_05 = generate_svg("gold")
svg_06 = generate_svg("green")

with open(os.path.join(SVG_DIR, "logo-05-dourada.svg"), "w") as f:
    f.write(svg_05)

with open(os.path.join(SVG_DIR, "LOGO-05.svg"), "w") as f:
    f.write(svg_05)

with open(os.path.join(SVG_DIR, "logo-06-verde.svg"), "w") as f:
    f.write(svg_06)

with open(os.path.join(SVG_DIR, "LOGO-06.svg"), "w") as f:
    f.write(svg_06)

print("✅ Created logo-05-dourada.svg, LOGO-05.svg, logo-06-verde.svg, and LOGO-06.svg")
