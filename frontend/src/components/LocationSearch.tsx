'use client';

import { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationSearch() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.location-search')) {
        setShowResults(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(newQuery);
    }, 500);
  };

  const handleResultClick = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // Zoom to location
    map.setView([lat, lon], 14, { animate: true });
    
    // Clear search
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="location-search absolute top-4 left-4 z-[1000] w-80">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search location..."
            className="w-full px-4 py-3 pr-10 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
          />
          {isSearching && (
            <div className="absolute right-3 top-3.5">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        
        {showResults && results.length > 0 && (
          <div className="mt-1 bg-white rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b last:border-b-0 transition-colors"
              >
                <p className="text-sm text-gray-800">{result.display_name}</p>
              </button>
            ))}
          </div>
        )}

        {showResults && query && results.length === 0 && !isSearching && (
          <div className="mt-1 bg-white rounded-lg shadow-lg px-4 py-3">
            <p className="text-sm text-gray-500">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}
