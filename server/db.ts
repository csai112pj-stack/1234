import fs from 'fs';
import path from 'path';
import { UserProfile, MealLog, FitnessGoal } from '../src/types';

// Vercel Serverless 環境唯有 /tmp 目錄可供暫存寫入
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MEALS_FILE = path.join(DATA_DIR, 'meal_logs.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('⚠️ 無法建立資料夾 (Vercel Read-Only):', e);
  }
}

export function calculateUserMetrics(
  gender: 'male' | 'female',
  weight: number,
  height: number,
  age: number,
  goal: FitnessGoal,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' = 'moderate'
) {
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === 'male' ? bmr + 5 : bmr - 161;

  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725 };
  const tdee = Math.round(bmr * (multipliers[activityLevel] || 1.55));

  let targetCalories = tdee;
  let targetProteinG = Math.round(weight * 2.0);
  let targetFatG = 0;
  let targetCarbsG = 0;

  if (goal === 'muscle_gain') {
    targetCalories = tdee + 300;
    targetProteinG = Math.round(weight * 2.0);
    const fatCalories = targetCalories * 0.25;
    targetFatG = Math.round(fatCalories / 9);
    targetCarbsG = Math.max(50, Math.round((targetCalories - (targetProteinG * 4) - fatCalories) / 4));
  } else if (goal === 'fat_loss') {
    targetCalories = Math.max(1200, tdee - 400);
    targetProteinG = Math.round(weight * 2.2);
    const fatCalories = targetCalories * 0.22;
    targetFatG = Math.round(fatCalories / 9);
    targetCarbsG = Math.max(40, Math.round((targetCalories - (targetProteinG * 4) - fatCalories) / 4));
  } else {
    targetCalories = tdee;
    targetProteinG = Math.round(weight * 1.8);
    const fatCalories = targetCalories * 0.25;
    targetFatG = Math.round(fatCalories / 9);
    targetCarbsG = Math.max(50, Math.round((targetCalories - (targetProteinG * 4) - fatCalories) / 4));
  }

  return {
    bmr: Math.round(bmr),
    tdee,
    target_calories: targetCalories,
    target_protein_g: targetProteinG,
    target_carbs_g: targetCarbsG,
    target_fat_g: targetFatG
  };
}

const DEFAULT_METRICS = calculateUserMetrics('male', 72, 178, 26, 'muscle_gain', 'moderate');

const INITIAL_USER: UserProfile = {
  id: 'usr_default_001',
  name: 'Alex (健身愛好者)',
  sync_code: 'NFT-8888-8888',
  gender: 'male',
  age: 26,
  height: 178,
  weight: 72,
  body_fat_rate: 16.5,
  goal: 'muscle_gain',
  activity_level: 'moderate',
  ...DEFAULT_METRICS,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export class DatabaseService {
  private users: Map<string, UserProfile> = new Map();
  private meals: MealLog[] = [];

  constructor() {
    this.users.set(INITIAL_USER.id, INITIAL_USER);
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      ensureDataDir();
      if (fs.existsSync(USERS_FILE)) {
        const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        usersData.forEach((u: UserProfile) => this.users.set(u.id, u));
      }
      if (fs.existsSync(MEALS_FILE)) {
        this.meals = JSON.parse(fs.readFileSync(MEALS_FILE, 'utf-8'));
      }
    } catch (err) {
      console.warn('⚠️ 讀取本機快取失敗，使用記憶體預設資料:', err);
    }
  }

  private saveUsersToDisk() {
    try {
      ensureDataDir();
      fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(this.users.values()), null, 2));
    } catch (err) {
      console.warn('⚠️ Vercel Read-Only 無法寫入檔案，改維持記憶體狀態:', err);
    }
  }

  public findUserByName(name: string): UserProfile | null {
    if (!name) return null;
    const trimmed = String(name).trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.name && String(user.name).trim().toLowerCase() === trimmed) {
        return user;
      }
    }
    return null;
  }

  public createUser(userData: any): UserProfile {
    const safeName = String(userData.name || '').trim();
    const existingUser = this.findUserByName(safeName);
    if (existingUser) return existingUser;

    const id = 'usr_' + Date.now();
    const metrics = calculateUserMetrics(
      userData.gender || 'male',
      Number(userData.weight) || 70,
      Number(userData.height) || 175,
      Number(userData.age) || 25,
      userData.goal || 'muscle_gain',
      userData.activity_level || 'moderate'
    );

    const newUser: UserProfile = {
      id,
      name: safeName || '新健身學員',
      sync_code: 'NFT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      gender: userData.gender || 'male',
      age: Number(userData.age) || 25,
      height: Number(userData.height) || 175,
      weight: Number(userData.weight) || 70,
      body_fat_rate: Number(userData.body_fat_rate) || 18,
      goal: userData.goal || 'muscle_gain',
      activity_level: userData.activity_level || 'moderate',
      ...metrics,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.users.set(id, newUser);
    this.saveUsersToDisk();
    return newUser;
  }

  public getUser(id?: string): UserProfile | null {
    if (!id) return INITIAL_USER;
    return this.users.get(id) || INITIAL_USER;
  }

  public getDailySummary(userId: string) {
    const user = this.getUser(userId) || INITIAL_USER;
    return {
      date: new Date().toISOString().split('T')[0],
      user,
      consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      remaining: {
        calories: user.target_calories,
        protein: user.target_protein_g,
        carbs: user.target_carbs_g,
        fat: user.target_fat_g
      },
      today_meals: []
    };
  }
}

export const db = new DatabaseService();
