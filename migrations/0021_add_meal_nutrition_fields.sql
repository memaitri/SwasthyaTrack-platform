-- Add nutrition fields to meal_logs table
ALTER TABLE meal_logs 
ADD COLUMN total_calories DECIMAL(8,2),
ADD COLUMN total_protein DECIMAL(8,2),
ADD COLUMN total_fat DECIMAL(8,2),
ADD COLUMN total_carbs DECIMAL(8,2),
ADD COLUMN total_fiber DECIMAL(8,2),
ADD COLUMN nutrition_breakdown JSONB;

-- Add comment for documentation
COMMENT ON COLUMN meal_logs.total_calories IS 'Total calories for the meal in kcal';
COMMENT ON COLUMN meal_logs.total_protein IS 'Total protein for the meal in grams';
COMMENT ON COLUMN meal_logs.total_fat IS 'Total fat for the meal in grams';
COMMENT ON COLUMN meal_logs.total_carbs IS 'Total carbohydrates for the meal in grams';
COMMENT ON COLUMN meal_logs.total_fiber IS 'Total fiber for the meal in grams';
COMMENT ON COLUMN meal_logs.nutrition_breakdown IS 'JSON array with nutrition breakdown per food item';