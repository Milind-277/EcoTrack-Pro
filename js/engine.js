(() => {
  "use strict";

  const TRANSPORT_FACTORS = {
    car: 0.192,
    bike: 0.083,
    bus: 0.089,
    metro: 0.025,
    bicycle: 0,
    ev: 0.045,
    autorick: 0.113
  };

  const ELECTRICITY_FACTORS = {
    ac: 1.5,
    fan: 0.048,
    appliances: 0.42,
    heater: 0.85,
    washing: 0.35
  };

  const FOOD_FACTORS = {
    vegan: 1.5,
    vegetarian: 2.0,
    pescatarian: 3.2,
    meat: 5.8
  };

  const BOUNDS = {
    transportDist: { min: 0, max: 1000 },
    acHours: { min: 0, max: 24 },
    fanHours: { min: 0, max: 24 },
    applianceHours: { min: 0, max: 24 },
    heaterHours: { min: 0, max: 24 },
    washingCycles: { min: 0, max: 12 }
  };

  function clamp(value, min, max) {
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function validateMode(value, allowed, fallback) {
    return allowed.includes(String(value)) ? String(value) : fallback;
  }

  function round(value, digits = 3) {
    return Number.parseFloat(Number(value || 0).toFixed(digits));
  }

  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date || "") ? raw.date : new Date().toISOString().slice(0, 10),
      transportMode: validateMode(raw.transportMode, Object.keys(TRANSPORT_FACTORS), "bus"),
      transportDist: clamp(raw.transportDist, BOUNDS.transportDist.min, BOUNDS.transportDist.max),
      acHours: clamp(raw.acHours, BOUNDS.acHours.min, BOUNDS.acHours.max),
      fanHours: clamp(raw.fanHours, BOUNDS.fanHours.min, BOUNDS.fanHours.max),
      applianceHours: clamp(raw.applianceHours, BOUNDS.applianceHours.min, BOUNDS.applianceHours.max),
      heaterHours: clamp(raw.heaterHours, BOUNDS.heaterHours.min, BOUNDS.heaterHours.max),
      washingCycles: clamp(raw.washingCycles, BOUNDS.washingCycles.min, BOUNDS.washingCycles.max),
      foodType: validateMode(raw.foodType, Object.keys(FOOD_FACTORS), "vegetarian")
    };
  }

  function validateEntry(raw) {
    if (!raw || typeof raw !== "object") return ["Invalid input detected.", "Please enter realistic values."];
    const values = {
      transportDist: Number(raw.transportDist),
      acHours: Number(raw.acHours),
      fanHours: Number(raw.fanHours),
      applianceHours: Number(raw.applianceHours),
      heaterHours: Number(raw.heaterHours),
      washingCycles: Number(raw.washingCycles)
    };
    const errors = [];
    const negative = Object.entries(values).filter(([, value]) => Number.isFinite(value) && value < 0);
    const overflow = [
      ["transportDist", BOUNDS.transportDist.max],
      ["acHours", BOUNDS.acHours.max],
      ["fanHours", BOUNDS.fanHours.max],
      ["applianceHours", BOUNDS.applianceHours.max],
      ["heaterHours", BOUNDS.heaterHours.max],
      ["washingCycles", BOUNDS.washingCycles.max]
    ].filter(([key, max]) => Number.isFinite(values[key]) && values[key] > max);

    if (negative.length) {
      errors.push("Invalid input detected.");
      errors.push("Negative values are not allowed.");
    }
    if (overflow.length) {
      errors.push("Please enter realistic values within normal daily ranges.");
    }
    return errors;
  }

  function calcTransport(entry) {
    const e = sanitizeEntry(entry);
    if (!e) return 0;
    return round(e.transportDist * (TRANSPORT_FACTORS[e.transportMode] || 0));
  }

  function calcElectricity(entry) {
    const e = sanitizeEntry(entry);
    if (!e) return 0;
    const f = ELECTRICITY_FACTORS;
    return round(
      e.acHours * f.ac +
      e.fanHours * f.fan +
      e.applianceHours * f.appliances +
      e.heaterHours * f.heater +
      e.washingCycles * f.washing
    );
  }

  function calcFood(entry) {
    const e = sanitizeEntry(entry);
    if (!e) return 0;
    return round(FOOD_FACTORS[e.foodType] || 0);
  }

  function calcTotal(entry) {
    const transport = calcTransport(entry);
    const electricity = calcElectricity(entry);
    const food = calcFood(entry);
    return {
      transport,
      electricity,
      food,
      total: round(transport + electricity + food)
    };
  }

  function calcBreakdownPct(entry) {
    const { transport, electricity, food, total } = calcTotal(entry);
    if (!total) return { transport: 0, electricity: 0, food: 0 };
    const pct = (v) => Math.round((v / total) * 100);
    return { transport: pct(transport), electricity: pct(electricity), food: pct(food) };
  }

  window.EcoEngine = {
    TRANSPORT_FACTORS,
    ELECTRICITY_FACTORS,
    FOOD_FACTORS,
    BOUNDS,
    sanitizeEntry,
    validateEntry,
    calcTransport,
    calcElectricity,
    calcFood,
    calcTotal,
    calcBreakdownPct,
    clamp,
    round
  };
})();
