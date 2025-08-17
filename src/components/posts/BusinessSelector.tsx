// src/components/posts/BusinessSelector.tsx
'use client'

interface BusinessSelectorProps {
  selectedBusiness: string
  onBusinessChange: (business: string) => void
  businesses?: string[]
}

export default function BusinessSelector({ selectedBusiness, onBusinessChange, businesses = [] }: BusinessSelectorProps) {
  return (
    <div>
      <label className="block text-dark-text font-medium mb-2">
        Business Location
      </label>
      <select
        value={selectedBusiness}
        onChange={(e) => onBusinessChange(e.target.value)}
        className="form-control"
      >
        <option value="">Select a business...</option>
        {businesses.map(business => (
          <option key={business} value={business}>{business}</option>
        ))}
      </select>
    </div>
  )
}
