
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

/* ---------- DASHBOARD KPI ---------- */

function updateDashboard(){

var runs=JSON.parse(localStorage.getItem("runs")||"[]")

var totalRuns=runs.length
var totalKm=0
var weekKm=0
var weekSec=0

var today=new Date()
var day=today.getDay()
var diffToMonday=(day+6)%7
var startWeek=new Date(today.getFullYear(),today.getMonth(),today.getDate())
startWeek.setDate(startWeek.getDate()-diffToMonday)
var endWeek=new Date(startWeek.getTime()+7*24*60*60*1000)

runs.forEach(function(r){
totalKm+=r.distance||0

var d=new Date(r.date)
if(d>=startWeek && d<endWeek){
weekKm+=r.distance||0
weekSec+=r.time||0
}

})

var totalKcal=totalKm*60

var elRuns=document.getElementById("kpiRuns")
var elKm=document.getElementById("kpiKm")
var elKcal=document.getElementById("kpiKcal")
var elWeekKm=document.getElementById("kpiWeekKm")
var elWeekTime=document.getElementById("kpiWeekTime")

if(elRuns) elRuns.textContent=totalRuns
if(elKm) elKm.textContent=totalKm.toFixed(1)
if(elKcal) elKcal.textContent=Math.round(totalKcal)
if(elWeekKm) elWeekKm.textContent=weekKm.toFixed(1)
if(elWeekTime) elWeekTime.textContent=Math.round(weekSec/60)+" min"

updateNextRunWidgets()

}

/* ---------- METEO ---------- */

var lastWeatherData=null

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

function scoreIcon(s){

if(s>=85) return "☀️"
if(s>=65) return "🌤"
return "🌧"

}

function scoreLabel(s){

if(s>=85) return "Perfetto per correre"
if(s>=65) return "Buono"
return "Sconsigliato"

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

lastWeatherData=data

var tab7d=document.getElementById("tab7d")
var tabToday=document.getElementById("tabToday")

if(tab7d && tab7d.classList.contains("active")){

weather7days(data)

}else{

generateSlots(data)

}

document.getElementById("status").innerText="Meteo aggiornato"

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
var planner=document.getElementById("plannerUI")

if(!table)return

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

table.innerHTML=""
if(planner) planner.innerHTML=""

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
updateDashboard()

var tabToday=document.getElementById("tabToday")
var tab7d=document.getElementById("tab7d")

if(tabToday && tab7d){

tabToday.addEventListener("click",function(){

tabToday.classList.add("active")
tab7d.classList.remove("active")

if(lastWeatherData){
generateSlots(lastWeatherData)
}else{
document.getElementById("status").innerText="Carica prima il meteo."
}

})

tab7d.addEventListener("click",function(){

tab7d.classList.add("active")
tabToday.classList.remove("active")

if(lastWeatherData){
weather7days(lastWeatherData)
}else{
document.getElementById("status").innerText="Carica prima il meteo."
}

})

}

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

document.getElementById("btnTime")?.addEventListener("click",findBestAtTime)

})

/* =====================================================
AGGIUNGERE ALLA FINE DI app.js
===================================================== */

document.addEventListener("DOMContentLoaded",function(){

renderRunPlan()
updateDashboard()
scheduleRunNotifications()

})

/* AGGIUNGI QUESTO BLOCCO IN FONDO A app.js */

/* ===== RUN PLAN ===== */

var runPlanTimers=[]

function clearRunPlanTimers(){

runPlanTimers.forEach(function(t){clearTimeout(t)})
runPlanTimers=[]

}

function showRunNotification(plan){

var start=new Date(plan.start)
var timeStr=String(start.getHours()).padStart(2,"0")+":00"
var msg="Tra "+plan.notify+" minuti: "+plan.workout+" alle "+timeStr

if("Notification" in window && Notification.permission==="granted"){

new Notification("RunTrack Pro — Allenamento",{
body:msg
})

}else{

alert(msg)

}

}

function scheduleRunNotifications(){

clearRunPlanTimers()

if(!("Notification" in window)) return

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")
var now=Date.now()

function scheduleForPlans(){

plans.forEach(function(p){

var startTime=new Date(p.start).getTime()
var notifyMinutes=parseInt(p.notify,10)||0
var notifyTime=startTime-notifyMinutes*60000

var diff=notifyTime-now

if(diff<=0) return

var t=setTimeout(function(){
showRunNotification(p)
},diff)

runPlanTimers.push(t)

})

}

if(Notification.permission==="granted"){

scheduleForPlans()

}else if(Notification.permission==="default"){

Notification.requestPermission().then(function(res){
if(res==="granted"){
scheduleForPlans()
}
})

}

}

