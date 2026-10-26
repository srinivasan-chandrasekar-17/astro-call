/* ============================================================
   app.js — Single-Page Vedic Birth Chart Application Controller
   ============================================================ */

(function() {
  "use strict";

  // DOM Elements
  const inpDay       = document.getElementById('inp-day');
  const inpMonth     = document.getElementById('inp-month');
  const inpYear      = document.getElementById('inp-year');
  const inpHour      = document.getElementById('inp-hour');
  const inpMin       = document.getElementById('inp-min');

  const selCountry   = document.getElementById('sel-country');
  const selState     = document.getElementById('sel-state');
  const selCity      = document.getElementById('sel-city');
  const btnShow      = document.getElementById('btn-show');

  const southGrid    = document.getElementById('south-grid');
  const planetTbody  = document.getElementById('planet-tbody');

  const valBalDasa   = document.getElementById('val-bal-dasa');
  const valPresDasa  = document.getElementById('val-present-dasa');
  const valAscNak    = document.getElementById('val-asc-nak');
  const valNakLord   = document.getElementById('val-nak-lord');
  const valSubLord   = document.getElementById('val-sub-lord');
  const valSubSubLord= document.getElementById('val-subsub-lord');

  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnPrint     = document.getElementById('btn-print');

  // Modal Elements
  const btnSettingsOpen  = document.getElementById('btn-settings-open');
  const btnSettingsClose = document.getElementById('btn-settings-close');
  const btnSettingsApply = document.getElementById('btn-settings-apply');
  const modalSettings    = document.getElementById('settings-modal');
  const inpName          = document.getElementById('inp-name');
  const selAyanamsa      = document.getElementById('sel-ayanamsa');
  const inpCustomLat     = document.getElementById('inp-custom-lat');
  const inpCustomLon     = document.getElementById('inp-custom-lon');
  const inpCustomTz      = document.getElementById('inp-custom-tz');

  // Active City Geographic Data
  let activeGeo = {
    lat: 13.0827,
    lon: 80.2785,
    tz: "Asia/Kolkata"
  };

  // ============================================================
  // INITIALIZATION
  // ============================================================
  window.addEventListener('DOMContentLoaded', () => {
    initLocations();
    bindEvents();
    // Render initial reference chart immediately
    generateAndRenderChart();
  });

  // ============================================================
  // LOCATION POPULATION (Country -> State -> City)
  // ============================================================
  function initLocations() {
    const db = window.CITIES_DB || {};
    const countries = Object.keys(db).sort();

    selCountry.innerHTML = '';
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c.toLowerCase() === 'india') opt.selected = true;
      selCountry.appendChild(opt);
    });

    populateStates('India', 'Tamil Nadu');
    populateCities('India', 'Tamil Nadu', 'Chennai');
  }

  function populateStates(country, defaultState) {
    const db = window.CITIES_DB || {};
    const states = Object.keys(db[country] || {}).sort();

    selState.innerHTML = '';
    states.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (defaultState && s.toLowerCase() === defaultState.toLowerCase()) {
        opt.selected = true;
      }
      selState.appendChild(opt);
    });

    const chosenState = selState.value || states[0];
    populateCities(country, chosenState);
  }

  function populateCities(country, state, defaultCity) {
    const db = window.CITIES_DB || {};
    const rawList = (db[country] && db[country][state]) ? db[country][state] : [];
    const citiesList = rawList.slice().sort((a, b) => a.city.localeCompare(b.city));

    selCity.innerHTML = '';
    const targetCity = defaultCity || (state === 'Tamil Nadu' ? 'Chennai' : (citiesList[0] ? citiesList[0].city : ''));
    let matched = false;

    citiesList.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.city;
      opt.textContent = item.city;
      opt.dataset.lat = item.lat;
      opt.dataset.lon = item.lon;
      opt.dataset.tz = item.tz;

      if (targetCity && item.city.toLowerCase() === targetCity.toLowerCase()) {
        opt.selected = true;
        matched = true;
        activeGeo.lat = item.lat;
        activeGeo.lon = item.lon;
        activeGeo.tz = item.tz;
      }
      selCity.appendChild(opt);
    });

    if (!matched && selCity.options.length > 0) {
      selCity.selectedIndex = 0;
      const first = selCity.options[0];
      activeGeo.lat = parseFloat(first.dataset.lat);
      activeGeo.lon = parseFloat(first.dataset.lon);
      activeGeo.tz = first.dataset.tz;
    }

    if (selCity.selectedOptions.length > 0) {
      const selected = selCity.selectedOptions[0];
      activeGeo.lat = parseFloat(selected.dataset.lat);
      activeGeo.lon = parseFloat(selected.dataset.lon);
      activeGeo.tz = selected.dataset.tz;
    }
  }

  // ============================================================
  // EVENT BINDINGS
  // ============================================================
  function bindEvents() {
    // Country change
    selCountry.addEventListener('change', () => {
      populateStates(selCountry.value);
      updateActiveGeoFromCity();
      generateAndRenderChart();
    });

    // State change
    selState.addEventListener('change', () => {
      populateCities(selCountry.value, selState.value);
      updateActiveGeoFromCity();
      generateAndRenderChart();
    });

    // City change
    selCity.addEventListener('change', () => {
      updateActiveGeoFromCity();
      generateAndRenderChart();
    });

    // Show button
    btnShow.addEventListener('click', () => {
      generateAndRenderChart();
    });

    // Pressing Enter in numeric boxes triggers calculate
    [inpDay, inpMonth, inpYear, inpHour, inpMin].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          generateAndRenderChart();
        }
      });
      input.addEventListener('change', () => {
        generateAndRenderChart();
      });
    });

    // Print & Export PDF
    btnPrint.addEventListener('click', () => {
      window.print();
    });

    btnExportPdf.addEventListener('click', () => {
      window.print();
    });

    // Settings Modal
    btnSettingsOpen.addEventListener('click', () => {
      modalSettings.classList.remove('hidden');
    });

    btnSettingsClose.addEventListener('click', () => {
      modalSettings.classList.add('hidden');
    });

    modalSettings.addEventListener('click', (e) => {
      if (e.target === modalSettings) {
        modalSettings.classList.add('hidden');
      }
    });

    btnSettingsApply.addEventListener('click', () => {
      modalSettings.classList.add('hidden');
      if (inpCustomLat.value && inpCustomLon.value) {
        activeGeo.lat = parseFloat(inpCustomLat.value);
        activeGeo.lon = parseFloat(inpCustomLon.value);
      }
      if (inpCustomTz.value.trim()) {
        activeGeo.tz = inpCustomTz.value.trim();
      }
      generateAndRenderChart();
    });
  }

  function updateActiveGeoFromCity() {
    if (selCity.selectedOptions.length > 0) {
      const selected = selCity.selectedOptions[0];
      activeGeo.lat = parseFloat(selected.dataset.lat);
      activeGeo.lon = parseFloat(selected.dataset.lon);
      activeGeo.tz = selected.dataset.tz;
      inpCustomLat.value = activeGeo.lat;
      inpCustomLon.value = activeGeo.lon;
      inpCustomTz.value = activeGeo.tz;
    }
  }

  // ============================================================
  // CHART CALCULATION AND RENDERING
  // ============================================================
  function generateAndRenderChart() {
    const day = parseInt(inpDay.value, 10) || 19;
    const month = parseInt(inpMonth.value, 10) || 6;
    const year = parseInt(inpYear.value, 10) || 1997;
    const hour = parseInt(inpHour.value, 10) || 13;
    const minute = parseInt(inpMin.value, 10) || 15;
    const ayanamsa = selAyanamsa ? selAyanamsa.value : 'lahiri';
    const name = (inpName && inpName.value.trim()) || 'Client';

    const params = {
      year,
      month,
      day,
      hour,
      minute,
      lat: activeGeo.lat,
      lon: activeGeo.lon,
      tz: activeGeo.tz,
      ayanamsa,
      name
    };

    const chart = window.AstroEngine.generateChart(params);
    renderSouthIndianGrid(chart);
    renderPlanetaryTable(chart);
    renderSummaryAndDasa(chart);
  }

  // Render 4x4 South Indian Chart
  function renderSouthIndianGrid(chart) {
    southGrid.innerHTML = '';

    // The South Indian fixed 4x4 matrix
    // Row 1: Pisces(11), Aries(0), Taurus(1), Gemini(2)
    // Row 2: Aquarius(10), Center, Center, Cancer(3)
    // Row 3: Capricorn(9), Center, Center, Leo(4)
    // Row 4: Sagittarius(8), Scorpio(7), Libra(6), Virgo(5)

    const cellOrder = [
      // Row 1
      { signIdx: 11, label: "12 PISCES" },
      { signIdx: 0,  label: "1 ARIES" },
      { signIdx: 1,  label: "2 TAURUS" },
      { signIdx: 2,  label: "3 GEMINI" },

      // Row 2
      { signIdx: 10, label: "11 AQUARIUS" },
      { isCenter: true }, // spans 2x2
      { signIdx: 3,  label: "4 CANCER" },

      // Row 3
      { signIdx: 9,  label: "10 CAPRICORN" },
      // (Center continued)
      { signIdx: 4,  label: "5 LEO" },

      // Row 4
      { signIdx: 8,  label: "9 SAGITTARIUS" },
      { signIdx: 7,  label: "8 SCORPIO" },
      { signIdx: 6,  label: "7 LIBRA" },
      { signIdx: 5,  label: "6 VIRGO" }
    ];

    cellOrder.forEach(item => {
      if (item.isCenter) {
        const centerEl = document.createElement('div');
        centerEl.className = 'grid-center';
        southGrid.appendChild(centerEl);
        return;
      }

      const cellEl = document.createElement('div');
      cellEl.className = 'grid-cell';

      const labelEl = document.createElement('div');
      labelEl.className = 'cell-label';
      labelEl.textContent = item.label;

      const planetsEl = document.createElement('div');
      planetsEl.className = 'cell-planets';

      const planetsInSign = chart.signGroups[item.signIdx] || [];
      if (planetsInSign.length > 0) {
        // Format with Lagna highlighted if present
        const formatted = planetsInSign.map(p => {
          if (p === 'LAGNA') {
            return `<span class="lagna-highlight">LAGNA</span>`;
          }
          return p;
        });
        planetsEl.innerHTML = formatted.join(', ');
      } else {
        planetsEl.innerHTML = '';
      }

      cellEl.appendChild(labelEl);
      cellEl.appendChild(planetsEl);
      southGrid.appendChild(cellEl);
    });
  }

  // Render Planetary Table
  function renderPlanetaryTable(chart) {
    planetTbody.innerHTML = '';

    chart.positions.forEach(p => {
      const tr = document.createElement('tr');
      if (p.isLagna) {
        tr.className = 'row-lagna';
      }

      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.signName}</td>
        <td class="col-deg">${p.degStr}</td>
        <td>${p.nakshatra}</td>
        <td>${p.lord}</td>
      `;
      planetTbody.appendChild(tr);
    });
  }

  // Render Summary Box (Dasa & KP Sub Lords)
  function renderSummaryAndDasa(chart) {
    valBalDasa.textContent = chart.dasa.balanceStr;
    valPresDasa.textContent = chart.dasa.currentDasaStr;
    valAscNak.textContent = chart.kpSummary.ascNakshatra;
    valNakLord.textContent = chart.kpSummary.nakshatraLord;
    valSubLord.textContent = chart.kpSummary.subLord;
    valSubSubLord.textContent = chart.kpSummary.subSubLord;
  }

})();
