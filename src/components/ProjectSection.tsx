import { ReactNode } from 'react'

export interface ProjectSectionProps {
  title: string
  children: ReactNode
}

export function ProjectSection({ title, children }: ProjectSectionProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      {children}
    </section>
  )
}



