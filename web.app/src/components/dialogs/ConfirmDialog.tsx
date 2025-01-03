import { X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  closeText: string
  confirmText: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ isOpen, title, message, closeText, confirmText, onClose, onConfirm }: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>
        
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            {closeText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
