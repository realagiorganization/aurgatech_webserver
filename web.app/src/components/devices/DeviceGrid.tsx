import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, Power, Edit, Download, Usb, Wifi, Cloud, RefreshCcw } from 'lucide-react'
import type { Device } from '../../types/types'
import { config } from '../../utils/config'

interface DeviceGridProps {
  devices: Device[]
  title: string
  onDeviceAction: (action: string, device: Device) => void
  isLanDevices: boolean
}

export function DeviceGrid({ devices, title, onDeviceAction, isLanDevices }: DeviceGridProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  const toggleMenu = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation()
    
    if (openMenuId === deviceId) {
      setOpenMenuId(null)
      return
    }

    const buttonRect = buttonRefs.current[deviceId]?.getBoundingClientRect()
    if (buttonRect) {
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      const menuHeight = 150 // Approximate menu height

      let top = buttonRect.bottom + 8
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        top = buttonRect.top - menuHeight - 8
      }

      setMenuPosition({
        top,
        left: Math.min(buttonRect.left, window.innerWidth - 224), // 224px = menu width (w-56)
      })
    }
    
    setOpenMenuId(deviceId)
  }

  const handleConnect = (device: Device) => {
    onDeviceAction('connect', device)
  }

  return (
    <div>
      {title && <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <div
            key={device.cloudType > 0 ? device.id : device.did}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 
            hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 hover:scale-[1.02] 
            transition-all duration-200 ease-in-out cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  {device.isUSB ? (
                    <Usb className="w-5 h-5 text-blue-500" />
                  ) : device.cloudType > 0 ? (
                    <Cloud className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Wifi className="w-5 h-5 text-green-500" />
                  )}
                  <h3 className="font-semibold text-gray-900 dark:text-white">{device.name}</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Firmware: {device.firmwareVersion > 0 ? device.firmwareVersion : 'Unknown' }</p>
              </div>
              <div className="relative">
                {device.hasFirmwareUpdate && (
                  <button title="Firmware update available"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeviceAction('firmware', device)
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <Download className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
                {!device.isUSB && (
                  <button
                    ref={(el) => buttonRefs.current[device.id] = el}
                    onClick={(e) => toggleMenu(e, device.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
                {openMenuId === device.id && (
                  createPortal(
                    <div
                      ref={menuRef}
                      style={{
                        position: 'fixed',
                        zIndex: 50,
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                      }}
                      className="w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(null)
                          onDeviceAction('wake', device)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Power className="w-4 h-4 mr-2" />
                        Wake Device
                      </button>
                      {/* Only show rename for bound devices */}
                      {!isLanDevices && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(null)
                              onDeviceAction('rename', device)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(null)
                              onDeviceAction('reboot', device)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Reboot
                          </button>
                        </>
                      )}
                    </div>,
                    document.body
                  )
                )}
              </div>
            </div>
            <div className="mt-4">
              {device.cloudType === 0 && (
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400"> {device.isUSB ? (device.isHID ? 'HID Mode' : 'USB Stream Mode') : 'IP Address:'} </span>{' '}
                  <span className="text-gray-900 dark:text-white">{device.ipAddress}</span>
                </p>
              )}
              <p className="text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Status:</span>{' '}
                <span
                  className={`inline-block w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    } mr-1`}
                ></span>
                <span className="text-gray-900 dark:text-white">{device.status}</span>
              </p>
              <p className="text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Last seen:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {new Date(device.lastSeen).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        ))}
        {devices.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
            No devices found
          </div>
        )}
      </div>
    </div>
  )
}
