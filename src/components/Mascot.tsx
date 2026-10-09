/** 慢慢寫的吉祥物：拿著鉛筆、慢慢散步的綠蠵龜。原始檔在 design/turtle.svg，改完執行 scripts/sync-mascot.py。 */
export function Mascot({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <path d="M16 186 q12 -6 24 0 t24 0 t24 0 t24 0" fill="none" stroke="#89B9AD" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 9"/>
      <g stroke="#4A3036" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 136 L8 144 L28 150 Z" fill="#FFEAD5"/>
      <ellipse cx="50" cy="158" rx="14" ry="12" fill="#FFEAD5"/>
      <ellipse cx="88" cy="162" rx="14" ry="12" fill="#FFEAD5"/>
      <ellipse cx="124" cy="160" rx="14" ry="12" fill="#FFEAD5"/>
      <ellipse cx="152" cy="124" rx="13" ry="16" fill="#FFEAD5"/>
      <path d="M22 142 Q22 62 92 60 Q162 62 162 142 Z" fill="#89B9AD"/>
      <g fill="#B5D6CD" strokeWidth="3">
      <path d="M112 102 L102 119.3 L82 119.3 L72 102 L82 84.7 L102 84.7 Z"/>
      <path d="M68 118 L59 133.6 L41 133.6 L32 118 L41 102.4 L59 102.4 Z"/>
      <path d="M152 118 L143 133.6 L125 133.6 L116 118 L125 102.4 L143 102.4 Z"/>
      </g>
      <rect x="16" y="136" width="152" height="14" rx="7" fill="#74A898"/>
      <g transform="rotate(58 156 160)">
      <rect x="122" y="153" width="9" height="13" fill="#FFFFFF"/>
      <rect x="129" y="153" width="44" height="13" rx="2" fill="#E78895"/>
      <path d="M173 153 L189 159.5 L173 166 Z" fill="#FFEAD5"/>
      <path d="M183.5 157.3 L189 159.5 L183.5 161.7 Z" fill="#4A3036" strokeWidth="2"/>
      </g>
      <ellipse cx="150" cy="150" rx="15" ry="10" transform="rotate(30 150 150)" fill="#FFEAD5"/>
      <circle cx="170" cy="102" r="26" fill="#FFEAD5"/>
      </g>
      <circle cx="178" cy="96" r="4.5" fill="#4A3036"/>
      <circle cx="179.4" cy="94.6" r="1.5" fill="#FFFFFF"/>
      <ellipse cx="161" cy="109" rx="6.5" ry="4" fill="#E78895"/>
      <path d="M173 111 q5 4.5 10 1" fill="none" stroke="#4A3036" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
