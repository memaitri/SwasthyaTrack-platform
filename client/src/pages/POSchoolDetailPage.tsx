import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatGenderDisplay, formatGenderWithIcon } from "@/lib/genderUtils";
import { ArrowLeft, Users, FileHeart, Stethoscope } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { exportToCSV } from "@/lib/csvExport";
import { exportToPDF, exportToExcel } from "@/lib/exportService";

export default function POSchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exportFormat, setExportFormat] = useState("csv");

  const { data: schoolData, isLoading } = useQuery({
    queryKey: ["/api/po/schools", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/po/schools/${id}`);
      return res.json();
    },
    enabled: !!id,
  });

  const school = schoolData?.school;
  const students = schoolData?.students || [];
  const metrics = schoolData?.metrics || {
    totalStudents: 0,
    healthCardCompletion: 0,
    checkupCoverage: 0,
    referredCount: 0,
  };

  return (
    <AppLayout title={`School Details - ${school?.name || "Loading..."}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{school?.name || "School Details"}</h2>
            <p className="text-muted-foreground">
              {school?.district && school?.block ? `${school.district} • ${school.block}` : "School information"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Students"
            value={metrics.totalStudents}
            icon={Users}
            variant="default"
          />
          <MetricCard
            title="Health Card Completion"
            value={`${metrics.healthCardCompletion}%`}
            icon={FileHeart}
            variant="success"
          />
          <MetricCard
            title="Checkup Coverage"
            value={`${metrics.checkupCoverage}%`}
            icon={Stethoscope}
            variant="info"
          />
          <MetricCard
            title="Referred Cases"
            value={metrics.referredCount}
            icon={Stethoscope}
            variant="danger"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">School Code</p>
              <p className="font-medium">{school?.code || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Region</p>
              <p className="font-medium">{school?.region || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">District</p>
              <p className="font-medium">{school?.district || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Block</p>
              <p className="font-medium">{school?.block || "N/A"}</p>
            </div>
            {school?.address && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{school.address}</p>
              </div>
            )}
            {school?.contactPhone && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Phone</p>
                <p className="font-medium">{school.contactPhone}</p>
              </div>
            )}
            {school?.contactEmail && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Email</p>
                <p className="font-medium">{school.contactEmail}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Students</h3>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Export Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF (with charts)</SelectItem>
              <SelectItem value="excel">Excel (with charts)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          title=""
          columns={[
            {
              key: "fullName",
              header: "Student",
              render: (item: any) => (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {item.fullName?.slice(0, 2).toUpperCase() || "ST"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{item.fullName}</p>
                    <p className="text-xs text-muted-foreground">{item.classSection}</p>
                  </div>
                </div>
              ),
            },
            { key: "uniqueId", header: "Unique ID" },
            { 
              key: "gender", 
              header: "Gender",
              render: (item: any) => {
                const genderInfo = formatGenderWithIcon(item.gender);
                return (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{genderInfo.icon}</span>
                    <span className={`text-sm ${genderInfo.colorClass}`}>
                      {genderInfo.label}
                    </span>
                  </div>
                );
              }
            },
            { key: "weight", header: "Weight (kg)", render: (item: any) => <span className="text-sm">{item.weight ?? "N/A"}</span> },
            { key: "height", header: "Height (cm)", render: (item: any) => <span className="text-sm">{item.height ?? "N/A"}</span> },
            { key: "bmi", header: "BMI", render: (item: any) => <span className="text-sm">{item.bmi ?? "N/A"}</span> },
            { key: "bloodPressure", header: "BP", render: (item: any) => <span className="text-sm">{item.bloodPressure ?? "N/A"}</span> },
            {
              key: "healthCardStatus",
              header: "Health Card",
              render: (item: any) => <StatusBadge status={item.healthCardStatus || "Pending"} size="sm" />,
            },
          ]}
          data={students}
          getRowKey={(item: any) => item.id}
          isLoading={isLoading}
          exportable
          onExport={async (type) => {
            const fmt = type || exportFormat;
            if (fmt === "csv") {
              const studentsWithFormattedGender = students.map((student: any) => ({
                ...student,
                gender: formatGenderDisplay(student.gender)
              }));
              exportToCSV(
                studentsWithFormattedGender,
                [
                  { key: "fullName", header: "Full Name" },
                  { key: "uniqueId", header: "Unique ID" },
                  { key: "classSection", header: "Class" },
                  { key: "gender", header: "Gender" },
                  { key: "healthCardStatus", header: "Health Card Status" },
                ],
                `school_${school?.name || "students"}_students`
              );
            } else if (fmt === "pdf") {
              exportToPDF(students as any, { includeNutrition: true, includeMedical: true }, 'PO');
            } else if (fmt === "xlsx") {
              exportToExcel(students as any, { includeNutrition: true, includeMedical: true }, 'PO');
            }
          }}
          emptyMessage="No students found"
        />
      </div>
    </AppLayout>
  );
}

