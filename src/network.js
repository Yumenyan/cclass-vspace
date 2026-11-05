/* Bounded retry and message identity helpers, independent from PeerJS and wall-clock time. */
const CC_NETWORK=(()=>{
 class Retry{constructor(base=1500,max=60000){this.base=base;this.max=max;this.states=new Map()}ready(id,now){return now>=(this.states.get(id)?.at||0)}fail(id,now,random=Math.random()){const n=Math.min(7,(this.states.get(id)?.n||0)+1),delay=Math.min(this.max,this.base*2**(n-1)*(.9+.2*random));this.states.set(id,{n,at:now+delay});return delay}clear(id){this.states.delete(id)}reset(){this.states.clear()}}
 class Seen{constructor(limit=2048,ttl=300000){this.limit=limit;this.ttl=ttl;this.ids=new Map()}accept(id,now,ttl=this.ttl){const previous=this.ids.get(id);if(previous!==undefined&&now-previous<ttl)return false;this.ids.delete(id);this.ids.set(id,now);while(this.ids.size>this.limit)this.ids.delete(this.ids.keys().next().value);return true}}
 return {Retry,Seen};
})();
