/**
 * EcoTrack Pro - Data Layer
 * Handles advanced localStorage database simulation.
 */

const DB_KEY = 'ecoTrack_db_v2';

// Realistic CO2 Factors
const FACTORS = {
  transport: {
    car: 0.2, // kg/km
    bike: 0,
    public_transport: 0.05
  },
  electricity: {
    ac: 1.2, // kg/hr
    fan: 0.1,
    appliances: 0.5
  },
  food: {
    veg: 1.5, // kg/day
    non_veg: 3.3,
    processed: 2.8
  },
  water: 0.001 // kg/liter (pumping/treating)
};

// Default DB Schema
const defaultDB = {
  users: {},
  currentUser: null // email of logged in user
};

// Initialize DB
function getDB() {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : defaultDB;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// User Management
function createUser(email, name, password) {
  const db = getDB();
  if (db.users[email]) throw new Error("User already exists");
  
  db.users[email] = {
    name,
    password, // Simulated auth
    history: [], // Daily logs
    points: 0,
    streak: 0,
    lastLogin: new Date().toISOString(),
    badges: [] // IDs of unlocked badges
  };
  saveDB(db);
}

function loginUser(email, password) {
  const db = getDB();
  const user = db.users[email];
  if (!user || user.password !== password) throw new Error("Invalid credentials");
  
  db.currentUser = email;
  
  // Streak Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const lastLoginStr = user.lastLogin.split('T')[0];
  
  if (lastLoginStr !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastLoginStr === yesterdayStr) {
      user.streak += 1;
    } else {
      user.streak = 1; // Reset streak
    }
    user.lastLogin = new Date().toISOString();
  }
  
  saveDB(db);
  return user;
}

function logoutUser() {
  const db = getDB();
  db.currentUser = null;
  saveDB(db);
}

function getCurrentUser() {
  const db = getDB();
  if (!db.currentUser) return null;
  return { email: db.currentUser, ...db.users[db.currentUser] };
}

// Tracking & Gamification
function addDailyLog(logData) {
  const db = getDB();
  if (!db.currentUser) return null;
  
  const user = db.users[db.currentUser];
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Replace if exists for today
  user.history = user.history.filter(h => h.date !== todayStr);
  
  const total = 
    (logData.transportDist * FACTORS.transport[logData.transportMode]) +
    (logData.acHours * FACTORS.electricity.ac) +
    (logData.fanHours * FACTORS.electricity.fan) +
    (logData.applianceHours * FACTORS.electricity.appliances) +
    FACTORS.food[logData.foodType] +
    (logData.waterLiters * FACTORS.water);

  // Gamification Points Calculation
  let pointsEarned = 10; // Base points
  if (total < 15) pointsEarned += 20; // Bonus for low emission
  if (logData.transportMode === 'bike') pointsEarned += 15;
  if (logData.foodType === 'veg') pointsEarned += 10;
  
  user.points += pointsEarned;
  
  user.history.push({
    date: todayStr,
    ...logData,
    total: parseFloat(total.toFixed(2)),
    pointsEarned
  });
  
  // Keep only last 30 days
  if (user.history.length > 30) {
    user.history.shift();
  }
  
  saveDB(db);
  return { total, pointsEarned };
}

function unlockBadge(badgeId) {
  const db = getDB();
  const user = db.users[db.currentUser];
  if (!user.badges.includes(badgeId)) {
    user.badges.push(badgeId);
    saveDB(db);
    return true; // Newly unlocked
  }
  return false;
}

// Make globally available
window.EcoData = {
  FACTORS,
  createUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  addDailyLog,
  unlockBadge
};
