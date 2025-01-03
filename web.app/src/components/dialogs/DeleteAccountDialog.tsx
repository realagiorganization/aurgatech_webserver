import { useState } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { getServerUrl, logoutAndRedirect } from '../../utils/utils'
import { User } from '../../types/types'

interface DeleteAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

type DeleteStep = 'confirm' | 'verify' | 'processing'

export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const [step, setStep] = useState<DeleteStep>('confirm')
  const [verificationCode, setVerificationCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  
  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const serverUrl = getServerUrl();
      const user = JSON.parse(localStorage.getItem('user') || '{}') as User
      const response = await fetch(serverUrl + '/account/deactivate_request',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify({
            uid: user.uid,
            token: user.token})
        });
        
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      if (data.status !== 0) {
        if (data.status === -100) {
          toast.error('Request too often! Please try again later.');
        }else if (data.status === -104) {
          toast.error('Invalid email. Please try again later.');
        }else {
          toast.error('Unknown error. Please try again.');
        }
        return;
      }

      setStep('verify')
      toast.success('Verification code sent to your email')
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code')
      return
    }

    setIsSubmitting(true)
    setStep('processing')

    try {
      // Simulate API verification
      const serverUrl = getServerUrl();
      const user = JSON.parse(localStorage.getItem('user') || '{}') as User
      const response = await fetch(serverUrl + '/account/deactivate_confirm',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify({
            uid: user.uid,
            token: user.token,
            code: verificationCode})
        });

      if(!response.ok) throw new Error();
        const data = await response.json();
        if(data.status !== 0) {
        if (data.status === -100) {
          toast.error('Request too often! Please try again later.');
        }else if (data.status === -104) {
            toast.error('Invalid email. Please try again later.');
        }else if (data.status === -110) {
            toast.error('Invalid verification code. Please try again later.');
        }else if (data.status === -111) {
            toast.error('Verification code expired. Please try again later.');
        }else {
            toast.error('Unknown error. Please try again.');
        }
        setStep('verify')
        return;
      }

      toast.success('Account deleted successfully');
      onClose();
      logoutAndRedirect();
      navigate('/signin');
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
      setStep('verify');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Account</h2>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-600 dark:text-red-400">
                <p className="font-medium">Warning: This action cannot be undone</p>
                <p>Deleting your account will:</p>
                <ul className="list-disc ml-4 mt-2">
                  <li>Remove all your device connections</li>
                  <li>Delete all your saved settings</li>
                  <li>Permanently delete your account data</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Account
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Please enter the verification code sent to your email to confirm account deletion.
            </p>

            <input
              type="text"
              maxLength={6}
              placeholder="Enter verification code"
              className="w-full px-3 py-2 text-center tracking-widest border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setStep('confirm')}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={isSubmitting}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify & Delete
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-600 dark:text-red-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Deleting account...</p>
          </div>
        )}
      </div>
    </div>
  )
}
