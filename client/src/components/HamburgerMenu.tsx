import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AboutModal } from "./AboutModal";
import { PlatformStatsCompact } from "./PlatformStatsCompact";

export function HamburgerMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const handleAboutClick = () => {
    setIsMenuOpen(false);
    setIsAboutModalOpen(true);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Menu"
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <X className="h-5 w-5 text-gray-700" />
          ) : (
            <Menu className="h-5 w-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Menu Dropdown */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          
          {/* Menu Panel */}
          <div className="fixed top-16 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[280px] max-w-[calc(100vw-2rem)] sm:max-w-none">
            {/* Menu Items */}
            <div className="flex flex-col py-2" role="menu">
              <button
                onClick={handleAboutClick}
                className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                role="menuitem"
              >
                About SwasthyaTrack
              </button>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                role="menuitem"
              >
                Disclaimer
              </button>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                role="menuitem"
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                role="menuitem"
              >
                Contact Information
              </button>
            </div>
            
            {/* Platform Statistics Section */}
            <PlatformStatsCompact />
          </div>
        </>
      )}

      {/* About Modal */}
      <AboutModal 
        isOpen={isAboutModalOpen} 
        onClose={() => setIsAboutModalOpen(false)} 
      />
    </>
  );
}