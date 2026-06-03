import { ReactNode } from 'react'

interface AdminResponsiveDataProps {
  desktop: ReactNode
  mobile: ReactNode
  empty?: ReactNode
  isEmpty?: boolean
}

export default function AdminResponsiveData({
  desktop,
  mobile,
  empty,
  isEmpty,
}: AdminResponsiveDataProps) {
  if (isEmpty && empty) {
    return <>{empty}</>
  }

  return (
    <>
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-x-auto">
        {desktop}
      </div>
      <div className="lg:hidden space-y-3">{mobile}</div>
    </>
  )
}
