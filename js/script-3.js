// =========================
// GLOBAL SELECTORS
// =========================
const body = document.body;
const searchInput = document.getElementById("city");
const searchBtn = document.getElementById("search");
const statusMessage = document.getElementById("status-message");

// Dropdown elements (will be created)
let suggestionsDropdown = null;
let suggestionsList = null;

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
const MAX_REFRESH = 3;

// =========================
// WEATHER CONFIG
// =========================
const WEATHER_MAP = {
  Clear: { theme: "sunny", icon: "clear" },
  Clouds: { theme: "cloudy", icon: "clouds" },
  Rain: { theme: "rainy", icon: "rain" },
  Drizzle: { theme: "rainy", icon: "rain" },
  Thunderstorm: { theme: "stormy", icon: "thunderstorm" },
  Snow: { theme: "snowy", icon: "snow" },
  Default: { theme: "foggy", icon: "fog" },
};

function getWeatherConfig(main) {
  return WEATHER_MAP[main] || WEATHER_MAP.Default;
}

function applyTheme(theme) {
  body.className = "";
  body.classList.add(`weather-${theme}`);
}

// =========================
// HELPERS
// =========================
const kelvinToCelsius = (k) => Math.round(k - 273.15);
const msToKmh = (ms) => Math.round(ms * 3.6);

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

function setUIState(state) {
  body.dataset.state = state;
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
// DROPDOWN SUGGESTIONS
// =========================
function createDropdown() {
  if (suggestionsDropdown) return; // already exists

  suggestionsDropdown = document.createElement("div");
  suggestionsDropdown.id = "suggestions-dropdown";
  suggestionsDropdown.className = "suggestions-dropdown";
  suggestionsDropdown.style.display = "none";

  suggestionsList = document.createElement("ul");
  suggestionsList.className = "suggestions-list";

  suggestionsDropdown.appendChild(suggestionsList);
  searchInput.parentElement.appendChild(suggestionsDropdown);
}

function showDropdown() {
  if (suggestionsDropdown) {
    suggestionsDropdown.style.display = "block";
  }
}

function hideDropdown() {
  if (suggestionsDropdown) {
    suggestionsDropdown.style.display = "none";
  }
}

function clearSuggestions() {
  if (suggestionsList) {
    suggestionsList.innerHTML = "";
  }
}

async function fetchSuggestions(input) {
  const cleanedInput = normalizeQuery(input);

  if (cleanedInput.length < 3) {
    hideDropdown();
    return;
  }

  try {
    const res = await fetch(
      `${GEO_URL}?q=${encodeURIComponent(
        cleanedInput
      )}&limit=5&appid=${API_KEY}`
    );

    if (!res.ok) throw new Error();

    const data = await res.json();
    renderSuggestions(data);
  } catch (err) {
    console.error("Suggestion fetch failed:", err);
    clearSuggestions();
  }
}

function renderSuggestions(data) {
  clearSuggestions();

  if (!data.length) {
    hideDropdown();
    return;
  }

  data.forEach((location) => {
    const li = document.createElement("li");
    li.className = "suggestion-item";

    const label = location.state
      ? `${location.name}, ${location.state}, ${location.country}`
      : `${location.name}, ${location.country}`;

    li.textContent = label;
    li.dataset.name = location.name;
    li.dataset.state = location.state || "";
    li.dataset.country = location.country;
    li.dataset.lat = location.lat;
    li.dataset.lon = location.lon;

    li.addEventListener("click", () => {
      searchInput.value = label;
      hideDropdown();
      // Use exact coordinates from the suggestion
      fetchWeatherByCoordinates(
        parseFloat(li.dataset.lat),
        parseFloat(li.dataset.lon),
        label
      );
    });

    li.addEventListener("mouseover", () => {
      li.classList.add("active");
    });

    li.addEventListener("mouseout", () => {
      li.classList.remove("active");
    });

    suggestionsList.appendChild(li);
  });

  showDropdown();
}

// =========================
// INPUT VALIDATION
// =========================
function isValidQuery(input) {
  const cleaned = input.trim().toLowerCase();
  if (!/[a-z]/.test(cleaned)) return false; // must contain letters
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return words[0].length >= 3; // single-word cities
  return true; // multi-word locations
}

// =========================
// NORMALIZE QUERY
// =========================
function normalizeQuery(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // remove symbols/numbers
    .replace(/\s+/g, " ") // normalize spaces
    .trim();
}

// =========================
// RENDER MAIN WEATHER
// =========================
function renderMainWeather(data, label) {
  const weather = data.weather[0];
  const { theme, icon } = getWeatherConfig(weather.main);

  cityName.textContent = label;
  dateEl.textContent = formatDate(data.dt);
  tempEl.textContent = `${kelvinToCelsius(data.main.temp)}°C`;

  weatherIcon.src = `assets/images/icon/${icon}.webp`;
  weatherIcon.hidden = false;

  feelsEl.textContent = `${kelvinToCelsius(data.main.feels_like)}°C`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${msToKmh(data.wind.speed)} km/h`;
  precipitationEl.textContent = data.rain?.["1h"]
    ? `${data.rain["1h"]} mm`
    : "0 mm";

  applyTheme(theme);
}

// =========================
// RENDER WEEKLY FORECAST
// =========================
function renderWeeklyForecast(data) {
  clearDailyForecast();

  const dailyMap = new Map();

  data.list.forEach((item) => {
    const day = new Date(item.dt * 1000).toDateString();
    if (!dailyMap.has(day)) dailyMap.set(day, item);
  });

  [...dailyMap.values()].slice(0, 5).forEach((day) => {
    const clone = dailyTemplate.content.cloneNode(true);
    const { icon } = getWeatherConfig(day.weather[0].main);

    clone.querySelector(".daily-day").textContent = new Date(
      day.dt * 1000
    ).toLocaleDateString("en-US", { weekday: "short" });

    const iconEl = clone.querySelector(".icon");
    iconEl.src = `assets/images/icon/${icon}.webp`;
    iconEl.hidden = false;

    clone.querySelector(".temp").textContent = `${kelvinToCelsius(
      day.main.temp
    )}°C`;
    clone.querySelector(".wind").textContent = `${msToKmh(
      day.wind.speed
    )} km/h`;

    dailyContainer.appendChild(clone);
  });
}

// =========================
// FETCH WEATHER BY COORDINATES
// =========================
async function fetchWeatherByCoordinates(lat, lon, label) {
  clearMessage();
  clearMainWeather();
  clearDailyForecast();
  setUIState("loading");

  try {
    // Fetch main weather
    const weatherRes = await fetch(
      `${API_URL}weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    if (!weatherRes.ok) throw new Error();

    const weatherData = await weatherRes.json();
    renderMainWeather(weatherData, label);

    // Fetch weekly forecast
    await fetchWeeklyForecast(lat, lon);

    localStorage.setItem("lastCity", label);
    localStorage.setItem("refreshCount", "0");

    setUIState("ready");
  } catch (err) {
    console.error(err);
    setUIState("idle");
    showMessage("Unable to fetch weather. Try again.");
  }
}

