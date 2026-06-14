(() => {
  "use strict";

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
    hasOffset: false,
    history: []
  };

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
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
      try { return localStorage.getItem(key); } catch { return null; }
    },
    setString(key, value) {
      try { localStorage.setItem(key, String(value)); return true; } catch { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); return true; } catch { return false; }
    }
  };

  function sanitizeText(value, maxLength = 120) {
    if (typeof value !== "string") return "";
    const el = document.createElement("div");
    el.textContent = value;
    return el.textContent
      .replace(/[\u0000-\u001f\u007f<>`"']/g, "")
      .trim()
      .slice(0, maxLength);
  }

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

  function normalizeEntry(raw) {
    return window.EcoEngine ? window.EcoEngine.sanitizeEntry(raw) : null;
  }

  function normalizeUser(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      ...DEFAULT_USER,
      ...raw,
      id: sanitizeText(raw.id || `user_${Date.now()}`, 80),
      name: sanitizeText(raw.name || "Eco User", 80),
      email: sanitizeText(raw.email || "", 120).toLowerCase(),
      history: Array.isArray(raw.history) ? raw.history.map(normalizeEntry).filter(Boolean) : [],
      points: Math.max(0, Number.parseInt(raw.points || 0, 10)),
      streak: Math.max(0, Number.parseInt(raw.streak || 0, 10)),
      ecoScore: Math.min(100, Math.max(0, Number.parseInt(raw.ecoScore || 50, 10))),
      badges: Array.isArray(raw.badges) ? raw.badges.map((b) => sanitizeText(b, 60)) : [],
      hasOffset: Boolean(raw.hasOffset)
    };
  }

  const dummyUsers = [
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
  ].map(([name, ecoScore, streak, points, city], i) => ({
    id: `demo_${i + 1}`,
    name,
    ecoScore,
    streak,
    points,
    city
  }));

  const simulateApi = (ms = 250) => new Promise((r) => setTimeout(r, ms));

  function getUsers() {
    const raw = storage.get(STORAGE_KEYS.users, {});
    const users = {};
    Object.keys(raw || {}).forEach((id) => {
      const u = normalizeUser(raw[id]);
      if (u?.id) users[u.id] = u;
    });
    return users;
  }

  function saveUsers(users) {
    return storage.set(STORAGE_KEYS.users, users);
  }

  function getCurrentUserSync() {
    const id = storage.getString(STORAGE_KEYS.currentUser);
    if (!id) return null;
    return getUsers()[id] || null;
  }

  async function getCurrentUser() {
    await simulateApi(80);
    return getCurrentUserSync();
  }

  function saveUserSync(user) {
    const normalized = normalizeUser(user);
    if (!normalized) throw new Error("Invalid user profile.");
    const users = getUsers();
    users[normalized.id] = normalized;
    saveUsers(users);
    return normalized;
  }

  async function signup(name, email, password) {
    await simulateApi(360);
    const cleanName = sanitizeText(name, 80);
    const cleanEmail = sanitizeText(email, 120).toLowerCase();
    if (cleanName.length < 2) throw new Error("Enter a valid name (at least 2 characters).");
    if (!isValidEmail(cleanEmail)) throw new Error("Enter a valid email address.");
    if (String(password).length < 8) throw new Error("Password must be at least 8 characters.");
    const users = getUsers();
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
    saveUsers(users);
    storage.setString(STORAGE_KEYS.currentUser, user.id);
    return user;
  }

  async function login(email, password) {
    await simulateApi(280);
    const cleanEmail = sanitizeText(email, 120).toLowerCase();
    if (!isValidEmail(cleanEmail) || !password) throw new Error("Enter a valid email and password.");
    const users = getUsers();
    const passwordHash = await digestPassword(password);
    const user = Object.values(users).find(
      (u) => u.email === cleanEmail && (u.passwordHash === passwordHash || u.password === password)
    );
    if (!user) throw new Error("Invalid email or password.");
    if (user.password && !user.passwordHash) {
      user.passwordHash = passwordHash;
      delete user.password;
      saveUserSync(user);
    }
    storage.setString(STORAGE_KEYS.currentUser, user.id);
    return user;
  }

  function logout() {
    storage.remove(STORAGE_KEYS.currentUser);
  }

  async function logEntry(entryData) {
    await simulateApi(260);
    const user = getCurrentUserSync();
    if (!user) throw new Error("Please sign in before logging data.");
    const validation = window.EcoEngine?.validateEntry ? window.EcoEngine.validateEntry(entryData) : [];
    if (validation.length) {
      throw new Error(validation.join(" ") || "Invalid input detected. Please enter realistic values.");
    }
    const entry = normalizeEntry(entryData);
    if (!entry) throw new Error("Invalid entry data.");
    if (!entry.transportMode || !entry.foodType) throw new Error("Complete all required fields.");
    const existingIdx = user.history.findIndex((e) => e.date === entry.date);
    if (existingIdx >= 0) {
      user.history[existingIdx] = entry;
    } else {
      user.history.push(entry);
      user.points += 10;
    }
    user.history.sort((a, b) => a.date.localeCompare(b.date));
    if (window.EcoLogic) window.EcoLogic.updateGamification(user);
    return saveUserSync(user);
  }

  function getStats(user = getCurrentUserSync()) {
    if (!user?.history?.length || !window.EcoEngine) return null;
    const recent = [...user.history].slice(-7);
    const totals = recent.map((e) => window.EcoEngine.calcTotal(e));
    const sum = totals.reduce(
      (acc, t) => ({
        transport: acc.transport + t.transport,
        electricity: acc.electricity + t.electricity,
        food: acc.food + t.food,
        total: acc.total + t.total
      }),
      { transport: 0, electricity: 0, food: 0, total: 0 }
    );
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
  }

  async function getLeaderboard() {
    await simulateApi(220);
    const user = getCurrentUserSync();
    const users = [...dummyUsers];
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
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  window.EcoData = {
    STORAGE_KEYS,
    CO2_PER_TREE_MONTH: 21,
    INDIA_AVERAGE_DAILY: 14,
    storage,
    sanitizeText,
    todayISO,
    normalizeEntry,
    simulateApi,
    getUsers,
    saveUsers,
    getCurrentUserSync,
    getCurrentUser,
    saveUserSync,
    signup,
    login,
    logout,
    logEntry,
    getStats,
    getLeaderboard,
    dummyUsers
  };
})();
