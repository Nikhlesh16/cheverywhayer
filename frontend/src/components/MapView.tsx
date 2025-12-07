'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import * as h3 from 'h3-js';
import { useRegionStore } from '@/store/region';
import api from '@/lib/api';
import LocationSearch from './LocationSearch';

interface MapViewProps {
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;
}

const H3_RESOLUTION = 8;

interface H3Cell {
  h3Index: string;
  boundaries: Array<{ lat: number; lng: number }>;
  isSelected: boolean;
  isMember: boolean;
}

const H3GridOverlay = ({ h3Cells, onCellClick }: { h3Cells: H3Cell[]; onCellClick: (h3Index: string) => void }) => {
  const map = useMap();
  const [displayedCells, setDisplayedCells] = useState<H3Cell[]>([]);

  useEffect(() => {
    const handleZoom = () => {
      const zoom = map.getZoom();
      // Only show H3 cells when zoomed in enough (z >= 8)
      if (zoom >= 8) {
        setDisplayedCells(h3Cells);
      } else {
        setDisplayedCells([]);
      }
    };

    map.on('zoom', handleZoom);
    handleZoom();

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map, h3Cells]);

  return (
    <>
      {Array.isArray(displayedCells) && displayedCells.map((cell) => {
        if (!cell || !Array.isArray(cell.boundaries) || cell.boundaries.length === 0) {
          return null;
        }
        const positions = cell.boundaries.map((b) => [b.lat, b.lng] as [number, number]);
        // Selected = bright green, Member = light green, Default = gray
        const color = cell.isSelected ? '#22C55E' : cell.isMember ? '#86EFAC' : '#94A3B8';
        const fillOpacity = cell.isSelected ? 0.5 : cell.isMember ? 0.3 : 0.2;
        const weight = cell.isSelected ? 3 : 2;

        return (
          <Polygon
            key={cell.h3Index}
            positions={positions}
            color={color}
            weight={weight}
            opacity={0.8}
            fillOpacity={fillOpacity}
            eventHandlers={{
              click: () => onCellClick(cell.h3Index),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{cell.h3Index.slice(0, 12)}...</p>
                <p className="text-xs text-gray-600">Click to select region</p>
                {cell.isSelected && <p className="text-xs text-green-600 font-medium">✓ Currently selected</p>}
                {cell.isMember && !cell.isSelected && <p className="text-xs text-green-600">✓ You are a member</p>}
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
};

const MapEventListener = ({ onBoundsChange }: { onBoundsChange: (bounds: any) => void }) => {
  const map = useMap();

  useEffect(() => {
    const handleMoveEnd = () => {
      onBoundsChange(map.getBounds());
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
};

export default function MapView({ defaultLat = 20, defaultLng = 0, defaultZoom = 4 }: MapViewProps) {
  const { selectedRegion, userLocation, setSelectedRegion, setUserLocation, joinedWorkspaces } = useRegionStore();
  const [h3Cells, setH3Cells] = useState<H3Cell[]>([]);

  useEffect(() => {
    // Get user's geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
      );
    }
  }, [setUserLocation]);

  const handleMapBounds = (bounds: any) => {
    try {
      const zoom = bounds?.getZoom ? bounds.getZoom() : 8;
      if (zoom < 8) {
        setH3Cells([]);
        return;
      }

      const ne = bounds?.getNorthEast ? bounds.getNorthEast() : { lat: defaultLat + 10, lng: defaultLng + 10 };
      const sw = bounds?.getSouthWest ? bounds.getSouthWest() : { lat: defaultLat - 10, lng: defaultLng - 10 };

      // Validate bounds
      if (!ne || !sw || typeof ne.lat !== 'number' || typeof sw.lat !== 'number') {
        setH3Cells([]);
        return;
      }

      // Generate H3 cells for visible bounds
      const cells: H3Cell[] = [];

      // Sample cells in the visible area
      for (let i = 0; i < 100; i++) {
        const randomLat = sw.lat + Math.random() * (ne.lat - sw.lat);
        const randomLng = sw.lng + Math.random() * (ne.lng - sw.lng);

        try {
          const h3Index = h3.geoToH3(randomLat, randomLng, H3_RESOLUTION);
          
          // Validate h3Index
          if (!h3Index || typeof h3Index !== 'string') {
            continue;
          }
          
          if (!cells.find((c) => c.h3Index === h3Index)) {
            const boundary = h3.h3ToGeoBoundary(h3Index);
            
            // Ensure boundary is an array before mapping
            if (!Array.isArray(boundary) || boundary.length === 0) {
              continue;
            }
            
            const boundaries = boundary.map((coord: any) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                return { lat: Number(coord[0]) || 0, lng: Number(coord[1]) || 0 };
              }
              return { lat: 0, lng: 0 };
            }).filter((b: { lat: number; lng: number }) => b.lat !== 0 || b.lng !== 0);
            
            if (boundaries.length > 0) {
              // Check if user is a member of this workspace
              const isMember = joinedWorkspaces.some(jw => jw.workspace?.h3Index === h3Index);
              cells.push({
                h3Index,
                boundaries,
                isSelected: h3Index === selectedRegion,
                isMember,
              });
            }
          }
        } catch (e) {
          console.error('H3 cell generation error:', e);
        }
      }

      setH3Cells(cells);
    } catch (e) {
      console.error('handleMapBounds error:', e);
      setH3Cells([]);
    }
  };

  const handleCellClick = async (h3Index: string) => {
    try {
      if (!h3Index || typeof h3Index !== 'string') {
        console.error('Invalid h3Index:', h3Index);
        return;
      }
      
      setSelectedRegion(h3Index);

      // Auto-join region if user has location (optional, don't block on failure)
      if (userLocation && userLocation.lat && userLocation.lng) {
        try {
          await api.post(`/workspaces/join/${h3Index}`, {
            lat: userLocation.lat,
            lng: userLocation.lng,
          });
        } catch (joinError) {
          // Silently fail - user can still view the region
          console.warn('Could not auto-join region:', joinError);
        }
      }
    } catch (error) {
      console.error('Error selecting region:', error);
    }
  };

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[defaultLat, defaultLng]}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <MapEventListener onBoundsChange={handleMapBounds} />
        <LocationSearch />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        <H3GridOverlay h3Cells={h3Cells} onCellClick={handleCellClick} />
        {userLocation && (
          <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={{ fill: true, color: 'blue' }} />
        )}
      </MapContainer>
    </div>
  );
}
