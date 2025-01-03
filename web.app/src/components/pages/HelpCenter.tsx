import { Mail, Youtube, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { config } from '../../utils/config';
import { openLink } from '../../utils/utils';
import { CodeBlock } from '../common/CodeBlock';

export function HelpCenter() {
  const [expandedVideo, setExpandedVideo] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const tutorials = [
    {
      id: 1,
      title: "Connect AURGA Viewer to a Target Device & Use the Client App to Display the Screen",
      description: [
        { type: 'text', content: 'In this step-by-step tutorial, It shows how to seamlessly connect your AURGA Viewer to a target device and use the client app to view the device\'s screen wirelessly. Whether you\'re setting up for the first time or troubleshooting a connection, this video covers everything you need to know to get started with AURGA Viewer.' },
        { type: 'text', content: 'In this video, you\'ll learn:' },
        {
          type: 'list', content: [
            'How to set up and connect the AURGA Viewer to your target device.',
            'How to check LED status of AURGA Viewer.',
            'How to connect the client app to the AURGA Viewer and start screen sharing',
          ]
        }
      ],
      videoId: "INFXZeDvwaw"
    },
    {
      id: 2,
      title: "How to Connect Client App to AURGA Viewer via Bluetooth or Wi-Fi & Device Setup Guide",
      description: [
        { type: 'text', content: 'In this comprehensive guide, I\'ll walk you through the process of connecting the AURGA Viewer to your devices using Bluetooth or Wi-Fi. Additionally, I\'ll show you how to set up essential device settings like the device name (hotspot SSID), passcode, network password, and Wi-Fi region to ensure a smooth and secure connection.' },
        { type: 'text', content: 'In this video, you\'ll learn:' },
        {
          type: 'list', content: [
            'How to connect the AURGA client app to AURGA Viewer using Bluetooth or Wi-Fi.',
            'How to set up the device name (hotspot SSID) and passcode for secure access.',
            'How to configure the network password for AURGA Viewer\'s hotspot connection.',
          ]
        }
      ],
      videoId: "XSa-K76t-g0"
    },
    {
      id: 3,
      title: "Bridge AURGA Viewer to Router via Bluetooth or Wi-Fi for Internet Connectivity",
      description: [
        { type: 'text', content: 'In this video tutorial, I\'ll show you how to bridge your AURGA Viewer to a router using Bluetooth or Wi-Fi. This setup allows your client devices to access the AURGA Viewer through the router, and enables the AURGA Viewer to connect to the Internet via the router, providing a seamless and efficient connection for all your devices.' },
        {
          type: 'list', content: [
            'How to bridge the AURGA Viewer to your router using Bluetooth or Wi-Fi.',
            'How to manually configure static IP for AURGA Viewer.',
          ]
        }
      ],
      videoId: "SCkXacTeQsw"
    },
    {
      id: 4,
      title: "Use the Input Function in AURGA Mobile App to Simulate Mouse & Keyboard Behavior",
      description: [
        { type: 'text', content: 'In this video, I\'ll demonstrate how to use the Input function in the AURGA mobile client app to simulate the behavior of a physical mouse and keyboard. Whether you need to control your device remotely or just want to enhance your user experience, this tutorial will cover all the essential functions.' },
        { type: 'text', content: 'In this video, you\'ll learn:' },
        {
          type: 'list', content: [
            'How to enter and quit full screen mode using the app.',
            'How to simulate mouse movements, clicks, and drags.',
            'How to send keystrokes and use combination keys for advanced control.',
            'How to zoom in and out, and move the screen efficiently.',
          ]
        }
      ],
      videoId: "Jhw7xvV4AkM"
    },
    {
      id: 5,
      title: "How to Bind AURGA Viewer to Your Personal Account for Remote Internet Access",
      description: [
        { type: 'text', content: 'In this tutorial, I\'ll guide you through the process of binding your AURGA Viewer to your personal account. By linking your AURGA Viewer to your account, you\'ll be able to access and control your devices remotely over the internet, no matter where you are.' },
        { type: 'text', content: 'In this video, you\'ll learn:' },
        {
          type: 'list', content: [
            'How to bind your AURGA Viewer to your personal account.',
            'How to manage and access your bonded AURGA Viewers from anywhere via the internet.',
          ]
        }
      ],
      videoId: "4kgGyidg3F8"
    },
    {
      id: 6,
      title: "How to Set Up WOL on AURGA Viewer & Wake Up Your Computer Remotely Over the Internet",
      description: [
        { type: 'text', content: 'In this tutorial, I\'ll show you how to set up Wake-on-LAN (WOL) settings on your AURGA Viewer, enabling you to wake up your target computer remotely and control its screen over the internet. Perfect for managing your devices from anywhere!' },
        { type: 'text', content: 'In this video, you\'ll learn:' },
        {
          type: 'list', content: [
            'How to configure WOL settings on the AURGA Viewer.',
            'How to wake up your target computer remotely using WOL.',
            'How to control the screen of your remote computer over the internet.',
          ]
        }
      ],
      videoId: "FjTzt4PiNrY"
    }
  ];

  const baseFaqs = [
    {
      id: 1,
      question: "Having Trouble Receiving Verification Code by Email?",
      answer: [
        { type: 'text', content: 'If you\'re experiencing difficulties receiving the verification code during account activation, here are some steps you can take to resolve the issue:' },
        {
          type: 'list', content: [
            'Check Your Spam Folder',
          ]
        },
        { type: 'text', content: 'First, ensure that the verification email hasn\'t been mistakenly filtered into your spam or junk folder.' },
        {
          type: 'list', content: [
            'Send an Email to Support',
          ]
        },
        { type: 'text', content: 'If you still haven\'t received the verification code, you can send an email to our support team at account@mail.aurga.com. They will assist you in activating your account.' },
        {
          type: 'list', content: [
            'Ensure Email Address is Correct',
          ]
        },
        { type: 'text', content: 'Double-check that the email address you provided during registration is correct and active. Typos or incorrect email formats can prevent the verification email from being delivered.' },
        {
          type: 'list', content: [
            'Try a Different Email Address',
          ]
        },
        { type: 'text', content: 'It\'s possible that your email server rejected our email. Try registering with a different email address to see if that resolves the problem.' },
        {
          type: 'list', content: [
            'Contact Your Email Provider',
          ]
        },
        { type: 'text', content: 'If you suspect that your email provider might be blocking the verification email, contact their support team for assistance.' },

      ]
    },
    {
      id: 2,
      question: "Could not connect to AURGA Viewer over the internet?",
      answer: [
        { type: 'text', content: 'If you\'re experiencing difficulties connecting to AURGA Viewer over the internet, there are several possible issues and solutions you can explore:' },
        { type: 'text', content: 'Possible Issues:' },
        {
          type: 'list', content: [
            'AURGA Viewer or the client could not connect to our cloud servers https://my.aurga.com or https://mirror1.aurga.com.',
            'The network between the AURGA Viewer and client could not be reachable, or it doesn\'t support NAT traversal.'
          ]
        },

        { type: 'text', content: 'Solutions:' },
        {
          type: 'list', content: [
            'Setup IPv6 for AURGA Viewer and the client devices to improve connectivity.',
            'Host a private cloud server using the AURGA Webserver repository https://github.com/aurgatech/webserver.',
            'Connect AURGA Viewer and client to a WireGuard private network for secure and direct communication.'
          ]
        },

        { type: 'text', content: 'Detailed Steps for WireGuard Setup:' },
        {
          type: 'list', content: [
            'Run the mobile app and connect to AURGA Viewer.',
            'Navigate to the Device tab -> WireGuard Setup.',
            'In the WireGuard Setup view, paste the WireGuard config or scan the QR code with the camera.',
            'Save the configuration and ensure both devices are connected to the WireGuard network.',
          ]
        },
        { type: 'text', content: 'If the above solutions do not resolve your issue, please contact our support team at supports@aurga.com for further assistance.' }
      ]
    },
  ];

  const osSpecificFaqs = {
    linux: [
      {
        id: 'linux-1',
        question: 'The required libraries "libavformat/libavutil/libavcodec/libswscale" were not found on your system!',
        answer: [
          { type: 'text', content: 'See [The H264 decoder required for video playback could not be found in the libavcodec library].' },
        ]
      },
      {
        id: 'linux-2',
        question: 'The H264 decoder required for video playback could not be found in the libavcodec library.',
        answer: [
          { type: 'text', content: 'To ensure your `libavcodec` library supports the H.264 codec, follow these steps:' },
          {
            type: 'list', content: [
              'Verify H.264 Support',
            ]
          },
          { type: 'text', content: 'First, check if your FFmpeg installation supports H.264 by running the following command:' },
          { type: 'code', content: 'ffmpeg -codecs | grep 264', language: 'bash' },
          { type: 'text', content: 'You should see an entry for H.264 in the output. If not, proceed to install or update FFmpeg with H.264 support.' },
          {
            type: 'list', content: [
              'Install or Update FFmpeg with H.264 Support',
            ]
          },
          { type: 'text', content: 'If H.264 is not supported, you need to install or update FFmpeg with the necessary codecs. For Debian-based systems like Ubuntu, use:' },
          { type: 'code', content: 'sudo apt update sudo apt install ffmpeg libavcodec-extra', language: 'bash' },
          { type: 'text', content: 'For Red Hat-based systems like Fedora, use:' },
          { type: 'code', content: 'sudo dnf install ffmpeg ffmpeg-devel', language: 'bash' },
          {
            type: 'list', content: [
              'Verify Installation',
            ]
          },
          { type: 'text', content: 'After installation or update, verify again that FFmpeg supports H.264:' },
          { type: 'code', content: 'ffmpeg -codecs | grep 264', language: 'bash' },
          { type: 'text', content: 'You should now see the H.264 codec listed in the output.' },
          {
            type: 'list', content: [
              'Building from Source (Optional)',
            ]
          },
          { type: 'text', content: 'If you prefer to build FFmpeg from source with H.264 support, follow these steps:' },
          { type: 'text', content: '1. Download the FFmpeg source code from the official website.' },
          { type: 'text', content: '2. Extract the downloaded archive.' },
          { type: 'text', content: '3. Navigate to the extracted directory and run the following commands:' },
          { type: 'code', content: './configure --prefix=output --enable-shared --disable-static --disable-programs --disable-ffmpeg --disable-ffplay --disable-ffprobe --disable-swresample --disable-postproc --disable-avfilter --disable-network  --disable-avdevice --disable-everything --enable-decoder=h264 --disable-libdrm --disable-vaapi', language: 'bash' },
          { type: 'code', content: 'make -j32 && make install', language: 'bash' },
          { type: 'code', content: 'sudo mkdir -p /usr/shared/aurgav', language: 'bash' },
          { type: 'code', content: 'sudo cp -Rf output/lib/* /usr/shared/aurgav', language: 'bash' },
          { type: 'text', content: 'This will compile and install libavcodec with H.264 support.' },
        ],

      },
      {
        id: 'linux-3',
        question: 'The required library "libfreetype.so" was not found on your system!',
        answer: [
          { type: 'text', content: 'If you are experiencing issues with text not appearing on the context menu in the video view, it may be due to the missing `libfreetype.so` library. Follow these steps to install it:' },
          {
            type: 'list', content: [
              'Update Your Package List',
            ]
          },
          { type: 'text', content: 'First, update your package list to ensure you have the latest information on the newest versions of packages and their dependencies.' },
          { type: 'code', content: 'sudo apt update', language: 'bash' },
          {
            type: 'list', content: [
              'Install libfreetype6',
            ]
          },
          { type: 'text', content: 'Install the `libfreetype6` package, which includes `libfreetype.so`, using your package manager. For Debian-based systems like Ubuntu, use:' },
          { type: 'code', content: 'sudo apt install libfreetype6', language: 'bash' },
          { type: 'text', content: 'For CentOS-based systems like CentOS, ClearOS, use:' },
          { type: 'code', content: 'sudo yum install freetype', language: 'bash' },
          { type: 'text', content: 'For Red Hat-based systems like Fedora, use:' },
          { type: 'code', content: 'sudo dnf install freetype', language: 'bash' },
          {
            type: 'list', content: [
              'Verify Installation',
            ]
          },
          { type: 'text', content: 'After installation, you can verify that `libfreetype.so` is available by checking its presence in the library directories:' },
          { type: 'code', content: 'ls /usr/lib/x86_64-linux-gnu/ | grep libfreetype', language: 'bash' },
          { type: 'text', content: 'You should see `libfreetype.so` or `libfreetype.so.6` in the output.' },
          {
            type: 'list', content: [
              'Restart Your Application',
            ]
          },
          { type: 'text', content: 'Once the library is installed, restart your application to ensure that the context menu text appears correctly.' },
        ]
      },
      {
        id: 'linux-4',
        question: 'Unable to play sound. The required library "libasound.so" was not found.',
        answer: [
          { type: 'text', content: 'To install libasound.so, follow the instructions below based on your operating system:' },
          { type: 'text', content: 'Debian-based Systems (e.g., Ubuntu)' },
          { type: 'code', content: 'sudo apt-get update', language: 'bash' },
          { type: 'code', content: 'sudo apt-get install libasound2', language: 'bash' },
          { type: 'text', content: 'CentOS-based Systems (e.g., CentOS, ClearOS)' },
          { type: 'code', content: 'sudo yum update', language: 'bash' },
          { type: 'code', content: 'sudo yum install alsa-lib', language: 'bash' },
          { type: 'text', content: 'After installing the library, restart your application to ensure it recognizes the new library.' },
        ]
      },
    ]
  };

  // Combine base FAQs with OS-specific FAQs
  const faqs = [
    ...baseFaqs,
    ...(osSpecificFaqs[config.OS as keyof typeof osSpecificFaqs] || [])
  ];

  const handleEmailClick = (email: string) => {
    //copyToClipboard(email);
  };
  
  const renderTextWithLinks = (text: string) => {
    const urlPattern = /(https?:\/\/[^\s]+?)\.?$/i;
    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    return text.split(/(https?:\/\/[^\s]+)|([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi).map((part, index) => {
      if (!part) return part;
      const urlMatch = part.match(urlPattern);
      if (urlMatch && urlMatch[1]) {
        return <a key={index} href='#' onClick={() => openLink(`${urlMatch[1]}`)} rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{part}</a>;
      } else if (emailPattern.test(part)) {
        return <span key={index} className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => openLink(`mailto:${part}`)}>{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="flex-1 overflow-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Help Center</h1>

        <div className="grid grid-cols-1 gap-6">
          {/* Support & Tutorials */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Support & Tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email Support */}
              <div className="flex flex-col space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Email Support</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get in touch with our support team via email for technical assistance
                </p>
                <a href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    openLink('mailto:supports@aurga.com');
                  }}
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-auto">
                  Send email →
                </a>
              </div>

              {/* Video Tutorials */}
              <div className="flex flex-col space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Youtube className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Video Tutorials</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Learn how to use AURGA Viewer with our video tutorials
                </p>
                <a href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    openLink('https://www.youtube.com/@aurgaviewer625/videos');
                  }}
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-auto">
                  Watch tutorials →
                </a>
              </div>
            </div>
          </div>

          {/* Tutorial Videos Section */}
          <div id="tutorials" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Tutorial Videos</h2>
            <div className="space-y-4">
              {tutorials.map((tutorial) => (
                <div key={tutorial.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button
                    onClick={() => setExpandedVideo(expandedVideo === tutorial.id ? null : tutorial.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{tutorial.title}</span>
                    </div>
                    {expandedVideo === tutorial.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  {expandedVideo === tutorial.id && (
                    <div className="p-4 pt-0">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {tutorial.description.map((block, index) => {
                          if (block.type === 'text') {
                            return <p key={index} className="mb-2">{renderTextWithLinks(block.content)}</p>;
                          }
                          if (block.type === 'code') {
                            return <CodeBlock key={index} code={block.content} language={block.language} />;
                          }
                          if (block.type === 'list') {
                            return (
                              <ul key={index} className="list-disc list-inside mb-2">
                                {block.content.map((item, i) => (
                                  <li key={i}>{renderTextWithLinks(item)}</li>
                                ))}
                              </ul>
                            );
                          }
                        })}
                      </div>
                      <div className="flex flex-col space-y-4">
                        <a
                          href='#'
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            openLink(`https://www.youtube.com/watch?v=${tutorial.videoId}`);
                          }}
                        >
                          <Youtube className="w-5 h-5" />
                          <span>Watch Video on YouTube</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FAQs Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                    {expandedFaq === faq.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="p-4 pt-0">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {faq.answer.map((block, index) => {
                          if (block.type === 'text') {
                            return <p key={index} className="mb-2">{renderTextWithLinks(block.content)}</p>;
                          }
                          if (block.type === 'code') {
                            return <CodeBlock key={index} code={block.content} language={block.language} />;
                          }
                          if (block.type === 'list') {
                            return (
                              <ul key={index} className="list-disc list-inside mb-2">
                                {block.content.map((item, i) => (
                                  <li key={i}>{renderTextWithLinks(item)}</li>
                                ))}
                              </ul>
                            );
                          }
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Credits Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
                <BookOpen className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Credits & Acknowledgments</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AURGA Viewer is built with the following open-source components:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openLink('https://react.dev/');
                    }}
                    className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    React - A JavaScript library for building user interfaces
                  </a>
                </li>
                <li>
                  <a href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openLink('https://tailwindcss.com/');
                    }}
                    className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    Tailwind CSS - A utility-first CSS framework
                  </a>
                </li>
                <li>
                  <a href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openLink('https://lucide.dev/');
                    }}
                    className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    Lucide Icons - Beautiful and consistent icons
                  </a>
                </li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                We are grateful to the open-source community for making these excellent tools available.
                For detailed license information, please visit the websites.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
