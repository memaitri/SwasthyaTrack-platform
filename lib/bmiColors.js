"use strict";
/**
 * BMI classification utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBMIClassification = getBMIClassification;
exports.getBMIClassificationLabel = getBMIClassificationLabel;
exports.getBMIColor = getBMIColor;
exports.getBMIBgColor = getBMIBgColor;
function getBMIClassification(bmi) {
    if (bmi < 18.5)
        return "underweight";
    if (bmi < 25)
        return "normal";
    if (bmi < 30)
        return "overweight";
    return "obese";
}
function getBMIClassificationLabel(bmi) {
    const classification = getBMIClassification(bmi);
    return classification.charAt(0).toUpperCase() + classification.slice(1);
}
function getBMIColor(bmi) {
    const classification = getBMIClassification(bmi);
    switch (classification) {
        case "underweight":
            return "#3b82f6"; // blue
        case "normal":
            return "#10b981"; // green
        case "overweight":
            return "#f59e0b"; // yellow
        case "obese":
            return "#ef4444"; // red
        default:
            return "#6b7280"; // gray
    }
}
function getBMIBgColor(bmi) {
    const classification = getBMIClassification(bmi);
    switch (classification) {
        case "underweight":
            return "#dbeafe"; // blue bg
        case "normal":
            return "#d1fae5"; // green bg
        case "overweight":
            return "#fef3c7"; // yellow bg
        case "obese":
            return "#fee2e2"; // red bg
        default:
            return "#f3f4f6"; // gray bg
    }
}