function updateNextRunWidgets(){

var nextRunEl=document.getElementById("nextRun")
var nextWeatherEl=document.getElementById("nextRunWeather")

if(!nextRunEl || !nextWeatherEl) return

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")
if(!plans.length){
nextRunEl.innerText="Nessun allenamento pianificato."
nextWeatherEl.innerText="Carica un piano in Run Plan per vedere il meteo."
return
}

var now=Date.now()
var future=plans.filter(function(p){
return new Date(p.start).getTime()>now
})

if(!future.length){
nextRunEl.innerText="Nessun allenamento futuro."
nextWeatherEl.innerText="—"
return
}

future.sort(function(a,b){
return new Date(a.start)-new Date(b.start)
})

var n=future[0]
var s=new Date(n.start)
var e=new Date(n.end)

var dateStr=s.toLocaleDateString("it-IT")
var timeStr=String(s.getHours()).padStart(2,"0")+":00-"+String(e.getHours()).padStart(2,"0")+":00"

nextRunEl.innerHTML=
dateStr+"<br>"+
timeStr+"<br>"+
(n.workout||"Corsa Lenta")+"<br>"+
"Notifica "+(n.notify||"0")+" min prima"

if(!lastWeatherData){
nextWeatherEl.innerText="Apri Meteo Pro e carica il meteo per vedere le condizioni."
return
}

var temps=lastWeatherData.hourly.temperature_2m
var rain=lastWeatherData.hourly.precipitation
var wind=lastWeatherData.hourly.windspeed_10m
var time=lastWeatherData.hourly.time

if(!temps||!rain||!wind||!time||!time.length){
nextWeatherEl.innerText="Dati meteo non disponibili."
return
}

var runStartMs=s.getTime()
var bestIdx=-1
var bestDiff=Infinity

for(var i=0;i<time.length;i++){
var tMs=new Date(time[i]).getTime()
var diff=Math.abs(tMs-runStartMs)
if(diff<bestDiff){
bestDiff=diff
bestIdx=i
}
}

if(bestIdx<0){
nextWeatherEl.innerText="Dati meteo non trovati per questo orario."
return
}

var temp=temps[bestIdx]
var r=rain[bestIdx]
var w=wind[bestIdx]

var base=score(temp,r,w)
var adj=preferenceAdjustedScore(base,temp,r,w)

nextWeatherEl.innerHTML=
"Temp "+temp.toFixed(1)+"°C<br>"+
"Pioggia "+r.toFixed(1)+" mm<br>"+
"Vento "+w.toFixed(1)+" km/h<br>"+
"Score "+adj

}

function addBestSlotToPlan(start,end){

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

var date=start.substring(0,10)

plans=plans.filter(p=>p.date!==date)

plans.push({
id:Date.now(),
date:date,
start:start,
end:end,
workout:"Corsa Lenta",
notify:document.getElementById("notifyPref").value
})

localStorage.setItem("runplans",JSON.stringify(plans))

renderRunPlan()
scheduleRunNotifications()

}

function removeRunPlan(id){

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

plans=plans.filter(p=>p.id!=id)

localStorage.setItem("runplans",JSON.stringify(plans))

renderRunPlan()
scheduleRunNotifications()

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
var planner=document.getElementById("plannerUI")

if(!table)return

var plans=JSON.parse(localStorage.getItem("runplans")||"[]")

table.innerHTML=""
if(planner) planner.innerHTML=""

plans.forEach(p=>{

var s=new Date(p.start)
var e=new Date(p.end)

var tr=document.createElement("tr")

var workout=p.workout||"Corsa Lenta"

tr.innerHTML=

"<td>"+s.toLocaleDateString("it-IT")+"</td>"+
"<td>"+String(s.getHours()).padStart(2,"0")+":00-"+String(e.getHours()).padStart(2,"0")+":00</td>"+
"<td><select class='plan-select' onchange='updateWorkout("+p.id+",this.value)'>"+
"<option"+(workout==="Corsa Lenta"?" selected":"")+">Corsa Lenta</option>"+
"<option"+(workout==="Ripetute"?" selected":"")+">Ripetute</option>"+
"<option"+(workout==="Intervalli"?" selected":"")+">Intervalli</option>"+
"<option"+(workout==="Corsa Libera"?" selected":"")+">Corsa Libera</option>"+
"<option"+(workout==="Sprint"?" selected":"")+">Sprint</option>"+
"</select></td>"+
"<td>"+p.notify+" min</td>"+
"<td><button class='plan-remove' onclick='removeRunPlan("+p.id+")'>X</button></td>"

table.appendChild(tr)

if(planner){

var item=document.createElement("div")

item.textContent=
new Date(p.start).toLocaleDateString("it-IT")+
" "+String(new Date(p.start).getHours()).padStart(2,"0")+":00 - "+
workout

planner.appendChild(item)

}

})

updateNextRunWidgets()

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

var card=document.createElement("div")

card.className="slot-card "+scoreClass(s)

card.innerHTML=

"<div>"+
start.toLocaleDateString("it-IT")+"<br>"+
String(start.getHours()).padStart(2,"0")+":00-"+String(end.getHours()).padStart(2,"0")+":00<br>"+
"Temp "+temp.toFixed(1)+"°C · "+
"Pioggia "+r.toFixed(1)+" mm · "+
"Vento "+w.toFixed(1)+" km/h"+
"</div>"+
"<div>"+
scoreLabel(s)+"<br>"+
"Score "+s+"<br>"+
"<button class='slot-btn' onclick='addBestSlotToPlan(\""+start.toISOString()+"\",\""+end.toISOString()+"\")'>+</button>"+
"</div>"

rows.appendChild(card)

}

}

