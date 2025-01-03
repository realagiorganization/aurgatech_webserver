import { Outlet } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export function AuthLayout() {
  const { theme, setTheme } = useTheme()
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-900`}>
      <button
        onClick={toggleTheme}
        className="fixed top-4 left-4 p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Toggle dark mode"
      >
        {theme === 'light' ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>
      <div className="w-full max-w-md px-8 py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AURGA Viewer</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your devices seamlessly</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
