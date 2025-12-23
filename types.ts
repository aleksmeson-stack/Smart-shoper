export interface Ingredient {
  name: string;
  amount: string;
  category: string;
}

export interface Meal {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snackAfternoon: string; // Полдник
  snackEvening: string;   // Вечерний перекус
  ingredients: Ingredient[];
}

export interface StorePrice {
  storeName: string; // e.g., "Пятерочка", "Магнит"
  price: number;
  inStock: boolean;
  productName: string; // Actual product name found
  weight: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  originalAmount: string;
  prices: StorePrice[];
  bestStore?: string;
  bestPrice?: number;
}

export interface UserPreferences {
  familySize: number;
  budgetWeekly: number; // in RUB
  dietaryRestrictions: string;
  city: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  PARSING = 'PARSING', // Simulates the Playwright phase
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface DishDetails {
  name: string;
  recipeShort: string; // Very brief steps
  difficulty: 'Легко' | 'Средне' | 'Сложно';
  time: string; // e.g. "30 мин"
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export interface AIPlanResponse {
  meals: Meal[];
  shoppingList: {
    name: string;
    amount: string;
    estimatedPrice: number;
  }[];
  totalEstimatedCost: number;
}