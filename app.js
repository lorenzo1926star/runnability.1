/* =================================================
RUNTRACK PRO — APP.JS COMPLETO (SOSTITUISCI TUTTO)
================================================= */

/* -------- UTILS -------- */
function $(id){ return document.getElementById(id); }

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

function formatTime(sec){
sec=Math.floor(sec||0)
const h=Math.floor(sec/3600)
const m=Math.floor((sec%3600)/60)
const s=sec%60
if(h>0){return h+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")
}

function pace(distance,sec){
if(!distance||!sec)return "-"
const min=(sec/60)/distance
const mm=Math.floor(min)
const ss=Math.round((min-mm)*60)
return mm+":"+String(ss).padStart(2,"0")+" min/km"
}

function speed(distance,sec){
if(!distance||!sec)return "0"
return (distance/(sec/3600)).toFixed(1)
}

/* -------- NAVIGATION -------- */
function showSection(id){

document.querySelectorAll(".screen").forEach(s=>{
s.classList.remove("active")
})

const target=$(id)
if(target){target.classList.add("active")}

document.querySelectorAll(".nav-item").forEach(btn=>{
btn.classList.remove("active")
if(btn.dataset.target===id){btn.classList.add("active")}
})

if(id==="map" && window.map){
setTimeout(()=>{map.invalidateSize()},200)
}

}

/* -------- MAP -------- */
let map=null
let polyline=null
let route=[]
let watchId=null
let timer=null
let elapsed=0

function initMap(){

if(!$("mapid"))return
if(typeof L==="undefined")return

map=L.map("mapid").setView([41.9,12.49],13)
window.map=map

L.tileLayer(
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
{attribution:"OpenStreetMap"}
).addTo(map)

polyline=L.polyline([],{
color:"red",
weight:4
}).addTo(map)

}

function distance(){

if(route.length<2)return 0

let d=0
for(let i=1;i<route.length;i++){
d+=map.distance(route[i-1],route[i])
}

return d/1000
}

function updateStats(){

if(!$("stats"))return

const km=distance()
const kcal=Math.round(km*60)

$("stats").innerHTML=`

<div class="card">

Km ${km.toFixed(2)}<br>
Tempo ${formatTime(elapsed)}<br>
Passo ${pace(km,elapsed)}<br>
Velocità ${speed(km,elapsed)} km/h<br>
Kcal ${kcal}

</div>

`

}

function startRun(){

if(!navigator.geolocation)return

route=[]
polyline.setLatLngs(route)
elapsed=0

timer=setInterval(()=>{
elapsed++
updateStats()
},1000)

watchId=navigator.geolocation.watchPosition(pos=>{

const lat=pos.coords.latitude
const lon=pos.coords.longitude

const point=[lat,lon]

route.push(point)
polyline.setLatLngs(route)

map.setView(point,16)

updateStats()

})

}

function stopRun(){

if(watchId){
navigator.geolocation.clearWatch(watchId)
watchId=null
}

clearInterval(timer)

saveRun()

}

function saveRun(){

if(route.length<2)return

const runs=JSON.parse(localStorage.getItem("runs")||"[]")

runs.unshift({

date:new Date().toISOString(),
distance:distance(),
time:elapsed

})

localStorage.setItem("runs",JSON.stringify(runs))

renderHistory()

}

/* -------- HISTORY -------- */

function renderHistory(){

const list=$("historyList")
if(!list)return

const runs=JSON.parse(localStorage.getItem("runs")||"[]")

list.innerHTML=""

runs.forEach(r=>{

const div=document.createElement("div")
div.className="card"

div.innerHTML=`

${new Date(r.date).toLocaleDateString("it-IT")}<br>
Km ${r.distance.toFixed(2)}<br>
Tempo ${formatTime(r.time)}

`

list.appendChild(div)

})

}

/* -------- WEATHER -------- */

const cityInput=$("city")
const btnCity=$("btnCity")
const btnGeo=$("btnGeo")
const statusBox=$("status")
const bestBox=$("best")
const rowsBox=$("rows")

function setStatus(msg){
if(statusBox)statusBox.innerText=msg
}

function score(temp,rain,wind){

let s=100

if(temp<5)s-=30
if(temp>28)s-=30

s-=rain*15
s-=wind*1.5

return clamp(Math.round(s),0,100)

}

function scoreClass(s){
if(s>80)return "score ok"
if(s>60)return "score warn"
return "score bad"
}

async function searchCity(){

const city=cityInput.value

if(!city){
setStatus("Inserisci città")
return
}

setStatus("Cerco città...")

try{

const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=it&format=json`)
const j=await r.json()

if(!j.results){
setStatus("Città non trovata")
return
}

loadWeather(
j.results[0].latitude,
j.results[0].longitude
)

}catch{

setStatus("Errore ricerca città")

}

}

async function loadWeather(lat,lon){

try{

setStatus("Carico meteo...")

const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,windspeed_10m&forecast_days=7&timezone=auto`)
const data=await r.json()

rowsBox.innerHTML=""
bestBox.innerHTML=""

const t=data.hourly.temperature_2m
const rain=data.hourly.precipitation
const wind=data.hourly.windspeed_10m
const time=data.hourly.time

let arr=[]

for(let i=0;i<24;i++){

const s=score(t[i],rain[i],wind[i])

arr.push({
time:time[i],
score:s,
temp:t[i],
rain:rain[i],
wind:wind[i]
})

const tr=document.createElement("tr")

tr.innerHTML=`

<td>${time[i].substring(11,16)}</td>
<td class="${scoreClass(s)}">${s}</td>
<td>${t[i]}°C</td>
<td>${rain[i]} mm</td>
<td>${wind[i]} km/h</td>

`

rowsBox.appendChild(tr)

}

arr.sort((a,b)=>b.score-a.score)

for(let i=0;i<3;i++){

const w=arr[i]

const div=document.createElement("div")
div.className="card"

div.innerHTML=`

<strong>${i+1}) ${w.time.substring(11,16)}</strong><br>
Temp ${w.temp}°C |
Pioggia ${w.rain} |
Vento ${w.wind}

<div class="${scoreClass(w.score)}">${w.score}</div>

`

bestBox.appendChild(div)

}

setStatus("Meteo aggiornato")

}catch{

setStatus("Errore meteo")

}

}

btnCity?.addEventListener("click",searchCity)

btnGeo?.addEventListener("click",()=>{

navigator.geolocation.getCurrentPosition(pos=>{

loadWeather(
pos.coords.latitude,
pos.coords.longitude
)

})

})

/* -------- INIT -------- */

document.addEventListener("DOMContentLoaded",()=>{

initMap()
renderHistory()
showSection("dashboard")

})