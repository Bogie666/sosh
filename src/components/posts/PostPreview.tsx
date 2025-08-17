// src/components/posts/PostPreview.tsx
'use client'

interface PostPreviewProps {
  content: string
  platforms: string[]
  business: string
}

export default function PostPreview({ content, platforms, business }: PostPreviewProps) {
  if (!content) return null

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google': return '🏢'
      case 'facebook': return '📘'
      case 'instagram': return '��'
      case 'twitter': return '🐦'
      default: return '📱'
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <h3 className="text-dark-text font-medium mb-3">📋 Post Preview</h3>
      
      {/* Business and Platforms */}
      <div className="mb-4">
        <p className="text-dark-text-muted text-sm mb-2">
          <strong>Business:</strong> {business || 'Not selected'}
        </p>
        <div className="flex gap-2">
          {platforms.map(platform => (
            <span 
              key={platform}
              className="inline-flex items-center gap-1 px-2 py-1 bg-accent-blue/20 text-accent-blue rounded text-xs"
            >
              {getPlatformIcon(platform)}
              {platform}
            </span>
          ))}
        </div>
      </div>

      {/* Content Preview */}
      <div className="bg-gray-900/50 rounded-lg p-3 border-l-4 border-accent-blue">
        <p className="text-dark-text text-sm whitespace-pre-wrap">{content}</p>
      </div>
      
      <div className="mt-3 text-xs text-dark-text-secondary">
        Character count: {content.length}
      </div>
    </div>
  )
}
