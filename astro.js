/* ============================================================
   astro.js — Vedic Astrology Astronomical Calculation Engine
   Implements:
   - Jean Meeus "Astronomical Algorithms" for ephemeris
   - Keplerian orbital mechanics & geocentric rectangular conversions
   - Lahiri, KP, Raman, Yukteshwar & Fagan-Bradley Ayanamsas
   - Ascendant (Lagna) calculation via Local Sidereal Time (RAMC)
   - Nakshatra (27), Pada (1–4), Nakshatra Lord
   - Krishnamurti Paddhati (KP) Sub Lord & Sub-Sub Lord
   - Vimshottari Dasa system (Balance at birth & Mahadasha sequence)
   ============================================================ */

(function(global) {
  "use strict";

  const DEG2RAD = Math.PI / 180.0;
  const RAD2DEG = 180.0 / Math.PI;

  const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];

  const SIGN_NUMBERS = [
    "1 ARIES", "2 TAURUS", "3 GEMINI", "4 CANCER",
    "5 LEO", "6 VIRGO", "7 LIBRA", "8 SCORPIO",
    "9 SAGITTARIUS", "10 CAPRICORN", "11 AQUARIUS", "12 PISCES"
  ];

  const NAKSHATRAS = [
    { name: "Ashwini",           lord: "Ketu",    duration: 7  },
    { name: "Bharani",           lord: "Venus",   duration: 20 },
    { name: "Krittika",          lord: "Sun",     duration: 6  },
    { name: "Rohini",            lord: "Moon",    duration: 10 },
    { name: "Mrigashira",        lord: "Mars",    duration: 7  },
    { name: "Ardra",             lord: "Rahu",    duration: 18 },
    { name: "Punarvasu",         lord: "Jupiter", duration: 16 },
    { name: "Pushya",            lord: "Saturn",  duration: 19 },
    { name: "Ashlesha",          lord: "Mercury", duration: 17 },
    { name: "Magha",             lord: "Ketu",    duration: 7  },
    { name: "Purva Phalguni",    lord: "Venus",   duration: 20 },
    { name: "Uttara Phalguni",   lord: "Sun",     duration: 6  },
    { name: "Hasta",             lord: "Moon",    duration: 10 },
    { name: "Chitra",            lord: "Mars",    duration: 7  },
    { name: "Swati",             lord: "Rahu",    duration: 18 },
    { name: "Vishakha",          lord: "Jupiter", duration: 16 },
    { name: "Anuradha",          lord: "Saturn",  duration: 19 },
    { name: "Jyeshtha",          lord: "Mercury", duration: 17 },
    { name: "Mula",              lord: "Ketu",    duration: 7  },
    { name: "Purva Ashadha",     lord: "Venus",   duration: 20 },
    { name: "Uttara Ashadha",    lord: "Sun",     duration: 6  },
    { name: "Shravana",          lord: "Moon",    duration: 10 },
    { name: "Dhanishta",         lord: "Mars",    duration: 7  },
    { name: "Shatabhisha",       lord: "Rahu",    duration: 18 },
    { name: "Purva Bhadrapada",  lord: "Jupiter", duration: 16 },
    { name: "Uttara Bhadrapada", lord: "Saturn",  duration: 19 },
    { name: "Revati",            lord: "Mercury", duration: 17 }
  ];

  const DASA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
  const DASA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
  const DASA_TOTAL = 120.0;

  // Utility Math
  function mod360(d) {
    let r = d % 360.0;
    if (r < 0) r += 360.0;
    return r;
  }

  function sind(d) { return Math.sin(d * DEG2RAD); }
  function cosd(d) { return Math.cos(d * DEG2RAD); }
  function tand(d) { return Math.tan(d * DEG2RAD); }
  function atan2d(y, x) { return Math.atan2(y, x) * RAD2DEG; }

  // Julian Day from UTC calendar date
  function jdn(year, month, day, hour, min, sec) {
    let y = year;
    let m = month;
    const h = (hour || 0) + (min || 0) / 60.0 + (sec || 0) / 3600.0;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + h / 24.0 + b - 1524.5;
  }

  function jcent(jd) {
    return (jd - 2451545.0) / 36525.0;
  }

  function jdToDate(jd) {
    const z = Math.floor(jd + 0.5);
    const f = jd + 0.5 - z;
    let A = z;
    if (z >= 2299161) {
      const alpha = Math.floor((z - 1867216.25) / 36524.25);
      A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);
    const dayF = B - D - Math.floor(30.6001 * E) + f;
    const day = Math.floor(dayF);
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;
    const fracDay = dayF - day;
    const h = fracDay * 24.0;
    const hour = Math.floor(h);
    const m = (h - hour) * 60.0;
    const minute = Math.floor(m);
    return { year, month, day, hour, minute };
  }

  function formatDateISO(jd) {
    const d = jdToDate(jd);
    const pad = n => String(n).padStart(2, '0');
    return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
  }

  // Timezone Offset Calculation
  function getUTCOffsetHours(tzName, dateObj) {
    try {
      const utcStr = dateObj.toLocaleString('en-US', { timeZone: 'UTC', hour12: false,
        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const tzStr = dateObj.toLocaleString('en-US', { timeZone: tzName, hour12: false,
        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const offsetMs = new Date(tzStr) - new Date(utcStr);
      return offsetMs / 3600000.0;
    } catch (e) {
      return 5.5; // Default Indian Standard Time (+05:30)
    }
  }

  function birthTimeToJD(year, month, day, hour, minute, tzName) {
    const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const offsetHours = getUTCOffsetHours(tzName, localDate);
    const totalLocalHours = hour + minute / 60.0;
    const totalUTCHours = totalLocalHours - offsetHours;

    let utcDay = day;
    let utcHour = totalUTCHours;
    let utcMonth = month;
    let utcYear = year;

    while (utcHour < 0) {
      utcHour += 24.0;
      utcDay -= 1;
      if (utcDay < 1) {
        utcMonth -= 1;
        if (utcMonth < 1) {
          utcMonth = 12;
          utcYear -= 1;
        }
        utcDay = new Date(utcYear, utcMonth, 0).getDate();
      }
    }
    while (utcHour >= 24.0) {
      utcHour -= 24.0;
      utcDay += 1;
      const daysInM = new Date(utcYear, utcMonth, 0).getDate();
      if (utcDay > daysInM) {
        utcDay = 1;
        utcMonth += 1;
        if (utcMonth > 12) {
          utcMonth = 1;
          utcYear += 1;
        }
      }
    }

    const h = Math.floor(utcHour);
    const remMin = (utcHour - h) * 60.0;
    const m = Math.floor(remMin);
    const s = Math.round((remMin - m) * 60.0);
    return jdn(utcYear, utcMonth, utcDay, h, m, s);
  }

  // Ayanamsa Calculation
  function getAyanamsa(jd, type) {
    const t = jcent(jd);
    const baseLahiri = 23.857092 + 1.3969713 * t + 0.0003088 * (t * t);
    const tLower = (type || 'lahiri').toLowerCase();
    switch (tLower) {
      case 'lahiri': return baseLahiri;
      case 'raman': return baseLahiri - 1.4361;
      case 'kpnew':
      case 'kp': return baseLahiri - 0.1000;
      case 'yukteshwar': return baseLahiri - 0.5833;
      case 'fagan': return baseLahiri + 0.9000;
      default: return baseLahiri;
    }
  }

  // Kepler Solver
  function solveKepler(M_deg, e) {
    const M = M_deg * DEG2RAD;
    let E = M;
    for (let i = 0; i < 25; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-9) break;
    }
    const v = 2.0 * Math.atan2(Math.sqrt(1.0 + e) * Math.sin(E / 2.0), Math.sqrt(1.0 - e) * Math.cos(E / 2.0)) * RAD2DEG;
    const r_fac = 1.0 - e * Math.cos(E);
    return { v: mod360(v), r_fac };
  }

  // Planetary Calculation Engine
  function calculateEphemeris(jd, ayanamsaVal) {
    const T = jcent(jd);

    // 1. Sun (Meeus Ch 25)
    const l0 = mod360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    const m_sun = mod360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    const c_sun = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(m_sun)
                + (0.019993 - 0.000101 * T) * sind(2 * m_sun)
                + 0.000289 * sind(3 * m_sun);
    const sun_true_lon = mod360(l0 + c_sun);
    const omega_sun = mod360(125.04 - 1934.136 * T);
    const sun_apparent = mod360(sun_true_lon - 0.00569 - 0.00478 * sind(omega_sun));

    // Earth's heliocentric position
    const earth_l = mod360(sun_true_lon + 180.0);
    const r_earth = 1.000001018 * (1.0 - 0.016708634 * 0.016708634) / (1.0 + 0.016708634 * cosd(m_sun + c_sun));
    const xe = r_earth * cosd(earth_l);
    const ye = r_earth * sind(earth_l);

    // 2. Moon (Meeus Ch 47 truncated harmonic terms)
    const Lp = mod360(218.3164477 + 481267.88123421 * T);
    const D  = mod360(297.8501921 + 445267.1114034 * T);
    const M_m = mod360(357.5291092 + 35999.0502909 * T);
    const Mp = mod360(134.9633964 + 477198.8675055 * T);
    const F  = mod360(93.2720950 + 483202.0175233 * T);

    const moon_terms = (
      6288774 * sind(Mp) +
      1274027 * sind(2 * D - Mp) +
      658314 * sind(2 * D) +
      213618 * sind(2 * Mp) -
      185116 * sind(M_m) -
      114332 * sind(2 * F) +
      58793 * sind(2 * D - 2 * Mp) +
      57066 * sind(2 * D - M_m - Mp) +
      53322 * sind(2 * D + Mp) +
      45758 * sind(2 * D - M_m) -
      40923 * sind(M_m - Mp) -
      34720 * sind(D) -
      30383 * sind(M_m + Mp) +
      15327 * sind(2 * D - 2 * F) -
      12528 * sind(Mp + 2 * F) +
      10980 * sind(Mp - 2 * F) +
      10675 * sind(4 * D - Mp) +
      10034 * sind(3 * Mp) +
      8548 * sind(4 * D - 2 * Mp) -
      7888 * sind(2 * D + M_m - Mp) -
      6766 * sind(2 * D + M_m) -
      5163 * sind(D - Mp) +
      4987 * sind(D + M_m) +
      4036 * sind(2 * D - M_m + Mp) +
      3994 * sind(2 * D + 2 * Mp) +
      3861 * sind(4 * D) +
      3665 * sind(2 * D - 3 * Mp) -
      2689 * sind(M_m - 2 * Mp) -
      2602 * sind(2 * D - Mp + 2 * F) +
      2390 * sind(2 * D - M_m - 2 * Mp) -
      2348 * sind(D + Mp) +
      2236 * sind(2 * D - 2 * M_m) -
      2120 * sind(M_m + 2 * Mp) -
      2069 * sind(2 * M_m) +
      2048 * sind(2 * D - 2 * M_m - Mp)
    ) / 1000000.0;

    const A1 = mod360(119.75 + 131.849 * T);
    const A2 = mod360(53.09 + 479264.290 * T);
    const moon_add = (3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2)) / 1000000.0;
    const moon_trop = mod360(Lp + moon_terms + moon_add);

    // 3. Keplerian Planets (Mercury, Venus, Mars, Jupiter, Saturn)
    const planetDefs = {
      mercury: { a: 0.387098, e: 0.205635, L: 252.2509 + 149472.6741 * T, pi: 77.4564 + 1.5565 * T },
      venus:   { a: 0.723330, e: 0.006773, L: 181.9797 + 58517.8154 * T,  pi: 131.5729 + 1.4022 * T },
      mars:    { a: 1.523688, e: 0.093405, L: 355.4330 + 19140.3027 * T,  pi: 336.0408 + 1.8410 * T },
      jupiter: { a: 5.202561, e: 0.048498, L: 34.3515 + 3034.9057 * T,    pi: 14.7269 + 1.6190 * T },
      saturn:  { a: 9.55475,  e: 0.055546, L: 50.0774 + 1222.1138 * T,    pi: 92.5989 - 0.0563 * T }
    };

    function computePlanetGeoLon(p) {
      const M = mod360(p.L - p.pi);
      const { v, r_fac } = solveKepler(M, p.e);
      const r = p.a * r_fac;
      const helio_l = mod360(p.pi + v);
      const xp = r * cosd(helio_l);
      const yp = r * sind(helio_l);
      return mod360(atan2d(yp - ye, xp - xe));
    }

    const merc_trop = computePlanetGeoLon(planetDefs.mercury);
    const ven_trop  = computePlanetGeoLon(planetDefs.venus);
    const mars_trop = computePlanetGeoLon(planetDefs.mars);
    const jup_trop  = computePlanetGeoLon(planetDefs.jupiter);
    const sat_trop  = computePlanetGeoLon(planetDefs.saturn);

    // 4. Lunar Nodes (Rahu / Ketu — Standard Indian Mean Node convention)
    const omega = mod360(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000.0);
    const rahu_trop = omega;
    const ketu_trop = mod360(rahu_trop + 180.0);

    return {
      sun: mod360(sun_apparent - ayanamsaVal),
      moon: mod360(moon_trop - ayanamsaVal),
      mercury: mod360(merc_trop - ayanamsaVal),
      venus: mod360(ven_trop - ayanamsaVal),
      mars: mod360(mars_trop - ayanamsaVal),
      jupiter: mod360(jup_trop - ayanamsaVal),
      saturn: mod360(sat_trop - ayanamsaVal),
      rahu: mod360(rahu_trop - ayanamsaVal),
      ketu: mod360(ketu_trop - ayanamsaVal)
    };
  }

  // Ascendant Calculation
  function calculateAscendant(jd, lat, lon, ayanamsaVal) {
    const T = jcent(jd);
    const theta0 = mod360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000.0);
    const lst = mod360(theta0 + lon);
    const eps = 23.439291111 - 0.013004167 * T - 0.000000164 * T * T + 0.000000504 * T * T * T;

    const y = -cosd(lst);
    const x = sind(lst) * cosd(eps) + tand(lat) * sind(eps);

    const tropAsc = mod360(atan2d(y, x) + 180.0);
    const sidAsc = mod360(tropAsc - ayanamsaVal);
    return { tropAsc, sidAsc };
  }

  // Nakshatra, Pada, Lord
  function getNakshatraInfo(lon) {
    const norm = mod360(lon);
    const eachSpan = 360.0 / 27.0; // 13°20' = 13.333333°
    const idx = Math.floor(norm / eachSpan);
    const degInNak = norm - idx * eachSpan;
    const pada = Math.floor(degInNak / (eachSpan / 4.0)) + 1;
    return {
      index: idx,
      name: NAKSHATRAS[idx].name,
      lord: NAKSHATRAS[idx].lord,
      pada: Math.min(4, Math.max(1, pada)),
      degInNak: degInNak
    };
  }

  // KP Sub Lord & Sub-Sub Lord
  function getKpSubLords(lon) {
    const nakSpan = 360.0 / 27.0; // 13.333333°
    const norm = mod360(lon);
    const nakIdx = Math.floor(norm / nakSpan);
    const degInNak = norm - nakIdx * nakSpan;
    const minInNak = degInNak * 60.0; // 0 to 800 minutes

    const nakLord = NAKSHATRAS[nakIdx].lord;
    const startIdx = DASA_ORDER.indexOf(nakLord);

    let acc = 0.0;
    let subLord = DASA_ORDER[startIdx];
    let subStart = 0.0;
    let subSpan = 0.0;

    for (let i = 0; i < 9; i++) {
      const lord = DASA_ORDER[(startIdx + i) % 9];
      const span = 800.0 * (DASA_YEARS[lord] / DASA_TOTAL);
      if (minInNak >= acc && minInNak < acc + span) {
        subLord = lord;
        subStart = acc;
        subSpan = span;
        break;
      }
      acc += span;
    }
    if (!subSpan) {
      subLord = DASA_ORDER[(startIdx + 8) % 9];
      subSpan = 800.0 * (DASA_YEARS[subLord] / DASA_TOTAL);
      subStart = 800.0 - subSpan;
    }

    // Sub-Sub Lord
    const minInSub = minInNak - subStart;
    const subStartIdx = DASA_ORDER.indexOf(subLord);
    let subSubAcc = 0.0;
    let subSubLord = DASA_ORDER[subStartIdx];

    for (let i = 0; i < 9; i++) {
      const lord = DASA_ORDER[(subStartIdx + i) % 9];
      const span = subSpan * (DASA_YEARS[lord] / DASA_TOTAL);
      if (minInSub >= subSubAcc && minInSub < subSubAcc + span) {
        subSubLord = lord;
        break;
      }
      subSubAcc += span;
    }

    return { subLord, subSubLord };
  }

  // Vimshottari Dasa Calculation
  function calculateVimshottariDasa(moonSidLon, birthJD) {
    const nak = getNakshatraInfo(moonSidLon);
    const nakLord = nak.lord;
    const dasaDuration = DASA_YEARS[nakLord];
    const nakSpan = 360.0 / 27.0;
    const fracRemaining = (nakSpan - nak.degInNak) / nakSpan;
    const balanceYears = dasaDuration * fracRemaining;

    // Years, Months, Days
    const totalDays = balanceYears * 365.25;
    const y = Math.floor(totalDays / 365.25);
    const remD = totalDays - y * 365.25;
    const m = Math.floor(remD / 30.4375);
    const d = Math.floor(remD - m * 30.4375);

    const lordIdx = DASA_ORDER.indexOf(nakLord);
    const sequence = [];
    let curJD = birthJD;

    // First Mahadasha (balance portion)
    sequence.push({
      lord: nakLord,
      years: balanceYears,
      startJD: curJD,
      endJD: curJD + balanceYears * 365.25,
      isCurrent: false
    });
    curJD += balanceYears * 365.25;

    // Subsequent 8 Mahadashas (full duration)
    for (let i = 1; i < 9; i++) {
      const idx = (lordIdx + i) % 9;
      const lord = DASA_ORDER[idx];
      const yrs = DASA_YEARS[lord];
      sequence.push({
        lord: lord,
        years: yrs,
        startJD: curJD,
        endJD: curJD + yrs * 365.25,
        isCurrent: false
      });
      curJD += yrs * 365.25;
    }

    // Determine current running Mahadasha
    const now = new Date();
    const nowJD = jdn(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), 12, 0, 0);

    let currentDasa = sequence[0];
    for (let i = 0; i < sequence.length; i++) {
      if (nowJD >= sequence[i].startJD && nowJD < sequence[i].endJD) {
        sequence[i].isCurrent = true;
        currentDasa = sequence[i];
        break;
      }
    }

    return {
      birthNakshatra: nak.name,
      nakshatraLord: nakLord,
      balanceYears,
      balanceStr: `${y}Y ${m}M ${d}D`,
      sequence,
      currentDasa,
      currentDasaStr: `${currentDasa.lord.toUpperCase()} (${formatDateISO(currentDasa.startJD)} TO ${formatDateISO(currentDasa.endJD)})`
    };
  }

  // Format Degree as Decimal XX.YY (e.g. 20.11)
  function formatDecimalDegree(deg) {
    return deg.toFixed(2);
  }

  // South Indian Fixed 4x4 Grid Definition
  // Row 0: 12 PISCES, 1 ARIES, 2 TAURUS, 3 GEMINI
  // Row 1: 11 AQUARIUS, (center), (center), 4 CANCER
  // Row 2: 10 CAPRICORN, (center), (center), 5 LEO
  // Row 3: 9 SAGITTARIUS, 8 SCORPIO, 7 LIBRA, 6 VIRGO
  const SOUTH_INDIAN_CELLS = [
    { signIdx: 11, label: "12 PISCES",      row: 1, col: 1 },
    { signIdx: 0,  label: "1 ARIES",       row: 1, col: 2 },
    { signIdx: 1,  label: "2 TAURUS",      row: 1, col: 3 },
    { signIdx: 2,  label: "3 GEMINI",      row: 1, col: 4 },
    { signIdx: 10, label: "11 AQUARIUS",    row: 2, col: 1 },
    { signIdx: 3,  label: "4 CANCER",      row: 2, col: 4 },
    { signIdx: 9,  label: "10 CAPRICORN",   row: 3, col: 1 },
    { signIdx: 4,  label: "5 LEO",         row: 3, col: 4 },
    { signIdx: 8,  label: "9 SAGITTARIUS",  row: 4, col: 1 },
    { signIdx: 7,  label: "8 SCORPIO",      row: 4, col: 2 },
    { signIdx: 6,  label: "7 LIBRA",        row: 4, col: 3 },
    { signIdx: 5,  label: "6 VIRGO",        row: 4, col: 4 }
  ];

  // Main High-Level Generator
  function generateChart(params) {
    const {
      year, month, day, hour, minute, lat, lon, tz, ayanamsa: ayanamsaType, name
    } = params;

    const birthJD = birthTimeToJD(year, month, day, hour, minute, tz);
    const ayanamsaVal = getAyanamsa(birthJD, ayanamsaType || 'lahiri');

    // Calculate Planets & Ascendant
    const ephem = calculateEphemeris(birthJD, ayanamsaVal);
    const { sidAsc } = calculateAscendant(birthJD, lat, lon, ayanamsaVal);

    // Build Position List
    const planetOrder = [
      { id: "lagna",   name: "LAGNA",   lon: sidAsc,          isLagna: true },
      { id: "sun",     name: "SUN",     lon: ephem.sun },
      { id: "moon",    name: "MOON",    lon: ephem.moon },
      { id: "mars",    name: "MARS",    lon: ephem.mars },
      { id: "mercury", name: "MERCURY", lon: ephem.mercury },
      { id: "jupiter", name: "JUPITER", lon: ephem.jupiter },
      { id: "venus",   name: "VENUS",   lon: ephem.venus },
      { id: "saturn",  name: "SATURN",  lon: ephem.saturn },
      { id: "rahu",    name: "RAHU",    lon: ephem.rahu },
      { id: "ketu",    name: "KETU",    lon: ephem.ketu }
    ];

    const positions = planetOrder.map(p => {
      const signIdx = Math.floor(p.lon / 30.0);
      const degInSign = p.lon % 30.0;
      const nak = getNakshatraInfo(p.lon);
      return {
        id: p.id,
        name: p.name,
        lon: p.lon,
        signIdx: signIdx,
        signName: SIGNS[signIdx].toUpperCase(),
        degInSign: degInSign,
        degStr: formatDecimalDegree(degInSign),
        nakshatra: nak.name.toUpperCase(),
        lord: nak.lord.toUpperCase(),
        pada: nak.pada,
        isLagna: !!p.isLagna
      };
    });

    // Group Planets by Sign (for 4x4 chart cells)
    const signGroups = Array.from({ length: 12 }, () => []);
    positions.forEach(p => {
      signGroups[p.signIdx].push(p.name);
    });

    // Vimshottari Dasa
    const dasa = calculateVimshottariDasa(ephem.moon, birthJD);

    // KP Sub-Lord and Sub-Sub-Lord for Lagna (Ascendant)
    const lagnaKp = getKpSubLords(sidAsc);
    const lagnaNak = getNakshatraInfo(sidAsc);

    return {
      name: name || "Narendran",
      birthDetails: { year, month, day, hour, minute, lat, lon, tz },
      birthJD,
      ayanamsaVal,
      positions,
      signGroups,
      dasa,
      kpSummary: {
        ascNakshatra: lagnaNak.name.toUpperCase(),
        nakshatraLord: lagnaNak.lord.toUpperCase(),
        subLord: lagnaKp.subLord.toUpperCase(),
        subSubLord: lagnaKp.subSubLord.toUpperCase()
      },
      southIndianCells: SOUTH_INDIAN_CELLS
    };
  }

  // Export
  global.AstroEngine = {
    SIGNS,
    SIGN_NUMBERS,
    NAKSHATRAS,
    DASA_ORDER,
    DASA_YEARS,
    SOUTH_INDIAN_CELLS,
    generateChart,
    getAyanamsa,
    getNakshatraInfo,
    getKpSubLords,
    calculateVimshottariDasa,
    jdn,
    jcent,
    formatDecimalDegree
  };

})(typeof window !== 'undefined' ? window : this);
