import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface StudentDetailDrawerProps {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-base text-foreground">{value || "N/A"}</p>
  </div>
);

export function StudentDetailDrawer({ student, isOpen, onClose }: StudentDetailDrawerProps) {
  if (!student) return null;

  const age = student.dateOfBirth ? Math.floor((new Date().getTime() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A';

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Student Details</DrawerTitle>
          <DrawerDescription>Comprehensive health and personal information.</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="overflow-y-auto px-4 pb-4">
          <div className="space-y-6">
            {/* Student Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {student.fullName?.slice(0, 2).toUpperCase() || "ST"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold">{student.fullName}</h3>
                    <p className="text-muted-foreground">
                      {age} years old • {student.gender === 'M' ? 'Male' : 'Female'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="School" value={student.schoolName} />
                <DetailItem label="Class" value={student.classSection} />
                <DetailItem label="Class Teacher" value={student.classTeacherName} />
                <DetailItem label="Guardian" value={student.fatherGuardianName} />
                <DetailItem label="Guardian Contact" value={student.fatherContact} />
              </CardContent>
            </Card>

            {/* Annual Health Card */}
            <Card>
              <CardHeader>
                <CardTitle>Annual Health Card ({student.annualHealthCard?.year || 'N/A'})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {student.annualHealthCard ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailItem label="Weight (kg)" value={student.annualHealthCard.weightKg} />
                    <DetailItem label="Height (cm)" value={student.annualHealthCard.heightCm} />
                    <DetailItem label="BMI" value={student.annualHealthCard.bmi} />
                    <DetailItem label="Blood Pressure" value={student.annualHealthCard.bloodPressure} />
                    <DetailItem label="Vision (R/L)" value={`${student.annualHealthCard.visionRight} / ${student.annualHealthCard.visionLeft}`} />
                    <DetailItem label="Referral" value={student.annualHealthCard.referralRecommended ? "Yes" : "No"} />
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground">Deficiencies</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {student.annualHealthCard.deficiencies?.length > 0 ?
                          student.annualHealthCard.deficiencies.map((d: string) => <Badge key={d} variant="secondary">{d}</Badge>) :
                          <p className="text-sm">None recorded</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No annual health card found for the selected year.</p>
                )}
              </CardContent>
            </Card>

            {/* Monthly Health Records */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Health Records</CardTitle>
              </CardHeader>
              <CardContent>
                {student.monthlyHealthCard ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">
                        Checkup on {format(new Date(student.monthlyHealthCard.checkupDate), "MMM dd, yyyy")}
                      </p>
                      <Badge variant={student.monthlyHealthCard.present ? "default" : "destructive"}>
                        {student.monthlyHealthCard.present ? "Present" : "Absent"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DetailItem label="Weight (kg)" value={student.monthlyHealthCard.weightKg} />
                      <DetailItem label="Height (cm)" value={student.monthlyHealthCard.heightCm} />
                      <DetailItem label="BMI" value={student.monthlyHealthCard.bmi} />
                      <DetailItem label="Treatment" value={student.monthlyHealthCard.treatmentType} />
                    </div>
                    {student.monthlyHealthCard.symptoms?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Symptoms</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {student.monthlyHealthCard.symptoms.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                    {student.monthlyHealthCard.referredTo && (
                       <DetailItem label="Referred To" value={student.monthlyHealthCard.referredTo} />
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No monthly checkups found for the selected month.</p>
                )}
              </CardContent>
            </Card>

            {/* Referral History */}
            <Card>
              <CardHeader>
                <CardTitle>Referral History</CardTitle>
              </CardHeader>
              <CardContent>
                {student.referralDetails?.length > 0 ? (
                  <div className="space-y-4">
                    {student.referralDetails.map((ref: any) => (
                      <div key={ref.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">{ref.issue}</p>
                          <Badge
                            variant={ref.status === 'Pending' ? 'destructive' : 'default'}
                            className={ref.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
                          >
                            {ref.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Referred to: {ref.facility || 'N/A'} on {format(new Date(ref.referralDate), "MMM dd, yyyy")}
                        </p>
                        {ref.completionDate && (
                           <p className="text-sm text-emerald-600">
                             Completed on: {format(new Date(ref.completionDate), "MMM dd, yyyy")}
                           </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No referral history found.</p>
                )}
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}