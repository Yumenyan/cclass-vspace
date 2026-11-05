// Small, local SVG set. Interface controls remain legible without a font CDN.
(()=>{
const paths={
 explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
 mic_off:'<path d="m3 3 18 18M9 9v3a3 3 0 0 0 5 2M9 5a3 3 0 0 1 6 0v5M5 10v2a7 7 0 0 0 12 5m2-7v2M12 19v3m-4 0h8"/>',
 chat:'<path d="M20 4H4a2 2 0 0 0-2 2v15l5-4h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/><path d="M7 9h10M7 13h6"/>',
 group:'<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3M16 5a3 3 0 0 1 0 6m3 3a5 5 0 0 1 3 4v3"/>',
 map:'<path d="m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3Zm7-3v17m6-14v17"/>',
 tune:'<path d="M3 6h9m6 0h3M3 18h3m6 0h9M3 12h3m6 0h9"/><circle cx="15" cy="6" r="3"/><circle cx="9" cy="12" r="3"/><circle cx="9" cy="18" r="3"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
 send:'<path d="m22 2-7 20-4-9-9-4Zm0 0L11 13"/>',
 computer:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
 present_to_all:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M12 16V7m-4 4 4-4 4 4"/>',
 sports_martial_arts:'<circle cx="15" cy="4" r="2"/><path d="m12 8-4 5 5 3 1 6m-4-9 6-3 4 3M9 9l-5 1m9 6-6 5"/>',
 sports_esports:'<path d="M7 6h10a4 4 0 0 1 4 3l2 9c.5 3-3 4-5 1l-2-3H8l-2 3c-2 3-5 2-5-1l2-9a4 4 0 0 1 4-3Z"/><path d="M7 9v5m-2.5-2.5h5M16 10h.01m3 3h.01"/>',
 local_library:'<path d="M12 21c-3-3-7-3-10-3V5c4 0 7 0 10 3 3-3 6-3 10-3v13c-3 0-7 0-10 3Zm0 0V8"/><circle cx="12" cy="3" r="1"/>',
 bar_chart:'<path d="M4 21V11h4v10m2 0V3h4v18m2 0V7h4v14M2 21h20"/>',
 cottage:'<path d="m2 11 10-8 10 8M5 9v12h14V9m-10 12v-7h6v7M16 6V2h3v6"/>',
 view_in_ar:'<path d="M3 7V3h4m10 0h4v4m0 10v4h-4M7 21H3v-4m9-12 6 3.5v7L12 19l-6-3.5v-7Zm-6 3.5 6 3.5 6-3.5M12 12v7"/>',
 landscape:'<path d="m2 20 7-13 5 8 3-5 5 10Z"/><circle cx="17" cy="5" r="2"/>',
 view_in_ar_alt:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5m-9 5v10"/>'
};
paths.settings=paths.tune;paths.location_on='<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>';
const urls=new Map();
function apply(el){if(!el?.classList?.contains('ms'))return;const name=el.textContent.trim();if(el.dataset.icon===name)return;el.dataset.icon=name;el.setAttribute('aria-hidden','true');if(!urls.has(name))urls.set(name,'url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.help)+'</svg>')+'")');el.style.setProperty('--icon',urls.get(name))}
document.querySelectorAll('.ms').forEach(apply);
new MutationObserver(records=>{for(const r of records){apply(r.target.nodeType===3?r.target.parentElement:r.target);for(const n of r.addedNodes||[]){if(n.nodeType===1){apply(n);n.querySelectorAll('.ms').forEach(apply)}}}}).observe(document.body,{subtree:true,childList:true,characterData:true});
document.querySelectorAll('#tools button').forEach(b=>b.setAttribute('aria-label',b.title));
})();
