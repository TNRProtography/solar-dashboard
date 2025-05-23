
import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  helpText?: React.ReactNode; // Can be string or JSX for formatted help
}

export const Section: React.FC<SectionProps> = ({ title, children, className = '', helpText }) => {
  return (
    <section className={`bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl ${className}`}>
      <div className="flex items-center mb-4 pb-2 border-b border-gray-700">
        <h2 className="text-2xl font-semibold text-blue-400">{title}</h2>
        {helpText && (
          <div className="relative ml-2 group flex items-center">
            <span 
              className="cursor-help text-blue-400 hover:text-blue-300"
              aria-label="Help information for this section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
            </span>
            <div 
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 sm:w-80 md:w-96 
                         bg-gray-700 text-gray-200 text-xs p-3 rounded-md shadow-lg 
                         opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50
                         pointer-events-none group-hover:pointer-events-auto" // Allow interaction with tooltip content if needed in future
              role="tooltip"
            >
              {helpText}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0
                              border-x-8 border-x-transparent
                              border-t-8 border-t-gray-700"></div>
            </div>
          </div>
        )}
      </div>
      {children}
    </section>
  );
};
