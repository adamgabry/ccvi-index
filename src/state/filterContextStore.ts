import { createContext } from 'react'
import type { FilterContextValue } from './FilterContext'

export const FilterContext = createContext<FilterContextValue | undefined>(undefined)
