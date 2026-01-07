import React from "react";
import { FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl as FrmControl } from "@/components/ui/form";

type Props = {
  form: any;
  fieldName?: string; // hidden field to sync flattened values (defaults to 'menuItems')
};

const breakfastOptions = {
  cereals: ["Flattened Rice (Poha)", "Semolina (Rava / Sooji)", "Wheat", "Little Millet (Vari)", "Finger Millet (Ragi)"],
  pulses: ["Sprouted Moth Beans (Matki)", "Chawli (Cowpea)", "Bengal Gram (Harbara / Chickpea)", "Vatana (Dry Peas)"],
  eggs: ["1 Egg"],
  fruits: ["Banana", "Papaya", "Apple", "Guava", "Orange", "Sweet Lime (Mosambi)"],
};

const lunchDinnerOptions = {
  curry: ["Vegetable Curry", "Chicken Curry", "Mutton Curry"],
  dals: ["Black Gram Dal (Urad Dal)", "Pigeon Pea (Toor Dal)", "Bengal Gram (Harbara / Chickpea)", "Green Gram Dal (Moong Dal)", "Red Lentil (Masoor Dal)", "Whole Green Gram", "Sprouted Moth Beans (Matki)"],
  rice: ["Plain Rice", "Yellow Rice", "Masala Rice"],
  bread: ["Chapati", "Bhakri"],
  vegetables: ["Root & Tuber Vegetables", "Leafy Vegetables", "Other Vegetables"],
  salad: ["Yes", "No"],
};

