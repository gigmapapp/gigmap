export default function Logo({ size = 28, textSize = 'text-xl' }: { size?: number; textSize?: string }) {
  return (
    <div className="flex items-center">
      <span className={`${textSize} font-bold`}>Gig</span>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-0.5"
      >
        <path
          d="M20 2C12.268 2 6 8.268 6 16c0 9 14 22 14 22s14-13 14-22c0-7.732-6.268-14-14-14z"
          fill="#F97316"
        />
        <rect x="12" y="15" width="2" height="6" rx="1" fill="white" />
        <rect x="15.5" y="12" width="2" height="12" rx="1" fill="white" />
        <rect x="19" y="10" width="2" height="16" rx="1" fill="white" />
        <rect x="22.5" y="12" width="2" height="12" rx="1" fill="white" />
        <rect x="26" y="15" width="2" height="6" rx="1" fill="white" />
      </svg>
      <span className={`${textSize} font-bold`}>Map</span>
    </div>
  )
}