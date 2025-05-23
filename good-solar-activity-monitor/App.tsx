
import React from 'react';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 selection:bg-blue-500 selection:text-white">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-yellow-400">Solar Activity Monitor</h1>
        <p className="text-gray-400">Tracking the Sun's Temperament</p>
      </header>
      <Dashboard />
      <footer className="text-center mt-12 py-4 border-t border-gray-700">
        <p className="text-sm text-gray-500">Data sourced from NASA DONKI and NOAA SWPC. For informational purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
