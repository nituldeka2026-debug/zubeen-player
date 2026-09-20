const $=s=>document.querySelector(s);
function tick(){const d=new Date();$('#clock').innerHTML=d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).replace(' ',' <small>')+'</small>';$('#date').textContent=d.toLocaleDateString('en-US',{weekday:'long',day:'2-digit',month:'long'}).toUpperCase()}tick();setInterval(tick,1000);
const play=$('#play');let playing=false;play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'Ⅱ':'▶';document.body.classList.toggle('is-playing',playing)});
$('#volume').addEventListener('input',e=>document.documentElement.style.setProperty('--volume',e.target.value));
