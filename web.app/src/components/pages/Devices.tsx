import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import type { Device, User } from '../../types/types'
import { WakeOnLanDialog } from '../dialogs/WakeOnLanDialog'
import { RenameDialog } from '../dialogs/RenameDialog'

import { DeviceGrid } from '../devices/DeviceGrid'
import { config } from '../../utils/config'
import { getServerUrl, logoutAndRedirect } from '../../utils/utils'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'

export function Devices() {
  const user = localStorage.getItem('user')
  const navigate = useNavigate()

  // Load bound devices from localStorage
  const [boundDevices, setBoundDevices] = useState<Device[]>(() => {
    return config.BOUND_DEVICES;
  })

  const [lanDevices, setLanDevices] = useState<Device[]>(() => {
    return config.LAN_DEVICES;
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showWolDialog, setShowWolDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showRebootConfirmDialog, setShowRebootConfirmDialog] = useState(false)
  const [deviceToRename, setDeviceToRename] = useState<Device | null>(null)
  const [showBoundDevices, setShowBoundDevices] = useState(true)
  const boundDeviceContainerRef = useRef<HTMLDivElement>(null);
  const [maxBoundDeviceContainerHeight, setMaxBoundDeviceContainerHeight] = useState<number>(300);

  const handleRefreshBoundDevices = async () => {
    if (!user) return

    setIsRefreshing(true)
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}') as User
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/loginWithToken',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            token: user.token,
            isWeb: true
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          {
            user.uid = data.uid;
            user.token = data.token;
            localStorage.setItem('user', JSON.stringify(user));

            const halfHourAgo = new Date(new Date().getTime() - 30 * 60 * 1000);
            const devices = data.devices.map(item => ({
              id: item.id, // Map 'id' directly
              name: item.name, // Map 'name' directly
              type: (item.model === '1') ? 'AVW1' : '', // Map 'model' to 'type'
              status: (new Date(item.lastSeen) > halfHourAgo) ? 'online' : 'offline', // Map 'secured' to 'status'
              isUSB: false, // Map 'is_usb' to 'isUSB'
              isHID: false, // Map 'is_hid' to 'isHID'
              cloudType: 1,
              flags: item.flags,
              ipAddress: '', // Map 'ip' to 'ipAddress'
              macAddress: '', // Not provided in JSON, set to empty string
              lastSeen: new Date(item.lastSeen), // Not provided in JSON, set to empty string
              assignedTo: undefined, // Not provided in JSON, set to undefined
              firmwareVersion: item.build,
              hasFirmwareUpdate: false, // Example logic for firmware update
              isSubDevice: false
            }));

            const subdevices = data.subdevices.map(item => ({
              id: item.id, // Map 'id' directly
              name: item.name, // Map 'name' directly
              type: (item.model === '1') ? 'AVW1' : '', // Map 'model' to 'type'
              status: (new Date(item.lastSeen) > halfHourAgo) ? 'online' : 'offline', // Map 'secured' to 'status'
              isUSB: false, // Map 'is_usb' to 'isUSB'
              isHID: false, // Map 'is_hid' to 'isHID'
              cloudType: 2,
              flags: item.flags,
              ipAddress: '', // Map 'ip' to 'ipAddress'
              macAddress: '', // Not provided in JSON, set to empty string
              lastSeen: new Date(item.lastSeen), // Not provided in JSON, set to empty string
              assignedTo: undefined, // Not provided in JSON, set to undefined
              firmwareVersion: item.build,
              hasFirmwareUpdate: false, // Example logic for firmware update
              isSubDevice: false,
            }));

            // concate devices and subdevices
            const allDevices = [...devices, ...subdevices];
            setBoundDevices(allDevices);
            if (localStorage.getItem('limitNotifications') !== 'true') toast.success('Devices refreshed successfully')
          }
          break;
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect()
          navigate('/signin')
          break;
        default:
          toast.error('Unknown error. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDeviceAction = (action: string, device: Device) => {
    switch (action) {
      case 'wake':
        setSelectedDevice(device)
        setShowWolDialog(true)
        break
      case 'rename':
        // Only allow rename for bound devices
        setDeviceToRename(device)
        setShowRenameDialog(true)
        break
      case 'reboot':
        setSelectedDevice(device)
        setShowRebootConfirmDialog(true)
        break
      default:
        break
    }
  }

  const handleDeviceRename = async (id: string, name: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}') as User
      const serverUrl = getServerUrl();
      name = decodeURIComponent(name);

      const response = await fetch(serverUrl + '/api/v2/rename_device',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            token: user.token,
            did: '' + id,
            title: name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      switch (data.status) {
        case 0:
          setBoundDevices(prev => prev.map(d =>
            d.id === id ? { ...d, name: name } : d
          ))
          if (localStorage.getItem('limitNotifications') !== 'true') toast.success('Device renamed successfully')
          break;
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect()
          navigate('/signin')
          break;
        default:
          toast.error('Unknown error. Please try again.');
          break;
      }

    } catch (error) {
      //error(error);
      toast.error('Could not connect to server. Please try again.');
    } finally {

    }
  }

  const handleDeviceReboot = async (device: Device) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}') as User
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/request_device',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            token: user.token,
            did: '' + device.id,
            cmd: 'reboot',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      switch (data.status) {
        case 0:

          break;
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          break;
        default:
          toast.error('Unknown error. Please try again.');
          break;
      }

    } catch (error) {
      //error(error);
      toast.error('Could not connect to server. Please try again.');
    } finally {

    }
  }

  // Update localStorage when bound devices change
  useEffect(() => {
    if (user) {
      config.BOUND_DEVICES = boundDevices;
    }
  }, [boundDevices, user])

  useEffect(() => {
    config.LAN_DEVICES = lanDevices;
  }, [lanDevices])

  useEffect(() => {
    if (localStorage.getItem('user')) {
      handleRefreshBoundDevices();
    }
  }, [])

  const calculateLayout = () => {
    const viewportHeight = window.innerHeight;

    if (boundDeviceContainerRef.current) {
      const containerRect = boundDeviceContainerRef.current.getBoundingClientRect();
      const offsetY = containerRect.top + 20;
      const calculatedMaxHeight = Math.max(200, viewportHeight - offsetY);
      setMaxBoundDeviceContainerHeight(calculatedMaxHeight);
    }
  }

  useLayoutEffect(() => {
    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);
  }, []);

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devices</h1>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col space-y-6">
        {/* Bound Devices Section */}
        {user ? (
          <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bound Devices</h2>
                    <RefreshCw
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRefreshBoundDevices()
                      }}
                      className={`w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer transition-colors ${isRefreshing ? 'animate-spin' : ''
                        }`}
                    />
                  </div>
                </div>
              </button>
            </div>

            {showBoundDevices && (
              <div ref={boundDeviceContainerRef} className="overflow-y-auto"
                style={{
                  maxHeight: `${maxBoundDeviceContainerHeight}px`,
                  overflowY: 'auto'
                }} >
                <div className="p-4">
                  <DeviceGrid
                    devices={boundDevices}
                    title=""
                    onDeviceAction={handleDeviceAction}
                    isLanDevices={false}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-blue-700 dark:text-blue-300">
              <Link to="/signin" className="font-medium hover:underline">Sign in</Link>
              {' '}to view and manage your bound devices.
            </p>
          </div>
        )}
      </div>

      <WakeOnLanDialog
        isOpen={showWolDialog}
        onClose={() => {
          setShowWolDialog(false)
          setSelectedDevice(null)
        }}
        device={selectedDevice}
      />
      <RenameDialog
        originName={deviceToRename?.name}
        title='Rename Device'
        message='Device Name'
        isOpen={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        onRename={(name) => {
          handleDeviceRename(deviceToRename.id, name);
        }}
      />

      <ConfirmDialog isOpen={showRebootConfirmDialog}
        title='Reboot Device'
        message={`Are you sure you want to reboot ${selectedDevice?.name}?`}
        closeText='Cancel'
        confirmText='Reboot'
        onClose={() => setShowRebootConfirmDialog(false)}
        onConfirm={() => {
          setShowRebootConfirmDialog(false)
          handleDeviceReboot(selectedDevice as Device);
        }} />
    </div>
  )
}
