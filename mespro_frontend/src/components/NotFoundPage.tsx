import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

/**
 * 404 Not Found page — shown when a user navigates to a module
 * that doesn't exist or isn't enabled for their business.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-800">404</h1>
          <h2 className="text-xl font-semibold text-gray-600">Page Not Found</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            The page you are looking for doesn't exist or you don't have access to it.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
