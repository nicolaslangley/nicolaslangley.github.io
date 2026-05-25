(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))r(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const c of t.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function o(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function r(e){if(e.ep)return;e.ep=!0;const t=o(e);fetch(e.href,t)}})();const s=[];function l(){const i=document.querySelector(".projects-section"),n=document.getElementById("projects-grid");if(!(!i||!n)){if(s.length===0){i.style.display="none";return}s.forEach(o=>{const r=document.createElement("a");r.href=o.link,r.target="_blank",r.rel="noopener noreferrer",r.className="project-card",r.innerHTML=`
      <img src="${o.image}" alt="${o.title}" class="project-image" />
      <div class="project-content">
        <h3>${o.title}</h3>
        <p>${o.description}</p>
      </div>
    `,n.appendChild(r)})}}l();
