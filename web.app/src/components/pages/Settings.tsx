import { useState } from 'react'
import { Sun, Moon, Trash2, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'
import { DeleteAccountDialog } from '../dialogs/DeleteAccountDialog'
import { ResetSettingsDialog } from '../dialogs/ResetSettingsDialog'
import { config } from '../../utils/config'

export function Settings() {
  const [limitNotifications, setLimitNotifications] = useState(() => {
    return localStorage.getItem('limitNotifications') === 'true'
  })

  const [skipLogin, setSkipLogin] = useState(() => {
    return localStorage.getItem('skipLogin') === 'true'
  })
  const [renderType, setRenderType] = useState(() => {
    return localStorage.getItem('renderType') || 'dx11'
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const { theme, setTheme } = useTheme()
  const user = localStorage.getItem('user')

  const handleLimitNotificationsToggle = (checked: boolean) => {
    setLimitNotifications(checked)
    localStorage.setItem('limitNotifications', checked.toString())
    toast.success(`Limit notifications ${checked ? 'enabled' : 'disabled'}`)
  }

  const handleResetSettings = () => {
    // Reset all settings to defaults
    setLimitNotifications(false)
    setSkipLogin(false)
    setRenderType('dx11')
    setTheme('dark')

    // Clear stored settings
    // Preserve user authentication
    const userData = localStorage.getItem('user')
    localStorage.clear()
    if (userData) {
      localStorage.setItem('user', userData)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-8 flex-grow overflow-y-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            {/* Theme Settings */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Appearance</h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-200">Theme</span>
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {theme === 'light' ? (
                    <>
                      <Sun className="w-4 h-4 mr-2" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 mr-2" />
                      Dark Mode
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Notifications */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Notifications</h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-200">Limit notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={limitNotifications}
                    onChange={(e) => handleLimitNotificationsToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Danger Zone</h3>
              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => setShowResetDialog(true)}
                    className="flex items-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900/40"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset All Settings
                  </button>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Reset all settings to their default values. Your account and device connections will not be affected.
                  </p>
                </div>

                {user && (
                  <div>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </button>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DeleteAccountDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
        />

        <ResetSettingsDialog
          isOpen={showResetDialog}
          onClose={() => setShowResetDialog(false)}
          onConfirm={handleResetSettings}
        />
      </div>
    </div>
  )
}
