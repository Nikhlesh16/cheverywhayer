'use client';

import { useEffect } from 'react';
import { useRegionStore, JoinedWorkspace } from '@/store/region';
import api from '@/lib/api';

interface WorkspaceItemProps {
  item: JoinedWorkspace;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
}

const WorkspaceItem = ({ item, isActive, onClick, onPin }: WorkspaceItemProps) => {
  const { workspace, unreadCount, isPinned, customName } = item;
  // Use custom name if set, otherwise fall back to workspace name
  const displayName = customName || workspace?.name || `Region ${workspace?.h3Index?.slice(0, 6) || 'Unknown'}`;
  const initials = (displayName || 'WS').slice(0, 2).toUpperCase();
  const bgColor = workspace?.color || '#3B82F6';

  return (
    <div
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-blue-100 border-l-4 border-blue-600'
          : 'hover:bg-gray-100 border-l-4 border-transparent'
      }`}
      onClick={onClick}
    >
      {/* Workspace Avatar */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm ${
          isActive ? 'ring-2 ring-blue-400 ring-offset-1' : ''
        }`}
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>

      {/* Workspace Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm truncate ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>
            {displayName}
          </span>
          {customName && (
            <span className="text-xs text-gray-400" title={`Original: ${workspace.name}`}>✏️</span>
          )}
          {isPinned && (
            <svg className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{workspace.memberCount || 0} members</span>
          {workspace.postCount !== undefined && (
            <>
              <span>•</span>
              <span>{workspace.postCount} posts</span>
            </>
          )}
        </div>
      </div>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Pin Button (shown on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPin();
        }}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
          isPinned ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-gray-600'
        }`}
        title={isPinned ? 'Unpin' : 'Pin to top'}
      >
        <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </button>
    </div>
  );
};

export default function WorkspaceSidebar() {
  const {
    selectedRegion,
    joinedWorkspaces,
    setJoinedWorkspaces,
    setSelectedRegion,
    setActiveWorkspace,
    toggleWorkspacePin,
    clearUnreadCount,
    isLoadingWorkspaces,
    setIsLoadingWorkspaces,
  } = useRegionStore();

  // Fetch user's workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      setIsLoadingWorkspaces(true);
      try {
        const response = await api.get('/workspaces/my-workspaces');
        const data = Array.isArray(response.data) ? response.data : [];
        setJoinedWorkspaces(data);
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        setJoinedWorkspaces([]);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [setJoinedWorkspaces, setIsLoadingWorkspaces]);

  const handleWorkspaceClick = async (item: JoinedWorkspace) => {
    setSelectedRegion(item.workspace.h3Index);
    setActiveWorkspace(item.workspace);
    clearUnreadCount(item.workspace.h3Index);

    // Update last visited on backend
    try {
      await api.post(`/workspaces/visit/${item.workspace.h3Index}`);
    } catch (error) {
      console.warn('Could not update visit time:', error);
    }
  };

  const handlePinToggle = async (h3Index: string) => {
    try {
      await api.post(`/workspaces/pin/${h3Index}`);
      toggleWorkspacePin(h3Index);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Separate pinned and unpinned workspaces, sort by most recent activity
  const pinnedWorkspaces = joinedWorkspaces
    .filter((w) => w.isPinned)
    .sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime());
  const unpinnedWorkspaces = joinedWorkspaces
    .filter((w) => !w.isPinned)
    .sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime());

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Workspaces</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {joinedWorkspaces.length} joined
        </p>
      </div>

      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoadingWorkspaces ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : joinedWorkspaces.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">No workspaces yet</p>
            <p className="text-xs text-gray-500 mt-1">Click on a region in the map to join a community</p>
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedWorkspaces.length > 0 && (
              <div className="mb-2">
                <div className="px-4 py-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pinned</span>
                </div>
                <div className="px-2 space-y-0.5">
                  {pinnedWorkspaces.map((item) => (
                    <WorkspaceItem
                      key={item.id}
                      item={item}
                      isActive={selectedRegion === item.workspace.h3Index}
                      onClick={() => handleWorkspaceClick(item)}
                      onPin={() => handlePinToggle(item.workspace.h3Index)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Workspaces */}
            {unpinnedWorkspaces.length > 0 && (
              <div>
                {pinnedWorkspaces.length > 0 && (
                  <div className="px-4 py-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">All Workspaces</span>
                  </div>
                )}
                <div className="px-2 space-y-0.5">
                  {unpinnedWorkspaces.map((item) => (
                    <WorkspaceItem
                      key={item.id}
                      item={item}
                      isActive={selectedRegion === item.workspace.h3Index}
                      onClick={() => handleWorkspaceClick(item)}
                      onPin={() => handlePinToggle(item.workspace.h3Index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          💡 Click map regions to discover communities
        </p>
      </div>
    </div>
  );
}
