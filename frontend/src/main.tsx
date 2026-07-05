import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { useAppSelector } from './store/hooks'
import App from './App'
import Layout from './components/Layout'
import DetailPage from './pages/DetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LibraryPage from './pages/LibraryPage'
import CollectionDetailPage from './pages/CollectionDetailPage'
import TagFilterPage from './pages/TagFilterPage'
import SearchPage from './pages/SearchPage'
import SquarePage from './pages/SquarePage'
import ProfilePage from './pages/ProfilePage'
import StoryboardListPage from './pages/StoryboardListPage'
import StoryboardEditorPage from './pages/StoryboardEditorPage'
import './index.css'

// 受保护路由组件 — 优先使用 Redux store 的 isAuthenticated 状态 (fix-protected-route-auth)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const router = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <App /> },
      { path: 'detail/:id', element: <DetailPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'library/collections/:id', element: <CollectionDetailPage /> },
      { path: 'library/tags/:id', element: <TagFilterPage /> },
      { path: 'library/search', element: <SearchPage /> },
      { path: 'square', element: <SquarePage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'storyboards', element: <StoryboardListPage /> },
      { path: 'storyboard/:id', element: <StoryboardEditorPage /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
)
