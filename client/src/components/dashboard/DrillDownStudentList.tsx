import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { StudentDetailDrawer } from "./StudentDetailDrawer";

interface DrillDownStudentListProps {
  metric: string;
  title: string;
  filters: {
    month: string;
    year: string;
    schoolId?: string;
    district?: string;
    block?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function DrillDownStudentList({ metric, title, filters, isOpen, onClose }: DrillDownStudentListProps) {
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/po/dashboard/drilldown", metric, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("metric", metric);
      params.append("month", filters.month);
      params.append("year", filters.year);
      if (filters.schoolId) params.append("schoolId", filters.schoolId);
      if (filters.district) params.append("district", filters.district);
      if (filters.block) params.append("block", filters.block);

      const res = await apiRequest("GET", `/api/po/dashboard/drilldown?${params.toString()}`);
      return res.json();
    },
    enabled: isOpen && !!metric,
  });

  const handleStudentClick = (student: any) => {
    setSelectedStudent(student);
  };

  const handleDetailClose = () => {
    setSelectedStudent(null);
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Student List: {title}</DrawerTitle>
            <DrawerDescription>
              Showing students contributing to the "{metric}" metric. Click a student to see details.
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="overflow-y-auto px-4 pb-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !students || students.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No students found for this metric.
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleStudentClick(student)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {student.fullName?.slice(0, 2).toUpperCase() || "ST"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{student.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.schoolName} • Class {student.classSection}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Detail Drawer */}
      <StudentDetailDrawer
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={handleDetailClose}
      />
    </>
  );
}