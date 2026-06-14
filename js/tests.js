(() => {
  "use strict";

  function assert(name, condition, details = "") {
    if (!condition) throw new Error(`${name}${details ? `: ${details}` : ""}`);
  }

  function testCarbonCalculation() {
    const result = window.EcoEngine.calcTotal({
      transportMode: "car",
      transportDist: 10,
      acHours: 2,
      fanHours: 5,
      applianceHours: 3,
      heaterHours: 1,
      washingCycles: 1,
      foodType: "meat"
    });
    assert("transport=car,10km → 1.920", Math.abs(result.transport - 1.92) < 0.001, String(result.transport));
    assert("electricity sum correct", Math.abs(result.electricity - 5.7) < 0.01, String(result.electricity));
    assert("food=meat → 5.8", Math.abs(result.food - 5.8) < 0.001, String(result.food));
    assert("total = sum of parts", Math.abs(result.total - (result.transport + result.electricity + result.food)) < 0.01);

    const metro = window.EcoEngine.calcTransport({ transportMode: "metro", transportDist: 20 });
    assert("metro 20km → 0.500", Math.abs(metro - 0.5) < 0.001, String(metro));

    const bicycle = window.EcoEngine.calcTransport({ transportMode: "bicycle", transportDist: 50 });
    assert("bicycle → 0 emissions", bicycle === 0, String(bicycle));
    return true;
  }

  function testNegativeInputRejection() {
    const safe = window.EcoEngine.calcTotal({
      transportMode: "car",
      transportDist: -20,
      acHours: -8,
      applianceHours: -5,
      foodType: "vegetarian"
    });
    assert("negative distance clamped to 0", safe.transport === 0, String(safe.transport));
    assert("negative electricity clamped to 0", safe.electricity === 0, String(safe.electricity));

    const overflow = window.EcoEngine.sanitizeEntry({ transportDist: 99999, acHours: 9999 });
    assert("distance capped at 1000", overflow.transportDist === 1000, String(overflow.transportDist));
    assert("acHours capped at 24", overflow.acHours === 24, String(overflow.acHours));
    return true;
  }

  function testInputValidation() {
    const e = window.EcoEngine.sanitizeEntry({
      transportMode: "spaceship",
      transportDist: "not_a_number",
      acHours: null,
      foodType: undefined
    });
    assert("invalid mode → bus", e.transportMode === "bus");
    assert("non-numeric distance → 0", e.transportDist === 0);
    assert("null hours → 0", e.acHours === 0);
    assert("undefined food → vegetarian", e.foodType === "vegetarian");

    const nullEntry = window.EcoEngine.sanitizeEntry(null);
    assert("null entry returns null", nullEntry === null);
    return true;
  }

  function testPredictionAccuracy() {
    const history = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      transportMode: "bus",
      transportDist: 10,
      acHours: 2,
      fanHours: 6,
      applianceHours: 3,
      foodType: "vegetarian"
    }));
    const result = window.EcoPredict.forecast(history, 5);
    assert("labels length = actuals + forecasts", result.labels.length === 12, String(result.labels.length));
    assert("5 predictions returned", result.predictions.length === 5, String(result.predictions.length));
    assert("forecast array available", Array.isArray(result.forecast), "forecast missing");
    assert("all predictions non-negative", result.predictions.every((v) => v >= 0));
    assert("forecastStart = 7", result.forecastStart === 7, String(result.forecastStart));
    assert("confidence High with 7 entries", result.confidence === "High");
    assert("forecast text matches confidence format", ["Low", "Medium", "High"].includes(result.confidence));
    return true;
  }

  function testMovingAverage() {
    const vals = [10, 20, 30, 40, 50];
    const ma = window.EcoPredict.movingAverage(vals, 3);
    assert("moving average length matches input", ma.length === vals.length);
    assert("third element avg of [10,20,30]", Math.abs(ma[2] - 20) < 0.01, String(ma[2]));
    return true;
  }

  function testLinearTrend() {
    const trend = window.EcoPredict.linearTrend([0, 1, 2, 3, 4]);
    assert("slope ≈ 1 for linear series", Math.abs(trend.slope - 1) < 0.001, String(trend.slope));
    const flat = window.EcoPredict.linearTrend([5, 5, 5, 5]);
    assert("slope = 0 for flat series", Math.abs(flat.slope) < 0.001, String(flat.slope));
    return true;
  }

  function testEdgeCases() {
    const empty = window.EcoPredict.forecast([], 5);
    assert("empty history forecast returns empty labels", empty.labels.length === 0);
    assert("empty history confidence = Low", empty.confidence === "Low");

    const singleEntry = window.EcoEngine.calcTotal({ transportMode: "bus", transportDist: 0, acHours: 0, fanHours: 0, applianceHours: 0, heaterHours: 0, washingCycles: 0, foodType: "vegan" });
    assert("all-zero entry food = 1.5", Math.abs(singleEntry.food - 1.5) < 0.001, String(singleEntry.food));
    assert("all-zero entry total >= 0", singleEntry.total >= 0);
    return true;
  }

  function testAIInsights() {
    const noHistory = window.EcoAI.generateInsights([]);
    assert("empty history returns starter insight", noHistory.length === 1 && noHistory[0].type === "starter");

    const history = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      transportMode: "car",
      transportDist: 30,
      acHours: 5,
      fanHours: 6,
      applianceHours: 4,
      foodType: "meat"
    }));
    const insights = window.EcoAI.generateInsights(history);
    assert("insights array has 4 entries", insights.length === 4, String(insights.length));
    assert("first insight is breakdown", insights[0].type === "breakdown");
    assert("breakdown has desc string", typeof insights[0].desc === "string" && insights[0].desc.length > 0);
    return true;
  }

  function runAllTests() {
    const tests = [
      testCarbonCalculation,
      testNegativeInputRejection,
      testInputValidation,
      testPredictionAccuracy,
      testMovingAverage,
      testLinearTrend,
      testEdgeCases,
      testAIInsights
    ];
    let passed = 0;
    console.group("EcoTrack Pro Ultra — Test Suite");
    tests.forEach((test) => {
      try {
        test();
        passed++;
        console.log(`\u2714 PASS ${test.name}`);
      } catch (err) {
        console.error(`\u274c FAIL ${test.name}`, err.message);
      }
    });
    const allPassed = passed === tests.length;
    console.log(`\n${passed}/${tests.length} tests passed${allPassed ? " \u2705" : ""}`);
    console.groupEnd();
    return allPassed;
  }

  window.EcoTests = {
    testCarbonCalculation,
    testNegativeInputRejection,
    testInputValidation,
    testPredictionAccuracy,
    testMovingAverage,
    testLinearTrend,
    testEdgeCases,
    testAIInsights,
    runAllTests
  };

  const isDevMode = () => {
    try {
      const host = window.location.hostname;
      return (
        ["localhost", "127.0.0.1", ""].includes(host) ||
        new URLSearchParams(window.location.search).has("dev") ||
        window.localStorage.getItem("ecoTrackDevMode") === "true"
      );
    } catch {
      return false;
    }
  };

  if (isDevMode()) {
    window.addEventListener("load", runAllTests);
  }
})();
