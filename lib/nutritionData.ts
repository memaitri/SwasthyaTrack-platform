// Nutritional data for food items (per standard serving)
// Values are per 100g serving unless specified otherwise

export interface NutritionInfo {
  calories: number; // kcal per 100g
  protein: number;  // grams per 100g
  fat: number;      // grams per 100g
  carbs: number;    // grams per 100g
  fiber: number;    // grams per 100g
  servingSize: number; // standard serving size in grams
}

export const nutritionDatabase: Record<string, NutritionInfo> = {
  // Cereals & Grains
  "flattened rice (poha)": { calories: 325, protein: 6.6, fat: 1.2, carbs: 76.9, fiber: 0.2, servingSize: 50 },
  "semolina (rava / sooji)": { calories: 360, protein: 12.7, fat: 1.0, carbs: 72.8, fiber: 3.9, servingSize: 50 },
  "wheat": { calories: 346, protein: 11.8, fat: 1.5, carbs: 71.2, fiber: 12.2, servingSize: 50 },
  "little millet (vari)": { calories: 341, protein: 7.7, fat: 4.2, carbs: 67.0, fiber: 7.6, servingSize: 50 },
  "finger millet (ragi)": { calories: 328, protein: 7.3, fat: 1.3, carbs: 72.0, fiber: 3.6, servingSize: 50 },

  // Pulses
  "sprouted moth beans (matki)": { calories: 343, protein: 23.6, fat: 1.6, carbs: 61.5, fiber: 4.5, servingSize: 30 },
  "chawli (cowpea)": { calories: 336, protein: 24.0, fat: 1.9, carbs: 54.5, fiber: 15.3, servingSize: 30 },
  "bengal gram (harbara / chickpea)": { calories: 372, protein: 17.1, fat: 5.3, carbs: 61.5, fiber: 3.9, servingSize: 30 },
  "vatana (dry peas)": { calories: 315, protein: 19.7, fat: 1.1, carbs: 62.5, fiber: 15.6, servingSize: 30 },

  // Eggs
  "1 egg": { calories: 155, protein: 13.0, fat: 11.0, carbs: 1.1, fiber: 0, servingSize: 50 }, // per egg ~50g

  // Fruits
  "banana": { calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8, fiber: 2.6, servingSize: 120 },
  "papaya": { calories: 43, protein: 0.5, fat: 0.3, carbs: 10.8, fiber: 1.7, servingSize: 150 },
  "apple": { calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8, fiber: 2.4, servingSize: 150 },
  "guava": { calories: 68, protein: 2.6, fat: 0.9, carbs: 14.3, fiber: 5.4, servingSize: 100 },
  "orange": { calories: 47, protein: 0.9, fat: 0.1, carbs: 11.8, fiber: 2.4, servingSize: 150 },
  "sweet lime (mosambi)": { calories: 43, protein: 0.7, fat: 0.3, carbs: 9.3, fiber: 0.5, servingSize: 100 },

  // Curry
  "vegetable curry": { calories: 85, protein: 2.5, fat: 4.0, carbs: 12.0, fiber: 3.5, servingSize: 150 },
  "chicken curry": { calories: 180, protein: 25.0, fat: 8.0, carbs: 5.0, fiber: 1.0, servingSize: 150 },
  "mutton curry": { calories: 250, protein: 26.0, fat: 15.0, carbs: 4.0, fiber: 1.0, servingSize: 150 },

  // Dals
  "black gram dal (urad dal)": { calories: 341, protein: 25.2, fat: 1.4, carbs: 59.6, fiber: 4.8, servingSize: 30 },
  "pigeon pea (toor dal)": { calories: 335, protein: 22.3, fat: 1.7, carbs: 57.6, fiber: 5.1, servingSize: 30 },
  "green gram dal (moong dal)": { calories: 334, protein: 24.5, fat: 1.2, carbs: 59.9, fiber: 4.1, servingSize: 30 },
  "red lentil (masoor dal)": { calories: 323, protein: 25.8, fat: 0.7, carbs: 59.0, fiber: 4.8, servingSize: 30 },
  "whole green gram": { calories: 323, protein: 24.0, fat: 1.3, carbs: 56.7, fiber: 4.1, servingSize: 30 },

  // Rice
  "plain rice": { calories: 130, protein: 2.7, fat: 0.3, carbs: 28.0, fiber: 0.4, servingSize: 150 },
  "yellow rice": { calories: 140, protein: 3.0, fat: 2.0, carbs: 28.0, fiber: 0.5, servingSize: 150 },
  "masala rice": { calories: 160, protein: 3.5, fat: 4.0, carbs: 30.0, fiber: 1.0, servingSize: 150 },

  // Bread
  "chapati": { calories: 297, protein: 11.0, fat: 4.0, carbs: 58.0, fiber: 11.0, servingSize: 40 }, // per chapati
  "bhakri": { calories: 310, protein: 8.5, fat: 2.5, carbs: 65.0, fiber: 8.0, servingSize: 50 }, // per bhakri

  // Vegetables
  "root & tuber vegetables": { calories: 70, protein: 1.5, fat: 0.2, carbs: 16.0, fiber: 2.5, servingSize: 100 },
  "leafy vegetables": { calories: 25, protein: 2.5, fat: 0.3, carbs: 4.0, fiber: 2.0, servingSize: 100 },
  "other vegetables": { calories: 35, protein: 1.8, fat: 0.2, carbs: 7.0, fiber: 2.8, servingSize: 100 },
};

export interface MealNutrition {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  itemBreakdown: Array<{
    item: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  }>;
}

export function calculateMealNutrition(menuItems: string[]): MealNutrition {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let totalFiber = 0;
  const itemBreakdown: MealNutrition['itemBreakdown'] = [];

  for (const item of menuItems) {
    const normalizedItem = item.toLowerCase().trim();
    const nutritionInfo = nutritionDatabase[normalizedItem];
    
    if (nutritionInfo) {
      // Calculate nutrition based on serving size
      const servingRatio = nutritionInfo.servingSize / 100;
      const itemCalories = nutritionInfo.calories * servingRatio;
      const itemProtein = nutritionInfo.protein * servingRatio;
      const itemFat = nutritionInfo.fat * servingRatio;
      const itemCarbs = nutritionInfo.carbs * servingRatio;
      const itemFiber = nutritionInfo.fiber * servingRatio;

      totalCalories += itemCalories;
      totalProtein += itemProtein;
      totalFat += itemFat;
      totalCarbs += itemCarbs;
      totalFiber += itemFiber;

      itemBreakdown.push({
        item,
        calories: Math.round(itemCalories * 10) / 10,
        protein: Math.round(itemProtein * 10) / 10,
        fat: Math.round(itemFat * 10) / 10,
        carbs: Math.round(itemCarbs * 10) / 10,
        fiber: Math.round(itemFiber * 10) / 10,
      });
    } else {
      // For unknown items, add placeholder values
      itemBreakdown.push({
        item,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
      });
    }
  }

  return {
    totalCalories: Math.round(totalCalories * 10) / 10,
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
    totalFiber: Math.round(totalFiber * 10) / 10,
    itemBreakdown,
  };
}

// Helper function to get nutrition info for a single item
export function getItemNutrition(item: string): NutritionInfo | null {
  const normalizedItem = item.toLowerCase().trim();
  return nutritionDatabase[normalizedItem] || null;
}

// Helper function to search for nutrition items
export function searchNutritionItems(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  return Object.keys(nutritionDatabase).filter(item => 
    item.includes(normalizedQuery)
  );
}