export default function CommunityIllustration() {
  return (
    <svg viewBox="0 0 640 560" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ds-ground" x1="80" y1="180" x2="520" y2="530" gradientUnits="userSpaceOnUse"><stop stopColor="#233e80"/><stop offset="1" stopColor="#101d42"/></linearGradient>
        <linearGradient id="ds-building" x1="400" y1="80" x2="510" y2="350" gradientUnits="userSpaceOnUse"><stop stopColor="#eff6ff"/><stop offset="1" stopColor="#93b4ef"/></linearGradient>
      </defs>
      <ellipse cx="329" cy="478" rx="245" ry="47" fill="#020617" opacity=".35"/>
      <path d="M30 349 315 189 618 354 335 521Z" fill="url(#ds-ground)" stroke="#4565a3"/>
      <path d="m30 349 305 172v18L30 368ZM335 521l283-167v19L335 539Z" fill="#101c39" stroke="#304c80"/>
      <path d="m97 361 215-122 235 128-210 121Z" stroke="#6285bd" strokeWidth="34" strokeLinejoin="round"/>
      <path d="m97 361 215-122 235 128-210 121Z" stroke="#bed2f6" strokeWidth="2" strokeDasharray="9 10"/>
      {/* Residential community */}
      <path d="m372 130 81-47 101 58-81 47Z" fill="#f8fafc"/>
      <path d="M372 130v189l101 58V188Z" fill="url(#ds-building)"/>
      <path d="m473 188 81-47v188l-81 48Z" fill="#6384cc"/>
      {[0,1,2,3].map(r => [0,1,2].map(c => <path key={`${r}-${c}`} d={`m${386+c*27} ${157+r*39} 14 8v22l-14-8Z`} fill={r===2&&c===1?'#bfdbfe':'#2d539c'}/>))}
      {[0,1,2,3].map(r => [0,1].map(c => <path key={`s${r}-${c}`} d={`m${489+c*28} ${198+r*39} 15-9v22l-15 9Z`} fill="#c4daff"/>))}
      <path d="m411 297 24 14v43l-24-14Z" fill="#1e3a70"/>
      {/* Neighborhood store */}
      <path d="m96 238 95-54 126 72-94 55Z" fill="#dbeafe"/>
      <path d="M96 238v100l127 73V311Z" fill="#bfd4fb"/>
      <path d="m223 311 94-55v100l-94 55Z" fill="#7295dc"/>
      <path d="m87 247 100-58 137 79-100 58Z" fill="#2563eb"/>
      {[0,1,2,3,4].map(i=><path key={i} d={`m${87+i*27.4} ${247+i*15.8} 27.4 15.8v22l-27.4-15.8Z`} fill={i%2?'#dbeafe':'#3b82f6'}/>)}
      <path d="m113 291 42 24v49l-42-24Z" fill="#244b8c"/><path d="m170 324 33 19v55l-33-19Z" fill="#1e3a70"/>
      <path d="m119 301 30 17v27l-30-17Z" fill="#93c5fd"/><path d="m137 309 0 29M119 315l30 17" stroke="#e0efff" strokeWidth="2"/>
      <path d="m238 329 57-33v35l-57 33Z" fill="#b9d5ff"/>
      {/* Delivery cycle and parcels */}
      <ellipse cx="343" cy="424" rx="49" ry="17" fill="#101f40"/>
      <ellipse cx="306" cy="416" rx="14" ry="20" transform="rotate(-20 306 416)" fill="#101d38" stroke="#bdd6ff" strokeWidth="4"/>
      <ellipse cx="367" cy="437" rx="14" ry="20" transform="rotate(-20 367 437)" fill="#101d38" stroke="#bdd6ff" strokeWidth="4"/>
      <path d="m306 415 22-29 39 51-42-15 3-36m-3 36-19-7m61 22-7-59-11-6" stroke="#60a5fa" strokeWidth="5" strokeLinejoin="round"/>
      <path d="m304 371 25-14 31 18-25 14Z" fill="#eff6ff"/><path d="M304 371v24l31 18v-24Z" fill="#93c5fd"/><path d="m335 389 25-14v24l-25 14Z" fill="#4f70bd"/>
      {/* Trees */}
      {[[72,304],[565,299],[429,435]].map(([x,y])=><g key={x}><path d={`M${x} ${y}v49`} stroke="#8daee2" strokeWidth="5"/><ellipse cx={x} cy={y-12} rx="22" ry="36" fill="#345ec0"/><ellipse cx={x-7} cy={y-20} rx="14" ry="26" fill="#5587ea"/></g>)}
      <circle cx="330" cy="134" r="7" fill="#60a5fa"/><circle cx="77" cy="186" r="4" fill="#818cf8"/><path d="M296 104v16m-8-8h16M568 216v16m-8-8h16" stroke="#93c5fd" strokeWidth="2"/>
    </svg>
  );
}
