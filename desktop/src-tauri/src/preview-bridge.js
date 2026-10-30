(()=>{
  const counts=new Map();
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h=>{
    if(h.id)return;
    const base=h.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu,'').replace(/\s+/g,'-');
    const index=counts.get(base)||0;counts.set(base,index+1);h.id=base+(index?'-'+index:'');
  });
  const channel='local-doc-browser-preview';
  const send=(type,data={})=>parent.postMessage({channel,type,...data},'*');
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    if(!link||!event.isTrusted)return;
    const raw=link.getAttribute('href');
    if(!raw||raw.startsWith('#'))return;
    event.preventDefault();
    send('navigate',{href:new URL(raw,location.href).href});
  });
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.data?.channel!==channel||event.data.type!=='scroll-to')return;
    const hash=String(event.data.hash||'');
    if(!hash)return;
    try{document.getElementById(decodeURIComponent(hash.replace(/^#/,'')))?.scrollIntoView()}catch{}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')send('escape');
    if((event.metaKey||event.ctrlKey)&&event.key==='w'){event.preventDefault();send('close-tab')}
    if((event.metaKey||event.ctrlKey)&&event.key==='f'){event.preventDefault();send('search')}
  });
  let editing=false, targets=[], focused=null;
  const originalTabIndex=new Map();
  const resolve=t=>{
    let n=document;
    for(const i of t.path){n=n?.childNodes[i];if(!n)return null}
    if(n?.nodeType!==Node.TEXT_NODE||n.data!==t.text)return null;
    let el=n.parentElement;
    for(const a of [...t.ancestors].reverse()){
      if(!el||el.localName!==a.tag||a.attrs.some(v=>{const actual=el.getAttribute(v.name);const original=v.name==='tabindex'&&actual==='0'&&originalTabIndex.has(el)?originalTabIndex.get(el):actual;return original!==v.value}))return null;
      el=el.parentElement;
    }
    return el===null?n:null;
  };
  const visible=n=>{
    const el=n?.parentElement;
    if(!el||el.closest('script,style,noscript,template,textarea,select,input,button,svg,math,canvas,iframe,[hidden],[inert],[contenteditable]'))return false;
    const css=getComputedStyle(el);
    return css.display!=='none'&&css.visibility==='visible'&&el.getClientRects().length>0;
  };
  const highlight=el=>{
    focused?.removeAttribute('data-ldb-text-focus');
    focused=el;
    focused?.setAttribute('data-ldb-text-focus','');
  };
  const select=t=>{
    const n=t&&resolve(t);
    if(!n||!visible(n)){send('text-unavailable');return}
    highlight(n.parentElement);
    n.parentElement.scrollIntoView({block:'center',behavior:'instant'});
    send('select-text',{id:t.id,text:t.text});
  };
  const style=document.createElement('style');
  style.textContent='[data-ldb-text-edit]{cursor:text!important}[data-ldb-text-edit]:hover,[data-ldb-text-edit]:focus-visible,[data-ldb-text-focus]{outline:2px solid #3e6655!important;outline-offset:3px!important}';
  document.head.append(style);
  // Adding the style to head may shift a source path only for text in head,
  // which is excluded from the source catalogue. Body paths remain stable.
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.data?.channel!==channel||event.data.type!=='text-edit-mode')return;
    editing=!!event.data.active;
    targets=editing&&Array.isArray(event.data.targets)?event.data.targets:[];
    highlight(null);
    for(const [el,value] of originalTabIndex){
      el.removeAttribute('data-ldb-text-edit');
      if(value===null)el.removeAttribute('tabindex');else el.setAttribute('tabindex',value);
    }
    originalTabIndex.clear();
    for(const t of targets){
      const n=resolve(t);if(!n||!visible(n))continue;
      const el=n.parentElement;
      if(!originalTabIndex.has(el))originalTabIndex.set(el,el.getAttribute('tabindex'));
      el.setAttribute('data-ldb-text-edit','');el.setAttribute('tabindex','0');
    }
  });
  window.addEventListener('click',event=>{
    if(!editing||!event.isTrusted)return;
    event.preventDefault();event.stopImmediatePropagation();
    const caret=document.caretPositionFromPoint?.(event.clientX,event.clientY)?.offsetNode
      ||document.caretRangeFromPoint?.(event.clientX,event.clientY)?.startContainer;
    const candidates=targets.filter(t=>{const n=resolve(t);return n&&visible(n)&&event.target.contains(n)});
    const t=candidates.find(t=>resolve(t)===caret)||(candidates.length===1?candidates[0]:null);
    if(!t&&candidates.length>1)send('select-text-options',{ids:candidates.map(t=>t.id)});else select(t);
  },true);
  window.addEventListener('keydown',event=>{
    if(!editing)return;
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){
      event.preventDefault();event.stopImmediatePropagation();send('save-text');
    }
    if(event.key==='Enter'&&event.target.hasAttribute?.('data-ldb-text-edit')){
      event.preventDefault();event.stopImmediatePropagation();
      const options=targets.filter(t=>resolve(t)?.parentElement===event.target);
      if(options.length>1)send('select-text-options',{ids:options.map(t=>t.id)});else select(options[0]);
    }
  },true);
  send('ready',{title:document.title});
})();
