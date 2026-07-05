import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './index'

// 类型安全的 Redux hooks（替代原生 useDispatch/useSelector）
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
