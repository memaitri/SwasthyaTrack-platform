import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { AboutSwasthyaTrack } from "./AboutSwasthyaTrack";

export function AboutSwasthyaTrackCompact() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Compact About Button */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 group"
          title="About SwasthyaTrack"
        >
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">SwasthyaTrack</div>
              <div className="text-xs text-gray-500">Health Monitoring System</div>
              <div className="text-xs text-blue-600 group-hover:underline">Learn More →</div>
            </div>
          </div>
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal Content */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                  title="Close"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[90vh]">
                  <AboutSwasthyaTrack />
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}