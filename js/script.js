// =========================
// GLOBAL SELECTORS
// =========================
const body = document.body;
const searchInput = document.getElementById("city");
const searchBtn = document.getElementById("search");
const statusMessage = document.getElementById("status-message");

// Main weather
const cityName = document.getElementById("city-name");
const dateEl = document.getElementById("date");
const tempEl = document.getElementById("temperature");
const weatherIcon = document.getElementById("weather-icon");

// Sub details
const feelsEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const precipitationEl = document.getElementById("precipitation");

// Daily forecast
const dailyContainer = document.getElementById("daily-forcast");
const dailyTemplate = document.getElementById("daily-template");

// =========================
// CONFIG
// =========================
const API_KEY = "147437c80d2510a08584ba9606801aef";
const API_URL = "https://api.openweathermap.org/data/2.5/";
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";

// =========================
// THEME + ICON LOGIC
// =========================
function getWeatherTheme(main) {
  switch (main) {
    case "Clear":
      return "sunny";
    case "Clouds":
      return "cloudy";
    case "Rain":
    case "Drizzle":
      return "rainy";
    case "Thunderstorm":
      return "stormy";
    case "Snow":
      return "snowy";
    default:
      return "foggy";
  }
}

function getIconName(main) {
  switch (main) {
    case "Clear":
      return "clear";
    case "Clouds":
      return "clouds";
    case "Rain":
    case "Drizzle":
      return "rain";
    case "Thunderstorm":
      return "thunderstorm";
    case "Snow":
      return "snow";
    default:
      return "fog";
  }
}

function applyTheme(theme) {
  body.className = "";
  body.classList.add(`weather-${theme}`);
}

// =========================
// HELPERS
// =========================
function kelvinToCelsius(k) {
  return Math.round(k - 273.15);
}

function formatDate(unix) {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function showMessage(msg) {
  statusMessage.textContent = msg;
}

function clearMessage() {
  statusMessage.textContent = "";
}

function clearMainWeather() {
  cityName.textContent = "";
  dateEl.textContent = "";
  tempEl.textContent = "";
  weatherIcon.hidden = true;
  feelsEl.textContent = "";
  humidityEl.textContent = "";
  windEl.textContent = "";
  precipitationEl.textContent = "";
}

function clearDailyForecast() {
  dailyContainer.innerHTML = "";
}

// =========================
// INPUT VALIDATION
// =========================
function isValidQuery(input) {
  return /^[a-zA-Z\s,]{3,}$/.test(input.trim());
}

function normalizeQuery(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z\s,]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(" ", ","); // ikeja lagos -> ikeja,lagos
}

// =========================
// RENDER MAIN WEATHER
// =========================
function renderMainWeather(data, locationLabel) {
  const weather = data.weather[0];

  cityName.textContent = locationLabel;
  dateEl.textContent = formatDate(data.dt);
  tempEl.textContent = `${kelvinToCelsius(data.main.temp)}°`;

  weatherIcon.src = `assets/images/icon/${getIconName(weather.main)}.webp`;
  weatherIcon.hidden = false;

  feelsEl.textContent = `${kelvinToCelsius(data.main.feels_like)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed} km/hr`;
  precipitationEl.textContent = data.rain?.["1h"]
    ? `${data.rain["1h"]} mm`
    : "0 mm";

  applyTheme(getWeatherTheme(weather.main));
}

// =========================
// RENDER DAILY FORECAST
// =========================
function renderWeeklyForecast(data) {
  clearDailyForecast();

  const dailyMap = {};
  data.list.forEach((item) => {
    const day = new Date(item.dt * 1000).toDateString();
    if (!dailyMap[day]) dailyMap[day] = item;
  });

  Object.values(dailyMap)
    .slice(0, 5)
    .forEach((day) => {
      const clone = dailyTemplate.content.cloneNode(true);

      clone.querySelector(".daily-day").textContent = new Date(
        day.dt * 1000
      ).toLocaleDateString("en-US", { weekday: "short" });

      const icon = clone.querySelector(".icon");
      icon.src = `assets/images/icon/${getIconName(day.weather[0].main)}.webp`;
      icon.hidden = false;

      clone.querySelector(".temp").textContent = `${kelvinToCelsius(
        day.main.temp
      )}°`;
      clone.querySelector(".wind").textContent = `${day.wind.speed} km/hr`;

      dailyContainer.appendChild(clone);
    });
}

// =========================
// FETCH WEATHER BY CITY
// =========================
async function fetchWeatherByCity(input) {
  clearMessage();
  clearMainWeather();
  clearDailyForecast();

  if (!isValidQuery(input)) {
    showMessage("City not found");
    return;
  }

  body.dataset.state = "loading";
  const query = normalizeQuery(input);
  const typedCity = query.split(",")[0];

  try {
    const geoRes = await fetch(
      `${GEO_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
    );
    const geoData = await geoRes.json();

    if (!geoData.length) throw new Error();

    // STRICT match with typed city
    let location = geoData.find(
      (loc) => loc.name.toLowerCase() === typedCity && loc.country === "NG"
    );

    if (!location) location = geoData[0]; // fallback to first result

    const { lat, lon, name, state, country } = location;
    const label = state
      ? `${name}, ${state}, ${country}`
      : `${name}, ${country}`;

    const weatherRes = await fetch(
      `${API_URL}weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    const weatherData = await weatherRes.json();

    renderMainWeather(weatherData, label);
    await fetchWeeklyForecast(lat, lon);

    body.dataset.state = "ready";
  } catch {
    body.dataset.state = "idle";
    showMessage("City not found");
  }
}

// =========================
// WEEKLY FORECAST
// =========================
async function fetchWeeklyForecast(lat, lon) {
  const res = await fetch(
    `${API_URL}forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  );
  const data = await res.json();
  renderWeeklyForecast(data);
}

// =========================
// CURRENT LOCATION WEATHER
// =========================
function getLocationWeather() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    try {
      const res = await fetch(
        `${API_URL}weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`
      );
      const data = await res.json();
      renderMainWeather(data, `${data.name}, ${data.sys.country}`);
      await fetchWeeklyForecast(latitude, longitude);
    } catch {
      showMessage("Unable to fetch your location weather");
    }
  });
}

// =========================
// EVENTS
// =========================
searchBtn.addEventListener("click", () =>
  fetchWeatherByCity(searchInput.value)
);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// =========================
// ON LOAD
// =========================
window.addEventListener("load", () => {
  clearMainWeather();
  clearDailyForecast();
  clearMessage();
  getLocationWeather();
});