function MealMenuForm({ form, fieldName = "menuItems" }: Props) {
  const mealType = form.watch("mealType");

  // watch individual fields so the component re-renders when they change
  const breakfastCereals = form.watch("breakfast.cereals") || [];
  const breakfastPulses = form.watch("breakfast.pulses") || [];
  const breakfastEggs = form.watch("breakfast.eggs") || [];
  const breakfastFruits = form.watch("breakfast.fruits") || [];

  const lunchCurry = form.watch("lunch.curry") || "";
  const lunchDals = form.watch("lunch.dals") || [];
  const lunchRice = form.watch("lunch.rice") || "";
  const lunchBread = form.watch("lunch.bread") || "";
  const lunchVegetables = form.watch("lunch.vegetables") || [];
  const lunchSalad = form.watch("lunch.salad") || "";
  const ensureArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

  const syncFlattened = React.useCallback(() => {
    const values: string[] = [];
    if (mealType === "breakfast") {
      Object.keys(breakfastOptions).forEach((k) => {
        const v = form.getValues(`breakfast.${k}`);
        if (v) values.push(...ensureArray(v));
      });
    } else {
      Object.keys(lunchDinnerOptions).forEach((k) => {
        const v = form.getValues(`lunch.${k}`);
        if (v) values.push(...ensureArray(v));
      });
    }
    form.setValue(fieldName, values.join(", "));
  }, [mealType]);

  React.useEffect(() => {
    const sub = form.watch((val: any, { name }: any) => {
      if (!name) return;
      if (name.startsWith("breakfast.") || name.startsWith("lunch.")) {
        syncFlattened();
      }
    });
    syncFlattened();
    return () => sub.unsubscribe && sub.unsubscribe();
  }, [syncFlattened]);

  return (
    <div className="space-y-3">
      {mealType === "breakfast" ? (
        <div>
          <FormItem>
            <FormLabel>Cereals / Grains *</FormLabel>
            <FormDescription>Select at least one</FormDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {breakfastOptions.cereals.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={breakfastCereals.includes(opt)}
                    onCheckedChange={(checked) => {
                      const cur = ensureArray(form.getValues(`breakfast.cereals`));
                      const next = checked ? Array.from(new Set([...cur, opt])) : cur.filter((c) => c !== opt);
                      form.setValue(`breakfast.cereals`, next);
                      syncFlattened();
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Pulses *</FormLabel>
            <FormDescription>Select at least one</FormDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {breakfastOptions.pulses.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={breakfastPulses.includes(opt)}
                    onCheckedChange={(checked) => {
                      const cur = ensureArray(form.getValues(`breakfast.pulses`));
                      const next = checked ? Array.from(new Set([...cur, opt])) : cur.filter((c) => c !== opt);
                      form.setValue(`breakfast.pulses`, next);
                      syncFlattened();
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Eggs *</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {breakfastOptions.eggs.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={breakfastEggs.includes(opt)}
                    onCheckedChange={(checked) => {
                      const cur = ensureArray(form.getValues(`breakfast.eggs`));
                      const next = checked ? Array.from(new Set([...cur, opt])) : cur.filter((c) => c !== opt);
                      form.setValue(`breakfast.eggs`, next);
                      syncFlattened();
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Fruits *</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {breakfastOptions.fruits.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={breakfastFruits.includes(opt)}
                    onCheckedChange={(checked) => {
                      const cur = ensureArray(form.getValues(`breakfast.fruits`));
                      const next = checked ? Array.from(new Set([...cur, opt])) : cur.filter((c) => c !== opt);
                      form.setValue(`breakfast.fruits`, next);
                      syncFlattened();
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        </div>
      ) : (
        <div>
          <FormItem>
            <FormLabel>Curry *</FormLabel>
            <FormDescription>Select at least one</FormDescription>
            <Select
              value={lunchCurry}
              onValueChange={(v) => {
                form.setValue(`lunch.curry`, v);
                syncFlattened();
              }}
            >
              <FrmControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select curry" />
                </SelectTrigger>
              </FrmControl>
              <SelectContent>
                {lunchDinnerOptions.curry.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem>
            <FormLabel>Dals / Pulses *</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {lunchDinnerOptions.dals.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={lunchDals.includes(opt)}
                    onCheckedChange={(checked) => {
                      const cur = ensureArray(form.getValues(`lunch.dals`));
                      const next = checked ? Array.from(new Set([...cur, opt])) : cur.filter((c) => c !== opt);
                      form.setValue(`lunch.dals`, next);
                      syncFlattened();
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FormItem>

          <FormItem>
            <FormLabel>Rice *</FormLabel>
            <Select
              value={lunchRice}
              onValueChange={(v) => {
                form.setValue(`lunch.rice`, v);
                syncFlattened();
              }}
            >
              <FrmControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select rice type" />
                </SelectTrigger>
              </FrmControl>
              <SelectContent>
                {lunchDinnerOptions.rice.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem>
            <FormLabel>Bread *</FormLabel>
            <Select
              value={lunchBread}
              onValueChange={(v) => {
                form.setValue(`lunch.bread`, v);
                syncFlattened();
              }}
            >
              <FrmControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select bread" />
                </SelectTrigger>
              </FrmControl>
              <SelectContent>
                {lunchDinnerOptions.bread.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem>
            <FormLabel>Vegetables *</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {lunchDinnerOptions.vegetables.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={lunchVegetables.includes(opt)}
                    onCheckedChange={(checked) => {
                      const cur = ensureArray(form.getValues(`lunch.vegetables`));
                      const next = checked ? Array.from(new Set([...cur, opt])) : cur.filter((c) => c !== opt);
                      form.setValue(`lunch.vegetables`, next);
                      syncFlattened();
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FormItem>

          <FormItem>
            <FormLabel>Salad *</FormLabel>
            <div className="flex gap-4 mt-2">
              {lunchDinnerOptions.salad.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="lunch.salad"
                    checked={lunchSalad === opt}
                    onChange={() => {
                      form.setValue(`lunch.salad`, opt);
                      syncFlattened();
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FormItem>
        </div>
      )}

      {/* Hidden field kept for backward compatibility with existing API */}
      <input type="hidden" {...form.register(fieldName)} />
    </div>
  );
}

export default MealMenuForm;
