(() => {
  const isDevMode = () => {
    const host = window.location.hostname;
    return ["localhost", "127.0.0.1", ""].includes(host) ||
      new URLSearchParams(window.location.search).has("dev") ||
      window.localStorage?.getItem("ecoTrackDevMode") === "true";
  };

  function assert(name, condition, details = "") {
    if (!condition) throw new Error(`${name}${details ? `: ${details}` : ""}`);
  }

  function testCarbonCalculation() {
    const result = window.EcoLogic.calculateEmissions({
      transportMode: "car",
      transportDist: 10,
      acHours: 2,
      fanHours: 5,
      applianceHours: 3,
      heaterHours: 1,
      washingCycles: 1,
      foodType: "meat"
    });
    assert("transport calculation", Math.abs(result.transport - 1.92) < 0.001);
    assert("electricity calculation", Math.abs(result.electricity - 5.7) < 0.001, String(result.electricity));
    assert("food calculation", Math.abs(result.food - 5.8) < 0.001);
    const safe = window.EcoLogic.calculateEmissions({ transportMode: "car", transportDist: -20, acHours: -8, foodType: "vegetarian" });
    assert("negative transport clamp", safe.transport === 0);
    assert("negative electricity clamp", safe.electricity === 0);
    return true;
  }

  function testScoreCalculation() {
    const history = [
      { transportMode: "metro", transportDist: 8, acHours: 1, fanHours: 6, applianceHours: 3, foodType: "vegetarian", date: "2026-06-10" },
      { transportMode: "bus", transportDist: 8, acHours: 1, fanHours: 6, applianceHours: 3, foodType: "vegetarian", date: "2026-06-11" },
      { transportMode: "bicycle", transportDist: 4, acHours: 0, fanHours: 6, applianceHours: 2, foodType: "vegan", date: "2026-06-12" }
    ];
    const score = window.EcoLogic.calculateEcoScore(history, 100, 3);
    assert("score in range", score >= 0 && score <= 100, String(score));
    assert("efficient habits score well", score >= 70, String(score));
    return true;
  }

  function testPredictionLogic() {
    const history = Array.from({ length: 5 }, (_, index) => ({
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      transportMode: "bus",
      transportDist: 10 + index,
      acHours: 2,
      fanHours: 6,
      applianceHours: 3,
      foodType: "vegetarian"
    }));
    const forecast = window.EcoLogic.getForecast(history, 5);
    assert("forecast length", forecast.values.length === 10, String(forecast.values.length));
    assert("forecast start", forecast.forecastStart === 5, String(forecast.forecastStart));
    assert("forecast non-negative", forecast.values.every((value) => value >= 0));
    return true;
  }

  function runAllTests() {
    const tests = [testCarbonCalculation, testScoreCalculation, testPredictionLogic];
    let passed = 0;
    console.group("EcoTrack Pro tests");
    tests.forEach((test) => {
      try {
        test();
        passed += 1;
        console.log(`\u2714 PASS ${test.name}`);
      } catch (error) {
        console.error(`\u274c FAIL ${test.name}`, error.message);
      }
    });
    console.log(`${passed}/${tests.length} tests passed`);
    console.groupEnd();
    return passed === tests.length;
  }

  window.EcoTests = {
    testCarbonCalculation,
    testScoreCalculation,
    testPredictionLogic,
    runAllTests
  };

  if (isDevMode()) {
    window.addEventListener("load", () => runAllTests());
  }
})();
