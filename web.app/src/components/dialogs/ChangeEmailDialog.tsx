import { X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getServerUrl, isValidEmail } from '../../utils/utils'
import { User } from '../../types/types'

interface ChangeEmailDialogProps {
  isOpen: boolean
  originEmail: string
  onClose: () => void
  onSuccessfulChange: (newEmail: string) => void
}

export function ChangeEmailDialog({ originEmail, isOpen, onClose, onSuccessfulChange }: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email'); // Track current step
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const [error, setError] = useState<string | null>(null); // Track error messages
  const [sessionToken, setSessionToken] = useState<string | null>(''); // Track session token
  const mainUser = JSON.parse(localStorage.getItem('user') || '{}') as User


  useEffect(() => {
    setNewEmail(originEmail);
    setStep('email'); // Reset step when dialog opens
    setError(null); // Clear errors when dialog opens
  }, [originEmail, isOpen]);

  if (!isOpen) return null

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = newEmail.trim();

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (email.toLowerCase() === originEmail.toLowerCase()) {
      setError('The new email address must be different from the current one.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/update_email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: mainUser.uid,
            token: mainUser.token,
            newEmail: email,
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          setSessionToken(data.token); // Set the session token
          setStep('code'); // Move to verification code step
          toast.success('Verification code sent successfully. Please check the code in your new  email')
          break;
        case -100:
          setError('Loading too fast. Please try again.');
          break;
        case -103:
          setError('Email already exists. Please try again.');
          break;
        default:
          setError('Unknown error. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode) {
      setError('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const serverUrl = getServerUrl();

      const response = await fetch(serverUrl + '/api/v2/confirm_email_change',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: mainUser.uid,
            token: mainUser.token,
            code: verificationCode,
            updateToken: sessionToken
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          setSessionToken(data.token); // Set the session token
          setStep('code'); // Move to verification code step
          toast.success('Email updated successfully!')
          onSuccessfulChange(newEmail);
          onClose()
          break;
        case -100:
          setError('Loading too fast. Please try again.');
          break;
        case -110:
          setError('Invalid verification code. Please try again later.');
          break;
        case -111:
          setError('Verification code expired. Please try again later.');
          break;
        default:
          setError('Unknown error. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }

    // try {
    //   // Perform verification code submission to the server
    //   // You can add your logic here to verify the code
    //   console.log('Verification code submitted:', verificationCode);
    //   onClose(); // Close the dialog after successful verification
    // } catch (err) {
    //   setError('Invalid verification code. Please try again.');
    // } finally {
    //   setIsLoading(false);
    // }
  };
  const handleBack = () => {
    if (step === 'code') {
      setStep('email'); // Go back to the email step
      setError(null); // Clear any errors
    } else {
      onClose(); // Close the dialog if in the email step
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <button
          onClick={handleBack}
          className="absolute top-4 right-4 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {step === 'code' ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {step === 'email' ? 'Change Your Email Address' : 'Verify Your Email Address'}
        </h2>

        {step === 'email' ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We are about to send a verification code to your new email address. Please enter your new email below.
            </p>
            <form onSubmit={handleSubmitEmail}>
              <div className="mb-4">
                <label htmlFor="accountEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Email Address:
                </label>
                <input
                  type="email"
                  id="accountEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter new email"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                             hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                             hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 
                             focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              A verification code has been sent to <span className="font-semibold">{newEmail}</span>. Please enter the code below.
            </p>
            <form onSubmit={handleSubmitCode}>
              <div className="mb-4">
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code:
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          focus:outline-none focus:ring-2 focus:ring-blue-500 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                             hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                             hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 
                             focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}