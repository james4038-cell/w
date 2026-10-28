import {CONFIG,LESSONS} from './content.js';
export const defaults=()=>({version:1,coins:0,completed:[],items:[],purchases:[],avatar:{skin:'#c88e62',shirt:'#e3b568',hair:'#3e382c',style:'short',equipped:''},designs:[],track:null,watched:[]});
// Replace this adapter with an account-backed implementation when sign-in is added.
export class LocalProgressStore{
 load(){try{const v=JSON.parse(localStorage.getItem(CONFIG.storageKey));if(!v||v.version!==1)return defaults();const s={...defaults(),...v,avatar:{...defaults().avatar,...v.avatar}};for(const k of['items','purchases','designs','watched'])if(!Array.isArray(s[k]))s[k]=[];s.completed=Array.isArray(s.completed)?[...new Set(s.completed.filter(id=>LESSONS.some(l=>l.id===id)))]:[];s.coins=Math.max(0,Number(s.coins)||0);return s}catch{return defaults()}}
 save(s){try{localStorage.setItem(CONFIG.storageKey,JSON.stringify(s));return true}catch{return false}}
}
