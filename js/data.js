(() => {
  const STORAGE_KEYS = {
    users: "ecoTrackUsers",
    currentUser: "ecoTrackUser",
    theme: "ecoTrackTheme"
  };

  const DEFAULT_USER = {
    points: 0,
    streak: 0,
    ecoScore: 50,
    badges: [],
    history: []
  };

  const safeJsonParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const storage = {
    get(key, fallback = null) {
      try {
        return safeJsonParse(localStorage.getItem(key), fallback);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    getString(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setString(key, value) {
      try {
        localStorage.setItem(key, String(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        return false;
      }
      return true;
    }
  };

  const sanitizeText = (value, maxLength = 120) => {
    if (typeof value !== "string") return "";
    const div = document.createElement("div");
    div.textContent = value;
    return div.textContent
      .replace(/[\u0000-\u001f\u007f<>`"']/g, "")
      .trim()
      .slice(0, maxLength);
  };

  const toNumber = (value, options = {}) => {
    const min = options.min ?? 0;
    const max = options.max ?? Number.MAX_SAFE_INTEGER;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  const todayISO = () => new Date().toISOString().slice(0, 10);

  async function digestPassword(password) {
    const normalized = String(password);
    if (window.crypto?.subtle) {
      const bytes = new TextEncoder().encode(normalized);
      const hash = await window.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return `legacy:${btoa(normalized)}`;
  }

  function normalizeUser(user) {
    if (!user || typeof user !== "object") return null;
    return {
      ...DEFAULT_USER,
      ...user,
      id: sanitizeText(user.id || `user_${Date.now()}`, 80),
      name: sanitizeText(user.name || "Eco User", 80),
      email: sanitizeText(user.email || "", 120).toLowerCase(),
      history: Array.isArray(user.history) ? user.history.map(normalizeEntry).filter(Boolean) : [],
      points: Math.max(0, Number.parseInt(user.points || 0, 10)),
      streak: Math.max(0, Number.parseInt(user.streak || 0, 10)),
      ecoScore: Math.min(100, Math.max(0, Number.parseInt(user.ecoScore || 50, 10))),
      badges: Array.isArray(user.badges) ? user.badges.map((b) => sanitizeText(b, 60)) : []
    };
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const allowedModes = ["car", "bike", "bus", "metro", "bicycle", "ev", "autorick"];
    const allowedFood = ["vegan", "vegetarian", "pescatarian", "meat"];
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(entry.date || "") ? entry.date : todayISO(),
      transportMode: allowedModes.includes(entry.transportMode) ? entry.transportMode : "bus",
      transportDist: toNumber(entry.transportDist, { min: 0, max: 1000 }),
      acHours: toNumber(entry.acHours, { min: 0, max: 24 }),
      fanHours: toNumber(entry.fanHours, { min: 0, max: 24 }),
      applianceHours: toNumber(entry.applianceHours, { min: 0, max: 24 }),
      heaterHours: toNumber(entry.heaterHours, { min: 0, max: 24 }),
      washingCycles: toNumber(entry.washingCycles, { min: 0, max: 12 }),
      foodType: allowedFood.includes(entry.foodType) ? entry.foodType : "vegetarian"
    };
  }

  window.EcoData = {
    STORAGE_KEYS,
    INDIA_AVERAGE_DAILY: 14,
    CO2_PER_TREE_MONTH: 21,
    FACTORS: {
      transport: {
        car: 0.192,
        bike: 0.083,
        bus: 0.089,
        metro: 0.025,
        bicycle: 0,
        ev: 0.045,
        autorick: 0.113
      },
      electricity: {
        ac: 1.5,
        fan: 0.048,
        appliances: 0.42,
        heater: 0.85,
        washing: 0.35
      },
      food: {
        vegan: 1.5,
        vegetarian: 2.0,
        pescatarian: 3.2,
        meat: 5.8
      }
    },
    dummyUsers: [
      ["Arjun Mehta", 96, 32, 5200, "Mumbai"],
      ["Priya Krishnan", 93, 28, 4800, "Bengaluru"],
      ["Rahul Sharma", 89, 21, 4100, "Delhi"],
      ["Neha Rajput", 86, 17, 3600, "Pune"],
      ["Amit Patel", 82, 14, 3100, "Ahmedabad"],
      ["Sneha Desai", 78, 11, 2700, "Chennai"],
      ["Karan Verma", 74, 8, 2200, "Hyderabad"],
      ["Kavya Iyer", 71, 6, 1900, "Kochi"],
      ["Rohan Das", 67, 4, 1500, "Kolkata"],
      ["Ananya Bose", 63, 3, 1200, "Jaipur"],
      ["Vikram Singh", 60, 2, 900, "Lucknow"],
      ["Meera Nair", 57, 1, 700, "Bhopal"]
    ].map(([name, ecoScore, streak, points, city], index) => ({
      id: `demo_${index + 1}`,
      name,
      ecoScore,
      streak,
      points,
      city
    })),

    storage,
    sanitizeText,
    toNumber,
    normalizeEntry,
    todayISO,
    // Calculation helpers (public API)
    calculateTransport(entry = {}) {
      const e = normalizeEntry(entry);
      const factor = this.FACTORS.transport[e.transportMode] || 0;
      const value = Number.parseFloat((e.transportDist * factor).toFixed(3));
      return Math.max(0, value);
    },
    calculateElectricity(entry = {}) {
      const e = normalizeEntry(entry);
      const f = this.FACTORS.electricity;
      const value = Number.parseFloat((e.acHours * f.ac + e.fanHours * f.fan + e.applianceHours * f.appliances + e.heaterHours * f.heater + e.washingCycles * f.washing).toFixed(3));
      return Math.max(0, value);
    },
    calculateDiet(entry = {}) {
      const e = normalizeEntry(entry);
      const value = Number.parseFloat((this.FACTORS.food[e.foodType] || 0).toFixed(3));
      return Math.max(0, value);
    },
    calculateTotal(entry = {}) {
      const t = this.calculateTransport(entry);
      const elec = this.calculateElectricity(entry);
      const diet = this.calculateDiet(entry);
      return {
        transport: t,
        electricity: elec,
        food: diet,
        total: Number.parseFloat((t + elec + diet).toFixed(3))
      };
    },
    simulateApi(ms = 220) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    },
    getUsers() {
      const raw = storage.get(STORAGE_KEYS.users, {});
      const users = {};
      Object.keys(raw || {}).forEach((id) => {
        const user = normalizeUser(raw[id]);
        if (user?.id) users[user.id] = user;
      });
      return users;
    },
    saveUsers(users) {
      return storage.set(STORAGE_KEYS.users, users);
    },
    getCurrentUserSync() {
      const id = storage.getString(STORAGE_KEYS.currentUser);
      if (!id) return null;
      return this.getUsers()[id] || null;
    },
    async getCurrentUser() {
      await this.simulateApi(80);
      return this.getCurrentUserSync();
    },
    saveUserSync(user) {
      const normalized = normalizeUser(user);
      if (!normalized) throw new Error("Invalid user profile.");
      const users = this.getUsers();
      users[normalized.id] = normalized;
      this.saveUsers(users);
      return normalized;
    },
    async signup(name, email, password) {
      await this.simulateApi(360);
      const cleanName = sanitizeText(name, 80);
      const cleanEmail = sanitizeText(email, 120).toLowerCase();
      if (cleanName.length < 2) throw new Error("Enter a valid name.");
      if (!isValidEmail(cleanEmail)) throw new Error("Enter a valid email address.");
      if (String(password).length < 8) throw new Error("Password must be at least 8 characters.");

      const users = this.getUsers();
      if (Object.values(users).some((u) => u.email === cleanEmail)) {
        throw new Error("That email is already registered.");
      }

      const user = normalizeUser({
        ...DEFAULT_USER,
        id: `user_${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        passwordHash: await digestPassword(password),
        joinedAt: new Date().toISOString()
      });
      users[user.id] = user;
      this.saveUsers(users);
      storage.setString(STORAGE_KEYS.currentUser, user.id);
      return user;
    },
    async login(email, password) {
      await this.simulateApi(280);
      const cleanEmail = sanitizeText(email, 120).toLowerCase();
      if (!isValidEmail(cleanEmail) || !password) throw new Error("Enter a valid email and password.");
      const users = this.getUsers();
      const passwordHash = await digestPassword(password);
      const user = Object.values(users).find((candidate) => {
        return candidate.email === cleanEmail &&
          (candidate.passwordHash === passwordHash || candidate.password === password);
      });
      if (!user) throw new Error("Invalid email or password.");
      if (user.password && !user.passwordHash) {
        user.passwordHash = passwordHash;
        delete user.password;
        this.saveUserSync(user);
      }
      storage.setString(STORAGE_KEYS.currentUser, user.id);
      return user;
    },
    logout() {
      storage.remove(STORAGE_KEYS.currentUser);
    },
    async logEntry(entryData) {
      await this.simulateApi(260);
      const user = this.getCurrentUserSync();
      if (!user) throw new Error("Please sign in before logging data.");
      const entry = normalizeEntry(entryData);
      if (!entry.transportMode || !entry.foodType) throw new Error("Complete all required fields.");
      const existingIndex = user.history.findIndex((item) => item.date === entry.date);
      if (existingIndex >= 0) {
        user.history[existingIndex] = entry;
      } else {
        user.history.push(entry);
        user.points += 10;
      }
      user.history.sort((a, b) => a.date.localeCompare(b.date));
      if (window.EcoLogic) window.EcoLogic.updateGamification(user);
      return this.saveUserSync(user);
    },
    getStats(user = this.getCurrentUserSync()) {
      if (!user?.history?.length || !window.EcoLogic) return null;
      const recent = [...user.history].slice(-7);
      const totals = recent.map((entry) => window.EcoLogic.calculateEmissions(entry));
      const sum = totals.reduce((acc, item) => ({
        transport: acc.transport + item.transport,
        electricity: acc.electricity + item.electricity,
        food: acc.food + item.food,
        total: acc.total + item.total
      }), { transport: 0, electricity: 0, food: 0, total: 0 });
      const count = Math.max(1, totals.length);
      return {
        total: sum.total,
        dailyAverage: sum.total / count,
        transport: sum.transport / count,
        electricity: sum.electricity / count,
        food: sum.food / count,
        count: user.history.length,
        recent
      };
    },
    async getLeaderboard() {
      await this.simulateApi(220);
      const user = this.getCurrentUserSync();
      const users = [...this.dummyUsers];
      if (user) {
        users.push({
          id: user.id,
          name: user.name,
          ecoScore: user.ecoScore || 50,
          streak: user.streak || 0,
          points: user.points || 0,
          city: "Your city",
          isCurrentUser: true
        });
      }
      return users
        .sort((a, b) => b.ecoScore - a.ecoScore || b.points - a.points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
  };
})();
