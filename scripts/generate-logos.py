"""
Script to generate precise SVG assets for ILEX Logos:
- LOGO-05 (Dourada para fundos escuros)
- LOGO-06 (Verde para fundos claros)
"""

import os

SVG_DIR = "public/assets"
os.makedirs(SVG_DIR, exist_ok=True)

# Exact colors from uploaded images:
# LOGO-05: Gold towers (#A18557 / #9C8255), Green leaf body (#384633), crisp light veins & white inner highlight
# LOGO-06: Green towers (#384633), Green leaf body (#384633), Gold accent rim (#A18557), crisp light veins

GOLD = "#A18557"
DARK_GREEN = "#384633"
CREAM_WHITE = "#FAF8F5"

def generate_svg(variant="gold"):
    """
    variant: 'gold' (Logo 05 - fundos escuros) or 'green' (Logo 06 - fundos claros)
    """
    pillar_color = GOLD if variant == "gold" else DARK_GREEN
    
    # In Logo 05 (fundos escuros):
    # - Pillars: Warm gold
    # - Leaf rim outer: White/Ivory highlight (#FAF8F5)
    # - Leaf rim inner layer: Gold (#A18557)
    # - Leaf interior: Deep Forest Green (#384633)
    # - Leaf veins: White (#FAF8F5)
    
    # In Logo 06 (fundos claros):
    # - Pillars: Deep Forest Green (#384633)
    # - Leaf rim outer: Deep Forest Green / White highlight
    # - Leaf rim inner layer: Gold (#A18557)
    # - Leaf interior: Deep Forest Green (#384633)
    # - Leaf veins: White (#FAF8F5)

    if variant == "gold":
        outer_rim = CREAM_WHITE
        inner_rim = GOLD
        leaf_body = DARK_GREEN
        vein_color = CREAM_WHITE
    else:
        outer_rim = GOLD
        inner_rim = CREAM_WHITE
        leaf_body = DARK_GREEN
        vein_color = CREAM_WHITE

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="100%" height="100%" fill="none">
  <!-- ILEX Architectural Columns & Botanical Leaf Mark -->
  <g id="architectural-pillars">
    <!-- Pillar 1 (Leftmost Tower) -->
    <polygon points="237,562 338,477 338,898 237,870" fill="{pillar_color}" />

    <!-- Pillar 2 (Second Tower) -->
    <polygon points="367,378 468,304 468,936 367,908" fill="{pillar_color}" />

    <!-- Pillar 3 (Tallest Central Tower / Spire) -->
    <polygon points="498,172 632,62 632,530 498,530" fill="{pillar_color}" />

    <!-- Pillar 4 (Rightmost Facet) -->
    <polygon points="662,332 762,420 762,495 662,495" fill="{pillar_color}" />
  </g>

  <!-- Botanical Leaf Element (Organic curves in lower-right quadrant) -->
  <g id="botanical-leaf">
    <!-- Outer Contour Ribbon -->
    <path d="M 505,935 C 495,850 498,690 635,580 C 690,535 745,540 762,545 C 755,565 740,610 720,660 C 685,745 635,870 505,935 Z" 
          fill="{outer_rim}" />

    <!-- Inner Ribbon Layer -->
    <path d="M 515,935 C 510,860 515,720 620,615 C 665,570 715,565 745,565 C 710,650 650,820 515,935 Z" 
          fill="{inner_rim}" />

    <!-- Primary Leaf Body -->
    <path d="M 525,935 C 525,840 545,700 650,600 C 705,550 755,555 755,555 C 755,555 730,670 670,780 C 610,890 550,930 525,935 Z" 
          fill="{leaf_body}" />

    <!-- Central Vein Spine -->
    <path d="M 530,930 Q 600,810 740,580" 
          stroke="{vein_color}" stroke-width="8" stroke-linecap="round" fill="none" />

    <!-- Lateral Veins (Branching Ribs) -->
    <!-- Low pair -->
    <path d="M 560,865 Q 600,870 630,850" stroke="{vein_color}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 570,845 Q 545,830 540,805" stroke="{vein_color}" stroke-width="6" stroke-linecap="round" fill="none" />

    <!-- Mid-low pair -->
    <path d="M 605,785 Q 655,785 685,750" stroke="{vein_color}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 618,765 Q 580,750 568,710" stroke="{vein_color}" stroke-width="6" stroke-linecap="round" fill="none" />

    <!-- Mid-high pair -->
    <path d="M 655,700 Q 700,690 718,655" stroke="{vein_color}" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M 668,680 Q 625,665 612,625" stroke="{vein_color}" stroke-width="6" stroke-linecap="round" fill="none" />

    <!-- Top tip pair -->
    <path d="M 705,625 Q 730,610 738,585" stroke="{vein_color}" stroke-width="5" stroke-linecap="round" fill="none" />
  </g>
</svg>'''
    return svg_content

with open(os.path.join(SVG_DIR, "logo-05-dourada.svg"), "w") as f:
    f.write(generate_svg("gold"))

with open(os.path.join(SVG_DIR, "logo-06-verde.svg"), "w") as f:
    f.write(generate_svg("green"))

print("Created logo-05-dourada.svg and logo-06-verde.svg")