/* ===== 7 GIORNI ===== */

function weather7days(data){

var temps=data.hourly.temperature_2m
var rain=data.hourly.precipitation
var wind=data.hourly.windspeed_10m
var time=data.hourly.time

var best=document.getElementById("best")
var rows=document.getElementById("rows")

best.innerHTML=""
if(rows) rows.innerHTML=""

for(var d=0;d<7;d++){

var start=d*24

var bestScore=-1
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

if(bestSlot===null) continue

var date=new Date(time[bestSlot])

var div=document.createElement("div")

div.className="best-slot"

var h=date.getHours()
var hEnd=(h+2)%24
var icon=scoreIcon(bestScore)
var label=scoreLabel(bestScore)

div.innerHTML=

"<div>"+
icon+" "+String(h).padStart(2,"0")+"-"+String(hEnd).padStart(2,"0")+
"</div>"+
"<div>"+
label+"<br>"+
"Score "+bestScore+
"</div>"

best.appendChild(div)

}

}

function preferenceAdjustedScore(base,temp,rain,wind){

var pref=document.getElementById("pref")?.value||"balanced"
var s=base

if(pref==="cool"){
if(temp>20)s-=10
if(temp>26)s-=10
}

if(pref==="warm"){
if(temp<10)s-=10
}

if(pref==="no_rain"){
s-=rain*10
}

if(pref==="low_wind"){
s-=wind*2
}

if(s<0)s=0
return Math.round(s)

}

function findBestAtTime(){

if(!lastWeatherData){
document.getElementById("status").innerText="Carica prima il meteo."
return
}

var startInput=document.getElementById("prefTimeStart")
var endInput=document.getElementById("prefTimeEnd")

if(!startInput||!endInput||!startInput.value||!endInput.value){
document.getElementById("status").innerText="Scegli un orario di inizio e fine."
return
}

var pStart=startInput.value.split(":")
var pEnd=endInput.value.split(":")

var startMinutes=parseInt(pStart[0],10)*60+parseInt(pStart[1]||"0",10)
var endMinutes=parseInt(pEnd[0],10)*60+parseInt(pEnd[1]||"0",10)

if(isNaN(startMinutes)||isNaN(endMinutes)||endMinutes<=startMinutes){
document.getElementById("status").innerText="Intervallo orario non valido."
return
}

var temps=lastWeatherData.hourly.temperature_2m
var rain=lastWeatherData.hourly.precipitation
var wind=lastWeatherData.hourly.windspeed_10m
var time=lastWeatherData.hourly.time

var best=document.getElementById("best")
var rows=document.getElementById("rows")

best.innerHTML=""
if(rows) rows.innerHTML=""

var foundAny=false

for(var d=0;d<7;d++){

var dayBestScore=-1
var dayBestIndex=null

for(var i=d*24;i<d*24+24-1;i++){

var slotStart=new Date(time[i])
var totalMinutes=slotStart.getHours()*60+slotStart.getMinutes()

if(totalMinutes<startMinutes||totalMinutes>=endMinutes)continue

var temp=temps[i]
var r=rain[i]
var w=wind[i]

var base=score(temp,r,w)
var s=preferenceAdjustedScore(base,temp,r,w)

if(s>dayBestScore){
dayBestScore=s
dayBestIndex=i
}

}

if(dayBestIndex===null)continue

foundAny=true

var start=new Date(time[dayBestIndex])
var end=new Date(start)
end.setHours(end.getHours()+1)

var div=document.createElement("div")

div.className="best-slot"

var temp=temps[dayBestIndex]
var r=rain[dayBestIndex]
var w=wind[dayBestIndex]

div.innerHTML=

"<div>"+
"<strong>"+start.toLocaleDateString("it-IT")+"</strong><br>"+
"Orario "+String(start.getHours()).padStart(2,"0")+":00<br>"+
"Temp "+temp.toFixed(1)+"°C<br>"+
"Pioggia "+r.toFixed(1)+" mm<br>"+
"Vento "+w.toFixed(1)+" km/h<br>"+
"Score "+dayBestScore+
"</div>"+
"<div><button class='slot-btn' onclick='addBestSlotToPlan(\""+start.toISOString()+"\",\""+end.toISOString()+"\")'>+</button></div>"

best.appendChild(div)

}

if(!foundAny){

document.getElementById("status").innerText="Nessun orario trovato in questo intervallo."

}else{

document.getElementById("status").innerText="Migliori giorni per l'intervallo orario scelto aggiornati"

}

}

document.addEventListener("DOMContentLoaded",function(){

renderRunPlan()

})