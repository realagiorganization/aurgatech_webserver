import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import type { SubAccount } from '../../types/types'

interface DeleteSubAccountDialogProps {
  isOpen: boolean
  Account: SubAccount | null
  onClose: () => void
  onConfirm: (account: SubAccount) => void
}

export function DeleteSubAccountDialog({ isOpen, Account, onClose, onConfirm }: DeleteSubAccountDialogProps) {
  const [isSwitching, setIsSwitching] = useState(false)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSwitching) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Sub Account</h2>
          {!isSwitching && (
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
              <p className="font-medium">Are you sure you want to delete the sub-account "{Account?.name}" ?</p>
              <p className="mt-2">This will:</p>
              <ul className="list-disc ml-4 mt-2">
                <li>Permanently delete the sub-account.</li>
                <li>Disconnect the sub-account from all assigned devices.</li>
                <li>You can send a new invitation to recreate the sub-account and reassign devices to it.</li>
              </ul>
              <p className="mt-2">Your account and other sub-accounts will not be affected.</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSwitching}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={()=>onConfirm(Account!)}
              className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}