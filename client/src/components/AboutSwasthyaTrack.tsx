import { motion } from "framer-motion";
import { ModuleCard } from "./ModuleCard";
import { getCurrentYear } from "@/lib/dateUtils";

const modules = [
  {
    moduleNumber: 1,
    title: "Student Health Profile Module",
    description: "Digital health records including height, weight, BMI, checkup history, and health indicators.",
    icon: "👤"
  },
  {
    moduleNumber: 2,
    title: "Periodic Health Checkup Tracking",
    description: "Monthly and yearly health checkups with growth trend tracking and anomaly detection.",
    icon: "📋"
  },
  {
    moduleNumber: 3,
    title: "Nutrition & Meal Monitoring",
    description: "Daily meal intake tracking and nutrition compliance for government schemes.",
    icon: "🍽️"
  },
  {
    moduleNumber: 4,
    title: "Menstrual Health Monitoring",
    description: "Tracks menstruation patterns for adolescent girls and identifies late or irregular cycles (privacy-safe and aggregated).",
    icon: "🩺"
  },
  {
    moduleNumber: 5,
    title: "Referral & Follow-Up Management",
    description: "Manages referrals (C7 Nutrition, C8 Special Needs, C9 Blood Disorders) and follow-up status.",
    icon: "🔄"
  },
  {
    moduleNumber: 6,
    title: "School Dashboard",
    description: "School-wise summaries with class-level statistics and alerts.",
    icon: "🏫"
  },
  {
    moduleNumber: 7,
    title: "Project Officer (PO) Dashboard",
    description: "District/block-level analytics, trends, and heatmap insights.",
    icon: "📊"
  },
  {
    moduleNumber: 8,
    title: "Medical Team Dashboard",
    description: "Daily checkups, findings, treatments, referral load, and common health issues.",
    icon: "⚕️"
  },
  {
    moduleNumber: 9,
    title: "Reports & Data Export",
    description: "Print-ready reports in government-approved formats.",
    icon: "📄"
  },
  {
    moduleNumber: 10,
    title: "Role-Based Access System",
    description: "Secure access for Admin, Headmaster, Teacher, PO, and Medical Staff with role-based visibility.",
    icon: "🔐"
  }
];

export function AboutSwasthyaTrack() {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">About SwasthyaTrack</h1>
          <p className="text-lg text-gray-600">A School Health Monitoring & Wellness Tracking System</p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* About Description Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">About the System</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                SwasthyaTrack is a comprehensive digital health monitoring and wellness tracking system 
                developed by the SwasthyaTrack Team for educational institutions. The system serves as 
                a centralized platform for managing student health records, conducting periodic health 
                assessments, and ensuring compliance with government health and nutrition schemes.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                The platform is designed to streamline health data collection, analysis, and reporting 
                processes while maintaining the highest standards of data privacy and security. It enables 
                educational administrators, medical professionals, and government officials to make 
                informed decisions regarding student health and wellness programs.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Target beneficiaries include students across all educational levels, school administrators, 
                health and medical teams, project officers, and government stakeholders involved in 
                educational health initiatives.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Key Modules Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Key Modules and Functional Components of SwasthyaTrack
            </h2>
            <p className="text-gray-600">
              The system comprises the following integrated modules designed for comprehensive health monitoring:
            </p>
          </div>
          
          <div className="grid gap-6">
            {modules.map((module, index) => (
              <ModuleCard
                key={module.moduleNumber}
                moduleNumber={module.moduleNumber}
                title={module.title}
                description={module.description}
                icon={module.icon}
                index={index}
              />
            ))}
          </div>
        </motion.section>

        {/* Official Information Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Official Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Project Name</dt>
                    <dd className="text-lg text-gray-900">SwasthyaTrack</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Implementing Team</dt>
                    <dd className="text-lg text-gray-900">SwasthyaTrack Team</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Academic Year</dt>
                    <dd className="text-lg text-gray-900">{getCurrentYear()}-{getCurrentYear() + 1}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                    <dd className="text-lg text-gray-900">
                      <a href="mailto:SwasthyaTrack@gmail.com" className="text-blue-600 hover:text-blue-800">
                        swasthyatrack@gmail.com
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Official Website</dt>
                    <dd className="text-lg text-gray-900">
                      <a href="#" className="text-blue-600 hover:text-blue-800">
                        https://swasthyatrack.up.railway.app/login
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">GitHub Repository</dt>
                    <dd className="text-lg text-gray-900">
                      <a href="#" className="text-blue-600 hover:text-blue-800">
                        https://github.com/memaitri/SwasthyaTrack-platform
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Footer Info Bar */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="bg-white border-t border-gray-200 mt-12"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
              Last Updated: {currentDate}
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-500 hover:text-gray-700">Disclaimer</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}