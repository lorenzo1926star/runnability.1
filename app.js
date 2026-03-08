
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

for(var i=0;i<24;i++){

var s=score(temps[i],rain[i],wind[i])

arr.push({
time:time[i],
score:s,
temp:temps[i],
rain:rain[i],
wind:wind[i]
})

var tr=document.createElement("tr")

tr.innerHTML=
"<td>"+time[i].substring(11,16)+"</td>"+
"<td>"+s+"</td>"+
"<td>"+temps[i]+"°C</td>"+
"<td>"+rain[i]+" mm</td>"+
"<td>"+wind[i]+" km/h</td>"

rows.appendChild(tr)

}

arr.sort(function(a,b){
return b.score-a.score
})

for(var i=0;i<3;i++){

var w=arr[i]

var div=document.createElement("div")

div.innerHTML=
"<strong>"+(i+1)+") "+w.time.substring(11,16)+"</strong><br>"+
"Temp "+w.temp+"°C<br>"+
"Pioggia "+w.rain+"<br>"+
"Vento "+w.wind+"<br>"+
"Score "+w.score

best.appendChild(div)

}

document.getElementById("status").innerText="Meteo aggiornato"

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