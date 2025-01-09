import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { User as LucideUser, Pencil, List, RefreshCw, Lock, Unlock, Laptop, X, Trash2, ArrowRight, ArrowLeft, CheckCircle, Pen, UserPlus, KeyRound, ClipboardPaste } from 'lucide-react'
import toast from 'react-hot-toast'
import type { User, Device, SubAccount } from '../../types/types'
import { config } from '../../utils/config'
import { getServerUrl, logoutAndRedirect } from '../../utils/utils'
import { useNavigate } from 'react-router-dom'
import { DeleteSubAccountDialog } from '../dialogs/DeleteSubAccountDialog'
import { RenameDialog } from '../dialogs/RenameDialog'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { ChangeEmailDialog } from '../dialogs/ChangeEmailDialog'

export function Account() {
  const navigate = useNavigate()
  const [showSendInvitation, setShowSendInvitation] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameAccountDialog, setShowRenameAccountDialog] = useState(false)
  const [showRenameSubAccountDialog, setShowRenameSubAccountDialog] = useState(false)
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [selectedSubAccount, setSelectedSubAccount] = useState<SubAccount | null>(null)
  const [showDeviceAssignment, setShowDeviceAssignment] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showInvitationCodeInput, setShowInvitationCodeInput] = useState(false)
  const [mainAccounts, setMainAccounts] = useState<User[]>([])
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnectAccount, setDisconnectAccount] = useState<User | null>(null)
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false)
  const [mainUser, setMainUser] = useState<User>(() => {
    return JSON.parse(localStorage.getItem('user') || '{}') as User;
  })

  // Get bound devices from localStorage
  const [boundDevices, setBoundDevices] = useState<Device[]>([])
  const subAccountContainerRef = useRef<HTMLDivElement>(null);
  const [maxContainerHeight, setMaxContainerHeight] = useState<number>(300);

  let assigningDevice: boolean = false

  const [hasClipboardContent, setHasClipboardContent] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(mainUser));
  }, [mainUser]);

  const checkClipboardContent = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // check if text is 6 length digits
      const isValidCode = /^[0-9]{6}$/.test(text.trim());
      setHasClipboardContent(isValidCode);
    } catch (error) {
      setHasClipboardContent(false);
    }
  };

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (codeInputRef.current) {
        codeInputRef.current.value = text.trim();
      }
    } catch (error) {
      toast.error('Failed to paste from clipboard');
    }
  };

  const handleRefreshSubAccounts = async () => {
    if (!mainUser) return

    setIsRefreshing(true)
    try {
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/get_subaccount_list',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: mainUser.uid,
            token: mainUser.token,
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          {
            const devices = data.devices.map((item: any) => ({
              id: item.id, // Map 'id' directly
              name: item.name, // Map 'name' directly
              type: 'AVW1', // Map 'type' directly
              status: 'online', // Map 'status' directly
              isUSB: false, // Map 'isUSB' directly
              isHID: false, // Map 'isHID' directly
              cloudType: 1,
              flags: 0,
              ipAddress: '', // Map 'ipAddress' directly
              macAddress: '', // Not provided in JSON, set to empty string
              assignedTo: undefined, // Not provided in JSON, set to undefined
            }))

            setBoundDevices(devices)
            const accounts = data.accounts.map((item: any) => ({
              id: item.id, // Map 'id' directly
              name: item.name, // Map 'name' directly
              email: item.email, // Map 'email' directly
              type: 'sub',
              createdAt: item.createdAt,
              // item.status: 0 - pending, 1 - accepted 2 - active 3 - disabled 4 - deleted
              status: item.status === 0 ? 'pending' : item.status === 1 ? 'accepted' : item.status === 2 ? 'active' : item.status === 3 ? 'disabled' : item.status === 4 ? 'deleted' : 'pending',
              devices: item.devices,
              parentId: mainUser.id
            }));

            setSubAccounts(accounts)
            if (localStorage.getItem('limitNotifications') !== 'true') toast.success('Sub Accounts refreshed successfully')
          }
          break;
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect();
          navigate('/signin');
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

  const handleSendInvitation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const name = formData.get('name') as string

    if (!email || !name) {
      toast.error('Please fill in all fields')
      return
    }

    const serverUrl = getServerUrl() + '/api/v2/send_invitation'
    const serverType = localStorage.getItem('serverType');
    let server = localStorage.getItem('serverUrl');

    if (serverType !== 'private') {
      server = config.BASE_URL;
    }

    try {
      // Send invitation email
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: mainUser.uid,
          token: mainUser.token,
          email: email,
          name: name,
          invitedBy: mainUser.email,
          server: server + '/invitation'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send invitation')
      }

      const data = await response.json()
      switch (data.status) {
        case 0:
          await navigator.clipboard.writeText(data.code)
          toast.success(`Invitation sent successfully. The invitation code ${data.code} is copied to your clipboard.`)
          break;
        case -100:
          toast.error('Submit too often. Please try again later.')
          break;
        default:
          toast.error('Unknown error. Please try again.')
          break;
      }
      setShowSendInvitation(false)
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    }
  }

  const updateSubAccountStatus = async (accountId: string, status: 'active' | 'disabled' | 'deleted') => {
    if (!mainUser) return

    // convert accountId to number
    const accountNumber = parseInt(accountId);
    if (isNaN(accountNumber)) {
      // invalid account id, show no toast
      return;
    }

    let statusNumber: number = 0;
    switch (status) {
      case 'active':
        statusNumber = 2;
        break;
      case 'disabled':
        statusNumber = 3;
        break;
      case 'deleted':
        statusNumber = 4;
        break;
      default:
        return;
    }

    try {
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/update_subaccount_state',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: mainUser.uid,
            token: mainUser.token,
            accountId: accountNumber,
            state: statusNumber
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          {

            // if status === 'deleted', remove sub account from subAccounts
            if (status === 'deleted') {
              setSubAccounts(prev => prev.filter(account => account.id !== accountId))
            } else {
              setSubAccounts(prev => prev.map(account => {
                if (account.id === accountId) {
                  //const newStatus = account.status === 'active' ? 'disabled' : 'active'
                  //toast.success(`Account ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
                  return { ...account, status: status }
                }
                return account
              }))
            }
          }
          break;
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect();
          navigate('/signin');
          break;
        default:
          toast.error('Unknown error. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    }
  }

  const toggleSubAccountStatus = async (accountId: string) => {
    // get current status of sub account
    const account = subAccounts.find(acc => acc.id === accountId)
    if (!account) return

    const newStatus = account.status === 'active' ? 'disabled' : 'active'

    await updateSubAccountStatus(accountId, newStatus)
  }

  const handleDeviceAssignment = async (deviceId: string) => {
    if (!selectedSubAccount || !mainUser || assigningDevice) return

    // convert accountId to number
    const accountNumber = parseInt(selectedSubAccount.id);
    const deviceNumber = parseInt(deviceId);
    if (isNaN(accountNumber) || isNaN(deviceNumber)) {
      // invalid account id, show no toast
      return;
    }

    assigningDevice = true
    // check if the device is already assigned to the sub account
    const isAdd = !selectedSubAccount.devices.includes(deviceId);

    try {
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/modify_subdevice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: mainUser.uid,
            token: mainUser.token,
            accountId: accountNumber,
            deviceId: deviceNumber,
            isAdd: isAdd
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          {
            // Update the sub-account's device list
            setSubAccounts(prev => {
              const updated = prev.map(account => {
                if (account.id === selectedSubAccount.id) {
                  const devices = account.devices || []
                  const hasDevice = devices.includes(deviceId)
                  return {
                    ...account,
                    devices: hasDevice
                      ? devices.filter(id => id !== deviceId)
                      : [...devices, deviceId]
                  }
                }
                return account
              })
              return updated
            })
          }
          break;
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect();
          navigate('/signin');
          break;
        default:
          toast.error('Unknown error. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    }
  }

  const handleRenameAccount = async (newName: string) => {
    if (!mainUser || !newName) return

    try {
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/rename_account',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: mainUser.uid,
            token: mainUser.token,
            newName: newName
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          {
            setMainUser(prev => ({ ...prev, name: newName }))
            break;
          }
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect();
          navigate('/signin');
          break;
        default:
          toast.error('Unknown error. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    }
  }

  const handleRenameSubAccount = async (newName: string) => {
    if (!selectedSubAccount || !mainUser || !newName) return

    try {
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/rename_subaccount',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: mainUser.uid,
            token: mainUser.token,
            accountId: selectedSubAccount.id,
            newName: newName
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          {
            setSubAccounts(prev => prev.map(account => {
              if (account.id === selectedSubAccount.id) {
                //const newStatus = account.status === 'active' ? 'disabled' : 'active'
                //toast.success(`Account ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
                return { ...account, name: newName }
              }
              return account
            }))

            break;
          }
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect();
          navigate('/signin');
          break;
        default:
          toast.error('Unknown error. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    }
  }

  const handleAcceptInvitation = async (code: string) => {
    if (!mainUser) return

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(serverUrl + '/api/v2/accept_invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: mainUser.uid,
          token: mainUser.token,
          invitationCode: code
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          toast.success('Invitation accepted successfully');
          setShowInvitationCodeInput(false);
          // Refresh the main accounts list
          await fetchMainAccounts();
          break;
        case -100:
          toast.error('Loading too fast. Please try again.');
          break;
        case -106:
        case -109:
          logoutAndRedirect();
          navigate('/signin');
          break;
        default:
          toast.error('Invalid or expired invitation code.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    }
  }

  const fetchMainAccounts = async () => {
    if (!mainUser) return

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(serverUrl + '/api/v2/get_main_accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: mainUser.uid,
          token: mainUser.token
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      if (data.status === 0) {
        setMainAccounts(data.result || []);
      }
    } catch (error) {
      //console.error('Failed to fetch main accounts:', error);
    }
  }

  const handleDisconnectMainAccount = async (accountId: string) => {
    if (!mainUser) return

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(serverUrl + '/api/v2/disconnect_main_account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: mainUser.uid,
          token: mainUser.token,
          accountId: accountId
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      if (data.status === 0) {
        toast.success('Successfully disconnected from main account');
        setMainAccounts(prev => prev.filter(account => account.id !== accountId));
      } else {
        toast.error('Failed to disconnect from main account');
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    }
  }

  useEffect(() => {
    fetchMainAccounts();
    handleRefreshSubAccounts();
  }, []);

  useEffect(() => {
    if (selectedSubAccount) {
      const updatedAccount = subAccounts.find(acc => acc.id === selectedSubAccount.id)
      if (updatedAccount) {
        setSelectedSubAccount(updatedAccount)
      }
    }
  }, [subAccounts, selectedSubAccount])

  useLayoutEffect(() => {
    const calculateMaxHeight = () => {
      if (subAccountContainerRef.current) {
        const containerRect = subAccountContainerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const offsetY = containerRect.top + 20;
        const calculatedMaxHeight = Math.max(200, viewportHeight - offsetY);
        setMaxContainerHeight(calculatedMaxHeight);
      }
    };

    calculateMaxHeight();
    window.addEventListener('resize', calculateMaxHeight);
    return () => window.removeEventListener('resize', calculateMaxHeight);
  }, []);

  const filteredDevices = boundDevices.filter(device => {
    if (searchTerm) {
      return device.name.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  // Sort sub accounts: enabled first, then sort by name within groups
  const sortedSubAccounts = [...subAccounts].sort((a, b) => {
    // First sort by enabled status
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1
    }
    // Then sort by name within each group
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header Section */}
      <div className="flex-none p-8 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your account and sub-accounts</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-hidden px-8 pb-8">
        <div className="h-full flex flex-col space-y-4">
          {/* Account Info Card - Fixed */}
          <div className="flex-none bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <LucideUser className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {mainUser.name || 'Main Account'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowRenameAccountDialog(true)
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Edit Account Name"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-500 dark:text-gray-400">
                      {mainUser.email || 'No email set'}
                    </p>
                    <button
                      onClick={() => setShowEmailChangeDialog(true)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Edit Email"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInvitationCodeInput(true)}
                className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                title="Enter Invitation Code"
              >
                <KeyRound className="w-5 h-5" />
              </button>
            </div>

            {/* Main Accounts Section */}
            {mainAccounts.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <List className="w-4 h-4 mr-2" />
                  Connected Main Accounts
                </div>
                <div className="flex flex-wrap gap-2">
                  {mainAccounts.map((account, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">{account.name}({account.email})</span>
                      <button
                        onClick={() => {
                          setDisconnectAccount(account)
                          setShowDisconnectDialog(true)
                        }}
                        className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                className="flex items-center"
              >
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sub Accounts</h2>
                  <RefreshCw
                    onClick={(e) => {
                      e.stopPropagation()
                      fetchMainAccounts()
                      handleRefreshSubAccounts()
                    }}
                    className={`w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer transition-colors ${isRefreshing ? 'animate-spin' : ''
                      }`}
                  />
                </div>
              </button>

              <button
                onClick={() => setShowSendInvitation(true)}
                className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                title="Send Invitation"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>

            <div ref={subAccountContainerRef} className="overflow-y-auto"
              style={{
                maxHeight: `${maxContainerHeight}px`,
                overflowY: 'auto'
              }} >
              <div className="space-y-4">
                {sortedSubAccounts.map(account => (
                  <div
                    key={account.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{account.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{account.email}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Created: {new Date(account.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${account.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                            {account.status === 'pending' ? 'Pending' : account.status === 'accepted' ? 'Accepted' : account.status === 'active' ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSubAccount(account)
                            setShowRenameSubAccountDialog(true)
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Rename Account"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        {account.status === 'active' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedSubAccount(account)
                                setShowDeviceAssignment(true)
                              }}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Manage Devices"
                            >
                              <Laptop className="w-5 h-5" />
                            </button>

                          </>
                        )}
                        {account.status === 'accepted' ? (
                          <button
                            onClick={() => updateSubAccountStatus(account.id, 'active')}
                            className="p-2 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200"
                            title='Approve Account'
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleSubAccountStatus(account.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title={account.status === 'active' ? 'Disable Account' : 'Enable Account'}
                          >
                            {account.status === 'active' ? (
                              <Lock className="w-5 h-5" />
                            ) : (
                              <Unlock className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSubAccount(account)
                            setShowDeleteDialog(true)
                          }}
                          className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                          title="Remove Account"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Display assigned devices */}
                    {account.devices && account.devices.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Devices:</h4>
                        <div className="flex flex-wrap gap-2">
                          {account.devices.map(deviceId => {
                            const device = boundDevices.find(d => d.id === deviceId)
                            return device ? (
                              <span
                                key={device.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                              >
                                {device.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sub-Accounts Card with Scrollable Content */}
        </div>
      </div>

      {/* Send Invitation Modal */}
      {showSendInvitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite Sub Account</h2>
              <button
                onClick={() => setShowSendInvitation(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSendInvitation(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Assignment Dialog */}
      {showDeviceAssignment && selectedSubAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manage Devices for {selectedSubAccount.name}
              </h2>
              <button
                onClick={() => {
                  setShowDeviceAssignment(false)
                  setSelectedSubAccount(null)
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add the note here */}
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Note: The device firmware version must be greater than <strong>241129184309</strong>; otherwise, it does not support sharing.
              </p>
            </div>

            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Device Lists */}
              <div className="grid grid-cols-2 gap-4">
                {/* Available Devices */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Devices</h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg h-96 overflow-y-auto">
                    {filteredDevices
                      .filter(device => !selectedSubAccount.devices.includes(device.id))
                      .map(device => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{device.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{device.type}</p>
                          </div>
                          <button
                            onClick={() => handleDeviceAssignment(device.id)}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Assign device"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Assigned Devices */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Devices</h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg h-96 overflow-y-auto">
                    {filteredDevices
                      .filter(device => selectedSubAccount.devices.includes(device.id))
                      .map(device => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{device.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{device.type}</p>
                          </div>
                          <button
                            onClick={() => handleDeviceAssignment(device.id)}
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Remove device"
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteSubAccountDialog isOpen={showDeleteDialog}
        Account={selectedSubAccount}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={(account) => {
          updateSubAccountStatus(selectedSubAccount!.id, 'deleted')
          setShowDeleteDialog(false)
        }} />

      <RenameDialog
        originName={mainUser?.name}
        title='Rename Account'
        message='Account Name'
        isOpen={showRenameAccountDialog}
        onClose={() => setShowRenameAccountDialog(false)}
        onRename={(name) => handleRenameAccount(name)}
      />

      <RenameDialog
        originName={selectedSubAccount?.name}
        title='Rename Sub Account'
        message='Sub Account Name'
        isOpen={showRenameSubAccountDialog}
        onClose={() => setShowRenameSubAccountDialog(false)}
        onRename={(name) => handleRenameSubAccount(name)}
      />

      <ChangeEmailDialog
      originEmail={mainUser?.email}
      isOpen={showEmailChangeDialog}
      onClose={() => setShowEmailChangeDialog(false)}
      onSuccessfulChange={(email) => {
        setMainUser(prev => ({ ...prev, email: email }))
        setShowEmailChangeDialog(false)
      }
      } />

      {/* Invitation Code Input Modal */}
      {showInvitationCodeInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Enter Invitation Code</h2>
              <button
                onClick={() => setShowInvitationCodeInput(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const code = (e.currentTarget.elements.namedItem('code') as HTMLInputElement).value;
              handleAcceptInvitation(code);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Code
                </label>
                <div className="relative flex items-center">
                  {hasClipboardContent && (
                    <button
                      type="button"
                      onClick={handlePasteClick}
                      className="absolute left-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Paste from clipboard"
                    >
                      <ClipboardPaste className="w-5 h-5" />
                    </button>
                  )}
                  <input
                    type="text"
                    name="code"
                    ref={codeInputRef}
                    required
                    placeholder="Paste your invitation code here"
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${hasClipboardContent ? 'pl-10' : ''}`}
                    onFocus={() => checkClipboardContent()}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInvitationCodeInput(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Accept Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDisconnectDialog}
        title='Disconnect Main Account'
        message={`Are you sure you want to disconnect from the account "${disconnectAccount?.email}"? This action cannot be undone.`}
        closeText='Cancel'
        confirmText='Disconnect'
        onClose={() => {
          setShowDisconnectDialog(false)
          setDisconnectAccount(null)
        }}
        onConfirm={() => {
          if (disconnectAccount) {
            handleDisconnectMainAccount(disconnectAccount.id)
          }
        }}
      />
    </div>
  )
}
