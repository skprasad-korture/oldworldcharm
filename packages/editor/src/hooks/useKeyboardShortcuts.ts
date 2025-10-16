import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useKeyboardShortcuts() {
  const {
    selectedComponentId,
    undo,
    redo,
    canUndo,
    canRedo,
    removeComponent,
    duplicateComponent,
    selectComponent,
    copyComponent,
    cutComponent,
    pasteComponent,
    canPaste,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';

      // Don't handle shortcuts when typing in input fields
      if (isInputField) {
        return;
      }

      const { ctrlKey, metaKey, shiftKey, key } = event;
      const isModifierPressed = ctrlKey || metaKey;

      switch (key.toLowerCase()) {
        case 'z':
          if (isModifierPressed && !shiftKey && canUndo()) {
            event.preventDefault();
            undo();
          } else if (isModifierPressed && shiftKey && canRedo()) {
            event.preventDefault();
            redo();
          }
          break;

        case 'y':
          if (isModifierPressed && canRedo()) {
            event.preventDefault();
            redo();
          }
          break;

        case 'd':
          if (isModifierPressed && selectedComponentId) {
            event.preventDefault();
            duplicateComponent(selectedComponentId);
          }
          break;

        case 'delete':
        case 'backspace':
          if (selectedComponentId && !isModifierPressed) {
            event.preventDefault();
            removeComponent(selectedComponentId);
          }
          break;

        case 'escape':
          if (selectedComponentId) {
            event.preventDefault();
            selectComponent(null);
          }
          break;

        case 'a':
          if (isModifierPressed) {
            event.preventDefault();
            // Select all components (could be implemented later)
            console.log('Select all - not implemented yet');
          }
          break;

        case 'c':
          if (isModifierPressed && selectedComponentId) {
            event.preventDefault();
            copyComponent(selectedComponentId);
          }
          break;

        case 'v':
          if (isModifierPressed && canPaste()) {
            event.preventDefault();
            pasteComponent();
          }
          break;

        case 'x':
          if (isModifierPressed && selectedComponentId) {
            event.preventDefault();
            cutComponent(selectedComponentId);
          }
          break;

        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedComponentId,
    undo,
    redo,
    canUndo,
    canRedo,
    removeComponent,
    duplicateComponent,
    selectComponent,
    copyComponent,
    cutComponent,
    pasteComponent,
    canPaste,
  ]);
}

// Hook for displaying keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo' },
    { keys: ['Ctrl', 'D'], description: 'Duplicate selected component' },
    { keys: ['Delete'], description: 'Delete selected component' },
    { keys: ['Backspace'], description: 'Delete selected component' },
    { keys: ['Escape'], description: 'Deselect component' },
    { keys: ['Ctrl', 'A'], description: 'Select all (coming soon)' },
    { keys: ['Ctrl', 'C'], description: 'Copy component' },
    { keys: ['Ctrl', 'V'], description: 'Paste component' },
    { keys: ['Ctrl', 'X'], description: 'Cut component' },
  ];

  return shortcuts;
}