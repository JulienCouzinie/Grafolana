'use client'
import * as React from 'react'
import {ReactNode, Suspense, useEffect, useRef} from 'react'
import  {Toaster} from 'react-hot-toast'
import {WalletButton} from '../solana/solana-provider'

export function UiLayout({ children }: { children: ReactNode }) {

  return (
    <div className="full-height-layout">
      <div className="navbar bg-base-300 dark:text-neutral-content flex-col md:flex-row space-y-2 md:space-y-0">
        <div className="flex-1">
          <img 
            src="/grafolanalogo.png" 
            alt="Grafolana Logo" 
            className="h-12" // 48px height
          />
        </div>
        <div className="flex-none space-x-2">
          <WalletButton />
        </div>
      </div>
      <div className="content-container">
        <Suspense
          fallback={
            <div className="text-center my-32">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          }
        >
          {children}
        </Suspense>
        <Toaster position="bottom-right" />
      </div>
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <aside>
          <p>
            Code By Paic
          </p>
          <div className="flex justify-center space-x-4 mt-2">
            <a href="https://x.com/grafolana" target="_blank" rel="noopener noreferrer" title="X Profile">
              <img src="/X.png" alt="X Profile" className="h-6 w-6" />
            </a>
            <a href="https://github.com/JulienCouzinie/Grafolana" target="_blank" rel="noopener noreferrer" title="GitHub Repository">
              <img src="/github.png" alt="GitHub Repository" className="h-6 w-6" />
            </a>
            <a href="https://github.com/JulienCouzinie/Grafolana/blob/master/README.md" target="_blank" rel="noopener noreferrer" title="Documentation">
              <img src="/documentation.svg" alt="Readme" className="h-6 w-6" />
            </a>
            <a href="https://t.me/Grafolana" target="_blank" rel="noopener noreferrer" title="Telegram Account">
              <img src="/telegram.png" alt="Telegram Account" className="h-6 w-6" />
            </a>
          </div>
        </aside>
      </footer>
    </div>
  )
}

export function AppModal({
  children,
  title,
  hide,
  show,
  submit,
  submitDisabled,
  submitLabel,
}: {
  children: ReactNode
  title: string
  hide: () => void
  show: boolean
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    if (!dialogRef.current) return
    if (show) {
      dialogRef.current.showModal()
    } else {
      dialogRef.current.close()
    }
  }, [show, dialogRef])

  return (
    <dialog className="modal" ref={dialogRef}>
      <div className="modal-box space-y-5">
        <h3 className="font-bold text-lg">{title}</h3>
        {children}
        <div className="modal-action">
          <div className="join space-x-2">
            {submit ? (
              <button className="btn btn-xs lg:btn-md btn-primary" onClick={submit} disabled={submitDisabled}>
                {submitLabel || 'Save'}
              </button>
            ) : null}
            <button onClick={hide} className="btn">
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

export function AppHero({
  children,
  title,
  subtitle,
}: {
  children?: ReactNode
  title: ReactNode
  subtitle: ReactNode
}) {
  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          {typeof title === 'string' ? <h1 className="text-5xl font-bold">{title}</h1> : title}
          {typeof subtitle === 'string' ? <p className="py-6">{subtitle}</p> : subtitle}
          {children}
        </div>
      </div>
    </div>
  )
}

export function ellipsify(str = '', len = 4) {
  if (str.length > 30) {
    return str.substring(0, len) + '..' + str.substring(str.length - len, str.length)
  }
  return str
}


