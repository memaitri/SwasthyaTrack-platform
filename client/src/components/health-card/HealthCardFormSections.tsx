import { UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getBMIClassification, getBMIClassificationLabel } from "@/lib/bmiColors";
import { DEFAULT_REFERRAL_FACILITIES, REFERRAL_FACILITIES, REFERRAL_FACILITY_OPTIONS } from "@/lib/referralFacilities";

interface HealthCardFormSectionsProps {
  form: UseFormReturn<any>;
  studentGender?: string;
  studentAge?: number;
  userRole?: string;
}

export function HealthCardFormSections({
  form,
  studentGender,
  studentAge = 0,
  userRole,
}: HealthCardFormSectionsProps) {
  const showAdolescentSection = studentAge >= 10;
  const isFemale = studentGender === "F";
  const canViewMenstrualHealth = userRole === "Lady Superintendent" || userRole === "Admin";
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate BMI when weight or height changes
  const weight = form.watch("weightKg");
  const height = form.watch("heightCm");
  const calculatedBMI = weight && height ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(2) : "";
  const calculatedBMIValue = calculatedBMI ? parseFloat(calculatedBMI) : null;

  // Update BMI field when calculated
  if (calculatedBMI && calculatedBMI !== form.getValues("bmi")) {
    form.setValue("bmi", calculatedBMI);
  }

  // Auto-calculate BMI category
  const bmiCategory = calculatedBMIValue ? getBMIClassification(calculatedBMIValue) : "";
  if (bmiCategory && bmiCategory !== form.getValues("bmi_category")) {
    form.setValue("bmi_category", bmiCategory);
  }

  // Calculate blood pressure category when blood pressure changes
  const bloodPressure = form.watch("bloodPressure");
  const calculateBPCategory = (bp: string) => {
    if (!bp) return "";
    const match = bp.match(/^(\d+)\/(\d+)$/);
    if (!match) return "";
    const systolic = parseInt(match[1]);
    const diastolic = parseInt(match[2]);

    if (systolic < 120 && diastolic < 80) return "normal";
    else if ((systolic >= 120 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) return "prehypertension";
    else if ((systolic >= 140 && systolic < 160) || (diastolic >= 90 && diastolic < 100)) return "stage1_htn";
    else if (systolic >= 160 || diastolic >= 100) return "stage2_htn";
    return "";
  };

  const bpCategory = bloodPressure ? calculateBPCategory(bloodPressure) : "";
  if (bpCategory && bpCategory !== form.getValues("bpClassification")) {
    form.setValue("bpClassification", bpCategory);
  }

  return (
    <div className="space-y-6">
      {/* Anthropometry Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anthropometry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="weightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // BMI will be auto-calculated
                      }}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="heightCm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // BMI will be auto-calculated
                      }}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bmi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Mass Index</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Auto-calculated"
                      value={calculatedBMI || field.value || ""}
                      readOnly
                    />
                  </FormControl>
                  <p className="text-xs text-gray-600">Weight in kg / (Height in m)<sup>2</sup></p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>BMI Classification</FormLabel>
              <Input
                value={calculatedBMIValue ? getBMIClassification(calculatedBMIValue).charAt(0).toUpperCase() + getBMIClassification(calculatedBMIValue).slice(1) : "Not calculated"}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-600 mt-1">Auto-classified based on BMI value</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="visionRight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vision Right (Snellen)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="6/6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visionLeft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vision Left (Snellen)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="6/6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bloodPressure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Pressure (mmHg) (Systolic/Diastolic)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="120/80"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Tick Appropriate:</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "normal", label: "Normal" },
                  { value: "prehypertension", label: "Prehypertension" },
                  { value: "stage1_htn", label: "Stage 1 HTN" },
                  { value: "stage2_htn", label: "Stage 2 HTN" },
                ].map((option) => (
                  <FormField
                    key={option.value}
                    control={form.control}
                    name="bpClassification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === option.value}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange(option.value);
                              } else {
                                field.onChange("");
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm">{option.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section A: Defects at Birth */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">A. Defects at Birth (If YES, Refer)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <FormField
                control={form.control}
                name="a1_visible_defect"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">
                        A1: Any visible defect at birth - cleft lip, palate, club foot, Down syndrome, cataract, etc.
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {form.watch("a1_visible_defect") && (
              <div className="ml-6 space-y-3 border-l-2 border-yellow-200 pl-4">
                <FormField
                  control={form.control}
                  name="a1_visible_defect_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Details of defect</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the visible defect..."
                          {...field}
                          className="min-h-20"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="a1_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Summary checkboxes for Section A */}
          <div className="mt-4 pt-4 border-t">
            <FormLabel className="text-sm font-semibold">Summary of Findings - Defects at Birth</FormLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { key: "summary_defects_neural_tube", label: "Neural tube defect" },
                { key: "summary_defects_down_syndrome", label: "Down syndrome" },
                { key: "summary_defects_cleft", label: "Cleft lip/palate" },
                { key: "summary_defects_talipes", label: "Talipes" },
                { key: "summary_defects_hip_dysplasia", label: "Developmental dysplasia of hip" },
                { key: "summary_defects_congenital_deafness", label: "Congenital deafness" },
              ].map((item) => (
                <FormField
                  key={item.key}
                  control={form.control}
                  name={item.key as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs">{item.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="summary_defects_other"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel className="text-xs">Other</FormLabel>
                  <FormControl>
                    <Input placeholder="Specify other defects" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section B: Deficiencies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">B. Deficiencies (If YES, Refer)</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            For each below: ? YES ? NO; if YES, Refer � record facility
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* B1 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <div className="flex items-start space-x-3">
              <FormField
                control={form.control}
                name="b1_severe_thinning"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">
                        B1: Severe thinning (SAM-like): BMI {"<"} 3 SD
                      </FormLabel>
                      <p className="text-xs text-gray-600 mt-1">
                        Counsel moderate thinning �2 to �3 SD
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            {form.watch("b1_severe_thinning") && (
              <div className="ml-6 space-y-3">
                <FormField
                  control={form.control}
                  name="b1_counsel_moderate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm">Counseled for moderate thinning</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="b1_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* B2 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <FormField
              control={form.control}
              name="b2_bilateral_oedema"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    B2: Bilateral pitting oedema (esp. feet)
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("b2_bilateral_oedema") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="b2_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* B3 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <FormField
              control={form.control}
              name="b3_severe_anemia"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    B3: Severe anemia - severe palmar pallor
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("b3_severe_anemia") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="b3_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* B4 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <FormField
              control={form.control}
              name="b4_vitamin_a_deficiency"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    B4: Vitamin A deficiency - night blindness, Bitot's spots
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("b4_vitamin_a_deficiency") && (
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="b4_night_blindness"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">Night blindness</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="b4_bitots_spots"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">Bitot's spots</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="b4_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* B5 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <FormField
              control={form.control}
              name="b5_vitamin_d_deficiency"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    B5: Vitamin D deficiency � wrist widening, bowing of legs
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("b5_vitamin_d_deficiency") && (
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="b5_wrist_widening"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">Wrist widening</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="b5_bowing_legs"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">Bowing of legs</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="b5_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* B6 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <FormField
              control={form.control}
              name="b6_goitre"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    B6: Goitre � swelling in neck
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("b6_goitre") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="b6_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* B7 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <FormField
              control={form.control}
              name="b7_obesity"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    B7: Obesity: BMI {">"}+2 SD
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("b7_obesity") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="b7_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* B8 */}
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <FormField
              control={form.control}
              name="b8_vitb_deficiency"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    B8: Vitamin B complex deficiency � angular stomatitis, raw tongue, corneal vascularization
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("b8_vitb_deficiency") && (
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="b8_angular_stomatitis"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">Angular stomatitis</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="b8_raw_tongue"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">Raw tongue</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="b8_corneal_vascularization"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">Corneal vascularization</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="b8_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Summary checkboxes for Section B */}
          <div className="mt-4 pt-4 border-t">
            <FormLabel className="text-sm font-semibold">Summary of Findings - Deficiencies</FormLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { key: "summary_deficiency_anemia", label: "Anemia" },
                { key: "summary_deficiency_vitamin_a", label: "Vitamin A def." },
                { key: "summary_deficiency_vitamin_d", label: "Vitamin D def." },
                { key: "summary_deficiency_sam_stunting", label: "SAM/Stunting" },
                { key: "summary_deficiency_goitre", label: "Goitre" },
                { key: "summary_deficiency_vitamin_b", label: "Vitamin B complex def." },
              ].map((item) => (
                <FormField
                  key={item.key}
                  control={form.control}
                  name={item.key as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs">{item.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="summary_deficiency_other"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel className="text-xs">Other</FormLabel>
                  <FormControl>
                    <Input placeholder="Specify other deficiencies" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section C: Diseases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">C. Diseases (If YES, Refer)</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Suspected but not confirmed � for each: ? YES ? NO; if YES, Refer � record facility
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* C1 */}
          <div className="space-y-3 border-l-4 border-red-300 pl-4">
            <FormField
              control={form.control}
              name="c1_convulsive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">
                    C1: Convulsive disorders � fits/unconscious episodes
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.watch("c1_convulsive") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="c1_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C2 */}
          <div className="space-y-3 border-l-4 border-red-300 pl-4">
            <FormField
              control={form.control}
              name="c2_otitis_media"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="text-sm">
                      C2: Otitis media � =3 episodes of ear discharge in last year; assess hearing
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name="c2_assess_hearing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Assess hearing</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </FormItem>
              )}
            />
            {form.watch("c2_otitis_media") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="c2_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C3 */}
          <div className="space-y-3 border-l-4 border-red-300 pl-4">
            <FormField
              control={form.control}
              name="c3_dental"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="text-sm">
                      C3: Dental conditions � white/brown discoloration, gum swelling, plaque
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <FormField
                        control={form.control}
                        name="c3_white_discoloration"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">White discoloration</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="c3_brown_discoloration"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Brown discoloration</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="c3_gum_swelling"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Gum swelling</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="c3_plaque"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Plaque</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </FormItem>
              )}
            />
            {form.watch("c3_dental") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="c3_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C4 */}
          <div className="space-y-3 border-l-4 border-red-300 pl-4">
            <FormField
              control={form.control}
              name="c4_skin_conditions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="text-sm">
                      C4: Skin conditions (non-leprosy): itching, scaly lesions, round lesions
                    </FormLabel>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <FormField
                        control={form.control}
                        name="c4_itching"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Itching</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="c4_scaly_lesions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Scaly lesions</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="c4_round_lesions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Round lesions</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </FormItem>
              )}
            />
            {form.watch("c4_skin_conditions") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="c4_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C5 */}
          <div className="space-y-3 border-l-4 border-red-300 pl-4">
            <FormField
              control={form.control}
              name="c5_asthma"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="text-sm">
                      C5: Asthma/Reactive Airway Disease � breathlessness, wheezing
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <FormField
                        control={form.control}
                        name="c5_breathlessness"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Breathlessness</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="c5_wheezing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Wheezing</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </FormItem>
              )}
            />
            {form.watch("c5_asthma") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="c5_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C6 */}
          <div className="space-y-3 border-l-4 border-red-300 pl-4">
            <FormField
              control={form.control}
              name="c6_rheumatic_heart"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="text-sm">
                      C6: Rheumatic Heart Disease � murmur
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name="c6_murmur"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Murmur detected</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </FormItem>
              )}
            />
            {form.watch("c6_rheumatic_heart") && (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="c6_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-red-600">
                        Referral Facility *
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C7: Childhood Leprosy Disease (Hansen's Disease) */}
          <div className="space-y-3 border-l-4 border-red-400 pl-4 bg-red-50 p-4 rounded">
            <div className="flex items-start space-x-3">
              <FormField
                control={form.control}
                name="c7_suspected"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-bold text-red-700">
                        C7: Childhood Leprosy Disease (Hansen's Disease) - (If ANY positive {'>'} REFER)
                      </FormLabel>
                      <p className="text-xs text-red-600 mt-1">LOOK - ASK - PERFORM - Refer immediately if suspected</p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {form.watch("c7_suspected") && (
              <div className="ml-6 space-y-6 bg-white p-4 rounded border">
                {/* C7.1 Skin Lesion Assessment */}
                <div className="border-l-2 border-orange-300 pl-3">
                  <FormLabel className="text-sm font-bold text-orange-700">C7.1 Skin Lesion Assessment</FormLabel>
                  <div className="space-y-2 mt-2">
                    <FormField
                      control={form.control}
                      name="c7_hypopigmented_reddish_lesion"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">{"Look for hypo-pigmented or reddish skin lesion"}</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c7_lesion_sensory_deficit"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Lesion has definite sensory deficit</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormLabel className="text-xs font-semibold mt-3 block">Skin lesion characteristics (should be ALL true):</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                    {[
                      { key: "not_painful", label: "Not painful" },
                      { key: "not_itchy", label: "Not itchy" },
                      { key: "not_shedding_scales", label: "Not shedding scales" },
                      { key: "not_seasonal", label: "Not appearing/disappearing seasonally" },
                      { key: "no_prior_inflammation", label: "Not preceded by inflammation" },
                      { key: "not_dark_red_depigmented", label: "Not dark red/completely depigmented" },
                    ].map((char) => (
                      <FormField
                        key={char.key}
                        control={form.control}
                        name={`c7_skin_characteristics.${char.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("c7_skin_characteristics") || {};
                                  form.setValue("c7_skin_characteristics", { ...current, [char.key]: checked });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs">{char.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormLabel className="text-xs font-semibold mt-3 block">C7.1.1 Number of lesions present:</FormLabel>
                  <div className="space-y-1 mt-1">
                    <FormField
                      control={form.control}
                      name="c7_num_lesions"
                      render={({ field }) => (
                        <FormItem>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select number of lesions" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-5">1-5 lesions</SelectItem>
                              <SelectItem value="more-than-5">More than 5 lesions</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormLabel className="text-xs font-semibold mt-3 block">C7.1.2 Type of skin lesion:</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { key: "patchy", label: "Patchy" },
                      { key: "plaque", label: "Plaque" },
                      { key: "nodular", label: "Nodular" },
                      { key: "diffuse_infiltration", label: "Diffuse infiltration" },
                    ].map((type) => (
                      <FormField
                        key={type.key}
                        control={form.control}
                        name={`c7_lesion_type.${type.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("c7_lesion_type") || {};
                                  form.setValue("c7_lesion_type", { ...current, [type.key]: checked });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs">{type.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* C7.2 Peripheral Nerve Involvement */}
                <div className="border-l-2 border-orange-300 pl-3">
                  <FormLabel className="text-sm font-bold text-orange-700">C7.2 Peripheral Nerve Involvement</FormLabel>
                  
                  <FormLabel className="text-xs font-semibold mt-3 block">Nerves involved (tick all that apply):</FormLabel>
                  <div className="grid grid-cols-1 gap-1 mt-1">
                    {[
                      { key: "greater_auricular", label: "Behind the ear - Greater Auricular Nerve" },
                      { key: "ulnar", label: "Around elbow - Ulnar nerve" },
                      { key: "radial_cutaneous", label: "Wrist - Radial cutaneous nerve" },
                      { key: "peroneal", label: "Knee - Peroneal nerve" },
                      { key: "posterior_tibial", label: "Ankle joint - Posterior tibial nerve" },
                    ].map((nerve) => (
                      <FormField
                        key={nerve.key}
                        control={form.control}
                        name={`c7_nerves_involved.${nerve.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("c7_nerves_involved") || {};
                                  form.setValue("c7_nerves_involved", { ...current, [nerve.key]: checked });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs">{nerve.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormLabel className="text-xs font-semibold mt-3 block">Signs of nerve involvement:</FormLabel>
                  <div className="grid grid-cols-1 gap-1 mt-1">
                    {[
                      { key: "thickening", label: "Definite nerve thickening (with or without tenderness)" },
                      { key: "loss_sensation", label: "Loss of sensation" },
                      { key: "weakness_hand", label: "Weakness of hand muscles" },
                      { key: "weakness_foot", label: "Weakness of foot muscles" },
                      { key: "weakness_eye", label: "Weakness of eye muscles" },
                    ].map((sign) => (
                      <FormField
                        key={sign.key}
                        control={form.control}
                        name={`c7_nerve_signs.${sign.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("c7_nerve_signs") || {};
                                  form.setValue("c7_nerve_signs", { ...current, [sign.key]: checked });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs">{sign.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* C7.3 Contractures & Deformities */}
                <div className="border-l-2 border-orange-300 pl-3">
                  <FormLabel className="text-sm font-bold text-orange-700">C7.3 Contractures & Deformities</FormLabel>
                  <p className="text-xs text-gray-600 mt-1">(Only if presented after infancy AND no history of meningitis, encephalitis, or trauma)</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {[
                      { key: "right_hand", label: "Right Hand" },
                      { key: "left_hand", label: "Left Hand" },
                      { key: "right_foot", label: "Right Foot" },
                      { key: "left_foot", label: "Left Foot" },
                      { key: "eyes", label: "Eyes" },
                      { key: "face", label: "Face" },
                    ].map((def) => (
                      <FormField
                        key={def.key}
                        control={form.control}
                        name={`c7_contractures_deformities.${def.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("c7_contractures_deformities") || {};
                                  form.setValue("c7_contractures_deformities", { ...current, [def.key]: checked });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs">{def.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Referral Rule */}
                <div className="bg-red-100 border border-red-300 p-3 rounded">
                  <p className="text-xs font-semibold text-red-700 mb-2">Referral Rule - Leprosy:</p>
                  <p className="text-xs text-red-600">
                    If ANY of the above are positive (Skin lesion, Nerve involvement, or Contracture/deformity) - REFER FOR LEPROSY
                  </p>
                </div>

                {/* Referral Facility */}
                <FormField
                  control={form.control}
                  name="c7_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-red-700">Refer to facility: *</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select referral facility" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_REFERRAL_FACILITIES.leprosy.map((facility) => (
                            <SelectItem key={facility} value={facility}>
                              {facility}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C8: Childhood Tubercular Disease */}
          <div className="space-y-3 border-l-4 border-red-400 pl-4 bg-red-50 p-4 rounded">
            <div className="flex items-start space-x-3">
              <FormField
                control={form.control}
                name="c8_suspected"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-bold text-red-700">
                        C8: Childhood Tubercular Disease - (If ANY positive - REFER)
                      </FormLabel>
                      <p className="text-xs text-red-600 mt-1">LOOK - ASK - PERFORM - Comprehensive TB screening</p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {form.watch("c8_suspected") && (
              <div className="ml-6 space-y-6 bg-white p-4 rounded border">
                {/* 8.1 Cough */}
                <div className="border-l-2 border-blue-300 pl-3">
                  <FormLabel className="text-sm font-bold text-blue-700">8.1 Pulmonary TB - Cough</FormLabel>
                  <div className="space-y-1 mt-2">
                    <FormField
                      control={form.control}
                      name="c8_cough_gt14_days"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Cough &gt; 14 days not responding to conventional antibiotics</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_cough_with_bronchodilators_failed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">And/or bronchodilators failed</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 8.2 Fever */}
                <div className="border-l-2 border-blue-300 pl-3">
                  <FormLabel className="text-sm font-bold text-blue-700">8.2 Persistent Documented Fever</FormLabel>
                  <div className="space-y-2 mt-2">
                    <FormField
                      control={form.control}
                      name="c8_persistent_fever"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Axillary temperature &gt; 37.5°C / 99.5°F</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_fever_temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Temperature (°C):</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="37.5" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_fever_duration_weeks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Duration (weeks): &gt; 2 weeks</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Weeks" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 8.3 Marked Reduction */}
                <div className="border-l-2 border-blue-300 pl-3">
                  <FormLabel className="text-sm font-bold text-blue-700">8.3 Marked Reduction in Activity (&gt;= 7 days)</FormLabel>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {[
                      { key: "c8_reduced_playfulness", label: "Playfulness" },
                      { key: "c8_reduced_daily_activity", label: "Daily activity" },
                      { key: "c8_reduced_appetite", label: "Appetite" },
                      { key: "c8_reduced_interaction", label: "Interaction with parents" },
                    ].map((item) => (
                      <FormField
                        key={item.key}
                        control={form.control}
                        name={item.key as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">{item.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormField
                    control={form.control}
                    name="c8_reduction_duration_days"
                    render={({ field }) => (
                      <FormItem className="mt-2">
                        <FormLabel className="text-xs">Duration (days): = 7 days</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Days" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* 8.4 Headache/Behavioral */}
                <div className="border-l-2 border-blue-300 pl-3">
                  <FormLabel className="text-sm font-bold text-blue-700">8.4 Headache & Behavioral Changes</FormLabel>
                  <div className="space-y-2 mt-2">
                    <FormField
                      control={form.control}
                      name="c8_recent_headache_irritability"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Recent headache and irritability</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_altered_behavior"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Altered behavior &gt; 5 days</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_altered_behavior_duration_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Duration (days):</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Days" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 8.5 Weight Loss */}
                <div className="border-l-2 border-blue-300 pl-3">
                  <FormLabel className="text-sm font-bold text-blue-700">8.5 Weight Loss &gt; 5% in past 6 months</FormLabel>
                  <div className="space-y-2 mt-2">
                    <FormField
                      control={form.control}
                      name="c8_weight_loss_gt5_percent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Weight loss &gt; 5% of highest recorded weight</FormLabel>
                        </FormItem>
                      )}
                    />
                    <div className="text-xs font-semibold mt-2">Not responding to:</div>
                    <FormField
                      control={form.control}
                      name="c8_weight_loss_not_responding_deworming"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">De-worming</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_weight_loss_not_responding_micronutrient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Micronutrient supplementation</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_weight_loss_not_responding_nutrition"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Nutritional support (SAM cases)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 8.6 Close Contact */}
                <div className="border-l-2 border-blue-300 pl-3">
                  <FormLabel className="text-sm font-bold text-blue-700">8.6 Close Contact with Known TB Case</FormLabel>
                  <div className="space-y-2 mt-2">
                    <FormField
                      control={form.control}
                      name="c8_close_contact_known_tb"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">Known contact with TB case</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_contact_relation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Relation to contact:</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Parents">Parents</SelectItem>
                              <SelectItem value="Siblings">Siblings</SelectItem>
                              <SelectItem value="Close relatives">Close relatives</SelectItem>
                              <SelectItem value="Caregivers">Caregivers</SelectItem>
                              <SelectItem value="Neighbors">Neighbors</SelectItem>
                              <SelectItem value="Teachers">Teachers</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 8.7 Immunocompromised */}
                <div className="border-l-2 border-blue-300 pl-3">
                  <FormLabel className="text-sm font-bold text-blue-700">8.7 Immunocompromised History</FormLabel>
                  <div className="space-y-1 mt-2">
                    <FormField
                      control={form.control}
                      name="c8_measles_varicella_3mo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">History of measles/varicella in last 3 months</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="c8_steroids_chemotherapy_1mo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs">On steroids/chemotherapy &gt; 1 month</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Extra-Pulmonary TB Screening */}
                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-300">
                  <FormLabel className="text-sm font-bold text-blue-700">Extra-Pulmonary TB Screening</FormLabel>

                  {/* 8.8 Abdominal */}
                  <div className="mt-3">
                    <FormLabel className="text-xs font-semibold">8.8 Abdominal TB:</FormLabel>
                    <div className="grid grid-cols-1 gap-1 mt-1">
                      {[
                        { key: "c8_abdominal_pain_dull_aching", label: "Dull aching abdominal pain" },
                        { key: "c8_abdominal_swelling", label: "Abdominal swelling" },
                        { key: "c8_painless_abdominal_mass", label: "Painless abdominal mass" },
                        { key: "c8_hepatomegaly", label: "Hepatomegaly" },
                        { key: "c8_splenomegaly", label: "Splenomegaly" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={item.key as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 8.9 Lymph Nodes */}
                  <div className="mt-3">
                    <FormLabel className="text-xs font-semibold">8.9 TB Lymph Nodes:</FormLabel>
                    <div className="space-y-1 mt-1">
                      <FormField
                        control={form.control}
                        name="c8_lymph_node_swelling_painless"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Gradually increasing painless lymph node swelling</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="c8_lymph_node_not_responding_antibiotics"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Not responding to antibiotics after 2 weeks</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="text-xs font-semibold mt-2">Node characteristics:</div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {[
                        { key: "single_discrete", label: "Single discrete node" },
                        { key: "multiple_matted", label: "Multiple matted nodes" },
                        { key: "non_tender_painless", label: "Non-tender & painless" },
                        { key: "discharging_sinus", label: "Discharging sinus" },
                      ].map((char) => (
                        <FormField
                          key={char.key}
                          control={form.control}
                          name={`c8_lymph_node_characteristics.${char.key}` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    const current = form.getValues("c8_lymph_node_characteristics") || {};
                                    form.setValue("c8_lymph_node_characteristics", { ...current, [char.key]: checked });
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs">{char.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 8.10 Spine */}
                  <div className="mt-3">
                    <FormLabel className="text-xs font-semibold">8.10 TB Spine:</FormLabel>
                    <div className="grid grid-cols-1 gap-1 mt-1">
                      {[
                        { key: "c8_spine_pain_stiffness", label: "Persistent back pain & stiffness" },
                        { key: "c8_spinal_deformity", label: "Spinal deformity" },
                        { key: "c8_cold_abscess", label: "Cold abscess" },
                        { key: "c8_night_cries_typical", label: "Typical night cries" },
                        { key: "c8_kyphotic_deformity", label: "Localized kyphotic deformity" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={item.key as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 8.11 CNS TB */}
                  <div className="mt-3">
                    <FormLabel className="text-xs font-semibold">8.11 CNS TB (Consider Neuro TB if ANY present):</FormLabel>
                    <div className="grid grid-cols-1 gap-1 mt-1">
                      {[
                        { key: "c8_altered_consciousness", label: "Altered level of consciousness" },
                        { key: "c8_convulsions_no_fever", label: "Convulsions without fever" },
                        { key: "c8_vomiting_no_diarrhea", label: "Vomiting without diarrhea" },
                        { key: "c8_focal_neuro_deficit", label: "Recent focal neurological deficit" },
                        { key: "c8_abnormal_movements", label: "Abnormal movements (within 1 month)" },
                        { key: "c8_cranial_nerve_palsy", label: "Cranial nerve palsy (sudden squint, facial asymmetry)" },
                        { key: "c8_neck_stiffness_rigidity", label: "Neck stiffness / neck rigidity" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={item.key as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 8.12 Severe Respiratory Disease */}
                  <div className="mt-3">
                    <FormLabel className="text-xs font-semibold">8.12 Severe Respiratory Disease:</FormLabel>
                    <div className="grid grid-cols-1 gap-1 mt-1">
                      {[
                        { key: "c8_respiratory_distress", label: "Respiratory distress" },
                        { key: "c8_difficulty_breathing", label: "Difficulty in breathing" },
                        { key: "c8_persistent_cough_2weeks", label: "Persistent cough &gt;= 2 weeks" },
                        { key: "c8_increased_respiratory_rate", label: "Increased respiratory rate (&gt;30/min)" },
                        { key: "c8_difficult_pneumonia", label: "Difficult-to-treat pneumonia" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={item.key as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 8.13 Bone & Joint TB */}
                  <div className="mt-3">
                    <FormLabel className="text-xs font-semibold">8.13 Bone & Joint TB:</FormLabel>
                    <div className="grid grid-cols-1 gap-1 mt-1">
                      {[
                        { key: "c8_limping_recent_onset", label: "Recent onset limping" },
                        { key: "c8_joint_pain_swelling", label: "Painful joint swelling" },
                        { key: "c8_bone_joint_night_cry", label: "Night cry" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={item.key as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Referral Rule */}
                <div className="bg-red-100 border border-red-300 p-3 rounded">
                  <p className="text-xs font-semibold text-red-700 mb-2">Referral Rule - Tuberculosis:</p>
                  <p className="text-xs text-red-600">
                    If ANY of the above findings are present - REFER FOR TB SCREENING/DIAGNOSIS
                  </p>
                </div>

                {/* Referral Facility */}
                <FormField
                  control={form.control}
                  name="c8_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-red-700">Refer to facility: *</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select referral facility" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_REFERRAL_FACILITIES.tuberculosis.map((facility) => (
                            <SelectItem key={facility} value={facility}>
                              {facility}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* C9: Sickle Cell Anaemia */}
          <div className="space-y-3 border-l-4 border-red-300 pl-4">
            <FormField
              control={form.control}
              name="c9_suspected"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="text-sm font-bold text-red-700">
                      C9: Sickle Cell Anaemia - (If suspected - REFER)
                    </FormLabel>
                    <p className="text-xs text-red-600 mt-1">Screening for sickle cell disease and hemoglobin variants</p>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("c9_suspected") && (
              <div className="ml-6 space-y-6 bg-white p-4 rounded border">
                {/* C9.1 Clinical Features */}
                <div className="border-l-2 border-red-300 pl-3">
                  <FormLabel className="text-sm font-bold text-red-700">9.1 Clinical Features</FormLabel>
                  <p className="text-xs text-gray-600 mt-1">Check all signs/symptoms present:</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { key: "pain_crisis", label: "Vaso-occlusive pain crisis" },
                      { key: "swelling_hands_feet", label: "Hand-foot swelling (dactylitis)" },
                      { key: "shortness_breath", label: "Shortness of breath (acute chest syndrome)" },
                      { key: "fatigue", label: "Severe fatigue/lethargy" },
                      { key: "jaundice", label: "Jaundice (yellowing)" },
                      { key: "delayed_growth", label: "Delayed growth/development" },
                      { key: "severe_infections", label: "Recurrent severe infections" },
                    ].map((feature) => (
                      <FormField
                        key={feature.key}
                        control={form.control}
                        name={`c9_clinical_features.${feature.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("c9_clinical_features") || {};
                                  form.setValue("c9_clinical_features", { ...current, [feature.key]: checked });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs">{feature.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* C9.2 Hemoglobin Type Classification */}
                <div className="border-l-2 border-red-300 pl-3">
                  <FormLabel className="text-sm font-bold text-red-700">9.2 Hemoglobin Type Classification</FormLabel>
                  <p className="text-xs text-gray-600 mt-1">If sickle cell anaemia confirmed by tests, select type:</p>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {[
                      { key: "hbss", label: "Hemoglobin SS (HbSS) - Sickle Cell Disease" },
                      { key: "hbsc", label: "Hemoglobin SC (HbSC) - SC Disease" },
                      { key: "hbs_beta_thalassemia", label: "Hemoglobin S Beta-Thalassemia (HbS/β-Thalassemia)" },
                      { key: "hbsd", label: "Rare Forms: Hemoglobin SD (HbSD)" },
                      { key: "hbse", label: "Rare Forms: Hemoglobin SE (HbSE)" },
                    ].map((type) => (
                      <FormField
                        key={type.key}
                        control={form.control}
                        name={`c9_hemoglobin_type.${type.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("c9_hemoglobin_type") || {};
                                  form.setValue("c9_hemoglobin_type", { ...current, [type.key]: checked });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs">{type.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Note about referral */}
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-xs text-red-700">
                    <strong>Important:</strong> All children with confirmed sickle cell disease should be referred for specialized hematology care, genetic counseling, and comprehensive disease management.
                  </p>
                </div>

                {/* Referral Facility */}
                <FormField
                  control={form.control}
                  name="c9_referral_facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-red-700">Refer to facility: *</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select referral facility" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Medical College/Teaching Hospital", "District Hospital - Hemato-oncology", "Tertiary Care Center - Pediatric Hematology", "Blood Bank/Hemophilia Center", "PHC/CHC", "Pediatrician"].map((facility) => (
                            <SelectItem key={facility} value={facility}>
                              {facility}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Summary checkboxes for Section C */
}
          <div className="mt-4 pt-4 border-t">
            <FormLabel className="text-sm font-semibold">Summary of Findings - Diseases</FormLabel>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { key: "summary_disease_skin_conditions", label: "Skin conditions (non-leprosy)" },
                { key: "summary_disease_vision_impairment", label: "Vision impairment" },
                { key: "summary_disease_hearing_impairment", label: "Hearing impairment" },
                { key: "summary_disease_dental", label: "Dental issues" },
                { key: "summary_disease_reactive_airway", label: "Reactive airway disease" },
                { key: "summary_disease_heart", label: "Heart disease" },
                { key: "summary_disease_convulsive", label: "Convulsive disorders" },
                { key: "summary_disease_neuro_motor", label: "Neuro-motor impairments" },
                { key: "summary_disease_cognitive_delay", label: "Cognitive delay" },
                { key: "summary_disease_motor_delay", label: "Motor delay" },
                { key: "summary_disease_speech_delay", label: "Speech/language delay" },
                { key: "summary_disease_behavioral_disorder", label: "Behavioral disorder (Autism/ADHD)" },
                { key: "summary_disease_tuberculosis", label: "Tuberculosis (Pulmonary/Extra-pulmonary)" },
                { key: "summary_disease_leprosy", label: "Leprosy" },
                { key: "summary_disease_sickle_cell_anaemia", label: "Sickle Cell Anaemia" },
              ].map((item) => (
                <FormField
                  key={item.key}
                  control={form.control}
                  name={item.key as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs">{item.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="summary_disease_other"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel className="text-xs">Other</FormLabel>
                  <FormControl>
                    <Input placeholder="Specify other diseases" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section D: Developmental Delay including Disability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">D. Developmental Delay including Disability (If YES, Refer)</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            For each: ? YES ? NO; if YES, Refer � record facility
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { key: "d1_seeing_difficulty", label: "D1: Difficulty seeing", facility: "d1_referral_facility" },
            { key: "d2_walking_delay", label: "D2: Delay in walking compared to peers", facility: "d2_referral_facility" },
            { key: "d3_reading_writing", label: "D3: Difficulty reading/writing/simple calculations", facility: "d3_referral_facility" },
            { key: "d4_muscle_stiffness", label: "D4: Muscle stiffness/floppiness, uncontrolled jerks", facility: "d4_referral_facility" },
            { key: "d5_hearing_difficulty", label: "D5: Difficulty with hearing", facility: "d5_referral_facility" },
            { key: "d6_speech_difficulty", label: "D6: Speech difficulty", facility: "d6_referral_facility" },
            { key: "d7_learning_difficulty", label: "D7: Learning new things difficulty", facility: "d7_referral_facility" },
            { key: "d8_inattention_hyperactivity", label: "D8: Inattention/hyperactivity", facility: "d8_referral_facility" },
            { key: "d9_behavioral_concerns", label: "D9: Behavioral concerns", facility: "d9_referral_facility" },
          ].map((item) => (
            <div key={item.key} className="space-y-3 border-l-4 border-purple-300 pl-4">
              <FormField
                control={form.control}
                name={item.key as any}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">
                      {item.label}
                    </FormLabel>
                  </FormItem>
                )}
              />
              {form.watch(item.key as any) && (
                <div className="ml-6">
                  <FormField
                    control={form.control}
                    name={item.facility as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-red-600">
                          Referral Facility *
                        </FormLabel>
                        <FormControl>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select referral facility" />
                            </SelectTrigger>
                            <SelectContent>
                              {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                <SelectItem key={key} value={key}>
                                  {REFERRAL_FACILITIES[key]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section E: Adolescent-Specific Questionnaire (10�18 Years) */}
      {showAdolescentSection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">E. Adolescent-Specific Questionnaire (10�18 Years)</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Ask only after ensuring privacy. For each below: ? YES ? NO. If YES ? Auto-flag for referral and capture referral facility.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* E1 */}
            <div className="space-y-3 border-l-4 border-orange-300 pl-4">
              <FormField
                control={form.control}
                name="e1_life_events_difficulty"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">
                        E1: Difficulty managing life events (emotional/psychological distress)
                      </FormLabel>
                      {field.value && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name="e1_referral_suggested"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-red-600">
                                  If YES, refer to:
                                </FormLabel>
                                <Select {...field} defaultValue="">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select referral destination" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AFHC">AFHC</SelectItem>
                                    <SelectItem value="DEIC">DEIC</SelectItem>
                                    <SelectItem value="Mental Health Professional">Mental Health Professional</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e1_referral_facility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Facility:</FormLabel>
                                <FormControl>
                                    <Select value={field.value || ""} onValueChange={field.onChange}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select referral facility" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                          <SelectItem key={key} value={key}>
                                            {REFERRAL_FACILITIES[key]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e1_referral_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Date referred:</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* E2 */}
            <div className="space-y-3 border-l-4 border-orange-300 pl-4">
              <FormField
                control={form.control}
                name="e2_peer_pressure_substance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">
                        E2: Peer pressure to smoke/drink
                      </FormLabel>
                      {field.value && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name="e2_referral_suggested"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-red-600">
                                  If YES, refer to:
                                </FormLabel>
                                <Select {...field} defaultValue="">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select referral destination" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AFHC">AFHC</SelectItem>
                                    <SelectItem value="Counselling services">Counselling services</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e2_referral_facility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Facility:</FormLabel>
                                <FormControl>
                                  <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select referral facility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                        <SelectItem key={key} value={key}>
                                          {REFERRAL_FACILITIES[key]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e2_referral_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Date referred:</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* E3 */}
            <div className="space-y-3 border-l-4 border-orange-300 pl-4">
              <FormField
                control={form.control}
                name="e3_persistent_sadness"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">
                        E3: Persistent sadness/fatigue (possible depression)
                      </FormLabel>
                      {field.value && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name="e3_referral_suggested"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-red-600">
                                  If YES, refer to:
                                </FormLabel>
                                <Select {...field} defaultValue="">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select referral destination" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AFHC">AFHC</SelectItem>
                                    <SelectItem value="Mental Health Professional">Mental Health Professional</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e3_referral_facility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Facility:</FormLabel>
                                <FormControl>
                                  <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select referral facility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                        <SelectItem key={key} value={key}>
                                          {REFERRAL_FACILITIES[key]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e3_referral_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Date referred:</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* E4: Female-only */}
            {isFemale && (
              <div className="space-y-3 border-l-4 border-pink-300 pl-4">
                <FormField
                  control={form.control}
                  name="e4_menstruation_started"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="text-sm">
                          E4: Menstruation started? (female only)
                        </FormLabel>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name="e4_referral_suggested"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-red-600">
                                  If female & not started by 16 yrs ? refer.
                                </FormLabel>
                                <Select {...field} defaultValue="">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select referral destination" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AFHC">AFHC</SelectItem>
                                    <SelectItem value="DEIC">DEIC</SelectItem>
                                    <SelectItem value="Gynaecologist">Gynaecologist</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e4_referral_facility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Facility:</FormLabel>
                                <FormControl>
                                  <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select referral facility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                        <SelectItem key={key} value={key}>
                                          {REFERRAL_FACILITIES[key]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e4_referral_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Date referred:</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* E5 */}
            <div className="space-y-3 border-l-4 border-orange-300 pl-4">
              <FormField
                control={form.control}
                name="e5_pain_urination"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">
                        E5: Pain/burning while urinating
                      </FormLabel>
                      {field.value && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name="e5_referral_suggested"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-red-600">
                                  If YES, refer to:
                                </FormLabel>
                                <Select {...field} defaultValue="">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select referral destination" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PHC">PHC</SelectItem>
                                    <SelectItem value="CHC">CHC</SelectItem>
                                    <SelectItem value="Urology/AFHC">Urology/AFHC</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e5_referral_facility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Facility:</FormLabel>
                                <FormControl>
                                  <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select referral facility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                        <SelectItem key={key} value={key}>
                                          {REFERRAL_FACILITIES[key]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e5_referral_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Date referred:</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* E6 */}
            <div className="space-y-3 border-l-4 border-orange-300 pl-4">
              <FormField
                control={form.control}
                name="e6_foul_discharge"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">
                        E6: Foul-smelling discharge (genital/urinary)
                      </FormLabel>
                      {field.value && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name="e6_referral_suggested"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-red-600">
                                  If YES, refer to:
                                </FormLabel>
                                <Select {...field} defaultValue="">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select referral destination" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PHC">PHC</SelectItem>
                                    <SelectItem value="AFHC">AFHC</SelectItem>
                                    <SelectItem value="Gyne/STD clinic">Gyne/STD clinic</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e6_referral_facility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Facility:</FormLabel>
                                <FormControl>
                                  <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select referral facility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                        <SelectItem key={key} value={key}>
                                          {REFERRAL_FACILITIES[key]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="e6_referral_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Date referred:</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* E7: Female-only */}
            {isFemale && (
              <div className="space-y-3 border-l-4 border-pink-300 pl-4">
                <FormField
                  control={form.control}
                  name="e7_severe_menstrual_pain"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="text-sm">
                          E7: Severe pain during menstruation interfering with activities (female only)
                        </FormLabel>
                        {field.value && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <FormField
                              control={form.control}
                              name="e7_referral_suggested"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold text-red-600">
                                    If YES, refer to:
                                  </FormLabel>
                                  <Select {...field} defaultValue="">
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select referral destination" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AFHC">AFHC</SelectItem>
                                      <SelectItem value="Gynaecologist">Gynaecologist</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="e7_referral_facility"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Facility:</FormLabel>
                                  <FormControl>
                                    <Select value={field.value || ""} onValueChange={field.onChange}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select referral facility" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {REFERRAL_FACILITY_OPTIONS.map((key) => (
                                          <SelectItem key={key} value={key}>
                                            {REFERRAL_FACILITIES[key]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="e7_referral_date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Date referred:</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Detailed Menstrual Cycle Tracking for Adolescent Females */}
            {isFemale && showAdolescentSection && canViewMenstrualHealth && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg text-pink-700">Detailed Menstrual Cycle Tracking</CardTitle>
                  <p className="text-sm text-gray-600">Comprehensive tracking for adolescent female health concerns</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="menstrual_cycle_regular"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm">Regular menstrual cycle</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="menstrual_cycle_length_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Cycle length (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="21-35"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="menstrual_period_duration_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Period duration (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="3-7"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="menstrual_last_period_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Last period date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel className="text-sm font-semibold">Irregularities observed:</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { key: "missed_periods", label: "Missed periods" },
                        { key: "heavy_bleeding", label: "Heavy bleeding" },
                        { key: "spotting", label: "Spotting between periods" },
                        { key: "prolonged_bleeding", label: "Prolonged bleeding" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={`menstrual_irregularities.${item.key}` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    const current = form.getValues("menstrual_irregularities") || {};
                                    form.setValue("menstrual_irregularities", {
                                      ...current,
                                      [item.key]: checked
                                    });
                                    field.onChange(checked);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormField
                      control={form.control}
                      name="menstrual_irregularities.other"
                      render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel className="text-xs">Other irregularities:</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify other irregularities" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel className="text-sm font-semibold">Associated symptoms:</FormLabel>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { key: "cramps", label: "Cramps" },
                        { key: "headache", label: "Headache" },
                        { key: "nausea", label: "Nausea" },
                        { key: "fatigue", label: "Fatigue" },
                        { key: "mood_changes", label: "Mood changes" },
                        { key: "back_pain", label: "Back pain" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={`menstrual_symptoms.${item.key}` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("menstrual_symptoms") || {};
                                  form.setValue("menstrual_symptoms", {
                                    ...current,
                                    [item.key]: checked
                                  });
                                  field.onChange(checked);
                                }}
                              />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormField
                      control={form.control}
                      name="menstrual_symptoms.other"
                      render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel className="text-xs">Other symptoms:</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify other symptoms" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel className="text-sm font-semibold">Hygiene practices:</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { key: "sanitary_pads", label: "Sanitary pads" },
                        { key: "tampons", label: "Tampons" },
                        { key: "menstrual_cup", label: "Menstrual cup" },
                        { key: "cloth", label: "Cloth" },
                        { key: "adequate_facilities", label: "Adequate facilities" },
                        { key: "privacy_concerns", label: "Privacy concerns" },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          control={form.control}
                          name={`menstrual_hygiene_practices.${item.key}` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues("menstrual_hygiene_practices") || {};
                                  form.setValue("menstrual_hygiene_practices", {
                                    ...current,
                                    [item.key]: checked
                                  });
                                  field.onChange(checked);
                                }}
                              />
                              </FormControl>
                              <FormLabel className="text-xs">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="menstrual_educational_resources_accessed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm">Educational resources accessed</FormLabel>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Summary checkboxes for Section E */}
            <div className="mt-4 pt-4 border-t">
              <FormLabel className="text-sm font-semibold">Summary of Findings - Adolescent Health Concerns</FormLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { key: "summary_adolescent_menstrual_issues", label: "Menstrual issues" },
                  { key: "summary_adolescent_substance_use", label: "Substance use" },
                  { key: "summary_adolescent_depressed", label: "Feeling depressed" },
                  { key: "summary_adolescent_burning_urination", label: "Burning urination" },
                  { key: "summary_adolescent_discharge", label: "Discharge (GU tract)" },
                ].map((item) => (
                  <FormField
                    key={item.key}
                    control={form.control}
                    name={item.key as any}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">{item.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormField
                control={form.control}
                name="summary_adolescent_other"
                render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormLabel className="text-xs">Other</FormLabel>
                    <FormControl>
                      <Input placeholder="Specify other adolescent health concerns" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary of Findings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary of Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <FormLabel className="text-sm font-semibold">Defects at Birth</FormLabel>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { key: "summary_defects_neural_tube", label: "Neural tube defect" },
                { key: "summary_defects_down_syndrome", label: "Down syndrome" },
                { key: "summary_defects_cleft", label: "Cleft lip/palate" },
                { key: "summary_defects_talipes", label: "Talipes" },
                { key: "summary_defects_hip_dysplasia", label: "Developmental dysplasia of hip" },
                { key: "summary_defects_congenital_deafness", label: "Congenital deafness" },
              ].map((item) => (
                <FormField
                  key={item.key}
                  control={form.control}
                  name={item.key as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs">{item.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <FormLabel className="text-sm font-semibold">Deficiencies</FormLabel>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { key: "summary_deficiency_anemia", label: "Anemia" },
                { key: "summary_deficiency_vitamin_a", label: "Vitamin A def." },
                { key: "summary_deficiency_vitamin_d", label: "Vitamin D def." },
                { key: "summary_deficiency_sam_stunting", label: "SAM/Stunting" },
                { key: "summary_deficiency_goitre", label: "Goitre" },
                { key: "summary_deficiency_vitamin_b", label: "Vitamin B complex def." },
              ].map((item) => (
                <FormField
                  key={item.key}
                  control={form.control}
                  name={item.key as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs">{item.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <FormLabel className="text-sm font-semibold">Diseases</FormLabel>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { key: "summary_disease_skin_conditions", label: "Skin conditions (non-leprosy)" },
                { key: "summary_disease_vision_impairment", label: "Vision impairment" },
                { key: "summary_disease_hearing_impairment", label: "Hearing impairment" },
                { key: "summary_disease_dental", label: "Dental issues" },
                { key: "summary_disease_reactive_airway", label: "Reactive airway disease" },
                { key: "summary_disease_heart", label: "Heart disease" },
                { key: "summary_disease_convulsive", label: "Convulsive disorders" },
                { key: "summary_disease_neuro_motor", label: "Neuro-motor impairments" },
                { key: "summary_disease_cognitive_delay", label: "Cognitive delay" },
                { key: "summary_disease_motor_delay", label: "Motor delay" },
                { key: "summary_disease_speech_delay", label: "Speech/language delay" },
                { key: "summary_disease_behavioral_disorder", label: "Behavioral disorder (Autism/ADHD)" },
                { key: "summary_disease_tuberculosis", label: "Tuberculosis (Pulmonary/Extra-pulmonary)" },
                { key: "summary_disease_leprosy", label: "Leprosy" },
              ].map((item) => (
                <FormField
                  key={item.key}
                  control={form.control}
                  name={item.key as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs">{item.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          {showAdolescentSection && (
            <div>
              <FormLabel className="text-sm font-semibold">Adolescent Health Concerns</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { key: "summary_adolescent_menstrual_issues", label: "Menstrual issues" },
                  { key: "summary_adolescent_substance_use", label: "Substance use" },
                  { key: "summary_adolescent_depressed", label: "Feeling depressed" },
                  { key: "summary_adolescent_burning_urination", label: "Burning urination" },
                  { key: "summary_adolescent_discharge", label: "Discharge (GU tract)" },
                ].map((item) => (
                  <FormField
                    key={item.key}
                    control={form.control}
                    name={item.key as any}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-xs">{item.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Summary (final) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referral Summary (final)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4 font-semibold text-sm border-b pb-2">
            <div>Category</div>
            <div className="text-center">Yes</div>
            <div className="text-center">No</div>
            <div>Referred to (Facility & Date)</div>
          </div>
          
          {[
            { category: "Defect at Birth", yesField: "a1_visible_defect", facilityField: "a1_referral_facility", defaultFacility: "DH/DEIC" },
            { category: "Deficiency", yesField: "deficiency_any", facilityField: "deficiency_facility", defaultFacility: "PHC/CHC/DH" },
            { category: "Disease", yesField: "disease_any", facilityField: "disease_facility", defaultFacility: "PHC/CHC/DH/DEIC" },
            { category: "Leprosy", yesField: "c7_suspected", facilityField: "c7_referral_facility", defaultFacility: "PHC/CHC/DH/Leprosy Clinic" },
            { category: "TB", yesField: "c8_suspected", facilityField: "c8_referral_facility", defaultFacility: "PHC/DOTS centre/DH" },
            { category: "Sickle Cell Anaemia", yesField: "c9_suspected", facilityField: "c9_referral_facility", defaultFacility: "Medical College/District Hospital" },
            { category: "Developmental Delay", yesField: "developmental_any", facilityField: "developmental_facility", defaultFacility: "DEIC" },
            { category: "Adolescent Health Concern", yesField: "adolescent_any", facilityField: "adolescent_facility", defaultFacility: "CHC/AFHC/Mental Health" },
          ].map((item) => (
            <div key={item.category} className="grid grid-cols-4 gap-4 items-center text-sm py-2 border-b">
              <div>{item.category}</div>
              <div className="text-center">
                <FormField
                  control={form.control}
                  name={item.yesField as any}
                  render={({ field }) => (
                    <FormItem className="flex justify-center">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="text-center">
                <FormField
                  control={form.control}
                  name={item.yesField as any}
                  render={({ field }) => (
                    <FormItem className="flex justify-center">
                      <FormControl>
                        <Checkbox
                          checked={!field.value}
                          onCheckedChange={(checked) => field.onChange(!checked)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name={item.facilityField as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={item.defaultFacility} />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_FACILITY_OPTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {REFERRAL_FACILITIES[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <FormField
              control={form.control}
              name="doctor_mht_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Name of Doctor (MHT):</FormLabel>
                  <FormControl>
                    <Input placeholder="Doctor/MHT name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date_of_visit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Date of Visit:</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center space-x-4 pt-4">
            <FormField
              control={form.control}
              name="data_entry_register"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm">Data entered in Register</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


