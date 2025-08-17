// src/components/reviews/ReviewFilters.tsx
'use client'

interface ReviewFiltersProps {
  filters: {
    location: string
    status: string
  }
  onFiltersChange: (filters: any) => void
  reviews: any[]
  locations: any[]
  loadingLocations: boolean
}

export default function ReviewFilters({ 
  filters, 
  onFiltersChange, 
  reviews, 
  locations, 
  loadingLocations 
}: ReviewFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Location Filter */}
      <select
        value={filters.location}
        onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
        className="form-control max-w-xs"
        disabled={loadingLocations}
      >
        <option value="all">
          {loadingLocations ? 'Loading locations...' : `All Locations (${locations.length})`}
        </option>
        {locations.map(location => (
          <option key={location.id} value={location.locationId}>
            {location.name}
          </option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        className="form-control max-w-xs"
      >
        <option value="all">All Reviews</option>
        <option value="unresponded">Needs Response</option>
        <option value="negative">Negative Reviews (≤3 stars)</option>
        <option value="positive">Positive Reviews (≥4 stars)</option>
        <option value="urgent">Urgent Priority (≤2 stars, no reply)</option>
      </select>

      {/* Review count info */}
      {reviews.length > 0 && (
        <div className="flex items-center px-3 py-2 bg-slate-800/30 rounded-lg">
          <span className="text-dark-text-muted text-sm">
            📊 {reviews.length} total reviews
          </span>
        </div>
      )}
    </div>
  )
}
