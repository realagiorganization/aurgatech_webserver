// src/components/dialogs/RenameDeviceDialog.tsx
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface RenameDialogProps {
  isOpen: boolean
  title: string
  message: string
  originName: string
  onClose: () => void
  onRename: (newName: string) => void
}

export function RenameDialog({ originName, title, message, isOpen, onClose, onRename }: RenameDialogProps) {
  const [newName, setNewName] = useState('')

  useEffect(() => {
    setNewName(originName)
  }, [originName, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const name = newName.trim();
   
    if (name) {
      if(name === originName)return;

      const encoder = new TextEncoder();
      const utf8Array = encoder.encode(name);
  
      if(utf8Array.length > 32){
        toast.error('The device name must not exceed 32 characters in UTF-8 format.');  
        return;
      }
  
      onRename(name)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {message}
            </label>
            <input
              type="text"
              id="deviceName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter new name"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                       hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 
                       focus:ring-offset-2 focus:ring-blue-500"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}