'use client';

import { useState, useEffect, useRef } from 'react';
import { useRegionStore, Workspace, JoinedWorkspace } from '@/store/region';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';

export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  replyToId?: string;
  replyTo?: Post;
  isDeleted?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  likeCount?: number;
  dislikeCount?: number;
  viewCount?: number;
  userReaction?: 'LIKE' | 'DISLIKE' | null;
  _count?: {
    replies: number;
  };
}

interface WorkspaceDetails extends Workspace {
  isMember?: boolean;
  isPinned?: boolean;
}

interface WorkspaceMember {
  id: string;
  username: string;
  avatar?: string;
}

export default function FeedPanel() {
  const { 
    selectedRegion, 
    addJoinedWorkspace, 
    removeJoinedWorkspace,
  } = useRegionStore();
  const { socket } = useSocket();
  const { user: currentUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // New states for features
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number; name: string} | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [customName, setCustomName] = useState('');
  const [showCustomNameInput, setShowCustomNameInput] = useState(false);
  const [viewingReplies, setViewingReplies] = useState<string | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [postReactions, setPostReactions] = useState<Record<string, 'LIKE' | 'DISLIKE' | null>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when posts change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [posts]);

  // Load posts for selected region
  useEffect(() => {
    const loadPostsForRegion = async () => {
      if (!selectedRegion) return;

      setIsLoadingPosts(true);
      setShowMembers(false);
      setViewingReplies(null);
      try {
        // Try to get workspace details (includes membership info)
        const detailsResponse = await api.get(`/workspaces/details/${selectedRegion}`);
        
        if (detailsResponse.data) {
          setWorkspace(detailsResponse.data);
          setShowCreateWorkspace(false);

          // Fetch posts for this workspace
          const postsResponse = await api.get(`/posts/${selectedRegion}`);
          let postsData: Post[] = [];
          if (Array.isArray(postsResponse.data)) {
            postsData = postsResponse.data;
          } else if (postsResponse.data?.posts && Array.isArray(postsResponse.data.posts)) {
            postsData = postsResponse.data.posts;
          }
          setPosts(postsData);
          
          // Initialize reaction state from posts (convert to uppercase for frontend)
          const reactions: Record<string, 'LIKE' | 'DISLIKE' | null> = {};
          postsData.forEach((post) => {
            reactions[post.id] = post.userReaction 
              ? (post.userReaction.toUpperCase() as 'LIKE' | 'DISLIKE')
              : null;
            // Track view for each post
            trackPostView(post.id);
          });
          setPostReactions(reactions);

          // Get custom name if exists
          try {
            const customNameRes = await api.get(`/workspaces/custom-name/${selectedRegion}`);
            if (customNameRes.data?.customName) {
              setCustomName(customNameRes.data.customName);
            } else {
              setCustomName('');
            }
          } catch (e) {
            setCustomName('');
          }

          // Mark as visited if member
          if (detailsResponse.data.isMember) {
            try {
              await api.post(`/workspaces/visit/${selectedRegion}`);
            } catch (e) {
              // Ignore
            }
          }
        } else {
          setWorkspace(null);
          setShowCreateWorkspace(true);
          setPosts([]);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          setWorkspace(null);
          setShowCreateWorkspace(true);
          setPosts([]);
        } else {
          console.error('Error loading posts:', error);
          setPosts([]);
        }
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadPostsForRegion();
  }, [selectedRegion]);

  // Subscribe to socket events for new posts
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (data: any) => {
      try {
        if (data && data.h3Index === selectedRegion && !data.replyToId) {
          setPosts((prevPosts) => {
            const currentPosts = Array.isArray(prevPosts) ? prevPosts : [];
            // Add to end for chronological order (oldest first, newest at bottom)
            return [...currentPosts, data];
          });
        }
      } catch (e) {
        console.error('Error handling new post:', e);
      }
    };

    socket.on('post-message', handleNewPost);
    return () => {
      socket.off('post-message', handleNewPost);
    };
  }, [socket, selectedRegion]);

  // Location search with debounce
  useEffect(() => {
    if (!locationSearch || locationSearch.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        // Using OpenStreetMap Nominatim API for location search
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5`
        );
        const data = await response.json();
        setLocationSuggestions(data);
      } catch (error) {
        console.error('Error searching location:', error);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationSearch]);

  const handleCreateWorkspace = async () => {
    if (!selectedRegion || !workspaceName.trim()) return;

    setIsCreatingWorkspace(true);
    try {
      const response = await api.post(`/workspaces/h3/${selectedRegion}`, {
        name: workspaceName.trim(),
      });
      setWorkspace({ ...response.data, isMember: false });
      setShowCreateWorkspace(false);
      setWorkspaceName('');
      setPosts([]);
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!selectedRegion || !workspace) return;

    setIsJoining(true);
    try {
      const response = await api.post(`/workspaces/join/${selectedRegion}`, {});
      setWorkspace({ ...workspace, isMember: true, memberCount: (workspace.memberCount || 0) + 1 });
      
      // Add to joined workspaces list
      const newJoined: JoinedWorkspace = {
        id: response.data.membership?.id || Date.now().toString(),
        isPinned: false,
        lastVisitedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        workspace: {
          id: workspace.id,
          h3Index: workspace.h3Index,
          name: workspace.name,
          description: workspace.description,
          color: workspace.color,
          memberCount: (workspace.memberCount || 0) + 1,
          postCount: workspace.postCount,
        },
        unreadCount: 0,
      };
      addJoinedWorkspace(newJoined);
    } catch (error) {
      console.error('Error joining workspace:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!selectedRegion || !workspace) return;

    setIsLeaving(true);
    try {
      await api.delete(`/workspaces/leave/${selectedRegion}`);
      setWorkspace({ ...workspace, isMember: false, memberCount: Math.max(0, (workspace.memberCount || 1) - 1) });
      removeJoinedWorkspace(selectedRegion);
    } catch (error) {
      console.error('Error leaving workspace:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Location handling
  const selectLocation = (location: any) => {
    setSelectedLocation({
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon),
      name: location.display_name,
    });
    setLocationSearch('');
    setLocationSuggestions([]);
    setShowLocationPicker(false);
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setLocationSearch('');
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Reverse geocode to get location name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            setSelectedLocation({
              lat: latitude,
              lng: longitude,
              name: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            });
            setShowLocationPicker(false);
          } catch {
            setSelectedLocation({
              lat: latitude,
              lng: longitude,
              name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            });
            setShowLocationPicker(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please allow location access.');
        }
      );
    }
  };

  // Load members
  const loadMembers = async () => {
    if (!selectedRegion) return;
    setIsLoadingMembers(true);
    try {
      const response = await api.get(`/workspaces/members/${selectedRegion}`);
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Save custom name
  const saveCustomName = async () => {
    if (!selectedRegion) return;
    try {
      await api.post(`/workspaces/custom-name/${selectedRegion}`, { customName });
      setShowCustomNameInput(false);
    } catch (error) {
      console.error('Error saving custom name:', error);
    }
  };

  // Load replies for a post
  const loadReplies = async (postId: string) => {
    setIsLoadingReplies(true);
    setViewingReplies(postId);
    try {
      const response = await api.get(`/posts/replies/${postId}`);
      setReplies(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading replies:', error);
      setReplies([]);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // Start DM conversation
  const handleStartDM = async (userId: string) => {
    try {
      await api.post(`/messages/conversations/${userId}`);
      alert('Conversation started! Check the DM panel in bottom-right corner.');
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Share workspace
  const handleShareWorkspace = () => {
    if (!selectedRegion) return;
    const shareUrl = `${window.location.origin}?workspace=${selectedRegion}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Workspace link copied to clipboard! Share it with others to invite them.');
    }).catch((err) => {
      console.error('Failed to copy:', err);
      prompt('Copy this link to share the workspace:', shareUrl);
    });
  };

  // Handle like/dislike reactions
  const handleReaction = async (postId: string, reactionType: 'LIKE' | 'DISLIKE') => {
    try {
      const currentReaction = postReactions[postId];
      const newReaction = currentReaction === reactionType ? null : reactionType;
      
      // Optimistic update
      setPostReactions((prev) => ({ ...prev, [postId]: newReaction }));
      
      // Update post counts optimistically
      const updatePostCounts = (post: Post) => {
        if (post.id !== postId) return post;
        
        let likeCount = post.likeCount || 0;
        let dislikeCount = post.dislikeCount || 0;
        
        // Remove previous reaction
        if (currentReaction === 'LIKE') likeCount = Math.max(0, likeCount - 1);
        if (currentReaction === 'DISLIKE') dislikeCount = Math.max(0, dislikeCount - 1);
        
        // Add new reaction
        if (newReaction === 'LIKE') likeCount++;
        if (newReaction === 'DISLIKE') dislikeCount++;
        
        return { ...post, likeCount, dislikeCount, userReaction: newReaction };
      };
      
      setPosts((prevPosts) => prevPosts.map(updatePostCounts));
      setReplies((prevReplies) => prevReplies.map(updatePostCounts));
      
      // Send to backend (lowercase for backend compatibility)
      const type = newReaction?.toLowerCase() as 'like' | 'dislike' | null;
      await api.post(`/reputation/react/${postId}`, { type });
    } catch (error) {
      console.error('Error updating reaction:', error);
      // Revert on error
      setPostReactions((prev) => ({ ...prev, [postId]: prev[postId] }));
    }
  };

  // Track post view
  const trackPostView = async (postId: string) => {
    try {
      await api.post(`/reputation/view/${postId}`);
    } catch (error) {
      // Silent fail for view tracking
    }
  };

  const handleCreatePost = async () => {
    if (!selectedRegion || (!newPostContent.trim() && !selectedImage) || !workspace) return;

    setIsPosting(true);
    try {
      let imageUrl: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedImage);
        const uploadResponse = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = uploadResponse.data.url;
        setIsUploading(false);
      }

      const postData: any = {
        content: newPostContent,
      };

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      if (selectedLocation) {
        postData.latitude = selectedLocation.lat;
        postData.longitude = selectedLocation.lng;
        postData.locationName = selectedLocation.name;
      }

      if (replyingTo) {
        postData.replyToId = replyingTo.id;
      }

      const response = await api.post(`/posts/${selectedRegion}`, postData);

      socket?.emit('post-message', {
        h3Index: selectedRegion,
        ...response.data,
      });

      // If replying, add to replies list, otherwise add to posts
      if (replyingTo) {
        setReplies((prev) => [...prev, response.data]);
        // Update reply count in main post
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === replyingTo.id
              ? { ...p, _count: { replies: (p._count?.replies || 0) + 1 } }
              : p
          )
        );
      } else {
        setPosts((prevPosts) => {
          const currentPosts = Array.isArray(prevPosts) ? prevPosts : [];
          return [...currentPosts, response.data];
        });
      }

      // Reset form
      setNewPostContent('');
      clearImage();
      clearLocation();
      setReplyingTo(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
      setIsUploading(false);
    }
  };

  // Render a single post/message
  const renderPost = (post: Post, isReply = false) => {
    if (post.isDeleted) {
      return (
        <div key={post.id} className={`p-3 ${isReply ? 'ml-8' : ''} text-gray-400 italic text-sm`}>
          This message was deleted
        </div>
      );
    }

    return (
      <div key={post.id} className={`group p-3 hover:bg-gray-50 transition-colors ${isReply ? 'ml-8 border-l-2 border-gray-200' : ''}`}>
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {post.user?.avatar ? (
              <img src={post.user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-600 font-semibold text-sm">
                {(post.user?.name || 'A').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* User info and time */}
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm text-gray-900">{post.user?.name || 'Anonymous'}</span>
              <span className="text-xs text-gray-400">
                {post.createdAt ? new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>

            {/* Reply indicator */}
            {post.replyTo && (
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Replying to {post.replyTo.user?.name || 'someone'}
              </div>
            )}

            {/* Message content */}
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{post.content}</p>

            {/* Image */}
            {post.imageUrl && (
              <div className="mt-2">
                <img
                  src={post.imageUrl.startsWith('http') ? post.imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${post.imageUrl}`}
                  alt="Post image"
                  className="max-w-sm rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                  onClick={() => window.open(post.imageUrl!.startsWith('http') ? post.imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${post.imageUrl}`, '_blank')}
                />
              </div>
            )}

            {/* Location */}
            {post.latitude && post.longitude && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg w-fit">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <a
                  href={`https://www.google.com/maps?q=${post.latitude},${post.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 truncate max-w-xs"
                >
                  {post.locationName || `${post.latitude.toFixed(4)}, ${post.longitude.toFixed(4)}`}
                </a>
              </div>
            )}

            {/* Actions */}
            {!isReply && (
              <div className="mt-2 flex items-center gap-3">
                {/* Like/Dislike Buttons - Always visible */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReaction(post.id, 'LIKE')}
                    disabled={post.user?.id === currentUser?.id}
                    className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      postReactions[post.id] === 'LIKE'
                        ? 'text-green-600 font-semibold'
                        : 'text-gray-500 hover:text-green-600'
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={postReactions[post.id] === 'LIKE' ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                      />
                    </svg>
                    {post.likeCount || 0}
                  </button>

                  <button
                    onClick={() => handleReaction(post.id, 'DISLIKE')}
                    disabled={post.user?.id === currentUser?.id}
                    className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      postReactions[post.id] === 'DISLIKE'
                        ? 'text-red-600 font-semibold'
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={postReactions[post.id] === 'DISLIKE' ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                      />
                    </svg>
                    {post.dislikeCount || 0}
                  </button>
                </div>

                {/* Other actions - show on hover */}
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setReplyingTo(post)}
                    className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Reply
                  </button>

                  {(post._count?.replies || 0) > 0 && (
                    <button
                      onClick={() => loadReplies(post.id)}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      {post._count?.replies} {post._count?.replies === 1 ? 'reply' : 'replies'}
                    </button>
                  )}

                  {post.user?.id !== currentUser?.id && (
                    <button
                      onClick={() => handleStartDM(post.user.id)}
                      className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message
                    </button>
                  )}

                  {post.user?.id === currentUser?.id && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // No region selected
  if (!selectedRegion) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <p className="font-medium text-gray-700">No region selected</p>
        <p className="text-sm text-gray-500 mt-1 text-center">Click on a hexagon in the map to view or create a community</p>
      </div>
    );
  }

  // Show workspace creation dialog if no workspace exists
  if (showCreateWorkspace && !workspace) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg text-gray-800">Create Community</h2>
          <p className="text-xs text-gray-500 mt-1">Region: {selectedRegion.slice(0, 12)}...</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800">No community exists here yet</h3>
          <p className="text-gray-500 text-sm mb-6 text-center">Be the first to create a community in this region</p>

          <div className="w-full max-w-sm space-y-4">
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Community name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreatingWorkspace}
            />

            <button
              onClick={handleCreateWorkspace}
              disabled={isCreatingWorkspace || !workspaceName.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingWorkspace ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : 'Create Community'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Anyone can join and post in this community
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show members panel
  if (showMembers) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <button
            onClick={() => setShowMembers(false)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="font-bold text-lg text-gray-800">Members</h2>
            <p className="text-xs text-gray-500">{members.length} members</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 font-semibold">
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-gray-800">{member.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show replies panel
  if (viewingReplies) {
    const parentPost = posts.find((p) => p.id === viewingReplies);
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <button
            onClick={() => {
              setViewingReplies(null);
              setReplyingTo(null);
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="font-bold text-lg text-gray-800">Thread</h2>
            <p className="text-xs text-gray-500">{replies.length} replies</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Parent post */}
          {parentPost && (
            <div className="border-b border-gray-100">
              {renderPost(parentPost)}
            </div>
          )}

          {/* Replies */}
          {isLoadingReplies ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div>
              {replies.map((reply) => renderPost(reply, true))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply composer */}
        {workspace?.isMember && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Reply to thread..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setReplyingTo(parentPost || null);
                    handleCreatePost();
                  }
                }}
              />
              <button
                onClick={() => {
                  setReplyingTo(parentPost || null);
                  handleCreatePost();
                }}
                disabled={isPosting || !newPostContent.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const safePosts = Array.isArray(posts) ? posts : [];
  const displayName = customName || workspace?.name || 'Community';
  const initials = displayName.slice(0, 2).toUpperCase();
  const bgColor = workspace?.color || '#3B82F6';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start gap-3">
          {/* Workspace Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {showCustomNameInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Custom name..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={saveCustomName}
                  className="text-blue-600 text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowCustomNameInput(false)}
                  className="text-gray-400 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-gray-800 truncate">{displayName}</h2>
                {workspace?.isMember && (
                  <button
                    onClick={() => setShowCustomNameInput(true)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Rename for yourself"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <button
                onClick={() => {
                  setShowMembers(true);
                  loadMembers();
                }}
                className="flex items-center gap-1 hover:text-blue-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {workspace?.memberCount || 0} members
              </button>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {workspace?.postCount || 0} posts
              </span>
            </div>
          </div>

          {/* Join/Leave Button */}
          <div className="flex gap-2">
            <button
              onClick={handleShareWorkspace}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
              title="Share workspace"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            {workspace?.isMember ? (
              <button
                onClick={handleLeaveWorkspace}
                disabled={isLeaving}
                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {isLeaving ? 'Leaving...' : 'Leave'}
              </button>
            ) : (
              <button
                onClick={handleJoinWorkspace}
                disabled={isJoining}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Posts Feed - Chat Style (newest at bottom) */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingPosts ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : safePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {safePosts.filter((p) => !p.replyToId).map((post) => renderPost(post))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Replying to <span className="font-medium">{replyingTo.user?.name}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-blue-400 hover:text-blue-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Location preview */}
      {selectedLocation && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="truncate flex-1">{selectedLocation.name}</span>
            <button onClick={clearLocation} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Location picker modal */}
      {showLocationPicker && (
        <div className="px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search for a location..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={getCurrentLocation}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              title="Use current location"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowLocationPicker(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isSearchingLocation && (
            <div className="text-sm text-gray-500 text-center py-2">Searching...</div>
          )}

          {locationSuggestions.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {locationSuggestions.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => selectLocation(loc)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg truncate"
                >
                  {loc.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
        
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={workspace?.isMember ? "Type a message..." : "Join to post in this community"}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
              rows={1}
              disabled={isPosting || !workspace?.isMember}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreatePost();
                }
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!workspace?.isMember}
              className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={() => setShowLocationPicker(!showLocationPicker)}
              disabled={!workspace?.isMember}
              className={`p-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedLocation ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title="Attach location"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={handleCreatePost}
              disabled={isPosting || (!newPostContent.trim() && !selectedImage) || !workspace?.isMember}
              className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPosting || isUploading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
