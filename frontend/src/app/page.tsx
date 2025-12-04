'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRegionStore } from '@/store/region';
import dynamic from 'next/dynamic';
import AuthPanel from '@/components/AuthPanel';
import FeedPanel from '@/components/FeedPanel';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// Resizable divider component
const ResizeDivider = ({ onResize, side }: { onResize: (delta: number) => void; side: 'left' | 'right' }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = side === 'left' 
        ? moveEvent.clientX - startX
        : startX - moveEvent.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize, side]);

  return (
    <div
      className={`w-1 cursor-col-resize hover:bg-blue-400 transition-colors flex-shrink-0 ${
        isDragging ? 'bg-blue-500' : 'bg-gray-200 hover:bg-blue-300'
      }`}
      onMouseDown={handleMouseDown}
      title="Drag to resize"
    >
      <div className="h-full w-full flex items-center justify-center">
        <div className={`w-0.5 h-8 rounded ${isDragging ? 'bg-white' : 'bg-gray-400'}`} />
      </div>
    </div>
  );
};

export default function Home() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { sidebarWidth, feedWidth, setSidebarWidth, setFeedWidth } = useRegionStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">HyperLocal</h1>
            <p className="text-gray-500 mt-1">Connect with your local communities</p>
          </div>
          <AuthPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* Top Header Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-800">HyperLocal</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-semibold text-sm">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name || 'User'}</span>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Sidebar - Left (Resizable) */}
        <div 
          className="flex-shrink-0 hidden md:block"
          style={{ width: sidebarWidth }}
        >
          <WorkspaceSidebar />
        </div>

        {/* Left Resize Handle */}
        <ResizeDivider 
          side="left"
          onResize={(delta) => setSidebarWidth(sidebarWidth + delta)} 
        />

        {/* Map Section - Center */}
        <div className="flex-1 relative min-w-[200px]">
          <MapView />
        </div>

        {/* Right Resize Handle */}
        <ResizeDivider 
          side="right"
          onResize={(delta) => setFeedWidth(feedWidth + delta)} 
        />

        {/* Feed Panel - Right (Resizable) */}
        <div 
          className="flex-shrink-0 border-l border-gray-200 hidden lg:block"
          style={{ width: feedWidth }}
        >
          <FeedPanel />
        </div>
      </div>

      {/* Mobile Bottom Navigation (optional for mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2">
        <button className="flex flex-col items-center gap-1 p-2 text-indigo-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-xs">Map</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs">Spaces</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs">Feed</span>
        </button>
      </div>
    </div>
  );
}
