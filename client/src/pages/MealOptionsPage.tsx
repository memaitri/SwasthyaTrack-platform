import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function MealOptionsPage() {
  return (
    <AppLayout title="Meal Options">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Meal Options</CardTitle>
            <CardDescription>Admins and POs can add or edit meal dropdown options via Supabase or the provided scripts.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">This page is a placeholder. Use <code>script/supabase_meal_options.sql</code> or <code>script/insertMealOptions.js</code> to seed options in Supabase.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
