// src/components/posts/ContentGenerator.tsx
'use client'

import { useState } from 'react'

export default function ContentGenerator() {
  const [prompt, setPrompt] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)

  const generateContent = async () => {
    if (!prompt.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/ai/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      const data = await response.json()
      if (data.success) {
        setGeneratedContent(data.content)
      }
    } catch (error) {
      console.error('Content generation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-dark-text font-medium mb-2">
          Content Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the content you want to generate..."
          className="form-control"
          rows={3}
        />
      </div>

      <button
        onClick={generateContent}
        disabled={loading || !prompt.trim()}
        className="btn btn-primary"
      >
        {loading ? '🤖 Generating...' : '🤖 Generate Content'}
      </button>

      {generatedContent && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-dark-text font-medium mb-2">Generated Content:</h3>
          <p className="text-dark-text-muted whitespace-pre-wrap">{generatedContent}</p>
        </div>
      )}
    </div>
  )
}
