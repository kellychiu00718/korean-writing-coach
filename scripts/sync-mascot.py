"""把 design/turtle.svg 同步到 React 元件、網站圖示和 landing page。

用法：python3 scripts/sync-mascot.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
svg = (ROOT / "design/turtle.svg").read_text(encoding="utf-8").strip()
inner = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)

jsx = inner
for a, b in [("stroke-width", "strokeWidth"), ("stroke-linejoin", "strokeLinejoin"),
             ("stroke-linecap", "strokeLinecap"), ("stroke-dasharray", "strokeDasharray")]:
    jsx = jsx.replace(a, b)
jsx = "\n".join("      " + line.strip() for line in jsx.strip().splitlines())
(ROOT / "src/components/Mascot.tsx").write_text(f'''/** 慢慢寫的吉祥物：拿著鉛筆、慢慢散步的綠蠵龜。原始檔在 design/turtle.svg，改完執行 scripts/sync-mascot.py。 */
export function Mascot({{ size = 36 }}: {{ size?: number }}) {{
  return (
    <svg width={{size}} height={{size}} viewBox="0 0 200 200" aria-hidden="true">
{jsx}
    </svg>
  );
}}
''', encoding="utf-8")

(ROOT / "src/app/icon.svg").write_text(svg + "\n", encoding="utf-8")

landing = ROOT / "public/landing.html"
html = landing.read_text(encoding="utf-8")
html, n = re.subn(
    r'(<svg width="\d+" height="\d+" viewBox="0 0 200 200" aria-hidden="true">).*?(</svg>)',
    lambda m: m.group(1) + inner + m.group(2), html, flags=re.S)
landing.write_text(html, encoding="utf-8")
print(f"synced: Mascot.tsx, icon.svg, landing ({n} svgs)")
