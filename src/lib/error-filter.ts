// Global error handler for filtering out extension errors
if (typeof window !== 'undefined') {
  // Store original console.error
  const originalConsoleError = console.error

  // Override console.error to filter extension errors
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    
    // Filter out known extension errors
    const extensionErrors = [
      'shadowRoot',
      'contentScript',
      'extension://',
      'chrome-extension://',
      'moz-extension://',
      'webkit-masked-url://',
      'data-stepsy-content-script-registered'
    ]

    const isExtensionError = extensionErrors.some(pattern => 
      message.includes(pattern) || 
      args.some((arg: any) => arg?.stack?.includes(pattern))
    )

    // Only log non-extension errors in development
    if (!isExtensionError || process.env.NODE_ENV === 'development') {
      originalConsoleError.apply(console, args)
    }
  }

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const isExtensionError = 
      event.filename?.includes('extension://') ||
      event.filename?.includes('contentScript') ||
      event.message?.includes('shadowRoot')

    if (isExtensionError) {
      event.preventDefault() // Prevent default browser error handling
    }
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || ''
    const isExtensionError = reason.includes('extension://') || reason.includes('shadowRoot')

    if (isExtensionError) {
      event.preventDefault()
    }
  })
}