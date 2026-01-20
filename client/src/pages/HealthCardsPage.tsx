import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { getBMIColor, getBMIBgColor, getBMIClassificationLabel } from "@/lib/bmiColors";
import { Eye, FileDown, Filter, Edit, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV } from "@/lib/csvExport";
import { exportToPDF, exportToExcel } from "@/lib/exportService";
import { HealthCardFormSections } from "@/components/health-card/HealthCardFormSections";
import { useForm } from "react-hook-form";

export default function HealthCardsPage() {
   const { hasRole, user } = useAuth();
   const { toast } = useToast();
   const params = useParams();
   const isViewMode = !!params.id;
   const cardId = params.id;

   const [statusFilter, setStatusFilter] = useState("all");
   const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
   const [page, setPage] = useState(1);
   const [editingCard, setEditingCard] = useState<any>(null);
   const [exportFormat, setExportFormat] = useState("csv");
   const [rejectingCard, setRejectingCard] = useState<any>(null);
   const [rejectionReason, setRejectionReason] = useState("");
   const isAdmin = hasRole("Admin");
   const isHeadmaster = hasRole("Headmaster");
   const [, setLocation] = useLocation();

   // Redirect Admin users away from this page — Admins are not allowed to access Health Cards UI
   React.useEffect(() => {
     if (isAdmin || (user && user.role === "Admin")) setLocation("/");
   }, [isAdmin, user, setLocation]);

   if (isAdmin || (user && user.role === "Admin")) return null;

   const editForm = useForm({
     defaultValues: editingCard || {},
   });

   // Update form when editingCard changes
   React.useEffect(() => {
     if (editingCard) {
       editForm.reset(editingCard);
     }
   }, [editingCard, editForm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/annual-cards", statusFilter, yearFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("year", yearFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const res = await apiRequest("GET", `/api/annual-cards?${params}`);
      return res.json();
    },
    enabled: !isViewMode,
  });

  const { data: cardData, isLoading: cardLoading, error: cardError } = useQuery<any>({
    queryKey: ["/api/annual-cards", cardId],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/annual-cards/${cardId}`);
        return res.json();
      } catch (err: any) {
        // If the id was a student id and no card exists with that id, try fetching by studentId
        if (err?.message && (err.message as string).startsWith("404:")) {
          try {
            const listRes = await apiRequest("GET", `/api/annual-cards?studentId=${cardId}&limit=10`);
            const listJson = await listRes.json();
            if (listJson.cards && listJson.cards.length > 0) {
              // Use the first card (list endpoint returns most recent first)
              return { card: listJson.cards[0], student: listJson.cards[0].student || null };
            }
            // No card found for student - return nulls so UI shows "No health card data available"
            return { card: null, student: null };
          } catch (err2) {
            // Fall through and surface original error
            throw err;
          }
        }
        throw err;
      }
    },
    enabled: isViewMode && !!cardId,
  });

  React.useEffect(() => {
    if (cardError) {
      console.error('Error fetching health card:', cardError);
      toast({ title: 'Error', description: (cardError as any)?.message || 'Failed to fetch health card', variant: 'destructive' });
    }
  }, [cardError, toast]);

  const cards = data?.cards || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const res = await apiRequest("PUT", `/api/annual-cards/${editingCard.id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Health card updated",
        description: "The health card has been updated successfully.",
      });
      
      // Automatic propagation: Invalidate all related queries across all views
      queryClient.invalidateQueries({ queryKey: ["/api/annual-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/referral-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/class-health-summary"] });
      
      setEditingCard(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update health card",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (cardId: string) => {
      return apiRequest("PUT", `/api/annual-cards/${cardId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Health card approved",
        description: "The health card has been approved successfully.",
      });
      
      // Automatic propagation: Invalidate all related queries across all views
      queryClient.invalidateQueries({ queryKey: ["/api/annual-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/referral-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/class-health-summary"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve health card",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ cardId, reason }: { cardId: string; reason: string }) => {
      return apiRequest("PUT", `/api/annual-cards/${cardId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Health card rejected",
        description: "The health card has been rejected.",
      });
      
      // Automatic propagation: Invalidate all related queries across all views
      queryClient.invalidateQueries({ queryKey: ["/api/annual-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/referral-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/class-health-summary"] });
      
      setRejectingCard(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject health card",
        variant: "destructive",
      });
    },
  });

  const exportReferrals = async (cardId: string) => {
    try {
      const res = await apiRequest("GET", `/api/annual-cards/${cardId}/referrals`);
      const data = await res.json();
      const referrals: any[] = data.referrals || [];
      if (referrals.length === 0) {
        toast({ title: "No referrals", description: "No referral data found for this card." });
        return;
      }

      // Normalize for CSV
      const rows = referrals.map(r => ({
        studentName: data.student?.fullName || data.student?.full_name || data.student?.nameOfChild || "",
        studentClass: data.student?.classSection || data.student?.class_section || "",
        section: r.section,
        label: r.label,
        facility: r.facility || r.facility || r.facilityName || "",
        date: r.date || "",
        details: typeof r.details === 'object' ? JSON.stringify(r.details) : (r.details || "")
      }));

      exportToCSV(rows, [
        { key: 'studentName', header: 'Student Name' },
        { key: 'studentClass', header: 'Class' },
        { key: 'section', header: 'Section' },
        { key: 'label', header: 'Condition' },
        { key: 'facility', header: 'Referral Facility' },
        { key: 'date', header: 'Referral Date' },
        { key: 'details', header: 'Details' },
      ], `referrals_${cardId}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to export referrals', variant: 'destructive' });
    }
  };

  // -- Full details helpers and export
  const [showFullDetails, setShowFullDetails] = React.useState(false);
  // showEmptyFields: when true, render all fields in each section (Yes / No / —)
  const [showEmptyFields, setShowEmptyFields] = React.useState(false);

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const exportJSON = (card: any) => {
    try {
      const dataStr = JSON.stringify(card, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healthcard_${card.id || 'card'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to export JSON', variant: 'destructive' });
    }
  };

  const handleSaveEdit = () => {
    if (!editingCard) return;
    const formData = editForm.getValues();
    updateMutation.mutate(formData);
  };

  if (isViewMode) {
    const card = cardData?.card;
    if (cardLoading) {
      return (
        <AppLayout title="Health Card Details">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </AppLayout>
      );
    }

    if (cardError) {
      return (
        <AppLayout title="Health Card Details">
          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded">
              <h3 className="text-lg font-bold text-red-700">Failed to load health card</h3>
              <p className="text-sm text-red-600">An error occurred while fetching the health card. Please try again or contact support.</p>
              <div className="mt-4">
                <Link href="/health-cards">
                  <Button variant="outline" size="sm">Back to Health Cards</Button>
                </Link>
              </div>
            </div>
          </div>
        </AppLayout>
      );
    }

    if (!card) {
      return (
        <AppLayout title="Health Card Details">
          <div className="p-6">No health card data available.</div>
        </AppLayout>
      );
    }

    return (
      <AppLayout title="Health Card Details">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/health-cards">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Health Cards
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">{card.nameOfChild}</h2>
              <p className="text-muted-foreground">Class {card.classSection} • {card.year}</p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowEmptyFields(s => !s)}>
                {showEmptyFields ? 'Hide empty fields' : 'Show empty fields'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFullDetails(s => !s)}>
                {showFullDetails ? 'Hide full details' : 'Show full details'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => exportJSON(card)}>
                <FileDown className="h-4 w-4 mr-2" />Export JSON
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Name:</strong> {card.nameOfChild}</div>
                <div><strong>Class:</strong> {card.classSection}</div>
                <div><strong>Year:</strong> {card.year}</div>
                <div><strong>School:</strong> {card.schoolName}</div>
                <div><strong>Status:</strong> <StatusBadge status={card.status} size="sm" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Physical Measurements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Height:</strong> {card.heightCm} cm</div>
                <div><strong>Weight:</strong> {card.weightKg} kg</div>
                <div><strong>BMI:</strong> {card.bmi}</div>
                <div><strong>Blood Pressure:</strong> {card.sbp}/{card.dbp}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Health Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Referral Recommended:</strong> {card.referralRecommended ? "Yes" : "No"}</div>
                <div><strong>Submitted:</strong> {card.dateOfEntry ? new Date(card.dateOfEntry).toLocaleDateString() : "N/A"}</div>
              </CardContent>
            </Card>
          </div>

          {/* Anthropometry Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anthropometry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Weight:</strong> {card.weightKg} kg</div>
                <div><strong>Height:</strong> {card.heightCm} cm</div>
                <div><strong>BMI:</strong> {card.bmi}</div>
                <div><strong>BMI Category:</strong> {card.bmi_category || 'Not classified'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div><strong>Vision Right:</strong> {card.visionRight || 'Not recorded'}</div>
                <div><strong>Vision Left:</strong> {card.visionLeft || 'Not recorded'}</div>
                <div><strong>Blood Pressure:</strong> {card.bloodPressure || `${card.sbp}/${card.dbp}` || 'Not recorded'}</div>
                <div><strong>BP Category:</strong> {card.bpCategory || card.bp_classification || 'Not classified'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Deficiencies Section */}
          {((card.deficiencies && card.deficiencies.length > 0) || showEmptyFields) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deficiencies Identified</CardTitle>
              </CardHeader>
              <CardContent>
                {card.deficiencies && card.deficiencies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {card.deficiencies.map((def: string, index: number) => (
                      <Badge key={index} variant="destructive">{def}</Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{formatValue(card.deficiencies && card.deficiencies.length ? card.deficiencies : null)}</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Diseases Section */}
          {(
            card.c7_suspected || card.c8_suspected || card.c1_convulsive || card.c2_otitis_media || card.c3_dental || card.c4_skin_conditions || card.c5_asthma || card.c6_rheumatic_heart || showEmptyFields
          ) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diseases/Conditions Identified</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(card.c7_suspected || showEmptyFields) && (
                  card.c7_suspected ? (
                    <div className="text-red-600 font-semibold">⚠️ Leprosy suspected - requires immediate referral</div>
                  ) : (
                    <div><strong>Leprosy suspected:</strong> {formatValue(card.c7_suspected)}</div>
                  )
                )}

                {(card.c8_suspected || showEmptyFields) && (
                  card.c8_suspected ? (
                    <div className="text-red-600 font-semibold">⚠️ Tuberculosis suspected - requires immediate referral</div>
                  ) : (
                    <div><strong>Tuberculosis suspected:</strong> {formatValue(card.c8_suspected)}</div>
                  )
                )}

                {(card.c1_convulsive || showEmptyFields) && (
                  card.c1_convulsive ? <div>• Convulsive disorders</div> : <div><strong>Convulsive disorders:</strong> {formatValue(card.c1_convulsive)}</div>
                )}
                {(card.c2_otitis_media || showEmptyFields) && (
                  card.c2_otitis_media ? <div>• Otitis media</div> : <div><strong>Otitis media:</strong> {formatValue(card.c2_otitis_media)}</div>
                )}
                {(card.c3_dental || showEmptyFields) && (
                  card.c3_dental ? <div>• Dental conditions</div> : <div><strong>Dental conditions:</strong> {formatValue(card.c3_dental)}</div>
                )}
                {(card.c4_skin_conditions || showEmptyFields) && (
                  card.c4_skin_conditions ? <div>• Skin conditions</div> : <div><strong>Skin conditions:</strong> {formatValue(card.c4_skin_conditions)}</div>
                )}
                {(card.c5_asthma || showEmptyFields) && (
                  card.c5_asthma ? <div>• Asthma/Reactive airway disease</div> : <div><strong>Asthma/Reactive airway disease:</strong> {formatValue(card.c5_asthma)}</div>
                )}
                {(card.c6_rheumatic_heart || showEmptyFields) && (
                  card.c6_rheumatic_heart ? <div>• Rheumatic heart disease</div> : <div><strong>Rheumatic heart disease:</strong> {formatValue(card.c6_rheumatic_heart)}</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Developmental Delays Section */}
          {(
            card.d1_seeing_difficulty || card.d2_walking_delay || card.d3_reading_writing || card.d4_muscle_stiffness || card.d5_hearing_difficulty || card.d6_speech_difficulty || card.d7_learning_difficulty || card.d8_inattention_hyperactivity || card.d9_behavioral_concerns || showEmptyFields
          ) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Developmental Delays/Disabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(card.d1_seeing_difficulty || showEmptyFields) && (card.d1_seeing_difficulty ? <div>• Difficulty seeing</div> : <div><strong>Difficulty seeing:</strong> {formatValue(card.d1_seeing_difficulty)}</div>)}
                {(card.d2_walking_delay || showEmptyFields) && (card.d2_walking_delay ? <div>• Delay in walking</div> : <div><strong>Delay in walking:</strong> {formatValue(card.d2_walking_delay)}</div>)}
                {(card.d3_reading_writing || showEmptyFields) && (card.d3_reading_writing ? <div>• Difficulty reading/writing</div> : <div><strong>Difficulty reading/writing:</strong> {formatValue(card.d3_reading_writing)}</div>)}
                {(card.d4_muscle_stiffness || showEmptyFields) && (card.d4_muscle_stiffness ? <div>• Muscle stiffness</div> : <div><strong>Muscle stiffness:</strong> {formatValue(card.d4_muscle_stiffness)}</div>)}
                {(card.d5_hearing_difficulty || showEmptyFields) && (card.d5_hearing_difficulty ? <div>• Hearing difficulty</div> : <div><strong>Hearing difficulty:</strong> {formatValue(card.d5_hearing_difficulty)}</div>)}
                {(card.d6_speech_difficulty || showEmptyFields) && (card.d6_speech_difficulty ? <div>• Speech difficulty</div> : <div><strong>Speech difficulty:</strong> {formatValue(card.d6_speech_difficulty)}</div>)}
                {(card.d7_learning_difficulty || showEmptyFields) && (card.d7_learning_difficulty ? <div>• Learning difficulty</div> : <div><strong>Learning difficulty:</strong> {formatValue(card.d7_learning_difficulty)}</div>)}
                {(card.d8_inattention_hyperactivity || showEmptyFields) && (card.d8_inattention_hyperactivity ? <div>• Inattention/hyperactivity</div> : <div><strong>Inattention/hyperactivity:</strong> {formatValue(card.d8_inattention_hyperactivity)}</div>)}
                {(card.d9_behavioral_concerns || showEmptyFields) && (card.d9_behavioral_concerns ? <div>• Behavioral concerns</div> : <div><strong>Behavioral concerns:</strong> {formatValue(card.d9_behavioral_concerns)}</div>)}
              </CardContent>
            </Card>
          )}

          {/* Adolescent Health Section */}
          {card.ageYears >= 10 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adolescent Health (10-18 years)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(card.e1_life_events_difficulty || showEmptyFields) && (card.e1_life_events_difficulty ? <div>• Difficulty managing life events</div> : <div><strong>Difficulty managing life events:</strong> {formatValue(card.e1_life_events_difficulty)}</div>)}
                {(card.e2_peer_pressure_substance || showEmptyFields) && (card.e2_peer_pressure_substance ? <div>• Peer pressure to smoke/drink</div> : <div><strong>Peer pressure to smoke/drink:</strong> {formatValue(card.e2_peer_pressure_substance)}</div>)}
                {(card.e3_persistent_sadness || showEmptyFields) && (card.e3_persistent_sadness ? <div>• Persistent sadness/fatigue</div> : <div><strong>Persistent sadness/fatigue:</strong> {formatValue(card.e3_persistent_sadness)}</div>)}
                {(card.e4_menstruation_started || showEmptyFields) && (card.e4_menstruation_started ? <div>• Menstruation started</div> : <div><strong>Menstruation started:</strong> {formatValue(card.e4_menstruation_started)}</div>)}
                {(card.e5_pain_urination || showEmptyFields) && (card.e5_pain_urination ? <div>• Pain/burning during urination</div> : <div><strong>Pain/burning during urination:</strong> {formatValue(card.e5_pain_urination)}</div>)}
                {(card.e6_foul_discharge || showEmptyFields) && (card.e6_foul_discharge ? <div>• Foul-smelling discharge</div> : <div><strong>Foul-smelling discharge:</strong> {formatValue(card.e6_foul_discharge)}</div>)}
                {(card.e7_severe_menstrual_pain || showEmptyFields) && (card.e7_severe_menstrual_pain ? <div>• Severe menstrual pain</div> : <div><strong>Severe menstrual pain:</strong> {formatValue(card.e7_severe_menstrual_pain)}</div>)}
              </CardContent>
            </Card>
          )}

          {/* Referral Information */}
          {(card.referralRecommended || showEmptyFields) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Referral Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Referral Recommended:</strong> {formatValue(card.referralRecommended)}</div>
                {(card.referral_defect_at_birth_facility_date || showEmptyFields) && (
                  <div><strong>Defect at Birth Referral:</strong> {formatValue(card.referral_defect_at_birth_facility_date)}</div>
                )}
                {(card.referral_deficiency_facility_date || showEmptyFields) && (
                  <div><strong>Deficiency Referral:</strong> {formatValue(card.referral_deficiency_facility_date)}</div>
                )}
                {(card.referral_disease_facility_date || showEmptyFields) && (
                  <div><strong>Disease Referral:</strong> {formatValue(card.referral_disease_facility_date)}</div>
                )}
                {(card.referral_leprosy_facility_date || showEmptyFields) && (
                  <div><strong>Leprosy Referral:</strong> {formatValue(card.referral_leprosy_facility_date)}</div>
                )}
                {(card.referral_tb_facility_date || showEmptyFields) && (
                  <div><strong>TB Referral:</strong> {formatValue(card.referral_tb_facility_date)}</div>
                )}
                {(card.referral_developmental_facility_date || showEmptyFields) && (
                  <div><strong>Developmental Referral:</strong> {formatValue(card.referral_developmental_facility_date)}</div>
                )}
                {(card.referral_adolescent_facility_date || showEmptyFields) && (
                  <div><strong>Adolescent Health Referral:</strong> {formatValue(card.referral_adolescent_facility_date)}</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {(card.notes || showEmptyFields) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{card.notes || formatValue(card.notes)}</p>
              </CardContent>
            </Card>
          )}

          {/* Full details - collapsible */}
          {showFullDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Full Card Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(card).sort().map((k) => (
                    <div key={k} className="border rounded p-2 overflow-auto">
                      <div className="text-xs text-muted-foreground mb-1">{k}</div>
                      <pre className="text-sm whitespace-pre-wrap">{formatValue((card as any)[k])}</pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Annual Health Cards">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Annual Health Cards</h2>
            <p className="text-muted-foreground">
              View and manage student health card records
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32" data-testid="filter-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
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

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-red-800">Error loading health cards: {error.message || "Unknown error"}</p>
          </div>
        )}

        <DataTable
          columns={[
            {
              key: "studentName",
              header: "Student",
              render: (item: any) => (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {item.nameOfChild?.slice(0, 2).toUpperCase() || "ST"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{item.nameOfChild}</p>
                    <p className="text-xs text-muted-foreground">Class {item.classSection}</p>
                  </div>
                </div>
              ),
            },
            { key: "year", header: "Year", className: "text-center" },
            { key: "schoolName", header: "School" },
            {
              key: "bmi",
              header: "BMI",
              render: (item: any) => {
                const bmi = item.bmi ? parseFloat(item.bmi) : null;
                return (
                  <div className={`inline-block px-3 py-1 rounded-md ${getBMIBgColor(bmi)}`}>
                    <span className={`font-semibold ${getBMIColor(bmi)}`}>
                      {bmi ? `${bmi.toFixed(1)}` : "-"}
                    </span>
                    {bmi && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({getBMIClassificationLabel(bmi)})
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: "referralRecommended",
              header: "Referral",
              render: (item: any) => (
                item.referralRecommended ? (
                  <StatusBadge status="Referred" size="sm" />
                ) : (
                  <span className="text-sm text-muted-foreground">No</span>
                )
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (item: any) => <StatusBadge status={item.status} size="sm" />,
            },
            {
              key: "dateOfEntry",
              header: "Submitted",
              render: (item: any) => (
                <span className="text-sm text-muted-foreground">
                  {item.dateOfEntry ? new Date(item.dateOfEntry).toLocaleDateString() : "-"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: any) => (
                <div className="flex items-center gap-1">
                  <Link href={`/health-cards/view/${item.id}`}>
                    <Button variant="ghost" size="icon" data-testid={`button-view-${item.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" data-testid={`button-export-referrals-${item.id}`} onClick={() => exportReferrals(item.id)}>
                    <FileDown className="h-4 w-4" />
                  </Button>
                  {(isAdmin || isHeadmaster) && item.status === "Pending" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-approve-${item.id}`}
                        onClick={() => approveMutation.mutate(item.id)}
                        disabled={approveMutation.isPending}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-reject-${item.id}`}
                        onClick={() => setRejectingCard(item)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" data-testid={`button-download-${item.id}`}>
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]}
          data={cards}
          getRowKey={(item: any) => item.id}
          isLoading={isLoading}
          exportable
          onExport={async (type) => {
            const fmt = type || exportFormat;
            if (fmt === "csv") {
              exportToCSV(
                cards,
                [
                  { key: "nameOfChild", header: "Student Name" },
                  { key: "classSection", header: "Class" },
                  { key: "year", header: "Year" },
                  { key: "status", header: "Status" },
                  { key: "dateOfEntry", header: "Submitted Date" },
                ],
                "health_cards"
              );
            } else if (fmt === "pdf") {
              exportToPDF(cards as any, { includeNutrition: false, includeMedical: true }, user?.fullName || user?.email || '');
            } else if (fmt === "xlsx") {
              exportToExcel(cards as any, { includeNutrition: false, includeMedical: true }, user?.fullName || user?.email || '');
            }
          }}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            onPageChange: setPage,
          }}
          emptyMessage="No health cards found"
        />

        {/* Reject Dialog */}
        {rejectingCard && (
          <Dialog open={!!rejectingCard} onOpenChange={(open) => !open && setRejectingCard(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Health Card</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejection. This will be shared with the class teacher.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-rejection-reason"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectingCard(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (rejectingCard && rejectionReason.trim()) {
                      rejectMutation.mutate({ cardId: rejectingCard.id, reason: rejectionReason });
                    }
                  }}
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
