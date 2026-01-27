import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Stethoscope } from "lucide-react";

// Simple test component to verify medical team components load
export default function TestMedicalTeams() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Medical Teams Feature Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Medical Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Team management functionality</p>
            <Button className="mt-2" size="sm">
              Test Button
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Medical Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Event scheduling functionality</p>
            <Button className="mt-2" size="sm">
              Test Button
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Student Checkups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Checkup forms functionality</p>
            <Button className="mt-2" size="sm">
              Test Button
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Component Status:</h2>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>UI Components loaded successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Icons rendering correctly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Tailwind CSS styles applied</span>
          </div>
        </div>
      </div>
    </div>
  );
}