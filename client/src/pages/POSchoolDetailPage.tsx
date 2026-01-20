import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function POSchoolDetailPage() {
  const [userRole, setUserRole] = useState<string | null>(null);

  // Get user role from localStorage or auth context
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  // Show access denied message for PO users
  return (
    <AppLayout title="Access Restricted - PO Summary View Only">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-muted-foreground">Individual School Access Not Available</p>
          </div>
        </div>

        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400">
                  Individual School Access Not Available
                </h3>
                <p className="text-orange-600 dark:text-orange-300 mt-2">
                  As a Program Officer (PO), your access is limited to aggregated district-level data only. 
                  Individual school details are not accessible to maintain data privacy and security protocols.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
              Available PO Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">District Summary Dashboard</h4>
                <p className="text-sm text-muted-foreground">
                  View aggregated health metrics, referral statistics, and performance indicators across all schools in your district.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">School Type Comparison</h4>
                <p className="text-sm text-muted-foreground">
                  Compare performance metrics between Government and Aided schools without accessing individual school data.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">District-Level Reports</h4>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive reports with aggregated data for district-level analysis and decision making.
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href="/">
                <Button className="w-full">
                  Return to PO Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