// =========================
// FETCH WEATHER BY CITY (WORKING VERSION)
// =========================
async function fetchWeatherByCity(input) {
  clearMessage();
  clearMainWeather();
  clearDailyForecast();

  if (!isValidQuery(input)) {
    showMessage("Please enter a valid city name");
    return;
  }

  setUIState("loading");

  const cleanedInput = normalizeQuery(input);
  const inputWords = cleanedInput.split(/\s+/);

  try {
    let geoData = [];

    // Try fetching with full query first
    let geoRes = await fetch(
      `${GEO_URL}?q=${encodeURIComponent(
        cleanedInput
      )}&limit=5&appid=${API_KEY}`
    );

    if (geoRes.ok) {
      geoData = await geoRes.json();
    }

    // If no results or failed, try with just first word
    if (!geoData.length && inputWords.length > 1) {
      geoRes = await fetch(
        `${GEO_URL}?q=${encodeURIComponent(
          inputWords[0]
        )}&limit=5&appid=${API_KEY}`
      );

      if (geoRes.ok) {
        geoData = await geoRes.json();
      }
    }

    if (!geoData.length) throw new Error();

    // ✅ Flexible multi-word matching
    let location = geoData.find((loc) => {
      const fullString = [loc.name, loc.state, loc.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      // Check if all input words are in the location string
      return inputWords.every((word) => fullString.includes(word));
    });

    // If no match found and we have multiple words, try matching at least one word
    if (!location && inputWords.length > 1) {
      location = geoData.find((loc) => {
        const fullString = [loc.name, loc.state, loc.country]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return inputWords.some((word) => fullString.includes(word));
      });
    }

    // fallback: first result
    if (!location) location = geoData[0];

    const { lat, lon, name, state, country } = location;
    const label = state
      ? `${name}, ${state}, ${country}`
      : `${name}, ${country}`;

    localStorage.setItem("lastCity", input);
    localStorage.setItem("refreshCount", "0");

    // Fetch main weather
    const weatherRes = await fetch(
      `${API_URL}weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    if (!weatherRes.ok) throw new Error();

    const weatherData = await weatherRes.json();
    renderMainWeather(weatherData, label);

    // Fetch weekly forecast
    await fetchWeeklyForecast(lat, lon);

    setUIState("ready");
  } catch (err) {
    console.error(err);
    setUIState("idle");
    showMessage("City not found. Try a different name.");
  }
}

// =========================
// WEEKLY FORECAST
// =========================
async function fetchWeeklyForecast(lat, lon) {
  const res = await fetch(
    `${API_URL}forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  );

  if (!res.ok) throw new Error();

  const data = await res.json();
  renderWeeklyForecast(data);
}

// =========================
// LOCATION WEATHER
// =========================
function getLocationWeather() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    try {
      const res = await fetch(
        `${API_URL}weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`
      );

      if (!res.ok) throw new Error();

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
searchBtn.addEventListener("click", () => {
  hideDropdown();
  fetchWeatherByCity(searchInput.value);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    hideDropdown();
    fetchWeatherByCity(searchInput.value);
  }
});

searchInput.addEventListener("input", (e) => {
  fetchSuggestions(e.target.value);
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".intro--search")) {
    hideDropdown();
  }
});

// =========================
// ON LOAD (REFRESH LOGIC)
// =========================
window.addEventListener("load", () => {
  // Create dropdown
  createDropdown();

  clearMainWeather();
  clearDailyForecast();
  clearMessage();

  const lastCity = localStorage.getItem("lastCity");
  let refreshCount = Number(localStorage.getItem("refreshCount") || 0);

  if (lastCity && refreshCount < MAX_REFRESH) {
    refreshCount++;
    localStorage.setItem("refreshCount", refreshCount);
    fetchWeatherByCity(lastCity);
  } else {
    localStorage.removeItem("refreshCount");
    getLocationWeather();
  }
});
