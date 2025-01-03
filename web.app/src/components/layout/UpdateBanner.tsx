import { X } from 'lucide-react'
import { config } from '../../utils/config'
import { openLink } from '../../utils/utils'

interface UpdateBannerProps {
  newVersion: string
  currentVersion: string
  tip: string
  onDismiss: () => void
}

const downloadNewVersion = async () => {
  // Download new version

  let url = '';

  if (config.OS === "win")
    url = 'https://github.com/aurgatech/apps/releases';

  if (config.OS === "linux")
    url = 'https://github.com/aurgatech/linux-binaries/releases'

  if (url) {
    openLink(url)
  }
};

export function UpdateBanner({ newVersion, currentVersion, tip, onDismiss }: UpdateBannerProps) {

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-100 dark:border-blue-800">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">New version available!</span>
            {' '}Update from {currentVersion} to <a href='#' className='font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200'
              onClick={downloadNewVersion}
              title={tip}>{newVersion}</a>
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 ml-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
