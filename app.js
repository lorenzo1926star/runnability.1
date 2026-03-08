
/* SOSTITUISCI COMPLETAMENTE TUTTO IL CONTENUTO DI app.js CON QUESTO */

function showSection(id) {

document.querySelectorAll(".screen").forEach(function(s){
s.style.display="none"
})

var target=document.getElementById(id)

if(target){
target.style.display="block"
}

}

/* ---------- MAPPA ---------- */

var map
var polyline
var route=[]
var watchId=null
var timer=null
var elapsed=0

function initMap(){

if(!document.getElementById("mapid")) return
if(typeof L==="undefined") return

map=L.map("mapid").setView([41.9,12.49],13)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
attribution:"OpenStreetMap"
}).addTo(map)

polyline=L.polyline([],{
color:"red",
weight:4
}).addTo(map)

}

function startRun(){

if(!navigator.geolocation) return

route=[]
polyline.setLatLngs(route)
elapsed=0

timer=setInterval(function(){
elapsed++
updateStats()
},1000)

watchId=navigator.geolocation.watchPosition(function(pos){

var lat=pos.coords.latitude
var lon=pos.coords.longitude

var point=[lat,lon]

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

function distance(){

if(route.length<2) return 0

var d=0

for(var i=1;i<route.length;i++){
d+=map.distance(route[i-1],route[i])
}

return d/1000

}

function updateStats(){

var stats=document.getElementById("stats")
if(!stats) return

var km=distance()

stats.innerHTML="Km "+km.toFixed(2)+"<br>Tempo "+elapsed+" sec"

}

function saveRun(){

if(route.length<2) return

var runs=JSON.parse(localStorage.getItem("runs")||"[]")

runs.unshift({
date:new Date().toISOString(),
distance:distance(),
time:elapsed
})

localStorage.setItem("runs",JSON.stringify(runs))

renderHistory()

}

/* ---------- STORICO ---------- */

function renderHistory(){

var list=document.getElementById("historyList")
if(!list) return

var runs=JSON.parse(localStorage.getItem("runs")||"[]")

list.innerHTML=""

runs.forEach(function(r){

var div=document.createElement("div")

div.innerHTML=

new Date(r.date).toLocaleDateString("it-IT")+
"<br>Km "+r.distance.toFixed(2)+
"<br>Tempo "+r.time+" sec"

list.appendChild(div)

})

}

/* ---------- METEO ---------- */

function score(temp,rain,wind){

var s=100

if(temp<5) s-=30
if(temp>28) s-=30

s-=rain*15
s-=wind*1.5

if(s<0) s=0

return Math.round(s)

}

function scoreClass(s){

if(s>80) return "green"
if(s>60) return "orange"
return "red"

}

function searchCity(){

var city=document.getElementById("city").value

if(!city){
document.getElementById("status").innerText="Inserisci città"
return
}

fetch("https://geocoding-api.open-meteo.com/v1/search?name="+city+"&count=1&language=it&format=json")

.then(r=>r.json())

.then(function(j){

if(!j.results){
document.getElementById("status").innerText="Città non trovata"
return
}

loadWeather(
j.results[0].latitude,
j.results[0].longitude
)

})

}

/* =====================================================
SOSTITUISCI SOLO LA FUNZIONE loadWeather IN app.js
===================================================== */

function loadWeather(lat,lon){

document.getElementById("status").innerText="Carico meteo..."

fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&hourly=temperature_2m,precipitation,windspeed_10m&forecast_days=7&timezone=auto")

.then(r=>r.json())

.then(function(data){

var temps=data.hourly.temperature_2m
var rain=data.hourly.precipitation
var wind=data.hourly.windspeed_10m
var time=data.hourly.time

var rows=document.getElementById("rows")
var best=document.getElementById("best")

rows.innerHTML=""
best.innerHTML=""

var arr=[]

/* ===== DETTAGLIO 2 ORE ===== */

for(var i=0;i<48;i+=2){

var avgTemp=(temps[i]+temps[i+1])/2
var avgRain=(rain[i]+rain[i+1])/2
var avgWind=(wind[i]+wind[i+1])/2

var s=score(avgTemp,avgRain,avgWind)

var date=new Date(time[i])

arr.push({
date:date,
score:s,
temp:avgTemp,
rain:avgRain,
wind:avgWind
})

var tr=document.createElement("tr")

tr.innerHTML=

"<td>"+date.toLocaleDateString("it-IT")+" "+date.getHours()+":00</td>"+
"<td>"+s+"</td>"+
"<td>"+avgTemp.toFixed(1)+"°C</td>"+
"<td>"+avgRain.toFixed(1)+" mm</td>"+
"<td>"+avgWind.toFixed(1)+" km/h</td>"

rows.appendChild(tr)

}

/* ===== MIGLIORI 3 FASCE ===== */

arr.sort(function(a,b){
return b.score-a.score
})

for(var j=0;j<3;j++){

var w=arr[j]

var div=document.createElement("div")

div.className="card"

div.innerHTML=

"<strong>"+(j+1)+") "+w.date.toLocaleDateString("it-IT")+" "+w.date.getHours()+":00</strong><br>"+
"Temp "+w.temp.toFixed(1)+"°C<br>"+
"Pioggia "+w.rain.toFixed(1)+"<br>"+
"Vento "+w.wind.toFixed(1)+"<br>"+
"Score "+w.score

best.appendChild(div)

}

document.getElementById("status").innerText="Meteo aggiornato"

})

}

/* =====================================================
AGGIUNGI QUESTA FUNZIONE SOTTO loadWeather
TAB PREVISIONI 7 GIORNI
===================================================== */

function weather7days(lat,lon){

fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&hourly=temperature_2m,precipitation,windspeed_10m&forecast_days=7&timezone=auto")

.then(r=>r.json())

.then(function(data){

var temps=data.hourly.temperature_2m
var rain=data.hourly.precipitation
var wind=data.hourly.windspeed_10m
var time=data.hourly.time

var best=document.getElementById("best")

best.innerHTML=""

for(var d=0; d<7; d++){

var start=d*24

var daily=[]

for(var i=start;i<start+24;i+=2){

var avgTemp=(temps[i]+temps[i+1])/2
var avgRain=(rain[i]+rain[i+1])/2
var avgWind=(wind[i]+wind[i+1])/2

var s=score(avgTemp,avgRain,avgWind)

daily.push({
time:time[i],
score:s,
temp:avgTemp,
rain:avgRain,
wind:avgWind
})

}

daily.sort(function(a,b){
return b.score-a.score
})

var bestSlot=daily[0]

var date=new Date(bestSlot.time)

var div=document.createElement("div")

div.className="card"

div.innerHTML=

"<strong>"+date.toLocaleDateString("it-IT")+"</strong><br>"+
"Miglior fascia: "+date.getHours()+":00<br>"+
"Temp "+bestSlot.temp.toFixed(1)+"°C<br>"+
"Score "+bestSlot.score

best.appendChild(div)

}

})

}

/* =====================================================
RUN PLAN — AGGIUNGERE IN app.js
===================================================== */

function addRunPlan(date,time){

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

plans.push({
date:date,
time:time
})

localStorage.setItem("runplans",JSON.stringify(plans))

renderRunPlan()

}

function renderRunPlan(){

var table=document.getElementById("runplan")

if(!table)return

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

table.innerHTML=""

plans.forEach(function(p){

var tr=document.createElement("tr")

tr.innerHTML=

"<td>"+p.date+"</td>"+
"<td>"+p.time+"</td>"

table.appendChild(tr)

})

}

/* ---------- INIT ---------- */

document.addEventListener("DOMContentLoaded",function(){

initMap()
renderHistory()

showSection("dashboard")

document.getElementById("btnCity")?.addEventListener("click",searchCity)

document.getElementById("btnGeo")?.addEventListener("click",function(){

navigator.geolocation.getCurrentPosition(function(pos){

loadWeather(
pos.coords.latitude,
pos.coords.longitude
)

})

})

})

/* =====================================================
AGGIUNGERE ALLA FINE DI app.js
===================================================== */

document.addEventListener("DOMContentLoaded",function(){

renderRunPlan()

})

/* AGGIUNGI QUESTO BLOCCO IN FONDO A app.js */

/* ===== RUN PLAN ===== */

function addBestSlotToPlan(start,end){

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

var date=start.substring(0,10)

plans=plans.filter(p=>p.date!==date)

plans.push({
id:Date.now(),
date:date,
start:start,
end:end,
workout:"Corsa lenta",
notify:document.getElementById("notifyPref").value
})

localStorage.setItem("runplans",JSON.stringify(plans))

renderRunPlan()

}

function removeRunPlan(id){

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

plans=plans.filter(p=>p.id!=id)

localStorage.setItem("runplans",JSON.stringify(plans))

renderRunPlan()

}

function updateWorkout(id,value){

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

plans.forEach(p=>{
if(p.id==id){p.workout=value}
})

localStorage.setItem("runplans",JSON.stringify(plans))

}

function renderRunPlan(){

var table=document.getElementById("runplan")

if(!table)return

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

table.innerHTML=""

plans.forEach(p=>{

var s=new Date(p.start)
var e=new Date(p.end)

var tr=document.createElement("tr")

tr.innerHTML=

"<td>"+s.toLocaleDateString("it-IT")+"</td>"+
"<td>"+String(s.getHours()).padStart(2,"0")+":00-"+String(e.getHours()).padStart(2,"0")+":00</td>"+
"<td><select class='plan-select' onchange='updateWorkout("+p.id+",this.value)'>"+
"<option>Corsa lenta</option>"+
"<option>Ripetute</option>"+
"<option>Corsa libera</option>"+
"<option>Intervalli</option>"+
"<option>VO2 Max</option>"+
"</select></td>"+
"<td>"+p.notify+" min</td>"+
"<td><button class='plan-remove' onclick='removeRunPlan("+p.id+")'>X</button></td>"

table.appendChild(tr)

})

}

/* ===== SLOT METEO 2 ORE ===== */

function generateSlots(data){

var temps=data.hourly.temperature_2m
var rain=data.hourly.precipitation
var wind=data.hourly.windspeed_10m
var time=data.hourly.time

var rows=document.getElementById("rows")

rows.innerHTML=""

var now=new Date()

for(var i=0;i<time.length-1;i+=2){

var start=new Date(time[i])
var end=new Date(time[i+1])
end.setHours(end.getHours()+1)

if(start<now)continue

var temp=(temps[i]+temps[i+1])/2
var r=(rain[i]+rain[i+1])/2
var w=(wind[i]+wind[i+1])/2

var s=score(temp,r,w)

var tr=document.createElement("tr")

tr.innerHTML=

"<td>"+start.toLocaleDateString("it-IT")+"</td>"+
"<td>"+String(start.getHours()).padStart(2,"0")+":00-"+String(end.getHours()).padStart(2,"0")+":00</td>"+
"<td>"+s+"</td>"+
"<td>"+temp.toFixed(1)+"°C</td>"+
"<td>"+r.toFixed(1)+" mm</td>"+
"<td>"+w.toFixed(1)+" km/h</td>"+
"<td><button class='slot-btn' onclick='addBestSlotToPlan(\""+start.toISOString()+"\",\""+end.toISOString()+"\")'>+</button></td>"

rows.appendChild(tr)

}

}

/* ===== 7 GIORNI ===== */

function weather7days(data){

var temps=data.hourly.temperature_2m
var rain=data.hourly.precipitation
var wind=data.hourly.windspeed_10m
var time=data.hourly.time

var best=document.getElementById("best")

best.innerHTML=""

for(var d=0;d<7;d++){

var start=d*24

var bestScore=0
var bestSlot=null

for(var i=start;i<start+24;i+=2){

var temp=(temps[i]+temps[i+1])/2
var r=(rain[i]+rain[i+1])/2
var w=(wind[i]+wind[i+1])/2

var s=score(temp,r,w)

if(s>bestScore){

bestScore=s
bestSlot=i

}

}

var date=new Date(time[bestSlot])

var div=document.createElement("div")

div.className="best-slot"

div.innerHTML=

"<div>"+
"<strong>"+date.toLocaleDateString("it-IT")+"</strong><br>"+
"Miglior fascia "+
String(date.getHours()).padStart(2,"0")+":00"+
"</div>"+
"<div class='score-ok'>"+bestScore+"</div>"

best.appendChild(div)

}

}

document.addEventListener("DOMContentLoaded",function(){

renderRunPlan()

})