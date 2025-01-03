import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LifeBuoy, Settings, Laptop, LogOut, LogIn, Server, Sun, Moon, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { UpdateBanner } from './UpdateBanner'
import { useEffect, useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { config } from '../../utils/config'
import { logoutAndRedirect } from '../../utils/utils'

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = localStorage.getItem('user')
  const serverUrl = localStorage.getItem('serverUrl')
  const privateCloud = localStorage.getItem('serverType') === 'private'

  const { theme, setTheme } = useTheme()

  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [newVersion, setNewVersion] = useState('')
  const [versionTip, setVersionTip] = useState('')

  const fetchAppVersion = async () => {
    try {
      let url = 'https://api.github.com/repos/aurgatech/apps/releases/latest';
      if (config.OS === 'linux') {
        url = 'https://api.github.com/repos/aurgatech/linux-binaries/releases/latest';
      }

      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Referrer-Policy': 'no-referrer',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await resp.json();
      let version = data.tag_name;
      let trimmedVersion = version.replace(/[^0-9.]/g, '');
      //console.log(trimmedVersion);
      let versionParts = trimmedVersion.split('.');
      let major = parseInt(versionParts[0]);
      let minor = parseInt(versionParts[1]);
      let ver = major * 1000000 + minor * 10000;
      if (versionParts.length > 2) {
        ver += parseInt(versionParts[2]) * 100;
      }
      if (versionParts.length > 3) {
        ver += parseInt(versionParts[3]);
      }

      config.LATEST_VERSION = ver;

      if (config.APP_VERSION_NUM > 0 && ver > config.APP_VERSION_NUM) {
        setNewVersion(version)
        setVersionTip(data.body)
        setShowUpdateBanner(true)
      }

      //console.log(ver);
      // get response text
    } catch (error) {
      //console.error(error);
    }
  };

  const handleLogout = () => {
    if (localStorage.getItem('limitNotifications') !== 'true') toast.success('Logged out successfully')
    logoutAndRedirect()
    navigate('/signin');
  }

  const handleLogin = () => {
    navigate('/signin');
  }

  const handleDismissUpdate = () => {
    setShowUpdateBanner(false)
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 relative`}>
      {showUpdateBanner && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <UpdateBanner
            newVersion={newVersion}
            currentVersion={config.APP_VERSION}
            tip={versionTip}
            onDismiss={handleDismissUpdate}
          />
        </div>
      )}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">AURGA Viewer</h1>
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
            </div>
            {user && serverUrl && (
              <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Server className="w-3 h-3 mr-1" />
                {privateCloud ? serverUrl : 'AURGA Cloud'}
              </div>
            )}
          </div>
          <nav className="mt-8">
            <Link
              to="/devices"
              className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${location.pathname === '/devices' ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
            >
              <Laptop className="w-5 h-5 mr-3" />
              Devices
            </Link>
            {user && (
              <Link
                to="/account"
                className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${location.pathname === '/account' ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
              >
                <Users className="w-5 h-5 mr-3" />
                Account
              </Link>
            )}
            <Link
              to="/help-center"
              className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${location.pathname === '/help-center' ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
            >
              <LifeBuoy className="w-5 h-5 mr-3" />
              Help Center
            </Link>
            <Link
              to="/settings"
              className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${location.pathname === '/settings' ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Link>
          </nav>
          <div className="absolute bottom-0 w-64 p-4">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
              >
                <LogIn className="w-5 h-5 mr-3" />
                Login
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
