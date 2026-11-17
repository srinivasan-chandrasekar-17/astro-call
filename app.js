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
  const selAmPm      = document.getElementById('sel-ampm');

  const validationBanner  = document.getElementById('validation-banner');
  const validationMessage = document.getElementById('validation-message');

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
      generateAndRenderChart({ focusOnError: true });
    });

    // Numeric date/time input sanitization, keyboard stepping, and live validation
    const getMaxDay = () => {
      const y = parseInt(inpYear.value, 10);
      const m = parseInt(inpMonth.value, 10);
      if (!Number.isNaN(y) && y >= 1800 && y <= 2100 && !Number.isNaN(m) && m >= 1 && m <= 12) {
        return new Date(y, m, 0).getDate();
      }
      return 31;
    };

    const numericInputs = [
      { el: inpDay,   maxLen: 2, min: 1,    getMax: getMaxDay, pad: 2, wrap: true },
      { el: inpMonth, maxLen: 2, min: 1,    getMax: () => 12,  pad: 2, wrap: true },
      { el: inpYear,  maxLen: 4, min: 1800, getMax: () => 2100, pad: 4, wrap: false },
      { el: inpHour,  maxLen: 2, min: 1,    getMax: () => 12,  pad: 2, wrap: true },
      { el: inpMin,   maxLen: 2, min: 0,    getMax: () => 59,  pad: 2, wrap: true }
    ];

    numericInputs.forEach(({ el, maxLen, min, getMax, pad, wrap }) => {
      el.addEventListener('input', () => {
        const sanitized = el.value.replace(/\D/g, '').slice(0, maxLen);
        if (el.value !== sanitized) {
          el.value = sanitized;
        }
        validateDateTimeInputs({ strict: false });
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          generateAndRenderChart({ focusOnError: true });
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const max = getMax();
          const current = parseInt(el.value, 10);
          const step = e.key === 'ArrowUp' ? 1 : -1;
          let next;
          if (Number.isNaN(current)) {
            next = min;
          } else {
            next = current + step;
            if (next > max) next = wrap ? min : max;
            if (next < min) next = wrap ? max : min;
          }
          el.value = String(next).padStart(pad, '0');
          generateAndRenderChart();
        }
      });

      el.addEventListener('change', () => {
        generateAndRenderChart();
      });

      el.addEventListener('blur', () => {
        const result = validateDateTimeInputs({ strict: true });
        if (result.valid) {
          padValidInputs(result.values);
        }
      });
    });

    if (selAmPm) {
      selAmPm.addEventListener('change', () => {
        generateAndRenderChart({ focusOnError: true });
      });
    }

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
      const customLat = parseFloat(inpCustomLat.value);
      const customLon = parseFloat(inpCustomLon.value);
      if (Number.isFinite(customLat) && Number.isFinite(customLon)) {
        activeGeo.lat = customLat;
        activeGeo.lon = customLon;
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

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  /**
   * Convert 12-hour clock (1-12 + AM/PM) to 24-hour clock (0-23).
   */
  function to24Hour(hour12, ampm) {
    const h = Math.min(12, Math.max(1, hour12));
    const period = (ampm || 'AM').toUpperCase();
    if (period === 'AM') {
      return h === 12 ? 0 : h;
    }
    return h === 12 ? 12 : h + 12;
  }

  function setFieldValidity(inputEl, isInvalid) {
    if (!inputEl) return;
    if (isInvalid) {
      inputEl.classList.add('input-invalid');
      inputEl.setAttribute('aria-invalid', 'true');
    } else {
      inputEl.classList.remove('input-invalid');
      inputEl.removeAttribute('aria-invalid');
    }
  }

  function showValidationErrors(errors) {
    if (!validationBanner || !validationMessage) return;
    if (errors.length === 0) {
      validationBanner.classList.add('hidden');
      validationMessage.textContent = '';
      return;
    }
    validationMessage.textContent = errors.join(' ');
    validationBanner.classList.remove('hidden');
  }

  function padValidInputs(values) {
    if (!values) return;
    inpDay.value   = String(values.day).padStart(2, '0');
    inpMonth.value = String(values.month).padStart(2, '0');
    inpYear.value  = String(values.year).padStart(4, '0');
    inpHour.value  = String(values.hour12).padStart(2, '0');
    inpMin.value   = String(values.minute).padStart(2, '0');
  }

  /**
   * Validate all date and 12-hour time inputs.
   * When strict is false (during typing), empty fields or a leading single "0"
   * are deferred until commit (blur/change/Enter/SHOW) to avoid interrupting typing.
   */
  function validateDateTimeInputs({ strict = true } = {}) {
    const errors = [];
    let firstInvalidEl = null;

    const flagInvalid = (el, msg) => {
      setFieldValidity(el, true);
      errors.push(msg);
      if (!firstInvalidEl) firstInvalidEl = el;
    };

    [inpDay, inpMonth, inpYear, inpHour, inpMin].forEach(el => setFieldValidity(el, false));

    // --- Year (1800-2100) ---
    const yStr = inpYear.value.trim();
    const yVal = parseInt(yStr, 10);
    let yearValid = false;
    if (yStr === '') {
      if (strict) flagInvalid(inpYear, 'Birth year is required (1800-2100).');
    } else if (Number.isNaN(yVal) || ((strict || yStr.length === 4) && (yVal < 1800 || yVal > 2100))) {
      flagInvalid(inpYear, `Invalid year "${yStr}". Enter a year between 1800 and 2100.`);
    } else if (yVal >= 1800 && yVal <= 2100) {
      yearValid = true;
    }

    // --- Month (01-12) ---
    const moStr = inpMonth.value.trim();
    const moVal = parseInt(moStr, 10);
    let monthValid = false;
    if (moStr === '') {
      if (strict) flagInvalid(inpMonth, 'Birth month is required (01-12).');
    } else if (Number.isNaN(moVal) || moStr === '00' || (moVal === 0 && strict) || moVal < 0 || moVal > 12) {
      flagInvalid(inpMonth, `Invalid month "${moStr}". Enter a month between 01 and 12.`);
    } else if (moVal >= 1 && moVal <= 12) {
      monthValid = true;
    }

    // --- Day (01-daysInMonth) ---
    const dStr = inpDay.value.trim();
    const dVal = parseInt(dStr, 10);
    let dayValid = false;
    const maxDays = (yearValid && monthValid) ? new Date(yVal, moVal, 0).getDate() : 31;
    if (dStr === '') {
      if (strict) flagInvalid(inpDay, 'Birth day is required (01-31).');
    } else if (Number.isNaN(dVal) || dStr === '00' || (dVal === 0 && strict) || dVal < 0) {
      flagInvalid(inpDay, `Invalid day "${dStr}". Enter a day between 01 and ${maxDays}.`);
    } else if (dVal > maxDays) {
      if (yearValid && monthValid) {
        flagInvalid(inpDay, `Invalid day "${dStr}" for ${MONTH_NAMES[moVal - 1]} ${yVal}. Valid range is 01-${maxDays}.`);
      } else {
        flagInvalid(inpDay, `Invalid day "${dStr}". Enter a day between 01 and 31.`);
      }
    } else if (dVal >= 1) {
      dayValid = true;
    }

    // --- Hour (01-12 in 12-hour AM/PM format) ---
    const hStr = inpHour.value.trim();
    const hVal = parseInt(hStr, 10);
    let hourValid = false;
    if (hStr === '') {
      if (strict) flagInvalid(inpHour, 'Birth hour is required (01-12).');
    } else if (Number.isNaN(hVal) || hStr === '00' || (hVal === 0 && strict)) {
      flagInvalid(inpHour, 'Hour cannot be 00 in 12-hour format. Enter 01-12 (use 12 AM for midnight or 12 PM for noon).');
    } else if (hVal >= 13 && hVal <= 23) {
      flagInvalid(inpHour, `Invalid hour "${hStr}": 24-hour format is not allowed with AM/PM. Enter an hour between 01 and 12.`);
    } else if (hVal >= 24) {
      flagInvalid(inpHour, `Invalid hour "${hStr}". Enter an hour between 01 and 12.`);
    } else if (hVal >= 1 && hVal <= 12) {
      hourValid = true;
    }

    // --- Minute (00-59) ---
    const mStr = inpMin.value.trim();
    const mVal = parseInt(mStr, 10);
    let minValid = false;
    if (mStr === '') {
      if (strict) flagInvalid(inpMin, 'Birth minute is required (00-59).');
    } else if (Number.isNaN(mVal) || mVal < 0 || mVal > 59) {
      flagInvalid(inpMin, `Invalid minute "${mStr}". Enter a minute between 00 and 59.`);
    } else {
      minValid = true;
    }

    // --- AM / PM ---
    const ampm = selAmPm ? selAmPm.value : 'PM';
    const ampmValid = ampm === 'AM' || ampm === 'PM';
    if (!ampmValid) {
      errors.push('Please select AM or PM.');
    }

    showValidationErrors(errors);

    const allValid = errors.length === 0 && dayValid && monthValid && yearValid && hourValid && minValid && ampmValid;
    return {
      valid: allValid,
      firstInvalidEl,
      values: allValid ? {
        day: dVal,
        month: moVal,
        year: yVal,
        hour12: hVal,
        minute: mVal,
        ampm,
        hour24: to24Hour(hVal, ampm)
      } : null
    };
  }

  // ============================================================
  // CHART CALCULATION AND RENDERING
  // ============================================================
  function generateAndRenderChart(options = {}) {
    const validation = validateDateTimeInputs({ strict: true });
    if (!validation.valid) {
      if (options.focusOnError && validation.firstInvalidEl) {
        validation.firstInvalidEl.focus();
        validation.firstInvalidEl.select();
      }
      return false;
    }

    padValidInputs(validation.values);

    const { day, month, year, hour24: hour, minute } = validation.values;
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
