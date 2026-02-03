import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Utensils, 
  Zap, 
  Beef, 
  Wheat, 
  Droplets,
  Leaf 
} from "lucide-react";

interface NutritionInfo {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  itemBreakdown?: Array<{
    item: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  }>;
}

interface NutritionDisplayProps {
  nutrition: NutritionInfo;
  showBreakdown?: boolean;
  compact?: boolean;
}

// Recommended daily values for school children (approximate)
const DAILY_VALUES = {
  calories: 2000,
  protein: 50,
  fat: 65,
  carbs: 300,
  fiber: 25,
};

// Helper function to safely convert to number and format
const safeNumber = (value: any): number => {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
};

const formatNumber = (value: any, decimals: number = 1): string => {
  return safeNumber(value).toFixed(decimals);
};

export function NutritionDisplay({ 
  nutrition, 
  showBreakdown = false, 
  compact = false 
}: NutritionDisplayProps) {
  const {
    totalCalories: rawCalories,
    totalProtein: rawProtein,
    totalFat: rawFat,
    totalCarbs: rawCarbs,
    totalFiber: rawFiber,
    itemBreakdown = []
  } = nutrition;

  // Safely convert all values to numbers
  const totalCalories = safeNumber(rawCalories);
  const totalProtein = safeNumber(rawProtein);
  const totalFat = safeNumber(rawFat);
  const totalCarbs = safeNumber(rawCarbs);
  const totalFiber = safeNumber(rawFiber);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {formatNumber(totalCalories)} kcal
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Beef className="h-3 w-3" />
          {formatNumber(totalProtein)}g protein
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Droplets className="h-3 w-3" />
          {formatNumber(totalFat)}g fat
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Wheat className="h-3 w-3" />
          {formatNumber(totalCarbs)}g carbs
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Nutritional Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main nutrition summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Zap className="h-6 w-6 mx-auto mb-1 text-orange-600" />
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {formatNumber(totalCalories)}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">kcal</p>
            <Progress 
              value={(totalCalories / DAILY_VALUES.calories) * 100} 
              className="mt-2 h-1"
            />
          </div>

          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Beef className="h-6 w-6 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              {formatNumber(totalProtein)}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">g protein</p>
            <Progress 
              value={(totalProtein / DAILY_VALUES.protein) * 100} 
              className="mt-2 h-1"
            />
          </div>

          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <Droplets className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {formatNumber(totalFat)}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">g fat</p>
            <Progress 
              value={(totalFat / DAILY_VALUES.fat) * 100} 
              className="mt-2 h-1"
            />
          </div>

          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Wheat className="h-6 w-6 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatNumber(totalCarbs)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">g carbs</p>
            <Progress 
              value={(totalCarbs / DAILY_VALUES.carbs) * 100} 
              className="mt-2 h-1"
            />
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Leaf className="h-6 w-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatNumber(totalFiber)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">g fiber</p>
            <Progress 
              value={(totalFiber / DAILY_VALUES.fiber) * 100} 
              className="mt-2 h-1"
            />
          </div>
        </div>

        {/* Item breakdown */}
        {showBreakdown && itemBreakdown.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Per Item Breakdown:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {itemBreakdown.map((item, index) => (
                <div 
                  key={index}
                  className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm"
                >
                  <span className="font-medium">{item.item}</span>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{formatNumber(item.calories)} kcal</span>
                    <span>{formatNumber(item.protein)}g P</span>
                    <span>{formatNumber(item.fat)}g F</span>
                    <span>{formatNumber(item.carbs)}g C</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily value percentages */}
        <div className="text-xs text-muted-foreground">
          <p>* Percentages based on approximate daily values for school children</p>
        </div>
      </CardContent>
    </Card>
  );
}