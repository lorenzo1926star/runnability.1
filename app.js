let map = L.map('mapid').setView([41.9028, 12.4964], 13);
let route = [];
let polyline = L.polyline(route, {color: 'red'}).addTo(map);
let watchId = null;
let startTime;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
.addTo(map);

function showSection(id){
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  // Fix Leaflet quando la mappa era nascosta
  if (id === "map") {
    setTimeout(() => map.invalidateSize(), 200);
  }
}

function startRun(){
  route = [];
  polyline.setLatLngs(route);
  startTime = Date.now();

  watchId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    route.push([lat,lng]);
    polyline.setLatLngs(route);
    map.setView([lat,lng], 16);

    updateStats(pos.coords);
  }, err => {
    alert("GPS non disponibile o permesso negato: " + err.message);
  }, { enableHighAccuracy: true });
}

function stopRun(){
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  saveRun();
}

function calculateDistance(){
  let distance = 0;
  for(let i=1;i<route.length;i++){
    distance += map.distance(route[i-1], route[i]);
  }
  return (distance/1000).toFixed(2);
}

function updateStats(coords){
  let distance = calculateDistance();
  let duration = ((Date.now()-startTime)/60000).toFixed(1);
  let kcal = (distance * 60).toFixed(0);

  document.getElementById("stats").innerHTML = `
    <div class="card">
      Km: ${distance} <br>
      Durata: ${duration} min <br>
      Kcal: ${kcal}
    </div>
  `;
}

function saveRun(){
  let runs = JSON.parse(localStorage.getItem("runs") || "[]");

  runs.push({
    date: new Date().toLocaleString(),
    km: calculateDistance(),
    duration: ((Date.now()-startTime)/60000).toFixed(1)
  });

  localStorage.setItem("runs", JSON.stringify(runs));
  loadHistory();
}

function loadHistory(){
  let runs = JSON.parse(localStorage.getItem("runs") || "[]");
  let container = document.getElementById("historyList");
  container.innerHTML = "";

  runs.forEach(run=>{
    container.innerHTML += `
      <div class="card">
        ${run.date}<br>
        Km: ${run.km} - Durata: ${run.duration} min
      </div>
    `;
  });
}

loadHistory();

async function loadWeather(){
  const lat = 41.9;
  const lon = 12.49;

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
  const data = await res.json();

  document.getElementById("weather").innerHTML = `
    <div class="card">
      🌡 Temperatura: ${data.current_weather.temperature}°C <br>
      💨 Vento: ${data.current_weather.windspeed} km/h
    </div>
  `;
}

loadWeather();

function generatePlanner(){
  const days = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
  let html = "";

  days.forEach(d=>{
    html += `
      <div class="card">
        ${d}:
        <select>
          <option>Riposo</option>
          <option>Corsa Lenta</option>
          <option>Interval Training</option>
          <option>Lungo</option>
        </select>
      </div>
    `;
  });

  document.getElementById("plannerUI").innerHTML = html;
}

generatePlanner();

function requestNotification(){
  if (!("Notification" in window)) return;
  Notification.requestPermission();
}

function sendNotification(msg){
  if(Notification.permission === "granted"){
    new Notification("RunTrack", {body: msg});
  }
}

requestNotification();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register("service-worker.js");
}
