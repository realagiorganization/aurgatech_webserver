import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Device, User } from '../../types/types'
import { config } from '../../utils/config'
import { getServerUrl } from '../../utils/utils'

interface WakeOnLanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null; // The device to wake up
}

export function WakeOnLanDialog({ isOpen, onClose, device }: WakeOnLanDialogProps) {
  const [macAddress, setMacAddress] = useState('')
  const [hasBoundMac, setHasBoundMac] = useState(false)
  const [isCustomMac, setIsCustomMac] = useState(false)

  // Set the MAC address when the dialog opens or target device changes
  useEffect(() => {
    if (device) {
      setMacAddress(device?.macAddress || '')
      if ((device?.flags & 4) === 4) {
        setHasBoundMac(true)
        setIsCustomMac(false)
      } else {
        setHasBoundMac(false)
        setIsCustomMac(true)
      }
    }
  }, [device, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
    const mac = isCustomMac ? macAddress : '';
    if (isCustomMac && !macRegex.test(mac)) {
      toast.error('Please enter a valid MAC address (format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)')
      return
    }

    if (isCustomMac) {
      device.macAddress = mac;
    }

    const type = isCustomMac ? 1 : 0;

    if (device?.cloudType > 0) {
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
              did: '' + device?.id,
              cmd: 'wol',
              payload: JSON.stringify({
                type: type,
                mac: mac,
              }),
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();

        switch (data.status) {
          case 0:
            toast.success(`Sending Wake-on-LAN packet through ${device?.name}...`);
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
    // if (hasBoundMac) {
    //   // Sending WoL through another device
    //   //toast.success(`Sending Wake-on-LAN packet to ${macAddress} through ${senderDevice.name}`)
    // } else {
    //   // Direct WoL to device
    //   toast.success(`Sending Wake-on-LAN packet to ${macAddress}`)
    // }
    if (device?.cloudType === 0) {
      toast.success('Sending Wake-on-LAN packet...')
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Send Wake on LAN packet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isCustomMac ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Device bound MAC
              </label>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <span className="text-gray-700 dark:text-gray-200">{device.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hasBoundMac) setIsCustomMac(true)
                }}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Manually enter MAC address
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                MAC Address
              </label>
              <input
                type="text"
                placeholder="XX:XX:XX:XX:XX:XX"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
              />
              {hasBoundMac && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMac(false)
                  }}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Use device bound MAC address
                </button>
              )}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Wake on LAN packet will be sent through {device.name}
            </p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Wake Device
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
