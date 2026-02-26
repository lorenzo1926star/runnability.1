let map = L.map('mapid').setView([41.9028, 12.4964], 13);
let route = [];
let polyline = L.polyline(route, {color: 'red'}).addTo(map);
let watchId = null;
let startTime;
let runTimer = null;
let elapsedSec = 0;
let viewingRun = null; // run selezionato dallo storico

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
  elapsedSec = 0;

  if (runTimer) clearInterval(runTimer);
  runTimer = setInterval(() => elapsedSec++, 1000);

  watchId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy ?? 9999;

    // Scarta punti troppo imprecisi (es. indoor o GPS ballerino)
    if (acc > 50) return;

    const newPoint = [lat, lng];

    // Scarta punti troppo vicini al precedente (riduce rumore)
    if (route.length > 0) {
      const prev = route[route.length - 1];
      const d = map.distance(prev, newPoint);
      if (d < 5) return; // meno di 5m: rumore
    }

    route.push(newPoint);
    polyline.setLatLngs(route);
    map.setView(newPoint, 16);

    updateStats(pos.coords);
  }, err => {
    alert("GPS non disponibile o permesso negato: " + err.message);
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
}


function stopRun(){
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  if (runTimer) clearInterval(runTimer);
  runTimer = null;

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
  const distanceKm = parseFloat(calculateDistance());
  const timeStr = formatTime(elapsedSec);
  const pace = paceMinPerKm(distanceKm, elapsedSec);
  const speed = speedKmH(distanceKm, elapsedSec);

  // kcal “semplice ma più credibile”: ~ 60 kcal/km (dipende da peso, ritmo)
  const kcal = Math.round(distanceKm * 60);

  document.getElementById("stats").innerHTML = `
    <div class="card">
      Km: ${distanceKm.toFixed(2)} <br>
      Tempo: ${timeStr} <br>
      Passo medio: ${pace} <br>
      Velocità: ${speed} km/h <br>
      Kcal stimate: ${kcal}
    </div>
  `;
}

function saveRun(){
  if (route.length < 2) {
    alert("Percorso troppo corto: muoviti un po' prima di salvare 🙂");
    return;
  }

  const distanceKm = parseFloat(calculateDistance());
  const kcal = Math.round(distanceKm * 60);

  let runs = JSON.parse(localStorage.getItem("runs") || "[]");

  runs.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: new Date().toLocaleString(),
    km: distanceKm.toFixed(2),
    durationSec: elapsedSec,
    pace: paceMinPerKm(distanceKm, elapsedSec),
    speed: speedKmH(distanceKm, elapsedSec),
    kcal,
    route // 👈 salva la traccia
  });

  localStorage.setItem("runs", JSON.stringify(runs));
  loadHistory();
}

function loadHistory(){
  let runs = JSON.parse(localStorage.getItem("runs") || "[]");
  let container = document.getElementById("historyList");
  container.innerHTML = "";

  if (runs.length === 0) {
    container.innerHTML = `<div class="card">Nessun allenamento salvato ancora.</div>`;
    return;
  }

  runs.forEach(run=>{
    container.innerHTML += `
      <div class="card" style="cursor:pointer" onclick="openDetail('${run.id}')">
        <b>${run.date}</b><br>
        Km: ${run.km} — Tempo: ${formatTime(run.durationSec)}<br>
        Passo: ${run.pace} — Kcal: ${run.kcal}
      </div>
    `;
  });
}

function openDetail(id){
  const runs = JSON.parse(localStorage.getItem("runs") || "[]");
  viewingRun = runs.find(r => r.id === id);
  if (!viewingRun) return;

  document.getElementById("historyDetailBody").innerHTML = `
    Data: ${viewingRun.date}<br>
    Km: ${viewingRun.km}<br>
    Tempo: ${formatTime(viewingRun.durationSec)}<br>
    Passo: ${viewingRun.pace}<br>
    Velocità: ${viewingRun.speed} km/h<br>
    Kcal: ${viewingRun.kcal}<br>
    Punti GPS: ${viewingRun.route?.length ?? 0}
  `;

  document.getElementById("historyDetail").style.display = "block";
}

function closeDetail(){
  viewingRun = null;
  document.getElementById("historyDetail").style.display = "none";
}

function viewOnMap(){
  if (!viewingRun || !viewingRun.route || viewingRun.route.length < 2) return;

  showSection("map");
  polyline.setLatLngs(viewingRun.route);

  // centra la mappa sul percorso
  const bounds = L.latLngBounds(viewingRun.route);
  map.fitBounds(bounds, { padding: [20, 20] });

  // assicurati che Leaflet ridisegni
  setTimeout(() => map.invalidateSize(), 200);
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
          <option>Riposo\Camminata</option>
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

function formatTime(sec){
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function paceMinPerKm(distanceKm, sec){
  if (distanceKm <= 0) return "-";
  const min = (sec / 60) / distanceKm;
  const mm = Math.floor(min);
  const ss = Math.round((min - mm) * 60);
  return `${mm}:${String(ss).padStart(2,'0')} min/km`;
}

function speedKmH(distanceKm, sec){
  if (sec <= 0) return "0.0";
  return (distanceKm / (sec / 3600)).toFixed(1);
}
