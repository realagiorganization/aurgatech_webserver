import { useState } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { config } from '../../utils/config'

interface ResetSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ResetSettingsDialog({ isOpen, onClose, onConfirm }: ResetSettingsDialogProps) {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    setIsResetting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      onConfirm()
      toast.success('Settings reset successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to reset settings')
    } finally {
      setIsResetting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResetting) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reset Settings</h2>
          {!isResetting && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              <p className="font-medium">Are you sure you want to reset all settings?</p>
              <p className="mt-2">This will:</p>
              <ul className="list-disc ml-4 mt-2">
                <li>Clear saved themes and appearance settings</li>
              </ul>
              <p className="mt-2">Your account and device connections will not be affected.</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isResetting}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              {isResetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
