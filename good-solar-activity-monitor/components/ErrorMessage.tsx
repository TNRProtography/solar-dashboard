
import React from 'react';

interface ErrorMessageProps {
  message: string | null;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="bg-red-700 bg-opacity-50 text-red-100 p-3 rounded-md border border-red-600 my-4">
      <p><span className="font-semibold">Error:</span> {message}</p>
    </div>
  );
};
