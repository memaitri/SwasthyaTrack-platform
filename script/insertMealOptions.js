// Example Node script to upsert meal options into Supabase (ESM)
// Usage: set SUPABASE_URL and SUPABASE_KEY in env and run `node script/insertMealOptions.js`
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Please set SUPABASE_URL and SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const options = [
  { meal_type: 'breakfast', category: 'cereals', value: 'Flattened Rice (Poha)' },
  { meal_type: 'breakfast', category: 'cereals', value: 'Semolina (Rava / Sooji)' },
  { meal_type: 'breakfast', category: 'cereals', value: 'Wheat' },
  { meal_type: 'breakfast', category: 'cereals', value: 'Little Millet (Vari)' },
  { meal_type: 'breakfast', category: 'cereals', value: 'Finger Millet (Ragi)' },
  { meal_type: 'breakfast', category: 'pulses', value: 'Sprouted Moth Beans (Matki)' },
  { meal_type: 'breakfast', category: 'pulses', value: 'Chawli (Cowpea)' },
  { meal_type: 'breakfast', category: 'pulses', value: 'Bengal Gram (Harbara / Chickpea)' },
  { meal_type: 'breakfast', category: 'pulses', value: 'Vatana (Dry Peas)' },
  { meal_type: 'breakfast', category: 'eggs', value: '1 Egg' },
  { meal_type: 'breakfast', category: 'fruits', value: 'Banana' },
  { meal_type: 'breakfast', category: 'fruits', value: 'Papaya' },
  { meal_type: 'breakfast', category: 'fruits', value: 'Apple' },
  { meal_type: 'breakfast', category: 'fruits', value: 'Guava' },
  { meal_type: 'breakfast', category: 'fruits', value: 'Orange' },
  { meal_type: 'breakfast', category: 'fruits', value: 'Sweet Lime (Mosambi)' },

  { meal_type: 'lunch', category: 'curry', value: 'Vegetable Curry' },
  { meal_type: 'lunch', category: 'curry', value: 'Chicken Curry' },
  { meal_type: 'lunch', category: 'curry', value: 'Mutton Curry' },
  { meal_type: 'lunch', category: 'dals', value: 'Black Gram Dal (Urad Dal)' },
  { meal_type: 'lunch', category: 'dals', value: 'Pigeon Pea (Toor Dal)' },
  { meal_type: 'lunch', category: 'dals', value: 'Bengal Gram (Harbara / Chickpea)' },
  { meal_type: 'lunch', category: 'dals', value: 'Green Gram Dal (Moong Dal)' },
  { meal_type: 'lunch', category: 'dals', value: 'Red Lentil (Masoor Dal)' },
  { meal_type: 'lunch', category: 'dals', value: 'Whole Green Gram' },
  { meal_type: 'lunch', category: 'dals', value: 'Sprouted Moth Beans (Matki)' },
  { meal_type: 'lunch', category: 'rice', value: 'Plain Rice' },
  { meal_type: 'lunch', category: 'rice', value: 'Yellow Rice' },
  { meal_type: 'lunch', category: 'rice', value: 'Masala Rice' },
  { meal_type: 'lunch', category: 'bread', value: 'Chapati' },
  { meal_type: 'lunch', category: 'bread', value: 'Bhakri' },
  { meal_type: 'lunch', category: 'vegetables', value: 'Root & Tuber Vegetables' },
  { meal_type: 'lunch', category: 'vegetables', value: 'Leafy Vegetables' },
  { meal_type: 'lunch', category: 'vegetables', value: 'Other Vegetables' },
  { meal_type: 'lunch', category: 'salad', value: 'Yes' },
  { meal_type: 'lunch', category: 'salad', value: 'No' },
];

async function upsertOptions() {
  for (const opt of options) {
    const { data, error } = await supabase
      .from('meal_options')
      .upsert({ meal_type: opt.meal_type, category: opt.category, value: opt.value }, { onConflict: ['meal_type', 'category', 'value'] });
    if (error) {
      console.error('Upsert error', error);
    }
  }
  console.log('Done upserting meal options');
}

upsertOptions().catch((err) => {
  console.error(err);
  process.exit(1);
});
