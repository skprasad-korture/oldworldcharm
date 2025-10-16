import React, { useState } from 'react';
import { Canvas } from '../canvas';
import { ComponentPalette } from '../palette/ComponentPalette';
import { PropertiesPanel } from '../properties';
import { ComponentTree } from '../tree';
import { useEditorStore } from '../../store/editorStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export interface VisualEditorProps {
  className?: string;
}

export function VisualEditor({ className = '' }: VisualEditorProps) {
  const { mode, setMode, canUndo, canRedo, undo, redo, clearCanvas } = useEditorStore();
  const [leftSidebarTab, setLeftSidebarTab] = useState<'components' | 'structure'>('components');
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className={`flex h-screen bg-gray-100 ${className}`}>
      {/* Left Sidebar - Component Palette & Structure */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setLeftSidebarTab('components')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                leftSidebarTab === 'components'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Components</span>
              </div>
            </button>
            <button
              onClick={() => setLeftSidebarTab('structure')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                leftSidebarTab === 'structure'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>Structure</span>
              </div>
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {leftSidebarTab === 'components' ? (
            <ComponentPalette />
          ) : (
            <ComponentTree />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Mode toggle */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMode('design')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    mode === 'design'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Design
                </button>
                <button
                  onClick={() => setMode('preview')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    mode === 'preview'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Center - Page title */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-medium text-gray-900">Untitled Page</h1>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-2">
              {/* Undo/Redo */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={undo}
                  disabled={!canUndo()}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo()}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                  </svg>
                </button>
              </div>

              {/* Clear Canvas */}
              <button
                onClick={clearCanvas}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                title="Clear Canvas"
              >
                Clear
              </button>

              {/* Save */}
              <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden">
          {mode === 'design' ? (
            <Canvas className="h-full" />
          ) : (
            <PreviewMode />
          )}
        </div>
      </div>

      {/* Right Sidebar - Properties Panel */}
      <div className="w-80 bg-white border-l border-gray-200">
        <PropertiesPanel />
      </div>
    </div>
  );
}

// Placeholder component for preview mode
function PreviewMode() {
  return (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center text-gray-500">
        <div className="text-lg font-medium mb-2">Preview Mode</div>
        <div className="text-sm">Preview functionality will be implemented in task 9.3</div>
      </div>
    </div>
  );
}