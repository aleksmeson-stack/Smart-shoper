import { GoogleGenAI, Type, Schema, FunctionDeclaration, Chat } from "@google/genai";
import { UserPreferences, Meal, ShoppingItem, DishDetails } from "../types";

// Helper to get AI instance
const getAi = () => {
  const apiKey = process.env.API_KEY || ''; 
  if (!apiKey) throw new Error("API Key required");
  return new GoogleGenAI({ apiKey });
};

// Tool Definition
export const MEAL_PLAN_TOOL: FunctionDeclaration = {
  name: "update_meal_plan",
  description: "Create or update the weekly meal plan with cost estimates. Call this whenever the user asks for a plan or changes.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      meals: {
        type: Type.ARRAY,
        description: "List of meals for 7 days (Monday-Sunday)",
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING },
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            dinner: { type: Type.STRING },
            snackAfternoon: { type: Type.STRING, description: "Полдник (лёгкий перекус)" },
            snackEvening: { type: Type.STRING, description: "Вечерние вкусняшки" },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  category: { type: Type.STRING },
                }
              }
            }
          },
          required: ["day", "breakfast", "lunch", "dinner", "snackAfternoon", "snackEvening", "ingredients"]
        }
      },
      shoppingList: {
        type: Type.ARRAY,
        description: "Consolidated list of all products needed for this menu with estimated costs in RUB.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { type: Type.STRING },
            estimatedPrice: { type: Type.NUMBER, description: "Estimated price in RUB for this amount" }
          },
          required: ["name", "amount", "estimatedPrice"]
        }
      },
      totalEstimatedCost: {
        type: Type.NUMBER,
        description: "Sum of all estimated prices in RUB."
      }
    },
    required: ["meals", "shoppingList", "totalEstimatedCost"]
  }
};

export const createChatSession = (prefs: UserPreferences): Chat => {
  const ai = getAi();
  
  const systemInstruction = `
    You are a smart family meal planner and nutrition expert for a family of ${prefs.familySize} in ${prefs.city}.
    Target Budget: ${prefs.budgetWeekly} RUB/week.
    Dietary Restrictions: ${prefs.dietaryRestrictions || "None"}.
    
    CRITICAL RULES:
    1. **Seasonality**: Use ingredients currently in season for ${prefs.city} (Ural region, Russia).
    2. **Calories**: Ensure the menu meets caloric needs. Assume approx 2000-2400 kcal for adults, 1600-2000 for children. 
    3. **Meal Structure**: Each day MUST include Breakfast, Lunch, Dinner, Afternoon Snack (Полдник), and Evening Snack (Вечерние вкусняшки).
       - Evening snacks should be light but satisfying (e.g., crispbreads with cheese, fruits, yogurt).
    4. **Cost**: You MUST estimate the cost of the entire basket based on current average Russian prices. 
       - If the generated plan exceeds ${prefs.budgetWeekly} RUB, warn the user in text or try to optimize.
    5. **Output**: WHENEVER you propose or update the menu, you MUST call the 'update_meal_plan' tool.
    
    Be friendly, concise, and helpful.
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: [MEAL_PLAN_TOOL] }],
    }
  });
};

export const getDishDetails = async (dishName: string): Promise<DishDetails> => {
  const ai = getAi();
  
  const prompt = `
    Provide a very short recipe (max 3 sentences), difficulty level (Легко, Средне, Сложно), 
    cooking time (e.g. "20 мин"), and per-serving macronutrients (calories, protein, fats, carbs) 
    for the dish: "${dishName}".
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      recipeShort: { type: Type.STRING },
      difficulty: { type: Type.STRING, enum: ["Легко", "Средне", "Сложно"] },
      time: { type: Type.STRING },
      calories: { type: Type.INTEGER },
      protein: { type: Type.INTEGER },
      fats: { type: Type.INTEGER },
      carbs: { type: Type.INTEGER },
    },
    required: ["name", "recipeShort", "difficulty", "time", "calories", "protein", "fats", "carbs"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");
    return JSON.parse(text) as DishDetails;
  } catch (error) {
    console.error("Dish Details Error:", error);
    throw error;
  }
};

export const simulatePriceParsing = async (items: string[], city: string): Promise<ShoppingItem[]> => {
  const ai = getAi();

  // Expanded store list for better simulation coverage
  const stores = [
      "Pyaterochka", "Magnit", "Lenta", 
      "VkusVill", "Perekrestok", "Metro", 
      "Auchan", "Zhiznmart"
  ];

  const prompt = `
    Act as a price scraper for Yandex Eats grocery delivery in ${city}.
    Target Stores: ${stores.join(", ")}.
    
    For each shopping item in this list: ${JSON.stringify(items)}.
    Estimate the current realistic price in RUB for late 2024/2025.
    
    Return a JSON list of items. Each item must have a 'prices' array containing estimates for AT LEAST 5 of the stores listed above.
    
    Rules:
    1. Vary prices slightly between stores (e.g. Pyaterochka usually cheaper, VkusVill more expensive).
    2. Randomly set "inStock" to false for some items in some stores (about 5-10% chance) to simulate real world out-of-stock scenarios.
    3. Ensure 'productName' sounds like a real product label (e.g. "Milk Prostokvashino 3.2%").
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING }, 
        name: { type: Type.STRING },
        originalAmount: { type: Type.STRING },
        prices: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              storeName: { type: Type.STRING },
              price: { type: Type.NUMBER },
              inStock: { type: Type.BOOLEAN },
              productName: { type: Type.STRING },
              weight: { type: Type.STRING },
            }
          }
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // Post-process to calculate best price
    const data = JSON.parse(text) as ShoppingItem[];
    return data.map(item => {
      // Find cheapest stock item
      const stockItems = item.prices.filter(p => p.inStock);
      if (stockItems.length > 0) {
        const best = stockItems.reduce((prev, curr) => prev.price < curr.price ? prev : curr);
        return { ...item, bestStore: best.storeName, bestPrice: best.price };
      }
      return item;
    });

  } catch (error) {
    console.error("Gemini Pricing Error:", error);
    throw error;
  }
};